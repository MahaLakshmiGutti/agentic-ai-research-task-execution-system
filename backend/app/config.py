import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")


class Settings:
    # Which provider the agents talk to. Fixed for the process's lifetime -
    # change it in .env and restart the backend to switch providers.
    llm_provider: str = os.getenv("LLM_PROVIDER", "openai").strip().lower()

    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-5.5")

    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

    tavily_api_key: str = os.getenv("TAVILY_API_KEY", "")
    cors_origins: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    ]
    database_path: str = os.getenv("DATABASE_PATH", "data/app.db")
    max_revision_cycles: int = 1
    tavily_results_per_task: int = 4

    @property
    def database_url(self) -> str:
        db_file = (BACKEND_DIR / self.database_path).resolve()
        db_file.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{db_file}"

    @property
    def active_model(self) -> str:
        return self.openai_model if self.llm_provider == "openai" else self.gemini_model

    def api_key_for(self, provider: str) -> str:
        return {"openai": self.openai_api_key, "google": self.gemini_api_key}.get(provider, "")


settings = Settings()
