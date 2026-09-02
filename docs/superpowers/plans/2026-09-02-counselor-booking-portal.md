# Counselor Booking — Counselor Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A minimal static web page where a counselor signs in with Google (granting Calendar access in the same step), fills in a one-time onboarding form, and can cancel an upcoming session — nothing more.

**Architecture:** Plain HTML/CSS/JS, no framework, no bundler. `supabase-js` is loaded straight from a CDN as an ES module. Branching logic that isn't DOM glue (is onboarding complete, serializing the working-hours form, collecting checked durations) lives in a small dependency-free module tested with Node's built-in test runner — no new tooling for a 3-file static site.

**Tech Stack:** Vanilla HTML/CSS/JS, `@supabase/supabase-js` via `esm.sh`, Node's built-in `node:test`/`node:assert` for the pure-logic module, hosted on Vercel or Netlify (static site, no build step).

**Spec:** [2026-09-02-counselor-booking-design.md](../specs/2026-09-02-counselor-booking-design.md)

**Depends on:** [2026-09-02-counselor-booking-backend.md](2026-09-02-counselor-booking-backend.md) — `counselors`/`counselor_tokens`/`bookings` tables and the `save-calendar-token`/`cancel-booking` Edge Functions must exist first.

## Global Constraints

- No framework, no build step, no npm dependency for the portal itself — it's 5 files.
- The portal does exactly two jobs after onboarding: show upcoming sessions, and let the counselor cancel one. No history, no stats, no reschedule-from-portal.
- The Google OAuth request always includes `access_type: 'offline'` and `prompt: 'consent'` so a fresh refresh token is captured on every sign-in, not just the first.
- The onboarding form cannot submit with zero durations checked or zero working days set.

---

### Task 1: Storage bucket for counselor photos, and a scoped read policy so counselors can see their students' names

**Files:**
- Create: `supabase/migrations/<timestamp>_counselor_portal.sql`

**Interfaces:**
- Produces: a public-read, owner-write `counselor-photos` storage bucket; a `profiles` SELECT policy scoped to "a counselor may read the profile of a student they have a booking with."

- [ ] **Step 1: Create the migration file**

```bash
npx supabase migration new counselor_portal
```

- [ ] **Step 2: Write the migration**

```sql
insert into storage.buckets (id, name, public)
values ('counselor-photos', 'counselor-photos', true)
on conflict (id) do nothing;

create policy "Anyone can view counselor photos"
  on storage.objects for select
  to public
  using (bucket_id = 'counselor-photos');

create policy "A counselor can upload to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'counselor-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "A counselor can replace their own photo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'counselor-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Counselors can see the name of students they're booked with"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.bookings
      where bookings.student_id = profiles.id
        and bookings.counselor_id = auth.uid()
    )
  );
```

The upload/replace policies key off the first path segment of the object name (`(storage.foldername(name))[1]`) — the app code in Task 4 uploads to `<counselor_id>/<filename>`, so a counselor can only ever write inside their own folder. The last policy adds to, not replaces, the base backend plan's owner-only `profiles` SELECT policy — Postgres RLS policies for the same command are OR'd together.

- [ ] **Step 3: Apply it locally**

```bash
npx supabase db reset
```

Expected: no errors.

- [ ] **Step 4: Verify the bucket and policies exist**

In the Studio SQL editor (local):

```sql
select id, public from storage.buckets where id = 'counselor-photos';
select policyname from pg_policies where tablename = 'objects' and policyname like '%counselor%';
select policyname from pg_policies where tablename = 'profiles' and policyname like '%booked with%';
```

