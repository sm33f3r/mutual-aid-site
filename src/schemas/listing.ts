import { z } from "zod";
import { addDays, realToday } from "../lib/dates";
import { checkLanguageKeys, DateString, DateTimeString, LanguageList, LocalizedText, Slug } from "./common";

export const EVIDENCE_LEVELS = ["Published", "Source-confirmed", "Community-confirmed"] as const;
export const STATES = ["Current", "Disputed", "Hidden", "Expired", "Removed"] as const;

export const Evidence = z.enum(EVIDENCE_LEVELS);
export const ListingState = z.enum(STATES);

/** Public places only: venue and address must be a publicly accessible place, never a private home. */
const Where = z.strictObject({
  venue: LocalizedText,
  address: LocalizedText,
});

const When = z.strictObject({
  start: DateTimeString,
  end: DateTimeString,
  recurrence: z.string().min(1).optional(),
});

export interface ListingSchemaOptions {
  /** "today" for the last_checked-not-in-future rule. Defaults to the real date. */
  today?: string;
  /** Known city ids (from data/cities.json). If omitted, only the slug format is checked. */
  cityIds?: readonly string[];
}

export function createListingSchema(opts: ListingSchemaOptions = {}) {
  const today = opts.today ?? realToday();
  return z
    .strictObject({
      id: Slug,
      city: Slug,
      languages: LanguageList,
      title: LocalizedText,
      what_is_free: LocalizedText,
      who_can_attend: LocalizedText,
      where: Where,
      when: When,
      source_link: z
        .url()
        .refine((u) => u.startsWith("https://"), "must be an https URL")
        .optional(),
      expiry_date: DateString,
      evidence: Evidence,
      state: ListingState,
      last_checked: DateString,
      credit_name: z.string().min(1).optional(),
      grimple_note: LocalizedText.optional(),
    })
    .superRefine((l, ctx) => {
      if (opts.cityIds && !opts.cityIds.includes(l.city)) {
        ctx.addIssue({
          code: "custom",
          path: ["city"],
          message: `unknown city '${l.city}' (known: ${opts.cityIds.join(", ")})`,
        });
      }

      checkLanguageKeys(
        l.languages,
        {
          title: l.title,
          what_is_free: l.what_is_free,
          who_can_attend: l.who_can_attend,
          "where.venue": l.where.venue,
          "where.address": l.where.address,
          grimple_note: l.grimple_note,
        },
        ctx,
      );

      if (Date.parse(l.when.end) < Date.parse(l.when.start)) {
        ctx.addIssue({ code: "custom", path: ["when", "end"], message: "must not be before when.start" });
      }

      if (l.last_checked > today) {
        ctx.addIssue({
          code: "custom",
          path: ["last_checked"],
          message: `${l.last_checked} is in the future (today is ${today})`,
        });
      }

      if (l.when.recurrence === undefined) {
        // Date as written in the datetime string (its own UTC offset).
        const endDate = l.when.end.slice(0, 10);
        if (l.expiry_date !== endDate) {
          ctx.addIssue({
            code: "custom",
            path: ["expiry_date"],
            message: `one-time event: expiry_date (${l.expiry_date}) must equal the date of when.end (${endDate})`,
          });
        }
      } else {
        const max = addDays(l.last_checked, 30);
        if (l.expiry_date > max) {
          ctx.addIssue({
            code: "custom",
            path: ["expiry_date"],
            message: `recurring listing: expiry_date (${l.expiry_date}) must be within 30 days of last_checked (latest ${max})`,
          });
        }
      }
    });
}

export const ListingSchema = createListingSchema();
export type Listing = z.infer<typeof ListingSchema>;
export type Evidence = z.infer<typeof Evidence>;
export type ListingState = z.infer<typeof ListingState>;
