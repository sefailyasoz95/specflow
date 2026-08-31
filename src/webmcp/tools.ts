"use client";

import type { ToolDescriptor } from "./registry";
import type {
  Op,
  Priority,
  RequirementStatus,
  SprintStatus,
  TaskStatus,
} from "@/lib/types";
import type { UiState, WorkspaceValue } from "@/store/workspace";

const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];
const STATUSES: TaskStatus[] = ["backlog", "todo", "in_progress", "done"];

const str = (description: string) => ({ type: "string", description });
const num = (description: string) => ({ type: "number", description });

/* ------------------------------------------------------------------ *
 * The contract with the agent
 *
 * Nothing an agent calls writes to the plan. Write tools author a
 * *change set* — a reviewable diff that lands in the human's panel.
 * `apply_pending_changes` then hands control to the human and blocks
 * until they approve or reject, so the agent learns the outcome the
 * same way a teammate would.
 * ------------------------------------------------------------------ */

export function buildProjectTools(ws: WorkspaceValue): ToolDescriptor[] {
  const {
    project,
    requirements,
    sprints,
    tasks,
    changeSets,
    ui,
    setUi,
    setHighlight,
    logAgent,
    proposeChangeSet,
    requestApproval,
    discardChangeSet,
    snapshotRef,
  } = ws;

  /* Freshest change sets, even if a tool fires before React re-renders. */
  const livePending = () =>
    snapshotRef.current.changeSets.filter((c) => c.status === "pending");

  const sprintName = (id: string | null) =>
    id ? sprints.find((s) => s.id === id)?.name ?? "—" : "Backlog";

  return [
    /* ---------------------------------------------------------- read */
    {
      name: "get_project_context",
      description:
        "Read the full state of the currently open SpecFlow project: requirements, sprints, tasks with estimates, pending change sets, and what the human is looking at right now (active view, selected sprint, filters). Call this before proposing anything so your plan fits what already exists.",
      annotations: { readOnlyHint: true },
      inputSchema: {
        type: "object",
        properties: {
          include: {
            type: "array",
            description:
              "Optional subsets to return. Defaults to everything.",
            items: {
              type: "string",
              enum: ["requirements", "sprints", "tasks", "proposals", "ui"],
            },
          },
        },
      },
      execute: (input) => {
        const include =
          (input.include as string[] | undefined) ?? [
            "requirements",
            "sprints",
            "tasks",
            "proposals",
            "ui",
          ];
        const totalEstimate = tasks.reduce(
          (sum, t) => sum + (t.estimate_hours ?? 0),
          0
        );

        const payload: Record<string, unknown> = {
          project: {
            id: project.id,
            name: project.name,
            description: project.description,
          },
          totals: {
            requirements: requirements.length,
            sprints: sprints.length,
            tasks: tasks.length,
            estimatedHours: totalEstimate,
            unestimatedTasks: tasks.filter((t) => t.estimate_hours == null).length,
          },
        };

        if (include.includes("requirements")) {
          payload.requirements = requirements.map((r) => ({
            id: r.id,
            code: r.code,
            title: r.title,
            description: r.description,
            priority: r.priority,
            status: r.status,
          }));
        }
        if (include.includes("sprints")) {
          payload.sprints = sprints.map((s) => ({
            id: s.id,
            name: s.name,
            goal: s.goal,
            status: s.status,
            taskCount: tasks.filter((t) => t.sprint_id === s.id).length,
            estimatedHours: tasks
              .filter((t) => t.sprint_id === s.id)
              .reduce((sum, t) => sum + (t.estimate_hours ?? 0), 0),
          }));
        }
        if (include.includes("tasks")) {
          payload.tasks = tasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status,
            estimateHours: t.estimate_hours,
            sprint: sprintName(t.sprint_id),
            sprintId: t.sprint_id,
            requirementId: t.requirement_id,
          }));
        }
        if (include.includes("proposals")) {
          payload.pendingChangeSets = changeSets
            .filter((c) => c.status === "pending")
            .map((c) => ({
              id: c.id,
              title: c.title,
              summary: c.summary,
              operationCount: c.operations.length,
            }));
        }
        if (include.includes("ui")) {
          payload.humanIsLookingAt = {
            view: ui.view,
            selectedSprint: sprintName(ui.activeSprintId),
            statusFilter: ui.statusFilter,
            openProposalId: ui.openProposalId,
          };
        }

        logAgent({
          tool: "get_project_context",
          kind: "read",
          detail: `read ${tasks.length} tasks, ${sprints.length} sprints`,
        });

        return JSON.stringify(payload, null, 2);
      },
    },

    /* ------------------------------------------------------- plan */
    {
      name: "propose_plan",
      description:
        "Turn rough requirements into a complete proposed project plan: requirements, sprints, and tasks with effort estimates, in one reviewable change set. Use `ref` strings to link a task to a sprint or requirement you are creating in the same call. This does NOT modify the project — it creates a diff the human reviews. Call apply_pending_changes afterwards to ask for approval.",
      inputSchema: {
        type: "object",
        properties: {
          title: str("Short name for this plan, e.g. 'Initial plan for checkout rework'"),
          summary: str("One or two sentences on the reasoning behind the plan."),
          requirements: {
            type: "array",
            description: "Requirements to create.",
            items: {
              type: "object",
              properties: {
                ref: str("Local id used to link tasks to this requirement, e.g. 'r1'"),
                title: str("What the system must do."),
                description: str("Detail, acceptance criteria."),
                priority: { type: "string", enum: PRIORITIES },
              },
              required: ["ref", "title"],
            },
          },
          sprints: {
            type: "array",
            description: "Sprints to create, in order.",
            items: {
              type: "object",
              properties: {
                ref: str("Local id used to place tasks in this sprint, e.g. 's1'"),
                name: str("Sprint name, e.g. 'Sprint 1 — Foundation'"),
                goal: str("The one outcome this sprint must deliver."),
              },
              required: ["ref", "name"],
            },
          },
          tasks: {
            type: "array",
            description: "Tasks to create.",
            items: {
              type: "object",
              properties: {
                title: str("Imperative, concrete, one deliverable."),
                description: str("Implementation notes."),
                sprintRef: str("`ref` of a sprint above, or omit for backlog."),
                requirementRef: str("`ref` of a requirement above."),
                estimateHours: num("Effort estimate in hours."),
                status: { type: "string", enum: STATUSES },
              },
              required: ["title"],
            },
          },
        },
        required: ["title", "tasks"],
      },
      execute: async (input) => {
        const title = String(input.title ?? "Proposed plan");
        const summary = String(input.summary ?? "");
        const reqs = (input.requirements ?? []) as Array<Record<string, unknown>>;
        const sprs = (input.sprints ?? []) as Array<Record<string, unknown>>;
        const tsks = (input.tasks ?? []) as Array<Record<string, unknown>>;

        const ops: Op[] = [
          ...reqs.map<Op>((r) => ({
            op: "create_requirement",
            tempId: String(r.ref),
            title: String(r.title),
            description: r.description ? String(r.description) : undefined,
            priority: (r.priority as Priority) ?? "medium",
          })),
          ...sprs.map<Op>((s) => ({
            op: "create_sprint",
            tempId: String(s.ref),
            name: String(s.name),
            goal: s.goal ? String(s.goal) : undefined,
          })),
          ...tsks.map<Op>((t) => ({
            op: "create_task",
            title: String(t.title),
            description: t.description ? String(t.description) : undefined,
            status: (t.status as TaskStatus) ?? "backlog",
            estimateHours:
              t.estimateHours != null ? Number(t.estimateHours) : undefined,
            sprintRef: t.sprintRef ? String(t.sprintRef) : null,
            requirementRef: t.requirementRef ? String(t.requirementRef) : null,
          })),
        ];

        if (ops.length === 0) {
          return "Nothing to propose — the plan contained no requirements, sprints or tasks.";
        }

        const cs = await proposeChangeSet(title, summary, ops);
        setUi({ view: "board", openProposalId: cs.id });
        logAgent({
          tool: "propose_plan",
          kind: "write",
          detail: `${reqs.length} requirements · ${sprs.length} sprints · ${tsks.length} tasks`,
        });

        return `Proposal "${title}" created with ${ops.length} operations (${reqs.length} requirements, ${sprs.length} sprints, ${tsks.length} tasks). It is now showing as a pending diff in the human's review panel. Nothing has been written to the project yet — call apply_pending_changes to ask them to approve it.`;
      },
    },

    /* ------------------------------------------------- granular edits */
    {
      name: "propose_changes",
      description:
        "Propose edits to things that already exist: retitle or re-estimate a task, move it between sprints, change its status, delete it, reprioritise a requirement, or mark a sprint active or done. Also accepts brand new tasks for an existing sprint. Everything lands in one reviewable change set. Call get_project_context first — these take real ids.",
      inputSchema: {
        type: "object",
        properties: {
          title: str("Short name for this change set, e.g. 'Re-cut sprint 2'"),
          summary: str("Why these changes."),
          createTasks: {
            type: "array",
            description: "New tasks for sprints that already exist.",
            items: {
              type: "object",
              properties: {
                title: str("Task title."),
                description: str("Implementation notes."),
                sprintId: str("Existing sprint id, or omit for backlog."),
                requirementId: str("Existing requirement id."),
                estimateHours: num("Effort estimate in hours."),
                status: { type: "string", enum: STATUSES },
              },
              required: ["title"],
            },
          },
          updateTasks: {
            type: "array",
            description: "Edits to existing tasks.",
            items: {
              type: "object",
              properties: {
                taskId: str("Existing task id from get_project_context."),
                title: str("New title."),
                description: str("New description."),
                status: { type: "string", enum: STATUSES },
                estimateHours: num("New estimate in hours."),
                sprintId: str(
                  "Move to this sprint id. Pass an empty string to move it to the backlog."
                ),
              },
              required: ["taskId"],
            },
          },
          deleteTasks: {
            type: "array",
            description: "Ids of tasks to delete.",
            items: { type: "string" },
          },
          updateRequirements: {
            type: "array",
            description: "Edits to existing requirements.",
            items: {
              type: "object",
              properties: {
                requirementId: str("Existing requirement id."),
                title: str("New title."),
                description: str("New description."),
                priority: { type: "string", enum: PRIORITIES },
                status: {
                  type: "string",
                  enum: ["draft", "approved", "implemented"],
                },
              },
              required: ["requirementId"],
            },
          },
          updateSprints: {
            type: "array",
            description: "Edits to existing sprints.",
            items: {
              type: "object",
              properties: {
                sprintId: str("Existing sprint id."),
                name: str("New name."),
                goal: str("New goal."),
                status: { type: "string", enum: ["planned", "active", "done"] },
              },
              required: ["sprintId"],
            },
          },
        },
        required: ["title"],
      },
      execute: async (input) => {
        const creates = (input.createTasks ?? []) as Array<Record<string, unknown>>;
        const updates = (input.updateTasks ?? []) as Array<Record<string, unknown>>;
        const removes = (input.deleteTasks ?? []) as string[];
        const reqUpdates = (input.updateRequirements ?? []) as Array<
          Record<string, unknown>
        >;
        const sprintUpdates = (input.updateSprints ?? []) as Array<
          Record<string, unknown>
        >;

        // Catch hallucinated ids here, where the agent can still recover,
        // rather than half way through applying a change set.
        const unknown: string[] = [];
        const taskIds = new Set(tasks.map((t) => t.id));
        const reqIds = new Set(requirements.map((r) => r.id));
        const sprintIds = new Set(sprints.map((s) => s.id));

        for (const id of [...updates.map((u) => String(u.taskId)), ...removes]) {
          if (!taskIds.has(id)) unknown.push(`task ${id}`);
        }
        for (const u of reqUpdates) {
          if (!reqIds.has(String(u.requirementId)))
            unknown.push(`requirement ${String(u.requirementId)}`);
        }
        for (const u of sprintUpdates) {
          if (!sprintIds.has(String(u.sprintId)))
            unknown.push(`sprint ${String(u.sprintId)}`);
        }
        for (const c of creates) {
          if (c.sprintId && !sprintIds.has(String(c.sprintId)))
            unknown.push(`sprint ${String(c.sprintId)}`);
        }
        if (unknown.length) {
          return `Error: these ids do not exist in this project: ${unknown.join(
            ", "
          )}. Call get_project_context to get current ids. Nothing was proposed.`;
        }

        const ops: Op[] = [
          ...creates.map<Op>((c) => ({
            op: "create_task",
            title: String(c.title),
            description: c.description ? String(c.description) : undefined,
            status: (c.status as TaskStatus) ?? "backlog",
            estimateHours:
              c.estimateHours != null ? Number(c.estimateHours) : undefined,
            sprintRef: c.sprintId ? String(c.sprintId) : null,
            requirementRef: c.requirementId ? String(c.requirementId) : null,
          })),
          ...updates.map<Op>((u) => ({
            op: "update_task",
            taskId: String(u.taskId),
            title: u.title ? String(u.title) : undefined,
            description: u.description ? String(u.description) : undefined,
            status: u.status as TaskStatus | undefined,
            estimateHours:
              u.estimateHours != null ? Number(u.estimateHours) : undefined,
            sprintRef:
              u.sprintId === undefined ? undefined : String(u.sprintId) || null,
          })),
          ...reqUpdates.map<Op>((u) => ({
            op: "update_requirement",
            requirementId: String(u.requirementId),
            title: u.title ? String(u.title) : undefined,
            description: u.description ? String(u.description) : undefined,
            priority: u.priority as Priority | undefined,
            status: u.status as RequirementStatus | undefined,
          })),
          ...sprintUpdates.map<Op>((u) => ({
            op: "update_sprint",
            sprintId: String(u.sprintId),
            name: u.name ? String(u.name) : undefined,
            goal: u.goal ? String(u.goal) : undefined,
            status: u.status as SprintStatus | undefined,
          })),
          ...removes.map<Op>((id) => ({ op: "delete_task", taskId: id })),
        ];

        if (ops.length === 0) return "Nothing to propose — no changes were given.";

        const cs = await proposeChangeSet(
          String(input.title ?? "Changes"),
          String(input.summary ?? ""),
          ops
        );
        setUi({ openProposalId: cs.id });
        logAgent({
          tool: "propose_changes",
          kind: "write",
          detail: `+${creates.length} ~${
            updates.length + reqUpdates.length + sprintUpdates.length
          } -${removes.length}`,
        });

        return `Proposal "${cs.title}" created with ${ops.length} operations, pending human review. Call apply_pending_changes to ask them to approve it.`;
      },
    },

    /* -------------------------------------------------- human handoff */
    {
      name: "apply_pending_changes",
      description:
        "Ask the human to approve the pending change set. This opens the diff in their review panel and WAITS for them to click Approve or Reject. Returns what they decided. This is the only way changes reach the project — you cannot write to the plan yourself.",
      inputSchema: {
        type: "object",
        properties: {
          changeSetId: str(
            "Id of the change set to apply. Omit to use the most recent pending one."
          ),
          note: str("A short line shown to the human next to the Approve button."),
        },
      },
      execute: async (input, options) => {
        const pending = livePending();
        if (pending.length === 0) {
          return "There is no pending change set to apply. Create one with propose_plan or propose_changes first.";
        }
        const target = input.changeSetId
          ? pending.find((c) => c.id === input.changeSetId)
          : pending[0];
        if (!target) {
          return `Error: no pending change set with id ${String(input.changeSetId)}.`;
        }

        setUi({ openProposalId: target.id });
        setHighlight({ kind: "changeset", id: target.id });
        logAgent({
          tool: "apply_pending_changes",
          kind: "control",
          detail: `awaiting human review of "${target.title}"`,
        });

        const outcome = await requestApproval(
          target.id,
          input.note ? String(input.note) : null,
          options?.signal
        );

        if (outcome.decision === "approved") {
          logAgent({
            tool: "apply_pending_changes",
            kind: "control",
            detail: `approved — ${outcome.applied} operations applied`,
          });
          return `Approved by the human. ${outcome.applied} operations were applied to "${project.name}". The plan on screen is now up to date — call get_project_context if you need the new ids.`;
        }
        if (outcome.decision === "rejected") {
          logAgent({
            tool: "apply_pending_changes",
            kind: "control",
            detail: "rejected by human",
          });
          return `Rejected by the human${
            outcome.reason ? `: "${outcome.reason}"` : ""
          }. Nothing was applied. Ask them what to change before proposing again.`;
        }
        return "The human did not respond in time. The change set is still pending in their review panel.";
      },
    },

    {
      name: "discard_pending_changes",
      description:
        "Withdraw a pending change set you authored — use it when the human tells you the proposal is wrong and you want to start over rather than have it sit in their panel.",
      annotations: { destructiveHint: true },
      inputSchema: {
        type: "object",
        properties: {
          changeSetId: str("Id to discard. Omit for the most recent pending one."),
        },
      },
      execute: async (input) => {
        const pending = livePending();
        const target = input.changeSetId
          ? pending.find((c) => c.id === input.changeSetId)
          : pending[0];
        if (!target) return "There is no pending change set to discard.";
        await discardChangeSet(target.id);
        logAgent({
          tool: "discard_pending_changes",
          kind: "control",
          detail: `withdrew "${target.title}"`,
        });
        return `Withdrew the proposal "${target.title}".`;
      },
    },

    /* ------------------------------------------------------- pointing */
    {
      name: "focus",
      description:
        "Move the human's view and point at something while you talk about it — switch between the board, requirements and sprints, select a sprint, filter by status, or draw a highlight ring around one task, requirement or sprint. Use it so they are looking at the thing you are describing.",
      annotations: { readOnlyHint: true, idempotentHint: true },
      inputSchema: {
        type: "object",
        properties: {
          view: {
            type: "string",
            enum: ["board", "requirements", "sprints"],
            description: "Which view to open.",
          },
          sprintId: str("Select this sprint on the board."),
          statusFilter: {
            type: "string",
            enum: [...STATUSES, "all"],
            description: "Filter the board to one task status.",
          },
          highlight: {
            type: "object",
            description: "Draw a ring around one item for a few seconds.",
            properties: {
              kind: { type: "string", enum: ["task", "sprint", "requirement"] },
              id: str("Id of the item to highlight."),
            },
            required: ["kind", "id"],
          },
        },
      },
      execute: (input) => {
        const patch: Partial<UiState> = {};
        if (input.view) patch.view = input.view as UiState["view"];
        if (input.sprintId !== undefined)
          patch.activeSprintId = input.sprintId ? String(input.sprintId) : null;
        if (input.statusFilter)
          patch.statusFilter = input.statusFilter as UiState["statusFilter"];
        if (Object.keys(patch).length) setUi(patch);

        const hl = input.highlight as { kind: string; id: string } | undefined;
        if (hl?.id) {
          setHighlight({
            kind: hl.kind as "task" | "sprint" | "requirement",
            id: hl.id,
          });
        }

        const what = [
          input.view ? `view=${input.view}` : null,
          input.sprintId !== undefined ? `sprint` : null,
          input.statusFilter ? `filter=${input.statusFilter}` : null,
          hl ? `highlight ${hl.kind}` : null,
        ]
          .filter(Boolean)
          .join(", ");

        logAgent({ tool: "focus", kind: "control", detail: what || "no-op" });
        return `The human's screen now shows: ${what || "no change requested"}.`;
      },
    },
  ];
}
