# Expo Router Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `<ChallengeScreen />` root in `App.js` with real Expo Router navigation across all 10 screens, with zero visual change to the 4 already-built screens (Home, Login, Challenge, Leaderboard).

**Architecture:** Move the existing screen components (unchanged) into `components/screens/`, and add a thin `app/` route tree (Expo Router file-based routing) that renders them: an `(auth)` stack group (Start/Login/SignUp), a `(tabs)` group with a shared bottom tab bar (Home/Leaderboard/Store/Profile), and top-level stack screens for Challenge/Result/Settings. Real Supabase auth, real challenge data, and the final designs for the 6 stub screens are out of scope for this plan (later plans in the build order).

**Tech Stack:** Expo SDK 54, expo-router, React Navigation (via expo-router), Jest (`jest-expo` preset) + `@testing-library/react-native` + `expo-router/testing-library` for navigation tests.

## Global Constraints

- Backend is Supabase (Postgres + Auth) — not used in this plan, but no other backend/service may be introduced.
- Navigation is Expo Router — do not add React Navigation directly or any other nav library.
- The 4 already-built screens' visual output (colors, layout, copy) must not change in this plan. Only `onPress` handlers and file locations change.
- No real authentication, no real challenge data, and no final UI for the 6 stub screens in this plan — those are later plans.

---

## File Structure

```
components/
  BottomTabBar.jsx          # NEW - shared tab bar, extracted from HomeScreen's inline nav
  screens/
    ChallengeScreen.jsx     # MOVED from app/screens/, answers wired to navigate
    CorrectScreen.jsx       # MOVED, Continue button added
    HomeScreen.jsx          # MOVED, inline bottom nav removed, Start Mission wired
    IncorrectScreen.jsx     # NEW - minimal incorrect-answer screen
    LeaderboardScreen.jsx   # MOVED, unchanged
    LoginScreen.jsx         # MOVED, login button + signup link wired
    ProfileScreen.jsx       # MOVED, Settings button added
    SettingsScreen.jsx      # MOVED, Log Out button added
    SignUpScreen.jsx        # MOVED, Continue button added
    StartPageScreen.jsx     # MOVED, Log In / Sign Up buttons added
app/
  _layout.jsx                # NEW - root Stack
  index.jsx                  # NEW - redirects to /(auth)/start
  (auth)/
    _layout.jsx               # NEW - auth Stack, headers hidden
    start.jsx                 # NEW - thin wrapper
    login.jsx                 # NEW - thin wrapper
    signup.jsx                 # NEW - thin wrapper
  (tabs)/
    _layout.jsx               # NEW - Tabs navigator using BottomTabBar
    home.jsx                  # NEW - thin wrapper (Home)
    leaderboard.jsx           # NEW - thin wrapper
    store.jsx                 # NEW - thin wrapper
    profile.jsx               # NEW - thin wrapper
  challenge.jsx               # NEW - thin wrapper
  result.jsx                  # NEW - picks Correct/Incorrect by `correct` param
  settings.jsx                # NEW - thin wrapper
App.js                        # DELETED - replaced by expo-router/entry
__tests__/
  navigation.test.jsx          # NEW - renderRouter-based navigation smoke tests
package.json                  # MODIFIED - main entry, new deps, jest config
app.json                      # MODIFIED - scheme, expo-router plugin
```

---

### Task 1: Install Expo Router, restructure screens, boot to Start Page

**Files:**
- Modify: `package.json`
- Modify: `app.json`
- Create: `app/_layout.jsx`
- Create: `app/index.jsx`
- Create: `app/(auth)/_layout.jsx`
- Create: `app/(auth)/start.jsx`
- Create: `app/(auth)/login.jsx`
- Create: `app/(auth)/signup.jsx`
- Move: `app/screens/*.jsx` → `components/screens/*.jsx` (all 10 files, unchanged content in this task)
- Delete: `App.js`
- Test: `__tests__/navigation.test.jsx`

**Interfaces:**
- Produces: `components/screens/StartPageScreen.jsx` (default export, unchanged signature `function StartPageScreen()`), root `Stack` in `app/_layout.jsx`, `(auth)` route group.

