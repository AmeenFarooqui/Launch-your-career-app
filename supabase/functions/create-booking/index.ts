// supabase/functions/create-booking/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, createCalendarEvent, deleteCalendarEvent } from "../_shared/google-calendar.ts";
import { isDurationOfferedByCounselor, isFarEnoughInAdvance } from "../_shared/booking-rules.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
  }
  const studentId = userData.user.id;

  const { counselor_id, start_time, duration_minutes } = await req.json();
  if (!counselor_id || !start_time || !duration_minutes) {
    return new Response(
      JSON.stringify({ error: "counselor_id, start_time, and duration_minutes are required" }),
      { status: 400 }
    );
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("email, guardian_email, push_token")
    .eq("id", studentId)
    .single();
  if (profileError || !profile?.email || !profile?.guardian_email) {
    return new Response(
      JSON.stringify({ error: "Add your email and a guardian email before booking" }),
      { status: 400 }
    );
  }

  const { data: counselor, error: counselorError } = await adminClient
    .from("counselors")
    .select("allowed_durations, approved, calendar_connected")
    .eq("id", counselor_id)
    .single();
  if (counselorError || !counselor || !counselor.approved || !counselor.calendar_connected) {
    return new Response(JSON.stringify({ error: "Counselor is not bookable" }), { status: 404 });
  }
  if (!isDurationOfferedByCounselor(duration_minutes, counselor.allowed_durations)) {
    return new Response(
      JSON.stringify({ error: "This counselor does not offer that duration" }),
      { status: 400 }
    );
  }
  if (!isFarEnoughInAdvance(start_time)) {
    return new Response(
      JSON.stringify({ error: "Sessions must be booked at least 2 hours in advance" }),
      { status: 400 }
    );
  }

  const { data: tokenRow, error: tokenRowError } = await adminClient
    .from("counselor_tokens")
    .select("refresh_token")
    .eq("counselor_id", counselor_id)
    .single();
  if (tokenRowError || !tokenRow) {
    return new Response(JSON.stringify({ error: "Counselor is not bookable" }), { status: 404 });
  }

  const accessToken = await getAccessToken(tokenRow.refresh_token);
  const endTime = new Date(new Date(start_time).getTime() + duration_minutes * 60 * 1000).toISOString();

  const event = await createCalendarEvent(accessToken, "primary", {
    summary: "Career counseling session",
    start: { dateTime: start_time },
    end: { dateTime: endTime },
    attendees: [{ email: profile.email }, { email: profile.guardian_email, optional: true }],
    conferenceData: { createRequest: { requestId: crypto.randomUUID() } },
  });
  const meetLink = event.hangoutLink ?? event.conferenceData?.entryPoints?.[0]?.uri;

  const { data: booking, error: bookingError } = await adminClient
    .from("bookings")
    .insert({
      student_id: studentId,
      counselor_id,
      start_time,
      end_time: endTime,
      meet_link: meetLink,
      google_event_id: event.id,
      status: "confirmed",
    })
    .select()
    .single();

  if (bookingError) {
    // Lost a race to a concurrent booking on an overlapping slot — undo the
    // calendar event so the counselor's calendar doesn't show a phantom session.
    await deleteCalendarEvent(accessToken, "primary", event.id).catch(() => {});
    return new Response(JSON.stringify({ error: "Slot no longer available" }), { status: 409 });
  }

  if (profile.push_token) {
    fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: profile.push_token,
        title: "Session booked",
        body: `Your session is confirmed for ${new Date(start_time).toLocaleString()}`,
      }),
    }).catch(() => {});
  }

  return new Response(JSON.stringify({ booking }), { status: 200 });
});
