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

Also check that inline citations are present: specific claims - figures, dates,
named companies, products or benchmark results - should carry a [n] marker that
resolves to the report's Sources list. A section of specific claims with no
citations is a real defect worth rejecting for.

Be strict but fair, and calibrate: the system grants exactly ONE revision, so
reject only for problems the Writer can actually fix from the findings it
already has. Do not reject for missing information that was never researched,
and do not reject over style, length or tone alone. If the report is accurate,
covers the objective and cites its claims, approve it.

Each required_change must name the specific section and the concrete fix. Vague
instructions like "add more detail" are not actionable - say what to add and
where. Keep the list to at most 4 items, ordered by importance.

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
    if is_revision_pass:
        user_prompt += (
            "\n\nThis is the revised draft after your one allowed revision request - there is no "
            "further revision after this. Assess it honestly, but write your feedback as final "
            "acceptance notes (remaining minor caveats, not blocking issues)."
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

    if is_revision_pass:
        # The system grants exactly one revision, so the Reviewer only gets to
        # reject once (the first pass, which triggers that revision). This
        # final pass always accepts the revised draft rather than rejecting
        # it into a dead end with no report ever delivered.
        normalized["approved"] = True
        normalized["required_changes"] = []

    return {
        "review": normalized,
        "approved": normalized["approved"],
        "current_phase": phase,
        "agent_outputs": {**state.get("agent_outputs", {}), phase: normalized},
    }
