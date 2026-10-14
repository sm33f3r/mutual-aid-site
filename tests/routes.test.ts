import { describe, expect, it } from "vitest";
import { archivedListings, currentListings, loadSiteData } from "../src/lib/data";
import { buildPages } from "../src/lib/routes";
import type { ListingState } from "../src/schemas/listing";

const NOW = new Date("2026-11-08T12:00:00Z"); // after the Nov 7 sample events, before the Nov 14 one

describe("routes with a fixed now", () => {
  const data = loadSiteData({ now: NOW });
  const paths = buildPages({ cities: data.cities, listings: data.listings }).map((p) => p.path);

  it("moves a listing past expiry to the archive and out of the current list", () => {
    const cur = currentListings(data, "seoul").map((e) => e.listing.id);
    const arch = archivedListings(data, "seoul").map((e) => e.listing.id);
    expect(arch).toContain("sample-seoul-event");
    expect(cur).not.toContain("sample-seoul-event");
    expect(arch).not.toContain("sample-seoul-disputed");
  });

  it("keeps Disputed listings in the current list", () => {
    expect(currentListings(data, "seoul").map((e) => e.listing.id)).toContain("sample-seoul-disputed");
  });

  it("still builds a page for expired listings", () => {
    expect(paths).toContain("/en/seoul/sample-seoul-event/");
  });

  it("omits the whitepaper route when disabled", () => {
    expect(paths.some((p) => p.includes("whitepaper"))).toBe(false);
  });
});

describe("buildPages", () => {
  const cities = [{ id: "seoul", primaryLanguage: "ko" }];
  const listing = (id: string, effective: ListingState) => ({ listing: { id, city: "seoul" }, effective });

  it("produces no page for Hidden or Removed listings", () => {
    const paths = buildPages({
      cities,
      listings: [listing("a", "Hidden"), listing("b", "Removed"), listing("c", "Current"), listing("d", "Disputed")],
    }).map((p) => p.path);
    expect(paths).not.toContain("/en/seoul/a/");
    expect(paths).not.toContain("/en/seoul/b/");
    expect(paths).toContain("/en/seoul/c/");
    expect(paths).toContain("/ko/seoul/d/");
  });

  it("includes the whitepaper route when enabled", () => {
    const paths = buildPages({ cities, listings: [] }, { whitepaperEnabled: true }).map((p) => p.path);
    expect(paths).toContain("/en/whitepaper/");
    expect(paths).toContain("/ko/whitepaper/");
  });

  it("throws when a city id is a reserved segment", () => {
    expect(() => buildPages({ cities: [{ id: "faq", primaryLanguage: "en" }], listings: [] })).toThrow(/reserved/);
  });

  it("throws when a listing id is a reserved segment", () => {
    expect(() => buildPages({ cities, listings: [listing("archive", "Current")] })).toThrow(/reserved/);
  });

  it("throws when a city id collides with a language code", () => {
    expect(() => buildPages({ cities: [{ id: "ko", primaryLanguage: "ko" }], listings: [] })).toThrow(/language/);
  });
});
