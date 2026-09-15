// supabase/tests/verify-booking-lifecycle.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const counselorId = process.env.TEST_COUNSELOR_ID;

const supabase = createClient(url, anonKey);

async function call(fn, body, token) {
  const res = await fetch(`${url}/functions/v1/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

const { data: signIn } = await supabase.auth.signInAnonymously();
const token = signIn.session.access_token;
const studentId = signIn.user.id;

await supabase
  .from("profiles")
  .update({ email: "student@example.com", guardian_email: "guardian@example.com" })
  .eq("id", studentId);

const availability = await call("get-availability", { counselor_id: counselorId, duration_minutes: 30 }, token);
const slot = availability.body.slots[0];
if (!slot) throw new Error("No open slots returned — check working_hours/calendar setup");

const first = await call("create-booking", { counselor_id: counselorId, start_time: slot, duration_minutes: 30 }, token);
if (first.status !== 200) throw new Error(`First booking failed: ${JSON.stringify(first.body)}`);
console.log("PASS: booking created");

const conflicting = await call("create-booking", { counselor_id: counselorId, start_time: slot, duration_minutes: 30 }, token);
if (conflicting.status !== 409) throw new Error(`Expected 409 on double-book, got ${conflicting.status}`);
console.log("PASS: overlapping booking rejected");

const newSlot = availability.body.slots[5]; // a different open slot
const reschedule = await call(
  "reschedule-booking",
  { booking_id: first.body.booking.id, new_start_time: newSlot, new_duration_minutes: 60 },
  token
);
if (reschedule.status !== 200) throw new Error(`Reschedule failed: ${JSON.stringify(reschedule.body)}`);
console.log("PASS: reschedule with duration change");

const tooSoon = await call("cancel-booking", { booking_id: first.body.booking.id }, token);
// If newSlot is >1h away this should succeed; this is a smoke check, not a
// cutoff-boundary test (that's covered by booking-rules.test.ts).
if (tooSoon.status !== 200) throw new Error(`Cancel failed: ${JSON.stringify(tooSoon.body)}`);
console.log("PASS: cancel");

const { error: reviewError } = await supabase
  .from("reviews")
  .insert({ booking_id: first.body.booking.id, rating: 5 });
if (!reviewError) throw new Error("Review on a cancelled/future booking should have been rejected by RLS");
console.log("PASS: review correctly rejected before completion");

console.log("ALL PASS");
