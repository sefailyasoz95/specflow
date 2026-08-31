"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button, Eyebrow, Input, Textarea } from "./ui/primitives";
import { Select } from "./ui/select";
import { DateField } from "./ui/date-field";
import { cn } from "@/lib/utils";

const SPRINT_LENGTHS = [
  { value: "1_week", label: "1 week" },
  { value: "2_weeks", label: "2 weeks" },
  { value: "3_weeks", label: "3 weeks" },
  { value: "4_weeks", label: "4 weeks" },
];

const STACK_SUGGESTIONS = [
  "Next.js",
  "React Native",
  "TypeScript",
  "NestJS",
  ".NET",
  "Supabase",
  "Postgres",
  "Stripe",
  "AWS",
];

const ACCEPT = ".md,.markdown,.txt,.pdf,.docx";

/* There was a list of stages here, advanced by a timer — "Reading the
   brief", "Sequencing by risk" — none of which the client can actually
   observe. It is one request, and until it returns we know nothing about
   where inside it the model is. Inventing progress in a product whose
   whole argument is that nothing should be faked was the wrong thing to
   ship, so it is gone. What is left is true: it is working, and here is
   how long it has been. */

export function NewProject() {
  const router = useRouter();
  const [mode, setMode] = useState<"write" | "upload">("write");
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [stack, setStack] = useState<string[]>([]);
  const [stackDraft, setStackDraft] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sprintLength, setSprintLength] = useState("2_weeks");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const tick = setInterval(
      () => setElapsed(Math.round((Date.now() - started) / 1000)),
      1000
    );
    return () => clearInterval(tick);
  }, [busy]);

  const ready = mode === "write" ? brief.trim().length >= 40 : !!file;

  function addTag(value: string) {
    const tag = value.trim().replace(/,$/, "");
    if (!tag || stack.includes(tag)) return;
    setStack((s) => [...s, tag]);
    setStackDraft("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;

    setBusy(true);
    setElapsed(0);
    setError(null);

    const form = new FormData();
    form.set("name", name.trim());
    form.set("techStack", stack.join(","));
    form.set("startDate", startDate);
    form.set("endDate", endDate);
    form.set("sprintLength", sprintLength);
    if (mode === "upload" && file) form.set("file", file);
    else form.set("brief", brief.trim());

    try {
      const res = await fetch("/api/plan", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "The planner could not finish.");
        setBusy(false);
        return;
      }

      toast.success(
        `${data.counts.tasks} tasks across ${data.counts.sprints} sprints — waiting for your approval.`
      );
      router.push(`/projects/${data.projectId}`);
    } catch {
      setError("The request did not get through. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <header className="mb-9">
        <Link
          href="/projects"
          className="press -ml-1 inline-block rounded px-1 text-[13px] text-fg-dim hover:text-fg"
        >
          ← Projects
        </Link>
        <h1 className="display mt-4 text-[32px] text-fg">Start a project</h1>
        <p className="mt-2 max-w-[54ch] text-[13.5px] leading-relaxed text-fg-mid">
          Give it the messy version — the brief you already have, or the one in
          your head. It comes back as requirements, sprints and estimates, as a
          diff you approve. Nothing is written until you do.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-7">
        {/* mode */}
        <div className="flex items-center gap-5 border-b border-ink-hair pb-3">
          {(
            [
              ["write", "Describe it"],
              ["upload", "Upload a PRD"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={cn(
                "press relative py-1 text-[13.5px] transition-colors duration-150",
                mode === id ? "text-fg" : "text-fg-dim hover:text-fg-mid"
              )}
            >
              {label}
              {mode === id ? (
                <span className="absolute -bottom-[13px] left-0 h-px w-full bg-fg" />
              ) : null}
            </button>
          ))}
        </div>

        {mode === "write" ? (
          <div className="space-y-2">
            <Eyebrow>The brief</Eyebrow>
            <Textarea
              rows={11}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder={
                "What are you building, who is it for, and what is already hurting?\n\nConstraints and non-goals matter as much as features — say what you are NOT doing, and what has to ship first."
              }
              className="leading-[1.6]"
            />
            <p className="text-[12px] text-fg-dim">
              {brief.trim().length < 40
                ? "A couple of sentences is enough to start."
                : `${brief.trim().length} characters`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Eyebrow>The document</Eyebrow>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className={cn(
                "press w-full rounded-xl border border-dashed px-5 py-9 text-center transition-colors duration-150",
                file
                  ? "border-fg-dim bg-ink-850"
                  : "border-ink-line hover:border-fg-dim hover:bg-ink-850"
              )}
            >
              {file ? (
                <>
                  <p className="text-[13.5px] text-fg">{file.name}</p>
                  <p className="mt-1 font-mono text-[11.5px] text-fg-dim">
                    {(file.size / 1024).toFixed(0)} KB · click to replace
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[13.5px] text-fg-mid">
                    Drop in a PRD, or click to choose
                  </p>
                  <p className="mt-1 font-mono text-[11.5px] text-fg-dim">
                    md · txt · pdf · docx — up to 8MB
                  </p>
                </>
              )}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-[12px] leading-relaxed text-fg-dim">
              Scanned PDFs come through as images, not text — paste the brief
              instead if yours is a scan.
            </p>
          </div>
        )}

        {/* the things a planner cannot guess */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Eyebrow>Project name</Eyebrow>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Leave blank and it will name it"
            />
          </div>

          <div className="space-y-2">
            <Eyebrow>Sprint length</Eyebrow>
            <Select
              ariaLabel="Sprint length"
              value={sprintLength}
              onValueChange={setSprintLength}
              className="h-9 w-full max-w-none"
              groups={[{ items: SPRINT_LENGTHS }]}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Eyebrow>Tech stack</Eyebrow>
            <Input
              value={stackDraft}
              onChange={(e) => {
                if (e.target.value.endsWith(",")) addTag(e.target.value);
                else setStackDraft(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(stackDraft);
                }
                if (e.key === "Backspace" && !stackDraft) {
                  setStack((s) => s.slice(0, -1));
                }
              }}
              placeholder="Type and press Enter"
            />

            {stack.length ? (
              <ul className="flex flex-wrap gap-1.5 pt-1">
                {stack.map((tag) => (
                  <li key={tag}>
                    <button
                      type="button"
                      onClick={() => setStack((s) => s.filter((t) => t !== tag))}
                      className="press group flex items-center gap-1.5 rounded-full bg-ink-800 py-1 pl-2.5 pr-2 text-[12px] text-fg-mid hover:bg-ink-700 hover:text-fg"
                    >
                      {tag}
                      <span aria-hidden className="font-mono text-fg-dim group-hover:text-fg">
                        ×
                      </span>
                      <span className="sr-only">Remove {tag}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <ul className="flex flex-wrap gap-1.5 pt-1">
              {STACK_SUGGESTIONS.filter((s) => !stack.includes(s)).map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => addTag(s)}
                    className="press rounded-full px-2.5 py-1 text-[12px] text-fg-dim hover:bg-ink-850 hover:text-fg-mid"
                  >
                    + {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <Eyebrow>Start date</Eyebrow>
            <DateField
              ariaLabel="Project start date"
              value={startDate}
              onChange={setStartDate}
              placeholder="When do you start?"
            />
          </div>

          <div className="space-y-2">
            <Eyebrow>Target delivery</Eyebrow>
            <DateField
              ariaLabel="Target delivery date"
              value={endDate}
              onChange={setEndDate}
              placeholder="Optional"
              min={startDate || undefined}
            />
            <p className="text-[12px] text-fg-dim">
              Give it a date and the sprints get dated to fit.
            </p>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg bg-rose-500/10 px-3.5 py-2.5 text-[13px] leading-relaxed text-rose-300">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-4 border-t border-ink-hair pt-5">
          {busy ? (
            <p className="flex items-center gap-2.5 text-[13px] text-fg-mid">
              <span className="waiting-dot size-[6px] rounded-full bg-waiting" />
              <span>
                Reading your brief and planning it.{" "}
                <span className="font-mono tabular-nums text-fg-dim">
                  {elapsed}s
                </span>
                {elapsed > 75 ? (
                  <span className="text-fg-dim"> — longer than usual, still going</span>
                ) : null}
              </span>
            </p>
          ) : (
            <p className="text-[12.5px] text-fg-dim">
              You will see the plan as a diff before anything is saved.
            </p>
          )}

          <Button
            type="submit"
            variant="solid"
            className="ml-auto"
            disabled={!ready || busy}
          >
            {busy ? "Planning…" : "Plan it"}
          </Button>
        </div>
      </form>
    </main>
  );
}
