import { Fragment } from "react";
import {
  BrainCircuit,
  FileCheck2,
  ListTodo,
  PenLine,
  Search,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { AgentKey, EventStatus, RunEvent } from "../types";
import AgentCard, { type AgentCardStatus } from "./AgentCard";

interface Stage {
  key: AgentKey | "final_report";
  label: string;
  responsibility: string;
  icon: LucideIcon;
}

const BASE_STAGES: Stage[] = [
  { key: "planner", label: "Planner", responsibility: "Breaks down the objective", icon: ListTodo },
  { key: "researcher", label: "Researcher", responsibility: "Gathers evidence from the web", icon: Search },
  { key: "analyst", label: "Analyzer", responsibility: "Finds trends & insights", icon: BrainCircuit },
  { key: "writer", label: "Writer", responsibility: "Drafts the report", icon: PenLine },
  { key: "reviewer", label: "Reviewer", responsibility: "Reviews for quality", icon: ShieldCheck },
];

const REVISION_STAGES: Stage[] = [
  { key: "writer_revision", label: "Writer", responsibility: "Revises based on feedback", icon: PenLine },
  { key: "reviewer_revision", label: "Reviewer", responsibility: "Re-reviews the revision", icon: ShieldCheck },
];

const FINAL_STAGE: Stage = {
  key: "final_report",
  label: "Final Report",
  responsibility: "Approved & delivered",
  icon: FileCheck2,
};

function latestEvent(events: RunEvent[], agent: AgentKey): RunEvent | null {
  const relevant = events.filter((e) => e.agent === agent);
  return relevant.length ? relevant[relevant.length - 1] : null;
}

function toStageStatus(status: EventStatus | undefined, isReviewer: boolean): AgentCardStatus {
  if (!status) return "pending";
  if (status === "cancelling") return "running";
  if (status === "running" && isReviewer) return "reviewing";
  return status as AgentCardStatus;
}

export default function AgentWorkflow({
  events,
  finalReportReady,
  onSelectAgent,
}: {
  events: RunEvent[];
  finalReportReady: boolean;
  onSelectAgent?: (agent: AgentKey) => void;
}) {
  const hasRevision = events.some((e) => e.agent === "writer_revision" || e.agent === "reviewer_revision");
  const stages = [...BASE_STAGES, ...(hasRevision ? REVISION_STAGES : []), FINAL_STAGE];

  const reviewerFirstEvent = latestEvent(events, "reviewer");
  const reviewerFirstReview = reviewerFirstEvent?.data?.review as { approved?: boolean } | undefined;
  const revisionRequested =
    reviewerFirstEvent?.status === "completed" && reviewerFirstReview && !reviewerFirstReview.approved;

  const reviewerRevisionEvent = latestEvent(events, "reviewer_revision");
  const reviewerRevisionReview = reviewerRevisionEvent?.data?.review as { approved?: boolean } | undefined;
  const reviewPassed = reviewerRevisionEvent?.status === "completed" && reviewerRevisionReview?.approved;

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-subtle">
      <div className="flex flex-col md:flex-row md:items-start">
        {stages.map((stage, idx) => {
          const isLast = idx === stages.length - 1;
          const isFinal = stage.key === "final_report";
          const isReviewerNode = stage.key === "reviewer" || stage.key === "reviewer_revision";

          let status: AgentCardStatus;
          if (isFinal) {
            status = finalReportReady ? "completed" : "pending";
          } else {
            const ev = latestEvent(events, stage.key as AgentKey);
            status = toStageStatus(ev?.status, isReviewerNode);
          }

          const connectorDone = status === "completed";
          const badge =
            stage.key === "reviewer" && revisionRequested
              ? { label: "Revision requested", tone: "warning" as const }
              : stage.key === "reviewer_revision" && reviewPassed
                ? { label: "Review passed", tone: "success" as const }
                : undefined;

          return (
            <Fragment key={`${stage.key}-${idx}`}>
              <div className="flex-1">
                <AgentCard
                  icon={stage.icon}
                  name={stage.label}
                  responsibility={stage.responsibility}
                  status={status}
                  badge={badge}
                  onClick={
                    !isFinal && status !== "pending" && onSelectAgent
                      ? () => onSelectAgent(stage.key as AgentKey)
                      : undefined
                  }
                />
              </div>

              {!isLast && (
                <>
                  {/* mobile: vertical connector */}
                  <div className="ml-[22px] flex h-6 w-px items-center md:hidden">
                    <span className={`h-full w-px ${connectorDone ? "bg-success/40" : "bg-border"}`} aria-hidden />
                  </div>
                  {/* desktop: horizontal connector, vertically centered on the icon row */}
                  <div className="hidden w-8 shrink-0 md:mt-[22px] md:block lg:w-12">
                    <span className={`block h-px w-full ${connectorDone ? "bg-success/40" : "bg-border"}`} aria-hidden />
                  </div>
                </>
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
