"use client";

import { useState } from "react";
import { useWorkspace } from "@/store/workspace";
import { PatchStat } from "./patch";
import { AUTHOR_LABEL, ReviewSheet } from "./review-sheet";
import { Button, Eyebrow, Fact } from "./ui/primitives";
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
          "press flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-mono text-[11.5px]",
          live ? "text-fg-mid hover:bg-ink-800" : "text-fg-dim hover:bg-ink-800"
        )}
      >
        <span
          className={cn(
            "size-[6px] rounded-full",
            live ? "bg-waiting waiting-dot" : "bg-fg-dim/50"
          )}
        />
        {live ? `${toolNames.length} tools live` : "webmcp off"}
      </button>

      {open ? (
        <div className="enter absolute right-0 top-full z-40 mt-2 w-[19rem] rounded-xl bg-ink-800 p-3.5 shadow-2xl shadow-black/60 ring-1 ring-ink-line">
          <Eyebrow>Surface</Eyebrow>
          <p className="mt-1 font-mono text-[12px] text-fg">
            {SURFACE_LABEL[surface]}
          </p>

          {live ? (
            <ul className="mt-3 space-y-1">
              {toolNames.map((n) => (
                <li key={n} className="font-mono text-[11.5px] text-fg-mid">
                  {n}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-fg-dim">
              <p>
                The tools register the moment a WebMCP-capable browser is
                present. In Chrome:
              </p>
              <ol className="space-y-1">
                <li>
                  <Fact>1</Fact>{" "}
                  <span className="font-mono text-[11.5px] text-fg-mid">
                    chrome://flags/#enable-webmcp-testing
                  </span>
                </li>
                <li>
                  <Fact>2</Fact> Enable it, relaunch.
                </li>
                <li>
                  <Fact>3</Fact> Reload this page.
                </li>
              </ol>
              <p>Or open Sprintfy inside ChatGPT&apos;s browser.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function ProposalList({
  openOnArrival = null,
}: {
  /** Set on a project's first run, so the plan you just waited for opens. */
  openOnArrival?: string | null;
}) {
  const ws = useWorkspace();
  const { changeSets, highlight, applyChangeSet, discardChangeSet } = ws;
  const [openId, setOpenId] = useState<string | null>(openOnArrival);

  const pending = changeSets.filter((c) => c.status === "pending");
  const settled = changeSets.filter((c) => c.status !== "pending").slice(0, 6);
  const open = pending.find((c) => c.id === openId);

  return (
    <section className="flex min-h-0 flex-col">
      <div className="flex items-baseline gap-2 px-5 pb-3">
        <Eyebrow>Review</Eyebrow>
        {pending.length > 0 ? (
          <span className="flex items-center gap-1.5">
            <span className="waiting-dot size-[6px] rounded-full bg-waiting" />
            <Fact tone="mid">{pending.length} waiting</Fact>
          </span>
        ) : null}
      </div>

      <div className="min-h-0 space-y-2 overflow-y-auto px-3 pb-4">
        {pending.length === 0 && settled.length === 0 ? (
          <p className="px-2 text-[13px] leading-relaxed text-fg-dim">
            Nothing to review. When your agent proposes a plan, its diff waits
            here — and nothing reaches the project until you say so.
          </p>
        ) : null}

        {pending.map((cs) => {
          const pointedAt =
            highlight?.kind === "changeset" && highlight.id === cs.id;
          return (
            /* A pending proposal is a small sheet of the same paper as the
               review surface — the one bright thing in a dark workspace,
               sitting exactly where the eye should go. */
            <article
              key={cs.id}
              className={cn(
                "enter overflow-hidden rounded-xl bg-paper",
                "shadow-[0_10px_28px_-10px_rgba(0,0,0,0.65)]",
                pointedAt && "pointed-at"
              )}
            >
              <button
                onClick={() => setOpenId(cs.id)}
                className="lift-paper press w-full px-4 py-3.5 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="waiting-dot size-[6px] rounded-full bg-waiting" />
                  <span className="eyebrow text-paper-dim">
                    {cs.source === "planner" ? "Sprintfy" : cs.source === "human" ? "You" : "Agent"}
                  </span>
                  <span className="ml-auto">
                    <PatchStat ctx={{ ...ws, operations: cs.operations }} />
                  </span>
                </div>

                <h3 className="display mt-2.5 text-[17px] text-paper-fg">
                  {cs.title}
                </h3>

                {cs.summary ? (
                  <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-[1.5] text-paper-mid">
                    {cs.summary}
                  </p>
                ) : null}

                <p className="mt-3 flex items-center gap-1.5 text-[12px] text-paper-fg">
                  Open the patch
                  <span aria-hidden className="font-mono">→</span>
                </p>
              </button>
            </article>
          );
        })}

        {settled.length ? (
          <ul className="pt-2">
            {settled.map((cs) => (
              <li
                key={cs.id}
                className="flex items-baseline gap-2.5 px-1.5 py-1.5 text-[12.5px]"
              >
                <span
                  className={cn(
                    "translate-y-[-1px] font-mono text-[11px]",
                    cs.status === "applied" ? "text-emerald-400/70" : "text-fg-dim"
                  )}
                >
                  {cs.status === "applied" ? "✓" : "×"}
                </span>
                <span className="truncate text-fg-dim">{cs.title}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {open ? (
        <ReviewSheet
          key={open.id}
          cs={open}
          eyebrow={AUTHOR_LABEL[open.source]}
          onDismiss={() => setOpenId(null)}
          onApprove={async () => {
            await applyChangeSet(open.id);
            setOpenId(null);
          }}
          onReject={async () => {
            await discardChangeSet(open.id);
            setOpenId(null);
          }}
        />
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function AgentActivity() {
  const { agentEvents } = useWorkspace();

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <Eyebrow className="px-5 pb-3">Tool calls</Eyebrow>

      {agentEvents.length === 0 ? (
        <p className="px-5 text-[13px] leading-relaxed text-fg-dim">
          Every call your agent makes shows up here, in order.
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {agentEvents.map((e) => (
            <li key={e.id} className="enter rounded-lg px-2 py-1.5">
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "size-[5px] shrink-0 translate-y-[-2px] rounded-full",
                    e.kind === "read" && "bg-fg-dim",
                    e.kind === "write" && "bg-emerald-400/80",
                    e.kind === "control" && "bg-waiting"
                  )}
                />
                <span className="font-mono text-[11.5px] text-fg-mid">{e.tool}</span>
                <Fact className="ml-auto">
                  {new Date(e.at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Fact>
              </div>
              <p className="pl-3.5 text-[12px] leading-snug text-fg-dim">
                {e.detail}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export { Button };
