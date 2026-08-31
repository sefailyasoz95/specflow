"use client";

import { useSyncExternalStore } from "react";
import { probeStore } from "./registry";

/**
 * What the page found when it looked for a WebMCP surface.
 *
 * `null` until the client has rendered — the answer depends on
 * `navigator` and `window.isSecureContext`, neither of which exists on
 * the server, and rendering a guess there is a hydration mismatch.
 */
export function useProbe(): Record<string, string> | null {
  return useSyncExternalStore(
    probeStore.subscribe,
    probeStore.getSnapshot,
    probeStore.getServerSnapshot
  );
}
