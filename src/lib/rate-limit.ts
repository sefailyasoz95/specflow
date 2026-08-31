/* ------------------------------------------------------------------ *
 * Planning quota
 *
 * The planner is the only endpoint in Sprintfy that spends money, and
 * signing up costs a visitor about three seconds. So authentication
 * bounds who can call it, not how often — that is this file's job.
 *
 * Two windows, one query. The hourly cap is the one that stops a loop;
 * the daily cap is the one that stops a patient loop. Both are far above
 * what a person planning real projects will ever hit: the honest usage
 * pattern is a handful of briefs and then a long time spent reading the
 * plan that came back.
 * ------------------------------------------------------------------ */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

export const PLANS_PER_HOUR = 8;
export const PLANS_PER_DAY = 25;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export type RateVerdict =
  | { ok: true }
  | { ok: false; message: string; retryAfterSeconds: number };

function minutesUntil(ms: number) {
  return Math.max(1, Math.ceil(ms / 60_000));
}

/**
 * Reads the caller's recent planning calls and decides whether one more
 * is allowed.
 *
 * Fails open. If the quota table cannot be read the planner still works:
 * a broken counter should degrade the ceiling, not the product. The real
 * ceiling — the one that cannot fail open — is the spend limit set on the
 * OpenAI account itself.
 */
export async function checkPlanRate(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<RateVerdict> {
  const now = Date.now();

  const { data, error } = await supabase
    .from("plan_runs")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", new Date(now - DAY).toISOString())
    .order("created_at", { ascending: false })
    .limit(PLANS_PER_DAY + PLANS_PER_HOUR);

  if (error || !data) return { ok: true };

  const times = data
    .map((row) => Date.parse(row.created_at))
    .filter((t) => Number.isFinite(t));

  const lastHour = times.filter((t) => t > now - HOUR);

  if (lastHour.length >= PLANS_PER_HOUR) {
    // The oldest call still inside the window is the one whose expiry
    // frees the next slot.
    const oldest = lastHour[lastHour.length - 1];
    const wait = oldest + HOUR - now;
    return {
      ok: false,
      retryAfterSeconds: Math.max(60, Math.ceil(wait / 1000)),
      message: `That is ${PLANS_PER_HOUR} plans in an hour, which is the limit. Planning a project costs a real model call, so the ceiling is there to keep this demo affordable. Try again in about ${minutesUntil(wait)} minutes — or open the plan you already have and edit it, which is free.`,
    };
  }

  if (times.length >= PLANS_PER_DAY) {
    const oldest = times[times.length - 1];
    const wait = oldest + DAY - now;
    return {
      ok: false,
      retryAfterSeconds: Math.max(60, Math.ceil(wait / 1000)),
      message: `That is ${PLANS_PER_DAY} plans in a day, which is the limit. Editing, approving and rejecting stay open — those cost nothing. New plans unlock again in about ${minutesUntil(wait)} minutes.`,
    };
  }

  return { ok: true };
}

/**
 * Records a call. Written before the model is reached, on purpose: a
 * brief the planner rejects is billed exactly like one it accepts, so a
 * counter that only counted successes would miss the cheapest way to run
 * up a bill.
 */
export async function recordPlanRun(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  await supabase.from("plan_runs").insert({ user_id: userId });
}
