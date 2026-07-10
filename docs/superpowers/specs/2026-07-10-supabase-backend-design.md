# Supabase Backend Design — Launch Your Career

**Date:** 2026-07-10
**Status:** Approved approach A (supabase-js + SQL RPCs) with AI question-generation agent.

## Goal

Replace all mocked data in the Expo app (leaderboard, daily challenge, points/diamonds/streak, store) with a real Supabase backend. Auth screens stay exactly as they are today — no password auth wiring in this pass.

## Constraints

- User has an existing Supabase project; schema applied via Supabase CLI migrations.
- Login/Signup screens untouched. Identity comes from **Supabase anonymous sign-in** on first app launch ("Allow anonymous sign-ins" must be enabled in the project's Auth settings). Signup's name/school fields save to the profile row when submitted.
- No custom API server, no Node backend. Reads via supabase-js; the two cheat-sensitive writes via Postgres RPC functions.

## Schema (5 tables)

| Table | Columns | Notes |
|---|---|---|
| `profiles` | `id` (PK, FK auth.users), `name`, `school`, `city`, `state`, `points` int default 0, `diamonds` int default 0, `streak` int default 0, `last_answered` date | Auto-created by trigger on auth user creation. |
| `questions` | `id`, `prompt`, `options` jsonb (array of 4), `correct_index` smallint, `explanation` text, `active_date` date unique, `topic` text | One row per day. Client never sees `correct_index`. |
| `answers` | `user_id`, `question_id`, `selected_index`, `is_correct`, `answered_at` | `UNIQUE (user_id, question_id)` — DB enforces one attempt per day. |
| `rewards` | `id`, `title`, `cost` int (diamonds), `icon` text | Seeded from current Store screen items. |
| `redemptions` | `id`, `user_id`, `reward_id`, `redeemed_at` | Log only; no fulfillment flow. |

A view `today_question` exposes today's row from `questions` excluding `correct_index` and `explanation` — both are withheld until the user answers, then returned by `submit_answer`.

## Trusted logic (SQL functions, `security definer`)

### `submit_answer(p_question_id, p_selected_index)`
1. Reject if the caller already has an `answers` row for this question (also enforced by the unique constraint).
2. Grade against `correct_index`.
3. On correct: add points (100) and diamonds (10) to the caller's profile.
4. Streak: if `last_answered` = yesterday → `streak + 1`; if today → unchanged; else → 1. Update `last_answered` = today.
5. Return `{ is_correct, correct_index, explanation, points_earned, diamonds_earned, streak }` for the Result screen.

### `redeem_reward(p_reward_id)`
Atomically: check the caller's diamond balance ≥ cost, deduct, insert a `redemptions` row. Raise an error if insufficient.

## Security (RLS on every table)

- `profiles`: SELECT for all authenticated users (that *is* the leaderboard); UPDATE by owner limited to `name/school/city/state` (trigger or column check blocks economy columns). Economy columns change only inside the two functions.
- `questions`: no direct client access; reads go through the `today_question` view.
- `answers`, `redemptions`: owner SELECT; INSERT only via the functions.
- `rewards`: SELECT for all.
- Anon key ships in the app via `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`; RLS is the security boundary.

## Leaderboard

Plain query: `profiles` ordered by `points` desc, limited, with optional `eq` filter on `state`, `city`, or `school` matching the current user's profile. Replaces the four static mock boards in `LeaderboardScreen.jsx`.

## AI question-generation agent

The content pipeline is the app's real operating cost — one question per day, forever. An agent fills it:

- **Supabase Edge Function `generate-questions`**, scheduled weekly (Supabase cron). Idempotent top-up: count questions with `active_date` > today; if fewer than 14, call the Claude API to generate enough to reach 14, rotating topics (resumes, interviews, networking, workplace skills, college/trade paths).
- Each generated item: `prompt`, 4 `options`, `correct_index`, kid-appropriate `explanation` in the app's playful voice, `topic`. Inserted with sequential future `active_date`s.
- `ANTHROPIC_API_KEY` stored as an Edge Function secret — never in the app.
- Result screen shows the `explanation` returned by `submit_answer`. **Zero runtime API calls per user**; generation cost is one small batch per week.
- Model/params chosen at implementation time per the claude-api reference skill.

Manual fallback: questions can always be inserted via the dashboard table editor; the agent only tops up the future queue.

## App wiring

- Add `@supabase/supabase-js` (+ `@react-native-async-storage/async-storage` for session persistence).
- `lib/supabase.js`: client creation + ensure-anonymous-session helper.
- Swap mocks: Home (today's question teaser + profile economy), Challenge (`today_question`), Result (`submit_answer` response incl. explanation), Leaderboard (profiles query + filters), Store (`rewards` + `redeem_reward` + live diamond balance), Profile (profile row), Signup (upsert name/school to profile, navigation unchanged).

## Delivery

- `supabase/migrations/*.sql` — schema, RLS, functions, triggers.
- `supabase/seed.sql` — rewards from the Store screen + a starter batch of questions covering the next 14 days.
- `supabase/functions/generate-questions/` — the Edge Function.
- Applied to the user's existing project via Supabase CLI (`supabase link` + `db push`; one interactive login).

## Testing

- One integration script: signs in anonymously, fetches today's question, answers it twice (second attempt must fail), redeems a reward beyond its balance (must fail), verifies streak/points math.
- Edge Function: local invoke once with a mocked/live key; verify inserted rows validate (4 options, correct_index in range, unique dates).
- Existing jest suite keeps passing.

## Explicitly skipped (YAGNI)

- Password/email auth wiring (user checking app first; anonymous users can be linked to emails later).
- Streak freeze / weekend protection.
- Admin UI for questions (dashboard table editor suffices).
- Reward fulfillment beyond the redemption log.
- Career-coach chat (moderation surface for minors; revisit deliberately).
