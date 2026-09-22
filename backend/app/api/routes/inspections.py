from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user_id
from app.db.supabase_client import supabase
from app.models.schemas import (
    AnswersPayload,
    CreateInspectionRequest,
    DiagnosisResult,
    Inspection,
    InspectionSummary,
    ReportRequest,
    ReportResponse,
    VisionAnalysisRequest,
    VisionResult,
)
from app.services import (
    investigation_service,
    knowledge_service,
    question_service,
    reasoning_service,
    repair_service,
    report_service,
    vision_service,
)

router = APIRouter(tags=["inspections"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _get_inspection_row(inspection_id: str, user_id: str) -> dict:
    result = (
        supabase.table("inspections")
        .select("*")
        .eq("id", inspection_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Inspection not found")
    return result.data[0]


def _update_inspection(inspection_id: str, patch: dict) -> dict:
    result = (
        supabase.table("inspections")
        .update(patch)
        .eq("id", inspection_id)
        .execute()
    )
    return result.data[0]


def _get_problem_name(problem_id: str) -> str:
    result = supabase.table("problems").select("name").eq("id", problem_id).execute()
    return result.data[0]["name"] if result.data else "Unknown Problem"


# ── CRUD ─────────────────────────────────────────────────────────────────────

@router.post("/inspections", response_model=Inspection)
def create_inspection(body: CreateInspectionRequest, user_id=Depends(get_current_user_id)):
    row = {
        "user_id": str(user_id),
        "machine_id_fk": str(body.machine_id),
        "problem_id_fk": str(body.problem_id),
        "status": "draft",
    }
    result = supabase.table("inspections").insert(row).execute()
    return result.data[0]


@router.get("/inspections", response_model=list[InspectionSummary])
def list_inspections(user_id=Depends(get_current_user_id)):
    result = (
        supabase.table("inspections")
        .select("id,machine_id_fk,problem_id_fk,status,created_at,updated_at")
        .eq("user_id", str(user_id))
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/inspections/{inspection_id}", response_model=Inspection)
def get_inspection(inspection_id: str, user_id=Depends(get_current_user_id)):
    return _get_inspection_row(inspection_id, str(user_id))


# ── AI pipeline ───────────────────────────────────────────────────────────────

@router.post("/inspections/{inspection_id}/vision-analysis", response_model=VisionResult)
async def vision_analysis(
    inspection_id: str,
    body: VisionAnalysisRequest,
    user_id=Depends(get_current_user_id),
):
    row = _get_inspection_row(inspection_id, str(user_id))
    problem_name = _get_problem_name(row["problem_id_fk"])

    _update_inspection(inspection_id, {"status": "analyzing", "photo_url": body.photo_url})

    result: VisionResult = await vision_service.analyze(body.photo_url, problem_name)

    _update_inspection(inspection_id, {"vision_result": result.model_dump()})
    return result


@router.post("/inspections/{inspection_id}/questions")
async def questions(inspection_id: str, user_id=Depends(get_current_user_id)):
    from app.models.schemas import InvestigationResult, QuestionSet

    row = _get_inspection_row(inspection_id, str(user_id))
    if not row.get("vision_result"):
        raise HTTPException(status_code=422, detail="Vision analysis must run first")

    problem_name = _get_problem_name(row["problem_id_fk"])
    vision_result = VisionResult(**row["vision_result"])

    inv: InvestigationResult = await investigation_service.investigate(vision_result, problem_name)

    # Persist hypotheses into diagnosis stub so reasoning can reuse them
    _update_inspection(
        inspection_id,
        {
            "diagnosis": {
                "hypotheses": [h.model_dump() for h in inv.hypotheses],
                "root_cause": "",
                "confidence": 0,
                "explanation": "",
                "ruled_out": [],
                "cited_sources": [],
            }
        },
    )

    question_set: QuestionSet = await question_service.generate_questions(inv.hypotheses, problem_name)
    return question_set


@router.post("/inspections/{inspection_id}/answers", response_model=AnswersPayload)
def answers_endpoint(
    inspection_id: str,
    body: AnswersPayload,
    user_id=Depends(get_current_user_id),
):
    _get_inspection_row(inspection_id, str(user_id))
    _update_inspection(inspection_id, {"answers": body.model_dump()})
    return body


@router.post("/inspections/{inspection_id}/diagnose", response_model=DiagnosisResult)
async def diagnose(inspection_id: str, user_id=Depends(get_current_user_id)):
    from app.models.schemas import AnswerEntry, Hypothesis

    row = _get_inspection_row(inspection_id, str(user_id))
    if not row.get("vision_result"):
        raise HTTPException(status_code=422, detail="Vision analysis must run first")

    problem_name = _get_problem_name(row["problem_id_fk"])
    vision_result = VisionResult(**row["vision_result"])

    # Retrieve hypotheses from the stub saved in /questions step
    existing_diagnosis = row.get("diagnosis") or {}
    hypotheses_raw = existing_diagnosis.get("hypotheses", [])
    if not hypotheses_raw:
        # Fallback: run investigation again
        from app.models.schemas import InvestigationResult
        inv: InvestigationResult = await investigation_service.investigate(vision_result, problem_name)
        hypotheses_raw = [h.model_dump() for h in inv.hypotheses]

    hypotheses = [Hypothesis(**h) for h in hypotheses_raw]

    # Answers (may be empty if user skipped questions)
    answers_raw = row.get("answers") or {}
    answers = [AnswerEntry(**a) for a in answers_raw.get("answers", [])]

    # RAG
    query_text = f"{problem_name} {' '.join(h.cause for h in hypotheses)}"
    snippets = knowledge_service.query(query_text, problem_name)

    from app.models.schemas import ReasoningResult
    reasoning: ReasoningResult = await reasoning_service.reason(
        vision_result=vision_result,
        hypotheses=hypotheses,
        answers=answers,
        retrieved_snippets=snippets,
        problem_name=problem_name,
    )

    diagnosis = DiagnosisResult(
        hypotheses=hypotheses,
        root_cause=reasoning.root_cause,
        confidence=reasoning.confidence,
        explanation=reasoning.explanation,
        ruled_out=reasoning.ruled_out,
        cited_sources=reasoning.cited_sources,
    )

    _update_inspection(
        inspection_id,
        {"diagnosis": diagnosis.model_dump(), "status": "diagnosed"},
    )
    return diagnosis


@router.post("/inspections/{inspection_id}/repair-plan")
async def repair_plan_endpoint(inspection_id: str, user_id=Depends(get_current_user_id)):
    row = _get_inspection_row(inspection_id, str(user_id))
    if not row.get("diagnosis") or not row["diagnosis"].get("root_cause"):
        raise HTTPException(status_code=422, detail="Diagnosis must complete first")

    problem_name = _get_problem_name(row["problem_id_fk"])
    root_cause = row["diagnosis"]["root_cause"]

    snippets = knowledge_service.query(root_cause, problem_name)
    plan = await repair_service.generate_repair_plan(root_cause, snippets)

    _update_inspection(
        inspection_id,
        {"repair_plan": plan.model_dump(), "status": "repairing"},
    )
    return plan


@router.post("/inspections/{inspection_id}/report")
async def report_endpoint(
    inspection_id: str,
    body: ReportRequest,
    user_id=Depends(get_current_user_id),
):
    from app.models.schemas import ChecklistItem

    row = _get_inspection_row(inspection_id, str(user_id))
    inspection = Inspection(**row)

    checklist = [ChecklistItem(**item) for item in body.checklist_state]

    pdf_url = report_service.generate_and_upload(inspection, checklist)

    _update_inspection(
        inspection_id,
        {
            "checklist_state": [c.model_dump() for c in checklist],
            "pdf_url": pdf_url,
            "status": "complete",
        },
    )
    return ReportResponse(pdf_url=pdf_url)
