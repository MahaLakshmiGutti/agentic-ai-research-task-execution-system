import { AlertTriangle, Bot, History as HistoryIcon, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelRun,
  createRun,
  getHealth,
  getReport,
  getRunEvents,
  getRunStatus,
  listRuns,
} from "./api";
import Button from "./components/Button";
import EmptyState from "./components/EmptyState";
import Sidebar from "./components/layout/Sidebar";
import TopNavbar from "./components/layout/TopNavbar";
import {
  deriveAnalysis,
  deriveDraftFirst,
  deriveDraftRevision,
  deriveFinalReport,
  deriveNeverApproved,
  derivePlan,
  deriveResearch,
  deriveReviewFirst,
  deriveReviewRevision,
  deriveRevisionPending,
} from "./deriveFromEvents";
import ActivityPage from "./pages/ActivityPage";
import DashboardPage from "./pages/DashboardPage";
import HistoryPage from "./pages/HistoryPage";
import NewResearchPage from "./pages/NewResearchPage";
import type { PageKey } from "./pages/pageKey";
import ReportsPage from "./pages/ReportsPage";
import type { AgentKey, HealthStatus, ReportData, RunEvent, RunStatus, RunSummary } from "./types";

const POLL_INTERVAL_MS = 1500;
const HISTORY_POLL_MS = 4000;
const ACTIVE_STATUSES = new Set(["pending", "running"]);

const PAGE_META: Record<PageKey, { title: string; breadcrumb?: string }> = {
  dashboard: { title: "Dashboard" },
  new: { title: "New Research" },
  history: { title: "Research History" },
  activity: { title: "Agent Activity", breadcrumb: "Research" },
  reports: { title: "Reports", breadcrumb: "Research" },
};

