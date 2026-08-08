// Script-based language detection: deterministic, instant, no model needed.
// A title counts as language X when at least RATIO_THRESHOLD of its letters
// belong to X's script — titles often mix in English words ("서울 VLOG"), so
// requiring 100% would miss most real titles.

import type { LanguageCode } from "./languages";

const RATIO_THRESHOLD = 0.3;
// Titles like "[ENG SUB] 김치찌개 만들기 Kimchi Stew Recipe" are mostly Latin
// letters by count; a dense run of script characters still identifies the
// language even at a lower overall ratio.
const DENSE_MIN_COUNT = 4;
const DENSE_RATIO_THRESHOLD = 0.15;
const MIN_LETTERS = 2;

function matchesScript(count: number, total: number): boolean {
  if (count === 0) return false;
  const ratio = count / total;
  return ratio >= RATIO_THRESHOLD || (count >= DENSE_MIN_COUNT && ratio >= DENSE_RATIO_THRESHOLD);
}

const LETTERS = /[\p{L}\p{M}]/gu;
// Hangul syllables, jamo, compatibility jamo, extended jamo A/B
const HANGUL = /[가-힯ᄀ-ᇿ㄰-㆏ꥠ-꥿ힰ-퟿]/gu;
// Hiragana + katakana
const KANA = /[぀-ゟ゠-ヿ]/gu;
// CJK unified ideographs + extension A
const HAN = /[一-鿿㐀-䶿]/gu;

interface ScriptRule {
  readonly code: LanguageCode;
  readonly pattern: RegExp;
}

const SIMPLE_SCRIPT_RULES: readonly ScriptRule[] = [
  { code: "ru", pattern: /[Ѐ-ӿ]/gu }, // Cyrillic
  { code: "ar", pattern: /[؀-ۿݐ-ݿ]/gu }, // Arabic
  { code: "he", pattern: /[֐-׿]/gu }, // Hebrew
  { code: "th", pattern: /[฀-๿]/gu }, // Thai
  { code: "hi", pattern: /[ऀ-ॿ]/gu }, // Devanagari
];

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

export function detectByScript(text: string): LanguageCode | null {
  const letters = (text.match(LETTERS) ?? []).join("");
  const total = letters.length;
  if (total < MIN_LETTERS) return null;

  if (matchesScript(countMatches(letters, HANGUL), total)) return "ko";

  // Japanese titles mix kanji and kana; Chinese titles are kanji-only.
  const kana = countMatches(letters, KANA);
  const han = countMatches(letters, HAN);
  if (kana > 0 && matchesScript(kana + han, total)) return "ja";
  if (matchesScript(han, total)) return "zh";

  for (const rule of SIMPLE_SCRIPT_RULES) {
    if (matchesScript(countMatches(letters, rule.pattern), total)) return rule.code;
  }
  return null;
}
