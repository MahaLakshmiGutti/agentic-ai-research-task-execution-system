import {
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CornerDownLeft,
  Database,
  Gauge,
  Loader2,
  Pause,
  PenLine,
  Play,
  Radio,
  RotateCcw,
  SearchCheck,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  EDGE_PAYLOAD,
  MAIN_NODES,
  REVISION_NODES,
  buildNode,
  firstVerdict,
  formatDuration,
  hasRevision,
  messageStream,
  replayDelayMs,
  sharedState,
  telemetry,
  type FlowNode,
  type FlowNodeKey,
} from "../orchestration";
import type { RunEvent, RunStatus } from "../types";

const NODE_ICON: Record<FlowNodeKey, LucideIcon> = {
  planner: ClipboardList,
  researcher: SearchCheck,
  analyst: BrainCircuit,
  writer: PenLine,
  reviewer: ShieldCheck,
  writer_revision: PenLine,
  reviewer_revision: ShieldCheck,
};

const NODE_STYLE: Record<string, { card: string; chip: string; icon: string; step: string }> = {
  pending: {
    card: "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800",
    chip: "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500",
    icon: "bg-slate-100 text-slate-400 dark:bg-slate-700/70 dark:text-slate-500",
    step: "text-slate-300 dark:text-slate-600",
  },
  running: {
    card: "border-amber-300 bg-amber-50/60 shadow-md shadow-amber-500/10 dark:border-amber-500/50 dark:bg-amber-500/5",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    icon: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    step: "text-amber-500 dark:text-amber-400",
  },
  completed: {
    card: "border-emerald-200 bg-white dark:border-emerald-500/30 dark:bg-slate-800",
    chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    icon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    step: "text-emerald-500 dark:text-emerald-400",
  },
  failed: {
    card: "border-red-300 bg-red-50/60 dark:border-red-500/40 dark:bg-red-500/5",
    chip: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    icon: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
    step: "text-red-500 dark:text-red-400",
  },
  cancelling: {
    card: "border-orange-300 bg-orange-50/60 dark:border-orange-500/40 dark:bg-orange-500/5",
    chip: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    icon: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
    step: "text-orange-500 dark:text-orange-400",
  },
};

function StatusGlyph({ status }: { status: string }) {
  if (status === "running") return <Loader2 size={13} className="animate-spin" />;
  if (status === "completed") return <CheckCircle2 size={13} />;
  if (status === "failed") return <XCircle size={13} />;
  return null;
}

function NodeCard({ node }: { node: FlowNode }) {
  const style = NODE_STYLE[node.status] ?? NODE_STYLE.pending;
  const Icon = NODE_ICON[node.key];
  const duration = formatDuration(node.durationMs);

  return (
    <div
      className={`relative flex min-w-0 flex-1 flex-col rounded-xl border p-3 transition-all duration-300 ${style.card}`}
      title={node.message}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${style.icon}`}>
          <Icon size={16} />
        </div>
        <span className={`font-mono text-[10px] font-bold tracking-widest ${style.step}`}>{node.step}</span>
      </div>

      <p className="mt-2 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{node.label}</p>
      <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {node.role}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium ${style.chip}`}
        >
          <StatusGlyph status={node.status} />
          {node.output ?? node.status}
        </span>
        {duration && (
          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{duration}</span>
        )}
      </div>
    </div>
  );
}

/** The edge between two agents, labelled with the state key that travels it. */
function Edge({ payload, active, done }: { payload: string; active: boolean; done: boolean }) {
  const line = active
    ? "flow-marching text-amber-500 dark:text-amber-400"
    : done
      ? "bg-emerald-300 dark:bg-emerald-500/50"
      : "bg-slate-200 dark:bg-slate-700";
  const label = done || active ? "text-slate-500 dark:text-slate-400" : "text-slate-300 dark:text-slate-600";

  return (
    <div className="flex shrink-0 flex-row items-center gap-1 py-2 lg:w-28 lg:flex-col lg:justify-center lg:py-0">
      <span className={`hidden text-center font-mono text-[9px] leading-tight lg:block ${label}`}>
        {payload}
      </span>
      <div className="flex w-full items-center">
        <div className={`h-0.5 w-full rounded-full ${line}`} />
        <ChevronRight
          size={13}
          className={`-ml-1 shrink-0 ${done ? "text-emerald-400 dark:text-emerald-500" : active ? "text-amber-500 dark:text-amber-400" : "text-slate-300 dark:text-slate-600"}`}
        />
      </div>
      <span className={`font-mono text-[9px] lg:hidden ${label}`}>{payload}</span>
    </div>
  );
}

