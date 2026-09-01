# 3-minute demo — shot list

Rewritten against the organisers' guidance, which is blunt about what loses
judges: **show it working in the first 10–15 seconds, start already signed
in, no intro, no title card, cut every load and every pause, and keep the
personal story for the written description.** Under 3 minutes is a hard
rule and judges are not obliged to watch past it, so the target here is
**2:40** with the strongest thirty seconds at the front.

The opening shot is the product doing the thing. Not a landing page, not a
face. The webcam stays a small picture-in-picture the whole way through —
present, never leading.

| Time | On screen | Voice / on-screen text |
| --- | --- | --- |
| 0:00–0:12 | Already inside a project. The agent calls `get_project_context`, then `propose_plan`. The rail logs both. The diff fills the review panel — 8 requirements, 4 sprints, 38 tasks. | "That's a whole plan my agent just proposed. Nothing has been written." **On screen: 0 rows written.** |
| 0:12–0:30 | `apply_pending_changes` fires. The approval sheet opens and the agent visibly stops. | "The tool call is still open. It asked me, and now it's waiting." **On screen: the tool call is blocked, waiting for a human.** Leave two seconds of silence here — the pause is the point. |
| 0:30–0:45 | Approve. The board fills in one go. | "One transaction. The sprint and its twelve tasks land together, or none of them do." |
| 0:45–1:15 | "Move the idempotency work into sprint 1 — it blocks everything else." Second diff, field-level: sprint, estimate, before → after. **Reject**, with a reason. | "Now it's editing what exists. And I can say no —" |
| 1:15–1:35 | ChatGPT reads your reason back and re-cuts the plan. | "— and my reason went back to it as the tool's return value. That's the whole idea: it's a conversation, not fire-and-forget." |
| 1:35–1:50 | `focus` rings a sprint. Then: "which requirement has nothing planned?" → it names REQ-004. | "It can move my view, and it can see the shape of the plan, not just rows." |
| 1:50–2:10 | Cut to the intake form, a PRD dropped in, then **cut straight to the finished plan**. Label the cut. | **On screen: 56s, cut.** "This is where the plan came from — a PRD, in Turkish, planned in Turkish." |
| 2:10–2:30 | Console: the eval run, seven green. | "Seven scenarios against the real tools, on the live site. A proposal writes zero rows. A rejection comes back as a tool result." |
| 2:30–2:40 | Board, final state. PiP goes full for two seconds. | "Agents propose. I decide. Sprintfy." |

Rules for the edit, from the organisers' list:

- **No live typing.** Speak to the agent, or paste. Never film a keyboard.
- **Jump-cut every pause** — the model thinking, the page loading, your
  "umm". Dead air is the most expensive thing in a 3-minute budget.
- **Speed up the 56-second plan** and put a label on it. A visible "cut"
  is honest; a hidden one is the exact thing this product argues against.
- **On-screen text beats saying it.** "0 rows written" lands faster than a
  sentence explaining that nothing was written.
- **Record in short clips**, one row of the table at a time. Then a bad
  take costs one row, not the whole video.
- **No inspiration, no origin story, no team intro.** All of that is in the
  written description, where judges actually read it.

## Where to record

Two good options, and one trap.

**The ChatGPT desktop app in ChatGPT mode** is the best shot for this video.
Its built-in browser exposes `document.modelContext` with no flag and no
extension, so the whole demo happens inside one window — you talk, the page
answers. That is also the surface the challenge rules point judges at.

**Desktop Chrome with `chrome://flags/#enable-webmcp-testing`**, driven by
ChatGPT's Chrome extension, is the fallback. It is the surface Sprintfy was
built against and the one to fall back to if the desktop app misbehaves on
the day.

The trap: **Codex mode in that same ChatGPT desktop app does not expose
WebMCP.** Its built-in browser leaves the tools dormant and the badge will
correctly say off. Check the mode before you press record.

Keep project creation out of the critical path. The planner takes 55–56
seconds against a real brief — a third of the video spent watching a
spinner. Record it separately and cut to the result, or open on the guided
demo, which is a real workspace with a proposal already waiting and needs no
account (press "Show me a demo", or let the agent call `start_guided_demo`).

If you have ten seconds spare at the end, run the evals on camera. Seven
scenarios passing against production, in the console, is the shortest
possible proof that the gate is real rather than described:

```js
const s = await fetch('/evals.js').then(r => r.text()); (0,eval)(s);
await SprintfyEvals.run()
```

## Recording notes

- Zoom the browser to ~110% — the diff is the hero and it must be readable at
  YouTube's compression.
- Turn on the sprint filter before recording so the board isn't a wall.
- Do a dry run of the reject: the reason field only appears on the second
  click of Reject.
- Keep the activity rail in frame the whole time. It is the proof that these
  are real tool calls.
