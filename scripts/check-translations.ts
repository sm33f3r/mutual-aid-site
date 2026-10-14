import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Usage: tsx scripts/check-translations.ts [i18nDir]
// Fails if en.json and ko.json have different keys, or if any string still has a [PLACEHOLDER] / [KO-TODO] marker.
const dir = resolve(process.argv[2] ?? "i18n");
const MARKERS = ["[PLACEHOLDER]", "[KO-TODO]"];
const langs = ["en", "ko"];

const dicts = Object.fromEntries(
  langs.map((l) => [l, JSON.parse(readFileSync(resolve(dir, `${l}.json`), "utf8")) as Record<string, string>]),
);

let problems = 0;
const report = (msg: string) => {
  problems++;
  console.error(msg);
};

const allKeys = new Set(langs.flatMap((l) => Object.keys(dicts[l] as object)));
for (const key of [...allKeys].sort()) {
  for (const l of langs) {
    if (!(key in (dicts[l] as object))) report(`MISSING KEY  ${l}.json: ${key}`);
  }
}
for (const l of langs) {
  for (const [key, value] of Object.entries(dicts[l] as Record<string, string>)) {
    const marker = MARKERS.find((m) => value.includes(m));
    if (marker) report(`MARKER ${marker}  ${l}.json: ${key}`);
  }
}

if (problems > 0) {
  console.error(`\nFAIL: ${problems} translation problem(s)`);
  process.exit(1);
}
console.log("OK: translations are complete and in sync");
