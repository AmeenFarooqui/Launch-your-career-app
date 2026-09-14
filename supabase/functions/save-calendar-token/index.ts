// supabase/functions/save-calendar-token/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  const counselorId = userData.user.id;

  const { refresh_token } = await req.json();
  if (!refresh_token) {
    return new Response(JSON.stringify({ error: "refresh_token is required" }), { status: 400 });
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error: counselorError } = await adminClient
    .from("counselors")
    .upsert({ id: counselorId, calendar_connected: true }, { onConflict: "id" });
  if (counselorError) {
    return new Response(JSON.stringify({ error: counselorError.message }), { status: 500 });
  }

  const { error: tokenError } = await adminClient
    .from("counselor_tokens")
    .upsert({ counselor_id: counselorId, refresh_token }, { onConflict: "counselor_id" });
  if (tokenError) {
    return new Response(JSON.stringify({ error: tokenError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
