"use client";

import { useEffect, useRef, useState } from "react";
import { registerTools, type Surface, type ToolDescriptor } from "./registry";

/**
 * Registers a page's tools once and keeps their implementations live.
 *
 * Tools close over React state, but re-registering on every render would
 * churn the browser's tool list (and fire `toolchange` constantly). So we
 * register stable descriptors whose `execute` forwards to the newest
 * closure held in a ref.
 *
 * The AbortController is created here, synchronously, so teardown can
 * release the tool names before the next page claims them — registration
 * is async, React's cleanup is not.
 */
export function useWebMCP(build: () => ToolDescriptor[]) {
  const latest = useRef<ToolDescriptor[]>(build());

  // Rebuilt after every commit, so a tool called later runs against the
  // state the human can actually see.
  useEffect(() => {
    latest.current = build();
  });

  const [surface, setSurface] = useState<Surface>("unavailable");
  const [toolNames, setToolNames] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const stable: ToolDescriptor[] = latest.current.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
      execute: (input, options) => {
        const current = latest.current.find((t) => t.name === tool.name) ?? tool;
        return current.execute(input, options);
      },
    }));

    /* Same descriptors, reachable from the console. Lets you exercise the
       exact tool an agent would call in a browser that has no WebMCP yet —
       and is how the eval harness drives the page. It grants nothing the
       page's own UI does not already do in this session. */
    const bridge = {
      list: () =>
        stable.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      call: (name: string, input: Record<string, unknown> = {}) => {
        const tool = stable.find((t) => t.name === name);
        return tool
          ? Promise.resolve(tool.execute(input))
          : Promise.reject(new Error(`No tool named "${name}"`));
      },
    };
    (window as unknown as { __webmcp?: typeof bridge }).__webmcp = bridge;

    registerTools(stable, controller.signal).then((res) => {
      if (controller.signal.aborted) return;
      setSurface(res.surface);
      setToolNames(res.registered);
      setReady(true);
    });

    return () => {
      controller.abort();
      delete (window as unknown as { __webmcp?: unknown }).__webmcp;
    };
  }, []);

  return { surface, toolNames, ready };
}
