export const MIN_LEAD_TIME_MS = 2 * 60 * 60 * 1000;
export const CANCEL_CUTOFF_MS = 60 * 60 * 1000;

export function isDurationOfferedByCounselor(
  durationMinutes: number,
  allowedDurations: number[]
): boolean {
  return allowedDurations.includes(durationMinutes);
}

export function isFarEnoughInAdvance(startTimeIso: string, now: Date = new Date()): boolean {
  return new Date(startTimeIso).getTime() - now.getTime() >= MIN_LEAD_TIME_MS;
}

export function canCancelOrReschedule(startTimeIso: string, now: Date = new Date()): boolean {
  const msUntilStart = new Date(startTimeIso).getTime() - now.getTime();
  // false covers both "already happened" (negative) and "too soon" (< 1h)
  return msUntilStart > CANCEL_CUTOFF_MS;
}
