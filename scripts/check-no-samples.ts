import { join, resolve } from "node:path";
import { findSampleIds } from "../src/lib/samples";

// Usage: tsx scripts/check-no-samples.ts [dataDir]
const dataDir = resolve(process.argv[2] ?? "data");
const ids = findSampleIds(join(dataDir, "listings"));

if (ids.length > 0) {
  console.error(`FAIL: ${ids.length} sample listing(s) still present:`);
  for (const id of ids) console.error(`  ${id}`);
  process.exit(1);
}
console.log("OK: no sample listings found");