export default function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<AgentKey | null>(null);

  const [page, setPage] = useState<PageKey>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const pollTimer = useRef<number | null>(null);
  // Tracks whichever run is currently selected so a slow response for a run
  // the user has since navigated away from can't overwrite fresher state
  // (e.g. rapidly clicking between runs in history).
  const currentRunIdRef = useRef<string | null>(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      listRuns()
        .then((res) => {
          if (!cancelled) setRuns(res.runs);
        })
        .catch(() => {
          // history is a convenience; ignore transient failures
        });
    };
    load();
    const timer = window.setInterval(load, HISTORY_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [historyRefreshToken]);

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
      setError(null);
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
      let consecutiveFailures = 0;
      const tick = async () => {
        const status = await poll(id);
        if (currentRunIdRef.current !== id) return;
        if (!status) {
          // A single failed poll is likely a transient network blip, not the
          // run finishing - keep polling. Only give up after several failures
          // in a row, so a genuinely dead backend doesn't poll forever.
          consecutiveFailures += 1;
          if (consecutiveFailures >= 10) {
            stopPolling();
          }
          return;
        }
        consecutiveFailures = 0;
        if (!ACTIVE_STATUSES.has(status.status)) {
          stopPolling();
          setHistoryRefreshToken((t) => t + 1);
        }
      };
      void tick();
      pollTimer.current = window.setInterval(tick, POLL_INTERVAL_MS);
    },
    [poll, stopPolling]
  );

  async function handleSubmit(objective: string): Promise<boolean> {
    setError(null);
    setReport(null);
    setEvents([]);
    setRunStatus(null);
    setSelectedAgent(null);
    autoNavigatedRunId.current = null;

    try {
      const { run_id } = await createRun(objective);
      setRunId(run_id);
      setHistoryRefreshToken((t) => t + 1);
      startPollingLoop(run_id);
      setPage("activity");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  }

  function handleSelectRun(id: string) {
    setError(null);
    setReport(null);
    setEvents([]);
    setRunStatus(null);
    setRunId(id);
    setSelectedAgent(null);
    autoNavigatedRunId.current = null;
    startPollingLoop(id);
    setPage("activity");
  }

  function handleNew() {
    stopPolling();
    currentRunIdRef.current = null;
    setRunId(null);
    setRunStatus(null);
    setEvents([]);
    setReport(null);
    setError(null);
    setSelectedAgent(null);
    autoNavigatedRunId.current = null;
    setPage("new");
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

  function navigate(target: PageKey) {
    setPage(target);
    setMobileSidebarOpen(false);
  }

  const isRunning = runStatus ? ACTIVE_STATUSES.has(runStatus.status) : false;

  const plan = report?.plan ?? derivePlan(events);
  const { findings, sources } = report
    ? { findings: report.research_findings ?? [], sources: report.sources ?? [] }
    : deriveResearch(events);
  const analysis = report?.analysis ?? deriveAnalysis(events);

  // Each round's draft/review is read straight from the event log (rather
  // than the single-round `report` object) so both the first pass and the
  // revision pass stay visible side by side, instead of the revision
  // silently overwriting the first round's output.
  const draftFirst = deriveDraftFirst(events);
  const reviewFirst = deriveReviewFirst(events);
  const draftRevision = deriveDraftRevision(events);
  const reviewRevision = deriveReviewRevision(events);

  // The final report is only ever surfaced once the Reviewer has actually
  // approved a draft - never just because the (single, mandatory) revision
  // cycle ran out. A revision that's rejected again still ends the run, but
  // its output stays visible in Agent Activity rather than being presented
  // as a "final" report.
  const approved = report?.approved ?? runStatus?.approved ?? null;
  const finalReport = approved ? (report?.final_report ?? deriveFinalReport(events)) : null;
  const revisionPending = !report && deriveRevisionPending(events);
  const neverApproved = !revisionPending && deriveNeverApproved(events);

  const autoNavigatedRunId = useRef<string | null>(null);
  useEffect(() => {
    if (runId && finalReport && autoNavigatedRunId.current !== runId) {
      autoNavigatedRunId.current = runId;
      setPage("reports");
    }
  }, [runId, finalReport]);

  const keysMissing =
    health &&
    ((health.provider === "google" ? !health.gemini_configured : !health.openai_configured) ||
      !health.tavily_configured);

  return (
    <div className="flex min-h-screen bg-bg lg:h-screen">
      <Sidebar
        page={page}
        onNavigate={navigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:h-screen lg:overflow-y-auto">
        <TopNavbar
          title={PAGE_META[page].title}
          breadcrumb={PAGE_META[page].breadcrumb}
          health={health}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto w-full max-w-6xl">
            {keysMissing && (
              <p className="mb-6 flex items-center gap-1.5 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                <AlertTriangle size={13} />
                {health?.provider === "google" && !health.gemini_configured && "GEMINI_API_KEY is not configured. "}
                {health?.provider !== "google" && !health?.openai_configured && "OPENAI_API_KEY is not configured. "}
                {health && !health.tavily_configured && "TAVILY_API_KEY is not configured. "}
                Set these in backend/.env before running a research task.
              </p>
            )}
            {error && (
              <p className="mb-6 text-sm text-error">{error}</p>
            )}

            {page === "dashboard" && (
              <DashboardPage runs={runs} onSelectRun={handleSelectRun} onStartNew={() => navigate("new")} />
            )}

            {page === "new" && <NewResearchPage onSubmit={handleSubmit} />}

            {page === "history" && (
              <HistoryPage
                runs={runs}
                selectedRunId={runId}
                onSelectRun={handleSelectRun}
                onStartNew={() => navigate("new")}
              />
            )}

            {page === "activity" &&
              (runId && runStatus ? (
                <ActivityPage
                  runStatus={runStatus}
                  events={events}
                  isRunning={isRunning}
                  cancelling={cancelling}
                  onCancel={handleCancel}
                  plan={plan}
                  findings={findings}
                  sources={sources}
                  analysis={analysis}
                  draftFirst={draftFirst}
                  reviewFirst={reviewFirst}
                  draftRevision={draftRevision}
                  reviewRevision={reviewRevision}
                  finalReport={finalReport}
                  revisionPending={revisionPending}
                  neverApproved={neverApproved}
                  selectedAgent={selectedAgent}
                  onSelectAgent={setSelectedAgent}
                  onViewReport={() => navigate("reports")}
                  onRetry={() => navigate("new")}
                />
              ) : (
                <EmptyState
                  icon={Bot}
                  title="No research selected"
                  description="Start a new research task or pick one from your history to watch the agents work."
                  action={
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => navigate("new")}>
                        <Sparkles size={14} />
                        Start Research
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate("history")}>
                        <HistoryIcon size={14} />
                        View History
                      </Button>
                    </div>
                  }
                />
              ))}

            {page === "reports" &&
              (runId && runStatus ? (
                <ReportsPage
                  finalReport={finalReport}
                  objective={runStatus.objective}
                  approved={approved}
                  revisionCount={report?.revision_count ?? runStatus?.revision_count ?? 0}
                  sourcesCount={sources.length}
                  generatedAt={report ? runStatus.updated_at : null}
                  onNewResearch={() => navigate("new")}
                  onGoToActivity={() => navigate("activity")}
                />
              ) : (
                <EmptyState
                  icon={HistoryIcon}
                  title="No report selected"
                  description="Start a new research task or pick a completed one from your history to view its report."
                  action={
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => navigate("new")}>
                        <Sparkles size={14} />
                        Start Research
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate("history")}>
                        <HistoryIcon size={14} />
                        View History
                      </Button>
                    </div>
                  }
                />
              ))}
          </div>
        </main>
      </div>
    </div>
  );
}
