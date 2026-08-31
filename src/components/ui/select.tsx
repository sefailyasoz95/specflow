"use client";

import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Select
 *
 * Radix handles what is genuinely hard about a listbox — roving focus,
 * type-ahead, collision-aware placement, returning focus to the trigger,
 * the right ARIA — and nothing about how it looks. The look is ours.
 *
 * This is a filter people touch tens of times a day, so the motion is
 * deliberately small: 150ms in, faster out, scaled from the trigger
 * rather than the panel's own centre.
 * ------------------------------------------------------------------ */

export type SelectItem = {
  value: string;
  label: string;
  /** Right-aligned, mono: a count, an estimate, a status. */
  hint?: string;
};

export type SelectGroup = {
  label?: string;
  items: SelectItem[];
};

export function Select({
  value,
  onValueChange,
  groups,
  placeholder = "Select…",
  ariaLabel,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  groups: SelectGroup[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        className={cn(
          "press group inline-flex h-8 max-w-[15rem] items-center gap-2 overflow-hidden rounded-lg",
          "bg-ink-800 pl-2.5 pr-2 text-[12.5px] text-fg-mid",
          "hover:bg-ink-700 hover:text-fg",
          "data-[state=open]:bg-ink-700 data-[state=open]:text-fg",
          "focus:outline-none",
          className
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          <RadixSelect.Value placeholder={placeholder} />
        </span>
        <RadixSelect.Icon asChild>
          <ChevronDown
            className="size-3.5 shrink-0 text-fg-dim transition-transform duration-150
                       group-data-[state=open]:rotate-180"
            strokeWidth={2}
          />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className={cn(
            "popover z-50 min-w-[var(--radix-select-trigger-width)] max-w-[20rem]",
            "overflow-hidden rounded-xl bg-ink-700 p-1",
            "shadow-[0_18px_44px_-12px_rgba(0,0,0,0.75)] ring-1 ring-ink-line"
          )}
        >
          <RadixSelect.Viewport className="max-h-[18rem]">
            {groups.map((group, gi) => (
              <RadixSelect.Group key={gi}>
                {gi > 0 ? (
                  <RadixSelect.Separator className="my-1 h-px bg-ink-600" />
                ) : null}

                {group.label ? (
                  <RadixSelect.Label className="eyebrow px-2.5 pb-1 pt-2 text-fg-dim">
                    {group.label}
                  </RadixSelect.Label>
                ) : null}

                {group.items.map((item) => (
                  <RadixSelect.Item
                    key={item.value}
                    value={item.value}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center gap-2.5",
                      "rounded-lg py-1.5 pl-7 pr-2.5 text-[13px] text-fg-mid outline-none",
                      "data-[highlighted]:bg-ink-600 data-[highlighted]:text-fg",
                      "data-[state=checked]:text-fg"
                    )}
                  >
                    <RadixSelect.ItemIndicator className="absolute left-2 flex items-center">
                      <Check className="size-3.5 text-waiting" strokeWidth={2.5} />
                    </RadixSelect.ItemIndicator>

                    <RadixSelect.ItemText>{item.label}</RadixSelect.ItemText>

                    {item.hint ? (
                      <span className="ml-auto pl-3 font-mono text-[11px] tabular-nums text-fg-dim">
                        {item.hint}
                      </span>
                    ) : null}
                  </RadixSelect.Item>
                ))}
              </RadixSelect.Group>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
