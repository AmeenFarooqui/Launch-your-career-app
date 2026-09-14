export function zonedTimeToUtc(day: Date, hhmm: string, timezone: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const dateStr = day.toLocaleDateString("en-CA", { timeZone: timezone }); // YYYY-MM-DD
  const localIso = `${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  const utcGuess = new Date(`${localIso}Z`);
  const offsetMinutes = getTimezoneOffsetMinutes(timezone, utcGuess);
  return utcGuess.getTime() - offsetMinutes * 60 * 1000;
}

function getTimezoneOffsetMinutes(timezone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (asUtc - date.getTime()) / 60000;
}

interface ComputeOpenSlotsArgs {
  busy: Array<{ start: string; end: string }>;
  workingHours: Record<string, Array<[string, string]>>;
  timezone: string;
  durationMinutes: number;
  from: Date;
  days: number;
  slotStepMinutes?: number;
}

export function computeOpenSlots({
  busy,
  workingHours,
  timezone,
  durationMinutes,
  from,
  days,
  slotStepMinutes = 15,
}: ComputeOpenSlotsArgs): string[] {
  const slots: string[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const stepMs = slotStepMinutes * 60 * 1000;
  const durationMs = durationMinutes * 60 * 1000;

  for (let d = 0; d < days; d++) {
    const day = new Date(from.getTime() + d * dayMs);
    const dayKey = day
      .toLocaleDateString("en-US", { weekday: "short", timeZone: timezone })
      .slice(0, 3)
      .toLowerCase();
    const ranges = workingHours[dayKey] ?? [];

    for (const [startStr, endStr] of ranges) {
      const rangeStart = zonedTimeToUtc(day, startStr, timezone);
      const rangeEnd = zonedTimeToUtc(day, endStr, timezone);

      for (let t = rangeStart; t + durationMs <= rangeEnd; t += stepMs) {
        const slotEnd = t + durationMs;
        const overlapsBusy = busy.some((b) => {
          const busyStart = new Date(b.start).getTime();
          const busyEnd = new Date(b.end).getTime();
          return t < busyEnd && slotEnd > busyStart;
        });
        if (!overlapsBusy) {
          slots.push(new Date(t).toISOString());
        }
      }
    }
  }

  return slots;
}
