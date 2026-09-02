# Counselor Booking — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the schema and the 6 Edge Functions that make counselor booking work — availability, booking, cancel, reschedule, and admin deactivation — with Google Calendar/Meet as the single source of truth for both scheduling and notification.

**Architecture:** Pure validation logic (duration/lead-time/cutoff rules) and availability-slot math live in small, independently-tested shared modules with no network dependency. A thin Google Calendar helper (injectable `fetch`, so it's testable without hitting Google) wraps the 4 API calls every function needs. Each Edge Function is a straightforward composition of these tested building blocks plus direct Supabase/Google calls — verified end-to-end by one integration script, matching the testing approach the existing [Supabase backend spec](../specs/2026-07-10-supabase-backend-design.md) already established for this project (real network calls aren't mocked, they're run once against a real local stack).

**Tech Stack:** Supabase Postgres (migrations, RLS, `btree_gist` exclusion constraints), Supabase Edge Functions (Deno), `deno test` for the pure-logic modules, plain `fetch` for Google's REST APIs (no `googleapis` SDK — it's Node-only and heavier than the 4 endpoints this needs).

**Spec:** [2026-09-02-counselor-booking-design.md](../specs/2026-09-02-counselor-booking-design.md)

**Depends on:** [2026-09-02-counselor-booking-base-backend.md](2026-09-02-counselor-booking-base-backend.md) — `profiles` table and anonymous auth must exist first.

## Global Constraints

- Google Calendar + Meet only. `"primary"` is always the calendar ID used in Google API calls — it means "the authenticated user's own calendar," which is correct here because every call uses an access token minted from that specific counselor's refresh token.
- No client ever reads `counselor_tokens` — enforced by having zero RLS policies on that table, not by trusting application code.
- No client ever writes `bookings` directly — every write goes through an Edge Function, because validation (duration checks, lead-time cutoffs, the Calendar API call) can't be expressed as a row policy.
- Allowed session durations are always one of `30, 60, 90, 120` minutes.
- `sendUpdates: 'all'` on every Calendar create/patch/delete call — this is the entire notification mechanism (student, counselor, and guardian are all Calendar attendees).

## Prerequisite (manual, not a code task)

A Google Cloud project with the Calendar API enabled and an OAuth client (Web application type). Set its credentials as Supabase secrets before any Edge Function that calls Google will work:

```bash
npx supabase secrets set GOOGLE_CLIENT_ID=<your-client-id> GOOGLE_CLIENT_SECRET=<your-client-secret>
```

Per the spec's Constraints section: the OAuth consent screen must be out of "Testing" publishing status (or verified) before this is usable in production — Testing-mode refresh tokens for the `calendar.events` scope expire after 7 days.

---

### Task 1: Migration — profiles extension, counselors, counselor_tokens

**Files:**
- Create: `supabase/migrations/<timestamp>_counselors.sql`

**Interfaces:**
- Consumes: `public.profiles` (from the base backend plan).
- Produces: `public.counselors(id, name, bio, photo_url, timezone, working_hours, allowed_durations, approved, calendar_connected, created_at)`, `public.counselor_tokens(counselor_id, refresh_token)`, and `profiles.email`/`profiles.guardian_email`/`profiles.push_token`.

- [ ] **Step 1: Create the migration file**

```bash
npx supabase migration new counselors
```

- [ ] **Step 2: Write the migration**

```sql
alter table public.profiles
  add column email text,
  add column guardian_email text,
  add column push_token text;

alter table public.profiles
  add constraint guardian_email_distinct_from_email
  check (guardian_email is null or email is null or lower(guardian_email) <> lower(email));

create table public.counselors (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  bio text,
  photo_url text,
  timezone text,
  working_hours jsonb not null default '{}'::jsonb,
  allowed_durations integer[] not null default '{}',
  approved boolean not null default false,
  calendar_connected boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.counselors
  add constraint allowed_durations_valid
  check (allowed_durations <@ array[30, 60, 90, 120]);

alter table public.counselors enable row level security;

create policy "Bookable counselors are visible to authenticated users"
  on public.counselors for select
  to authenticated
  using (approved = true and calendar_connected = true);

create policy "Counselors can view their own row"
  on public.counselors for select
  to authenticated
  using (auth.uid() = id);

create policy "Counselors can edit their own profile fields only"
  on public.counselors for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and approved = (select c.approved from public.counselors c where c.id = auth.uid())
    and calendar_connected = (select c.calendar_connected from public.counselors c where c.id = auth.uid())
  );

create table public.counselor_tokens (
  counselor_id uuid primary key references public.counselors (id) on delete cascade,
  refresh_token text not null
);

alter table public.counselor_tokens enable row level security;
-- Deliberately no policies at all: this table is service-role only,
-- never readable or writable by any client role, including the
-- counselor whose own token it stores.
```

The `with check` clause on the counselor update policy is what stops a counselor from self-approving: it compares the submitted `approved`/`calendar_connected` values against whatever is currently stored, so an `UPDATE` that tries to change either one is rejected, while name/bio/timezone/working_hours/allowed_durations remain freely editable by the owner.

- [ ] **Step 3: Apply it locally and check for errors**

```bash
npx supabase db reset
```

Expected: no errors.

- [ ] **Step 4: Verify the self-approval guard manually**

In the Supabase Studio SQL editor (local, `http://127.0.0.1:54323`), as a quick sanity check:

```sql
-- Simulate a counselor row and confirm a self-approval UPDATE is rejected
-- when run as that user (requires `set role` + `set request.jwt.claims`,
-- or simpler: just confirm the policy exists and re-read it — this is a
-- one-time manual read of the policy logic above, not a scripted check).
select policyname, cmd, qual, with_check from pg_policies where tablename = 'counselors';
```

