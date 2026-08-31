# 3-minute demo — shot list

Under 3 minutes is a hard rule. Roughly 20s of setup, 2min of the loop, 30s of
the close. Record with the header badge visible: it proves WebMCP is live.

| Time | On screen | What you say |
| --- | --- | --- |
| 0:00–0:15 | Landing page, badge turns orange, tool list open | "Sprintfy is a project planner that exposes itself to agents over WebMCP. Six tools, live in the page." |
| 0:15–0:35 | Empty project. Paste the brief into the agent. | "Here's a rough brief. Watch what it does — and watch the database." |
| 0:35–1:05 | `get_project_context` and `propose_plan` appear in the activity rail; the diff fills the review panel | "It read the plan *and* what I'm looking at. Then it proposed. Nothing has been written yet — this is a diff, not a save." |
| 1:05–1:30 | Approval modal opens on its own, blocking | "This is the part I care about. `apply_pending_changes` doesn't apply anything. It asks me, and the tool call *waits*." |
| 1:30–1:45 | Click Approve. Board fills, staggered. | "One transaction in Postgres. Sprints and their tasks land together." |
| 1:45–2:15 | Ask it to move the idempotency work to sprint 1. Second diff — this time with `~` change lines, before → after. | "Now it's editing what exists. Field-level diff: which sprint, which estimate, before and after." |
| 2:15–2:35 | Reject with a reason typed in | "And I can say no, with a reason — which goes straight back to the agent as the tool result. It's a conversation, not a fire-and-forget." |
| 2:35–2:50 | Agent re-cuts the sprint, `focus` rings the sprint on screen | "It can also move my view and point at what it's talking about." |
| 2:50–3:00 | Board, final state | "Agents propose. Humans dispose. That's Sprintfy." |

## Recording notes

- Zoom the browser to ~110% — the diff is the hero and it must be readable at
  YouTube's compression.
- Turn on the sprint filter before recording so the board isn't a wall.
- Do a dry run of the reject: the reason field only appears on the second
  click of Reject.
- Keep the activity rail in frame the whole time. It is the proof that these
  are real tool calls.
