from typing import Any, TypedDict


class PlanTask(TypedDict):
    id: int
    title: str
    description: str


class Source(TypedDict):
    url: str
    title: str
    snippet: str


class ResearchFinding(TypedDict):
    task_id: int
    task_title: str
    summary: str
    key_points: list[str]
    source_urls: list[str]


class Analysis(TypedDict, total=False):
    trends: list[str]
    patterns: list[str]
    comparisons: list[str]
    insights: list[str]
    conclusions: list[str]


class Review(TypedDict, total=False):
    approved: bool
    feedback: str
    required_changes: list[str]
    completeness: str
    relevance: str
    consistency: str
    factual_support: str
    objective_satisfied: bool


class WorkflowState(TypedDict, total=False):
    run_id: str
    objective: str

    plan: list[PlanTask]
    research_findings: list[ResearchFinding]
    sources: list[Source]
    analysis: Analysis
    draft: str
    review: Review
    approved: bool
    revision_count: int

    current_phase: str
    agent_outputs: dict[str, Any]
    errors: list[str]

    final_report: str
    cancelled: bool