- [ ] **Step 1: Install dependencies**

Run:
```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants
npm install --save-dev jest-expo @testing-library/react-native react-test-renderer
```

- [ ] **Step 2: Update `package.json`**

Change the `"main"` field and add a `"test"` script + `"jest"` config:

```json
{
  "name": "launch-your-career-app",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest"
  },
  "jest": {
    "preset": "jest-expo"
  }
}
```

(Keep the existing `dependencies`/`devDependencies` blocks — `expo install` and `npm install --save-dev` above already updated them; just change `main`, add `scripts.test`, and add the `jest` key.)

- [ ] **Step 3: Update `app.json`**

Add `"scheme"` and the `expo-router` plugin:

```json
{
  "expo": {
    "name": "Launch Your Career",
    "slug": "launch-your-career-app",
    "version": "1.0.0",
    "scheme": "launchyourcareer",
    "orientation": "portrait",
    "icon": "./src/images/player/appicon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./src/images/player/appicon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./src/images/player/appicon.png",
        "backgroundColor": "#ffffff"
      }
    },
    "web": {
      "favicon": "./src/images/player/appicon.png"
    },
    "plugins": [
      "expo-asset",
      "expo-font",
      "expo-router"
    ]
  }
}
```

- [ ] **Step 4: Move screen components (unchanged) into `components/screens/`**

Run:
```bash
mkdir -p components/screens
git mv app/screens/ChallengeScreen.jsx components/screens/ChallengeScreen.jsx
git mv app/screens/CorrectScreen.jsx components/screens/CorrectScreen.jsx
git mv app/screens/HomeScreen.jsx components/screens/HomeScreen.jsx
git mv app/screens/LeaderboardScreen.jsx components/screens/LeaderboardScreen.jsx
git mv app/screens/LoginScreen.jsx components/screens/LoginScreen.jsx
git mv app/screens/ProfileScreen.jsx components/screens/ProfileScreen.jsx
git mv app/screens/SettingsScreen.jsx components/screens/SettingsScreen.jsx
git mv app/screens/SignUpScreen.jsx components/screens/SignUpScreen.jsx
git mv app/screens/StartPageScreen.jsx components/screens/StartPageScreen.jsx
git mv app/screens/StoreScreen.jsx components/screens/StoreScreen.jsx
git rm App.js
```

`LoginScreen.jsx`'s relative image import (`../../screens/Login/back.png`) does not need to change: `components/screens/` is the same directory depth from the project root as `app/screens/` was.

- [ ] **Step 5: Write the failing test**

```jsx
// __tests__/navigation.test.jsx
import { renderRouter, screen } from "expo-router/testing-library";

test("app boots by redirecting to the Start Page", async () => {
  renderRouter("./app", { initialUrl: "/" });

  expect(screen).toHavePathname("/start");
  expect(screen.getByText("Start Page Screen")).toBeTruthy();
});
```

