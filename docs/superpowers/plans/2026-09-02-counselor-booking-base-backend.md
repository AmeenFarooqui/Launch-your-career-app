# Counselor Booking — Base Backend (Auth & Profiles) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the app a real Supabase identity layer — anonymous auth on launch and a `profiles` row per user — so the counselor-booking feature (and anything else built later) has something to attach real data to instead of mocks.

**Architecture:** A Supabase client (`lib/supabase.js`) persists its session via AsyncStorage and exposes `ensureAnonymousSession()`, called once on app boot from the root layout. A Postgres trigger on `auth.users` creates a matching `profiles` row automatically, so every session — anonymous or not — always has one to read/update.

**Tech Stack:** `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, Supabase CLI (local dev stack + migrations), Jest/`expo-router/testing-library` (already in the project).

**Spec:** [2026-07-10-supabase-backend-design.md](../specs/2026-07-10-supabase-backend-design.md) (identity/auth portion only — this plan deliberately does **not** build the quiz/leaderboard/store/AI-agent portions of that spec; those remain a separate future plan).

## Global Constraints

- Anonymous auth only. No password auth wiring in this pass — Login/Signup screens are untouched by this plan.
- `profiles.id` is always equal to `auth.users.id` (1:1, enforced by FK + the creation trigger — never insert a profile any other way).
- RLS on every table, no exceptions. For this minimal slice, `profiles` access is owner-only (`auth.uid() = id`) — broader read access (e.g. for a future leaderboard) is out of scope here.
- Env vars use the `EXPO_PUBLIC_` prefix so Expo inlines them at build time; real values live in a gitignored `.env`, never committed.
- No new state-management library, no custom auth context/provider — `lib/supabase.js` exports a plain client and one helper function, nothing more.

---

## Prerequisite (manual, not a code task)

Before Task 4, in your Supabase project dashboard: **Authentication → Providers → Anonymous Sign-Ins → enable it.** `signInAnonymously()` fails with every call until this is on. This is a one-time toggle in the hosted project; the local dev stack (Task 4) enables the equivalent via `config.toml`.

---

### Task 1: Install Supabase dependencies and env var scaffolding

**Files:**
- Modify: `package.json` (dependencies)
- Create: `.env.example`

**Interfaces:**
- Produces: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` env vars, consumed by Task 2's `lib/supabase.js`.

- [ ] **Step 1: Install the packages**

```bash
npm install @supabase/supabase-js @react-native-async-storage/async-storage
```

- [ ] **Step 2: Verify the install**

Run: `npm ls @supabase/supabase-js @react-native-async-storage/async-storage`
Expected: both print a resolved version, no `UNMET DEPENDENCY` error.

- [ ] **Step 3: Create the env var template**

`.env.example` (already gitignore-exempted — check `.gitignore` line `!.env.example` if unsure):

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Then create your own `.env` (gitignored) alongside it with your actual project's URL and anon key, from Supabase dashboard → Project Settings → API.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add supabase-js and async-storage dependencies"
```

---

### Task 2: Supabase client and anonymous-session helper

**Files:**
- Create: `lib/supabase.js`
- Test: `lib/supabase.test.js`

**Interfaces:**
- Consumes: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Task 1).
- Produces: `export const supabase` (the client instance), `export async function ensureAnonymousSession(): Promise<Session>` — resolves the current session if one exists, otherwise signs in anonymously and resolves the new one. Every later task that needs a Supabase call imports `supabase` from here; every screen that needs to guarantee a signed-in user calls `ensureAnonymousSession()`.

- [ ] **Step 1: Write the failing tests**

```js
// lib/supabase.test.js
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({}));

const { createClient } = require("@supabase/supabase-js");

