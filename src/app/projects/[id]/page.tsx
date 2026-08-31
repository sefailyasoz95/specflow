import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceProvider } from "@/store/workspace";
import { WorkspaceShell } from "@/components/workspace-shell";
import type {
  ChangeSet,
  Project,
  ProjectBrief,
  Requirement,
  Sprint,
  Task,
} from "@/lib/types";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!project) notFound();

  const [requirements, sprints, tasks, changeSets, brief] = await Promise.all([
    supabase.from("requirements").select("*").eq("project_id", id).order("position"),
    supabase.from("sprints").select("*").eq("project_id", id).order("position"),
    supabase.from("tasks").select("*").eq("project_id", id).order("position"),
    supabase
      .from("change_sets")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("project_briefs")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <WorkspaceProvider
      initial={{
        project: project as Project,
        brief: (brief.data ?? null) as ProjectBrief | null,
        requirements: (requirements.data ?? []) as Requirement[],
        sprints: (sprints.data ?? []) as Sprint[],
        tasks: (tasks.data ?? []) as Task[],
        changeSets: (changeSets.data ?? []) as ChangeSet[],
      }}
    >
      <WorkspaceShell />
    </WorkspaceProvider>
  );
}
