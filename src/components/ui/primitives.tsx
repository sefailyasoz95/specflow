"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

export function Button({
  variant = "ink",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ink" | "solid" | "quiet" | "paper" | "paper-quiet" | "commit";
  size?: "sm" | "md";
}) {
  return (
    <button
      className={cn(
        "press inline-flex items-center justify-center gap-1.5 rounded-lg font-medium",
        "disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "h-7 px-2.5 text-[12.5px]" : "h-9 px-3.5 text-[13.5px]",
        variant === "ink" &&
          "bg-ink-700 text-fg hover:bg-ink-600",
        variant === "solid" &&
          "bg-fg text-ink-900 hover:bg-white",
        variant === "quiet" &&
          "text-fg-mid hover:bg-ink-800 hover:text-fg",
        // On paper, the commit action is the darkest thing on the page.
        variant === "commit" &&
          "bg-paper-fg text-paper hover:bg-black",
        variant === "paper" &&
          "bg-paper-warm text-paper-fg hover:bg-paper-line",
        variant === "paper-quiet" &&
          "text-paper-mid hover:bg-paper-warm hover:text-paper-fg",
        className
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-lg bg-ink-800 px-3 text-[13.5px] text-fg",
        "placeholder:text-fg-dim",
        "transition-colors duration-150 focus:bg-ink-700 focus:outline-none",
        className
      )}
      {...props}
    />
  );
}

export function PaperInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-lg bg-paper-warm px-3 text-[13.5px] text-paper-fg",
        "placeholder:text-paper-dim",
        "transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-paper-line",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-lg bg-ink-800 px-3 py-2 text-[13.5px] leading-relaxed text-fg",
        "placeholder:text-fg-dim",
        "transition-colors duration-150 focus:bg-ink-700 focus:outline-none",
        className
      )}
      {...props}
    />
  );
}

/** Small mono fact: an estimate, a count, a requirement code. */
export function Fact({
  className,
  children,
  tone = "dim",
}: {
  className?: string;
  tone?: "dim" | "mid" | "paper";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[11px] tabular-nums",
        tone === "dim" && "text-fg-dim",
        tone === "mid" && "text-fg-mid",
        tone === "paper" && "text-paper-dim",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Eyebrow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <p className={cn("eyebrow text-fg-dim", className)}>{children}</p>;
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-1 py-8">
      <p className="display text-[17px] text-fg-mid">{title}</p>
      {hint ? (
        <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-fg-dim">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
