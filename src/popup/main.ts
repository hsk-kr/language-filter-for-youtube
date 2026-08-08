// Popup: edit settings; every change saves immediately and the content
// script reacts through chrome.storage.onChanged.

import { aiAvailability } from "../shared/ai";
import { SUPPORTED_LANGUAGES, isLanguageCode, type LanguageCode } from "../shared/languages";
import { FILTER_MODES, type FilterMode, type Settings } from "../shared/settings";
import { loadSettings, saveSettings } from "../shared/storage";

function mustGet<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Popup markup is missing "${selector}"`);
  return el;
}

function renderLanguages(container: HTMLElement, settings: Settings): void {
  for (const lang of SUPPORTED_LANGUAGES) {
    const label = document.createElement("label");
    label.className = "row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "language";
    checkbox.value = lang.code;
    checkbox.checked = settings.targetLanguages.includes(lang.code);

    const text = document.createElement("span");
    text.textContent = lang.label;

    label.append(checkbox, text);
    if (lang.detection === "ai") {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "AI";
      badge.title = "Needs Chrome's built-in language model (Chrome 138+)";
      label.appendChild(badge);
    }
    container.appendChild(label);
  }
}

function readSettingsFromUi(): Settings {
  const enabled = mustGet<HTMLInputElement>("#enabled").checked;

  const modeInput = document.querySelector<HTMLInputElement>("input[name='mode']:checked");
  const mode: FilterMode =
    modeInput && (FILTER_MODES as readonly string[]).includes(modeInput.value)
      ? (modeInput.value as FilterMode)
      : "not-interested";

  const targetLanguages: LanguageCode[] = [];
  for (const box of document.querySelectorAll<HTMLInputElement>("input[name='language']")) {
    if (box.checked && isLanguageCode(box.value)) targetLanguages.push(box.value);
  }

  return { enabled, targetLanguages, mode };
}

async function showAiStatus(el: HTMLElement): Promise<void> {
  const availability = await aiAvailability();
  const messages: Record<string, string> = {
    available: "On-device language model: ready.",
    downloadable: "On-device language model: will download on first use.",
    downloading: "On-device language model: downloading…",
    unavailable:
      "On-device language model: not available in this Chrome — “AI” languages won't match (script-based ones still work).",
  };
  el.textContent = messages[availability] ?? "";
}

async function init(): Promise<void> {
  const settings = await loadSettings();

  const enabledBox = mustGet<HTMLInputElement>("#enabled");
  enabledBox.checked = settings.enabled;

  const modeInput = document.querySelector<HTMLInputElement>(
    `input[name='mode'][value='${settings.mode}']`
  );
  if (modeInput) modeInput.checked = true;

  renderLanguages(mustGet<HTMLElement>("#languages"), settings);

  document.body.addEventListener("change", () => {
    void saveSettings(readSettingsFromUi());
  });

  void showAiStatus(mustGet<HTMLElement>("#ai-status"));
}

init().catch((err: unknown) => {
  console.warn("[Language Filter] Popup failed to initialize:", err);
  document.body.textContent = "Something went wrong loading settings.";
});
