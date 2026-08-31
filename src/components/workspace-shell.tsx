"use client";

import Link from "next/link";
import { useWorkspace } from "@/store/workspace";
import { useWebMCP } from "@/webmcp/use-webmcp";
import { buildProjectTools } from "@/webmcp/tools";
import { AgentActivity, ProposalList, WebMCPStatus } from "./review-rail";
import { ApprovalDialog } from "./approval-dialog";
import { Board, RequirementsView, SprintsView } from "./views";
import { cn } from "@/lib/utils";
import type { UiState } from "@/store/workspace";

const VIEWS: { id: UiState["view"]; label: string }[] = [
  { id: "board", label: "Board" },
  { id: "requirements", label: "Requirements" },
  { id: "sprints", label: "Sprints" },
];

export function WorkspaceShell() {
  const ws = useWorkspace();
  const { project, sprints, ui, setUi, changeSets } = ws;
  const { surface, toolNames } = useWebMCP(() => buildProjectTools(ws));
  const waiting = changeSets.filter((c) => c.status === "pending").length;

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
          <select
            value={ui.activeSprintId ?? ""}
            onChange={(e) => setUi({ activeSprintId: e.target.value || null })}
            className="press h-8 rounded-lg bg-ink-800 px-2.5 text-[12.5px] text-fg-mid focus:outline-none"
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
          <ProposalList />
          <div className="min-h-0 flex-1 border-t border-ink-hair pt-5">
            <AgentActivity />
          </div>
        </aside>
      </div>

      <ApprovalDialog />
    </div>
  );
}