**Note on paths:** Expo Router strips `(group)` segments from the *resolved* pathname — `app/(auth)/start.jsx` is reachable via the href `/(auth)/start`, but `usePathname()`/`toHavePathname()` reports it as `/start`. Throughout this plan, group prefixes appear in `router.push`/`href`/`initialUrl` values (valid as input) but never in `toHavePathname` assertions.

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- navigation.test.jsx`
Expected: FAIL — no route matches `/` (no `app/index.jsx`, `app/_layout.jsx`, or `app/(auth)/*` files exist yet).

- [ ] **Step 7: Create the root layout, redirect, and auth stack**

```jsx
// app/_layout.jsx
import React from "react";
import { Stack } from "expo-router";

export default function RootLayout() {
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

```jsx
// app/index.jsx
import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/(auth)/start" />;
}
```

```jsx
// app/(auth)/_layout.jsx
import React from "react";
import { Stack } from "expo-router";

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

```jsx
// app/(auth)/start.jsx
import StartPageScreen from "../../components/screens/StartPageScreen";

export default StartPageScreen;
```

```jsx
// app/(auth)/login.jsx
import LoginScreen from "../../components/screens/LoginScreen";

export default LoginScreen;
```

```jsx
// app/(auth)/signup.jsx
import SignUpScreen from "../../components/screens/SignUpScreen";

export default SignUpScreen;
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- navigation.test.jsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: install expo-router, move screens to components/, boot to Start Page"
```

---

### Task 2: Tab navigation with a shared bottom tab bar

**Files:**
- Create: `components/BottomTabBar.jsx`
- Create: `app/(tabs)/_layout.jsx`
- Create: `app/(tabs)/home.jsx`
- Create: `app/(tabs)/leaderboard.jsx`
- Create: `app/(tabs)/store.jsx`
- Create: `app/(tabs)/profile.jsx`
- Modify: `components/screens/HomeScreen.jsx` (remove inline bottom nav — it's now rendered once by the Tabs navigator instead of being hardcoded inside Home)
- Test: `__tests__/navigation.test.jsx`

**Interfaces:**
- Consumes: `components/screens/{Home,Leaderboard,Store,Profile}Screen.jsx` from Task 1 (unchanged default export signatures).
- Produces: `components/BottomTabBar.jsx` — default export `function BottomTabBar({ state, navigation })`, used as the `tabBar` prop for `(tabs)/_layout.jsx`'s `Tabs`.

- [ ] **Step 1: Write the failing test**

```jsx
// __tests__/navigation.test.jsx (add to the existing file)
import { fireEvent } from "@testing-library/react-native";

test("tapping the Rank tab navigates to the Leaderboard screen", async () => {
  renderRouter("./app", { initialUrl: "/(tabs)/home" });

  expect(screen.getByText("Good Morning")).toBeTruthy();

  fireEvent.press(screen.getByText("Rank"));

  expect(screen).toHavePathname("/leaderboard");
  expect(screen.getByText("Leaderboard")).toBeTruthy();
});
```

The Home tab route is `home.jsx`, not `index.jsx` — a `(tabs)/index.jsx` would resolve to `/` and collide with the root `app/index.jsx` redirect.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- navigation.test.jsx`
Expected: FAIL — no route matches `/(tabs)/home` yet.

- [ ] **Step 3: Extract the bottom tab bar out of `HomeScreen.jsx`**

Create `components/BottomTabBar.jsx` with the exact styles currently hardcoded in `HomeScreen.jsx`'s `bottomNav`/`activeTab`/`navTab`/`navIcon`/`activeLabel`/`navLabel`:

```jsx
// components/BottomTabBar.jsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

const PURPLE = "#8A00E6";

const TABS = [
  { name: "home", icon: "🏠", label: "Home" },
  { name: "leaderboard", icon: "🏆", label: "Rank" },
  { name: "store", icon: "🛍️", label: "Store" },
  { name: "profile", icon: "👤", label: "Profile" },
];

export default function BottomTabBar({ state, navigation }) {
  return (
    <View style={styles.bottomNav}>
      {TABS.map((tab, i) => {
        const isActive = state.index === i;
        return (
          <TouchableOpacity
            key={tab.name}
            style={isActive ? styles.activeTab : styles.navTab}
            onPress={() => navigation.navigate(tab.name)}
          >
            <Text style={styles.navIcon}>{tab.icon}</Text>
            <Text style={isActive ? styles.activeLabel : styles.navLabel}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: "row",
    height: 75,
    backgroundColor: "#EAEAEA",
  },
  activeTab: {
    flex: 1,
    backgroundColor: PURPLE,
    justifyContent: "center",
    alignItems: "center",
  },
  navTab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  navIcon: {
    fontSize: 22,
  },
  activeLabel: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  navLabel: {
    color: "#666",
    fontWeight: "bold",
    fontSize: 16,
  },
});
```

- [ ] **Step 4: Remove the inline bottom nav from `HomeScreen.jsx`**

Delete the `{/* BOTTOM NAV */}` `<View style={styles.bottomNav}>...</View>` block (the last child of the outer `<SafeAreaView>`, right after the ranking card), and delete the now-unused `bottomNav`, `activeTab`, `navTab`, `navIcon`, `activeLabel`, `navLabel` entries from `HomeScreen.jsx`'s `styles`. Everything else in the file (header, mission card, ranking card, and their styles) stays exactly as-is.

- [ ] **Step 5: Create the tabs layout and route wrappers**

```jsx
// app/(tabs)/_layout.jsx
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
      <Tabs.Screen name="store" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