describe("ensureAnonymousSession", () => {
  let getSession;
  let signInAnonymously;

  beforeEach(() => {
    jest.resetModules();
    getSession = jest.fn();
    signInAnonymously = jest.fn();
    createClient.mockReturnValue({
      auth: { getSession, signInAnonymously },
    });
  });

  test("returns the existing session without signing in again", async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: "abc" } } },
    });
    const { ensureAnonymousSession } = require("./supabase");

    const session = await ensureAnonymousSession();

    expect(session.user.id).toBe("abc");
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  test("signs in anonymously when there is no session yet", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    signInAnonymously.mockResolvedValue({
      data: { session: { user: { id: "new-anon" } } },
      error: null,
    });
    const { ensureAnonymousSession } = require("./supabase");

    const session = await ensureAnonymousSession();

    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    expect(session.user.id).toBe("new-anon");
  });

  test("throws when anonymous sign-in fails", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    signInAnonymously.mockResolvedValue({
      data: { session: null },
      error: new Error("Anonymous sign-ins are disabled"),
    });
    const { ensureAnonymousSession } = require("./supabase");

    await expect(ensureAnonymousSession()).rejects.toThrow(
      "Anonymous sign-ins are disabled"
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest lib/supabase.test.js`
Expected: FAIL — `Cannot find module './supabase'`.

- [ ] **Step 3: Implement the client and helper**

```js
// lib/supabase.js
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export async function ensureAnonymousSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    return data.session;
  }

  const { data: signInData, error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw error;
  }
  return signInData.session;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest lib/supabase.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase.js lib/supabase.test.js
git commit -m "feat: add supabase client and anonymous-session helper"
```

---

### Task 3: Establish a session on app boot

**Files:**
- Modify: `app/_layout.jsx:1-31`
- Test: `__tests__/session-bootstrap.test.jsx`

**Interfaces:**
- Consumes: `ensureAnonymousSession` from `lib/supabase.js` (Task 2).
- Produces: nothing new for later tasks to consume — this task's only job is guaranteeing a session exists by the time any screen needs one.

- [ ] **Step 1: Write the failing test**

```jsx
// __tests__/session-bootstrap.test.jsx
jest.mock("../lib/supabase", () => ({
  ensureAnonymousSession: jest.fn().mockResolvedValue({ user: { id: "test-user" } }),
}));

import { renderRouter, screen } from "expo-router/testing-library";
import { ensureAnonymousSession } from "../lib/supabase";

test("app establishes an anonymous session on boot", async () => {
  renderRouter("./app", { initialUrl: "/" });

  expect(screen).toHavePathname("/start");
  expect(ensureAnonymousSession).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/session-bootstrap.test.jsx`
Expected: FAIL — `ensureAnonymousSession` was not called.

- [ ] **Step 3: Wire it into the root layout**

Modify `app/_layout.jsx` (full file, changes are the `useEffect` import/hook and the new import):

```jsx
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import {
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from "@expo-google-fonts/baloo-2";
import { ensureAnonymousSession } from "../lib/supabase";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
  });

  useEffect(() => {
    ensureAnonymousSession().catch((error) => {
      console.warn("Failed to establish a session", error);
    });
  }, []);

  // Block until fonts load on device; render immediately under jest, where
  // font resolution is a no-op and blocking would hang every test.
  if (!fontsLoaded && !process.env.JEST_WORKER_ID) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="challenge" />
      <Stack.Screen name="result" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
```

Session establishment is deliberately fire-and-forget (not awaited, doesn't block rendering) — the existing font-loading gate is the only intentional boot blocker in this app, and adding a second one for a network call would make every screen wait on connectivity for no benefit yet.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/session-bootstrap.test.jsx`
Expected: PASS.

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `npm test`
Expected: all existing tests in `__tests__/navigation.test.jsx` still pass — this task only added a fire-and-forget effect, it doesn't change any navigation behavior.

- [ ] **Step 6: Commit**

```bash
git add app/_layout.jsx __tests__/session-bootstrap.test.jsx
git commit -m "feat: establish an anonymous session on app boot"
```

---

### Task 4: `profiles` table, creation trigger, and RLS

**Files:**
- Create: `supabase/migrations/<timestamp>_profiles.sql` (exact filename generated by `supabase migration new`)
- Create: `supabase/tests/verify-profiles-trigger.mjs`

**Interfaces:**
- Produces: `public.profiles(id uuid primary key references auth.users, created_at timestamptz)`, auto-populated via trigger. The counselor-booking backend plan alters this table to add `email`, `guardian_email`, `push_token`.

This task's "test" is a migration applied to a local Supabase stack, verified with a small Node script — there's no Jest equivalent for SQL/RLS behavior, so this follows the same pattern the July 10 spec already established ("one integration script").

- [ ] **Step 1: Initialize the Supabase project locally (skip if `supabase/config.toml` already exists)**

```bash
npx supabase init
```

- [ ] **Step 2: Enable anonymous sign-ins for local dev**

In the generated `supabase/config.toml`, under the `[auth]` section, add:

```toml
enable_anonymous_sign_ins = true
```

- [ ] **Step 3: Start the local stack**

```bash
npx supabase start
```

Expected: prints a table of local URLs/keys, including `API URL` and `anon key` — copy these for Step 8.

- [ ] **Step 4: Create the migration file**

```bash
npx supabase migration new profiles
```

Expected: creates an empty `supabase/migrations/<timestamp>_profiles.sql`.

- [ ] **Step 5: Write the migration**

```sql
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 6: Apply the migration to the local stack**

```bash
npx supabase db reset
```

Expected: no errors; this drops and rebuilds the local database from all migrations, so it also proves the file has no syntax errors.

- [ ] **Step 7: Write the verification script**

```js
// supabase/tests/verify-profiles-trigger.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY (from `supabase status`) first.");
  process.exit(1);
}

const supabase = createClient(url, anonKey);

const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
if (signInError) {
  console.error("Anonymous sign-in failed:", signInError.message);
  process.exit(1);
}

const userId = signInData.user.id;

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id, created_at")
  .eq("id", userId)
  .single();

if (profileError || !profile) {
  console.error("No profile row was created for the new user:", profileError?.message);
  process.exit(1);
}

console.log("PASS: profile row auto-created for", userId);
```

- [ ] **Step 8: Run the verification script against the local stack**

```bash
SUPABASE_URL=<API URL from Step 3> SUPABASE_ANON_KEY=<anon key from Step 3> node supabase/tests/verify-profiles-trigger.mjs
```

Expected: `PASS: profile row auto-created for <uuid>`.

- [ ] **Step 9: Link to the real project and push the migration**

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

This is interactive (browser login) the first time — run it yourself rather than expecting it to complete unattended.

- [ ] **Step 10: Verify against the real project**

```bash
SUPABASE_URL=<value from your .env> SUPABASE_ANON_KEY=<value from your .env> node supabase/tests/verify-profiles-trigger.mjs
```

Expected: `PASS: profile row auto-created for <uuid>` — confirms the Prerequisite toggle (anonymous sign-ins enabled on the hosted project) actually took effect.

- [ ] **Step 11: Commit**

```bash
git add supabase/
git commit -m "feat: add profiles table with auto-creation trigger and RLS"
```

---

## Definition of done

- `npm test` passes with no regressions.
- `node supabase/tests/verify-profiles-trigger.mjs` prints PASS against both the local stack and the real project.
- A fresh anonymous user launching the app ends up with exactly one `profiles` row they can read and update, and no other user's row.
