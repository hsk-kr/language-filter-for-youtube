// Selectors for YouTube's home feed. These are YouTube internals and the
// most likely thing to need maintenance — kept here in one place, each as a
// list of candidates tried in order (YouTube ships multiple tile layouts).

export const TILE_SELECTOR = "ytd-rich-item-renderer";

const TITLE_SELECTORS = [
  "#video-title",
  ".ytLockupMetadataViewModelTitle", // 2025+ lockup layout (verified live)
  "a.yt-lockup-metadata-view-model-wiz__title",
  "h3 a span",
  "yt-formatted-string#video-title",
] as const;

// The channel row. Order matters for the lockup layout: querySelector takes
// the first metadata row, which is the channel name (later rows are
// views/date and may contain localized UI text that must not be matched).
const CHANNEL_SELECTORS = [
  ".ytContentMetadataViewModelMetadataText", // 2025+ lockup layout (verified live)
  "ytd-channel-name #text a",
  "ytd-channel-name #text",
  "#channel-name a",
  ".yt-content-metadata-view-model-wiz__metadata-text",
  "a[href^='/@']", // channel-handle link, last resort
] as const;

const MENU_BUTTON_SELECTORS = [
  "ytd-menu-renderer yt-icon-button button",
  "ytd-menu-renderer button[aria-label]",
  "button-view-model button[aria-label]",
  "yt-icon-button#button button",
  "button[aria-label='More actions']",
  // Lockup tiles carry exactly one aria-labeled button — the ⋮ menu
  // (verified live); label text varies with the UI language.
  "button[aria-label]",
] as const;

export function isHomePath(pathname: string): boolean {
  return pathname === "/";
}

export function findTiles(): readonly HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(TILE_SELECTOR));
}

export function extractTitle(tile: HTMLElement): string | null {
  for (const selector of TITLE_SELECTORS) {
    const el = tile.querySelector<HTMLElement>(selector);
    const text = el?.textContent?.trim();
    if (text) return text;
  }
  return null;
}

export function extractChannelName(tile: HTMLElement): string | null {
  for (const selector of CHANNEL_SELECTORS) {
    const el = tile.querySelector<HTMLElement>(selector);
    const text = el?.textContent?.trim();
    if (text) return text;
  }
  return null;
}

export function findMenuButton(tile: HTMLElement): HTMLElement | null {
  for (const selector of MENU_BUTTON_SELECTORS) {
    const el = tile.querySelector<HTMLElement>(selector);
    if (el) return el;
  }
  return null;
}
