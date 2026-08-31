"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "./ui/primitives";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();

    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    router.push("/projects");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="enter w-full max-w-sm space-y-3">
      <div className="space-y-1.5">
        <label className="text-[12.5px] text-ink-dim" htmlFor="email">
          Email
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[12.5px] text-ink-dim" htmlFor="password">
          Password
        </label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {error ? (
        <p className="rounded-lg border border-remove/30 bg-remove/10 px-3 py-2 text-[12.5px] text-remove">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" className="w-full" disabled={busy}>
        {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
      </Button>

      <p className="pt-1 text-center text-[12.5px] text-ink-faint">
        {mode === "login" ? (
          <>
            No account?{" "}
            <Link href="/signup" className="text-ink-dim underline underline-offset-2 hover:text-ink">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have one?{" "}
            <Link href="/login" className="text-ink-dim underline underline-offset-2 hover:text-ink">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
