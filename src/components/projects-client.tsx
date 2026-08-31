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

  async function create(name: string, description?: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const { data, error } = await supabase
      .from("projects")
      .insert({ owner_id: user.id, name, description: description ?? null })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const project = data as unknown as Project;
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
          "Create a new Sprintfy project and open it. Use this before planning when the user describes work that has no project yet. Once open, the project planning tools become available.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Short project name." },
            description: {
              type: "string",
              description: "One or two sentences on what this project is.",
            },
          },
          required: ["name"],
        },
        execute: async (input) => {
          const project = await create(
            String(input.name),
            input.description ? String(input.description) : undefined
          );
          toast.success(`Agent created "${project.name}"`);
          router.push(`/projects/${project.id}`);
          return `Created project "${project.name}" (id ${project.id}) and opened it. The planning tools — get_project_context, propose_plan, propose_changes, apply_pending_changes, focus — are now registered on this page.`;
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
      </section>

      {projects.length === 0 ? (
        <Empty
          title="No projects yet"
          hint="Name one below, or ask your agent to set it up."
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

      <section className="mt-auto border-t border-ink-hair pt-6">
        <Link
          href="/projects/new"
          className="press lift flex items-center gap-4 rounded-xl bg-ink-850 px-4 py-4"
        >
          <div className="min-w-0">
            <p className="display text-[17px] text-fg">Start a project</p>
            <p className="mt-1 text-[13px] leading-relaxed text-fg-dim">
              Paste a brief or upload a PRD. It comes back as a plan you approve.
            </p>
          </div>
          <span aria-hidden className="ml-auto font-mono text-[15px] text-fg-dim">
            →
          </span>
        </Link>
      </section>
    </main>
  );
}
