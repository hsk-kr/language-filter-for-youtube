# Architecture

## Flow

```
Home/Shorts DOM ──MutationObserver (debounced 300ms)──▶ scan()
  └─ for each unchecked Home tile or active Shorts renderer:
       extractTitle() ─▶ detectByScript() ──match──▶ filterTile()
                          └─ null + AI language selected ─▶ detectWithAi()
filterTile():
  mode "hide"           → display:none
  mode "not-interested" → action queue → open ⋮ menu
                          ├─ Home: click "Not interested"
                          └─ Shorts: click "Don't recommend this channel"
                          (700ms between actions; falls back to hide on failure)
```

## Modules

| Module | Responsibility | DOM? | chrome.*? |
|---|---|---|---|
| `shared/languages.ts` | Closed language set (const tuple + derived unions) | no | no |
| `shared/detect.ts` | Script-based detection heuristics — fully unit-tested | no | no |
| `shared/ai.ts` | Chrome built-in Language Detector wrapper (lazy, cached) | no | no |
| `shared/settings.ts` | Settings model + validation (pure) | no | no |
| `shared/storage.ts` | chrome.storage.local load/save/watch | no | yes |
| `content/feed.ts` | Home/Shorts paths and selectors: videos, metadata, ⋮ buttons | yes | no |
| `content/notInterested.ts` | Surface-aware menu automation with localized label matching | yes | no |
| `content/queue.ts` | Sequential action queue (menus are a global singleton) | yes | no |
| `content/main.ts` | Wiring: observer, navigation, settings reactions | yes | via storage |
| `popup/*` | Settings UI (separate Vite pass, ES modules) | yes | via storage |

## Key decisions

- **Recommendation actions over hiding** — hiding is cosmetic; Home's "Not
  interested" and Shorts' "Don't recommend this channel" feed YouTube a
  recommendation signal. Hide remains a mode and the automatic fallback when
  the menu can't be driven.
- **Script detection before AI** — deterministic Unicode checks cover the
  requested use case (Korean) with zero latency and zero dependencies; the
  on-device model is an enhancement, never a requirement.
- **Dense-run heuristic** — ratio ≥ 0.3 of letters, OR ≥ 4 script characters
  at ratio ≥ 0.15, so English-heavy hybrid titles still match without false
  positives on a stray word.
- **Menu clicks are queued** — YouTube renders one global popup menu;
  concurrent opens race. One action per 700ms, sequential.
- **Only the active Short is scanned** — adjacent Shorts are preloaded but
  their menu controls aren't interactable. Active-state attribute changes are
  observed so each Short is evaluated as the reel advances.
- **Original Shorts title over translated UI** — YouTube can render an English
  translation in the reel while keeping the creator's Korean title in the
  browser tab. Shorts detection normalizes and prefers that page title.

## Chrome built-in AI notes

`LanguageDetector` (Chrome 138+): `availability()` →
unavailable / downloadable / downloading / available; `create()` triggers the
one-time model download when downloadable. The wrapper caches one detector
promise, maps BCP-47 results to the supported-code union, and rejects
confidence < 0.6 (feed titles are short). All processing is on-device.
