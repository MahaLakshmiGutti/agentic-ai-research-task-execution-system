"""Writer Agent: turns research + analysis into a final report. Also handles the
single revision pass when the Reviewer rejects the draft."""

import json

from app.llm import call_text
from app.state import WorkflowState

SYSTEM_PROMPT = """You are the Writer Agent in a multi-agent research system.
Write a clear, well-structured final report in Markdown that satisfies the
user's research objective, using the provided research findings and analysis.

Rules:
- Use Markdown headings, bullet points, and tables where useful.
- Include a "Sources" section at the end listing the source URLs actually
  provided to you. Cite sources inline (e.g. [1], [2]) where claims come from
  them, matching the numbering in the Sources section.
- Do not invent facts, figures, or sources beyond what was provided.
- Structure: Title, Executive Summary, then sections covering each relevant
  subtask/finding, an Analysis / Insights section, a Conclusion, and Sources.
Output ONLY the Markdown report, no surrounding commentary."""

REVISION_SYSTEM_PROMPT = """You are the Writer Agent revising a report after
feedback from a Reviewer/Critic Agent. You get the original draft, the research
findings/analysis it was based on, and the reviewer's feedback and required
changes. Produce a revised, complete Markdown report that addresses every
required change while keeping everything that was already correct and
well-supported. Do not invent facts, figures, or sources beyond what was
provided. Output ONLY the revised Markdown report, no surrounding commentary."""


def _context_block(state: WorkflowState) -> str:
    return (
        f"Research objective: {state['objective']}\n\n"
        f"Research findings (JSON):\n{json.dumps(state.get('research_findings', []), indent=2)}\n\n"
        f"Sources (JSON):\n{json.dumps(state.get('sources', []), indent=2)}\n\n"
        f"Analysis (JSON):\n{json.dumps(state.get('analysis', {}), indent=2)}"
    )


def run_writer(state: WorkflowState) -> dict:
    is_revision = bool(state.get("review"))

    if is_revision:
        review = state["review"]
        user_prompt = (
            f"{_context_block(state)}\n\n"
            f"Original draft:\n{state.get('draft', '')}\n\n"
            f"Reviewer feedback:\n{review.get('feedback', '')}\n\n"
            f"Required changes:\n"
            + "\n".join(f"- {c}" for c in review.get("required_changes", []))
        )
        draft = call_text(REVISION_SYSTEM_PROMPT, user_prompt)
        phase = "writer_revision"
    else:
        user_prompt = _context_block(state)
        draft = call_text(SYSTEM_PROMPT, user_prompt)
        phase = "writer"

    revision_count = state.get("revision_count", 0) + (1 if is_revision else 0)

    return {
        "draft": draft,
        "current_phase": phase,
        "revision_count": revision_count,
        "agent_outputs": {
            **state.get("agent_outputs", {}),
            phase: {"draft": draft},
        },
    }
