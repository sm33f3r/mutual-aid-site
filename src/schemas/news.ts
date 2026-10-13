import { z } from "zod";
import { checkLanguageKeys, DateString, LanguageList, LocalizedText } from "./common";

export const NewsPostSchema = z
  .strictObject({
    date: DateString,
    languages: LanguageList,
    title: LocalizedText,
    body: LocalizedText,
  })
  .superRefine((p, ctx) => checkLanguageKeys(p.languages, { title: p.title, body: p.body }, ctx));

export type NewsPost = z.infer<typeof NewsPostSchema>;
