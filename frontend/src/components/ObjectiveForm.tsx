import { ArrowRight, Sparkles } from "lucide-react";
import { KeyboardEvent, useState } from "react";
import Button from "./Button";

interface Props {
  onSubmit: (objective: string) => Promise<boolean>;
  disabled: boolean;
  /** Pre-fills the textarea, e.g. from a clicked example prompt. Pass a new `key` on the
   * component to re-apply this when the same text is chosen again. */
  initialValue?: string;
}

export default function ObjectiveForm({ onSubmit, disabled, initialValue = "" }: Props) {
  const [objective, setObjective] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const trimmed = objective.trim();
    if (disabled || submitting || trimmed.length < 3) return;
    setSubmitting(true);
    try {
      const ok = await onSubmit(trimmed);
      if (ok) setObjective("");
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  const isDisabled = disabled || submitting;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-subtle transition duration-150 focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/20 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Sparkles size={16} />
        </div>
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          rows={3}
          placeholder="Example: Analyze the latest developments in Generative AI and prepare a structured report covering key trends, companies, challenges, and future opportunities."
          className="max-h-52 w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-0 disabled:text-text-muted"
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
        <p className="text-[11px] text-text-muted">Enter to run · Shift+Enter for a new line</p>
        <Button
          onClick={() => void submit()}
          disabled={isDisabled || objective.trim().length < 3}
          size="md"
        >
          Run Research
          <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  );
}
