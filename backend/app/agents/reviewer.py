"""Reviewer/Critic Agent: reviews the Writer's draft against the objective and evidence."""

import json

from app.llm import call_structured
from app.state import WorkflowState

SYSTEM_PROMPT = """You are the Reviewer/Critic Agent in a multi-agent research system.
Critically review the draft report against the original objective, the research
findings, and the analysis it was supposed to be based on. Check:
- completeness: does it cover the objective and the planned subtasks?
- relevance: does the content stay focused on the objective?
- consistency: are there contradictions or unsupported leaps?
- factual support: are claims grounded in the provided research findings/sources?
- whether the user's objective was ultimately satisfied

Be strict but fair. Only reject if there are real, actionable problems.

Respond with ONLY a JSON object of this exact shape, no prose, no markdown fences:
{
  "approved": true or false,
  "completeness": "short assessment",
  "relevance": "short assessment",
  "consistency": "short assessment",
  "factual_support": "short assessment",
  "objective_satisfied": true or false,
  "feedback": "overall feedback paragraph",
  "required_changes": ["specific actionable change 1", "..."]
}
If approved is true, required_changes should be an empty list."""


def run_reviewer(state: WorkflowState) -> dict:
    is_revision_pass = state.get("revision_count", 0) > 0
    phase = "reviewer_revision" if is_revision_pass else "reviewer"

    user_prompt = (
        f"Research objective: {state['objective']}\n\n"
        f"Research findings (JSON):\n{json.dumps(state.get('research_findings', []), indent=2)}\n\n"
        f"Analysis (JSON):\n{json.dumps(state.get('analysis', {}), indent=2)}\n\n"
        f"Draft report:\n{state.get('draft', '')}"
    )
    review = call_structured(SYSTEM_PROMPT, user_prompt)

    normalized = {
        "approved": bool(review.get("approved", False)),
        "completeness": review.get("completeness", ""),
        "relevance": review.get("relevance", ""),
        "consistency": review.get("consistency", ""),
        "factual_support": review.get("factual_support", ""),
        "objective_satisfied": bool(review.get("objective_satisfied", False)),
        "feedback": review.get("feedback", ""),
        "required_changes": review.get("required_changes", []),
    }

    return {
        "review": normalized,
        "approved": normalized["approved"],
        "current_phase": phase,
        "agent_outputs": {**state.get("agent_outputs", {}), phase: normalized},
    }
