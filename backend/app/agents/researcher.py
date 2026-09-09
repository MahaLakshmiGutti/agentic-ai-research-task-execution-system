"""Researcher Agent: researches each subtask using the Tavily web search tool."""

from app.llm import call_structured
from app.state import WorkflowState
from app.tools.tavily_search import tavily_web_search

SYSTEM_PROMPT = """You are the Researcher Agent in a multi-agent research system.
You are given a research objective, one subtask, and a list of raw web search
results (title, url, content snippet) gathered by a real search tool.

Summarize ONLY what is supported by the provided search results. Do not invent
facts, statistics, or sources that are not present in the results. If the
results are thin or irrelevant, say so plainly in the summary.

Respond with ONLY a JSON object of this exact shape, no prose, no markdown fences:
{
  "summary": "a few sentences summarizing findings for this subtask, grounded only in the results",
  "key_points": ["short factual bullet point", "..."],
  "source_urls": ["url1", "url2"]
}
Only include source_urls that were actually present in the given search results."""


def run_researcher(state: WorkflowState) -> dict:
    objective = state["objective"]
    plan = state.get("plan", [])

    findings = []
    all_sources: dict[str, dict] = {}

    for task in plan:
        query = f"{task['title']} - {task['description']}".strip()
        try:
            results = tavily_web_search.invoke({"query": query})
        except Exception as exc:  # noqa: BLE001
            results = []
            error_note = str(exc)
        else:
            error_note = None

        for r in results:
            url = r.get("url")
            if url and url not in all_sources:
                all_sources[url] = {
                    "url": url,
                    "title": r.get("title", ""),
                    "snippet": r.get("content", "")[:400],
                }

        if not results:
            findings.append(
                {
                    "task_id": task["id"],
                    "task_title": task["title"],
                    "summary": f"No search results were available for this subtask."
                    + (f" ({error_note})" if error_note else ""),
                    "key_points": [],
                    "source_urls": [],
                }
            )
            continue

        results_text = "\n\n".join(
            f"Title: {r.get('title', '')}\nURL: {r.get('url', '')}\nContent: {r.get('content', '')}"
            for r in results
        )
        user_prompt = (
            f"Research objective: {objective}\n\n"
            f"Subtask: {task['title']}\n{task['description']}\n\n"
            f"Search results:\n{results_text}"
        )
        parsed = call_structured(SYSTEM_PROMPT, user_prompt)
        findings.append(
            {
                "task_id": task["id"],
                "task_title": task["title"],
                "summary": parsed.get("summary", ""),
                "key_points": parsed.get("key_points", []),
                "source_urls": parsed.get("source_urls", []),
            }
        )

    sources = list(all_sources.values())

    return {
        "research_findings": findings,
        "sources": sources,
        "current_phase": "researcher",
        "agent_outputs": {
            **state.get("agent_outputs", {}),
            "researcher": {"findings": findings, "sources": sources},
        },
    }
