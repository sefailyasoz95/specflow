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
