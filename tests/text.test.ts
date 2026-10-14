import { describe, expect, it } from "vitest";
import { pickText } from "../src/lib/text";

describe("pickText", () => {
  const both = { ko: "한", en: "English" };

  it("returns the requested language", () => {
    expect(pickText(both, "en", "ko")).toEqual({ text: "English", fellBack: false });
  });

  it("falls back to the primary language", () => {
    expect(pickText({ en: "Only English" }, "ko", "en")).toEqual({ text: "Only English", fellBack: true });
  });

  it("works when the listing has only one language and it is requested", () => {
    expect(pickText({ en: "Only English" }, "en", "en")).toEqual({ text: "Only English", fellBack: false });
  });

  it("throws when neither language exists", () => {
    expect(() => pickText({ ko: "한" }, "en", "en")).toThrow();
  });
});
