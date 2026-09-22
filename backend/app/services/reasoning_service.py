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
