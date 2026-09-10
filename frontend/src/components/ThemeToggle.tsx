import { Moon, Sun } from "lucide-react";
import { useTheme } from "../useTheme";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, toggle] = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition duration-150 hover:bg-surface-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${className}`}
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
