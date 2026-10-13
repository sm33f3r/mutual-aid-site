import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { findSampleIds } from "../src/lib/samples";

const run = (dir: string) =>
  spawnSync("npx", ["tsx", "scripts/check-no-samples.ts", dir], { encoding: "utf8" });

describe("check-no-samples", () => {
  it("finds sample ids in a fixture directory", () => {
    expect(findSampleIds("tests/fixtures/with-samples/listings")).toEqual(["sample-seoul-event"]);
  });

  it("exits non-zero and lists ids while samples exist", () => {
    const r = run("tests/fixtures/with-samples");
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("sample-seoul-event");
  });

  it("passes when no samples exist", () => {
    expect(run("tests/fixtures/clean").status).toBe(0);
  });
});
