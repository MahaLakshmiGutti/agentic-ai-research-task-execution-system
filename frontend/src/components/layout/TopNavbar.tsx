import { Menu } from "lucide-react";
import type { HealthStatus } from "../../types";

export default function TopNavbar({
  title,
  breadcrumb,
  health,
  onOpenMobileSidebar,
}: {
  title: string;
  breadcrumb?: string;
  health: HealthStatus | null;
  onOpenMobileSidebar: () => void;
}) {
  const online = health?.status === "ok";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileSidebar}
        aria-label="Open menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-2 lg:hidden"
      >
        <Menu size={18} />
      </button>

      <div className="min-w-0">
        {breadcrumb && <p className="truncate text-[11px] text-text-muted">{breadcrumb}</p>}
        <h2 className="truncate text-sm font-semibold text-text-primary">{title}</h2>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-secondary">
          <span
            className={`h-1.5 w-1.5 rounded-full ${online ? "bg-success" : "bg-text-muted"}`}
            aria-hidden
          />
          System {online ? "Online" : "Unavailable"}
        </span>
      </div>
    </header>
  );
}
