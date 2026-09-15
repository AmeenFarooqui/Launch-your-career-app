// supabase/functions/deactivate-counselor/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, deleteCalendarEvent, GoogleTokenError } from "../_shared/google-calendar.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403 });
  }

  const { counselor_id } = await req.json();
  if (!counselor_id) {
    return new Response(JSON.stringify({ error: "counselor_id is required" }), { status: 400 });
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  await adminClient.from("counselors").update({ approved: false }).eq("id", counselor_id);

  const { data: bookings } = await adminClient
    .from("bookings")
    .select("id, google_event_id")
    .eq("counselor_id", counselor_id)
    .eq("status", "confirmed")
    .gt("start_time", new Date().toISOString());

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
        if (!(error instanceof GoogleTokenError)) throw error;
      }
    }
    await adminClient.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    if (!calendarDeleted) {
      // Known limitation (see spec): the counselor's token was already
      // dead, so nobody was auto-notified and the Meet link may still be
      // live — the operator running this must personally follow up.
      manualFollowUp.push(booking.id);
    }
  }

  return new Response(JSON.stringify({ cancelled: (bookings ?? []).length, manualFollowUp }), { status: 200 });
});
