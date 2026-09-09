# Agentic AI Research & Task Execution System

A multi-agent AI system that takes a natural-language research objective,
plans it, researches it with a real web-search tool, analyzes the findings,
writes a structured Markdown report, and runs that report through a
Reviewer/Critic agent — automatically revising it once if the review fails —
all orchestrated with **LangGraph**, powered by **OpenAI**, exposed
through a **FastAPI** backend, and visualized live in a **React + TypeScript
+ Tailwind** frontend.

Example objective:

> "Analyze the latest developments in Generative AI and prepare a structured
> report with key trends, companies, challenges, and future opportunities."

---

## Table of contents

- [Architecture](#architecture)
- [Agent roles](#agent-roles)
- [Agent execution flow](#agent-execution-flow)
- [State & memory management](#state--memory-management)
- [Tool usage](#tool-usage)
- [Technologies used](#technologies-used)
- [Project structure](#project-structure)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [API usage](#api-usage)
- [Deployment](#deployment)

---

## Architecture

```
┌──────────────┐   HTTP (fetch, polled)   ┌──────────────────┐
│  React + TS   │ ───────────────────────▶ │  FastAPI backend  │
│  (Vite,       │ ◀─────────────────────── │  (uvicorn)         │
│   Tailwind)   │      JSON responses      │                    │
└──────────────┘                          └─────────┬──────────┘
                                                       │
                                          creates a background
                                          run, invokes the graph
                                                       │
                                                       ▼
                                          ┌─────────────────────┐
                                          │  LangGraph workflow  │
                                          │  (StateGraph over    │
                                          │   WorkflowState)     │
                                          └──────────┬───────────┘
                     ┌───────────┬───────────┬───────┴──────┬────────────┐
                     ▼           ▼           ▼               ▼            ▼
                 Planner    Researcher    Analyst          Writer     Reviewer/
                 (OpenAI)   (OpenAI +     (OpenAI)         (OpenAI)   Critic
                             Tavily tool)                              (OpenAI)
                                                       │
                                          every step persisted to
                                                       ▼
                                          ┌─────────────────────┐
                                          │   SQLite (runs,      │
                                          │   tasks, events,     │
                                          │   reports)            │
                                          └─────────────────────┘
```

The frontend never talks to OpenAI or Tavily directly — it only calls the
FastAPI backend, which owns the LangGraph workflow and all persistence.

## Agent roles

Every agent lives in its own file under `backend/app/agents/`, with an
explicit role, a `SYSTEM_PROMPT`, and explicit input/output contracts through
the shared `WorkflowState`.

| Agent | File | Role & responsibility | Input (from state) | Output (into state) |
|---|---|---|---|---|
| **Planner** | `agents/planner.py` | Understands the objective and breaks it into 3–6 concrete, non-overlapping research subtasks. | `objective` | `plan: PlanTask[]` |
| **Researcher** | `agents/researcher.py` | For each subtask, calls the Tavily web-search tool, then summarizes findings **grounded only in the returned results** — explicitly instructed not to invent facts or sources. | `objective`, `plan` | `research_findings: ResearchFinding[]`, `sources: Source[]` |
| **Analyst** | `agents/analyst.py` | Analyzes the research findings for trends, patterns, comparisons, insights, and conclusions — instructed to only use what's in the findings. | `objective`, `research_findings` | `analysis: {trends, patterns, comparisons, insights, conclusions}` |
| **Writer** | `agents/writer.py` | Converts findings + analysis into a structured Markdown report (headings, bullets, tables, a Sources section with inline citations). Also handles the single revision pass, rewriting the draft to address the Reviewer's `required_changes`. | `objective`, `research_findings`, `sources`, `analysis`, (+ `review` on revision) | `draft: str`, `revision_count` |
| **Reviewer / Critic** | `agents/reviewer.py` | Reviews the draft against the objective and evidence: completeness, relevance, consistency, factual support, and whether the objective was satisfied. Returns `approved` + `feedback` + `required_changes`. | `objective`, `research_findings`, `analysis`, `draft` | `review: Review`, `approved: bool` |

## Agent execution flow

Orchestrated by a LangGraph `StateGraph` (`backend/app/graph.py`):

```
START → Planner → Researcher → Analyst → Writer → Reviewer
                                                       │
                                          conditional edge
                                          ┌─────────────┴─────────────┐
                                     approved                    rejected
                                          │                            │
                                         END              revision_count < 1?
                                                                  │        │
                                                                yes       no → END
                                                                  │
                                                          Writer (revision)
                                                                  │
                                                          Reviewer (revision)
                                                                  │
                                                                 END
```

Each node is a plain function `(state) -> partial_update_dict`; LangGraph
merges the returned dict into the shared state before invoking the next
node. Because every node reads only the state keys it needs and writes back
only what it changed, this **is** the mechanism by which one agent's output
becomes the next agent's input (e.g. the Researcher's `research_findings`
flow straight into the Analyst's prompt, the Analyst's `analysis` flows into
the Writer's prompt, and the Writer's `draft` flows into the Reviewer's
prompt).

The revision cycle is capped at exactly one pass
(`settings.max_revision_cycles = 1`): if the Reviewer rejects the first
draft, the Writer revises it once and the Reviewer reviews it again, but
that second verdict is final — the (possibly still-imperfect) revised draft
is always returned as the final report, matching the required workflow.

Every node transition also fires through an `on_step` hook
(`services/run_manager.py`) that writes a `pending → running → completed /
failed` event row to SQLite for that agent, which is what the frontend polls
to render live status.

## State & memory management

**In-flight workflow state** (`backend/app/state.py`): a single
`WorkflowState` TypedDict — `run_id`, `objective`, `plan`,
`research_findings`, `sources`, `analysis`, `draft`, `review`, `approved`,
`revision_count`, `current_phase`, `agent_outputs`, `errors`,
`final_report` — flows through every LangGraph node for the duration of one
run.

**Persistent memory**: every run, its subtasks, its full per-agent event log,
and its final report are written to SQLite (`backend/app/models.py`: `Run`,
`Task`, `Event`, `Report`) as they happen. This survives backend restarts and
powers the "Chat History" sidebar (`GET /api/runs`), which lists every past
run grouped by the date it actually ran, letting you reopen any past run's
full plan/findings/analysis/review/report at any time.

**Conversational memory** (carrying context from one run into a *new* run as
a follow-up) is **not** implemented — see [Known limitations](#known-limitations).

## Tool usage

The Researcher Agent calls a real tool — it is not simulated or hard-coded.
`backend/app/tools/tavily_search.py` wraps the Tavily Search API as a
LangChain `@tool`:

```python
@tool("tavily_web_search")
def tavily_web_search(query: str) -> list[dict]:
    """Search the live web via Tavily and return title/url/content results."""
```

For each Planner subtask, the Researcher calls this tool with a focused
query, then asks OpenAI to summarize *only* what's actually in the returned
results — the prompt explicitly forbids inventing sources or facts.

## Technologies used

**Backend:** Python, FastAPI, LangGraph, LangChain (core + `langchain-openai`),
OpenAI API, Tavily Search API, Pydantic v2, SQLAlchemy + SQLite,
python-dotenv, uvicorn.

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, `lucide-react`
(icons), `react-markdown` + `remark-gfm` (report rendering).

**Persistence:** SQLite (file-based, zero-infra) rather than
Postgres/Mongo/Redis — sufficient for this MVP's single-process run state and
history; see [Known limitations](#known-limitations) for the tradeoff.

## Project structure

```
Agentic-AI/
  main.py                  Launches backend + frontend together (see Local setup)
  backend/
    requirements.txt
    .env.example
    app/
      main.py                FastAPI app + routes
      config.py                env-driven settings (OpenAI, Tavily, CORS, DB path)
      database.py               SQLAlchemy engine/session setup
      models.py                  ORM models: Run, Task, Event, Report
      schemas.py                  Pydantic request/response models
      state.py                     shared LangGraph workflow state (TypedDict)
      llm.py                        OpenAI chat wrapper + structured-JSON helper
      graph.py                      LangGraph StateGraph wiring the 5 agents
      agents/                        planner.py, researcher.py, analyst.py, writer.py, reviewer.py
      tools/tavily_search.py          real Tavily web search tool (Researcher only)
      services/run_manager.py          run lifecycle, events, cancellation, persistence
  frontend/
    package.json, vite.config.ts, tailwind.config.js, tsconfig.json
    src/
      App.tsx                  layout, polling loop, run selection
      api.ts / types.ts          typed API client
      deriveFromEvents.ts          live plan/findings/analysis/draft/review from events
      components/
        ObjectiveForm.tsx           chat-style input (Enter to send)
        HistorySidebar.tsx           branded sidebar, date-grouped run history
        PipelineStatus.tsx            per-agent status stepper with icons
        PlanView.tsx / ResearchView.tsx / AnalysisView.tsx / ReviewView.tsx / ReportView.tsx
```

## Local setup

### Option A — run both together

```bash
# one-time setup (see Option B for the individual steps this assumes)
python main.py
```

This starts the backend on `http://127.0.0.1:8001` and the frontend on
`http://127.0.0.1:5173`, streaming both processes' logs prefixed
`[backend]` / `[frontend]`, and stops both cleanly on Ctrl+C. It also
auto-runs `npm install` for you the first time if `frontend/node_modules`
is missing.

### Option B — run them separately

**Backend:**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux
```

Edit `backend/.env` with real values (see [Environment variables](#environment-variables)), then:

```bash
uvicorn app.main:app --reload --port 8001
```

The SQLite database is created automatically at `backend/data/app.db` on
startup.

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api/*` to
`http://127.0.0.1:8001` (see `frontend/vite.config.ts`).

## Environment variables

Set in `backend/.env` (see `backend/.env.example`):

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Yes | OpenAI API key. Never hard-coded — read via `os.getenv` in `app/config.py`. |
| `OPENAI_MODEL` | No (default `gpt-4o-mini`) | The OpenAI model to use for every agent call. Must be a model your API key actually has access to. |
| `TAVILY_API_KEY` | Yes | Tavily Search API key, used only by the Researcher Agent's tool. |
| `CORS_ORIGINS` | No (default `http://localhost:5173`) | Comma-separated list of origins allowed to call the API — set this to your deployed frontend URL in production. |
| `DATABASE_PATH` | No (default `data/app.db`) | Path to the SQLite file, relative to `backend/`. |

The frontend has no required environment variables locally (it talks to the
backend through Vite's dev proxy). When deployed, it needs to know the
backend's public URL — see [Deployment](#deployment).

## API usage

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Health check; reports whether `OPENAI_API_KEY`/`TAVILY_API_KEY` are configured. |
| `POST` | `/api/runs` | Create a run: body `{ "objective": "..." }` → `{ "run_id": "..." }`. Execution starts immediately in the background. |
| `GET` | `/api/runs` | List past runs (id, objective, status, approved, timestamps) — powers the chat-history sidebar. |
| `GET` | `/api/runs/{run_id}` | Run status: phase, approval, revision count, cancelled flag, subtasks. |
| `GET` | `/api/runs/{run_id}/events` | Ordered per-agent event log (`pending`/`running`/`completed`/`failed`, with each agent's output payload) — the single source of execution-progress data; the UI polls this rather than a separate streaming endpoint. |
| `GET` | `/api/runs/{run_id}/report` | Final structured report: plan, research findings, sources, analysis, review, final Markdown report. |
| `POST` | `/api/runs/{run_id}/cancel` | Requests cancellation; the pipeline stops before its next agent step. |

Example:

```bash
curl -s -X POST http://127.0.0.1:8001/api/runs \
  -H "Content-Type: application/json" \
  -d '{"objective": "Analyze the latest developments in Generative AI and prepare a structured report with key trends, companies, challenges, and future opportunities."}'
# {"run_id": "..."}

curl -s http://127.0.0.1:8001/api/runs/<run_id>
curl -s http://127.0.0.1:8001/api/runs/<run_id>/events
curl -s http://127.0.0.1:8001/api/runs/<run_id>/report
```

The frontend polls `/{run_id}` and `/events` every 1.5s while a run is
active, then fetches `/report` once it completes.

## Deployment

**Live demo:** Backend — `<fill in Render URL>` · Frontend — `<fill in Vercel URL>`

### Backend → Render

1. Push this repository to GitHub.
2. In Render, create a **Web Service** pointing at the repo, root directory
   `backend/`.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables in Render's dashboard: `OPENAI_API_KEY`,
   `OPENAI_MODEL` (optional, defaults to `gpt-4o-mini`), `TAVILY_API_KEY`,
   `CORS_ORIGINS` (set this to your Vercel frontend's URL once you have it),
   `DATABASE_PATH` (optional, defaults to `data/app.db`).
6. Note: Render's filesystem is ephemeral on redeploys — the SQLite file
   will reset each deploy. For durable history across deploys, attach a
   Render Disk mounted at `backend/data/` (Settings → Disks), or migrate to
   a managed Postgres instance.

### Frontend → Vercel

1. In Vercel, import the same repository, root directory `frontend/`.
2. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
3. Since there is no Vite dev proxy in production, set a build-time env var
   `VITE_API_BASE` to your Render backend's full API URL (e.g.
   `https://your-app.onrender.com/api`) — `frontend/src/api.ts` already reads
   this (`import.meta.env.VITE_API_BASE`) and falls back to the relative
   `/api` path used locally.
4. Set `CORS_ORIGINS` on the Render backend to include the resulting
   `https://<project>.vercel.app` URL, then redeploy the backend so the new
   origin takes effect.

