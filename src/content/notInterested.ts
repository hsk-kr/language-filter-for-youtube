// Clicks through a tile's ⋮ menu and selects "Not interested" — the action
// that actually teaches YouTube's recommendations, unlike merely hiding.
// Flow verified live on the 2025+ lockup layout: the button opens a shared
// tp-yt-iron-dropdown whose items load over the network on first open.

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

// Items live inside the global popup container — never search the whole
// document, or sidebar entries (also role=menuitem-ish) could match.
const DROPDOWN_SELECTOR = "ytd-popup-container tp-yt-iron-dropdown";
const MENU_ITEM_SELECTOR =
  "yt-list-item-view-model, ytd-menu-service-item-renderer, tp-yt-paper-item";

// First open fetches menu contents over the network; be generous.
const MENU_WAIT_TIMEOUT_MS = 4000;
const MENU_POLL_INTERVAL_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function openDropdown(): HTMLElement | null {
  const dropdown = document.querySelector<HTMLElement>(DROPDOWN_SELECTOR);
  if (!dropdown) return null;
  // A closed dropdown keeps its (cached) items in the DOM at display:none —
  // computed display is the reliable open/closed signal.
  return getComputedStyle(dropdown).display !== "none" ? dropdown : null;
}

function findNotInterestedItem(): HTMLElement | null {
  const dropdown = openDropdown();
  if (!dropdown) return null;
  for (const candidate of dropdown.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR)) {
    if (candidate.getBoundingClientRect().width === 0) continue; // hidden
    const text = candidate.textContent?.trim().toLowerCase() ?? "";
    if (text && NOT_INTERESTED_LABELS.some((label) => text.includes(label))) {
      return candidate;
    }
  }
  return null;
}

function closeOpenMenu(menuButton: HTMLElement): void {
  // The button toggles; clicking again closes the (still-open) menu. An
  // open dropdown also locks page scrolling, so this must not be skipped.
  if (openDropdown()) menuButton.click();
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

  closeOpenMenu(menuButton);
  return false;
}
