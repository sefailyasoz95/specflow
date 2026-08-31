import { z } from "zod";

/* ------------------------------------------------------------------ *
 * One schema, two authors
 *
 * A plan can be written by the visitor's own agent, through the
 * `propose_plan` WebMCP tool, or by Sprintfy's server-side model when
 * someone hands it a brief or a PRD. Both must produce exactly the same
 * shape, because both land in exactly the same place: a change set the
 * human approves.
 *
 * So the shape is defined once, here, in Zod. The tool's `inputSchema`
 * is derived from it with `z.toJSONSchema`, and OpenAI's strict
 * structured output is derived from it with `zodTextFormat`. There is no
 * second copy to drift.
 *
 * Note the use of `.nullable()` rather than `.optional()` throughout:
 * OpenAI's strict mode requires every property to be present in
 * `required`, so "no value" is expressed as null, not as absence.
 * ------------------------------------------------------------------ */

export const PriorityEnum = z.enum(["low", "medium", "high", "critical"]);
export const TaskStatusEnum = z.enum(["backlog", "todo", "in_progress", "done"]);

const isoDate = z
  .string()
  .describe("ISO date, YYYY-MM-DD.")
  .nullable();

export const RequirementDraft = z.object({
  ref: z
    .string()
    .describe("Local id used to link tasks to this requirement, e.g. 'r1'."),
  title: z.string().describe("What the system must do."),
  description: z
    .string()
    .describe("Detail, acceptance criteria, constraints.")
    .nullable(),
  priority: PriorityEnum,
});

export const SprintDraft = z.object({
  ref: z
    .string()
    .describe("Local id used to place tasks in this sprint, e.g. 's1'."),
  name: z.string().describe("Sprint name, e.g. 'Sprint 1 — Foundation'."),
  goal: z
    .string()
    .describe("The one outcome this sprint must deliver.")
    .nullable(),
  startDate: isoDate,
  endDate: isoDate,
});

export const TaskDraft = z.object({
  title: z.string().describe("Imperative, concrete, one deliverable."),
  description: z.string().describe("Implementation notes.").nullable(),
  sprintRef: z
    .string()
    .describe("`ref` of a sprint above, or null for the backlog.")
    .nullable(),
  requirementRef: z
    .string()
    .describe("`ref` of a requirement above, or null.")
    .nullable(),
  estimateHours: z
    .number()
    .describe("Effort estimate in hours.")
    .nullable(),
  status: TaskStatusEnum,
});

/** What the model returns when it reads a brief or a PRD. */
export const GeneratedPlan = z.object({
  usable: z
    .boolean()
    .describe(
      "True only if the text is a real description of software to be built. False for filler, a single repeated phrase, lorem ipsum, a question, or a document about something other than a software project."
    ),
  rejection: z
    .string()
    .describe(
      "When usable is false: one or two sentences, addressed to the person, saying what the text is missing. No apology, no preamble. Null when usable is true."
    )
    .nullable(),
  projectName: z
    .string()
    .describe("A short, concrete name for the project, drawn from the brief."),
  projectSummary: z
    .string()
    .describe("One or two sentences on what this project is."),
  reasoning: z
    .string()
    .describe(
      "Why the plan is shaped this way — sequencing decisions, what was put first and why. Shown to the human above the diff."
    ),
  requirements: z.array(RequirementDraft),
  sprints: z.array(SprintDraft),
  tasks: z.array(TaskDraft),
});

export type GeneratedPlan = z.infer<typeof GeneratedPlan>;

/**
 * Cheap pre-check before spending a model call. Catches the degenerate
 * cases — a phrase pasted six times, a keyboard mash — without trying to
 * judge whether a genuine brief is any good. That judgement is the
 * model's, and it makes it in the same call that does the planning.
 */
export function looksLikeFiller(brief: string): boolean {
  const words = brief.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
  if (words.length < 8) return true;
  const unique = new Set(words);
  if (unique.size < 8) return true;
  // "Tech stack Tech stack Tech stack" — many words, almost no variety.
  return unique.size / words.length < 0.25;
}

/** What an agent passes to the `propose_plan` tool. */
export const ProposePlanInput = z.object({
  title: z
    .string()
    .describe("Short name for this plan, e.g. 'Initial plan for checkout rework'."),
  summary: z
    .string()
    .describe("One or two sentences on the reasoning behind the plan.")
    .nullable(),
  requirements: z.array(RequirementDraft),
  sprints: z.array(SprintDraft),
  tasks: z.array(TaskDraft),
});

export type ProposePlanInput = z.infer<typeof ProposePlanInput>;

/** The tool's `inputSchema`, derived rather than hand-written. */
export function proposePlanJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(ProposePlanInput, { target: "draft-7" }) as Record<
    string,
    unknown
  >;
}
