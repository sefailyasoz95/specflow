"use client";

import { useWebMCP } from "@/webmcp/use-webmcp";
import { WebMCPStatus } from "./review-rail";

/**
 * Even the marketing page speaks WebMCP: an agent that lands here can ask
 * what this site is and where to go, instead of scraping the DOM.
 */
export function LandingAgent() {
  const { surface, toolNames } = useWebMCP(() => [
    {
      name: "about_specflow",
      description:
        "Explain what SpecFlow is, what tools it exposes once a project is open, and how to get in.",
      annotations: { readOnlyHint: true },
      inputSchema: { type: "object", properties: {} },
      execute: () =>
        JSON.stringify(
          {
            what: "SpecFlow turns rough software requirements into a structured plan: requirements, sprints, tasks and effort estimates.",
            howAgentsWork:
              "Agents never write to a plan directly. Write tools author a change set — a reviewable diff — and apply_pending_changes hands control to the human and waits for their decision.",
            toolsOnProjectsPage: ["list_projects", "create_project"],
            toolsInsideAProject: [
              "get_project_context",
              "propose_plan",
              "propose_task_changes",
              "apply_pending_changes",
              "discard_pending_changes",
              "focus",
            ],
            signIn: "/login",
          },
          null,
          2
        ),
    },
  ]);

  return <WebMCPStatus surface={surface} toolNames={toolNames} />;
}
