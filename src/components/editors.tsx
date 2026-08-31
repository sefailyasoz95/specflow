"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/store/workspace";
import { Modal } from "./ui/modal";
import { Select } from "./ui/select";
import { DateField } from "./ui/date-field";
import { Button, Eyebrow, Input, Textarea } from "./ui/primitives";
import {
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  type Sprint,
  type Task,
  type TaskStatus,
  type SprintStatus,
} from "@/lib/types";

const BACKLOG = "__backlog__";

/* ------------------------------------------------------------- tasks */

export function TaskEditor({ task, onClose }: { task: Task; onClose: () => void }) {
  const { sprints, requirements, updateTaskDirect, deleteTaskDirect } = useWorkspace();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [estimate, setEstimate] = useState(
    task.estimate_hours == null ? "" : String(task.estimate_hours)
  );
  const [sprintId, setSprintId] = useState(task.sprint_id ?? BACKLOG);
  const [requirementId, setRequirementId] = useState(task.requirement_id ?? BACKLOG);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function save() {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const hours = estimate.trim() === "" ? null : Number(estimate);
      await updateTaskDirect(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        status,
        estimate_hours:
          hours === null || Number.isNaN(hours) ? null : hours,
        sprint_id: sprintId === BACKLOG ? null : sprintId,
        requirement_id: requirementId === BACKLOG ? null : requirementId,
      });
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteTaskDirect(task.id);
      toast.success("Task deleted");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Edit task"
      onClose={onClose}
      footer={
        confirming ? (
          <>
            <p className="mr-auto text-[12.5px] text-fg-mid">
              Delete this task? It does not go to a bin.
            </p>
            <Button variant="quiet" onClick={() => setConfirming(false)} disabled={busy}>
              Keep it
            </Button>
            <Button
              variant="ink"
              className="text-rose-300 hover:text-rose-200"
              onClick={remove}
              disabled={busy}
            >
              Delete
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="quiet"
              className="mr-auto text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-200"
              onClick={() => setConfirming(true)}
              disabled={busy}
            >
              Delete
            </Button>
            <Button variant="quiet" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="solid" onClick={save} disabled={busy || !title.trim()}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-2">
        <Eyebrow>Title</Eyebrow>
        <Input
          data-autofocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
          }}
        />
      </div>

      <div className="space-y-2">
        <Eyebrow>Notes</Eyebrow>
        <Textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Implementation notes, links, gotchas"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Eyebrow>Status</Eyebrow>
          <Select
            ariaLabel="Task status"
            value={status}
            onValueChange={(v) => setStatus(v as TaskStatus)}
            className="h-9 w-full max-w-none"
            groups={[
              {
                items: TASK_STATUSES.map((s) => ({
                  value: s,
                  label: TASK_STATUS_LABEL[s],
                })),
              },
            ]}
          />
        </div>

        <div className="space-y-2">
          <Eyebrow>Estimate (hours)</Eyebrow>
          <Input
            inputMode="decimal"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="Unsized"
          />
        </div>

        <div className="space-y-2">
          <Eyebrow>Sprint</Eyebrow>
          <Select
            ariaLabel="Sprint"
            value={sprintId}
            onValueChange={setSprintId}
            className="h-9 w-full max-w-none"
            groups={[
              { items: [{ value: BACKLOG, label: "Backlog" }] },
              {
                label: "Sprints",
                items: sprints.map((s) => ({ value: s.id, label: s.name })),
              },
            ]}
          />
        </div>

        <div className="space-y-2">
          <Eyebrow>Requirement</Eyebrow>
          <Select
            ariaLabel="Requirement"
            value={requirementId}
            onValueChange={setRequirementId}
            className="h-9 w-full max-w-none"
            groups={[
              { items: [{ value: BACKLOG, label: "None" }] },
              {
                label: "Requirements",
                items: requirements.map((r) => ({
                  value: r.id,
                  label: r.title,
                  hint: r.code,
                })),
              },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------- sprints */

const SPRINT_STATUSES: SprintStatus[] = ["planned", "active", "done"];

export function SprintEditor({
  sprint,
  onClose,
}: {
  sprint: Sprint;
  onClose: () => void;
}) {
  const { tasks, updateSprintDirect, deleteSprintDirect } = useWorkspace();
  const [name, setName] = useState(sprint.name);
  const [goal, setGoal] = useState(sprint.goal ?? "");
  const [status, setStatus] = useState<SprintStatus>(sprint.status);
  const [startDate, setStartDate] = useState(sprint.start_date ?? "");
  const [endDate, setEndDate] = useState(sprint.end_date ?? "");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const inSprint = tasks.filter((t) => t.sprint_id === sprint.id).length;

  async function save() {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await updateSprintDirect(sprint.id, {
        name: name.trim(),
        goal: goal.trim() || null,
        status,
        start_date: startDate || null,
        end_date: endDate || null,
      });
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteSprintDirect(sprint.id);
      toast.success(
        inSprint
          ? `Sprint deleted — ${inSprint} ${inSprint === 1 ? "task" : "tasks"} moved to the backlog`
          : "Sprint deleted"
      );
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Edit sprint"
      onClose={onClose}
      footer={
        confirming ? (
          <>
            <p className="mr-auto max-w-[26ch] text-[12.5px] leading-snug text-fg-mid">
              {inSprint
                ? `Its ${inSprint} ${inSprint === 1 ? "task goes" : "tasks go"} back to the backlog — nothing is lost.`
                : "Delete this sprint?"}
            </p>
            <Button variant="quiet" onClick={() => setConfirming(false)} disabled={busy}>
              Keep it
            </Button>
            <Button
              variant="ink"
              className="text-rose-300 hover:text-rose-200"
              onClick={remove}
              disabled={busy}
            >
              Delete
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="quiet"
              className="mr-auto text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-200"
              onClick={() => setConfirming(true)}
              disabled={busy}
            >
              Delete
            </Button>
            <Button variant="quiet" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="solid" onClick={save} disabled={busy || !name.trim()}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-2">
        <Eyebrow>Name</Eyebrow>
        <Input
          data-autofocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
          }}
        />
      </div>

      <div className="space-y-2">
        <Eyebrow>Goal</Eyebrow>
        <Textarea
          rows={2}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="The one outcome this sprint must deliver"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Eyebrow>Status</Eyebrow>
          <Select
            ariaLabel="Sprint status"
            value={status}
            onValueChange={(v) => setStatus(v as SprintStatus)}
            className="h-9 w-full max-w-none"
            groups={[
              {
                items: SPRINT_STATUSES.map((s) => ({ value: s, label: s })),
              },
            ]}
          />
        </div>

        <div className="space-y-2">
          <Eyebrow>Starts</Eyebrow>
          <DateField
            ariaLabel="Sprint start date"
            value={startDate}
            onChange={setStartDate}
            placeholder="—"
          />
        </div>

        <div className="space-y-2">
          <Eyebrow>Ends</Eyebrow>
          <DateField
            ariaLabel="Sprint end date"
            value={endDate}
            onChange={setEndDate}
            placeholder="—"
            min={startDate || undefined}
          />
        </div>
      </div>
    </Modal>
  );
}
