"""Which provider/model the agents currently run on.

Selected in the UI and held in memory, so a demo can switch between providers
mid-session without editing .env or restarting. The .env values seed the
initial selection; API keys themselves always come from .env and are never
settable over the API.
"""

from dataclasses import dataclass
from threading import Lock

from app.config import settings


@dataclass(frozen=True)
class ModelOption:
    id: str
    label: str
    note: str


@dataclass(frozen=True)
class ProviderSpec:
    id: str
    label: str
    env_key: str
    models: tuple[ModelOption, ...]
    default_model: str


# Curated rather than fetched live: a provider's /models endpoint lists
# embedding, audio and image models the agents cannot use, and ordering it
# usefully needs judgement a list endpoint does not provide. Any model id can
# still be typed in manually from the settings panel.
PROVIDERS: dict[str, ProviderSpec] = {
    "openai": ProviderSpec(
        id="openai",
        label="OpenAI",
        env_key="OPENAI_API_KEY",
        default_model="gpt-5.5",
        models=(
            ModelOption("gpt-5.5", "GPT-5.5", "Balanced reasoning and prose - recommended"),
            ModelOption("gpt-5.4", "GPT-5.4", "Faster, slightly lighter reasoning"),
            ModelOption("gpt-5.6-terra", "GPT-5.6 Terra", "Newer, strong structured output"),
            ModelOption("gpt-5.4-mini", "GPT-5.4 mini", "Cheapest sensible option"),
            ModelOption("gpt-4.1", "GPT-4.1", "Reliable older baseline"),
            ModelOption("gpt-4o-mini", "GPT-4o mini", "Lowest cost, noticeably terser"),
            ModelOption("gpt-6-astra", "GPT-6 Astra", "Flagship - slowest and priciest"),
        ),
    ),
    "google": ProviderSpec(
        id="google",
        label="Google Gemini",
        env_key="GEMINI_API_KEY",
        default_model="gemini-3.1-flash-lite",
        models=(
            ModelOption(
                "gemini-3.1-flash-lite",
                "Gemini 3.1 Flash Lite",
                "Lightest, most free-tier headroom - recommended",
            ),
            ModelOption("gemini-flash-latest", "Gemini Flash (latest)", "Tracks current flash"),
            ModelOption(
                "gemini-3.5-flash",
                "Gemini 3.5 Flash",
                "Free tier is only 20 requests/day - exhausts fast",
            ),
            ModelOption(
                "gemini-3.1-pro-preview",
                "Gemini 3.1 Pro Preview",
                "Pro tier - needs billing, no free quota",
            ),
        ),
    ),
}


def api_key_for(provider: str) -> str:
    return {
        "openai": settings.openai_api_key,
        "google": settings.gemini_api_key,
    }.get(provider, "")


def is_configured(provider: str) -> bool:
    return bool(api_key_for(provider))


_lock = Lock()


def _seed() -> tuple[str, str]:
    provider = settings.llm_provider if settings.llm_provider in PROVIDERS else "openai"
    model = settings.openai_model if provider == "openai" else settings.gemini_model
    return provider, model or PROVIDERS[provider].default_model


_provider, _model = _seed()


def get_active() -> tuple[str, str]:
    with _lock:
        return _provider, _model


def set_active(provider: str, model: str) -> tuple[str, str]:
    """Switch the active provider/model. Raises ValueError on bad input."""
    provider = (provider or "").strip().lower()
    model = (model or "").strip()

    if provider not in PROVIDERS:
        raise ValueError(f"Unknown provider '{provider}'. Expected one of: {', '.join(PROVIDERS)}")
    if not model:
        raise ValueError("A model id is required")
    if not is_configured(provider):
        raise ValueError(
            f"{PROVIDERS[provider].label} is not configured - set "
            f"{PROVIDERS[provider].env_key} in backend/.env and restart the backend."
        )

    global _provider, _model
    with _lock:
        _provider, _model = provider, model
    return provider, model
