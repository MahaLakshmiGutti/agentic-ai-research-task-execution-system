import { CheckCircle2, CircleDashed, Loader2, ShieldAlert, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type BadgeStatus =
  | "pending"
  | "running"
  | "completed"
  | "reviewing"
  | "failed"
  | "cancelled"
  | "cancelling";

const CONFIG: Record<BadgeStatus, { label: string; icon: LucideIcon; classes: string; spin?: boolean }> = {
  pending: {
    label: "Waiting",
    icon: CircleDashed,
    classes: "bg-surface-2 text-text-muted",
  },
  running: {
    label: "Running",
    icon: Loader2,
    classes: "bg-accent/10 text-accent",
    spin: true,
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    classes: "bg-success/10 text-success",
  },
  reviewing: {
    label: "Reviewing",
    icon: ShieldAlert,
    classes: "bg-warning/10 text-warning",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    classes: "bg-error/10 text-error",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    classes: "bg-surface-2 text-text-muted",
  },
  cancelling: {
    label: "Cancelling",
    icon: Loader2,
    classes: "bg-warning/10 text-warning",
    spin: true,
  },
};

export default function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const cfg = CONFIG[status as BadgeStatus] ?? CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${cfg.classes} ${className}`}
    >
      <Icon size={12} className={cfg.spin ? "animate-spin" : ""} />
      {cfg.label}
    </span>
  );
}
