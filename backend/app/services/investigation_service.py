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
