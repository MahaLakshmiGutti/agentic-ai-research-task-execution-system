import { History, Sparkles } from "lucide-react";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import ResearchCard from "../components/ResearchCard";
import type { RunSummary } from "../types";

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

export default function HistoryPage({
  runs,
  selectedRunId,
  onSelectRun,
  onStartNew,
}: {
  runs: RunSummary[];
  selectedRunId: string | null;
  onSelectRun: (id: string) => void;
  onStartNew: () => void;
}) {
  const groups = groupByDate(runs);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Research History"
        subtitle="Every research run you've started, grouped by date."
      />

      {runs.length === 0 ? (
        <EmptyState
          icon={History}
          title="No research tasks yet"
          description="Start your first research task to see its progress and reports here."
          action={
            <Button size="sm" onClick={onStartNew}>
              <Sparkles size={14} />
              Start Research
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                {group.label}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.runs.map((run) => (
                  <ResearchCard
                    key={run.run_id}
                    run={run}
                    selected={run.run_id === selectedRunId}
                    onClick={() => onSelectRun(run.run_id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
