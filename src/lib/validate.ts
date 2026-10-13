import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { ZodType } from "zod";
import { CitiesSchema, type City } from "../schemas/city";
import { createListingSchema } from "../schemas/listing";
import { LogEntrySchema } from "../schemas/log";
import { NewsPostSchema } from "../schemas/news";

export interface Failure {
  file: string;
  reason: string;
}

function readJson(path: string): { ok: true; value: unknown } | { ok: false; reason: string } {
  try {
    return { ok: true, value: JSON.parse(readFileSync(path, "utf8")) };
  } catch (e) {
    return { ok: false, reason: `invalid JSON: ${(e as Error).message}` };
  }
}

function check(path: string, schema: ZodType, rootDir: string, out: Failure[]): unknown {
  const file = relative(rootDir, path) || path;
  const json = readJson(path);
  if (!json.ok) {
    out.push({ file, reason: json.reason });
    return undefined;
  }
  const res = schema.safeParse(json.value);
  if (!res.success) {
    for (const issue of res.error.issues) {
      const where = issue.path.length ? issue.path.join(".") : "(root)";
      out.push({ file, reason: `${where}: ${issue.message}` });
    }
    return undefined;
  }
  return res.data;
}

/** Lists *.json files in a directory; non-JSON files (other than dotfiles) are reported. */
function jsonFiles(dir: string, rootDir: string, out: Failure[]): string[] {
  if (!existsSync(dir)) return [];
  const names: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      out.push({ file: relative(rootDir, p), reason: "unexpected directory" });
    } else if (!name.endsWith(".json")) {
      out.push({ file: relative(rootDir, p), reason: "unexpected non-JSON file" });
    } else {
      names.push(name);
    }
  }
  return names;
}

/** Cities from cities.json, or [] if the file is missing or invalid (validateAll reports why). */
export function loadCities(dataDir: string): City[] {
  const path = join(dataDir, "cities.json");
  if (!existsSync(path)) return [];
  const json = readJson(path);
  if (!json.ok) return [];
  const res = CitiesSchema.safeParse(json.value);
  return res.success ? res.data : [];
}

/**
 * Validates every data file under `dataDir`. Paths in failures are relative to `rootDir`.
 * `today` is one date for every city, or a map of city id to that city's local date.
 */
export function validateAll(
  dataDir: string,
  today: string | Record<string, string>,
  rootDir: string = process.cwd(),
): Failure[] {
  const failures: Failure[] = [];

  const citiesPath = join(dataDir, "cities.json");
  let cityIds: string[] = [];
  if (!existsSync(citiesPath)) {
    failures.push({ file: relative(rootDir, citiesPath), reason: "file not found" });
  } else {
    const cities = check(citiesPath, CitiesSchema, rootDir, failures) as { id: string }[] | undefined;
    cityIds = cities?.map((c) => c.id) ?? [];
  }

  const todayFor = (cityId: string): string =>
    typeof today === "string" ? today : (today[cityId] ?? Object.values(today)[0] ?? "");
  const listingsDir = join(dataDir, "listings");
  if (existsSync(listingsDir)) {
    for (const folder of readdirSync(listingsDir).sort()) {
      if (folder.startsWith(".")) continue;
      const folderPath = join(listingsDir, folder);
      if (!statSync(folderPath).isDirectory()) {
        failures.push({ file: relative(rootDir, folderPath), reason: "unexpected file in listings/" });
        continue;
      }
      if (!cityIds.includes(folder)) {
        failures.push({
          file: relative(rootDir, folderPath),
          reason: `folder '${folder}' is not a city in cities.json`,
        });
      }
      const listingSchema = createListingSchema({ today: todayFor(folder), cityIds });
      for (const name of jsonFiles(folderPath, rootDir, failures)) {
        const path = join(folderPath, name);
        const data = check(path, listingSchema, rootDir, failures) as { id: string; city: string } | undefined;
        if (!data) continue;
        const file = relative(rootDir, path);
        if (data.city !== folder) {
          failures.push({ file, reason: `city: '${data.city}' does not match folder '${folder}'` });
        }
        if (`${data.id}.json` !== name) {
          failures.push({ file, reason: `id: '${data.id}' does not match filename '${name}'` });
        }
      }
    }
  }

  for (const [sub, schema] of [
    ["log", LogEntrySchema],
    ["news", NewsPostSchema],
  ] as const) {
    const dir = join(dataDir, sub);
    for (const name of jsonFiles(dir, rootDir, failures)) check(join(dir, name), schema, rootDir, failures);
  }

  return failures;
}
