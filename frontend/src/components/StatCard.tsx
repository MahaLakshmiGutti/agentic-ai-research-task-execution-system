import type { LucideIcon } from "lucide-react";

export default function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-subtle">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-semibold leading-none text-text-primary">{value}</p>
        <p className="mt-1 truncate text-xs text-text-muted">{label}</p>
      </div>
    </div>
  );
}
