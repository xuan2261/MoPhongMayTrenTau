/**
 * KODEN MDC-2060 Marine Radar — 7 Deterministic, Replay-Verified Instructor
 * Training Lessons (MDC2060-LEARN-01 .. MDC2060-LEARN-07).
 *
 * Supports BOTH createBridgeSession (1 or more adapters, e.g. Bridge Sync)
 * AND standalone createSession (for non-target lessons 01..05).
 * Automatically resolves built-in Bridge Sync adapters (MDC2060_ADAPTER,
 * FCV588_ADAPTER) from deviceOrder when options.adapters is omitted; pass
 * explicit { adapters } for any custom/third-party bridge adapters.
 *
 * TRAINING FEEDBACK ONLY - NOT AN OEM CERTIFICATE.
 */
import {
  TICK_DURATION_MS,
  fingerprint,
  classifyHoldTicks,
  classifyHoldDurationMs,
} from "../../core/protocol.mjs";
import { createSession, dispatch, sessionHash } from "../../core/session.mjs";
import {
  BRIDGE_RUNTIME_VERSION,
  createBridgeSession,
  dispatchBridgeInput,
  bridgeSessionHash,
} from "../../core/device-runtime.mjs";
import { MDC2060_MAIN_MENU_TREE } from "./spec.mjs";
import { projectAisTargets } from "./arpa-ais.mjs";
import { MDC2060_ADAPTER } from "./adapter.mjs";
import { FCV588_ADAPTER } from "../fcv588/adapter.mjs";
import { probeMdc2060 } from "./model.mjs";
import { getMdc2060ScenarioById } from "./scenarios.mjs";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }
  return value;
}

const BOOT_TX_HINT = "Bật nguồn (nhấn ngắn POWER/BRILL), chờ hết sấy về ST'BY và nhấn STBY/TX để phát sóng TX.";

