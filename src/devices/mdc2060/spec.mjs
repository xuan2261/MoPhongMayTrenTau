/**
 * KODEN MDC-2060 (MRD-104 / RB717A) Marine Radar — Public-Reference Hardware
 * Specifications, 18 Standard Ranges, Original Training Palettes & Menu Trees.
 *
 * PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY.
 * All color palettes are independently authored ORIGINAL_TRAINING_ARTWORK
 * (never OEM firmware RGB captures or extracted OEM manual assets).
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }
  return value;
}

function hexToRgb(hex) {
  const clean = String(hex).replace(/^#/, "");
  const num = parseInt(clean, 16);
  return Object.freeze([(num >> 16) & 255, (num >> 8) & 255, num & 255]);
}

function makePalette(cfg) {
  return {
    id: cfg.id,
    sourceClass: "ORIGINAL_TRAINING_ARTWORK",
    isLightBackground: Boolean(cfg.isLightBackground),
    background: cfg.background,
    backgroundRgb: hexToRgb(cfg.background),
    ppiFill: cfg.ppiFill,
    ppiFillRgb: hexToRgb(cfg.ppiFill),
    echoLutHex: cfg.echoLutHex,
    echoLutRgb: cfg.echoLutHex.map(hexToRgb),
    trailColor: cfg.trailColor,
    trailRgb: hexToRgb(cfg.trailColor),
    sweepBeamColor: cfg.sweepBeamColor,
    textPrimary: cfg.textPrimary,
    textSecondary: cfg.textSecondary,
    textAccent: cfg.textAccent,
    ringColor: cfg.ringColor,
    compassColor: cfg.compassColor,
    headingLineColor: cfg.headingLineColor,
    ebl1Color: cfg.ebl1Color,
    ebl2Color: cfg.ebl2Color,
    vrm1Color: cfg.vrm1Color,
    vrm2Color: cfg.vrm2Color,
    piLineColor: cfg.piLineColor,
    cursorColor: cfg.cursorColor,
    guardZoneColor: cfg.guardZoneColor,
    guardZoneAlarmColor: cfg.guardZoneAlarmColor,
    ataColor: cfg.ataColor,
    aisColor: cfg.aisColor,
    dangerColor: cfg.dangerColor,
    menuBg: cfg.menuBg,
    menuBorder: cfg.menuBorder,
    menuHighlight: cfg.menuHighlight,
    barTrack: cfg.barTrack,
    barFillGain: cfg.barFillGain,
    barFillStc: cfg.barFillStc,
    barFillFtc: cfg.barFillFtc,
  };
}

export const MDC2060_ID = "koden.mdc2060.mrd104";
export const MDC2060_PROFILE_REVISION = "F1-mdc2060-public-ref-1";

export const MDC2060_RANGES = deepFreeze([
  { nm: 0.0625, ringNm: 0.03125, rings: 2, defaultPw: "S1" },
  { nm: 0.125,  ringNm: 0.0625,  rings: 2, defaultPw: "S1" },
  { nm: 0.25,   ringNm: 0.125,   rings: 2, defaultPw: "S1" },
  { nm: 0.5,    ringNm: 0.25,    rings: 2, defaultPw: "S1" },
  { nm: 0.75,   ringNm: 0.25,    rings: 3, defaultPw: "S2" },
  { nm: 1,      ringNm: 0.25,    rings: 4, defaultPw: "S2" },
  { nm: 1.5,    ringNm: 0.5,     rings: 3, defaultPw: "M1" },
  { nm: 2,      ringNm: 0.5,     rings: 4, defaultPw: "M1" },
  { nm: 3,      ringNm: 0.75,    rings: 4, defaultPw: "M1" },
  { nm: 4,      ringNm: 1,       rings: 4, defaultPw: "M2" },
  { nm: 6,      ringNm: 1.5,     rings: 4, defaultPw: "M2" },
  { nm: 8,      ringNm: 2,       rings: 4, defaultPw: "M2" },
  { nm: 12,     ringNm: 3,       rings: 4, defaultPw: "L" },
  { nm: 16,     ringNm: 4,       rings: 4, defaultPw: "L" },
  { nm: 24,     ringNm: 6,       rings: 4, defaultPw: "L" },
  { nm: 32,     ringNm: 8,       rings: 4, defaultPw: "L" },
  { nm: 48,     ringNm: 12,      rings: 4, defaultPw: "L" },
  { nm: 64,     ringNm: 16,      rings: 4, defaultPw: "L" },
]);

export const MDC2060_PRESENTATION_MODES = Object.freeze(["H-UP", "N-UP", "C-UP", "W-UP"]);
export const MDC2060_MOTION_MODES = Object.freeze(["RM", "TM"]);
export const MDC2060_SCREEN_MODES = Object.freeze(["PPI", "PPI/PPI", "PPI/NAV"]);
export const MDC2060_RANGE_UNITS = Object.freeze(["NM", "km", "sm"]);

export const MDC2060_RADAR_SPECS = deepFreeze({
  id: MDC2060_ID,
  revision: MDC2060_PROFILE_REVISION,
  manufacturer: "KODEN",
  model: "MDC-2060",
  displayUnit: "MRD-104",
  scannerUnit: "RB717A",
  txPowerKw: 6,
  band: "X-band",
  horizontalBeamwidthDeg: 1.8,
  verticalBeamwidthDeg: 22,
  lcdWidthPx: 480,
  lcdHeightPx: 640,
  lcdDiagonalInches: 10.4,
  videoLevels: 8,
  preheatAuthenticSec: 120,
  preheatFastSec: 5,
  sleepBurstSec: 30,
  offCenterMaxFrac: 0.66,
  tmResetEdgeFrac: 0.66,
  maxAtaTargets: 50,
  ataStabilizeTicks: 6,
  ataMaxPastPositions: 6,
  ataPastPosIntervalSec: 30,
  maxAisTargets: 100,
  polarAzimuths: 360,
  polarRangeBins: 160,
  motorRpmOptions: [24, 48],
  defaultRangeIndex: 10,
  defaultSubRangeIndex: 7,
  holdThresholdMs: { power: 3000, ent: 1200, menu: 1500 },
  unitConversions: { NM: 1, km: 1.852, sm: 1.150779448 },
  sourceClass: "PUBLIC_REFERENCE_TRAINING_SPECS",
});

export const MDC2060_COLOR_PALETTES = deepFreeze({
  DAY: makePalette({
    id: "DAY",
    isLightBackground: false,
    background: "#061838",
    ppiFill: "#041028",
    echoLutHex: ["#041028", "#2d4c18", "#6f8d16", "#c4b81b", "#f2d824", "#f79b1e", "#ef561c", "#e62429"],
    trailColor: "#4688d8",
    sweepBeamColor: "#7ef5ff",
    textPrimary: "#f2f9ff",
    textSecondary: "#8fd4f5",
    textAccent: "#5ce8ff",
    ringColor: "#2b5c8f",
    compassColor: "#6fb3e8",
    headingLineColor: "#e8f6ff",
    ebl1Color: "#48f0ff",
    ebl2Color: "#ffe45e",
    vrm1Color: "#48f0ff",
    vrm2Color: "#ffe45e",
    piLineColor: "#93a8d8",
    cursorColor: "#ffffff",
    guardZoneColor: "#f5c842",
    guardZoneAlarmColor: "#ff3b47",
    ataColor: "#6ef79a",
    aisColor: "#6ee7ff",
    dangerColor: "#ff3b47",
    menuBg: "#091f45",
    menuBorder: "#4da6ff",
    menuHighlight: "#164785",
    barTrack: "#122e57",
    barFillGain: "#48e88a",
    barFillStc: "#f5c23b",
    barFillFtc: "#48d8ff",
  }),
  NIGHT: makePalette({
    id: "NIGHT",
    isLightBackground: false,
    background: "#050406",
    ppiFill: "#020204",
    echoLutHex: ["#020204", "#361e06", "#633809", "#94560d", "#c47c12", "#e09a1e", "#d95718", "#cf2620"],
    trailColor: "#7a4028",
    sweepBeamColor: "#e0963b",
    textPrimary: "#e89a4c",
    textSecondary: "#b56c2c",
    textAccent: "#ffc270",
    ringColor: "#4d2b12",
    compassColor: "#8c5222",
    headingLineColor: "#d9873c",
    ebl1Color: "#d9822b",
    ebl2Color: "#b89c3b",
    vrm1Color: "#d9822b",
    vrm2Color: "#b89c3b",
    piLineColor: "#87532a",
    cursorColor: "#ffc270",
    guardZoneColor: "#c77c26",
    guardZoneAlarmColor: "#ff332b",
    ataColor: "#d49a3a",
    aisColor: "#c97f36",
    dangerColor: "#ff332b",
    menuBg: "#140b05",
    menuBorder: "#9e591d",
    menuHighlight: "#3d210b",
    barTrack: "#241408",
    barFillGain: "#c98830",
    barFillStc: "#b55e22",
    barFillFtc: "#9e7334",
  }),
  GREEN: makePalette({
    id: "GREEN",
    isLightBackground: false,
    background: "#030a05",
    ppiFill: "#020704",
    echoLutHex: ["#020704", "#0c2e14", "#165423", "#227d32", "#34a844", "#52d15b", "#7bf075", "#b8ff9e"],
    trailColor: "#1d6b47",
    sweepBeamColor: "#80ff96",
    textPrimary: "#9ef796",
    textSecondary: "#4db854",
    textAccent: "#ccffbf",
    ringColor: "#1b5226",
    compassColor: "#3e9947",
    headingLineColor: "#9ef796",
    ebl1Color: "#80ffaa",
    ebl2Color: "#d4ff7a",
    vrm1Color: "#80ffaa",
    vrm2Color: "#d4ff7a",
    piLineColor: "#398a4a",
    cursorColor: "#ccffbf",
    guardZoneColor: "#f5c842",
    guardZoneAlarmColor: "#ff3b47",
    ataColor: "#b8ff9e",
    aisColor: "#7ef5c8",
    dangerColor: "#ff4545",
    menuBg: "#061a0b",
    menuBorder: "#3fa84a",
    menuHighlight: "#13451d",
    barTrack: "#0d2914",
    barFillGain: "#66eb73",
    barFillStc: "#98f564",
    barFillFtc: "#4ad98b",
  }),
  WHITE: makePalette({
    id: "WHITE",
    isLightBackground: true,
    background: "#eef3f0",
    ppiFill: "#e4ece8",
    echoLutHex: ["#e4ece8", "#9bb8d4", "#5482b5", "#245496", "#163578", "#8f3278", "#c9381e", "#a81016"],
    trailColor: "#6c7c94",
    sweepBeamColor: "#0a6696",
    textPrimary: "#0f2438",
    textSecondary: "#334e68",
    textAccent: "#0b4f8c",
    ringColor: "#8ba2b5",
    compassColor: "#486581",
    headingLineColor: "#0f2438",
    ebl1Color: "#006896",
    ebl2Color: "#8c5600",
    vrm1Color: "#006896",
    vrm2Color: "#8c5600",
    piLineColor: "#52667a",
    cursorColor: "#0f2438",
    guardZoneColor: "#9c5700",
    guardZoneAlarmColor: "#c9121e",
    ataColor: "#0c6e3a",
    aisColor: "#0b4f8c",
    dangerColor: "#c9121e",
    menuBg: "#f7faf8",
    menuBorder: "#1e4a70",
    menuHighlight: "#cbe0f2",
    barTrack: "#c8d6d0",
    barFillGain: "#167846",
    barFillStc: "#b36b00",
    barFillFtc: "#0a6696",
  }),
});

export const MDC2060_FKEY_PRESETS = deepFreeze([
  { id: "EBL1_VRM1", labelKey: "fkey.EBL1_VRM1" },
  { id: "ATA_ACQ", labelKey: "fkey.ATA_ACQ" },
  { id: "MODE_CYCLE", labelKey: "fkey.MODE_CYCLE" },
  { id: "SCREEN_CYCLE", labelKey: "fkey.SCREEN_CYCLE" },
  { id: "OFF_CENTER", labelKey: "fkey.OFF_CENTER" },
  { id: "TRAIL_TOGGLE", labelKey: "fkey.TRAIL_TOGGLE" },
  { id: "FTC_STEP", labelKey: "fkey.FTC_STEP" },
  { id: "IR_STEP", labelKey: "fkey.IR_STEP" },
  { id: "AIS_TOGGLE", labelKey: "fkey.AIS_TOGGLE" },
  { id: "ALARM_TOGGLE", labelKey: "fkey.ALARM_TOGGLE" },
  { id: "COLOR_CYCLE", labelKey: "fkey.COLOR_CYCLE" },
  { id: "ALARM_ACK", labelKey: "fkey.ALARM_ACK" },
]);

const FKEY_IDS = Object.freeze(MDC2060_FKEY_PRESETS.map(p => p.id));

export const MDC2060_MAIN_MENU_TREE = deepFreeze([
  {
    id: "echo",
    label: "ECHO",
    labelKey: "menu.group.echo",
    items: [
      { key: "ftc", label: "FTC", labelKey: "menu.item.ftc", type: "int", min: 0, max: 8, step: 1, default: 0 },
      { key: "ir", label: "IR", labelKey: "menu.item.ir", type: "choice", options: ["OFF", "1", "2", "3"], default: "OFF" },
      { key: "exp", label: "EXP", labelKey: "menu.item.exp", type: "choice", options: ["OFF", "1", "2"], default: "OFF" },
      { key: "process", label: "PROCESS", labelKey: "menu.item.process", type: "choice", options: ["OFF", "AVG1", "AVG2", "PEAK"], default: "OFF" },
      { key: "pw", label: "PW", labelKey: "menu.item.pw", type: "choice", options: ["AUTO", "S1", "S2", "M1", "M2", "L"], default: "AUTO" },
      { key: "subGain", label: "SUB GAIN", labelKey: "menu.item.subGain", type: "int", min: -20, max: 20, step: 1, default: 0 },
    ],
  },
  {
    id: "display",
    label: "DISPLAY",
    labelKey: "menu.group.display",
    items: [
      { key: "presentationMode", label: "MODE", labelKey: "menu.item.presentationMode", type: "choice", options: [...MDC2060_PRESENTATION_MODES], default: "H-UP" },
      { key: "motionMode", label: "MOTION", labelKey: "menu.item.motionMode", type: "choice", options: [...MDC2060_MOTION_MODES], default: "RM" },
      { key: "screenMode", label: "SCREEN", labelKey: "menu.item.screenMode", type: "choice", options: [...MDC2060_SCREEN_MODES], default: "PPI" },
      { key: "offCenter", label: "OFF CENT", labelKey: "menu.item.offCenter", type: "choice", options: ["OFF", "ON"], default: "OFF" },
      { key: "trailMode", label: "TRAIL MODE", labelKey: "menu.item.trailMode", type: "choice", options: ["R", "T"], default: "R" },
      { key: "trailTime", label: "TRAIL TIME", labelKey: "menu.item.trailTime", type: "choice", options: ["OFF", "15s", "30s", "1m", "3m", "6m", "15m", "CONT"], default: "1m" },
      { key: "colorPalette", label: "COLOR", labelKey: "menu.item.colorPalette", type: "choice", options: ["DAY", "NIGHT", "GREEN", "WHITE"], default: "DAY" },
      { key: "piLine", label: "PI LINE", labelKey: "menu.item.piLine", type: "choice", options: ["OFF", "1", "2", "3", "4"], default: "OFF" },
      { key: "brgMode", label: "BRG MODE", labelKey: "menu.item.brgMode", type: "choice", options: ["T", "R"], default: "T" },
      { key: "vectorMode", label: "VECTOR", labelKey: "menu.item.vectorMode", type: "choice", options: ["T", "R"], default: "T" },
    ],
  },
  {
    id: "ebl_vrm",
    label: "EBL/VRM",
    labelKey: "menu.group.ebl_vrm",
    items: [
      { key: "ebl1", label: "EBL1", labelKey: "menu.item.ebl1", type: "choice", options: ["OFF", "ON"], default: "OFF" },
      { key: "ebl2", label: "EBL2", labelKey: "menu.item.ebl2", type: "choice", options: ["OFF", "ON"], default: "OFF" },
      { key: "vrm1", label: "VRM1", labelKey: "menu.item.vrm1", type: "choice", options: ["OFF", "ON"], default: "OFF" },
      { key: "vrm2", label: "VRM2", labelKey: "menu.item.vrm2", type: "choice", options: ["OFF", "ON"], default: "OFF" },
      { key: "ebl1Float", label: "EBL1 FLOAT", labelKey: "menu.item.ebl1Float", type: "choice", options: ["OFF", "ON"], default: "OFF" },
    ],
  },
  {
    id: "alarm",
    label: "ALARM",
    labelKey: "menu.group.alarm",
    items: [
      { key: "alarmMode", label: "MODE", labelKey: "menu.item.alarmMode", type: "choice", options: ["OFF", "IN", "OUT"], default: "OFF" },
      { key: "alarmInnerNm", label: "INNER RNG", labelKey: "menu.item.alarmInnerNm", type: "float", min: 0.1, max: 60, step: 0.25, default: 1.0, unit: "NM" },
      { key: "alarmOuterNm", label: "OUTER RNG", labelKey: "menu.item.alarmOuterNm", type: "float", min: 0.2, max: 64, step: 0.25, default: 3.0, unit: "NM" },
      { key: "alarmStartBrgDeg", label: "START BRG", labelKey: "menu.item.alarmStartBrgDeg", type: "int", min: 0, max: 359, step: 5, default: 330, unit: "deg", wrap: true },
      { key: "alarmEndBrgDeg", label: "END BRG", labelKey: "menu.item.alarmEndBrgDeg", type: "int", min: 0, max: 359, step: 5, default: 30, unit: "deg", wrap: true },
      { key: "alarmLevel", label: "LEVEL", labelKey: "menu.item.alarmLevel", type: "choice", options: ["LOW", "MID", "HIGH"], default: "MID" },
    ],
  },
  {
    id: "ata",
    label: "ATA",
    labelKey: "menu.group.ata",
    items: [
      { key: "ataAcq", label: "ACQ", labelKey: "menu.item.ataAcq", type: "action", actionId: "ata.acq" },
      { key: "ataDel", label: "DEL", labelKey: "menu.item.ataDel", type: "action", actionId: "ata.del" },
      { key: "ataDelAll", label: "DEL ALL", labelKey: "menu.item.ataDelAll", type: "action", actionId: "ata.delAll" },
      { key: "ataAutoArea", label: "AUTO AREA", labelKey: "menu.item.ataAutoArea", type: "choice", options: ["OFF", "ON"], default: "OFF" },
      { key: "ataCpaLimitNm", label: "CPA LIMIT", labelKey: "menu.item.ataCpaLimitNm", type: "float", min: 0.1, max: 10.0, step: 0.1, default: 0.5, unit: "NM" },
      { key: "ataTcpaLimitMin", label: "TCPA LIMIT", labelKey: "menu.item.ataTcpaLimitMin", type: "int", min: 1, max: 60, step: 1, default: 15, unit: "min" },
      { key: "ataVectorTimeMin", label: "VECTOR TIME", labelKey: "menu.item.ataVectorTimeMin", type: "int", min: 1, max: 30, step: 1, default: 6, unit: "min" },
      { key: "ataPastPos", label: "PAST POS", labelKey: "menu.item.ataPastPos", type: "choice", options: ["OFF", "30s", "1m", "3m", "6m"], default: "30s" },
    ],
  },
  {
    id: "ais",
    label: "AIS",
    labelKey: "menu.group.ais",
    items: [
      { key: "aisDisplay", label: "DISPLAY", labelKey: "menu.item.aisDisplay", type: "choice", options: ["OFF", "ON"], default: "ON" },
      { key: "aisFilterRangeNm", label: "FILTER RNG", labelKey: "menu.item.aisFilterRangeNm", type: "float", min: 1, max: 64, step: 1, default: 12, unit: "NM" },
      { key: "aisInfo", label: "INFO", labelKey: "menu.item.aisInfo", type: "action", actionId: "ais.info" },
      { key: "aisCpaAlarm", label: "CPA ALARM", labelKey: "menu.item.aisCpaAlarm", type: "choice", options: ["OFF", "ON"], default: "ON" },
    ],
  },
  {
    id: "sleep",
    label: "SLEEP",
    labelKey: "menu.group.sleep",
    items: [
      { key: "sleepMode", label: "MODE", labelKey: "menu.item.sleepMode", type: "choice", options: ["OFF", "ON"], default: "OFF" },
      { key: "sleepIntervalMin", label: "INTERVAL", labelKey: "menu.item.sleepIntervalMin", type: "choice", options: ["5m", "10m", "15m", "30m"], default: "5m" },
    ],
  },
  {
    id: "system",
    label: "SYSTEM",
    labelKey: "menu.group.system",
    items: [
      { key: "openSystemMenu", label: "SYSTEM MENU", labelKey: "menu.item.openSystemMenu", type: "action", actionId: "menu.openSystem" },
    ],
  },
]);

export const MDC2060_SYSTEM_MENU_TREE = deepFreeze([
  {
    id: "assist",
    label: "ASSIST",
    labelKey: "menu.group.assist",
    items: [
      { key: "rings", label: "RINGS", labelKey: "menu.item.rings", type: "choice", options: ["OFF", "ON"], default: "ON" },
      { key: "rangeUnit", label: "RANGE UNIT", labelKey: "menu.item.rangeUnit", type: "choice", options: [...MDC2060_RANGE_UNITS], default: "NM" },
      { key: "motorRpm", label: "MOTOR", labelKey: "menu.item.motorRpm", type: "choice", options: ["24", "48"], default: "24", unit: "RPM" },
      { key: "buzzer", label: "BUZZER", labelKey: "menu.item.buzzer", type: "choice", options: ["OFF", "LOW", "HIGH"], default: "HIGH" },
      { key: "cursorShape", label: "CURSOR SHAPE", labelKey: "menu.item.cursorShape", type: "choice", options: ["CROSS", "SMALL", "FULL"], default: "CROSS" },
      { key: "language", label: "LANGUAGE", labelKey: "menu.item.language", type: "choice", options: ["en", "vi"], default: "en" },
    ],
  },
  {
    id: "adjust",
    label: "ADJUST",
    labelKey: "menu.group.adjust",
    items: [
      { key: "stcCurve", label: "STC CURVE", labelKey: "menu.item.stcCurve", type: "int", min: 1, max: 8, step: 1, default: 4 },
      { key: "brgAdjDeg", label: "BRG ADJ", labelKey: "menu.item.brgAdjDeg", type: "float", min: -180, max: 180, step: 0.5, default: 0, unit: "deg" },
      { key: "tuneMode", label: "TUNE", labelKey: "menu.item.tuneMode", type: "choice", options: ["AUTO", "MAN"], default: "AUTO" },
    ],
  },
  {
    id: "preset",
    label: "PRESET",
    labelKey: "menu.group.preset",
    items: [
      { key: "f1Key", label: "F1 KEY", labelKey: "menu.item.f1Key", type: "choice", options: [...FKEY_IDS], default: "EBL1_VRM1" },
      { key: "f2Key", label: "F2 KEY", labelKey: "menu.item.f2Key", type: "choice", options: [...FKEY_IDS], default: "ATA_ACQ" },
      { key: "demoAllReset", label: "DEMO/ALL RESET", labelKey: "menu.item.demoAllReset", type: "action", actionId: "system.allReset" },
    ],
  },
  {
    id: "maint",
    label: "MAINT",
    labelKey: "menu.group.maint",
    items: [
      { key: "panelTest", label: "PANEL TEST", labelKey: "menu.item.panelTest", type: "action", actionId: "maint.panelTest" },
      { key: "lcdTest", label: "LCD TEST", labelKey: "menu.item.lcdTest", type: "action", actionId: "maint.lcdTest" },
      { key: "txHours", label: "TX HOURS", labelKey: "menu.item.txHours", type: "readonly" },
    ],
  },
]);

function trimZeros(str) {
  if (!str.includes(".") || /[eE]/.test(str)) {
    return str === "-0" || str === "" ? "0" : str;
  }
  const trimmed = str.replace(/\.?0+$/, "");
  return trimmed === "-0" || trimmed === "" ? "0" : trimmed;
}

export function formatRangeValue(nm, unit = "NM", options = {}) {
  if (typeof nm !== "number" || !Number.isFinite(nm) || nm < 0) {
    return "--";
  }
  const safeUnit = MDC2060_RANGE_UNITS.includes(unit) ? unit : "NM";
  const includeUnit = options?.includeUnit !== false;
  const scaled = nm * MDC2060_RADAR_SPECS.unitConversions[safeUnit];
  if (!Number.isFinite(scaled)) {
    return "--";
  }

  let numStr;
  if (scaled === 0) {
    numStr = "0";
  } else if (safeUnit === "NM") {
    if (Math.abs(scaled - 0.03125) < 1e-9) {
      numStr = "0.03125";
    } else if (Math.abs(scaled - 0.0625) < 1e-9) {
      numStr = "0.0625";
    } else if (Math.abs(scaled - 0.125) < 1e-9) {
      numStr = "0.125";
    } else if (scaled < 0.1) {
      numStr = trimZeros(scaled.toFixed(5));
    } else if (scaled < 1) {
      numStr = trimZeros(scaled.toFixed(3));
    } else if (scaled < 10) {
      numStr = trimZeros(scaled.toFixed(2));
    } else {
      numStr = trimZeros(scaled.toFixed(1));
    }
  } else if (scaled < 0.2) {
    numStr = trimZeros(scaled.toFixed(3));
  } else if (scaled < 10) {
    numStr = trimZeros(scaled.toFixed(2));
  } else {
    numStr = trimZeros(scaled.toFixed(1));
  }

  return includeUnit ? `${numStr} ${safeUnit}` : numStr;
}
