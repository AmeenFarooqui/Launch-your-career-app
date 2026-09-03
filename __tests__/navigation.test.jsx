jest.mock("../lib/supabase", () => ({
  ensureAnonymousSession: jest.fn().mockResolvedValue({ user: { id: "test-user" } }),
}));

import { renderRouter, screen } from "expo-router/testing-library";
import { act, fireEvent } from "@testing-library/react-native";
import { Alert } from "react-native";

test("app boots by redirecting to the Start Page", async () => {
  renderRouter("./app", { initialUrl: "/" });

  expect(screen).toHavePathname("/start");
  expect(screen.getByText(/LAUNCH/)).toBeTruthy();
});

test("tapping the Rank tab navigates to the Leaderboard screen", async () => {
  renderRouter("./app", { initialUrl: "/(tabs)/home" });

  expect(screen.getByText(/Good (Morning|Afternoon|Evening)/)).toBeTruthy();

  fireEvent.press(screen.getByText("Rank"));

  expect(screen).toHavePathname("/leaderboard");
  expect(screen.getByText("Leaderboard")).toBeTruthy();
});

test("Start Mission navigates from Home to the Challenge screen", async () => {
  renderRouter("./app", { initialUrl: "/(tabs)/home" });

  fireEvent.press(screen.getByText("Start Mission"));

  expect(screen).toHavePathname("/challenge");
  expect(screen.getByText("Challenge #08")).toBeTruthy();
});

test("tapping the correct answer navigates to the Correct result screen", async () => {
  jest.useFakeTimers();
  renderRouter("./app", { initialUrl: "/challenge" });

  fireEvent.press(screen.getByText(/and correct/));
  act(() => {
    jest.advanceTimersByTime(400); // flush the selection-highlight pause
  });

  expect(screen).toHavePathname("/result");
  expect(screen.getByText("You got it!")).toBeTruthy();
  jest.useRealTimers();
});

test("tapping a wrong answer navigates to the Incorrect result screen", async () => {
  jest.useFakeTimers();
  renderRouter("./app", { initialUrl: "/challenge" });

  fireEvent.press(screen.getByText(/but longer/));
  act(() => {
    jest.advanceTimersByTime(400);
  });

  expect(screen).toHavePathname("/result");
  expect(screen.getByText("Not quite!")).toBeTruthy();
  jest.useRealTimers();
});

test("the Login screen's login button navigates into the app", async () => {
  renderRouter("./app", { initialUrl: "/(auth)/login" });

  fireEvent.changeText(
    screen.getByPlaceholderText("rainey@example.com"),
    "alex@example.com"
  );
  fireEvent.changeText(screen.getByPlaceholderText("••••••••"), "hunter22");
  fireEvent.press(screen.getByText("Login"));

  expect(screen).toHavePathname("/home");
});

test("logging in with empty fields shows an error and stays on Login", async () => {
  renderRouter("./app", { initialUrl: "/(auth)/login" });

  fireEvent.press(screen.getByText("Login"));

  expect(screen).toHavePathname("/login");
  expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
});

test("Sign Up validates fields before entering the app", async () => {
  renderRouter("./app", { initialUrl: "/(auth)/signup" });

  fireEvent.press(screen.getByText("Create Account"));
  expect(screen).toHavePathname("/signup");
  expect(screen.getByText("Enter your full name.")).toBeTruthy();

  fireEvent.changeText(
    screen.getByPlaceholderText("Alexandrina Bartholomew"),
    "Alex B."
  );
  fireEvent.changeText(
    screen.getByPlaceholderText("Prospect High School"),
    "Prospect High"
  );
  fireEvent.changeText(
    screen.getByPlaceholderText("you@example.com"),
    "alex@example.com"
  );
  fireEvent.changeText(screen.getByPlaceholderText("••••••••"), "hunter2222");
  fireEvent.press(screen.getByText("Create Account"));

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

test("confirming Delete Account returns to the Start Page", async () => {
  const alertSpy = jest.spyOn(Alert, "alert");
  renderRouter("./app", { initialUrl: "/settings" });

  fireEvent.press(screen.getByText("Delete Account"));

  const buttons = alertSpy.mock.calls[0][2];
  act(() => buttons.find((b) => b.text === "Delete").onPress());

  expect(screen).toHavePathname("/start");
  alertSpy.mockRestore();
});

test("View Full Leaderboard expands the rankings", async () => {
  renderRouter("./app", { initialUrl: "/(tabs)/leaderboard" });

  expect(screen.queryByText("Casey M.")).toBeNull();

  fireEvent.press(screen.getByText("View Full Leaderboard"));

  expect(screen.getByText("Casey M.")).toBeTruthy();
  expect(screen.getByText("Show Top Ranks Only")).toBeTruthy();
});

test("leaderboard filters switch the board data", async () => {
  renderRouter("./app", { initialUrl: "/(tabs)/leaderboard" });

  expect(screen.getByText("Priya N.")).toBeTruthy();

  fireEvent.press(screen.getByText("My School"));

  expect(screen.queryByText("Priya N.")).toBeNull();
  expect(screen.getByText("Elle S.")).toBeTruthy();
});

test("redeeming an affordable store item deducts diamonds", async () => {
  const alertSpy = jest.spyOn(Alert, "alert");
  renderRouter("./app", { initialUrl: "/(tabs)/store" });

  fireEvent.press(screen.getByText("600")); // Coffee Card

  const buttons = alertSpy.mock.calls[0][2];
  act(() => buttons.find((b) => b.text === "Redeem").onPress());

  expect(screen.getByText("260")).toBeTruthy(); // 860 - 600
  alertSpy.mockRestore();
});
