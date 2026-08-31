"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * DateField
 *
 * A month grid in a popover, not <input type="date">. The native control
 * cannot be styled — it renders the operating system's calendar, in the
 * operating system's colours, in the middle of a page that has spent a
 * lot of effort not looking like anything else.
 *
 * Values are plain "YYYY-MM-DD" strings and every date is built at UTC
 * noon, so a browser in Istanbul and a server in UTC never disagree
 * about which day was picked.
 * ------------------------------------------------------------------ */

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function parse(value: string | null) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m: m - 1, d };
}

const monthLabel = (y: number, m: number) =>
  new Date(Date.UTC(y, m, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const readable = (value: string) => {
  const p = parse(value);
  if (!p) return value;
  return new Date(Date.UTC(p.y, p.m, p.d)).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

/** Monday-first offset for the 1st of a month. */
function leadingBlanks(y: number, m: number) {
  const jsDay = new Date(Date.UTC(y, m, 1)).getUTCDay(); // 0 = Sunday
  return (jsDay + 6) % 7;
}

const daysIn = (y: number, m: number) =>
  new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

export function DateField({
  value,
  onChange,
  placeholder = "Pick a date",
  min,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Earliest selectable day, "YYYY-MM-DD". */
  min?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => new Date(), []);
  const selected = parse(value);
  const [cursor, setCursor] = useState(() => ({
    y: selected?.y ?? today.getFullYear(),
    m: selected?.m ?? today.getMonth(),
  }));

  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const minParsed = parse(min ?? null);
  const isBeforeMin = (y: number, m: number, d: number) => {
    if (!minParsed) return false;
    return (
      Date.UTC(y, m, d) < Date.UTC(minParsed.y, minParsed.m, minParsed.d)
    );
  };

  const blanks = leadingBlanks(cursor.y, cursor.m);
  const total = daysIn(cursor.y, cursor.m);
  const step = (by: number) =>
    setCursor(({ y, m }) => {
      const next = m + by;
      if (next < 0) return { y: y - 1, m: 11 };
      if (next > 11) return { y: y + 1, m: 0 };
      return { y, m: next };
    });

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        ref={trigger}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "press flex h-9 w-full items-center gap-2 rounded-lg bg-ink-800 px-3 text-left text-[13.5px]",
          "hover:bg-ink-700",
          value ? "text-fg" : "text-fg-dim"
        )}
      >
        <span className="flex-1 truncate">
          {value ? readable(value) : placeholder}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear the date"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
              }
            }}
            className="press rounded px-1 font-mono text-[13px] text-fg-dim hover:text-fg"
          >
            ×
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose a date"
          className="popover absolute left-0 top-full z-40 mt-2 w-[17.5rem] rounded-xl bg-ink-700 p-3
                     shadow-[0_18px_44px_-12px_rgba(0,0,0,0.75)] ring-1 ring-ink-line"
        >
          <header className="flex items-center gap-1 pb-2">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous month"
              className="press rounded-lg p-1.5 text-fg-dim hover:bg-ink-600 hover:text-fg"
            >
              <ChevronLeft className="size-4" strokeWidth={2} />
            </button>
            <span className="flex-1 text-center text-[13px] text-fg">
              {monthLabel(cursor.y, cursor.m)}
            </span>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next month"
              className="press rounded-lg p-1.5 text-fg-dim hover:bg-ink-600 hover:text-fg"
            >
              <ChevronRight className="size-4" strokeWidth={2} />
            </button>
          </header>

          <div className="grid grid-cols-7 gap-0.5 pb-1">
            {WEEKDAYS.map((d) => (
              <span
                key={d}
                className="py-1 text-center font-mono text-[10.5px] text-fg-dim"
              >
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: blanks }).map((_, i) => (
              <span key={`blank-${i}`} />
            ))}

            {Array.from({ length: total }, (_, i) => i + 1).map((day) => {
              const isSelected =
                selected?.y === cursor.y &&
                selected?.m === cursor.m &&
                selected?.d === day;
              const isToday =
                today.getFullYear() === cursor.y &&
                today.getMonth() === cursor.m &&
                today.getDate() === day;
              const disabled = isBeforeMin(cursor.y, cursor.m, day);

              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(iso(cursor.y, cursor.m, day));
                    setOpen(false);
                    trigger.current?.focus();
                  }}
                  className={cn(
                    "press h-8 rounded-lg text-center font-mono text-[12.5px] tabular-nums",
                    "disabled:pointer-events-none disabled:text-fg-dim/30",
                    isSelected
                      ? "bg-fg text-ink-900"
                      : "text-fg-mid hover:bg-ink-600 hover:text-fg",
                    !isSelected && isToday && "text-waiting"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
