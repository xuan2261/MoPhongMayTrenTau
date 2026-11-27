/**
 * KODEN MDC-2060 (MRD-104 / RB717A) Marine Radar — Pure Deterministic State
 * Machine, Allowlisted Fail-Closed Settings Codec & Probe Summary.
 *
 * PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY.
 * Strictly JSON-canonical deviceState: zero undefined, NaN, Infinity, -0,
 * functions, symbols, Map, Set, or TypedArrays. Zero wall-clock or random calls.
 */
import { fingerprint } from "../../core/protocol.mjs";
import {
  MDC2060_ID,
  MDC2060_PROFILE_REVISION,
  MDC2060_RANGES,
  MDC2060_PRESENTATION_MODES,
  MDC2060_SCREEN_MODES,
  MDC2060_MAIN_MENU_TREE,
  MDC2060_SYSTEM_MENU_TREE,
  MDC2060_RADAR_SPECS,
} from "./spec.mjs";
import {
  initialAtaState,
  acquireAtaTarget,
  deleteAtaTarget,
  deleteAllAtaTargets,
  stepAtaTracking,
  projectAisTargets,
  initialGuardZoneState,
  evaluateGuardZone,
} from "./arpa-ais.mjs";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const RESERVED_KEYS = Object.freeze(["__proto__", "constructor", "prototype"]);
const SETTINGS_MAX_BYTES = 12000;
const UTF8_ENCODER = new TextEncoder();
function utf8ByteLength(str) {
  return UTF8_ENCODER.encode(str).byteLength;
}
const MAX_TRAIL_CONTACTS = 24;
const MAX_TRAIL_POINTS_PER_CONTACT = 48;
const GAIN_STC_DETENT_STEP = 2;
const CURSOR_PAD_STEP = 0.05;
const BRILL_TIMEOUT_MS = 6000;
const PPI_DEFAULT_RADIUS_PX = 210;

const cleanZero = v => (Object.is(v, -0) ? 0 : v);
const clamp = (v, lo, hi) => cleanZero(Math.min(hi, Math.max(lo, v)));
const round3 = v => cleanZero(Math.round(v * 1e3) / 1e3);
const round4 = v => cleanZero(Math.round(v * 1e4) / 1e4);
const round6 = v => cleanZero(Math.round(v * 1e6) / 1e6);

function normalizeDeg360(deg) {
  if (typeof deg !== "number" || !Number.isFinite(deg)) return 0;
  const mod = deg % 360;
  const res = mod < 0 ? mod + 360 : mod;
  return res >= 360 ? 0 : cleanZero(res);
}

function roundDeg3(deg) {
  return normalizeDeg360(round3(normalizeDeg360(deg)));
}

function normalizeSignedDeg180(deg) {
  if (typeof deg !== "number" || !Number.isFinite(deg)) return 0;
  const norm = normalizeDeg360(deg + 180) - 180;
  return cleanZero(norm);
}

function wrapLon180(lon) {
  if (lon >= -180 && lon <= 180) return cleanZero(lon);
  return cleanZero(((((lon + 180) % 360) + 360) % 360) - 180);
}

function clampLat(lat) {
  return clamp(lat, -85, 85);
}

function clampOffsetVec(x, y, maxFrac = MDC2060_RADAR_SPECS.offCenterMaxFrac, scale = 1000) {
  let nx = Number.isFinite(x) ? x : 0;
  let ny = Number.isFinite(y) ? y : 0;
  const r = Math.hypot(nx, ny);
  if (r > maxFrac && r > 0) {
    const ratio = maxFrac / r;
    nx *= ratio;
    ny *= ratio;
  }
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1000;
  // Truncate toward zero at the requested decimal scale so post-rounding hypot never exceeds maxFrac.
  nx = cleanZero(Math.trunc(nx * s) / s);
  ny = cleanZero(Math.trunc(ny * s) / s);
  while (Math.hypot(nx, ny) > maxFrac) {
    const ix = Math.trunc(nx * s);
    const iy = Math.trunc(ny * s);
    if (ix === 0 && iy === 0) break;
    nx = cleanZero((ix === 0 ? 0 : ix - Math.sign(ix)) / s);
    ny = cleanZero((iy === 0 ? 0 : iy - Math.sign(iy)) / s);
  }
  return { xFrac: nx, yFrac: ny };
}

function clampUnitDisk(x, y) {
  return clampOffsetVec(x, y, 1);
}

function polarToLatLon(ownship, rangeNm, bearingDeg) {
  if (!ownship || !Number.isFinite(ownship.lat) || !Number.isFinite(ownship.lon) ||
      !Number.isFinite(rangeNm) || !Number.isFinite(bearingDeg)) {
    return { lat: null, lon: null };
  }
  const rad = normalizeDeg360(bearingDeg) * DEG_TO_RAD;
  const dyNm = rangeNm * Math.cos(rad);
  const dxNm = rangeNm * Math.sin(rad);
  const lat = round6(clampLat(ownship.lat + dyNm / 60));
  const meanLatRad = ((ownship.lat + lat) * 0.5) * DEG_TO_RAD;
  const cosLat = Math.max(0.1, Math.cos(meanLatRad));
  const lon = round6(wrapLon180(ownship.lon + dxNm / (60 * cosLat)));
  return { lat, lon };
}

function parseSleepIntervalSec(val) {
  switch (val) {
    case "5m":  return 300;
    case "10m": return 600;
    case "15m": return 900;
    case "30m": return 1800;
    default:    return 300;
  }
}

function parseTrailDurationSec(val) {
  switch (val) {
    case "OFF":  return 0;
    case "15s":  return 15;
    case "30s":  return 30;
    case "1m":   return 60;
    case "3m":   return 180;
    case "6m":   return 360;
    case "15m":  return 900;
    case "CONT": return Infinity;
    default:     return 60;
  }
}

// ============================================================================
// Profile & Programmatic Settings Schema / Fail-Closed Codec
// ============================================================================

const MAIN_MENU_ORDER_IDS = Object.freeze(
  MDC2060_MAIN_MENU_TREE.flatMap(g => g.items.map(i => `${g.id}.${i.key}`)),
);
const SYSTEM_MENU_ORDER_IDS = Object.freeze(
  MDC2060_SYSTEM_MENU_TREE.flatMap(g => g.items.map(i => `system.${g.id}.${i.key}`)),
);

export const MDC2060_PROFILE = Object.freeze({
  id: MDC2060_ID,
  revision: MDC2060_PROFILE_REVISION,
  menuEntryOrderIds: Object.freeze([...MAIN_MENU_ORDER_IDS, ...SYSTEM_MENU_ORDER_IDS]),
  manufacturer: "KODEN",
  model: "MDC-2060",
  family: "radar",
  controller: "mrd-104-integrated-panel",
  displayUnit: "MRD-104",
  scannerUnit: "RB717A",
  firmware: null,
  sources: Object.freeze(["PUB-MDC2060-REF"]),
  safeOutputs: Object.freeze([]),
});

export const MDC2060_SETTINGS_STORAGE_KEY =
  "mophongmaytrentau.mdc2060.public-reference.settings.v1";
export const MDC2060_SETTINGS_SCHEMA_VERSION = 1;

const SETTINGS_SPEC_MAP = new Map();
for (const tree of [MDC2060_MAIN_MENU_TREE, MDC2060_SYSTEM_MENU_TREE]) {
  for (const group of tree) {
    for (const item of group.items) {
      if (item.type === "action" || item.type === "readonly") continue;
      SETTINGS_SPEC_MAP.set(item.key, item);
    }
  }
}

function initialSettings() {
  const out = {};
  for (const [key, spec] of SETTINGS_SPEC_MAP.entries()) {
    out[key] = typeof spec.default === "number" ? cleanZero(spec.default) : spec.default;
  }
  return out;
}

function validateMdc2060Settings(settings) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new TypeError("invalid settings object");
  }
  const proto = Object.getPrototypeOf(settings);
  if (proto !== Object.prototype && proto !== null) {
    throw new TypeError("non-plain settings object");
  }
  if (Object.getOwnPropertySymbols(settings).length > 0) {
    throw new TypeError("unsafe symbol settings key");
  }
  for (const ownKey of Object.getOwnPropertyNames(settings)) {
    if (RESERVED_KEYS.includes(ownKey)) {
      throw new TypeError("unsafe settings key");
    }
  }
  const keys = Object.keys(settings);
  if (keys.length === 0 || keys.length > SETTINGS_SPEC_MAP.size) {
    throw new RangeError("invalid settings size");
  }
  const clean = {};
  for (const key of keys) {
    if (RESERVED_KEYS.includes(key)) {
      throw new TypeError("unsafe settings key");
    }
    const spec = SETTINGS_SPEC_MAP.get(key);
    if (!spec) {
      throw new TypeError(`unknown/unsafe settings key: ${key}`);
    }
    const desc = Object.getOwnPropertyDescriptor(settings, key);
    if (!desc || !Object.hasOwn(desc, "value")) {
      throw new TypeError(`accessor settings field: ${key}`);
    }
    const val = desc.value;
    if (spec.type === "choice") {
      if (typeof val !== "string" || !spec.options.includes(val)) {
        throw new RangeError(`invalid choice settings value: ${key}`);
      }
      clean[key] = val;
    } else if (spec.type === "int") {
      if (typeof val !== "number" || !Number.isInteger(val) || val < spec.min || val > spec.max) {
        throw new RangeError(`invalid int settings value: ${key}`);
      }
      clean[key] = cleanZero(val);
    } else if (spec.type === "float") {
      if (typeof val !== "number" || !Number.isFinite(val) || val < spec.min || val > spec.max) {
        throw new RangeError(`invalid float settings value: ${key}`);
      }
      clean[key] = cleanZero(val);
    } else {
      throw new TypeError(`unsupported settings type: ${key}`);
    }
  }
  const effInner = Object.hasOwn(clean, "alarmInnerNm")
    ? clean.alarmInnerNm
    : SETTINGS_SPEC_MAP.get("alarmInnerNm").default;
  const effOuter = Object.hasOwn(clean, "alarmOuterNm")
    ? clean.alarmOuterNm
    : SETTINGS_SPEC_MAP.get("alarmOuterNm").default;
  if (effInner > effOuter - 0.05 + 1e-9) {
    throw new RangeError("alarmInnerNm must be <= alarmOuterNm - 0.05");
  }
  const effMotionMode = Object.hasOwn(clean, "motionMode")
    ? clean.motionMode
    : SETTINGS_SPEC_MAP.get("motionMode").default;
  const effOffCenter = Object.hasOwn(clean, "offCenter")
    ? clean.offCenter
    : SETTINGS_SPEC_MAP.get("offCenter").default;
  if (effMotionMode === "TM" && effOffCenter === "ON") {
    throw new RangeError("motionMode TM and offCenter ON are mutually exclusive");
  }
  return clean;
}

export function encodeMdc2060Settings(settings) {
  const safe = validateMdc2060Settings(settings);
  const body = {
    schemaVersion: MDC2060_SETTINGS_SCHEMA_VERSION,
    profileClass: "PUBLIC_REFERENCE",
    profileRevision: MDC2060_PROFILE_REVISION,
    settings: safe,
  };
  const encoded = JSON.stringify({ ...body, contentFingerprint: fingerprint(body) });
  if (encoded.length > SETTINGS_MAX_BYTES || utf8ByteLength(encoded) > SETTINGS_MAX_BYTES) {
    throw new RangeError("encoded settings exceed maximum size");
  }
  return encoded;
}

export function decodeMdc2060Settings(raw) {
  if (typeof raw !== "string" || raw.length === 0 ||
      raw.length > SETTINGS_MAX_BYTES || utf8ByteLength(raw) > SETTINGS_MAX_BYTES) {
    return null;
  }
  try {
    const json = JSON.parse(raw);
    if (!json || typeof json !== "object" || Array.isArray(json)) return null;
    const proto = Object.getPrototypeOf(json);
    if (proto !== Object.prototype && proto !== null) return null;
    for (const ownKey of Object.getOwnPropertyNames(json)) {
      if (RESERVED_KEYS.includes(ownKey)) return null;
    }
    const expectedKeys = "contentFingerprint|profileClass|profileRevision|schemaVersion|settings";
    if (Object.keys(json).sort().join("|") !== expectedKeys) return null;
    if (json.schemaVersion !== MDC2060_SETTINGS_SCHEMA_VERSION ||
        json.profileClass !== "PUBLIC_REFERENCE" ||
        json.profileRevision !== MDC2060_PROFILE_REVISION ||
        typeof json.contentFingerprint !== "string") {
      return null;
    }
    const validated = validateMdc2060Settings(json.settings);
    const body = {
      schemaVersion: json.schemaVersion,
      profileClass: json.profileClass,
      profileRevision: json.profileRevision,
      settings: json.settings,
    };
    if (json.contentFingerprint !== fingerprint(body)) return null;
    return validated;
  } catch {
    return null;
  }
}

// ============================================================================
// Initial State & Derived Computations
// ============================================================================

function initialAisSummary(settings = initialSettings(), boardInstalled = true) {
  const displayOn = settings.aisDisplay !== "OFF";
  return {
    enabled: boardInstalled && displayOn,
    boardInstalled,
    selectedMmsi: null,
    selectedTarget: null,
    dangerousMmsis: [],
    alarmActive: false,
    targetCount: 0,
    totalInBus: 0,
    filterRangeNm: cleanZero(settings.aisFilterRangeNm),
  };
}

