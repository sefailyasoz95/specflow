import { NextResponse } from "next/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { createClient } from "@/lib/supabase/server";
import { GeneratedPlan, looksLikeFiller } from "@/lib/plan-schema";
import { BriefError, briefForPrompt, extractBriefText } from "@/lib/extract-text";
import { checkPlanRate, recordPlanRun } from "@/lib/rate-limit";
import type { Op, Project } from "@/lib/types";

/* pdf-parse and mammoth are Node libraries, and a model call is not a
   two-second job. */
export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = process.env.OPENAI_PLANNING_MODEL ?? "gpt-5.6";

/* A ceiling on the other half of the bill. The largest plan this has
   produced in practice — 8 requirements, 4 sprints, 38 tasks — lands well
   under this, so the cap is not a quality limit; it is the difference
   between a bad day and an unbounded one. A response that hits it comes
   back marked incomplete, and is reported as such rather than parsed. */
const MAX_OUTPUT_TOKENS = 16_000;

const SYSTEM = `You are a delivery lead who has shipped a lot of software and has watched a lot of plans fail. You turn a brief into a plan a small team could actually start on Monday.

How you work:

- Sequence by risk, not by comfort. Whatever is most likely to be wrong, most likely to block everything else, or most expensive to discover late goes first. If the brief names something already costing the business money, that is sprint one.
- Say what a sprint is FOR. A sprint goal is one outcome, not a list of the tasks inside it.
- Write tasks a person could pick up and finish. Imperative, concrete, one deliverable each. "Add an idempotency key to the Stripe PaymentIntent call", not "Payments work".
- Estimate in hours, and estimate honestly. Include the unglamorous work — migration, backfill, rollout behind a flag, the runbook. Plans fail because that work was invisible, not because the features were hard.
- Respect the stated tech stack and constraints. Do not propose a rewrite nobody asked for, and do not introduce a technology the brief did not mention.
- Respect the stated non-goals. If the brief says something is out of scope, it does not appear in the plan.
- Requirements are what the system must do; tasks are how. Link tasks to the requirement they serve.
- If the brief is thin, say so in your reasoning and make the first sprint the one that resolves the unknowns, rather than inventing detail that is not there.

Before planning, judge the brief. If it is not a description of software to be built — filler, one phrase repeated, lorem ipsum, a question, notes about something else entirely — set usable to false, write one or two plain sentences in rejection saying what is missing, and return empty arrays. Do not invent a project in order to be helpful. A thin but genuine brief IS usable: you handle that by making the first sprint resolve the unknowns and saying so in your reasoning.

Write in the same language as the brief. If the brief is in Turkish, the plan is in Turkish.

Your reasoning field is read by a human before they approve the plan. Tell them what you put first and why, and what you deliberately left out. Two or three sentences, no preamble.`;

