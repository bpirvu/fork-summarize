import { buildUserScriptsGuidance, getUserScriptsStatus } from "../../automation/userscripts";
import { readPresetOrCustomValue, resolvePresetOrCustom } from "../../lib/combo";
import { defaultSettings, loadSettings, saveSettings } from "../../lib/settings";
import { applyTheme, type ColorMode, type ColorScheme } from "../../lib/theme";
import { mountCheckbox } from "../../ui/zag-checkbox";
import { createDaemonStatusChecker } from "./daemon-status";
import { createLogsViewer } from "./logs-viewer";
import { createModelPresetsController } from "./model-presets";
import { mountOptionsPickers } from "./pickers";
import { createProcessesViewer } from "./processes-viewer";
import { createSkillsController } from "./skills-controller";
import { createOptionsTabs } from "./tab-controller";

declare const __SUMMARIZE_GIT_HASH__: string;
declare const __SUMMARIZE_VERSION__: string;

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

const formEl = byId<HTMLFormElement>("form");
const statusEl = byId<HTMLSpanElement>("status");

const tokenEl = byId<HTMLInputElement>("token");
const tokenCopyBtn = byId<HTMLButtonElement>("tokenCopy");
const modelPresetEl = byId<HTMLSelectElement>("modelPreset");
const modelCustomEl = byId<HTMLInputElement>("modelCustom");
const languagePresetEl = byId<HTMLSelectElement>("languagePreset");
const languageCustomEl = byId<HTMLInputElement>("languageCustom");
const promptOverrideEl = byId<HTMLTextAreaElement>("promptOverride");
const autoToggleRoot = byId<HTMLDivElement>("autoToggle");
const maxCharsEl = byId<HTMLInputElement>("maxChars");
const hoverPromptEl = byId<HTMLTextAreaElement>("hoverPrompt");
const hoverPromptResetBtn = byId<HTMLButtonElement>("hoverPromptReset");
const chatToggleRoot = byId<HTMLDivElement>("chatToggle");
const automationToggleRoot = byId<HTMLDivElement>("automationToggle");
const automationPermissionsBtn = byId<HTMLButtonElement>("automationPermissions");
const userScriptsNoticeEl = byId<HTMLDivElement>("userScriptsNotice");
const skillsExportBtn = byId<HTMLButtonElement>("skillsExport");
const skillsImportBtn = byId<HTMLButtonElement>("skillsImport");
const skillsSearchEl = byId<HTMLInputElement>("skillsSearch");
const skillsListEl = byId<HTMLDivElement>("skillsList");
const skillsEmptyEl = byId<HTMLDivElement>("skillsEmpty");
const skillsConflictsEl = byId<HTMLDivElement>("skillsImportConflicts");
const hoverSummariesToggleRoot = byId<HTMLDivElement>("hoverSummariesToggle");
const summaryTimestampsToggleRoot = byId<HTMLDivElement>("summaryTimestampsToggle");
const slidesParallelToggleRoot = byId<HTMLDivElement>("slidesParallelToggle");
const slidesOcrToggleRoot = byId<HTMLDivElement>("slidesOcrToggle");
const extendedLoggingToggleRoot = byId<HTMLDivElement>("extendedLoggingToggle");
const autoCliFallbackToggleRoot = byId<HTMLDivElement>("autoCliFallbackToggle");
const autoCliOrderEl = byId<HTMLInputElement>("autoCliOrder");
const requestModeEl = byId<HTMLSelectElement>("requestMode");
const firecrawlModeEl = byId<HTMLSelectElement>("firecrawlMode");
const markdownModeEl = byId<HTMLSelectElement>("markdownMode");
const preprocessModeEl = byId<HTMLSelectElement>("preprocessMode");
const youtubeModeEl = byId<HTMLSelectElement>("youtubeMode");
const transcriberEl = byId<HTMLSelectElement>("transcriber");
const timeoutEl = byId<HTMLInputElement>("timeout");
const retriesEl = byId<HTMLInputElement>("retries");
const maxOutputTokensEl = byId<HTMLInputElement>("maxOutputTokens");
const pickersRoot = byId<HTMLDivElement>("pickersRoot");
const fontFamilyEl = byId<HTMLInputElement>("fontFamily");
const fontSizeEl = byId<HTMLInputElement>("fontSize");
const buildInfoEl = document.getElementById("buildInfo");
const daemonStatusEl = byId<HTMLDivElement>("daemonStatus");
const logsSourceEl = byId<HTMLSelectElement>("logsSource");
const logsTailEl = byId<HTMLInputElement>("logsTail");
const logsRefreshBtn = byId<HTMLButtonElement>("logsRefresh");
const logsAutoEl = byId<HTMLInputElement>("logsAuto");
const logsOutputEl = byId<HTMLDivElement>("logsOutput");
const logsRawEl = byId<HTMLPreElement>("logsRaw");
const logsTableEl = byId<HTMLTableElement>("logsTable");
const logsParsedEl = byId<HTMLInputElement>("logsParsed");
const logsMetaEl = byId<HTMLDivElement>("logsMeta");
const processesRefreshBtn = byId<HTMLButtonElement>("processesRefresh");
const processesAutoEl = byId<HTMLInputElement>("processesAuto");
const processesShowCompletedEl = byId<HTMLInputElement>("processesShowCompleted");
const processesLimitEl = byId<HTMLInputElement>("processesLimit");
const processesStreamEl = byId<HTMLSelectElement>("processesStream");
const processesTailEl = byId<HTMLInputElement>("processesTail");
const processesMetaEl = byId<HTMLDivElement>("processesMeta");
const processesTableEl = byId<HTMLTableElement>("processesTable");
const processesLogsTitleEl = byId<HTMLDivElement>("processesLogsTitle");
const processesLogsCopyBtn = byId<HTMLButtonElement>("processesLogsCopy");
const processesLogsOutputEl = byId<HTMLPreElement>("processesLogsOutput");
const tabsRoot = byId<HTMLDivElement>("tabs");
const tabButtons = Array.from(tabsRoot.querySelectorAll<HTMLButtonElement>("[data-tab]"));
const tabPanels = Array.from(document.querySelectorAll<HTMLElement>("[data-tab-panel]"));

