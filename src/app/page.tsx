import Link from "next/link";
import { LandingAgent } from "@/components/landing-agent";
import { LandingPatch } from "@/components/landing-patch";

const TOOLS: [string, string][] = [
  [
    "get_project_context",
    "The plan, and what the human is looking at right now.",
  ],
  ["propose_plan", "A rough brief in; requirements, sprints, tasks and estimates out."],
  ["propose_changes", "Retitle, re-estimate, move sprints, reprioritise, delete."],
  ["apply_pending_changes", "Asks the human. Waits. Returns what they decided."],
  ["discard_pending_changes", "Withdraw a proposal that missed."],
  ["focus", "Move their view, and ring the thing you're talking about."],
];

export default function Home() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 py-5">
        <span className="display text-[17px] text-fg">SpecFlow</span>
        <div className="ml-auto flex items-center gap-1">
          <LandingAgent />
          <Link
            href="/login"
            className="press rounded-lg px-3 py-1.5 text-[13px] text-fg-mid hover:bg-ink-800 hover:text-fg"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-28">
        {/* The hero is the artefact itself: a real change set, rendered by
            the same component the product uses. */}
        <section className="grid items-center gap-12 pt-12 lg:grid-cols-[1fr_26rem] lg:gap-16 lg:pt-20">
          <div className="enter">
            <p className="eyebrow text-fg-dim">Built on WebMCP</p>

            <h1 className="display mt-5 text-[46px] leading-[1.04] text-fg sm:text-[58px]">
              Your agent doesn&apos;t
              <br />
              get write access.
              <br />
              <span className="text-fg-dim">It gets a pen.</span>
            </h1>

            <p className="mt-6 max-w-[46ch] text-[15px] leading-[1.6] text-fg-mid">
              SpecFlow turns a rough brief into requirements, sprints, tasks and
              estimates. Your agent does the decomposition inside the workspace
              you already use — but every write tool it has produces a diff, not
              a change. You read it. You sign it.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-2.5">
              <Link
                href="/signup"
                className="press rounded-lg bg-fg px-4 py-2.5 text-[13.5px] font-medium text-ink-900 hover:bg-white"
              >
                Start planning
              </Link>
              <Link
                href="/preview"
                className="press rounded-lg px-4 py-2.5 text-[13.5px] text-fg-mid hover:bg-ink-800 hover:text-fg"
              >
                Look around first
              </Link>
            </div>
          </div>

          <div className="enter lg:mt-0">
            <LandingPatch />
          </div>
        </section>

        {/* Three moves, and they really are a sequence, so they're numbered. */}
        <section className="mt-28 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {[
            {
              n: "01",
              title: "It reads the room",
              body: "get_project_context returns the plan and the human's live view — the open sprint, the active filter. The agent proposes into a context, not a vacuum.",
            },
            {
              n: "02",
              title: "It writes a diff",
              body: "Every write tool authors a change set. Additions, field-level changes, removals. A sprint and the twelve tasks inside it arrive as one reviewable unit.",
            },
            {
              n: "03",
              title: "You answer, in-band",
              body: "apply_pending_changes blocks on your decision. Approve and it lands in one transaction. Reject and your reason goes back as the tool result.",
            },
          ].map((c) => (
            <article key={c.n}>
              <span className="font-mono text-[11.5px] text-fg-dim">{c.n}</span>
              <h3 className="display mt-2 text-[19px] text-fg">{c.title}</h3>
              <p className="mt-2 text-[13.5px] leading-[1.6] text-fg-mid">
                {c.body}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-24">
          <h2 className="display text-[26px] text-fg">The tool surface</h2>
          <ul className="mt-6">
            {TOOLS.map(([name, desc]) => (
              <li
                key={name}
                className="grid gap-x-8 gap-y-1 border-b border-ink-hair py-3.5 last:border-0 sm:grid-cols-[16rem_1fr]"
              >
                <span className="font-mono text-[13px] text-fg">{name}</span>
                <span className="text-[13.5px] text-fg-mid">{desc}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 max-w-[62ch] text-[13px] leading-relaxed text-fg-dim">
            The set changes with the page. The projects list offers
            <span className="font-mono text-fg-mid"> list_projects </span>
            and
            <span className="font-mono text-fg-mid"> create_project </span>
            instead — which is what <span className="font-mono">toolchange</span>{" "}
            is for.
          </p>
        </section>

        <section className="mt-24 max-w-[62ch]">
          <h2 className="display text-[26px] text-fg">Turning WebMCP on</h2>
          <p className="mt-3 text-[13.5px] leading-[1.6] text-fg-mid">
            Open SpecFlow inside ChatGPT&apos;s browser, or in Chrome with the
            flag enabled. The badge in the header turns on and lists the live
            tools.
          </p>
          <ol className="mt-5 space-y-2.5">
            {[
              ["1", "chrome://flags/#enable-webmcp-testing", true],
              ["2", "Set it to Enabled, then relaunch Chrome.", false],
              ["3", "Reload this page.", false],
            ].map(([n, text, mono]) => (
              <li key={n as string} className="flex gap-3 text-[13.5px]">
                <span className="font-mono text-fg-dim">{n as string}</span>
                <span className={mono ? "font-mono text-[12.5px] text-fg-mid" : "text-fg-mid"}>
                  {text as string}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
