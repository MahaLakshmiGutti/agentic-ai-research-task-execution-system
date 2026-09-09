import json
import re
import time

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

from app import model_config


# Newer frontier models reject an explicit temperature ("Unsupported value:
# 'temperature' does not support 0.2 with this model"). Rather than hard-coding
# a model list that goes stale, learn it at runtime: the first rejection for a
# model is remembered and every later call for it omits temperature.
_TEMPERATURE_UNSUPPORTED: set[str] = set()


def _build(provider: str, model: str, temperature: float | None) -> BaseChatModel:
    api_key = model_config.api_key_for(provider)
    if not api_key:
        spec = model_config.PROVIDERS[provider]
        raise RuntimeError(
            f"{spec.env_key} is not set. Add it to backend/.env before running a research task."
        )

    send_temperature = temperature is not None and f"{provider}:{model}" not in _TEMPERATURE_UNSUPPORTED

    if provider == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI

        kwargs: dict = {"model": model, "google_api_key": api_key}
        if send_temperature:
            kwargs["temperature"] = temperature
        return ChatGoogleGenerativeAI(**kwargs)

    from langchain_openai import ChatOpenAI

    kwargs = {"model": model, "api_key": api_key}
    if send_temperature:
        kwargs["temperature"] = temperature
    return ChatOpenAI(**kwargs)


def get_llm(temperature: float | None = 0.2) -> BaseChatModel:
    provider, model = model_config.get_active()
    return _build(provider, model, temperature)


_RETRY_AFTER = re.compile(r"retry in ([0-9.]+)\s*s", re.IGNORECASE)
_MAX_RATE_LIMIT_RETRIES = 4
_MAX_SLEEP_SECONDS = 65.0


def _is_rate_limited(exc: Exception) -> bool:
    text = str(exc).lower()
    return "429" in text or "resource_exhausted" in text or "rate limit" in text


def _retry_delay(exc: Exception, attempt: int) -> float:
    """Honour the provider's own retry hint when it gives one."""
    match = _RETRY_AFTER.search(str(exc))
    if match:
        return min(float(match.group(1)) + 1.0, _MAX_SLEEP_SECONDS)
    return min(5.0 * (2**attempt), _MAX_SLEEP_SECONDS)


def _invoke(messages: list, temperature: float | None):
    """Invoke the active model.

    Handles the two failure modes that otherwise abort a whole pipeline run:
    a model that refuses an explicit temperature, and provider rate limits.
    The Researcher fires one call per subtask back to back, which alone can
    exceed a free tier's requests-per-minute allowance, so a 429 is retried
    with the delay the provider asks for rather than failing the run.
    """
    provider, model = model_config.get_active()
    attempt = 0

    while True:
        try:
            return _build(provider, model, temperature).invoke(messages)
        except Exception as exc:  # noqa: BLE001 - each provider raises its own error types
            cache_key = f"{provider}:{model}"

            if "temperature" in str(exc).lower() and cache_key not in _TEMPERATURE_UNSUPPORTED:
                _TEMPERATURE_UNSUPPORTED.add(cache_key)
                temperature = None
                continue

            if _is_rate_limited(exc) and attempt < _MAX_RATE_LIMIT_RETRIES:
                time.sleep(_retry_delay(exc, attempt))
                attempt += 1
                continue

            raise


_JSON_FENCE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)


def _content_to_text(content) -> str:
    """Normalize a LangChain message's .content to plain text.

    Some models (e.g. when they emit reasoning/signature metadata) return
    content as a list of blocks like
    [{"type": "text", "text": "..."}, ...] instead of a plain string.
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
        return "".join(parts)
    return str(content)


def _extract_json(text: str) -> str:
    match = _JSON_FENCE.search(text)
    if match:
        return match.group(1)
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1]
    return text


def call_structured(system_prompt: str, user_prompt: str, temperature: float = 0.2) -> dict:
    """Call the model and parse a JSON object from the response, tolerating markdown fences."""
    messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
    response = _invoke(messages, temperature)
    text = _content_to_text(response.content)
    raw = _extract_json(text)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Model did not return valid JSON: {exc}\nRaw output: {text[:2000]}") from exc


def call_text(system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str:
    messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
    response = _invoke(messages, temperature)
    return _content_to_text(response.content)
