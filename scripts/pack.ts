// Packages dist/ into a store-uploadable zip named after the current
// version, e.g. language-filter-for-youtube-v0.1.0.zip.
// Run via: npm run zip (which builds first).

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const distPath = path.join(projectRoot, "dist");

const REQUIRED_FILES = [
  "manifest.json",
  "content.js",
  "index.html",
  "icons/icon16.png",
  "icons/icon32.png",
  "icons/icon48.png",
  "icons/icon128.png",
] as const;

// These should never be shipped to the Web Store. The build does not create
// them today; this guard prevents future config changes from leaking source,
// credentials, local environment files, or macOS archive noise.
const BLOCKED_FILE = /(^|\/)(?:\.DS_Store|\.env(?:\..*)?|[^/]+\.(?:map|pem|key|p12|pfx|ts|tsx))$/i;

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

function listFiles(directory: string, relativeTo = directory): readonly string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(absolutePath, relativeTo));
    } else if (entry.isFile()) {
      files.push(path.relative(relativeTo, absolutePath).split(path.sep).join("/"));
    }
  }
  return files.sort();
}

const distManifestPath = path.join(distPath, "manifest.json");
if (!fs.existsSync(distManifestPath)) {
  throw new Error("dist/manifest.json not found — run `npm run build` first (or use `npm run zip`).");
}

const distFiles = listFiles(distPath);
for (const requiredFile of REQUIRED_FILES) {
  if (!distFiles.includes(requiredFile)) {
    throw new Error(`Required extension file is missing from dist/: ${requiredFile}`);
  }
}
const blockedFiles = distFiles.filter((file) => BLOCKED_FILE.test(file));
if (blockedFiles.length > 0) {
  throw new Error(`Refusing to package blocked files:\n${blockedFiles.join("\n")}`);
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

execFileSync("zip", ["-rqX", zipPath, "."], { cwd: distPath });

const archiveFiles = execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" })
  .split(/\r?\n/u)
  .filter((entry) => entry.length > 0 && !entry.endsWith("/"))
  .sort();
if (archiveFiles.join("\n") !== distFiles.join("\n")) {
  throw new Error("ZIP contents do not exactly match dist/.");
}
if (!archiveFiles.includes("manifest.json")) {
  throw new Error("ZIP is missing manifest.json at its root.");
}

const sizeKiB = Math.ceil(fs.statSync(zipPath).size / 1024);
console.log(
  `created ${zipName} (${String(sizeKiB)} KiB, ${String(archiveFiles.length)} files, manifest ${manifestVersion})`
);
