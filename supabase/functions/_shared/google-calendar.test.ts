import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getAccessToken, GoogleTokenError, freeBusyQuery, createCalendarEvent } from "./google-calendar.ts";

function fakeFetch(status: number, body: unknown) {
  return async () => new Response(JSON.stringify(body), { status });
}

Deno.test("getAccessToken - returns the access token on success", async () => {
  const token = await getAccessToken("refresh-abc", fakeFetch(200, { access_token: "new-token" }));
  assertEquals(token, "new-token");
});

Deno.test("getAccessToken - throws GoogleTokenError on invalid_grant", async () => {
  await assertRejects(
    () => getAccessToken("dead-refresh", fakeFetch(400, { error: "invalid_grant" })),
    GoogleTokenError
  );
});

Deno.test("freeBusyQuery - returns the busy blocks for the requested calendar", async () => {
  const calendarId = "primary";
  const busy = await freeBusyQuery(
    "token",
    calendarId,
    "2026-09-02T00:00:00Z",
    "2026-09-03T00:00:00Z",
    fakeFetch(200, {
      calendars: {
        [calendarId]: { busy: [{ start: "2026-09-02T15:00:00Z", end: "2026-09-02T15:30:00Z" }] },
      },
    })
  );
  assertEquals(busy, [{ start: "2026-09-02T15:00:00Z", end: "2026-09-02T15:30:00Z" }]);
});

Deno.test("freeBusyQuery - falls back to the first calendar entry when Google keys the response differently", async () => {
  const busy = await freeBusyQuery(
    "token",
    "primary",
    "2026-09-02T00:00:00Z",
    "2026-09-03T00:00:00Z",
    fakeFetch(200, {
      calendars: {
        "counselor@example.com": { busy: [{ start: "2026-09-02T16:00:00Z", end: "2026-09-02T16:30:00Z" }] },
      },
    })
  );
  assertEquals(busy, [{ start: "2026-09-02T16:00:00Z", end: "2026-09-02T16:30:00Z" }]);
});

Deno.test("createCalendarEvent - returns the created event including its Meet link", async () => {
  const event = await createCalendarEvent(
    "token",
    "primary",
    { summary: "Session" },
    fakeFetch(200, { id: "evt1", hangoutLink: "https://meet.google.com/abc-defg-hij" })
  );
  assertEquals(event.hangoutLink, "https://meet.google.com/abc-defg-hij");
});

Deno.test("createCalendarEvent - throws when Google rejects the request", async () => {
  await assertRejects(() =>
    createCalendarEvent("token", "primary", {}, fakeFetch(400, { error: "invalid request" }))
  );
});
