"""Ties the LangGraph workflow to SQLite persistence: run lifecycle, per-agent
events, task rows, cancellation, and the final report."""

import logging
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.graph import build_graph
from app.models import Event, Report, Run, Task
from app.state import WorkflowState

logger = logging.getLogger("run_manager")

# Fast in-memory cancellation flags, backed by the DB `cancelled` column for
# durability across a restart.
_CANCELLED_RUN_IDS: set[str] = set()

AGENT_LABELS = {
    "planner": "Planner",
    "researcher": "Researcher",
    "analyst": "Analyst",
    "writer": "Writer",
    "writer_revision": "Writer (Revision)",
    "reviewer": "Reviewer",
    "reviewer_revision": "Reviewer (Revision)",
}

RUNNING_MESSAGES = {
    "planner": "Understanding the objective and drafting an execution plan...",
    "researcher": "Researching subtasks with Tavily web search...",
    "analyst": "Analyzing research findings for trends and insights...",
    "writer": "Writing the final report from research and analysis...",
    "writer_revision": "Revising the report based on reviewer feedback...",
    "reviewer": "Reviewing the draft for completeness, relevance and accuracy...",
    "reviewer_revision": "Re-reviewing the revised draft...",
}


class RunCancelled(Exception):
    pass


def create_run(objective: str) -> str:
    run_id = str(uuid.uuid4())
    db = SessionLocal()
    try:
        run = Run(id=run_id, objective=objective, status="pending", current_phase="planner")
        db.add(run)
        db.commit()
        _log_event(db, run_id, "system", "pending", "Run created, waiting to start.")
    finally:
        db.close()
    return run_id


def cancel_run(run_id: str) -> bool:
    db = SessionLocal()
    try:
        run = db.get(Run, run_id)
        if run is None:
            return False
        if run.status in ("completed", "failed", "cancelled"):
            return False
        run.cancelled = True
        db.commit()
        _CANCELLED_RUN_IDS.add(run_id)
        _log_event(db, run_id, "system", "cancelling", "Cancellation requested.")
        return True
    finally:
        db.close()


def _log_event(
    db: Session, run_id: str, agent: str, status: str, message: str, data: dict | None = None
) -> None:
    db.add(Event(run_id=run_id, agent=agent, status=status, message=message, data=data))
    db.commit()


def _event_data(agent: str, state: WorkflowState) -> dict[str, Any] | None:
    if agent == "planner":
        return {"tasks": state.get("plan", [])}
    if agent == "researcher":
        return {"findings": state.get("research_findings", []), "sources": state.get("sources", [])}
    if agent == "analyst":
        return {"analysis": state.get("analysis", {})}
    if agent in ("writer", "writer_revision"):
        return {"draft": state.get("draft", "")}
    if agent in ("reviewer", "reviewer_revision"):
        return {"review": state.get("review", {})}
    return None


def _completion_message(agent: str, state: WorkflowState) -> str:
    if agent == "planner":
        return f"Produced {len(state.get('plan', []))} research subtasks."
    if agent == "researcher":
        return (
            f"Gathered findings for {len(state.get('research_findings', []))} subtasks "
            f"from {len(state.get('sources', []))} sources."
        )
    if agent == "analyst":
        analysis = state.get("analysis", {})
        return f"Identified {len(analysis.get('insights', []))} key insights."
    if agent in ("writer", "writer_revision"):
        return "Draft report written."
    if agent in ("reviewer", "reviewer_revision"):
        review = state.get("review", {})
        return "Draft approved." if review.get("approved") else "Draft rejected, revision requested."
    return "Step completed."


def _run_pipeline(run_id: str, objective: str) -> None:
    db = SessionLocal()

    def on_step(agent: str, state: WorkflowState, phase: str) -> None:
        if run_id in _CANCELLED_RUN_IDS:
            _log_event(db, run_id, agent, "failed", "Run cancelled by user.")
            raise RunCancelled(run_id)

        run = db.get(Run, run_id)
        if run is None:
            return

        if phase == "before":
            run.current_phase = agent
            db.commit()
            _log_event(db, run_id, agent, "running", RUNNING_MESSAGES.get(agent, "Working..."))
        elif phase == "after":
            run.current_phase = agent
            db.commit()
            _log_event(
                db,
                run_id,
                agent,
                "completed",
                _completion_message(agent, state),
                _event_data(agent, state),
            )
            if agent == "planner":
                for task in state.get("plan", []):
                    db.add(
                        Task(
                            run_id=run_id,
                            task_index=task["id"],
                            title=task["title"],
                            description=task["description"],
                            status="completed",
                        )
                    )
                db.commit()
        elif phase.startswith("error:"):
            _log_event(db, run_id, agent, "failed", phase[len("error:") :])

    try:
        run = db.get(Run, run_id)
        run.status = "running"
        db.commit()

        graph = build_graph(on_step=on_step)
        initial_state: WorkflowState = {
            "run_id": run_id,
            "objective": objective,
            "revision_count": 0,
            "agent_outputs": {},
            "errors": [],
        }
        final_state = graph.invoke(initial_state, config={"recursion_limit": 25})

        run = db.get(Run, run_id)
        run.status = "completed"
        run.approved = final_state.get("approved")
        run.revision_count = final_state.get("revision_count", 0)
        run.current_phase = "completed"
        db.commit()

        db.add(
            Report(
                run_id=run_id,
                plan=final_state.get("plan", []),
                research_findings=final_state.get("research_findings", []),
                sources=final_state.get("sources", []),
                analysis=final_state.get("analysis", {}),
                review=final_state.get("review", {}),
                final_report=final_state.get("draft", ""),
            )
        )
        db.commit()
        _log_event(db, run_id, "system", "completed", "Run completed.")
    except RunCancelled:
        run = db.get(Run, run_id)
        if run is not None:
            run.status = "cancelled"
            run.current_phase = "cancelled"
            db.commit()
    except Exception as exc:  # noqa: BLE001
        logger.exception("Pipeline failed for run %s", run_id)
        run = db.get(Run, run_id)
        if run is not None:
            run.status = "failed"
            run.error = str(exc)
            db.commit()
        _log_event(db, run_id, "system", "failed", f"Run failed: {exc}")
    finally:
        _CANCELLED_RUN_IDS.discard(run_id)
        db.close()


def run_pipeline_sync(run_id: str, objective: str) -> None:
    """Entry point executed on a worker thread (see main.py)."""
    _run_pipeline(run_id, objective)
