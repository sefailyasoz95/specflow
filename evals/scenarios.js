/* ------------------------------------------------------------------ *
 * SpecFlow tool evals
 *
 * Paste into the DevTools console on an open project page, then:
 *
 *   await SpecFlowEvals.run()
 *
 * It drives the exact ToolDescriptors the page registers with WebMCP —
 * `window.__webmcp` hands back the same objects `registerTool` received —
 * so a pass here means an agent calling the same tool with the same input
 * gets the same result. Works with or without the browser flag.
 * ------------------------------------------------------------------ */

(() => {
  const bridge = () => {
    const b = window.__webmcp;
    if (!b) throw new Error("No __webmcp bridge — open a project page first.");
    return b;
  };

  const text = (result) =>
    typeof result === "string"
      ? result
      : (result?.content ?? []).map((c) => c.text).join("\n");

  const call = async (name, input = {}) => text(await bridge().call(name, input));
  const context = async () => JSON.parse(await call("get_project_context"));

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Click the Approve / Reject button in the modal the agent just opened. */
  async function humanClicks(which, { timeout = 5000 } = {}) {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) {
        const button = [...dialog.querySelectorAll("button")].find((b) =>
          which === "approve"
            ? /^Approve/.test(b.textContent.trim())
            : /^Reject$/.test(b.textContent.trim())
        );
        if (button) {
          button.click();
          // Reject is a two-step control: it reveals a reason field first.
          if (which === "reject") {
            await sleep(120);
            const again = [...document.querySelectorAll('[role="dialog"] button')].find(
              (b) => /^Reject$/.test(b.textContent.trim())
            );
            again?.click();
          }
          return true;
        }
      }
      await sleep(100);
    }
    throw new Error(`Approval dialog never appeared (waiting to ${which})`);
  }

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
        if (thin.length) {
          throw new Error(`thin descriptions: ${thin.map((t) => t.name)}`);
        }
        return `${names.length} tools registered`;
      },
    },

    {
      name: "context reports the human's live view, not just the data",
      async run() {
        await call("focus", { view: "sprints" });
        const ctx = await context();
        if (ctx.humanIsLookingAt?.view !== "sprints") {
          throw new Error(
            `focus did not move the view — got ${ctx.humanIsLookingAt?.view}`
          );
        }
        await call("focus", { view: "board" });
        return "focus moves the view and context reports it";
      },
    },

    {
      name: "a proposal writes nothing until it is approved",
      async run() {
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
          throw new Error("propose_plan wrote to the project — the gate leaks");
        }
        if (!after.pendingChangeSets?.length) {
          throw new Error("no pending change set was created");
        }
        return "0 rows written, 1 change set pending";
      },
    },

    {
      name: "rejection reaches the agent as a tool result",
      async run() {
        const pending = humanClicks("reject");
        const result = await call("apply_pending_changes", {
          note: "Eval: this one should be rejected.",
        });
        await pending;
        if (!/Rejected/i.test(result)) {
          throw new Error(`expected a rejection, got: ${result}`);
        }
        const ctx = await context();
        if (ctx.pendingChangeSets?.length) {
          throw new Error("rejected change set is still pending");
        }
        return result.slice(0, 80);
      },
    },

    {
      name: "approval applies the whole change set atomically",
      async run() {
        const before = await context();
        await call("propose_plan", {
          title: "[eval] plan to approve",
          summary: "Sprint plus its tasks, as one unit.",
          requirements: [
            { ref: "r1", title: "[eval] requirement", priority: "high" },
          ],
          sprints: [{ ref: "s1", name: "[eval] Sprint 1", goal: "ship it" }],
          tasks: [
            { title: "[eval] wired task", sprintRef: "s1", requirementRef: "r1", estimateHours: 8 },
            { title: "[eval] second task", sprintRef: "s1", estimateHours: 2 },
          ],
        });

        const clicking = humanClicks("approve");
        const result = await call("apply_pending_changes");
        await clicking;

        if (!/Approved/i.test(result)) {
          throw new Error(`expected approval, got: ${result}`);
        }

        const after = await context();
        if (after.totals.tasks !== before.totals.tasks + 2) {
          throw new Error(
            `expected 2 new tasks, went ${before.totals.tasks} → ${after.totals.tasks}`
          );
        }
        const sprint = after.sprints.find((s) => s.name === "[eval] Sprint 1");
        if (!sprint) throw new Error("sprint was not created");

        // The point of tempId refs: tasks landed in the sprint created in
        // the same change set.
        const wired = after.tasks.filter((t) => t.sprintId === sprint.id);
        if (wired.length !== 2) {
          throw new Error(`tempId refs did not resolve — ${wired.length}/2 tasks wired`);
        }
        return "sprint + 2 tasks applied, refs resolved";
      },
    },

    {
      name: "unknown task ids are refused, not silently proposed",
      async run() {
        const result = await call("propose_changes", {
          title: "[eval] bad ids",
          updateTasks: [
            { taskId: "00000000-0000-0000-0000-000000000000", status: "done" },
          ],
        });
        if (!/do not exist/i.test(result)) {
          throw new Error(`expected a validation error, got: ${result}`);
        }
        return "rejected with a recoverable message";
      },
    },

    {
      name: "apply with nothing pending is a message, not a throw",
      async run() {
        const result = await call("apply_pending_changes");
        if (!/no pending/i.test(result)) {
          throw new Error(`unexpected: ${result}`);
        }
        return result.slice(0, 60);
      },
    },
  ];

  async function run({ only } = {}) {
    const chosen = only
      ? SCENARIOS.filter((s) => s.name.includes(only))
      : SCENARIOS;
    const results = [];

    for (const scenario of chosen) {
      const started = performance.now();
      try {
        const detail = await scenario.run();
        results.push({
          scenario: scenario.name,
          pass: true,
          detail,
          ms: Math.round(performance.now() - started),
        });
      } catch (error) {
        results.push({
          scenario: scenario.name,
          pass: false,
          detail: error.message,
          ms: Math.round(performance.now() - started),
        });
      }
    }

    console.table(results);
    const failed = results.filter((r) => !r.pass);
    console.log(
      failed.length
        ? `%c${failed.length}/${results.length} failed`
        : `%c${results.length}/${results.length} passed`,
      `color:${failed.length ? "#f4566a" : "#3fbf7f"};font-weight:600`
    );
    console.log("Clean up the [eval] rows by hand when you are done.");
    return results;
  }

  window.SpecFlowEvals = { run, call, context, SCENARIOS };
  console.log(
    "%cSpecFlowEvals ready — await SpecFlowEvals.run()",
    "color:#ff6b35;font-weight:600"
  );
})();