function initialAlarmsState() {
  return {
    activeIds: [],
    acknowledgedIds: [],
    visualActive: false,
    audible: false,
    sourceClass: "SYNTHETIC_TRAINING_CAUSES",
  };
}

function initialOwnshipSnapshot() {
  return {
    lat: null,
    lon: null,
    hdgDeg: 0,
    cogDeg: 0,
    sogKn: 0,
    stwKn: null,
    depthM: null,
    waterTempC: null,
  };
}

function extractOwnshipSnapshot(maritimeBus, prevSnapshot, trainingFixture) {
  const gpsValid = trainingFixture.gpsSensor === true;
  const hdgValid = trainingFixture.headingSensor === true;
  const spdValid = trainingFixture.speedSensor === true;
  const src = maritimeBus?.ownship ?? null;
  if (!src || typeof src !== "object") {
    return {
      lat: gpsValid ? prevSnapshot.lat : null,
      lon: gpsValid ? prevSnapshot.lon : null,
      hdgDeg: hdgValid ? prevSnapshot.hdgDeg : 0,
      cogDeg: gpsValid ? prevSnapshot.cogDeg : (hdgValid ? prevSnapshot.hdgDeg : 0),
      sogKn: gpsValid ? prevSnapshot.sogKn : (spdValid ? (prevSnapshot.stwKn ?? prevSnapshot.sogKn) : 0),
      stwKn: spdValid ? prevSnapshot.stwKn : null,
      depthM: prevSnapshot.depthM,
      waterTempC: prevSnapshot.waterTempC,
    };
  }
  const hdg = hdgValid && Number.isFinite(src.hdgDeg) ? roundDeg3(src.hdgDeg) : 0;
  const cog = gpsValid && Number.isFinite(src.cogDeg) ? roundDeg3(src.cogDeg) : hdg;
  const rawSog = Number.isFinite(src.sogKn) ? round3(Math.max(0, src.sogKn)) : 0;
  const rawStw = Number.isFinite(src.stwKn) ? round3(Math.max(0, src.stwKn)) : rawSog;
  const depthM = Number.isFinite(maritimeBus?.depthM)
    ? round3(maritimeBus.depthM)
    : prevSnapshot.depthM;
  const waterTempC = Number.isFinite(src.waterTempC)
    ? round3(src.waterTempC)
    : prevSnapshot.waterTempC;
  return {
    lat: gpsValid && Number.isFinite(src.lat) ? round6(src.lat) : null,
    lon: gpsValid && Number.isFinite(src.lon) ? round6(src.lon) : null,
    hdgDeg: hdg,
    cogDeg: cog,
    sogKn: gpsValid ? rawSog : (spdValid ? rawStw : 0),
    stwKn: spdValid ? rawStw : null,
    depthM,
    waterTempC,
  };
}

function computeSensorFaults(trainingFixture) {
  const hdgValid = trainingFixture.headingSensor === true;
  const gpsValid = trainingFixture.gpsSensor === true;
  const spdValid = trainingFixture.speedSensor === true;
  return {
    hdgNoSignal: !hdgValid,
    gpsNoSignal: !gpsValid,
    spdNoSignal: !spdValid,
    llNoSignal: !gpsValid,
  };
}

function computeEffectiveModes(settings, trainingFixture, instructor, rangeIndex) {
  const hdgValid = trainingFixture.headingSensor === true;
  const gpsValid = trainingFixture.gpsSensor === true;
  const spdValid = trainingFixture.speedSensor === true;
  const hasVelocity = gpsValid || spdValid;

  let presentationMode = settings.presentationMode;
  if (presentationMode === "N-UP" || presentationMode === "C-UP") {
    if (!hdgValid) presentationMode = "H-UP";
  } else if (presentationMode === "W-UP") {
    if (!gpsValid) {
      presentationMode = hdgValid ? "N-UP" : "H-UP";
    } else if (!hdgValid) {
      presentationMode = "H-UP";
    }
  }

  const brgMode = settings.brgMode === "T" && hdgValid ? "T" : "R";
  const motionMode = settings.motionMode === "TM" && hdgValid && hasVelocity ? "TM" : "RM";
  const trailMode = settings.trailMode === "T" && hdgValid && hasVelocity ? "T" : "R";
  const vectorMode = settings.vectorMode === "T" && hdgValid ? "T" : "R";
  const rangeDef = MDC2060_RANGES[rangeIndex] ?? MDC2060_RANGES[MDC2060_RADAR_SPECS.defaultRangeIndex];
  const pw = settings.pw === "AUTO" ? rangeDef.defaultPw : settings.pw;
  const ftc = instructor.ftc >= 0 ? instructor.ftc : settings.ftc;

  return {
    presentationMode,
    motionMode,
    brgMode,
    trailMode,
    vectorMode,
    pw,
    ftc,
  };
}

function topOfScreenRefDeg(effectivePresentationMode, ownshipSnapshot) {
  if (effectivePresentationMode === "N-UP") return 0;
  if (effectivePresentationMode === "C-UP" || effectivePresentationMode === "W-UP") {
    return ownshipSnapshot.cogDeg ?? ownshipSnapshot.hdgDeg ?? 0;
  }
  return ownshipSnapshot.hdgDeg ?? 0;
}

function activeSweepOrigin(settings, effectiveModes, offCenterOffset, tmOffset) {
  if (effectiveModes.motionMode === "TM") return tmOffset;
  if (settings.offCenter === "ON") return offCenterOffset;
  return { xFrac: 0, yFrac: 0 };
}

function computeCursorReadout(xFrac, yFrac, stateLike) {
  const activeRangeNm = (MDC2060_RANGES[stateLike.rangeIndex] ?? MDC2060_RANGES[10]).nm;
  const origin = activeSweepOrigin(
    stateLike.settings,
    stateLike.effectiveModes,
    stateLike.offCenterOffset,
    stateLike.tmOffset,
  );
  const dx = xFrac - origin.xFrac;
  const dy = -(yFrac - origin.yFrac);
  const rFrac = Math.hypot(dx, dy);
  const rangeNm = round3(rFrac * activeRangeNm);
  const topRef = topOfScreenRefDeg(
    stateLike.effectiveModes.presentationMode,
    stateLike.ownshipSnapshot,
  );
  const screenAngleDeg = rFrac > 1e-6 ? normalizeDeg360(Math.atan2(dx, dy) * RAD_TO_DEG) : 0;
  const trueBearingDeg = roundDeg3(screenAngleDeg + topRef);
  const relBearingDeg = round3(normalizeSignedDeg180(trueBearingDeg - (stateLike.ownshipSnapshot.hdgDeg ?? 0)));
  const offOrigin = rFrac > 1e-6;
  const canComputeLatLon = stateLike.trainingFixture.gpsSensor === true &&
    stateLike.ownshipSnapshot.lat !== null &&
    stateLike.ownshipSnapshot.lon !== null &&
    (!offOrigin || stateLike.trainingFixture.headingSensor === true);
  const pos = canComputeLatLon
    ? polarToLatLon(stateLike.ownshipSnapshot, rangeNm, trueBearingDeg)
    : { lat: null, lon: null };
  return {
    xFrac: cleanZero(xFrac),
    yFrac: cleanZero(yFrac),
    rangeNm,
    bearingDeg: trueBearingDeg,
    relBearingDeg,
    lat: pos.lat,
    lon: pos.lon,
  };
}

function computeBearingFromOrigin(xFrac, yFrac, origin, stateLike) {
  const dx = xFrac - origin.xFrac;
  const dy = -(yFrac - origin.yFrac);
  const rFrac = Math.hypot(dx, dy);
  const topRef = topOfScreenRefDeg(
    stateLike.effectiveModes.presentationMode,
    stateLike.ownshipSnapshot,
  );
  const screenAngleDeg = rFrac > 1e-6 ? normalizeDeg360(Math.atan2(dx, dy) * RAD_TO_DEG) : 0;
  const trueBrg = roundDeg3(screenAngleDeg + topRef);
  if (stateLike.effectiveModes.brgMode === "R") {
    return roundDeg3(trueBrg - (stateLike.ownshipSnapshot.hdgDeg ?? 0));
  }
  return trueBrg;
}

function contactToScreenXY(contact, stateLike) {
  const activeRangeNm = (MDC2060_RANGES[stateLike.rangeIndex] ?? MDC2060_RANGES[10]).nm;
  const origin = activeSweepOrigin(
    stateLike.settings,
    stateLike.effectiveModes,
    stateLike.offCenterOffset,
    stateLike.tmOffset,
  );
  const topRef = topOfScreenRefDeg(
    stateLike.effectiveModes.presentationMode,
    stateLike.ownshipSnapshot,
  );
  const screenAngRad = normalizeDeg360(contact.bearingDeg - topRef) * DEG_TO_RAD;
  const rNorm = contact.rangeNm / activeRangeNm;
  return {
    xFrac: origin.xFrac + rNorm * Math.sin(screenAngRad),
    yFrac: origin.yFrac - rNorm * Math.cos(screenAngRad),
  };
}

function buildTransientSettings(settings, trainingFixture, effectiveModes) {
  return {
    ...settings,
    ataBoardOption: trainingFixture.ataBoardOption === true,
    aisBoardOption: trainingFixture.aisBoardOption === true,
    guardZoneBearingRef: effectiveModes.brgMode,
  };
}

function compactAisSummary(maritimeBus, settings, trainingFixture, effectiveModes, selectedMmsi) {
  const proj = projectAisTargets(
    maritimeBus,
    buildTransientSettings(settings, trainingFixture, effectiveModes),
    selectedMmsi,
  );
  return {
    enabled: proj.enabled,
    boardInstalled: proj.boardInstalled,
    selectedMmsi: proj.enabled ? selectedMmsi : null,
    selectedTarget: proj.enabled ? proj.selectedTarget : null,
    dangerousMmsis: proj.dangerousMmsis,
    alarmActive: proj.alarmActive,
    targetCount: proj.targets.length,
    totalInBus: proj.totalInBus,
    filterRangeNm: proj.filterRangeNm,
  };
}

function isActivelyTransmitting(powerMode, sleepState) {
  return powerMode === "transmit" ||
    (powerMode === "sleep" && sleepState?.phase === "burst");
}

function clearGuardZoneRuntime(guardZone, settings) {
  const mode = settings.alarmMode === "IN" || settings.alarmMode === "OUT"
    ? settings.alarmMode
    : "OFF";
  const rawInner = Math.max(0, Number.isFinite(settings.alarmInnerNm) ? settings.alarmInnerNm : 1.0);
  const rawOuter = Math.max(0.1, Number.isFinite(settings.alarmOuterNm) ? settings.alarmOuterNm : 3.0);
  const innerNm = round3(Math.min(rawInner, Math.max(0, rawOuter - 0.05)));
  const outerNm = round3(Math.max(rawOuter, innerNm + 0.05));
  const startBrgDeg = roundDeg3(
    Number.isFinite(settings.alarmStartBrgDeg) ? settings.alarmStartBrgDeg : 330,
  );
  const endBrgDeg = roundDeg3(
    Number.isFinite(settings.alarmEndBrgDeg) ? settings.alarmEndBrgDeg : 30,
  );
  const level = settings.alarmLevel === "LOW" || settings.alarmLevel === "HIGH" || settings.alarmLevel === "MID"
    ? settings.alarmLevel
    : (guardZone?.level === "LOW" || guardZone?.level === "HIGH" ? guardZone.level : "MID");
  return {
    mode,
    innerNm,
    outerNm,
    startBrgDeg,
    endBrgDeg,
    level,
    insideContactIds: [],
    capturedContactIds: [],
    triggeredContactIds: [],
    alarmActive: false,
    acknowledged: false,
    audible: false,
  };
}

function evaluateAlarmsState(prevAlarms, prevAtaDangerousIds, prevAisDangerousMmsis, nextState) {
  const activelyTx = isActivelyTransmitting(nextState.powerMode, nextState.sleepState);
  const activeIds = [];
  if (activelyTx) {
    if (nextState.guardZone.alarmActive) {
      activeIds.push(nextState.guardZone.mode === "OUT" ? "GUARD_ZONE_OUT" : "GUARD_ZONE_IN");
    }
    if (nextState.trainingFixture.ataBoardOption === true && nextState.ata.alarmActive) {
      activeIds.push("ATA_CPA_DANGER");
    }
    if (nextState.trainingFixture.aisBoardOption === true &&
        nextState.settings.aisDisplay !== "OFF" &&
        nextState.settings.aisCpaAlarm !== "OFF" &&
        nextState.ais.alarmActive) {
      activeIds.push("AIS_CPA_DANGER");
    }
  }
  activeIds.sort();

  let acknowledgedIds = prevAlarms.acknowledgedIds.filter(id => activeIds.includes(id));

  // Re-trigger audible alarm if guardZone detected a new trigger contact.
  if (nextState.guardZone.alarmActive && nextState.guardZone.audible) {
    const gzId = nextState.guardZone.mode === "OUT" ? "GUARD_ZONE_OUT" : "GUARD_ZONE_IN";
    acknowledgedIds = acknowledgedIds.filter(id => id !== gzId);
  }
  // Re-trigger audible alarm if a brand-new dangerous ATA target appeared.
  if (activeIds.includes("ATA_CPA_DANGER") &&
      nextState.ata.dangerousIds.some(id => !prevAtaDangerousIds.includes(id))) {
    acknowledgedIds = acknowledgedIds.filter(id => id !== "ATA_CPA_DANGER");
  }
  // Re-trigger audible alarm if a brand-new dangerous AIS target appeared.
  if (activeIds.includes("AIS_CPA_DANGER") &&
      nextState.ais.dangerousMmsis.some(m => !prevAisDangerousMmsis.includes(m))) {
    acknowledgedIds = acknowledgedIds.filter(id => id !== "AIS_CPA_DANGER");
  }

  const visualActive = activeIds.length > 0;
  const audible = activeIds.some(id => !acknowledgedIds.includes(id));

  return {
    activeIds,
    acknowledgedIds,
    visualActive,
    audible,
    sourceClass: "SYNTHETIC_TRAINING_CAUSES",
  };
}

