import {
  createBridgeSession,
  dispatchBridgeInput,
  bridgeSessionHash,
  createBridgeReplay,
  replayBridgeSession,
} from "../../src/core/device-runtime.mjs";
import { MDC2060_ADAPTER } from "../../src/devices/mdc2060/adapter.mjs";
import {
  MDC2060_ID,
  MDC2060_RANGES,
  formatRangeValue,
} from "../../src/devices/mdc2060/spec.mjs";
import {
  MDC2060_COASTAL_SCENARIO,
  MDC2060_SCENARIOS,
  getMdc2060ScenarioById,
  createCustomOwnshipScenario,
} from "../../src/devices/mdc2060/scenarios.mjs";
import {
  MDC2060_SETTINGS_STORAGE_KEY,
  encodeMdc2060Settings,
  decodeMdc2060Settings,
} from "../../src/devices/mdc2060/model.mjs";
import { projectAisTargets } from "../../src/devices/mdc2060/arpa-ais.mjs";
import {
  tMdc2060,
  localizeMdc2060PowerMode,
  localizeMdc2060Choice,
  localizeMdc2060Alarm,
} from "../../src/devices/mdc2060/i18n.mjs";
import {
  MDC2060_LESSONS,
  getMdc2060Lesson,
  assessMdc2060Lesson,
} from "../../src/devices/mdc2060/lessons.mjs";
import { FCV588_ADAPTER } from "../../src/devices/fcv588/adapter.mjs";
import {
  createMdc2060PpiRenderer,
  getScopeGeometry,
} from "./ppi-renderer.mjs";
import {
  bindHoldControl,
  createFcvHardwareBuzzer,
  bindMdc2060RotaryControl,
  bindMdc2060RepeatPadControl,
  bindMdc2060PpiPointer,
  shouldRouteMdc2060Shortcut,
  classifyMdc2060HardwareSound,
  bindMdc2060InstructorTabs,
} from "./input-controls.mjs";

const SETTINGS_TRANSFER_SCHEMA = "MDC2060_SETTINGS_TRANSFER_V1";
const SETTINGS_TRANSFER_MAX_BYTES = 18000;
const UTF8_ENCODER = new TextEncoder();
function utf8ByteLength(str) {
  return UTF8_ENCODER.encode(str).byteLength;
}
const REPLAY_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
const SETTINGS_TRANSFER_KEYS = Object.freeze([
  "encodedSettings",
  "schema",
  "settingsStorageKey",
  "trainingOnly",
]);
const ALARM_ID_TO_I18N = Object.freeze({
  ATA_CPA_DANGER: "cpaDanger",
  AIS_CPA_DANGER: "aisCpaDanger",
  GUARD_ZONE_IN: "guardIn",
  GUARD_ZONE_OUT: "guardOut",
});
const DEG_TO_RAD = Math.PI / 180;

function normalizeDeg360(deg) {
  if (!Number.isFinite(deg)) return 0;
  const m = deg % 360;
  return m < 0 ? m + 360 : m;
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function encodeSettingsTransferDocument(settings, preEncoded = null) {
  const encodedSettings = typeof preEncoded === "string" ? preEncoded : encodeMdc2060Settings(settings);
  return JSON.stringify(
    {
      schema: SETTINGS_TRANSFER_SCHEMA,
      trainingOnly: true,
      settingsStorageKey: MDC2060_SETTINGS_STORAGE_KEY,
      encodedSettings,
    },
    null,
    2,
  );
}

function decodeSettingsTransferDocument(rawText) {
  if (typeof rawText !== "string" || rawText.length === 0 ||
      rawText.length > SETTINGS_TRANSFER_MAX_BYTES ||
      utf8ByteLength(rawText) > SETTINGS_TRANSFER_MAX_BYTES) {
    return { ok: false, reason: "Kích thước tệp cấu hình không hợp lệ." };
  }
  let parsed = null;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, reason: "Tệp không phải JSON hợp lệ." };
  }
  if (!isPlainObject(parsed)) {
    return { ok: false, reason: "Cấu trúc gốc JSON phải là đối tượng phẳng." };
  }
  const keys = Reflect.ownKeys(parsed).sort();
  if (keys.length !== SETTINGS_TRANSFER_KEYS.length ||
      keys.some((k, idx) => k !== SETTINGS_TRANSFER_KEYS[idx])) {
    return { ok: false, reason: "Tệp cấu hình chứa trường không nằm trong danh sách cho phép." };
  }
  if (parsed.schema !== SETTINGS_TRANSFER_SCHEMA ||
      parsed.trainingOnly !== true ||
      parsed.settingsStorageKey !== MDC2060_SETTINGS_STORAGE_KEY ||
      typeof parsed.encodedSettings !== "string") {
    return { ok: false, reason: "Tiêu đề schema hoặc khóa lưu trữ MDC-2060 không khớp." };
  }
  const decoded = decodeMdc2060Settings(parsed.encodedSettings);
  if (!decoded) {
    return { ok: false, reason: "Nội dung cấu hình không hợp lệ hoặc sai mã kiểm chứng." };
  }
  return { ok: true, settings: decoded };
}

function decodeSettingsImportPayload(rawText) {
  if (typeof rawText !== "string" || rawText.length === 0 ||
      rawText.length > SETTINGS_TRANSFER_MAX_BYTES ||
      utf8ByteLength(rawText) > SETTINGS_TRANSFER_MAX_BYTES) {
    return { ok: false, reason: "Kích thước cấu hình không hợp lệ." };
  }
  const trimmed = rawText.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: "Nội dung cấu hình trống." };
  }
  const directDecoded = decodeMdc2060Settings(trimmed);
  if (directDecoded) {
    return { ok: true, settings: directDecoded };
  }
  return decodeSettingsTransferDocument(trimmed);
}

