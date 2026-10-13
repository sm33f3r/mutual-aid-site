import { z } from "zod";
import { DateString } from "./common";

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE = /\+?\d[\d\s().-]{5,}\d/g;

/** True if the text contains an email address or a phone-number-like pattern. */
export function containsPersonalDetails(text: string): string | null {
  if (EMAIL.test(text)) return "email address";
  // Ignore ISO dates so "2026-10-14" is not mistaken for a phone number.
  const stripped = text.replace(/\d{4}-\d{2}-\d{2}/g, " ");
  for (const m of stripped.match(PHONE) ?? []) {
    if (m.replace(/\D/g, "").length >= 7) return "phone-number-like pattern";
  }
  return null;
}

const SafeText = z.string().min(1).superRefine((s, ctx) => {
  const found = containsPersonalDetails(s);
  if (found) ctx.addIssue({ code: "custom", message: `must not contain personal details (${found})` });
});

export const LOG_ACTIONS = [
  "posted",
  "state_changed",
  "corrected",
  "reconfirmed",
  "expired",
  "removed",
  "report_received",
  "report_unresolved",
  "rejected_format",
  "comment_removed",
] as const;

export const LogAction = z.enum(LOG_ACTIONS);

export const LogEntrySchema = z
  .strictObject({
    date: DateString,
    listing_id: SafeText.optional(),
    comment_ref: SafeText.optional(),
    action: LogAction,
    reason: SafeText,
  })
  .superRefine((e, ctx) => {
    if ((e.listing_id === undefined) === (e.comment_ref === undefined)) {
      ctx.addIssue({
        code: "custom",
        path: [],
        message: "exactly one of listing_id or comment_ref is required",
      });
    }
  });

export type LogEntry = z.infer<typeof LogEntrySchema>;
