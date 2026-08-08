import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, FILTER_MODES, validateSettings } from "../src/shared/settings";
import { LANGUAGE_CODES, SUPPORTED_LANGUAGES, isLanguageCode } from "../src/shared/languages";

describe("SUPPORTED_LANGUAGES", () => {
  it("has unique codes", () => {
    expect(new Set(LANGUAGE_CODES).size).toBe(SUPPORTED_LANGUAGES.length);
  });

  it("isLanguageCode accepts every listed code and rejects others", () => {
    for (const code of LANGUAGE_CODES) expect(isLanguageCode(code)).toBe(true);
    expect(isLanguageCode("en")).toBe(false);
    expect(isLanguageCode("")).toBe(false);
    expect(isLanguageCode(42)).toBe(false);
    expect(isLanguageCode(null)).toBe(false);
  });
});

describe("validateSettings", () => {
  it("returns frozen defaults for invalid input", () => {
    for (const raw of [null, undefined, "nope", 7, []]) {
      const settings = validateSettings(raw);
      expect(settings).toEqual(DEFAULT_SETTINGS);
      expect(Object.isFrozen(settings)).toBe(true);
    }
  });

  it("defaults to no languages selected and not-interested mode", () => {
    expect(DEFAULT_SETTINGS.targetLanguages).toEqual([]);
    expect(DEFAULT_SETTINGS.mode).toBe("not-interested");
    expect(FILTER_MODES).toContain(DEFAULT_SETTINGS.mode);
  });

  it("keeps valid languages, drops unknown ones, dedupes", () => {
    const settings = validateSettings({
      targetLanguages: ["ko", "xx", "ko", "ja", 3, null],
    });
    expect(settings.targetLanguages).toEqual(["ko", "ja"]);
  });

  it("repairs invalid mode and enabled values", () => {
    const settings = validateSettings({ enabled: "yes", mode: "obliterate" });
    expect(settings.enabled).toBe(DEFAULT_SETTINGS.enabled);
    expect(settings.mode).toBe(DEFAULT_SETTINGS.mode);
  });

  it("accepts a fully valid object", () => {
    const settings = validateSettings({
      enabled: false,
      targetLanguages: ["ko"],
      mode: "hide",
    });
    expect(settings).toEqual({ enabled: false, targetLanguages: ["ko"], mode: "hide" });
  });
});
