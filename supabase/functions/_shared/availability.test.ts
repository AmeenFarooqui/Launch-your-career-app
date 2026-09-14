import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeOpenSlots, zonedTimeToUtc } from "./availability.ts";

Deno.test("zonedTimeToUtc - converts a local time in America/Chicago to the correct UTC instant", () => {
  const day = new Date("2026-09-02T12:00:00Z");
  const utcMs = zonedTimeToUtc(day, "09:00", "America/Chicago");
  // Chicago is UTC-5 (CDT) in September.
  assertEquals(new Date(utcMs).toISOString(), "2026-09-02T14:00:00.000Z");
});

Deno.test("computeOpenSlots - excludes a slot that overlaps a busy block", () => {
  const from = new Date("2026-09-02T12:00:00Z");
  const dayKey = from
    .toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Chicago" })
    .slice(0, 3)
    .toLowerCase();

  const slots = computeOpenSlots({
    busy: [{ start: "2026-09-02T14:00:00Z", end: "2026-09-02T14:30:00Z" }],
    workingHours: { [dayKey]: [["09:00", "10:00"]] },
    timezone: "America/Chicago",
    durationMinutes: 30,
    from,
    days: 1,
  });

  assertEquals(slots.includes("2026-09-02T14:00:00.000Z"), false);
  assertEquals(slots.includes("2026-09-02T14:30:00.000Z"), true);
});

Deno.test("computeOpenSlots - offers no slots on a day not listed in working hours", () => {
  const from = new Date("2026-09-02T12:00:00Z");
  const todayKey = from
    .toLocaleDateString("en-US", { weekday: "short", timeZone: "America/Chicago" })
    .slice(0, 3)
    .toLowerCase();
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const otherKey = days.find((d) => d !== todayKey)!;

  const slots = computeOpenSlots({
    busy: [],
    workingHours: { [otherKey]: [["09:00", "17:00"]] },
    timezone: "America/Chicago",
    durationMinutes: 30,
    from,
    days: 1,
  });

  assertEquals(slots.length, 0);
});
