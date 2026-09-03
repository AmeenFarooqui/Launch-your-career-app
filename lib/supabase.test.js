jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({}));

describe("ensureAnonymousSession", () => {
  let getSession;
  let signInAnonymously;
  let createClient;

  beforeEach(() => {
    jest.resetModules();
    getSession = jest.fn();
    signInAnonymously = jest.fn();
    createClient = require("@supabase/supabase-js").createClient;
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
