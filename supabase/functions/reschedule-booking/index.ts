// supabase/functions/reschedule-booking/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, patchCalendarEvent } from "../_shared/google-calendar.ts";
import {
  isDurationOfferedByCounselor,
  isFarEnoughInAdvance,
  canCancelOrReschedule,
} from "../_shared/booking-rules.ts";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: corsHeaders });
  }
  const studentId = userData.user.id;

  const { booking_id, new_start_time, new_duration_minutes } = await req.json();
  if (!booking_id || !new_start_time || !new_duration_minutes) {
    return new Response(
      JSON.stringify({ error: "booking_id, new_start_time, and new_duration_minutes are required" }),
      { status: 400, headers: corsHeaders }
    );
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: booking, error: bookingError } = await adminClient
    .from("bookings")
    .select("student_id, counselor_id, start_time, status, google_event_id")
    .eq("id", booking_id)
    .single();
  if (bookingError || !booking || booking.student_id !== studentId) {
    return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404, headers: corsHeaders });
  }
  if (booking.status !== "confirmed") {
    return new Response(JSON.stringify({ error: "Booking is cancelled" }), { status: 400, headers: corsHeaders });
  }
  if (!canCancelOrReschedule(booking.start_time)) {
    return new Response(
      JSON.stringify({ error: "Too late to reschedule — must be more than 1 hour before the current start time" }),
      { status: 400, headers: corsHeaders }
    );
  }
  if (!isFarEnoughInAdvance(new_start_time)) {
    return new Response(JSON.stringify({ error: "New time must be at least 2 hours from now" }), { status: 400, headers: corsHeaders });
  }

  const { data: counselor, error: counselorError } = await adminClient
    .from("counselors")
    .select("allowed_durations")
    .eq("id", booking.counselor_id)
    .single();
  if (counselorError || !isDurationOfferedByCounselor(new_duration_minutes, counselor.allowed_durations)) {
    return new Response(
      JSON.stringify({ error: "This counselor does not offer that duration" }),
      { status: 400, headers: corsHeaders }
    );
  }

  const newEndTime = new Date(
    new Date(new_start_time).getTime() + new_duration_minutes * 60 * 1000
  ).toISOString();

  // The DB update runs first so the exclusion constraint is the one true
  // arbiter of overlap — if it fails, Google Calendar was never touched.
  const { error: updateError } = await adminClient
    .from("bookings")
    .update({ start_time: new_start_time, end_time: newEndTime })
    .eq("id", booking_id);
  if (updateError) {
    return new Response(JSON.stringify({ error: "Slot no longer available" }), { status: 409, headers: corsHeaders });
  }

  const { data: tokenRow, error: tokenRowError } = await adminClient
    .from("counselor_tokens")
    .select("refresh_token")
    .eq("counselor_id", booking.counselor_id)
    .single();
  if (tokenRowError || !tokenRow) {
    return new Response(JSON.stringify({ error: "Counselor is not bookable" }), { status: 404, headers: corsHeaders });
  }

  const accessToken = await getAccessToken(tokenRow.refresh_token);
  // ponytail: DB and Calendar updates aren't atomic across two systems. The
  // DB already won the overlap check above; a Calendar-side failure here is
  // rare and would need manual reconciliation, same tolerance already
  // accepted for the deactivate-counselor dead-token case in the spec.
  await patchCalendarEvent(accessToken, "primary", booking.google_event_id, {
    start: { dateTime: new_start_time },
    end: { dateTime: newEndTime },
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
});
