import type { Analysis, PlanTask, ResearchFinding, Review, RunEvent, Source } from "./types";

/**
 * Derivations that turn the persisted event log into everything the
 * orchestration canvas draws. Kept free of React so the canvas can render the
 * exact same way for a live run and for a replay of a finished one - the only
 * difference is how many events get passed in.
 */

export type FlowNodeKey =
  | "planner"
  | "researcher"
  | "analyst"
  | "writer"
  | "reviewer"
  | "writer_revision"
  | "reviewer_revision";

export type FlowStatus = "pending" | "running" | "completed" | "failed" | "cancelling";

export interface FlowNodeSpec {
  key: FlowNodeKey;
  step: string;
  label: string;
  role: string;
}

export interface FlowNode extends FlowNodeSpec {
  status: FlowStatus;
  message: string;
  durationMs: number | null;
  /** Short description of what this agent wrote into the shared state. */
  output: string | null;
}

export const MAIN_NODES: FlowNodeSpec[] = [
  { key: "planner", step: "01", label: "Planner", role: "Decompose objective" },
  { key: "researcher", step: "02", label: "Researcher", role: "Tavily web search" },
  { key: "analyst", step: "03", label: "Analyst", role: "Synthesize findings" },
  { key: "writer", step: "04", label: "Writer", role: "Draft report" },
  { key: "reviewer", step: "05", label: "Reviewer", role: "Quality gate" },
];

export const REVISION_NODES: FlowNodeSpec[] = [
  { key: "writer_revision", step: "06", label: "Writer", role: "Revision pass" },
  { key: "reviewer_revision", step: "07", label: "Reviewer", role: "Final verdict" },
];

/** State key each agent writes, shown travelling along the edge it feeds. */
export const EDGE_PAYLOAD: Record<FlowNodeKey, string> = {
  planner: "plan",
  researcher: "research_findings + sources",
  analyst: "analysis",
  writer: "draft",
  reviewer: "review",
  writer_revision: "draft",
  reviewer_revision: "review",
};

const millis = (iso: string): number => {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
};

function completedData(events: RunEvent[], agent: FlowNodeKey): Record<string, unknown> | null {
  const done = events.filter((e) => e.agent === agent && e.status === "completed" && e.data);
  return done.length ? done[done.length - 1].data : null;
}

function summarizeOutput(agent: FlowNodeKey, events: RunEvent[]): string | null {
  const data = completedData(events, agent);
  if (!data) return null;

  switch (agent) {
    case "planner": {
      const tasks = (data.tasks as PlanTask[]) ?? [];
      return `plan[${tasks.length}]`;
    }
    case "researcher": {
      const findings = (data.findings as ResearchFinding[]) ?? [];
      const sources = (data.sources as Source[]) ?? [];
      return `findings[${findings.length}] · sources[${sources.length}]`;
    }
    case "analyst": {
      const analysis = data.analysis as Analysis | undefined;
      if (!analysis) return "analysis{}";
      const n =
        analysis.insights.length +
        analysis.trends.length +
        analysis.patterns.length +
        analysis.conclusions.length;
      return `analysis{${n} points}`;
    }
    case "writer":
    case "writer_revision": {
      const draft = (data.draft as string) ?? "";
      return `draft ${formatChars(draft.length)}`;
    }
    case "reviewer":
    case "reviewer_revision": {
      const review = data.review as Review | undefined;
      if (!review) return "review{}";
      return review.approved ? "review{approved}" : "review{rejected}";
    }
    default:
      return null;
  }
}

function formatChars(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k chars` : `${n} chars`;
}

export function formatDuration(ms: number | null): string | null {
  if (ms === null) return null;
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s - m * 60)}s`;
}

export function buildNode(spec: FlowNodeSpec, events: RunEvent[]): FlowNode {
  const mine = events.filter((e) => e.agent === spec.key);
  if (mine.length === 0) {
    return { ...spec, status: "pending", message: "Waiting to start", durationMs: null, output: null };
  }

  const last = mine[mine.length - 1];
  const started = mine.find((e) => e.status === "running");
  const ended = [...mine].reverse().find((e) => e.status === "completed" || e.status === "failed");
  const durationMs =
    started && ended ? Math.max(0, millis(ended.timestamp) - millis(started.timestamp)) : null;

  return {
    ...spec,
    status: last.status,
    message: last.message,
    durationMs,
    output: summarizeOutput(spec.key, events),
  };
}

export function hasRevision(events: RunEvent[]): boolean {
  return events.some((e) => e.agent === "writer_revision" || e.agent === "reviewer_revision");
}

/** The first-pass verdict, which is what decides the conditional edge. */
export function firstVerdict(events: RunEvent[]): Review | null {
  const done = events.filter((e) => e.agent === "reviewer" && e.status === "completed" && e.data);
  if (!done.length) return null;
  return (done[done.length - 1].data?.review as Review) ?? null;
}

