export type AgentKey =
  | "system"
  | "planner"
  | "researcher"
  | "analyst"
  | "writer"
  | "writer_revision"
  | "reviewer"
  | "reviewer_revision";

export type EventStatus = "pending" | "running" | "completed" | "failed" | "cancelling";

export interface PlanTask {
  id: number;
  title: string;
  description: string;
}

export interface Source {
  url: string;
  title: string;
  snippet: string;
}

export interface ResearchFinding {
  task_id: number;
  task_title: string;
  summary: string;
  key_points: string[];
  source_urls: string[];
}

export interface Analysis {
  trends: string[];
  patterns: string[];
  comparisons: string[];
  insights: string[];
  conclusions: string[];
}

export interface Review {
  approved: boolean;
  completeness: string;
  relevance: string;
  consistency: string;
  factual_support: string;
  objective_satisfied: boolean;
  feedback: string;
  required_changes: string[];
}

export interface TaskOut {
  task_index: number;
  title: string;
  description: string;
  status: string;
}

export interface RunStatus {
  run_id: string;
  objective: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  current_phase: string;
  approved: boolean | null;
  revision_count: number;
  cancelled: boolean;
  error: string | null;
  created_at: string;
  updated_at: string;
  tasks: TaskOut[];
}

export interface RunEvent {
  id: number;
  run_id: string;
  timestamp: string;
  agent: AgentKey;
  status: EventStatus;
  message: string;
  data: Record<string, unknown> | null;
}

export interface ReportData {
  run_id: string;
  objective: string;
  plan: PlanTask[] | null;
  research_findings: ResearchFinding[] | null;
  sources: Source[] | null;
  analysis: Analysis | null;
  review: Review | null;
  final_report: string | null;
  approved: boolean | null;
  revision_count: number;
}

export interface HealthStatus {
  status: string;
  openai_configured: boolean;
  tavily_configured: boolean;
  gemini_configured: boolean;
  provider: string;
  model: string;
}

export interface ModelOption {
  id: string;
  label: string;
  note: string;
}

export interface ProviderInfo {
  id: string;
  label: string;
  env_key: string;
  configured: boolean;
  default_model: string;
  models: ModelOption[];
}

export interface AppSettings {
  provider: string;
  model: string;
  providers: ProviderInfo[];
}

export interface RunSummary {
  run_id: string;
  objective: string;
  status: RunStatus["status"];
  approved: boolean | null;
  created_at: string;
  updated_at: string;
}