function finalizeState(state, maritimeBus, prevState = state) {
  const sensorFaults = computeSensorFaults(state.trainingFixture);
  const effectiveModes = computeEffectiveModes(
    state.settings,
    state.trainingFixture,
    state.instructor,
    state.rangeIndex,
  );
  const ownshipSnapshot = extractOwnshipSnapshot(
    maritimeBus,
    state.ownshipSnapshot,
    state.trainingFixture,
  );
  const activeRangeNm = (MDC2060_RANGES[state.rangeIndex] ?? MDC2060_RANGES[10]).nm;
  const vrm1Nm = clamp(round4(state.vrm1Nm), 0, activeRangeNm);
  const vrm2Nm = clamp(round4(state.vrm2Nm), 0, activeRangeNm);

  const partial = {
    ...state,
    sensorFaults,
    effectiveModes,
    ownshipSnapshot,
    vrm1Nm,
    vrm2Nm,
  };
  const cursor = computeCursorReadout(partial.cursor.xFrac, partial.cursor.yFrac, partial);
  const nextWithCursor = { ...partial, cursor };
  const alarms = evaluateAlarmsState(
    state.alarms,
    prevState.ata.dangerousIds,
    prevState.ais.dangerousMmsis,
    nextWithCursor,
  );
  return { ...nextWithCursor, alarms };
}

export function initialMdc2060State() {
  const settings = initialSettings();
  const trainingFixture = {
    fastPreheat: false,
    skipPreheat: false,
    ataBoardOption: true,
    aisBoardOption: true,
    headingSensor: true,
    gpsSensor: true,
    speedSensor: true,
    interferenceSource: false,
  };
  const instructor = {
    seaState: -1,
    rain: -1,
    ftc: -1,
  };
  const rangeIndex = MDC2060_RADAR_SPECS.defaultRangeIndex;
  const subRangeIndex = MDC2060_RADAR_SPECS.defaultSubRangeIndex;
  const sensorFaults = computeSensorFaults(trainingFixture);
  const effectiveModes = computeEffectiveModes(settings, trainingFixture, instructor, rangeIndex);

  return {
    powerMode: "off",
    preheatRemainingSec: 0,
    simTick: 0,
    uiElapsedMs: 0,
    txSeconds: 0,
    txHours: 0,
    sweepAzimuthDeg: 0,
    rangeIndex,
    subRangeIndex,
    gain: 55,
    stc: 0,
    brightness: 8,
    panelBrightness: 7,
    hlSuppressed: false,
    entHeld: false,
    entHoldElapsedMs: 0,
    entOffHoldPendingRelease: false,
    menuHeld: false,
    menuOffHoldPendingRelease: false,
    powerOffHoldPendingRelease: false,
    settings,
    trainingFixture,
    instructor,
    sleepState: {
      phase: "inactive",
      remainingSec: 0,
      intervalSec: parseSleepIntervalSec(settings.sleepIntervalMin),
      burstSec: MDC2060_RADAR_SPECS.sleepBurstSec,
    },
    sensorFaults,
    effectiveModes,
    offCenterOffset: { xFrac: 0, yFrac: 0 },
    tmOffset: { xFrac: 0, yFrac: 0 },
    ebl1Deg: 0,
    ebl2Deg: 45,
    ebl1Origin: { xFrac: 0, yFrac: 0 },
    vrm1Nm: 1.5,
    vrm2Nm: 3.0,
    piBearingDeg: 0,
    piSpacingNm: 0.5,
    activeMarker: null,
    cursor: {
      xFrac: 0,
      yFrac: 0,
      rangeNm: 0,
      bearingDeg: 0,
      relBearingDeg: 0,
      lat: null,
      lon: null,
    },
    measureAnchor: null,
    measureResult: null,
    ownshipSnapshot: initialOwnshipSnapshot(),
    trails: [],
    ata: initialAtaState(),
    ais: initialAisSummary(settings, trainingFixture.aisBoardOption),
    guardZone: initialGuardZoneState(),
    alarms: initialAlarmsState(),
    overlay: null,
    notice: "",
  };
}

function powerOffState(state) {
  const settings = state.settings.sleepMode === "ON"
    ? { ...state.settings, sleepMode: "OFF" }
    : state.settings;
  return {
    ...state,
    powerMode: "off",
    preheatRemainingSec: 0,
    hlSuppressed: false,
    entHeld: false,
    entHoldElapsedMs: 0,
    entOffHoldPendingRelease: Boolean(state.entHeld || state.entOffHoldPendingRelease),
    menuHeld: false,
    menuOffHoldPendingRelease: Boolean(state.menuHeld || state.menuOffHoldPendingRelease),
    settings,
    sleepState: {
      phase: "inactive",
      remainingSec: 0,
      intervalSec: parseSleepIntervalSec(settings.sleepIntervalMin),
      burstSec: MDC2060_RADAR_SPECS.sleepBurstSec,
    },
    tmOffset: { xFrac: 0, yFrac: 0 },
    measureAnchor: null,
    measureResult: null,
    trails: [],
    ata: initialAtaState(),
    ais: initialAisSummary(settings, state.trainingFixture.aisBoardOption),
    guardZone: clearGuardZoneRuntime(state.guardZone, settings),
    alarms: initialAlarmsState(),
    overlay: null,
    notice: "",
  };
}

// ============================================================================
// Capability Reconciliation (including overlays suspended behind power-hold)
// ============================================================================

function reconcileOverlayForCapability(overlay, ataRemoved, aisRemoved) {
  if (!overlay || typeof overlay !== "object") return overlay;
  if (overlay.kind === "power-hold") {
    return {
      ...overlay,
      priorOverlay: reconcileOverlayForCapability(overlay.priorOverlay, ataRemoved, aisRemoved),
    };
  }
  if (overlay.kind === "ais-info" && aisRemoved) {
    return null;
  }
  if (overlay.kind === "menu" && overlay.editing) {
    const group = MDC2060_MAIN_MENU_TREE[overlay.groupIndex];
    if ((ataRemoved && group?.id === "ata") || (aisRemoved && group?.id === "ais")) {
      return {
        ...overlay,
        editing: false,
        draftValue: null,
      };
    }
  }
  return overlay;
}

// ============================================================================
// Trails & True Motion Progression Helpers
// ============================================================================

function stepTrails(prevTrails, maritimeBus, settings, effectiveModes, nextSimTick) {
  const maxAgeSec = parseTrailDurationSec(settings.trailTime);
  if (maxAgeSec === 0) return [];
  const contacts = Array.isArray(maritimeBus?.radarContacts) ? maritimeBus.radarContacts : null;
  const ownship = maritimeBus?.ownship ?? null;
  const isTrueTrail = effectiveModes.trailMode === "T";

  const byId = new Map();
  for (let i = 0; i < prevTrails.length; i++) {
    const entry = prevTrails[i];
    if (!entry || typeof entry.contactId !== "string") continue;
    const kept = Number.isFinite(maxAgeSec)
      ? entry.points.filter(pt => nextSimTick - pt.tick <= maxAgeSec)
      : [...entry.points];
    if (kept.length > 0) {
      byId.set(entry.contactId, kept);
    }
  }

  const aisByContactId = new Map();
  if (Array.isArray(maritimeBus?.aisTargets)) {
    for (let i = 0; i < maritimeBus.aisTargets.length; i++) {
      const a = maritimeBus.aisTargets[i];
      if (a && a.mmsi !== undefined && Number.isFinite(a.lat) && Number.isFinite(a.lon)) {
        aisByContactId.set(`tgt-${String(a.mmsi)}`, a);
      }
    }
  }

  if (contacts) {
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      if (!c || typeof c.contactId !== "string" || c.contactId.length === 0 ||
          typeof c.rangeNm !== "number" || !Number.isFinite(c.rangeNm) ||
          typeof c.bearingDeg !== "number" || !Number.isFinite(c.bearingDeg)) {
        continue;
      }
      if (!byId.has(c.contactId) && byId.size >= MAX_TRAIL_CONTACTS) continue;
      let lat = Number.isFinite(c.lat) ? round6(c.lat) : null;
      let lon = Number.isFinite(c.lon) ? round6(c.lon) : null;
      let reconstructedFromPolar = false;
      if (lat === null || lon === null) {
        const aisMatch = aisByContactId.get(c.contactId);
        if (aisMatch) {
          lat = round6(aisMatch.lat);
          lon = round6(aisMatch.lon);
        } else if (ownship) {
          const reconstructed = polarToLatLon(ownship, c.rangeNm, c.bearingDeg);
          lat = reconstructed.lat;
          lon = reconstructed.lon;
          reconstructedFromPolar = true;
        }
      }
      const pt = {
        tick: nextSimTick,
        lat,
        lon,
        rangeNm: round3(Math.max(0, c.rangeNm)),
        bearingDeg: roundDeg3(c.bearingDeg),
      };
      const pts = byId.get(c.contactId) ?? [];
      const last = pts.length > 0 ? pts[pts.length - 1] : null;
      let shouldAppend = true;
      if (last) {
        if (isTrueTrail) {
          const degEps = reconstructedFromPolar ? 3e-5 : 1e-6;
          if (last.lat !== null && pt.lat !== null &&
              Math.abs(last.lat - pt.lat) < degEps &&
              Math.abs(last.lon - pt.lon) < degEps) {
            shouldAppend = false;
          }
        } else {
          if (Math.abs(last.rangeNm - pt.rangeNm) < 1e-4 &&
              Math.abs(normalizeSignedDeg180(last.bearingDeg - pt.bearingDeg)) < 1e-3) {
            shouldAppend = false;
          }
        }
      }
      if (shouldAppend) {
        pts.push(pt);
      }
      const bounded = pts.length > MAX_TRAIL_POINTS_PER_CONTACT
        ? pts.slice(pts.length - MAX_TRAIL_POINTS_PER_CONTACT)
        : pts;
      byId.set(c.contactId, bounded);
    }
  }

  const out = [];
  const sortedIds = [...byId.keys()].sort().slice(0, MAX_TRAIL_CONTACTS);
  for (let i = 0; i < sortedIds.length; i++) {
    const contactId = sortedIds[i];
    out.push({ contactId, points: byId.get(contactId) });
  }
  return out;
}

function stepTrueMotionOffset(tmOffset, activeTxSecs, activeRangeNm, ownshipSnapshot, effectiveModes) {
  if (effectiveModes.motionMode !== "TM" || activeTxSecs <= 0) {
    return effectiveModes.motionMode === "TM" ? tmOffset : { xFrac: 0, yFrac: 0 };
  }
  const sogKn = Math.max(0, ownshipSnapshot.sogKn ?? 0);
  if (sogKn <= 0 || activeRangeNm <= 0) return tmOffset;

  const topRef = topOfScreenRefDeg(effectiveModes.presentationMode, ownshipSnapshot);
  const courseDeg = ownshipSnapshot.cogDeg ?? ownshipSnapshot.hdgDeg ?? 0;
  const screenAngRad = normalizeDeg360(courseDeg - topRef) * DEG_TO_RAD;
  const sinA = Math.sin(screenAngRad);
  const cosA = Math.cos(screenAngRad);
  const maxFrac = MDC2060_RADAR_SPECS.tmResetEdgeFrac;
  const stepDistFrac = (sogKn / 3600) / activeRangeNm;

  let x = tmOffset.xFrac;
  let y = tmOffset.yFrac;
  for (let s = 0; s < activeTxSecs; s++) {
    x += stepDistFrac * sinA;
    y -= stepDistFrac * cosA;
    if (Math.hypot(x, y) >= maxFrac) {
      // Auto-reset ownship to 66% opposite ownship heading/course.
      const reset = clampOffsetVec(-sinA * maxFrac, cosA * maxFrac, maxFrac, 1e6);
      x = reset.xFrac;
      y = reset.yFrac;
    }
  }
  return clampOffsetVec(x, y, maxFrac, 1e6);
}

// ============================================================================
// ATA Manual Acquire, AIS Info, F-Key & Menu Action Handlers
// ============================================================================

function resolveCurrentSimTick(state, event) {
  if (Number.isInteger(event.maritimeBus?.simTick)) return event.maritimeBus.simTick;
  if (Number.isInteger(event.sensorObservation?.navigation?.observedAtTick)) {
    return event.sensorObservation.navigation.observedAtTick;
  }
  if (Number.isInteger(event.tick)) return event.tick;
  return state.simTick;
}

