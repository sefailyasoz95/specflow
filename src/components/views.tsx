"use client";

import { useState } from "react";
import { useWorkspace } from "@/store/workspace";
import { Badge, Button, Empty, Input } from "./ui/primitives";
import { cn, hours } from "@/lib/utils";
import { TASK_STATUSES, TASK_STATUS_LABEL, type TaskStatus } from "@/lib/types";

/* ------------------------------------------------------------------ board */

export function Board() {
  const ws = useWorkspace();
  const { tasks, sprints, ui, highlight, updateTaskDirect, createTaskDirect } = ws;
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const [draft, setDraft] = useState("");

  const visible = tasks.filter((t) => {
    if (ui.activeSprintId === "__backlog__") return t.sprint_id === null;
    if (ui.activeSprintId && t.sprint_id !== ui.activeSprintId) return false;
    if (ui.statusFilter !== "all" && t.status !== ui.statusFilter) return false;
    return true;
  });

  const activeSprint = sprints.find((s) => s.id === ui.activeSprintId);
  const totalHours = visible.reduce((s, t) => s + (t.estimate_hours ?? 0), 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 px-1 pb-3">
        <div>
          <h2 className="text-[15px] font-medium text-ink">
            {activeSprint?.name ??
              (ui.activeSprintId === "__backlog__" ? "Backlog" : "All work")}
          </h2>
          {activeSprint?.goal ? (
            <p className="mt-0.5 text-[12.5px] text-ink-faint">{activeSprint.goal}</p>
          ) : null}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge tone="muted">{visible.length} tasks</Badge>
          <Badge tone="muted">{hours(totalHours)}</Badge>
        </div>
      </div>

      <form
        className="flex gap-2 px-1 pb-3"
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

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto pb-2 sm:grid-cols-2 xl:grid-cols-4">
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
                "flex min-h-40 flex-col rounded-xl border bg-surface/60 p-2 transition-colors duration-150",
                overCol === status
                  ? "border-agent/50 bg-agent/[0.04]"
                  : "border-line"
              )}
            >
              <header className="flex items-center gap-2 px-1.5 pb-2">
                <span className="text-[12px] font-medium text-ink-dim">
                  {TASK_STATUS_LABEL[status]}
                </span>
                <span className="font-mono text-[11px] text-ink-faint">
                  {col.length}
                </span>
              </header>

              <ul className="stagger space-y-1.5">
                {col.map((t) => {
                  const ringed = highlight?.kind === "task" && highlight.id === t.id;
                  return (
                    <li
                      key={t.id}
                      draggable
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                      className={cn(
                        "hover-lift press cursor-grab rounded-lg border bg-raised px-2.5 py-2 active:cursor-grabbing",
                        ringed ? "border-agent sf-highlight" : "border-line",
                        dragId === t.id && "opacity-50"
                      )}
                    >
                      <p className="text-[13px] leading-snug text-ink">{t.title}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {t.estimate_hours != null ? (
                          <Badge tone="muted">{hours(t.estimate_hours)}</Badge>
                        ) : (
                          <Badge tone="muted">no estimate</Badge>
                        )}
                        {ui.activeSprintId === null && t.sprint_id ? (
                          <span className="truncate text-[11px] text-ink-faint">
                            {sprints.find((s) => s.id === t.sprint_id)?.name}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {col.length === 0 ? (
                <p className="px-1.5 py-3 text-[12px] text-ink-faint">—</p>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- requirements */

const PRIORITY_TONE = {
  low: "muted",
  medium: "neutral",
  high: "mod",
  critical: "remove",
} as const;

export function RequirementsView() {
  const { requirements, tasks, highlight, createRequirementDirect } = useWorkspace();
  const [draft, setDraft] = useState("");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h2 className="px-1 pb-3 text-[15px] font-medium text-ink">Requirements</h2>

      <form
        className="flex gap-2 px-1 pb-3"
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

      {requirements.length === 0 ? (
        <Empty
          title="No requirements captured"
          hint="Paste a rough brief to your agent and let it propose the structure."
        />
      ) : (
        <ul className="stagger min-h-0 flex-1 space-y-1.5 overflow-y-auto pb-2">
          {requirements.map((r) => {
            const linked = tasks.filter((t) => t.requirement_id === r.id);
            const ringed =
              highlight?.kind === "requirement" && highlight.id === r.id;
            return (
              <li
                key={r.id}
                className={cn(
                  "hover-lift rounded-xl border bg-surface px-3 py-2.5",
                  ringed ? "border-agent sf-highlight" : "border-line"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-ink-faint">
                    {r.code}
                  </span>
                  <Badge tone={PRIORITY_TONE[r.priority]}>{r.priority}</Badge>
                  <span className="ml-auto font-mono text-[11px] text-ink-faint">
                    {linked.length} tasks
                  </span>
                </div>
                <p className="mt-1 text-[13.5px] text-ink">{r.title}</p>
                {r.description ? (
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-faint">
                    {r.description}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- sprints */

export function SprintsView() {
  const { sprints, tasks, highlight, setUi, createSprintDirect } = useWorkspace();
  const [draft, setDraft] = useState("");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h2 className="px-1 pb-3 text-[15px] font-medium text-ink">Sprints</h2>

      <form
        className="flex gap-2 px-1 pb-3"
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

      {sprints.length === 0 ? (
        <Empty title="No sprints yet" hint="Ask the agent to shape the plan into sprints." />
      ) : (
        <ul className="stagger min-h-0 flex-1 space-y-1.5 overflow-y-auto pb-2">
          {sprints.map((s) => {
            const inSprint = tasks.filter((t) => t.sprint_id === s.id);
            const done = inSprint.filter((t) => t.status === "done").length;
            const est = inSprint.reduce((sum, t) => sum + (t.estimate_hours ?? 0), 0);
            const ringed = highlight?.kind === "sprint" && highlight.id === s.id;
            const pct = inSprint.length ? (done / inSprint.length) * 100 : 0;

            return (
              <li key={s.id}>
                <button
                  onClick={() => setUi({ view: "board", activeSprintId: s.id })}
                  className={cn(
                    "press hover-lift w-full rounded-xl border bg-surface px-3 py-2.5 text-left",
                    ringed ? "border-agent sf-highlight" : "border-line"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-medium text-ink">{s.name}</span>
                    <Badge tone={s.status === "active" ? "add" : "muted"}>
                      {s.status}
                    </Badge>
                    <span className="ml-auto font-mono text-[11px] text-ink-faint">
                      {done}/{inSprint.length} · {hours(est)}
                    </span>
                  </div>
                  {s.goal ? (
                    <p className="mt-1 text-[12.5px] text-ink-faint">{s.goal}</p>
                  ) : null}
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-add transition-[width] duration-300 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