const tabStorageKey = "summarize:options-tab";

let autoValue = defaultSettings.autoSummarize;
let chatEnabledValue = defaultSettings.chatEnabled;
let automationEnabledValue = defaultSettings.automationEnabled;
let hoverSummariesValue = defaultSettings.hoverSummaries;
let summaryTimestampsValue = defaultSettings.summaryTimestamps;
let slidesParallelValue = defaultSettings.slidesParallel;
let slidesOcrEnabledValue = defaultSettings.slidesOcrEnabled;
let extendedLoggingValue = defaultSettings.extendedLogging;
let autoCliFallbackValue = defaultSettings.autoCliFallback;

let isInitializing = true;
let saveTimer = 0;
let saveInFlight = false;
let saveQueued = false;
let saveSequence = 0;

const setStatus = (text: string) => {
  statusEl.textContent = text;
};

const logsLevelInputs = Array.from(
  document.querySelectorAll<HTMLInputElement>("input[data-log-level]"),
);

const logsViewer = createLogsViewer({
  elements: {
    sourceEl: logsSourceEl,
    tailEl: logsTailEl,
    refreshBtn: logsRefreshBtn,
    autoEl: logsAutoEl,
    outputEl: logsOutputEl,
    rawEl: logsRawEl,
    tableEl: logsTableEl,
    parsedEl: logsParsedEl,
    metaEl: logsMetaEl,
    levelInputs: logsLevelInputs,
  },
  getToken: () => tokenEl.value.trim(),
  isActive: () => resolveActiveTab() === "logs",
});

const processesViewer = createProcessesViewer({
  elements: {
    refreshBtn: processesRefreshBtn,
    autoEl: processesAutoEl,
    showCompletedEl: processesShowCompletedEl,
    limitEl: processesLimitEl,
    streamEl: processesStreamEl,
    tailEl: processesTailEl,
    metaEl: processesMetaEl,
    tableEl: processesTableEl,
    logsTitleEl: processesLogsTitleEl,
    logsCopyBtn: processesLogsCopyBtn,
    logsOutputEl: processesLogsOutputEl,
  },
  getToken: () => tokenEl.value.trim(),
  isActive: () => resolveActiveTab() === "processes",
});

