"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Typewriter } from "./typewriter";
import { useWebMCP } from "@/webmcp/use-webmcp";
import type { ToolDescriptor } from "@/webmcp/registry";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * The arrival
 *
 * The page introduces itself and asks one question. It does NOT pretend
 * to be an agent — there is no model behind a scripted greeting, and
 * faking one on the front door of a product whose whole claim is "the
 * agent cannot write, it proposes" would undercut the claim.
 *
 * What it does instead is show, in the same beat, the thing no other
 * landing page can: the tools it just handed the visitor's agent. That
 * is true, it is provable, and it is the product's thesis made visible.
 *
 * The three choices are real, and an agent can take them too — the same
 * routes are exposed as tools below, so "show me a demo" works whether a
 * human clicks it or a model calls it.
 * ------------------------------------------------------------------ */

const GREETING =
  "Welcome to SpecFlow, your agent-native sprint planning board.";

const CHOICES = [
  { id: "demo", label: "Show me a demo", href: "/preview" },
  { id: "signup", label: "Create an account", href: "/signup" },
  { id: "signin", label: "I already have an account", href: "/login" },
] as const;

/* Optional. Drop a short file at /public/sounds/arrive.mp3 and it plays
   on the gesture — never on load, which browsers block and visitors
   resent.

   The element lives at module scope, not in the component: the click that
   plays it also navigates away, and an element owned by an unmounting
   component can be collected mid-sound. The module outlives the route. */
let chimeEl: HTMLAudioElement | null = null;

function playChime() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  if (!chimeEl) {
    chimeEl = new Audio("/sounds/arrive.mp3");
    chimeEl.volume = 0.35;
    chimeEl.preload = "auto";
  }
  // Restart, so a second click is heard rather than swallowed.
  chimeEl.currentTime = 0;
  chimeEl.play().catch(() => {
    /* no file, or the browser declined. Silence is a fine outcome. */
  });
}

/** Warm the file up so the first click is not the first network request. */
function useChimePreload() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (chimeEl) return;
    const audio = new Audio("/sounds/arrive.mp3");
    audio.volume = 0.35;
    audio.preload = "auto";
    chimeEl = audio;
  }, []);
}

