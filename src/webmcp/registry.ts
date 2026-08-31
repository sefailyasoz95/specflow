"use client";

/* ------------------------------------------------------------------ *
 * WebMCP registry adapter
 *
 * The API surface moved during the spec's life and the shipping
 * browsers do not all agree yet:
 *
 *   document.modelContext.registerTool(descriptor, { signal })   ← spec
 *   navigator.modelContext.registerTool(descriptor)              ← earlier
 *   navigator.modelContext.provideContext({ tools: [...] })      ← earliest
 *
 * Rather than betting on one, we detect what is present and speak it.
 * Everything above this file is written against ToolDescriptor only.
 * ------------------------------------------------------------------ */

export type ToolContent = { type: "text"; text: string };
export type ToolResult = string | { content: ToolContent[] };

export type ToolDescriptor = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
  };
  execute: (
    input: Record<string, unknown>,
    options?: { signal?: AbortSignal }
  ) => Promise<ToolResult> | ToolResult;
};

export type Surface =
  | "document.modelContext"
  | "navigator.modelContext"
  | "navigator.provideContext"
  | "unavailable";

type AnyContext = {
  registerTool?: (d: unknown, o?: unknown) => Promise<unknown> | unknown;
  unregisterTool?: (name: string) => unknown;
  provideContext?: (c: { tools: unknown[] }) => unknown;
};

function documentContext(): AnyContext | null {
  if (typeof document === "undefined") return null;
  const ctx = (document as unknown as { modelContext?: AnyContext }).modelContext;
  return ctx && typeof ctx.registerTool === "function" ? ctx : null;
}

function navigatorContext(): AnyContext | null {
  if (typeof navigator === "undefined") return null;
  const ctx = (navigator as unknown as { modelContext?: AnyContext }).modelContext;
  return ctx ?? null;
}

export function detectSurface(): Surface {
  if (documentContext()) return "document.modelContext";
  const nav = navigatorContext();
  if (nav?.registerTool) return "navigator.modelContext";
  if (nav?.provideContext) return "navigator.provideContext";
  return "unavailable";
}

/** Normalise whatever `execute` returns into the spec's content shape. */
function wrap(descriptor: ToolDescriptor): ToolDescriptor {
  return {
    ...descriptor,
    execute: async (input, options) => {
      try {
        const out = await descriptor.execute(input ?? {}, options);
        if (typeof out === "string") {
          return { content: [{ type: "text", text: out }] };
        }
        return out;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        // Surface failures to the agent as text so it can recover,
        // rather than throwing an opaque rejection at the browser.
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
        };
      }
    },
  };
}

/**
 * Registers every tool against whichever surface exists.
 * Returns a disposer; safe to call in a React effect cleanup.
 */
export async function registerTools(
  tools: ToolDescriptor[]
): Promise<{ surface: Surface; dispose: () => void }> {
  const surface = detectSurface();
  const wrapped = tools.map(wrap);

  if (surface === "unavailable") {
    return { surface, dispose: () => {} };
  }

  const controller = new AbortController();

  if (surface === "document.modelContext") {
    const ctx = documentContext()!;
    await Promise.all(
      wrapped.map((t) => ctx.registerTool!(t, { signal: controller.signal }))
    );
    return { surface, dispose: () => controller.abort() };
  }

  const nav = navigatorContext()!;

  if (surface === "navigator.modelContext") {
    await Promise.all(wrapped.map((t) => nav.registerTool!(t)));
    return {
      surface,
      dispose: () => {
        wrapped.forEach((t) => {
          try {
            nav.unregisterTool?.(t.name);
          } catch {
            /* the surface may not support unregistering */
          }
        });
      },
    };
  }

  // provideContext replaces the whole tool set at once.
  await nav.provideContext!({ tools: wrapped });
  return {
    surface,
    dispose: () => {
      try {
        nav.provideContext!({ tools: [] });
      } catch {
        /* noop */
      }
    },
  };
}
