import {
  Bot,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Github,
  History,
  LayoutDashboard,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import type { PageKey } from "../../pages/pageKey";
import ThemeToggle from "../ThemeToggle";

const NAV_ITEMS: { key: PageKey; label: string; icon: LucideIcon }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "new", label: "New Research", icon: Sparkles },
  { key: "history", label: "Research History", icon: History },
  { key: "activity", label: "Agent Activity", icon: Bot },
  { key: "reports", label: "Reports", icon: FileText },
];

const GITHUB_URL = "https://github.com/MahaLakshmiGutti/agentic-ai-research-task-execution-system";

export default function Sidebar({
  page,
  onNavigate,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: {
  page: PageKey;
  onNavigate: (page: PageKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  return (
    <>
      {/* Mobile scrim */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-border bg-sidebar transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-[72px]" : "lg:w-64"} w-64`}
      >
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
            <Sparkles size={16} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">Agentic AI</p>
              <p className="truncate text-[11px] text-text-muted">Research System</p>
            </div>
          )}
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = page === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  onNavigate(item.key);
                  onCloseMobile();
                }}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition duration-150 ${
                  collapsed ? "justify-center" : ""
                } ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                }`}
              >
                <Icon size={17} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          <div className={`flex items-center gap-1 ${collapsed ? "flex-col" : ""}`}>
            <ThemeToggle />
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="View repository on GitHub"
              title="View repository on GitHub"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition duration-150 hover:bg-surface-2 hover:text-text-primary"
            >
              <Github size={17} />
            </a>
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition duration-150 hover:bg-surface-2 hover:text-text-primary lg:ml-auto lg:flex"
            >
              {collapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
