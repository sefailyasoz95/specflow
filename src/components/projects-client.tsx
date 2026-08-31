"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useWebMCP } from "@/webmcp/use-webmcp";
import type { ToolDescriptor } from "@/webmcp/registry";
import { WebMCPStatus } from "./review-rail";
import { Button, Empty } from "./ui/primitives";
import type { Project } from "@/lib/types";

export function ProjectsClient({
  initialProjects,
  email,
}: {
  initialProjects: Project[];
  email: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [projects, setProjects] = useState(initialProjects);

  async function create(input: {
    name: string;
    description?: string;
    techStack?: string[];
    startDate?: string | null;
    endDate?: string | null;
    sprintLength?: string | null;
    brief?: string;
  }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const { data, error } = await supabase
      .from("projects")
      .insert({
        owner_id: user.id,
        name: input.name,
        description: input.description ?? null,
        tech_stack: input.techStack ?? [],
        start_date: input.startDate ?? null,
        end_date: input.endDate ?? null,
        sprint_length: input.sprintLength ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const project = data as unknown as Project;

    /* The brief is the provenance of every plan that follows, so it is
       stored whether a human uploaded it or an agent relayed it. */
    if (input.brief && input.brief.trim().length >= 40) {
      await supabase.from("project_briefs").insert({
        project_id: project.id,
        source: "written",
        content: input.brief.trim(),
      });
    }

    setProjects((p) => [project, ...p]);
    return project;
  }

  /* Tools available on this page only. Opening a project swaps them for
     the workspace tool set — which is the point of page-scoped tools. */
  const { surface, toolNames } = useWebMCP(() => {
    const tools: ToolDescriptor[] = [
      {
        name: "list_projects",
        description:
          "List the Sprintfy projects this signed-in user owns, with their ids and descriptions. Open one to get the full planning tool set.",
        annotations: { readOnlyHint: true },
        inputSchema: { type: "object", properties: {} },
        execute: () =>
          JSON.stringify(
            projects.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              url: `/projects/${p.id}`,
            })),
            null,
            2
          ),
      },
      {
        name: "create_project",
        description:
          "Create a project and open it, so the planning tools become available.\n\nAsk before you call this — a plan is only as good as what it was given, and these are the things a planner cannot infer:\n• What are they building, who is it for, and what is already hurting? Constraints and non-goals matter as much as features.\n• Do they already have a PRD, a backlog, or a brief? If they can paste the text, pass it as `brief` and it becomes the source the plan is built from. If it is a file — md, txt, pdf or docx — tell them to upload it at /projects/new instead, which reads the file directly; you cannot.\n• Which tech stack? Naming it stops the plan proposing a rewrite nobody asked for.\n• When do they start, when does it need to be delivered, and how long are their sprints?\n\nAny of these can be left out if they do not know, but ask rather than assume.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Short project name." },
            description: {
              type: "string",
              description: "One or two sentences on what this project is.",
            },
            brief: {
              type: "string",
              description:
                "The brief, backlog or PRD in the human's own words, pasted whole. Stored as the project's source document and read back by get_project_context, so propose_plan can work from it.",
            },
            techStack: {
              type: "array",
              items: { type: "string" },
              description: "e.g. [\"Next.js\", \"NestJS\", \"Supabase\"].",
            },
            startDate: { type: "string", description: "ISO date, YYYY-MM-DD." },
            endDate: {
              type: "string",
              description: "Target delivery date, ISO YYYY-MM-DD.",
            },
            sprintLength: {
              type: "string",
              enum: ["1_week", "2_weeks", "3_weeks", "4_weeks"],
              description: "How long their sprints run.",
            },
          },
          required: ["name"],
        },
        execute: async (input) => {
          const stack = Array.isArray(input.techStack)
            ? (input.techStack as unknown[]).map(String)
            : undefined;
          const project = await create({
            name: String(input.name),
            description: input.description ? String(input.description) : undefined,
            brief: input.brief ? String(input.brief) : undefined,
            techStack: stack,
            startDate: input.startDate ? String(input.startDate) : null,
            endDate: input.endDate ? String(input.endDate) : null,
            sprintLength: input.sprintLength ? String(input.sprintLength) : null,
          });
          toast.success(`Agent created "${project.name}"`);
          router.push(`/projects/${project.id}`);

          const missing = [
            !input.brief ? "a brief" : null,
            !stack?.length ? "the tech stack" : null,
            !input.startDate ? "a start date" : null,
            !input.sprintLength ? "sprint length" : null,
          ].filter(Boolean);

          return `Created "${project.name}" (id ${project.id}) and opened it. The planning tools — get_project_context, propose_plan, propose_changes, apply_pending_changes, focus — are now registered on this page.${
            missing.length
              ? ` You did not give ${missing.join(", ")}; ask for what is missing before proposing a plan, or say plainly in your proposal what you assumed.`
              : " Call get_project_context, then propose_plan."
          }`;
        },
      },
    ];
    return tools;
  });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-10 px-6 py-10">
      <header className="flex items-center gap-3">
        <Link href="/" className="display text-[17px] text-fg">
          Sprintfy
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <WebMCPStatus surface={surface} toolNames={toolNames} />
          <span className="px-2 text-[12.5px] text-fg-dim">{email}</span>
          <form
            action={async () => {
              await supabase.auth.signOut();
              router.push("/login");
              router.refresh();
            }}
          >
            <Button size="sm" variant="quiet" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <section>
        <h1 className="display text-[30px] text-fg">Projects</h1>
        <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-fg-mid">
          Open one to give your agent the planning tools. Or let it create the
          project itself — <span className="font-mono text-[12.5px]">create_project</span>{" "}
          is registered on this page.
        </p>

        {/* The one thing this page is for. It was at the bottom, in a card
            that did not look like a control. */}
        <Link
          href="/projects/new"
          className="press mt-6 inline-flex items-center gap-2 rounded-lg bg-fg px-4 py-2.5
                     text-[13.5px] font-medium text-ink-900 hover:bg-white"
        >
          Start a project
          <span aria-hidden className="font-mono">→</span>
        </Link>
        <p className="mt-2.5 text-[12.5px] text-fg-dim">
          Paste a brief or upload a PRD. It comes back as a plan you approve.
        </p>
      </section>

      {projects.length === 0 ? (
        <Empty
          title="Nothing here yet"
          hint="Your first project starts from whatever you already wrote — a brief, a backlog, a PRD."
        />
      ) : (
        <ul className="stagger">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="press lift block rounded-xl border-b border-ink-hair px-3 py-4"
              >
                <p className="display text-[18px] text-fg">{p.name}</p>
                {p.description ? (
                  <p className="mt-1 line-clamp-1 text-[13px] text-fg-dim">
                    {p.description}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
