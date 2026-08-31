import type { Op, Requirement, Sprint, Task } from "./types";

type Bag = {
  requirements: Requirement[];
  sprints: Sprint[];
  tasks: Task[];
};

/**
 * The same semantics as apply_change_set() in Postgres, in memory.
 * Used by the offline preview surface so the review flow can be designed
 * and demoed without a database.
 */
export function applyOpsLocally(
  projectId: string,
  bag: Bag,
  ops: Op[]
): { next: Bag; applied: number } {
  const requirements = [...bag.requirements];
  const sprints = [...bag.sprints];
  const tasks = [...bag.tasks];
  const refs = new Map<string, string>();
  const now = new Date().toISOString();
  const id = () => crypto.randomUUID();
  const resolve = (key?: string | null) =>
    key ? refs.get(key) ?? key : null;

  for (const op of ops) {
    switch (op.op) {
      case "create_requirement": {
        const rid = id();
        requirements.push({
          id: rid,
          project_id: projectId,
          code: `REQ-${String(requirements.length + 1).padStart(3, "0")}`,
          title: op.title,
          description: op.description ?? null,
          priority: op.priority ?? "medium",
          status: "draft",
          position: requirements.length + 1,
          created_at: now,
        });
        if (op.tempId) refs.set(op.tempId, rid);
        break;
      }
      case "create_sprint": {
        const sid = id();
        sprints.push({
          id: sid,
          project_id: projectId,
          name: op.name,
          goal: op.goal ?? null,
          position: sprints.length + 1,
          status: op.status ?? "planned",
          start_date: op.startDate ?? null,
          end_date: op.endDate ?? null,
          created_at: now,
        });
        if (op.tempId) refs.set(op.tempId, sid);
        break;
      }
      case "create_task": {
        const tid = id();
        tasks.push({
          id: tid,
          project_id: projectId,
          sprint_id: resolve(op.sprintRef),
          requirement_id: resolve(op.requirementRef),
          title: op.title,
          description: op.description ?? null,
          status: op.status ?? "backlog",
          estimate_hours: op.estimateHours ?? null,
          position: tasks.length + 1,
          created_at: now,
        });
        if (op.tempId) refs.set(op.tempId, tid);
        break;
      }
      case "update_task": {
        const i = tasks.findIndex((t) => t.id === resolve(op.taskId));
        if (i >= 0) {
          tasks[i] = {
            ...tasks[i],
            title: op.title ?? tasks[i].title,
            description: op.description ?? tasks[i].description,
            status: op.status ?? tasks[i].status,
            estimate_hours: op.estimateHours ?? tasks[i].estimate_hours,
            sprint_id:
              op.sprintRef === undefined
                ? tasks[i].sprint_id
                : resolve(op.sprintRef),
          };
        }
        break;
      }
      case "update_requirement": {
        const i = requirements.findIndex(
          (r) => r.id === resolve(op.requirementId)
        );
        if (i >= 0) {
          requirements[i] = {
            ...requirements[i],
            title: op.title ?? requirements[i].title,
            description: op.description ?? requirements[i].description,
            priority: op.priority ?? requirements[i].priority,
            status: op.status ?? requirements[i].status,
          };
        }
        break;
      }
      case "update_sprint": {
        const i = sprints.findIndex((s) => s.id === resolve(op.sprintId));
        if (i >= 0) {
          sprints[i] = {
            ...sprints[i],
            name: op.name ?? sprints[i].name,
            goal: op.goal ?? sprints[i].goal,
            status: op.status ?? sprints[i].status,
            start_date: op.startDate ?? sprints[i].start_date,
            end_date: op.endDate ?? sprints[i].end_date,
          };
        }
        break;
      }
      case "delete_task": {
        const rid = resolve(op.taskId);
        const i = tasks.findIndex((t) => t.id === rid);
        if (i >= 0) tasks.splice(i, 1);
        break;
      }
    }
  }

  return { next: { requirements, sprints, tasks }, applied: ops.length };
}
