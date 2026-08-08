# Language Filter for YouTube

A Chrome extension that cleans languages you don't want out of your YouTube
home feed: it detects each video's language from its title and automatically
clicks **"Not interested"** for you — which actually teaches YouTube's
recommendations, not just hides the tile (though a hide-only mode exists too).

Built for the "my feed is full of videos in a language I don't watch" problem.

## How language detection works

Three checks per video, fastest first:

1. **Title, script detection (deterministic, instant, offline).** Korean,
   Japanese, Chinese, Russian, Arabic, Hindi, Thai and Hebrew are identified
   by their Unicode script with a ratio + dense-run heuristic, so mixed
   titles like "[ENG SUB] 김치찌개 만들기 Kimchi Stew Recipe" still match.
   No model, no network, no ambiguity.
2. **Title, Chrome's built-in Language Detector API (on-device AI, Chrome
   138+).** Used only for Latin-alphabet languages (Spanish, French, German,
   Portuguese, Italian) that script analysis can't distinguish. The model
   runs locally; nothing is sent anywhere. If unavailable, script-based
   languages keep working.
3. **Channel name, script detection only.** Catches e.g. Korean channels
   posting English-titled videos. Deliberately never uses the AI model —
   channel names mislead it (a channel named with a German word would get an
   English channel filtered). Toggleable in the popup.

## Quick start

Requires Node 24+.

```bash
npm install
npm run build
```

`chrome://extensions` → **Developer mode** → **Load unpacked** → select
**`dist/`**. Then click the extension icon, pick the languages to filter
(e.g. Korean), and open youtube.com.

## Usage

- Configure via the toolbar popup: enable/disable, pick languages, toggle
  channel-name matching, and choose the action — **"Not interested"**
  (default; trains the algorithm) or **hide only**.
- Runs on the **Home feed** (`youtube.com/`) only.
- Menu actions run **one tile at a time with a 700ms gap** (YouTube's ⋮
  menu is a shared popup), so on a match-heavy feed removals appear
  progressively. Each removed video shows YouTube's own "Video removed"
  card with **Undo** — false positives are one click to restore.
- Matched tiles are logged to the DevTools console with a running count and
  the signal that fired (`ko via title` / `ko via channel`).
- Changes in the popup apply immediately, no reload needed.

## Commands

| Command | What it does |
|---|---|
| `npm run build` | Typecheck + build content script (IIFE) and popup → `dist/` |
| `npm run dev` | Rebuild content script on change |
| `npm test` | Vitest unit tests (detection heuristics, settings validation) |
| `npm run icons` | Regenerate `public/icons/*.png` |
| `npm run zip` | Build + create `language-filter-for-youtube-v<version>.zip` |

## Versioning

`package.json` is the single source of truth; `public/manifest.json` holds a
`0.0.0` placeholder that the build stamps into `dist/manifest.json`. Release:
`npm version patch && npm run zip`.

## Known fragility & gaps

Feed tile markup, title/channel/⋮-menu selectors, and the localized "Not
interested" menu-item labels are YouTube internals — all kept as constants
at the top of `src/content/feed.ts` and `src/content/notInterested.ts` for
easy fixing when YouTube ships changes. Selectors were verified against the
live 2025 "lockup" layout (camelCase view-model classes) in August 2026,
with the older kebab-case selectors kept as fallbacks. If the ⋮ menu can't
be driven, the extension falls back to hiding the tile.

Not covered (yet):

- The **Shorts shelf** uses different markup; Shorts aren't filtered.
- Videos whose only visible Korean is **inside the thumbnail image** (English
  title, English channel name) are undetectable from the DOM.
