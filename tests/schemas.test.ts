import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { todayInZone } from "../src/lib/dates";
import { effectiveState } from "../src/lib/expiry";
import { validateAll } from "../src/lib/validate";
import { CitiesSchema, createListingSchema, LOG_ACTIONS, LogEntrySchema, NewsPostSchema } from "../src/schemas";

const TODAY = "2026-10-14";
const cityIds = ["seoul", "seattle"];
const schema = createListingSchema({ today: TODAY, cityIds });
const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));

const base = () => load("data/listings/seoul/sample-seoul-event.json");
const recurring = () => load("data/listings/seoul/sample-seoul-recurring.json");

function reasons(schemaOrResult: { safeParse: (x: unknown) => any }, data: unknown): string {
  const r = schemaOrResult.safeParse(data);
  expect(r.success).toBe(false);
  return r.error.issues.map((i: any) => `${i.path.join(".")}: ${i.message}`).join("\n");
}

describe("sample data", () => {
  it("passes validateAll", () => {
    expect(validateAll("data", TODAY)).toEqual([]);
  });

  it("marks every sample title and has the expected shape", () => {
    for (const city of ["seoul", "seattle"]) {
      const files = readdirSync(join("data/listings", city));
      expect(files).toHaveLength(3);
      for (const f of files) {
        const l = load(join("data/listings", city, f));
        expect(l.id.startsWith("sample-")).toBe(true);
        expect(Object.keys(l.title).sort()).toEqual(city === "seoul" ? ["en", "ko"] : ["en"]);
        for (const t of Object.values(l.title)) expect(t).toMatch(/^\[SAMPLE - not a real listing\]/);
      }
    }
    const states = ["seoul", "seattle"].flatMap((c) =>
      readdirSync(join("data/listings", c)).map((f) => load(join("data/listings", c, f)).state),
    );
    expect(states.filter((s) => s === "Disputed")).toHaveLength(2);
  });

  it("parses cities, log and news", () => {
    expect(CitiesSchema.safeParse(load("data/cities.json")).success).toBe(true);
    expect(LogEntrySchema.safeParse(load("data/log/sample-log-1.json")).success).toBe(true);
    expect(NewsPostSchema.safeParse(load("data/news/sample-news-1.json")).success).toBe(true);
  });

  it("has matching i18n keys", () => {
    expect(Object.keys(load("i18n/ko.json")).sort()).toEqual(Object.keys(load("i18n/en.json")).sort());
  });
});

describe("listing rules", () => {
  it("accepts the base samples", () => {
    expect(schema.safeParse(base()).success).toBe(true);
    expect(schema.safeParse(recurring()).success).toBe(true);
  });

  it("rejects missing expiry_date", () => {
    const l = base();
    delete l.expiry_date;
    expect(reasons(schema, l)).toMatch(/expiry_date/);
  });

  it("rejects a wrong one-time expiry_date", () => {
    expect(reasons(schema, { ...base(), expiry_date: "2026-11-08" })).toMatch(/must equal the date of when.end/);
  });

  it("rejects a recurring expiry_date more than 30 days after last_checked", () => {
    expect(reasons(schema, { ...recurring(), expiry_date: "2026-11-10" })).toMatch(/within 30 days/);
    expect(schema.safeParse({ ...recurring(), expiry_date: "2026-11-09" }).success).toBe(true);
  });

  it("rejects last_checked in the future", () => {
    expect(reasons(schema, { ...base(), last_checked: "2026-10-15" })).toMatch(/in the future/);
  });

  it("rejects bad evidence and state values", () => {
    expect(reasons(schema, { ...base(), evidence: "Rumor" })).toMatch(/evidence/);
    expect(reasons(schema, { ...base(), state: "Maybe" })).toMatch(/state/);
  });

  it("rejects an unknown city", () => {
    expect(reasons(schema, { ...base(), city: "busan" })).toMatch(/unknown city 'busan'/);
  });

  it("rejects an http source_link", () => {
    expect(reasons(schema, { ...base(), source_link: "http://example.com/x" })).toMatch(/https/);
    expect(schema.safeParse({ ...base(), source_link: "https://example.com/x" }).success).toBe(true);
  });

  it("rejects languages that do not match the localized keys", () => {
    expect(reasons(schema, { ...base(), languages: ["en"] })).toMatch(/do not exactly match/);
    const l = base();
    delete l.where.address.ko;
    expect(reasons(schema, l)).toMatch(/where.address/);
  });

  it("rejects extra fields", () => {
    expect(reasons(schema, { ...base(), phone: "x" })).toMatch(/phone/);
    const l = base();
    l.where.private_home = true;
    expect(reasons(schema, l)).toMatch(/private_home/);
  });
});

