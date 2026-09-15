// supabase/functions/get-availability/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessToken, freeBusyQuery, GoogleTokenError } from "../_shared/google-calendar.ts";
import { isDurationOfferedByCounselor, isFarEnoughInAdvance } from "../_shared/booking-rules.ts";
import { computeOpenSlots } from "../_shared/availability.ts";
import { corsHeaders } from "../_shared/cors.ts";

const DAYS_AHEAD = 14;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const { counselor_id, duration_minutes } = await req.json();
  if (!counselor_id || !duration_minutes) {
    return new Response(
      JSON.stringify({ error: "counselor_id and duration_minutes are required" }),
      { status: 400, headers: corsHeaders }
    );
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: counselor, error: counselorError } = await adminClient
    .from("counselors")
    .select("allowed_durations, timezone, working_hours, calendar_connected, approved")
    .eq("id", counselor_id)
    .single();
  if (counselorError || !counselor) {
    return new Response(JSON.stringify({ error: "Counselor not found" }), { status: 404, headers: corsHeaders });
  }

  if (!isDurationOfferedByCounselor(duration_minutes, counselor.allowed_durations)) {
    return new Response(
      JSON.stringify({ error: "This counselor does not offer that duration" }),
      { status: 400, headers: corsHeaders }
    );
  }
  if (!counselor.approved) {
    return new Response(JSON.stringify({ slots: [] }), { status: 200, headers: corsHeaders });
  }
  if (!counselor.calendar_connected) {
    return new Response(JSON.stringify({ slots: [] }), { status: 200, headers: corsHeaders });
  }

  const { data: tokenRow } = await adminClient
    .from("counselor_tokens")
    .select("refresh_token")
    .eq("counselor_id", counselor_id)
    .single();
  if (!tokenRow) {
    return new Response(JSON.stringify({ slots: [] }), { status: 200, headers: corsHeaders });
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(tokenRow.refresh_token);
  } catch (error) {
    if (error instanceof GoogleTokenError) {
      await adminClient.from("counselors").update({ calendar_connected: false }).eq("id", counselor_id);
      return new Response(JSON.stringify({ slots: [] }), { status: 200, headers: corsHeaders });
    }
    throw error;
  }

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000).toISOString();
  const busy = await freeBusyQuery(accessToken, "primary", timeMin, timeMax);

  const slots = computeOpenSlots({
    busy,
    workingHours: counselor.working_hours,
    timezone: counselor.timezone,
    durationMinutes: duration_minutes,
    from: now,
    days: DAYS_AHEAD,
  }).filter((slot) => isFarEnoughInAdvance(slot, now));

  return new Response(JSON.stringify({ slots }), { status: 200, headers: corsHeaders });
});
