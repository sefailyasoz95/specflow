"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  ChangeSet,
  Op,
  Project,
  Requirement,
  Sprint,
  Task,
  TaskStatus,
} from "@/lib/types";

export type HighlightTarget =
  | { kind: "requirement" | "sprint" | "task" | "changeset"; id: string }
  | { kind: "panel"; id: "requirements" | "sprints" | "board" | "proposals" }
  | null;

export type ApprovalOutcome =
  | { decision: "approved"; applied: number }
  | { decision: "rejected"; reason?: string }
  | { decision: "timeout" };

export type ApprovalRequest = {
  changeSetId: string;
  note: string | null;
  requestedAt: number;
};

export type AgentEvent = {
  id: string;
  tool: string;
  detail: string;
  at: number;
  kind: "read" | "write" | "control";
};

export type Snapshot = {
  project: Project;
  requirements: Requirement[];
  sprints: Sprint[];
  tasks: Task[];
  changeSets: ChangeSet[];
};

export type UiState = {
  view: "board" | "requirements" | "sprints";
  activeSprintId: string | null;
  statusFilter: TaskStatus | "all";
  selectedTaskId: string | null;
  openProposalId: string | null;
};

export type WorkspaceValue = Snapshot & {
  ui: UiState;
  setUi: (patch: Partial<UiState>) => void;
  highlight: HighlightTarget;
  setHighlight: (t: HighlightTarget) => void;
  agentEvents: AgentEvent[];
  logAgent: (e: Omit<AgentEvent, "id" | "at">) => void;
  loading: boolean;
  refresh: () => Promise<void>;
  proposeChangeSet: (
    title: string,
    summary: string,
    operations: Op[]
  ) => Promise<ChangeSet>;
  approvalRequest: ApprovalRequest | null;
  requestApproval: (
    changeSetId: string,
    note: string | null,
    signal?: AbortSignal
  ) => Promise<ApprovalOutcome>;
  resolveApproval: (
    decision: "approved" | "rejected",
    reason?: string
  ) => Promise<void>;
  applyChangeSet: (id: string) => Promise<number>;
  discardChangeSet: (id: string) => Promise<void>;
  createTaskDirect: (input: Partial<Task> & { title: string }) => Promise<void>;
  updateTaskDirect: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTaskDirect: (id: string) => Promise<void>;
  createSprintDirect: (name: string, goal?: string) => Promise<void>;
  createRequirementDirect: (title: string, description?: string) => Promise<void>;
};

const Ctx = createContext<WorkspaceValue | null>(null);

export function useWorkspace() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return v;
}

