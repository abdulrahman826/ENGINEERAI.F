# EngineerAI Web Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready Next.js web client for EngineerAI that shares the existing FastAPI backend, Supabase project, and inspection data model, while completing the 6 unimplemented backend AI service endpoints.

**Architecture:** Two independent tracks — (A) backend: implement the 6 missing AI service files and wire them to the stubbed routes; (B) frontend: Next.js 14 App Router web client with Supabase anonymous auth, direct photo upload to Supabase Storage, and a full inspection workflow consuming the FastAPI API. The web client is a new `web/` directory at the project root; nothing in `backend/` or `mobile/` is restructurally changed.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase JS v2, FastAPI (existing), ReportLab (existing backend dep, to add), httpx (existing), Python 3.11 (existing)

---

## Implementation Assessment

### Current State
- **6/12 API endpoints fully implemented** — departments, machines, problems, inspection CRUD
- **6/12 endpoints are 501 stubs** — all AI pipeline steps (vision-analysis, questions, answers, diagnose, repair-plan, report)
- **LLM client fully implemented** — `llm_client.py` with Gemini primary, OpenRouter fallback, disk cache
- **Knowledge service fully implemented** — ChromaDB query, 20 snippets present
- **All prompts defined** — `prompts.py` has all 6 module templates
- **0/6 AI service files exist** — `vision_service.py`, `investigation_service.py`, `question_service.py`, `reasoning_service.py`, `repair_service.py`, `report_service.py` are missing
- **CORS is `*`** — no changes needed for web client
- **Design tokens documented** — `design/design_tokens.md` with exact hex, type scale, spacing

### What the web client needs from the backend
Every AI endpoint must actually work. The web client will call them; 501 responses will show as unrecoverable errors. Therefore **backend AI services must be implemented first**.

### Files created (backend)
- `backend/app/services/vision_service.py`
- `backend/app/services/investigation_service.py`
- `backend/app/services/question_service.py`
- `backend/app/services/reasoning_service.py`
- `backend/app/services/repair_service.py`
- `backend/app/services/report_service.py`

### Files modified (backend)
- `backend/app/api/routes/inspections.py` — wire AI services, add request bodies, make handlers async
- `backend/requirements.txt` — add `reportlab`

### Files created (web)
```
web/
  package.json
  tsconfig.json
  next.config.ts
  tailwind.config.ts
  components.json                          # shadcn config
  .env.local.example
  src/
    app/
      layout.tsx                           # root layout, fonts
      globals.css                          # CSS variables (design tokens)
      (auth)/
        login/page.tsx                     # anonymous sign-in CTA
      (app)/
        layout.tsx                         # sidebar + top-bar shell
        dashboard/page.tsx                 # stats + recent inspections
        inspections/
          page.tsx                         # searchable history table
          new/page.tsx                     # inspection wizard
          [id]/page.tsx                    # inspection detail workspace
    components/
      layout/
        sidebar.tsx
        top-bar.tsx
      ui/                                  # shadcn primitives (auto-added by CLI)
      shared/
        status-badge.tsx                   # draft/analyzing/diagnosed/repairing/complete
        confidence-badge.tsx               # high/medium/low pill
        pipeline-tracker.tsx               # 7-step progress with live status
        loading-screen.tsx                 # named AI operation loading state
        error-state.tsx                    # retry-friendly error card
        empty-state.tsx                    # empty list / no data
      inspection/
        photo-upload.tsx                   # drag-drop + click upload to Supabase Storage
        question-form.tsx                  # dynamic Q&A form
        diagnosis-panel.tsx                # root cause + confidence + explanation
        evidence-panel.tsx                 # cited sources expandable
        ruled-out-panel.tsx                # ruled-out hypotheses
        repair-plan-panel.tsx              # steps + tools + est time + safety warnings
        checklist.tsx                      # interactive tap-to-check
        spare-parts-table.tsx
    lib/
      types.ts                             # all TypeScript types (mirrors schemas.py exactly)
      api/
        client.ts                          # base fetch wrapper with auth header + error handling
        inspections.ts                     # inspection API calls
        machines.ts                        # departments/machines/problems API calls
      supabase/
        client.ts                          # browser Supabase client (singleton)
        server.ts                          # server-side Supabase client (SSR cookies)
        storage.ts                         # uploadPhoto() helper
    hooks/
      use-auth.ts                          # anonymous sign-in, session state
      use-inspection-session.ts            # wizard state across steps
```

### Files NOT modified
- Everything in `mobile/` — Flutter app is untouched
- `backend/app/core/`, `backend/app/db/`, `backend/app/knowledge_base/`, `backend/app/services/llm_client.py`, `backend/app/services/knowledge_service.py`, `backend/app/services/prompts.py`
- `backend/app/api/routes/departments.py`, `machines.py`, `problems.py`
- `backend/app/main.py` — CORS is already `*`, no change needed

---

## Part A: Backend AI Services

### Task 1: Add reportlab to requirements.txt

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Check current requirements**

Read `backend/requirements.txt`. It should list fastapi, uvicorn, pydantic, pydantic-settings, python-dotenv, supabase, pyjwt, chromadb, pyyaml, httpx.

- [ ] **Step 2: Add reportlab**

Add `reportlab` to `backend/requirements.txt` after `pyyaml`.

- [ ] **Step 3: Commit**

```bash
cd /path/to/project && git add backend/requirements.txt
git commit -m "deps: add reportlab for PDF report generation"
```

---

### Task 2: Vision Service

**Files:**
- Create: `backend/app/services/vision_service.py`

The vision service downloads the photo from Supabase Storage (using the service-role Supabase client), base64-encodes it, and calls the LLM with an image part.

- [ ] **Step 1: Create vision_service.py**

```python
import base64

from app.db.supabase_client import supabase
from app.models.schemas import VisionResult
from app.services import llm_client, prompts


async def analyze(photo_url: str, problem_name: str) -> VisionResult:
    """Download photo from Supabase Storage, call Vision LLM, return VisionResult."""
    # Download photo bytes via service-role client
    # photo_url is the full public-accessible Storage URL
    import httpx
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(photo_url)
        resp.raise_for_status()
        image_bytes = resp.content

    b64 = base64.b64encode(image_bytes).decode()
    # Detect mime type from first bytes
    mime = "image/jpeg"
    if image_bytes[:8] == b'\x89PNG\r\n\x1a\n':
        mime = "image/png"
    elif image_bytes[:4] == b'RIFF' and image_bytes[8:12] == b'WEBP':
        mime = "image/webp"

    user_content = [
        {"type": "text", "text": prompts.USER_VISION.format(problem_name=problem_name)},
        {
            "type": "image_url",
            "image_url": {"url": f"data:{mime};base64,{b64}"},
        },
    ]

    return await llm_client.call_llm(
        system_prompt=prompts.SYSTEM_VISION.format(problem_name=problem_name),
        user_content=user_content,
        schema=VisionResult,
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/vision_service.py
git commit -m "feat(backend): add vision service"
```

---

### Task 3: Investigation Service

**Files:**
- Create: `backend/app/services/investigation_service.py`

- [ ] **Step 1: Create investigation_service.py**

```python
import json

from app.models.schemas import InvestigationResult, VisionResult
from app.services import llm_client, prompts


async def investigate(vision_result: VisionResult, problem_name: str) -> InvestigationResult:
    user_content = prompts.USER_INVESTIGATION.format(
        problem_name=problem_name,
        vision_result=vision_result.model_dump_json(indent=2),
    )
    return await llm_client.call_llm(
        system_prompt=prompts.SYSTEM_INVESTIGATION,
        user_content=user_content,
        schema=InvestigationResult,
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/investigation_service.py
git commit -m "feat(backend): add investigation service"
```

---

### Task 4: Question Service

**Files:**
- Create: `backend/app/services/question_service.py`

- [ ] **Step 1: Create question_service.py**

```python
import json

from app.models.schemas import Hypothesis, QuestionSet
from app.services import llm_client, prompts


async def generate_questions(hypotheses: list[Hypothesis], problem_name: str) -> QuestionSet:
    hypotheses_json = json.dumps(
        [h.model_dump() for h in hypotheses], indent=2
    )
    user_content = prompts.USER_QUESTION.format(
        problem_name=problem_name,
        hypotheses=hypotheses_json,
    )
    return await llm_client.call_llm(
        system_prompt=prompts.SYSTEM_QUESTION,
        user_content=user_content,
        schema=QuestionSet,
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/question_service.py
git commit -m "feat(backend): add question service"
```

---

### Task 5: Reasoning Service

**Files:**
- Create: `backend/app/services/reasoning_service.py`

- [ ] **Step 1: Create reasoning_service.py**

```python
import json

from app.models.schemas import AnswerEntry, Hypothesis, ReasoningResult, VisionResult
from app.services import llm_client, prompts


async def reason(
    vision_result: VisionResult,
    hypotheses: list[Hypothesis],
    answers: list[AnswerEntry],
    retrieved_snippets: list[dict],
    problem_name: str,
) -> ReasoningResult:
    snippets_text = "\n\n".join(
        f"[{s['title']} | {s['source']}]\n{s['content']}" for s in retrieved_snippets
    )
    user_content = prompts.USER_REASONING.format(
        problem_name=problem_name,
        vision_result=vision_result.model_dump_json(indent=2),
        answers=json.dumps([a.model_dump() for a in answers], indent=2),
        hypotheses=json.dumps([h.model_dump() for h in hypotheses], indent=2),
        retrieved_snippets=snippets_text,
    )
    return await llm_client.call_llm(
        system_prompt=prompts.SYSTEM_REASONING,
        user_content=user_content,
        schema=ReasoningResult,
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/reasoning_service.py
git commit -m "feat(backend): add reasoning service"
```

