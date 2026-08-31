"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/store/workspace";
import type { ApprovalRequest, WorkspaceValue } from "@/store/workspace";
import type { ChangeSet } from "@/lib/types";
import { DiffView, diffCounts } from "./diff-view";
import { Badge, Button, Input } from "./ui/primitives";
import { cn } from "@/lib/utils";

export function ApprovalDialog() {
  const ws = useWorkspace();
  const { approvalRequest, changeSets } = ws;
  const cs = changeSets.find((c) => c.id === approvalRequest?.changeSetId);

  if (!approvalRequest || !cs) return null;

  // Keyed on the request, so every new ask starts with clean local state
  // instead of an effect resetting the old one.
  return (
    <Dialog key={approvalRequest.changeSetId} request={approvalRequest} cs={cs} ws={ws} />
  );
}

function Dialog({
  request,
  cs,
  ws,
}: {
  request: ApprovalRequest;
  cs: ChangeSet;
  ws: WorkspaceValue;
}) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);
  const { resolveApproval } = ws;

  const counts = diffCounts({ ...ws, operations: cs.operations });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || busy) return;
      setBusy(true);
      void resolveApproval("rejected", reason || undefined).finally(() =>
        setBusy(false)
      );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, reason, resolveApproval]);

  async function decide(decision: "approved" | "rejected") {
    if (busy) return;
    setBusy(true);
    try {
      await resolveApproval(decision, decision === "rejected" ? reason : undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Agent is asking for approval"
    >
      {/* Scrim: a plain fade — nothing to pull the eye off the diff. */}
      <div className="enter absolute inset-0 bg-black/65 backdrop-blur-[2px]" />

      {/* Modals are centred; they are not anchored to a trigger. */}
      <div
        className={cn(
          "enter relative flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden",
          "rounded-2xl border border-line bg-surface shadow-2xl shadow-black/60"
        )}
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <span className="agent-pulse mt-1.5 size-2 shrink-0 rounded-full bg-agent" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge tone="agent">agent · awaiting you</Badge>
              <span className="font-mono text-[11px] text-ink-faint">
                apply_pending_changes
              </span>
            </div>
            <h2 className="mt-1.5 text-[15px] font-medium text-ink">{cs.title}</h2>
            {cs.summary ? (
              <p className="mt-1 text-[13px] leading-relaxed text-ink-dim">
                {cs.summary}
              </p>
            ) : null}
            {request.note ? (
              <p className="mt-2 rounded-lg border border-agent/25 bg-agent/[0.06] px-2.5 py-1.5 text-[12.5px] text-agent">
                {request.note}
              </p>
            ) : null}
          </div>
        </header>

        <div className="flex items-center gap-2 border-b border-line px-5 py-2">
          {counts.add > 0 && <Badge tone="add">+{counts.add} added</Badge>}
          {counts.mod > 0 && <Badge tone="mod">~{counts.mod} changed</Badge>}
          {counts.remove > 0 && <Badge tone="remove">−{counts.remove} removed</Badge>}
          <span className="ml-auto font-mono text-[11px] text-ink-faint">
            {cs.operations.length} ops
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <DiffView ctx={{ ...ws, operations: cs.operations }} />
        </div>

        <footer className="flex flex-col gap-2 border-t border-line px-5 py-3.5">
          {showReason ? (
            <Input
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What is wrong with it? The agent will hear this."
              onKeyDown={(e) => {
                if (e.key === "Enter") void decide("rejected");
              }}
            />
          ) : null}
          <div className="flex items-center gap-2">
            <p className="mr-auto text-[12px] text-ink-faint">
              Nothing is written until you approve.
            </p>
            <Button
              variant="ghost"
              onClick={() =>
                showReason ? void decide("rejected") : setShowReason(true)
              }
              disabled={busy}
            >
              Reject
            </Button>
            <Button
              variant="agent"
              onClick={() => void decide("approved")}
              disabled={busy}
            >
              {busy ? "Applying…" : `Approve ${cs.operations.length} changes`}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