function handleManualAtaAcquire(state, maritimeBus, currentSimTick) {
  if (state.trainingFixture.ataBoardOption !== true) {
    return finalizeState(
      {
        ...state,
        ata: { ...state.ata, lastError: "ATA_BOARD_NOT_INSTALLED", lastAcquiredId: null },
        notice: "ataBoardMissing",
      },
      maritimeBus,
      state,
    );
  }
  if (!isActivelyTransmitting(state.powerMode, state.sleepState)) {
    return finalizeState({ ...state, notice: "" }, maritimeBus, state);
  }
  const contacts = Array.isArray(maritimeBus?.radarContacts) ? maritimeBus.radarContacts : [];
  if (contacts.length === 0) {
    return finalizeState({ ...state, notice: "noTarget" }, maritimeBus, state);
  }

  const trackedIds = new Set(state.ata.targets.map(t => t.contactId));
  const untracked = contacts.filter(c => c && typeof c.contactId === "string" && !trackedIds.has(c.contactId));
  const pool = untracked.length > 0 ? untracked : contacts;
  const cursorMoved = Math.hypot(state.cursor.xFrac, state.cursor.yFrac) > 0.02;
  const activeRangeNm = (MDC2060_RANGES[state.rangeIndex] ?? MDC2060_RANGES[10]).nm;
  const cpaLimit = state.settings.ataCpaLimitNm;
  const tcpaLimit = state.settings.ataTcpaLimitMin;

  let chosen = null;
  if (cursorMoved) {
    let bestDist = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const c = pool[i];
      const pos = contactToScreenXY(c, state);
      const dist = Math.hypot(pos.xFrac - state.cursor.xFrac, pos.yFrac - state.cursor.yFrac);
      if (dist < bestDist - 1e-9 ||
          (Math.abs(dist - bestDist) <= 1e-9 && chosen && c.rangeNm < chosen.rangeNm)) {
        bestDist = dist;
        chosen = c;
      }
    }
  } else {
    const inRange = pool.filter(c => Number.isFinite(c.rangeNm) && c.rangeNm <= activeRangeNm);
    const candidates = inRange.length > 0 ? inRange : pool;
    const dangerous = candidates.filter(c =>
      Number.isFinite(c.cpaNm) && Number.isFinite(c.tcpaMin) &&
      c.cpaNm <= cpaLimit && c.tcpaMin > 0 && c.tcpaMin <= tcpaLimit,
    );
    const prioritized = dangerous.length > 0 ? dangerous : candidates;
    const sorted = [...prioritized].sort((a, b) => {
      if (a.rangeNm !== b.rangeNm) return a.rangeNm - b.rangeNm;
      const aId = String(a.contactId);
      const bId = String(b.contactId);
      return aId < bId ? -1 : (aId > bId ? 1 : 0);
    });
    chosen = sorted[0] ?? null;
  }

  if (!chosen) {
    return finalizeState({ ...state, notice: "noTarget" }, maritimeBus, state);
  }
  const nextAta = acquireAtaTarget(state.ata, chosen, currentSimTick, maritimeBus);
  let notice = "ataAcquired";
  if (nextAta.lastError === "ATA_MAX_CAPACITY") notice = "ataMaxCap";
  else if (nextAta.lastError === "ATA_DUPLICATE_CONTACT") notice = "ataDuplicate";

  const nextOverlay = state.overlay?.kind === "menu" ? null : state.overlay;
  return finalizeState(
    { ...state, ata: nextAta, overlay: nextOverlay, notice },
    maritimeBus,
    state,
  );
}

function handleOpenAisInfo(state, maritimeBus) {
  if (state.trainingFixture.aisBoardOption !== true) {
    return finalizeState({ ...state, notice: "aisBoardMissing" }, maritimeBus, state);
  }
  if (state.settings.aisDisplay === "OFF") {
    return finalizeState({ ...state, notice: "aisOff" }, maritimeBus, state);
  }
  const transientSettings = buildTransientSettings(
    state.settings,
    state.trainingFixture,
    state.effectiveModes,
  );
  const proj = projectAisTargets(maritimeBus, transientSettings, state.ais.selectedMmsi);
  if (proj.targets.length === 0) {
    return finalizeState({ ...state, notice: "noAisTarget" }, maritimeBus, state);
  }
  const cursorMoved = Math.hypot(state.cursor.xFrac, state.cursor.yFrac) > 0.02;
  let chosen = null;
  if (cursorMoved) {
    let bestDist = Infinity;
    for (let i = 0; i < proj.targets.length; i++) {
      const t = proj.targets[i];
      const pos = contactToScreenXY(t, state);
      const dist = Math.hypot(pos.xFrac - state.cursor.xFrac, pos.yFrac - state.cursor.yFrac);
      if (dist < bestDist - 1e-9 ||
          (Math.abs(dist - bestDist) <= 1e-9 && chosen && t.rangeNm < chosen.rangeNm)) {
        bestDist = dist;
        chosen = t;
      }
    }
  } else {
    chosen = proj.targets.find(t => t.dangerous) ?? proj.targets[0];
  }

  const ais = compactAisSummary(
    maritimeBus,
    state.settings,
    state.trainingFixture,
    state.effectiveModes,
    chosen.mmsi,
  );
  return finalizeState(
    {
      ...state,
      ais,
      overlay: { kind: "ais-info", mmsi: chosen.mmsi },
      notice: "",
    },
    maritimeBus,
    state,
  );
}

function acknowledgeAlarms(state) {
  return {
    ...state,
    guardZone: {
      ...state.guardZone,
      acknowledged: state.guardZone.alarmActive ? true : state.guardZone.acknowledged,
      audible: false,
    },
    alarms: {
      ...state.alarms,
      acknowledgedIds: [...state.alarms.activeIds],
      audible: false,
    },
  };
}

function resolveFallbackActiveMarker(settings) {
  if (settings.ebl1 === "ON" && settings.vrm1 === "ON") return "ebl1_vrm1";
  if (settings.ebl1 === "ON") return "ebl1";
  if (settings.vrm1 === "ON") return "vrm1";
  if (settings.ebl2 === "ON" && settings.vrm2 === "ON") return "ebl2_vrm2";
  if (settings.ebl2 === "ON") return "ebl2";
  if (settings.vrm2 === "ON") return "vrm2";
  return null;
}

function wakeFromSleep(stateLike, maritimeBus, prevState) {
  const nextSettings = { ...stateLike.settings, sleepMode: "OFF" };
  const effModes = computeEffectiveModes(
    nextSettings,
    stateLike.trainingFixture,
    stateLike.instructor,
    stateLike.rangeIndex,
  );
  const transientSettings = buildTransientSettings(
    nextSettings,
    stateLike.trainingFixture,
    effModes,
  );
  const nextGuardZone = evaluateGuardZone(stateLike.guardZone, maritimeBus, transientSettings);
  return finalizeState(
    {
      ...stateLike,
      powerMode: "transmit",
      settings: nextSettings,
      sleepState: {
        phase: "inactive",
        remainingSec: 0,
        intervalSec: parseSleepIntervalSec(nextSettings.sleepIntervalMin),
        burstSec: MDC2060_RADAR_SPECS.sleepBurstSec,
      },
      guardZone: nextGuardZone,
      overlay: null,
      notice: "",
    },
    maritimeBus,
    prevState,
  );
}

function applyCommittedSetting(state, key, value, maritimeBus, currentSimTick) {
  let nextSettings = { ...state.settings, [key]: value };
  let nextOffCenter = state.offCenterOffset;
  let nextTmOffset = state.tmOffset;
  let nextTrails = state.trails;
  let nextEbl1Origin = state.ebl1Origin;
  let nextActiveMarker = state.activeMarker;
  let nextPowerMode = state.powerMode;
  let nextSleepState = state.sleepState;
  let nextOverlay = state.overlay;
  let nextGuardZone = state.guardZone;
  let nextAis = state.ais;

  if (key === "offCenter") {
    if (value === "ON") {
      if (nextSettings.motionMode === "TM") {
        nextSettings = { ...nextSettings, motionMode: "RM" };
        nextTmOffset = { xFrac: 0, yFrac: 0 };
      }
      const cDist = Math.hypot(state.cursor.xFrac, state.cursor.yFrac);
      nextOffCenter = cDist > 0.01
        ? clampOffsetVec(state.cursor.xFrac, state.cursor.yFrac, MDC2060_RADAR_SPECS.offCenterMaxFrac)
        : { xFrac: 0, yFrac: 0.45 };
    } else {
      nextOffCenter = { xFrac: 0, yFrac: 0 };
    }
  } else if (key === "motionMode") {
    if (value === "TM") {
      nextSettings = { ...nextSettings, offCenter: "OFF" };
      nextOffCenter = { xFrac: 0, yFrac: 0 };
    } else {
      nextTmOffset = { xFrac: 0, yFrac: 0 };
    }
  } else if (key === "trailMode" || (key === "trailTime" && value === "OFF")) {
    nextTrails = [];
  } else if (key === "ebl1Float") {
    nextEbl1Origin = value === "ON"
      ? clampUnitDisk(state.cursor.xFrac, state.cursor.yFrac)
      : { xFrac: 0, yFrac: 0 };
  } else if (key === "ebl1" || key === "vrm1" || key === "ebl2" || key === "vrm2") {
    if (value === "ON") {
      if (key === "ebl1") nextActiveMarker = nextSettings.vrm1 === "ON" ? "ebl1_vrm1" : "ebl1";
      else if (key === "vrm1") nextActiveMarker = nextSettings.ebl1 === "ON" ? "ebl1_vrm1" : "vrm1";
      else if (key === "ebl2") nextActiveMarker = nextSettings.vrm2 === "ON" ? "ebl2_vrm2" : "ebl2";
      else nextActiveMarker = nextSettings.ebl2 === "ON" ? "ebl2_vrm2" : "vrm2";
    } else if (nextActiveMarker === key ||
        (nextActiveMarker === "ebl1_vrm1" && (key === "ebl1" || key === "vrm1")) ||
        (nextActiveMarker === "ebl2_vrm2" && (key === "ebl2" || key === "vrm2"))) {
      nextActiveMarker = resolveFallbackActiveMarker(nextSettings);
    }
  } else if (key === "sleepIntervalMin") {
    const intervalSec = parseSleepIntervalSec(value);
    nextSleepState = { ...nextSleepState, intervalSec };
  } else if (key === "sleepMode") {
    const intervalSec = parseSleepIntervalSec(nextSettings.sleepIntervalMin);
    if (value === "ON") {
      if (state.powerMode === "transmit") {
        nextPowerMode = "sleep";
        nextSleepState = {
          phase: "resting",
          remainingSec: intervalSec,
          intervalSec,
          burstSec: MDC2060_RADAR_SPECS.sleepBurstSec,
        };
        nextOverlay = null;
      } else {
        // SLEEP is only entered from TRANSMIT; keep sleepMode OFF while in STANDBY.
        nextSettings = { ...nextSettings, sleepMode: "OFF" };
        nextSleepState = {
          phase: "inactive",
          remainingSec: 0,
          intervalSec,
          burstSec: MDC2060_RADAR_SPECS.sleepBurstSec,
        };
      }
    } else if (value === "OFF") {
      if (state.powerMode === "sleep") {
        nextPowerMode = "transmit";
      }
      nextSleepState = {
        phase: "inactive",
        remainingSec: 0,
        intervalSec,
        burstSec: MDC2060_RADAR_SPECS.sleepBurstSec,
      };
    }
  }

  const effModes = computeEffectiveModes(
    nextSettings,
    state.trainingFixture,
    state.instructor,
    state.rangeIndex,
  );
  const transientSettings = buildTransientSettings(nextSettings, state.trainingFixture, effModes);

  const wasActivelyTx = isActivelyTransmitting(state.powerMode, state.sleepState);
  const nextActivelyTx = isActivelyTransmitting(nextPowerMode, nextSleepState);
  const alarmSettingChanged = key === "alarmMode" || key === "alarmInnerNm" ||
    key === "alarmOuterNm" || key === "alarmStartBrgDeg" ||
    key === "alarmEndBrgDeg" || key === "alarmLevel" || key === "brgMode";
  if (!nextActivelyTx) {
    if (wasActivelyTx || alarmSettingChanged) {
      nextGuardZone = clearGuardZoneRuntime(state.guardZone, nextSettings);
    }
  } else if (!wasActivelyTx || alarmSettingChanged) {
    nextGuardZone = evaluateGuardZone(state.guardZone, maritimeBus, transientSettings);
  }

  if (key === "aisDisplay" || key === "aisFilterRangeNm" || key === "aisCpaAlarm" ||
      key === "ataCpaLimitNm" || key === "ataTcpaLimitMin") {
    nextAis = compactAisSummary(
      maritimeBus,
      nextSettings,
      state.trainingFixture,
      effModes,
      nextSettings.aisDisplay === "OFF" ? null : state.ais.selectedMmsi,
    );
  }

  let nextAta = state.ata;
  if ((key === "ataCpaLimitNm" || key === "ataTcpaLimitMin" || key === "ataAutoArea" ||
       key === "ataPastPos") && nextPowerMode === "transmit" && maritimeBus) {
    nextAta = stepAtaTracking(state.ata, maritimeBus, transientSettings, currentSimTick);
  }

  return finalizeState(
    {
      ...state,
      powerMode: nextPowerMode,
      settings: nextSettings,
      offCenterOffset: nextOffCenter,
      tmOffset: nextTmOffset,
      trails: nextTrails,
      ebl1Origin: nextEbl1Origin,
      activeMarker: nextActiveMarker,
      sleepState: nextSleepState,
      guardZone: nextGuardZone,
      ais: nextAis,
      ata: nextAta,
      overlay: nextOverlay,
      notice: "",
    },
    maritimeBus,
    state,
  );
}

