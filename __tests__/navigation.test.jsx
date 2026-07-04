import { renderRouter, screen } from "expo-router/testing-library";
import { fireEvent } from "@testing-library/react-native";

test("app boots by redirecting to the Start Page", async () => {
  renderRouter("./app", { initialUrl: "/" });

  expect(screen).toHavePathname("/start");
  expect(screen.getByText("Start Page Screen")).toBeTruthy();
});

test("tapping the Rank tab navigates to the Leaderboard screen", async () => {
  renderRouter("./app", { initialUrl: "/(tabs)/home" });

  expect(screen.getByText("Good Morning")).toBeTruthy();

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
