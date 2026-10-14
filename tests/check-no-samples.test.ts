import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { findSampleIds } from "../src/lib/samples";

const root = resolve(__dirname, "..");
const script = resolve(root, "scripts", "check-no-samples.ts");

const run = (dir: string) =>
  spawnSync(process.execPath, ["--import", "tsx", script, dir], { cwd: root, encoding: "utf8" });

describe("check-no-samples", () => {
  it("finds sample ids in a fixture directory", () => {
    expect(findSampleIds("tests/fixtures/with-samples/listings")).toEqual(["sample-seoul-event"]);
  });

  it("exits non-zero and lists ids while samples exist", () => {
    const r = run("tests/fixtures/with-samples");
    expect(r.error).toBeUndefined();
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("sample-seoul-event");
  });

  it("passes when no samples exist", () => {
    const r = run("tests/fixtures/clean");
    expect(r.error).toBeUndefined();
    expect(r.status).toBe(0);
  });
});
