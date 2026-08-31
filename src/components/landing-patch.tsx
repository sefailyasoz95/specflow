"use client";

import { Patch, PatchStat } from "./patch";
import type { Op, Requirement, Sprint, Task } from "@/lib/types";

/* A real change set, rendered by the real patch component. The landing
   page's hero is the product's own artefact — not a screenshot of it. */

const sprint: Sprint = {
  id: "s-existing",
  project_id: "p",
  name: "Sprint 2 — One page",
  goal: "Collapse three steps into one.",
  position: 2,
  status: "planned",
  created_at: "",
};

const task: Task = {
  id: "t-existing",
  project_id: "p",
  sprint_id: "s-existing",
  requirement_id: null,
  title: "Collapse the three checkout steps into one route",
  description: null,
  status: "backlog",
  estimate_hours: 8,
  position: 1,
  created_at: "",
};

const operations: Op[] = [
  {
    op: "create_sprint",
    tempId: "s0",
    name: "Sprint 0 — Instrument first",
    goal: "Know the drop-off rate per step before changing anything.",
  },
  {
    op: "create_task",
    title: "Add funnel events for each checkout step",
    sprintRef: "s0",
    estimateHours: 4,
  },
  {
    op: "create_requirement",
    title: "Checkout drop-off is measurable per step",
    priority: "high",
  },
  {
    op: "update_task",
    taskId: "t-existing",
    estimateHours: 12,
    status: "todo",
  },
];

const ctx = {
  operations,
  tasks: [task],
  sprints: [sprint],
  requirements: [] as Requirement[],
};

export function LandingPatch() {
  return (
    <figure
      className="paper overflow-hidden rounded-2xl bg-paper
                 shadow-[0_40px_90px_-24px_rgba(0,0,0,0.75)]"
    >
      <figcaption className="border-b border-paper-line/70 bg-paper-warm/50 px-5 pb-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="waiting-dot size-[6px] rounded-full bg-waiting" />
          <span className="eyebrow text-paper-dim">Your agent is waiting on you</span>
        </div>
        <p className="display mt-2.5 text-[21px] text-paper-fg">
          Measure before rebuilding
        </p>
        <p className="mt-1.5 max-w-[44ch] text-[13px] leading-[1.55] text-paper-mid">
          The brief says drop-off is around 40%, but nothing records it per
          step. I put a short instrumentation sprint in front and re-sized the
          route collapse.
        </p>
      </figcaption>

      <div className="flex items-center gap-3 border-b border-paper-line/70 px-5 py-2">
        <PatchStat ctx={ctx} />
        <span className="ml-auto font-mono text-[11px] text-paper-dim">
          4 operations
        </span>
      </div>

      <Patch ctx={ctx} />

      <div className="flex items-center gap-3 border-t border-paper-line/70 bg-paper-warm/50 px-5 py-3.5">
        <span className="mr-auto text-[12px] text-paper-dim">
          Nothing is written yet.
        </span>
        <span className="whitespace-nowrap text-[12.5px] text-paper-mid">
          Reject
        </span>
        <span className="whitespace-nowrap rounded-lg bg-paper-fg px-3 py-1.5 text-[12.5px] font-medium text-paper">
          Approve 4
        </span>
      </div>
    </figure>
  );
}