Expected: 3 rows, and the `with_check` for "Counselors can edit their own profile fields only" contains the `approved =` and `calendar_connected =` subqueries.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add counselors, counselor_tokens tables and profile columns"
```

---

### Task 2: Migration — bookings and reviews

**Files:**
- Create: `supabase/migrations/<timestamp>_bookings.sql`

**Interfaces:**
- Consumes: `public.counselors` (Task 1).
- Produces: `public.bookings(id, student_id, counselor_id, start_time, end_time, meet_link, google_event_id, status, created_at)` with the overlap-prevention constraint; `public.reviews(booking_id, rating, created_at)`.

- [ ] **Step 1: Create the migration file**

```bash
npx supabase migration new bookings
```

- [ ] **Step 2: Write the migration**

```sql
create extension if not exists btree_gist;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  counselor_id uuid not null references public.counselors (id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  meet_link text,
  google_event_id text not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint no_overlapping_bookings
    exclude using gist (
      counselor_id with =,
      tstzrange(start_time, end_time, '[)') with &&
    ) where (status = 'confirmed')
);

alter table public.bookings enable row level security;

create policy "Students and counselors can see their own bookings"
  on public.bookings for select
  to authenticated
  using (auth.uid() = student_id or auth.uid() = counselor_id);

-- No insert/update/delete policies here — every write goes through the
-- Edge Functions in this plan, using the service role.

create table public.reviews (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

create policy "Reviews are visible to authenticated users"
  on public.reviews for select
  to authenticated
  using (true);

create policy "A student can review their own completed booking once"
  on public.reviews for insert
  to authenticated
  with check (
    exists (
      select 1 from public.bookings
      where bookings.id = booking_id
        and bookings.student_id = auth.uid()
        and bookings.status = 'confirmed'
        and bookings.end_time < now()
    )
  );
```

The `where (status = 'confirmed')` clause on the exclusion constraint is load-bearing: without it, a cancelled booking's old time range would still count as a conflict forever, permanently blocking that slot after a single cancellation.

- [ ] **Step 3: Apply it locally**

```bash
npx supabase db reset
```

Expected: no errors — this also proves `btree_gist` installs cleanly and the exclusion constraint's syntax is valid.

- [ ] **Step 4: Verify the overlap constraint directly in SQL**

In the Studio SQL editor (local):

```sql
-- Set up one approved, connected counselor and one confirmed booking,
-- then prove an overlapping insert is rejected and a cancelled booking's
-- old slot is NOT blocked.
insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
insert into public.counselors (id, approved, calendar_connected, allowed_durations)
  values ('00000000-0000-0000-0000-000000000001', true, true, array[30]);

insert into public.bookings (student_id, counselor_id, start_time, end_time, google_event_id)
  values (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '2026-09-10T15:00:00Z', '2026-09-10T15:30:00Z', 'evt-1'
  );

-- This must fail with an exclusion violation:
insert into public.bookings (student_id, counselor_id, start_time, end_time, google_event_id)
  values (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '2026-09-10T15:15:00Z', '2026-09-10T15:45:00Z', 'evt-2'
  );

-- Cancel the first booking, then the same slot must be insertable again:
update public.bookings set status = 'cancelled' where google_event_id = 'evt-1';

insert into public.bookings (student_id, counselor_id, start_time, end_time, google_event_id)
  values (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '2026-09-10T15:15:00Z', '2026-09-10T15:45:00Z', 'evt-3'
  );
```

Expected: the second `insert` errors with `conflicting key value violates exclusion constraint "no_overlapping_bookings"`; the final `insert` (after cancelling) succeeds.

- [ ] **Step 5: Clean up the test rows and commit**

```sql
delete from public.bookings where counselor_id = '00000000-0000-0000-0000-000000000001';
delete from public.counselors where id = '00000000-0000-0000-0000-000000000001';
delete from auth.users where id in ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
```

```bash
git add supabase/migrations/
git commit -m "feat: add bookings table with overlap constraint, and reviews"
```

---

### Task 3: Shared booking-rules validation

**Files:**
- Create: `supabase/functions/_shared/booking-rules.ts`
- Test: `supabase/functions/_shared/booking-rules.test.ts`

**Interfaces:**
- Produces: `isDurationOfferedByCounselor(durationMinutes, allowedDurations): boolean`, `isFarEnoughInAdvance(startTimeIso, now?): boolean`, `canCancelOrReschedule(startTimeIso, now?): boolean`. Every Edge Function in this plan that enforces a timing/duration rule imports from here — the rule is defined once.

Guardian-email distinctness is *not* one of these: it's enforced by the `guardian_email_distinct_from_email` `CHECK` constraint in Task 1's migration, which is the real guard. The Expo app plan adds its own one-line client-side pre-check for UX (so the student sees an inline error instead of a raw Postgres error) — that check has no reason to be shared with this Deno module, since it's a trivial string comparison duplicated once in a different runtime, not logic worth centralizing.

- [ ] **Step 1: Write the failing tests**

```ts
// supabase/functions/_shared/booking-rules.test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  isDurationOfferedByCounselor,
  isFarEnoughInAdvance,
  canCancelOrReschedule,
} from "./booking-rules.ts";

Deno.test("isDurationOfferedByCounselor - allows a duration the counselor offers", () => {
  assertEquals(isDurationOfferedByCounselor(60, [30, 60]), true);
});

Deno.test("isDurationOfferedByCounselor - rejects a duration the counselor doesn't offer", () => {
  assertEquals(isDurationOfferedByCounselor(90, [30, 60]), false);
});

Deno.test("isFarEnoughInAdvance - rejects a slot less than 2 hours away", () => {
  const now = new Date("2026-09-02T10:00:00Z");
  assertEquals(isFarEnoughInAdvance("2026-09-02T11:00:00Z", now), false);
});