function executeFKeyPreset(state, presetId, maritimeBus, currentSimTick) {
  switch (presetId) {
    case "EBL1_VRM1": {
      const bothOn = state.settings.ebl1 === "ON" && state.settings.vrm1 === "ON";
      const val = bothOn ? "OFF" : "ON";
      const nextSettings = { ...state.settings, ebl1: val, vrm1: val };
      const nextMarker = bothOn ? resolveFallbackActiveMarker(nextSettings) : "ebl1_vrm1";
      return finalizeState(
        { ...state, settings: nextSettings, activeMarker: nextMarker, notice: "" },
        maritimeBus,
        state,
      );
    }
    case "ATA_ACQ":
      return handleManualAtaAcquire(state, maritimeBus, currentSimTick);
    case "MODE_CYCLE": {
      const idx = MDC2060_PRESENTATION_MODES.indexOf(state.settings.presentationMode);
      const nextMode = MDC2060_PRESENTATION_MODES[(idx + 1) % MDC2060_PRESENTATION_MODES.length];
      return applyCommittedSetting(state, "presentationMode", nextMode, maritimeBus, currentSimTick);
    }
    case "SCREEN_CYCLE": {
      const idx = MDC2060_SCREEN_MODES.indexOf(state.settings.screenMode);
      const nextMode = MDC2060_SCREEN_MODES[(idx + 1) % MDC2060_SCREEN_MODES.length];
      return applyCommittedSetting(state, "screenMode", nextMode, maritimeBus, currentSimTick);
    }
    case "OFF_CENTER": {
      const nextVal = state.settings.offCenter === "ON" ? "OFF" : "ON";
      return applyCommittedSetting(state, "offCenter", nextVal, maritimeBus, currentSimTick);
    }
    case "TRAIL_TOGGLE": {
      const nextVal = state.settings.trailMode === "T" ? "R" : "T";
      return applyCommittedSetting(state, "trailMode", nextVal, maritimeBus, currentSimTick);
    }
    case "FTC_STEP": {
      const nextVal = (state.settings.ftc + 1) % 9;
      return applyCommittedSetting(state, "ftc", nextVal, maritimeBus, currentSimTick);
    }
    case "IR_STEP": {
      const opts = ["OFF", "1", "2", "3"];
      const idx = opts.indexOf(state.settings.ir);
      const nextVal = opts[(idx + 1) % opts.length];
      return applyCommittedSetting(state, "ir", nextVal, maritimeBus, currentSimTick);
    }
    case "AIS_TOGGLE": {
      if (state.trainingFixture.aisBoardOption !== true) {
        return finalizeState({ ...state, notice: "aisBoardMissing" }, maritimeBus, state);
      }
      const nextVal = state.settings.aisDisplay === "ON" ? "OFF" : "ON";
      return applyCommittedSetting(state, "aisDisplay", nextVal, maritimeBus, currentSimTick);
    }
    case "ALARM_TOGGLE": {
      const opts = ["OFF", "IN", "OUT"];
      const idx = opts.indexOf(state.settings.alarmMode);
      const nextVal = opts[(idx + 1) % opts.length];
      return applyCommittedSetting(state, "alarmMode", nextVal, maritimeBus, currentSimTick);
    }
    case "COLOR_CYCLE": {
      const opts = ["DAY", "NIGHT", "GREEN", "WHITE"];
      const idx = opts.indexOf(state.settings.colorPalette);
      const nextVal = opts[(idx + 1) % opts.length];
      return applyCommittedSetting(state, "colorPalette", nextVal, maritimeBus, currentSimTick);
    }
    case "ALARM_ACK":
      return acknowledgeAlarms(state);
    default:
      return state;
  }
}

function executeMenuAction(state, actionId, maritimeBus, currentSimTick) {
  switch (actionId) {
    case "ata.acq":
      return handleManualAtaAcquire(state, maritimeBus, currentSimTick);
    case "ata.del": {
      if (state.trainingFixture.ataBoardOption !== true) {
        return finalizeState({ ...state, notice: "ataBoardMissing" }, maritimeBus, state);
      }
      if (!state.ata.selectedTargetId) return state;
      const nextAta = deleteAtaTarget(state.ata, state.ata.selectedTargetId);
      return finalizeState({ ...state, ata: nextAta, notice: "" }, maritimeBus, state);
    }
    case "ata.delAll": {
      if (state.trainingFixture.ataBoardOption !== true) {
        return finalizeState({ ...state, notice: "ataBoardMissing" }, maritimeBus, state);
      }
      return finalizeState({ ...state, ata: deleteAllAtaTargets(), notice: "" }, maritimeBus, state);
    }
    case "ais.info":
      return handleOpenAisInfo(state, maritimeBus);
    case "menu.openSystem":
      return {
        ...state,
        overlay: {
          kind: "system-menu",
          groupIndex: 0,
          itemIndex: 0,
          editing: false,
          draftValue: null,
        },
        notice: "",
      };
    case "system.allReset":
      return {
        ...state,
        overlay: { kind: "confirm-all-reset", confirm: false },
        notice: "",
      };
    case "maint.panelTest":
      return {
        ...state,
        overlay: { kind: "panel-test", lastControl: null, pressCount: 0 },
        notice: "",
      };
    case "maint.lcdTest":
      return {
        ...state,
        overlay: { kind: "lcd-test", patternIndex: 0 },
        notice: "",
      };
    default:
      return state;
  }
}

function stepMenuDraftValue(item, currentDraft, direction, settings) {
  const dir = (direction === "right" || direction === "up") ? 1 : -1;
  if (item.type === "choice") {
    const idx = item.options.indexOf(currentDraft);
    const base = idx >= 0 ? idx : 0;
    return item.options[(base + dir + item.options.length) % item.options.length];
  }
  if (item.type === "int") {
    if (item.wrap === true) {
      return Math.trunc(normalizeDeg360(currentDraft + dir * item.step));
    }
    return clamp(Math.trunc(currentDraft + dir * item.step), item.min, item.max);
  }
  if (item.type === "float") {
    let minVal = item.min;
    let maxVal = item.max;
    if (item.key === "alarmInnerNm") {
      maxVal = Math.min(maxVal, round3(settings.alarmOuterNm - 0.05));
    } else if (item.key === "alarmOuterNm") {
      minVal = Math.max(minVal, round3(settings.alarmInnerNm + 0.05));
    }
    return clamp(round3(currentDraft + dir * item.step), minVal, maxVal);
  }
  return currentDraft;
}

function handleMenuOverlayEvent(state, event, maritimeBus, currentSimTick) {
  const overlay = state.overlay;
  const tree = overlay.kind === "system-menu" ? MDC2060_SYSTEM_MENU_TREE : MDC2060_MAIN_MENU_TREE;
  const group = tree[overlay.groupIndex] ?? tree[0];
  const item = group.items[overlay.itemIndex] ?? group.items[0];

  if (event.kind === "press" && event.control === "menu") {
    if (event.hold === "long") {
      return {
        ...state,
        overlay: {
          kind: "system-menu",
          groupIndex: 0,
          itemIndex: 0,
          editing: false,
          draftValue: null,
        },
        notice: "",
      };
    }
    if (overlay.editing) {
      return {
        ...state,
        overlay: { ...overlay, editing: false, draftValue: null },
      };
    }
    return { ...state, overlay: null, notice: "" };
  }

  if (event.kind === "pad" && event.control === "cursorpad") {
    if (!overlay.editing) {
      if (event.direction === "left" || event.direction === "right") {
        const delta = event.direction === "right" ? 1 : -1;
        const nextGroupIdx = (overlay.groupIndex + delta + tree.length) % tree.length;
        return {
          ...state,
          overlay: {
            ...overlay,
            groupIndex: nextGroupIdx,
            itemIndex: 0,
            editing: false,
            draftValue: null,
          },
        };
      }
      const delta = event.direction === "down" ? 1 : -1;
      const nextItemIdx = (overlay.itemIndex + delta + group.items.length) % group.items.length;
      return {
        ...state,
        overlay: {
          ...overlay,
          itemIndex: nextItemIdx,
          editing: false,
          draftValue: null,
        },
      };
    }
    const nextDraft = stepMenuDraftValue(item, overlay.draftValue, event.direction, state.settings);
    return {
      ...state,
      overlay: { ...overlay, draftValue: nextDraft },
    };
  }

  if (event.kind === "press" && event.control === "ent" && event.hold === "short") {
    if (item.type === "readonly") return state;
    if (item.type === "action") {
      return executeMenuAction(state, item.actionId, maritimeBus, currentSimTick);
    }
    if (!overlay.editing) {
      if (item.key === "ataAutoArea" && state.trainingFixture.ataBoardOption !== true) {
        return finalizeState(
          {
            ...state,
            ata: { ...state.ata, lastError: "ATA_BOARD_NOT_INSTALLED", lastAcquiredId: null },
            notice: "ataBoardMissing",
          },
          maritimeBus,
          state,
        );
      }
      if ((item.key === "aisDisplay" || item.key === "aisCpaAlarm") &&
          state.trainingFixture.aisBoardOption !== true) {
        return finalizeState({ ...state, notice: "aisBoardMissing" }, maritimeBus, state);
      }
      return {
        ...state,
        overlay: { ...overlay, editing: true, draftValue: state.settings[item.key] },
        notice: "",
      };
    }
    const committed = applyCommittedSetting(
      {
        ...state,
        overlay: { ...overlay, editing: false, draftValue: null },
      },
      item.key,
      overlay.draftValue,
      maritimeBus,
      currentSimTick,
    );
    return committed;
  }

  return state;
}

// ============================================================================
// Cursor & Marker Movement Helper
// ============================================================================

function moveCursorAndUpdateMarkers(state, nextXFrac, nextYFrac, maritimeBus) {
  const clamped = clampUnitDisk(nextXFrac, nextYFrac);
  const nextCursor = computeCursorReadout(clamped.xFrac, clamped.yFrac, state);
  let nextEbl1Deg = state.ebl1Deg;
  let nextEbl2Deg = state.ebl2Deg;
  let nextVrm1Nm = state.vrm1Nm;
  let nextVrm2Nm = state.vrm2Nm;
  const activeRangeNm = (MDC2060_RANGES[state.rangeIndex] ?? MDC2060_RANGES[10]).nm;
  const sweepOrigin = activeSweepOrigin(
    state.settings,
    state.effectiveModes,
    state.offCenterOffset,
    state.tmOffset,
  );

  if (state.activeMarker === "ebl1" || state.activeMarker === "ebl1_vrm1") {
    const eblOrigin = state.settings.ebl1Float === "ON" ? state.ebl1Origin : sweepOrigin;
    nextEbl1Deg = computeBearingFromOrigin(clamped.xFrac, clamped.yFrac, eblOrigin, state);
  }
  if (state.activeMarker === "vrm1" || state.activeMarker === "ebl1_vrm1") {
    nextVrm1Nm = clamp(round4(nextCursor.rangeNm), 0, activeRangeNm);
  }
  if (state.activeMarker === "ebl2" || state.activeMarker === "ebl2_vrm2") {
    nextEbl2Deg = computeBearingFromOrigin(clamped.xFrac, clamped.yFrac, sweepOrigin, state);
  }
  if (state.activeMarker === "vrm2" || state.activeMarker === "ebl2_vrm2") {
    nextVrm2Nm = clamp(round4(nextCursor.rangeNm), 0, activeRangeNm);
  }

  return finalizeState(
    {
      ...state,
      cursor: nextCursor,
      ebl1Deg: nextEbl1Deg,
      ebl2Deg: nextEbl2Deg,
      vrm1Nm: nextVrm1Nm,
      vrm2Nm: nextVrm2Nm,
    },
    maritimeBus,
    state,
  );
}

function applyGainStcControl(working, event) {
  if (event.control === "gain") {
    if (event.kind === "rotate") {
      if (typeof event.steps !== "number" || !Number.isFinite(event.steps)) {
        throw new RangeError("gain rotate steps must be finite");
      }
      const nextGain = clamp(working.gain + event.steps * GAIN_STC_DETENT_STEP, 0, 100);
      return { ...working, gain: nextGain };
    }
    if (event.kind === "analog") {
      if (typeof event.value !== "number" || !Number.isFinite(event.value)) {
        throw new RangeError("gain analog value must be finite");
      }
      const nextGain = clamp(round3(cleanZero(event.value)), 0, 100);
      return { ...working, gain: nextGain };
    }
  }
  if (event.control === "stc") {
    if (event.kind === "rotate") {
      if (typeof event.steps !== "number" || !Number.isFinite(event.steps)) {
        throw new RangeError("stc rotate steps must be finite");
      }
      const nextStc = clamp(working.stc + event.steps * GAIN_STC_DETENT_STEP, 0, 100);
      return { ...working, stc: nextStc };
    }
    if (event.kind === "analog") {
      if (typeof event.value !== "number" || !Number.isFinite(event.value)) {
        throw new RangeError("stc analog value must be finite");
      }
      const nextStc = clamp(round3(cleanZero(event.value)), 0, 100);
      return { ...working, stc: nextStc };
    }
  }
  return null;
}

// ============================================================================
// Main Pure Reducer
// ============================================================================

