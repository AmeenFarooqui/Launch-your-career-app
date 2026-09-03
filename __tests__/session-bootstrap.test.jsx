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
