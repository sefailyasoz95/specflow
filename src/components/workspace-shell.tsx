"use client";

import Link from "next/link";
import { useWorkspace } from "@/store/workspace";
import { useWebMCP } from "@/webmcp/use-webmcp";
import { buildProjectTools } from "@/webmcp/tools";
import { AgentActivity, ProposalList, WebMCPStatus } from "./review-rail";
import { ApprovalDialog } from "./approval-dialog";
import { Board, RequirementsView, SprintsView } from "./views";
import { Badge } from "./ui/primitives";
import { cn } from "@/lib/utils";
import type { UiState } from "@/store/workspace";

const VIEWS: { id: UiState["view"]; label: string }[] = [
  { id: "board", label: "Board" },
  { id: "requirements", label: "Requirements" },
  { id: "sprints", label: "Sprints" },
];

export function WorkspaceShell() {
  const ws = useWorkspace();
  const { project, sprints, tasks, ui, setUi, changeSets } = ws;

  const { surface, toolNames } = useWebMCP(() => buildProjectTools(ws));
  const pending = changeSets.filter((c) => c.status === "pending").length;

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2.5">
        <Link
          href="/projects"
          className="press rounded-lg px-1.5 py-1 text-[13px] text-ink-faint hover:text-ink"
        >
          ←
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-[14px] font-medium text-ink">
            {project.name}
          </h1>
        </div>

        <nav className="ml-4 flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setUi({ view: v.id })}
              className={cn(
                "press rounded-[7px] px-2.5 py-1 text-[12.5px] transition-colors duration-150",
                ui.view === v.id
                  ? "bg-raised text-ink"
                  : "text-ink-faint hover:text-ink-dim"
              )}
            >
              {v.label}
            </button>
          ))}
        </nav>

        {ui.view === "board" ? (
          <select
            value={ui.activeSprintId ?? ""}
            onChange={(e) =>
              setUi({ activeSprintId: e.target.value || null })
            }
            className="h-8 rounded-lg border border-line bg-surface px-2 text-[12.5px] text-ink-dim focus:border-agent/60 focus:outline-none"
          >
            <option value="">All work</option>
            <option value="__backlog__">Backlog only</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <Badge tone="muted">{tasks.length} tasks</Badge>
          <WebMCPStatus surface={surface} toolNames={toolNames} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden px-4 py-4">
          {ui.view === "board" ? <Board /> : null}
          {ui.view === "requirements" ? <RequirementsView /> : null}
          {ui.view === "sprints" ? <SprintsView /> : null}
        </main>

        <aside
          className={cn(
            "flex w-[340px] shrink-0 flex-col border-l border-line bg-surface/40 py-3",
            "transition-colors duration-300",
            pending > 0 && "bg-agent-wash"
          )}
        >
          <ProposalList />
          <div className="mt-2 border-t border-line pt-3">
            <AgentActivity />
          </div>
        </aside>
      </div>

      <ApprovalDialog />
    </div>
  );
}
