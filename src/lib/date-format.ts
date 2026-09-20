export const ZONE = "Asia/Ho_Chi_Minh";
export function vietnamToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function addDays(date: string, days: number) {
  const value = new Date(date + "T00:00:00Z");
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function mondayOf(date: string) {
  const day = new Date(date + "T00:00:00Z").getUTCDay();
  return addDays(date, -((day + 6) % 7));
}
export function validBusinessDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "2000-01-01" || value > "2100-12-31") return false;
  const parsed = new Date(value + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function selectedWeek(value: unknown, today = vietnamToday()) {
  return mondayOf(validBusinessDate(value) ? value : today);
}
export function dateText(date: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: ZONE, weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date + "T00:00:00+07:00"));
}
export function timeText(at: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(at));
}

export function dateLabel(date: string, short = false) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: ZONE,
    ...(short ? {} : { weekday: "long" as const }), day: "2-digit", month: short ? "2-digit" : "long",
  }).format(new Date(date + "T12:00:00+07:00"));
}
export const timeLabel = timeText;
// datetime-local fields show Vietnam wall time, independent of the device timezone.
export function vietnamDateTimeInput(at: string | null) {
  return at ? new Date(Date.parse(at) + 7 * 3600000).toISOString().slice(0, 16) : "";
}
export function correctedVietnamTimestamp(value: string, original: string | null) {
  // Changing a completer/note must not round an unchanged timestamp to the minute.
  if (value === vietnamDateTimeInput(original)) return original;
  return value ? value + ":00+07:00" : null;
}
export function millisecondsToVietnamMidnight(now = new Date()) {
  return Date.parse(addDays(vietnamToday(now), 1) + "T00:00:00+07:00") - now.getTime() + 100;
}
