# Launch Your Career — Full App Build Design

## Context

The repo currently contains an Expo SDK 54 React Native app converted (partially) from a Proto.io
HTML prototype. 4 of 10 screens have real, static UI matching the prototype design
(`HomeScreen`, `LoginScreen`, `ChallengeScreen`, `LeaderboardScreen`); the other 6
(`CorrectScreen`, `ProfileScreen`, `SettingsScreen`, `SignUpScreen`, `StartPageScreen`,
`StoreScreen`) are one-line placeholder stubs. There is no navigation library, no state
management, no backend, and no persistence — `App.js` hardcodes `<ChallengeScreen />` as the
entire app.

The product is a Duolingo-style career-readiness app: a daily "mission" challenge question,
a points/streak economy, a leaderboard (filterable by state/city/school), a store to redeem
points, and profile/settings.

**Goal of this build:** make the app fully functional — real navigation, real auth, a real
daily-challenge engine, a real points/streak/leaderboard economy, and a real store — while
keeping the already-built screens' UI unchanged, and designing the 6 missing screens to match
the existing visual language.

## Decisions

- **Backend:** Supabase (Postgres + Auth). Project already created by the user
  ("Launch your career app").
- **Navigation:** Expo Router. Existing screens are moved into a route folder structure as
  thin wrappers — their JSX/styles are not rewritten.
- **Data/state layer:** TanStack Query (React Query) on top of the Supabase JS client.
  Handles loading/error/caching per screen without hand-rolling it for every screen.
- **Question bank:** stored in a Supabase `challenges` table (editable without an app
  release), not bundled JSON.
- **Store:** points/diamonds redemption only — no real-money in-app purchases (avoids
  App Store IAP review/compliance work).
- **Platforms:** iOS + Android via Expo. Web (`expo start --web`) is best-effort only.
- **Scoring integrity:** points/streak updates happen inside a Postgres RPC function, not
  client-side, so a tampered client can't grant free points, and concurrent taps can't
  double-award or corrupt the streak.
- **Login screen style:** `LoginScreen.jsx` currently uses a "neubrutalist" style (thick
  black borders, hard offset shadows, rotated boxes) that doesn't match the soft
  rounded-card style of Home/Challenge/Leaderboard. This build unifies Login (and the new
  SignUp screen) to the main visual style, since no reason was given to keep it separate.

## Navigation Map (Expo Router)

```
app/
  _layout.tsx              # root stack; checks auth session, redirects accordingly
  (auth)/
    start.tsx              # StartPageScreen
    login.tsx              # LoginScreen (restyled to main visual language)
    signup.tsx             # SignUpScreen (new UI)
  (tabs)/
    _layout.tsx             # bottom tab bar: Home / Rank / Store / Profile
    index.tsx               # HomeScreen
    leaderboard.tsx          # LeaderboardScreen
    store.tsx                # StoreScreen (new UI)
    profile.tsx              # ProfileScreen (new UI)
  challenge.tsx             # ChallengeScreen, pushed from Home's "Start Mission"
  result.tsx                # Correct/Incorrect screen, pushed after an answer is submitted
  settings.tsx              # SettingsScreen (new UI), pushed from Profile
```

Existing component files under `app/screens/*.jsx` become the implementation the route
files render; the route files themselves only handle params/navigation glue.

## Data Model (Supabase)

- **profiles**: `id` (FK to `auth.users`), `display_name`, `school`, `city`, `state`,
  `avatar_url`, `points`, `diamonds`, `streak_count`, `streak_last_completed_date`,
  `notifications_enabled`, `leaderboard_visible`, `created_at`.
- **challenges**: `id`, `question`, `choices` (jsonb array), `correct_choice_index`,
  `points_value`, `active_date`, `created_at`.
- **challenge_attempts**: `id`, `user_id`, `challenge_id`, `chosen_index`, `is_correct`,
  `points_awarded`, `completed_at`. Unique constraint on `(user_id, challenge_id)` — a
  challenge can only be attempted once per user, which is what makes "already completed
  today's mission" detectable.
- **store_items**: `id`, `name`, `description`, `cost_points`, `cost_diamonds`,
  `image_url`, `active`.
- **redemptions**: `id`, `user_id`, `store_item_id`, `redeemed_at`, `status`.
- **Leaderboard** is a query/view over `profiles` ordered by `points`, filtered by the
  viewer's own `state`/`city`/`school` — not a separate table. Matches the existing
  "My State / My City / My School" filter buttons already built into `LeaderboardScreen.jsx`.

