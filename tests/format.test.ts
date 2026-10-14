import { describe, expect, it } from "vitest";
import { formatDate, formatWhen } from "../src/lib/format";

// 2026-11-07 05:00 UTC = 14:00 in Seoul (Nov 7) = 21:00 in Los Angeles (Nov 6)
const when = { start: "2026-11-07T05:00:00Z", end: "2026-11-07T07:00:00Z" };

describe("formatWhen", () => {
  it("renders in Asia/Seoul with the local date and zone name", () => {
    const s = formatWhen(when, "Asia/Seoul", "en");
    expect(s).toContain("Nov 7, 2026");
    expect(s).toContain("2:00");
    expect(s).toContain("Korean Standard Time");
  });

  it("renders in America/Los_Angeles with the previous local date", () => {
    const s = formatWhen(when, "America/Los_Angeles", "en");
    expect(s).toContain("Nov 6, 2026");
    expect(s).toContain("9:00");
    expect(s).toContain("Pacific Standard Time");
  });

  it("formats calendar dates without timezone shift", () => {
    expect(formatDate("2026-11-07", "en")).toBe("Nov 7, 2026");
  });
});
