// supabase/functions/deactivate-counselor/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, deleteCalendarEvent } from "../_shared/google-calendar.ts";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403, headers: corsHeaders });
  }

  const { counselor_id } = await req.json();
  if (!counselor_id) {
    return new Response(JSON.stringify({ error: "counselor_id is required" }), { status: 400, headers: corsHeaders });
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error: approveError } = await adminClient
    .from("counselors")
    .update({ approved: false })
    .eq("id", counselor_id);
  if (approveError) {
    console.error(`Failed to mark counselor ${counselor_id} as not approved:`, approveError);
    return new Response(JSON.stringify({ error: "Failed to deactivate counselor" }), { status: 500, headers: corsHeaders });
  }

  const { data: bookings, error: bookingsError } = await adminClient
    .from("bookings")
    .select("id, google_event_id")
    .eq("counselor_id", counselor_id)
    .eq("status", "confirmed")
    .gt("start_time", new Date().toISOString());
  if (bookingsError) {
    console.error(`Failed to fetch upcoming bookings for counselor ${counselor_id}:`, bookingsError);
    return new Response(JSON.stringify({ error: "Failed to deactivate counselor" }), { status: 500, headers: corsHeaders });
  }

  const { data: tokenRow } = await adminClient
    .from("counselor_tokens")
    .select("refresh_token")
    .eq("counselor_id", counselor_id)
    .single();

  const manualFollowUp: string[] = [];

  for (const booking of bookings ?? []) {
    let calendarDeleted = false;
    if (tokenRow) {
      try {
        const accessToken = await getAccessToken(tokenRow.refresh_token);
        await deleteCalendarEvent(accessToken, "primary", booking.google_event_id);
        calendarDeleted = true;
      } catch (error) {
        console.error(`Failed to delete calendar event for booking ${booking.id}:`, error);
      }
    }
    const { error: cancelError } = await adminClient
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", booking.id);
    if (cancelError) {
      console.error(`Failed to mark booking ${booking.id} cancelled:`, cancelError);
    }
    if (!calendarDeleted || cancelError) {
      // Known limitation (see spec): either the counselor's token was
      // already dead (Calendar-side cleanup never happened, so nobody was
      // auto-notified and the Meet link may still be live), or the DB
      // status update itself failed (the row is still "confirmed" even
      // though the Calendar event is gone) — either way the operator
      // running this must personally follow up.
      manualFollowUp.push(booking.id);
    }
  }

  return new Response(JSON.stringify({ cancelled: (bookings ?? []).length, manualFollowUp }), { status: 200, headers: corsHeaders });
});
