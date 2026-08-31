import Link from "next/link";
import { LandingArrival } from "@/components/landing-arrival";
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
        <span className="display text-[17px] text-fg">Sprintfy</span>
        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/login"
            className="press rounded-lg px-3 py-1.5 text-[13px] text-fg-mid hover:bg-ink-800 hover:text-fg"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-28">
        {/* The page introduces itself, shows what it just gave the
            visitor's agent, and asks one question. The artefact sits
            beside it as the proof. */}
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_25rem] lg:gap-16">
          <LandingArrival />
          <div className="enter lg:mt-0">
            <LandingPatch />
          </div>
        </div>

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
            Open Sprintfy inside ChatGPT&apos;s browser, or in Chrome with the
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
