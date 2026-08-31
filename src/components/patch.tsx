"use client";

import { cn } from "@/lib/utils";
import { toLines, patchCounts, type Ctx, type Line } from "./patch-lines";

export { patchCounts };
export type { Ctx };

const MARK: Record<Line["kind"], string> = {
  add: "+",
  mod: "~",
  remove: "−",
};

/* ------------------------------------------------------------------ *
 * The patch
 *
 * A change set is a diff, so it is drawn as one: a numbered gutter, a
 * mark column, and the change itself. On paper, because this is the
 * document the human is being asked to sign off on.
 * ------------------------------------------------------------------ */

export function Patch({
  ctx,
  surface = "paper",
}: {
  ctx: Ctx;
  /** `paper` for the review sheet; `ink` for the compact rail preview. */
  surface?: "paper" | "ink";
}) {
  const lines = toLines(ctx);
  const paper = surface === "paper";

  if (lines.length === 0) {
    return (
      <p className={cn("px-5 py-6 text-[13px]", paper ? "text-paper-dim" : "text-fg-dim")}>
        This change set is empty.
      </p>
    );
  }

  return (
    <ol className={cn("font-mono", paper ? "text-[12.5px]" : "text-[12px]")}>
      {lines.map((line, i) => (
        <li
          key={i}
          className={cn(
            "grid grid-cols-[2.25rem_1rem_1fr] items-start gap-x-2",
            paper ? "px-3 py-1.5" : "px-2 py-1",
            paper
              ? line.kind === "add"
                ? "bg-add-wash"
                : line.kind === "mod"
                  ? "bg-change-wash"
                  : "bg-remove-wash"
              : null
          )}
        >
          {/* Gutter: a patch has line numbers. */}
          <span
            className={cn(
              "select-none pt-px text-right tabular-nums",
              paper ? "text-paper-dim/70" : "text-fg-dim/60"
            )}
            aria-hidden
          >
            {i + 1}
          </span>

          <span
            className={cn(
              "select-none pt-px font-medium",
              line.kind === "add" && (paper ? "text-add" : "text-emerald-400"),
              line.kind === "mod" && (paper ? "text-change" : "text-sky-400"),
              line.kind === "remove" && (paper ? "text-remove" : "text-rose-400")
            )}
          >
            {MARK[line.kind]}
          </span>

          <div className="min-w-0">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span
                className={cn(
                  "text-[10px] uppercase tracking-[0.08em]",
                  paper ? "text-paper-dim" : "text-fg-dim"
                )}
              >
                {line.entity}
              </span>
              <span
                className={cn(
                  "font-sans text-[13.5px] leading-snug",
                  paper ? "text-paper-fg" : "text-fg",
                  line.kind === "remove" &&
                    (paper
                      ? "text-paper-mid line-through decoration-remove/50"
                      : "text-fg-mid line-through")
                )}
              >
                {line.title}
              </span>
            </p>

            {line.meta ? (
              <p
                className={cn(
                  "mt-0.5 text-[11.5px]",
                  paper ? "text-paper-mid" : "text-fg-dim"
                )}
              >
                {line.meta}
              </p>
            ) : null}

            {line.changes?.length ? (
              <ul className="mt-1 space-y-0.5">
                {line.changes.map((c) => (
                  <li
                    key={c.field}
                    className={cn(
                      "flex flex-wrap items-baseline gap-x-1.5 text-[11.5px]",
                      paper ? "text-paper-mid" : "text-fg-dim"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block w-16 shrink-0 text-[10px] uppercase tracking-[0.08em]",
                        paper ? "text-paper-dim" : "text-fg-dim"
                      )}
                    >
                      {c.field}
                    </span>
                    <span
                      className={cn(
                        paper ? "text-remove/80" : "text-rose-400/80",
                        "line-through"
                      )}
                    >
                      {c.from}
                    </span>
                    <span className={paper ? "text-paper-dim" : "text-fg-dim"}>→</span>
                    <span className={paper ? "text-change" : "text-sky-400"}>
                      {c.to}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {line.kind === "mod" && !line.changes?.length ? (
              <p
                className={cn(
                  "mt-0.5 text-[11.5px]",
                  paper ? "text-paper-dim" : "text-fg-dim"
                )}
              >
                nothing would change
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** The `+8 ~3 −1` line that sits above a patch. */
export function PatchStat({
  ctx,
  surface = "paper",
}: {
  ctx: Ctx;
  surface?: "paper" | "ink";
}) {
  const c = patchCounts(ctx);
  const paper = surface === "paper";
  return (
    <span className="flex items-center gap-2.5 font-mono text-[11.5px] tabular-nums">
      {c.add > 0 && (
        <span className={paper ? "text-add" : "text-emerald-400"}>+{c.add}</span>
      )}
      {c.mod > 0 && (
        <span className={paper ? "text-change" : "text-sky-400"}>~{c.mod}</span>
      )}
      {c.remove > 0 && (
        <span className={paper ? "text-remove" : "text-rose-400"}>−{c.remove}</span>
      )}
    </span>
  );
}
