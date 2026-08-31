"use client";

import { useState } from "react";
import { useWorkspace } from "@/store/workspace";
import { Button, Empty, Eyebrow, Fact, Input } from "./ui/primitives";
import { cn, hours } from "@/lib/utils";
import { Pencil } from "lucide-react";
import { SprintEditor, TaskEditor } from "./editors";
import {
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  type Sprint,
  type Task,
  type TaskStatus,
} from "@/lib/types";

/* ---------------------------------------------------------------- board */

export function Board() {
  const ws = useWorkspace();
  const { tasks, sprints, requirements, ui, setUi, highlight, updateTaskDirect, createTaskDirect } = ws;
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const [draft, setDraft] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

  const visible = tasks.filter((t) => {
    if (ui.activeSprintId === "__backlog__") return t.sprint_id === null;
    if (ui.activeSprintId && t.sprint_id !== ui.activeSprintId) return false;
    if (ui.statusFilter !== "all" && t.status !== ui.statusFilter) return false;
    return true;
  });

  const sprint = sprints.find((s) => s.id === ui.activeSprintId);
  const estimated = visible.reduce((s, t) => s + (t.estimate_hours ?? 0), 0);
  const unestimated = visible.filter((t) => t.estimate_hours == null).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-end gap-5 pb-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <h2 className="display text-[26px] text-fg">
              {sprint?.name ??
                (ui.activeSprintId === "__backlog__" ? "Backlog" : "All work")}
            </h2>

            {/* An agent can set this filter through `focus`. A filter the
                human cannot see is a board that looks broken, so it is
                always visible and always one click from gone. */}
            {ui.statusFilter !== "all" ? (
              <button
                onClick={() => setUi({ statusFilter: "all" })}
                className="press group inline-flex items-center gap-1.5 rounded-full
                           bg-ink-800 py-1 pl-2.5 pr-2 text-[12px] text-fg-mid
                           hover:bg-ink-700 hover:text-fg"
              >
                <span className="size-[5px] rounded-full bg-waiting" />
                {TASK_STATUS_LABEL[ui.statusFilter]} only
                <span
                  aria-hidden
                  className="font-mono text-[13px] leading-none text-fg-dim group-hover:text-fg"
                >
                  ×
                </span>
                <span className="sr-only">Clear the status filter</span>
              </button>
            ) : null}

            {sprint ? (
              <button
                onClick={() => setEditingSprint(sprint)}
                className="press rounded-lg px-2 py-1 text-[12.5px] text-fg-dim hover:bg-ink-800 hover:text-fg"
              >
                Edit sprint
              </button>
            ) : null}
          </div>

          {sprint?.goal ? (
            <p className="mt-1.5 max-w-[52ch] text-[13.5px] leading-relaxed text-fg-mid">
              {sprint.goal}
            </p>
          ) : null}
        </div>

        <dl className="ml-auto flex shrink-0 items-end gap-6">
          <div className="text-right">
            <dd className="font-mono text-[19px] tabular-nums text-fg">
              {visible.length}
            </dd>
            <dt className="eyebrow mt-0.5 text-fg-dim">tasks</dt>
          </div>
          <div className="text-right">
            <dd className="font-mono text-[19px] tabular-nums text-fg">
              {hours(estimated)}
            </dd>
            <dt className="eyebrow mt-0.5 text-fg-dim">estimated</dt>
          </div>
          {unestimated > 0 ? (
            <div className="text-right">
              <dd className="font-mono text-[19px] tabular-nums text-waiting">
                {unestimated}
              </dd>
              <dt className="eyebrow mt-0.5 text-fg-dim">unsized</dt>
            </div>
          ) : null}
        </dl>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-x-5 gap-y-6 overflow-y-auto pb-3 sm:grid-cols-2 xl:grid-cols-4">
        {TASK_STATUSES.map((status) => {
          const col = visible.filter((t) => t.status === status);
          return (
            <section
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(status);
              }}
              onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
              onDrop={async () => {
                setOverCol(null);
                if (dragId) await updateTaskDirect(dragId, { status });
                setDragId(null);
              }}
              className={cn(
                "flex min-h-32 flex-col rounded-xl transition-colors duration-150",
                overCol === status ? "bg-ink-850" : "bg-transparent"
              )}
            >
              <header className="mb-2.5 flex items-baseline gap-2 border-b border-ink-hair px-1 pb-2">
                <span className="text-[12.5px] font-medium text-fg-mid">
                  {TASK_STATUS_LABEL[status]}
                </span>
                <Fact className="ml-auto">{col.length}</Fact>
              </header>

              <ul className="stagger space-y-1.5">
                {col.map((t) => {
                  const pointedAt =
                    highlight?.kind === "task" && highlight.id === t.id;
                  const req = requirements.find((r) => r.id === t.requirement_id);
                  return (
                    <li
                      key={t.id}
                      draggable
                      role="button"
                      tabIndex={0}
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => setEditingTask(t)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setEditingTask(t);
                        }
                      }}
                      className={cn(
                        "lift press cursor-grab rounded-lg bg-ink-800 px-3 py-2.5 active:cursor-grabbing",
                        pointedAt && "pointed-at",
                        dragId === t.id && "opacity-40"
                      )}
                    >
                      <p className="text-[13.5px] leading-[1.35] text-fg">
                        {t.title}
                      </p>
                      <div className="mt-2 flex items-baseline gap-2.5">
                        {req ? <Fact>{req.code}</Fact> : null}
                        <Fact
                          className={cn(
                            "ml-auto",
                            t.estimate_hours == null && "text-waiting/70"
                          )}
                        >
                          {t.estimate_hours == null ? "unsized" : hours(t.estimate_hours)}
                        </Fact>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {col.length === 0 ? (
                <p className="px-1 py-2 font-mono text-[12px] text-fg-dim/50">—</p>
              ) : null}

            </section>
          );
        })}
      </div>

      <form
        className="flex gap-2 border-t border-ink-hair pt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          const title = draft.trim();
          setDraft("");
          await createTaskDirect({
            title,
            sprint_id:
              ui.activeSprintId && ui.activeSprintId !== "__backlog__"
                ? ui.activeSprintId
                : null,
          });
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a task yourself…"
        />
        <Button type="submit" disabled={!draft.trim()}>
          Add
        </Button>
      </form>

      {editingTask ? (
        <TaskEditor
          key={editingTask.id}
          task={tasks.find((t) => t.id === editingTask.id) ?? editingTask}
          onClose={() => setEditingTask(null)}
        />
      ) : null}
      {editingSprint ? (
        <SprintEditor
          key={editingSprint.id}
          sprint={sprints.find((s) => s.id === editingSprint.id) ?? editingSprint}
          onClose={() => setEditingSprint(null)}
        />
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------- requirements */

const PRIORITY_STYLE = {
  low: "text-fg-dim",
  medium: "text-fg-mid",
  high: "text-waiting",
  critical: "text-rose-400",
} as const;

export function RequirementsView() {
  const { requirements, tasks, highlight, createRequirementDirect } = useWorkspace();
  const [draft, setDraft] = useState("");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="pb-5">
        <h2 className="display text-[26px] text-fg">Requirements</h2>
        <p className="mt-1.5 text-[13.5px] text-fg-mid">
          What the system has to do, before anyone argues about how.
        </p>
      </header>

      {requirements.length === 0 ? (
        <Empty
          title="Nothing captured yet"
          hint="Paste a rough brief to your agent and let it propose the structure."
        />
      ) : (
        <ul className="stagger min-h-0 flex-1 overflow-y-auto pb-3">
          {requirements.map((r) => {
            const linked = tasks.filter((t) => t.requirement_id === r.id);
            const done = linked.filter((t) => t.status === "done").length;
            const pointedAt =
              highlight?.kind === "requirement" && highlight.id === r.id;
            return (
              <li
                key={r.id}
                className={cn(
                  "lift grid grid-cols-[4.5rem_1fr_auto] items-baseline gap-x-4 rounded-lg border-b border-ink-hair px-2 py-3.5 last:border-0",
                  pointedAt && "pointed-at"
                )}
              >
                <Fact className="pt-0.5">{r.code}</Fact>

                <div className="min-w-0">
                  <p className="text-[14.5px] leading-snug text-fg">{r.title}</p>
                  {r.description ? (
                    <p className="mt-1 max-w-[62ch] text-[12.5px] leading-relaxed text-fg-dim">
                      {r.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-baseline gap-4">
                  <span
                    className={cn(
                      "font-mono text-[11px]",
                      PRIORITY_STYLE[r.priority]
                    )}
                  >
                    {r.priority}
                  </span>
                  <Fact className="w-12 text-right">
                    {linked.length ? `${done}/${linked.length}` : "—"}
                  </Fact>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form
        className="flex gap-2 border-t border-ink-hair pt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          const title = draft.trim();
          setDraft("");
          await createRequirementDirect(title);
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="The system must…"
        />
        <Button type="submit" disabled={!draft.trim()}>
          Add
        </Button>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------- sprints */

export function SprintsView() {
  const { sprints, tasks, highlight, setUi, createSprintDirect } = useWorkspace();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<Sprint | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="pb-5">
        <h2 className="display text-[26px] text-fg">Sprints</h2>
        <p className="mt-1.5 text-[13.5px] text-fg-mid">
          The sequence. Where the argument about order actually lives.
        </p>
      </header>

      {sprints.length === 0 ? (
        <Empty
          title="No sprints yet"
          hint="Ask your agent to shape the work into a sequence."
        />
      ) : (
        <ul className="stagger min-h-0 flex-1 space-y-1 overflow-y-auto pb-3">
          {sprints.map((s) => {
            const inSprint = tasks.filter((t) => t.sprint_id === s.id);
            const done = inSprint.filter((t) => t.status === "done").length;
            const est = inSprint.reduce((sum, t) => sum + (t.estimate_hours ?? 0), 0);
            const pointedAt = highlight?.kind === "sprint" && highlight.id === s.id;
            const pct = inSprint.length ? (done / inSprint.length) * 100 : 0;

            return (
              <li key={s.id} className="group/sprint relative">
                <button
                  onClick={() => setUi({ view: "board", activeSprintId: s.id })}
                  className={cn(
                    "press lift w-full rounded-xl px-3 py-3.5 pr-12 text-left",
                    pointedAt && "pointed-at"
                  )}
                >
                  <div className="flex items-baseline gap-3">
                    <h3 className="display text-[18px] text-fg">{s.name}</h3>
                    {s.status === "active" ? (
                      <span className="eyebrow text-waiting">active</span>
                    ) : (
                      <span className="eyebrow text-fg-dim">{s.status}</span>
                    )}
                    <Fact tone="mid" className="ml-auto">
                      {done}/{inSprint.length} · {hours(est)}
                    </Fact>
                  </div>

                  {s.goal ? (
                    <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-fg-mid">
                      {s.goal}
                    </p>
                  ) : null}

                  <div className="mt-3 h-px w-full bg-ink-line">
                    <div
                      className="h-px bg-fg-mid transition-[width] duration-300 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>

                <button
                  onClick={() => setEditing(s)}
                  aria-label={`Edit ${s.name}`}
                  className="press absolute right-3 top-3 rounded-lg p-2 text-fg-dim opacity-0
                             transition-opacity duration-150 hover:bg-ink-700 hover:text-fg
                             focus-visible:opacity-100 group-hover/sprint:opacity-100"
                >
                  <Pencil className="size-3.5" strokeWidth={2} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form
        className="flex gap-2 border-t border-ink-hair pt-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          const name = draft.trim();
          setDraft("");
          await createSprintDirect(name);
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Sprint name…"
        />
        <Button type="submit" disabled={!draft.trim()}>
          Add
        </Button>
      </form>

      {editing ? (
        <SprintEditor
          key={editing.id}
          sprint={sprints.find((s) => s.id === editing.id) ?? editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

export { Eyebrow };
