"""Writer Agent: turns research + analysis into a final report. Also handles the
single revision pass when the Reviewer rejects the draft."""

import json

from app.llm import call_text
from app.state import WorkflowState

SYSTEM_PROMPT = """You are the Writer Agent in a multi-agent research system.
Write a clear, well-structured final report in Markdown that satisfies the
user's research objective, using the provided research findings and analysis.

Rules:
- Use Markdown headings, bullet points, and tables where useful. Prefer a table
  whenever you are comparing three or more things across the same dimensions.
- You are given a pre-numbered list of sources. Cite them inline using those
  exact numbers, e.g. [1] or [2][5]. EVERY specific claim - a figure, a date, a
  named company, product or benchmark result - must carry at least one inline
  citation. A section with no citations is a defect.
- End with a "Sources" section reproducing that numbered list verbatim, same
  numbers, so the inline markers resolve.
- Do not invent facts, figures, or sources beyond what was provided. If the
  findings do not support a claim, leave it out rather than hedging it.
- Be specific over general: name the actual models, companies, numbers and
  dates present in the findings instead of describing them in the abstract.
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


def _numbered_sources(state: WorkflowState) -> str:
    """Sources as a pre-numbered list.

    The Writer is asked to cite inline as [1], [2]; handing it raw JSON left it
    with no stable numbering to cite against, so citations came out missing or
    invented. Numbering them here makes the mapping unambiguous.
    """
    sources = state.get("sources", []) or []
    if not sources:
        return "(no sources were returned)"
    return "\n".join(
        f"[{i}] {s.get('title', 'Untitled')} - {s.get('url', '')}"
        for i, s in enumerate(sources, start=1)
    )


def _context_block(state: WorkflowState) -> str:
    return (
        f"Research objective: {state['objective']}\n\n"
        f"Research findings (JSON):\n{json.dumps(state.get('research_findings', []), indent=2)}\n\n"
        f"Numbered sources - cite with these exact numbers:\n{_numbered_sources(state)}\n\n"
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
