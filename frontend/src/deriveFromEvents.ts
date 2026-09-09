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

/** The Writer's first-pass draft, if it has completed. */
export function deriveDraftFirst(events: RunEvent[]): string | null {
  const data = latestData(events, "writer");
  return (data?.draft as string) ?? null;
}

/** The Writer's revised draft, if a revision pass has completed. */
export function deriveDraftRevision(events: RunEvent[]): string | null {
  const data = latestData(events, "writer_revision");
  return (data?.draft as string) ?? null;
}

export function deriveReview(events: RunEvent[]): Review | null {
  const data = latestData(events, "reviewer_revision") ?? latestData(events, "reviewer");
  return (data?.review as Review) ?? null;
}

/** The Reviewer's first-pass verdict, if it has completed. */
export function deriveReviewFirst(events: RunEvent[]): Review | null {
  const data = latestData(events, "reviewer");
  return (data?.review as Review) ?? null;
}

/** The Reviewer's verdict on the revised draft, if a revision pass has completed. */
export function deriveReviewRevision(events: RunEvent[]): Review | null {
  const data = latestData(events, "reviewer_revision");
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
 * approved it - on the first pass, or on the (mandatory, single) revision
 * pass. If the revision is rejected too, the workflow still ends, but no
 * report is surfaced as "final"; the rejected draft remains visible inline
 * in the Process tab instead (see DraftView / ReviewView per round).
 */
export function deriveFinalReport(events: RunEvent[]): string | null {
  const latest = latestReviewEvent(events);
  if (!latest) return null;
  const review = latest.data?.review as Review | undefined;
  if (!review?.approved) return null;
  return deriveDraft(events);
}

/** True while the draft was rejected on the first pass and a revision is in flight. */
export function deriveRevisionPending(events: RunEvent[]): boolean {
  const latest = latestReviewEvent(events);
  if (!latest || latest.agent !== "reviewer") return false;
  const review = latest.data?.review as Review | undefined;
  return !!review && !review.approved;
}

/** True once the workflow has ended (revision pass completed) without ever being approved. */
export function deriveNeverApproved(events: RunEvent[]): boolean {
  const latest = latestReviewEvent(events);
  if (!latest || latest.agent !== "reviewer_revision") return false;
  const review = latest.data?.review as Review | undefined;
  return !!review && !review.approved;
}
