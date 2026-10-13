import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** Returns the ids (filenames without .json) of all listings whose id starts with "sample-". */
export function findSampleIds(listingsDir: string): string[] {
  if (!existsSync(listingsDir)) return [];
  const ids: string[] = [];
  for (const folder of readdirSync(listingsDir)) {
    const p = join(listingsDir, folder);
    if (!statSync(p).isDirectory()) continue;
    for (const name of readdirSync(p)) {
      if (name.endsWith(".json") && name.startsWith("sample-")) ids.push(name.slice(0, -".json".length));
    }
  }
  return ids.sort();
}
