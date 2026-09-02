# Counselor Booking — Launch Your Career

**Date:** 2026-09-02
**Status:** Approved design. Extends the [Supabase backend design](2026-07-10-supabase-backend-design.md); builds on the existing anonymous-auth Expo app.

## Goal

Let students browse a pool of counselors (not just their own school counselor), pick one, book a video session of a length the counselor offers, and manage that booking (reschedule/cancel) — with a Google Meet link generated automatically, a guardian kept in the loop, and a post-session star rating.

## Constraints

- Students keep using anonymous Supabase auth — no forced real-identity migration. A real email is only collected the first time a student books.
- Counselors are a second identity type in the *same* `auth.users` table, authenticated via Google OAuth through Supabase Auth (not anonymous) — used both for portal login and for granting Calendar access in one step.
- Google Calendar + Meet only. No Zoom, no Outlook. One provider, one OAuth integration.
- No payments in v1. Sessions are free.
- Counselor onboarding (profile + Calendar connection) happens on a **separate minimal static web portal** (plain HTML/JS + supabase-js, hosted on Vercel/Netlify), not inside the Expo app. The portal does exactly two jobs: one-time setup, and a way to cancel an upcoming session. Nothing more.
- **External prerequisite, not code:** the Google Cloud project's OAuth consent screen must be moved out of "Testing" publishing status (or complete Google's verification for the sensitive `calendar.events` scope) before onboarding real counselors. In Testing mode, refresh tokens for sensitive scopes expire after 7 days and the app is capped at 100 authorized users — unusable for production beyond a demo. This is a lead-time risk to plan around, not an engineering task.
- Counselors are approved manually (a human glances at their portal-submitted profile and flips a flag) — **this is not a background check or credential verification**, and carries no legal weight. Given the audience is 14–18-year-olds meeting an outside adult 1:1, this limitation is stated explicitly rather than implied.

## Schema

Extends the 5 existing tables (`profiles`, `questions`, `answers`, `rewards`, `redemptions`).

