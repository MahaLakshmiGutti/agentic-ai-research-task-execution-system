import { useState } from "react";
import ObjectiveForm from "../components/ObjectiveForm";
import PageHeader from "../components/PageHeader";

const EXAMPLE_PROMPTS = [
  "Analyze recent developments in Generative AI and prepare a structured report covering key trends, companies, challenges, and future opportunities.",
  "Compare AWS, Azure and Google Cloud for enterprise AI workloads, covering pricing, tooling, and ecosystem maturity.",
  "Research emerging trends in AI agents and autonomous workflows, including key frameworks and adoption challenges.",
];

export default function NewResearchPage({
  onSubmit,
}: {
  onSubmit: (objective: string) => Promise<boolean>;
}) {
  const [preset, setPreset] = useState<{ text: string; n: number }>({ text: "", n: 0 });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Start a Research Task"
        subtitle="Enter a research objective and let the agent workflow handle planning, research, analysis, writing, and review."
        centered
      />

      <ObjectiveForm key={preset.n} onSubmit={onSubmit} disabled={false} initialValue={preset.text} />

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Try an example
        </p>
        <div className="flex flex-col gap-2">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setPreset((p) => ({ text: prompt, n: p.n + 1 }))}
              className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-left text-xs text-text-secondary transition duration-150 hover:border-accent/40 hover:bg-surface-2 hover:text-text-primary"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
