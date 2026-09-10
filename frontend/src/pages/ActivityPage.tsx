import { Ban, CheckCircle2, FileCheck2 } from "lucide-react";
import AgentOutputView from "../components/AgentOutputView";
import AgentTimeline from "../components/AgentTimeline";
import AgentWorkflow from "../components/AgentWorkflow";
import Button from "../components/Button";
import ErrorState from "../components/ErrorState";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import type {
  AgentKey,
  Analysis,
  PlanTask,
  Review,
  ResearchFinding,
  RunEvent,
  RunStatus,
  Source,
} from "../types";

export default function ActivityPage({
  runStatus,
  events,
  isRunning,
  cancelling,
  onCancel,
  plan,
  findings,
  sources,
  analysis,
  draftFirst,
  reviewFirst,
  draftRevision,
  reviewRevision,
  finalReport,
  revisionPending,
  neverApproved,
  selectedAgent,
  onSelectAgent,
  onViewReport,
  onRetry,
}: {
  runStatus: RunStatus;
  events: RunEvent[];
  isRunning: boolean;
  cancelling: boolean;
  onCancel: () => void;
  plan: PlanTask[];
  findings: ResearchFinding[];
  sources: Source[];
  analysis: Analysis | null;
  draftFirst: string | null;
  reviewFirst: Review | null;
  draftRevision: string | null;
  reviewRevision: Review | null;
  finalReport: string | null;
  revisionPending: boolean;
  neverApproved: boolean;
  selectedAgent: AgentKey | null;
  onSelectAgent: (agent: AgentKey) => void;
  onViewReport: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Agent Activity"
        subtitle={runStatus.objective}
        action={
          isRunning ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={cancelling || runStatus.cancelled}
            >
              <Ban size={14} />
              {runStatus.cancelled ? "Cancelling..." : "Cancel run"}
            </Button>
          ) : finalReport ? (
            <Button size="sm" onClick={onViewReport}>
              <FileCheck2 size={14} />
              View Report
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-subtle">
        <StatusBadge status={runStatus.status} />
        <span className="text-xs text-text-muted">Run ID: {runStatus.run_id}</span>
      </div>

      {runStatus.status === "failed" && (
        <ErrorState details={runStatus.error} onRetry={onRetry} />
      )}

      <AgentWorkflow
        events={events}
        finalReportReady={!!finalReport}
        onSelectAgent={onSelectAgent}
      />

      {revisionPending && (
        <p className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          The Reviewer rejected the first draft — the Writer is producing a revised report. The
          report will be ready once the revision is reviewed.
        </p>
      )}
      {neverApproved && (
        <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          The Reviewer rejected the revised draft too. No final report was approved — see the
          Writer (Revision) and Reviewer (Revision) output below for the best-effort result.
        </p>
      )}
      {finalReport && (
        <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          <CheckCircle2 size={15} />
          Report approved and ready to view.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <AgentTimeline events={events} />
        <AgentOutputView
          selectedAgent={selectedAgent}
          onSelectAgent={onSelectAgent}
          plan={plan}
          findings={findings}
          sources={sources}
          analysis={analysis}
          draftFirst={draftFirst}
          reviewFirst={reviewFirst}
          draftRevision={draftRevision}
          reviewRevision={reviewRevision}
        />
      </div>
    </div>
  );
}
