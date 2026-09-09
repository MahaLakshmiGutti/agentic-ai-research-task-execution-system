import type { PlanTask } from "../types";
import Section from "./Section";

export default function PlanView({ plan }: { plan: PlanTask[] }) {
  if (plan.length === 0) return null;
  return (
    <Section title="Execution plan" subtitle={`${plan.length} research subtasks`}>
      <ol className="space-y-2">
        {plan.map((task) => (
          <li
            key={task.id}
            className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700/60 dark:bg-slate-900/40"
          >
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {task.id + 1}. {task.title}
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{task.description}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
