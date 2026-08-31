"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/* An ink sheet, for the human's own edits.
   Paper is reserved for proposals — the one bright surface means "someone
   is asking you to approve something", and editing your own task is not
   that. */
export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    panel.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="scrim-in absolute inset-0 bg-ink-900/78 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        ref={panel}
        className={cn(
          "sheet-in relative flex max-h-[86vh] w-full max-w-lg flex-col overflow-hidden",
          // One step lighter than the chrome, so the ink-800 fields inside
          // read as recessed rather than dissolving into the panel.
          "rounded-2xl bg-ink-700 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.72)] ring-1 ring-ink-600"
        )}
      >
        <header className="px-5 pb-3 pt-5">
          <h2 className="display text-[19px] text-fg">{title}</h2>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-5">
          {children}
        </div>

        {footer ? (
          <footer className="flex items-center gap-2 border-t border-ink-600 px-5 py-3.5">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
