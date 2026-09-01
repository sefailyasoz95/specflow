import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortId() {
  return Math.random().toString(36).slice(2, 8);
}

export function hours(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return Number.isInteger(n) ? `${n}h` : `${n.toFixed(1)}h`;
}

/* ------------------------------------------------------------------ *
 * Dates
 *
 * Stored as plain "YYYY-MM-DD". Every one of them is read back at UTC
 * so a browser in Istanbul and a row written from a UTC server agree on
 * which day it is — the same rule DateField follows when writing them.
 * ------------------------------------------------------------------ */

function utcDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

export function shortDate(value: string | null | undefined) {
  if (!value) return null;
  const d = utcDate(value);
  if (!d) return null;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * A sprint's window, said the way a person would say it.
 *
 * The year is dropped when both ends share the current one — "3 Nov – 14
 * Nov" is what the sentence is about, and repeating 2026 twice in a row
 * on a board full of sprints is noise. It comes back the moment a range
 * crosses into another year, because then it is the point.
 */
export function dateRange(
  start: string | null | undefined,
  end: string | null | undefined
) {
  if (!start && !end) return null;

  const a = start ? utcDate(start) : null;
  const b = end ? utcDate(end) : null;
  const thisYear = new Date().getUTCFullYear();
  const withYear = (d: Date) =>
    d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

  if (a && !b) return `from ${shortDate(start)}`;
  if (b && !a) return `due ${shortDate(end)}`;
  if (!a || !b) return null;

  const spansYears = a.getUTCFullYear() !== b.getUTCFullYear();
  const notThisYear = b.getUTCFullYear() !== thisYear;

  if (spansYears) return `${withYear(a)} – ${withYear(b)}`;
  if (notThisYear) return `${shortDate(start)} – ${withYear(b)}`;
  return `${shortDate(start)} – ${shortDate(end)}`;
}

/** Whole days between two "YYYY-MM-DD" days, inclusive of both ends. */
export function dayCount(
  start: string | null | undefined,
  end: string | null | undefined
) {
  if (!start || !end) return null;
  const a = utcDate(start);
  const b = utcDate(end);
  if (!a || !b) return null;
  const days = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
  return days > 0 ? days : null;
}
