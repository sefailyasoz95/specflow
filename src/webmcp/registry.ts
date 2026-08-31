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
 *
 * The browser rejects a second registration of a name that is already
 * live ("Duplicate tool name"), and registration is async while React's
 * teardown is not — so a page whose tools have not finished unregistering
 * can collide with the next page's, and Fast Refresh collides with
 * itself. The module-level `live` map below is the fix: it is the single
 * record of what this document currently has registered, and claiming a
 * name always releases the previous holder first.
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
  return (navigator as unknown as { modelContext?: AnyContext }).modelContext ?? null;
}

export function detectSurface(): Surface {
  if (documentContext()) return "document.modelContext";
  const nav = navigatorContext();
  if (nav?.registerTool) return "navigator.modelContext";
  if (nav?.provideContext) return "navigator.provideContext";
  return "unavailable";
}

/** What this document currently has registered, by tool name. */
const live = new Map<string, () => void>();

/** Normalise whatever `execute` returns into the spec's content shape. */
function wrap(descriptor: ToolDescriptor): ToolDescriptor {
  return {
    ...descriptor,
    execute: async (input, options) => {
      try {
        const out = await descriptor.execute(input ?? {}, options);
        return typeof out === "string"
          ? { content: [{ type: "text", text: out }] }
          : out;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        // Surface failures to the agent as text it can read and recover
        // from, rather than an opaque rejection at the browser.
        return { content: [{ type: "text", text: `Error: ${message}` }] };
      }
    },
  };
}

/**
 * Registers a page's tools. `pageSignal` is owned by the caller and must
 * be aborted synchronously on teardown — that is what makes the handover
 * between two pages safe.
 */
export async function registerTools(
  tools: ToolDescriptor[],
  pageSignal: AbortSignal
): Promise<{ surface: Surface; registered: string[] }> {
  const surface = detectSurface();
  if (surface === "unavailable") return { surface, registered: [] };

  const wrapped = tools.map(wrap);

  // provideContext replaces the whole set in one call, so it has no
  // per-name collision to manage.
  if (surface === "navigator.provideContext") {
    const nav = navigatorContext()!;
    if (pageSignal.aborted) return { surface, registered: [] };
    await nav.provideContext!({ tools: wrapped });
    pageSignal.addEventListener(
      "abort",
      () => {
        try {
          nav.provideContext!({ tools: [] });
        } catch {
          /* the surface may already be gone */
        }
      },
      { once: true }
    );
    return { surface, registered: wrapped.map((t) => t.name) };
  }

  const done: string[] = [];

  for (const tool of wrapped) {
    if (pageSignal.aborted) break;

    // Claiming a name releases whoever held it — the previous page whose
    // teardown has not landed, or the previous Fast Refresh.
    live.get(tool.name)?.();
    live.delete(tool.name);

    const controller = new AbortController();
    const release = () => {
      controller.abort();
      if (live.get(tool.name) === release) live.delete(tool.name);
    };
    live.set(tool.name, release);
    pageSignal.addEventListener("abort", release, { once: true });

    try {
      if (surface === "document.modelContext") {
        await documentContext()!.registerTool!(tool, { signal: controller.signal });
      } else {
        const nav = navigatorContext()!;
        await nav.registerTool!(tool);
        // This surface has no signal, so unregister by name instead.
        controller.signal.addEventListener(
          "abort",
          () => {
            try {
              nav.unregisterTool?.(tool.name);
            } catch {
              /* already gone */
            }
          },
          { once: true }
        );
      }
      done.push(tool.name);
    } catch (error) {
      release();
      // An abort is us — React tore the page down (or Strict Mode ran the
      // effect twice) while registration was still in flight. That is the
      // handover working, not a failure, so it stays quiet.
      if (!pageSignal.aborted && !controller.signal.aborted) {
        // One bad tool must not cost the page its whole surface.
        console.warn(`[webmcp] could not register "${tool.name}"`, error);
      }
    }
  }

  return { surface, registered: done };
}
