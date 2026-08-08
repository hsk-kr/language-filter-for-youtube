// Settings persistence via chrome.storage.local, shared by the content
// script and the popup. Everything read is re-validated so corrupt values
// can never crash either side.

import { validateSettings, type Settings } from "./settings";

const STORAGE_KEY = "settings";

export async function loadSettings(): Promise<Settings> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    return validateSettings(stored[STORAGE_KEY]);
  } catch (err) {
    console.warn("[Language Filter] Failed to load settings, using defaults:", err);
    return validateSettings(null);
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: validateSettings(settings) });
  } catch (err) {
    console.warn("[Language Filter] Failed to save settings:", err);
  }
}

export function watchSettings(onChange: (settings: Settings) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    const change = changes[STORAGE_KEY];
    if (area === "local" && change) {
      onChange(validateSettings(change.newValue));
    }
  });
}
