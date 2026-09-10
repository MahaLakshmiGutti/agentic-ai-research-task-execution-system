import { ListTodo } from "lucide-react";
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
            className="flex gap-3 rounded-lg border border-border bg-surface-2/50 p-3"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
              <ListTodo size={12} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary">{task.title}</p>
              <p className="mt-0.5 text-xs text-text-secondary">{task.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