| Table | Columns | Notes |
|---|---|---|
| `profiles` (extended) | + `email`, + `guardian_email`, + `push_token` | Both emails collected together, required, the first time a student attempts to book. `guardian_email` must differ from `email` (rejected if equal — blocks the trivial self-approval bypass; this does *not* verify the address actually belongs to a guardian, which stays out of scope). |
| `counselors` | `id` (PK, FK `auth.users` — the counselor's Google-authenticated identity), `name`, `bio`, `photo_url`, `timezone` (IANA string), `working_hours` jsonb, `allowed_durations` int[] (subset of `{30,60,90,120}`, at least one required), `approved` bool default false, `calendar_connected` bool default false | Row created on first portal login; not bookable until `approved = true` (manual) and `calendar_connected = true`. |
| `counselor_tokens` | `counselor_id` (PK, FK `counselors`), `refresh_token` | **Separate table, zero client-facing RLS policies, service-role access only.** Kept apart from `counselors` because Postgres RLS is row-level, not column-level — a client-readable `counselors` row would otherwise leak this column to its own owner. |
| `bookings` | `id`, `student_id`, `counselor_id`, `start_time`, `end_time`, `meet_link`, `status` ('confirmed'\|'cancelled'), `created_at` | See constraint below. Rows are never deleted (kept for review-eligibility and history), only status-flipped. |
| `reviews` | `booking_id` (unique FK), `rating` smallint 1–5, `created_at` | Rating only — no comment field, so no moderation surface exists to build. |

**Overlap constraint** (needs `CREATE EXTENSION IF NOT EXISTS btree_gist;`):

```sql
ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    counselor_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  ) WHERE (status = 'confirmed');
```

The `WHERE (status = 'confirmed')` clause is load-bearing, not decoration: without it, a cancelled booking's old time range would still count as a conflict forever, permanently blocking that slot after a single cancellation. A plain `UNIQUE(counselor_id, start_time)` was considered and rejected — with variable session lengths, two bookings can have different start times and still overlap (3:00–4:30 vs 3:30–4:00), which a start-time-only uniqueness check would miss.

This constraint — re-checked by Postgres on every `INSERT` and `UPDATE` — is the actual source of truth for "is this slot taken." The freebusy check in `get-availability` is only a UI hint to avoid offering obviously-taken slots; the constraint is what prevents a real double-book under concurrent requests.

## Trusted logic (Edge Functions)

All booking writes go through these functions using the service role — there is no direct client `INSERT`/`UPDATE` on `bookings`, because the validation (duration checks, lead-time cutoffs, the Google Calendar API call) can't be expressed as a row-level policy.

### `save-calendar-token(provider_refresh_token)`
Called by the portal immediately after the Google OAuth redirect completes (the refresh token is only available in that window — Supabase does not re-surface it later). Persists it into `counselor_tokens` keyed by the caller's `auth.uid()`. The portal always requests the OAuth flow with `access_type: 'offline'` and `prompt: 'consent'`, so a fresh refresh token is issued on every login, not just the first.

### `get-availability(counselor_id, duration_minutes)`
1. Reject if `duration_minutes` is not in that counselor's `allowed_durations` (defense in depth — the app UI already only offers valid options, but the function doesn't trust the client).
2. Refresh a Google access token from the stored refresh token; call `freebusy.query`.
3. Intersect busy blocks with `working_hours` (converted using the counselor's stored `timezone`).
4. Return start times, at least 2 hours from now, over the next ~14 days, where a full `duration_minutes`-long window is free.
5. On `invalid_grant` from Google (token revoked): flip `calendar_connected = false`, return "unavailable."

### `create-booking(counselor_id, start_time, duration_minutes)`
1. Validate `duration_minutes ∈ allowed_durations` and `start_time ≥ now() + 2h`.
2. Validate the caller's profile has `email` and `guardian_email` set (`guardian_email ≠ email`); if missing, the app collects them first via a one-time modal before calling this.
3. Compute `end_time = start_time + duration_minutes`.
4. Create a Google Calendar event on the counselor's calendar: `conferenceData.createRequest` (auto-generates the Meet link), attendees = student's email + counselor + guardian's email (`optional: true`), `sendUpdates: 'all'`. **This single call is the entire notification mechanism** — Google emails the confirmation to all three parties natively; no separate email service exists in this design.
5. Insert the `bookings` row. If the exclusion constraint rejects it (lost a race to a concurrent booking), delete the just-created Calendar event and return "slot no longer available."
6. Best-effort Expo push to the student's `push_token` (non-blocking — booking succeeds even if push fails or no token is on file).

Note on the guardian attendee: because they're a real Calendar attendee (not a stripped-down notice), they receive the same Meet link and could join the live call. This is intentional — for this app's minor-safety context, standing parental access to observe is the desired behavior, not an accidental leak.

### `cancel-booking(booking_id)`
Self-service only (student or counselor on that row). Guards: `start_time > now()` (can't cancel something that already happened) and `now() < start_time - 1h` (can't cancel last-minute). Deletes the Calendar event (`sendUpdates: 'all'` notifies everyone), sets `status = 'cancelled'`.

### `reschedule-booking(booking_id, new_start_time, new_duration_minutes)`
Student-only. Guards on **both ends**: the booking being left must satisfy `start_time > now()` and `now() < start_time - 1h`; the new slot must satisfy `new_start_time ≥ now() + 2h` and `new_duration_minutes ∈ allowed_durations`. Duration is freely re-pickable, not locked to the original — it's the same picker UI as a fresh booking. `PATCH`es the *same* Calendar event's start/end (same event thread, same Meet link), `sendUpdates: 'all'`. Updates `bookings.start_time`/`end_time` (re-checked against the exclusion constraint on `UPDATE` — a reschedule can't land on top of another booking either).

### `deactivate-counselor(counselor_id)`
Triggered when an operator flips `approved` to `false`. This is a **privileged path that bypasses the 1h/2h self-service cutoffs** — those exist to stop students/counselors from cancelling on each other, not to block an operator removing someone for cause. Loops over that counselor's future `confirmed` bookings: attempts to delete the Calendar event (which notifies everyone via `sendUpdates`) and sets `status = 'cancelled'`.

**Known accepted limitation:** if the counselor's own Google token is already dead (a plausible scenario for a for-cause removal — e.g. they revoked access themselves), the Calendar delete fails silently. The booking still flips to `cancelled` in the database, but nobody gets notified automatically and the Meet link isn't actually killed, since editing their calendar requires their own live token. This is documented as a **manual runbook step**: if a for-cause deactivation coincides with a dead token, the operator personally follows up with the affected student/guardian using the contact info already on file. No new email infrastructure was added to close this gap — it's rare enough (an admin-triggered removal *and* an already-revoked token, at the same time) to accept rather than build around.

## Security (RLS)

- `profiles`: existing rules, plus owner-only update of `email`/`guardian_email`.
- `counselors`: `SELECT` for authenticated users where `approved = true AND calendar_connected = true` (the public bookable pool); full `SELECT`/`UPDATE` of their own row where `id = auth.uid()`.
- `counselor_tokens`: no client-facing policies at all. Service role only.
- `bookings`: `SELECT` where `student_id = auth.uid() OR counselor_id = auth.uid()`. No client `INSERT`/`UPDATE`/`DELETE` — everything goes through the Edge Functions above.
- `reviews`: `INSERT` allowed only when `EXISTS (SELECT 1 FROM bookings WHERE id = booking_id AND student_id = auth.uid() AND status = 'confirmed' AND end_time < now())` — one review per booking (unique FK), only after it happened, only by the student who booked it, only if it wasn't cancelled. `SELECT` open to authenticated users (powers the average-rating display on counselor cards).

## App wiring

- New dependency: `expo-notifications` (best-effort push on booking events).
- New tab `app/(tabs)/counselors.jsx`: list of bookable counselors — photo, name, bio, average rating.
- Counselor detail screen: bio, a duration picker showing only that counselor's `allowed_durations`, then a slot picker (`get-availability`), then confirm. If the student's profile is missing `email`/`guardian_email`, a one-time modal collects both before the booking call fires.
- **My Bookings** screen: upcoming (reschedule/cancel, cutoffs enforced client-side for UX and server-side regardless) and past (leave a star rating if not already reviewed).
- All times are rendered in the device's local timezone at display time — no timezone is stored for students, only for counselors (whose working hours are meaningless without one).
- Push token is registered (best-effort, permission optional) and upserted to `profiles.push_token` on first launch.

**Inherited, not new:** because students remain on anonymous auth, uninstalling the app / clearing data loses booking history along with everything else tied to that anonymous identity — this is an existing limitation of the anonymous-auth model from the original backend spec, not something this feature introduces.

## Counselor portal

Static site (plain HTML/JS + supabase-js, no framework), hosted separately from the Expo app.

- **Sign in with Google** via Supabase Auth, requesting `https://www.googleapis.com/auth/calendar.events`, `access_type: 'offline'`, `prompt: 'consent'` — one login step yields both identity and calendar access. Immediately after the redirect, the page reads the `provider_refresh_token` from the session and posts it to `save-calendar-token`.
- **One-time onboarding form**: name, bio, photo (uploaded to a Supabase Storage bucket — public read, owner-only write), timezone, weekly working hours, and duration checkboxes (`30`/`60`/`90`/`120` min — the form won't submit with none checked).
- **Reconnect banner**: shown on login if `calendar_connected = false`.
- **Upcoming sessions list** (date/time/student name/duration) with a **Cancel** button, calling the same `cancel-booking` function students use. This is the entire extent of the portal's "dashboard" — no history, no stats, no reschedule-from-portal. Counselors already see their bookings on their own Google Calendar; this list exists only so a cancellation made here stays in sync with our database, which an edit made directly in Google Calendar would not.

**Known limitation, accepted:** if a counselor cancels or edits a session by editing their Google Calendar directly (bypassing the portal), our `bookings` row goes stale. This wasn't automated (no calendar-sync webhook) — counselors are expected to use the portal's Cancel button for anything that needs to stay in sync.

## Days off / holidays

No separate "vacation mode" feature exists or is needed. Availability is computed live from the counselor's actual Google Calendar via `freebusy.query` — if they block a day off on their real calendar, it's already unavailable to book. Do not rebuild this as a feature later; it's already covered.

## Delivery

- `supabase/migrations/*.sql` — new tables, RLS, the `btree_gist` extension and exclusion constraint, any supporting triggers.
- `supabase/functions/{save-calendar-token,get-availability,create-booking,cancel-booking,reschedule-booking,deactivate-counselor}/`.
- `counselor-portal/` — the static site, deployed separately (Vercel/Netlify).
- Prerequisite before onboarding real counselors: Google Cloud OAuth consent screen out of Testing mode (see Constraints).

## Testing

- One integration script: book a session → a concurrent request for an overlapping window is rejected by the DB constraint, not just the freebusy hint → reschedule (both cutoff directions enforced, duration changeable) → cancel (rejects a booking whose `start_time` has already passed) → review is blocked until `end_time` passes, allowed once after, rejected on a second attempt.
- Validation checks: `guardian_email == email` rejected; onboarding rejected with zero durations checked.
- `deactivate-counselor`: verify future bookings cancel, and that a dead-token counselor's bookings still flip to `cancelled` in the database with a flagged manual-follow-up marker.
- Manual-only (not automatable): the actual Google OAuth consent/token-capture flow, since it requires a real Google consent screen.
- Existing jest suite keeps passing.

## Explicitly skipped (YAGNI)

- Payments/Stripe — free in v1.
- Any calendar/video provider besides Google Calendar + Meet.
- A full in-portal booking dashboard, history, or stats beyond the minimal upcoming-sessions + cancel list.
- Review comments and any moderation/appeals system — ratings-only removed the need for this entirely.
- Email verification for student or guardian addresses — self-reported, only checked for not being identical to each other.
- Rate limiting / abuse prevention on bookings.
- Multi-device push tokens (one `push_token` per profile; a reinstall or new device overwrites it).
- Counselor background-check or credential verification — `approved` is a manual human glance, not vetting, and carries no legal guarantee.
- Automatic fallback notification when a counselor's token is dead during a for-cause deactivation — a documented manual runbook step instead of new email infrastructure.
- Counselor "vacation mode" — already covered by their real Google Calendar's busy blocks.