export const MDC2060_LESSONS = deepFreeze([
  {
    id: "MDC2060-LEARN-01",
    titleVi: "Khởi động radar, qua sấy đèn/ST'BY và phát sóng TX",
    titleEn: "Power On, Magnetron Preheat/ST'BY and Transmit (TX)",
    instructionVi:
      "Bắt đầu khi máy TẮT (OFF). Nhấn ngắn POWER/BRILL (<= 3 giây) để vào sấy đèn PREHEAT, chờ đếm ngược về ST'BY, sau đó nhấn STBY/TX để phát sóng TX.",
    profileId: MDC2060_ADAPTER.id,
    manualSection: "§1.2–1.3",
    sourceId: "PUB-MDC2060-REF",
    recommendedScenarioId: "mdc2060-coastal-approach",
    hardwareValidated: false,
    releaseApproved: false,
    gradesStartup: true,
    requiresBridge: false,
    requiredInitialProbes: { powerMode: "off" },
    actions: [
      { kind: "down", control: "power" },
      { kind: "up", control: "power", hold: "short" },
      { kind: "press", control: "stby_tx" },
    ],
    allowedRules: [
      { kind: "down", control: "power" },
      { kind: "cancel", control: "power" },
      { kind: "up", control: "power", hold: "short" },
      { kind: "press", control: "stby_tx" },
    ],
    expectedProbes: { powerMode: "transmit", dialog: null },
    negativeCaseDescription:
      "Nhấn STBY/TX khi máy đang OFF/PREHEAT hoặc giữ POWER > 3 giây không được tính đạt.",
  },
  {
    id: "MDC2060-LEARN-02",
    titleVi: "Chuyển thang đo RANGE (6 NM -> 3 NM) và chỉnh GAIN + STC",
    titleEn: "Step Range 6 NM -> 3 NM and Suppress Sea Clutter (GAIN + STC)",
    instructionVi:
      `${BOOT_TX_HINT} Bắt đầu ở thang 6 NM: nhấn - RANGE hai lần về thang 3 NM, sau đó chỉnh núm GAIN và tăng STC (> 0) để khử nhiễu sóng biển gần.`,
    profileId: MDC2060_ADAPTER.id,
    manualSection: "§1.5–1.6",
    sourceId: "PUB-MDC2060-REF",
    recommendedScenarioId: "mdc2060-coastal-approach",
    hardwareValidated: false,
    releaseApproved: false,
    gradesStartup: false,
    requiresBridge: false,
    requiredInitialProbes: { rangeIndex: 10 },
    actions: [
      { kind: "press", control: "range_down" },
      { kind: "press", control: "range_down" },
      { anyOf: [{ kind: "rotate", control: "gain" }, { kind: "analog", control: "gain" }] },
      { anyOf: [{ kind: "rotate", control: "stc" }, { kind: "analog", control: "stc" }] },
    ],
    allowedRules: [
      { kind: "press", control: "range_down" },
      { kind: "rotate", control: "gain" },
      { kind: "analog", control: "gain" },
      { kind: "rotate", control: "stc" },
      { kind: "analog", control: "stc" },
    ],
    expectedProbes: { powerMode: "transmit", rangeIndex: 8, rangeNm: 3, stcMin: 1 },
    negativeCaseDescription:
      "Chưa hạ đủ về thang 3 NM, bỏ qua GAIN/STC hoặc bấm phím ngoài phạm vi sẽ không đạt.",
  },
  {
    id: "MDC2060-LEARN-03",
    titleVi: "Bật và đo mục tiêu bằng EBL1 & VRM1",
    titleEn: "Enable and Measure a Target with EBL1 & VRM1",
    instructionVi:
      `${BOOT_TX_HINT} Bật EBL1 và VRM1 (bằng phím tắt F1 hoặc MENU > EBL/VRM), sau đó di chuyển con trỏ chữ thập (phím 4 chiều hoặc trên PPI) để đo phương vị và cự ly mục tiêu.`,
    profileId: MDC2060_ADAPTER.id,
    manualSection: "§1.8",
    sourceId: "PUB-MDC2060-REF",
    recommendedScenarioId: "mdc2060-coastal-approach",
    hardwareValidated: false,
    releaseApproved: false,
    gradesStartup: false,
    requiresBridge: false,
    actions: [
      { kind: "press", control: "f1" },
      {
        anyOf: [
          { kind: "pad", control: "cursorpad" },
          { kind: "pointer", control: "ppi_cursor" },
          { kind: "touch", control: "ppi_cursor", phase: "down" },
          { kind: "touch", control: "ppi_cursor", phase: "move" },
          { kind: "touch", control: "ppi_cursor", phase: "up" },
        ],
      },
    ],
    actionSequences: [
      [
        { kind: "press", control: "f1" },
        {
          anyOf: [
            { kind: "pad", control: "cursorpad" },
            { kind: "pointer", control: "ppi_cursor" },
            { kind: "touch", control: "ppi_cursor", phase: "down" },
            { kind: "touch", control: "ppi_cursor", phase: "move" },
            { kind: "touch", control: "ppi_cursor", phase: "up" },
          ],
        },
      ],
      [
        { kind: "up", control: "menu", hold: "short" },
        { kind: "pad", control: "cursorpad" },
        { kind: "up", control: "ent", hold: "short" },
        { kind: "pad", control: "cursorpad" },
        { kind: "up", control: "ent", hold: "short" },
        { kind: "up", control: "menu", hold: "short" },
        {
          anyOf: [
            { kind: "pad", control: "cursorpad" },
            { kind: "pointer", control: "ppi_cursor" },
            { kind: "touch", control: "ppi_cursor", phase: "down" },
            { kind: "touch", control: "ppi_cursor", phase: "move" },
            { kind: "touch", control: "ppi_cursor", phase: "up" },
          ],
        },
      ],
    ],
    allowedRules: [
      { kind: "press", control: "f1" },
      { kind: "down", control: "menu" },
      { kind: "cancel", control: "menu" },
      { kind: "up", control: "menu", hold: "short" },
      { kind: "down", control: "ent" },
      { kind: "cancel", control: "ent" },
      { kind: "up", control: "ent", hold: "short" },
      { kind: "pad", control: "cursorpad" },
      { kind: "pointer", control: "ppi_cursor" },
      { kind: "touch", control: "ppi_cursor" },
    ],
    expectedProbes: {
      powerMode: "transmit",
      ebl1On: true,
      vrm1On: true,
      cursorMoved: true,
      dialog: null,
    },
    negativeCaseDescription:
      "Hủy bằng MENU trước khi lưu ENT, tắt lại F1 hoặc không di chuyển con trỏ đo sẽ không đạt.",
  },
  {
    id: "MDC2060-LEARN-04",
    titleVi: "Khử nhiễu mưa dông bằng FTC (MENU > ECHO) và bật IR",
    titleEn: "Suppress Rain Clutter via FTC and Interference Rejection (IR)",
    instructionVi:
      `${BOOT_TX_HINT} (Khuyến nghị kịch bản bão mưa). Nhấn ngắn MENU vào nhóm ECHO, tăng FTC >= 3 bằng ENT + phím 4 chiều + ENT, rồi xuống chọn IR (1/2/3) và nhấn ENT lưu.`,
    profileId: MDC2060_ADAPTER.id,
    manualSection: "§2.1",
    sourceId: "PUB-MDC2060-REF",
    recommendedScenarioId: "mdc2060-storm-clutter",
    hardwareValidated: false,
    releaseApproved: false,
    gradesStartup: false,
    requiresBridge: false,
    actions: [
      { kind: "up", control: "menu", hold: "short" },
      { kind: "up", control: "ent", hold: "short" },
      { kind: "pad", control: "cursorpad" },
      { kind: "up", control: "ent", hold: "short" },
      { kind: "pad", control: "cursorpad", direction: "down" },
      { kind: "up", control: "ent", hold: "short" },
      { kind: "pad", control: "cursorpad" },
      { kind: "up", control: "ent", hold: "short" },
    ],
    allowedRules: [
      { kind: "down", control: "menu" },
      { kind: "cancel", control: "menu" },
      { kind: "up", control: "menu", hold: "short" },
      { kind: "down", control: "ent" },
      { kind: "cancel", control: "ent" },
      { kind: "up", control: "ent", hold: "short" },
      { kind: "pad", control: "cursorpad" },
    ],
    expectedProbes: { powerMode: "transmit", ftcMin: 3, irEnabled: true },
    negativeCaseDescription:
      "Nhấn MENU hủy chỉnh trước ENT hoặc để FTC < 3 / IR = OFF sẽ không đạt.",
  },
  {
    id: "MDC2060-LEARN-05",
    titleVi: "Chuyển North-Up (N-UP), True Trail (T) và màn hình kép PPI/PPI",
    titleEn: "Configure North-Up (N-UP), True Trail (T) and Dual-Range PPI/PPI",
    instructionVi:
      `${BOOT_TX_HINT} (Đảm bảo cảm biến HDG hoạt động). Mở MENU > DISPLAY, đặt MODE = N-UP, SCREEN = PPI/PPI và TRAIL MODE = T (lưu từng mục bằng ENT).`,
    profileId: MDC2060_ADAPTER.id,
    manualSection: "§2.2",
    sourceId: "PUB-MDC2060-REF",
    recommendedScenarioId: "mdc2060-coastal-approach",
    hardwareValidated: false,
    releaseApproved: false,
    gradesStartup: false,
    requiresBridge: false,
    requiredFixtureState: { headingSensor: true },
    actions: [
      { kind: "up", control: "menu", hold: "short" },
      { kind: "pad", control: "cursorpad", direction: "right" },
      { kind: "up", control: "ent", hold: "short" },
      { kind: "pad", control: "cursorpad" },
      { kind: "up", control: "ent", hold: "short" },
    ],
    allowedRules: [
      { kind: "down", control: "menu" },
      { kind: "cancel", control: "menu" },
      { kind: "up", control: "menu", hold: "short" },
      { kind: "down", control: "ent" },
      { kind: "cancel", control: "ent" },
      { kind: "up", control: "ent", hold: "short" },
      { kind: "pad", control: "cursorpad" },
    ],
    expectedProbes: {
      powerMode: "transmit",
      presentationMode: "N-UP",
      effectivePresentationMode: "N-UP",
      trailMode: "T",
      effectiveTrailMode: "T",
      screenMode: "PPI/PPI",
    },
    negativeCaseDescription:
      "Mất cảm biến HDG (khiến N-UP/True Trail bị thoái biến) hoặc hủy lưu một trong ba mục sẽ không đạt.",
  },
  {
    id: "MDC2060-LEARN-06",
    titleVi: "Thiết lập vùng cảnh giới Guard Zone (ALARM IN) và tắt còi báo động",
    titleEn: "Configure Guard Zone (ALARM IN) and Acknowledge Alarm",
    instructionVi:
      `${BOOT_TX_HINT} Trên kịch bản ven biển (phiên Bridge), mở MENU > ALARM, đặt MODE = IN và nhấn ENT lưu để kích hoạt cảnh báo vùng cảnh giới, sau đó nhấn ALARM ACK để tắt còi (giữ hiển thị cảnh báo).`,
    profileId: MDC2060_ADAPTER.id,
    manualSection: "§2.4",
    sourceId: "PUB-MDC2060-REF",
    recommendedScenarioId: "mdc2060-coastal-approach",
    hardwareValidated: false,
    releaseApproved: false,
    gradesStartup: false,
    requiresBridge: true,
    actions: [
      { kind: "up", control: "menu", hold: "short" },
      { kind: "pad", control: "cursorpad", direction: "right" },
      { kind: "up", control: "ent", hold: "short" },
      { kind: "pad", control: "cursorpad" },
      { kind: "up", control: "ent", hold: "short" },
      { kind: "press", control: "alarm_ack" },
    ],
    allowedRules: [
      { kind: "down", control: "menu" },
      { kind: "cancel", control: "menu" },
      { kind: "up", control: "menu", hold: "short" },
      { kind: "down", control: "ent" },
      { kind: "cancel", control: "ent" },
      { kind: "up", control: "ent", hold: "short" },
      { kind: "pad", control: "cursorpad" },
      { kind: "press", control: "alarm_ack" },
    ],
    expectedProbes: {
      powerMode: "transmit",
      alarmMode: "IN",
      guardZoneTriggered: true,
      alarmVisualActive: true,
      alarmAudible: false,
      guardZoneAudible: false,
    },
    negativeCaseDescription:
      "Quên nhấn ALARM ACK (còi vẫn kêu), hủy đặt MODE = IN hoặc chạy phiên không có mục tiêu 2D sẽ không đạt.",
  },
  {
    id: "MDC2060-LEARN-07",
    titleVi: "Bắt bám mục tiêu ATA (ARPA) thủ công và kiểm tra thông số AIS",
    titleEn: "Manual ATA Target Acquisition and AIS Danger Target Inspection",
    instructionVi:
      `${BOOT_TX_HINT} (Bo ATA & AIS đã lắp). Trên kịch bản ven biển, bắt bám mục tiêu ATA thủ công bằng F2 (hoặc MENU > ATA > ACQ), sau đó mở thông tin AIS (MENU > AIS > INFO hoặc nhấn ngắn ENT lên mục tiêu AIS) để kiểm tra CPA/TCPA.`,
    profileId: MDC2060_ADAPTER.id,
    manualSection: "§2.5–2.6",
    sourceId: "PUB-MDC2060-REF",
    recommendedScenarioId: "mdc2060-coastal-approach",
    hardwareValidated: false,
    releaseApproved: false,
    gradesStartup: false,
    requiresBridge: true,
    requiredFixtureState: { ataBoardOption: true, aisBoardOption: true },
    actions: [
      { kind: "press", control: "f2" },
      { kind: "up", control: "menu", hold: "short" },
      { kind: "pad", control: "cursorpad" },
      { kind: "up", control: "ent", hold: "short" },
    ],
    actionSequences: [
      [
        { kind: "press", control: "f2" },
        { kind: "up", control: "menu", hold: "short" },
        { kind: "pad", control: "cursorpad" },
        { kind: "up", control: "ent", hold: "short" },
      ],
      [
        { kind: "up", control: "menu", hold: "short" },
        { kind: "pad", control: "cursorpad" },
        { kind: "up", control: "ent", hold: "short" },
        { kind: "up", control: "ent", hold: "short" },
      ],
      [
        { kind: "press", control: "f2" },
        {
          anyOf: [
            { kind: "pad", control: "cursorpad" },
            { kind: "pointer", control: "ppi_cursor" },
            { kind: "touch", control: "ppi_cursor", phase: "down" },
            { kind: "touch", control: "ppi_cursor", phase: "move" },
            { kind: "touch", control: "ppi_cursor", phase: "up" },
          ],
        },
        { kind: "up", control: "ent", hold: "short" },
      ],
    ],
    allowedRules: [
      { kind: "press", control: "f2" },
      { kind: "down", control: "menu" },
      { kind: "cancel", control: "menu" },
      { kind: "up", control: "menu", hold: "short" },
      { kind: "down", control: "ent" },
      { kind: "cancel", control: "ent" },
      { kind: "up", control: "ent", hold: "short" },
      { kind: "pad", control: "cursorpad" },
      { kind: "pointer", control: "ppi_cursor" },
      { kind: "touch", control: "ppi_cursor" },
      { kind: "press", control: "alarm_ack" },
    ],
    expectedProbes: {
      powerMode: "transmit",
      minimumAtaTargets: 1,
      aisSelected: true,
    },
    negativeCaseDescription:
      "Tháo bo ATA/AIS, chỉ bắt ATA mà chưa kiểm tra AIS, hoặc chỉ mở AIS mà chưa bắt ATA sẽ không đạt.",
  },
]);