```

```jsx
// app/(tabs)/home.jsx
import HomeScreen from "../../components/screens/HomeScreen";

export default HomeScreen;
```

```jsx
// app/(tabs)/leaderboard.jsx
import LeaderboardScreen from "../../components/screens/LeaderboardScreen";

export default LeaderboardScreen;
```

```jsx
// app/(tabs)/store.jsx
import StoreScreen from "../../components/screens/StoreScreen";

export default StoreScreen;
```

```jsx
// app/(tabs)/profile.jsx
import ProfileScreen from "../../components/screens/ProfileScreen";

export default ProfileScreen;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- navigation.test.jsx`
Expected: PASS (both the Task 1 test and this one)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add tab navigation with shared bottom tab bar"
```

---

### Task 3: Wire the daily mission flow (Home → Challenge → Result)

**Files:**
- Modify: `components/screens/HomeScreen.jsx` (wire "Start Mission")
- Modify: `components/screens/ChallengeScreen.jsx` (wire each answer)
- Modify: `components/screens/CorrectScreen.jsx` (add Continue button)
- Create: `components/screens/IncorrectScreen.jsx`
- Create: `app/challenge.jsx`
- Create: `app/result.jsx`
- Test: `__tests__/navigation.test.jsx`

**Interfaces:**
- Produces: `components/screens/IncorrectScreen.jsx` — default export `function IncorrectScreen()`.
- `app/result.jsx` reads a `correct` route param (`"1"` or `"0"`) via `useLocalSearchParams()`.

- [ ] **Step 1: Write the failing tests**

```jsx
// __tests__/navigation.test.jsx (add to the existing file)

test("Start Mission navigates from Home to the Challenge screen", async () => {
  renderRouter("./app", { initialUrl: "/(tabs)/home" });

  fireEvent.press(screen.getByText("Start Mission"));

  expect(screen).toHavePathname("/challenge");
  expect(screen.getByText("Challenge #08")).toBeTruthy();
});

test("tapping the correct answer navigates to the Correct result screen", async () => {
  renderRouter("./app", { initialUrl: "/challenge" });

  fireEvent.press(screen.getByText(/and correct/));

  expect(screen).toHavePathname("/result");
  expect(screen.getByText("Correct Screen")).toBeTruthy();
});

test("tapping a wrong answer navigates to the Incorrect result screen", async () => {
  renderRouter("./app", { initialUrl: "/challenge" });

  fireEvent.press(screen.getByText(/but longer/));

  expect(screen).toHavePathname("/result");
  expect(screen.getByText("Incorrect")).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- navigation.test.jsx`
Expected: FAIL — no route matches `/challenge` or `/result` yet, and the answers have no `onPress`.

- [ ] **Step 3: Wire Home's "Start Mission" button**

In `components/screens/HomeScreen.jsx`, add the import and the `onPress`:

```jsx
import { router } from "expo-router";
```

```jsx
<TouchableOpacity
  style={styles.startButton}
  onPress={() => router.push("/challenge")}
>
  <Text style={styles.startText}>Start Mission</Text>
  <Text style={styles.buttonFire}>🔥</Text>
</TouchableOpacity>
```

- [ ] **Step 4: Wire each answer in `ChallengeScreen.jsx`**

Add the import, an `isCorrect` prop on `Answer`, and mark the one whose copy says "and correct" as the correct answer:

```jsx
import { router } from "expo-router";
```

