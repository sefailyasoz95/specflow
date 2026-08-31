"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/store/workspace";
import type { ChangeSet } from "@/lib/types";
import { Patch, PatchStat } from "./patch";
import { Button, PaperInput } from "./ui/primitives";

/* ------------------------------------------------------------------ *
 * The review sheet
 *
 * The one bright surface in the product. A change set is a document, so
 * it is drawn as one — paper, a title set in the display face, and a
 * numbered patch underneath.
 *
 * Two callers: the agent, through apply_pending_changes, which is
 * waiting on the answer; and the human, who opened it from the rail.
 * Same sheet, different eyebrow.
 * ------------------------------------------------------------------ */

/** Who wrote this, said plainly. */
export const AUTHOR_LABEL = {
  agent: "Proposed by your agent",
  planner: "Proposed by Sprintfy",
  human: "Your change",
} as const;

export function ReviewSheet({
  cs,
  eyebrow,
  toolName,
  note,
  askingForReason,
  onApprove,
  onReject,
  onDismiss,
}: {
  cs: ChangeSet;
  eyebrow: string;
  toolName?: string;
  note?: string | null;
  /** The agent is listening, so a rejection can carry a reason. */
  askingForReason?: boolean;
  onApprove: () => Promise<void>;
  onReject: (reason?: string) => Promise<void>;
  onDismiss?: () => void;
}) {
  const ws = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || busy) return;
      if (onDismiss) onDismiss();
      else void run(() => onReject(reason || undefined));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, reason, onDismiss]);

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  const ctx = { ...ws, operations: cs.operations };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      role="dialog"
      aria-modal="true"
      aria-label={`Review: ${cs.title}`}
    >
      <div
        className="scrim-in absolute inset-0 bg-ink-900/78 backdrop-blur-[3px]"
        onClick={onDismiss}
      />

      <div
        className="sheet-in paper relative flex max-h-[86vh] w-full max-w-[41rem] flex-col
                   overflow-hidden rounded-2xl bg-paper
                   shadow-[0_32px_80px_-16px_rgba(0,0,0,0.72)]"
      >
        <header className="border-b border-paper-line/70 bg-paper-warm/50 px-6 pb-5 pt-5">
          <div className="flex items-center gap-2">
            <span className="waiting-dot size-[7px] rounded-full bg-waiting" />
            <span className="eyebrow text-paper-dim">{eyebrow}</span>
            {toolName ? (
              <span className="ml-auto font-mono text-[11px] text-paper-dim">
                {toolName}
              </span>
            ) : null}
          </div>

          <h2 className="display mt-3 text-[25px] text-paper-fg">{cs.title}</h2>

          {cs.summary ? (
            <p className="mt-2 max-w-[48ch] text-[13.5px] leading-[1.55] text-paper-mid">
              {cs.summary}
            </p>
          ) : null}

          {note ? (
            <p className="mt-3 border-l-2 border-waiting pl-3 text-[13px] leading-relaxed text-paper-mid">
              {note}
            </p>
          ) : null}
        </header>

        <div className="flex items-center gap-3 border-b border-paper-line/70 px-6 py-2">
          <PatchStat ctx={ctx} />
          <span className="ml-auto font-mono text-[11px] tabular-nums text-paper-dim">
            {cs.operations.length} operations
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          <Patch ctx={ctx} />
        </div>

        <footer className="border-t border-paper-line/70 bg-paper-warm/50 px-6 py-4">
          {showReason ? (
            <PaperInput
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What's wrong with it? The agent gets this back."
              onKeyDown={(e) => {
                if (e.key === "Enter") void run(() => onReject(reason || undefined));
              }}
              className="mb-3"
            />
          ) : null}

          <div className="flex items-center gap-2">
            <p className="mr-auto text-[12.5px] text-paper-dim">
              Nothing is written until you approve.
            </p>
            <Button
              variant="paper-quiet"
              disabled={busy}
              onClick={() => {
                if (askingForReason && !showReason) {
                  setShowReason(true);
                  return;
                }
                void run(() => onReject(reason || undefined));
              }}
            >
              {askingForReason ? "Reject" : "Discard"}
            </Button>
            <Button
              variant="commit"
              disabled={busy}
              onClick={() => void run(onApprove)}
            >
              {busy ? "Applying…" : `Approve ${cs.operations.length} changes`}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
