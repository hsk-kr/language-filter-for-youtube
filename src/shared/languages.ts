// The closed set of filterable languages. "script" languages are detected
// deterministically from their Unicode script; "ai" languages share the Latin
// alphabet and need Chrome's built-in Language Detector model.

export const SUPPORTED_LANGUAGES = [
  { code: "ko", label: "Korean", detection: "script" },
  { code: "ja", label: "Japanese", detection: "script" },
  { code: "zh", label: "Chinese", detection: "script" },
  { code: "ru", label: "Russian", detection: "script" },
  { code: "ar", label: "Arabic", detection: "script" },
  { code: "hi", label: "Hindi", detection: "script" },
  { code: "th", label: "Thai", detection: "script" },
  { code: "he", label: "Hebrew", detection: "script" },
  { code: "es", label: "Spanish", detection: "ai" },
  { code: "fr", label: "French", detection: "ai" },
  { code: "de", label: "German", detection: "ai" },
  { code: "pt", label: "Portuguese", detection: "ai" },
  { code: "it", label: "Italian", detection: "ai" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export type LanguageCode = SupportedLanguage["code"];
export type DetectionKind = SupportedLanguage["detection"];

export const LANGUAGE_CODES: readonly LanguageCode[] = SUPPORTED_LANGUAGES.map((l) => l.code);

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && (LANGUAGE_CODES as readonly string[]).includes(value);
}

export function detectionKind(code: LanguageCode): DetectionKind {
  const entry = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return entry ? entry.detection : "script";
}

export function anyNeedsAi(codes: readonly LanguageCode[]): boolean {
  return codes.some((code) => detectionKind(code) === "ai");
}
