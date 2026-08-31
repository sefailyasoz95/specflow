"use client";

import { useState } from "react";
import { useWorkspace } from "@/store/workspace";
import { DiffView, diffCounts } from "./diff-view";
import { Badge, Button, Empty } from "./ui/primitives";
import { cn } from "@/lib/utils";
import type { Surface } from "@/webmcp/registry";

const SURFACE_LABEL: Record<Surface, string> = {
  "document.modelContext": "document.modelContext",
  "navigator.modelContext": "navigator.modelContext",
  "navigator.provideContext": "navigator.provideContext",
  unavailable: "not detected",
};

export function WebMCPStatus({
  surface,
  toolNames,
}: {
  surface: Surface;
  toolNames: string[];
}) {
  const [open, setOpen] = useState(false);
  const live = surface !== "unavailable";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "press flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px]",
          live
            ? "border-agent/35 bg-agent/[0.07] text-agent"
            : "border-line bg-raised text-ink-faint"
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            live ? "bg-agent agent-pulse" : "bg-ink-faint"
          )}
        />
        <span className="font-mono">
          {live ? `${toolNames.length} tools live` : "WebMCP off"}
        </span>
      </button>

      {open ? (
        <div className="enter absolute right-0 top-full z-40 mt-2 w-80 origin-top-right rounded-xl border border-line bg-surface p-3 shadow-2xl shadow-black/50">
          <p className="text-[12px] text-ink-dim">
            Surface:{" "}
            <span className="font-mono text-ink">{SURFACE_LABEL[surface]}</span>
          </p>
          {live ? (
            <ul className="mt-2 space-y-1">
              {toolNames.map((n) => (
                <li key={n} className="font-mono text-[11.5px] text-ink-faint">
                  {n}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-ink-faint">
              <p>
                This page registers its tools the moment a WebMCP-capable
                browser is present. To turn it on in Chrome:
              </p>
              <ol className="list-decimal space-y-0.5 pl-4">
                <li>
                  open <span className="font-mono text-ink-dim">chrome://flags/#enable-webmcp-testing</span>
                </li>
                <li>set it to Enabled, relaunch</li>
                <li>reload this page</li>
              </ol>
              <p>Or open it inside ChatGPT&apos;s browser.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function AgentActivity() {
  const { agentEvents } = useWorkspace();

  return (
    <section className="flex min-h-0 flex-col">
      <h3 className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
        Agent activity
      </h3>
      {agentEvents.length === 0 ? (
        <p className="px-3 pb-3 text-[12.5px] leading-relaxed text-ink-faint">
          Nothing yet. Ask your agent to read this project — every tool call it
          makes shows up here.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-px overflow-y-auto px-1.5 pb-2">
          {agentEvents.map((e) => (
            <li
              key={e.id}
              className="enter rounded-lg px-1.5 py-1.5 hover:bg-raised"
            >
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "size-1.5 shrink-0 translate-y-[-1px] rounded-full",
                    e.kind === "read" && "bg-ink-faint",
                    e.kind === "write" && "bg-add",
                    e.kind === "control" && "bg-agent"
                  )}
                />
                <span className="font-mono text-[11.5px] text-ink-dim">
                  {e.tool}
                </span>
                <span className="ml-auto font-mono text-[10.5px] text-ink-faint">
                  {new Date(e.at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <p className="pl-3.5 text-[12px] text-ink-faint">{e.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ProposalList() {
  const ws = useWorkspace();
  const { changeSets, ui, setUi, applyChangeSet, discardChangeSet, highlight } = ws;
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = changeSets.filter((c) => c.status === "pending");
  const recent = changeSets.filter((c) => c.status !== "pending").slice(0, 5);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <h3 className="flex items-center gap-2 px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
        Proposals
        {pending.length > 0 ? (
          <Badge tone="agent">{pending.length} pending</Badge>
        ) : null}
      </h3>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-3">
        {pending.length === 0 && recent.length === 0 ? (
          <div className="px-1">
            <Empty
              title="No proposals yet"
              hint="When an agent plans something, its diff waits here for you."
            />
          </div>
        ) : null}

        {pending.map((cs) => {
          const open = ui.openProposalId === cs.id;
          const counts = diffCounts({ ...ws, operations: cs.operations });
          const ringed =
            highlight?.kind === "changeset" && highlight.id === cs.id;

          return (
            <article
              key={cs.id}
              className={cn(
                "enter overflow-hidden rounded-xl border bg-raised transition-colors duration-200",
                ringed ? "border-agent/70 sf-highlight" : "border-agent/30"
              )}
            >
              <button
                onClick={() => setUi({ openProposalId: open ? null : cs.id })}
                className="press w-full px-3 py-2.5 text-left"
              >
                <div className="flex items-center gap-2">
                  <Badge tone="agent">agent</Badge>
                  <span className="ml-auto font-mono text-[10.5px] text-ink-faint">
                    {cs.operations.length} ops
                  </span>
                </div>
                <p className="mt-1.5 text-[13.5px] font-medium text-ink">
                  {cs.title}
                </p>
                {cs.summary ? (
                  <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-ink-faint">
                    {cs.summary}
                  </p>
                ) : null}
                <div className="mt-2 flex gap-1.5">
                  {counts.add > 0 && <Badge tone="add">+{counts.add}</Badge>}
                  {counts.mod > 0 && <Badge tone="mod">~{counts.mod}</Badge>}
                  {counts.remove > 0 && (
                    <Badge tone="remove">−{counts.remove}</Badge>
                  )}
                </div>
              </button>

              {open ? (
                <div className="border-t border-line">
                  <div className="max-h-64 overflow-y-auto">
                    <DiffView ctx={{ ...ws, operations: cs.operations }} dense />
                  </div>
                  <div className="flex gap-2 border-t border-line px-3 py-2.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === cs.id}
                      onClick={async () => {
                        setBusyId(cs.id);
                        await discardChangeSet(cs.id).finally(() => setBusyId(null));
                      }}
                    >
                      Discard
                    </Button>
                    <Button
                      size="sm"
                      variant="agent"
                      className="ml-auto"
                      disabled={busyId === cs.id}
                      onClick={async () => {
                        setBusyId(cs.id);
                        await applyChangeSet(cs.id).finally(() => setBusyId(null));
                      }}
                    >
                      {busyId === cs.id ? "Applying…" : "Apply"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}

        {recent.map((cs) => (
          <div
            key={cs.id}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px]"
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                cs.status === "applied" ? "bg-add" : "bg-ink-faint"
              )}
            />
            <span className="truncate text-ink-faint">{cs.title}</span>
            <span className="ml-auto font-mono text-[10.5px] text-ink-faint">
              {cs.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
