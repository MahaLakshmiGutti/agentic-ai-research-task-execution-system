import { CheckCircle2, Layers } from "lucide-react";
import StatusBadge from "./StatusBadge";
import type { RunSummary } from "../types";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time}`;
}

export default function ResearchCard({
  run,
  onClick,
  selected = false,
  sourcesCount,
}: {
  run: RunSummary;
  onClick: () => void;
  selected?: boolean;
  sourcesCount?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col gap-2 rounded-xl border p-4 text-left transition duration-150 ${
        selected
          ? "border-accent/50 bg-accent/5"
          : "border-border bg-surface hover:border-accent/30 hover:bg-surface-2/60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-text-primary">{run.objective}</p>
        <StatusBadge status={run.status} className="shrink-0" />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
        <span>{formatDateTime(run.created_at)}</span>
        {typeof sourcesCount === "number" && (
          <span className="flex items-center gap-1">
            <Layers size={11} />
            {sourcesCount} sources
          </span>
        )}
        {run.status === "completed" && run.approved !== null && (
          <span className={`flex items-center gap-1 ${run.approved ? "text-success" : "text-text-muted"}`}>
            <CheckCircle2 size={11} />
            {run.approved ? "Approved" : "Delivered"}
          </span>
        )}
      </div>
    </button>
  );
}
