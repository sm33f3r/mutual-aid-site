import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createT, t } from "../src/lib/i18n";
import { LOG_ACTIONS } from "../src/schemas/log";

const load = (l: string) => JSON.parse(readFileSync(`i18n/${l}.json`, "utf8")) as Record<string, string>;

describe("i18n files", () => {
  it("en.json and ko.json have identical keys", () => {
    expect(Object.keys(load("ko")).sort()).toEqual(Object.keys(load("en")).sort());
  });

  it("has a label for every log action", () => {
    for (const a of LOG_ACTIONS) expect(load("en")[`log.action.${a}`]).toBeTruthy();
  });

  it("keeps the token answer final and verbatim in English", () => {
    expect(load("en")["faq.a.tokens"]).toBe(
      "Participation earns no tokens, creates no claim to tokens, and grants no priority or eligibility for any future allocation. No future allocation has been promised.",
    );
  });
});

describe("t", () => {
  const tt = createT({ en: { a: "A en", b: "B {x}" }, ko: { a: "A ko" } }, "en");

  it("returns the requested language", () => {
    expect(tt("ko", "a")).toBe("A ko");
  });

  it("falls back to en when the key is missing in the language", () => {
    expect(tt("ko", "b", { x: "1" })).toBe("B 1");
  });

  it("throws when the key is missing from en", () => {
    expect(() => tt("ko", "nope")).toThrow(/nope/);
  });

  it("reads the real files", () => {
    expect(t("en", "site.name")).toBe("Mutual Aid DAO");
    expect(() => t("en", "no.such.key")).toThrow();
  });
});