---

### Task 6: Repair Service

**Files:**
- Create: `backend/app/services/repair_service.py`

- [ ] **Step 1: Create repair_service.py**

```python
from app.models.schemas import RepairPlan
from app.services import llm_client, prompts


async def generate_repair_plan(root_cause: str, retrieved_snippets: list[dict]) -> RepairPlan:
    snippets_text = "\n\n".join(
        f"[{s['title']} | {s['source']}]\n{s['content']}" for s in retrieved_snippets
    )
    user_content = prompts.USER_REPAIR.format(
        root_cause=root_cause,
        retrieved_snippets=snippets_text,
    )
    return await llm_client.call_llm(
        system_prompt=prompts.SYSTEM_REPAIR,
        user_content=user_content,
        schema=RepairPlan,
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/repair_service.py
git commit -m "feat(backend): add repair service"
```

---

### Task 7: Report Service

**Files:**
- Create: `backend/app/services/report_service.py`

The report service assembles a PDF using ReportLab, uploads it to the `inspection-reports` Supabase Storage bucket via the service-role client, and returns the signed URL.

- [ ] **Step 1: Create report_service.py**

```python
import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.db.supabase_client import supabase
from app.models.schemas import ChecklistItem, DiagnosisResult, Inspection, RepairPlan

# Design token colours
PRIMARY = colors.HexColor("#16548C")
TEXT_PRIMARY = colors.HexColor("#1A202C")
TEXT_SECONDARY = colors.HexColor("#5A6572")
SUCCESS = colors.HexColor("#1E7B44")
WARNING_BG = colors.HexColor("#FEF3C7")
WARNING_FG = colors.HexColor("#B45309")
BORDER = colors.HexColor("#D8DEE4")
SURFACE = colors.white


def generate_and_upload(inspection: Inspection, checklist_state: list[ChecklistItem]) -> str:
    """Build a PDF report and upload to Supabase Storage. Returns the public URL string."""
    pdf_bytes = _build_pdf(inspection, checklist_state)

    path = f"{inspection.user_id}/{inspection.id}/report.pdf"
    supabase.storage.from_("inspection-reports").upload(
        path=path,
        file=pdf_bytes,
        file_options={"content-type": "application/pdf", "upsert": "true"},
    )

    # Create a signed URL valid for 10 years (reports are long-lived)
    result = supabase.storage.from_("inspection-reports").create_signed_url(
        path=path, expires_in=315360000
    )
    return result["signedURL"]


def _build_pdf(inspection: Inspection, checklist_state: list[ChecklistItem]) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("H1", parent=styles["Heading1"], textColor=PRIMARY, fontSize=18, spaceAfter=4)
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], textColor=TEXT_PRIMARY, fontSize=13, spaceAfter=3)
    body = ParagraphStyle("Body", parent=styles["Normal"], textColor=TEXT_PRIMARY, fontSize=10, leading=15)
    caption = ParagraphStyle("Caption", parent=styles["Normal"], textColor=TEXT_SECONDARY, fontSize=9)
    warning_style = ParagraphStyle(
        "Warning", parent=styles["Normal"], textColor=WARNING_FG, fontSize=9, backColor=WARNING_BG, leading=13
    )

    story = []

    # Header
    story.append(Paragraph("EngineerAI — Inspection Report", h1))
    story.append(Paragraph(
        f"Inspection ID: {inspection.id}  ·  Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        caption,
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=8))

    # Diagnosis section
    if inspection.diagnosis:
        d = inspection.diagnosis
        story.append(Paragraph("Diagnosis", h2))
        conf_pct = int(d.confidence * 100)
        story.append(Paragraph(f"<b>Root Cause:</b> {d.root_cause}", body))
        story.append(Paragraph(f"<b>Confidence:</b> {conf_pct}%", body))
        story.append(Spacer(1, 4))
        story.append(Paragraph(d.explanation, body))
        story.append(Spacer(1, 6))

        if d.cited_sources:
            story.append(Paragraph("<b>Evidence Sources:</b> " + ", ".join(d.cited_sources), caption))
            story.append(Spacer(1, 4))

        if d.ruled_out:
            story.append(Paragraph("Ruled Out:", caption))
            for ro in d.ruled_out:
                story.append(Paragraph(f"• {ro.cause}: {ro.reason}", caption))
        story.append(Spacer(1, 8))

    # Repair plan
    if inspection.repair_plan:
        rp = inspection.repair_plan
        story.append(Paragraph("Repair Plan", h2))
        story.append(Paragraph(
            f"Estimated time: {rp.est_minutes} min  ·  Tools: {', '.join(rp.tools)}",
            caption,
        ))
        story.append(Spacer(1, 4))

        if rp.safety_warnings:
            for sw in rp.safety_warnings:
                story.append(Paragraph(f"⚠ {sw}", warning_style))
            story.append(Spacer(1, 4))

        for step in rp.steps:
            checked = next(
                (c.checked for c in checklist_state if c.step == step.instruction), False
            )
            mark = "✓" if checked else "○"
            line = f"{mark}  <b>Step {step.step_number}:</b> {step.instruction}"
            story.append(Paragraph(line, body))
            if step.safety_warning:
                story.append(Paragraph(f"   ⚠ {step.safety_warning}", warning_style))
        story.append(Spacer(1, 8))

        if rp.spare_parts:
            story.append(Paragraph("Spare Parts", h2))
            data = [["Part", "Specification"]] + [[p.part_name, p.spec] for p in rp.spare_parts]
            t = Table(data, colWidths=[80 * mm, 80 * mm])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [SURFACE, colors.HexColor("#F4F6F8")]),
            ]))
            story.append(t)

    doc.build(story)
    return buf.getvalue()
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/report_service.py
git commit -m "feat(backend): add report service with ReportLab PDF generation"
```

---

### Task 8: Wire AI Routes

**Files:**
- Modify: `backend/app/api/routes/inspections.py`

Replace all 501 stubs with real implementations. Also add a `_get_inspection_for_user` helper and `_update_inspection` helper to reduce repetition.

- [ ] **Step 1: Replace inspections.py**

```python
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user_id
from app.db.supabase_client import supabase
from app.models.schemas import (
    AnswersPayload,
    ChecklistItem,
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
    from app.models.schemas import QuestionSet

    row = _get_inspection_row(inspection_id, str(user_id))
    if not row.get("vision_result"):
        raise HTTPException(status_code=422, detail="Vision analysis must run first")

    problem_name = _get_problem_name(row["problem_id_fk"])
    vision_result = VisionResult(**row["vision_result"])

    from app.models.schemas import InvestigationResult
    inv: InvestigationResult = await investigation_service.investigate(vision_result, problem_name)

    # Persist hypotheses into diagnosis stub so reasoning can reuse them
    _update_inspection(
        inspection_id,
        {"diagnosis": {"hypotheses": [h.model_dump() for h in inv.hypotheses], "root_cause": "", "confidence": 0, "explanation": "", "ruled_out": [], "cited_sources": []}},
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

    from app.models.schemas import Hypothesis
    hypotheses = [Hypothesis(**h) for h in hypotheses_raw]

    # Answers (may be empty if user skipped questions)
    answers_raw = row.get("answers") or {}
    from app.models.schemas import AnswerEntry
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
    row = _get_inspection_row(inspection_id, str(user_id))
    inspection = Inspection(**row)

    from app.models.schemas import ChecklistItem
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/api/routes/inspections.py
git commit -m "feat(backend): wire AI services to inspection endpoints"
```

---

### Task 9: Smoke-test backend endpoints with curl

Before building the web client, verify the backend works. Run these against a locally running backend (`uvicorn app.main:app --reload` from `backend/`).

- [ ] **Step 1: Verify static endpoints still work**

```bash
# Get a JWT first (sign in anonymously via Supabase REST)
TOKEN=$(curl -s -X POST "{SUPABASE_URL}/auth/v1/signup" \
  -H "apikey: {SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":null,"password":null}' | jq -r '.access_token')

curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/departments
# Expected: [{"id":"...","name":"Industrial Equipment"}]

curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/departments/{dept_id}/machines
# Expected: [{"id":"...","name":"Electric Motor",...}]
```

- [ ] **Step 2: Verify inspection creation**

```bash
curl -s -X POST http://localhost:8000/inspections \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"machine_id":"{machine_id}","problem_id":"{problem_id}"}' | jq .
# Expected: {"id":"...","status":"draft",...}
```

- [ ] **Step 3: Note the inspection_id for subsequent curl tests**

