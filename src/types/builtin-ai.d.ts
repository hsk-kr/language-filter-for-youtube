// Minimal ambient types for Chrome's built-in Language Detector API
// (available from Chrome 138; not yet in the standard TS lib).

export {};

declare global {
  interface LanguageDetectionResult {
    readonly detectedLanguage: string;
    readonly confidence: number;
  }

  interface LanguageDetector {
    detect(input: string): Promise<LanguageDetectionResult[]>;
  }

  interface LanguageDetectorConstructor {
    availability(): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
    create(options?: {
      expectedInputLanguages?: readonly string[];
    }): Promise<LanguageDetector>;
  }

  var LanguageDetector: LanguageDetectorConstructor | undefined;
}
