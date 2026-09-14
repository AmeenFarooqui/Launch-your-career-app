import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  isDurationOfferedByCounselor,
  isFarEnoughInAdvance,
  canCancelOrReschedule,
} from "./booking-rules.ts";

Deno.test("isDurationOfferedByCounselor - allows a duration the counselor offers", () => {
  assertEquals(isDurationOfferedByCounselor(60, [30, 60]), true);
});

Deno.test("isDurationOfferedByCounselor - rejects a duration the counselor doesn't offer", () => {
  assertEquals(isDurationOfferedByCounselor(90, [30, 60]), false);
});

Deno.test("isFarEnoughInAdvance - rejects a slot less than 2 hours away", () => {
  const now = new Date("2026-09-02T10:00:00Z");
  assertEquals(isFarEnoughInAdvance("2026-09-02T11:00:00Z", now), false);
});

Deno.test("isFarEnoughInAdvance - allows a slot 2 or more hours away", () => {
  const now = new Date("2026-09-02T10:00:00Z");
  assertEquals(isFarEnoughInAdvance("2026-09-02T13:00:00Z", now), true);
});

Deno.test("canCancelOrReschedule - rejects a booking that already started", () => {
  const now = new Date("2026-09-02T10:00:00Z");
  assertEquals(canCancelOrReschedule("2026-09-02T09:00:00Z", now), false);
});

Deno.test("canCancelOrReschedule - rejects a booking starting in 30 minutes", () => {
  const now = new Date("2026-09-02T10:00:00Z");
  assertEquals(canCancelOrReschedule("2026-09-02T10:30:00Z", now), false);
});

Deno.test("canCancelOrReschedule - allows a booking starting in 2 hours", () => {
  const now = new Date("2026-09-02T10:00:00Z");
  assertEquals(canCancelOrReschedule("2026-09-02T12:00:00Z", now), true);
});