function TelemetryChip({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800">
      <Icon size={13} className="shrink-0 text-indigo-500 dark:text-indigo-400" />
      <span className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</span>
      <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  );
}

interface Props {
  events: RunEvent[];
  runStatus: RunStatus;
}

export default function OrchestrationCanvas({ events, runStatus }: Props) {
  const [live, setLive] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [cursor, setCursor] = useState(events.length);

  // In live mode the canvas always shows everything that has arrived.
  useEffect(() => {
    if (live) setCursor(events.length);
  }, [live, events.length]);

  // Replay advances one event at a time, paced by the real gaps between them.
  useEffect(() => {
    if (!playing || live) return;
    if (cursor >= events.length) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(
      () => setCursor((c) => Math.min(c + 1, events.length)),
      replayDelayMs(events, cursor, speed)
    );
    return () => window.clearTimeout(timer);
  }, [playing, live, cursor, events, speed]);

  const visible = useMemo(() => events.slice(0, cursor), [events, cursor]);

  const mainNodes = useMemo(() => MAIN_NODES.map((s) => buildNode(s, visible)), [visible]);
  const revisionNodes = useMemo(() => REVISION_NODES.map((s) => buildNode(s, visible)), [visible]);
  const stats = useMemo(() => telemetry(visible), [visible]);
  const state = useMemo(() => sharedState(visible), [visible]);
  const stream = useMemo(() => messageStream(visible), [visible]);

  const showRevision = hasRevision(visible);
  const verdict = firstVerdict(visible);
  const rejected = verdict ? !verdict.approved : false;

  const lastStamp = visible.length ? visible[visible.length - 1].timestamp : null;

  function startReplay() {
    setLive(false);
    setCursor(0);
    setPlaying(true);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ---- Command bar: telemetry + replay transport ---- */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
        <div className="flex flex-wrap items-center gap-2">
          <TelemetryChip
            icon={Gauge}
            label="Elapsed"
            value={formatDuration(stats.elapsedMs) ?? "--"}
          />
          <TelemetryChip icon={ClipboardList} label="Subtasks" value={`${stats.subtasks ?? "--"}`} />
          <TelemetryChip icon={SearchCheck} label="Sources" value={`${stats.sources ?? "--"}`} />
          <TelemetryChip icon={Radio} label="LLM calls" value={`${stats.agentCalls}`} />
          <TelemetryChip icon={RotateCcw} label="Revisions" value={`${stats.revisions}`} />
          <TelemetryChip
            icon={ShieldCheck}
            label="Verdict"
            value={stats.approved === null ? "--" : stats.approved ? "approved" : "rejected"}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
          <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
            <button
              onClick={() => {
                setLive(true);
                setPlaying(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition ${
                live
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-500 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Radio size={13} />
              Live
            </button>
            <button
              onClick={() => setLive(false)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition ${
                !live
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-500 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Play size={13} />
              Replay
            </button>
          </div>

          {!live && (
            <>
              <button
                onClick={() => setPlaying((p) => !p)}
                disabled={events.length === 0}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {playing ? <Pause size={13} /> : <Play size={13} />}
                {playing ? "Pause" : "Play"}
              </button>
              <button
                onClick={startReplay}
                disabled={events.length === 0}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <RotateCcw size={13} />
                Restart
              </button>

              <input
                type="range"
                min={0}
                max={events.length}
                value={cursor}
                onChange={(e) => {
                  setPlaying(false);
                  setCursor(Number(e.target.value));
                }}
                className="h-1.5 min-w-[8rem] flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600 dark:bg-slate-700"
                aria-label="Replay position"
              />

              <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
                {[1, 2, 4].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`px-2 py-1.5 font-mono text-[11px] font-semibold transition ${
                      speed === s
                        ? "bg-slate-700 text-white dark:bg-slate-600"
                        : "bg-white text-slate-500 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                {cursor}/{events.length}
                {lastStamp && ` · ${new Date(lastStamp).toLocaleTimeString()}`}
              </span>
            </>
          )}

          {live && (
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              {runStatus.status === "running" || runStatus.status === "pending"
                ? "following execution…"
                : `${events.length} events captured · switch to Replay to re-run the demo`}
            </span>
          )}
        </div>
      </div>

      {/* ---- The graph ---- */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          LangGraph StateGraph · agents exchange work through the shared WorkflowState
        </p>

        <div className="flex flex-col lg:flex-row lg:items-stretch">
          {mainNodes.map((node, i) => {
            const next = mainNodes[i + 1];
            return (
              <div key={node.key} className="flex min-w-0 flex-1 flex-col lg:flex-row lg:items-stretch">
                <NodeCard node={node} />
                {next && (
                  <Edge
                    payload={EDGE_PAYLOAD[node.key]}
                    active={node.status === "completed" && next.status === "running"}
                    done={next.status === "completed" || next.status === "failed"}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ---- Conditional edge out of the Reviewer ---- */}
        <div className="mt-4 flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-600 sm:flex-row sm:items-center sm:gap-3">
          <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Conditional edge
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2 py-1 font-mono text-[11px] font-semibold ${
                verdict && !rejected
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
              }`}
            >
              approved → END
            </span>
            <span
              className={`flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] font-semibold ${
                rejected
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                  : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
              }`}
            >
              <CornerDownLeft size={12} />
              rejected → revision (max 1)
            </span>
          </div>
        </div>

        {/* ---- Revision lane, only once the loop is actually taken ---- */}
        {showRevision && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-500/30 dark:bg-amber-500/5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Revision loop taken · this verdict is final
            </p>
            <div className="flex flex-col lg:flex-row lg:items-stretch">
              {revisionNodes.map((node, i) => {
                const next = revisionNodes[i + 1];
                return (
                  <div key={node.key} className="flex min-w-0 flex-1 flex-col lg:flex-row lg:items-stretch">
                    <NodeCard node={node} />
                    {next && (
                      <Edge
                        payload={EDGE_PAYLOAD[node.key]}
                        active={node.status === "completed" && next.status === "running"}
                        done={next.status === "completed" || next.status === "failed"}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ---- Shared state + inter-agent traffic ---- */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 lg:col-span-2">
          <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            <Database size={12} />
            Shared WorkflowState
          </p>
          <ul className="space-y-1.5">
            {state.map((entry) => (
              <li
                key={entry.key}
                className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 transition ${
                  entry.filled
                    ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/25 dark:bg-emerald-500/5"
                    : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40"
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`truncate font-mono text-[11px] font-semibold ${
                      entry.filled ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {entry.key}
                  </p>
                  <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">
                    written by {entry.writtenBy}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-mono text-[10px] ${
                    entry.filled
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-300 dark:text-slate-600"
                  }`}
                >
                  {entry.detail}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 lg:col-span-3">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Inter-agent traffic
          </p>
          <ol className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
            {stream.length === 0 && (
              <li className="text-xs text-slate-400 dark:text-slate-500">No events yet.</li>
            )}
            {stream.map((msg) => (
              <li key={`${msg.id}-${msg.kind}`} className="flex flex-col">
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {msg.from}
                </span>
                <div
                  className={`mt-0.5 rounded-lg px-2.5 py-1.5 text-xs leading-snug ${
                    msg.kind === "dispatch"
                      ? "bg-slate-900 text-slate-100 dark:bg-slate-950/70 dark:text-slate-200"
                      : msg.kind === "verdict"
                        ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-200"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200"
                  }`}
                >
                  {msg.text}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
