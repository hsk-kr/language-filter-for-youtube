// Entry point: watches the YouTube home feed, detects tile language, and
// marks matching videos "Not interested" (or hides them, per settings).

import { detectWithAi } from "../shared/ai";
import { detectByScript } from "../shared/detect";
import { anyNeedsAi, type LanguageCode } from "../shared/languages";
import { loadSettings, watchSettings } from "../shared/storage";
import { validateSettings, type Settings } from "../shared/settings";
import { extractTitle, findTiles, isHomePath } from "./feed";
import { markNotInterested } from "./notInterested";
import { createQueue } from "./queue";

const CHECKED_ATTR = "data-lf-checked";
const SCAN_DEBOUNCE_MS = 300;

const state = {
  settings: validateSettings(null) as Settings,
  filteredCount: 0,
};

const queue = createQueue();

function hideTile(tile: HTMLElement): void {
  tile.style.display = "none";
}

async function detectLanguage(title: string): Promise<LanguageCode | null> {
  const byScript = detectByScript(title);
  if (byScript) return byScript;
  // Only consult the on-device model when a selected language needs it.
  if (anyNeedsAi(state.settings.targetLanguages)) return detectWithAi(title);
  return null;
}

function filterTile(tile: HTMLElement, title: string, language: LanguageCode): void {
  state.filteredCount += 1;
  console.info(
    `[Language Filter] (${String(state.filteredCount)}) ${language}: ${title.slice(0, 60)}`
  );
  if (state.settings.mode === "hide") {
    hideTile(tile);
    return;
  }
  queue.push(async () => {
    const ok = await markNotInterested(tile);
    if (!ok) hideTile(tile); // menu not found — at least remove it visually
  });
}

function processTile(tile: HTMLElement): void {
  const title = extractTitle(tile);
  if (!title) return; // tile still rendering; a later scan will catch it
  tile.setAttribute(CHECKED_ATTR, "1");
  void detectLanguage(title).then((language) => {
    if (language && state.settings.targetLanguages.includes(language)) {
      filterTile(tile, title, language);
    }
  });
}

function scan(): void {
  if (!state.settings.enabled) return;
  if (state.settings.targetLanguages.length === 0) return;
  if (!isHomePath(location.pathname)) return;
  for (const tile of findTiles()) {
    if (!tile.hasAttribute(CHECKED_ATTR)) processTile(tile);
  }
}

function resetChecked(): void {
  for (const el of document.querySelectorAll(`[${CHECKED_ATTR}]`)) {
    el.removeAttribute(CHECKED_ATTR);
  }
}

let scanTimer: number | null = null;
function scheduleScan(): void {
  if (scanTimer !== null) return;
  scanTimer = window.setTimeout(() => {
    scanTimer = null;
    scan();
  }, SCAN_DEBOUNCE_MS);
}

async function init(): Promise<void> {
  state.settings = await loadSettings();

  watchSettings((settings) => {
    state.settings = settings;
    resetChecked(); // language list may have changed; re-evaluate everything
    scheduleScan();
  });

  new MutationObserver(scheduleScan).observe(document.body, {
    childList: true,
    subtree: true,
  });
  window.addEventListener("yt-navigate-finish", scheduleScan);

  scan();
}

init().catch((err: unknown) => console.warn("[Language Filter] Initialization failed:", err));
