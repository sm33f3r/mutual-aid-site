import { describe, expect, it } from "vitest";
import { buildNow, loadSiteData } from "../src/lib/data";

const NOW = new Date("2026-10-14T00:00:00Z");

describe("loadSiteData", () => {
  it("loads the real data", () => {
    const d = loadSiteData({ now: NOW });
    expect(d.cities.map((c) => c.id)).toEqual(["seoul", "seattle"]);
    expect(d.listings.length).toBeGreaterThan(0);
  });

  it("computes today per city timezone", () => {
    const d = loadSiteData({ now: new Date("2026-11-07T16:00:00Z") });
    expect(d.todayByCity).toEqual({ seoul: "2026-11-08", seattle: "2026-11-07" });
  });

  it("throws on an invalid data fixture", () => {
    expect(() => loadSiteData({ dataDir: "tests/fixtures/mismatch", now: NOW })).toThrow(/validation failed/i);
  });
});

describe("buildNow", () => {
  it("uses BUILD_NOW when set", () => {
    expect(buildNow({ BUILD_NOW: "2026-12-01T00:00:00Z" }).toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });

  it("throws on an invalid BUILD_NOW", () => {
    expect(() => buildNow({ BUILD_NOW: "tomorrow" })).toThrow(/BUILD_NOW/);
  });

  it("falls back to the real clock", () => {
    expect(Math.abs(buildNow({}).getTime() - Date.now())).toBeLessThan(5000);
  });
});
