import { ReactNode } from "react";

export default function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-subtle">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
