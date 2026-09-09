import type { ResearchFinding, Source } from "../types";
import Section from "./Section";

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
          <div
            key={f.task_id}
            className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700/60 dark:bg-slate-900/40"
          >
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{f.task_title}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{f.summary}</p>
            {f.key_points.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-slate-600 dark:text-slate-400">
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
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Sources
          </h3>
          <ul className="space-y-1">
            {sources.map((s) => (
              <li key={s.url} className="truncate text-xs">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:underline dark:text-indigo-400"
                  title={s.snippet}
                >
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}
