import Link from "next/link";
import { LandingAgent } from "@/components/landing-agent";

const TOOLS = [
  ["get_project_context", "read", "The whole plan — plus what the human is looking at right now."],
  ["propose_plan", "propose", "Rough brief in, a full requirements / sprints / tasks diff out."],
  ["propose_task_changes", "propose", "Retitle, re-estimate, move between sprints, delete."],
  ["apply_pending_changes", "handoff", "Asks the human, and waits for their answer."],
  ["discard_pending_changes", "handoff", "Withdraw a proposal that missed."],
  ["focus", "point", "Move their view and ring the thing you are talking about."],
] as const;

const TONE = {
  read: "text-ink-faint",
  propose: "text-add",
  handoff: "text-agent",
  point: "text-mod",
} as const;

export default function Home() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex w-full max-w-4xl items-center gap-3 px-5 py-5">
        <span className="text-[15px] font-medium tracking-tight text-ink">
          Spec<span className="text-agent">Flow</span>
        </span>
        <div className="ml-auto flex items-center gap-2">
          <LandingAgent />
          <Link
            href="/login"
            className="press rounded-lg border border-line bg-raised px-3 py-1.5 text-[13px] text-ink hover:bg-hover"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-5 pb-24">
        <section className="enter max-w-2xl pt-16">
          <p className="font-mono text-[12px] uppercase tracking-widest text-agent">
            Built on WebMCP
          </p>
          <h1 className="mt-4 text-[42px] font-medium leading-[1.08] tracking-[-0.02em] text-ink sm:text-[56px]">
            Plan software <span className="text-ink-faint">with</span> your
            agent.
            <br />
            Not <span className="text-ink-faint">for</span> it.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-dim">
            SpecFlow turns a rough brief into requirements, sprints, tasks and
            estimates. Your agent does the decomposition inside the same
            workspace you use — but it can&apos;t write a thing. It proposes a
            diff. You approve it.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Link
              href="/signup"
              className="press rounded-lg bg-ink px-4 py-2.5 text-[13.5px] font-medium text-canvas hover:bg-white"
            >
              Start planning
            </Link>
            <Link
              href="/login"
              className="press rounded-lg border border-line px-4 py-2.5 text-[13.5px] text-ink-dim hover:bg-raised hover:text-ink"
            >
              I have an account
            </Link>
          </div>
        </section>

        <section className="mt-20 grid gap-3 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "It reads the room",
              body: "get_project_context returns the plan and the human's live view — which sprint is open, what's filtered. The agent proposes into context, not into a vacuum.",
            },
            {
              step: "02",
              title: "It proposes a diff",
              body: "Every write tool authors a change set. Additions, changes and removals render as a real diff in the review panel. Nothing has touched the database yet.",
            },
            {
              step: "03",
              title: "You decide, it hears you",
              body: "apply_pending_changes opens the diff and blocks until you approve or reject. Your answer — and your reason — goes straight back to the agent.",
            },
          ].map((c) => (
            <article
              key={c.step}
              className="rounded-xl border border-line bg-surface p-4"
            >
              <span className="font-mono text-[11px] text-agent">{c.step}</span>
              <h3 className="mt-2 text-[14px] font-medium text-ink">{c.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-faint">
                {c.body}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-14">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">
            The tool surface
          </h2>
          <ul className="mt-3 divide-y divide-line-soft rounded-xl border border-line bg-surface">
            {TOOLS.map(([name, kind, desc]) => (
              <li key={name} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
                <span className="font-mono text-[12.5px] text-ink">{name}</span>
                <span className={`font-mono text-[10.5px] uppercase tracking-wide ${TONE[kind]}`}>
                  {kind}
                </span>
                <span className="w-full text-[12.5px] text-ink-faint sm:w-auto sm:flex-1">
                  {desc}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14 rounded-xl border border-line bg-surface p-5">
          <h2 className="text-[14px] font-medium text-ink">
            Turning WebMCP on
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-dim">
            Open SpecFlow inside ChatGPT&apos;s browser, or in Chrome with the
            flag enabled:
          </p>
          <ol className="mt-3 space-y-1.5 text-[13px] text-ink-faint">
            <li>
              1. Go to{" "}
              <span className="font-mono text-ink-dim">
                chrome://flags/#enable-webmcp-testing
              </span>
            </li>
            <li>2. Set it to Enabled and relaunch Chrome.</li>
            <li>
              3. Come back — the badge in the header turns orange and lists the
              live tools.
            </li>
          </ol>
        </section>
      </main>
    </div>
  );
}
