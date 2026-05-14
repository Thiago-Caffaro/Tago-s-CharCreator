from openai import OpenAI
from ..config import settings

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    _client = OpenAI(
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
    )
    return _client


def stream_message(system: str, user: str):
    client = get_client()
    extra: dict = {}
    if settings.preferred_provider:
        extra["extra_body"] = {"provider": {"only": [settings.preferred_provider]}}
    stream = client.chat.completions.create(
        model=settings.default_model,
        max_tokens=settings.max_tokens,
        temperature=settings.temperature,
        top_p=settings.top_p,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        stream=True,
        **extra,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


def count_tokens(system: str, user: str) -> int:
    # OpenRouter não tem endpoint de contagem — estimativa simples por caracteres
    total_chars = len(system) + len(user)
    return total_chars // 4
