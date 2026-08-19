// Selectors for YouTube's Home and Shorts feeds. These are YouTube internals
// and the most likely thing to need maintenance, so each layout's candidates
// live together here and are tried in order.

export const HOME_TILE_SELECTOR = "ytd-rich-item-renderer";
export const SHORTS_TILE_SELECTOR = "ytd-reel-video-renderer";

const HOME_TITLE_SELECTORS = [
  "#video-title",
  ".ytLockupMetadataViewModelTitle", // 2025+ lockup layout (verified live)
  "a.yt-lockup-metadata-view-model-wiz__title",
  "h3 a span",
  "yt-formatted-string#video-title",
] as const;

const SHORTS_TITLE_SELECTORS = [
  ".ytShortsVideoTitleViewModelShortsVideoTitle", // current view-model layout
  ".yt-shorts-video-title-view-model-wiz__shorts-video-title",
  "yt-shorts-video-title-view-model h2",
  "ytd-reel-player-overlay-renderer #video-title",
  "yt-formatted-string#video-title", // legacy reel layout
] as const;

// The channel row. Order matters for the Home lockup layout: querySelector
// takes the first metadata row, which is the channel name (later rows are
// views/date and may contain localized UI text that must not be matched).
const HOME_CHANNEL_SELECTORS = [
  ".ytContentMetadataViewModelMetadataText", // 2025+ lockup layout (verified live)
  "ytd-channel-name #text a",
  "ytd-channel-name #text",
  "#channel-name a",
  ".yt-content-metadata-view-model-wiz__metadata-text",
  "a[href^='/@']", // channel-handle link, last resort
] as const;

const SHORTS_CHANNEL_SELECTORS = [
  ".ytReelChannelBarViewModelChannelName", // current view-model layout
  ".yt-reel-channel-bar-view-model-wiz__channel-name",
  "yt-reel-channel-bar-view-model h3",
  "ytd-reel-player-header-renderer #channel-name a",
  "ytd-reel-player-header-renderer #channel-name",
  "a[href^='/@']", // channel-handle link, last resort
] as const;

const HOME_MENU_BUTTON_SELECTORS = [
  "ytd-menu-renderer yt-icon-button button",
  "ytd-menu-renderer button[aria-label]",
  "button-view-model button[aria-label]",
  "yt-icon-button#button button",
  "button[aria-label='More actions']",
  // Lockup tiles carry exactly one aria-labeled button — the ⋮ menu
  // (verified live); label text varies with the UI language.
  "button[aria-label]",
] as const;

const SHORTS_MENU_BUTTON_SELECTORS = [
  ".html5-video-player button[aria-label='More actions']",
  "ytd-reel-player-overlay-renderer ytd-menu-renderer yt-icon-button button",
  "ytd-reel-player-overlay-renderer ytd-menu-renderer button[aria-label]",
  "ytd-reel-player-overlay-renderer ytd-menu-renderer button",
  "ytd-menu-renderer yt-icon-button button",
  "ytd-menu-renderer button[aria-label]",
  "button[aria-label='More actions']",
] as const;

export function isHomePath(pathname: string): boolean {
  return pathname === "/";
}

export function isShortsPath(pathname: string): boolean {
  return pathname === "/shorts" || pathname.startsWith("/shorts/");
}

export function isSupportedPath(pathname: string): boolean {
  return isHomePath(pathname) || isShortsPath(pathname);
}

export function isShortsTile(tile: HTMLElement): boolean {
  return tile.matches(SHORTS_TILE_SELECTOR);
}

// Shorts can show a translated title in the reel while retaining the
// creator's original title in the browser tab. Strip YouTube's tab chrome so
// language detection sees the original text (e.g. Korean instead of English).
export function normalizeYouTubePageTitle(rawTitle: string): string | null {
  const title = rawTitle
    .trim()
    .replace(/^\(\d+\)\s*/, "")
    .replace(/\s+-\s+YouTube(?:\s+Shorts)?$/i, "")
    .trim();
  return title && !/^YouTube(?:\s+Shorts)?$/i.test(title) ? title : null;
}

function isAtViewportCenter(tile: HTMLElement): boolean {
  const rect = tile.getBoundingClientRect();
  const viewportCenter = window.innerHeight / 2;
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.top <= viewportCenter &&
    rect.bottom >= viewportCenter
  );
}

function findActiveShortsTiles(): readonly HTMLElement[] {
  const tiles = Array.from(document.querySelectorAll<HTMLElement>(SHORTS_TILE_SELECTOR));
  const explicitlyActive = tiles.filter(
    (tile) => tile.hasAttribute("is-active") || tile.hasAttribute("active")
  );
  // YouTube normally exposes `is-active`; the geometry fallback covers reel
  // variants that keep that state as a JavaScript property instead.
  return explicitlyActive.length > 0 ? explicitlyActive : tiles.filter(isAtViewportCenter);
}

export function findTiles(pathname: string): readonly HTMLElement[] {
  if (isHomePath(pathname)) {
    return Array.from(document.querySelectorAll<HTMLElement>(HOME_TILE_SELECTOR));
  }
  if (isShortsPath(pathname)) return findActiveShortsTiles();
  return [];
}

function extractFirstText(tile: HTMLElement, selectors: readonly string[]): string | null {
  for (const selector of selectors) {
    const el = tile.querySelector<HTMLElement>(selector);
    const text = el?.textContent?.trim();
    if (text) return text;
  }
  return null;
}

export function extractTitle(tile: HTMLElement): string | null {
  if (isShortsTile(tile)) {
    return (
      normalizeYouTubePageTitle(document.title) ??
      extractFirstText(tile, SHORTS_TITLE_SELECTORS)
    );
  }
  return extractFirstText(tile, HOME_TITLE_SELECTORS);
}

export function extractChannelName(tile: HTMLElement): string | null {
  return extractFirstText(
    tile,
    isShortsTile(tile) ? SHORTS_CHANNEL_SELECTORS : HOME_CHANNEL_SELECTORS
  );
}

export function findMenuButton(tile: HTMLElement): HTMLElement | null {
  const selectors = isShortsTile(tile)
    ? SHORTS_MENU_BUTTON_SELECTORS
    : HOME_MENU_BUTTON_SELECTORS;
  for (const selector of selectors) {
    const el = tile.querySelector<HTMLElement>(selector);
    if (el) return el;
  }
  return null;
}