export function LandingArrival() {
  const router = useRouter();
  useChimePreload();
  const [step, setStep] = useState(0);

  const { surface, toolNames } = useWebMCP(() => buildLandingTools(router));
  const live = surface !== "unavailable";

  /* One orchestrated sequence, not scattered effects. The eyebrow and
     the headline are on timers; everything after waits for the sentence
     to finish typing, so the page never talks over itself. */
  useEffect(() => {
    const timers = [120, 300].map((ms, i) =>
      setTimeout(() => setStep((s) => Math.max(s, i + 1)), ms)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const onGreetingTyped = () => {
    setStep((s) => Math.max(s, 3));
    setTimeout(() => setStep((s) => Math.max(s, 4)), 260);
  };

  const shown = (n: number) => step >= n;

  return (
    <section className="pt-14 lg:pt-20">
      <Reveal show={shown(1)}>
        <p className="eyebrow text-fg-dim">Built on WebMCP</p>
      </Reveal>

      <Reveal show={shown(2)} className="mt-5">
        <h1 className="display max-w-[19ch] text-[40px] leading-[1.06] text-fg sm:text-[54px]">
          <Typewriter
            text={GREETING}
            startDelay={180}
            speed={24}
            onDone={onGreetingTyped}
          />
        </h1>
      </Reveal>

      {/* The handover. Only claimed when it actually happened. */}
      <Reveal show={shown(3)} className="mt-7">
        {live ? (
          <div>
            <p className="flex items-center gap-2 text-[14px] text-fg-mid">
              <span className="waiting-dot size-[6px] rounded-full bg-waiting" />
              This page just handed your agent {toolNames.length} tools.
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {toolNames.map((name, i) => (
                <li
                  key={name}
                  className="font-mono text-[12px] text-fg-dim"
                  style={{
                    animation: `rise 320ms var(--ease-out-quart) both`,
                    animationDelay: `${i * 70}ms`,
                  }}
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="max-w-[54ch] text-[14px] leading-relaxed text-fg-dim">
            Your browser has WebMCP switched off, so the tools on this page
            are dormant. Everything below still works —{" "}
            <span className="text-fg-mid">
              turn the flag on and reload to watch them arrive.
            </span>
          </p>
        )}
      </Reveal>

      <Reveal show={shown(4)} className="mt-10">
        <p className="text-[15px] text-fg">What would you like to do?</p>

        <div className="mt-4 flex flex-wrap gap-2.5">
          {CHOICES.map((choice, i) => (
            <button
              key={choice.id}
              onClick={() => {
                playChime();
                router.push(choice.href);
              }}
              className={cn(
                "press sheen rounded-full px-4 py-2.5 text-[13.5px]",
                i === 0
                  ? "sheen-light bg-fg text-ink-900 hover:bg-white"
                  : "bg-ink-800 text-fg-mid hover:bg-ink-700 hover:text-fg"
              )}
              style={
                {
                  animation: `rise 320ms var(--ease-out-quart) both`,
                  animationDelay: `${i * 70}ms`,
                  // The sheen is one gesture crossing the row, so each
                  // pill picks it up shortly after the one before it.
                  "--sheen-delay": `${i * 320}ms`,
                } as React.CSSProperties
              }
            >
              {choice.label}
            </button>
          ))}
        </div>

        {live ? (
          <p className="mt-4 max-w-[52ch] text-[13px] leading-relaxed text-fg-dim">
            Or just ask your agent — it can take any of these itself, and
            read this page to you, without an account.
          </p>
        ) : null}
      </Reveal>
    </section>
  );
}

function Reveal({
  show,
  className,
  children,
}: {
  show: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "transition-[opacity,transform] duration-[420ms] ease-[cubic-bezier(0.23,1,0.32,1)]",
        show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        className
      )}
    >
      {children}
    </div>
  );
}

/* --------------------------------------------------------- the tools */

function buildLandingTools(
  router: ReturnType<typeof useRouter>
): ToolDescriptor[] {
  const str = (description: string) => ({ type: "string", description });

  return [
    {
      name: "about_specflow",
      description:
        "Explain what SpecFlow is, how agents work with it, and what tools become available once a project is open. Call this when the visitor asks what this site is.",
      annotations: { readOnlyHint: true },
      inputSchema: { type: "object", properties: {} },
      execute: () =>
        JSON.stringify(
          {
            what: "SpecFlow turns rough software requirements into a structured plan: requirements, sprints, tasks and effort estimates.",
            theIdea:
              "Agents never write to a plan. Every write tool authors a change set — a reviewable diff — and apply_pending_changes hands control to the human and waits for their decision, then returns it to you.",
            youCanDoNow: [
              "start_guided_demo — open a worked example, no account needed",
              "begin_signup — start an account",
              "begin_sign_in — return to an existing account",
            ],
            toolsInsideAProject: [
              "get_project_context",
              "propose_plan",
              "propose_changes",
              "apply_pending_changes",
              "discard_pending_changes",
              "focus",
            ],
          },
          null,
          2
        ),
    },
    {
      name: "start_guided_demo",
      description:
        "Open a fully populated example project so the visitor can see the review loop — an agent's proposal, its diff, and the approval — without signing up. Use this when they want to see it rather than read about it.",
      inputSchema: { type: "object", properties: {} },
      execute: () => {
        router.push("/preview");
        return "Opened the demo workspace. It is a real project with a pending proposal waiting in the review panel — open the patch to see the diff the human is asked to approve. Nothing here needs an account.";
      },
    },
    {
      name: "begin_signup",
      description:
        "Take the visitor to the sign-up screen. SpecFlow accounts are email and password; the visitor types their own credentials.",
      inputSchema: {
        type: "object",
        properties: { email: str("Optional: prefill this email address.") },
      },
      execute: (input) => {
        const email = input.email ? String(input.email) : "";
        router.push(email ? `/signup?email=${encodeURIComponent(email)}` : "/signup");
        return "Opened the sign-up screen. Ask them to enter their own password — you should not handle it.";
      },
    },
    {
      name: "begin_sign_in",
      description:
        "Take a returning visitor to the sign-in screen.",
      inputSchema: { type: "object", properties: {} },
      execute: () => {
        router.push("/login");
        return "Opened the sign-in screen.";
      },
    },
  ];
}
