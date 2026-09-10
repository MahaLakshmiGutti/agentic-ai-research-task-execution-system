import {
  BrainCircuit,
  ListTodo,
  PenLine,
  Search,
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
  { key: "planner", label: "Planner", icon: ListTodo },
  { key: "researcher", label: "Researcher", icon: Search },
  { key: "analyst", label: "Analyzer", icon: BrainCircuit },
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
      <section className="rounded-xl border border-border bg-surface p-5 shadow-subtle">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Agent output
        </p>
        {availableStages.length === 0 ? (
          <p className="text-sm text-text-muted">
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
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition duration-150 ${
                    selected
                      ? "border-accent bg-accent text-white"
                      : available
                        ? "border-border bg-surface text-text-secondary hover:border-accent/40 hover:text-accent"
                        : "cursor-not-allowed border-border/60 bg-surface-2/50 text-text-muted"
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