const { resolveActiveTab } = createOptionsTabs({
  root: tabsRoot,
  buttons: tabButtons,
  panels: tabPanels,
  storageKey: tabStorageKey,
  onLogsActiveChange: (active) => {
    if (active) {
      logsViewer.handleTabActivated();
    } else {
      logsViewer.handleTabDeactivated();
    }
  },
  onProcessesActiveChange: (active) => {
    if (active) {
      processesViewer.handleTabActivated();
    } else {
      processesViewer.handleTabDeactivated();
    }
  },
});

let statusTimer = 0;
const flashStatus = (text: string, duration = 900) => {
  window.clearTimeout(statusTimer);
  setStatus(text);
  statusTimer = window.setTimeout(() => setStatus(""), duration);
};

const skillsController = createSkillsController({
  elements: {
    searchEl: skillsSearchEl,
    listEl: skillsListEl,
    emptyEl: skillsEmptyEl,
    conflictsEl: skillsConflictsEl,
    exportBtn: skillsExportBtn,
    importBtn: skillsImportBtn,
  },
  setStatus,
  flashStatus,
});

const scheduleAutoSave = (delay = 500) => {
  if (isInitializing) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void saveNow();
  }, delay);
};

const saveNow = async () => {
  if (saveInFlight) {
    saveQueued = true;
    return;
  }
  saveInFlight = true;
  saveQueued = false;
  const currentSeq = ++saveSequence;
  setStatus("Saving…");
  try {
    const current = await loadSettings();
    await saveSettings({
      token: tokenEl.value || defaultSettings.token,
      model: modelPresets.readCurrentValue(),
      length: current.length,
      language: readPresetOrCustomValue({
        presetValue: languagePresetEl.value,
        customValue: languageCustomEl.value,
        defaultValue: defaultSettings.language,
      }),
      promptOverride: promptOverrideEl.value || defaultSettings.promptOverride,
      hoverPrompt: hoverPromptEl.value || defaultSettings.hoverPrompt,
      autoSummarize: autoValue,
      hoverSummaries: hoverSummariesValue,
      chatEnabled: chatEnabledValue,
      automationEnabled: automationEnabledValue,
      slidesEnabled: current.slidesEnabled,
      slidesParallel: slidesParallelValue,
      slidesOcrEnabled: slidesOcrEnabledValue,
      slidesLayout: current.slidesLayout,
      summaryTimestamps: summaryTimestampsValue,
      extendedLogging: extendedLoggingValue,
      autoCliFallback: autoCliFallbackValue,
      autoCliOrder: autoCliOrderEl.value || defaultSettings.autoCliOrder,
      maxChars: Number(maxCharsEl.value) || defaultSettings.maxChars,
      requestMode: requestModeEl.value || defaultSettings.requestMode,
      firecrawlMode: firecrawlModeEl.value || defaultSettings.firecrawlMode,
      markdownMode: markdownModeEl.value || defaultSettings.markdownMode,
      preprocessMode: preprocessModeEl.value || defaultSettings.preprocessMode,
      youtubeMode: youtubeModeEl.value || defaultSettings.youtubeMode,
      transcriber: transcriberEl.value || defaultSettings.transcriber,
      timeout: timeoutEl.value || defaultSettings.timeout,
      retries: (() => {
        const raw = retriesEl.value.trim();
        if (!raw) return defaultSettings.retries;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : defaultSettings.retries;
      })(),
      maxOutputTokens: maxOutputTokensEl.value || defaultSettings.maxOutputTokens,
      colorScheme: currentScheme || defaultSettings.colorScheme,
      colorMode: currentMode || defaultSettings.colorMode,
      fontFamily: fontFamilyEl.value || defaultSettings.fontFamily,
      fontSize: Number(fontSizeEl.value) || defaultSettings.fontSize,
    });
    if (currentSeq === saveSequence) {
      flashStatus("Saved");
    }
  } finally {
    saveInFlight = false;
    if (saveQueued) {
      saveQueued = false;
      void saveNow();
    }
  }
};

