import { renderRouter, screen } from "expo-router/testing-library";

test("app boots by redirecting to the Start Page", async () => {
  renderRouter("./app", { initialUrl: "/" });

  expect(screen).toHavePathname("/start");
  expect(screen.getByText("Start Page Screen")).toBeTruthy();
});
