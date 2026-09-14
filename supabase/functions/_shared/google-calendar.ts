const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export class GoogleTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleTokenError";
  }
}

export async function getAccessToken(
  refreshToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const response = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    if (data.error === "invalid_grant") {
      throw new GoogleTokenError("invalid_grant");
    }
    throw new Error(`Google token refresh failed: ${data.error}`);
  }
  return data.access_token;
}

export async function freeBusyQuery(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
  fetchImpl: typeof fetch = fetch
): Promise<Array<{ start: string; end: string }>> {
  const response = await fetchImpl(`${CALENDAR_API}/freeBusy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin, timeMax, items: [{ id: calendarId }] }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`freeBusy query failed: ${JSON.stringify(data)}`);
  }
  return data.calendars[calendarId].busy;
}

export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch
) {
  const response = await fetchImpl(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Calendar event creation failed: ${JSON.stringify(data)}`);
  }
  return data;
}

export async function patchCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  patch: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch
) {
  const response = await fetchImpl(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?sendUpdates=all`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Calendar event update failed: ${JSON.stringify(data)}`);
  }
  return data;
}

export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const response = await fetchImpl(
    `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}?sendUpdates=all`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok && response.status !== 410) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Calendar event deletion failed: ${JSON.stringify(data)}`);
  }
}
