import json
import re

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.config import settings


def get_llm(temperature: float = 0.2) -> ChatOpenAI:
    if not settings.openai_api_key:
        raise RuntimeError(
            "OPENAI_API_KEY is not set. Add it to backend/.env before running a research task."
        )
    return ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key,
        temperature=temperature,
    )


_JSON_FENCE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)


def _content_to_text(content) -> str:
    """Normalize a LangChain message's .content to plain text.

    Some Gemini responses (e.g. when the model emits thinking/signature
    metadata) come back as a list of content blocks like
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
    """Call Gemini and parse a JSON object from the response, tolerating markdown fences."""
    llm = get_llm(temperature=temperature)
    messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
    response = llm.invoke(messages)
    text = _content_to_text(response.content)
    raw = _extract_json(text)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Model did not return valid JSON: {exc}\nRaw output: {text[:2000]}") from exc


def call_text(system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str:
    llm = get_llm(temperature=temperature)
    messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
    response = llm.invoke(messages)
    return _content_to_text(response.content)