Deno.test("isFarEnoughInAdvance - allows a slot 2 or more hours away", () => {
  const now = new Date("2026-09-02T10:00:00Z");
  assertEquals(isFarEnoughInAdvance("2026-09-02T13:00:00Z", now), true);
});

Deno.test("canCancelOrReschedule - rejects a booking that already started", () => {
  const now = new Date("2026-09-02T10:00:00Z");
  assertEquals(canCancelOrReschedule("2026-09-02T09:00:00Z", now), false);
});

Deno.test("canCancelOrReschedule - rejects a booking starting in 30 minutes", () => {
  const now = new Date("2026-09-02T10:00:00Z");
  assertEquals(canCancelOrReschedule("2026-09-02T10:30:00Z", now), false);
});

Deno.test("canCancelOrReschedule - allows a booking starting in 2 hours", () => {
  const now = new Date("2026-09-02T10:00:00Z");
  assertEquals(canCancelOrReschedule("2026-09-02T12:00:00Z", now), true);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `deno test supabase/functions/_shared/booking-rules.test.ts`
Expected: FAIL — `Module not found "./booking-rules.ts"`.

- [ ] **Step 3: Implement**

```ts
// supabase/functions/_shared/booking-rules.ts
export const MIN_LEAD_TIME_MS = 2 * 60 * 60 * 1000;
export const CANCEL_CUTOFF_MS = 60 * 60 * 1000;

export function isDurationOfferedByCounselor(
  durationMinutes: number,
  allowedDurations: number[]
): boolean {
  return allowedDurations.includes(durationMinutes);
}

export function isFarEnoughInAdvance(startTimeIso: string, now: Date = new Date()): boolean {
  return new Date(startTimeIso).getTime() - now.getTime() >= MIN_LEAD_TIME_MS;
}

export function canCancelOrReschedule(startTimeIso: string, now: Date = new Date()): boolean {
  const msUntilStart = new Date(startTimeIso).getTime() - now.getTime();
  // false covers both "already happened" (negative) and "too soon" (< 1h)
  return msUntilStart > CANCEL_CUTOFF_MS;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `deno test supabase/functions/_shared/booking-rules.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/booking-rules.ts supabase/functions/_shared/booking-rules.test.ts
git commit -m "feat: add shared booking validation rules"
```

---

### Task 4: Shared availability slot computation

**Files:**
- Create: `supabase/functions/_shared/availability.ts`
- Test: `supabase/functions/_shared/availability.test.ts`

**Interfaces:**
- Produces: `computeOpenSlots({ busy, workingHours, timezone, durationMinutes, from, days, slotStepMinutes? }): string[]` (ISO start times), `zonedTimeToUtc(day: Date, hhmm: string, timezone: string): number` (ms since epoch). Consumed by `get-availability` (Task 7).

- [ ] **Step 1: Write the failing tests**

```ts
// supabase/functions/_shared/availability.test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeOpenSlots, zonedTimeToUtc } from "./availability.ts";

Deno.test("zonedTimeToUtc - converts a local time in America/Chicago to the correct UTC instant", () => {
  const day = new Date("2026-09-02T00:00:00Z");
  const utcMs = zonedTimeToUtc(day, "09:00", "America/Chicago");
  // Chicago is UTC-5 (CDT) in September.
  assertEquals(new Date(utcMs).toISOString(), "2026-09-02T14:00:00.000Z");
});

Deno.test("computeOpenSlots - excludes a slot that overlaps a busy block", () => {
  const from = new Date("2026-09-02T00:00:00Z");
  const dayKey = from
    .toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Chicago" })
    .slice(0, 3)
    .toLowerCase();

  const slots = computeOpenSlots({
    busy: [{ start: "2026-09-02T14:00:00Z", end: "2026-09-02T14:30:00Z" }],
    workingHours: { [dayKey]: [["09:00", "10:00"]] },
    timezone: "America/Chicago",
    durationMinutes: 30,
    from,
    days: 1,
  });

  assertEquals(slots.includes("2026-09-02T14:00:00.000Z"), false);
  assertEquals(slots.includes("2026-09-02T14:30:00.000Z"), true);
});

Deno.test("computeOpenSlots - offers no slots on a day not listed in working hours", () => {
  const from = new Date("2026-09-02T00:00:00Z");
  const todayKey = from
    .toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Chicago" })
    .slice(0, 3)
    .toLowerCase();
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const otherKey = days.find((d) => d !== todayKey)!;

  const slots = computeOpenSlots({
    busy: [],
    workingHours: { [otherKey]: [["09:00", "17:00"]] },
    timezone: "America/Chicago",
    durationMinutes: 30,
    from,
    days: 1,
  });

  assertEquals(slots.length, 0);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `deno test supabase/functions/_shared/availability.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// supabase/functions/_shared/availability.ts
export function zonedTimeToUtc(day: Date, hhmm: string, timezone: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const dateStr = day.toLocaleDateString("en-CA", { timeZone: timezone }); // YYYY-MM-DD
  const localIso = `${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  const utcGuess = new Date(`${localIso}Z`);
  const offsetMinutes = getTimezoneOffsetMinutes(timezone, utcGuess);
  return utcGuess.getTime() - offsetMinutes * 60 * 1000;
}

function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (asUtc - date.getTime()) / 60000;
}

interface ComputeOpenSlotsArgs {
  busy: Array<{ start: string; end: string }>;
  workingHours: Record<string, Array<[string, string]>>;
  timezone: string;
  durationMinutes: number;
  from: Date;
  days: number;
  slotStepMinutes?: number;
}

export function computeOpenSlots({
  busy,
  workingHours,
  timezone,
  durationMinutes,
  from,
  days,
  slotStepMinutes = 15,
}: ComputeOpenSlotsArgs): string[] {
  const slots: string[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const stepMs = slotStepMinutes * 60 * 1000;
  const durationMs = durationMinutes * 60 * 1000;

  for (let d = 0; d < days; d++) {
    const day = new Date(from.getTime() + d * dayMs);
    const dayKey = day
      .toLocaleDateString("en-US", { weekday: "short", timeZone: timezone })
      .slice(0, 3)
      .toLowerCase();
    const ranges = workingHours[dayKey] ?? [];

    for (const [startStr, endStr] of ranges) {
      const rangeStart = zonedTimeToUtc(day, startStr, timezone);
      const rangeEnd = zonedTimeToUtc(day, endStr, timezone);

      for (let t = rangeStart; t + durationMs <= rangeEnd; t += stepMs) {
        const slotEnd = t + durationMs;
        const overlapsBusy = busy.some((b) => {
          const busyStart = new Date(b.start).getTime();
          const busyEnd = new Date(b.end).getTime();
          return t < busyEnd && slotEnd > busyStart;
        });
        if (!overlapsBusy) {
          slots.push(new Date(t).toISOString());
        }
      }
    }
  }

  return slots;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `deno test supabase/functions/_shared/availability.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/availability.ts supabase/functions/_shared/availability.test.ts
git commit -m "feat: add availability slot computation with timezone handling"
```

---

### Task 5: Shared Google Calendar helper

**Files:**
- Create: `supabase/functions/_shared/google-calendar.ts`
- Test: `supabase/functions/_shared/google-calendar.test.ts`

**Interfaces:**
- Produces: `getAccessToken(refreshToken, fetchImpl?): Promise<string>`, `GoogleTokenError` (thrown on `invalid_grant`), `freeBusyQuery(accessToken, calendarId, timeMin, timeMax, fetchImpl?): Promise<{start,end}[]>`, `createCalendarEvent(accessToken, calendarId, event, fetchImpl?): Promise<object>`, `patchCalendarEvent(accessToken, calendarId, eventId, patch, fetchImpl?): Promise<object>`, `deleteCalendarEvent(accessToken, calendarId, eventId, fetchImpl?): Promise<void>`. Every function that touches Google Calendar (Tasks 6–11) imports from here.

- [ ] **Step 1: Write the failing tests**

```ts
// supabase/functions/_shared/google-calendar.test.ts
import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getAccessToken, GoogleTokenError, freeBusyQuery, createCalendarEvent } from "./google-calendar.ts";

function fakeFetch(status: number, body: unknown) {
  return async () => new Response(JSON.stringify(body), { status });
}

Deno.test("getAccessToken - returns the access token on success", async () => {
  const token = await getAccessToken("refresh-abc", fakeFetch(200, { access_token: "new-token" }));
  assertEquals(token, "new-token");
});

Deno.test("getAccessToken - throws GoogleTokenError on invalid_grant", async () => {
  await assertRejects(
    () => getAccessToken("dead-refresh", fakeFetch(400, { error: "invalid_grant" })),
    GoogleTokenError
  );
});

Deno.test("freeBusyQuery - returns the busy blocks for the requested calendar", async () => {
  const calendarId = "primary";
  const busy = await freeBusyQuery(
    "token",
    calendarId,
    "2026-09-02T00:00:00Z",
    "2026-09-03T00:00:00Z",
    fakeFetch(200, {
      calendars: {
        [calendarId]: { busy: [{ start: "2026-09-02T15:00:00Z", end: "2026-09-02T15:30:00Z" }] },
      },
    })
  );
  assertEquals(busy, [{ start: "2026-09-02T15:00:00Z", end: "2026-09-02T15:30:00Z" }]);
});

Deno.test("createCalendarEvent - returns the created event including its Meet link", async () => {
  const event = await createCalendarEvent(
    "token",
    "primary",
    { summary: "Session" },
    fakeFetch(200, { id: "evt1", hangoutLink: "https://meet.google.com/abc-defg-hij" })
  );
  assertEquals(event.hangoutLink, "https://meet.google.com/abc-defg-hij");
});

Deno.test("createCalendarEvent - throws when Google rejects the request", async () => {
  await assertRejects(() =>
    createCalendarEvent("token", "primary", {}, fakeFetch(400, { error: "invalid request" }))
  );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `deno test supabase/functions/_shared/google-calendar.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// supabase/functions/_shared/google-calendar.ts
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export class GoogleTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleTokenError";
  }
}

export async function getAccessToken(
  refreshToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const response = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    if (data.error === "invalid_grant") {
      throw new GoogleTokenError("invalid_grant");
    }
    throw new Error(`Google token refresh failed: ${data.error}`);
  }
  return data.access_token;
}

export async function freeBusyQuery(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
  fetchImpl: typeof fetch = fetch
): Promise<Array<{ start: string; end: string }>> {
  const response = await fetchImpl(`${CALENDAR_API}/freeBusy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin, timeMax, items: [{ id: calendarId }] }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`freeBusy query failed: ${JSON.stringify(data)}`);
  }
  return data.calendars[calendarId].busy;
}

export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch
) {
  const response = await fetchImpl(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Calendar event creation failed: ${JSON.stringify(data)}`);
  }
  return data;
}

export async function patchCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  patch: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch
) {
  const response = await fetchImpl(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?sendUpdates=all`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Calendar event update failed: ${JSON.stringify(data)}`);
  }
  return data;
}

