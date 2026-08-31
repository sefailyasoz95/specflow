/* ------------------------------------------------------------------ *
 * SpecFlow tool evals
 *
 * On any project page (or /preview), open the console and run:
 *
 *   const s = await fetch('/evals.js').then(r => r.text()); (0,eval)(s);
 *   await SpecFlowEvals.run()
 *
 * It drives the exact ToolDescriptors the page registers with WebMCP —
 * `window.__webmcp` hands back the same objects `registerTool` received —
 * so a pass here means an agent calling the same tool with the same input
 * gets the same result. Works with or without the browser flag.
 *
 * The scenarios that matter are the invariants: a proposal must write
 * nothing, and a human's answer must reach the agent as the tool's return
 * value. Everything else is detail.
 * ------------------------------------------------------------------ */

(() => {
  const bridge = () => {
    const b = window.__webmcp;
    if (!b) throw new Error("No __webmcp bridge — open a project page first.");
    return b;
  };

  const text = (r) =>
    typeof r === "string" ? r : (r?.content ?? []).map((c) => c.text).join("\n");
  const call = async (name, input = {}) => text(await bridge().call(name, input));
  const context = async () => JSON.parse(await call("get_project_context"));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /**
   * Click Approve or Reject in the sheet the agent just opened.
   *
   * Reject is a two-step control: the first click reveals the reason
   * field, the second commits. React needs a beat in between — with too
   * short a gap both clicks land on the first step, the tool never
   * resolves, and the run hangs.
   */
  async function humanClicks(which, { timeout = 6000 } = {}) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) {
        const find = () =>
          [...document.querySelectorAll('[role="dialog"] button')].find((b) =>
            which === "approve"
              ? /^Approve/.test(b.textContent.trim())
              : b.textContent.trim() === "Reject"
          );
        find()?.click();
        if (which === "reject") {
          await sleep(350);
          find()?.click();
        }
        return true;
      }
      await sleep(60);
    }
    throw new Error(`the approval sheet never appeared (waiting to ${which})`);
  }

  /** Never let a failed drive hang the run on a five-minute approval wait. */
  const answered = (promise, ms = 10000) =>
    Promise.race([promise, sleep(ms).then(() => "TIMED OUT")]);

  const SCENARIOS = [
    {
      name: "tools are registered and self-describing",
      async run() {
        const tools = bridge().list();
        const names = tools.map((t) => t.name);
        for (const required of [
          "get_project_context",
          "propose_plan",
          "propose_changes",
          "apply_pending_changes",
          "discard_pending_changes",
          "focus",
        ]) {
          if (!names.includes(required)) throw new Error(`missing ${required}`);
        }
        const thin = tools.filter((t) => (t.description ?? "").length < 40);
        if (thin.length) throw new Error(`thin descriptions: ${thin.map((t) => t.name)}`);
        return `${names.length} tools registered`;
      },
    },

    {
      name: "focus moves the view and context reports it, in the same tick",
      async run() {
        await call("focus", { view: "sprints" });
        let ctx = await context();
        if (ctx.humanIsLookingAt?.view !== "sprints") {
          throw new Error(`stale view: ${ctx.humanIsLookingAt?.view}`);
        }
        await call("focus", { view: "requirements", statusFilter: "todo" });
        ctx = await context();
        if (ctx.humanIsLookingAt?.statusFilter !== "todo") {
          throw new Error(`stale filter: ${ctx.humanIsLookingAt?.statusFilter}`);
        }
        await call("focus", { view: "board" });
        return "shared context is current, not one render behind";
      },
    },

    {
      name: "a proposal writes nothing, and is visible to the very next call",
      async run() {
        await call("discard_pending_changes");
        const before = await context();
        await call("propose_plan", {
          title: "[eval] throwaway plan",
          summary: "Created by the eval suite.",
          sprints: [{ ref: "s1", name: "[eval] Sprint", goal: "prove the gate" }],
          tasks: [
            { title: "[eval] task A", sprintRef: "s1", estimateHours: 3 },
            { title: "[eval] task B", sprintRef: "s1", estimateHours: 5 },
          ],
        });
        const after = await context();
        if (after.totals.tasks !== before.totals.tasks) {
          throw new Error("THE GATE LEAKS — propose_plan wrote to the project");
        }
        if (after.pendingChangeSets?.length !== 1) {
          throw new Error(
            `the agent cannot see the proposal it just wrote (${after.pendingChangeSets?.length} pending)`
          );
        }
        return "0 rows written, 1 change set pending";
      },
    },

    {
      name: "a rejection reaches the agent as the tool's return value",
      async run() {
        const before = await context();
        const driving = humanClicks("reject");
        const result = await answered(
          call("apply_pending_changes", { note: "Eval: reject this one." })
        );
        await driving;
        if (!/Rejected/i.test(result)) throw new Error(`got: ${result.slice(0, 90)}`);
        const after = await context();
        if (after.totals.tasks !== before.totals.tasks) {
          throw new Error("rejected, but rows were written anyway");
        }
        if (after.pendingChangeSets?.length) throw new Error("still pending after reject");
        return result.slice(0, 70);
      },
    },

    {
      name: "approval applies the whole change set, and tempId refs resolve",
      async run() {
        const before = await context();
        await call("propose_plan", {
          title: "[eval] plan to approve",
          summary: "A sprint and its tasks, as one unit.",
          requirements: [{ ref: "r1", title: "[eval] requirement", priority: "high" }],
          sprints: [{ ref: "s1", name: "[eval] Sprint 1", goal: "ship it" }],
          tasks: [
            { title: "[eval] wired task", sprintRef: "s1", requirementRef: "r1", estimateHours: 8 },
            { title: "[eval] second task", sprintRef: "s1", estimateHours: 2 },
          ],
        });

        const driving = humanClicks("approve");
        const result = await answered(call("apply_pending_changes"));
        await driving;
        if (!/Approved/i.test(result)) throw new Error(`got: ${result.slice(0, 90)}`);

        const after = await context();
        if (after.totals.tasks !== before.totals.tasks + 2) {
          throw new Error(`expected 2 new tasks, went ${before.totals.tasks} → ${after.totals.tasks}`);
        }
        const sprint = after.sprints.find((s) => s.name === "[eval] Sprint 1");
        if (!sprint) throw new Error("the sprint was not created");
        const wired = after.tasks.filter((t) => t.sprintId === sprint.id);
        if (wired.length !== 2) {
          throw new Error(`tempId refs did not resolve — ${wired.length}/2 tasks wired`);
        }
        return "sprint + 2 tasks applied, refs resolved";
      },
    },

    {
      name: "hallucinated ids are refused, not half-proposed",
      async run() {
        const result = await call("propose_changes", {
          title: "[eval] bad ids",
          updateTasks: [
            { taskId: "00000000-0000-0000-0000-000000000000", status: "done" },
          ],
        });
        if (!/do not exist/i.test(result)) throw new Error(`got: ${result.slice(0, 90)}`);
        return "refused with a message the agent can recover from";
      },
    },

    {
      name: "applying with nothing pending is a sentence, not an exception",
      async run() {
        const result = await call("apply_pending_changes");
        if (!/no pending/i.test(result)) throw new Error(`got: ${result.slice(0, 90)}`);
        return result.slice(0, 60);
      },
    },
  ];

  async function run({ only } = {}) {
    const chosen = only ? SCENARIOS.filter((s) => s.name.includes(only)) : SCENARIOS;
    const results = [];

    for (const scenario of chosen) {
      const started = performance.now();
      try {
        const detail = await scenario.run();
        results.push({ scenario: scenario.name, pass: true, detail, ms: Math.round(performance.now() - started) });
      } catch (error) {
        results.push({ scenario: scenario.name, pass: false, detail: error.message, ms: Math.round(performance.now() - started) });
      }
    }

    console.table(results);
    const failed = results.filter((r) => !r.pass);
    console.log(
      `%c${results.length - failed.length}/${results.length} passed`,
      `color:${failed.length ? "#a4241b" : "#12704f"};font-weight:600`
    );
    console.log('Rows prefixed "[eval]" are left behind — run this in a scratch project.');
    return results;
  }

  window.SpecFlowEvals = { run, call, context, SCENARIOS };
  console.log(
    "%cSpecFlowEvals ready — await SpecFlowEvals.run()",
    "color:#e0a32e;font-weight:600"
  );
})();
