import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")


class Settings:
    # Which provider the agents talk to by default. Switchable at runtime from
    # the UI (see app/model_config.py) so a demo can move between providers
    # without a restart.
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


settings = Settings()
