import { resolve } from "node:path";
import { todayInZone } from "./dates";
import { effectiveState } from "./expiry";
import { buildPages, type Page } from "./routes";
import { loadAll, loadCities } from "./validate";
import { DateTimeString } from "../schemas/common";
import type { City } from "../schemas/city";
import type { Listing, ListingState } from "../schemas/listing";
import type { LogEntry } from "../schemas/log";
import type { NewsPost } from "../schemas/news";

export interface ListingEntry {
  listing: Listing;
  /** State after applying expiry for the listing's city, as of the build time. */
  effective: ListingState;
}

export interface SiteData {
  now: Date;
  cities: City[];
  todayByCity: Record<string, string>;
  listings: ListingEntry[];
  log: LogEntry[];
  news: NewsPost[];
}

/** Build time: BUILD_NOW (ISO instant with offset or Z) if set, otherwise the real clock. */
export function buildNow(env: Record<string, string | undefined> = process.env): Date {
  const raw = env.BUILD_NOW;
  if (raw === undefined || raw === "") return new Date();
  if (!DateTimeString.safeParse(raw).success) {
    throw new Error(`BUILD_NOW '${raw}' is not an ISO instant such as 2026-12-01T00:00:00Z`);
  }
  return new Date(raw);
}

/** Loads and validates all data. Throws if anything is invalid, so a build never publishes bad data. */
export function loadSiteData(opts: { dataDir?: string; now?: Date } = {}): SiteData {
  const dataDir = resolve(opts.dataDir ?? "data");
  const now = opts.now ?? buildNow();

  const todayByCity: Record<string, string> = {};
  for (const c of loadCities(dataDir)) todayByCity[c.id] = todayInZone(c.timezone, now);

  const { failures, data } = loadAll(dataDir, todayByCity);
  if (failures.length > 0) {
    const lines = failures.map((f) => `  ${f.file}: ${f.reason}`).join("\n");
    throw new Error(`Data validation failed (${failures.length}):\n${lines}`);
  }

  const seen = new Set<string>();
  for (const l of data.listings) {
    if (seen.has(l.id)) throw new Error(`Duplicate listing id '${l.id}' (ids must be unique across cities)`);
    seen.add(l.id);
  }

  const listings = data.listings.map((listing) => ({
    listing,
    effective: effectiveState(listing, todayByCity[listing.city] as string),
  }));
  buildPages({ cities: data.cities, listings }); // throws on reserved ids, so a bad id fails the build here
  return { now, todayByCity, cities: data.cities, listings, log: data.log, news: data.news };
}

let cached: SiteData | undefined;
/** Loaded once per build process. */
export function getSiteData(): SiteData {
  return (cached ??= loadSiteData());
}

export function getPages(data: SiteData = getSiteData()): Page[] {
  return buildPages({ cities: data.cities, listings: data.listings });
}

export const currentListings = (data: SiteData, cityId: string): ListingEntry[] =>
  data.listings
    .filter((e) => e.listing.city === cityId && (e.effective === "Current" || e.effective === "Disputed"))
    .sort((a, b) => Date.parse(a.listing.when.start) - Date.parse(b.listing.when.start));

export const archivedListings = (data: SiteData, cityId: string): ListingEntry[] =>
  data.listings
    .filter((e) => e.listing.city === cityId && e.effective === "Expired")
    .sort(
      (a, b) =>
        b.listing.expiry_date.localeCompare(a.listing.expiry_date) ||
        Date.parse(b.listing.when.start) - Date.parse(a.listing.when.start),
    );
