"""Planner Agent: understands the objective and breaks it into 3-6 research subtasks."""

from app.llm import call_structured
from app.state import WorkflowState

SYSTEM_PROMPT = """You are the Planner Agent in a multi-agent research system.
Your job is to understand the user's research objective and break it down into
3 to 6 concrete, non-overlapping research subtasks that, together, would let a
research team fully address the objective.

Hard rules:
- Every subtask must be a research question a web search can actually answer.
- Do NOT emit meta-tasks about producing the deliverable - no "compile the
  report", "write the summary", "synthesize the findings", "structure the
  output". Downstream agents already analyze, write and review; a subtask spent
  on those wastes a web search and returns nothing usable.
- Subtasks must not overlap, and together must span the whole objective. If the
  objective names specific facets (e.g. "trends, companies, challenges"), each
  gets its own subtask.
- Titles are 2-6 words. Descriptions say what to look for, not how to write it.

Respond with ONLY a JSON object of this exact shape, no prose, no markdown fences:
{
  "tasks": [
    {"title": "short task title", "description": "1-2 sentence description of what to research and why it matters"}
  ]
}
Produce between 3 and 6 tasks."""


def run_planner(state: WorkflowState) -> dict:
    objective = state["objective"]
    user_prompt = f"User research objective:\n{objective}"

    result = call_structured(SYSTEM_PROMPT, user_prompt)
    raw_tasks = result.get("tasks", [])
    if not raw_tasks:
        raise ValueError("Planner produced no tasks")

    tasks = [
        {
            "id": idx,
            "title": t.get("title", f"Task {idx}"),
            "description": t.get("description", ""),
        }
        for idx, t in enumerate(raw_tasks[:6])
    ]

    return {
        "plan": tasks,
        "current_phase": "planner",
        "agent_outputs": {**state.get("agent_outputs", {}), "planner": {"tasks": tasks}},
    }