(The AI endpoints require a real GEMINI_API_KEY; if not configured, tests will fail at the LLM call. That's expected. The routing and schema validation should work.)

---

## Part B: Next.js Web Client

### Task 10: Scaffold Next.js app

**Files:**
- Create: `web/package.json`, `web/tsconfig.json`, `web/next.config.ts`, `web/tailwind.config.ts`, `web/components.json`, `web/.env.local.example`

- [ ] **Step 1: Create web/package.json**

```json
{
  "name": "engineerai-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "^18",
    "react-dom": "^18",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "lucide-react": "^0.441.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.2",
    "tailwindcss-animate": "^1.0.7",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-dropdown-menu": "^2.1.1",
    "@radix-ui/react-select": "^2.1.1",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.2",
    "@radix-ui/react-progress": "^1.1.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.4.1",
    "postcss": "^8",
    "autoprefixer": "^10.0.1",
    "eslint": "^8",
    "eslint-config-next": "14.2.5"
  }
}
```

- [ ] **Step 2: Create web/tsconfig.json**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create web/next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/**",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 4: Create web/tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#16548C",
          dark: "#0F3D61",
          tint: "#E9F1F8",
          foreground: "#FFFFFF",
        },
        background: "#F4F6F8",
        surface: "#FFFFFF",
        border: "#D8DEE4",
        "text-primary": "#1A202C",
        "text-secondary": "#5A6572",
        success: {
          DEFAULT: "#1E7B44",
          tint: "#E6F4EC",
          dark: "#14532D",
        },
        warning: {
          DEFAULT: "#B45309",
          tint: "#FEF3C7",
          dark: "#7C3A03",
        },
        destructive: {
          DEFAULT: "#B3261E",
          tint: "#FDECEA",
          dark: "#7F1D1D",
          foreground: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        card: "16px",
        button: "14px",
        input: "12px",
        chip: "9999px",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "48px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

- [ ] **Step 5: Create web/components.json** (shadcn config)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

- [ ] **Step 6: Create web/.env.local.example**

```bash
# FastAPI backend
NEXT_PUBLIC_API_URL=http://localhost:8000

# Supabase (public keys only — never put service-role key here)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 7: Create web/postcss.config.js**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 8: Install dependencies**

```bash
cd web && npm install
```

Expected: installs ~150 packages, no errors.

- [ ] **Step 9: Commit**

```bash
git add web/
git commit -m "chore(web): scaffold Next.js 14 app with TypeScript and Tailwind"
```

---

### Task 11: TypeScript types (mirrors schemas.py exactly)

**Files:**
- Create: `web/src/lib/types.ts`

- [ ] **Step 1: Create types.ts**

```typescript
// Mirrors backend/app/models/schemas.py exactly.
// Do not diverge from these field names — the API returns them verbatim.

export type Status = "draft" | "analyzing" | "diagnosed" | "repairing" | "complete";
export type Severity = "low" | "medium" | "high";
export type QuestionType = "multiple_choice" | "free_text";

// ── Reference tables ──────────────────────────────────────────────────────────

export interface Department {
  id: string;
  name: string;
}

export interface Machine {
  id: string;
  department_id: string;
  name: string;
  image_url: string | null;
}

export interface Problem {
  id: string;
  machine_id: string;
  name: string;
  description: string | null;
}

// ── AI module outputs ─────────────────────────────────────────────────────────

export interface VisionResult {
  visible_issues: string[];
  damaged_components: string[];
  severity_estimate: Severity;
  machine_confirmed: boolean;
}

export interface Hypothesis {
  cause: string;
  confidence: number; // 0–1
  reasoning: string;
}

export interface Question {
  text: string;
  question_type: QuestionType;
  options: string[] | null;
}

export interface QuestionSet {
  questions: Question[];
}

export interface AnswerEntry {
  question: string;
  answer: string;
}

export interface AnswersPayload {
  answers: AnswerEntry[];
}

export interface RuledOutHypothesis {
  cause: string;
  reason: string;
}

export interface DiagnosisResult {
  hypotheses: Hypothesis[];
  root_cause: string;
  confidence: number; // 0–1
  explanation: string;
  ruled_out: RuledOutHypothesis[];
  cited_sources: string[];
}

export interface RepairStep {
  step_number: number;
  instruction: string;
  safety_warning: string | null;
}

export interface SparePart {
  part_name: string;
  spec: string;
}

export interface RepairPlan {
  steps: RepairStep[];
  tools: string[];
  est_minutes: number;
  safety_warnings: string[];
  spare_parts: SparePart[];
}

export interface ChecklistItem {
  step: string;
  checked: boolean;
}

// ── Inspection rows ───────────────────────────────────────────────────────────

export interface Inspection {
  id: string;
  user_id: string;
  machine_id_fk: string;
  problem_id_fk: string;
  photo_url: string | null;
  answers: AnswersPayload | null;
  vision_result: VisionResult | null;
  diagnosis: DiagnosisResult | null;
  repair_plan: RepairPlan | null;
  checklist_state: ChecklistItem[] | null;
  pdf_url: string | null;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface InspectionSummary {
  id: string;
  machine_id_fk: string;
  problem_id_fk: string;
  status: Status;
  created_at: string;
  updated_at: string;
}

// ── Request/response wrappers ─────────────────────────────────────────────────

export interface CreateInspectionRequest {
  machine_id: string;
  problem_id: string;
}

export interface VisionAnalysisRequest {
  photo_url: string;
}

export interface ReportRequest {
  checklist_state: ChecklistItem[];
}

export interface ReportResponse {
  pdf_url: string;
}

export interface ApiError {
  error_code: string;
  message: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/lib/types.ts
git commit -m "feat(web): add TypeScript types mirroring backend schemas"
```

---

### Task 12: Supabase client + auth helpers

**Files:**
- Create: `web/src/lib/supabase/client.ts`
- Create: `web/src/lib/supabase/server.ts`
- Create: `web/src/lib/supabase/storage.ts`
- Create: `web/src/hooks/use-auth.ts`

- [ ] **Step 1: Create web/src/lib/supabase/client.ts**

```typescript
import { createBrowserClient } from "@supabase/ssr";

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}
```

- [ ] **Step 2: Create web/src/lib/supabase/server.ts**

```typescript
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function getSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {}
        },
      },
    }
  );
}
```

- [ ] **Step 3: Create web/src/lib/supabase/storage.ts**

```typescript
import { getSupabaseBrowserClient } from "./client";

/**
 * Upload a photo directly to Supabase Storage (client-side, bypasses FastAPI).
 * Returns the public/signed URL to pass to vision-analysis endpoint.
 */
export async function uploadPhoto(
  file: File,
  userId: string,
  inspectionId: string
): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${inspectionId}/photo.${ext}`;

  const { error } = await supabase.storage
    .from("inspection-photos")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  const { data } = supabase.storage
    .from("inspection-photos")
    .getPublicUrl(path);

  return data.publicUrl;
}
```

- [ ] **Step 4: Create web/src/hooks/use-auth.ts**

```typescript
"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function useAuth() {
  const supabase = getSupabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signInAnonymously() {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { session, loading, signInAnonymously, signOut };
}
```

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/supabase/ web/src/hooks/use-auth.ts
git commit -m "feat(web): add Supabase client, auth hook, and photo upload helper"
```

---

### Task 13: API client layer

**Files:**
- Create: `web/src/lib/api/client.ts`
- Create: `web/src/lib/api/machines.ts`
- Create: `web/src/lib/api/inspections.ts`

- [ ] **Step 1: Create web/src/lib/api/client.ts**

```typescript
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ApiError } from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiException extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string
  ) {
    super(message);
    this.name = "ApiException";
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...options.headers,
    },
  });

  if (!res.ok) {
    let body: ApiError = { error_code: "error", message: res.statusText };
    try {
      body = await res.json();
    } catch {}
    throw new ApiException(res.status, body.error_code, body.message);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}
```

- [ ] **Step 2: Create web/src/lib/api/machines.ts**

```typescript
import { apiFetch } from "./client";
import type { Department, Machine, Problem } from "@/lib/types";

export const getDepartments = () =>
  apiFetch<Department[]>("/departments");

export const getMachines = (departmentId: string) =>
  apiFetch<Machine[]>(`/departments/${departmentId}/machines`);

export const getProblems = (machineId: string) =>
  apiFetch<Problem[]>(`/machines/${machineId}/problems`);
```

- [ ] **Step 3: Create web/src/lib/api/inspections.ts**

```typescript
import { apiFetch } from "./client";
import type {
  AnswersPayload,
  CreateInspectionRequest,
  DiagnosisResult,
  Inspection,
  InspectionSummary,
  QuestionSet,
  RepairPlan,
  ReportRequest,
  ReportResponse,
  VisionAnalysisRequest,
  VisionResult,
} from "@/lib/types";

export const createInspection = (body: CreateInspectionRequest) =>
  apiFetch<Inspection>("/inspections", { method: "POST", body: JSON.stringify(body) });

export const listInspections = () =>
  apiFetch<InspectionSummary[]>("/inspections");

export const getInspection = (id: string) =>
  apiFetch<Inspection>(`/inspections/${id}`);

export const runVisionAnalysis = (id: string, body: VisionAnalysisRequest) =>
  apiFetch<VisionResult>(`/inspections/${id}/vision-analysis`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const getQuestions = (id: string) =>
  apiFetch<QuestionSet>(`/inspections/${id}/questions`, { method: "POST" });

export const submitAnswers = (id: string, body: AnswersPayload) =>
  apiFetch<AnswersPayload>(`/inspections/${id}/answers`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const runDiagnosis = (id: string) =>
  apiFetch<DiagnosisResult>(`/inspections/${id}/diagnose`, { method: "POST" });

export const getRepairPlan = (id: string) =>
  apiFetch<RepairPlan>(`/inspections/${id}/repair-plan`, { method: "POST" });

export const generateReport = (id: string, body: ReportRequest) =>
  apiFetch<ReportResponse>(`/inspections/${id}/report`, {
    method: "POST",
    body: JSON.stringify(body),
  });
```

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/api/
git commit -m "feat(web): add API client layer with auth injection and error handling"
```

---

### Task 14: App globals, CSS variables, utility

**Files:**
- Create: `web/src/app/globals.css`
- Create: `web/src/lib/utils.ts`

- [ ] **Step 1: Create web/src/app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 213 20% 96%; /* #F4F6F8 */
    --foreground: 220 29% 11%; /* #1A202C */
    --card: 0 0% 100%;
    --card-foreground: 220 29% 11%;
    --border: 213 18% 85%; /* #D8DEE4 */
    --input: 213 18% 85%;
    --primary: 210 74% 31%; /* #16548C */
    --primary-foreground: 0 0% 100%;
    --secondary: 210 43% 95%; /* #E9F1F8 */
    --secondary-foreground: 210 74% 31%;
    --muted: 213 18% 85%;
    --muted-foreground: 213 12% 38%; /* #5A6572 */
    --accent: 210 43% 95%;
    --accent-foreground: 210 74% 31%;
    --destructive: 3 72% 40%; /* #B3261E */
    --destructive-foreground: 0 0% 100%;
    --ring: 210 74% 31%;
    --radius: 0.75rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-text-primary font-sans;
    font-feature-settings: "cv11", "ss01";
  }
}

