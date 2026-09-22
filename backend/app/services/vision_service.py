import base64

import httpx

from app.models.schemas import VisionResult
from app.services import llm_client, prompts


async def analyze(photo_url: str, problem_name: str) -> VisionResult:
    """Download photo from URL, base64-encode it, call Vision LLM, return VisionResult."""
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
