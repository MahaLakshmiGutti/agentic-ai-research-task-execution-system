import { Check, Circle, Loader2 } from "lucide-react";
import type { AgentKey, RunEvent } from "../types";

const STAGE_LABELS: { key: AgentKey; label: string }[] = [
  { key: "planner", label: "Research plan generated" },
  { key: "researcher", label: "Searching relevant sources" },
  { key: "analyst", label: "Analyzing evidence" },
  { key: "writer", label: "Writing report" },
  { key: "reviewer", label: "Reviewing report" },
];

function latestStatus(events: RunEvent[], agent: AgentKey): "pending" | "running" | "completed" | "failed" {
  const relevant = events.filter((e) => e.agent === agent);
  if (relevant.length === 0) return "pending";
  const status = relevant[relevant.length - 1].status;
  return status === "cancelling" ? "running" : status;
}

/** Compact, real-data-driven progress checklist - not a generic spinner. */
export default function LoadingState({ events, heading = "Research agents are working..." }: { events: RunEvent[]; heading?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-subtle">
      <div className="mb-4 flex items-center gap-2">
        <Loader2 size={16} className="animate-spin text-accent" />
        <p className="text-sm font-semibold text-text-primary">{heading}</p>
      </div>
      <ul className="space-y-2.5">
        {STAGE_LABELS.map(({ key, label }) => {
          const status = latestStatus(events, key);
          return (
            <li key={key} className="flex items-center gap-2.5 text-sm">
              {status === "completed" && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                  <Check size={12} />
                </span>
              )}
              {status === "running" && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Loader2 size={12} className="animate-spin" />
                </span>
              )}
              {status === "pending" && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-text-muted">
                  <Circle size={10} />
                </span>
              )}
              {status === "failed" && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
                  <Circle size={10} />
                </span>
              )}
              <span
                className={
                  status === "completed"
                    ? "text-text-primary"
                    : status === "running"
                      ? "font-medium text-text-primary"
                      : "text-text-muted"
                }
              >
                {label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