export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const response = await fetchImpl(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?sendUpdates=all`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok && response.status !== 410) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Calendar event deletion failed: ${JSON.stringify(data)}`);
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `deno test supabase/functions/_shared/google-calendar.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/google-calendar.ts supabase/functions/_shared/google-calendar.test.ts
git commit -m "feat: add Google Calendar API helper with injectable fetch"
```

---

### Task 6: Edge Function — `save-calendar-token`

**Files:**
- Create: `supabase/functions/save-calendar-token/index.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks besides the schema.
- Produces: an HTTP endpoint the counselor portal calls right after the Google OAuth redirect. Body: `{ refresh_token: string }`, auth via `Authorization: Bearer <supabase session token>`.

This function has no Google API calls to fake, so it's covered by a direct smoke test against the local stack rather than a mocked unit test.

- [ ] **Step 1: Implement**

```ts
// supabase/functions/save-calendar-token/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
  }
  const counselorId = userData.user.id;

  const { refresh_token } = await req.json();
  if (!refresh_token) {
    return new Response(JSON.stringify({ error: "refresh_token is required" }), { status: 400 });
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error: counselorError } = await adminClient
    .from("counselors")
    .upsert({ id: counselorId, calendar_connected: true }, { onConflict: "id" });
  if (counselorError) {
    return new Response(JSON.stringify({ error: counselorError.message }), { status: 500 });
  }

  const { error: tokenError } = await adminClient
    .from("counselor_tokens")
    .upsert({ counselor_id: counselorId, refresh_token }, { onConflict: "counselor_id" });
  if (tokenError) {
    return new Response(JSON.stringify({ error: tokenError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
```

- [ ] **Step 2: Serve it locally and smoke-test it**

```bash
npx supabase functions serve save-calendar-token
```

In another terminal, sign in anonymously first to get a bearer token (reuse `supabase/tests/verify-profiles-trigger.mjs`'s sign-in pattern from the base backend plan, or grab a token from Studio's Auth users list), then:

```bash
curl -i -X POST http://127.0.0.1:54321/functions/v1/save-calendar-token \
  -H "Authorization: Bearer <a real session access_token>" \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"test-refresh-token"}'
```

Expected: `HTTP/1.1 200`, `{"ok":true}`, and a row appears in both `counselors` and `counselor_tokens` for that user in Studio's table editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/save-calendar-token/
git commit -m "feat: add save-calendar-token edge function"
```

---

### Task 7: Edge Function — `get-availability`

**Files:**
- Create: `supabase/functions/get-availability/index.ts`

**Interfaces:**
- Consumes: `isDurationOfferedByCounselor`, `isFarEnoughInAdvance` (Task 3); `computeOpenSlots` (Task 4); `getAccessToken`, `freeBusyQuery`, `GoogleTokenError` (Task 5).
- Produces: an HTTP endpoint. Body: `{ counselor_id, duration_minutes }`. Response: `{ slots: string[] }` (ISO start times).

- [ ] **Step 1: Implement**

```ts
// supabase/functions/get-availability/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, freeBusyQuery, GoogleTokenError } from "../_shared/google-calendar.ts";
import { isDurationOfferedByCounselor, isFarEnoughInAdvance } from "../_shared/booking-rules.ts";
import { computeOpenSlots } from "../_shared/availability.ts";

const DAYS_AHEAD = 14;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const { counselor_id, duration_minutes } = await req.json();
  if (!counselor_id || !duration_minutes) {
    return new Response(
      JSON.stringify({ error: "counselor_id and duration_minutes are required" }),
      { status: 400 }
    );
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: counselor, error: counselorError } = await adminClient
    .from("counselors")
    .select("allowed_durations, timezone, working_hours, calendar_connected")
    .eq("id", counselor_id)
    .single();
  if (counselorError || !counselor) {
    return new Response(JSON.stringify({ error: "Counselor not found" }), { status: 404 });
  }

  if (!isDurationOfferedByCounselor(duration_minutes, counselor.allowed_durations)) {
    return new Response(
      JSON.stringify({ error: "This counselor does not offer that duration" }),
      { status: 400 }
    );
  }
  if (!counselor.calendar_connected) {
    return new Response(JSON.stringify({ slots: [] }), { status: 200 });
  }

  const { data: tokenRow } = await adminClient
    .from("counselor_tokens")
    .select("refresh_token")
    .eq("counselor_id", counselor_id)
    .single();

  let accessToken: string;
  try {
    accessToken = await getAccessToken(tokenRow!.refresh_token);
  } catch (error) {
    if (error instanceof GoogleTokenError) {
      await adminClient.from("counselors").update({ calendar_connected: false }).eq("id", counselor_id);
      return new Response(JSON.stringify({ slots: [] }), { status: 200 });
    }
    throw error;
  }

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000).toISOString();
  const busy = await freeBusyQuery(accessToken, "primary", timeMin, timeMax);

  const slots = computeOpenSlots({
    busy,
    workingHours: counselor.working_hours,
    timezone: counselor.timezone,
    durationMinutes: duration_minutes,
    from: now,
    days: DAYS_AHEAD,
  }).filter((slot) => isFarEnoughInAdvance(slot, now));

  return new Response(JSON.stringify({ slots }), { status: 200 });
});
```

- [ ] **Step 2: Serve it locally and smoke-test with a counselor that has no calendar connected yet**

```bash
npx supabase functions serve get-availability
curl -i -X POST http://127.0.0.1:54321/functions/v1/get-availability \
  -H "Content-Type: application/json" \
  -d '{"counselor_id":"<a counselor id from Studio>","duration_minutes":30}'
```

Expected: `{"slots":[]}` if `calendar_connected` is false, or a real slots array once a token is connected (verified fully in Task 12's integration script, which requires a live Google account).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/get-availability/
git commit -m "feat: add get-availability edge function"
```

---

### Task 8: Edge Function — `create-booking`

**Files:**
- Create: `supabase/functions/create-booking/index.ts`

**Interfaces:**
- Consumes: `isDurationOfferedByCounselor`, `isFarEnoughInAdvance` (Task 3); `getAccessToken`, `createCalendarEvent`, `deleteCalendarEvent` (Task 5).
- Produces: an HTTP endpoint. Body: `{ counselor_id, start_time, duration_minutes }`, auth via bearer token. Response: `{ booking: {...} }` or a 4xx/409 error.

- [ ] **Step 1: Implement**

```ts
// supabase/functions/create-booking/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, createCalendarEvent, deleteCalendarEvent } from "../_shared/google-calendar.ts";
import { isDurationOfferedByCounselor, isFarEnoughInAdvance } from "../_shared/booking-rules.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
  }
  const studentId = userData.user.id;

  const { counselor_id, start_time, duration_minutes } = await req.json();
  if (!counselor_id || !start_time || !duration_minutes) {
    return new Response(
      JSON.stringify({ error: "counselor_id, start_time, and duration_minutes are required" }),
      { status: 400 }
    );
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("email, guardian_email, push_token")
    .eq("id", studentId)
    .single();
  if (profileError || !profile?.email || !profile?.guardian_email) {
    return new Response(
      JSON.stringify({ error: "Add your email and a guardian email before booking" }),
      { status: 400 }
    );
  }

  const { data: counselor, error: counselorError } = await adminClient
    .from("counselors")
    .select("allowed_durations, approved, calendar_connected")
    .eq("id", counselor_id)
    .single();
  if (counselorError || !counselor || !counselor.approved || !counselor.calendar_connected) {
    return new Response(JSON.stringify({ error: "Counselor is not bookable" }), { status: 404 });
  }
  if (!isDurationOfferedByCounselor(duration_minutes, counselor.allowed_durations)) {
    return new Response(
      JSON.stringify({ error: "This counselor does not offer that duration" }),
      { status: 400 }
    );
  }
  if (!isFarEnoughInAdvance(start_time)) {
    return new Response(
      JSON.stringify({ error: "Sessions must be booked at least 2 hours in advance" }),
      { status: 400 }
    );
  }

  const { data: tokenRow, error: tokenRowError } = await adminClient
    .from("counselor_tokens")
    .select("refresh_token")
    .eq("counselor_id", counselor_id)
    .single();
  if (tokenRowError || !tokenRow) {
    return new Response(JSON.stringify({ error: "Counselor is not bookable" }), { status: 404 });
  }

  const accessToken = await getAccessToken(tokenRow.refresh_token);
  const endTime = new Date(new Date(start_time).getTime() + duration_minutes * 60 * 1000).toISOString();

  const event = await createCalendarEvent(accessToken, "primary", {
    summary: "Career counseling session",
    start: { dateTime: start_time },
    end: { dateTime: endTime },
    attendees: [{ email: profile.email }, { email: profile.guardian_email, optional: true }],
    conferenceData: { createRequest: { requestId: crypto.randomUUID() } },
  });
  const meetLink = event.hangoutLink ?? event.conferenceData?.entryPoints?.[0]?.uri;

  const { data: booking, error: bookingError } = await adminClient
    .from("bookings")
    .insert({
      student_id: studentId,
      counselor_id,
      start_time,
      end_time: endTime,
      meet_link: meetLink,
      google_event_id: event.id,
      status: "confirmed",
    })
    .select()
    .single();

  if (bookingError) {
    // Lost a race to a concurrent booking on an overlapping slot — undo the
    // calendar event so the counselor's calendar doesn't show a phantom session.
    await deleteCalendarEvent(accessToken, "primary", event.id).catch(() => {});
    return new Response(JSON.stringify({ error: "Slot no longer available" }), { status: 409 });
  }

  if (profile.push_token) {
    fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: profile.push_token,
        title: "Session booked",
        body: `Your session is confirmed for ${new Date(start_time).toLocaleString()}`,
      }),
    }).catch(() => {});
  }

  return new Response(JSON.stringify({ booking }), { status: 200 });
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/create-booking/
git commit -m "feat: add create-booking edge function"
```

(Full correctness — including the double-booking rejection path — is verified in Task 12's integration script, since it requires a real counselor with a connected calendar.)

---

### Task 9: Edge Function — `cancel-booking`

**Files:**
- Create: `supabase/functions/cancel-booking/index.ts`

**Interfaces:**
- Consumes: `canCancelOrReschedule` (Task 3); `getAccessToken`, `deleteCalendarEvent` (Task 5).
- Produces: an HTTP endpoint. Body: `{ booking_id }`, auth via bearer token (student or counselor on that booking).

- [ ] **Step 1: Implement**

```ts
// supabase/functions/cancel-booking/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, deleteCalendarEvent } from "../_shared/google-calendar.ts";
import { canCancelOrReschedule } from "../_shared/booking-rules.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
  }
  const callerId = userData.user.id;

  const { booking_id } = await req.json();
  if (!booking_id) {
    return new Response(JSON.stringify({ error: "booking_id is required" }), { status: 400 });
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: booking, error: bookingError } = await adminClient
    .from("bookings")
    .select("student_id, counselor_id, start_time, status, google_event_id")
    .eq("id", booking_id)
    .single();
  if (bookingError || !booking) {
    return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404 });
  }
  if (callerId !== booking.student_id && callerId !== booking.counselor_id) {
    return new Response(JSON.stringify({ error: "Not your booking" }), { status: 403 });
  }
  if (booking.status !== "confirmed") {
    return new Response(JSON.stringify({ error: "Booking is already cancelled" }), { status: 400 });
  }
  if (!canCancelOrReschedule(booking.start_time)) {
    return new Response(
      JSON.stringify({ error: "Too late to cancel — must be more than 1 hour before start" }),
      { status: 400 }
    );
  }

  const { data: tokenRow } = await adminClient
    .from("counselor_tokens")
    .select("refresh_token")
    .eq("counselor_id", booking.counselor_id)
    .single();
  if (tokenRow) {
    const accessToken = await getAccessToken(tokenRow.refresh_token);
    await deleteCalendarEvent(accessToken, "primary", booking.google_event_id);
  }

  await adminClient.from("bookings").update({ status: "cancelled" }).eq("id", booking_id);

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/cancel-booking/
git commit -m "feat: add cancel-booking edge function"
```

---

### Task 10: Edge Function — `reschedule-booking`

**Files:**
- Create: `supabase/functions/reschedule-booking/index.ts`

**Interfaces:**
- Consumes: `isDurationOfferedByCounselor`, `isFarEnoughInAdvance`, `canCancelOrReschedule` (Task 3); `getAccessToken`, `patchCalendarEvent` (Task 5).
- Produces: an HTTP endpoint. Body: `{ booking_id, new_start_time, new_duration_minutes }`, auth via bearer token (student only).

- [ ] **Step 1: Implement**

```ts
// supabase/functions/reschedule-booking/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, patchCalendarEvent } from "../_shared/google-calendar.ts";
import {
  isDurationOfferedByCounselor,
  isFarEnoughInAdvance,
  canCancelOrReschedule,
} from "../_shared/booking-rules.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
  }
  const studentId = userData.user.id;

  const { booking_id, new_start_time, new_duration_minutes } = await req.json();
  if (!booking_id || !new_start_time || !new_duration_minutes) {
    return new Response(
      JSON.stringify({ error: "booking_id, new_start_time, and new_duration_minutes are required" }),
      { status: 400 }
    );
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: booking, error: bookingError } = await adminClient
    .from("bookings")
    .select("student_id, counselor_id, start_time, status, google_event_id")
    .eq("id", booking_id)
    .single();
  if (bookingError || !booking || booking.student_id !== studentId) {
    return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404 });
  }
  if (booking.status !== "confirmed") {
    return new Response(JSON.stringify({ error: "Booking is cancelled" }), { status: 400 });
  }
  if (!canCancelOrReschedule(booking.start_time)) {
    return new Response(
      JSON.stringify({ error: "Too late to reschedule — must be more than 1 hour before the current start time" }),
      { status: 400 }
    );
  }
  if (!isFarEnoughInAdvance(new_start_time)) {
    return new Response(JSON.stringify({ error: "New time must be at least 2 hours from now" }), { status: 400 });
  }

  const { data: counselor, error: counselorError } = await adminClient
    .from("counselors")
    .select("allowed_durations")
    .eq("id", booking.counselor_id)
    .single();
  if (counselorError || !isDurationOfferedByCounselor(new_duration_minutes, counselor.allowed_durations)) {
    return new Response(
      JSON.stringify({ error: "This counselor does not offer that duration" }),
      { status: 400 }
    );
  }

  const newEndTime = new Date(
    new Date(new_start_time).getTime() + new_duration_minutes * 60 * 1000
  ).toISOString();

  // The DB update runs first so the exclusion constraint is the one true
  // arbiter of overlap — if it fails, Google Calendar was never touched.
  const { error: updateError } = await adminClient
    .from("bookings")
    .update({ start_time: new_start_time, end_time: newEndTime })
    .eq("id", booking_id);
  if (updateError) {
    return new Response(JSON.stringify({ error: "Slot no longer available" }), { status: 409 });
  }

  const { data: tokenRow, error: tokenRowError } = await adminClient
    .from("counselor_tokens")
    .select("refresh_token")
    .eq("counselor_id", booking.counselor_id)
    .single();
  if (tokenRowError || !tokenRow) {
    return new Response(JSON.stringify({ error: "Counselor is not bookable" }), { status: 404 });
  }

  const accessToken = await getAccessToken(tokenRow.refresh_token);
  // ponytail: DB and Calendar updates aren't atomic across two systems. The
  // DB already won the overlap check above; a Calendar-side failure here is
  // rare and would need manual reconciliation, same tolerance already
  // accepted for the deactivate-counselor dead-token case in the spec.
  await patchCalendarEvent(accessToken, "primary", booking.google_event_id, {
    start: { dateTime: new_start_time },
    end: { dateTime: newEndTime },
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/reschedule-booking/
git commit -m "feat: add reschedule-booking edge function"
```

---

### Task 11: Edge Function — `deactivate-counselor`

**Files:**
- Create: `supabase/functions/deactivate-counselor/index.ts`

**Interfaces:**
- Consumes: `getAccessToken`, `deleteCalendarEvent`, `GoogleTokenError` (Task 5).
- Produces: an HTTP endpoint, operator-only (called with the service role key as the bearer token, e.g. from a trusted script — never from the mobile app or portal). Body: `{ counselor_id }`. Response: `{ cancelled: number, manualFollowUp: string[] }` — the booking ids that need a personal follow-up because the counselor's Google token was already dead.

- [ ] **Step 1: Implement**

```ts
// supabase/functions/deactivate-counselor/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, deleteCalendarEvent, GoogleTokenError } from "../_shared/google-calendar.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403 });
  }

  const { counselor_id } = await req.json();
  if (!counselor_id) {
    return new Response(JSON.stringify({ error: "counselor_id is required" }), { status: 400 });
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  await adminClient.from("counselors").update({ approved: false }).eq("id", counselor_id);

  const { data: bookings } = await adminClient
    .from("bookings")
    .select("id, google_event_id")
    .eq("counselor_id", counselor_id)
    .eq("status", "confirmed")
    .gt("start_time", new Date().toISOString());

  const { data: tokenRow } = await adminClient
    .from("counselor_tokens")
    .select("refresh_token")
    .eq("counselor_id", counselor_id)
    .single();

  const manualFollowUp: string[] = [];

  for (const booking of bookings ?? []) {
    let calendarDeleted = false;
    if (tokenRow) {
      try {
        const accessToken = await getAccessToken(tokenRow.refresh_token);
        await deleteCalendarEvent(accessToken, "primary", booking.google_event_id);
        calendarDeleted = true;
      } catch (error) {
        if (!(error instanceof GoogleTokenError)) throw error;
      }
    }
    await adminClient.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    if (!calendarDeleted) {
      // Known limitation (see spec): the counselor's token was already
      // dead, so nobody was auto-notified and the Meet link may still be
      // live — the operator running this must personally follow up.
      manualFollowUp.push(booking.id);
    }
  }

  return new Response(JSON.stringify({ cancelled: (bookings ?? []).length, manualFollowUp }), { status: 200 });
});
```

This function bypasses `canCancelOrReschedule`'s 1h/2h guards on purpose — those exist to stop students/counselors cancelling on each other at the last second, not to block an operator removing someone for cause.

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/deactivate-counselor/
git commit -m "feat: add deactivate-counselor edge function"
```

