import { Bot, CheckCircle2, ClipboardList, ShieldCheck, Sparkles } from "lucide-react";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import ResearchCard from "../components/ResearchCard";
import StatCard from "../components/StatCard";
import type { RunSummary } from "../types";

export default function DashboardPage({
  runs,
  onSelectRun,
  onStartNew,
}: {
  runs: RunSummary[];
  onSelectRun: (id: string) => void;
  onStartNew: () => void;
}) {
  const completed = runs.filter((r) => r.status === "completed").length;
  const approved = runs.filter((r) => r.approved === true).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl border border-border bg-surface p-6 shadow-subtle sm:p-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-text-primary sm:text-[32px]">
            Agentic AI Research System
          </h1>
          <p className="mt-2 text-sm text-text-secondary sm:text-base">
            Transform research objectives into structured, evidence-based reports using autonomous
            AI agents.
          </p>
          <Button className="mx-auto mt-5" onClick={onStartNew}>
            <Sparkles size={15} />
            Start New Research
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={ClipboardList} label="Research Tasks" value={runs.length} />
        <StatCard icon={CheckCircle2} label="Completed Reports" value={completed} />
        <StatCard icon={Bot} label="Active Agents" value={5} />
        <StatCard icon={ShieldCheck} label="Approved Reports" value={approved} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Recent Research</h2>
        {runs.length === 0 ? (
          <EmptyState
            icon={Sparkles}
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {runs.slice(0, 6).map((run) => (
              <ResearchCard key={run.run_id} run={run} onClick={() => onSelectRun(run.run_id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
