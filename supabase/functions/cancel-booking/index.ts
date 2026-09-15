// supabase/functions/cancel-booking/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, deleteCalendarEvent } from "../_shared/google-calendar.ts";
import { canCancelOrReschedule } from "../_shared/booking-rules.ts";
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
  const callerId = userData.user.id;

  const { booking_id } = await req.json();
  if (!booking_id) {
    return new Response(JSON.stringify({ error: "booking_id is required" }), { status: 400, headers: corsHeaders });
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
  if (bookingError || !booking) {
    return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404, headers: corsHeaders });
  }
  if (callerId !== booking.student_id && callerId !== booking.counselor_id) {
    return new Response(JSON.stringify({ error: "Not your booking" }), { status: 403, headers: corsHeaders });
  }
  if (booking.status !== "confirmed") {
    return new Response(JSON.stringify({ error: "Booking is already cancelled" }), { status: 400, headers: corsHeaders });
  }
  if (!canCancelOrReschedule(booking.start_time)) {
    return new Response(
      JSON.stringify({ error: "Too late to cancel — must be more than 1 hour before start" }),
      { status: 400, headers: corsHeaders }
    );
  }

  const { data: tokenRow } = await adminClient
    .from("counselor_tokens")
    .select("refresh_token")
    .eq("counselor_id", booking.counselor_id)
    .single();
  if (tokenRow) {
    // A dead/revoked Google token (or any other calendar-side failure) must
    // not trap the student's cancel forever — the DB update below is the
    // authoritative state change; a failed Calendar cleanup is an operator
    // follow-up concern, not a reason to block cancellation.
    try {
      const accessToken = await getAccessToken(tokenRow.refresh_token);
      await deleteCalendarEvent(accessToken, "primary", booking.google_event_id);
    } catch (error) {
      console.error(`Failed to delete calendar event for booking ${booking_id}:`, error);
    }
  }

  const { error: updateError } = await adminClient
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", booking_id);
  if (updateError) {
    console.error("Failed to mark booking cancelled after calendar deletion:", updateError);
    return new Response(JSON.stringify({ error: "Failed to cancel booking" }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
});
