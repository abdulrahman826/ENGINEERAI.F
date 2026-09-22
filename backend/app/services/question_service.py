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
