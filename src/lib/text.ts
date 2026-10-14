export interface Picked {
  text: string;
  /** True when `lang` was missing and the city's primary-language text was used instead. */
  fellBack: boolean;
}

export function pickText(localized: Record<string, string>, lang: string, cityPrimaryLanguage: string): Picked {
  const wanted = localized[lang];
  if (wanted !== undefined) return { text: wanted, fellBack: false };
  const primary = localized[cityPrimaryLanguage];
  if (primary !== undefined) return { text: primary, fellBack: true };
  throw new Error(
    `No text for '${lang}' or primary language '${cityPrimaryLanguage}' (has: ${Object.keys(localized).join(", ")})`,
  );
}
