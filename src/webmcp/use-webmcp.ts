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
 */
export function useWebMCP(build: () => ToolDescriptor[]) {
  const latest = useRef<ToolDescriptor[]>(build());
  latest.current = build();

  const [surface, setSurface] = useState<Surface>("unavailable");
  const [toolNames, setToolNames] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let dispose = () => {};

    const stable: ToolDescriptor[] = latest.current.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
      execute: (input, options) => {
        const live =
          latest.current.find((t) => t.name === tool.name) ?? tool;
        return live.execute(input, options);
      },
    }));

    registerTools(stable).then((res) => {
      if (disposed) {
        res.dispose();
        return;
      }
      dispose = res.dispose;
      setSurface(res.surface);
      setToolNames(stable.map((t) => t.name));
      setReady(true);
    });

    return () => {
      disposed = true;
      dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { surface, toolNames, ready };
}
