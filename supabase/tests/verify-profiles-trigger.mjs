// supabase/tests/verify-profiles-trigger.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY (from `supabase status`) first.");
  process.exit(1);
}

const supabase = createClient(url, anonKey);

const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
if (signInError) {
  console.error("Anonymous sign-in failed:", signInError.message);
  process.exit(1);
}

const userId = signInData.user.id;

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id, created_at")
  .eq("id", userId)
  .single();

if (profileError || !profile) {
  console.error("No profile row was created for the new user:", profileError?.message);
  process.exit(1);
}

console.log("PASS: profile row auto-created for", userId);
