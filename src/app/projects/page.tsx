import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectsClient } from "@/components/projects-client";
import type { Project } from "@/lib/types";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <ProjectsClient
      initialProjects={(data ?? []) as Project[]}
      email={user.email ?? ""}
    />
  );
}