const setBuildInfo = () => {
  if (!buildInfoEl) return;
  const version =
    typeof __SUMMARIZE_VERSION__ === "string" && __SUMMARIZE_VERSION__
      ? __SUMMARIZE_VERSION__
      : chrome?.runtime?.getManifest?.().version;
  const hash = typeof __SUMMARIZE_GIT_HASH__ === "string" ? __SUMMARIZE_GIT_HASH__ : "";
  const parts: string[] = [];
  if (version) parts.push(`v${version}`);
  if (hash && hash !== "unknown") parts.push(hash);
  buildInfoEl.textContent = parts.join(" · ");
  buildInfoEl.toggleAttribute("hidden", parts.length === 0);
};

const resolveExtensionVersion = () => {
  const injected =
    typeof __SUMMARIZE_VERSION__ === "string" && __SUMMARIZE_VERSION__ ? __SUMMARIZE_VERSION__ : "";
  return injected || chrome?.runtime?.getManifest?.().version || "";
};

const { checkDaemonStatus } = createDaemonStatusChecker({
  statusEl: daemonStatusEl,
  getExtensionVersion: resolveExtensionVersion,
});

const modelPresets = createModelPresetsController({
  presetEl: modelPresetEl,
  customEl: modelCustomEl,
  defaultValue: defaultSettings.model,
});

const languagePresets = [
  "auto",
  "en",
  "de",
  "es",
  "fr",
  "it",
  "pt",
  "nl",
  "sv",
  "no",
  "da",
  "fi",
  "pl",
  "cs",
  "tr",
  "ru",
  "uk",
  "ar",
  "hi",
  "ja",
  "ko",
  "zh-cn",
  "zh-tw",
];

let currentScheme: ColorScheme = defaultSettings.colorScheme;
let currentMode: ColorMode = defaultSettings.colorMode;

const pickerHandlers = {
  onSchemeChange: (value: ColorScheme) => {
    currentScheme = value;
    applyTheme({ scheme: currentScheme, mode: currentMode });
    scheduleAutoSave(200);
  },
  onModeChange: (value: ColorMode) => {
    currentMode = value;
    applyTheme({ scheme: currentScheme, mode: currentMode });
    scheduleAutoSave(200);
  },
};

const pickers = mountOptionsPickers(pickersRoot, {
  scheme: currentScheme,
  mode: currentMode,
  ...pickerHandlers,
});

const updateAutoToggle = () => {
  autoToggle.update({
    id: "options-auto",
    label: "Auto-summarize when panel is open",
    checked: autoValue,
    onCheckedChange: handleAutoToggleChange,
  });
};
const handleAutoToggleChange = (checked: boolean) => {
  autoValue = checked;
  updateAutoToggle();
  scheduleAutoSave(0);
};
const autoToggle = mountCheckbox(autoToggleRoot, {
  id: "options-auto",
  label: "Auto-summarize when panel is open",
  checked: autoValue,
  onCheckedChange: handleAutoToggleChange,
});

const updateChatToggle = () => {
  chatToggle.update({
    id: "options-chat",
    label: "Enable Chat mode in the side panel",
    checked: chatEnabledValue,
    onCheckedChange: handleChatToggleChange,
  });
};
const handleChatToggleChange = (checked: boolean) => {
  chatEnabledValue = checked;
  updateChatToggle();
  scheduleAutoSave(0);
};
const chatToggle = mountCheckbox(chatToggleRoot, {
  id: "options-chat",
  label: "Enable Chat mode in the side panel",
  checked: chatEnabledValue,
  onCheckedChange: handleChatToggleChange,
});

const updateAutomationToggle = () => {
  automationToggle.update({
    id: "options-automation",
    label: "Enable website automation",
    checked: automationEnabledValue,
    onCheckedChange: handleAutomationToggleChange,
  });
};
const handleAutomationToggleChange = (checked: boolean) => {
  automationEnabledValue = checked;
  updateAutomationToggle();
  scheduleAutoSave(0);
  void updateAutomationPermissionsUi();
};
const automationToggle = mountCheckbox(automationToggleRoot, {
  id: "options-automation",
  label: "Enable website automation",
  checked: automationEnabledValue,
  onCheckedChange: handleAutomationToggleChange,
});

