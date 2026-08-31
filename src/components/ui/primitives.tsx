"use client";

import { cn } from "@/lib/utils";
import * as React from "react";

/* Buttons answer within 160ms and press in — the cheapest signal that
   an interface is alive. */
export function Button({
  variant = "default",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost" | "danger" | "agent";
  size?: "sm" | "md";
}) {
  return (
    <button
      className={cn(
        "press inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium",
        "disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "h-7 px-2.5 text-[12.5px]" : "h-9 px-3.5 text-[13.5px]",
        variant === "default" &&
          "border-line bg-raised text-ink hover:bg-hover",
        variant === "primary" &&
          "border-transparent bg-ink text-canvas hover:bg-white",
        variant === "agent" &&
          "border-transparent bg-agent text-black hover:brightness-110",
        variant === "ghost" &&
          "border-transparent bg-transparent text-ink-dim hover:bg-raised hover:text-ink",
        variant === "danger" &&
          "border-line bg-transparent text-remove hover:bg-remove/10",
        className
      )}
      {...props}
    />
  );
}

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "agent" | "add" | "mod" | "remove" | "muted";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-wide",
        tone === "neutral" && "border-line bg-raised text-ink-dim",
        tone === "muted" && "border-transparent bg-transparent text-ink-faint",
        tone === "agent" && "border-agent/40 bg-agent/10 text-agent",
        tone === "add" && "border-add/40 bg-add/10 text-add",
        tone === "mod" && "border-mod/40 bg-mod/10 text-mod",
        tone === "remove" && "border-remove/40 bg-remove/10 text-remove",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13.5px] text-ink",
        "placeholder:text-ink-faint",
        "transition-colors duration-150 focus:border-agent/60 focus:outline-none",
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
        "w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] leading-relaxed text-ink",
        "placeholder:text-ink-faint",
        "transition-colors duration-150 focus:border-agent/60 focus:outline-none",
        className
      )}
      {...props}
    />
  );
}

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-surface",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Empty({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line px-6 py-10 text-center">
      <p className="text-[13.5px] text-ink-dim">{title}</p>
      {hint ? <p className="max-w-xs text-[12.5px] text-ink-faint">{hint}</p> : null}
    </div>
  );
}
