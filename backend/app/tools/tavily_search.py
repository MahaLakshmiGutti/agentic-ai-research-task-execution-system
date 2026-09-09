"""Real web search tool backed by Tavily. Used by the Researcher Agent only."""

from langchain_core.tools import tool
from tavily import TavilyClient

from app.config import settings

_client: TavilyClient | None = None


def _get_client() -> TavilyClient:
    global _client
    if _client is None:
        if not settings.tavily_api_key:
            raise RuntimeError(
                "TAVILY_API_KEY is not set. Add it to backend/.env before running a research task."
            )
        _client = TavilyClient(api_key=settings.tavily_api_key)
    return _client


@tool("tavily_web_search")
def tavily_web_search(query: str) -> list[dict]:
    """Search the live web via Tavily and return a list of results, each with
    'title', 'url' and 'content' (a short snippet). Use specific, focused queries."""
    client = _get_client()
    response = client.search(
        query=query,
        max_results=settings.tavily_results_per_task,
        search_depth="advanced",
    )
    results = []
    for item in response.get("results", []):
        results.append(
            {
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "content": item.get("content", ""),
            }
        )
    return results
