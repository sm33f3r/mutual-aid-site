import { z } from "zod";
import { isRealDate } from "../lib/dates";

export const LanguageCode = z.string().regex(/^[a-z]{2,3}$/, "must be a lowercase language code such as 'en' or 'ko'");

export const DateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
  .refine(isRealDate, "is not a real calendar date");

/** ISO 8601 datetime with a UTC offset, e.g. 2026-11-07T14:00:00+09:00 */
export const DateTimeString = z.iso.datetime({ offset: true });

export const Slug = z.string().regex(/^[a-z0-9-]+$/, "must contain only lowercase letters, digits and hyphens");

/** Text keyed by language code, e.g. { ko: "...", en: "..." }. */
export const LocalizedText = z
  .record(LanguageCode, z.string().min(1, "must not be empty"))
  .refine((o) => Object.keys(o).length > 0, "must have at least one language");

export const LanguageList = z
  .array(LanguageCode)
  .min(1)
  .refine((a) => new Set(a).size === a.length, "must not contain duplicates");

/**
 * Adds an issue for each of `fields` whose language keys differ from `languages`.
 */
export function checkLanguageKeys(
  languages: string[],
  fields: Record<string, Record<string, string> | undefined>,
  ctx: z.RefinementCtx,
  pathPrefix: (string | number)[] = [],
): void {
  const want = [...languages].sort();
  for (const [name, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const have = Object.keys(value).sort();
    if (have.join(",") !== want.join(",")) {
      ctx.addIssue({
        code: "custom",
        path: [...pathPrefix, ...name.split(".")],
        message: `language keys [${have.join(", ")}] do not exactly match languages [${want.join(", ")}]`,
      });
    }
  }
}
