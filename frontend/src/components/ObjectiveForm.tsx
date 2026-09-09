import { Send } from "lucide-react";
import { KeyboardEvent, useState } from "react";

interface Props {
  onSubmit: (objective: string) => void;
  disabled: boolean;
}

export default function ObjectiveForm({ onSubmit, disabled }: Props) {
  const [objective, setObjective] = useState("");

  function submit() {
    const trimmed = objective.trim();
    if (disabled || trimmed.length < 3) return;
    onSubmit(trimmed);
    setObjective("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex items-end gap-2">
      <textarea
        value={objective}
        onChange={(e) => setObjective(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={2}
        placeholder="Ask a research question... (Enter to send, Shift+Enter for a new line)"
        className="max-h-40 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:text-slate-500"
      />
      <button
        onClick={submit}
        disabled={disabled || objective.trim().length < 3}
        aria-label="Send"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-600"
      >
        <Send size={16} />
      </button>
    </div>
  );
}
