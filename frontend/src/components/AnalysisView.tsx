import { Flag, GitCompare, Lightbulb, Repeat, TrendingUp, type LucideIcon } from "lucide-react";
import type { Analysis } from "../types";
import Section from "./Section";

const GROUPS: { key: keyof Analysis; label: string; icon: LucideIcon }[] = [
  { key: "trends", label: "Trends", icon: TrendingUp },
  { key: "patterns", label: "Patterns", icon: Repeat },
  { key: "comparisons", label: "Comparisons", icon: GitCompare },
  { key: "insights", label: "Insights", icon: Lightbulb },
  { key: "conclusions", label: "Conclusions", icon: Flag },
];

export default function AnalysisView({ analysis }: { analysis: Analysis | null }) {
  if (!analysis) return null;
  const hasAny = GROUPS.some((g) => (analysis[g.key] ?? []).length > 0);
  if (!hasAny) return null;

  return (
    <Section title="Analysis">
      <div className="grid gap-3 sm:grid-cols-2">
        {GROUPS.map(({ key, label, icon: Icon }) => {
          const items = analysis[key] ?? [];
          if (items.length === 0) return null;
          return (
            <div key={key} className="rounded-lg border border-border bg-surface-2/50 p-3">
              <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
                <Icon size={13} className="text-accent" />
                {label}
              </h3>
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-text-secondary">
                {items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
