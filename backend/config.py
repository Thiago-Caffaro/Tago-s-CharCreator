from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    database_url: str = "sqlite:///./data/tagosCharCreator.db"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    default_model: str = "z-ai/glm-4.7"
    preferred_provider: str = "atlas-cloud"
    # Only used by refine / lorebook / fix-check (fields not covered by
    # field_max_tokens below) — full-card JSON repair (fix-card) needs far
    # more room to re-emit an entire card, so it passes its own explicit
    # max_tokens instead of relying on this global default.
    max_tokens: int = 6144
    temperature: float = 1.0
    top_p: float = 0.999
    repetition_penalty: float = 1.05   # slight penalty prevents early self-truncation
    include_reasoning: bool = False     # disable reasoning tokens to save output budget
    reasoning_effort: str = "medium"    # low | medium | high — only applies when include_reasoning is True
    initial_admin_username: str = "admin"
    initial_admin_password: str = "changeme"
    app_secret_file: str = "data/app.secret"

    # Per-field output token budgets for chunked full-card generation. Each
    # ceiling sits well above the field's actual desired size (see
    # prompt_assembler.FIELD_DESIRED_TOKENS) so models have headroom to
    # finish without being cut off mid-sentence, without going so high that
    # a verbose model can bloat a field that gets sent on every generation
    # call (description/personality/scenario are permanent context).
    # Stored as a JSON string so pydantic-settings can load it from the .env file.
    field_max_tokens_json: str = (
        '{"description":4096,"personality":2048,"scenario":2048,'
        '"first_mes":3072,"mes_example":6144,'
        '"system_prompt":2048,"post_history_instructions":512,'
        '"alternate_greetings":6144}'
    )

    @property
    def field_max_tokens(self) -> dict:
        import json
        try:
            return json.loads(self.field_max_tokens_json)
        except Exception:
            return {}

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        # data/.env is still read for one-way compatibility with older
        # installs. Editable preferences are now stored per user in SQLite.
        env_file = [".env", "data/.env"]
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