export function getMdc2060Lesson(lessonId) {
  if (typeof lessonId !== "string") return null;
  return MDC2060_LESSONS.find(l => l.id === lessonId) ?? null;
}

const STUDENT_PHYSICAL_KINDS = Object.freeze([
  "press", "pad", "rotate", "push", "down", "up", "cancel", "pointer", "touch", "analog", "keypad",
]);
const INSTRUCTOR_CONTROLS = Object.freeze(["inst_sea_state", "inst_rain", "inst_ftc"]);

function isStudentPhysicalInput(input) {
  if (!input || typeof input !== "object") return false;
  if (!STUDENT_PHYSICAL_KINDS.includes(input.kind)) return false;
  if (INSTRUCTOR_CONTROLS.includes(input.control)) return false;
  return true;
}

function matchesRequirement(evView, req) {
  if (!req || typeof req !== "object") return false;
  if (Array.isArray(req.anyOf)) {
    return req.anyOf.some(branch => matchesRequirement(evView, branch));
  }
  for (const [key, expected] of Object.entries(req)) {
    if (evView[key] !== expected) return false;
  }
  return true;
}

function findSequenceInOrder(events, requiredSteps) {
  let from = 0;
  for (let s = 0; s < requiredSteps.length; s++) {
    const step = requiredSteps[s];
    let found = -1;
    for (let i = from; i < events.length; i++) {
      if (matchesRequirement(events[i], step)) {
        found = i;
        break;
      }
    }
    if (found < 0) return false;
    from = found + 1;
  }
  return true;
}

function matchesAnyRequiredSequence(events, lesson) {
  if (Array.isArray(lesson.actionSequences) && lesson.actionSequences.length > 0) {
    return lesson.actionSequences.some(seq => findSequenceInOrder(events, seq));
  }
  return findSequenceInOrder(events, lesson.actions);
}

function isAllowedStudentEvent(lesson, evView) {
  const rules = Array.isArray(lesson.allowedRules) ? lesson.allowedRules : lesson.actions;
  return rules.some(rule => matchesRequirement(evView, rule));
}

