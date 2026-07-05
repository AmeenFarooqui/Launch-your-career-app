import { renderRouter, screen } from "expo-router/testing-library";
import { act, fireEvent } from "@testing-library/react-native";

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