---

### Task 12: End-to-end integration script

**Files:**
- Create: `supabase/tests/verify-booking-lifecycle.mjs`

**Interfaces:**
- Consumes: all 6 Edge Functions, run locally via `supabase functions serve`.

This requires one manual setup step first: a real Google account with Calendar access, run once through the counselor OAuth flow (the portal doesn't exist until the next plan — for this test, obtain a refresh token directly by completing Google's OAuth consent screen manually and exchanging the code for tokens, or temporarily call `save-calendar-token` with a token obtained via [Google's OAuth Playground](https://developers.google.com/oauthplayground) using your own `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` and the `calendar.events` scope).

- [ ] **Step 1: Manual setup**

1. `npx supabase start` and `npx supabase functions serve` (all functions).
2. Sign in anonymously as a "counselor" test user, get its `access_token`.
3. Obtain a Google refresh token with `calendar.events` scope for a real test Google account (OAuth Playground, using your Supabase secrets' client id/secret).
4. `curl -X POST http://127.0.0.1:54321/functions/v1/save-calendar-token -H "Authorization: Bearer <counselor access_token>" -d '{"refresh_token":"<google refresh token>"}'`.
5. In Studio, set that counselor row's `approved = true`, `working_hours` to a wide range covering the next few days, `allowed_durations = '{30,60}'`.

- [ ] **Step 2: Write the script**

```js
// supabase/tests/verify-booking-lifecycle.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const counselorId = process.env.TEST_COUNSELOR_ID;

const supabase = createClient(url, anonKey);

async function call(fn, body, token) {
  const res = await fetch(`${url}/functions/v1/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

const { data: signIn } = await supabase.auth.signInAnonymously();
const token = signIn.session.access_token;
const studentId = signIn.user.id;

await supabase
  .from("profiles")
  .update({ email: "student@example.com", guardian_email: "guardian@example.com" })
  .eq("id", studentId);

const availability = await call("get-availability", { counselor_id: counselorId, duration_minutes: 30 }, token);
const slot = availability.body.slots[0];
if (!slot) throw new Error("No open slots returned — check working_hours/calendar setup");

const first = await call("create-booking", { counselor_id: counselorId, start_time: slot, duration_minutes: 30 }, token);
if (first.status !== 200) throw new Error(`First booking failed: ${JSON.stringify(first.body)}`);
console.log("PASS: booking created");

const conflicting = await call("create-booking", { counselor_id: counselorId, start_time: slot, duration_minutes: 30 }, token);
if (conflicting.status !== 409) throw new Error(`Expected 409 on double-book, got ${conflicting.status}`);
console.log("PASS: overlapping booking rejected");

const newSlot = availability.body.slots[5]; // a different open slot
const reschedule = await call(
  "reschedule-booking",
  { booking_id: first.body.booking.id, new_start_time: newSlot, new_duration_minutes: 60 },
  token
);
if (reschedule.status !== 200) throw new Error(`Reschedule failed: ${JSON.stringify(reschedule.body)}`);
console.log("PASS: reschedule with duration change");

const tooSoon = await call("cancel-booking", { booking_id: first.body.booking.id }, token);
// If newSlot is >1h away this should succeed; this is a smoke check, not a
// cutoff-boundary test (that's covered by booking-rules.test.ts).
if (tooSoon.status !== 200) throw new Error(`Cancel failed: ${JSON.stringify(tooSoon.body)}`);
console.log("PASS: cancel");

const { error: reviewError } = await supabase
  .from("reviews")
  .insert({ booking_id: first.body.booking.id, rating: 5 });
if (!reviewError) throw new Error("Review on a cancelled/future booking should have been rejected by RLS");
console.log("PASS: review correctly rejected before completion");

console.log("ALL PASS");
```

- [ ] **Step 3: Run it**

```bash
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=<local anon key> TEST_COUNSELOR_ID=<counselor id> node supabase/tests/verify-booking-lifecycle.mjs
```

Expected: `ALL PASS`. If `get-availability` returns no slots, double-check the counselor's `working_hours`/`timezone`/`allowed_durations` and that `save-calendar-token` succeeded.

- [ ] **Step 4: Commit**

```bash
git add supabase/tests/verify-booking-lifecycle.mjs
git commit -m "test: add end-to-end booking lifecycle integration script"
```

---

## Definition of done

- `deno test supabase/functions/_shared/` passes (15 tests across booking-rules, availability, google-calendar).
- `node supabase/tests/verify-booking-lifecycle.mjs` prints `ALL PASS` against the local stack with a real connected Google test account.
- `npm test` (the Expo app's existing suite) still passes unchanged — nothing in this plan touches app code.