RLS: users can read/write only their own `profiles`/`challenge_attempts`/`redemptions`
rows. `challenges` and `store_items` are public-read, admin-write. Leaderboard reads
expose only the columns needed for display (name, school/city/state, points, streak) —
not the full `profiles` row.

## Core Flows

1. **Auth** — StartPage → Login/SignUp (Supabase email/password auth) → on success,
   root layout redirects into `(tabs)`. Session persists via Supabase's AsyncStorage
   adapter, so relaunching the app skips StartPage/Login when already signed in.
2. **Daily mission** — Home fetches today's active challenge (or the next one the user
   hasn't attempted) via React Query. "Start Mission" pushes `challenge.tsx` with that
   challenge's id. Selecting an answer calls a Postgres RPC
   (`submit_challenge_attempt`) that: checks for an existing attempt (idempotent —
   no double-submit), inserts the attempt, and atomically updates
   `profiles.points`/`streak_count`/`streak_last_completed_date`. The screen then
   navigates to `result.tsx` with the correct/incorrect outcome.
3. **Streak logic** (inside the RPC, not the client) — if `streak_last_completed_date`
   is yesterday, increment; if it's today, no-op (already played); otherwise reset to 1.
4. **Leaderboard** — React Query fetches ranked profiles scoped by the signed-in user's
   own state/city/school by default, switching scope via the existing filter buttons.
   Refetches on screen focus.
5. **Store** — fetch `store_items`; redeeming calls an RPC that checks-and-deducts
   points/diamonds in one atomic operation (prevents negative balances from double-taps
   or race conditions) and inserts a `redemptions` row.
6. **Profile/Settings** — read/update the signed-in user's own `profiles` row;
   logout calls `supabase.auth.signOut()`.

## Error Handling

- Network/auth/RPC errors surface through React Query's error state into one shared
  banner/toast component, rather than ad hoc `Alert.alert` calls scattered per screen.
- All score/currency mutations happen in Postgres RPC functions specifically so that
  validation (already-attempted, insufficient balance) lives in one place instead of
  being re-checked (or forgotten) in every screen that touches points.

## Missing Screens — UI Direction

Visual language to match: bold purple `#8A00E6` / `#7B4DFF`, green `#52F04A` /
`#119600`, gold `#FFD93D`, pink `#C70F52` / `#D90429`; large rounded cards (20-30px
radius); 900-weight display numbers; emoji icons (🔥 streak, 💎 diamonds, 🏆 rank).

- **StartPage**: logo, short value-prop copy, "Log In" / "Sign Up" CTAs.
- **SignUp**: same field layout as Login (name, school, email, password), restyled to
  the main visual language.
- **Result screen** (replaces `CorrectScreen`, adds the missing "incorrect" state):
  single screen taking an `isCorrect` param — ✅/❌, points earned (0 if incorrect),
  updated streak, "Continue" button back to Home.
- **Profile**: avatar, name/school, points/diamonds/streak stats, badges/achievements
  grid, gear icon → Settings, logout.
- **Settings**: account info, daily-reminder notification toggle, leaderboard-visibility
  toggle, logout / delete account.
- **Store**: points/diamonds balance header, grid of redeemable items priced in 💎
  (matching the currency already shown on Leaderboard), tap → confirm modal → redeem.

## Testing

Per-flow smoke tests only (Jest + React Native Testing Library), not full coverage:
one test each for login, submitting a challenge answer (correct + already-attempted),
and redeeming a store item (enough balance + insufficient balance). These are the
flows where a silent bug means a user losing progress or points.

## Build Order

0. Supabase schema + RLS policies + auth config (project already created).
1. Expo Router migration — move the 4 existing screens into the route structure above,
   wire up tab/stack navigation. No visual/behavioral change.
2. Auth wired to Supabase — Login/SignUp functional, StartPage, session persistence,
   Login/SignUp restyled to match main visual language.
3. Build the 6 missing screens (including the new Result/incorrect state) per the UI
   direction above.
4. Daily mission engine — `challenges` table, fetch-today's-mission, submit RPC,
   points/streak logic.
5. Leaderboard wired to real data + state/city/school filters.
6. Store wired to real data + redemption RPC.
7. Settings made functional (toggles, logout, account) + error/loading polish +
   the smoke tests listed above.
