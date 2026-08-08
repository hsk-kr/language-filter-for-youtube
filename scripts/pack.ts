// Packages dist/ into a store-uploadable zip named after the current
// version, e.g. language-filter-for-youtube-v0.1.0.zip.
// Run via: npm run zip (which builds first).

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(file: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Expected a JSON object in ${file}`);
  }
  return parsed as Record<string, unknown>;
}

function readVersionField(json: Record<string, unknown>, source: string): string {
  const version = json["version"];
  if (typeof version !== "string" || version.length === 0) {
    throw new Error(`${source} has no usable "version" field`);
  }
  return version;
}

const distManifestPath = path.join(projectRoot, "dist", "manifest.json");
if (!fs.existsSync(distManifestPath)) {
  throw new Error("dist/manifest.json not found — run `npm run build` first (or use `npm run zip`).");
}

const pkgVersion = readVersionField(readJson(path.join(projectRoot, "package.json")), "package.json");
const manifestVersion = readVersionField(readJson(distManifestPath), "dist/manifest.json");
if (pkgVersion !== manifestVersion) {
  throw new Error(
    `Version mismatch: package.json is ${pkgVersion} but dist/manifest.json is ${manifestVersion} — rebuild first.`
  );
}

const zipName = `language-filter-for-youtube-v${pkgVersion}.zip`;
const zipPath = path.join(projectRoot, zipName);
fs.rmSync(zipPath, { force: true }); // zip(1) appends to existing archives; start fresh

execFileSync("zip", ["-rqX", zipPath, "."], { cwd: path.join(projectRoot, "dist") });
console.log(`created ${zipName} (manifest version ${manifestVersion})`);
