from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    database_url: str = "sqlite:///./data/tagosCharCreator.db"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    default_model: str = "z-ai/glm-4.7"
    preferred_provider: str = "atlas-cloud"
    max_tokens: int = 32768
    temperature: float = 1.0
    top_p: float = 0.999
    repetition_penalty: float = 1.05   # slight penalty prevents early self-truncation
    include_reasoning: bool = False     # disable reasoning tokens to save output budget

    # Per-field output token budgets for chunked full-card generation.
    # Stored as a JSON string so pydantic-settings can load it from the .env file.
    field_max_tokens_json: str = (
        '{"description":12288,"personality":6144,"scenario":4096,'
        '"first_mes":9216,"mes_example":24576,'
        '"system_prompt":9216,"post_history_instructions":4096,'
        '"alternate_greetings":18432}'
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
        # .env (local dev) is loaded first; data/.env (written by the settings
        # panel and stored in the Docker volume) overrides it so user changes
        # survive container restarts and rebuilds.
        env_file = [".env", "data/.env"]
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()


def persist_settings():
    """Persist current settings to data/.env so they survive container restarts.

    data/ is mounted as a Docker volume, so this file outlives the container
    image. On the next start pydantic-settings loads it as an override on top
    of any environment variables passed by Docker / Portainer.
    """
    import os
    os.makedirs("data", exist_ok=True)
    lines = [
        f"OPENROUTER_API_KEY={settings.openrouter_api_key}",
        f"OPENROUTER_BASE_URL={settings.openrouter_base_url}",
        f"DATABASE_URL={settings.database_url}",
        f"CORS_ORIGINS={settings.cors_origins}",
        f"DEFAULT_MODEL={settings.default_model}",
        f"PREFERRED_PROVIDER={settings.preferred_provider}",
        f"MAX_TOKENS={settings.max_tokens}",
        f"TEMPERATURE={settings.temperature}",
        f"TOP_P={settings.top_p}",
        f"REPETITION_PENALTY={settings.repetition_penalty}",
        f"FIELD_MAX_TOKENS_JSON={settings.field_max_tokens_json}",
    ]
    try:
        with open("data/.env", "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
    except Exception:
        pass