function downloadJsonFile(filename, content) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeStorageGet(key) {
  try {
    return window.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    window.localStorage?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeStorageRemove(key) {
  try {
    window.localStorage?.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function formatBottomClassification(bc) {
  if (!bc) return "--";
  if (typeof bc === "string") return bc;
  const classes = bc.classes && typeof bc.classes === "object" ? bc.classes : null;
  if (!classes) return "--";
  const entries = Object.entries(classes)
    .filter(([, v]) => Number.isFinite(v) && v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);
  if (entries.length === 0) return "--";
  return entries.map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(" / ");
}

function projectTargetToMainPpi(target, state) {
  const geom = getScopeGeometry(state.settings.screenMode);
  const scope = geom.main;
  const rangeNm = (MDC2060_RANGES[state.rangeIndex] ?? MDC2060_RANGES[10]).nm;
  let origin = { xFrac: 0, yFrac: 0 };
  if (state.effectiveModes.motionMode === "TM") origin = state.tmOffset;
  else if (state.settings.offCenter === "ON") origin = state.offCenterOffset;

  let topRef = state.ownshipSnapshot.hdgDeg ?? 0;
  if (state.effectiveModes.presentationMode === "N-UP") topRef = 0;
  else if (state.effectiveModes.presentationMode === "C-UP" || state.effectiveModes.presentationMode === "W-UP") {
    topRef = state.ownshipSnapshot.cogDeg ?? topRef;
  }

  const scRad = normalizeDeg360(target.bearingDeg - topRef) * DEG_TO_RAD;
  const rNorm = target.rangeNm / rangeNm;
  const xFrac = origin.xFrac + rNorm * Math.sin(scRad);
  const yFrac = origin.yFrac - rNorm * Math.cos(scRad);
  const x = Math.max(0, Math.min(480, Math.round(scope.cx + xFrac * scope.radius)));
  const y = Math.max(0, Math.min(640, Math.round(scope.cy + yFrac * scope.radius)));
  const diskRadius = Math.hypot(xFrac, yFrac);
  const insideDisk = diskRadius <= 0.96;
  const validForMainHit = diskRadius > 0.025 && insideDisk &&
    (state.settings.screenMode !== "PPI/PPI" || y <= 318);
  return { x, y, xFrac, yFrac, rNorm, insideDisk, validForMainHit };
}

function bootMdc2060App() {
  const canvas = document.getElementById("ppi-canvas");
  if (!canvas) return;

  const els = {
    canvas,
    lcd: document.getElementById("lcd"),
    offScreen: document.getElementById("off-screen"),
    controlsCol: document.querySelector(".controls"),
    trainingPanel: document.querySelector(".training-panel"),
    deviceFocusToggle: document.getElementById("device-focus-toggle"),
    btnAudio: document.getElementById("btn-audio-toggle"),
    btnFullscreen: document.getElementById("btn-fullscreen"),
    btnLang: document.getElementById("btn-lang-toggle"),
    btnF1: document.getElementById("btn-f1"),
    btnF2: document.getElementById("btn-f2"),
    f1Cue: document.getElementById("f1-cue"),
    f2Cue: document.getElementById("f2-cue"),
    btnMenu: document.getElementById("btn-menu"),
    btnEnt: document.getElementById("btn-ent"),
    padUp: document.getElementById("pad-up"),
    padDown: document.getElementById("pad-down"),
    padLeft: document.getElementById("pad-left"),
    padRight: document.getElementById("pad-right"),
    btnRangeDown: document.getElementById("btn-range-down"),
    btnRangeUp: document.getElementById("btn-range-up"),
    btnAlarmAck: document.getElementById("btn-alarm-ack"),
    gainKnob: document.getElementById("gain-knob"),
    gainBadge: document.getElementById("gain-badge"),
    gainStepDown: document.getElementById("gain-step-down"),
    gainStepUp: document.getElementById("gain-step-up"),
    stcKnob: document.getElementById("stc-knob"),
    stcBadge: document.getElementById("stc-badge"),
    stcStepDown: document.getElementById("stc-step-down"),
    stcStepUp: document.getElementById("stc-step-up"),
    btnStbyTx: document.getElementById("btn-stby-tx"),
    txLed: document.getElementById("tx-led"),
    btnPower: document.getElementById("btn-power"),
    stripPowerState: document.getElementById("strip-power-state"),
    stripTelemetry: document.getElementById("strip-telemetry"),
    liveStatus: document.getElementById("d15-live-status"),
    alarmStatus: document.getElementById("d15-alarm-status"),
    // Tab 1
    statTick: document.getElementById("stat-tick"),
    statPower: document.getElementById("stat-power"),
    statRange: document.getElementById("stat-range"),
    statEvents: document.getElementById("stat-events"),
    scenarioSelect: document.getElementById("scenario-select"),
    btnPause: document.getElementById("btn-pause"),
    btnStep: document.getElementById("btn-step"),
    btnReset: document.getElementById("btn-reset"),
    btnVerifyReplay: document.getElementById("btn-verify-replay"),
    replayStatus: document.getElementById("replay-status"),
    chkFastPreheat: document.getElementById("chk-fast-preheat"),
    btnSkipPreheat: document.getElementById("btn-skip-preheat"),
    inputOwnHdg: document.getElementById("input-own-hdg"),
    inputOwnSog: document.getElementById("input-own-sog"),
    inputOwnRot: document.getElementById("input-own-rot"),
    btnApplyOwnship: document.getElementById("btn-apply-ownship"),
    sliderGain: document.getElementById("slider-gain"),
    sliderGainVal: document.getElementById("slider-gain-val"),
    sliderStc: document.getElementById("slider-stc"),
    sliderStcVal: document.getElementById("slider-stc-val"),
    sliderFtc: document.getElementById("slider-ftc"),
    sliderFtcVal: document.getElementById("slider-ftc-val"),
    btnFtcDefault: document.getElementById("btn-ftc-default"),
    btnSubRangeDown: document.getElementById("btn-sub-range-down"),
    subRangeReadout: document.getElementById("sub-range-readout"),
    btnSubRangeUp: document.getElementById("btn-sub-range-up"),
    // Tab 2
    sliderSeaState: document.getElementById("slider-sea-state"),
    seaStateVal: document.getElementById("sea-state-val"),
    btnSeaDefault: document.getElementById("btn-sea-default"),
    sliderRain: document.getElementById("slider-rain"),
    rainVal: document.getElementById("rain-val"),
    btnRainDefault: document.getElementById("btn-rain-default"),
    chkInterference: document.getElementById("chk-interference"),
    chkHdgSensor: document.getElementById("chk-hdg-sensor"),
    chkGpsSensor: document.getElementById("chk-gps-sensor"),
    chkSpdSensor: document.getElementById("chk-spd-sensor"),
    chkAtaBoard: document.getElementById("chk-ata-board"),
    chkAisBoard: document.getElementById("chk-ais-board"),
    sensorFaultReadout: document.getElementById("sensor-fault-readout"),
    // Tab 3
    chkBridgeSync: document.getElementById("chk-bridge-sync"),
    bridgeSyncReadout: document.getElementById("bridge-sync-readout"),
    btnFcvPower: document.getElementById("btn-fcv-power"),
    btnAtaAcq: document.getElementById("btn-ata-acq"),
    btnAtaDel: document.getElementById("btn-ata-del"),
    btnAtaDelAll: document.getElementById("btn-ata-del-all"),
    ataTargetList: document.getElementById("ata-target-list"),
    aisCountSummary: document.getElementById("ais-count-summary"),
    aisTargetList: document.getElementById("ais-target-list"),
    nmeaMonitor: document.getElementById("nmea-monitor"),
    // Tab 4
    lessonSelect: document.getElementById("lesson-select"),
    lessonMeta: document.getElementById("lesson-meta"),
    lessonInstruction: document.getElementById("lesson-instruction"),
    btnStartLesson: document.getElementById("btn-start-lesson"),
    btnGradeLesson: document.getElementById("btn-grade-lesson"),
    lessonResult: document.getElementById("lesson-result"),
    // Tab 5
    btnSaveLocal: document.getElementById("btn-save-local"),
    btnLoadLocal: document.getElementById("btn-load-local"),
    btnClearLocal: document.getElementById("btn-clear-local"),
    btnExportSettings: document.getElementById("btn-export-settings"),
    settingsJsonIo: document.getElementById("settings-json-io"),
    inputImportSettings: document.getElementById("input-import-settings"),
    btnImportSettings: document.getElementById("btn-import-settings"),
    settingsStatus: document.getElementById("settings-status"),
    btnExportReplay: document.getElementById("btn-export-replay"),
    inputImportReplay: document.getElementById("input-import-replay"),
    btnImportReplay: document.getElementById("btn-import-replay"),
    replayImportStatus: document.getElementById("replay-import-status"),
  };

  // Enhance D15 5-tab WAI-ARIA navigation
  bindMdc2060InstructorTabs(els.trainingPanel);

  // Populate scenario selector
  for (const scen of MDC2060_SCENARIOS) {
    const opt = document.createElement("option");
    opt.value = scen.id;
    opt.textContent = scen.label;
    els.scenarioSelect.appendChild(opt);
  }

  // Populate 7 lessons selector
  for (const lesson of MDC2060_LESSONS) {
    const opt = document.createElement("option");
    opt.value = lesson.id;
    opt.textContent = `${lesson.id} — ${lesson.titleVi}`;
    els.lessonSelect.appendChild(opt);
  }

  const renderer = createMdc2060PpiRenderer(els.canvas);
  const buzzer = createFcvHardwareBuzzer();

  // Application runtime state (all deterministic simulation state lives in `bridge`)
  let activeScenario = MDC2060_COASTAL_SCENARIO;
  let activeAdapters = [MDC2060_ADAPTER];
  let bridgeSyncEnabled = false;
  let bridge = createBridgeSession(activeAdapters, activeScenario);
  let paused = false;
  let frozenNowMs = null;
  let speakerEnabled = true;
  let lcdLangOverride = null;
  let lastCanonicalLang = "en";
  let lessonAttempt = null;
  let sessionInitBoundary = null;
  let lastSavedSettingsRef = null;
  let lastSavedSettingsStr = null;

  // Sweep interpolation & UI diff caches
  let visualAzimuthDeg = 0;
  let lastObservedSimTick = 0;
  let lastRafMs = performance.now();
  let worldAccumMs = 0;
  let lastAnnouncedPower = null;
  let lastAnnouncedAlarmSig = "";
  let lastAnnouncedFaultSig = "";
  let lastAtaListSig = "";
  let lastAisListSig = "";
  let lastNmeaSig = "";
  let lastBridgeSyncSig = "";

  const holdBindings = [];
  const disposableBindings = [];

  const getState = () => bridge.devices[MDC2060_ID].deviceState;
  const getHeld = () => bridge.devices[MDC2060_ID].heldControls;
  const getEffectiveLcdLang = (state) => lcdLangOverride ?? state.settings.language ?? "en";

  const announceStatus = (text) => {
    if (els.liveStatus && text) {
      els.liveStatus.textContent = text;
    }
  };

  const announceAlarm = (text) => {
    if (els.alarmStatus && text) {
      els.alarmStatus.textContent = text;
    }
  };

  const cancelActiveInputHolds = () => {
    for (const b of holdBindings) {
      try {
        b.cancel?.();
      } catch {
        // ignore cancel error during reset
      }
    }
  };

  let lastAisProjKey = "";
  let lastAisProjValue = null;

  const computeAisProjection = (state) => {
    const key = [
      bridge.sensorBus?.busFingerprint ?? "",
      state.settings.aisDisplay,
      state.settings.aisFilterRangeNm,
      state.settings.aisCpaAlarm,
      state.settings.ataCpaLimitNm,
      state.settings.ataTcpaLimitMin,
      state.trainingFixture.aisBoardOption ? 1 : 0,
      state.trainingFixture.ataBoardOption ? 1 : 0,
      state.ais.selectedMmsi ?? "",
    ].join("|");
    if (key === lastAisProjKey && lastAisProjValue) {
      return lastAisProjValue;
    }
    lastAisProjKey = key;
    lastAisProjValue = projectAisTargets(
      bridge.sensorBus,
      {
        ...state.settings,
        ataBoardOption: state.trainingFixture.ataBoardOption,
        aisBoardOption: state.trainingFixture.aisBoardOption,
      },
      state.ais.selectedMmsi,
    );
    return lastAisProjValue;
  };

  const syncOwnshipInputs = (scenario) => {
    const own = scenario?.ownship ?? scenario?.syntheticOwnship;
    if (!own) return;
    if (els.inputOwnHdg) els.inputOwnHdg.value = String(own.hdgDeg ?? 0);
    if (els.inputOwnSog) els.inputOwnSog.value = String(own.sogKn ?? 0);
    if (els.inputOwnRot) els.inputOwnRot.value = String(own.rotDegPerMin ?? 0);
  };

  const persistSettingsIfChanged = (state) => {
    if (state.settings === lastSavedSettingsRef) return;
    lastSavedSettingsRef = state.settings;
    try {
      const encoded = encodeMdc2060Settings(state.settings);
      if (encoded !== lastSavedSettingsStr) {
        lastSavedSettingsStr = encoded;
        safeStorageSet(MDC2060_SETTINGS_STORAGE_KEY, encoded);
      }
    } catch {
      // Ignore storage serialization errors
    }
  };

  const playSound = (prevState, nextState, input) => {
    const soundKind = classifyMdc2060HardwareSound(prevState, nextState, input, {
      speakerEnabled,
      keySoundOverride: true,
    });
    if (soundKind) {
      buzzer.play(soundKind);
    }
  };

  const dispatchMdc = (input, { silent = false } = {}) => {
    const prevState = getState();
    try {
      bridge = dispatchBridgeInput(bridge, activeAdapters, MDC2060_ID, input, activeScenario);
    } catch {
      return false;
    }
    const nextState = getState();
    const allResetJustCompleted =
      nextState.notice === "allResetDone" &&
      (prevState.notice !== "allResetDone" || prevState.overlay?.kind === "confirm-all-reset");
    if (nextState.settings.language !== lastCanonicalLang ||
        input?.kind === "restore-settings" ||
        allResetJustCompleted) {
      lastCanonicalLang = nextState.settings.language;
      lcdLangOverride = null;
    }
    if (!silent) playSound(prevState, nextState, input);
    persistSettingsIfChanged(nextState);
    syncUiFromState(nextState);
    return true;
  };

  const dispatchBridgeTick = (steps = 1) => {
    const prevState = getState();
    try {
      bridge = dispatchBridgeInput(bridge, activeAdapters, "bridge", { kind: "tick", steps }, activeScenario);
    } catch {
      return false;
    }
    const nextState = getState();
    if (nextState.simTick !== lastObservedSimTick) {
      lastObservedSimTick = nextState.simTick;
      visualAzimuthDeg = nextState.sweepAzimuthDeg;
    }
    playSound(prevState, nextState, { kind: "tick", steps });
    syncUiFromState(nextState);
    return true;
  };

  const dispatchFcvShortPower = () => {
    if (!bridgeSyncEnabled || !bridge.devices[FCV588_ADAPTER.id]) return;
    const held = bridge.devices[FCV588_ADAPTER.id].heldControls;
    if (Object.hasOwn(held, "power")) return;
    const fcvPower = bridge.devices[FCV588_ADAPTER.id].deviceState.power;
    try {
      bridge = dispatchBridgeInput(bridge, activeAdapters, FCV588_ADAPTER.id, { kind: "down", control: "power" }, activeScenario);
      const dur = fcvPower === "off" ? 120 : 3200;
      bridge = dispatchBridgeInput(bridge, activeAdapters, FCV588_ADAPTER.id, { kind: "up", control: "power", durationMs: dur }, activeScenario);
    } catch {
      // ignore if held
    }
    syncUiFromState(getState());
  };

  const sendShortHold = (control) => {
    if (Object.hasOwn(getHeld(), control)) return false;
    if (!dispatchMdc({ kind: "down", control }, { silent: true })) return false;
    return dispatchMdc({ kind: "up", control, durationMs: 120 });
  };

  const sendLongHold = (control, durationMs) => {
    if (Object.hasOwn(getHeld(), control)) return false;
    if (!dispatchMdc({ kind: "down", control }, { silent: true })) return false;
    return dispatchMdc({ kind: "up", control, durationMs });
  };

  const createFreshSession = ({
    scenario = activeScenario,
    syncFcv = bridgeSyncEnabled,
    restoreSettings = null,
    fastPreheat = Boolean(els.chkFastPreheat?.checked),
    autoPowerFcv = syncFcv,
  } = {}) => {
    cancelActiveInputHolds();
    activeScenario = scenario;
    bridgeSyncEnabled = Boolean(syncFcv);
    activeAdapters = bridgeSyncEnabled ? [FCV588_ADAPTER, MDC2060_ADAPTER] : [MDC2060_ADAPTER];
    bridge = createBridgeSession(activeAdapters, activeScenario);
    paused = false;
    frozenNowMs = null;
    if (els.btnPause) els.btnPause.textContent = "Tạm dừng";
    worldAccumMs = 0;
    lastObservedSimTick = 0;
    visualAzimuthDeg = 0;
    lastAtaListSig = "";
    lastAisListSig = "";
    lastAisProjKey = "";
    lastAisProjValue = null;
    lastNmeaSig = "";
    lastBridgeSyncSig = "";
    renderer.resetBuffers();

    if (restoreSettings) {
      try {
        bridge = dispatchBridgeInput(
          bridge,
          activeAdapters,
          MDC2060_ID,
          { kind: "restore-settings", settings: restoreSettings },
          activeScenario,
        );
      } catch {
        // fail closed if invalid
      }
    }

    if (fastPreheat) {
      bridge = dispatchBridgeInput(
        bridge,
        activeAdapters,
        MDC2060_ID,
        { kind: "training-fixture", fixture: "fastPreheat", enabled: true },
        activeScenario,
      );
    }

    if (bridgeSyncEnabled && autoPowerFcv) {
      try {
        bridge = dispatchBridgeInput(bridge, activeAdapters, FCV588_ADAPTER.id, { kind: "down", control: "power" }, activeScenario);
        bridge = dispatchBridgeInput(bridge, activeAdapters, FCV588_ADAPTER.id, { kind: "up", control: "power", durationMs: 120 }, activeScenario);
      } catch {
        // ignore
      }
    }

    const st = getState();
    sessionInitBoundary = {
      startSeq: bridge.history.length,
      startSessionHash: bridgeSessionHash(bridge),
      baselineAtaCount: st.ata.targets.length,
    };
    lastCanonicalLang = st.settings.language;
    lcdLangOverride = null;
    lastSavedSettingsRef = st.settings;
    syncOwnshipInputs(activeScenario);
    syncUiFromState(st);
  };

  // ==========================================================================
  // UI Synchronization (Safe DOM APIs only: textContent & replaceChildren)
  // ==========================================================================
  const syncAtaTargetList = (state) => {
    const targets = state.ata?.targets ?? [];
    const aisMap = new Map();
    for (const a of (bridge.sensorBus?.aisTargets ?? [])) {
      aisMap.set(`tgt-${a.mmsi}`, a.name);
    }
    const sig = targets
      .map(t => `${t.targetId}:${t.status}:${t.dangerous ? 1 : 0}:${t.rangeNm.toFixed(2)}:${t.bearingDeg.toFixed(1)}:${t.cpaNm.toFixed(2)}:${t.tcpaMin.toFixed(1)}:${t.targetId === state.ata.selectedTargetId ? 1 : 0}`)
      .join("|");
    if (sig === lastAtaListSig) return;
    lastAtaListSig = sig;

    if (targets.length === 0) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "Chưa bám mục tiêu ATA nào. Nhấn F2 hoặc nút Bắt ATA khi máy đang phát TX.";
      els.ataTargetList.replaceChildren(empty);
      return;
    }

    const frag = document.createDocumentFragment();
    for (const t of targets) {
      const row = document.createElement("div");
      row.className = "target-item";
      row.dataset.danger = t.dangerous ? "true" : "false";
      row.dataset.selected = t.targetId === state.ata.selectedTargetId ? "true" : "false";

      const head = document.createElement("div");
      head.className = "target-item-head";
      const name = aisMap.get(t.contactId) ?? t.contactId;
      const title = document.createElement("span");
      title.textContent = `${t.targetId} · ${name}`;
      const badge = document.createElement("span");
      badge.className = "target-badge";
      badge.dataset.level = t.dangerous ? "danger" : "normal";
      badge.textContent = t.dangerous ? "CPA DANGER" : t.status.toUpperCase();
      head.append(title, badge);

      const meta = document.createElement("div");
      meta.className = "target-item-meta";
      meta.textContent = `BRG ${t.bearingDeg.toFixed(1)}° · RNG ${t.rangeNm.toFixed(2)} NM · COG ${t.cogDeg.toFixed(0)}° · SOG ${t.sogKn.toFixed(1)}kn · CPA ${t.cpaNm.toFixed(2)} NM / ${t.tcpaMin.toFixed(1)}m`;

      row.append(head, meta);
      frag.appendChild(row);
    }
    els.ataTargetList.replaceChildren(frag);
  };

  const syncAisTargetList = (state, aisProjection) => {
    const targets = aisProjection.enabled ? aisProjection.targets : [];
    if (els.aisCountSummary) {
      els.aisCountSummary.textContent = aisProjection.boardInstalled
        ? (aisProjection.enabled ? `${targets.length}/${aisProjection.totalInBus}` : "TẮT")
        : "KHÔNG CÓ BO";
    }

    const sig = `${aisProjection.enabled}|${aisProjection.boardInstalled}|` + targets
      .map(t => `${t.mmsi}:${t.status}:${t.selected ? 1 : 0}:${t.bearingDeg.toFixed(1)}:${t.rangeNm.toFixed(2)}:${t.cpaNm.toFixed(2)}`)
      .join("|");
    if (sig === lastAisListSig) return;
    lastAisListSig = sig;

    if (!aisProjection.boardInstalled) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "Cổng AIS đang bị tắt trong Tab Thời tiết & Nguồn.";
      els.aisTargetList.replaceChildren(empty);
      return;
    }
    if (!aisProjection.enabled) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "Hiển thị AIS đang OFF trong MENU > AIS.";
      els.aisTargetList.replaceChildren(empty);
      return;
    }
    if (targets.length === 0) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "Không có tàu AIS trong bán kính lọc.";
      els.aisTargetList.replaceChildren(empty);
      return;
    }

    const frag = document.createDocumentFragment();
    for (const t of targets) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "target-item";
      btn.dataset.danger = t.dangerous ? "true" : "false";
      btn.dataset.selected = t.selected ? "true" : "false";

      const head = document.createElement("div");
      head.className = "target-item-head";
      const title = document.createElement("span");
      title.textContent = `${t.name} (${t.mmsi})`;
      const badge = document.createElement("span");
      badge.className = "target-badge";
      badge.dataset.level = t.dangerous ? "danger" : "normal";
      badge.textContent = t.status.toUpperCase();
      head.append(title, badge);

      const meta = document.createElement("div");
      meta.className = "target-item-meta";
      meta.textContent = `BRG ${t.bearingDeg.toFixed(1)}° · RNG ${t.rangeNm.toFixed(2)} NM · SOG ${t.sogKn.toFixed(1)}kn · CPA ${t.cpaNm.toFixed(2)} NM / ${t.tcpaMin.toFixed(1)}m`;

      btn.append(head, meta);
      btn.addEventListener("click", () => {
        let curState = getState();
        if (curState.powerMode !== "standby" && curState.powerMode !== "transmit") return;
        if (Object.hasOwn(getHeld(), "ent") || Object.hasOwn(getHeld(), "menu")) return;
        if (curState.overlay !== null && curState.overlay.kind !== "ais-info") return;

        // Resolve fresh coordinates against current projection and active radar range
        const liveProj = computeAisProjection(curState);
        const liveTarget = liveProj.targets.find(item => item.mmsi === t.mmsi) ?? t;
        const proj = projectTargetToMainPpi(liveTarget, curState);

        if (!proj.validForMainHit) {
          // Out of current radar range (or too close to sweep origin): never emit a bare ENT
          // that would accidentally start a 2-point measurement anchor.
          const unit = curState.settings.rangeUnit ?? "NM";
          const curRangeNm = (MDC2060_RANGES[curState.rangeIndex] ?? MDC2060_RANGES[10]).nm;
          const hint = proj.insideDisk
            ? `Mục tiêu AIS ${liveTarget.name} quá gần tâm ở thang ${formatRangeValue(curRangeNm, unit)}; hãy giảm thang đo RANGE để chọn trên PPI.`
            : `Mục tiêu AIS ${liveTarget.name} (${formatRangeValue(liveTarget.rangeNm, unit)}) nằm ngoài thang đo hiện tại (${formatRangeValue(curRangeNm, unit)}); tăng thang đo RANGE để mở AIS INFO.`;
          if (els.stripTelemetry) els.stripTelemetry.textContent = hint;
          announceStatus(hint);
          return;
        }

        // If AIS INFO modal is already open, close it first so clicking target #2 switches on 1st click
        if (curState.overlay?.kind === "ais-info") {
          if (!sendShortHold("ent")) return;
          curState = getState();
        }
        if (curState.overlay !== null) return;

        // Clear any pending/completed 2-point measurement so ENT opens AIS INFO cleanly
        if (curState.measureAnchor !== null) {
          if (!curState.measureResult) {
            sendShortHold("ent");
          }
          sendShortHold("ent");
          curState = getState();
          if (curState.overlay !== null || curState.measureAnchor !== null) return;
        }

        const freshProj = projectTargetToMainPpi(liveTarget, curState);
        if (!freshProj.validForMainHit) return;
        dispatchMdc({ kind: "touch", control: "ppi_cursor", x: freshProj.x, y: freshProj.y, phase: "down" }, { silent: true });
        dispatchMdc({ kind: "touch", control: "ppi_cursor", x: freshProj.x, y: freshProj.y, phase: "up" }, { silent: true });
        if (getState().overlay === null && getState().measureAnchor === null) {
          sendShortHold("ent");
        }
      });
      frag.appendChild(btn);
    }
    els.aisTargetList.replaceChildren(frag);
  };

  const syncBridgeSyncReadout = () => {
    const fcvSlot = bridge.devices[FCV588_ADAPTER.id];
    const bus = bridge.sensorBus;
    if (els.chkBridgeSync) els.chkBridgeSync.checked = bridgeSyncEnabled;
    if (els.btnFcvPower) els.btnFcvPower.hidden = !bridgeSyncEnabled;

    const sig = bridgeSyncEnabled && fcvSlot
      ? `${bus?.busFingerprint}|${fcvSlot.deviceState.power}|${fcvSlot.deviceState.mode}|${fcvSlot.deviceState.rangeIndex}|${fcvSlot.deviceState.syntheticConditions?.depthM}`
      : "off";
    if (sig === lastBridgeSyncSig) return;
    lastBridgeSyncSig = sig;

    if (!bridgeSyncEnabled || !fcvSlot) {
      const p = document.createElement("p");
      p.className = "hint";
      p.textContent = "Chế độ đơn thiết bị. Bật để chạy đồng bộ cùng FURUNO FCV-588 trên chung bus NMEA-0183.";
      els.bridgeSyncReadout.replaceChildren(p);
      return;
    }

    const fcvProbe = FCV588_ADAPTER.probe(fcvSlot.deviceState);
    const fcvCond = fcvSlot.deviceState.syntheticConditions ?? {};
    const bottomText = formatBottomClassification(fcvCond.bottomClassification);
    const lines = [
      `FCV-588: ${String(fcvProbe.power).toUpperCase()} · MODE ${fcvProbe.mode} · RNG #${fcvProbe.rangeIndex}`,
      `Độ sâu bus chung: ${Number.isFinite(bus?.depthM) ? bus.depthM.toFixed(1) : "--"} m (dưới đầu dò ${Number.isFinite(bus?.depthBelowTransducerM) ? bus.depthBelowTransducerM.toFixed(1) : "--"} m)`,
      `Đáy biển FCV-588: ${bottomText} · Bus #${String(bus?.busFingerprint ?? "--").slice(-10)}`,
    ];
    const frag = document.createDocumentFragment();
    for (const line of lines) {
      const div = document.createElement("div");
      div.textContent = line;
      frag.appendChild(div);
    }
    els.bridgeSyncReadout.replaceChildren(frag);
  };

  const syncNmeaFeed = (state) => {
    const lines = [
      ...(bridge.sensorBus?.sentences ?? []),
      ...(state.ata?.rattmSentences ?? []),
    ];
    const joined = lines.join("\n");
    if (joined === lastNmeaSig) return;
    lastNmeaSig = joined;
    if (els.nmeaMonitor) {
      els.nmeaMonitor.textContent = joined || "(Chưa có câu NMEA-0183)";
    }
  };

  const syncUiFromState = (state) => {
    const lang = getEffectiveLcdLang(state);
    const unit = state.settings.rangeUnit ?? "NM";
    const mainRangeDef = MDC2060_RANGES[state.rangeIndex] ?? MDC2060_RANGES[10];
    const subRangeDef = MDC2060_RANGES[state.subRangeIndex] ?? MDC2060_RANGES[7];
    const aisProjection = computeAisProjection(state);

    // 1. Power-Off Veil & Hardware LED / Backlight / Knobs
    if (els.offScreen) els.offScreen.hidden = state.powerMode !== "off";
    if (els.lcd) {
      const menuOpen = state.overlay?.kind === "menu" || state.overlay?.kind === "system-menu";
      els.lcd.dataset.menuOpen = menuOpen ? "true" : "false";
    }
    if (els.txLed) els.txLed.dataset.state = state.powerMode;
    if (els.controlsCol) {
      const glow = state.powerMode === "off" ? 0 : (state.panelBrightness ?? 7) / 10;
      els.controlsCol.style.setProperty("--panel-glow", glow.toFixed(2));
    }

    if (els.btnAlarmAck) {
      els.btnAlarmAck.dataset.alarm = state.alarms?.audible ? "true" : "false";
    }

    if (els.f1Cue) els.f1Cue.textContent = localizeMdc2060Choice(state.settings.f1Key, "en");
    if (els.f2Cue) els.f2Cue.textContent = localizeMdc2060Choice(state.settings.f2Key, "en");

    const gainAngle = -135 + ((state.gain ?? 0) / 100) * 270;
    const stcAngle = -135 + ((state.stc ?? 0) / 100) * 270;
    if (els.gainKnob) {
      els.gainKnob.style.setProperty("--knob-angle", `${gainAngle.toFixed(1)}deg`);
      els.gainKnob.setAttribute("aria-valuenow", String(Math.round(state.gain)));
      els.gainKnob.setAttribute("aria-valuetext", `GAIN ${Math.round(state.gain)}`);
    }
    if (els.gainBadge) els.gainBadge.textContent = String(Math.round(state.gain));

    if (els.stcKnob) {
      els.stcKnob.style.setProperty("--knob-angle", `${stcAngle.toFixed(1)}deg`);
      els.stcKnob.setAttribute("aria-valuenow", String(Math.round(state.stc)));
      els.stcKnob.setAttribute("aria-valuetext", `STC ${Math.round(state.stc)}`);
    }
    if (els.stcBadge) els.stcBadge.textContent = String(Math.round(state.stc));

    // Toolbar language cue
    if (els.btnLang) {
      els.btnLang.setAttribute("aria-pressed", lang === "vi" ? "true" : "false");
      els.btnLang.textContent = lang === "vi" ? "LCD: VI / en" : "LCD: EN / vi";
    }

    // Status strip below device frame
    if (els.stripPowerState) {
      els.stripPowerState.textContent = `${localizeMdc2060PowerMode(state.powerMode, "en")} · ${state.effectiveModes.presentationMode} · ${state.settings.screenMode}`;
    }
    if (els.stripTelemetry) {
      els.stripTelemetry.textContent = state.powerMode === "off"
        ? "Nhấn POWER / BRILL trên mặt máy để bắt đầu phiên thực hành."
        : `Thang ${formatRangeValue(mainRangeDef.nm, unit)} · GAIN ${Math.round(state.gain)} · STC ${Math.round(state.stc)} · FTC ${state.effectiveModes.ftc} · IR ${state.settings.ir} · ATA ${state.ata.targets.length} · AIS ${aisProjection.enabled ? aisProjection.targets.length : 0}`;
    }

    // Tab 1 live stats & sliders
    if (els.statTick) els.statTick.textContent = String(state.simTick).padStart(4, "0");
    if (els.statPower) els.statPower.textContent = localizeMdc2060PowerMode(state.powerMode, "en");
    if (els.statRange) els.statRange.textContent = formatRangeValue(mainRangeDef.nm, unit);
    if (els.statEvents) els.statEvents.textContent = String(bridge.history.length);

    if (els.chkFastPreheat) els.chkFastPreheat.checked = state.trainingFixture.fastPreheat === true;
    if (els.btnSkipPreheat) els.btnSkipPreheat.disabled = state.powerMode !== "preheat";
    if (els.sliderGain) els.sliderGain.value = String(Math.round(state.gain));
    if (els.sliderGainVal) els.sliderGainVal.textContent = String(Math.round(state.gain));
    if (els.sliderStc) els.sliderStc.value = String(Math.round(state.stc));
    if (els.sliderStcVal) els.sliderStcVal.textContent = String(Math.round(state.stc));

    const instFtc = state.instructor.ftc;
    if (els.sliderFtc) els.sliderFtc.value = String(instFtc >= 0 ? instFtc : state.settings.ftc);
    if (els.sliderFtcVal) {
      els.sliderFtcVal.textContent = instFtc >= 0 ? `Override (${instFtc})` : `Menu (${state.settings.ftc})`;
    }
    if (els.subRangeReadout) els.subRangeReadout.textContent = formatRangeValue(subRangeDef.nm, unit);

    // Tab 2 Weather & Sensor Faults
    const seaOv = state.instructor.seaState;
    if (els.sliderSeaState) els.sliderSeaState.value = String(seaOv >= 0 ? seaOv : (activeScenario.weather?.seaState ?? 2));
    if (els.seaStateVal) els.seaStateVal.textContent = seaOv >= 0 ? `Cấp ${seaOv}` : `Theo kịch bản (${activeScenario.weather?.seaState ?? 0})`;

    const rainOv = state.instructor.rain;
    if (els.sliderRain) els.sliderRain.value = String(rainOv >= 0 ? Math.round(rainOv) : 0);
    if (els.rainVal) els.rainVal.textContent = rainOv >= 0 ? `${Math.round(rainOv)}%` : "Theo kịch bản";

    if (els.chkInterference) els.chkInterference.checked = state.trainingFixture.interferenceSource === true;
    if (els.chkHdgSensor) els.chkHdgSensor.checked = state.trainingFixture.headingSensor === true;
    if (els.chkGpsSensor) els.chkGpsSensor.checked = state.trainingFixture.gpsSensor === true;
    if (els.chkSpdSensor) els.chkSpdSensor.checked = state.trainingFixture.speedSensor === true;
    if (els.chkAtaBoard) els.chkAtaBoard.checked = state.trainingFixture.ataBoardOption === true;
    if (els.chkAisBoard) els.chkAisBoard.checked = state.trainingFixture.aisBoardOption === true;

    const faultMsgs = [];
    if (state.sensorFaults.hdgNoSignal) faultMsgs.push("HDG NO SIGNAL");
    if (state.sensorFaults.llNoSignal) faultMsgs.push("L/L NO SIGNAL");
    if (state.sensorFaults.spdNoSignal) faultMsgs.push("SPD NO SIGNAL");
    if (!state.trainingFixture.ataBoardOption) faultMsgs.push("NO ATA BOARD");
    if (!state.trainingFixture.aisBoardOption) faultMsgs.push("NO AIS BOARD");
    if (els.sensorFaultReadout) {
      els.sensorFaultReadout.textContent = faultMsgs.length > 0
        ? `Cảnh báo giả lập: ${faultMsgs.join(" · ")}`
        : tMdc2060("vi", "fault.sensorOk");
      els.sensorFaultReadout.dataset.state = faultMsgs.length > 0 ? "rejected" : "pass";
    }

    // Tab 3 ATA / AIS / NMEA / Bridge Sync
    syncBridgeSyncReadout();
    syncAtaTargetList(state);
    syncAisTargetList(state, aisProjection);
    syncNmeaFeed(state);

    // Discrete screen-reader announcements ONLY on semantic state changes
    if (state.powerMode !== lastAnnouncedPower) {
      if (lastAnnouncedPower !== null) {
        announceStatus(`Trạng thái radar MDC-2060: ${localizeMdc2060PowerMode(state.powerMode, "vi")}`);
      }
      lastAnnouncedPower = state.powerMode;
    }

    const alarmSig = `${state.alarms.activeIds.join(",")}|${state.alarms.audible ? 1 : 0}`;
    if (alarmSig !== lastAnnouncedAlarmSig) {
      if (state.alarms.activeIds.length > 0) {
        const labels = state.alarms.activeIds
          .map(id => localizeMdc2060Alarm(ALARM_ID_TO_I18N[id] ?? id, "vi"))
          .join(", ");
        announceAlarm(state.alarms.audible ? `Báo động radar: ${labels}` : `Đã tắt còi báo động: ${labels}`);
      }
      lastAnnouncedAlarmSig = alarmSig;
    }

    const faultSig = faultMsgs.join("|");
    if (faultSig !== lastAnnouncedFaultSig) {
      if (lastAnnouncedFaultSig !== "" || faultSig !== "") {
        announceStatus(faultMsgs.length > 0 ? `Lỗi cảm biến giả lập: ${faultMsgs.join(", ")}` : "Các cảm biến radar đã khôi phục.");
      }
      lastAnnouncedFaultSig = faultSig;
    }
  };

  // ==========================================================================
  // Lesson Details Display
  // ==========================================================================
  const syncSelectedLessonView = () => {
    const lesson = getMdc2060Lesson(els.lessonSelect.value);
    if (!lesson) return;
    if (els.lessonMeta) {
      els.lessonMeta.textContent = `${lesson.manualSection} · Kịch bản gợi ý: ${lesson.recommendedScenarioId}`;
    }
    if (els.lessonInstruction) {
      els.lessonInstruction.textContent = lesson.instructionVi;
    }
  };
  syncSelectedLessonView();

  // ==========================================================================
  // Physical MRD-104 Controls Wiring
  // ==========================================================================
  const powerHold = bindHoldControl({
    button: els.btnPower,
    control: "power",
    emit: (ev) => dispatchMdc(ev),
  });
  const entHold = bindHoldControl({
    button: els.btnEnt,
    control: "ent",
    emit: (ev) => dispatchMdc(ev),
  });
  const menuHold = bindHoldControl({
    button: els.btnMenu,
    control: "menu",
    emit: (ev) => dispatchMdc(ev),
  });
  holdBindings.push(powerHold, entHold, menuHold);
  disposableBindings.push(powerHold, entHold, menuHold);

  for (const [btn, dir] of [
    [els.padUp, "up"],
    [els.padDown, "down"],
    [els.padLeft, "left"],
    [els.padRight, "right"],
  ]) {
    if (!btn) continue;
    const binding = bindMdc2060RepeatPadControl({
      button: btn,
      direction: dir,
      emit: (ev) => dispatchMdc(ev),
    });
    holdBindings.push(binding);
    disposableBindings.push(binding);
  }

  const gainRotary = bindMdc2060RotaryControl({
    button: els.gainKnob,
    control: "gain",
    emit: (ev) => dispatchMdc(ev),
  });
  const stcRotary = bindMdc2060RotaryControl({
    button: els.stcKnob,
    control: "stc",
    emit: (ev) => dispatchMdc(ev),
  });
  holdBindings.push(gainRotary, stcRotary);
  disposableBindings.push(gainRotary, stcRotary);

  const ppiPointer = bindMdc2060PpiPointer({
    canvas: els.canvas,
    emit: (ev) => dispatchMdc(ev),
    emitDoubleActivate: ({ x, y }) => {
      const st = getState();
      if (st.powerMode !== "standby" && st.powerMode !== "transmit") return;
      if (st.overlay !== null) return;
      dispatchMdc({ kind: "touch", control: "ppi_cursor", x, y, phase: "down" }, { silent: true });
      dispatchMdc({ kind: "touch", control: "ppi_cursor", x, y, phase: "up" }, { silent: true });
      sendShortHold("ent");
    },
  });
  holdBindings.push(ppiPointer);
  disposableBindings.push(ppiPointer);

  els.btnF1?.addEventListener("click", () => dispatchMdc({ kind: "press", control: "f1" }));
  els.btnF2?.addEventListener("click", () => dispatchMdc({ kind: "press", control: "f2" }));
  els.btnRangeDown?.addEventListener("click", () => dispatchMdc({ kind: "press", control: "range_down" }));
  els.btnRangeUp?.addEventListener("click", () => dispatchMdc({ kind: "press", control: "range_up" }));
  els.btnAlarmAck?.addEventListener("click", () => dispatchMdc({ kind: "press", control: "alarm_ack" }));
  els.btnStbyTx?.addEventListener("click", () => dispatchMdc({ kind: "press", control: "stby_tx" }));

  els.gainStepDown?.addEventListener("click", () => dispatchMdc({ kind: "rotate", control: "gain", steps: -1 }));
  els.gainStepUp?.addEventListener("click", () => dispatchMdc({ kind: "rotate", control: "gain", steps: 1 }));
  els.stcStepDown?.addEventListener("click", () => dispatchMdc({ kind: "rotate", control: "stc", steps: -1 }));
  els.stcStepUp?.addEventListener("click", () => dispatchMdc({ kind: "rotate", control: "stc", steps: 1 }));

  // ==========================================================================
  // Toolbar Controls (Focus Mode, Audio, Fullscreen, VI / EN Language)
  // ==========================================================================
  els.deviceFocusToggle?.addEventListener("change", () => {
    if (els.deviceFocusToggle.checked && els.trainingPanel?.contains(document.activeElement)) {
      if (typeof document.activeElement?.blur === "function") {
        document.activeElement.blur();
      }
      els.deviceFocusToggle.focus?.({ preventScroll: true });
    }
  });

  els.btnAudio?.addEventListener("click", () => {
    speakerEnabled = !speakerEnabled;
    els.btnAudio.setAttribute("aria-pressed", speakerEnabled ? "true" : "false");
    els.btnAudio.textContent = speakerEnabled ? "Loa máy: BẬT" : "Loa máy: TẮT";
  });

  const syncFullscreenBtn = () => {
    if (!els.btnFullscreen) return;
    const active = Boolean(document.fullscreenElement);
    els.btnFullscreen.setAttribute("aria-pressed", active ? "true" : "false");
    els.btnFullscreen.textContent = active ? "Thoát toàn màn hình" : "Toàn màn hình";
  };
  document.addEventListener("fullscreenchange", syncFullscreenBtn);
  els.btnFullscreen?.addEventListener("click", () => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen?.()?.catch?.(() => {});
      } else {
        document.documentElement.requestFullscreen?.()?.catch?.(() => {});
      }
    } catch {
      // ignore in headless/restricted contexts
    }
  });

  els.btnLang?.addEventListener("click", () => {
    const st = getState();
    const curLang = getEffectiveLcdLang(st);
    const nextLang = curLang === "vi" ? "en" : "vi";

    // If canonical state already holds nextLang (returning from UI-only fallback in preheat/menu/lesson),
    // clear override directly without dispatching redundant or inverted canonical transitions.
    if (st.settings.language === nextLang) {
      lcdLangOverride = null;
      syncUiFromState(st);
      renderCurrentFrame(performance.now());
      return;
    }

    if (!lessonAttempt && st.powerMode === "off") {
      dispatchMdc({ kind: "restore-settings", settings: { ...st.settings, language: nextLang } }, { silent: true });
      const updated = getState();
      lcdLangOverride = null;
      lastCanonicalLang = updated.settings.language;
      syncUiFromState(updated);
      renderCurrentFrame(performance.now());
      return;
    }

    if (!lessonAttempt &&
        (st.powerMode === "standby" || st.powerMode === "transmit") &&
        st.overlay === null &&
        !Object.hasOwn(getHeld(), "menu") &&
        !Object.hasOwn(getHeld(), "ent")) {
      // Canonical System Menu > ASSIST (0) > LANGUAGE (5) toggle
      sendLongHold("menu", 1600);
      for (let i = 0; i < 5; i++) {
        dispatchMdc({ kind: "pad", control: "cursorpad", direction: "down" }, { silent: true });
      }
      sendShortHold("ent");
      dispatchMdc({ kind: "pad", control: "cursorpad", direction: "right" }, { silent: true });
      sendShortHold("ent");
      sendShortHold("menu");
      const updated = getState();
      lcdLangOverride = null;
      lastCanonicalLang = updated.settings.language;
      syncUiFromState(updated);
      renderCurrentFrame(performance.now());
      return;
    }

    // Safe UI-only fallback during preheat, sleep, active modals, or graded lessons
    lcdLangOverride = nextLang;
    syncUiFromState(st);
    renderCurrentFrame(performance.now());
  });

  // ==========================================================================
  // Global Keyboard Shortcuts (Guarded Outside D15 & Inputs)
  // ==========================================================================
  document.addEventListener("keydown", (event) => {
    if (!shouldRouteMdc2060Shortcut(event)) return;
    const key = event.key;
    if (key === "p" || key === "P" || key === "b" || key === "B") {
      event.preventDefault();
      sendShortHold("power");
    } else if (key === "t" || key === "T") {
      event.preventDefault();
      dispatchMdc({ kind: "press", control: "stby_tx" });
    } else if (key === "m" || key === "M" || key === "Escape") {
      event.preventDefault();
      sendShortHold("menu");
    } else if (key === "Enter") {
      event.preventDefault();
      sendShortHold("ent");
    } else if (key === "ArrowUp") {
      event.preventDefault();
      dispatchMdc({ kind: "pad", control: "cursorpad", direction: "up" });
    } else if (key === "ArrowDown") {
      event.preventDefault();
      dispatchMdc({ kind: "pad", control: "cursorpad", direction: "down" });
    } else if (key === "ArrowLeft") {
      event.preventDefault();
      dispatchMdc({ kind: "pad", control: "cursorpad", direction: "left" });
    } else if (key === "ArrowRight") {
      event.preventDefault();
      dispatchMdc({ kind: "pad", control: "cursorpad", direction: "right" });
    } else if (key === "[") {
      event.preventDefault();
      dispatchMdc({ kind: "press", control: "range_down" });
    } else if (key === "]") {
      event.preventDefault();
      dispatchMdc({ kind: "press", control: "range_up" });
    } else if (key === "-") {
      event.preventDefault();
      dispatchMdc({ kind: "rotate", control: "gain", steps: -1 });
    } else if (key === "=" || key === "+") {
      event.preventDefault();
      dispatchMdc({ kind: "rotate", control: "gain", steps: 1 });
    } else if (key === ",") {
      event.preventDefault();
      dispatchMdc({ kind: "rotate", control: "stc", steps: -1 });
    } else if (key === ".") {
      event.preventDefault();
      dispatchMdc({ kind: "rotate", control: "stc", steps: 1 });
    } else if (key === "1") {
      event.preventDefault();
      dispatchMdc({ kind: "press", control: "f1" });
    } else if (key === "2") {
      event.preventDefault();
      dispatchMdc({ kind: "press", control: "f2" });
    } else if (key === "a" || key === "A") {
      event.preventDefault();
      dispatchMdc({ kind: "press", control: "alarm_ack" });
    }
  });

  // ==========================================================================
  // D15 Tab 1: Session, Ownship, Preheat Fixtures & PC Assist
  // ==========================================================================
  els.scenarioSelect?.addEventListener("change", () => {
    const nextScen = getMdc2060ScenarioById(els.scenarioSelect.value);
    if (!nextScen) return;
    lessonAttempt = null;
    createFreshSession({ scenario: nextScen });
    announceStatus(`Đã chuyển kịch bản: ${nextScen.label}`);
  });

  els.btnPause?.addEventListener("click", () => {
    paused = !paused;
    frozenNowMs = paused ? performance.now() : null;
    els.btnPause.textContent = paused ? "Tiếp tục" : "Tạm dừng";
    announceStatus(paused ? "Đã tạm dừng đồng hồ mô phỏng." : "Đã tiếp tục mô phỏng.");
    renderCurrentFrame(paused ? frozenNowMs : performance.now());
  });

  els.btnStep?.addEventListener("click", () => {
    dispatchBridgeTick(1);
  });

  els.btnReset?.addEventListener("click", () => {
    lessonAttempt = null;
    const base = getMdc2060ScenarioById(els.scenarioSelect.value) ?? MDC2060_COASTAL_SCENARIO;
    createFreshSession({ scenario: base });
    if (els.replayStatus) {
      els.replayStatus.textContent = "Đã đặt lại phiên mô phỏng.";
      els.replayStatus.dataset.state = "";
    }
    announceStatus("Đã đặt lại phiên huấn luyện MDC-2060.");
  });

  els.btnVerifyReplay?.addEventListener("click", () => {
    try {
      const envelope = createBridgeReplay(bridge);
      const replayed = replayBridgeSession(activeAdapters, activeScenario, envelope);
      const liveHash = bridgeSessionHash(bridge);
      const replayedHash = bridgeSessionHash(replayed);
      if (liveHash === replayedHash && replayedHash === envelope.finalBridgeHash) {
        els.replayStatus.textContent = `REPLAY PASS (${bridge.history.length} sự kiện · ${replayedHash.slice(0, 18)})`;
        els.replayStatus.dataset.state = "pass";
        announceStatus("Kiểm tra Replay đạt: mã băm khớp chính xác.");
      } else {
        els.replayStatus.textContent = "REPLAY FAIL: sai lệch mã băm trạng thái.";
        els.replayStatus.dataset.state = "rejected";
        announceStatus("Kiểm tra Replay thất bại.");
      }
    } catch (err) {
      els.replayStatus.textContent = `REPLAY ERROR: ${err?.message ?? "lỗi không xác định"}`;
      els.replayStatus.dataset.state = "rejected";
    }
  });

  els.chkFastPreheat?.addEventListener("change", () => {
    dispatchMdc(
      { kind: "training-fixture", fixture: "fastPreheat", enabled: Boolean(els.chkFastPreheat.checked) },
      { silent: true },
    );
  });

  els.btnSkipPreheat?.addEventListener("click", () => {
    if (getState().powerMode !== "preheat") return;
    // One-shot skipPreheat so subsequent power cycles still respect fastPreheat/120s
    dispatchMdc({ kind: "training-fixture", fixture: "skipPreheat", enabled: true }, { silent: true });
    dispatchMdc({ kind: "training-fixture", fixture: "skipPreheat", enabled: false }, { silent: true });
    announceStatus("Đã bỏ qua giai đoạn sấy magnetron, chuyển sang ST'BY.");
  });

  els.btnApplyOwnship?.addEventListener("click", () => {
    const curOwn = activeScenario.ownship ?? activeScenario.syntheticOwnship ?? {};
    const rawHdg = els.inputOwnHdg?.value?.trim() ?? "";
    const rawSog = els.inputOwnSog?.value?.trim() ?? "";
    const rawRot = els.inputOwnRot?.value?.trim() ?? "";
    const hdgDeg = rawHdg === "" ? curOwn.hdgDeg : Number(rawHdg);
    const sogKn = rawSog === "" ? curOwn.sogKn : Number(rawSog);
    const rotDegPerMin = rawRot === "" ? curOwn.rotDegPerMin : Number(rawRot);
    const overrides = {};
    if (Number.isFinite(hdgDeg)) overrides.hdgDeg = hdgDeg;
    if (Number.isFinite(sogKn)) overrides.sogKn = sogKn;
    if (Number.isFinite(rotDegPerMin)) overrides.rotDegPerMin = rotDegPerMin;

    const derived = createCustomOwnshipScenario(activeScenario, overrides);
    lessonAttempt = null;
    createFreshSession({ scenario: derived });
    announceStatus(`Đã áp dụng thông số tàu mình HDG ${derived.ownship.hdgDeg}°, SOG ${derived.ownship.sogKn} kn.`);
  });

  els.sliderGain?.addEventListener("input", () => {
    dispatchMdc({ kind: "analog", control: "gain", value: Number(els.sliderGain.value) }, { silent: true });
  });

  els.sliderStc?.addEventListener("input", () => {
    dispatchMdc({ kind: "analog", control: "stc", value: Number(els.sliderStc.value) }, { silent: true });
  });

  els.sliderFtc?.addEventListener("input", () => {
    dispatchMdc({ kind: "analog", control: "inst_ftc", value: Number(els.sliderFtc.value) }, { silent: true });
  });

  els.btnFtcDefault?.addEventListener("click", () => {
    dispatchMdc({ kind: "analog", control: "inst_ftc", value: -1 }, { silent: true });
  });

  els.btnSubRangeDown?.addEventListener("click", () => dispatchMdc({ kind: "press", control: "sub_range_down" }));
  els.btnSubRangeUp?.addEventListener("click", () => dispatchMdc({ kind: "press", control: "sub_range_up" }));

  // ==========================================================================
  // D15 Tab 2: Weather & Sensor Faults
  // ==========================================================================
  els.sliderSeaState?.addEventListener("input", () => {
    dispatchMdc({ kind: "analog", control: "inst_sea_state", value: Number(els.sliderSeaState.value) }, { silent: true });
  });
  els.btnSeaDefault?.addEventListener("click", () => {
    dispatchMdc({ kind: "analog", control: "inst_sea_state", value: -1 }, { silent: true });
  });

  els.sliderRain?.addEventListener("input", () => {
    dispatchMdc({ kind: "analog", control: "inst_rain", value: Number(els.sliderRain.value) }, { silent: true });
  });
  els.btnRainDefault?.addEventListener("click", () => {
    dispatchMdc({ kind: "analog", control: "inst_rain", value: -1 }, { silent: true });
  });

  const bindFixtureCheckbox = (checkbox, fixture) => {
    checkbox?.addEventListener("change", () => {
      dispatchMdc({ kind: "training-fixture", fixture, enabled: Boolean(checkbox.checked) }, { silent: true });
    });
  };
  bindFixtureCheckbox(els.chkInterference, "interferenceSource");
  bindFixtureCheckbox(els.chkHdgSensor, "headingSensor");
  bindFixtureCheckbox(els.chkGpsSensor, "gpsSensor");
  bindFixtureCheckbox(els.chkSpdSensor, "speedSensor");
  bindFixtureCheckbox(els.chkAtaBoard, "ataBoardOption");
  bindFixtureCheckbox(els.chkAisBoard, "aisBoardOption");

  // ==========================================================================
  // D15 Tab 3: ATA / AIS & FCV-588 Bridge Sync
  // ==========================================================================
  els.chkBridgeSync?.addEventListener("change", () => {
    lessonAttempt = null;
    const enableSync = Boolean(els.chkBridgeSync.checked);
    createFreshSession({ scenario: activeScenario, syncFcv: enableSync, autoPowerFcv: enableSync });
    announceStatus(enableSync ? "Đã bật chế độ đồng bộ buồng lái với FCV-588." : "Đã trở về chế độ MDC-2060 độc lập.");
  });

  els.btnFcvPower?.addEventListener("click", () => {
    dispatchFcvShortPower();
  });

  const runCanonicalAtaMenuAction = (itemIndex) => {
    const st = getState();
    if (st.powerMode !== "standby" && st.powerMode !== "transmit") return;
    if (st.overlay !== null) return;
    if (Object.hasOwn(getHeld(), "menu") || Object.hasOwn(getHeld(), "ent")) return;
    if (itemIndex === 0 && st.settings.f2Key === "ATA_ACQ") {
      dispatchMdc({ kind: "press", control: "f2" });
      if (!getState().trainingFixture.ataBoardOption) {
        const msg = "Chưa lắp bo ATA MRE-340 (bật ở Tab 2)";
        if (els.stripTelemetry) els.stripTelemetry.textContent = msg;
        announceStatus(msg);
      }
      return;
    }
    if (!sendShortHold("menu")) return;
    // Group index 4 = ATA (ECHO=0, DISPLAY=1, EBL/VRM=2, ALARM=3, ATA=4)
    for (let g = 0; g < 4; g++) {
      dispatchMdc({ kind: "pad", control: "cursorpad", direction: "right" }, { silent: true });
    }
    for (let i = 0; i < itemIndex; i++) {
      dispatchMdc({ kind: "pad", control: "cursorpad", direction: "down" }, { silent: true });
    }
    sendShortHold("ent");
    const missingAtaBoard = !getState().trainingFixture.ataBoardOption;
    if (getState().overlay?.kind === "menu") {
      sendShortHold("menu");
    }
    if (missingAtaBoard) {
      const msg = "Chưa lắp bo ATA MRE-340 (bật ở Tab 2)";
      if (els.stripTelemetry) els.stripTelemetry.textContent = msg;
      announceStatus(msg);
    }
  };

  els.btnAtaAcq?.addEventListener("click", () => runCanonicalAtaMenuAction(0));
  els.btnAtaDel?.addEventListener("click", () => runCanonicalAtaMenuAction(1));
  els.btnAtaDelAll?.addEventListener("click", () => runCanonicalAtaMenuAction(2));

  // ==========================================================================
  // D15 Tab 4: 7 Deterministic Replay-Verified Lessons
  // ==========================================================================
  els.lessonSelect?.addEventListener("change", () => {
    syncSelectedLessonView();
  });

  els.btnStartLesson?.addEventListener("click", () => {
    const lesson = getMdc2060Lesson(els.lessonSelect.value);
    if (!lesson) return;
    const scen = getMdc2060ScenarioById(lesson.recommendedScenarioId) ?? MDC2060_COASTAL_SCENARIO;
    if (els.scenarioSelect) els.scenarioSelect.value = scen.id;
    createFreshSession({ scenario: scen });
    lessonAttempt = {
      lessonId: lesson.id,
      startSeq: bridge.history.length,
      startSessionHash: bridgeSessionHash(bridge),
      baselineAtaCount: getState().ata.targets.length,
    };
    if (els.lessonResult) {
      els.lessonResult.textContent = `Đang thực hành ${lesson.id}: ${lesson.titleVi}\nThực hiện thao tác trên mặt máy MRD-104 rồi nhấn "Chấm điểm bài học".`;
      els.lessonResult.dataset.state = "";
    }
    announceStatus(`Bắt đầu bài học ${lesson.id}: ${lesson.titleVi}`);
  });

  els.btnGradeLesson?.addEventListener("click", () => {
    const lessonId = els.lessonSelect.value;
    const boundary = (lessonAttempt && lessonAttempt.lessonId === lessonId)
      ? lessonAttempt
      : sessionInitBoundary;
    const options = boundary
      ? {
          startSeq: boundary.startSeq,
          startSessionHash: boundary.startSessionHash,
          scenario: activeScenario,
          adapters: activeAdapters,
          baselineAtaCount: boundary.baselineAtaCount,
        }
      : {
          startSeq: 0,
          scenario: activeScenario,
          adapters: activeAdapters,
        };

    const result = assessMdc2060Lesson(bridge, lessonId, options);
    const header = result.passed
      ? `${tMdc2060("vi", "d15.lessonPassed")} — Điểm: ${result.score}/1`
      : `${tMdc2060("vi", "d15.lessonFailed")} — Điểm: ${result.score}/1`;
    const details = [
      header,
      `Bài học: ${result.lessonId} · Replay xác thực: ${result.replayVerified ? "ĐẠT" : "KHÔNG ĐẠT"}`,
      ...(result.reasons.length > 0 ? [`Lý do: ${result.reasons.join(", ")}`] : ["Đáp ứng đầy đủ tiêu chí bài thực hành."]),
      result.note,
    ];
    if (els.lessonResult) {
      els.lessonResult.textContent = details.join("\n");
      els.lessonResult.dataset.state = result.passed ? "pass" : "fail";
    }
    announceStatus(`${header} (${result.lessonId})`);
  });

  // ==========================================================================
  // D15 Tab 5: localStorage, Settings JSON & Replay Envelope
  // ==========================================================================
  els.btnSaveLocal?.addEventListener("click", () => {
    try {
      const encoded = encodeMdc2060Settings(getState().settings);
      const ok = safeStorageSet(MDC2060_SETTINGS_STORAGE_KEY, encoded);
      els.settingsStatus.textContent = ok
        ? "Đã lưu 48 cấu hình menu MDC-2060 vào bộ nhớ trình duyệt."
        : "Trình duyệt không cho phép ghi localStorage.";
      els.settingsStatus.dataset.state = ok ? "pass" : "rejected";
    } catch (err) {
      els.settingsStatus.textContent = `Lỗi lưu cấu hình: ${err?.message ?? "không hợp lệ"}`;
      els.settingsStatus.dataset.state = "rejected";
    }
  });

  els.btnLoadLocal?.addEventListener("click", () => {
    const raw = safeStorageGet(MDC2060_SETTINGS_STORAGE_KEY);
    const decoded = raw ? decodeMdc2060Settings(raw) : null;
    if (!decoded) {
      els.settingsStatus.textContent = "Không tìm thấy cấu hình hợp lệ trong trình duyệt.";
      els.settingsStatus.dataset.state = "rejected";
      return;
    }
    lessonAttempt = null;
    createFreshSession({ scenario: activeScenario, restoreSettings: decoded });
    els.settingsStatus.textContent = "Đã nạp cấu hình từ bộ nhớ trình duyệt (máy ở trạng thái OFF sẵn sàng khởi động).";
    els.settingsStatus.dataset.state = "pass";
    announceStatus("Đã nạp cấu hình MDC-2060 từ trình duyệt.");
  });

  els.btnClearLocal?.addEventListener("click", () => {
    safeStorageRemove(MDC2060_SETTINGS_STORAGE_KEY);
    lastSavedSettingsStr = null;
    els.settingsStatus.textContent = "Đã xóa cấu hình đã lưu trong trình duyệt.";
    els.settingsStatus.dataset.state = "";
  });

  els.settingsJsonIo?.addEventListener("input", () => {
    if (els.inputImportSettings && els.inputImportSettings.value) {
      els.inputImportSettings.value = "";
    }
  });

  els.btnExportSettings?.addEventListener("click", () => {
    try {
      const currentSettings = getState().settings;
      const rawEnvelope = encodeMdc2060Settings(currentSettings);
      if (els.settingsJsonIo) {
        els.settingsJsonIo.value = rawEnvelope;
      }
      if (els.inputImportSettings) {
        els.inputImportSettings.value = "";
      }
      const jsonText = encodeSettingsTransferDocument(currentSettings, rawEnvelope);
      downloadJsonFile("MDC2060-settings-training-only.json", jsonText);
      els.settingsStatus.textContent = "Đã xuất cấu hình JSON vào ô văn bản và tệp MDC2060-settings-training-only.json.";
      els.settingsStatus.dataset.state = "pass";
    } catch (err) {
      els.settingsStatus.textContent = `Không thể xuất cấu hình: ${err?.message ?? "lỗi"}`;
      els.settingsStatus.dataset.state = "rejected";
    }
  });

  els.btnImportSettings?.addEventListener("click", async () => {
    const file = els.inputImportSettings?.files?.[0] ?? null;
    let text = "";
    if (file) {
      if (file.size === 0 || file.size > SETTINGS_TRANSFER_MAX_BYTES) {
        els.settingsStatus.textContent = "Tệp vượt quá giới hạn kích thước cho phép (18 KB) hoặc rỗng.";
        els.settingsStatus.dataset.state = "rejected";
        return;
      }
      try {
        text = await file.text();
      } catch {
        els.settingsStatus.textContent = "Không thể đọc tệp cấu hình (.json).";
        els.settingsStatus.dataset.state = "rejected";
        return;
      }
    } else {
      const rawValue = els.settingsJsonIo?.value ?? "";
      if (rawValue.length > SETTINGS_TRANSFER_MAX_BYTES ||
          utf8ByteLength(rawValue) > SETTINGS_TRANSFER_MAX_BYTES) {
        els.settingsStatus.textContent = "Nội dung cấu hình vượt quá giới hạn kích thước cho phép (18 KB).";
        els.settingsStatus.dataset.state = "rejected";
        return;
      }
      if (!rawValue.trim()) {
        els.settingsStatus.textContent = "Vui lòng dán nội dung JSON cấu hình hoặc chọn tệp cấu hình (.json) trước.";
        els.settingsStatus.dataset.state = "rejected";
        return;
      }
      text = rawValue;
    }

    const res = decodeSettingsImportPayload(text);
    if (!res.ok) {
      els.settingsStatus.textContent = `Từ chối cấu hình JSON: ${res.reason}`;
      els.settingsStatus.dataset.state = "rejected";
      return;
    }

    if (getState().powerMode !== "off") {
      els.settingsStatus.textContent = "Từ chối khôi phục cấu hình: cần tắt nguồn (POWER OFF) trước khi nạp cấu hình JSON.";
      els.settingsStatus.dataset.state = "rejected";
      return;
    }

    lessonAttempt = null;
    let applied = false;
    if (Object.keys(getHeld()).length === 0) {
      applied = dispatchMdc(
        { kind: "restore-settings", settings: res.settings },
        { silent: true },
      );
    }
    if (!applied) {
      createFreshSession({ scenario: activeScenario, restoreSettings: res.settings });
      lastSavedSettingsRef = null;
      persistSettingsIfChanged(getState());
    }
    if (els.settingsJsonIo) {
      els.settingsJsonIo.value = encodeMdc2060Settings(getState().settings);
    }
    if (els.inputImportSettings) {
      els.inputImportSettings.value = "";
    }
    els.settingsStatus.textContent = "Đã nạp và khôi phục cấu hình JSON hợp lệ (máy ở trạng thái OFF để áp dụng an toàn).";
    els.settingsStatus.dataset.state = "pass";
    announceStatus("Đã nạp cấu hình JSON cho MDC-2060.");
  });

  els.btnExportReplay?.addEventListener("click", () => {
    try {
      const envelope = createBridgeReplay(bridge);
      downloadJsonFile("MDC2060-replay-training-only.json", JSON.stringify(envelope, null, 2));
      els.replayImportStatus.textContent = `Đã xuất tệp Replay (${envelope.history.length} sự kiện · ${envelope.finalBridgeHash.slice(0, 18)}).`;
      els.replayImportStatus.dataset.state = "pass";
    } catch (err) {
      els.replayImportStatus.textContent = `Lỗi xuất tệp Replay: ${err?.message ?? "lỗi"}`;
      els.replayImportStatus.dataset.state = "rejected";
    }
  });

  els.btnImportReplay?.addEventListener("click", async () => {
    const file = els.inputImportReplay?.files?.[0];
    if (!file) {
      els.replayImportStatus.textContent = "Vui lòng chọn tệp Replay (.json) trước.";
      els.replayImportStatus.dataset.state = "rejected";
      return;
    }
    if (file.size > REPLAY_IMPORT_MAX_BYTES) {
      els.replayImportStatus.textContent = "Tệp Replay vượt giới hạn 2 MB.";
      els.replayImportStatus.dataset.state = "rejected";
      return;
    }
    try {
      const envelope = JSON.parse(await file.text());
      const deviceOrder = Array.isArray(envelope?.deviceOrder) ? envelope.deviceOrder : [];
      const adapterLookup = new Map([
        [MDC2060_ADAPTER.id, MDC2060_ADAPTER],
        [FCV588_ADAPTER.id, FCV588_ADAPTER],
      ]);
      const replayAdapters = deviceOrder.map(id => adapterLookup.get(id)).filter(Boolean);
      if (replayAdapters.length === 0 || replayAdapters.length !== deviceOrder.length) {
        throw new Error("deviceOrder không khớp thiết bị được hỗ trợ");
      }
      const replayScenario = getMdc2060ScenarioById(envelope.scenarioId)
        ?? (envelope.scenarioId === activeScenario.id ? activeScenario : null);
      if (!replayScenario) {
        throw new Error(`Không tìm thấy kịch bản ${String(envelope.scenarioId)}`);
      }
      const replayed = replayBridgeSession(replayAdapters, replayScenario, envelope);
      const hash = bridgeSessionHash(replayed);
      els.replayImportStatus.textContent = `REPLAY ENVELOPE PASS (${envelope.history.length} sự kiện · ${hash.slice(0, 18)})`;
      els.replayImportStatus.dataset.state = "pass";
      announceStatus("Kiểm chứng tệp Replay thành công.");
    } catch (err) {
      els.replayImportStatus.textContent = `TỪ CHỐI REPLAY: ${err?.message ?? "tệp không hợp lệ"}`;
      els.replayImportStatus.dataset.state = "rejected";
    }
  });

  // ==========================================================================
  // Startup Initialization (Load Saved Settings while OFF + Enable Fast Preheat)
  // ==========================================================================
  const storedRaw = safeStorageGet(MDC2060_SETTINGS_STORAGE_KEY);
  const storedSettings = storedRaw ? decodeMdc2060Settings(storedRaw) : null;
  if (storedSettings) {
    lastSavedSettingsStr = storedRaw;
  }
  createFreshSession({
    scenario: MDC2060_COASTAL_SCENARIO,
    syncFcv: false,
    restoreSettings: storedSettings,
    fastPreheat: true,
    autoPowerFcv: false,
  });

  // ==========================================================================
  // Quantized 250 ms Core Timer (ui-tick + 1 Hz Bridge SimTick)
  // ==========================================================================
  const coreTimer = setInterval(() => {
    const st = getState();
    const needsUiTick =
      st.overlay?.kind === "power-hold" ||
      st.overlay?.kind === "brill" ||
      st.entHeld === true;
    if (needsUiTick) {
      dispatchMdc({ kind: "ui-tick", elapsedMs: 250 });
    }
    if (!paused) {
      worldAccumMs += 250;
      if (worldAccumMs >= 1000) {
        worldAccumMs -= 1000;
        dispatchBridgeTick(1);
      }
    }
  }, 250);

  // ==========================================================================
  // Smooth 60 FPS Visual Sweep Render Loop (Decoupled from Core Determinism)
  // ==========================================================================
  function renderCurrentFrame(nowMs = performance.now()) {
    const effectiveNowMs = paused
      ? (frozenNowMs ?? (frozenNowMs = nowMs))
      : nowMs;
    const st = getState();
    const aisProjection = computeAisProjection(st);
    renderer.render({
      state: st,
      scenario: activeScenario,
      maritimeBus: bridge.sensorBus,
      aisProjection,
      visualAzimuthDeg,
      lcdLang: getEffectiveLcdLang(st),
      nowMs: effectiveNowMs,
    });
  }

  let rafId = 0;
  const renderFrame = (nowMs) => {
    const dtSec = Math.max(0, Math.min(0.25, (nowMs - lastRafMs) / 1000));
    lastRafMs = nowMs;

    const st = getState();
    const txActive =
      st.powerMode === "transmit" ||
      (st.powerMode === "sleep" && st.sleepState?.phase === "burst");

    if (txActive && !paused) {
      const degPerSec = Number(st.settings.motorRpm) === 48 ? 288 : 144;
      visualAzimuthDeg = normalizeDeg360(visualAzimuthDeg + degPerSec * dtSec);
    }

    renderCurrentFrame(paused ? (frozenNowMs ?? (frozenNowMs = nowMs)) : nowMs);
    rafId = window.requestAnimationFrame(renderFrame);
  };
  rafId = window.requestAnimationFrame(renderFrame);

  window.addEventListener("pagehide", () => {
    clearInterval(coreTimer);
    if (rafId) window.cancelAnimationFrame(rafId);
    for (const d of disposableBindings) {
      d.dispose?.();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootMdc2060App, { once: true });
} else {
  bootMdc2060App();
}
