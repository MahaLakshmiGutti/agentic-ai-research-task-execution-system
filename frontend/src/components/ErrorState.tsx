import { AlertCircle } from "lucide-react";
import Button from "./Button";

export default function ErrorState({
  title = "Research task failed",
  description = "We couldn't complete this research run. Please try again or review the error details.",
  details,
  onRetry,
}: {
  title?: string;
  description?: string;
  details?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-error/20 bg-error/5 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error">
        <AlertCircle size={22} />
      </div>
      <div className="max-w-md">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
      {details && (
        <details className="mt-1 w-full max-w-md text-left">
          <summary className="cursor-pointer text-xs font-medium text-text-muted hover:text-text-secondary">
            View details
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-surface-2 p-3 text-left text-xs text-text-secondary">
            {details}
          </pre>
        </details>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
          Try Again
        </Button>
      )}
    </div>
  );
}
