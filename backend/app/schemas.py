import datetime as dt
from typing import Annotated, Any

from pydantic import AfterValidator, BaseModel, Field


def _as_utc(value: dt.datetime) -> dt.datetime:
    # SQLite drops tzinfo on round-trip even though every timestamp is written
    # via datetime.now(timezone.utc); reattach it so the API always emits an
    # explicit UTC offset and clients render the correct local time.
    if value.tzinfo is None:
        return value.replace(tzinfo=dt.timezone.utc)
    return value


UtcDateTime = Annotated[dt.datetime, AfterValidator(_as_utc)]


class CreateRunRequest(BaseModel):
    objective: str = Field(min_length=3, max_length=4000)


class CreateRunResponse(BaseModel):
    run_id: str


class TaskOut(BaseModel):
    task_index: int
    title: str
    description: str
    status: str

    class Config:
        from_attributes = True


class RunStatusResponse(BaseModel):
    run_id: str
    objective: str
    status: str
    current_phase: str
    approved: bool | None
    revision_count: int
    cancelled: bool
    error: str | None
    created_at: UtcDateTime
    updated_at: UtcDateTime
    tasks: list[TaskOut]


class EventOut(BaseModel):
    id: int
    run_id: str
    timestamp: UtcDateTime
    agent: str
    status: str
    message: str
    data: dict[str, Any] | None

    class Config:
        from_attributes = True


class EventsResponse(BaseModel):
    events: list[EventOut]


class ReportResponse(BaseModel):
    run_id: str
    objective: str
    plan: list[dict[str, Any]] | None
    research_findings: list[dict[str, Any]] | None
    sources: list[dict[str, Any]] | None
    analysis: dict[str, Any] | None
    review: dict[str, Any] | None
    final_report: str | None
    approved: bool | None
    revision_count: int


class RunSummary(BaseModel):
    run_id: str
    objective: str
    status: str
    approved: bool | None
    created_at: UtcDateTime
    updated_at: UtcDateTime


class RunListResponse(BaseModel):
    runs: list[RunSummary]


class CancelResponse(BaseModel):
    run_id: str
    status: str


class HealthResponse(BaseModel):
    status: str
    openai_configured: bool
    tavily_configured: bool
    gemini_configured: bool = False
    provider: str = "openai"
    model: str = ""