async function updateAutomationPermissionsUi() {
  const status = await getUserScriptsStatus();
  const hasPermission = status.permissionGranted;
  const apiAvailable = status.apiAvailable;

  automationPermissionsBtn.disabled = !chrome.permissions || (hasPermission && apiAvailable);
  automationPermissionsBtn.textContent = hasPermission
    ? "Automation permissions granted"
    : "Enable automation permissions";

  if (!automationEnabledValue) {
    userScriptsNoticeEl.hidden = true;
    return;
  }

  if (apiAvailable && hasPermission) {
    userScriptsNoticeEl.hidden = true;
    return;
  }

  const steps = [buildUserScriptsGuidance(status)].filter(Boolean);

  userScriptsNoticeEl.textContent = steps.join(" ");
  userScriptsNoticeEl.hidden = false;
}

async function requestAutomationPermissions() {
  if (!chrome.permissions) return;
  try {
    const ok = await chrome.permissions.request({
      permissions: ["userScripts"],
    });
    if (!ok) {
      flashStatus("Permission request denied");
    }
  } catch {
    // ignore
  }
  await updateAutomationPermissionsUi();
}

automationPermissionsBtn.addEventListener("click", () => {
  void requestAutomationPermissions();
});
skillsController.bind();

const updateHoverSummariesToggle = () => {
  hoverSummariesToggle.update({
    id: "options-hover-summaries",
    label: "Hover summaries (experimental)",
    checked: hoverSummariesValue,
    onCheckedChange: handleHoverSummariesToggleChange,
  });
};
const handleHoverSummariesToggleChange = (checked: boolean) => {
  hoverSummariesValue = checked;
  updateHoverSummariesToggle();
  scheduleAutoSave(0);
};
const hoverSummariesToggle = mountCheckbox(hoverSummariesToggleRoot, {
  id: "options-hover-summaries",
  label: "Hover summaries (experimental)",
  checked: hoverSummariesValue,
  onCheckedChange: handleHoverSummariesToggleChange,
});

const updateSummaryTimestampsToggle = () => {
  summaryTimestampsToggle.update({
    id: "options-summary-timestamps",
    label: "Summary timestamps (media only)",
    checked: summaryTimestampsValue,
    onCheckedChange: handleSummaryTimestampsToggleChange,
  });
};
const handleSummaryTimestampsToggleChange = (checked: boolean) => {
  summaryTimestampsValue = checked;
  updateSummaryTimestampsToggle();
  scheduleAutoSave(0);
};
const summaryTimestampsToggle = mountCheckbox(summaryTimestampsToggleRoot, {
  id: "options-summary-timestamps",
  label: "Summary timestamps (media only)",
  checked: summaryTimestampsValue,
  onCheckedChange: handleSummaryTimestampsToggleChange,
});

const updateSlidesParallelToggle = () => {
  slidesParallelToggle.update({
    id: "options-slides-parallel",
    label: "Show summary first (parallel slides)",
    checked: slidesParallelValue,
    onCheckedChange: handleSlidesParallelToggleChange,
  });
};
const handleSlidesParallelToggleChange = (checked: boolean) => {
  slidesParallelValue = checked;
  updateSlidesParallelToggle();
  scheduleAutoSave(0);
};
const slidesParallelToggle = mountCheckbox(slidesParallelToggleRoot, {
  id: "options-slides-parallel",
  label: "Show summary first (parallel slides)",
  checked: slidesParallelValue,
  onCheckedChange: handleSlidesParallelToggleChange,
});

const updateSlidesOcrToggle = () => {
  slidesOcrToggle.update({
    id: "options-slides-ocr",
    label: "Enable OCR slide text",
    checked: slidesOcrEnabledValue,
    onCheckedChange: handleSlidesOcrToggleChange,
  });
};
const handleSlidesOcrToggleChange = (checked: boolean) => {
  slidesOcrEnabledValue = checked;
  updateSlidesOcrToggle();
  scheduleAutoSave(0);
};
const slidesOcrToggle = mountCheckbox(slidesOcrToggleRoot, {
  id: "options-slides-ocr",
  label: "Enable OCR slide text",
  checked: slidesOcrEnabledValue,
  onCheckedChange: handleSlidesOcrToggleChange,
});

