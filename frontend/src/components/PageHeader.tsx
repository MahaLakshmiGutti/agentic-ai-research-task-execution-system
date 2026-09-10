import type { ReactNode } from "react";

export default function PageHeader({
  title,
  subtitle,
  action,
  centered = false,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  centered?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${centered ? "text-center sm:text-left" : ""}`}
    >
      <div className={centered ? "mx-auto sm:mx-0" : ""}>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-text-primary sm:text-[32px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-text-secondary">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
