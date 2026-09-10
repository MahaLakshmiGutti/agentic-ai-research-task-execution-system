import type { Review } from "../types";
import Section from "./Section";

export default function ReviewView({
  review,
  title = "Reviewer result",
}: {
  review: Review | null;
  title?: string;
}) {
  if (!review) return null;

  return (
    <Section title={title}>
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            review.approved ? "bg-success/10 text-success" : "bg-error/10 text-error"
          }`}
        >
          {review.approved ? "Approved" : "Rejected"}
        </span>
      </div>

      <p className="mb-3 text-sm text-text-secondary">{review.feedback}</p>

      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <ReviewCriterion label="Completeness" value={review.completeness} />
        <ReviewCriterion label="Relevance" value={review.relevance} />
        <ReviewCriterion label="Consistency" value={review.consistency} />
        <ReviewCriterion label="Factual support" value={review.factual_support} />
      </div>

      {review.required_changes.length > 0 && (
        <div className="mt-3">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Required changes
          </h3>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-text-secondary">
            {review.required_changes.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

function ReviewCriterion({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/50 p-2">
      <p className="font-semibold text-text-muted">{label}</p>
      <p className="mt-0.5 text-text-secondary">{value}</p>
    </div>
  );
}
