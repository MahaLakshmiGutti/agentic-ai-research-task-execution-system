import type { ResearchFinding, Source } from "../types";
import Section from "./Section";
import SourceCard from "./SourceCard";

export default function ResearchView({
  findings,
  sources,
}: {
  findings: ResearchFinding[];
  sources: Source[];
}) {
  if (findings.length === 0 && sources.length === 0) return null;
  return (
    <Section title="Research findings" subtitle={`${sources.length} sources gathered via Tavily`}>
      <div className="space-y-3">
        {findings.map((f) => (
          <div key={f.task_id} className="rounded-lg border border-border bg-surface-2/50 p-3">
            <p className="text-sm font-medium text-text-primary">{f.task_title}</p>
            <p className="mt-1 text-xs text-text-secondary">{f.summary}</p>
            {f.key_points.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-text-secondary">
                {f.key_points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {sources.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Sources</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {sources.map((s) => (
              <SourceCard key={s.url} source={s} />
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}
