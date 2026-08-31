import { hours } from "@/lib/utils";
import type { Op, Requirement, Sprint, Task } from "@/lib/types";
import { TASK_STATUS_LABEL } from "@/lib/types";

export type Ctx = {
  tasks: Task[];
  sprints: Sprint[];
  requirements: Requirement[];
  operations: Op[];
};

export type Line = {
  kind: "add" | "mod" | "remove";
  entity: string;
  title: string;
  meta?: string;
  changes?: { field: string; from: string; to: string }[];
};

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
          meta: `${op.priority ?? "medium"} priority`,
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
        if (op.goal && op.goal !== before?.goal)
          changes.push({
            field: "goal",
            from: before?.goal ?? "—",
            to: op.goal,
          });
        if (op.status && op.status !== before?.status)
          changes.push({ field: "status", from: before?.status ?? "—", to: op.status });
        if (op.startDate && op.startDate !== before?.start_date)
          changes.push({
            field: "starts",
            from: before?.start_date ?? "—",
            to: op.startDate,
          });
        if (op.endDate && op.endDate !== before?.end_date)
          changes.push({
            field: "ends",
            from: before?.end_date ?? "—",
            to: op.endDate,
          });
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

export function patchCounts(ctx: Ctx) {
  const lines = toLines(ctx);
  return {
    add: lines.filter((l) => l.kind === "add").length,
    mod: lines.filter((l) => l.kind === "mod").length,
    remove: lines.filter((l) => l.kind === "remove").length,
  };
}
