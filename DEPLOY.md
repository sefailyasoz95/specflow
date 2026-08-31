# Deploying Sprintfy

## Before the first deploy

The app is a standard Next.js App Router project. Nothing unusual is
needed — but three things will bite if they are missed.

### 1. Environment variables

Set all four in the Vercel project (Settings → Environment Variables), for
Production **and** Preview:

| Name | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same page — the publishable key, not the legacy anon key |
| `SUPABASE_SECRET_KEY` | same page — server only, never referenced from a client component |
| `OPENAI_API_KEY` | platform.openai.com |
| `OPENAI_PLANNING_MODEL` | optional; defaults to `gpt-5.6` |

### 2. Supabase

Run `supabase/schema.sql` in the SQL editor. It is the six migrations
concatenated and every statement is idempotent, so running it again on a
database that already has some of them is safe.

Then, in Authentication → URL Configuration, add the deployed origin to
the redirect allow-list. Without it, the email confirmation link sends
people to localhost.

### 3. Function duration

`/api/plan` calls a model and takes 30–60 seconds. With Fluid compute —
on by default — Hobby allows up to 300s, so the route's `maxDuration =
120` fits comfortably. If Fluid compute is ever turned off the ceiling
drops to 60s and planning will start timing out.

## Checks worth running before pointing anyone at it

```bash
npm run build          # the only check that catches build-only errors
npx tsc --noEmit
npx eslint src
```

Then, on the deployed URL:

1. `/` — the landing page types its greeting and, in a browser with
   WebMCP on, lists the tools it just registered.
2. Console: `const s = await fetch('/evals.js').then(r=>r.text()); (0,eval)(s); await SprintfyEvals.run()`
   — seven scenarios against the live database.
3. `/projects/new` — a real brief, end to end, and the diff at the end.

## Known environment note

The build fetches Fraunces, Archivo and IBM Plex Mono from Google Fonts.
Vercel's builders reach it fine; a sandbox without egress to
`fonts.googleapis.com` cannot build the project at all. If that ever
becomes a problem, self-host the three faces with `next/font/local`.
