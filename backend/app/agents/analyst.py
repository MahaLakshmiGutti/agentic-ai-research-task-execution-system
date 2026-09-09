"""Analyst Agent: analyzes research findings for trends, patterns and insights."""

import json

from app.llm import call_structured
from app.state import WorkflowState

SYSTEM_PROMPT = """You are the Analyst Agent in a multi-agent research system.
You are given the user's objective and a set of research findings gathered by
a Researcher Agent. Analyze the findings to identify trends, patterns,
comparisons, insights and conclusions.

Base your analysis strictly on the given findings. Do not invent information
that is not supported by them. If the findings are too thin to support a
category (e.g. no comparisons possible), return an empty list for it.

Quality bar:
- Each entry is one self-contained sentence that states something specific -
  name the actual models, companies, numbers or dates from the findings. Reject
  your own output if an entry would still read as true with every proper noun
  removed ("adoption is accelerating" is worthless; say who, what and how much).
- A trend describes change over time. A pattern describes something recurring
  across several findings. A comparison sets two or more named things against
  each other. An insight is a non-obvious implication. A conclusion answers the
  objective. Do not repeat the same statement across categories.
- Aim for 3-6 entries per category where the findings support it. Never pad.

Respond with ONLY a JSON object of this exact shape, no prose, no markdown fences:
{
  "trends": ["..."],
  "patterns": ["..."],
  "comparisons": ["..."],
  "insights": ["..."],
  "conclusions": ["..."]
}"""


def run_analyst(state: WorkflowState) -> dict:
    objective = state["objective"]
    findings = state.get("research_findings", [])

    user_prompt = (
        f"Research objective: {objective}\n\n"
        f"Research findings (JSON):\n{json.dumps(findings, indent=2)}"
    )
    analysis = call_structured(SYSTEM_PROMPT, user_prompt)

    normalized = {
        "trends": analysis.get("trends", []),
        "patterns": analysis.get("patterns", []),
        "comparisons": analysis.get("comparisons", []),
        "insights": analysis.get("insights", []),
        "conclusions": analysis.get("conclusions", []),
    }

    return {
        "analysis": normalized,
        "current_phase": "analyst",
        "agent_outputs": {**state.get("agent_outputs", {}), "analyst": normalized},
    }
