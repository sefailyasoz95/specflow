import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewProject } from "@/components/new-project";

export const metadata = { title: "Start a project — Sprintfy" };

export default async function NewProjectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <NewProject />;
}
