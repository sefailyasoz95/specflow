// ---------------------------------------------------------------- domain

export type Priority = "low" | "medium" | "high" | "critical";
export type RequirementStatus = "draft" | "approved" | "implemented";
export type SprintStatus = "planned" | "active" | "done";
export type TaskStatus = "backlog" | "todo" | "in_progress" | "done";
export type ChangeSetStatus = "pending" | "applied" | "discarded";

export const TASK_STATUSES: TaskStatus[] = ["backlog", "todo", "in_progress", "done"];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export type Project = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type Requirement = {
  id: string;
  project_id: string;
  code: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: RequirementStatus;
  position: number;
  created_at: string;
};

export type Sprint = {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  position: number;
  status: SprintStatus;
  created_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  sprint_id: string | null;
  requirement_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  estimate_hours: number | null;
  position: number;
  created_at: string;
};

// ------------------------------------------------------- change set ops

export type Op =
  | {
      op: "create_requirement";
      tempId?: string;
      title: string;
      description?: string;
      priority?: Priority;
    }
  | {
      op: "create_sprint";
      tempId?: string;
      name: string;
      goal?: string;
      status?: SprintStatus;
    }
  | {
      op: "create_task";
      tempId?: string;
      title: string;
      description?: string;
      status?: TaskStatus;
      estimateHours?: number;
      sprintRef?: string | null;
      requirementRef?: string | null;
    }
  | {
      op: "update_task";
      taskId: string;
      title?: string;
      description?: string;
      status?: TaskStatus;
      estimateHours?: number;
      sprintRef?: string | null;
      requirementRef?: string | null;
    }
  | {
      op: "update_requirement";
      requirementId: string;
      title?: string;
      description?: string;
      priority?: Priority;
      status?: RequirementStatus;
    }
  | {
      op: "update_sprint";
      sprintId: string;
      name?: string;
      goal?: string;
      status?: SprintStatus;
    }
  | { op: "delete_task"; taskId: string };

export type ChangeSet = {
  id: string;
  project_id: string;
  title: string;
  summary: string | null;
  source: "agent" | "human";
  status: ChangeSetStatus;
  operations: Op[];
  created_at: string;
  resolved_at: string | null;
};

// ------------------------------------------------------------- database

type Row<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      projects: Row<Project>;
      requirements: Row<Requirement>;
      sprints: Row<Sprint>;
      tasks: Row<Task>;
      change_sets: Row<ChangeSet>;
    };
    Views: Record<never, never>;
    Functions: {
      apply_change_set: {
        Args: { p_change_set_id: string };
        Returns: { applied: number; refs: Record<string, string> };
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
