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
