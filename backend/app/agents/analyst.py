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
