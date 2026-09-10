import type { LucideIcon } from "lucide-react";

export type AgentCardStatus = "pending" | "running" | "reviewing" | "completed" | "failed";

const STATUS_STYLES: Record<
  AgentCardStatus,
  { ring: string; iconBg: string; badge: string; label: string; dot: string }
> = {
  pending: {
    ring: "border-border",
    iconBg: "bg-surface-2 text-text-muted",
    badge: "bg-surface-2 text-text-muted",
    label: "Waiting",
    dot: "bg-text-muted",
  },
  running: {
    ring: "border-accent/50",
    iconBg: "bg-accent/10 text-accent",
    badge: "bg-accent/10 text-accent",
    label: "Running",
    dot: "bg-accent",
  },
  reviewing: {
    ring: "border-warning/50",
    iconBg: "bg-warning/10 text-warning",
    badge: "bg-warning/10 text-warning",
    label: "Reviewing",
    dot: "bg-warning",
  },
  completed: {
    ring: "border-success/40",
    iconBg: "bg-success/10 text-success",
    badge: "bg-success/10 text-success",
    label: "Completed",
    dot: "bg-success",
  },
  failed: {
    ring: "border-error/50",
    iconBg: "bg-error/10 text-error",
    badge: "bg-error/10 text-error",
    label: "Failed",
    dot: "bg-error",
  },
};

export { STATUS_STYLES as AGENT_STATUS_STYLES };

export default function AgentCard({
  icon: Icon,
  name,
  responsibility,
  status,
  badge,
  onClick,
}: {
  icon: LucideIcon;
  name: string;
  responsibility: string;
  status: AgentCardStatus;
  badge?: { label: string; tone: "warning" | "success" };
  onClick?: () => void;
}) {
  const style = STATUS_STYLES[status];
  const isActive = status === "running" || status === "reviewing";

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      title={onClick ? `View ${name} output` : undefined}
      className={`flex w-full flex-col items-center rounded-lg text-center ${
        onClick
          ? "cursor-pointer py-1 transition duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          : ""
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 transition duration-150 ${style.ring} ${style.iconBg} ${
          isActive ? "shadow-elevated" : ""
        }`}
      >
        <Icon size={19} />
      </div>
      <p className="mt-2 text-sm font-semibold text-text-primary">{name}</p>
      <p className="mt-0.5 max-w-[9rem] text-xs text-text-muted">{responsibility}</p>
      <span
        className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${style.badge}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${style.dot} ${isActive ? "animate-pulse" : ""}`} />
        {style.label}
      </span>
      {badge && (
        <span
          className={`mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            badge.tone === "success" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          }`}
        >
          {badge.label}
        </span>
      )}
    </div>
  );
}
