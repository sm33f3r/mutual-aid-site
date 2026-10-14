import { languages, reservedSegments, whitepaperEnabled } from "../config/site";
import type { ListingState } from "../schemas/listing";

export type PageKind =
  | "lang-home"
  | "city"
  | "archive"
  | "listing"
  | "news"
  | "faq"
  | "log"
  | "submit"
  | "whitepaper"
  | "city-redirect";

export interface Page {
  kind: PageKind;
  path: string;
  lang?: string;
  city?: string;
  listing?: string;
}

export interface RoutesInput {
  cities: { id: string; primaryLanguage: string }[];
  listings: { listing: { id: string; city: string }; effective: ListingState }[];
}

export interface RoutesOptions {
  languages: readonly string[];
  whitepaperEnabled: boolean;
  reservedSegments: readonly string[];
}

export const langPath = (lang: string) => `/${lang}/`;
export const sectionPath = (lang: string, section: string) => `/${lang}/${section}/`;
export const cityPath = (lang: string, city: string) => `/${lang}/${city}/`;
export const archivePath = (lang: string, city: string) => `/${lang}/${city}/archive/`;
export const listingPath = (lang: string, city: string, id: string) => `/${lang}/${city}/${id}/`;

/** Hidden and Removed listings get no page. Everything else (including Expired) does. */
export const hasPage = (state: ListingState): boolean => state !== "Hidden" && state !== "Removed";

export function buildPages(input: RoutesInput, opts: Partial<RoutesOptions> = {}): Page[] {
  const o: RoutesOptions = { languages, whitepaperEnabled, reservedSegments, ...opts };

  for (const c of input.cities) {
    if (o.reservedSegments.includes(c.id)) throw new Error(`City id '${c.id}' is a reserved URL segment`);
    if (o.languages.includes(c.id)) throw new Error(`City id '${c.id}' collides with a language code`);
  }
  for (const { listing } of input.listings) {
    if (o.reservedSegments.includes(listing.id)) throw new Error(`Listing id '${listing.id}' is a reserved URL segment`);
  }

  const pages: Page[] = [];
  for (const city of input.cities) {
    pages.push({ kind: "city-redirect", path: `/${city.id}/`, city: city.id, lang: city.primaryLanguage });
  }
  for (const lang of o.languages) {
    pages.push({ kind: "lang-home", path: langPath(lang), lang });
    const sections: PageKind[] = ["news", "faq", "log", "submit"];
    if (o.whitepaperEnabled) sections.push("whitepaper");
    for (const kind of sections) pages.push({ kind, path: sectionPath(lang, kind), lang });
    for (const city of input.cities) {
      pages.push({ kind: "city", path: cityPath(lang, city.id), lang, city: city.id });
      pages.push({ kind: "archive", path: archivePath(lang, city.id), lang, city: city.id });
    }
    for (const { listing, effective } of input.listings) {
      if (!hasPage(effective)) continue;
      pages.push({
        kind: "listing",
        path: listingPath(lang, listing.city, listing.id),
        lang,
        city: listing.city,
        listing: listing.id,
      });
    }
  }
  return pages;
}

export const pagesOfKind = (pages: Page[], ...kinds: PageKind[]): Page[] =>
  pages.filter((p) => kinds.includes(p.kind));
