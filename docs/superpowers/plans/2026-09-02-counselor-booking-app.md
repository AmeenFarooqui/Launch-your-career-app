# Counselor Booking — Expo App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give students a Counselors tab to browse and book a session, and a My Bookings screen to manage/reschedule/cancel and leave a star rating — wired to the Edge Functions from the backend plan.

**Architecture:** All Supabase/Edge Function calls are wrapped in `lib/bookings.js`, so screens never call `supabase.functions.invoke` or `.from()` directly — mirrors how `lib/supabase.js` already isolates auth. Screens follow the existing project convention exactly: a thin `app/**/*.jsx` re-export of a real component in `components/screens/*.jsx`, styled with the existing `constants/theme.js` tokens and `Screen`/`PressableScale` primitives — no new component library, no new animation system.

**Tech Stack:** React Native/Expo (existing), `expo-notifications` (new), Jest + `expo-router/testing-library` (existing, same pattern as `__tests__/navigation.test.jsx`).

**Spec:** [2026-09-02-counselor-booking-design.md](../specs/2026-09-02-counselor-booking-design.md)

**Depends on:** [2026-09-02-counselor-booking-backend.md](2026-09-02-counselor-booking-backend.md) — all 6 Edge Functions and the schema must exist. Independent of the portal plan (they only share the backend).

## Global Constraints

- No new UI framework or component library — reuse `Screen`, `PressableScale`, `constants/theme.js` (`COLORS`, `RADIUS`, `FONTS`, `TYPE`, `clay`) exactly as every existing screen does.
- Screens never call `supabase.functions.invoke` or `.from()` directly — always through `lib/bookings.js`.
- Times are always rendered via `new Date(...).toLocaleString()` (device-local timezone) — no timezone is stored or computed client-side for students.
- Push notifications are best-effort: permission can be denied, registration can fail, and neither should block booking or app boot.

---

### Task 1: Migration — ratings without cross-table RLS problems

**Files:**
- Create: `supabase/migrations/<timestamp>_counselor_ratings.sql`

**Interfaces:**
- Produces: `public.counselor_ratings(counselor_id, avg_rating, review_count)`, a view. Consumed by `lib/bookings.js`'s `listBookableCounselors` (Task 2).

The spec calls for an average-rating display on counselor cards, but `reviews` only stores `booking_id` — getting from there to `counselor_id` normally means joining `bookings`, and a browsing student's RLS on `bookings` only covers their *own* bookings, which would silently produce wrong (incomplete) averages for every other student's reviews. Denormalizing `counselor_id` onto `reviews` itself (set by a trigger, not the client, so it can't be spoofed) sidesteps the problem entirely: the aggregate view only ever touches `reviews`, which is already openly readable.

- [ ] **Step 1: Create the migration file**

```bash
npx supabase migration new counselor_ratings
```

- [ ] **Step 2: Write the migration**

```sql
alter table public.reviews add column counselor_id uuid references public.counselors (id);

create function public.set_review_counselor_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select counselor_id into new.counselor_id from public.bookings where id = new.booking_id;
  return new;
end;
$$;

create trigger set_review_counselor_id_trigger
  before insert on public.reviews
  for each row execute function public.set_review_counselor_id();

create view public.counselor_ratings as
select counselor_id, avg(rating)::numeric(3,2) as avg_rating, count(*) as review_count
from public.reviews
group by counselor_id;
```

The trigger overwrites whatever `counselor_id` a client might send on insert — a student can't misattribute a review to the wrong counselor even if they tried, since the value is always looked up server-side from the actual booking.

- [ ] **Step 3: Apply it locally**

```bash
npx supabase db reset
```

Expected: no errors.

- [ ] **Step 4: Verify the trigger and view**

In the Studio SQL editor (local), reusing the test counselor/booking setup pattern from the backend plan's Task 2 verification (insert a counselor, a booking, then):

```sql
insert into public.reviews (booking_id, rating) values ('<a real booking id>', 5);
select counselor_id from public.reviews where booking_id = '<that booking id>';
select * from public.counselor_ratings where counselor_id = '<the counselor id>';
```

Expected: the review's `counselor_id` matches the booking's counselor automatically, and `counselor_ratings` shows `avg_rating = 5.00, review_count = 1`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add counselor_ratings view backed by a server-set counselor_id"
```

---

### Task 2: `lib/bookings.js` — the app's Edge Function/table wrapper

**Files:**
- Create: `lib/bookings.js`
- Test: `lib/bookings.test.js`

**Interfaces:**
- Consumes: `supabase` from `lib/supabase.js`.
- Produces: `listBookableCounselors()`, `getCounselor(id)`, `getAvailability(counselorId, durationMinutes)`, `createBooking(counselorId, startTime, durationMinutes)`, `cancelBooking(bookingId)`, `rescheduleBooking(bookingId, newStartTime, newDurationMinutes)`, `listMyBookings()`, `submitReview(bookingId, rating)`, `getMyProfile(studentId)`, `saveContactEmails(studentId, email, guardianEmail)`, `isDistinctGuardianEmail(email, guardianEmail)`. Every screen in Tasks 4–6 imports from here, never from `lib/supabase.js` directly for data access.

- [ ] **Step 1: Write the failing tests**

```js
// lib/bookings.test.js
jest.mock("./supabase", () => ({
  supabase: { from: jest.fn(), functions: { invoke: jest.fn() } },
}));

const { supabase } = require("./supabase");
const {
  listBookableCounselors,
  getAvailability,
  createBooking,
  cancelBooking,
  rescheduleBooking,
  submitReview,
  isDistinctGuardianEmail,
} = require("./bookings");

function queryStub(result) {
  const stub = {};
  stub.select = jest.fn(() => stub);
  stub.eq = jest.fn(() => stub);
  stub.order = jest.fn(() => stub);
  stub.insert = jest.fn(() => stub);
  stub.update = jest.fn(() => stub);
  stub.single = jest.fn(() => Promise.resolve(result));
  stub.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return stub;
}

beforeEach(() => jest.clearAllMocks());

describe("listBookableCounselors", () => {
  test("merges counselor rows with their average rating", async () => {
    supabase.from.mockImplementation((table) => {
      if (table === "counselors") {
        return queryStub({
          data: [{ id: "c1", name: "Dana", bio: "...", photo_url: null, allowed_durations: [30] }],
          error: null,
        });
      }
      if (table === "counselor_ratings") {
        return queryStub({ data: [{ counselor_id: "c1", avg_rating: 4.5, review_count: 2 }], error: null });
      }
      throw new Error(`unexpected table ${table}`);
    });

    const result = await listBookableCounselors();

    expect(result).toEqual([
      {
        id: "c1",
        name: "Dana",
        bio: "...",
        photo_url: null,
        allowed_durations: [30],
        avgRating: 4.5,
        reviewCount: 2,
      },
    ]);
  });

  test("defaults to null rating when a counselor has no reviews", async () => {
    supabase.from.mockImplementation((table) => {
      if (table === "counselors") {
        return queryStub({ data: [{ id: "c1", name: "Dana", allowed_durations: [30] }], error: null });
      }
      return queryStub({ data: [], error: null });
    });

    const result = await listBookableCounselors();

    expect(result[0].avgRating).toBeNull();
    expect(result[0].reviewCount).toBe(0);
  });
});

describe("edge function wrappers", () => {
  test("getAvailability invokes get-availability and returns the slots", async () => {
    supabase.functions.invoke.mockResolvedValue({ data: { slots: ["2026-09-10T15:00:00Z"] }, error: null });

    const slots = await getAvailability("c1", 30);

    expect(supabase.functions.invoke).toHaveBeenCalledWith("get-availability", {
      body: { counselor_id: "c1", duration_minutes: 30 },
    });
    expect(slots).toEqual(["2026-09-10T15:00:00Z"]);
  });

  test("createBooking throws when the function returns an error", async () => {
    supabase.functions.invoke.mockResolvedValue({ data: null, error: new Error("Slot no longer available") });

    await expect(createBooking("c1", "2026-09-10T15:00:00Z", 30)).rejects.toThrow("Slot no longer available");
  });

  test("cancelBooking invokes cancel-booking with the booking id", async () => {
    supabase.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null });

    await cancelBooking("b1");

    expect(supabase.functions.invoke).toHaveBeenCalledWith("cancel-booking", { body: { booking_id: "b1" } });
  });

  test("rescheduleBooking invokes reschedule-booking with the new time and duration", async () => {
    supabase.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null });

    await rescheduleBooking("b1", "2026-09-11T15:00:00Z", 60);

    expect(supabase.functions.invoke).toHaveBeenCalledWith("reschedule-booking", {
      body: { booking_id: "b1", new_start_time: "2026-09-11T15:00:00Z", new_duration_minutes: 60 },
    });
  });
});

