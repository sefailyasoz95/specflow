# Tool evals

Seven scenarios that drive the page's real `ToolDescriptor`s — the same
objects handed to `registerTool` — through `window.__webmcp`. They run with or
without the Chrome flag, which makes them useful in CI-less situations and on
any machine a judge happens to have.

## Running

1. Open a project page.
2. Paste `scenarios.js` into the DevTools console.
3. `await SpecFlowEvals.run()`

`SpecFlowEvals.run({ only: "approval" })` filters by scenario name.

## What they check

| Scenario | The property it protects |
| --- | --- |
| tools are registered and self-describing | The surface exists and no tool ships a description too thin for a model to route on. |
| context reports the human's live view | `focus` really moves the human's screen, and `get_project_context` reports it back — the two halves of shared context. |
| a proposal writes nothing until approved | **The core invariant.** `propose_plan` must not change a single row. |
| rejection reaches the agent | A human "no" comes back as the tool's return value, not a swallowed error. |
| approval applies atomically | The whole change set lands, and `tempId` refs resolve so tasks end up inside the sprint created in the same call. |
| unknown task ids are refused | Bad ids come back as a message the agent can recover from, rather than a half-applied change set. |
| apply with nothing pending | Empty state is a sentence, not an exception. |

The scenarios create rows prefixed `[eval]`. Delete them by hand, or run them
in a scratch project.
