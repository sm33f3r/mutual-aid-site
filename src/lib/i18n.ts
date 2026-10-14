import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defaultLanguage } from "../config/site";

export type Dictionary = Record<string, string>;
export type Translator = (lang: string, key: string, vars?: Record<string, string>) => string;

/** Builds t() over the given dictionaries. Falls back to the fallback language; throws if the key is missing there too. */
export function createT(dictionaries: Record<string, Dictionary>, fallbackLang: string): Translator {
  return (lang, key, vars) => {
    const value = dictionaries[lang]?.[key] ?? dictionaries[fallbackLang]?.[key];
    if (value === undefined) throw new Error(`Missing translation key '${key}' (not in ${fallbackLang}.json)`);
    return vars ? value.replace(/\{(\w+)\}/g, (m, name: string) => vars[name] ?? m) : value;
  };
}

const cache = new Map<string, Dictionary>();

export function loadDictionary(lang: string, dir: string = resolve("i18n")): Dictionary {
  const path = resolve(dir, `${lang}.json`);
  let dict = cache.get(path);
  if (!dict) {
    dict = existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as Dictionary) : {};
    cache.set(path, dict);
  }
  return dict;
}

/** t(lang, key): reads i18n/<lang>.json, falls back to en, throws if the key is missing from en. */
export const t: Translator = (lang, key, vars) =>
  createT({ [lang]: loadDictionary(lang), [defaultLanguage]: loadDictionary(defaultLanguage) }, defaultLanguage)(
    lang,
    key,
    vars,
  );
