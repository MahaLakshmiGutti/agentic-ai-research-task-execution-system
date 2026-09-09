import {
  AlertTriangle,
  Ban,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  Network,
  PenLine,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cancelRun, createRun, getHealth, getReport, getRunEvents, getRunStatus } from "./api";
import AnalysisView from "./components/AnalysisView";
import HistorySidebar from "./components/HistorySidebar";
import ObjectiveForm from "./components/ObjectiveForm";
import OrchestrationCanvas from "./components/OrchestrationCanvas";
import PipelineStatus from "./components/PipelineStatus";
import PlanView from "./components/PlanView";
import SettingsPanel from "./components/SettingsPanel";
import ReportView from "./components/ReportView";
import ResearchView from "./components/ResearchView";
import ReviewView from "./components/ReviewView";
import {
  deriveAnalysis,
  deriveFinalReport,
  derivePlan,
  deriveResearch,
  deriveReview,
  deriveRevisionPending,
} from "./deriveFromEvents";
import type { HealthStatus, ReportData, RunEvent, RunStatus } from "./types";

const POLL_INTERVAL_MS = 1500;
const ACTIVE_STATUSES = new Set(["pending", "running"]);

const AGENT_INFO: { icon: LucideIcon; name: string; description: string }[] = [
  { icon: ClipboardList, name: "Planner", description: "Breaks your objective into focused research subtasks." },
  { icon: SearchCheck, name: "Researcher", description: "Searches the live web via Tavily for real, sourced information." },
  { icon: BrainCircuit, name: "Analyst", description: "Finds trends, patterns and insights in the findings." },
  { icon: PenLine, name: "Writer", description: "Drafts a structured Markdown report with citations." },
  { icon: ShieldCheck, name: "Reviewer", description: "Critiques the draft and requests one revision if needed." },
];

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [activeTab, setActiveTab] = useState<"process" | "flow" | "final">("process");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const pollTimer = useRef<number | null>(null);
  // Tracks whichever run is currently selected so a slow response for a run
  // the user has since navigated away from can't overwrite fresher state
  // (e.g. rapidly clicking between chats in the history sidebar).
  const currentRunIdRef = useRef<string | null>(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimer.current !== null) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const poll = useCallback(async (id: string): Promise<RunStatus | null> => {
    try {
      const [status, eventsRes] = await Promise.all([getRunStatus(id), getRunEvents(id, 0)]);
      if (currentRunIdRef.current !== id) return null;
      setRunStatus(status);
      setEvents(eventsRes.events);
      if (status.status === "completed") {
        const rep = await getReport(id);
        if (currentRunIdRef.current !== id) return null;
        setReport(rep);
      } else {
        setReport(null);
      }
      return status;
    } catch (err) {
      if (currentRunIdRef.current === id) {
        setError(err instanceof Error ? err.message : String(err));
      }
      return null;
    }
  }, []);

  const startPollingLoop = useCallback(
    (id: string) => {
      stopPolling();
      currentRunIdRef.current = id;
      const tick = async () => {
        const status = await poll(id);
        if (currentRunIdRef.current !== id) return;
        if (!status || !ACTIVE_STATUSES.has(status.status)) {
          stopPolling();
          setHistoryRefreshToken((t) => t + 1);
        }
      };
      void tick();
      pollTimer.current = window.setInterval(tick, POLL_INTERVAL_MS);
    },
    [poll, stopPolling]
  );

  async function handleSubmit(objective: string) {
    setError(null);
    setReport(null);
    setEvents([]);
    setRunStatus(null);
    setActiveTab("process");
    autoSwitchedRunId.current = null;

    try {
      const { run_id } = await createRun(objective);
      setRunId(run_id);
      setHistoryRefreshToken((t) => t + 1);
      startPollingLoop(run_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleSelectRun(id: string) {
    setError(null);
    setReport(null);
    setEvents([]);
    setRunStatus(null);
    setRunId(id);
    setActiveTab("process");
    autoSwitchedRunId.current = null;
    startPollingLoop(id);
  }

  function handleNew() {
    stopPolling();
    currentRunIdRef.current = null;
    setRunId(null);
    setRunStatus(null);
    setEvents([]);
    setReport(null);
    setError(null);
    setActiveTab("process");
    autoSwitchedRunId.current = null;
  }

  async function handleCancel() {
    if (!runId) return;
    setCancelling(true);
    try {
      await cancelRun(runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCancelling(false);
    }
  }

  const isRunning = runStatus ? ACTIVE_STATUSES.has(runStatus.status) : false;

  const plan = report?.plan ?? derivePlan(events);
  const { findings, sources } = report
    ? { findings: report.research_findings ?? [], sources: report.sources ?? [] }
    : deriveResearch(events);
  const analysis = report?.analysis ?? deriveAnalysis(events);
  const review = report?.review ?? deriveReview(events);
  const finalReport = report?.final_report ?? deriveFinalReport(events);
  const revisionPending = !report && deriveRevisionPending(events);

  const autoSwitchedRunId = useRef<string | null>(null);
  useEffect(() => {
    if (runId && finalReport && autoSwitchedRunId.current !== runId) {
      autoSwitchedRunId.current = runId;
      // Don't yank a presenter out of the orchestration canvas mid-demo; only
      // the default Process tab auto-advances to the finished report.
      setActiveTab((tab) => (tab === "process" ? "final" : tab));
    }
  }, [runId, finalReport]);

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-slate-900 lg:flex-row">
      <HistorySidebar
        selectedRunId={runId}
        refreshToken={historyRefreshToken}
        onSelect={handleSelectRun}
        onNew={handleNew}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => {
          getHealth().then(setHealth).catch(() => setHealth(null));
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <main className="flex flex-1 flex-col px-4 sm:px-6">
          <div className={runId ? "pt-8" : "flex flex-1 flex-col justify-center py-8"}>
            {/* Title, centered and highlighted */}
            <div className="mx-auto w-full max-w-3xl text-center">
              <div className="flex items-center justify-center gap-2">
                <Sparkles size={26} className="text-indigo-600 dark:text-indigo-400" />
                <h1 className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
                  Agentic AI Research &amp; Task Execution System
                </h1>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Planner &rarr; Researcher &rarr; Analyst &rarr; Writer &rarr; Reviewer, orchestrated with LangGraph.
              </p>
              {health &&
                ((health.provider === "google" ? !health.gemini_configured : !health.openai_configured) ||
                  !health.tavily_configured) && (
                <p className="mt-3 flex items-center justify-center gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                  <AlertTriangle size={13} />
                  {health.provider === "google" && !health.gemini_configured && "GEMINI_API_KEY is not configured. "}
                  {health.provider !== "google" && !health.openai_configured && "OPENAI_API_KEY is not configured. "}
                  {!health.tavily_configured && "TAVILY_API_KEY is not configured. "}
                  Set these in backend/.env before running a research task.
                </p>
              )}
            </div>

            {/* Chatbox: always present, right below the title. */}
            <div className="mx-auto mt-6 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-sm transition focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:border-indigo-500 dark:focus-within:ring-indigo-500">
              <div className="p-2">
                <ObjectiveForm onSubmit={handleSubmit} disabled={false} />
              </div>
            </div>

            {/* The submitted question, shown as a chat bubble just below the chatbox. */}
            {runId && runStatus && (
              <div className="mx-auto mt-3 w-full max-w-3xl">
                <div className="flex justify-end">
                  <div className="max-w-lg rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-2 text-sm text-white shadow-sm">
                    {runStatus.objective}
                  </div>
                </div>
              </div>
            )}
            {error && <p className="mx-auto mt-3 max-w-3xl text-sm text-red-600 dark:text-red-400">{error}</p>}

            {/* Landing state: brief cards explaining each agent */}
            {!runId && (
              <div className="mx-auto mt-6 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {AGENT_INFO.map(({ icon: Icon, name, description }) => (
                  <div
                    key={name}
                    className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <Icon size={18} />
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{name}</p>
                    <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                      {description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Everything below appears once a request has been sent */}
          {runId && runStatus && (
            <div className="mx-auto mt-8 w-full max-w-6xl pb-8">
              {/* Tabs */}
              <div className="mb-5 flex gap-1 border-b border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setActiveTab("process")}
                  className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                    activeTab === "process"
                      ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <Workflow size={15} />
                  Process
                </button>
                <button
                  onClick={() => setActiveTab("flow")}
                  className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                    activeTab === "flow"
                      ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <Network size={15} />
                  Orchestration
                </button>
                <button
                  onClick={() => finalReport && setActiveTab("final")}
                  disabled={!finalReport}
                  title={finalReport ? undefined : "Available once the final report is ready"}
                  className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                    activeTab === "final" && finalReport
                      ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                      : finalReport
                        ? "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        : "cursor-not-allowed border-transparent text-slate-300 dark:text-slate-600"
                  }`}
                >
                  <CheckCircle2 size={15} />
                  Final Response
                </button>
              </div>

              {activeTab === "flow" ? (
                <OrchestrationCanvas events={events} runStatus={runStatus} />
              ) : activeTab === "process" || !finalReport ? (
                <div className="flex flex-col gap-5">
                  <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          Status: <span className="font-normal capitalize">{runStatus.status}</span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Run ID: {runStatus.run_id}</p>
                      </div>
                      {isRunning && (
                        <button
                          onClick={handleCancel}
                          disabled={cancelling || runStatus.cancelled}
                          className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
                        >
                          <Ban size={13} />
                          {runStatus.cancelled ? "Cancelling..." : "Cancel run"}
                        </button>
                      )}
                    </div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Agent status
                    </p>
                    <PipelineStatus events={events} />
                    {runStatus.error && (
                      <p className="mt-3 text-sm text-red-600 dark:text-red-400">Error: {runStatus.error}</p>
                    )}
                  </section>

                  <PlanView plan={plan} />
                  <ResearchView findings={findings} sources={sources} />
                  <AnalysisView analysis={analysis} />
                  <ReviewView review={review} />

                  {revisionPending && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                      The Reviewer rejected the first draft — the Writer is producing a revised report. The
                      Final Response tab will unlock once the revision is reviewed.
                    </p>
                  )}
                  {!finalReport && !revisionPending && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500">
                      The Final Response tab will unlock once the Reviewer approves the report.
                    </div>
                  )}
                </div>
              ) : (
                <ReportView
                  report={finalReport}
                  approved={report?.approved ?? runStatus?.approved ?? null}
                  revisionCount={report?.revision_count ?? runStatus?.revision_count ?? 0}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
