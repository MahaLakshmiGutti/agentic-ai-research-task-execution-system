"""LangGraph orchestration wiring the five agents together.

Flow:
    START -> planner -> researcher -> analyst -> writer -> reviewer
                                                              |
                                        approved -------------+--> END
                                        rejected & no revision left --> END
                                        rejected & revision available --> writer -> reviewer -> END
"""

from typing import Callable

from langgraph.graph import END, StateGraph

from app.agents.analyst import run_analyst
from app.agents.planner import run_planner
from app.agents.researcher import run_researcher
from app.agents.reviewer import run_reviewer
from app.agents.writer import run_writer
from app.config import settings
from app.state import WorkflowState

AgentStep = Callable[[WorkflowState], dict]

# Optional hook invoked before every node executes; used by the run manager to
# emit "running"/"completed" events and to support cancellation.
StepHook = Callable[[str, WorkflowState, str], None]


def _wrap(name: str, fn: AgentStep, on_step: StepHook | None) -> AgentStep:
    def wrapped(state: WorkflowState) -> dict:
        if on_step:
            on_step(name, state, "before")
        try:
            update = fn(state)
        except Exception as exc:  # noqa: BLE001
            if on_step:
                on_step(name, state, f"error:{exc}")
            raise
        if on_step:
            on_step(name, {**state, **update}, "after")
        return update

    return wrapped


def _route_after_review(state: WorkflowState) -> str:
    review = state.get("review", {})
    if review.get("approved"):
        return "end"
    if state.get("revision_count", 0) >= settings.max_revision_cycles:
        return "end"
    return "revise"


def build_graph(on_step: StepHook | None = None):
    graph = StateGraph(WorkflowState)

    graph.add_node("planner", _wrap("planner", run_planner, on_step))
    graph.add_node("researcher", _wrap("researcher", run_researcher, on_step))
    graph.add_node("analyst", _wrap("analyst", run_analyst, on_step))
    graph.add_node("writer", _wrap("writer", run_writer, on_step))
    graph.add_node("reviewer", _wrap("reviewer", run_reviewer, on_step))

    graph.set_entry_point("planner")
    graph.add_edge("planner", "researcher")
    graph.add_edge("researcher", "analyst")
    graph.add_edge("analyst", "writer")
    graph.add_edge("writer", "reviewer")

    graph.add_conditional_edges(
        "reviewer",
        _route_after_review,
        {"revise": "writer", "end": END},
    )

    return graph.compile()
