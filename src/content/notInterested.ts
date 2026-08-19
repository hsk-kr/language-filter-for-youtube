// Clicks through a video's ⋮ menu and selects the recommendation action
// available on that surface: Home has "Not interested"; Shorts instead has
// "Don't recommend this channel". Both actions teach YouTube's feed.

import { findMenuButton, isShortsTile } from "./feed";

export type RecommendationAction = "not-interested" | "do-not-recommend-channel";

// Menus render in the user's UI language; match lowercase substrings. Keep
// these aligned with the languages already covered by the extension's Home
// menu automation.
const ACTION_LABELS: Readonly<Record<RecommendationAction, readonly string[]>> = {
  "not-interested": [
    "not interested",
    "관심 없음",
    "興味なし",
    "不感兴趣",
    "沒有興趣",
    "не интересует",
    "no me interesa",
    "não tenho interesse",
    "ça ne m'intéresse pas",
    "kein interesse",
    "non mi interessa",
  ],
  "do-not-recommend-channel": [
    "don't recommend this channel",
    "do not recommend this channel",
    "채널 추천 안함",
    "おすすめに表示しない",
    "チャンネルをおすすめに表示しない",
    "不推荐此频道",
    "不要推薦這個頻道",
    "не рекомендовать видео с этого канала",
    "no recomendar este canal",
    "não recomendar o canal",
    "ne pas recommander la chaîne",
    "keine videos von diesem kanal empfehlen",
    "non consigliare il canale",
  ],
};

// Items live inside YouTube's global popup container. Restricting the search
// to a visible popup avoids matching similarly structured sidebar entries.
const POPUP_SELECTOR = [
  "ytd-popup-container tp-yt-iron-dropdown",
  "ytd-popup-container ytd-menu-popup-renderer",
  "ytd-popup-container yt-sheet-view-model",
  "ytd-popup-container [role='menu']",
  ".html5-video-player .ytp-popup",
].join(", ");
const MENU_ITEM_SELECTOR = [
  "yt-list-item-view-model",
  "ytd-menu-service-item-renderer",
  "tp-yt-paper-item",
  "[role='menuitem']",
  ".ytp-menuitem",
].join(", ");

// First open can fetch menu contents over the network; be generous.
const MENU_WAIT_TIMEOUT_MS = 4000;
const MENU_POLL_INTERVAL_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  return getComputedStyle(el).display !== "none" && rect.width > 0 && rect.height > 0;
}

function openPopup(): HTMLElement | null {
  for (const popup of document.querySelectorAll<HTMLElement>(POPUP_SELECTOR)) {
    if (isVisible(popup)) return popup;
  }
  return null;
}

function findActionItemIn(root: ParentNode, action: RecommendationAction): HTMLElement | null {
  for (const candidate of root.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR)) {
    if (!isVisible(candidate)) continue;
    const text = (candidate.textContent ?? "")
      .trim()
      .toLowerCase()
      .replaceAll("’", "'")
      .replaceAll("‘", "'");
    if (text && ACTION_LABELS[action].some((label) => text.includes(label))) {
      return candidate;
    }
  }
  return null;
}

function findActionItem(action: RecommendationAction): HTMLElement | null {
  const popup = openPopup();
  const inPopup = popup ? findActionItemIn(popup, action) : null;
  // Shorts menu experiments sometimes mount beside the player instead of in
  // ytd-popup-container. The action label is unique, so a visible global
  // fallback is safer than depending on one popup host.
  return inPopup ?? findActionItemIn(document, action);
}

function closeOpenMenu(menuButton: HTMLElement): void {
  // The button toggles; clicking again closes a still-open menu. Open menus
  // also lock scrolling, so dispatch Escape as a second line of cleanup.
  if (openPopup()) menuButton.click();
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true })
  );
}

export function recommendationActionForTile(tile: HTMLElement): RecommendationAction {
  return isShortsTile(tile) ? "do-not-recommend-channel" : "not-interested";
}

// Returns true when the appropriate recommendation action was clicked; false
// when the menu or item couldn't be found (the caller falls back to hiding).
export async function applyRecommendationAction(tile: HTMLElement): Promise<boolean> {
  const menuButton = findMenuButton(tile);
  if (!menuButton) return false;

  const action = recommendationActionForTile(tile);
  menuButton.click();

  const deadline = performance.now() + MENU_WAIT_TIMEOUT_MS;
  while (performance.now() < deadline) {
    const item = findActionItem(action);
    if (item) {
      item.click();
      return true;
    }
    await sleep(MENU_POLL_INTERVAL_MS);
  }

  closeOpenMenu(menuButton);
  return false;
}
