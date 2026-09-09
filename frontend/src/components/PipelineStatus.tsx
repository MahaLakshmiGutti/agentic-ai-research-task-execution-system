import {
  BrainCircuit,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Loader2,
  PenLine,
  SearchCheck,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { AgentKey, EventStatus, RunEvent } from "../types";

const BASE_STAGES: { key: AgentKey; label: string; icon: LucideIcon }[] = [
  { key: "planner", label: "Planner", icon: ClipboardList },
  { key: "researcher", label: "Researcher", icon: SearchCheck },
  { key: "analyst", label: "Analyst", icon: BrainCircuit },
  { key: "writer", label: "Writer", icon: PenLine },
  { key: "reviewer", label: "Reviewer", icon: ShieldCheck },
];

const REVISION_STAGES: { key: AgentKey; label: string; icon: LucideIcon }[] = [
  { key: "writer_revision", label: "Writer (Revision)", icon: PenLine },
  { key: "reviewer_revision", label: "Reviewer (Revision)", icon: ShieldCheck },
];

function latestStatusFor(agent: AgentKey, events: RunEvent[]): EventStatus | "pending" {
  const relevant = events.filter((e) => e.agent === agent);
  if (relevant.length === 0) return "pending";
  return relevant[relevant.length - 1].status;
}

function latestMessageFor(agent: AgentKey, events: RunEvent[]): string {
  const relevant = events.filter((e) => e.agent === agent);
  if (relevant.length === 0) return "Waiting to start";
  return relevant[relevant.length - 1].message;
}

const STATUS_STYLES: Record<string, { ring: string; dot: string; text: string; badge: string }> = {
  pending: {
    ring: "ring-slate-200 dark:ring-slate-700",
    dot: "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500",
    text: "text-slate-400 dark:text-slate-500",
    badge: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  },
  running: {
    ring: "ring-amber-200 dark:ring-amber-500/30",
    dot: "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    text: "text-slate-800 dark:text-slate-200",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  },
  completed: {
    ring: "ring-emerald-200 dark:ring-emerald-500/30",
    dot: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    text: "text-slate-800 dark:text-slate-200",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  failed: {
    ring: "ring-red-200 dark:ring-red-500/30",
    dot: "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    text: "text-slate-800 dark:text-slate-200",
    badge: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  },
  cancelling: {
    ring: "ring-orange-200 dark:ring-orange-500/30",
    dot: "bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
    text: "text-slate-800 dark:text-slate-200",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
  },
};

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 size={16} />;
  if (status === "failed") return <XCircle size={16} />;
  if (status === "running") return <Loader2 size={16} className="animate-spin" />;
  return <CircleDashed size={16} />;
}

export default function PipelineStatus({ events }: { events: RunEvent[] }) {
  const hasRevision = events.some(
    (e) => e.agent === "writer_revision" || e.agent === "reviewer_revision"
  );
  const stages = hasRevision ? [...BASE_STAGES, ...REVISION_STAGES] : BASE_STAGES;

  return (
    <ol className="space-y-0">
      {stages.map((stage, idx) => {
        const status = latestStatusFor(stage.key, events);
        const message = latestMessageFor(stage.key, events);
        const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
        const Icon = stage.icon;
        const isLast = idx === stages.length - 1;

        return (
          <li key={stage.key} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span
                className="absolute left-4 top-9 h-[calc(100%-2.25rem)] w-px bg-slate-200 dark:bg-slate-700"
                aria-hidden
              />
            )}
            <div
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ${style.ring} ${style.dot}`}
            >
              <Icon size={16} />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-sm font-semibold ${style.text}`}>{stage.label}</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${style.badge}`}
                >
                  <StatusIcon status={status} />
                  {status}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400" title={message}>
                {message}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
