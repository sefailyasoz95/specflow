"use client";

import { cn, hours } from "@/lib/utils";
import type { Op, Requirement, Sprint, Task } from "@/lib/types";
import { TASK_STATUS_LABEL } from "@/lib/types";

type Ctx = {
  tasks: Task[];
  sprints: Sprint[];
  requirements: Requirement[];
  operations: Op[];
};

type Line = {
  kind: "add" | "mod" | "remove";
  entity: string;
  title: string;
  meta?: string;
  changes?: { field: string; from: string; to: string }[];
};

const MARK = { add: "+", mod: "~", remove: "−" } as const;

/** Resolve a ref that may be a tempId from this same change set. */
function refLabel(
  ref: string | null | undefined,
  ops: Op[],
  sprints: Sprint[]
): string | null {
  if (!ref) return null;
  const existing = sprints.find((s) => s.id === ref);
  if (existing) return existing.name;
  const created = ops.find(
    (o) => o.op === "create_sprint" && o.tempId === ref
  ) as Extract<Op, { op: "create_sprint" }> | undefined;
  return created ? `${created.name} (new)` : null;
}

export function toLines(ctx: Ctx): Line[] {
  const { operations: ops, tasks, sprints, requirements } = ctx;

  return ops.map<Line>((op) => {
    switch (op.op) {
      case "create_requirement":
        return {
          kind: "add",
          entity: "requirement",
          title: op.title,
          meta: op.priority ?? "medium",
        };
      case "create_sprint":
        return {
          kind: "add",
          entity: "sprint",
          title: op.name,
          meta: op.goal ?? undefined,
        };
      case "create_task": {
        const sprint = refLabel(op.sprintRef, ops, sprints);
        return {
          kind: "add",
          entity: "task",
          title: op.title,
          meta: [sprint ?? "Backlog", hours(op.estimateHours)]
            .filter(Boolean)
            .join(" · "),
        };
      }
      case "update_task": {
        const before = tasks.find((t) => t.id === op.taskId);
        const changes: Line["changes"] = [];
        if (op.title && op.title !== before?.title)
          changes.push({ field: "title", from: before?.title ?? "—", to: op.title });
        if (op.status && op.status !== before?.status)
          changes.push({
            field: "status",
            from: before ? TASK_STATUS_LABEL[before.status] : "—",
            to: TASK_STATUS_LABEL[op.status],
          });
        if (op.estimateHours != null && op.estimateHours !== before?.estimate_hours)
          changes.push({
            field: "estimate",
            from: hours(before?.estimate_hours),
            to: hours(op.estimateHours),
          });
        if (op.sprintRef !== undefined) {
          const from =
            sprints.find((s) => s.id === before?.sprint_id)?.name ?? "Backlog";
          const to = refLabel(op.sprintRef, ops, sprints) ?? "Backlog";
          if (from !== to) changes.push({ field: "sprint", from, to });
        }
        return {
          kind: "mod",
          entity: "task",
          title: before?.title ?? op.taskId,
          changes,
        };
      }
      case "update_requirement": {
        const before = requirements.find((r) => r.id === op.requirementId);
        const changes: Line["changes"] = [];
        if (op.title && op.title !== before?.title)
          changes.push({ field: "title", from: before?.title ?? "—", to: op.title });
        if (op.priority && op.priority !== before?.priority)
          changes.push({
            field: "priority",
            from: before?.priority ?? "—",
            to: op.priority,
          });
        if (op.status && op.status !== before?.status)
          changes.push({ field: "status", from: before?.status ?? "—", to: op.status });
        return {
          kind: "mod",
          entity: "requirement",
          title: before?.title ?? op.requirementId,
          changes,
        };
      }
      case "update_sprint": {
        const before = sprints.find((s) => s.id === op.sprintId);
        const changes: Line["changes"] = [];
        if (op.name && op.name !== before?.name)
          changes.push({ field: "name", from: before?.name ?? "—", to: op.name });
        if (op.status && op.status !== before?.status)
          changes.push({ field: "status", from: before?.status ?? "—", to: op.status });
        return {
          kind: "mod",
          entity: "sprint",
          title: before?.name ?? op.sprintId,
          changes,
        };
      }
      case "delete_task": {
        const before = tasks.find((t) => t.id === op.taskId);
        return {
          kind: "remove",
          entity: "task",
          title: before?.title ?? op.taskId,
        };
      }
    }
  });
}

export function DiffView({ ctx, dense = false }: { ctx: Ctx; dense?: boolean }) {
  const lines = toLines(ctx);
  if (lines.length === 0) {
    return <p className="px-3 py-4 text-[12.5px] text-ink-faint">No operations.</p>;
  }

  return (
    <ul className="stagger divide-y divide-line-soft font-mono text-[12.5px]">
      {lines.map((line, i) => (
        <li
          key={i}
          className={cn(
            "flex gap-2.5 px-3",
            dense ? "py-1.5" : "py-2",
            line.kind === "add" && "bg-add/[0.035]",
            line.kind === "mod" && "bg-mod/[0.035]",
            line.kind === "remove" && "bg-remove/[0.04]"
          )}
        >
          <span
            className={cn(
              "select-none pt-px font-semibold",
              line.kind === "add" && "text-add",
              line.kind === "mod" && "text-mod",
              line.kind === "remove" && "text-remove"
            )}
            aria-hidden
          >
            {MARK[line.kind]}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-[10.5px] uppercase tracking-wide text-ink-faint">
                {line.entity}
              </span>
              <span
                className={cn(
                  "font-sans text-[13px] text-ink",
                  line.kind === "remove" && "text-ink-dim line-through"
                )}
              >
                {line.title}
              </span>
            </div>

            {line.meta ? (
              <p className="mt-0.5 text-[11.5px] text-ink-faint">{line.meta}</p>
            ) : null}

            {line.changes?.length ? (
              <ul className="mt-1 space-y-0.5">
                {line.changes.map((c) => (
                  <li key={c.field} className="text-[11.5px] text-ink-faint">
                    <span className="text-ink-dim">{c.field}</span>{" "}
                    <span className="text-remove/80 line-through">{c.from}</span>
                    <span className="mx-1 text-ink-faint">→</span>
                    <span className="text-mod">{c.to}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {line.kind === "mod" && !line.changes?.length ? (
              <p className="mt-0.5 text-[11.5px] text-ink-faint">
                no effective change
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function diffCounts(ctx: Ctx) {
  const lines = toLines(ctx);
  return {
    add: lines.filter((l) => l.kind === "add").length,
    mod: lines.filter((l) => l.kind === "mod").length,
    remove: lines.filter((l) => l.kind === "remove").length,
  };
}
