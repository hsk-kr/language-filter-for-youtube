import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type UserConfig } from "vite";

const projectRoot = import.meta.dirname;

function readJson(file: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Expected a JSON object in ${file}`);
  }
  return parsed as Record<string, unknown>;
}

// package.json is the single source of truth for the version. The manifest in
// public/ carries a 0.0.0 placeholder; this plugin stamps the real version
// into dist/manifest.json after the bundle and public/ copy are written.
function syncManifestVersion(): Plugin {
  return {
    name: "sync-manifest-version",
    closeBundle() {
      const pkg = readJson(path.join(projectRoot, "package.json"));
      const version = pkg["version"];
      if (typeof version !== "string" || version.length === 0) {
        throw new Error('package.json has no usable "version" field');
      }
      const manifestPath = path.join(projectRoot, "dist", "manifest.json");
      const manifest = readJson(manifestPath);
      fs.writeFileSync(manifestPath, `${JSON.stringify({ ...manifest, version }, null, 2)}\n`);
    },
  };
}

// Two-pass build (MV3 content scripts cannot be ES modules, the popup is a
// normal HTML page — they need different Rollup outputs):
//   vite build               → dist/content.js (IIFE) + public/ copied verbatim
//   vite build --mode popup  → dist/index.html + assets (the action popup)
const contentConfig: UserConfig = {
  plugins: [syncManifestVersion()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "chrome120",
    rollupOptions: {
      input: "src/content/main.ts",
      output: {
        format: "iife",
        entryFileNames: "content.js",
      },
    },
  },
};

const popupConfig: UserConfig = {
  root: "src/popup",
  base: "./",
  publicDir: false,
  build: {
    outDir: path.join(projectRoot, "dist"),
    emptyOutDir: false,
    target: "chrome120",
  },
};

export default defineConfig(({ mode }) => (mode === "popup" ? popupConfig : contentConfig));
