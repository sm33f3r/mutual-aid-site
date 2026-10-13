import { z } from "zod";
import { LanguageCode, LanguageList, LocalizedText, Slug } from "./common";

const Timezone = z.string().refine((tz) => {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}, "must be a valid IANA timezone name such as 'Asia/Seoul'");

export const CitySchema = z
  .strictObject({
    id: Slug,
    name: LocalizedText,
    primaryLanguage: LanguageCode,
    languages: LanguageList,
    timezone: Timezone,
  })
  .superRefine((c, ctx) => {
    if (!c.languages.includes(c.primaryLanguage)) {
      ctx.addIssue({ code: "custom", path: ["primaryLanguage"], message: "must be one of languages" });
    }
    const have = Object.keys(c.name).sort().join(",");
    if (have !== [...c.languages].sort().join(",")) {
      ctx.addIssue({ code: "custom", path: ["name"], message: "name keys must exactly match languages" });
    }
  });

export const CitiesSchema = z.array(CitySchema).superRefine((cities, ctx) => {
  const seen = new Set<string>();
  cities.forEach((c, i) => {
    if (seen.has(c.id)) ctx.addIssue({ code: "custom", path: [i, "id"], message: `duplicate city id '${c.id}'` });
    seen.add(c.id);
  });
});

export type City = z.infer<typeof CitySchema>;