export function reduceMdc2060(state, event) {
  if (!event || typeof event !== "object") return state;
  const maritimeBus = event.maritimeBus ?? null;
  const currentSimTick = resolveCurrentSimTick(state, event);

  // 1. restore-settings: STRICTLY OFF-only, never grants fixtures or options.
  if (event.kind === "restore-settings") {
    if (state.powerMode !== "off") {
      throw new Error("restore-settings only allowed when powerMode is off");
    }
    const validated = validateMdc2060Settings(event.settings);
    const merged = { ...initialSettings(), ...validated };
    // Transient TX economy mode cannot remain armed while powered off (matches powerOffState).
    merged.sleepMode = "OFF";
    if (merged.motionMode === "TM") {
      merged.offCenter = "OFF";
    } else if (merged.offCenter === "ON") {
      merged.motionMode = "RM";
    }
    if (state.trainingFixture.ataBoardOption !== true) {
      merged.ataAutoArea = "OFF";
    }
    if (state.trainingFixture.aisBoardOption !== true) {
      merged.aisDisplay = "OFF";
      merged.aisCpaAlarm = "OFF";
    }
    const offCenterOffset = merged.offCenter === "ON"
      ? { xFrac: 0, yFrac: 0.45 }
      : { xFrac: 0, yFrac: 0 };
    const tmOffset = { xFrac: 0, yFrac: 0 };
    const ebl1Origin = { xFrac: 0, yFrac: 0 };
    const effModes = computeEffectiveModes(
      merged,
      state.trainingFixture,
      state.instructor,
      state.rangeIndex,
    );
    const nextPartial = {
      ...state,
      settings: merged,
      effectiveModes: effModes,
      offCenterOffset,
      tmOffset,
      ebl1Origin,
      activeMarker: resolveFallbackActiveMarker(merged),
      sleepState: {
        phase: "inactive",
        remainingSec: 0,
        intervalSec: parseSleepIntervalSec(merged.sleepIntervalMin),
        burstSec: MDC2060_RADAR_SPECS.sleepBurstSec,
      },
      ais: initialAisSummary(merged, state.trainingFixture.aisBoardOption),
      guardZone: clearGuardZoneRuntime(state.guardZone, merged),
      overlay: null,
    };
    return {
      ...nextPartial,
      cursor: computeCursorReadout(state.cursor.xFrac, state.cursor.yFrac, nextPartial),
    };
  }

  // 2. training-fixture: always active, reconciles capabilities behind overlays & power-hold.
  if (event.kind === "training-fixture") {
    const prevFixtures = state.trainingFixture;
    if (typeof event.fixture !== "string" || !Object.hasOwn(prevFixtures, event.fixture)) {
      throw new TypeError(`unknown training fixture: ${String(event.fixture)}`);
    }
    if (typeof event.enabled !== "boolean") {
      throw new TypeError("training-fixture enabled must be boolean");
    }
    const nextFixtures = { ...prevFixtures, [event.fixture]: event.enabled };
    let nextPowerMode = state.powerMode;
    let nextPreheatSec = state.preheatRemainingSec;
    let nextSettings = state.settings;
    let nextAta = state.ata;
    let nextAis = state.ais;
    let nextOverlay = state.overlay;
    let nextNotice = state.notice;

    if (event.fixture === "skipPreheat" && event.enabled === true && state.powerMode === "preheat") {
      nextPowerMode = "standby";
      nextPreheatSec = 0;
    } else if (event.fixture === "fastPreheat" && event.enabled === true && state.powerMode === "preheat") {
      nextPreheatSec = Math.min(state.preheatRemainingSec, MDC2060_RADAR_SPECS.preheatFastSec);
    }

    const ataRemoved = event.fixture === "ataBoardOption" && event.enabled === false;
    const aisRemoved = event.fixture === "aisBoardOption" && event.enabled === false;
    const ataRestored = event.fixture === "ataBoardOption" &&
      event.enabled === true &&
      prevFixtures.ataBoardOption === false;
    const aisRestored = event.fixture === "aisBoardOption" &&
      event.enabled === true &&
      prevFixtures.aisBoardOption === false;

    if (ataRemoved) {
      nextAta = initialAtaState();
      if (nextSettings.ataAutoArea !== "OFF") {
        nextSettings = { ...nextSettings, ataAutoArea: "OFF" };
      }
      nextNotice = "ataBoardMissing";
    } else if (ataRestored) {
      if (nextAta.lastError === "ATA_BOARD_NOT_INSTALLED") {
        nextAta = { ...nextAta, lastError: null };
      }
      if (nextNotice === "ataBoardMissing") {
        nextNotice = "";
      }
    }
    if (aisRemoved) {
      if (nextSettings.aisDisplay !== "OFF" || nextSettings.aisCpaAlarm !== "OFF") {
        nextSettings = { ...nextSettings, aisDisplay: "OFF", aisCpaAlarm: "OFF" };
      }
      nextAis = {
        ...initialAisSummary(nextSettings, false),
        enabled: false,
        boardInstalled: false,
      };
      nextNotice = "aisBoardMissing";
    } else if (aisRestored) {
      if (nextSettings.aisDisplay !== "ON" || nextSettings.aisCpaAlarm !== "ON") {
        nextSettings = { ...nextSettings, aisDisplay: "ON", aisCpaAlarm: "ON" };
      }
      if (nextNotice === "aisBoardMissing") {
        nextNotice = "";
      }
    }
    if (ataRemoved || aisRemoved) {
      nextOverlay = reconcileOverlayForCapability(state.overlay, ataRemoved, aisRemoved);
    }

    const nextEff = computeEffectiveModes(
      nextSettings,
      nextFixtures,
      state.instructor,
      state.rangeIndex,
    );
    if (!aisRemoved && nextPowerMode !== "off") {
      nextAis = compactAisSummary(
        maritimeBus,
        nextSettings,
        nextFixtures,
        nextEff,
        nextFixtures.aisBoardOption ? state.ais.selectedMmsi : null,
      );
    } else if (!aisRemoved && nextPowerMode === "off") {
      nextAis = initialAisSummary(nextSettings, nextFixtures.aisBoardOption);
    }

    let nextGuardZone = state.guardZone;
    if (event.fixture === "headingSensor" && isActivelyTransmitting(nextPowerMode, state.sleepState)) {
      nextGuardZone = evaluateGuardZone(
        state.guardZone,
        maritimeBus,
        buildTransientSettings(nextSettings, nextFixtures, nextEff),
      );
    }

    const nextBase = {
      ...state,
      powerMode: nextPowerMode,
      preheatRemainingSec: nextPreheatSec,
      trainingFixture: nextFixtures,
      settings: nextSettings,
      ata: nextAta,
      ais: nextAis,
      guardZone: nextGuardZone,
      overlay: nextOverlay,
      notice: nextNotice,
    };
    return finalizeState(nextBase, maritimeBus, state);
  }

  // 3. Instructor numeric analog controls: never blocked by modal overlays.
  if (event.kind === "analog" &&
      (event.control === "inst_sea_state" ||
       event.control === "inst_rain" ||
       event.control === "inst_ftc")) {
    if (typeof event.value !== "number" || !Number.isFinite(event.value)) {
      throw new RangeError(`${event.control} analog value must be finite`);
    }
    const raw = cleanZero(event.value);
    const nextInstructor = { ...state.instructor };
    if (event.control === "inst_sea_state") {
      nextInstructor.seaState = raw < 0 ? -1 : clamp(Math.round(raw), 0, 6);
    } else if (event.control === "inst_rain") {
      nextInstructor.rain = raw < 0 ? -1 : clamp(round3(raw), 0, 100);
    } else if (event.control === "inst_ftc") {
      nextInstructor.ftc = raw < 0 ? -1 : clamp(Math.round(raw), 0, 8);
    }
    return finalizeState({ ...state, instructor: nextInstructor }, maritimeBus, state);
  }

  // 4. ui-tick: advances uiElapsedMs, power-hold countdown (>3000ms), brill auto-commit, ent hold elapsed.
  if (event.kind === "ui-tick") {
    if (typeof event.elapsedMs !== "number" || !Number.isFinite(event.elapsedMs) || event.elapsedMs < 0) {
      throw new RangeError("ui-tick elapsedMs must be a non-negative finite number");
    }
    const nextUiElapsed = state.uiElapsedMs + event.elapsedMs;
    const nextEntElapsed = state.entHeld
      ? Math.min(120000, state.entHoldElapsedMs + event.elapsedMs)
      : state.entHoldElapsedMs;

    if (state.overlay?.kind === "power-hold") {
      const nextElapsed = state.overlay.elapsedMs + event.elapsedMs;
      if (nextElapsed > MDC2060_RADAR_SPECS.holdThresholdMs.power) {
        return {
          ...powerOffState(state),
          uiElapsedMs: nextUiElapsed,
          powerOffHoldPendingRelease: true,
        };
      }
      return {
        ...state,
        uiElapsedMs: nextUiElapsed,
        entHoldElapsedMs: nextEntElapsed,
        overlay: {
          ...state.overlay,
          elapsedMs: nextElapsed,
          remainingMs: Math.max(0, MDC2060_RADAR_SPECS.holdThresholdMs.power - nextElapsed),
        },
      };
    }

    if (state.overlay?.kind === "brill") {
      const nextElapsed = state.overlay.elapsedMs + event.elapsedMs;
      if (nextElapsed >= BRILL_TIMEOUT_MS) {
        return {
          ...state,
          uiElapsedMs: nextUiElapsed,
          entHoldElapsedMs: nextEntElapsed,
          brightness: state.overlay.lcdBrightness,
          panelBrightness: state.overlay.panelBrightness,
          overlay: null,
        };
      }
      return {
        ...state,
        uiElapsedMs: nextUiElapsed,
        entHoldElapsedMs: nextEntElapsed,
        overlay: { ...state.overlay, elapsedMs: nextElapsed },
      };
    }

    return {
      ...state,
      uiElapsedMs: nextUiElapsed,
      entHoldElapsedMs: nextEntElapsed,
    };
  }

  // 5. power control (down / cancel / press): always handled regardless of active overlay.
  if (event.control === "power") {
    if (event.kind === "down") {
      if (state.powerMode === "off") {
        return { ...state, powerOffHoldPendingRelease: false };
      }
      return {
        ...state,
        powerOffHoldPendingRelease: false,
        overlay: {
          kind: "power-hold",
          elapsedMs: 0,
          remainingMs: MDC2060_RADAR_SPECS.holdThresholdMs.power,
          priorOverlay: state.overlay,
        },
      };
    }
    if (event.kind === "cancel") {
      if (state.powerOffHoldPendingRelease) {
        return { ...state, powerOffHoldPendingRelease: false };
      }
      if (state.overlay?.kind === "power-hold") {
        return { ...state, overlay: state.overlay.priorOverlay };
      }
      return state;
    }
    if (event.kind === "press") {
      if (state.powerOffHoldPendingRelease) {
        return { ...state, powerOffHoldPendingRelease: false };
      }
      if (event.hold === "long") {
        return powerOffState(state);
      }
      // Short press power (<= 3000ms)
      if (state.powerMode === "off") {
        const nextPowerMode = state.trainingFixture.skipPreheat ? "standby" : "preheat";
        const nextPreheatSec = state.trainingFixture.skipPreheat
          ? 0
          : (state.trainingFixture.fastPreheat
            ? MDC2060_RADAR_SPECS.preheatFastSec
            : MDC2060_RADAR_SPECS.preheatAuthenticSec);
        const effModes = computeEffectiveModes(
          state.settings,
          state.trainingFixture,
          state.instructor,
          state.rangeIndex,
        );
        const nextAis = compactAisSummary(
          maritimeBus,
          state.settings,
          state.trainingFixture,
          effModes,
          state.ais.selectedMmsi,
        );
        return finalizeState(
          {
            ...state,
            powerMode: nextPowerMode,
            preheatRemainingSec: nextPreheatSec,
            ais: nextAis,
            overlay: null,
            notice: "",
          },
          maritimeBus,
          state,
        );
      }
      if (state.powerMode === "sleep") {
        return wakeFromSleep(state, maritimeBus, state);
      }
      // Powered on (preheat / standby / transmit): unwrap priorOverlay and toggle/open BRILL dialog.
      const baseOverlay = state.overlay?.kind === "power-hold"
        ? state.overlay.priorOverlay
        : state.overlay;
      if (baseOverlay?.kind === "brill") {
        return {
          ...state,
          brightness: baseOverlay.lcdBrightness,
          panelBrightness: baseOverlay.panelBrightness,
          overlay: null,
        };
      }
      return {
        ...state,
        overlay: {
          kind: "brill",
          lcdBrightness: state.brightness,
          panelBrightness: state.panelBrightness,
          activeField: "lcd",
          elapsedMs: 0,
        },
      };
    }
  }

  // 6. tick: always advances simTick (even while OFF), preheat, SLEEP cycles, sweep, TX hours, ATA, AIS, Guard Zone, trails, TM.
  if (event.kind === "tick") {
    const steps = event.steps === undefined ? 1 : event.steps;
    if (typeof steps !== "number" || !Number.isFinite(steps) || !Number.isInteger(steps) || steps < 1) {
      throw new RangeError("tick steps must be a positive finite integer");
    }
    const nextSimTick = Number.isInteger(maritimeBus?.simTick)
      ? maritimeBus.simTick
      : (Number.isInteger(event.tick) ? event.tick + steps : state.simTick + steps);
    const nextEntElapsed = state.entHeld
      ? Math.min(120000, state.entHoldElapsedMs + steps * 1000)
      : state.entHoldElapsedMs;

    if (state.powerMode === "off") {
      return {
        ...state,
        simTick: nextSimTick,
        entHoldElapsedMs: nextEntElapsed,
      };
    }

    let nextPowerMode = state.powerMode;
    let nextPreheatSec = state.preheatRemainingSec;
    let nextSleepState = state.sleepState;
    let activeTxSecs = 0;

    if (state.powerMode === "preheat") {
      nextPreheatSec = Math.max(0, state.preheatRemainingSec - steps);
      if (nextPreheatSec === 0) {
        nextPowerMode = "standby";
      }
    } else if (state.powerMode === "transmit") {
      activeTxSecs = steps;
    } else if (state.powerMode === "sleep") {
      let phase = state.sleepState.phase === "burst" ? "burst" : "resting";
      const intervalSec = parseSleepIntervalSec(state.settings.sleepIntervalMin);
      const burstSec = MDC2060_RADAR_SPECS.sleepBurstSec;
      let rem = state.sleepState.remainingSec > 0 ? state.sleepState.remainingSec : intervalSec;
      for (let s = 0; s < steps; s++) {
        if (phase === "burst") {
          activeTxSecs += 1;
        }
        rem -= 1;
        if (rem <= 0) {
          if (phase === "resting") {
            phase = "burst";
            rem = burstSec;
          } else {
            phase = "resting";
            rem = intervalSec;
          }
        }
      }
      nextSleepState = { phase, remainingSec: rem, intervalSec, burstSec };
    }

    const nextTxSeconds = state.txSeconds + activeTxSecs;
    const nextTxHours = round3(nextTxSeconds / 3600);
    const degPerSec = Number(state.settings.motorRpm) === 48 ? 288 : 144;
    const nextSweepAz = activeTxSecs > 0
      ? normalizeDeg360(state.sweepAzimuthDeg + degPerSec * activeTxSecs)
      : state.sweepAzimuthDeg;

    const effModes = computeEffectiveModes(
      state.settings,
      state.trainingFixture,
      state.instructor,
      state.rangeIndex,
    );
    const ownshipSnapshot = extractOwnshipSnapshot(
      maritimeBus,
      state.ownshipSnapshot,
      state.trainingFixture,
    );
    const activeRangeNm = (MDC2060_RANGES[state.rangeIndex] ?? MDC2060_RANGES[10]).nm;
    const nextTmOffset = stepTrueMotionOffset(
      state.tmOffset,
      activeTxSecs,
      activeRangeNm,
      ownshipSnapshot,
      effModes,
    );

    const transientSettings = buildTransientSettings(
      state.settings,
      state.trainingFixture,
      effModes,
    );

    let nextAta = state.ata;
    let nextGuardZone = state.guardZone;
    let nextTrails = state.trails;

    const nextActivelyTx = isActivelyTransmitting(nextPowerMode, nextSleepState);

    if (activeTxSecs > 0) {
      if (state.trainingFixture.ataBoardOption === true) {
        nextAta = stepAtaTracking(state.ata, maritimeBus, transientSettings, nextSimTick);
      }
      nextTrails = stepTrails(state.trails, maritimeBus, state.settings, effModes, nextSimTick);
    }
    if (nextActivelyTx) {
      nextGuardZone = evaluateGuardZone(state.guardZone, maritimeBus, transientSettings);
    } else {
      nextGuardZone = clearGuardZoneRuntime(state.guardZone, state.settings);
    }

    const nextAis = compactAisSummary(
      maritimeBus,
      state.settings,
      state.trainingFixture,
      effModes,
      state.ais.selectedMmsi,
    );

    return finalizeState(
      {
        ...state,
        simTick: nextSimTick,
        entHoldElapsedMs: nextEntElapsed,
        powerMode: nextPowerMode,
        preheatRemainingSec: nextPreheatSec,
        sleepState: nextSleepState,
        txSeconds: nextTxSeconds,
        txHours: nextTxHours,
        sweepAzimuthDeg: nextSweepAz,
        tmOffset: nextTmOffset,
        ata: nextAta,
        ais: nextAis,
        guardZone: nextGuardZone,
        trails: nextTrails,
      },
      maritimeBus,
      state,
    );
  }

  // 7. Block all other controls while powered off (track OFF-state ent/menu holds
  // so releasing them after powering ON cannot trigger a spurious press).
  if (state.powerMode === "off") {
    if (event.control === "ent") {
      if (event.kind === "down") {
        return { ...state, entOffHoldPendingRelease: true };
      }
      if (event.kind === "cancel" || event.kind === "press") {
        return state.entOffHoldPendingRelease
          ? { ...state, entOffHoldPendingRelease: false }
          : state;
      }
    }
    if (event.control === "menu") {
      if (event.kind === "down") {
        return { ...state, menuOffHoldPendingRelease: true };
      }
      if (event.kind === "cancel" || event.kind === "press") {
        return state.menuOffHoldPendingRelease
          ? { ...state, menuOffHoldPendingRelease: false }
          : state;
      }
    }
    return state;
  }

  // 8. Block all other controls during power-hold countdown (track blocked ent/menu holds
  // so releasing them after power-hold ends or after power cycle cannot trigger a spurious press).
  if (state.overlay?.kind === "power-hold") {
    if (event.control === "ent") {
      if (event.kind === "down") {
        return { ...state, entOffHoldPendingRelease: true };
      }
      if (event.kind === "cancel" || event.kind === "press") {
        return {
          ...state,
          hlSuppressed: false,
          entHeld: false,
          entHoldElapsedMs: 0,
          entOffHoldPendingRelease: false,
        };
      }
    }
    if (event.control === "menu") {
      if (event.kind === "down") {
        return { ...state, menuOffHoldPendingRelease: true };
      }
      if (event.kind === "cancel" || event.kind === "press") {
        return { ...state, menuHeld: false, menuOffHoldPendingRelease: false };
      }
    }
    return state;
  }

  // 9. Track ent / menu down & cancel edges cleanly.
  if (event.control === "ent" && event.kind === "down") {
    return {
      ...state,
      hlSuppressed: true,
      entHeld: true,
      entHoldElapsedMs: 0,
      entOffHoldPendingRelease: false,
    };
  }
  if (event.control === "ent" && event.kind === "cancel") {
    return {
      ...state,
      hlSuppressed: false,
      entHeld: false,
      entHoldElapsedMs: 0,
      entOffHoldPendingRelease: false,
    };
  }
  if (event.control === "menu" && event.kind === "down") {
    return { ...state, menuHeld: true, menuOffHoldPendingRelease: false };
  }
  if (event.control === "menu" && event.kind === "cancel") {
    return { ...state, menuHeld: false, menuOffHoldPendingRelease: false };
  }

  // Swallow synthesized press edges for ent / menu holds that began while OFF.
  if (event.control === "ent" && event.kind === "press" && state.entOffHoldPendingRelease) {
    return {
      ...state,
      hlSuppressed: false,
      entHeld: false,
      entHoldElapsedMs: 0,
      entOffHoldPendingRelease: false,
    };
  }
  if (event.control === "menu" && event.kind === "press" && state.menuOffHoldPendingRelease) {
    return { ...state, menuHeld: false, menuOffHoldPendingRelease: false };
  }

  // Clear hold flags on synthesized press edges for ent / menu.
  let working = state;
  let isLongEntRelease = false;
  if (event.control === "ent" && event.kind === "press") {
    working = { ...working, hlSuppressed: false, entHeld: false, entHoldElapsedMs: 0 };
    if (event.hold === "long") {
      isLongEntRelease = true;
    }
  } else if (event.control === "menu" && event.kind === "press") {
    working = { ...working, menuHeld: false };
  }

  // 10. Wake immediately from SLEEP on any physical key press/interaction (including long ENT).
  if (working.powerMode === "sleep") {
    const woke = wakeFromSleep(working, maritimeBus, state);
    return (event.kind === "press" && event.control === "alarm_ack")
      ? acknowledgeAlarms(woke)
      : woke;
  }

  if (isLongEntRelease) {
    // Long ENT release (HL OFF): clear suppression with ZERO short-press side effects.
    return working;
  }

  // 11. Global alarm_ack (works even when a menu/dialog is open).
  if (event.kind === "press" && event.control === "alarm_ack") {
    return acknowledgeAlarms(working);
  }

  // 12. Modal overlays (unified isolation).
  const activeKind = working.overlay?.kind ?? null;

  if (activeKind === "brill") {
    if (event.kind === "pad" && event.control === "cursorpad") {
      const ov = working.overlay;
      if (event.direction === "up" || event.direction === "down") {
        const nextField = ov.activeField === "lcd" ? "panel" : "lcd";
        return { ...working, overlay: { ...ov, activeField: nextField, elapsedMs: 0 } };
      }
      const delta = event.direction === "right" ? 1 : -1;
      if (ov.activeField === "panel") {
        const nextPanel = clamp(ov.panelBrightness + delta, 0, 10);
        return {
          ...working,
          panelBrightness: nextPanel,
          overlay: {
            ...ov,
            panelBrightness: nextPanel,
            elapsedMs: 0,
          },
        };
      }
      const nextLcd = clamp(ov.lcdBrightness + delta, 1, 10);
      return {
        ...working,
        brightness: nextLcd,
        overlay: {
          ...ov,
          lcdBrightness: nextLcd,
          elapsedMs: 0,
        },
      };
    }
    if (event.kind === "press" &&
        ((event.control === "ent" && event.hold === "short") ||
         (event.control === "menu" && event.hold === "short"))) {
      return {
        ...working,
        brightness: working.overlay.lcdBrightness,
        panelBrightness: working.overlay.panelBrightness,
        overlay: null,
      };
    }
    if (working.powerMode === "standby" || working.powerMode === "transmit") {
      const rotaryUpdated = applyGainStcControl(working, event);
      if (rotaryUpdated !== null) {
        return rotaryUpdated;
      }
    }
    return working;
  }

  // During preheat, only power/brill/alarm_ack/fixtures/tick are active.
  if (working.powerMode === "preheat") {
    return working;
  }

  if (activeKind === "menu" || activeKind === "system-menu") {
    return handleMenuOverlayEvent(working, event, maritimeBus, currentSimTick);
  }

  if (activeKind === "confirm-all-reset") {
    if (event.kind === "pad" && event.control === "cursorpad") {
      return {
        ...working,
        overlay: { ...working.overlay, confirm: !working.overlay.confirm },
      };
    }
    if (event.kind === "press" && event.control === "menu" && event.hold === "short") {
      return {
        ...working,
        overlay: {
          kind: "system-menu",
          groupIndex: 2,
          itemIndex: 2,
          editing: false,
          draftValue: null,
        },
      };
    }
    if (event.kind === "press" && event.control === "ent" && event.hold === "short") {
      if (!working.overlay.confirm) {
        return {
          ...working,
          overlay: {
            kind: "system-menu",
            groupIndex: 2,
            itemIndex: 2,
            editing: false,
            draftValue: null,
          },
        };
      }
      const resetSettings = initialSettings();
      if (working.trainingFixture.ataBoardOption !== true) {
        resetSettings.ataAutoArea = "OFF";
      }
      if (working.trainingFixture.aisBoardOption !== true) {
        resetSettings.aisDisplay = "OFF";
        resetSettings.aisCpaAlarm = "OFF";
      }
      const effModes = computeEffectiveModes(
        resetSettings,
        working.trainingFixture,
        working.instructor,
        MDC2060_RADAR_SPECS.defaultRangeIndex,
      );
      return finalizeState(
        {
          ...working,
          rangeIndex: MDC2060_RADAR_SPECS.defaultRangeIndex,
          subRangeIndex: MDC2060_RADAR_SPECS.defaultSubRangeIndex,
          gain: 55,
          stc: 0,
          brightness: 8,
          panelBrightness: 7,
          settings: resetSettings,
          sleepState: {
            phase: "inactive",
            remainingSec: 0,
            intervalSec: parseSleepIntervalSec(resetSettings.sleepIntervalMin),
            burstSec: MDC2060_RADAR_SPECS.sleepBurstSec,
          },
          offCenterOffset: { xFrac: 0, yFrac: 0 },
          tmOffset: { xFrac: 0, yFrac: 0 },
          ebl1Deg: 0,
          ebl2Deg: 45,
          ebl1Origin: { xFrac: 0, yFrac: 0 },
          vrm1Nm: 1.5,
          vrm2Nm: 3.0,
          piBearingDeg: 0,
          piSpacingNm: 0.5,
          activeMarker: null,
          cursor: {
            xFrac: 0,
            yFrac: 0,
            rangeNm: 0,
            bearingDeg: 0,
            relBearingDeg: 0,
            lat: null,
            lon: null,
          },
          measureAnchor: null,
          measureResult: null,
          trails: [],
          ata: initialAtaState(),
          ais: compactAisSummary(
            maritimeBus,
            resetSettings,
            working.trainingFixture,
            effModes,
            null,
          ),
          guardZone: initialGuardZoneState(),
          alarms: initialAlarmsState(),
          overlay: null,
          notice: "allResetDone",
        },
        maritimeBus,
        state,
      );
    }
    return working;
  }

  if (activeKind === "panel-test") {
    if (event.kind === "press" && event.control === "menu" && event.hold === "short") {
      return {
        ...working,
        overlay: {
          kind: "system-menu",
          groupIndex: 3,
          itemIndex: 0,
          editing: false,
          draftValue: null,
        },
      };
    }
    if (typeof event.control === "string") {
      return {
        ...working,
        overlay: {
          ...working.overlay,
          lastControl: event.control,
          pressCount: working.overlay.pressCount + 1,
        },
      };
    }
    return working;
  }

  if (activeKind === "lcd-test") {
    if (event.kind === "press" && event.control === "menu" && event.hold === "short") {
      return {
        ...working,
        overlay: {
          kind: "system-menu",
          groupIndex: 3,
          itemIndex: 1,
          editing: false,
          draftValue: null,
        },
      };
    }
    if ((event.kind === "pad" && event.control === "cursorpad") ||
        (event.kind === "press" && event.control === "ent" && event.hold === "short")) {
      return {
        ...working,
        overlay: {
          ...working.overlay,
          patternIndex: (working.overlay.patternIndex + 1) % 4,
        },
      };
    }
    return working;
  }

  if (activeKind === "ais-info") {
    if (event.kind === "press" &&
        ((event.control === "menu" && event.hold === "short") ||
         (event.control === "ent" && event.hold === "short"))) {
      return { ...working, overlay: null };
    }
    return working;
  }

  // 13. Base PPI Screen Controls (standby / transmit, overlay === null)
  if (event.kind === "press" && event.control === "stby_tx") {
    if (working.powerMode === "standby") {
      const transientSettings = buildTransientSettings(
        working.settings,
        working.trainingFixture,
        working.effectiveModes,
      );
      const nextGuardZone = evaluateGuardZone(working.guardZone, maritimeBus, transientSettings);
      return finalizeState(
        { ...working, powerMode: "transmit", guardZone: nextGuardZone, notice: "" },
        maritimeBus,
        state,
      );
    }
    if (working.powerMode === "transmit") {
      return finalizeState(
        {
          ...working,
          powerMode: "standby",
          guardZone: clearGuardZoneRuntime(working.guardZone, working.settings),
          trails: [],
          notice: "",
        },
        maritimeBus,
        state,
      );
    }
    return working;
  }

  if (event.kind === "press" && event.control === "menu") {
    if (event.hold === "long") {
      return {
        ...working,
        overlay: {
          kind: "system-menu",
          groupIndex: 0,
          itemIndex: 0,
          editing: false,
          draftValue: null,
        },
        notice: "",
      };
    }
    return {
      ...working,
      overlay: {
        kind: "menu",
        groupIndex: 0,
        itemIndex: 0,
        editing: false,
        draftValue: null,
      },
      notice: "",
    };
  }

  if (event.kind === "press" && (event.control === "range_up" || event.control === "range_down")) {
    const delta = event.control === "range_up" ? 1 : -1;
    const nextRangeIndex = clamp(working.rangeIndex + delta, 0, MDC2060_RANGES.length - 1);
    return finalizeState({ ...working, rangeIndex: nextRangeIndex }, maritimeBus, state);
  }

  if (event.kind === "press" && (event.control === "sub_range_up" || event.control === "sub_range_down")) {
    const delta = event.control === "sub_range_up" ? 1 : -1;
    const nextSubRangeIndex = clamp(working.subRangeIndex + delta, 0, MDC2060_RANGES.length - 1);
    return finalizeState({ ...working, subRangeIndex: nextSubRangeIndex }, maritimeBus, state);
  }

  const rotaryUpdated = applyGainStcControl(working, event);
  if (rotaryUpdated !== null) {
    return rotaryUpdated;
  }

  if (event.kind === "press" && (event.control === "f1" || event.control === "f2")) {
    const presetId = event.control === "f1" ? working.settings.f1Key : working.settings.f2Key;
    return executeFKeyPreset(working, presetId, maritimeBus, currentSimTick);
  }

  if (event.kind === "pad" && event.control === "cursorpad") {
    let dx = 0;
    let dy = 0;
    if (event.direction === "left") dx = -CURSOR_PAD_STEP;
    else if (event.direction === "right") dx = CURSOR_PAD_STEP;
    else if (event.direction === "up") dy = -CURSOR_PAD_STEP;
    else if (event.direction === "down") dy = CURSOR_PAD_STEP;
    return moveCursorAndUpdateMarkers(
      working,
      working.cursor.xFrac + dx,
      working.cursor.yFrac + dy,
      maritimeBus,
    );
  }

  if (event.control === "ppi_cursor") {
    if (event.kind === "pointer") {
      if (typeof event.dx !== "number" || !Number.isFinite(event.dx) ||
          typeof event.dy !== "number" || !Number.isFinite(event.dy)) {
        throw new RangeError("pointer dx/dy must be finite");
      }
      const nextX = working.cursor.xFrac + event.dx / PPI_DEFAULT_RADIUS_PX;
      const nextY = working.cursor.yFrac + event.dy / PPI_DEFAULT_RADIUS_PX;
      return moveCursorAndUpdateMarkers(working, nextX, nextY, maritimeBus);
    }
    if (event.kind === "touch") {
      if (event.phase === "cancel") return working;
      if (typeof event.x !== "number" || !Number.isFinite(event.x) ||
          typeof event.y !== "number" || !Number.isFinite(event.y)) {
        throw new RangeError("touch x/y must be finite");
      }
      let cx = 240;
      let cy = 300;
      let radius = PPI_DEFAULT_RADIUS_PX;
      if (working.settings.screenMode === "PPI/PPI") {
        cy = event.y <= 320 ? 170 : 465;
        radius = 135;
      } else if (working.settings.screenMode === "PPI/NAV") {
        cy = 200;
        radius = 165;
      }
      const nextX = (event.x - cx) / radius;
      const nextY = (event.y - cy) / radius;
      return moveCursorAndUpdateMarkers(working, nextX, nextY, maritimeBus);
    }
  }

  if (event.kind === "press" && event.control === "ent" && event.hold === "short") {
    // If 2-point measurement already active: complete on 2nd press, clear on 3rd press.
    if (working.measureAnchor !== null) {
      if (working.measureResult !== null) {
        return { ...working, measureAnchor: null, measureResult: null };
      }
      const { rangeNm: distNm, bearingDeg } = computeTwoPointVector(
        working.measureAnchor,
        working.cursor.xFrac,
        working.cursor.yFrac,
        working,
      );
      return {
        ...working,
        measureResult: {
          bearingDeg,
          rangeNm: distNm,
          fromXFrac: working.measureAnchor.xFrac,
          fromYFrac: working.measureAnchor.yFrac,
          toXFrac: working.cursor.xFrac,
          toYFrac: working.cursor.yFrac,
        },
      };
    }

    // If cursor is positioned near an AIS target and AIS is enabled, inspect AIS target.
    if (working.trainingFixture.aisBoardOption === true &&
        working.settings.aisDisplay !== "OFF" &&
        Math.hypot(working.cursor.xFrac, working.cursor.yFrac) > 0.02 &&
        Array.isArray(maritimeBus?.aisTargets) &&
        maritimeBus.aisTargets.length > 0) {
      const transientSettings = buildTransientSettings(
        working.settings,
        working.trainingFixture,
        working.effectiveModes,
      );
      const proj = projectAisTargets(maritimeBus, transientSettings, working.ais.selectedMmsi);
      let nearest = null;
      let nearestDist = 0.09;
      for (let i = 0; i < proj.targets.length; i++) {
        const t = proj.targets[i];
        const pos = contactToScreenXY(t, working);
        const dist = Math.hypot(pos.xFrac - working.cursor.xFrac, pos.yFrac - working.cursor.yFrac);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = t;
        }
      }
      if (nearest) {
        const ais = compactAisSummary(
          maritimeBus,
          working.settings,
          working.trainingFixture,
          working.effectiveModes,
          nearest.mmsi,
        );
        return finalizeState(
          {
            ...working,
            ais,
            overlay: { kind: "ais-info", mmsi: nearest.mmsi },
            notice: "",
          },
          maritimeBus,
          state,
        );
      }
    }

    // Otherwise start 2-point BRG/RNG measurement anchor at current cursor.
    return {
      ...working,
      measureAnchor: {
        xFrac: working.cursor.xFrac,
        yFrac: working.cursor.yFrac,
        rangeNm: working.cursor.rangeNm,
        bearingDeg: working.cursor.bearingDeg,
        lat: working.cursor.lat,
        lon: working.cursor.lon,
      },
      measureResult: null,
    };
  }

  return working;
}