export function WorkspaceProvider({
  initial,
  children,
}: {
  initial: Snapshot;
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [snapshot, setSnapshot] = useState<Snapshot>(initial);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlightState] = useState<HighlightTarget>(null);
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  const [ui, setUiState] = useState<UiState>({
    view: "board",
    activeSprintId: initial.sprints[0]?.id ?? null,
    statusFilter: "all",
    selectedTaskId: null,
    openProposalId: initial.changeSets.find((c) => c.status === "pending")?.id ?? null,
  });

  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [approvalRequest, setApprovalRequest] = useState<ApprovalRequest | null>(
    null
  );
  const approvalResolver = useRef<((o: ApprovalOutcome) => void) | null>(null);

  const setUi = useCallback((patch: Partial<UiState>) => {
    setUiState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setHighlight = useCallback((t: HighlightTarget) => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    setHighlightState(t);
    if (t) {
      highlightTimer.current = setTimeout(() => setHighlightState(null), 4000);
    }
  }, []);

  const logAgent = useCallback((e: Omit<AgentEvent, "id" | "at">) => {
    setAgentEvents((prev) =>
      [{ ...e, id: crypto.randomUUID(), at: Date.now() }, ...prev].slice(0, 40)
    );
  }, []);

  const projectId = snapshot.project.id;

  const refresh = useCallback(async () => {
    setLoading(true);
    const [reqs, sprints, tasks, changeSets] = await Promise.all([
      supabase.from("requirements").select("*").eq("project_id", projectId).order("position"),
      supabase.from("sprints").select("*").eq("project_id", projectId).order("position"),
      supabase.from("tasks").select("*").eq("project_id", projectId).order("position"),
      supabase
        .from("change_sets")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setSnapshot((prev) => ({
      project: prev.project,
      requirements: (reqs.data ?? []) as Requirement[],
      sprints: (sprints.data ?? []) as Sprint[],
      tasks: (tasks.data ?? []) as Task[],
      changeSets: (changeSets.data ?? []) as ChangeSet[],
    }));
    setLoading(false);
  }, [supabase, projectId]);

  // Realtime: an agent may be driving this page from another tab, and the
  // apply happens in Postgres. Keep the human's view honest either way.
  useEffect(() => {
    const channel = supabase
      .channel(`project:${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${projectId}` },
        () => void refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "change_sets", filter: `project_id=eq.${projectId}` },
        () => void refresh()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, projectId, refresh]);

  const proposeChangeSet = useCallback(
    async (title: string, summary: string, operations: Op[]) => {
      const { data, error } = await supabase
        .from("change_sets")
        .insert({
          project_id: projectId,
          title,
          summary,
          source: "agent",
          status: "pending",
          operations,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      await refresh();
      const cs = data as unknown as ChangeSet;
      setUi({ openProposalId: cs.id });
      setHighlight({ kind: "changeset", id: cs.id });
      return cs;
    },
    [supabase, projectId, refresh, setUi, setHighlight]
  );

  const applyChangeSet = useCallback(
    async (id: string) => {
      const { data, error } = await supabase.rpc("apply_change_set", {
        p_change_set_id: id,
      });
      if (error) throw new Error(error.message);
      await refresh();
      const applied = (data as { applied?: number } | null)?.applied ?? 0;
      return applied;
    },
    [supabase, refresh]
  );

  const discardChangeSet = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("change_sets")
        .update({ status: "discarded", resolved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
      await refresh();
    },
    [supabase, refresh]
  );

  const createTaskDirect = useCallback(
    async (input: Partial<Task> & { title: string }) => {
      const { error } = await supabase.from("tasks").insert({
        project_id: projectId,
        position: snapshot.tasks.length + 1,
        ...input,
      });
      if (error) throw new Error(error.message);
      await refresh();
    },
    [supabase, projectId, snapshot.tasks.length, refresh]
  );

  const updateTaskDirect = useCallback(
    async (id: string, patch: Partial<Task>) => {
      // Optimistic — a drag should not wait on a round trip.
      setSnapshot((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) {
        await refresh();
        throw new Error(error.message);
      }
    },
    [supabase, refresh]
  );

  const deleteTaskDirect = useCallback(
    async (id: string) => {
      setSnapshot((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }));
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) await refresh();
    },
    [supabase, refresh]
  );

  const createSprintDirect = useCallback(
    async (name: string, goal?: string) => {
      const { error } = await supabase.from("sprints").insert({
        project_id: projectId,
        name,
        goal: goal ?? null,
        position: snapshot.sprints.length + 1,
      });
      if (error) throw new Error(error.message);
      await refresh();
    },
    [supabase, projectId, snapshot.sprints.length, refresh]
  );

  const createRequirementDirect = useCallback(
    async (title: string, description?: string) => {
      const seq = snapshot.requirements.length + 1;
      const { error } = await supabase.from("requirements").insert({
        project_id: projectId,
        code: `REQ-${String(seq).padStart(3, "0")}`,
        title,
        description: description ?? null,
        position: seq,
      });
      if (error) throw new Error(error.message);
      await refresh();
    },
    [supabase, projectId, snapshot.requirements.length, refresh]
  );


  /* ------------------------------------------------------------------ *
   * Human-in-the-loop handshake
   *
   * The agent calls apply_pending_changes; that tool's promise stays
   * open while this page asks the human. Whatever they click is what
   * the agent hears back. The AbortSignal the browser hands the tool
   * lets the agent walk away without leaving the page stuck.
   * ------------------------------------------------------------------ */
  const requestApproval = useCallback(
    (changeSetId: string, note: string | null, signal?: AbortSignal) =>
      new Promise<ApprovalOutcome>((resolve) => {
        const settle = (outcome: ApprovalOutcome) => {
          if (!approvalResolver.current) return;
          approvalResolver.current = null;
          setApprovalRequest(null);
          clearTimeout(timer);
          resolve(outcome);
        };

        approvalResolver.current = settle;
        setApprovalRequest({ changeSetId, note, requestedAt: Date.now() });

        const timer = setTimeout(() => settle({ decision: "timeout" }), 5 * 60_000);
        signal?.addEventListener("abort", () => settle({ decision: "timeout" }), {
          once: true,
        });
      }),
    []
  );

  const resolveApproval = useCallback(
    async (decision: "approved" | "rejected", reason?: string) => {
      const req = approvalRequest;
      const settle = approvalResolver.current;
      if (!req) return;

      if (decision === "approved") {
        const applied = await applyChangeSet(req.changeSetId);
        settle?.({ decision: "approved", applied });
      } else {
        await discardChangeSet(req.changeSetId);
        settle?.({ decision: "rejected", reason });
      }
      approvalResolver.current = null;
      setApprovalRequest(null);
    },
    [approvalRequest, applyChangeSet, discardChangeSet]
  );

  const value: WorkspaceValue = {
    ...snapshot,
    ui,
    setUi,
    highlight,
    setHighlight,
    agentEvents,
    logAgent,
    loading,
    refresh,
    proposeChangeSet,
    approvalRequest,
    requestApproval,
    resolveApproval,
    applyChangeSet,
    discardChangeSet,
    createTaskDirect,
    updateTaskDirect,
    deleteTaskDirect,
    createSprintDirect,
    createRequirementDirect,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
