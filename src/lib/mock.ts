import type { ChangeSet, Op, Project, Requirement, Sprint, Task } from "./types";

const uid = (n: number) => `0000000${n}`.slice(-8) + "-0000-4000-8000-000000000000";
const now = new Date().toISOString();

const project: Project = {
  id: uid(1),
  owner_id: uid(99),
  name: "Checkout rework",
  description: "Single-page checkout, guest flow, payment idempotency.",
  tech_stack: ["Next.js", "TypeScript", "Stripe", "Postgres"],
  start_date: null,
  end_date: null,
  sprint_length: "2_weeks",
  created_at: now,
};

const requirements: Requirement[] = [
  ["REQ-001", "Payment calls must be idempotent", "A double-click cannot create two orders. Key on the client-generated attempt id.", "critical"],
  ["REQ-002", "Guest checkout without an account", "Email plus shipping address is enough to complete an order.", "high"],
  ["REQ-003", "Promo codes validate before payment", "Show the discounted total before the pay button is enabled.", "high"],
  ["REQ-004", "Saved cards for signed-in shoppers", "Stripe customer, card on file, one-tap reuse.", "medium"],
  ["REQ-005", "Apple Pay and Google Pay", "Wallet buttons above the card form, feature-detected.", "medium"],
].map(([code, title, description, priority], i) => ({
  id: uid(10 + i),
  project_id: project.id,
  code: code as string,
  title: title as string,
  description: description as string,
  priority: priority as Requirement["priority"],
  status: i === 0 ? "approved" : "draft",
  position: i + 1,
  created_at: now,
}));

const sprints: Sprint[] = [
  ["Sprint 1 — Stop the bleeding", "Idempotent payments in production.", "active"],
  ["Sprint 2 — One page", "Collapse three steps into one, guest path included.", "planned"],
  ["Sprint 3 — Wallets and saved cards", "Wallet buttons and card reuse behind a flag.", "planned"],
].map(([name, goal, status], i) => ({
  id: uid(20 + i),
  project_id: project.id,
  name: name as string,
  goal: goal as string,
  position: i + 1,
  status: status as Sprint["status"],
  start_date: null,
  end_date: null,
  created_at: now,
}));

const T = (
  i: number,
  title: string,
  sprint: number | null,
  status: Task["status"],
  est: number | null,
  req: number | null = null
): Task => ({
  id: uid(30 + i),
  project_id: project.id,
  sprint_id: sprint === null ? null : sprints[sprint].id,
  requirement_id: req === null ? null : requirements[req].id,
  title,
  description: null,
  status,
  estimate_hours: est,
  position: i + 1,
  created_at: now,
});

const tasks: Task[] = [
  T(0, "Generate an attempt id on the client and send it with every pay call", 0, "done", 4, 0),
  T(1, "Add an idempotency key to the Stripe PaymentIntent call", 0, "done", 3, 0),
  T(2, "Dedupe orders server-side on attempt id", 0, "in_progress", 6, 0),
  T(3, "Backfill: reconcile the 14 duplicate orders from last month", 0, "todo", 5, 0),
  T(4, "Alert when two intents share an attempt id", 0, "todo", 2, 0),
  T(5, "Collapse the three checkout steps into one route", 1, "todo", 12, 1),
  T(6, "Guest email capture with inline validation", 1, "todo", 6, 1),
  T(7, "Shipping address form with autocomplete", 1, "backlog", 8, 1),
  T(8, "Promo code field with pre-payment validation", 1, "backlog", 7, 2),
  T(9, "Order summary that updates as the cart changes", 1, "backlog", 5, null),
  T(10, "Wallet button row, feature-detected", 2, "backlog", 6, 4),
  T(11, "Apple Pay merchant validation endpoint", 2, "backlog", 4, 4),
  T(12, "Store and list saved cards per Stripe customer", 2, "backlog", 8, 3),
  T(13, "Delete the old three-step checkout routes", null, "backlog", null, null),
  T(14, "Write the migration runbook for the payments team", null, "backlog", 3, null),
];

/** A proposal shaped like one an agent would actually make. */
export const mockProposalOps: Op[] = [
  {
    op: "create_sprint",
    tempId: "s0",
    name: "Sprint 0 — Instrument first",
    goal: "Know the drop-off rate per step before changing anything.",
  },
  {
    op: "create_task",
    title: "Add funnel events for each checkout step",
    sprintRef: "s0",
    estimateHours: 4,
  },
  {
    op: "create_task",
    title: "Dashboard: drop-off by step, last 30 days",
    sprintRef: "s0",
    estimateHours: 3,
  },
  {
    op: "create_requirement",
    tempId: "r0",
    title: "Checkout drop-off is measurable per step",
    description: "You cannot claim the rework worked without a baseline.",
    priority: "high",
  },
  { op: "update_task", taskId: uid(33), status: "in_progress", estimateHours: 8 },
  { op: "update_task", taskId: uid(35), sprintRef: uid(20) },
  {
    op: "update_sprint",
    sprintId: uid(21),
    goal: "Collapse three steps into one, guest path included, behind a flag.",
  },
  { op: "delete_task", taskId: uid(43) },
];

const changeSets: ChangeSet[] = [
  {
    id: uid(60),
    project_id: project.id,
    title: "Measure before rebuilding",
    summary:
      "The brief says drop-off is around 40% but nothing records it per step. I put a short instrumentation sprint in front, moved the route collapse forward, and dropped the route-deletion task — it belongs to the flag rollout, not here.",
    source: "agent",
    status: "pending",
    operations: mockProposalOps,
    created_at: now,
    resolved_at: null,
  },
  {
    id: uid(61),
    project_id: project.id,
    title: "Estimate the idempotency work",
    summary: "Filled in the five missing estimates on sprint 1.",
    source: "agent",
    status: "applied",
    operations: [],
    created_at: now,
    resolved_at: now,
  },
];

export const mockSnapshot = { project, requirements, sprints, tasks, changeSets };
