import {
  BrainCircuit,
  ClipboardList,
  PenLine,
  SearchCheck,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { AgentKey, Analysis, PlanTask, ResearchFinding, Review, Source } from "../types";
import AnalysisView from "./AnalysisView";
import DraftView from "./DraftView";
import PlanView from "./PlanView";
import ResearchView from "./ResearchView";
import ReviewView from "./ReviewView";

const STAGES: { key: AgentKey; label: string; icon: LucideIcon }[] = [
  { key: "planner", label: "Planner", icon: ClipboardList },
  { key: "researcher", label: "Researcher", icon: SearchCheck },
  { key: "analyst", label: "Analyst", icon: BrainCircuit },
  { key: "writer", label: "Writer", icon: PenLine },
  { key: "reviewer", label: "Reviewer", icon: ShieldCheck },
  { key: "writer_revision", label: "Writer (Revision)", icon: PenLine },
  { key: "reviewer_revision", label: "Reviewer (Revision)", icon: ShieldCheck },
];

export default function AgentOutputView({
  selectedAgent,
  onSelectAgent,
  plan,
  findings,
  sources,
  analysis,
  draftFirst,
  reviewFirst,
  draftRevision,
  reviewRevision,
}: {
  selectedAgent: AgentKey | null;
  onSelectAgent: (agent: AgentKey) => void;
  plan: PlanTask[];
  findings: ResearchFinding[];
  sources: Source[];
  analysis: Analysis | null;
  draftFirst: string | null;
  reviewFirst: Review | null;
  draftRevision: string | null;
  reviewRevision: Review | null;
}) {
  const hasOutput: Record<AgentKey, boolean> = {
    system: false,
    planner: plan.length > 0,
    researcher: findings.length > 0,
    analyst: analysis !== null,
    writer: draftFirst !== null,
    reviewer: reviewFirst !== null,
    writer_revision: draftRevision !== null,
    reviewer_revision: reviewRevision !== null,
  };

  const availableStages = STAGES.filter((s) => hasOutput[s.key]);
  const effectiveAgent =
    selectedAgent && hasOutput[selectedAgent] ? selectedAgent : (availableStages[0]?.key ?? null);

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Select an agent
        </p>
        {availableStages.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            No agent has produced output yet — check back once a step completes.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {STAGES.map((stage) => {
              const Icon = stage.icon;
              const available = hasOutput[stage.key];
              const selected = stage.key === effectiveAgent;
              return (
                <button
                  key={stage.key}
                  type="button"
                  disabled={!available}
                  onClick={() => onSelectAgent(stage.key)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    selected
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : available
                        ? "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
                        : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-600"
                  }`}
                >
                  <Icon size={13} />
                  {stage.label}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {effectiveAgent === "planner" && <PlanView plan={plan} />}
      {effectiveAgent === "researcher" && <ResearchView findings={findings} sources={sources} />}
      {effectiveAgent === "analyst" && <AnalysisView analysis={analysis} />}
      {effectiveAgent === "writer" && <DraftView draft={draftFirst} title="Writer draft" />}
      {effectiveAgent === "reviewer" && <ReviewView review={reviewFirst} title="Reviewer result" />}
      {effectiveAgent === "writer_revision" && (
        <DraftView draft={draftRevision} title="Writer draft (revision)" />
      )}
      {effectiveAgent === "reviewer_revision" && (
        <ReviewView review={reviewRevision} title="Reviewer result (revision)" />
      )}
    </div>
  );
}