function stripEnvelopeFields(event) {
  const copy = { ...event };
  delete copy.schemaVersion;
  delete copy.seq;
  delete copy.tick;
  return copy;
}

function uiElapsedSinceDown(deviceEvents, control) {
  let uiMs = 0;
  for (let i = deviceEvents.length - 1; i >= 0; i--) {
    const ev = deviceEvents[i];
    if (ev.kind === "down" && ev.control === control) return uiMs;
    if (ev.kind === "ui-tick" && Number.isInteger(ev.elapsedMs)) uiMs += ev.elapsedMs;
  }
  return uiMs;
}

function resolveUpHold(input, heldControls, deviceEvents, currentSimTick) {
  if (input.kind !== "up") return null;
  if (!Object.hasOwn(heldControls, input.control)) return null;
  const threshold = MDC2060_ADAPTER.holdThresholdMs[input.control];
  if (!Number.isInteger(threshold)) return null;
  if (input.durationMs !== undefined) {
    return classifyHoldDurationMs(input.durationMs, threshold);
  }
  const heldSinceTick = heldControls[input.control];
  if (currentSimTick - heldSinceTick < 0) {
    return classifyHoldTicks(currentSimTick - heldSinceTick, threshold);
  }
  const fallbackDurationMs = Math.max(
    (currentSimTick - heldSinceTick) * TICK_DURATION_MS,
    Math.min(120000, uiElapsedSinceDown(deviceEvents, input.control)),
  );
  return classifyHoldDurationMs(Math.min(120000, fallbackDurationMs), threshold);
}

function makeAssessmentResult({ passed, reasons, lessonId, startSeq, replayVerified }) {
  return {
    passed: Boolean(passed),
    reasons,
    lessonId,
    startSeq: Object.is(startSeq, -0) ? 0 : startSeq,
    sourceClass: "INSTRUCTOR_PLATFORM",
    hardwareApproved: false,
    firmwareInstalled: null,
    antiCheatAuthenticated: false,
    replayVerified: Boolean(replayVerified),
    publicReleaseEligible: false,
    score: passed ? 1 : 0,
    note: "TRAINING FEEDBACK ONLY - NOT AN OEM CERTIFICATE",
  };
}

function detectSessionMode(sessionOrBridge) {
  if (!sessionOrBridge || typeof sessionOrBridge !== "object") return null;
  if (sessionOrBridge.bridgeVersion === BRIDGE_RUNTIME_VERSION &&
      Array.isArray(sessionOrBridge.history) &&
      sessionOrBridge.devices && typeof sessionOrBridge.devices === "object" &&
      Array.isArray(sessionOrBridge.deviceOrder) &&
      Object.hasOwn(sessionOrBridge.devices, MDC2060_ADAPTER.id)) {
    return "bridge";
  }
  if (sessionOrBridge.bridgeVersion === undefined &&
      Array.isArray(sessionOrBridge.events) &&
      sessionOrBridge.deviceState && typeof sessionOrBridge.deviceState === "object") {
    return "standalone";
  }
  return null;
}

const BUILTIN_BRIDGE_ADAPTERS = Object.freeze({
  [MDC2060_ADAPTER.id]: MDC2060_ADAPTER,
  [FCV588_ADAPTER.id]: FCV588_ADAPTER,
});

function resolveDefaultBridgeAdapters(deviceOrder) {
  if (!Array.isArray(deviceOrder) || deviceOrder.length === 0) return null;
  const seen = new Set();
  const resolved = [];
  for (let i = 0; i < deviceOrder.length; i++) {
    const id = deviceOrder[i];
    if (typeof id !== "string" || seen.has(id) || !Object.hasOwn(BUILTIN_BRIDGE_ADAPTERS, id)) {
      return null;
    }
    seen.add(id);
    resolved.push(BUILTIN_BRIDGE_ADAPTERS[id]);
  }
  return seen.has(MDC2060_ADAPTER.id) ? resolved : null;
}

function countManualAtaTargets(deviceState) {
  const targets = deviceState?.ata?.targets;
  if (!Array.isArray(targets)) return 0;
  let count = 0;
  for (let i = 0; i < targets.length; i++) {
    if (targets[i] && targets[i].acquisitionType === "M") {
      count += 1;
    }
  }
  return count;
}

function buildBaselineAisEvalSettings(attemptInitialState, currentState) {
  const initSettings = attemptInitialState?.settings ?? {};
  const curSettings = currentState?.settings ?? {};
  return {
    ...curSettings,
    ataCpaLimitNm: Math.max(
      Number.isFinite(initSettings.ataCpaLimitNm) ? initSettings.ataCpaLimitNm : 0.5,
      0.5,
    ),
    ataTcpaLimitMin: Math.max(
      Number.isFinite(initSettings.ataTcpaLimitMin) ? initSettings.ataTcpaLimitMin : 15,
      15,
    ),
    aisFilterRangeNm: Math.max(
      Number.isFinite(initSettings.aisFilterRangeNm) ? initSettings.aisFilterRangeNm : 12,
      Number.isFinite(curSettings.aisFilterRangeNm) ? curSettings.aisFilterRangeNm : 12,
      12,
    ),
    aisBoardOption: currentState?.trainingFixture?.aisBoardOption !== false,
    aisDisplay: "ON",
    aisCpaAlarm: "ON",
  };
}

