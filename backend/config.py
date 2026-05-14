from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    database_url: str = "sqlite:///./data/tagosCharCreator.db"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    default_model: str = "anthropic/claude-sonnet-4-5"
    preferred_provider: str = ""
    max_tokens: int = 8192
    temperature: float = 1.0
    top_p: float = 0.999

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
