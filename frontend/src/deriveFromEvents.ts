import type { Analysis, PlanTask, ResearchFinding, Review, RunEvent, Source } from "./types";

function latestData(events: RunEvent[], agent: string): Record<string, unknown> | null {
  const relevant = events.filter((e) => e.agent === agent && e.status === "completed" && e.data);
  if (relevant.length === 0) return null;
  return relevant[relevant.length - 1].data;
}

export function derivePlan(events: RunEvent[]): PlanTask[] {
  const data = latestData(events, "planner");
  return (data?.tasks as PlanTask[]) ?? [];
}

export function deriveResearch(events: RunEvent[]): { findings: ResearchFinding[]; sources: Source[] } {
  const data = latestData(events, "researcher");
  return {
    findings: (data?.findings as ResearchFinding[]) ?? [],
    sources: (data?.sources as Source[]) ?? [],
  };
}

export function deriveAnalysis(events: RunEvent[]): Analysis | null {
  const data = latestData(events, "analyst");
  return (data?.analysis as Analysis) ?? null;
}

export function deriveDraft(events: RunEvent[]): string | null {
  const data = latestData(events, "writer_revision") ?? latestData(events, "writer");
  return (data?.draft as string) ?? null;
}

export function deriveReview(events: RunEvent[]): Review | null {
  const data = latestData(events, "reviewer_revision") ?? latestData(events, "reviewer");
  return (data?.review as Review) ?? null;
}

/** The latest completed Reviewer/Reviewer-revision event, if any. */
function latestReviewEvent(events: RunEvent[]): RunEvent | null {
  const relevant = events.filter(
    (e) => (e.agent === "reviewer" || e.agent === "reviewer_revision") && e.status === "completed" && e.data
  );
  return relevant.length ? relevant[relevant.length - 1] : null;
}

/**
 * Only reveal the draft as the "final report" once the Reviewer has actually
 * cleared it: approved on the first pass, or the (mandatory, single) revision
 * pass has completed - which is always the end of the workflow regardless of
 * its verdict. A first-pass rejection must not surface a report yet, since a
 * revision is still pending.
 */
export function deriveFinalReport(events: RunEvent[]): string | null {
  const latest = latestReviewEvent(events);
  if (!latest) return null;
  const review = latest.data?.review as Review | undefined;
  if (!review) return null;
  if (latest.agent === "reviewer_revision" || review.approved) {
    return deriveDraft(events);
  }
  return null;
}

/** True while the draft was rejected on the first pass and a revision is in flight. */
export function deriveRevisionPending(events: RunEvent[]): boolean {
  const latest = latestReviewEvent(events);
  if (!latest || latest.agent !== "reviewer") return false;
  const review = latest.data?.review as Review | undefined;
  return !!review && !review.approved;
}
