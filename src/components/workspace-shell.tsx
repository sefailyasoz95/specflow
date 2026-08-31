"use client";

import Link from "next/link";
import { useWorkspace } from "@/store/workspace";
import { useWebMCP } from "@/webmcp/use-webmcp";
import { buildProjectTools } from "@/webmcp/tools";
import { AgentActivity, ProposalList, WebMCPStatus } from "./review-rail";
import { ApprovalDialog } from "./approval-dialog";
import { Board, RequirementsView, SprintsView } from "./views";
import { Select } from "./ui/select";
import { cn, hours } from "@/lib/utils";
import type { UiState } from "@/store/workspace";

/* Radix reserves the empty string, so "all work" needs a real value. */
const ALL = "__all__";
const BACKLOG = "__backlog__";

const VIEWS: { id: UiState["view"]; label: string }[] = [
  { id: "board", label: "Board" },
  { id: "requirements", label: "Requirements" },
  { id: "sprints", label: "Sprints" },
];

export function WorkspaceShell() {
  const ws = useWorkspace();
  const { project, sprints, tasks, ui, setUi, changeSets } = ws;
  const pending = changeSets.filter((c) => c.status === "pending");

  /* Arriving from the planner: you described a project, waited for it, and
     the only thing in here is the proposal. Open it. Anywhere else — a
     project with work already in it — a modal opening by itself would be
     an ambush, so it stays in the rail. */
  const firstRun = tasks.length === 0 && pending.length === 1;
  const { surface, toolNames } = useWebMCP(() => buildProjectTools(ws));
  const waiting = pending.length;

  return (
    <div className="flex h-dvh flex-col bg-ink-900">
      <header className="flex shrink-0 items-center gap-6 px-6 py-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <Link
            href="/projects"
            className="press -ml-1 rounded px-1 text-[15px] text-fg-dim hover:text-fg"
            aria-label="All projects"
          >
            ←
          </Link>
          <h1 className="display truncate text-[19px] text-fg">{project.name}</h1>
        </div>

        <nav className="flex items-center gap-5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setUi({ view: v.id })}
              className={cn(
                "press relative py-1 text-[13px] transition-colors duration-150",
                ui.view === v.id ? "text-fg" : "text-fg-dim hover:text-fg-mid"
              )}
            >
              {v.label}
              {ui.view === v.id ? (
                <span className="absolute -bottom-0.5 left-0 h-px w-full bg-fg" />
              ) : null}
            </button>
          ))}
        </nav>

        {ui.view === "board" ? (
          <Select
            ariaLabel="Filter the board by sprint"
            value={ui.activeSprintId ?? ALL}
            onValueChange={(v) =>
              setUi({ activeSprintId: v === ALL ? null : v })
            }
            groups={[
              {
                items: [
                  { value: ALL, label: "All work", hint: `${tasks.length}` },
                  {
                    value: BACKLOG,
                    label: "Backlog only",
                    hint: `${tasks.filter((t) => t.sprint_id === null).length}`,
                  },
                ],
              },
              {
                label: "Sprints",
                items: sprints.map((s) => {
                  const inSprint = tasks.filter((t) => t.sprint_id === s.id);
                  return {
                    value: s.id,
                    label: s.name,
                    hint: hours(
                      inSprint.reduce((sum, t) => sum + (t.estimate_hours ?? 0), 0)
                    ),
                  };
                }),
              },
            ]}
          />
        ) : null}

        <div className="ml-auto">
          <WebMCPStatus surface={surface} toolNames={toolNames} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-px bg-ink-hair">
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-ink-900 px-6 pb-4 pt-2">
          {ui.view === "board" ? <Board /> : null}
          {ui.view === "requirements" ? <RequirementsView /> : null}
          {ui.view === "sprints" ? <SprintsView /> : null}
        </main>

        <aside
          className={cn(
            "flex w-[23rem] shrink-0 flex-col gap-6 overflow-hidden py-5",
            "transition-colors duration-500",
            waiting > 0 ? "bg-ink-850" : "bg-ink-900"
          )}
        >
          <ProposalList openOnArrival={firstRun ? pending[0].id : null} />
          <div className="min-h-0 flex-1 border-t border-ink-hair pt-5">
            <AgentActivity />
          </div>
        </aside>
      </div>

      <ApprovalDialog />
    </div>
  );
}