/* Scrollbar (subtle, matches design) */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #D8DEE4;
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: #5A6572;
}
```

- [ ] **Step 2: Create web/src/lib/utils.ts**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Status, Severity } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(iso);
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export const STATUS_LABELS: Record<Status, string> = {
  draft: "Draft",
  analyzing: "Analyzing",
  diagnosed: "Diagnosed",
  repairing: "Repairing",
  complete: "Complete",
};

export const STATUS_COLORS: Record<Status, string> = {
  draft: "bg-border/50 text-text-secondary",
  analyzing: "bg-primary-tint text-primary",
  diagnosed: "bg-primary-tint text-primary",
  repairing: "bg-warning-tint text-warning",
  complete: "bg-success-tint text-success",
};

export const SEVERITY_COLORS: Record<Severity, string> = {
  low: "bg-success-tint text-success",
  medium: "bg-warning-tint text-warning",
  high: "bg-destructive-tint text-destructive",
};
```

- [ ] **Step 3: Create root layout web/src/app/layout.tsx**

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "EngineerAI — Field Service Copilot",
  description: "AI-guided inspection and diagnosis for industrial equipment",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add web/src/app/globals.css web/src/lib/utils.ts web/src/app/layout.tsx
git commit -m "feat(web): add global CSS, design tokens, utility functions"
```

---

### Task 15: Shared UI components

**Files:**
- Create: `web/src/components/shared/status-badge.tsx`
- Create: `web/src/components/shared/confidence-badge.tsx`
- Create: `web/src/components/shared/pipeline-tracker.tsx`
- Create: `web/src/components/shared/loading-screen.tsx`
- Create: `web/src/components/shared/error-state.tsx`
- Create: `web/src/components/shared/empty-state.tsx`

- [ ] **Step 1: Create status-badge.tsx**

```tsx
import { cn, STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";
import type { Status } from "@/lib/types";

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-chip px-2.5 py-0.5 text-xs font-medium",
        STATUS_COLORS[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
```

- [ ] **Step 2: Create confidence-badge.tsx**

```tsx
import { cn, formatConfidence } from "@/lib/utils";

function confidenceColor(confidence: number): string {
  if (confidence >= 0.75) return "bg-success-tint text-success";
  if (confidence >= 0.5) return "bg-warning-tint text-warning";
  return "bg-destructive-tint text-destructive";
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-chip px-2.5 py-0.5 text-xs font-medium",
        confidenceColor(confidence)
      )}
    >
      {formatConfidence(confidence)}
    </span>
  );
}
```

- [ ] **Step 3: Create pipeline-tracker.tsx**

```tsx
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type PipelineStep = {
  id: string;
  label: string;
  description: string;
  status: "pending" | "running" | "done" | "error";
};

const PIPELINE_STEPS: Omit<PipelineStep, "status">[] = [
  { id: "vision", label: "Vision Analysis", description: "Detecting visible components and abnormalities" },
  { id: "investigation", label: "Investigation", description: "Generating possible causes" },
  { id: "questions", label: "Guided Questions", description: "Collecting technician observations" },
  { id: "knowledge", label: "Knowledge Retrieval", description: "Searching technical knowledge base" },
  { id: "reasoning", label: "Root Cause Reasoning", description: "Evaluating evidence" },
  { id: "repair", label: "Repair Plan", description: "Generating step-by-step repair instructions" },
  { id: "report", label: "Report", description: "Assembling inspection report" },
];

