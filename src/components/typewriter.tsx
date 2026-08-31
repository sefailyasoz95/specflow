"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Typewriter
 *
 * Two things make this either fine or awful, and both are handled here:
 *
 *   Layout. The full string is rendered underneath, invisible, so the box
 *   is its final size from the first frame. Text that grows into a
 *   reflowing box shoves the rest of the page around for a second and a
 *   half, which is the whole reason typewriters have a bad name.
 *
 *   Screen readers. The animated characters are hidden from the
 *   accessibility tree; the real sentence is announced once, whole, from
 *   the wrapper's aria-label. Nobody should hear a headline arrive one
 *   letter at a time.
 * ------------------------------------------------------------------ */

const REDUCED = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(REDUCED);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false // the server cannot know; assume motion is fine
  );
}

export function Typewriter({
  text,
  className,
  speed = 26,
  startDelay = 0,
  onDone,
}: {
  text: string;
  className?: string;
  /** Milliseconds per character. */
  speed?: number;
  startDelay?: number;
  onDone?: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const [count, setCount] = useState(0);
  const [typing, setTyping] = useState(false);

  const finish = useRef(onDone);
  useEffect(() => {
    finish.current = onDone;
  });

  useEffect(() => {
    if (reduced) {
      finish.current?.();
      return;
    }

    let raf = 0;
    let start = 0;
    let settled = false;

    const tick = (now: number) => {
      if (!start) start = now;
      const next = Math.min(text.length, Math.floor((now - start) / speed));
      setCount(next);
      if (next < text.length) {
        raf = requestAnimationFrame(tick);
      } else if (!settled) {
        settled = true;
        setTyping(false);
        finish.current?.();
      }
    };

    const begin = setTimeout(() => {
      setTyping(true);
      raf = requestAnimationFrame(tick);
    }, startDelay);

    return () => {
      clearTimeout(begin);
      cancelAnimationFrame(raf);
    };
  }, [text, speed, startDelay, reduced]);

  const visible = reduced ? text : text.slice(0, count);

  return (
    <span className={cn("relative inline-block", className)} aria-label={text}>
      {/* Holds the final box, so nothing below ever moves. */}
      <span aria-hidden className="invisible">
        {text}
      </span>

      <span aria-hidden className="absolute inset-0">
        {visible}
        {reduced ? null : (
          <span
            className={cn(
              "ml-[0.06em] inline-block h-[0.78em] w-[0.055em] translate-y-[0.04em] bg-waiting align-baseline",
              "transition-opacity duration-500",
              typing ? "caret" : "opacity-0"
            )}
          />
        )}
      </span>
    </span>
  );
}
