# Tool evals

Seven scenarios that drive the page's real `ToolDescriptor`s — the same
objects handed to `registerTool` — through `window.__webmcp`. They run with or
without the Chrome flag, which makes them useful in CI-less situations and on
any machine a judge happens to have.

## Running

The suite is served with the app, so it runs against any deployment —
including the live one — without a checkout:

```js
const s = await fetch('/evals.js').then(r => r.text()); (0,eval)(s);
await SpecFlowEvals.run();
```

`SpecFlowEvals.run({ only: "approval" })` filters by scenario name. Try it
on `/preview`, where the whole loop runs in memory and there is nothing to
clean up afterwards.

## What they check

| Scenario | The property it protects |
| --- | --- |
| tools are registered and self-describing | The surface exists and no tool ships a description too thin for a model to route on. |
| focus moves the view and context reports it, in the same tick | `focus` really moves the human's screen, and `get_project_context` reports it back — without lagging a render behind. Two tool calls can land in one tick. |
| a proposal writes nothing, and is visible to the very next call | **The core invariant**, plus the one that nearly broke the demo: an agent must be able to find the proposal it just wrote. |
| rejection reaches the agent | A human "no" comes back as the tool's return value, not a swallowed error. |
| approval applies atomically | The whole change set lands, and `tempId` refs resolve so tasks end up inside the sprint created in the same call. |
| unknown task ids are refused | Bad ids come back as a message the agent can recover from, rather than a half-applied change set. |
| apply with nothing pending | Empty state is a sentence, not an exception. |

The scenarios create rows prefixed `[eval]`. Delete them by hand, or run them
in a scratch project.