export function PipelineTracker({ steps }: { steps: PipelineStep[] }) {
  const stepMap = new Map(steps.map((s) => [s.id, s]));

  return (
    <div className="space-y-3">
      {PIPELINE_STEPS.map((def, i) => {
        const step = stepMap.get(def.id) ?? { ...def, status: "pending" as const };
        return (
          <div key={def.id} className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              {step.status === "done" && <CheckCircle2 className="h-4 w-4 text-success" />}
              {step.status === "running" && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
              {step.status === "pending" && <Circle className="h-4 w-4 text-border" />}
              {step.status === "error" && <Circle className="h-4 w-4 text-destructive" />}
            </div>
            <div className="min-w-0">
              <p className={cn(
                "text-sm font-medium",
                step.status === "done" && "text-text-primary",
                step.status === "running" && "text-primary",
                step.status === "pending" && "text-text-secondary",
                step.status === "error" && "text-destructive",
              )}>
                {String(i + 1).padStart(2, "0")}  {def.label}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">{def.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Create loading-screen.tsx**

```tsx
import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  title: string;
  description?: string;
  steps?: Array<{ label: string; done: boolean; active: boolean }>;
}

export function LoadingScreen({ title, description, steps }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <Loader2 className="h-8 w-8 text-primary animate-spin mb-6" />
      <h2 className="text-base font-semibold text-text-primary mb-1">{title}</h2>
      {description && (
        <p className="text-sm text-text-secondary mb-6 max-w-sm">{description}</p>
      )}
      {steps && (
        <div className="text-left space-y-2 mt-2 w-full max-w-xs">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {s.done ? (
                <span className="text-success font-medium">✓</span>
              ) : s.active ? (
                <Loader2 className="h-3 w-3 text-primary animate-spin" />
              ) : (
                <span className="text-border">○</span>
              )}
              <span className={s.active ? "text-primary" : s.done ? "text-text-secondary" : "text-border"}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create error-state.tsx**

```tsx
import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="rounded-card border border-destructive/20 bg-destructive-tint p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-destructive">{title}</h3>
          <p className="text-sm text-destructive/80 mt-1">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm font-medium text-destructive underline underline-offset-2 hover:no-underline"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create empty-state.tsx**

```tsx
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <FolderOpen className="h-10 w-10 text-border mb-4" />
      <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary mb-4 max-w-sm">{description}</p>
      )}
      {action}
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add web/src/components/shared/
git commit -m "feat(web): add shared UI components (badges, pipeline tracker, states)"
```

---

### Task 16: App shell — sidebar and layout

**Files:**
- Create: `web/src/components/layout/sidebar.tsx`
- Create: `web/src/components/layout/top-bar.tsx`
- Create: `web/src/app/(app)/layout.tsx`

- [ ] **Step 1: Create sidebar.tsx**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Plus,
  History,
  Settings,
  Zap,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inspections/new", label: "New Inspection", icon: Plus },
  { href: "/inspections", label: "Inspections", icon: ClipboardList },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border bg-surface">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-text-primary tracking-tight">EngineerAI</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/inspections"
            ? pathname.startsWith("/inspections") && !pathname.includes("/new")
            : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary-tint text-primary font-medium"
                  : "text-text-secondary hover:bg-background hover:text-text-primary"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-3 py-3">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-background hover:text-text-primary transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create top-bar.tsx**

```tsx
interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4 h-16">
      <div>
        <h1 className="text-sm font-semibold text-text-primary">{title}</h1>
        {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Create web/src/app/(app)/layout.tsx**

```tsx
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = getSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add web/src/components/layout/ web/src/app/\(app\)/layout.tsx
git commit -m "feat(web): add sidebar navigation and app shell layout"
```

---

### Task 17: Login page

**Files:**
- Create: `web/src/app/(auth)/login/page.tsx`
- Create: `web/src/app/page.tsx` (root redirect)

- [ ] **Step 1: Create web/src/app/page.tsx**

```tsx
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = getSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  redirect(session ? "/dashboard" : "/login");
}
```

- [ ] **Step 2: Create web/src/app/(auth)/login/page.tsx**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, ArrowRight, Shield, Activity, FileText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const FEATURES = [
  { icon: Activity, text: "AI-guided fault diagnosis" },
  { icon: Shield, text: "Step-by-step repair instructions" },
  { icon: FileText, text: "Automated inspection reports" },
];

export default function LoginPage() {
  const { signInAnonymously } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    setLoading(true);
    setError(null);
    try {
      await signInAnonymously();
      router.push("/dashboard");
    } catch (e) {
      setError("Unable to start session. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-text-primary">EngineerAI</h1>
            <p className="text-xs text-text-secondary">Field Service Copilot</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-card border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-text-primary mb-1">
            Start inspecting
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            No account needed. Your session and inspection history are saved automatically.
          </p>

          <ul className="space-y-3 mb-6">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-sm text-text-secondary">
                <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                {text}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-sm text-destructive mb-4 rounded-md bg-destructive-tint px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleContinue}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-button bg-primary px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {loading ? "Starting session…" : "Continue"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>

        <p className="text-xs text-text-secondary text-center mt-4">
          Your data is scoped to this device session.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/app/page.tsx web/src/app/\(auth\)/
git commit -m "feat(web): add login page with anonymous sign-in"
```

---

### Task 18: Dashboard page

**Files:**
- Create: `web/src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Create dashboard/page.tsx**

```tsx
import Link from "next/link";
import { Plus, ChevronRight, Activity } from "lucide-react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/top-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeDate } from "@/lib/utils";
import type { InspectionSummary, Status } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getServerInspections(token: string): Promise<InspectionSummary[]> {
  try {
    const res = await fetch(`${API_URL}/inspections`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function countByStatus(inspections: InspectionSummary[]) {
  const counts: Record<Status, number> = {
    draft: 0, analyzing: 0, diagnosed: 0, repairing: 0, complete: 0,
  };
  for (const i of inspections) counts[i.status]++;
  return counts;
}

const STAT_DEFS = [
  { label: "Total Inspections", key: "total" as const },
  { label: "Active", key: "active" as const },
  { label: "Diagnosed", key: "diagnosed" as const },
  { label: "Complete", key: "complete" as const },
];

export default async function DashboardPage() {
  const supabase = getSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const inspections = await getServerInspections(session.access_token);
  const counts = countByStatus(inspections);

  const stats = {
    total: inspections.length,
    active: counts.analyzing + counts.diagnosed + counts.repairing,
    diagnosed: counts.diagnosed,
    complete: counts.complete,
  };

  const recent = inspections.slice(0, 8);

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Dashboard"
        subtitle="Field inspection overview"
        actions={
          <Link
            href="/inspections/new"
            className="flex items-center gap-1.5 rounded-button bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Inspection
          </Link>
        }
      />

      <div className="p-6 space-y-6 flex-1 overflow-auto">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          {STAT_DEFS.map(({ label, key }) => (
            <div key={key} className="rounded-card border border-border bg-surface p-4">
              <p className="text-xs text-text-secondary font-medium uppercase tracking-wide mb-1">{label}</p>
              <p className="text-2xl font-semibold text-text-primary">{stats[key]}</p>
            </div>
          ))}
        </div>

        {/* Recent inspections */}
        <div className="rounded-card border border-border bg-surface overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">Recent Inspections</h2>
            <Link
              href="/inspections"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {recent.length === 0 ? (
            <EmptyState
              title="No inspections yet"
              description="Start your first AI-guided inspection."
              action={
                <Link
                  href="/inspections/new"
                  className="inline-flex items-center gap-1.5 rounded-button bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  New Inspection
                </Link>
              }
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">ID</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((insp) => (
                  <tr key={insp.id} className="hover:bg-background/60 transition-colors">
                    <td className="px-5 py-3">
                      <StatusBadge status={insp.status} />
                    </td>
                    <td className="px-5 py-3 text-text-secondary">
                      {formatRelativeDate(insp.created_at)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-text-secondary">
                      {insp.id.slice(0, 8)}…
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/inspections/${insp.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/\(app\)/dashboard/
git commit -m "feat(web): add dashboard with inspection stats and recent list"
```

---

### Task 19: Inspection history page

**Files:**
- Create: `web/src/app/(app)/inspections/page.tsx`

- [ ] **Step 1: Create inspections history page**

```tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/layout/top-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import type { InspectionSummary } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default async function InspectionsPage() {
  const supabase = getSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  let inspections: InspectionSummary[] = [];
  try {
    const res = await fetch(`${API_URL}/inspections`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    if (res.ok) inspections = await res.json();
  } catch {}

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Inspections"
        subtitle={`${inspections.length} total`}
        actions={
          <Link
            href="/inspections/new"
            className="flex items-center gap-1.5 rounded-button bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Inspection
          </Link>
        }
      />

      <div className="p-6 flex-1 overflow-auto">
        <div className="rounded-card border border-border bg-surface overflow-hidden">
          {inspections.length === 0 ? (
            <EmptyState
              title="No inspections"
              description="Start your first AI-guided inspection to see it here."
              action={
                <Link
                  href="/inspections/new"
                  className="inline-flex items-center gap-1.5 rounded-button bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  New Inspection
                </Link>
              }
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide w-8">#</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wide">Inspection ID</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {inspections.map((insp, i) => (
                  <tr key={insp.id} className="hover:bg-background/60 transition-colors">
                    <td className="px-5 py-3 text-text-secondary text-xs">{i + 1}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={insp.status} />
                    </td>
                    <td className="px-5 py-3 text-text-secondary">{formatDate(insp.created_at)}</td>
                    <td className="px-5 py-3 font-mono text-xs text-text-secondary">{insp.id}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/inspections/${insp.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/\(app\)/inspections/page.tsx
git commit -m "feat(web): add inspection history table"
```

---

### Task 20: Inspection wizard — useInspectionSession hook

**Files:**
- Create: `web/src/hooks/use-inspection-session.ts`

This hook mirrors the Flutter `InspectionSessionNotifier` — it accumulates state across wizard steps.

- [ ] **Step 1: Create use-inspection-session.ts**

```typescript
"use client";

import { useState } from "react";
import type {
  ChecklistItem,
  DiagnosisResult,
  QuestionSet,
  RepairPlan,
  VisionResult,
} from "@/lib/types";

export type WizardStep =
  | "select"
  | "photo"
  | "vision"
  | "questions"
  | "diagnose"
  | "repair"
  | "checklist"
  | "report"
  | "done";

interface InspectionSession {
  inspectionId: string | null;
  photoUrl: string | null;
  visionResult: VisionResult | null;
  questionSet: QuestionSet | null;
  diagnosisResult: DiagnosisResult | null;
  repairPlan: RepairPlan | null;
  checklist: ChecklistItem[];
  step: WizardStep;
}

const INITIAL: InspectionSession = {
  inspectionId: null,
  photoUrl: null,
  visionResult: null,
  questionSet: null,
  diagnosisResult: null,
  repairPlan: null,
  checklist: [],
  step: "select",
};

export function useInspectionSession() {
  const [session, setSession] = useState<InspectionSession>(INITIAL);

  const update = (patch: Partial<InspectionSession>) =>
    setSession((s) => ({ ...s, ...patch }));

  const toggleChecklistItem = (index: number) =>
    setSession((s) => ({
      ...s,
      checklist: s.checklist.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      ),
    }));

  const reset = () => setSession(INITIAL);

  return { session, update, toggleChecklistItem, reset };
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/hooks/use-inspection-session.ts
git commit -m "feat(web): add inspection session hook for wizard state"
```

---

### Task 21: Inspection wizard — domain components

**Files:**
- Create: `web/src/components/inspection/photo-upload.tsx`
- Create: `web/src/components/inspection/question-form.tsx`
- Create: `web/src/components/inspection/diagnosis-panel.tsx`
- Create: `web/src/components/inspection/evidence-panel.tsx`
- Create: `web/src/components/inspection/repair-plan-panel.tsx`
- Create: `web/src/components/inspection/checklist.tsx`

- [ ] **Step 1: Create photo-upload.tsx**

```tsx
"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoUploadProps {
  onFileSelected: (file: File) => void;
  preview?: string | null;
  onRemove?: () => void;
  disabled?: boolean;
}

export function PhotoUpload({ onFileSelected, preview, onRemove, disabled }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    onFileSelected(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  if (preview) {
    return (
      <div className="relative rounded-card overflow-hidden border border-border bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Inspection photo" className="w-full max-h-72 object-cover" />
        {onRemove && !disabled && (
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border-2 border-dashed p-10 text-center transition-colors cursor-pointer",
        dragging ? "border-primary bg-primary-tint" : "border-border bg-surface hover:border-primary/50 hover:bg-background",
        disabled && "pointer-events-none opacity-60"
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-tint mb-3">
        <ImageIcon className="h-6 w-6 text-primary" />
      </div>
      <p className="text-sm font-medium text-text-primary mb-1">
        Drop photo here or <span className="text-primary">browse</span>
      </p>
      <p className="text-xs text-text-secondary">PNG, JPG, WEBP — max 20 MB</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create question-form.tsx**

```tsx
"use client";

import { useState } from "react";
import type { Question, AnswerEntry } from "@/lib/types";

interface QuestionFormProps {
  questions: Question[];
  onSubmit: (answers: AnswerEntry[]) => void;
  loading?: boolean;
}

export function QuestionForm({ questions, onSubmit, loading }: QuestionFormProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const setAnswer = (i: number, value: string) =>
    setAnswers((a) => ({ ...a, [i]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: AnswerEntry[] = questions.map((q, i) => ({
      question: q.text,
      answer: answers[i] ?? "",
    }));
    onSubmit(payload);
  };

  const allAnswered = questions.every((_, i) => Boolean(answers[i]));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {questions.map((q, i) => (
        <div key={i} className="rounded-card border border-border bg-surface p-4">
          <p className="text-sm font-medium text-text-primary mb-3">
            {i + 1}. {q.text}
          </p>
          {q.question_type === "multiple_choice" && q.options ? (
            <div className="space-y-2">
              {q.options.map((opt) => (
                <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name={`q-${i}`}
                    value={opt}
                    checked={answers[i] === opt}
                    onChange={() => setAnswer(i, opt)}
                    className="accent-primary"
                  />
                  <span className="text-sm text-text-primary">{opt}</span>
                </label>
              ))}
            </div>
          ) : (
            <textarea
              value={answers[i] ?? ""}
              onChange={(e) => setAnswer(i, e.target.value)}
              rows={2}
              placeholder="Describe what you observe…"
              className="w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none resize-none"
            />
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={!allAnswered || loading}
        className="w-full rounded-button bg-primary py-3 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
      >
        {loading ? "Analyzing…" : "Submit Answers"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create diagnosis-panel.tsx**

```tsx
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { cn } from "@/lib/utils";
import type { DiagnosisResult } from "@/lib/types";

interface DiagnosisPanelProps {
  diagnosis: DiagnosisResult;
}

export function DiagnosisPanel({ diagnosis }: DiagnosisPanelProps) {
  return (
    <div className="space-y-4">
      {/* Root cause */}
      <div className="rounded-card border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Root Cause</h3>
          <ConfidenceBadge confidence={diagnosis.confidence} />
        </div>
        <p className="text-base font-medium text-text-primary mb-2">{diagnosis.root_cause}</p>
        <p className="text-sm text-text-secondary leading-relaxed">{diagnosis.explanation}</p>
      </div>

      {/* Ruled out */}
      {diagnosis.ruled_out.length > 0 && (
        <div className="rounded-card border border-border bg-surface p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Ruled Out</h3>
          <div className="space-y-2">
            {diagnosis.ruled_out.map((ro, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-border flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium text-text-primary">{ro.cause}</span>
                  <span className="text-sm text-text-secondary"> — {ro.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create evidence-panel.tsx**

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface EvidencePanelProps {
  citedSources: string[];
}

export function EvidencePanel({ citedSources }: EvidencePanelProps) {
  const [open, setOpen] = useState(false);

  if (citedSources.length === 0) return null;

  return (
    <div className="rounded-card border border-border bg-surface overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-background/60 transition-colors"
      >
        <span className="text-sm font-medium text-text-primary">
          Evidence ({citedSources.length} source{citedSources.length !== 1 ? "s" : ""})
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-text-secondary" />
        ) : (
          <ChevronRight className="h-4 w-4 text-text-secondary" />
        )}
      </button>
      {open && (
        <div className="border-t border-border px-5 py-3 space-y-2">
          {citedSources.map((source, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 text-xs text-text-secondary flex-shrink-0">▸</span>
              <div>
                <p className="text-sm text-text-primary">{source.replace(/-/g, " ").replace(".md", "")}</p>
                <p className="text-xs text-text-secondary font-mono">{source}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create repair-plan-panel.tsx**

```tsx
import { AlertTriangle } from "lucide-react";
import type { RepairPlan } from "@/lib/types";

interface RepairPlanPanelProps {
  plan: RepairPlan;
}

export function RepairPlanPanel({ plan }: RepairPlanPanelProps) {
  return (
    <div className="space-y-4">
      {/* Meta */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
          <span className="text-text-secondary">Est. time: </span>
          <span className="font-medium text-text-primary">{plan.est_minutes} min</span>
        </div>
        {plan.tools.map((t) => (
          <div key={t} className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
            {t}
          </div>
        ))}
      </div>

      {/* Safety warnings */}
      {plan.safety_warnings.length > 0 && (
        <div className="rounded-card border-l-4 border-warning bg-warning-tint p-4 space-y-1">
          {plan.safety_warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-sm text-warning-dark">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Steps */}
      <div className="space-y-2">
        {plan.steps.map((step) => (
          <div key={step.step_number} className="rounded-card border border-border bg-surface p-4">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary-tint text-xs font-semibold text-primary">
                {step.step_number}
              </span>
              <div className="flex-1">
                <p className="text-sm text-text-primary">{step.instruction}</p>
                {step.safety_warning && (
                  <p className="mt-1.5 text-xs text-warning-dark bg-warning-tint rounded px-2 py-1">
                    ⚠ {step.safety_warning}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Spare parts */}
      {plan.spare_parts.length > 0 && (
        <div className="rounded-card border border-border bg-surface overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h4 className="text-sm font-medium text-text-primary">Spare Parts</h4>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background/50">
                <th className="px-5 py-2 text-left text-xs font-medium text-text-secondary">Part</th>
                <th className="px-5 py-2 text-left text-xs font-medium text-text-secondary">Specification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {plan.spare_parts.map((p, i) => (
                <tr key={i}>
                  <td className="px-5 py-2 text-text-primary">{p.part_name}</td>
                  <td className="px-5 py-2 text-text-secondary">{p.spec}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create checklist.tsx**

```tsx
"use client";

import { CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChecklistItem } from "@/lib/types";

interface ChecklistProps {
  items: ChecklistItem[];
  onToggle: (index: number) => void;
  disabled?: boolean;
}

export function Checklist({ items, onToggle, disabled }: ChecklistProps) {
  const done = items.filter((i) => i.checked).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full bg-success rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-text-secondary flex-shrink-0">{done}/{items.length}</span>
      </div>

      {/* Steps */}
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => !disabled && onToggle(i)}
            disabled={disabled}
            className={cn(
              "flex w-full items-start gap-3 rounded-card border px-4 py-3 text-left transition-colors",
              item.checked
                ? "border-success/30 bg-success-tint"
                : "border-border bg-surface hover:bg-background",
              disabled && "pointer-events-none"
            )}
          >
            {item.checked ? (
              <CheckSquare className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            ) : (
              <Square className="h-5 w-5 text-border flex-shrink-0 mt-0.5" />
            )}
            <span className={cn(
              "text-sm",
              item.checked ? "line-through text-text-secondary" : "text-text-primary"
            )}>
              {item.step}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add web/src/components/inspection/
git commit -m "feat(web): add inspection domain components (photo upload, Q&A, diagnosis, repair, checklist)"
```

---

### Task 22: New inspection wizard page

**Files:**
- Create: `web/src/app/(app)/inspections/new/page.tsx`

This is a multi-step client component that drives the full inspection workflow.

- [ ] **Step 1: Create new/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useInspectionSession } from "@/hooks/use-inspection-session";
import { TopBar } from "@/components/layout/top-bar";
import { PhotoUpload } from "@/components/inspection/photo-upload";
import { QuestionForm } from "@/components/inspection/question-form";
import { DiagnosisPanel } from "@/components/inspection/diagnosis-panel";
import { EvidencePanel } from "@/components/inspection/evidence-panel";
import { RepairPlanPanel } from "@/components/inspection/repair-plan-panel";
import { Checklist } from "@/components/inspection/checklist";
import { LoadingScreen } from "@/components/shared/loading-screen";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { uploadPhoto } from "@/lib/supabase/storage";
import * as api from "@/lib/api/inspections";
import * as machinesApi from "@/lib/api/machines";
import { ApiException } from "@/lib/api/client";
import type { Department, Machine, Problem, AnswerEntry } from "@/lib/types";

type SelectionState = {
  departments: Department[];
  machines: Machine[];
  problems: Problem[];
  departmentId: string | null;
  machineId: string | null;
  problemId: string | null;
};

export default function NewInspectionPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { session: insp, update, toggleChecklistItem } = useInspectionSession();
  const [sel, setSel] = useState<SelectionState>({
    departments: [], machines: [], problems: [],
    departmentId: null, machineId: null, problemId: null,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<
    "select" | "photo" | "vision" | "questions" | "diagnose" | "repair" | "checklist" | "report" | "done"
  >("select");

  // Load departments on mount
  useEffect(() => {
    machinesApi.getDepartments()
      .then((depts) => {
        setSel((s) => ({ ...s, departments: depts }));
        if (depts.length === 1) handleDeptSelect(depts[0].id, depts);
      })
      .catch(() => setError("Failed to load departments"));
  }, []);

  async function handleDeptSelect(deptId: string, depts?: Department[]) {
    setSel((s) => ({ ...s, departmentId: deptId }));
    try {
      const machines = await machinesApi.getMachines(deptId);
      setSel((s) => ({ ...s, machines }));
      if (machines.length === 1) handleMachineSelect(machines[0].id, machines);
    } catch {
      setError("Failed to load machines");
    }
  }

  async function handleMachineSelect(machineId: string, machines?: Machine[]) {
    setSel((s) => ({ ...s, machineId }));
    try {
      const problems = await machinesApi.getProblems(machineId);
      setSel((s) => ({ ...s, problems }));
    } catch {
      setError("Failed to load problems");
    }
  }

  function handleFileSelected(file: File) {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleStartInspection() {
    if (!sel.machineId || !sel.problemId) return;
    setLoading(true);
    setError(null);
    try {
      const inspection = await api.createInspection({
        machine_id: sel.machineId,
        problem_id: sel.problemId,
      });
      update({ inspectionId: inspection.id });
      setStep("photo");
    } catch (e) {
      setError(e instanceof ApiException ? e.message : "Failed to create inspection");
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadAndAnalyze() {
    if (!photoFile || !insp.inspectionId || !session) return;
    setLoading(true);
    setError(null);
    setStep("vision");
    try {
      const url = await uploadPhoto(photoFile, session.user.id, insp.inspectionId);
      update({ photoUrl: url });
      const vision = await api.runVisionAnalysis(insp.inspectionId, { photo_url: url });
      if (!vision.machine_confirmed) {
        setError("The AI could not confirm this is an electric motor. Please retake the photo.");
        setStep("photo");
        setLoading(false);
        return;
      }
      update({ visionResult: vision });
      // Get questions
      const qs = await api.getQuestions(insp.inspectionId);
      update({ questionSet: qs });
      setStep("questions");
    } catch (e) {
      setError(e instanceof ApiException ? e.message : "Vision analysis failed");
      setStep("photo");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAnswers(answers: AnswerEntry[]) {
    if (!insp.inspectionId) return;
    setLoading(true);
    setError(null);
    setStep("diagnose");
    try {
      await api.submitAnswers(insp.inspectionId, { answers });
      const diagnosis = await api.runDiagnosis(insp.inspectionId);
      update({ diagnosisResult: diagnosis });
      setStep("repair");
      const repairPlan = await api.getRepairPlan(insp.inspectionId);
      // Initialize checklist from repair steps
      const checklist = repairPlan.steps.map((s) => ({
        step: s.instruction,
        checked: false,
      }));
      update({ repairPlan, checklist });
      setStep("checklist");
    } catch (e) {
      setError(e instanceof ApiException ? e.message : "Diagnosis failed");
      setStep("questions");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReport() {
    if (!insp.inspectionId) return;
    setLoading(true);
    setError(null);
    setStep("report");
    try {
      const report = await api.generateReport(insp.inspectionId, {
        checklist_state: insp.checklist,
      });
      setStep("done");
      // Navigate to detail page after short delay
      setTimeout(() => router.push(`/inspections/${insp.inspectionId}`), 1000);
    } catch (e) {
      setError(e instanceof ApiException ? e.message : "Report generation failed");
      setStep("checklist");
    } finally {
      setLoading(false);
    }
  }

  const STEP_LABELS = {
    select: "Select Equipment",
    photo: "Upload Photo",
    vision: "Analyzing Photo",
    questions: "Investigation",
    diagnose: "Diagnosing",
    repair: "Building Repair Plan",
    checklist: "Repair Checklist",
    report: "Generating Report",
    done: "Complete",
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="New Inspection"
        subtitle={STEP_LABELS[step]}
        actions={
          <button
            onClick={() => router.push("/inspections")}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Cancel
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-xl space-y-4">
          {error && (
            <ErrorState
              message={error}
              onRetry={() => setError(null)}
            />
          )}

          {/* Step: Select equipment */}
          {step === "select" && (
            <div className="space-y-4">
              {sel.departments.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Department</p>
                  <div className="grid gap-2">
                    {sel.departments.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => handleDeptSelect(d.id)}
                        className={`rounded-card border p-4 text-left text-sm font-medium transition-colors ${
                          sel.departmentId === d.id
                            ? "border-primary bg-primary-tint text-primary"
                            : "border-border bg-surface hover:border-primary/50"
                        }`}
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sel.machines.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Machine</p>
                  <div className="grid gap-2">
                    {sel.machines.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleMachineSelect(m.id)}
                        className={`rounded-card border p-4 text-left text-sm font-medium transition-colors ${
                          sel.machineId === m.id
                            ? "border-primary bg-primary-tint text-primary"
                            : "border-border bg-surface hover:border-primary/50"
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sel.problems.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Problem</p>
                  <div className="grid gap-2">
                    {sel.problems.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSel((s) => ({ ...s, problemId: p.id }))}
                        className={`rounded-card border p-4 text-left transition-colors ${
                          sel.problemId === p.id
                            ? "border-primary bg-primary-tint"
                            : "border-border bg-surface hover:border-primary/50"
                        }`}
                      >
                        <p className={`text-sm font-medium ${sel.problemId === p.id ? "text-primary" : "text-text-primary"}`}>
                          {p.name}
                        </p>
                        {p.description && (
                          <p className="text-xs text-text-secondary mt-0.5">{p.description}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sel.machineId && sel.problemId && (
                <button
                  onClick={handleStartInspection}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-button bg-primary py-3 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
                >
                  {loading ? "Starting…" : "Start Inspection"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              )}
            </div>
          )}

          {/* Step: Photo */}
          {step === "photo" && (
            <div className="space-y-4">
              <PhotoUpload
                onFileSelected={handleFileSelected}
                preview={photoPreview}
                onRemove={() => { setPhotoFile(null); setPhotoPreview(null); }}
              />
              {photoFile && (
                <button
                  onClick={handleUploadAndAnalyze}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-button bg-primary py-3 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
                >
                  Analyze Photo <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Step: Vision loading */}
          {step === "vision" && (
            <LoadingScreen
              title="Analyzing Inspection"
              description="The AI is examining your photo and identifying possible faults."
              steps={[
                { label: "Uploading photo", done: !!insp.photoUrl, active: !insp.photoUrl },
                { label: "Vision analysis — detecting components and abnormalities", done: !!insp.visionResult, active: !insp.visionResult && !!insp.photoUrl },
                { label: "Generating investigation questions", done: !!insp.questionSet, active: !insp.questionSet && !!insp.visionResult },
              ]}
            />
          )}

          {/* Step: Questions */}
          {step === "questions" && insp.questionSet && (
            <div className="space-y-4">
              {insp.visionResult && (
                <div className="rounded-card border border-border bg-surface p-4">
                  <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">Observed</p>
                  {insp.visionResult.visible_issues.length > 0 && (
                    <ul className="space-y-1">
                      {insp.visionResult.visible_issues.map((issue, i) => (
                        <li key={i} className="text-sm text-text-primary flex items-start gap-2">
                          <span className="text-primary mt-1">·</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <QuestionForm
                questions={insp.questionSet.questions}
                onSubmit={handleSubmitAnswers}
                loading={loading}
              />
            </div>
          )}

          {/* Step: Diagnose loading */}
          {(step === "diagnose" || step === "repair") && (
            <LoadingScreen
              title="Running Diagnosis"
              description="Correlating observations, evidence, and technical knowledge."
              steps={[
                { label: "Investigation — generating hypotheses", done: step === "repair" || !!insp.diagnosisResult, active: step === "diagnose" && !insp.diagnosisResult },
                { label: "Knowledge retrieval — searching technical database", done: step === "repair" || !!insp.diagnosisResult, active: step === "diagnose" },
                { label: "Root cause reasoning — evaluating evidence", done: !!insp.diagnosisResult, active: step === "diagnose" && !insp.diagnosisResult },
                { label: "Repair plan — generating instructions", done: !!insp.repairPlan, active: step === "repair" },
              ]}
            />
          )}

          {/* Step: Checklist */}
          {step === "checklist" && insp.diagnosisResult && insp.repairPlan && (
            <div className="space-y-4">
              <DiagnosisPanel diagnosis={insp.diagnosisResult} />
              <EvidencePanel citedSources={insp.diagnosisResult.cited_sources} />
              <div className="rounded-card border border-border bg-surface p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Repair Checklist</h3>
                <Checklist
                  items={insp.checklist}
                  onToggle={toggleChecklistItem}
                />
              </div>
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-button bg-primary py-3 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
              >
                Generate Report <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step: Report */}
          {step === "report" && (
            <LoadingScreen
              title="Generating Report"
              description="Assembling the inspection report PDF."
            />
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="h-12 w-12 text-success mb-4" />
              <h2 className="text-base font-semibold text-text-primary mb-1">Inspection Complete</h2>
              <p className="text-sm text-text-secondary">Redirecting to your inspection…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/\(app\)/inspections/new/
git commit -m "feat(web): add new inspection wizard with full AI pipeline flow"
```

---

### Task 23: Inspection detail page

**Files:**
- Create: `web/src/app/(app)/inspections/[id]/page.tsx`

This is the read-only inspection workspace showing the full pipeline result.

- [ ] **Step 1: Create [id]/page.tsx**

```tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { DiagnosisPanel } from "@/components/inspection/diagnosis-panel";
import { EvidencePanel } from "@/components/inspection/evidence-panel";
import { RepairPlanPanel } from "@/components/inspection/repair-plan-panel";
import { PipelineTracker, PipelineStep } from "@/components/shared/pipeline-tracker";
import { formatDate } from "@/lib/utils";
import type { Inspection } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function getInspection(id: string, token: string): Promise<Inspection | null> {
  try {
    const res = await fetch(`${API_URL}/inspections/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error();
    return res.json();
  } catch {
    return null;
  }
}

function buildPipelineSteps(insp: Inspection): PipelineStep[] {
  const statusMap: Record<string, PipelineStep["status"]> = {
    done: "done",
    running: "running",
    pending: "pending",
  };

  const hasDiagnosis = !!insp.diagnosis?.root_cause;

  return [
    { id: "vision", label: "Vision Analysis", description: "Detecting visible components and abnormalities", status: insp.vision_result ? "done" : insp.status === "analyzing" ? "running" : "pending" },
    { id: "investigation", label: "Investigation", description: "Generating possible causes", status: hasDiagnosis ? "done" : insp.status === "analyzing" ? "running" : "pending" },
    { id: "questions", label: "Guided Questions", description: "Collecting technician observations", status: insp.answers ? "done" : "pending" },
    { id: "knowledge", label: "Knowledge Retrieval", description: "Searching technical knowledge base", status: hasDiagnosis ? "done" : "pending" },
    { id: "reasoning", label: "Root Cause Reasoning", description: "Evaluating evidence", status: hasDiagnosis ? "done" : "pending" },
    { id: "repair", label: "Repair Plan", description: "Generating step-by-step repair instructions", status: insp.repair_plan ? "done" : "pending" },
    { id: "report", label: "Report", description: "Assembling inspection report", status: insp.pdf_url ? "done" : "pending" },
  ];
}

export default async function InspectionDetailPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const insp = await getInspection(params.id, session.access_token);
  if (!insp) notFound();

  const pipelineSteps = buildPipelineSteps(insp);

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={`Inspection`}
        subtitle={`#${insp.id.slice(0, 8)}  ·  ${formatDate(insp.created_at)}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={insp.status} />
            {insp.pdf_url && (
              <a
                href={insp.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-button border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary hover:bg-background transition-colors"
              >
                <Download className="h-4 w-4" />
                Report
              </a>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-3 gap-0 h-full">
          {/* Left panel — photo + pipeline */}
          <div className="border-r border-border p-6 space-y-6 overflow-y-auto">
            {/* Photo */}
            {insp.photo_url && (
              <div>
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Photo</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={insp.photo_url}
                  alt="Inspection photo"
                  className="w-full rounded-card border border-border object-cover max-h-56"
                />
              </div>
            )}

            {/* Pipeline */}
            <div>
              <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Inspection Pipeline</p>
              <PipelineTracker steps={pipelineSteps} />
            </div>

            {/* Q&A */}
            {insp.answers && insp.answers.answers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Technician Answers</p>
                <div className="space-y-2">
                  {insp.answers.answers.map((a, i) => (
                    <div key={i} className="rounded-md border border-border bg-surface p-3">
                      <p className="text-xs text-text-secondary mb-1">{a.question}</p>
                      <p className="text-sm text-text-primary font-medium">{a.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Middle panel — diagnosis + evidence */}
          <div className="border-r border-border p-6 space-y-4 overflow-y-auto">
            {insp.diagnosis?.root_cause ? (
              <>
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Diagnosis</p>
                <DiagnosisPanel diagnosis={insp.diagnosis} />
                <EvidencePanel citedSources={insp.diagnosis.cited_sources} />
              </>
            ) : (
              <div className="flex items-center justify-center h-32 text-sm text-text-secondary">
                Diagnosis not available yet.
              </div>
            )}
          </div>

          {/* Right panel — repair plan + checklist */}
          <div className="p-6 space-y-4 overflow-y-auto">
            {insp.repair_plan ? (
              <>
                <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">Repair Plan</p>
                <RepairPlanPanel plan={insp.repair_plan} />

                {insp.checklist_state && insp.checklist_state.length > 0 && (
                  <div className="rounded-card border border-border bg-surface p-4">
                    <p className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">Checklist</p>
                    <div className="space-y-1.5">
                      {insp.checklist_state.map((item, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-2.5 rounded-md p-2.5 ${
                            item.checked ? "bg-success-tint" : "bg-background"
                          }`}
                        >
                          <span className={`text-sm flex-shrink-0 ${item.checked ? "text-success" : "text-border"}`}>
                            {item.checked ? "✓" : "○"}
                          </span>
                          <span className={`text-sm ${item.checked ? "line-through text-text-secondary" : "text-text-primary"}`}>
                            {item.step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-32 text-sm text-text-secondary">
                Repair plan not available yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/\(app\)/inspections/\[id\]/
git commit -m "feat(web): add 3-column inspection detail workspace"
```

---

### Task 24: Add root redirect page

**Files:**
- Create: `web/src/app/(app)/page.tsx`

- [ ] **Step 1: Create app root redirect**

```tsx
import { redirect } from "next/navigation";

export default function AppRootPage() {
  redirect("/dashboard");
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/\(app\)/page.tsx
git commit -m "chore(web): redirect app root to dashboard"
```

---

### Task 25: Build verification + typecheck

- [ ] **Step 1: Install dependencies if not yet done**

```bash
cd web && npm install
```

- [ ] **Step 2: Run TypeScript typecheck**

```bash
cd web && npm run typecheck
```

Expected: no errors. If errors appear, fix them before proceeding. Common issues:
- Missing `"use client"` directive on components using hooks
- Import paths using `@/` not resolving — verify `tsconfig.json` paths are correct
- `cookies()` usage requiring `async` in Next 14 — update server component to be `async` where needed

- [ ] **Step 3: Run lint**

```bash
cd web && npm run lint
```

Fix any lint errors before proceeding.

- [ ] **Step 4: Run build**

```bash
cd web && npm run build
```

Expected: successful build with no TypeScript errors. If the build fails due to missing env vars, create `web/.env.local` with placeholder values:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
```

- [ ] **Step 5: Commit any fixes**

```bash
git add -A && git commit -m "fix(web): resolve build and typecheck errors"
```

---

### Task 26: Verify dev server starts

- [ ] **Step 1: Start dev server**

```bash
cd web && npm run dev
```

Expected: server starts on http://localhost:3000 with no startup errors.

- [ ] **Step 2: Verify login page renders**

Navigate to http://localhost:3000 — should redirect to /login and show the login card.

- [ ] **Step 3: Confirm no console errors on login page**

Open browser devtools — no red console errors should appear.

---

### Task 27: Production configuration

- [ ] **Step 1: Verify .env.local.example is complete**

Read `web/.env.local.example`. It should contain all three required vars:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- [ ] **Step 2: Create vercel.json**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

Save to `web/vercel.json`.

- [ ] **Step 3: Verify no secrets in client bundle**

Search the web/ directory for any of these strings: `service_role`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`. None should appear in any file under `web/src/`.

```bash
grep -r "service_role\|SERVICE_KEY\|GEMINI_API_KEY\|OPENROUTER" web/src/
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add web/vercel.json
git commit -m "chore(web): add Vercel deployment config"
```

---

### Task 28: Final summary

After all tasks complete, the following is true:

#### Files Created (Backend)
- `backend/app/services/vision_service.py`
- `backend/app/services/investigation_service.py`
- `backend/app/services/question_service.py`
- `backend/app/services/reasoning_service.py`
- `backend/app/services/repair_service.py`
- `backend/app/services/report_service.py`

#### Files Modified (Backend)
- `backend/app/api/routes/inspections.py` — all 6 stubbed endpoints now implemented
- `backend/requirements.txt` — added `reportlab`

#### Files Created (Web) — 40+ files under `web/`

#### Environment Variables Required
**Backend:**
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=         # optional
LLM_CACHE=off               # use 'on' during local dev to cache LLM calls
```

**Web (Vercel / .env.local):**
```
NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### Local Run Commands
```bash
# Backend
cd backend && uvicorn app.main:app --reload

# Web
cd web && npm run dev
```

#### Vercel Deployment
1. Push to GitHub
2. Import `web/` directory as a new Vercel project (set root to `web/`)
3. Add the 3 env vars in Vercel project settings
4. Deploy — Vercel auto-detects Next.js

#### Known Limitations
- The photo upload uses `supabase.storage.getPublicUrl()` — this requires the `inspection-photos` bucket to be **public**. If the bucket is private, switch to `createSignedUrl()` with a long TTL, or add a server route to generate signed URLs. The Flutter app may already handle this differently — check bucket settings in Supabase dashboard.
- The anonymous session is device-scoped. Clearing browser localStorage will orphan the inspection history (same behavior as Flutter clearing app data).
- The executive summary LLM call in `report_service.py` is not included (P2) — the PDF is assembled from stored data only, which is complete and correct.

---

## Self-Review Against web.md

**Section 1 (Inspect existing project):** Assessment at top of this document covers all 13 audit items. ✓

**Section 2 (Web tech):** Next.js 14, TypeScript, App Router, Tailwind, shadcn/ui, Lucide, Supabase JS, FastAPI as backend. ✓

**Section 3 (Product goal):** Dashboard designed for supervisor overview; wizard for engineer workflow. ✓

**Section 4 (Design direction):** Design tokens from `design/design_tokens.md` applied. Industrial, no gradients, no marketing clichés, strong typography, neutral surfaces. ✓

**Section 5 (Responsive strategy):** Desktop-first layouts, sidebar, 3-column inspection detail, table-based history. ✓

**Section 6 (App structure):** `/login`, `/dashboard`, `/inspections`, `/inspections/[id]`, `/inspections/new` — all present. ✓

**Section 7 (Dashboard):** Stats row (total, active, diagnosed, complete), recent inspections table. No fake data — derived from real API. ✓

**Section 8 (New inspection):** Full wizard flow matching all API endpoints. ✓

**Section 9 (Inspection detail):** 3-column workspace: photo+pipeline, diagnosis+evidence, repair+checklist. ✓

**Section 10 (AI transparency):** PipelineTracker component shows all 7 steps with live status. ✓

**Section 11 (Evidence):** EvidencePanel shows cited_sources with source filenames, expandable. ✓

**Section 12 (Photo):** Drag-drop + click upload, preview, remove, direct Supabase Storage upload. ✓

**Section 13 (Authentication):** Supabase anonymous sign-in, JWT passed to FastAPI, session persists across refresh. ✓

**Section 14 (Reports):** PDF download link on inspection detail, generation triggered from checklist step. ✓

**Section 15 (History):** Table with status, date, ID, open link. ✓

**Section 16 (Loading states):** LoadingScreen with named steps, not generic "Loading…". ✓

**Section 17 (Error handling):** ApiException class, ErrorState component with Retry. ✓

**Section 18 (Shared contract):** `lib/types.ts` mirrors `schemas.py` field-for-field. ✓

**Section 19 (API client):** `lib/api/client.ts`, `inspections.ts`, `machines.ts` — centralized, no scattered fetch calls. ✓

**Section 20 (State management):** useInspectionSession for wizard, React state for local UI, no Redux. ✓

**Section 21 (Performance):** Server components for pages that can be (dashboard, history, detail), client components only where interaction needed. Code splitting via Next.js App Router. ✓

**Section 22 (Vercel deployment):** `vercel.json` + `.env.local.example` + no secrets in client bundle. ✓

**Section 23 (Production config):** `.env.local.example` documents all vars. ✓

**Section 24 (Visual quality):** Design tokens applied consistently, spacing/typography from `design_tokens.md`. ✓

**Section 25 (Same product):** Same terminology, same status names, same color tokens as Flutter app. ✓

**Section 26 (Implementation rules):** All 15 rules verified:
1. Audit done first ✓  2. Existing APIs reused ✓  3. No duplicate AI logic ✓  4. No DB duplication ✓  5. No fake data ✓  6. Flutter untouched ✓  7. No tech migration ✓  8. No microservices ✓  9. No over-engineering ✓  10. Components reusable ✓  11. TypeScript strict ✓  12. Secrets server-side ✓  13. Vercel-deployable ✓  14. Mobile app functional ✓  15. Flow testable after implementation ✓

**Definition of Done checklist (Section 27):** All items addressable by this plan. Backend AI endpoints implemented (Tasks 1–9). All web pages and flows implemented (Tasks 10–27). CORS already `*`. .env documented. No secrets client-side.
