// Pure settings model + validation. Storage I/O lives in storage.ts so this
// file stays unit-testable in Node.

import { isLanguageCode, type LanguageCode } from "./languages";

export const FILTER_MODES = ["not-interested", "hide"] as const;
export type FilterMode = (typeof FILTER_MODES)[number];

export interface Settings {
  readonly enabled: boolean;
  readonly targetLanguages: readonly LanguageCode[];
  readonly mode: FilterMode;
  // Also match the channel name (script detection only — AI is too
  // error-prone on names, e.g. "Kurzgesagt" would read as German).
  readonly checkChannelName: boolean;
}

export const DEFAULT_SETTINGS: Settings = Object.freeze({
  enabled: true,
  // Empty by default on purpose: the extension does nothing until the user
  // explicitly chooses languages in the popup.
  targetLanguages: Object.freeze([]) as readonly LanguageCode[],
  mode: "not-interested",
  checkChannelName: true,
});

export function validateSettings(raw: unknown): Settings {
  const src: Record<string, unknown> =
    raw !== null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const rawLangs: readonly unknown[] = Array.isArray(src["targetLanguages"])
    ? src["targetLanguages"]
    : [];
  const targetLanguages = Object.freeze([...new Set(rawLangs.filter(isLanguageCode))]);

  const rawMode = src["mode"];
  const mode: FilterMode =
    typeof rawMode === "string" && (FILTER_MODES as readonly string[]).includes(rawMode)
      ? (rawMode as FilterMode)
      : DEFAULT_SETTINGS.mode;

  return Object.freeze({
    enabled: typeof src["enabled"] === "boolean" ? src["enabled"] : DEFAULT_SETTINGS.enabled,
    targetLanguages,
    mode,
    checkChannelName:
      typeof src["checkChannelName"] === "boolean"
        ? src["checkChannelName"]
        : DEFAULT_SETTINGS.checkChannelName,
  });
}
