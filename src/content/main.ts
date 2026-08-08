// Entry point: watches the YouTube home feed, detects tile language, and
// marks matching videos "Not interested" (or hides them, per settings).

import { detectWithAi } from "../shared/ai";
import { detectByScript } from "../shared/detect";
import { anyNeedsAi, type LanguageCode } from "../shared/languages";
import { loadSettings, watchSettings } from "../shared/storage";
import { validateSettings, type Settings } from "../shared/settings";
import { extractChannelName, extractTitle, findTiles, isHomePath } from "./feed";
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

interface Match {
  readonly language: LanguageCode;
  readonly source: "title" | "channel";
}

function isTarget(language: LanguageCode | null): language is LanguageCode {
  return language !== null && state.settings.targetLanguages.includes(language);
}

async function findMatch(tile: HTMLElement, title: string): Promise<Match | null> {
  const byTitleScript = detectByScript(title);
  if (isTarget(byTitleScript)) return { language: byTitleScript, source: "title" };

  // Only consult the on-device model for titles whose script says nothing,
  // and only when a selected language actually needs it.
  if (byTitleScript === null && anyNeedsAi(state.settings.targetLanguages)) {
    const byTitleAi = await detectWithAi(title);
    if (isTarget(byTitleAi)) return { language: byTitleAi, source: "title" };
  }

  // Channel names catch e.g. Korean channels posting English-titled videos.
  // Script detection only — AI misreads names ("Kurzgesagt" → German).
  if (state.settings.checkChannelName) {
    const channel = extractChannelName(tile);
    if (channel) {
      const byChannel = detectByScript(channel);
      if (isTarget(byChannel)) return { language: byChannel, source: "channel" };
    }
  }
  return null;
}

function filterTile(tile: HTMLElement, title: string, match: Match): void {
  state.filteredCount += 1;
  console.info(
    `[Language Filter] (${String(state.filteredCount)}) ${match.language} via ${match.source}: ${title.slice(0, 60)}`
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
  void findMatch(tile, title).then((match) => {
    if (match) filterTile(tile, title, match);
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