function buildOperations(plan: GeneratedPlan): Op[] {
  return [
    ...plan.requirements.map<Op>((r) => ({
      op: "create_requirement",
      tempId: r.ref,
      title: r.title,
      description: r.description ?? undefined,
      priority: r.priority,
    })),
    ...plan.sprints.map<Op>((s) => ({
      op: "create_sprint",
      tempId: s.ref,
      name: s.name,
      goal: s.goal ?? undefined,
      startDate: s.startDate,
      endDate: s.endDate,
    })),
    ...plan.tasks.map<Op>((t) => ({
      op: "create_task",
      title: t.title,
      description: t.description ?? undefined,
      status: t.status,
      estimateHours: t.estimateHours ?? undefined,
      sprintRef: t.sprintRef,
      requirementRef: t.requirementRef,
    })),
  ];
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You need to be signed in." }, { status: 401 });
  }

  /* Checked before the upload is even read: an 8MB PDF should not be
     parsed on behalf of a caller who is over their quota. */
  const rate = await checkPlanRate(supabase, user.id);
  if (!rate.ok) {
    return NextResponse.json(
      { error: rate.message },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Planning is not configured — OPENAI_API_KEY is missing." },
      { status: 503 }
    );
  }

  // ---------------------------------------------------------- the brief
  let brief = "";
  let source: "written" | "upload" = "written";
  let fileName: string | null = null;
  let mimeType: string | null = null;
  let name = "";
  let techStack: string[] = [];
  let startDate: string | null = null;
  let endDate: string | null = null;
  let sprintLength: string | null = null;

  try {
    const form = await request.formData();
    name = String(form.get("name") ?? "").trim();
    techStack = String(form.get("techStack") ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    startDate = (String(form.get("startDate") ?? "").trim() || null) as string | null;
    endDate = (String(form.get("endDate") ?? "").trim() || null) as string | null;
    sprintLength = (String(form.get("sprintLength") ?? "").trim() || null) as string | null;

    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      source = "upload";
      fileName = file.name;
      mimeType = file.type || null;
      brief = await extractBriefText(file);
    } else {
      brief = String(form.get("brief") ?? "").trim();
    }
  } catch (error) {
    if (error instanceof BriefError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not read the request." }, { status: 400 });
  }

  if (brief.length < 40 || looksLikeFiller(brief)) {
    return NextResponse.json(
      {
        error:
          "That does not read like a project brief. A couple of real sentences — what you are building, who it is for, and what is already hurting — is enough to start.",
      },
      { status: 400 }
    );
  }

  /* From here on the request costs money, so it is counted. Deliberately
     before the call rather than after it: a run that fails or gets
     rejected was still billed. */
  await recordPlanRun(supabase, user.id);

  // ------------------------------------------------------------- plan it
  let plan: GeneratedPlan;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.responses.parse({
      model: MODEL,
      input: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            name ? `Project name (given by the user): ${name}` : null,
            techStack.length ? `Tech stack: ${techStack.join(", ")}` : null,
            startDate ? `Start date: ${startDate}` : null,
            endDate ? `Target delivery date: ${endDate}` : null,
            sprintLength ? `Preferred sprint length: ${sprintLength}` : null,
            fileName ? `Source document: ${fileName}` : null,
            "",
            "The brief:",
            briefForPrompt(brief),
          ]
            .filter((line) => line !== null)
            .join("\n"),
        },
      ],
      // Strict schema: the model cannot return a shape we then have to
      // guess at. The same schema backs the propose_plan WebMCP tool.
      text: { format: zodTextFormat(GeneratedPlan, "plan") },
      max_output_tokens: MAX_OUTPUT_TOKENS,
    });

    if (response.status === "incomplete") {
      throw new Error(
        response.incomplete_details?.reason === "max_output_tokens"
          ? "the plan ran past the length limit before it finished. Try a shorter brief, or one project at a time."
          : "the model stopped before it finished."
      );
    }

    if (!response.output_parsed) {
      throw new Error("The model returned nothing to parse.");
    }
    plan = response.output_parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `The planner could not finish: ${message}` },
      { status: 502 }
    );
  }

  if (!plan.usable) {
    return NextResponse.json(
      {
        error:
          plan.rejection ??
          "That does not read like a description of software to be built.",
      },
      { status: 422 }
    );
  }

  if (plan.tasks.length === 0) {
    return NextResponse.json(
      { error: "The planner read the brief but found nothing to plan. Try adding more detail." },
      { status: 422 }
    );
  }

  // ------------------------------------------------- store, then propose
  const { data: projectRow, error: projectError } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      name: name || plan.projectName,
      description: plan.projectSummary,
      tech_stack: techStack,
      start_date: startDate,
      end_date: endDate,
      sprint_length: sprintLength,
    })
    .select()
    .single();

  if (projectError || !projectRow) {
    return NextResponse.json(
      { error: projectError?.message ?? "Could not create the project." },
      { status: 500 }
    );
  }
  const project = projectRow as unknown as Project;

  await supabase.from("project_briefs").insert({
    project_id: project.id,
    source,
    file_name: fileName,
    mime_type: mimeType,
    content: brief,
  });

  /* The plan does not go into the project. It goes into the review panel,
     exactly like a plan an agent proposed — because the rule is about the
     gate, not about who is on the other side of it. */
  const { data: changeSet, error: changeSetError } = await supabase
    .from("change_sets")
    .insert({
      project_id: project.id,
      title: "Initial plan from your brief",
      summary: plan.reasoning,
      source: "planner",
      status: "pending",
      operations: buildOperations(plan),
    })
    .select()
    .single();

  if (changeSetError) {
    return NextResponse.json(
      { error: `The project was created but the plan could not be saved: ${changeSetError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    projectId: project.id,
    changeSetId: (changeSet as { id: string }).id,
    counts: {
      requirements: plan.requirements.length,
      sprints: plan.sprints.length,
      tasks: plan.tasks.length,
    },
  });
}
