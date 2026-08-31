# SpecFlow

**Plan software with your agent, not for it.**

SpecFlow turns a rough brief into a structured project plan — requirements,
sprints, tasks, effort estimates — inside the same workspace a human project
manager uses. It exposes that workspace to AI agents over
[WebMCP](https://github.com/webmachinelearning/webmcp).

Built for the [WebMCP Challenge](https://webmcp.devpost.com/).

---

## The idea: agents propose, humans dispose

Most "agent-ready" apps expose CRUD tools and let the model write straight to
the database. That works right up until the model is confidently wrong about
your sprint plan — and then you are archaeology-ing through a project board
trying to work out what it touched.

SpecFlow inverts it. **No agent tool writes to the plan.**

1. **The agent reads the room.** `get_project_context` returns the plan *and*
   what the human is currently looking at — active view, selected sprint,
   status filter, open proposal. The agent plans into context, not a vacuum.

2. **The agent proposes a diff.** Every write tool authors a *change set*: an
   ordered list of operations stored as JSON. It renders in the review panel
   as a real diff — additions, field-level changes, removals. Nothing has
   touched the domain tables yet.

3. **The human decides, and the agent hears the answer.**
   `apply_pending_changes` opens the diff and **blocks** until the human clicks
   Approve or Reject. The tool's promise resolves with their decision — and,
   on a rejection, with the reason they typed. That is a real handshake over
   WebMCP, not a fire-and-forget call.

Applying a change set runs `apply_change_set(uuid)` in Postgres: one
transaction, all-or-nothing, with `tempId` references inside the change set
resolved as rows are inserted — so an agent can propose a sprint and the twelve
tasks that belong to it in a single reviewable unit.

---

## Tool surface

Tools are **page-scoped** — the set changes as the human navigates, which is
what `toolchange` in the spec is for.

### On `/` (landing)

| Tool | |
| --- | --- |
| `about_specflow` | What this site is and where to sign in. An agent that lands here can ask, instead of scraping the DOM. |

### On `/projects`

| Tool | |
| --- | --- |
| `list_projects` | The user's projects with ids and URLs. |
| `create_project` | Create a project and open it. |

### Inside a project

| Tool | Kind | |
| --- | --- | --- |
| `get_project_context` | read | Requirements, sprints, tasks, estimates, pending proposals, and the human's live view. |
| `propose_plan` | propose | Rough brief → requirements + sprints + tasks + estimates, as one diff. Uses local `ref` ids to wire tasks to the sprints it is creating in the same call. |
| `propose_task_changes` | propose | Create, retitle, re-estimate, re-status, move between sprints, delete. Validates task ids against the project before proposing. |
| `apply_pending_changes` | handoff | Opens the diff and waits for the human. Returns their decision. |
| `discard_pending_changes` | handoff | Withdraw a proposal that missed. |
| `focus` | point | Switch view, select a sprint, filter, or ring one task/sprint/requirement while talking about it. |

---

## Notes on the WebMCP integration

The API surface moved during the spec's life and shipping browsers do not all
agree yet. `src/webmcp/registry.ts` detects what is present and speaks it:

```
document.modelContext.registerTool(descriptor, { signal })   ← current spec
navigator.modelContext.registerTool(descriptor)              ← earlier
navigator.modelContext.provideContext({ tools: [...] })      ← earliest
```

Everything above that file is written against a single `ToolDescriptor` type.
The header badge shows which surface was detected and lists the live tools —
useful when demoing, and honest when WebMCP is simply off.

Other details worth knowing:

- **`execute` never throws at the browser.** Failures are returned as text so
  the agent can read the error and recover.
- **Tools register once.** They close over React state via a ref, so the tool
  list does not churn on every render.
- **The `AbortSignal`** the browser hands `apply_pending_changes` cancels the
  wait, so an agent that walks away does not leave the page stuck.

---

## Running it

```bash
npm install
cp .env.example .env.local     # fill in your Supabase project
npm run dev
```

`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

Then run `supabase/schema.sql` in the Supabase SQL editor (or
`supabase/migrations/*.sql` in order). It creates the tables, the RLS policies,
and the `apply_change_set` function.

### Turning WebMCP on

Open SpecFlow in ChatGPT's browser, or in Chrome:

1. `chrome://flags/#enable-webmcp-testing` → **Enabled**
2. Relaunch Chrome
3. Reload SpecFlow — the header badge turns orange and lists the live tools

---

## Security

- Every table is under row-level security scoped to `auth.uid()`; a user can
  only ever see and write their own projects.
- `apply_change_set` is `security invoker`, so RLS still guards every insert
  and update it performs. An agent cannot use it to reach another user's data.
- The browser only ever holds the publishable key. The secret key is
  server-side and is not referenced from any client component.
- WebMCP tools run inside the authenticated browser session — they inherit the
  human's permissions and nothing more.

---

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth,
Realtime) · WebMCP

## License

MIT — see [LICENSE](./LICENSE).