export interface SharedStateSnapshot {
  key: string;
  filled: boolean;
  detail: string;
  writtenBy: string;
}

/** The shared WorkflowState, as it stands at this point in the run. */
export function sharedState(events: RunEvent[]): SharedStateSnapshot[] {
  const plan = (completedData(events, "planner")?.tasks as PlanTask[]) ?? null;
  const research = completedData(events, "researcher");
  const findings = (research?.findings as ResearchFinding[]) ?? null;
  const sources = (research?.sources as Source[]) ?? null;
  const analysis = (completedData(events, "analyst")?.analysis as Analysis) ?? null;
  const draftData = completedData(events, "writer_revision") ?? completedData(events, "writer");
  const draft = (draftData?.draft as string) ?? null;
  const reviewData = completedData(events, "reviewer_revision") ?? completedData(events, "reviewer");
  const review = (reviewData?.review as Review) ?? null;

  return [
    {
      key: "plan",
      filled: !!plan,
      detail: plan ? `${plan.length} subtasks` : "empty",
      writtenBy: "Planner",
    },
    {
      key: "research_findings",
      filled: !!findings,
      detail: findings ? `${findings.length} findings` : "empty",
      writtenBy: "Researcher",
    },
    {
      key: "sources",
      filled: !!sources,
      detail: sources ? `${sources.length} sources` : "empty",
      writtenBy: "Researcher",
    },
    {
      key: "analysis",
      filled: !!analysis,
      detail: analysis ? `${analysis.insights.length} insights` : "empty",
      writtenBy: "Analyst",
    },
    {
      key: "draft",
      filled: !!draft,
      detail: draft ? formatChars(draft.length) : "empty",
      writtenBy: "Writer",
    },
    {
      key: "review",
      filled: !!review,
      detail: review ? (review.approved ? "approved" : "rejected") : "empty",
      writtenBy: "Reviewer",
    },
  ];
}

export interface Telemetry {
  elapsedMs: number | null;
  subtasks: number | null;
  sources: number | null;
  revisions: number;
  approved: boolean | null;
  agentCalls: number;
}

export function telemetry(events: RunEvent[]): Telemetry {
  const plan = (completedData(events, "planner")?.tasks as PlanTask[]) ?? null;
  const sources = (completedData(events, "researcher")?.sources as Source[]) ?? null;
  const reviewData = completedData(events, "reviewer_revision") ?? completedData(events, "reviewer");
  const review = (reviewData?.review as Review) ?? null;

  const stamps = events.map((e) => millis(e.timestamp)).filter(Boolean);
  const elapsedMs = stamps.length >= 2 ? Math.max(...stamps) - Math.min(...stamps) : null;

  // One LLM call per agent turn, plus one per research subtask.
  const agentTurns = events.filter((e) => e.status === "running" && e.agent !== "system").length;
  const agentCalls = agentTurns + (plan ? plan.length : 0);

  return {
    elapsedMs,
    subtasks: plan ? plan.length : null,
    sources: sources ? sources.length : null,
    revisions: hasRevision(events) ? 1 : 0,
    approved: review ? review.approved : null,
    agentCalls,
  };
}

export interface StreamMessage {
  id: number;
  from: string;
  kind: "dispatch" | "result" | "verdict" | "system";
  text: string;
  timestamp: string;
}

const AGENT_LABEL: Record<string, string> = {
  system: "Orchestrator",
  planner: "Planner",
  researcher: "Researcher",
  analyst: "Analyst",
  writer: "Writer",
  reviewer: "Reviewer",
  writer_revision: "Writer · revision",
  reviewer_revision: "Reviewer · revision",
};

/** The inter-agent traffic, as a chat-like stream for the demo panel. */
export function messageStream(events: RunEvent[]): StreamMessage[] {
  return events.map((e) => {
    const isReviewer = e.agent === "reviewer" || e.agent === "reviewer_revision";
    let kind: StreamMessage["kind"] = "system";
    if (e.agent !== "system") {
      if (e.status === "running") kind = "dispatch";
      else if (e.status === "completed") kind = isReviewer ? "verdict" : "result";
      else if (e.status === "failed") kind = "verdict";
    }
    return {
      id: e.id,
      from: AGENT_LABEL[e.agent] ?? e.agent,
      kind,
      text: e.message,
      timestamp: e.timestamp,
    };
  });
}

/**
 * Replay pacing: the real gap between two events, clamped so a long Tavily
 * fetch doesn't stall a demo and an instant failure doesn't flash past.
 */
export function replayDelayMs(events: RunEvent[], index: number, speed: number): number {
  const prev = events[index - 1];
  const next = events[index];
  if (!prev || !next) return 600 / speed;
  const gap = millis(next.timestamp) - millis(prev.timestamp);
  return Math.min(Math.max(gap, 260), 1800) / speed;
}
