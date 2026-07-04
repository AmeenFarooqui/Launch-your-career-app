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