const updateExtendedLoggingToggle = () => {
  extendedLoggingToggle.update({
    id: "options-extended-logging",
    label: "Extended logging (send full input/output to daemon logs)",
    checked: extendedLoggingValue,
    onCheckedChange: handleExtendedLoggingToggleChange,
  });
};
const handleExtendedLoggingToggleChange = (checked: boolean) => {
  extendedLoggingValue = checked;
  updateExtendedLoggingToggle();
  scheduleAutoSave(0);
};
const extendedLoggingToggle = mountCheckbox(extendedLoggingToggleRoot, {
  id: "options-extended-logging",
  label: "Extended logging (send full input/output to daemon logs)",
  checked: extendedLoggingValue,
  onCheckedChange: handleExtendedLoggingToggleChange,
});

const updateAutoCliFallbackToggle = () => {
  autoCliFallbackToggle.update({
    id: "options-auto-cli-fallback",
    label: "Auto CLI fallback for Auto model",
    checked: autoCliFallbackValue,
    onCheckedChange: handleAutoCliFallbackToggleChange,
  });
};
const handleAutoCliFallbackToggleChange = (checked: boolean) => {
  autoCliFallbackValue = checked;
  updateAutoCliFallbackToggle();
  scheduleAutoSave(0);
};
const autoCliFallbackToggle = mountCheckbox(autoCliFallbackToggleRoot, {
  id: "options-auto-cli-fallback",
  label: "Auto CLI fallback for Auto model",
  checked: autoCliFallbackValue,
  onCheckedChange: handleAutoCliFallbackToggleChange,
});

async function load() {
  const s = await loadSettings();
  tokenEl.value = s.token;
  void checkDaemonStatus(s.token);
  await modelPresets.refreshPresets(s.token);
  modelPresets.setValue(s.model);
  {
    const resolved = resolvePresetOrCustom({ value: s.language, presets: languagePresets });
    languagePresetEl.value = resolved.presetValue;
    languageCustomEl.hidden = !resolved.isCustom;
    languageCustomEl.value = resolved.customValue;
  }
  promptOverrideEl.value = s.promptOverride;
  hoverPromptEl.value = s.hoverPrompt || defaultSettings.hoverPrompt;
  autoValue = s.autoSummarize;
  chatEnabledValue = s.chatEnabled;
  automationEnabledValue = s.automationEnabled;
  hoverSummariesValue = s.hoverSummaries;
  summaryTimestampsValue = s.summaryTimestamps;
  slidesParallelValue = s.slidesParallel;
  slidesOcrEnabledValue = s.slidesOcrEnabled;
  extendedLoggingValue = s.extendedLogging;
  autoCliFallbackValue = s.autoCliFallback;
  updateAutoToggle();
  updateChatToggle();
  updateAutomationToggle();
  updateHoverSummariesToggle();
  updateSummaryTimestampsToggle();
  updateSlidesParallelToggle();
  updateSlidesOcrToggle();
  updateExtendedLoggingToggle();
  updateAutoCliFallbackToggle();
  autoCliOrderEl.value = s.autoCliOrder;
  maxCharsEl.value = String(s.maxChars);
  requestModeEl.value = s.requestMode;
  firecrawlModeEl.value = s.firecrawlMode;
  markdownModeEl.value = s.markdownMode;
  preprocessModeEl.value = s.preprocessMode;
  youtubeModeEl.value = s.youtubeMode;
  transcriberEl.value = s.transcriber;
  timeoutEl.value = s.timeout;
  retriesEl.value = typeof s.retries === "number" ? String(s.retries) : "";
  maxOutputTokensEl.value = s.maxOutputTokens;
  fontFamilyEl.value = s.fontFamily;
  fontSizeEl.value = String(s.fontSize);
  currentScheme = s.colorScheme;
  currentMode = s.colorMode;
  pickers.update({ scheme: currentScheme, mode: currentMode, ...pickerHandlers });
  applyTheme({ scheme: s.colorScheme, mode: s.colorMode });
  await skillsController.load();
  await updateAutomationPermissionsUi();
  if (resolveActiveTab() === "logs") {
    logsViewer.handleTokenChanged();
  }
  if (resolveActiveTab() === "processes") {
    processesViewer.handleTokenChanged();
  }
  isInitializing = false;
}