```jsx
<Answer top={340} roundedTop text="Blah blah bleh blah\nblah blah bleh blah." />
<Answer top={442} text="Blah blah bleh blah\nblah blah bleh blah but longer." />
<Answer top={545} text="Blah blah bleh blah\nblah blah bleh blah and correct." isCorrect />
<Answer top={648} roundedBottom text="Blah blah bleh blah\nblah blah bleh blah." />
```

```jsx
function Answer({ top, text, roundedTop, roundedBottom, isCorrect }) {
  return (
    <>
      <TouchableOpacity
        style={[
          styles.answerBox,
          { top },
          roundedTop && styles.roundedTop,
          roundedBottom && styles.roundedBottom,
        ]}
        onPress={() =>
          router.push({
            pathname: "/result",
            params: { correct: isCorrect ? "1" : "0" },
          })
        }
      >
        <Text style={styles.answerText}>{text}</Text>
      </TouchableOpacity>

      <View style={[styles.circle, { top: top + 36 }]} />
    </>
  );
}
```

- [ ] **Step 5: Add a Continue button to `CorrectScreen.jsx`**

```jsx
// components/screens/CorrectScreen.jsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function CorrectScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Correct Screen</Text>
      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => router.replace("/(tabs)/home")}
      >
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontSize: 24,
  },
  continueButton: {
    marginTop: 24,
    backgroundColor: "#8A00E6",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  continueText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
```

- [ ] **Step 6: Create `IncorrectScreen.jsx`**

```jsx
// components/screens/IncorrectScreen.jsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function IncorrectScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Incorrect</Text>
      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => router.replace("/(tabs)/home")}
      >
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontSize: 24,
  },
  continueButton: {
    marginTop: 24,
    backgroundColor: "#8A00E6",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  continueText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
```

- [ ] **Step 7: Create the `challenge` and `result` routes**

```jsx
// app/challenge.jsx
import ChallengeScreen from "../components/screens/ChallengeScreen";

export default ChallengeScreen;
```

```jsx
// app/result.jsx
import React from "react";
import { useLocalSearchParams } from "expo-router";
import CorrectScreen from "../components/screens/CorrectScreen";
import IncorrectScreen from "../components/screens/IncorrectScreen";

export default function Result() {
  const { correct } = useLocalSearchParams();
  return correct === "1" ? <CorrectScreen /> : <IncorrectScreen />;
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- navigation.test.jsx`
Expected: PASS (all tests so far)

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: wire the daily mission flow (Home -> Challenge -> Result)"
```

---

### Task 4: Wire remaining navigation (auth screens, Profile → Settings)

**Files:**
- Modify: `components/screens/LoginScreen.jsx` (login button + "make one here" link)
- Modify: `components/screens/SignUpScreen.jsx` (Continue button)
- Modify: `components/screens/StartPageScreen.jsx` (Log In / Sign Up buttons)
- Modify: `components/screens/ProfileScreen.jsx` (Settings button)
- Modify: `components/screens/SettingsScreen.jsx` (Log Out button)
- Create: `app/settings.jsx`
- Test: `__tests__/navigation.test.jsx`

**Interfaces:**
- None new — this task only wires existing screens to routes already created in Tasks 1-3, plus the new `app/settings.jsx`.

- [ ] **Step 1: Write the failing tests**

```jsx
// __tests__/navigation.test.jsx (add to the existing file)

test("the Login screen's login button navigates into the app", async () => {
  renderRouter("./app", { initialUrl: "/(auth)/login" });

  fireEvent.press(screen.getByText("Login"));

  expect(screen).toHavePathname("/home");
});

test("the Login screen's signup link navigates to Sign Up", async () => {
  renderRouter("./app", { initialUrl: "/(auth)/login" });

  fireEvent.press(screen.getByText("make one here"));

  expect(screen).toHavePathname("/signup");
});

test("Profile's Settings button navigates to the Settings screen", async () => {
  renderRouter("./app", { initialUrl: "/(tabs)/profile" });

  fireEvent.press(screen.getByText("Settings"));

  expect(screen).toHavePathname("/settings");
});