describe("submitReview", () => {
  test("inserts a rating for the booking", async () => {
    const stub = queryStub({ data: null, error: null });
    supabase.from.mockReturnValue(stub);

    await submitReview("b1", 5);

    expect(supabase.from).toHaveBeenCalledWith("reviews");
    expect(stub.insert).toHaveBeenCalledWith({ booking_id: "b1", rating: 5 });
  });
});

describe("isDistinctGuardianEmail", () => {
  test("rejects identical addresses, case-insensitively", () => {
    expect(isDistinctGuardianEmail("Student@Example.com", "student@example.com")).toBe(false);
  });

  test("allows two different addresses", () => {
    expect(isDistinctGuardianEmail("student@example.com", "guardian@example.com")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest lib/bookings.test.js`
Expected: FAIL — `Cannot find module './bookings'`.

- [ ] **Step 3: Implement**

```js
// lib/bookings.js
import { supabase } from "./supabase";

export async function listBookableCounselors() {
  const [{ data: counselors, error: counselorsError }, { data: ratings }] = await Promise.all([
    supabase
      .from("counselors")
      .select("id, name, bio, photo_url, allowed_durations")
      .eq("approved", true)
      .eq("calendar_connected", true),
    supabase.from("counselor_ratings").select("counselor_id, avg_rating, review_count"),
  ]);
  if (counselorsError) throw counselorsError;

  const ratingByCounselor = Object.fromEntries((ratings ?? []).map((r) => [r.counselor_id, r]));
  return (counselors ?? []).map((c) => ({
    ...c,
    avgRating: ratingByCounselor[c.id]?.avg_rating ?? null,
    reviewCount: ratingByCounselor[c.id]?.review_count ?? 0,
  }));
}

export async function getCounselor(counselorId) {
  const { data, error } = await supabase
    .from("counselors")
    .select("id, name, bio, photo_url, allowed_durations")
    .eq("id", counselorId)
    .single();
  if (error) throw error;
  return data;
}

export async function getAvailability(counselorId, durationMinutes) {
  const { data, error } = await supabase.functions.invoke("get-availability", {
    body: { counselor_id: counselorId, duration_minutes: durationMinutes },
  });
  if (error) throw error;
  return data.slots;
}

export async function createBooking(counselorId, startTime, durationMinutes) {
  const { data, error } = await supabase.functions.invoke("create-booking", {
    body: { counselor_id: counselorId, start_time: startTime, duration_minutes: durationMinutes },
  });
  if (error) throw error;
  return data.booking;
}

export async function cancelBooking(bookingId) {
  const { error } = await supabase.functions.invoke("cancel-booking", {
    body: { booking_id: bookingId },
  });
  if (error) throw error;
}

export async function rescheduleBooking(bookingId, newStartTime, newDurationMinutes) {
  const { error } = await supabase.functions.invoke("reschedule-booking", {
    body: { booking_id: bookingId, new_start_time: newStartTime, new_duration_minutes: newDurationMinutes },
  });
  if (error) throw error;
}

export async function listMyBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, counselor_id, start_time, end_time, status, meet_link, counselors:counselor_id (name)")
    .order("start_time", { ascending: false });
  if (error) throw error;
  return data;
}

export async function submitReview(bookingId, rating) {
  const { error } = await supabase.from("reviews").insert({ booking_id: bookingId, rating });
  if (error) throw error;
}

export async function getMyProfile(studentId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("email, guardian_email")
    .eq("id", studentId)
    .single();
  if (error) throw error;
  return data;
}

export async function saveContactEmails(studentId, email, guardianEmail) {
  const { error } = await supabase
    .from("profiles")
    .update({ email, guardian_email: guardianEmail })
    .eq("id", studentId);
  if (error) throw error;
}

export function isDistinctGuardianEmail(email, guardianEmail) {
  if (!email || !guardianEmail) return false;
  return email.trim().toLowerCase() !== guardianEmail.trim().toLowerCase();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest lib/bookings.test.js`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/bookings.js lib/bookings.test.js
git commit -m "feat: add lib/bookings wrapping the counselor booking Edge Functions"
```

---

### Task 3: Push notification registration

**Files:**
- Modify: `package.json` (dependency)
- Create: `lib/push.js`
- Test: `lib/push.test.js`
- Modify: `app/_layout.jsx` (from the base backend plan's Task 3)
- Modify: `__tests__/session-bootstrap.test.jsx` (from the base backend plan's Task 3)

**Interfaces:**
- Produces: `registerForPushNotifications(userId): Promise<string|null>` — best-effort, never throws, saves the token to `profiles.push_token` on success.

Push requires an EAS project id configured in `app.json`/`eas.json` to actually deliver notifications in production — that's an external one-time setup step (`eas init`) outside this plan's scope. The function degrades gracefully without it (returns `null`, logs a warning), so app boot and booking are never blocked by missing push configuration.

- [ ] **Step 1: Install the dependency**

```bash
npx expo install expo-notifications
```

- [ ] **Step 2: Write the failing tests**

```js
// lib/push.test.js
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));
jest.mock("./supabase", () => ({ supabase: { from: jest.fn() } }));

const Notifications = require("expo-notifications");
const { supabase } = require("./supabase");
const { registerForPushNotifications } = require("./push");

beforeEach(() => jest.clearAllMocks());

test("saves the push token when permission is already granted", async () => {
  Notifications.getPermissionsAsync.mockResolvedValue({ status: "granted" });
  Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: "ExpoToken[abc]" });
  const eq = jest.fn().mockResolvedValue({ error: null });
  const update = jest.fn(() => ({ eq }));
  supabase.from.mockReturnValue({ update });

  const token = await registerForPushNotifications("user-1");

  expect(token).toBe("ExpoToken[abc]");
  expect(update).toHaveBeenCalledWith({ push_token: "ExpoToken[abc]" });
  expect(eq).toHaveBeenCalledWith("id", "user-1");
});

test("returns null without saving when permission is denied", async () => {
  Notifications.getPermissionsAsync.mockResolvedValue({ status: "undetermined" });
  Notifications.requestPermissionsAsync.mockResolvedValue({ status: "denied" });

  const token = await registerForPushNotifications("user-1");

  expect(token).toBeNull();
  expect(supabase.from).not.toHaveBeenCalled();
});

test("fails gracefully when the notifications API throws", async () => {
  Notifications.getPermissionsAsync.mockRejectedValue(new Error("no native module"));

  const token = await registerForPushNotifications("user-1");

  expect(token).toBeNull();
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx jest lib/push.test.js`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

```js
// lib/push.js
import * as Notifications from "expo-notifications";
import { supabase } from "./supabase";

export async function registerForPushNotifications(userId) {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await supabase.from("profiles").update({ push_token: token }).eq("id", userId);
    return token;
  } catch (error) {
    console.warn("Push registration failed", error);
    return null;
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest lib/push.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 6: Wire it into app boot**

Modify `app/_layout.jsx` (the version from the base backend plan's Task 3 — only the `useEffect` body and one import change):

```jsx
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import {
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from "@expo-google-fonts/baloo-2";
import { ensureAnonymousSession } from "../lib/supabase";
import { registerForPushNotifications } from "../lib/push";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
  });

  useEffect(() => {
    ensureAnonymousSession()
      .then((session) => registerForPushNotifications(session.user.id))
      .catch((error) => {
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

- [ ] **Step 7: Update the boot test**

Modify `__tests__/session-bootstrap.test.jsx` to also mock and assert the push registration call:

```jsx
// __tests__/session-bootstrap.test.jsx
jest.mock("../lib/supabase", () => ({
  ensureAnonymousSession: jest.fn().mockResolvedValue({ user: { id: "test-user" } }),
}));
jest.mock("../lib/push", () => ({
  registerForPushNotifications: jest.fn().mockResolvedValue(null),
}));

import { renderRouter, screen } from "expo-router/testing-library";
import { ensureAnonymousSession } from "../lib/supabase";
import { registerForPushNotifications } from "../lib/push";

test("app establishes an anonymous session and registers for push on boot", async () => {
  renderRouter("./app", { initialUrl: "/" });

  expect(screen).toHavePathname("/start");
  expect(ensureAnonymousSession).toHaveBeenCalledTimes(1);
  await screen.findByText(/LAUNCH/);
  expect(registerForPushNotifications).toHaveBeenCalledWith("test-user");
});
```

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: all tests pass, including the updated boot test.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json lib/push.js lib/push.test.js app/_layout.jsx __tests__/session-bootstrap.test.jsx
git commit -m "feat: register for push notifications on app boot"
```

---

### Task 4: Counselors tab — list screen

**Files:**
- Create: `components/screens/CounselorsScreen.jsx`
- Create: `app/(tabs)/counselors.jsx`
- Create: `app/counselor/[id].jsx` (placeholder re-export; the real screen lands in Task 5)
- Create: `components/screens/CounselorDetailScreen.jsx` (placeholder; built out in Task 5)
- Modify: `app/(tabs)/_layout.jsx`
- Modify: `components/BottomTabBar.jsx`
- Modify: `app/_layout.jsx` (register the new route)
- Test: `__tests__/counselor-booking.test.jsx`

**Interfaces:**
- Consumes: `listBookableCounselors` (Task 2); `Screen`, `PressableScale`, theme tokens (existing).
- Produces: the `/counselors` and `/counselor/[id]` routes exist and are reachable from the tab bar.

- [ ] **Step 1: Write the failing test**

```jsx
// __tests__/counselor-booking.test.jsx
jest.mock("../lib/bookings", () => ({
  listBookableCounselors: jest.fn(),
  getCounselor: jest.fn(),
  getAvailability: jest.fn(),
  createBooking: jest.fn(),
  cancelBooking: jest.fn(),
  rescheduleBooking: jest.fn(),
  listMyBookings: jest.fn(),
  submitReview: jest.fn(),
  getMyProfile: jest.fn(),
  saveContactEmails: jest.fn(),
  isDistinctGuardianEmail: jest.requireActual("../lib/bookings").isDistinctGuardianEmail,
}));
jest.mock("../lib/supabase", () => ({
  supabase: { auth: { getSession: jest.fn() } },
  ensureAnonymousSession: jest.fn().mockResolvedValue({ user: { id: "student-1" } }),
}));
jest.mock("../lib/push", () => ({ registerForPushNotifications: jest.fn().mockResolvedValue(null) }));

import { renderRouter, screen, waitFor } from "expo-router/testing-library";
import { fireEvent } from "@testing-library/react-native";
import { listBookableCounselors } from "../lib/bookings";

test("tapping the Talk tab shows the counselor list", async () => {
  listBookableCounselors.mockResolvedValue([
    {
      id: "c1",
      name: "Dana K.",
      bio: "College and career coach",
      photo_url: null,
      avgRating: 4.5,
      reviewCount: 3,
      allowed_durations: [30, 60],
    },
  ]);

  renderRouter("./app", { initialUrl: "/(tabs)/home" });
  fireEvent.press(screen.getByText("Talk"));

  expect(screen).toHavePathname("/counselors");
  await waitFor(() => expect(screen.getByText("Dana K.")).toBeTruthy());
});

test("tapping a counselor card opens their detail screen", async () => {
  listBookableCounselors.mockResolvedValue([
    { id: "c1", name: "Dana K.", bio: "Coach", photo_url: null, avgRating: null, reviewCount: 0, allowed_durations: [30] },
  ]);

  renderRouter("./app", { initialUrl: "/(tabs)/counselors" });
  await waitFor(() => expect(screen.getByText("Dana K.")).toBeTruthy());
  fireEvent.press(screen.getByText("Dana K."));

  expect(screen).toHavePathname("/counselor/c1");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/counselor-booking.test.jsx`
Expected: FAIL — "Talk" text not found (tab doesn't exist yet).

- [ ] **Step 3: Add the "Talk" tab**

Modify `components/BottomTabBar.jsx`'s `TABS` array:

```js
const TABS = [
  { name: "home", icon: "home", label: "Home" },
  { name: "leaderboard", icon: "trophy", label: "Rank" },
  { name: "counselors", icon: "people", label: "Talk" },
  { name: "store", icon: "storefront", label: "Store" },
  { name: "profile", icon: "person", label: "Profile" },
];
```

Modify `app/(tabs)/_layout.jsx`:

```jsx
import React from "react";
import { Tabs } from "expo-router";
import BottomTabBar from "../../components/BottomTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="leaderboard" />
      <Tabs.Screen name="counselors" />
      <Tabs.Screen name="store" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
```

- [ ] **Step 4: Write the list screen**

```jsx
// components/screens/CounselorsScreen.jsx
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Image } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "../PressableScale";
import Screen from "../Screen";
import { COLORS, RADIUS, FONTS, TYPE, clay } from "../../constants/theme";
import { listBookableCounselors } from "../../lib/bookings";

export default function CounselorsScreen() {
  const [counselors, setCounselors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    listBookableCounselors()
      .then(setCounselors)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Counselors</Text>
      </View>

      {loading && <Text style={styles.status}>Loading counselors…</Text>}
      {error && <Text style={styles.status}>Couldn't load counselors: {error}</Text>}

      <FlatList
        data={counselors}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PressableScale style={styles.card} onPress={() => router.push(`/counselor/${item.id}`)}>
            {item.photo_url ? (
              <Image source={{ uri: item.photo_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={28} color={COLORS.purpleLight} />
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={COLORS.gold} />
                <Text style={styles.rating}>
                  {item.avgRating ? `${item.avgRating} (${item.reviewCount})` : "No reviews yet"}
                </Text>
              </View>
            </View>
          </PressableScale>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 10 },
  title: { color: COLORS.white, fontSize: TYPE.h1, fontFamily: FONTS.heading },
  status: { color: COLORS.lavender, textAlign: "center", marginTop: 20 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 12,
    alignItems: "center",
    ...clay("#000", 5),
  },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  cardBody: { flex: 1 },
  name: { fontSize: TYPE.h2, fontFamily: FONTS.heading, color: COLORS.ink },
  bio: { fontSize: TYPE.caption, color: COLORS.muted, marginTop: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  rating: { fontSize: TYPE.caption, color: COLORS.ink, fontWeight: "600" },
});
```

```jsx
// app/(tabs)/counselors.jsx
import CounselorsScreen from "../../components/screens/CounselorsScreen";
export default CounselorsScreen;
```

- [ ] **Step 5: Add a placeholder detail screen and register its route**

```jsx
// components/screens/CounselorDetailScreen.jsx
import React from "react";
import { Text } from "react-native";
import Screen from "../Screen";

// Built out fully in the next task (duration picker, slot picker, booking).
export default function CounselorDetailScreen() {
  return (
    <Screen>
      <Text>Counselor detail</Text>
    </Screen>
  );
}
```

```jsx
// app/counselor/[id].jsx
import CounselorDetailScreen from "../../components/screens/CounselorDetailScreen";
export default CounselorDetailScreen;
```

Modify `app/_layout.jsx` to register the new route (add one line to the existing `<Stack>`):

```jsx
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="challenge" />
      <Stack.Screen name="result" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="counselor/[id]" />
    </Stack>
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx jest __tests__/counselor-booking.test.jsx`
Expected: PASS, 2 tests.

- [ ] **Step 7: Run the full suite to check for regressions**

Run: `npm test`
Expected: all tests pass — the tab bar gained one more entry, which doesn't change any existing tab's press behavior.

- [ ] **Step 8: Commit**

```bash
git add components/screens/CounselorsScreen.jsx components/screens/CounselorDetailScreen.jsx app/(tabs)/counselors.jsx app/counselor/ app/(tabs)/_layout.jsx components/BottomTabBar.jsx app/_layout.jsx __tests__/counselor-booking.test.jsx
git commit -m "feat: add Counselors tab with list screen and detail route"
```

---

### Task 5: Counselor detail — duration picker, slot picker, contact info, booking

**Files:**
- Modify: `components/screens/CounselorDetailScreen.jsx`
- Modify: `__tests__/counselor-booking.test.jsx`

**Interfaces:**
- Consumes: `getCounselor`, `getAvailability`, `createBooking`, `getMyProfile`, `saveContactEmails`, `isDistinctGuardianEmail` (Task 2); `supabase.auth.getSession` (existing).
- Produces: a full booking flow from the detail screen.

- [ ] **Step 1: Write the failing tests**

Add to `__tests__/counselor-booking.test.jsx`:

```jsx
import {
  getCounselor,
  getAvailability,
  createBooking,
  getMyProfile,
  saveContactEmails,
} from "../lib/bookings";
import { supabase } from "../lib/supabase";

test("booking a slot when contact info is already on file", async () => {
  getCounselor.mockResolvedValue({
    id: "c1",
    name: "Dana K.",
    bio: "Coach",
    allowed_durations: [30, 60],
  });
  getAvailability.mockResolvedValue(["2026-09-10T15:00:00.000Z"]);
  getMyProfile.mockResolvedValue({ email: "student@example.com", guardian_email: "guardian@example.com" });
  supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "student-1" } } } });
  createBooking.mockResolvedValue({ id: "b1" });

  renderRouter("./app", { initialUrl: "/counselor/c1" });

  await waitFor(() => expect(screen.getByText("Dana K.")).toBeTruthy());
  fireEvent.press(screen.getByText("30 min"));
  await waitFor(() => expect(screen.getByText(/2026/)).toBeTruthy());
  fireEvent.press(screen.getByText(/2026/));

  await waitFor(() =>
    expect(createBooking).toHaveBeenCalledWith("c1", "2026-09-10T15:00:00.000Z", 30)
  );
});

test("booking a slot with no contact info on file shows the modal first", async () => {
  getCounselor.mockResolvedValue({ id: "c1", name: "Dana K.", bio: "Coach", allowed_durations: [30] });
  getAvailability.mockResolvedValue(["2026-09-10T15:00:00.000Z"]);
  getMyProfile.mockResolvedValue({ email: null, guardian_email: null });
  supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "student-1" } } } });

  renderRouter("./app", { initialUrl: "/counselor/c1" });

  await waitFor(() => expect(screen.getByText("Dana K.")).toBeTruthy());
  fireEvent.press(screen.getByText("30 min"));
  await waitFor(() => expect(screen.getByText(/2026/)).toBeTruthy());
  fireEvent.press(screen.getByText(/2026/));

  await waitFor(() => expect(screen.getByText("Before you book")).toBeTruthy());
  expect(createBooking).not.toHaveBeenCalled();
});

test("the contact modal rejects a guardian email identical to the student's", async () => {
  getCounselor.mockResolvedValue({ id: "c1", name: "Dana K.", bio: "Coach", allowed_durations: [30] });
  getAvailability.mockResolvedValue(["2026-09-10T15:00:00.000Z"]);
  getMyProfile.mockResolvedValue({ email: null, guardian_email: null });
  supabase.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "student-1" } } } });

  renderRouter("./app", { initialUrl: "/counselor/c1" });
  await waitFor(() => expect(screen.getByText("Dana K.")).toBeTruthy());
  fireEvent.press(screen.getByText("30 min"));
  await waitFor(() => expect(screen.getByText(/2026/)).toBeTruthy());
  fireEvent.press(screen.getByText(/2026/));
  await waitFor(() => expect(screen.getByText("Before you book")).toBeTruthy());

  fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "same@example.com");
  fireEvent.changeText(screen.getByPlaceholderText("guardian@example.com"), "same@example.com");
  fireEvent.press(screen.getByText("Continue"));

  await waitFor(() =>
    expect(screen.getByText("Your email and guardian email must be different.")).toBeTruthy()
  );
  expect(saveContactEmails).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/counselor-booking.test.jsx`
Expected: FAIL — the placeholder screen has none of this UI.

- [ ] **Step 3: Implement the full detail screen**

```jsx
// components/screens/CounselorDetailScreen.jsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Modal, TextInput, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import PressableScale from "../PressableScale";
import Screen from "../Screen";
import { COLORS, RADIUS, FONTS, TYPE, clay } from "../../constants/theme";
import { supabase } from "../../lib/supabase";
import {
  getCounselor,
  getAvailability,
  createBooking,
  getMyProfile,
  saveContactEmails,
  isDistinctGuardianEmail,
} from "../../lib/bookings";

export default function CounselorDetailScreen() {
  const { id } = useLocalSearchParams();

  const [counselor, setCounselor] = useState(null);
  const [duration, setDuration] = useState(null);
  const [slots, setSlots] = useState([]);
  const [pendingSlot, setPendingSlot] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [email, setEmail] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [contactError, setContactError] = useState(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    getCounselor(id).then(setCounselor);
  }, [id]);

  const pickDuration = (value) => {
    setDuration(value);
    setSlots([]);
    getAvailability(id, value).then(setSlots);
  };

  const confirmBooking = async (slot, durationMinutes) => {
    setBooking(true);
    try {
      await createBooking(id, slot, durationMinutes);
      Alert.alert("Booked!", "Your session is confirmed.");
      router.push("/bookings");
    } catch (error) {
      Alert.alert("Couldn't book that slot", error.message);
    } finally {
      setBooking(false);
    }
  };

  const pickSlot = async (slot) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const studentId = sessionData.session.user.id;
    const profile = await getMyProfile(studentId);

    if (!profile.email || !profile.guardian_email) {
      setPendingSlot(slot);
      setShowContactModal(true);
      return;
    }
    await confirmBooking(slot, duration);
  };

  const submitContactInfo = async () => {
    setContactError(null);
    if (!isDistinctGuardianEmail(email, guardianEmail)) {
      setContactError("Your email and guardian email must be different.");
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const studentId = sessionData.session.user.id;
    await saveContactEmails(studentId, email, guardianEmail);
    setShowContactModal(false);
    await confirmBooking(pendingSlot, duration);
  };

  if (!counselor) {
    return (
      <Screen>
        <Text style={styles.status}>Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.name}>{counselor.name}</Text>
        <Text style={styles.bio}>{counselor.bio}</Text>

        <Text style={styles.sectionTitle}>Session length</Text>
        <View style={styles.row}>
          {counselor.allowed_durations.map((d) => (
            <PressableScale
              key={d}
              style={[styles.durationBtn, duration === d && styles.durationBtnActive]}
              onPress={() => pickDuration(d)}
            >
              <Text style={[styles.durationText, duration === d && styles.durationTextActive]}>
                {d} min
              </Text>
            </PressableScale>
          ))}
        </View>

        {duration && (
          <>
            <Text style={styles.sectionTitle}>Available times</Text>
            {slots.length === 0 && <Text style={styles.status}>No open slots in the next 2 weeks.</Text>}
            <View style={styles.row}>
              {slots.map((slot) => (
                <PressableScale key={slot} style={styles.slotBtn} onPress={() => pickSlot(slot)} disabled={booking}>
                  <Text style={styles.slotText}>{new Date(slot).toLocaleString()}</Text>
                </PressableScale>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={showContactModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Before you book</Text>
            <Text style={styles.bio}>
              We need your email and a parent/guardian email — both are added to the session invite.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="guardian@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={guardianEmail}
              onChangeText={setGuardianEmail}
            />
            {contactError && <Text style={styles.error}>{contactError}</Text>}
            <PressableScale style={styles.confirmBtn} onPress={submitContactInfo}>
              <Text style={styles.confirmText}>Continue</Text>
            </PressableScale>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  status: { color: COLORS.lavender, marginTop: 20, textAlign: "center" },
  name: { fontSize: TYPE.h1, fontFamily: FONTS.heading, color: COLORS.white },
  bio: { fontSize: TYPE.body, color: COLORS.lavender, marginBottom: 10 },
  sectionTitle: { fontSize: TYPE.h2, fontFamily: FONTS.heading, color: COLORS.white, marginTop: 14 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  durationBtn: { backgroundColor: COLORS.purple, paddingVertical: 10, paddingHorizontal: 16, borderRadius: RADIUS.md },
  durationBtnActive: { backgroundColor: COLORS.green },
  durationText: { color: COLORS.white, fontWeight: "700" },
  durationTextActive: { color: COLORS.ink },
  slotBtn: {
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    ...clay("#000", 3),
  },
  slotText: { color: COLORS.ink, fontWeight: "600", fontSize: TYPE.caption },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 20, gap: 10 },
  input: { borderWidth: 1, borderColor: COLORS.line, borderRadius: RADIUS.md, padding: 10, fontSize: TYPE.body },
  error: { color: COLORS.red },
  confirmBtn: { backgroundColor: COLORS.purple, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: "center", marginTop: 6 },
  confirmText: { color: COLORS.white, fontWeight: "800" },
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/counselor-booking.test.jsx`
Expected: PASS, 5 tests total (the 2 from Task 4 plus these 3).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/screens/CounselorDetailScreen.jsx __tests__/counselor-booking.test.jsx
git commit -m "feat: add counselor detail screen with duration/slot picker and booking"
```

---

### Task 6: My Bookings — list, cancel, reschedule, review

**Files:**
- Create: `components/screens/MyBookingsScreen.jsx`
- Create: `app/bookings.jsx`
- Modify: `app/_layout.jsx` (register the route)
- Modify: `components/screens/ProfileScreen.jsx` (nav entry point)
- Modify: `__tests__/counselor-booking.test.jsx`

**Interfaces:**
- Consumes: `listMyBookings`, `cancelBooking`, `rescheduleBooking`, `getAvailability`, `submitReview` (Task 2).
- Produces: the `/bookings` route, reachable from Profile.

- [ ] **Step 1: Write the failing tests**

Add to `__tests__/counselor-booking.test.jsx`:

```jsx
import { listMyBookings, cancelBooking, submitReview } from "../lib/bookings";

test("Profile's My Bookings button navigates to the bookings screen", async () => {
  listMyBookings.mockResolvedValue([]);
  renderRouter("./app", { initialUrl: "/(tabs)/profile" });

  fireEvent.press(screen.getByText("My Bookings"));

  expect(screen).toHavePathname("/bookings");
});

test("cancelling an upcoming booking removes it from the list on reload", async () => {
  listMyBookings
    .mockResolvedValueOnce([
      {
        id: "b1",
        counselor_id: "c1",
        start_time: "2099-01-01T15:00:00.000Z",
        end_time: "2099-01-01T15:30:00.000Z",
        status: "confirmed",
        counselors: { name: "Dana K." },
      },
    ])
    .mockResolvedValueOnce([]);
  cancelBooking.mockResolvedValue(undefined);

  renderRouter("./app", { initialUrl: "/bookings" });
  await waitFor(() => expect(screen.getByText("Dana K.")).toBeTruthy());

  fireEvent.press(screen.getByText("Cancel"));

  await waitFor(() => expect(cancelBooking).toHaveBeenCalledWith("b1"));
  await waitFor(() => expect(screen.queryByText("Dana K.")).toBeNull());
});

test("a completed, unreviewed booking shows a star rating prompt", async () => {
  listMyBookings.mockResolvedValue([
    {
      id: "b2",
      counselor_id: "c1",
      start_time: "2020-01-01T15:00:00.000Z",
      end_time: "2020-01-01T15:30:00.000Z",
      status: "confirmed",
      counselors: { name: "Dana K." },
    },
  ]);
  submitReview.mockResolvedValue(undefined);

  renderRouter("./app", { initialUrl: "/bookings" });
  await waitFor(() => expect(screen.getByText("Dana K.")).toBeTruthy());
  expect(screen.getByText("Completed")).toBeTruthy();

  // PressableScale sets accessibilityRole="button" on every pressable; for
  // a completed, unreviewed booking the only buttons on screen are the 5
  // stars followed by Submit, so index 2 is the third star (rating = 3).
  fireEvent.press(screen.getAllByRole("button")[2]);
  fireEvent.press(screen.getByText("Submit"));

  await waitFor(() => expect(submitReview).toHaveBeenCalledWith("b2", 3));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/counselor-booking.test.jsx`
Expected: FAIL — no "My Bookings" button, no `/bookings` route.

- [ ] **Step 3: Add the Profile nav entry**

Modify `components/screens/ProfileScreen.jsx`: add a button above the existing Settings button (same pattern, new icon/label/destination):

```jsx
        {/* My Bookings */}
        <FadeInUp delay={580}>
          <PressableScale
            style={styles.settingsButton}
            onPress={() => router.push("/bookings")}
          >
            <Ionicons name="calendar" size={22} color={COLORS.ink} />
            <Text style={styles.settingsText}>My Bookings</Text>
            <Ionicons name="chevron-forward" size={22} color={COLORS.muted} />
          </PressableScale>
        </FadeInUp>

        {/* Settings */}
        <FadeInUp delay={620}>
          <PressableScale
            style={styles.settingsButton}
            onPress={() => router.push("/settings")}
          >
            <Ionicons name="settings" size={22} color={COLORS.ink} />
            <Text style={styles.settingsText}>Settings</Text>
            <Ionicons name="chevron-forward" size={22} color={COLORS.muted} />
          </PressableScale>
        </FadeInUp>
```

(This inserts immediately before the existing Settings `FadeInUp` block in `ProfileScreen.jsx` — the rest of the file is unchanged.)

- [ ] **Step 4: Write the screen**

```jsx
// components/screens/MyBookingsScreen.jsx
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "../PressableScale";
import Screen from "../Screen";
import { COLORS, RADIUS, FONTS, TYPE, clay } from "../../constants/theme";
import {
  listMyBookings,
  cancelBooking,
  rescheduleBooking,
  submitReview,
  getAvailability,
} from "../../lib/bookings";

function StarPicker({ onSubmit }) {
  const [rating, setRating] = useState(0);
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <PressableScale key={n} onPress={() => setRating(n)}>
          <Ionicons name={n <= rating ? "star" : "star-outline"} size={22} color={COLORS.gold} />
        </PressableScale>
      ))}
      <PressableScale style={styles.smallBtn} onPress={() => rating > 0 && onSubmit(rating)}>
        <Text style={styles.smallBtnText}>Submit</Text>
      </PressableScale>
    </View>
  );
}

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [reviewed, setReviewed] = useState({});
  const [reschedulingId, setReschedulingId] = useState(null);
  const [rescheduleSlots, setRescheduleSlots] = useState([]);

  const load = useCallback(() => {
    listMyBookings().then(setBookings);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onCancel = async (bookingId) => {
    try {
      await cancelBooking(bookingId);
      load();
    } catch (error) {
      Alert.alert("Couldn't cancel", error.message);
    }
  };

  const durationOf = (booking) =>
    Math.round((new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / 60000);

  const onStartReschedule = async (booking) => {
    setReschedulingId(booking.id);
    const slots = await getAvailability(booking.counselor_id, durationOf(booking));
    setRescheduleSlots(slots);
  };

  const onConfirmReschedule = async (booking, slot) => {
    try {
      await rescheduleBooking(booking.id, slot, durationOf(booking));
      setReschedulingId(null);
      load();
    } catch (error) {
      Alert.alert("Couldn't reschedule", error.message);
    }
  };

  const onSubmitReview = async (bookingId, rating) => {
    try {
      await submitReview(bookingId, rating);
      setReviewed((r) => ({ ...r, [bookingId]: true }));
    } catch (error) {
      Alert.alert("Couldn't submit review", error.message);
    }
  };

  const now = Date.now();

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
      </View>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isPast = new Date(item.end_time).getTime() < now;
          const isCancelled = item.status === "cancelled";
          return (
            <View style={styles.card}>
              <Text style={styles.counselorName}>{item.counselors?.name}</Text>
              <Text style={styles.time}>{new Date(item.start_time).toLocaleString()}</Text>
              <Text style={styles.statusText}>
                {isCancelled ? "Cancelled" : isPast ? "Completed" : "Upcoming"}
              </Text>

              {!isCancelled && !isPast && (
                <View style={styles.actionsRow}>
                  <PressableScale style={styles.smallBtn} onPress={() => onCancel(item.id)}>
                    <Text style={styles.smallBtnText}>Cancel</Text>
                  </PressableScale>
                  <PressableScale style={styles.smallBtn} onPress={() => onStartReschedule(item)}>
                    <Text style={styles.smallBtnText}>Reschedule</Text>
                  </PressableScale>
                </View>
              )}

              {reschedulingId === item.id && (
                <View style={styles.row}>
                  {rescheduleSlots.map((slot) => (
                    <PressableScale
                      key={slot}
                      style={styles.slotBtn}
                      onPress={() => onConfirmReschedule(item, slot)}
                    >
                      <Text style={styles.slotText}>{new Date(slot).toLocaleString()}</Text>
                    </PressableScale>
                  ))}
                </View>
              )}

              {!isCancelled && isPast && !reviewed[item.id] && (
                <StarPicker onSubmit={(rating) => onSubmitReview(item.id, rating)} />
              )}
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 10 },
  title: { color: COLORS.white, fontSize: TYPE.h1, fontFamily: FONTS.heading },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16, gap: 6, ...clay("#000", 5) },
  counselorName: { fontSize: TYPE.h2, fontFamily: FONTS.heading, color: COLORS.ink },
  time: { fontSize: TYPE.body, color: COLORS.muted },
  statusText: { fontSize: TYPE.caption, fontWeight: "700", color: COLORS.purple },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  smallBtn: { backgroundColor: COLORS.purple, paddingVertical: 8, paddingHorizontal: 14, borderRadius: RADIUS.md },
  smallBtnText: { color: COLORS.white, fontWeight: "700", fontSize: TYPE.caption },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  slotBtn: { backgroundColor: COLORS.bg, paddingVertical: 8, paddingHorizontal: 10, borderRadius: RADIUS.md },
  slotText: { color: COLORS.ink, fontSize: TYPE.caption, fontWeight: "600" },
  starRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
});
```

```jsx
// app/bookings.jsx
import MyBookingsScreen from "../components/screens/MyBookingsScreen";
export default MyBookingsScreen;
```

Modify `app/_layout.jsx` to add the route:

```jsx
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="challenge" />
      <Stack.Screen name="result" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="counselor/[id]" />
      <Stack.Screen name="bookings" />
    </Stack>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest __tests__/counselor-booking.test.jsx`
Expected: PASS, 8 tests total.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all tests pass, including the existing `"Profile's Settings button navigates to the Settings screen"` test in `navigation.test.jsx` — the new My Bookings button is inserted above it, not replacing it.

- [ ] **Step 7: Commit**

```bash
git add components/screens/MyBookingsScreen.jsx components/screens/ProfileScreen.jsx app/bookings.jsx app/_layout.jsx __tests__/counselor-booking.test.jsx
git commit -m "feat: add My Bookings screen with cancel, reschedule, and review"
```

---

## Definition of done

- `npm test` passes in full, including all pre-existing tests unchanged in behavior.
- A student can browse counselors, book a session (with the one-time contact-info modal enforcing distinct emails), see it in My Bookings, cancel it, reschedule it (duration changeable), and leave a star rating after it's completed.
- Push notification registration never blocks app boot or booking, with or without permission granted.
