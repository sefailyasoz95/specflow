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
        size === "sm" ? "h-8 px-3 text-[12.5px]" : "h-9 px-3.5 text-[13.5px]",
        // Every variant carries a surface or an edge. A control that is
        // only a word is a control nobody finds.
        variant === "ink" &&
          "bg-control text-fg ring-1 ring-control-edge/60 hover:bg-control-hover hover:ring-control-edge",
        variant === "solid" &&
          "bg-fg text-ink-900 hover:bg-white",
        variant === "quiet" &&
          "text-fg-mid ring-1 ring-control-edge/45 hover:bg-control hover:text-fg hover:ring-control-edge",
        variant === "commit" &&
          "bg-paper-fg text-paper hover:bg-black",
        variant === "paper" &&
          "bg-paper-warm text-paper-fg ring-1 ring-paper-line hover:bg-paper-line",
        variant === "paper-quiet" &&
          "text-paper-mid ring-1 ring-paper-line/70 hover:bg-paper-warm hover:text-paper-fg",
        className
      )}
      {...props}
    />
  );
}

/** A square control for an icon — back, edit, close. Same surface rules. */
export function IconButton({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "press inline-flex size-8 items-center justify-center rounded-lg",
        "bg-control text-fg-mid ring-1 ring-control-edge/60",
        "hover:bg-control-hover hover:text-fg hover:ring-control-edge",
        "disabled:pointer-events-none disabled:opacity-40",
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
        // An edge, because a field with none is invisible against the page
        // it sits on. Inside a modal it reads as recessed; at the bottom of
        // a board it was a slightly darker rectangle nobody found.
        "ring-1 ring-inset ring-control-edge",
        "placeholder:text-fg-mid",
        "transition-colors duration-150",
        "focus:bg-ink-700 focus:outline-none focus:ring-fg-dim",
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
  title,
}: {
  className?: string;
  tone?: "dim" | "mid" | "paper";
  children: React.ReactNode;
  /** A compressed number should be able to say what it counts. */
  title?: string;
}) {
  return (
    <span
      title={title}
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
