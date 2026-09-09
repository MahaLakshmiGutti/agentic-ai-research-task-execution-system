import type {
  AppSettings,
  HealthStatus,
  ReportData,
  RunEvent,
  RunStatus,
  RunSummary,
} from "./types";

// Locally, Vite's dev proxy forwards "/api" to the backend (see vite.config.ts).
// In production (Vercel), there is no such proxy, so VITE_API_BASE must be set
// to the deployed backend's full URL, e.g. "https://your-app.onrender.com/api".
const BASE = import.meta.env.VITE_API_BASE || "/api";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export async function getHealth(): Promise<HealthStatus> {
  const res = await fetch(`${BASE}/health`);
  return json(res);
}

export async function createRun(objective: string): Promise<{ run_id: string }> {
  const res = await fetch(`${BASE}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objective }),
  });
  return json(res);
}

export async function listRuns(): Promise<{ runs: RunSummary[] }> {
  const res = await fetch(`${BASE}/runs`);
  return json(res);
}

export async function getRunStatus(runId: string): Promise<RunStatus> {
  const res = await fetch(`${BASE}/runs/${runId}`);
  return json(res);
}

export async function getRunEvents(runId: string, sinceId = 0): Promise<{ events: RunEvent[] }> {
  const res = await fetch(`${BASE}/runs/${runId}/events?since_id=${sinceId}`);
  return json(res);
}

export async function getReport(runId: string): Promise<ReportData> {
  const res = await fetch(`${BASE}/runs/${runId}/report`);
  return json(res);
}

export async function cancelRun(runId: string): Promise<{ run_id: string; status: string }> {
  const res = await fetch(`${BASE}/runs/${runId}/cancel`, { method: "POST" });
  return json(res);
}

export async function getSettings(): Promise<AppSettings> {
  const res = await fetch(`${BASE}/settings`);
  return json(res);
}

export async function updateSettings(provider: string, model: string): Promise<AppSettings> {
  const res = await fetch(`${BASE}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, model }),
  });
  return json(res);
}
