import asyncio
import threading

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import SessionLocal, init_db
from app.models import Event, Report, Run
from app.schemas import (
    CancelResponse,
    CreateRunRequest,
    CreateRunResponse,
    EventsResponse,
    HealthResponse,
    ReportResponse,
    RunListResponse,
    RunStatusResponse,
    RunSummary,
)
from app.services.run_manager import cancel_run, create_run, run_pipeline_sync

app = FastAPI(title="Agentic AI Research & Task Execution System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        openai_configured=bool(settings.openai_api_key),
        tavily_configured=bool(settings.tavily_api_key),
    )


@app.post("/api/runs", response_model=CreateRunResponse)
async def create_run_endpoint(payload: CreateRunRequest) -> CreateRunResponse:
    # create_run() does a blocking SQLite write; run it off the event loop
    # thread so a momentary lock wait (from a background pipeline thread
    # writing events concurrently) can't stall every other request.
    run_id = await asyncio.to_thread(create_run, payload.objective)
    # A plain daemon thread, not asyncio.to_thread()/run_in_executor(): the
    # pipeline runs for a minute or more, and asyncio's default executor is a
    # small, shared, fixed-size pool (min(32, cpu_count+4)). A few concurrent
    # runs would occupy nearly all of those slots for their entire lifetime,
    # starving every other request - including fast, unrelated ones like
    # /api/health - which then queue behind them until they time out.
    threading.Thread(
        target=run_pipeline_sync, args=(run_id, payload.objective), daemon=True
    ).start()
    return CreateRunResponse(run_id=run_id)


@app.get("/api/runs", response_model=RunListResponse)
def list_runs(limit: int = 50) -> RunListResponse:
    db = SessionLocal()
    try:
        runs = db.query(Run).order_by(Run.created_at.desc()).limit(limit).all()
        return RunListResponse(
            runs=[
                RunSummary(
                    run_id=r.id,
                    objective=r.objective,
                    status=r.status,
                    approved=r.approved,
                    created_at=r.created_at,
                    updated_at=r.updated_at,
                )
                for r in runs
            ]
        )
    finally:
        db.close()


@app.get("/api/runs/{run_id}", response_model=RunStatusResponse)
def get_run(run_id: str) -> RunStatusResponse:
    db = SessionLocal()
    try:
        run = db.get(Run, run_id)
        if run is None:
            raise HTTPException(status_code=404, detail="Run not found")
        tasks = sorted(run.tasks, key=lambda t: t.task_index)
        return RunStatusResponse(
            run_id=run.id,
            objective=run.objective,
            status=run.status,
            current_phase=run.current_phase,
            approved=run.approved,
            revision_count=run.revision_count,
            cancelled=run.cancelled,
            error=run.error,
            created_at=run.created_at,
            updated_at=run.updated_at,
            tasks=[
                {
                    "task_index": t.task_index,
                    "title": t.title,
                    "description": t.description,
                    "status": t.status,
                }
                for t in tasks
            ],
        )
    finally:
        db.close()


@app.get("/api/runs/{run_id}/events", response_model=EventsResponse)
def get_events(run_id: str, since_id: int = 0) -> EventsResponse:
    db = SessionLocal()
    try:
        run = db.get(Run, run_id)
        if run is None:
            raise HTTPException(status_code=404, detail="Run not found")
        events = (
            db.query(Event)
            .filter(Event.run_id == run_id, Event.id > since_id)
            .order_by(Event.id.asc())
            .all()
        )
        return EventsResponse(events=events)
    finally:
        db.close()


@app.get("/api/runs/{run_id}/report", response_model=ReportResponse)
def get_report(run_id: str) -> ReportResponse:
    db = SessionLocal()
    try:
        run = db.get(Run, run_id)
        if run is None:
            raise HTTPException(status_code=404, detail="Run not found")
        report = db.get(Report, run_id)
        if report is None:
            raise HTTPException(status_code=404, detail="Report not available yet")
        return ReportResponse(
            run_id=run_id,
            objective=run.objective,
            plan=report.plan,
            research_findings=report.research_findings,
            sources=report.sources,
            analysis=report.analysis,
            review=report.review,
            final_report=report.final_report,
            approved=run.approved,
            revision_count=run.revision_count,
        )
    finally:
        db.close()


@app.post("/api/runs/{run_id}/cancel", response_model=CancelResponse)
def cancel_run_endpoint(run_id: str) -> CancelResponse:
    db = SessionLocal()
    try:
        run = db.get(Run, run_id)
        if run is None:
            raise HTTPException(status_code=404, detail="Run not found")
    finally:
        db.close()

    cancelled = cancel_run(run_id)
    status = "cancelling" if cancelled else run.status
    return CancelResponse(run_id=run_id, status=status)