Expected: the bucket row shows `public = true`; 3 storage policies; 1 profiles policy.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add counselor photo storage bucket and student-name read policy"
```

---

### Task 2: Static page shell

**Files:**
- Create: `counselor-portal/index.html`
- Create: `counselor-portal/style.css`

**Interfaces:**
- Produces: three view containers (`login-view`, `onboarding-view`, `dashboard-view`) that `app.js` (Task 3) shows/hides.

- [ ] **Step 1: Write the HTML**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Launch Your Career — Counselor Portal</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main id="app">
    <section id="login-view">
      <h1>Counselor Portal</h1>
      <button id="google-signin-btn">Sign in with Google</button>
    </section>

    <section id="onboarding-view" hidden>
      <h1>Set up your profile</h1>
      <form id="onboarding-form">
        <label>Name <input type="text" name="name" required /></label>
        <label>Bio <textarea name="bio"></textarea></label>
        <label>Photo <input type="file" name="photo" accept="image/*" /></label>
        <label>Timezone
          <select name="timezone" id="timezone-select" required></select>
        </label>

        <fieldset>
          <legend>Working hours</legend>
          <div id="working-hours-rows"></div>
        </fieldset>

        <fieldset>
          <legend>Session lengths you offer</legend>
          <label><input type="checkbox" name="duration" value="30" /> 30 min</label>
          <label><input type="checkbox" name="duration" value="60" /> 60 min</label>
          <label><input type="checkbox" name="duration" value="90" /> 90 min</label>
          <label><input type="checkbox" name="duration" value="120" /> 120 min</label>
        </fieldset>

        <button type="submit">Save</button>
        <p id="onboarding-error" class="error" hidden></p>
      </form>
    </section>

    <section id="dashboard-view" hidden>
      <h1>Your upcoming sessions</h1>
      <p id="reconnect-banner" class="banner" hidden>
        Your calendar is disconnected.
        <button id="reconnect-btn">Reconnect</button>
      </p>
      <ul id="sessions-list"></ul>
      <p id="dashboard-empty" hidden>No upcoming sessions.</p>
    </section>
  </main>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write minimal styling**

```css
/* counselor-portal/style.css */
body {
  font-family: system-ui, sans-serif;
  max-width: 480px;
  margin: 2rem auto;
  padding: 0 1rem;
}
label { display: block; margin-bottom: 0.75rem; }
input, textarea, select { display: block; width: 100%; margin-top: 0.25rem; }
.error { color: #b00020; }
.banner { background: #fff3cd; padding: 0.75rem; border-radius: 4px; }
fieldset { margin-bottom: 1rem; border: 1px solid #ccc; }
#working-hours-rows > div { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.25rem; }
#sessions-list li { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #eee; }
```

- [ ] **Step 3: Open it in a browser to confirm it renders with no errors**

Open `counselor-portal/index.html` directly in a browser (or `npx serve counselor-portal`). Expected: the login view renders (a "Sign in with Google" button); no console errors besides the still-missing `app.js` module (added next task).

- [ ] **Step 4: Commit**

```bash
git add counselor-portal/index.html counselor-portal/style.css
git commit -m "feat: add counselor portal page shell"
```

---

### Task 3: Pure form-logic module

**Files:**
- Create: `counselor-portal/lib.js`
- Test: `counselor-portal/lib.test.mjs`

**Interfaces:**
- Produces: `isOnboardingComplete(counselor): boolean`, `serializeWorkingHours(dayInputs): object`, `collectCheckedDurations(durationInputs): number[]`. Consumed by `app.js` (Task 4).

- [ ] **Step 1: Write the failing tests**

```js
// counselor-portal/lib.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { isOnboardingComplete, serializeWorkingHours, collectCheckedDurations } from "./lib.js";

test("isOnboardingComplete - false when working hours are empty", () => {
  assert.equal(
    isOnboardingComplete({ name: "A", timezone: "America/Chicago", allowed_durations: [30], working_hours: {} }),
    false
  );
});

test("isOnboardingComplete - false when no durations are selected", () => {
  assert.equal(
    isOnboardingComplete({
      name: "A",
      timezone: "America/Chicago",
      allowed_durations: [],
      working_hours: { mon: [["09:00", "17:00"]] },
    }),
    false
  );
});

test("isOnboardingComplete - true once every required field is set", () => {
  assert.equal(
    isOnboardingComplete({
      name: "A",
      timezone: "America/Chicago",
      allowed_durations: [30],
      working_hours: { mon: [["09:00", "17:00"]] },
    }),
    true
  );
});

test("serializeWorkingHours - only includes enabled days with both times set", () => {
  const result = serializeWorkingHours([
    { day: "mon", enabled: true, start: "09:00", end: "17:00" },
    { day: "tue", enabled: false, start: "09:00", end: "17:00" },
    { day: "wed", enabled: true, start: "", end: "17:00" },
  ]);
  assert.deepEqual(result, { mon: [["09:00", "17:00"]] });
});

test("collectCheckedDurations - returns only the checked values", () => {
  const result = collectCheckedDurations([
    { value: 30, checked: true },
    { value: 60, checked: false },
    { value: 90, checked: true },
  ]);
  assert.deepEqual(result, [30, 90]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test counselor-portal/lib.test.mjs`
Expected: FAIL — cannot find module `./lib.js`.

- [ ] **Step 3: Implement**

```js
// counselor-portal/lib.js
export function isOnboardingComplete(counselor) {
  return Boolean(
    counselor &&
      counselor.name &&
      counselor.timezone &&
      counselor.allowed_durations &&
      counselor.allowed_durations.length > 0 &&
      counselor.working_hours &&
      Object.keys(counselor.working_hours).length > 0
  );
}

export function serializeWorkingHours(dayInputs) {
  const workingHours = {};
  for (const { day, enabled, start, end } of dayInputs) {
    if (enabled && start && end) {
      workingHours[day] = [[start, end]];
    }
  }
  return workingHours;
}

export function collectCheckedDurations(durationInputs) {
  return durationInputs.filter((d) => d.checked).map((d) => d.value);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test counselor-portal/lib.test.mjs`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add counselor-portal/lib.js counselor-portal/lib.test.mjs
git commit -m "feat: add counselor portal form logic with unit tests"
```

---

### Task 4: Supabase config and Google sign-in

**Files:**
- Create: `counselor-portal/config.example.js`
- Create: `counselor-portal/config.js` (gitignored — real credentials)
- Modify: `.gitignore` (add `counselor-portal/config.js`)
- Create: `counselor-portal/app.js` (sign-in portion only — onboarding/dashboard added in later tasks)

**Interfaces:**
- Consumes: nothing from earlier tasks besides the schema/Edge Functions.
- Produces: a working `supabase` client and a `renderApp()` router that later tasks extend.

- [ ] **Step 1: Add the config files**

```js
// counselor-portal/config.example.js
export const SUPABASE_URL = "https://your-project.supabase.co";
export const SUPABASE_ANON_KEY = "your-anon-key";
```

Copy this to `counselor-portal/config.js` and fill in your real project's URL and anon key (same values as the Expo app's `.env`).

- [ ] **Step 2: Gitignore the real config**

Add to `.gitignore` (near the existing `.env` entries):

```
counselor-portal/config.js
```

- [ ] **Step 3: Write the sign-in logic**

```js
// counselor-portal/app.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function show(viewId) {
  for (const id of ["login-view", "onboarding-view", "dashboard-view"]) {
    document.getElementById(id).hidden = id !== viewId;
  }
}

async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes: "https://www.googleapis.com/auth/calendar.events",
      queryParams: { access_type: "offline", prompt: "consent" },
      redirectTo: window.location.origin,
    },
  });
}

async function saveCalendarToken(refreshToken) {
  const { error } = await supabase.functions.invoke("save-calendar-token", {
    body: { refresh_token: refreshToken },
  });
  if (error) {
    console.error("Failed to save calendar token", error);
  }
}

async function renderApp() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    show("login-view");
    return;
  }
  // Onboarding/dashboard routing is added in Tasks 5 and 6.
  show("dashboard-view");
}

document.getElementById("google-signin-btn").addEventListener("click", signInWithGoogle);

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_IN" && session?.provider_refresh_token) {
    await saveCalendarToken(session.provider_refresh_token);
  }
  await renderApp();
});

renderApp();

export { supabase, show, renderApp };
```

- [ ] **Step 4: Manual verification**

Serve the folder (`npx serve counselor-portal`), click "Sign in with Google," complete the consent screen with a real test Google account. Expected: after the redirect back, the browser console shows no errors, and in Supabase Studio's table editor a row appears in both `counselors` (with `calendar_connected = true`) and `counselor_tokens` for that user.

- [ ] **Step 5: Commit**

```bash
git add counselor-portal/config.example.js counselor-portal/app.js .gitignore
git commit -m "feat: add counselor portal Google sign-in and token capture"
```

---

### Task 5: Onboarding form

**Files:**
- Modify: `counselor-portal/app.js`

**Interfaces:**
- Consumes: `isOnboardingComplete`, `serializeWorkingHours`, `collectCheckedDurations` (Task 3); `supabase`, `show` (Task 4).
- Produces: extends `renderApp()` to route to onboarding when incomplete, and wires the onboarding form's submit handler.

- [ ] **Step 1: Extend `app.js`**

Add these functions and update `renderApp` (replace the whole file with this version — it's the Task 4 version plus the additions below):

```js
// counselor-portal/app.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { isOnboardingComplete, serializeWorkingHours, collectCheckedDurations } from "./lib.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DAYS = [
  ["sun", "Sunday"], ["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"],
  ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"],
];

function show(viewId) {
  for (const id of ["login-view", "onboarding-view", "dashboard-view"]) {
    document.getElementById(id).hidden = id !== viewId;
  }
}

async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes: "https://www.googleapis.com/auth/calendar.events",
      queryParams: { access_type: "offline", prompt: "consent" },
      redirectTo: window.location.origin,
    },
  });
}

async function saveCalendarToken(refreshToken) {
  const { error } = await supabase.functions.invoke("save-calendar-token", {
    body: { refresh_token: refreshToken },
  });
  if (error) {
    console.error("Failed to save calendar token", error);
  }
}

function populateTimezoneOptions() {
  const select = document.getElementById("timezone-select");
  if (select.dataset.populated) return;
  for (const tz of Intl.supportedValuesOf("timeZone")) {
    const option = document.createElement("option");
    option.value = tz;
    option.textContent = tz;
    select.appendChild(option);
  }
  select.dataset.populated = "true";
}

function renderWorkingHoursRows() {
  const container = document.getElementById("working-hours-rows");
  if (container.dataset.populated) return;
  for (const [key, label] of DAYS) {
    const row = document.createElement("div");
    row.innerHTML = `
      <label><input type="checkbox" data-day="${key}" class="day-enabled" /> ${label}</label>
      <input type="time" class="day-start" data-day="${key}" />
      <input type="time" class="day-end" data-day="${key}" />
    `;
    container.appendChild(row);
  }
  container.dataset.populated = "true";
}

function readWorkingHoursInputs() {
  return DAYS.map(([key]) => ({
    day: key,
    enabled: document.querySelector(`.day-enabled[data-day="${key}"]`).checked,
    start: document.querySelector(`.day-start[data-day="${key}"]`).value,
    end: document.querySelector(`.day-end[data-day="${key}"]`).value,
  }));
}

function readDurationInputs() {
  return [...document.querySelectorAll('input[name="duration"]')].map((el) => ({
    value: Number(el.value),
    checked: el.checked,
  }));
}

async function uploadPhoto(file, counselorId) {
  if (!file) return null;
  const path = `${counselorId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("counselor-photos").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("counselor-photos").getPublicUrl(path);
  return data.publicUrl;
}

async function handleOnboardingSubmit(event, counselorId) {
  event.preventDefault();
  const errorEl = document.getElementById("onboarding-error");
  errorEl.hidden = true;

  const form = event.target;
  const name = form.name.value.trim();
  const bio = form.bio.value.trim();
  const timezone = form.timezone.value;
  const durations = collectCheckedDurations(readDurationInputs());
  const workingHours = serializeWorkingHours(readWorkingHoursInputs());

  if (durations.length === 0) {
    errorEl.textContent = "Select at least one session length.";
    errorEl.hidden = false;
    return;
  }
  if (Object.keys(workingHours).length === 0) {
    errorEl.textContent = "Set working hours for at least one day.";
    errorEl.hidden = false;
    return;
  }

  let photoUrl = null;
  try {
    photoUrl = await uploadPhoto(form.photo.files[0], counselorId);
  } catch (error) {
    errorEl.textContent = "Photo upload failed: " + error.message;
    errorEl.hidden = false;
    return;
  }

  const { error } = await supabase
    .from("counselors")
    .update({
      name,
      bio,
      timezone,
      allowed_durations: durations,
      working_hours: workingHours,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
    })
    .eq("id", counselorId);

  if (error) {
    errorEl.textContent = "Save failed: " + error.message;
    errorEl.hidden = false;
    return;
  }

  await renderApp();
}

async function renderApp() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    show("login-view");
    return;
  }

  const counselorId = sessionData.session.user.id;
  const { data: counselor } = await supabase
    .from("counselors")
    .select("name, timezone, allowed_durations, working_hours, calendar_connected")
    .eq("id", counselorId)
    .single();

  if (!isOnboardingComplete(counselor)) {
    show("onboarding-view");
    populateTimezoneOptions();
    renderWorkingHoursRows();
    document
      .getElementById("onboarding-form")
      .addEventListener("submit", (event) => handleOnboardingSubmit(event, counselorId), { once: true });
    return;
  }

  show("dashboard-view");
  // Session list and reconnect banner are added in Task 6.
}

document.getElementById("google-signin-btn").addEventListener("click", signInWithGoogle);

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_IN" && session?.provider_refresh_token) {
    await saveCalendarToken(session.provider_refresh_token);
  }
  await renderApp();
});

renderApp();

export { supabase, show, renderApp };
```

- [ ] **Step 2: Manual verification**

Sign in with a Google test account that has no `counselors` row filled in yet. Expected: the onboarding form appears, timezone dropdown is populated (via `Intl.supportedValuesOf`, no library needed), submitting with zero durations checked shows "Select at least one session length." and does not save, and a valid submission updates the `counselors` row in Studio with the expected `working_hours`/`allowed_durations` shape.

- [ ] **Step 3: Commit**

```bash
git add counselor-portal/app.js
git commit -m "feat: add counselor portal onboarding form"
```

---

### Task 6: Dashboard — upcoming sessions and cancel

**Files:**
- Modify: `counselor-portal/app.js`

**Interfaces:**
- Consumes: `supabase`, `show` (Task 4); the `cancel-booking` Edge Function (backend plan); the `profiles` read policy from Task 1.
- Produces: the completed `renderApp()` — this is the last piece the portal needs.

- [ ] **Step 1: Add the dashboard functions and wire them into `renderApp`**

Add to `counselor-portal/app.js` (insert `loadUpcomingSessions` above `renderApp`, and replace the dashboard branch inside `renderApp` as shown):

```js
async function loadUpcomingSessions(counselorId) {
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, start_time, end_time, status, profiles:student_id (name)")
    .eq("counselor_id", counselorId)
    .eq("status", "confirmed")
    .gt("start_time", new Date().toISOString())
    .order("start_time");

  const list = document.getElementById("sessions-list");
  const empty = document.getElementById("dashboard-empty");
  list.innerHTML = "";

  if (!bookings || bookings.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  for (const booking of bookings) {
    const durationMinutes = Math.round(
      (new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / 60000
    );
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = `${new Date(booking.start_time).toLocaleString()} — ${booking.profiles?.name ?? "Student"} (${durationMinutes} min)`;
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", async () => {
      const { error } = await supabase.functions.invoke("cancel-booking", {
        body: { booking_id: booking.id },
      });
      if (error) {
        alert("Failed to cancel: " + error.message);
        return;
      }
      await loadUpcomingSessions(counselorId);
    });
    li.append(label, cancelBtn);
    list.appendChild(li);
  }
}
```

Then update the end of `renderApp` (replace the `show("dashboard-view");` line and its comment):

```js
  show("dashboard-view");
  document.getElementById("reconnect-banner").hidden = counselor.calendar_connected;
  await loadUpcomingSessions(counselorId);
```

And wire the reconnect button once, alongside the existing sign-in button listener:

```js
document.getElementById("google-signin-btn").addEventListener("click", signInWithGoogle);
document.getElementById("reconnect-btn").addEventListener("click", signInWithGoogle);
```

- [ ] **Step 2: Manual verification**

With a fully onboarded, `calendar_connected = true` counselor that has at least one upcoming booking (create one via the backend plan's integration script, using this counselor's id): reload the portal, confirm the session appears with the correct student name, time, and duration; click Cancel; confirm the row disappears from the list and the booking's `status` flips to `cancelled` in Studio. Then manually flip `calendar_connected = false` in Studio and reload — confirm the reconnect banner appears, and clicking it re-runs the Google consent flow.

- [ ] **Step 3: Commit**

```bash
git add counselor-portal/app.js
git commit -m "feat: add counselor portal dashboard with cancel and reconnect banner"
```

---

## Definition of done

- `node --test counselor-portal/lib.test.mjs` passes (5 tests).
- A fresh Google sign-in reaches the onboarding form, and a completed form results in a bookable counselor (`approved` still requires the operator's manual flip, per the spec — the portal never sets that flag itself).
- An onboarded counselor with an upcoming booking sees it on the dashboard with the student's name, and Cancel actually cancels it (calendar event deleted, DB row flips to `cancelled`).
- Disconnecting calendar access (or a dead token) surfaces the reconnect banner instead of a silent failure.