let refreshTimer = 0;
tokenEl.addEventListener("input", () => {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    void modelPresets.refreshPresets(tokenEl.value);
    void checkDaemonStatus(tokenEl.value);
    logsViewer.handleTokenChanged();
    processesViewer.handleTokenChanged();
  }, 350);
  scheduleAutoSave(600);
});

const copyToken = async () => {
  const token = tokenEl.value.trim();
  if (!token) {
    flashStatus("Token empty");
    return;
  }
  try {
    await navigator.clipboard.writeText(token);
    flashStatus("Token copied");
    return;
  } catch {
    // fallback
  }
  tokenEl.focus();
  tokenEl.select();
  tokenEl.setSelectionRange(0, token.length);
  const ok = document.execCommand("copy");
  flashStatus(ok ? "Token copied" : "Copy failed");
};

tokenCopyBtn.addEventListener("click", () => {
  void copyToken();
});

const refreshModelsIfStale = () => {
  modelPresets.refreshIfStale(tokenEl.value);
};

modelPresetEl.addEventListener("focus", refreshModelsIfStale);
modelPresetEl.addEventListener("pointerdown", refreshModelsIfStale);
modelCustomEl.addEventListener("focus", refreshModelsIfStale);
modelCustomEl.addEventListener("pointerdown", refreshModelsIfStale);

languagePresetEl.addEventListener("change", () => {
  languageCustomEl.hidden = languagePresetEl.value !== "custom";
  if (!languageCustomEl.hidden) languageCustomEl.focus();
  scheduleAutoSave(200);
});

hoverPromptResetBtn.addEventListener("click", () => {
  hoverPromptEl.value = defaultSettings.hoverPrompt;
  scheduleAutoSave(200);
});

modelPresetEl.addEventListener("change", () => {
  modelCustomEl.hidden = modelPresetEl.value !== "custom";
  if (!modelCustomEl.hidden) modelCustomEl.focus();
  scheduleAutoSave(200);
});

modelCustomEl.addEventListener("input", () => {
  scheduleAutoSave(600);
});

languageCustomEl.addEventListener("input", () => {
  scheduleAutoSave(600);
});

promptOverrideEl.addEventListener("input", () => {
  scheduleAutoSave(600);
});

hoverPromptEl.addEventListener("input", () => {
  scheduleAutoSave(600);
});

maxCharsEl.addEventListener("input", () => {
  scheduleAutoSave(400);
});

requestModeEl.addEventListener("change", () => {
  scheduleAutoSave(200);
});

firecrawlModeEl.addEventListener("change", () => {
  scheduleAutoSave(200);
});

markdownModeEl.addEventListener("change", () => {
  scheduleAutoSave(200);
});

preprocessModeEl.addEventListener("change", () => {
  scheduleAutoSave(200);
});

youtubeModeEl.addEventListener("change", () => {
  scheduleAutoSave(200);
});

transcriberEl.addEventListener("change", () => {
  scheduleAutoSave(200);
});

timeoutEl.addEventListener("input", () => {
  scheduleAutoSave(400);
});

retriesEl.addEventListener("input", () => {
  scheduleAutoSave(300);
});

maxOutputTokensEl.addEventListener("input", () => {
  scheduleAutoSave(300);
});

autoCliOrderEl.addEventListener("input", () => {
  scheduleAutoSave(300);
});

fontFamilyEl.addEventListener("input", () => {
  scheduleAutoSave(600);
});

fontSizeEl.addEventListener("input", () => {
  scheduleAutoSave(300);
});

logsSourceEl.addEventListener("change", () => {
  void logsViewer.refresh();
});

logsTailEl.addEventListener("change", () => {
  void logsViewer.refresh();
});

logsParsedEl.addEventListener("change", () => {
  logsViewer.render();
});

for (const input of logsLevelInputs) {
  input.addEventListener("change", () => {
    logsViewer.render();
  });
}

logsAutoEl.addEventListener("change", () => {
  if (logsAutoEl.checked) {
    logsViewer.startAuto();
    void logsViewer.refresh();
  } else {
    logsViewer.stopAuto();
  }
});

window.addEventListener("beforeunload", () => {
  logsViewer.stopAuto();
});

formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  void saveNow();
});

setBuildInfo();
void load();
