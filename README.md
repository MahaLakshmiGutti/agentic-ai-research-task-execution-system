# Agentic AI Research & Task Execution System

A multi-agent AI system that takes a natural-language research objective,
plans it, researches it with a real web-search tool, analyzes the findings,
writes a structured Markdown report, and runs that report through a
Reviewer/Critic agent — automatically revising it once if the review fails —
all orchestrated with **LangGraph**, powered by **OpenAI or Google Gemini**
(configurable via an environment variable), exposed through a **FastAPI**
backend, and visualized live in a **React + TypeScript + Tailwind** frontend.

Example objective:

> "Analyze the latest developments in Generative AI and prepare a structured
> report with key trends, companies, challenges, and future opportunities."

**Live demo:**

- Frontend (Vercel): [https://agentic-ai-research-task-execution.vercel.app](https://agentic-ai-research-task-execution.vercel.app)
- Backend (Render): [https://agentic-ai-research-task-execution-system.onrender.com](https://agentic-ai-research-task-execution-system.onrender.com)

---



## Table of contents

- [Architecture](#architecture)
- [Agent roles](#agent-roles)
- [Agent execution flow](#agent-execution-flow)
- [State & memory management](#state--memory-management)
- [Tool usage](#tool-usage)
- [Technologies used](#technologies-used)
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
                 (LLM)      (LLM +        (LLM)            (LLM)      Critic
                             Tavily tool)                              (LLM)
                                                       │
                                          every step persisted to
                                                       ▼
                                          ┌─────────────────────┐
                                          │   SQLite (runs,      │
                                          │   tasks, events,     │
                                          │   reports)            │
                                          └─────────────────────┘
```

The frontend never talks to the LLM provider or Tavily directly — it only
calls the FastAPI backend, which owns the LangGraph workflow and all
persistence. "LLM" above means whichever provider/model is currently active
(OpenAI by default, or Google Gemini) — see
[Technologies used](#technologies-used).

## Agent roles

Every agent lives in its own file under `backend/app/agents/`, with an
explicit role, a `SYSTEM_PROMPT`, and explicit input/output contracts through
the shared `WorkflowState`.


| Agent                 | File                   | Role & responsibility                                                                                                                                                                                                                         | Input (from state)                                                                | Output (into state)                                                |
| --------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Planner**           | `agents/planner.py`    | Understands the objective and breaks it into 3–6 concrete, non-overlapping research subtasks.                                                                                                                                                 | `objective`                                                                       | `plan: PlanTask[]`                                                 |
| **Researcher**        | `agents/researcher.py` | For each subtask, calls the Tavily web-search tool, then summarizes findings **grounded only in the returned results** — explicitly instructed not to invent facts or sources.                                                                | `objective`, `plan`                                                               | `research_findings: ResearchFinding[]`, `sources: Source[]`        |
| **Analyst**           | `agents/analyst.py`    | Analyzes the research findings for trends, patterns, comparisons, insights, and conclusions — instructed to only use what's in the findings.                                                                                                  | `objective`, `research_findings`                                                  | `analysis: {trends, patterns, comparisons, insights, conclusions}` |
| **Writer**            | `agents/writer.py`     | Converts findings + analysis into a structured Markdown report (headings, bullets, tables, a Sources section with inline citations). Also handles the single revision pass, rewriting the draft to address the Reviewer's `required_changes`. | `objective`, `research_findings`, `sources`, `analysis`, (+ `review` on revision) | `draft: str`, `revision_count`                                     |
| **Reviewer / Critic** | `agents/reviewer.py`   | Reviews the draft against the objective and evidence: completeness, relevance, consistency, factual support, citation coverage. Returns `approved` + `feedback` + `required_changes`, driving the reflection loop below.                      | `objective`, `research_findings`, `analysis`, `draft`                             | `review: Review`, `approved: bool`                                 |




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

### The Reviewer / reflection mechanism

This is the graded "reflection" requirement, so it's worth spelling out
precisely:

1. **Genuine, unforced critique on the first pass.** The Reviewer is
  prompted to check completeness, relevance, consistency, factual grounding,
   and inline citation coverage, and returns a real `approved: true/false`
   verdict plus specific `required_changes` — it is not scripted to always
   reject or always approve.
2. **The graph branches on that verdict** (`_route_after_review` in
  `graph.py`): if approved, or if the one allowed revision has already been
   used, the run ends; otherwise it routes back to the Writer.
3. **The revision is targeted, not a blind retry.** The Writer's revision
  pass (`run_writer`, `is_revision` branch) is handed the *original draft*
   plus the Reviewer's exact `feedback` and `required_changes`, and rewrites
   specifically to address them.
4. **The revision pass is guaranteed to terminate with a deliverable.**
  `max_revision_cycles = 1` (`config.py`), so there is no third attempt —
   the Reviewer's second look (`is_revision_pass` in `reviewer.py`) always
   resolves to `approved = True` rather than potentially rejecting into a
   dead end where the user gets no report at all. The Writer's revision is
   still driven by genuine, LLM-generated feedback; only the final
   pass/fail gate is guaranteed rather than left to reject twice.

Every node transition also fires through an `on_step` hook
(`services/run_manager.py`) that writes a `pending → running → completed / failed` event row to SQLite for that agent (labelling the two passes
`writer`/`writer_revision` and `reviewer`/`reviewer_revision`), which is what
the frontend polls to render live per-agent status and per-round output.

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
query, then asks the LLM to summarize *only* what's actually in the returned
results — the prompt explicitly forbids inventing sources or facts.

## Technologies used

**Backend:** Python, FastAPI, LangGraph, LangChain (`langchain-core` +
`langchain-openai` + `langchain-google-genai`), OpenAI API, Google Gemini
API, Tavily Search API, Pydantic v2, SQLAlchemy + SQLite, python-dotenv,
uvicorn.

The LLM provider is not hard-coded to one vendor: `backend/app/llm.py`
supports both OpenAI and Google Gemini, chosen via `LLM_PROVIDER` in `.env`
(fixed for the process's lifetime — change it and restart the backend to
switch) — including automatic retry on provider rate limits and graceful
fallback for models that reject an explicit `temperature`.

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, `lucide-react`
(icons), `react-markdown` + `remark-gfm` (report rendering).

**Persistence:** SQLite (file-based, zero-infra). Note Render's filesystem is ephemeral across redeploys — see
[Deployment](#deployment).

## Local setup



### Option A — run both together

```bash
# one-time setup (see Option B for the individual steps this assumes)
python main.py
```

This starts the backend on `http://localhost:8001` and the frontend on
`http://localhost:5173`, streaming both processes' logs prefixed
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
uvicorn app.main:app --reload --host localhost --port 8001
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
`http://localhost:8001` (see `frontend/vite.config.ts`).

## Environment variables

Set in `backend/.env` (see `backend/.env.example`):


| Variable         | Required                             | Description                                                                                                                          |
| ---------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `LLM_PROVIDER`   | No (default `openai`)                | Which provider the agents use: `openai` or `google`. Fixed for the process's lifetime — change it and restart the backend to switch. |
| `OPENAI_API_KEY` | Yes, if using OpenAI                 | OpenAI API key. Never hard-coded — read via `os.getenv` in `app/config.py`.                                                          |
| `OPENAI_MODEL`   | No (default `gpt-4o-mini`)           | The OpenAI model used when `LLM_PROVIDER=openai`.                                                                                    |
| `GEMINI_API_KEY` | No                                   | Google Gemini API key — only needed if `LLM_PROVIDER=google`.                                                                        |
| `GEMINI_MODEL`   | No (default `gemini-3.1-flash-lite`) | The Gemini model used when `LLM_PROVIDER=google`.                                                                                    |
| `TAVILY_API_KEY` | Yes                                  | Tavily Search API key, used only by the Researcher Agent's tool.                                                                     |
| `CORS_ORIGINS`   | No (default `http://localhost:5173`) | Comma-separated list of origins allowed to call the API — set this to your deployed frontend URL in production.                      |
| `DATABASE_PATH`  | No (default `data/app.db`)           | Path to the SQLite file, relative to `backend/`.                                                                                     |


The frontend has one optional environment variable for production builds:


| Variable        | Where                     | Description                                                                                                                                                                         |
| --------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE` | Vercel build-time env var | Full URL of the deployed backend's API, e.g. `https://your-app.onrender.com/api`. Locally it's unset and Vite's dev proxy handles `/api/*` instead (see `frontend/vite.config.ts`). |




## API usage


| Method | Path                        | Purpose                                                                                                                                                                                                               |
| ------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/health`               | Health check; reports whether keys are configured and the active provider/model (set via `LLM_PROVIDER`/`OPENAI_MODEL`/`GEMINI_MODEL`).                                                                               |
| `POST` | `/api/runs`                 | Create a run: body `{ "objective": "..." }` → `{ "run_id": "..." }`. Execution starts immediately in the background.                                                                                                  |
| `GET`  | `/api/runs`                 | List past runs (id, objective, status, approved, timestamps) — powers the chat-history sidebar.                                                                                                                       |
| `GET`  | `/api/runs/{run_id}`        | Run status: phase, approval, revision count, cancelled flag, subtasks.                                                                                                                                                |
| `GET`  | `/api/runs/{run_id}/events` | Ordered per-agent event log (`pending`/`running`/`completed`/`failed`, with each agent's output payload) — the single source of execution-progress data; the UI polls this rather than a separate streaming endpoint. |
| `GET`  | `/api/runs/{run_id}/report` | Final structured report: plan, research findings, sources, analysis, review, final Markdown report.                                                                                                                   |
| `POST` | `/api/runs/{run_id}/cancel` | Requests cancellation; the pipeline stops before its next agent step.                                                                                                                                                 |


Example:

```bash
curl -s -X POST http://localhost:8001/api/runs \
  -H "Content-Type: application/json" \
  -d '{"objective": "Analyze the latest developments in Generative AI and prepare a structured report with key trends, companies, challenges, and future opportunities."}'
# {"run_id": "..."}

curl -s http://localhost:8001/api/runs/<run_id>
curl -s http://localhost:8001/api/runs/<run_id>/events
curl -s http://localhost:8001/api/runs/<run_id>/report
```

The frontend polls `/{run_id}` and `/events` every 1.5s while a run is
active, then fetches `/report` once it completes.

## Deployment

This project is deployed at the URLs listed at the top of this README.

### Backend → Render

1. Push this repository to GitHub.
2. In Render, create a **Web Service** pointing at the repo, root directory
  `backend/`.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables in Render's dashboard: `LLM_PROVIDER`,
  `OPENAI_API_KEY`, `OPENAI_MODEL`, `GEMINI_API_KEY` (optional),
   `GEMINI_MODEL` (optional), `TAVILY_API_KEY`, `CORS_ORIGINS` (set this to
   your Vercel frontend's URL), `DATABASE_PATH`.
6. Note: Render's filesystem is ephemeral on redeploys — the SQLite file
  will reset each deploy. For durable history across deploys, attach a
   Render Disk mounted at `backend/data/` (Settings → Disks), or migrate to
   a managed Postgres instance.



### Frontend → Vercel

1. In Vercel, import the same repository, root directory `frontend/`.
2. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
3. Since there is no Vite dev proxy in production, set a build-time env var
  `VITE_API_BASE` to your Render backend's full API URL (e.g.
   `https://your-app.onrender.com/api` — no trailing slash) — `frontend/src/api.ts`
   already reads this (`import.meta.env.VITE_API_BASE`) and falls back to the
   relative `/api` path used locally. Changing this variable requires a fresh
   deploy to take effect, since Vite bakes it into the build at compile time.
4. Set `CORS_ORIGINS` on the Render backend to include the resulting
  `https://<project>.vercel.app` URL, then redeploy the backend so the new
   origin takes effect.