export function assessMdc2060Lesson(sessionOrBridge, lessonId, rawOptions) {
  const lesson = getMdc2060Lesson(lessonId);
  if (!lesson) {
    return makeAssessmentResult({
      passed: false,
      reasons: ["UNKNOWN_LESSON"],
      lessonId: typeof lessonId === "string" ? lessonId : "",
      startSeq: 0,
      replayVerified: false,
    });
  }

  let startSeq = 0;
  let startSessionHash;
  let scenario;
  let adapters;
  let baselineAtaCount;
  if (rawOptions !== undefined) {
    let optionsValid = false;
    try {
      if (rawOptions && typeof rawOptions === "object" && !Array.isArray(rawOptions)) {
        if (rawOptions.startSeq !== undefined) startSeq = rawOptions.startSeq;
        startSessionHash = rawOptions.startSessionHash;
        scenario = rawOptions.scenario;
        adapters = rawOptions.adapters;
        baselineAtaCount = rawOptions.baselineAtaCount;
        optionsValid = true;
      }
    } catch {
      optionsValid = false;
    }
    if (!optionsValid) {
      return makeAssessmentResult({
        passed: false,
        reasons: ["INVALID_LESSON_BOUNDARY"],
        lessonId: lesson.id,
        startSeq: 0,
        replayVerified: false,
      });
    }
  }

  let mode = null;
  let logLength = 0;
  let sessionScenarioId = null;
  try {
    mode = detectSessionMode(sessionOrBridge);
    if (mode) {
      logLength = mode === "bridge"
        ? sessionOrBridge.history.length
        : sessionOrBridge.events.length;
      sessionScenarioId = sessionOrBridge.scenarioId;
    }
  } catch {
    mode = null;
  }

  if (!mode) {
    return makeAssessmentResult({
      passed: false,
      reasons: ["INVALID_SESSION"],
      lessonId: lesson.id,
      startSeq: 0,
      replayVerified: false,
    });
  }

  if (!Number.isSafeInteger(startSeq) || startSeq < 0 || startSeq > logLength) {
    return makeAssessmentResult({
      passed: false,
      reasons: ["INVALID_LESSON_BOUNDARY"],
      lessonId: lesson.id,
      startSeq: 0,
      replayVerified: false,
    });
  }
  startSeq = Object.is(startSeq, -0) ? 0 : startSeq;
  if (startSeq > 0 && (typeof startSessionHash !== "string" || startSessionHash.length === 0)) {
    return makeAssessmentResult({
      passed: false,
      reasons: ["INVALID_LESSON_BOUNDARY"],
      lessonId: lesson.id,
      startSeq,
      replayVerified: false,
    });
  }
  if (baselineAtaCount !== undefined &&
      (!Number.isSafeInteger(baselineAtaCount) || baselineAtaCount < 0 || baselineAtaCount > 50)) {
    return makeAssessmentResult({
      passed: false,
      reasons: ["INVALID_LESSON_BOUNDARY"],
      lessonId: lesson.id,
      startSeq,
      replayVerified: false,
    });
  }

  const resolvedScenario = scenario ?? getMdc2060ScenarioById(sessionScenarioId);
  const reasons = [];
  if (lesson.requiresBridge && mode !== "bridge") {
    reasons.push("REQUIRES_BRIDGE_SESSION");
  }

  const gradedEvents = [];
  const attemptFixtureEvents = [];
  let replayVerified = false;
  let attemptInitialHash = null;
  let attemptInitialState = null;
  let finalDeviceState = null;
  let finalSensorBus = null;
  let unexpectedOperatorAction = false;
  let poweredOffAction = false;
  let restoreSettingsInAttempt = false;
  let ebl1CommittedInAttempt = false;
  let vrm1CommittedInAttempt = false;
  let eblVrmAdjustedInAttempt = false;
  let ftcCommittedInAttempt = false;
  let irCommittedInAttempt = false;
  let modeNUpCommittedInAttempt = false;
  let trailTCommittedInAttempt = false;
  let screenPpiPpiCommittedInAttempt = false;
  let alarmInCommittedInAttempt = false;
  let guardZoneAckSilencedInAttempt = false;
  let aisInspectedInAttempt = false;

  const inspectMdcInput = (rawInput, preDeviceState, preHeldControls, preDeviceEvents, preSimTick) => {
    if (rawInput.kind === "training-fixture") {
      attemptFixtureEvents.push(rawInput);
      return null;
    }
    if (rawInput.kind === "restore-settings") {
      restoreSettingsInAttempt = true;
      return null;
    }
    const hold = resolveUpHold(rawInput, preHeldControls, preDeviceEvents, preSimTick);
    const evView = hold !== null ? { ...rawInput, hold } : { ...rawInput };
    const isPhys = isStudentPhysicalInput(rawInput);

    const isStartupPower = !lesson.gradesStartup &&
      rawInput.control === "power" &&
      preDeviceState.powerMode === "off" &&
      (rawInput.kind === "down" || rawInput.kind === "cancel" ||
        (rawInput.kind === "up" && hold === "short"));
    const isStartupTx = !lesson.gradesStartup &&
      rawInput.kind === "press" &&
      rawInput.control === "stby_tx" &&
      preDeviceState.powerMode === "standby";
    const isStartupPrereq = isStartupPower || isStartupTx;

    if (!isStartupPrereq) {
      gradedEvents.push(evView);
    }

    const isBrillDismiss = lesson.gradesStartup &&
      preDeviceState.overlay?.kind === "brill" &&
      (rawInput.control === "ent" || rawInput.control === "menu") &&
      (rawInput.kind === "down" || rawInput.kind === "cancel" ||
        (rawInput.kind === "up" && hold === "short"));

    if (isPhys && !isStartupPrereq) {
      if (!isAllowedStudentEvent(lesson, evView) && !isBrillDismiss) {
        unexpectedOperatorAction = true;
      }
      if (lesson.gradesStartup) {
        if (rawInput.control === "stby_tx" && preDeviceState.powerMode !== "standby") {
          poweredOffAction = true;
        }
      } else if (preDeviceState.powerMode === "off" || preDeviceState.powerMode === "preheat") {
        poweredOffAction = true;
      }
    }
    return hold;
  };

  const inspectMdcPostTransition = (rawInput, preDeviceState, postDeviceState, hold, postSensorBus = null) => {
    let committedMenuKey = null;
    if (preDeviceState.overlay?.kind === "menu" &&
        preDeviceState.overlay.editing === true &&
        rawInput.kind === "up" &&
        rawInput.control === "ent" &&
        hold === "short" &&
        postDeviceState.overlay?.kind === "menu" &&
        postDeviceState.overlay.editing === false) {
      const group = MDC2060_MAIN_MENU_TREE[preDeviceState.overlay.groupIndex];
      const item = group?.items?.[preDeviceState.overlay.itemIndex];
      if (typeof item?.key === "string") {
        committedMenuKey = item.key;
      }
    }

    let executedFKeyPreset = null;
    if (rawInput.kind === "press" &&
        (rawInput.control === "f1" || rawInput.control === "f2") &&
        (preDeviceState.powerMode === "standby" || preDeviceState.powerMode === "transmit") &&
        preDeviceState.overlay === null) {
      executedFKeyPreset = rawInput.control === "f1"
        ? (preDeviceState.settings?.f1Key ?? null)
        : (preDeviceState.settings?.f2Key ?? null);
    }

    if ((committedMenuKey === "ebl1" || executedFKeyPreset === "EBL1_VRM1") &&
        postDeviceState.settings?.ebl1 === "ON") {
      ebl1CommittedInAttempt = true;
    }
    if ((committedMenuKey === "vrm1" || executedFKeyPreset === "EBL1_VRM1") &&
        postDeviceState.settings?.vrm1 === "ON") {
      vrm1CommittedInAttempt = true;
    }
    if ((committedMenuKey === "ftc" || executedFKeyPreset === "FTC_STEP") &&
        typeof postDeviceState.settings?.ftc === "number" &&
        postDeviceState.settings.ftc >= 3) {
      ftcCommittedInAttempt = true;
    }
    if ((committedMenuKey === "ir" || executedFKeyPreset === "IR_STEP") &&
        typeof postDeviceState.settings?.ir === "string" &&
        postDeviceState.settings.ir !== "OFF") {
      irCommittedInAttempt = true;
    }
    if ((committedMenuKey === "presentationMode" || executedFKeyPreset === "MODE_CYCLE") &&
        postDeviceState.settings?.presentationMode === "N-UP") {
      modeNUpCommittedInAttempt = true;
    }
    if ((committedMenuKey === "trailMode" || executedFKeyPreset === "TRAIL_TOGGLE") &&
        postDeviceState.settings?.trailMode === "T") {
      trailTCommittedInAttempt = true;
    }
    if ((committedMenuKey === "screenMode" || executedFKeyPreset === "SCREEN_CYCLE") &&
        postDeviceState.settings?.screenMode === "PPI/PPI") {
      screenPpiPpiCommittedInAttempt = true;
    }
    if ((committedMenuKey === "alarmMode" || executedFKeyPreset === "ALARM_TOGGLE") &&
        postDeviceState.settings?.alarmMode === "IN") {
      alarmInCommittedInAttempt = true;
    }
    const isAlarmAckPress = (rawInput.kind === "press" && rawInput.control === "alarm_ack") ||
      executedFKeyPreset === "ALARM_ACK";
    if (isAlarmAckPress &&
        preDeviceState.guardZone?.audible === true &&
        postDeviceState.guardZone?.audible === false &&
        postDeviceState.alarms?.audible === false &&
        (lesson.expectedProbes?.alarmMode === undefined ||
          preDeviceState.guardZone?.mode === lesson.expectedProbes.alarmMode)) {
      guardZoneAckSilencedInAttempt = true;
    }

    const isNonCancelCursorMove =
      (rawInput.kind === "pad" && rawInput.control === "cursorpad") ||
      (rawInput.kind === "pointer" && rawInput.control === "ppi_cursor") ||
      (rawInput.kind === "touch" && rawInput.control === "ppi_cursor" && rawInput.phase !== "cancel");
    if (isNonCancelCursorMove &&
        postDeviceState.overlay === null &&
        postDeviceState.settings?.ebl1 === "ON" &&
        postDeviceState.settings?.vrm1 === "ON") {
      const markerChanged = postDeviceState.ebl1Deg !== preDeviceState.ebl1Deg ||
        postDeviceState.vrm1Nm !== preDeviceState.vrm1Nm;
      const cursorChanged = postDeviceState.cursor?.xFrac !== preDeviceState.cursor?.xFrac ||
        postDeviceState.cursor?.yFrac !== preDeviceState.cursor?.yFrac;
      if (markerChanged || (cursorChanged && postDeviceState.activeMarker === "ebl1_vrm1")) {
        eblVrmAdjustedInAttempt = true;
      }
    }
    if (preDeviceState.overlay?.kind !== "ais-info" &&
        postDeviceState.overlay?.kind === "ais-info" &&
        typeof postDeviceState.ais?.selectedMmsi === "string" &&
        postDeviceState.ais.selectedMmsi.length > 0 &&
        postDeviceState.ais.selectedTarget !== null) {
      const baselineProj = postSensorBus
        ? projectAisTargets(
            postSensorBus,
            buildBaselineAisEvalSettings(attemptInitialState, postDeviceState),
            postDeviceState.ais.selectedMmsi,
          )
        : null;
      const hasDangerTargets = (Array.isArray(postDeviceState.ais?.dangerousMmsis) &&
          postDeviceState.ais.dangerousMmsis.length > 0) ||
        (Array.isArray(baselineProj?.dangerousMmsis) &&
          baselineProj.dangerousMmsis.length > 0);
      const targetIsDangerous = postDeviceState.ais?.selectedTarget?.dangerous === true &&
        (baselineProj ? baselineProj.selectedTarget?.dangerous === true : true);
      if (!hasDangerTargets || targetIsDangerous) {
        aisInspectedInAttempt = true;
      }
    }
  };

  try {
    if (!resolvedScenario ||
        sessionOrBridge.scenarioId !== resolvedScenario.id ||
        sessionOrBridge.scenarioVersion !== resolvedScenario.version ||
        !sessionOrBridge.meta) {
      throw new Error("scenario/meta contract mismatch");
    }

    if (mode === "bridge") {
      let resolvedAdapters;
      if (adapters !== undefined) {
        if (!Array.isArray(adapters)) {
          throw new Error("invalid bridge adapters list");
        }
        const snap = Array.from(adapters);
        if (!snap.includes(MDC2060_ADAPTER)) {
          throw new Error("missing canonical MDC2060_ADAPTER in bridge adapters");
        }
        resolvedAdapters = [];
        for (let i = 0; i < snap.length; i++) {
          const a = snap[i];
          if (!a || typeof a !== "object") {
            throw new Error("invalid bridge adapter entry");
          }
          if (a === MDC2060_ADAPTER || a === FCV588_ADAPTER) {
            resolvedAdapters.push(a);
            continue;
          }
          let protoDepth = 0;
          for (let proto = a; proto !== null; proto = Object.getPrototypeOf(proto)) {
            if (++protoDepth > 32) {
              throw new Error("invalid bridge adapter prototype chain");
            }
            const desc = Object.getOwnPropertyDescriptor(proto, "id");
            if (desc) {
              if (typeof desc.get === "function" || typeof desc.set === "function") {
                throw new Error("bridge adapter id must be a plain data property");
              }
              break;
            }
          }
          const initialFn = a.initial;
          const reduceFn = a.reduce;
          if (typeof initialFn !== "function" || typeof reduceFn !== "function") {
            throw new Error("invalid bridge adapter entry");
          }
          const snapId = a.id;
          if (typeof snapId !== "string" ||
              snapId.length === 0 ||
              snapId === "bridge" ||
              Object.hasOwn(BUILTIN_BRIDGE_ADAPTERS, snapId)) {
            throw new Error(`forged or invalid bridge adapter id: ${String(snapId)}`);
          }
          const snapFixtures = a.fixtures;
          const probeFn = a.probe;
          resolvedAdapters.push(Object.freeze({
            id: snapId,
            revision: a.revision,
            profile: a.profile,
            controls: a.controls,
            gestures: a.gestures,
            holdThresholdMs: a.holdThresholdMs,
            ...(snapFixtures !== undefined ? { fixtures: snapFixtures } : {}),
            initial: (...args) => initialFn.apply(a, args),
            reduce: (...args) => reduceFn.apply(a, args),
            ...(typeof probeFn === "function" ? { probe: (...args) => probeFn.apply(a, args) } : {}),
          }));
        }
        Object.freeze(resolvedAdapters);
      } else {
        resolvedAdapters = resolveDefaultBridgeAdapters(sessionOrBridge.deviceOrder);
      }
      if (!resolvedAdapters) {
        throw new Error("missing bridge adapters list for multi-device session");
      }
      let cursor = createBridgeSession(resolvedAdapters, resolvedScenario);
      for (let i = 0; i < cursor.deviceOrder.length; i++) {
        const devId = cursor.deviceOrder[i];
        if (Object.hasOwn(BUILTIN_BRIDGE_ADAPTERS, devId) &&
            resolvedAdapters[i] !== BUILTIN_BRIDGE_ADAPTERS[devId]) {
          throw new Error(`forged built-in bridge adapter slot for ${devId}`);
        }
      }
      if (sessionOrBridge.deviceOrder.join("|") !== cursor.deviceOrder.join("|") ||
          fingerprint(sessionOrBridge.meta) !== fingerprint(cursor.meta)) {
        throw new Error("bridge meta/order mismatch");
      }
      if (startSeq === 0) {
        attemptInitialHash = bridgeSessionHash(cursor);
        attemptInitialState = cursor.devices[MDC2060_ADAPTER.id].deviceState;
      }
      for (let i = 0; i < sessionOrBridge.history.length; i++) {
        const entry = sessionOrBridge.history[i];
        if (!entry || typeof entry !== "object" || Array.isArray(entry) ||
            entry.seq !== i + 1 ||
            entry.tick !== cursor.maritimeWorld.simTick ||
            typeof entry.targetId !== "string" ||
            !entry.input || typeof entry.input !== "object") {
          throw new Error("bridge history entry mismatch");
        }
        const isAttemptMdcEvent = i >= startSeq && entry.targetId === MDC2060_ADAPTER.id;
        let preMdcState = null;
        let attemptHold = null;
        if (isAttemptMdcEvent) {
          const slot = cursor.devices[MDC2060_ADAPTER.id];
          preMdcState = slot.deviceState;
          attemptHold = inspectMdcInput(
            entry.input,
            slot.deviceState,
            slot.heldControls,
            slot.events,
            cursor.maritimeWorld.simTick,
          );
        }
        cursor = dispatchBridgeInput(
          cursor,
          resolvedAdapters,
          entry.targetId,
          entry.input,
          resolvedScenario,
        );
        if (isAttemptMdcEvent && preMdcState) {
          inspectMdcPostTransition(
            entry.input,
            preMdcState,
            cursor.devices[MDC2060_ADAPTER.id].deviceState,
            attemptHold,
            cursor.sensorBus,
          );
        }
        if (i + 1 === startSeq) {
          attemptInitialHash = bridgeSessionHash(cursor);
          attemptInitialState = cursor.devices[MDC2060_ADAPTER.id].deviceState;
        }
      }
      replayVerified = bridgeSessionHash(cursor) === bridgeSessionHash(sessionOrBridge);
      finalDeviceState = cursor.devices[MDC2060_ADAPTER.id].deviceState;
      finalSensorBus = cursor.sensorBus;
      if (!replayVerified) {
        attemptInitialState = null;
        attemptInitialHash = null;
      }
    } else {
      if (sessionOrBridge.deviceId !== MDC2060_ADAPTER.id ||
          sessionOrBridge.profileRevision !== MDC2060_ADAPTER.revision) {
        throw new Error("standalone session adapter mismatch");
      }
      let cursor = createSession(MDC2060_ADAPTER, resolvedScenario);
      if (fingerprint(sessionOrBridge.meta) !== fingerprint(cursor.meta)) {
        throw new Error("standalone meta mismatch");
      }
      if (startSeq === 0) {
        attemptInitialHash = sessionHash(cursor);
        attemptInitialState = cursor.deviceState;
      }
      for (let i = 0; i < sessionOrBridge.events.length; i++) {
        const event = sessionOrBridge.events[i];
        if (!event || typeof event !== "object" || Array.isArray(event) ||
            event.seq !== i + 1 ||
            event.tick !== cursor.worldState.simTick ||
            event.schemaVersion !== cursor.meta.schemaVersion) {
          throw new Error("standalone event sequence/clock/schema mismatch");
        }
        const rawInput = stripEnvelopeFields(event);
        const isAttemptEvent = i >= startSeq;
        const preDeviceState = isAttemptEvent ? cursor.deviceState : null;
        let attemptHold = null;
        if (isAttemptEvent) {
          attemptHold = inspectMdcInput(
            rawInput,
            cursor.deviceState,
            cursor.heldControls,
            cursor.events,
            cursor.worldState.simTick,
          );
        }
        cursor = dispatch(cursor, MDC2060_ADAPTER, rawInput, resolvedScenario);
        if (isAttemptEvent && preDeviceState) {
          inspectMdcPostTransition(rawInput, preDeviceState, cursor.deviceState, attemptHold, null);
        }
        if (i + 1 === startSeq) {
          attemptInitialHash = sessionHash(cursor);
          attemptInitialState = cursor.deviceState;
        }
      }
      replayVerified = sessionHash(cursor) === sessionHash(sessionOrBridge);
      finalDeviceState = cursor.deviceState;
      if (!replayVerified) {
        attemptInitialState = null;
        attemptInitialHash = null;
      }
    }
  } catch {
    replayVerified = false;
    attemptInitialState = null;
    attemptInitialHash = null;
    finalDeviceState = null;
    finalSensorBus = null;
  }

  if (!replayVerified) {
    reasons.push("REPLAY_STATE_MISMATCH");
  }

  if (attemptInitialState) {
    if (startSessionHash !== undefined &&
        (typeof startSessionHash !== "string" || startSessionHash !== attemptInitialHash)) {
      reasons.push("LESSON_BOUNDARY_MISMATCH");
    }
    if (baselineAtaCount !== undefined &&
        attemptInitialState.ata.targets.length !== baselineAtaCount) {
      reasons.push("LESSON_ATA_BASELINE_MISMATCH");
    }
    const initProbes = probeMdc2060(attemptInitialState);
    for (const [field, expected] of Object.entries(lesson.requiredInitialProbes ?? {})) {
      if (initProbes[field] !== expected) {
        reasons.push(`WRONG_INITIAL_${field}`);
      }
    }
    let wrongContext = restoreSettingsInAttempt;
    for (const [fixture, expected] of Object.entries(lesson.requiredFixtureState ?? {})) {
      if (attemptInitialState.trainingFixture?.[fixture] !== expected ||
          attemptFixtureEvents.some(e => e.fixture === fixture && e.enabled !== expected)) {
        wrongContext = true;
      }
    }
    if (wrongContext) {
      reasons.push("WRONG_TRAINING_CONTEXT");
    }
    if (poweredOffAction) {
      reasons.push("ACTION_WHILE_POWERED_OFF");
    }
    if (unexpectedOperatorAction) {
      reasons.push("UNEXPECTED_OPERATOR_ACTIONS");
    }
  }

  if (!matchesAnyRequiredSequence(gradedEvents, lesson)) {
    reasons.push("MISSING_REQUIRED_ACTION_SEQUENCE");
  }

  if (finalDeviceState) {
    const finalProbes = probeMdc2060(finalDeviceState);
    const baseAta = baselineAtaCount !== undefined
      ? baselineAtaCount
      : (attemptInitialState ? attemptInitialState.ata.targets.length : 0);
    const baseManualAta = attemptInitialState ? countManualAtaTargets(attemptInitialState) : 0;
    const finalManualAta = countManualAtaTargets(finalDeviceState);

    for (const [field, expected] of Object.entries(lesson.expectedProbes)) {
      if (field === "stcMin") {
        if (typeof finalProbes.stc !== "number" || finalProbes.stc < expected) {
          reasons.push("WRONG_PROBE_stcMin");
        }
      } else if (field === "ftcMin") {
        if (typeof finalProbes.ftc !== "number" ||
            finalProbes.ftc < expected ||
            !ftcCommittedInAttempt) {
          reasons.push("WRONG_PROBE_ftcMin");
        }
      } else if (field === "irEnabled") {
        const isOn = finalProbes.ir !== "OFF" && irCommittedInAttempt;
        if (isOn !== expected) {
          reasons.push("WRONG_PROBE_irEnabled");
        }
      } else if (field === "ebl1On") {
        const ok = expected === true
          ? (finalProbes.ebl1On === true && ebl1CommittedInAttempt)
          : finalProbes.ebl1On === expected;
        if (!ok) {
          reasons.push("WRONG_PROBE_ebl1On");
        }
      } else if (field === "vrm1On") {
        const ok = expected === true
          ? (finalProbes.vrm1On === true && vrm1CommittedInAttempt)
          : finalProbes.vrm1On === expected;
        if (!ok) {
          reasons.push("WRONG_PROBE_vrm1On");
        }
      } else if (field === "presentationMode") {
        const ok = finalProbes.presentationMode === expected &&
          (expected !== "N-UP" || modeNUpCommittedInAttempt);
        if (!ok) {
          reasons.push("WRONG_PROBE_presentationMode");
        }
      } else if (field === "trailMode") {
        const ok = finalProbes.trailMode === expected &&
          (expected !== "T" || trailTCommittedInAttempt);
        if (!ok) {
          reasons.push("WRONG_PROBE_trailMode");
        }
      } else if (field === "screenMode") {
        const ok = finalProbes.screenMode === expected &&
          (expected !== "PPI/PPI" || screenPpiPpiCommittedInAttempt);
        if (!ok) {
          reasons.push("WRONG_PROBE_screenMode");
        }
      } else if (field === "alarmMode") {
        const ok = finalProbes.alarmMode === expected &&
          (expected !== "IN" || alarmInCommittedInAttempt);
        if (!ok) {
          reasons.push("WRONG_PROBE_alarmMode");
        }
      } else if (field === "alarmAudible") {
        const ok = finalProbes.alarmAudible === expected &&
          (expected !== false || !lesson.requiresBridge || guardZoneAckSilencedInAttempt);
        if (!ok) {
          reasons.push("WRONG_PROBE_alarmAudible");
        }
      } else if (field === "guardZoneAudible") {
        const ok = finalProbes.guardZoneAudible === expected &&
          (expected !== false || !lesson.requiresBridge || guardZoneAckSilencedInAttempt);
        if (!ok) {
          reasons.push("WRONG_PROBE_guardZoneAudible");
        }
      } else if (field === "cursorMoved") {
        const moved = Math.hypot(
          finalDeviceState.cursor?.xFrac ?? 0,
          finalDeviceState.cursor?.yFrac ?? 0,
        ) > 0;
        const ok = moved && eblVrmAdjustedInAttempt;
        if (ok !== expected) {
          reasons.push("WRONG_PROBE_cursorMoved");
        }
      } else if (field === "minimumAtaTargets") {
        const addedTotal = finalProbes.ataCount - baseAta;
        const addedManual = finalManualAta - baseManualAta;
        if (addedTotal < expected || addedManual < expected) {
          reasons.push("WRONG_PROBE_minimumAtaTargets");
        }
      } else if (field === "aisSelected") {
        const hasSel = typeof finalProbes.selectedAisMmsi === "string" &&
          finalProbes.selectedAisMmsi.length > 0 &&
          aisInspectedInAttempt;
        if (hasSel !== expected) {
          reasons.push("WRONG_PROBE_aisSelected");
        }
        const finalBaselineProj = finalSensorBus
          ? projectAisTargets(
              finalSensorBus,
              buildBaselineAisEvalSettings(attemptInitialState, finalDeviceState),
              finalDeviceState.ais?.selectedMmsi ?? null,
            )
          : null;
        const finalHasDangerTargets = (Array.isArray(finalDeviceState.ais?.dangerousMmsis) &&
            finalDeviceState.ais.dangerousMmsis.length > 0) ||
          (Array.isArray(finalBaselineProj?.dangerousMmsis) &&
            finalBaselineProj.dangerousMmsis.length > 0);
        const finalTargetIsDangerous = finalDeviceState.ais?.selectedTarget?.dangerous === true &&
          (finalBaselineProj ? finalBaselineProj.selectedTarget?.dangerous === true : true);
        if (expected === true && finalHasDangerTargets && !finalTargetIsDangerous) {
          reasons.push("WRONG_PROBE_aisDangerTarget");
        }
      } else if (finalProbes[field] !== expected) {
        reasons.push(`WRONG_PROBE_${field}`);
      }
    }
  } else if (!reasons.includes("REPLAY_STATE_MISMATCH")) {
    reasons.push("INVALID_SESSION");
  }

  return makeAssessmentResult({
    passed: reasons.length === 0,
    reasons,
    lessonId: lesson.id,
    startSeq,
    replayVerified,
  });
}
