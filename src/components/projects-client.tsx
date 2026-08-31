"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useWebMCP } from "@/webmcp/use-webmcp";
import type { ToolDescriptor } from "@/webmcp/registry";
import { WebMCPStatus } from "./review-rail";
import { Button, Empty, Input, Textarea } from "./ui/primitives";
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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

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
          "List the SpecFlow projects this signed-in user owns, with their ids and descriptions. Open one to get the full planning tool set.",
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
          "Create a new SpecFlow project and open it. Use this before planning when the user describes work that has no project yet. Once open, the project planning tools become available.",
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
          return `Created project "${project.name}" (id ${project.id}) and opened it. The planning tools — get_project_context, propose_plan, propose_task_changes, apply_pending_changes, focus — are now registered on this page.`;
        },
      },
    ];
    return tools;
  });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-5 py-10">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-[15px] font-medium tracking-tight text-ink">
          Spec<span className="text-agent">Flow</span>
        </Link>
        <span className="ml-auto text-[12.5px] text-ink-faint">{email}</span>
        <WebMCPStatus surface={surface} toolNames={toolNames} />
        <form
          action={async () => {
            await supabase.auth.signOut();
            router.push("/login");
            router.refresh();
          }}
        >
          <Button size="sm" variant="ghost" type="submit">
            Sign out
          </Button>
        </form>
      </header>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="text-[13.5px] font-medium text-ink">New project</h2>
        <form
          className="mt-3 space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim() || busy) return;
            setBusy(true);
            try {
              const p = await create(name.trim(), description.trim() || undefined);
              setName("");
              setDescription("");
              router.push(`/projects/${p.id}`);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
          />
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project? (optional)"
          />
          <Button type="submit" variant="primary" disabled={!name.trim() || busy}>
            Create
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">
          Projects
        </h2>
        {projects.length === 0 ? (
          <Empty
            title="No projects yet"
            hint="Create one above, or ask your agent to create it for you."
          />
        ) : (
          <ul className="stagger space-y-1.5">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="press hover-lift block rounded-xl border border-line bg-surface px-3.5 py-3"
                >
                  <p className="text-[13.5px] font-medium text-ink">{p.name}</p>
                  {p.description ? (
                    <p className="mt-0.5 line-clamp-1 text-[12.5px] text-ink-faint">
                      {p.description}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
