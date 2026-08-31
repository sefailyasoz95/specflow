"use client";

import { useWorkspace } from "@/store/workspace";
import { ReviewSheet } from "./review-sheet";

/** The agent asked, through apply_pending_changes, and is waiting. */
export function ApprovalDialog() {
  const { approvalRequest, changeSets, resolveApproval } = useWorkspace();
  const cs = changeSets.find((c) => c.id === approvalRequest?.changeSetId);
  if (!approvalRequest || !cs) return null;

  return (
    <ReviewSheet
      key={cs.id}
      cs={cs}
      eyebrow={
        cs.source === "planner"
          ? "Sprintfy is waiting on you"
          : "Your agent is waiting on you"
      }
      toolName="apply_pending_changes"
      note={approvalRequest.note}
      askingForReason
      onApprove={() => resolveApproval("approved")}
      onReject={(reason) => resolveApproval("rejected", reason)}
    />
  );
}
