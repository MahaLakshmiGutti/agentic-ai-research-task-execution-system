import type { Analysis } from "../types";
import Section from "./Section";

const GROUPS: { key: keyof Analysis; label: string }[] = [
  { key: "trends", label: "Trends" },
  { key: "patterns", label: "Patterns" },
  { key: "comparisons", label: "Comparisons" },
  { key: "insights", label: "Insights" },
  { key: "conclusions", label: "Conclusions" },
];

export default function AnalysisView({ analysis }: { analysis: Analysis | null }) {
  if (!analysis) return null;
  const hasAny = GROUPS.some((g) => (analysis[g.key] ?? []).length > 0);
  if (!hasAny) return null;

  return (
    <Section title="Analysis">
      <div className="grid gap-3 sm:grid-cols-2">
        {GROUPS.map(({ key, label }) => {
          const items = analysis[key] ?? [];
          if (items.length === 0) return null;
          return (
            <div
              key={key}
              className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700/60 dark:bg-slate-900/40"
            >
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {label}
              </h3>
              <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-700 dark:text-slate-300">
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
