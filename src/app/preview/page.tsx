import { WorkspaceProvider } from "@/store/workspace";
import { WorkspaceShell } from "@/components/workspace-shell";
import { mockSnapshot } from "@/lib/mock";

export const metadata = { title: "Sprintfy — preview" };

/**
 * Design surface. The whole review loop runs in memory here, so the
 * workspace can be looked at, and its motion felt, without an account.
 */
export default function PreviewPage() {
  return (
    <WorkspaceProvider initial={mockSnapshot} offline>
      <WorkspaceShell />
    </WorkspaceProvider>
  );
}