test("Settings' Log Out button navigates back to the Start Page", async () => {
  renderRouter("./app", { initialUrl: "/settings" });

  fireEvent.press(screen.getByText("Log Out"));

  expect(screen).toHavePathname("/start");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- navigation.test.jsx`
Expected: FAIL — none of these buttons have `onPress` yet, and `/settings` has no route.

- [ ] **Step 3: Wire `LoginScreen.jsx`**

Add the import, and `onPress` on the login button and the "make one here" link:

```jsx
import { router } from "expo-router";
```

```jsx
<TouchableOpacity
  style={styles.loginButton}
  onPress={() => router.replace("/(tabs)/home")}
>
  <Text style={styles.loginButtonText}>Login</Text>
</TouchableOpacity>
```

```jsx
<TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
  <Text style={styles.linkText}>make one here</Text>
</TouchableOpacity>
```

- [ ] **Step 4: Wire `SignUpScreen.jsx`**

```jsx
// components/screens/SignUpScreen.jsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function SignUpScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Sign Up Screen</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace("/(tabs)/home")}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontSize: 24,
  },
  button: {
    marginTop: 24,
    backgroundColor: "#8A00E6",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
```

- [ ] **Step 5: Wire `StartPageScreen.jsx`**

```jsx
// components/screens/StartPageScreen.jsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function StartPageScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Start Page Screen</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/(auth)/login")}
      >
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/(auth)/signup")}
      >
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontSize: 24,
  },
  button: {
    marginTop: 24,
    backgroundColor: "#8A00E6",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
```

- [ ] **Step 6: Wire `ProfileScreen.jsx`**

```jsx
// components/screens/ProfileScreen.jsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function ProfileScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Profile Screen</Text>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => router.push("/settings")}
      >
        <Text style={styles.settingsText}>Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontSize: 24,
  },
  settingsButton: {
    marginTop: 24,
    backgroundColor: "#8A00E6",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  settingsText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
```

- [ ] **Step 7: Wire `SettingsScreen.jsx`**

```jsx
// components/screens/SettingsScreen.jsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function SettingsScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>Settings Screen</Text>
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => router.replace("/(auth)/start")}
      >
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontSize: 24,
  },
  logoutButton: {
    marginTop: 24,
    backgroundColor: "#D90429",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
```

- [ ] **Step 8: Create the `settings` route**

```jsx
// app/settings.jsx
import SettingsScreen from "../components/screens/SettingsScreen";

export default SettingsScreen;
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npm test -- navigation.test.jsx`
Expected: PASS (all tests in the file)

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: wire remaining navigation (auth screens, Profile -> Settings)"
```

---

### Task 5: Manual verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: All tests in `__tests__/navigation.test.jsx` PASS.

- [ ] **Step 2: Run the app and click through every screen**

Run: `npx expo start`

Manually walk through, confirming no visual change from before this plan on the 4 already-built screens:
- Start Page → Log In → Home (tab bar visible: Home/Rank/Store/Profile, Home tab highlighted purple)
- Home: header, mission card, ranking card look identical to before; tap Rank/Store/Profile tabs and confirm each renders and highlights correctly
- Home → Start Mission → Challenge screen (pixel layout unchanged) → tap the 3rd answer ("...and correct.") → Correct Screen → Continue → back on Home tab
- Home → Start Mission → tap any other answer → Incorrect Screen → Continue → back on Home tab
- Profile → Settings → Log Out → back on Start Page
- Start Page → Sign Up → Continue → Home

- [ ] **Step 3: Confirm no leftover references to the old `app/screens/` path**

Run: `grep -rn "app/screens" --include="*.jsx" --include="*.js" .`
Expected: no output (empty).

- [ ] **Step 4: Commit any final fixups**

```bash
git add -A
git commit -m "chore: verify expo-router migration end to end"
```

(Skip this commit if Step 2/3 found nothing to fix.)

---

## Next Plan

Once this is merged, the next plan in the build order (per the design spec) is **Supabase setup + real auth**, wiring `LoginScreen`/`SignUpScreen`/`StartPageScreen` to real Supabase Auth instead of the placeholder `router.replace` calls added here, and restyling Login/SignUp to the main visual language.