describe("log entry rules", () => {
  const ok = { date: "2026-10-12", listing_id: "sample-x", action: "state_changed", reason: "Sample reason" };

  it("accepts a valid entry, including a comment_ref entry", () => {
    expect(LogEntrySchema.safeParse(ok).success).toBe(true);
    const { listing_id, ...rest } = ok;
    expect(LogEntrySchema.safeParse({ ...rest, comment_ref: "c-1" }).success).toBe(true);
  });

  it("rejects an email address", () => {
    expect(reasons(LogEntrySchema, { ...ok, reason: "contact me at a.b@example.com" })).toMatch(/email/);
  });

  it("rejects phone-like patterns but not dates", () => {
    expect(reasons(LogEntrySchema, { ...ok, reason: "call 010-1234-5678" })).toMatch(/phone/);
    expect(reasons(LogEntrySchema, { ...ok, reason: "call +1 (206) 555 0100" })).toMatch(/phone/);
    expect(LogEntrySchema.safeParse({ ...ok, reason: "Checked on 2026-10-14" }).success).toBe(true);
  });

  it("rejects both or neither of listing_id and comment_ref", () => {
    expect(reasons(LogEntrySchema, { ...ok, comment_ref: "c-1" })).toMatch(/exactly one/);
    const { listing_id, ...none } = ok;
    expect(reasons(LogEntrySchema, none)).toMatch(/exactly one/);
  });

  it("rejects extra fields", () => {
    expect(reasons(LogEntrySchema, { ...ok, name: "x" })).toMatch(/name/);
  });

  it("accepts every action in the list and rejects others", () => {
    for (const action of LOG_ACTIONS) expect(LogEntrySchema.safeParse({ ...ok, action }).success).toBe(true);
    expect(reasons(LogEntrySchema, { ...ok, action: "hidden" })).toMatch(/action/);
  });
});

describe("news rules", () => {
  it("rejects mismatched languages", () => {
    const p = load("data/news/sample-news-1.json");
    expect(reasons(NewsPostSchema, { ...p, languages: ["en"] })).toMatch(/do not exactly match/);
  });
});

describe("validateAll", () => {
  it("reports folder/city and filename/id mismatches", () => {
    const f = validateAll("tests/fixtures/mismatch", TODAY);
    const text = f.map((x) => x.reason).join("\n");
    expect(text).toMatch(/does not match folder 'seoul'/);
    expect(text).toMatch(/does not match filename/);
  });
});

describe("city schema", () => {
  const cities = () => load("data/cities.json");
  it("rejects a missing timezone", () => {
    const c = cities();
    delete c[0].timezone;
    expect(reasons(CitiesSchema, c)).toMatch(/timezone/);
  });
  it("rejects an invalid timezone", () => {
    const c = cities();
    c[0].timezone = "Mars/Olympus";
    expect(reasons(CitiesSchema, c)).toMatch(/valid IANA timezone/);
  });
});

describe("todayInZone", () => {
  it("handles the date line between Seoul and Seattle", () => {
    for (const iso of ["2026-10-14T05:00:00Z", "2026-10-13T20:00:00Z"]) {
      expect(todayInZone("Asia/Seoul", new Date(iso))).toBe("2026-10-14");
      expect(todayInZone("America/Los_Angeles", new Date(iso))).toBe("2026-10-13");
    }
  });
  it("uses PST after daylight saving ends", () => {
    expect(todayInZone("America/Los_Angeles", new Date("2026-11-02T07:30:00Z"))).toBe("2026-11-01");
  });
});

describe("effectiveState", () => {
  const l = { expiry_date: "2026-11-07", state: "Current" as const };
  it("returns Expired after expiry_date", () => {
    expect(effectiveState(l, "2026-11-08")).toBe("Expired");
  });
  it("keeps Removed and Hidden past expiry_date", () => {
    expect(effectiveState({ ...l, state: "Removed" }, "2026-12-01")).toBe("Removed");
    expect(effectiveState({ ...l, state: "Hidden" }, "2026-12-01")).toBe("Hidden");
  });
  it("turns Disputed into Expired past expiry_date", () => {
    expect(effectiveState({ ...l, state: "Disputed" }, "2026-11-08")).toBe("Expired");
  });
  it("returns the stored state on and before expiry_date", () => {
    expect(effectiveState(l, "2026-11-07")).toBe("Current");
    expect(effectiveState(l, "2026-11-06")).toBe("Current");
    expect(effectiveState({ ...l, state: "Disputed" }, "2026-11-07")).toBe("Disputed");
  });
});
