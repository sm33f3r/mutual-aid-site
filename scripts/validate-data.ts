import { resolve } from "node:path";
import { isRealDate, todayInZone } from "../src/lib/dates";
import { loadCities, validateAll } from "../src/lib/validate";

// Usage: tsx scripts/validate-data.ts [--today=YYYY-MM-DD] [--data=dir]
const args = new Map(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, ...v] = a.slice(2).split("=");
      return [k, v.join("=")] as const;
    }),
);

const override = args.get("today");
if (override !== undefined && !isRealDate(override)) {
  console.error(`Invalid --today value '${override}' (expected YYYY-MM-DD)`);
  process.exit(2);
}
const dataDir = resolve(args.get("data") ?? "data");

const now = new Date();
const todays: Record<string, string> = {};
for (const c of loadCities(dataDir)) todays[c.id] = override ?? todayInZone(c.timezone, now);
const todayText = Object.entries(todays)
  .map(([id, d]) => `${id}=${d}`)
  .join(", ");

const failures = validateAll(dataDir, todays);
for (const f of failures) console.error(`FAIL ${f.file}: ${f.reason}`);
if (failures.length > 0) {
  console.error(`\n${failures.length} validation failure(s) (today: ${todayText})`);
  process.exit(1);
}
console.log(`OK: all data files in ${dataDir} are valid (today: ${todayText})`);
