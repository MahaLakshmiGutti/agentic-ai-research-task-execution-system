import {
  CheckCircle2,
  CircleDashed,
  History,
  Loader2,
  Moon,
  Plus,
  Sparkles,
  Sun,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { listRuns } from "../api";
import type { RunSummary } from "../types";
import { useTheme } from "../useTheme";

const REFRESH_MS = 4000;

const STATUS_ICON: Record<string, JSX.Element> = {
  pending: <CircleDashed size={13} className="text-slate-400 dark:text-slate-500" />,
  running: <Loader2 size={13} className="animate-spin text-amber-500 dark:text-amber-400" />,
  completed: <CheckCircle2 size={13} className="text-emerald-500 dark:text-emerald-400" />,
  failed: <XCircle size={13} className="text-red-500 dark:text-red-400" />,
  cancelled: <XCircle size={13} className="text-slate-400 dark:text-slate-500" />,
};

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dateGroupLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function groupByDate(runs: RunSummary[]): { label: string; runs: RunSummary[] }[] {
  const groups: { label: string; runs: RunSummary[] }[] = [];
  for (const run of runs) {
    const label = dateGroupLabel(run.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.runs.push(run);
    } else {
      groups.push({ label, runs: [run] });
    }
  }
  return groups;
}

export default function HistorySidebar({
  selectedRunId,
  refreshToken,
  onSelect,
  onNew,
}: {
  selectedRunId: string | null;
  refreshToken: number;
  onSelect: (runId: string) => void;
  onNew: () => void;
}) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [theme, toggleTheme] = useTheme();

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
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [refreshToken]);

  const groups = groupByDate(runs);

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-white lg:w-72 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4 dark:border-slate-700">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <Sparkles size={16} />
        </div>
        <span className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
          Agentic AI Research
        </span>
        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <div className="p-3">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          <Plus size={16} />
          New research
        </button>
      </div>

      <div className="flex items-center gap-1.5 px-4 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        <History size={13} />
        Chat History
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {groups.length === 0 && (
          <p className="px-2 py-4 text-xs text-slate-400 dark:text-slate-500">No research runs yet.</p>
        )}
        {groups.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="px-3 pb-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.runs.map((run) => (
                <li key={run.run_id}>
                  <button
                    onClick={() => onSelect(run.run_id)}
                    className={`w-full rounded-lg px-3 py-2 text-left transition ${
                      run.run_id === selectedRunId
                        ? "bg-indigo-50 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:ring-indigo-500/40"
                        : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {STATUS_ICON[run.status] ?? STATUS_ICON.pending}
                      <span className="truncate text-xs text-slate-400 dark:text-slate-500">
                        {timeOfDay(run.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-700 dark:text-slate-300">
                      {run.objective}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
