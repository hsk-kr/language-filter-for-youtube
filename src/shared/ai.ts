// Wrapper around Chrome's built-in Language Detector API (Chrome 138+,
// on-device, no network). Used only for Latin-script languages that the
// deterministic script check in detect.ts cannot distinguish.

import { isLanguageCode, type LanguageCode } from "./languages";

const MIN_CONFIDENCE = 0.6; // titles are short; below this it's a guess

let detectorPromise: Promise<LanguageDetector | null> | null = null;

export async function aiAvailability(): Promise<string> {
  if (typeof LanguageDetector === "undefined") return "unavailable";
  try {
    return await LanguageDetector.availability();
  } catch {
    return "unavailable";
  }
}

function getDetector(): Promise<LanguageDetector | null> {
  detectorPromise ??= (async () => {
    if (typeof LanguageDetector === "undefined") return null;
    try {
      const availability = await LanguageDetector.availability();
      if (availability === "unavailable") return null;
      // create() also triggers the one-time model download when the state
      // is "downloadable"; until it finishes, detection just returns null.
      return await LanguageDetector.create();
    } catch (err) {
      console.warn("[Language Filter] Built-in language detector unavailable:", err);
      return null;
    }
  })();
  return detectorPromise;
}

export async function detectWithAi(text: string): Promise<LanguageCode | null> {
  const detector = await getDetector();
  if (!detector) return null;
  try {
    const results = await detector.detect(text);
    const top = results[0];
    if (!top || top.confidence < MIN_CONFIDENCE) return null;
    const code = top.detectedLanguage.split("-")[0] ?? "";
    return isLanguageCode(code) ? code : null;
  } catch (err) {
    console.warn("[Language Filter] Language detection failed:", err);
    return null;
  }
}
