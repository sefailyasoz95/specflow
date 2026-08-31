"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
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
 *
 * The month grid is rendered into a portal and positioned in viewport
 * coordinates. Inside a modal it has to be: the sheet clips its own
 * corners with overflow-hidden and scrolls its body, so an absolutely
 * positioned popover was sliced off a few pixels below the field and the
 * days could not be reached at all.
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
  const panel = useRef<HTMLDivElement>(null);

  /* Rendered before it is placed, so the first measurement is of the real
     grid rather than a guess at its height, and hidden until then. The
     position survives a close: placement happens in a layout effect, so a
     stale one is corrected before the browser paints it. */
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const t = trigger.current?.getBoundingClientRect();
      if (!t) return;
      const p = panel.current?.getBoundingClientRect();
      const h = p?.height ?? 300;
      const w = p?.width ?? 280;
      const gap = 8;
      const room = window.innerHeight - t.bottom - gap - 8;
      // Below by default; above when the month would not fit and there is
      // more room up there. A field near the bottom of a modal is the
      // common case, not the exception.
      const top = h <= room || t.top - gap - h < 8 ? t.bottom + gap : t.top - gap - h;
      const left = Math.min(Math.max(8, t.left), window.innerWidth - w - 8);
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      // The grid lives in a portal now, so "inside" means either node.
      if (root.current?.contains(target) || panel.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Without this the modal hosting the field closes at the same
        // time, and Escape stops meaning "never mind, wrong month".
        e.stopPropagation();
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

      {open
        ? createPortal(
        <div
          ref={panel}
          role="dialog"
          aria-label="Choose a date"
          style={{
            top: pos?.top ?? 0,
            left: pos?.left ?? 0,
            visibility: pos ? "visible" : "hidden",
          }}
          className="popover fixed z-[70] w-[17.5rem] rounded-xl bg-ink-700 p-3
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
        </div>,
            document.body
          )
        : null}
    </div>
  );
}