// ============================================================================
// Flat Canonical Probe Summary
// ============================================================================

function computeTwoPointVector(anchor, toXFrac, toYFrac, stateLike) {
  const activeRangeNm = (MDC2060_RANGES[stateLike.rangeIndex] ?? MDC2060_RANGES[10]).nm;
  const dx = toXFrac - anchor.xFrac;
  const dy = -(toYFrac - anchor.yFrac);
  const rangeNm = round3(Math.hypot(dx, dy) * activeRangeNm);
  const topRef = topOfScreenRefDeg(
    stateLike.effectiveModes.presentationMode,
    stateLike.ownshipSnapshot,
  );
  const screenAng = Math.hypot(dx, dy) > 1e-6
    ? normalizeDeg360(Math.atan2(dx, dy) * RAD_TO_DEG)
    : 0;
  const bearingDeg = roundDeg3(screenAng + topRef);
  return { rangeNm, bearingDeg };
}

export function probeMdc2060(state) {
  const activeRange = MDC2060_RANGES[state.rangeIndex] ?? MDC2060_RANGES[10];
  const subRange = MDC2060_RANGES[state.subRangeIndex] ?? MDC2060_RANGES[7];
  const twoPointLive = state.measureAnchor && !state.measureResult
    ? computeTwoPointVector(state.measureAnchor, state.cursor.xFrac, state.cursor.yFrac, state)
    : null;
  return {
    powerMode: state.powerMode,
    power: state.powerMode,
    preheatRemainingSec: state.preheatRemainingSec,
    simTick: state.simTick,
    uiElapsedMs: state.uiElapsedMs,
    txSeconds: state.txSeconds,
    txHours: state.txHours,
    sweepAzimuthDeg: state.sweepAzimuthDeg,
    rangeIndex: state.rangeIndex,
    rangeNm: activeRange.nm,
    subRangeIndex: state.subRangeIndex,
    subRangeNm: subRange.nm,
    gain: state.gain,
    stc: state.stc,
    ftc: state.settings.ftc,
    effectiveFtc: state.effectiveModes.ftc,
    ir: state.settings.ir,
    exp: state.settings.exp,
    process: state.settings.process,
    pw: state.settings.pw,
    effectivePw: state.effectiveModes.pw,
    presentationMode: state.settings.presentationMode,
    effectivePresentationMode: state.effectiveModes.presentationMode,
    motionMode: state.settings.motionMode,
    effectiveMotionMode: state.effectiveModes.motionMode,
    screenMode: state.settings.screenMode,
    offCenter: state.settings.offCenter,
    trailMode: state.settings.trailMode,
    effectiveTrailMode: state.effectiveModes.trailMode,
    trailTime: state.settings.trailTime,
    colorPalette: state.settings.colorPalette,
    piLine: state.settings.piLine,
    brgMode: state.settings.brgMode,
    effectiveBrgMode: state.effectiveModes.brgMode,
    vectorMode: state.settings.vectorMode,
    effectiveVectorMode: state.effectiveModes.vectorMode,
    ebl1On: state.settings.ebl1 === "ON",
    ebl1Deg: state.ebl1Deg,
    ebl1Float: state.settings.ebl1Float === "ON",
    ebl2On: state.settings.ebl2 === "ON",
    ebl2Deg: state.ebl2Deg,
    vrm1On: state.settings.vrm1 === "ON",
    vrm1Nm: state.vrm1Nm,
    vrm2On: state.settings.vrm2 === "ON",
    vrm2Nm: state.vrm2Nm,
    hlSuppressed: state.hlSuppressed,
    twoPointActive: state.measureAnchor !== null && state.measureResult === null,
    twoPointRangeNm: state.measureResult
      ? state.measureResult.rangeNm
      : (twoPointLive ? twoPointLive.rangeNm : null),
    twoPointBearingDeg: state.measureResult
      ? state.measureResult.bearingDeg
      : (twoPointLive ? twoPointLive.bearingDeg : null),
    alarmMode: state.settings.alarmMode,
    guardZoneTriggered: state.guardZone.alarmActive,
    guardZoneAudible: state.guardZone.audible,
    alarmAudible: state.alarms.audible,
    alarmVisualActive: state.alarms.visualActive,
    ataCount: state.ata.targets.length,
    ataTrackingCount: state.ata.targets.filter(t => t.status === "tracking").length,
    ataDangerCount: state.ata.dangerousIds.length,
    aisDisplay: state.settings.aisDisplay,
    aisDangerCount: state.ais.dangerousMmsis.length,
    selectedAisMmsi: state.ais.selectedMmsi,
    sleepMode: state.settings.sleepMode,
    sleepPhase: state.sleepState.phase,
    motorRpm: state.settings.motorRpm,
    rangeUnit: state.settings.rangeUnit,
    language: state.settings.language,
    brightness: state.brightness,
    panelBrightness: state.panelBrightness,
    hdgNoSignal: state.sensorFaults.hdgNoSignal,
    gpsNoSignal: state.sensorFaults.gpsNoSignal,
    spdNoSignal: state.sensorFaults.spdNoSignal,
    dialog: state.overlay?.kind ?? null,
  };
}
