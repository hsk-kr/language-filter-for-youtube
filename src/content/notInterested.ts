// Clicks through a tile's ⋮ menu and selects "Not interested" — the action
// that actually teaches YouTube's recommendations, unlike merely hiding.

import { findMenuButton } from "./feed";

// The menu renders in the user's UI language; match a lowercase substring.
const NOT_INTERESTED_LABELS = [
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
] as const;

const MENU_ITEM_SELECTOR =
  "ytd-menu-service-item-renderer, tp-yt-paper-item, yt-list-item-view-model, [role='menuitem']";

const MENU_WAIT_TIMEOUT_MS = 1500;
const MENU_POLL_INTERVAL_MS = 100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isVisible(el: HTMLElement): boolean {
  return el.offsetParent !== null;
}

function findNotInterestedItem(): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR);
  for (const candidate of candidates) {
    if (!isVisible(candidate)) continue;
    const text = candidate.textContent?.trim().toLowerCase() ?? "";
    if (text && NOT_INTERESTED_LABELS.some((label) => text.includes(label))) {
      return candidate;
    }
  }
  return null;
}

function closeOpenMenu(): void {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true })
  );
}

// Returns true when "Not interested" was clicked; false when the menu or the
// item couldn't be found (the caller falls back to hiding the tile).
export async function markNotInterested(tile: HTMLElement): Promise<boolean> {
  const menuButton = findMenuButton(tile);
  if (!menuButton) return false;

  menuButton.click();

  const deadline = performance.now() + MENU_WAIT_TIMEOUT_MS;
  while (performance.now() < deadline) {
    const item = findNotInterestedItem();
    if (item) {
      item.click();
      return true;
    }
    await sleep(MENU_POLL_INTERVAL_MS);
  }

  closeOpenMenu();
  return false;
}
