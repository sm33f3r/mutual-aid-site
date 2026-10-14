import { todayInZone } from "./dates";

/**
 * Start-end time in the city's timezone, with the timezone name.
 * Recurrence text is not part of this: it is shown exactly as written, not localized.
 */
export function formatWhen(when: { start: string; end: string }, timezone: string, lang: string): string {
  const full = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short", timeZone: timezone });
  const timeOnly = new Intl.DateTimeFormat(lang, { timeStyle: "short", timeZone: timezone });
  const start = new Date(when.start);
  const end = new Date(when.end);
  const zoneName =
    new Intl.DateTimeFormat(lang, { timeZone: timezone, timeZoneName: "long" })
      .formatToParts(start)
      .find((p) => p.type === "timeZoneName")?.value ?? timezone;
  const sameDay = todayInZone(timezone, start) === todayInZone(timezone, end);
  return `${full.format(start)} – ${sameDay ? timeOnly.format(end) : full.format(end)} (${zoneName})`;
}

/** A YYYY-MM-DD calendar date in the reader's language (no timezone shift). */
export function formatDate(date: string, lang: string): string {
  return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}
