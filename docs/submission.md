# Devpost submission — text description (draft)

> Judging weighs four things: depth of the WebMCP implementation, whether it is
> a coherent product, credible impact, and novelty. This draft leads with the
> one design decision that separates Sprintfy from a CRUD app with tools
> bolted on, because that is the only part a judge cannot skim past.

---

## Sprintfy — plan software *with* your agent, not *for* it

### The problem

Every "agent-ready" app so far exposes the same shape of tool: `create_task`,
`update_task`, `delete_task`. The model writes straight to the database. That
is fine until the model is confidently wrong about your sprint plan — and then
you are doing archaeology on a project board, trying to work out what it
touched and in what order.

Project planning is exactly the wrong domain for blind writes. A plan is an
argument about sequencing and effort. It is the thing a PM is paid to have an
opinion about. Handing that to an agent as unsupervised INSERTs gets you a
plan nobody trusts and everybody has to re-check — which is more work than
writing it by hand.

### How you start

You do not start with an empty board. You give Sprintfy the thing you already
have — a backlog note, a PRD as `.md`, `.txt`, `.pdf` or `.docx`, or a few
paragraphs typed in — and it returns requirements, sprints, tasks and hour
estimates, sequenced by risk rather than by comfort. A real Turkish brief
produced 8 requirements, 4 sprints and 38 tasks in 56 seconds, in Turkish,
with the database migration ranked critical and placed first.

Two things about that flow are worth a judge's attention:

- **The planner is held to the same rule as any agent.** Sprintfy's own model
  call does not write the plan either. It authors a change set marked
  `source: "planner"` and it lands in the same review panel, behind the same
  gate. The product would not be worth much if its author exempted itself.
- **It is allowed to refuse.** A brief that is filler, a repeated phrase, or a
  question about something else comes back as "that does not read like a
  project brief", with empty arrays — rather than an invented project produced
  in order to look helpful.

### What Sprintfy does

Sprintfy is a project planner — requirements, sprints, tasks, effort
estimates — that exposes its workspace to agents over WebMCP. **No agent tool
writes to the plan.** The collaboration runs in three moves:

**1. The agent reads the room.** `get_project_context` returns the plan *and*
what the human is currently looking at: active view, selected sprint, status
filter, which proposal is open. The agent plans into a context, not a vacuum,
and can reason about what the person on the other side of the screen can
actually see.

**2. The agent proposes a diff.** Every write tool authors a *change set* — an
ordered list of operations stored as JSON, rendered in the review panel as a
real diff. Additions in green, field-level changes as before → after, removals
struck through. Nothing has touched the domain tables. An agent can propose a
sprint and the twelve tasks that belong in it as one unit, using local `ref`
ids that are resolved to real primary keys only at apply time.

**3. The human decides, and the agent hears the answer.**
`apply_pending_changes` opens the diff and **blocks** — the tool call's promise
stays open while the person reads it. Approve applies the whole change set in a
single Postgres transaction and the tool resolves with what landed. Reject
resolves with the reason they typed. The agent gets a real answer from a real
person, in-band, as a tool result.

That last move is the part that is hard to fake. It turns a WebMCP tool call
from a command into a request, and it means the agent can be genuinely useful —
proposing whole plans, not timid one-row edits — without ever being trusted
with the write.

### Why it matters

The gap between "an agent that can act" and "an agent you'd let act on the
thing you get paid for" is entirely about review. Sprintfy is a small argument
that the reviewable-proposal pattern belongs in the page, not in the model:
the site knows what a legitimate change to itself looks like, so the site is
what should render the diff and hold the gate. Any agent — any model, any
vendor — inherits that safety by using the tools.

### The WebMCP implementation

Six tools inside a project (`get_project_context`, `propose_plan`,
`propose_changes`, `apply_pending_changes`, `discard_pending_changes`,
`focus`), plus page-scoped sets on the landing and project-list pages — the
tool surface changes as the human navigates, which is what `toolchange` is for.

Details worth a judge's time:

- **Surface detection.** The API moved during the spec's life and shipping
  browsers do not agree yet. One adapter registers against
  `document.modelContext.registerTool`, `navigator.modelContext.registerTool`,
  or `navigator.modelContext.provideContext`, whichever exists. The header
  badge shows which one was found and lists the live tools.
- **Cancellation is honoured.** The `AbortSignal` passed to
  `apply_pending_changes` releases the human-approval wait, so an agent that
  walks away does not leave the page stuck on a modal.
- **Tools never throw at the browser.** Failures come back as text the agent
  can read and recover from — including "these task ids don't exist in this
  project, call get_project_context again".
- **Registration is stable.** Tools close over live React state through a ref
  instead of re-registering on every render, so the browser's tool list does
  not churn.
- **`focus` gives the agent a body.** It can switch the human's view, select a
  sprint, filter the board, or draw a highlight ring around the one task it is
  talking about.

### It is tested, and you can run the tests

`/evals.js` is a seven-scenario suite that drives the *actual* `ToolDescriptor`
objects the page registered — `window.__webmcp` hands back the same objects
WebMCP received — so a pass means an agent calling that tool with that input
gets that result. It runs against the live site, in the console, with no
account:

```js
const s = await fetch('/evals.js').then(r => r.text()); (0,eval)(s);
await SprintfyEvals.run()
```

Seven of seven pass in production. They assert the invariants rather than the
happy path: a proposal writes zero rows and is visible to the very next call;
a human's rejection arrives as the tool's return value; approval applies a
sprint and its tasks in one transaction with `ref` ids resolved; hallucinated
ids are refused outright rather than half-applied; and `focus` moves the view
with `get_project_context` reporting it in the same tick.

Two of these scenarios exist because they caught real bugs — an agent could
not always see the proposal it had just written, and `focus` moved the view
without the context reporting it. Both were React committing state after the
tool call had already read it.

### Security

Every table is under row-level security scoped to `auth.uid()`. The apply
function is `security invoker`, so RLS guards each write it performs — an agent
cannot use it to reach another user's project. The browser only ever holds the
publishable key. WebMCP tools run inside the authenticated session and inherit
the human's permissions, never more.

### Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth,
Realtime) · WebMCP · deployed on Vercel

---

## How to try it (put this near the top of the Devpost entry)

**https://sprintfy.vercel.app**

Open it in **desktop Chrome with `chrome://flags/#enable-webmcp-testing`
enabled**, or in Chrome with the ChatGPT extension installed. That is the
surface this was built and verified on. ChatGPT's *in-app* browser does not
expose `document.modelContext` today, so the page will honestly report WebMCP
as off there — it is not the tools being broken.

**No account is needed to see the whole idea.** The landing page registers
four tools before you sign in; ask your agent for `start_guided_demo`, or
press "Show me a demo", and you land in a real workspace with a proposal
waiting in the review panel and six tools live. Signing up is email and
password, with no confirmation step.

## Submission checklist

- [x] Live URL — https://sprintfy.vercel.app
- [x] Public repo with source, instructions and an OSI license (MIT)
- [x] Seven of seven evals passing against production
- [ ] Demo video under 3 minutes, on YouTube, public
- [ ] Text description (this document)
