/**
 * KODEN MDC-2060 Marine Radar — Pure ATA (ARPA, up to 50 targets),
 * AIS Overlay Projection (up to 100 targets), IEC 61162-1 $RATTM Formatter,
 * and Guard Zone (OFF / IN / OUT) Evaluation.
 *
 * Strictly JSON-canonical outputs: zero undefined, NaN, Infinity, -0,
 * Map, Set, or typed arrays in any returned state so stableSerialize and
 * fingerprint succeed deterministically.
 *
 * Training-only collision-avoidance model; not fit for shipboard navigation.
 */
import { computeTargetEncounter, formatNmeaSentence } from "../../core/maritime-world.mjs";
import { MDC2060_RADAR_SPECS } from "./spec.mjs";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

const cleanZero = v => (Object.is(v, -0) ? 0 : v);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round3 = v => cleanZero(Math.round(v * 1e3) / 1e3);
const round6 = v => cleanZero(Math.round(v * 1e6) / 1e6);

function finiteOr(v, fallback) {
  return typeof v === "number" && Number.isFinite(v) ? cleanZero(v) : fallback;
}

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

function normalizeOwnshipForEncounter(ownship) {
  if (!ownship || typeof ownship !== "object" ||
      typeof ownship.lat !== "number" || !Number.isFinite(ownship.lat) ||
      typeof ownship.lon !== "number" || !Number.isFinite(ownship.lon)) {
    return null;
  }
  const hdgRaw = finiteOr(ownship.hdgDeg, finiteOr(ownship.cogDeg, 0));
  const cogRaw = finiteOr(ownship.cogDeg, finiteOr(ownship.hdgDeg, 0));
  return {
    lat: ownship.lat,
    lon: ownship.lon,
    hdgDeg: normalizeDeg360(hdgRaw),
    cogDeg: normalizeDeg360(cogRaw),
    sogKn: Math.max(0, finiteOr(ownship.sogKn, 0)),
  };
}

function sanitizeEncounter(enc, fallbackRangeNm, fallbackBearingDeg, ownship) {
  const safeRange = round3(Math.max(0, finiteOr(enc?.rangeNm, fallbackRangeNm)));
  const safeBearing = roundDeg3(finiteOr(enc?.bearingDeg, fallbackBearingDeg));
  const defaultRel = ownship && typeof ownship.hdgDeg === "number" && Number.isFinite(ownship.hdgDeg)
    ? normalizeSignedDeg180(safeBearing - ownship.hdgDeg)
    : 0;
  const safeRelBearing = round3(normalizeSignedDeg180(finiteOr(enc?.relBearingDeg, defaultRel)));
  const safeRelSpeed = round3(Math.max(0, finiteOr(enc?.relSpeedKn, 0)));
  const safeCpa = round3(Math.max(0, finiteOr(enc?.cpaNm, safeRange)));
  const safeTcpa = round3(finiteOr(enc?.tcpaMin, 0));
  return {
    rangeNm: safeRange,
    bearingDeg: safeBearing,
    relBearingDeg: safeRelBearing,
    relSpeedKn: safeRelSpeed,
    cpaNm: safeCpa,
    tcpaMin: safeTcpa,
  };
}

function resolveContactBearing(contact, useRel, ownship) {
  if (!useRel) {
    return typeof contact.bearingDeg === "number" && Number.isFinite(contact.bearingDeg)
      ? normalizeDeg360(contact.bearingDeg)
      : NaN;
  }
  if (typeof contact.relBearingDeg === "number" && Number.isFinite(contact.relBearingDeg)) {
    return normalizeDeg360(contact.relBearingDeg);
  }
  if (typeof contact.bearingDeg === "number" && Number.isFinite(contact.bearingDeg)) {
    if (ownship && typeof ownship.hdgDeg === "number" && Number.isFinite(ownship.hdgDeg)) {
      return normalizeDeg360(contact.bearingDeg - ownship.hdgDeg);
    }
    return normalizeDeg360(contact.bearingDeg);
  }
  return NaN;
}

function wrapLon180(lon) {
  if (lon >= -180 && lon <= 180) return cleanZero(lon);
  return cleanZero(((((lon + 180) % 360) + 360) % 360) - 180);
}

function clampLat(lat) {
  return clamp(lat, -85, 85);
}

function extractMmsiFromContactId(contactId) {
  return typeof contactId === "string" && contactId.startsWith("tgt-")
    ? contactId.slice(4)
    : null;
}

function reconstructLatLonFromPolar(ownship, rangeNm, bearingDeg) {
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

function formatUtcTimeFromTick(simTick) {
  const raw = Number.isFinite(simTick) ? Math.trunc(simTick) : 0;
  const totalSec = ((raw % 86400) + 86400) % 86400;
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${hh}${mm}${ss}.00`;
}

function formatAngleTenthsPadded(deg) {
  const norm = normalizeDeg360(deg);
  const rounded = normalizeDeg360(Math.round(norm * 10) / 10);
  return rounded.toFixed(1).padStart(5, "0");
}

function pastPosIntervalSeconds(setting) {
  switch (setting) {
    case "30s": return 30;
    case "1m":  return 60;
    case "3m":  return 180;
    case "6m":  return 360;
    default:    return MDC2060_RADAR_SPECS.ataPastPosIntervalSec;
  }
}

export function isBearingInSector(bearingDeg, startBrgDeg, endBrgDeg) {
  if (typeof bearingDeg !== "number" || !Number.isFinite(bearingDeg) ||
      typeof startBrgDeg !== "number" || !Number.isFinite(startBrgDeg) ||
      typeof endBrgDeg !== "number" || !Number.isFinite(endBrgDeg)) {
    return false;
  }
  const b = normalizeDeg360(bearingDeg);
  const s = normalizeDeg360(startBrgDeg);
  const e = normalizeDeg360(endBrgDeg);
  if (s === e) {
    return true;
  }
  if (s < e) {
    return b >= s && b <= e;
  }
  return b >= s || b <= e;
}

export function computeBowCrossing(ownship, target) {
  if (!ownship || !target || typeof ownship !== "object" || typeof target !== "object") {
    return { bcrNm: null, bctMin: null };
  }

  let dx = null;
  let dy = null;
  if (Number.isFinite(ownship.lat) && Number.isFinite(ownship.lon) &&
      Number.isFinite(target.lat) && Number.isFinite(target.lon)) {
    const meanLatRad = ((ownship.lat + target.lat) * 0.5) * DEG_TO_RAD;
    const cosLat = Math.max(0.1, Math.cos(meanLatRad));
    dy = (target.lat - ownship.lat) * 60;
    dx = wrapLon180(target.lon - ownship.lon) * 60 * cosLat;
  } else if (Number.isFinite(target.rangeNm) && target.rangeNm >= 0 && Number.isFinite(target.bearingDeg)) {
    const rad = normalizeDeg360(target.bearingDeg) * DEG_TO_RAD;
    dx = target.rangeNm * Math.sin(rad);
    dy = target.rangeNm * Math.cos(rad);
  } else {
    return { bcrNm: null, bctMin: null };
  }

  const hdgRad = normalizeDeg360(finiteOr(ownship.hdgDeg, finiteOr(ownship.cogDeg, 0))) * DEG_TO_RAD;
  const ownCogRad = normalizeDeg360(finiteOr(ownship.cogDeg, finiteOr(ownship.hdgDeg, 0))) * DEG_TO_RAD;
  const tgtCogRad = normalizeDeg360(finiteOr(target.cogDeg, finiteOr(target.hdgDeg, 0))) * DEG_TO_RAD;
  const ownSog = Math.max(0, finiteOr(ownship.sogKn, 0));
  const tgtSog = Math.max(0, finiteOr(target.sogKn, 0));

  const ovx = ownSog * Math.sin(ownCogRad);
  const ovy = ownSog * Math.cos(ownCogRad);
  const tvx = tgtSog * Math.sin(tgtCogRad);
  const tvy = tgtSog * Math.cos(tgtCogRad);
  const rvx = tvx - ovx;
  const rvy = tvy - ovy;

  const sinH = Math.sin(hdgRad);
  const cosH = Math.cos(hdgRad);
  // Starboard normal = (cosH, -sinH), Bow unit = (sinH, cosH)
  const xPerp0 = dx * cosH - dy * sinH;
  const vPerpR = rvx * cosH - rvy * sinH;
  const yPar0 = dx * sinH + dy * cosH;
  const vParR = rvx * sinH + rvy * cosH;

  if (Math.abs(vPerpR) <= 1e-6) {
    if (Math.abs(xPerp0) < 1e-4 && yPar0 > 0 && vParR < -1e-6) {
      const tHours = -yPar0 / vParR;
      const bctMin = tHours * 60;
      if (Number.isFinite(bctMin) && bctMin > 0 && bctMin <= 999) {
        return { bcrNm: 0, bctMin: round3(bctMin) };
      }
    }
    return { bcrNm: null, bctMin: null };
  }

  const tHours = -xPerp0 / vPerpR;
  const yCross = yPar0 + tHours * vParR;
  const bctMin = tHours * 60;
  if (!Number.isFinite(tHours) || !Number.isFinite(yCross) ||
      tHours <= 0 || yCross < -1e-6 || bctMin > 999) {
    return { bcrNm: null, bctMin: null };
  }

  return {
    bcrNm: round3(Math.max(0, yCross)),
    bctMin: round3(bctMin),
  };
}

export function initialAtaState() {
  return {
    targets: [],
    selectedTargetId: null,
    alarmActive: false,
    dangerousIds: [],
    rattmSentences: [],
    lastError: null,
    lastAcquiredId: null,
  };
}

function normalizeAtaBase(ataState) {
  if (!ataState || typeof ataState !== "object") {
    return initialAtaState();
  }
  return {
    targets: Array.isArray(ataState.targets) ? ataState.targets : [],
    selectedTargetId: typeof ataState.selectedTargetId === "string" ? ataState.selectedTargetId : null,
    alarmActive: Boolean(ataState.alarmActive),
    dangerousIds: Array.isArray(ataState.dangerousIds) ? ataState.dangerousIds : [],
    rattmSentences: Array.isArray(ataState.rattmSentences) ? ataState.rattmSentences : [],
    lastError: typeof ataState.lastError === "string" ? ataState.lastError : null,
    lastAcquiredId: typeof ataState.lastAcquiredId === "string" ? ataState.lastAcquiredId : null,
  };
}

function findNextFreeAtaSlot(targets) {
  const maxCap = MDC2060_RADAR_SPECS.maxAtaTargets;
  const used = new Array(maxCap + 1).fill(false);
  for (let i = 0; i < targets.length; i++) {
    const n = targets[i]?.targetNumber;
    if (Number.isInteger(n) && n >= 1 && n <= maxCap) {
      used[n] = true;
    }
  }
  for (let slot = 1; slot <= maxCap; slot++) {
    if (!used[slot]) return slot;
  }
  return -1;
}

function findAisMatch(maritimeBus, contactId, mmsiHint) {
  const list = maritimeBus?.aisTargets;
  if (!Array.isArray(list) || list.length === 0) return null;
  const mmsi = mmsiHint ?? extractMmsiFromContactId(contactId);
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!a) continue;
    if (mmsi && String(a.mmsi) === String(mmsi)) return a;
    if (`tgt-${a.mmsi}` === contactId) return a;
  }
  return null;
}

function buildNewAtaTarget(slot, contactId, contact, tick, maritimeBus) {
  const ownship = maritimeBus?.ownship ?? null;
  const safeOwn = normalizeOwnshipForEncounter(ownship);
  const aisMatch = findAisMatch(maritimeBus, contactId, contact.mmsi);
  const rawRangeNm = Math.max(0, finiteOr(contact.rangeNm, 0));
  const rawBearingDeg = normalizeDeg360(finiteOr(contact.bearingDeg, 0));

  let lat = Number.isFinite(contact.lat) ? round6(contact.lat)
    : (Number.isFinite(aisMatch?.lat) ? round6(aisMatch.lat) : null);
  let lon = Number.isFinite(contact.lon) ? round6(contact.lon)
    : (Number.isFinite(aisMatch?.lon) ? round6(aisMatch.lon) : null);

  if ((lat === null || lon === null) && safeOwn) {
    const rec = reconstructLatLonFromPolar(safeOwn, rawRangeNm, rawBearingDeg);
    lat = rec.lat;
    lon = rec.lon;
  }

  const sogKn = round3(Math.max(0, Number.isFinite(contact.sogKn)
    ? contact.sogKn
    : finiteOr(aisMatch?.sogKn, 0)));
  const cogDeg = roundDeg3(Number.isFinite(contact.cogDeg)
    ? contact.cogDeg
    : finiteOr(aisMatch?.cogDeg, 0));

  let encounter;
  if (Number.isFinite(contact.cpaNm) && Number.isFinite(contact.tcpaMin)) {
    encounter = sanitizeEncounter({
      rangeNm: rawRangeNm,
      bearingDeg: rawBearingDeg,
      relBearingDeg: Number.isFinite(contact.relBearingDeg)
        ? normalizeSignedDeg180(contact.relBearingDeg)
        : (ownship && Number.isFinite(ownship.hdgDeg)
          ? normalizeSignedDeg180(rawBearingDeg - ownship.hdgDeg)
          : 0),
      relSpeedKn: Math.max(0, finiteOr(contact.relSpeedKn, 0)),
      cpaNm: Math.max(0, contact.cpaNm),
      tcpaMin: contact.tcpaMin,
    }, rawRangeNm, rawBearingDeg, safeOwn ?? ownship);
  } else if (safeOwn && lat !== null && lon !== null) {
    encounter = sanitizeEncounter(
      computeTargetEncounter(safeOwn, { lat, lon, sogKn, cogDeg }),
      rawRangeNm,
      rawBearingDeg,
      safeOwn
    );
  } else {
    encounter = sanitizeEncounter({
      rangeNm: rawRangeNm,
      bearingDeg: rawBearingDeg,
      relBearingDeg: ownship && Number.isFinite(ownship.hdgDeg)
        ? normalizeSignedDeg180(rawBearingDeg - ownship.hdgDeg)
        : 0,
      relSpeedKn: 0,
      cpaNm: rawRangeNm,
      tcpaMin: 0,
    }, rawRangeNm, rawBearingDeg, safeOwn ?? ownship);
  }

  const { bcrNm, bctMin } = computeBowCrossing(safeOwn ?? ownship, {
    lat,
    lon,
    rangeNm: encounter.rangeNm,
    bearingDeg: encounter.bearingDeg,
    sogKn,
    cogDeg,
  });

  const targetId = `T${String(slot).padStart(2, "0")}`;
  return {
    targetId,
    targetNumber: slot,
    contactId,
    acquisitionType: contact.acquisitionType === "A" ? "A" : "M",
    acquiredAtTick: tick,
    lastSeenTick: tick,
    trackAgeTicks: 0,
    status: "acquiring",
    rangeNm: encounter.rangeNm,
    bearingDeg: encounter.bearingDeg,
    relBearingDeg: encounter.relBearingDeg,
    cogDeg,
    sogKn,
    relSpeedKn: encounter.relSpeedKn,
    lat,
    lon,
    cpaNm: encounter.cpaNm,
    tcpaMin: encounter.tcpaMin,
    bcrNm,
    bctMin,
    dangerous: false,
    pastPositions: [
      {
        tick,
        lat,
        lon,
        rangeNm: encounter.rangeNm,
        bearingDeg: encounter.bearingDeg,
      },
    ],
  };
}

export function acquireAtaTarget(ataState, contact, simTick = 0, maritimeBus = null) {
  const base = normalizeAtaBase(ataState);
  const tick = Number.isInteger(simTick)
    ? simTick
    : (Number.isInteger(maritimeBus?.simTick) ? maritimeBus.simTick : 0);

  if (!contact || typeof contact !== "object") {
    return { ...base, lastError: "ATA_INVALID_CONTACT", lastAcquiredId: null };
  }

  const contactId = typeof contact.contactId === "string" && contact.contactId.length > 0
    ? contact.contactId
    : (typeof contact.mmsi === "string" && contact.mmsi.length > 0 ? `tgt-${contact.mmsi}` : null);

  if (!contactId || typeof contact.rangeNm !== "number" || !Number.isFinite(contact.rangeNm) ||
      contact.rangeNm < 0 || typeof contact.bearingDeg !== "number" || !Number.isFinite(contact.bearingDeg)) {
    return { ...base, lastError: "ATA_INVALID_CONTACT", lastAcquiredId: null };
  }

  const existing = base.targets.find(t => t.contactId === contactId);
  if (existing) {
    return {
      ...base,
      selectedTargetId: existing.targetId,
      lastError: "ATA_DUPLICATE_CONTACT",
      lastAcquiredId: null,
    };
  }

  const slot = findNextFreeAtaSlot(base.targets);
  if (slot < 1) {
    return { ...base, lastError: "ATA_MAX_CAPACITY", lastAcquiredId: null };
  }

  const newTarget = buildNewAtaTarget(slot, contactId, contact, tick, maritimeBus);
  const nextTargets = [...base.targets, newTarget].sort((a, b) => a.targetNumber - b.targetNumber);

  return {
    ...base,
    targets: nextTargets,
    selectedTargetId: newTarget.targetId,
    lastError: null,
    lastAcquiredId: newTarget.targetId,
  };
}

export function deleteAtaTarget(ataState, targetId) {
  const base = normalizeAtaBase(ataState);
  const idx = base.targets.findIndex(t => t.targetId === targetId);
  if (idx === -1) {
    return { ...base, lastError: "ATA_TARGET_NOT_FOUND", lastAcquiredId: null };
  }

  const removed = base.targets[idx];
  const nextTargets = base.targets
    .filter(t => t.targetId !== targetId)
    .sort((a, b) => a.targetNumber - b.targetNumber);
  const selectedTargetId = base.selectedTargetId === targetId
    ? (nextTargets[0]?.targetId ?? null)
    : base.selectedTargetId;
  const dangerousIds = nextTargets.filter(t => t.dangerous).map(t => t.targetId);
  const alarmActive = dangerousIds.length > 0;
  const removedPrefix = `$RATTM,${String(removed.targetNumber).padStart(2, "0")},`;
  const rattmSentences = base.rattmSentences.filter(s => typeof s === "string" && !s.startsWith(removedPrefix));

  return {
    targets: nextTargets,
    selectedTargetId,
    alarmActive,
    dangerousIds,
    rattmSentences,
    lastError: null,
    lastAcquiredId: null,
  };
}

export function deleteAllAtaTargets() {
  return initialAtaState();
}

export function formatRattmSentence(target, _ownship = null, simTick = 0) {
  const parsedNum = Number.isInteger(target?.targetNumber)
    ? target.targetNumber
    : (parseInt(String(target?.targetId ?? "").replace(/\D/g, ""), 10) || 1);
  const numClamped = clamp(Math.trunc(parsedNum), 0, 99);
  const targetNum = String(numClamped).padStart(2, "0");

  const distance = typeof target?.rangeNm === "number" && Number.isFinite(target.rangeNm)
    ? Math.max(0, target.rangeNm).toFixed(2)
    : "";
  const bearing = typeof target?.bearingDeg === "number" && Number.isFinite(target.bearingDeg)
    ? formatAngleTenthsPadded(target.bearingDeg)
    : "";
  const bearingRef = target?.bearingRef === "R" ? "R" : "T";
  const speed = typeof target?.sogKn === "number" && Number.isFinite(target.sogKn)
    ? Math.max(0, target.sogKn).toFixed(1)
    : "";
  const course = typeof target?.cogDeg === "number" && Number.isFinite(target.cogDeg)
    ? formatAngleTenthsPadded(target.cogDeg)
    : "";
  const courseRef = target?.courseRef === "R" ? "R" : "T";
  const cpa = typeof target?.cpaNm === "number" && Number.isFinite(target.cpaNm)
    ? Math.max(0, target.cpaNm).toFixed(2)
    : "";
  const tcpa = typeof target?.tcpaMin === "number" && Number.isFinite(target.tcpaMin)
    ? cleanZero(Math.round(target.tcpaMin * 10) / 10).toFixed(1)
    : "";
  const units = "N";
  const rawName = String(target?.name ?? target?.targetId ?? `T${targetNum}`);
  const name = rawName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Đ/g, "D")
    .replace(/đ/g, "d")
    .replace(/[^\x20-\x7E]|[,*$!^\\~]/g, "")
    .slice(0, 20);
  const status = target?.status === "tracking"
    ? "T"
    : (target?.status === "lost" ? "L" : "Q");
  const refFlag = target?.referenceTarget === true ? "R" : "";
  const utcTime = formatUtcTimeFromTick(simTick);
  const acqType = target?.acquisitionType === "A"
    ? "A"
    : (target?.acquisitionType === "R" ? "R" : "M");

  const fields = [
    targetNum,
    distance,
    bearing,
    bearingRef,
    speed,
    course,
    courseRef,
    cpa,
    tcpa,
    units,
    name,
    status,
    refFlag,
    utcTime,
    acqType,
  ];
  return formatNmeaSentence("RATTM", fields);
}

export function stepAtaTracking(ataState, maritimeBus, settings = {}, simTick) {
  const base = normalizeAtaBase(ataState);
  const tick = Number.isInteger(simTick)
    ? simTick
    : (Number.isInteger(maritimeBus?.simTick) ? maritimeBus.simTick : 0);

  if (!maritimeBus || !Array.isArray(maritimeBus.radarContacts)) {
    return { ...base, lastError: null };
  }

  const cpaLimitNm = finiteOr(settings?.ataCpaLimitNm, 0.5);
  const tcpaLimitMin = finiteOr(settings?.ataTcpaLimitMin, 15);
  const pastInterval = pastPosIntervalSeconds(settings?.ataPastPos);
  const stabilizeTicks = MDC2060_RADAR_SPECS.ataStabilizeTicks;
  const maxPast = MDC2060_RADAR_SPECS.ataMaxPastPositions;
  const ownship = maritimeBus.ownship ?? null;
  const safeOwn = normalizeOwnshipForEncounter(ownship);

  const contactsById = new Map();
  for (let i = 0; i < maritimeBus.radarContacts.length; i++) {
    const c = maritimeBus.radarContacts[i];
    if (c && typeof c.contactId === "string" && c.contactId.length > 0) {
      contactsById.set(c.contactId, c);
    }
  }

  let updatedTargets = base.targets.map(target => {
    const contact = contactsById.get(target.contactId);
    if (!contact || typeof contact.rangeNm !== "number" || !Number.isFinite(contact.rangeNm) ||
        contact.rangeNm < 0 || contact.rangeNm > 64 ||
        typeof contact.bearingDeg !== "number" || !Number.isFinite(contact.bearingDeg)) {
      return {
        ...target,
        status: "lost",
        dangerous: false,
      };
    }

    const aisMatch = findAisMatch(maritimeBus, target.contactId, contact.mmsi);
    const trackAgeTicks = Math.max(target.trackAgeTicks, Math.max(0, tick - target.acquiredAtTick));
    const status = trackAgeTicks >= stabilizeTicks ? "tracking" : "acquiring";

    let lat = Number.isFinite(contact.lat) ? round6(contact.lat)
      : (Number.isFinite(aisMatch?.lat) ? round6(aisMatch.lat) : null);
    let lon = Number.isFinite(contact.lon) ? round6(contact.lon)
      : (Number.isFinite(aisMatch?.lon) ? round6(aisMatch.lon) : null);

    if ((lat === null || lon === null) && safeOwn) {
      const rec = reconstructLatLonFromPolar(safeOwn, contact.rangeNm, contact.bearingDeg);
      lat = rec.lat;
      lon = rec.lon;
    }

    let sogKn;
    let cogDeg;
    if (Number.isFinite(contact.sogKn) && Number.isFinite(contact.cogDeg)) {
      sogKn = round3(Math.max(0, contact.sogKn));
      cogDeg = roundDeg3(contact.cogDeg);
    } else if (Number.isFinite(aisMatch?.sogKn) && Number.isFinite(aisMatch?.cogDeg)) {
      sogKn = round3(Math.max(0, aisMatch.sogKn));
      cogDeg = roundDeg3(aisMatch.cogDeg);
    } else if (lat !== null && lon !== null && target.lat !== null && target.lon !== null &&
               tick > target.lastSeenTick) {
      const dtHours = (tick - target.lastSeenTick) / 3600;
      const meanLatRad = ((target.lat + lat) * 0.5) * DEG_TO_RAD;
      const cosLat = Math.max(0.1, Math.cos(meanLatRad));
      const ddy = (lat - target.lat) * 60;
      const ddx = wrapLon180(lon - target.lon) * 60 * cosLat;
      const distNm = Math.hypot(ddx, ddy);
      sogKn = round3(distNm / dtHours);
      cogDeg = distNm > 1e-6
        ? roundDeg3(Math.atan2(ddx, ddy) * RAD_TO_DEG)
        : roundDeg3(finiteOr(target.cogDeg, 0));
    } else {
      sogKn = round3(Math.max(0, finiteOr(target.sogKn, 0)));
      cogDeg = roundDeg3(finiteOr(target.cogDeg, 0));
    }

    let encounter;
    if (Number.isFinite(contact.cpaNm) && Number.isFinite(contact.tcpaMin)) {
      encounter = sanitizeEncounter({
        rangeNm: contact.rangeNm,
        bearingDeg: contact.bearingDeg,
        relBearingDeg: Number.isFinite(contact.relBearingDeg)
          ? normalizeSignedDeg180(contact.relBearingDeg)
          : (ownship && Number.isFinite(ownship.hdgDeg)
            ? normalizeSignedDeg180(contact.bearingDeg - ownship.hdgDeg)
            : 0),
        relSpeedKn: Math.max(0, finiteOr(contact.relSpeedKn, 0)),
        cpaNm: Math.max(0, contact.cpaNm),
        tcpaMin: contact.tcpaMin,
      }, contact.rangeNm, contact.bearingDeg, safeOwn ?? ownship);
    } else if (safeOwn && lat !== null && lon !== null) {
      encounter = sanitizeEncounter(
        computeTargetEncounter(safeOwn, { lat, lon, sogKn, cogDeg }),
        contact.rangeNm,
        contact.bearingDeg,
        safeOwn
      );
    } else {
      encounter = sanitizeEncounter({
        rangeNm: contact.rangeNm,
        bearingDeg: contact.bearingDeg,
        relBearingDeg: finiteOr(target.relBearingDeg, 0),
        relSpeedKn: Math.max(0, finiteOr(target.relSpeedKn, 0)),
        cpaNm: contact.rangeNm,
        tcpaMin: 0,
      }, contact.rangeNm, contact.bearingDeg, safeOwn ?? ownship);
    }

    const { bcrNm, bctMin } = computeBowCrossing(safeOwn ?? ownship, {
      lat,
      lon,
      rangeNm: encounter.rangeNm,
      bearingDeg: encounter.bearingDeg,
      sogKn,
      cogDeg,
    });

    const dangerous = status === "tracking" &&
      Number.isFinite(encounter.cpaNm) &&
      Number.isFinite(encounter.tcpaMin) &&
      encounter.cpaNm <= cpaLimitNm &&
      encounter.tcpaMin > 0 &&
      encounter.tcpaMin <= tcpaLimitMin;

    const prevPast = Array.isArray(target.pastPositions) ? target.pastPositions : [];
    const lastPast = prevPast.length > 0 ? prevPast[prevPast.length - 1] : null;
    let nextPast = prevPast;
    if (!lastPast || (tick - lastPast.tick) >= pastInterval) {
      nextPast = [
        ...prevPast,
        {
          tick,
          lat,
          lon,
          rangeNm: encounter.rangeNm,
          bearingDeg: encounter.bearingDeg,
        },
      ];
      if (nextPast.length > maxPast) {
        nextPast = nextPast.slice(nextPast.length - maxPast);
      }
    }

    return {
      targetId: target.targetId,
      targetNumber: target.targetNumber,
      contactId: target.contactId,
      acquisitionType: target.acquisitionType,
      acquiredAtTick: target.acquiredAtTick,
      lastSeenTick: tick,
      trackAgeTicks,
      status,
      rangeNm: encounter.rangeNm,
      bearingDeg: encounter.bearingDeg,
      relBearingDeg: encounter.relBearingDeg,
      cogDeg,
      sogKn,
      relSpeedKn: encounter.relSpeedKn,
      lat,
      lon,
      cpaNm: encounter.cpaNm,
      tcpaMin: encounter.tcpaMin,
      bcrNm,
      bctMin,
      dangerous,
      pastPositions: nextPast,
    };
  });

  // Auto Detect Area acquisition
  let lastAcquiredId = base.lastAcquiredId;
  if (settings?.ataAutoArea === "ON" && settings?.ataBoardOption !== false) {
    const area = settings.autoDetectArea ?? {
      innerNm: finiteOr(settings?.alarmInnerNm, 1.0),
      outerNm: finiteOr(settings?.alarmOuterNm, 3.0),
      startBrgDeg: finiteOr(settings?.alarmStartBrgDeg, 330),
      endBrgDeg: finiteOr(settings?.alarmEndBrgDeg, 30),
      bearingRef: "T",
    };
    const rawInner = Math.max(0, finiteOr(area.innerNm, 1.0));
    const rawOuter = Math.max(0.1, finiteOr(area.outerNm, 3.0));
    const innerNm = Math.min(rawInner, Math.max(0, rawOuter - 0.05));
    const outerNm = Math.max(rawOuter, innerNm + 0.05);
    const startBrg = roundDeg3(finiteOr(area.startBrgDeg, 330));
    const endBrg = roundDeg3(finiteOr(area.endBrgDeg, 30));
    const useRel = area.bearingRef === "R";

    const trackedIds = new Set(updatedTargets.map(t => t.contactId));
    for (let i = 0; i < maritimeBus.radarContacts.length; i++) {
      if (updatedTargets.length >= MDC2060_RADAR_SPECS.maxAtaTargets) break;
      const c = maritimeBus.radarContacts[i];
      if (!c || typeof c.contactId !== "string" || c.contactId.length === 0 || trackedIds.has(c.contactId)) continue;
      if (typeof c.rangeNm !== "number" || !Number.isFinite(c.rangeNm) || c.rangeNm < 0) continue;
      if (typeof c.bearingDeg !== "number" || !Number.isFinite(c.bearingDeg)) continue;
      if (c.rangeNm < innerNm || c.rangeNm > outerNm) continue;
      const brg = resolveContactBearing(c, useRel, ownship);
      if (!Number.isFinite(brg)) continue;
      if (!isBearingInSector(brg, startBrg, endBrg)) continue;

      const slot = findNextFreeAtaSlot(updatedTargets);
      if (slot < 1) break;
      const autoTarget = buildNewAtaTarget(
        slot,
        c.contactId,
        { ...c, acquisitionType: "A" },
        tick,
        maritimeBus
      );
      updatedTargets.push(autoTarget);
      trackedIds.add(c.contactId);
      lastAcquiredId = autoTarget.targetId;
    }
  }

  updatedTargets.sort((a, b) => a.targetNumber - b.targetNumber);

  const selectedStillPresent = base.selectedTargetId !== null &&
    updatedTargets.some(t => t.targetId === base.selectedTargetId);
  const selectedTargetId = selectedStillPresent
    ? base.selectedTargetId
    : (updatedTargets[0]?.targetId ?? null);

  const dangerousIds = updatedTargets.filter(t => t.dangerous).map(t => t.targetId);
  const alarmActive = dangerousIds.length > 0;
  const rattmSentences = updatedTargets
    .filter(t => t.status === "tracking" || t.status === "lost")
    .map(t => formatRattmSentence(t, ownship, tick));

  return {
    targets: updatedTargets,
    selectedTargetId,
    alarmActive,
    dangerousIds,
    rattmSentences,
    lastError: null,
    lastAcquiredId,
  };
}

export function projectAisTargets(maritimeBus, settings = {}, selectedAisMmsi = null) {
  const maxCap = MDC2060_RADAR_SPECS.maxAisTargets;
  const boardInstalled = settings?.aisBoardOption !== false;
  const displayOn = settings?.aisDisplay !== "OFF";
  const filterRangeNm = clamp(finiteOr(settings?.aisFilterRangeNm, 12), 0.25, 64);
  const cpaLimitNm = finiteOr(settings?.ataCpaLimitNm, 0.5);
  const tcpaLimitMin = finiteOr(settings?.ataTcpaLimitMin, 15);
  const activeRangeNm = Math.min(filterRangeNm, Math.max(0.25, finiteOr(settings?.aisActiveRangeNm, 6)));
  const selectedStr = selectedAisMmsi !== null && selectedAisMmsi !== undefined
    ? String(selectedAisMmsi)
    : null;
  const rawList = Array.isArray(maritimeBus?.aisTargets) ? maritimeBus.aisTargets : null;

  if (!boardInstalled || !displayOn || !rawList) {
    return {
      enabled: boardInstalled && displayOn,
      boardInstalled,
      totalInBus: rawList ? rawList.length : 0,
      filterRangeNm: round3(filterRangeNm),
      targets: [],
      selectedTarget: null,
      dangerousMmsis: [],
      alarmActive: false,
    };
  }

  const ownship = maritimeBus.ownship ?? null;
  const rotByMmsi = settings?.rotByMmsi && typeof settings.rotByMmsi === "object"
    ? settings.rotByMmsi
    : null;

  const filtered = [];
  for (let i = 0; i < rawList.length; i++) {
    const t = rawList[i];
    if (!t || typeof t.rangeNm !== "number" || !Number.isFinite(t.rangeNm)) continue;
    if (t.rangeNm >= 0 && t.rangeNm <= filterRangeNm) {
      filtered.push(t);
    }
  }

  filtered.sort((a, b) => {
    if (a.rangeNm !== b.rangeNm) return a.rangeNm - b.rangeNm;
    const ma = String(a.mmsi ?? "");
    const mb = String(b.mmsi ?? "");
    return ma < mb ? -1 : (ma > mb ? 1 : 0);
  });

  const capped = filtered.length > maxCap ? filtered.slice(0, maxCap) : filtered;
  const targets = capped.map(t => {
    const mmsi = String(t.mmsi ?? "");
    const cpaNm = round3(Math.max(0, finiteOr(t.cpaNm, finiteOr(t.rangeNm, 0))));
    const tcpaMin = round3(finiteOr(t.tcpaMin, 0));
    const rangeNm = round3(Math.max(0, finiteOr(t.rangeNm, 0)));
    const dangerous = Number.isFinite(t.cpaNm) && Number.isFinite(t.tcpaMin) &&
      cpaNm <= cpaLimitNm && tcpaMin > 0 && tcpaMin <= tcpaLimitMin;
    const selected = selectedStr !== null && mmsi === selectedStr;
    const status = dangerous ? "dangerous" : (selected || rangeNm <= activeRangeNm ? "active" : "sleeping");
    const { bcrNm, bctMin } = computeBowCrossing(ownship, t);
    const rotFallback = rotByMmsi && Object.hasOwn(rotByMmsi, mmsi) ? finiteOr(rotByMmsi[mmsi], 0) : 0;

    return {
      mmsi,
      name: String(t.name ?? "UNKNOWN"),
      callSign: String(t.callSign ?? ""),
      navStatus: cleanZero(Math.trunc(finiteOr(t.navStatus, 0))),
      shipType: cleanZero(Math.trunc(finiteOr(t.shipType, 0))),
      lat: Number.isFinite(t.lat) ? round6(t.lat) : null,
      lon: Number.isFinite(t.lon) ? round6(t.lon) : null,
      sogKn: round3(Math.max(0, finiteOr(t.sogKn, 0))),
      cogDeg: roundDeg3(finiteOr(t.cogDeg, 0)),
      hdgDeg: roundDeg3(finiteOr(t.hdgDeg, finiteOr(t.cogDeg, 0))),
      rotDegPerMin: round3(finiteOr(t.rotDegPerMin, rotFallback)),
      lengthM: round3(Math.max(0, finiteOr(t.lengthM, 0))),
      beamM: round3(Math.max(0, finiteOr(t.beamM, 0))),
      rangeNm,
      bearingDeg: roundDeg3(finiteOr(t.bearingDeg, 0)),
      relBearingDeg: round3(normalizeSignedDeg180(finiteOr(t.relBearingDeg, 0))),
      relSpeedKn: round3(Math.max(0, finiteOr(t.relSpeedKn, 0))),
      cpaNm,
      tcpaMin,
      bcrNm,
      bctMin,
      status,
      dangerous,
      selected,
    };
  });

  const selectedTarget = targets.find(t => t.selected) ?? null;
  const dangerousMmsis = targets.filter(t => t.dangerous).map(t => t.mmsi).sort();
  const alarmActive = settings?.aisCpaAlarm !== "OFF" && dangerousMmsis.length > 0;

  return {
    enabled: true,
    boardInstalled: true,
    totalInBus: rawList.length,
    filterRangeNm: round3(filterRangeNm),
    targets,
    selectedTarget,
    dangerousMmsis,
    alarmActive,
  };
}

export function initialGuardZoneState() {
  return {
    mode: "OFF",
    innerNm: 1.0,
    outerNm: 3.0,
    startBrgDeg: 330,
    endBrgDeg: 30,
    level: "MID",
    insideContactIds: [],
    capturedContactIds: [],
    triggeredContactIds: [],
    alarmActive: false,
    acknowledged: false,
    audible: false,
  };
}

function normalizeGuardBase(guardState) {
  if (!guardState || typeof guardState !== "object") {
    return initialGuardZoneState();
  }
  const mode = guardState.mode === "IN" || guardState.mode === "OUT" ? guardState.mode : "OFF";
  const level = guardState.level === "LOW" || guardState.level === "HIGH" ? guardState.level : "MID";
  return {
    mode,
    innerNm: finiteOr(guardState.innerNm, 1.0),
    outerNm: finiteOr(guardState.outerNm, 3.0),
    startBrgDeg: roundDeg3(finiteOr(guardState.startBrgDeg, 330)),
    endBrgDeg: roundDeg3(finiteOr(guardState.endBrgDeg, 30)),
    level,
    insideContactIds: Array.isArray(guardState.insideContactIds) ? sortedUniqueStrings(guardState.insideContactIds) : [],
    capturedContactIds: Array.isArray(guardState.capturedContactIds) ? sortedUniqueStrings(guardState.capturedContactIds) : [],
    triggeredContactIds: Array.isArray(guardState.triggeredContactIds) ? sortedUniqueStrings(guardState.triggeredContactIds) : [],
    alarmActive: Boolean(guardState.alarmActive),
    acknowledged: Boolean(guardState.acknowledged),
    audible: Boolean(guardState.audible),
  };
}

function sortedUniqueStrings(items) {
  const seen = Object.create(null);
  const out = [];
  for (let i = 0; i < items.length; i++) {
    const s = items[i];
    if (typeof s === "string" && s.length > 0 && !seen[s]) {
      seen[s] = true;
      out.push(s);
    }
  }
  out.sort();
  return out;
}

export function evaluateGuardZone(guardState, maritimeBus, settings = {}) {
  const base = normalizeGuardBase(guardState);
  const rawMode = settings?.alarmMode !== undefined ? settings.alarmMode : base.mode;
  const mode = rawMode === "IN" || rawMode === "OUT" ? rawMode : "OFF";

  const rawInner = Math.max(0, finiteOr(settings?.alarmInnerNm, base.innerNm));
  const rawOuter = Math.max(0.1, finiteOr(settings?.alarmOuterNm, base.outerNm));
  const innerNm = round3(Math.min(rawInner, Math.max(0, rawOuter - 0.05)));
  const outerNm = round3(Math.max(rawOuter, innerNm + 0.05));

  const rawStart = finiteOr(settings?.alarmStartBrgDeg, base.startBrgDeg);
  const rawEnd = finiteOr(settings?.alarmEndBrgDeg, base.endBrgDeg);
  const startBrgDeg = roundDeg3(rawStart);
  const endBrgDeg = roundDeg3(rawEnd);

  const rawLevel = settings?.alarmLevel !== undefined ? settings.alarmLevel : base.level;
  const level = rawLevel === "LOW" || rawLevel === "HIGH" || rawLevel === "MID"
    ? rawLevel
    : base.level;

  if (mode === "OFF") {
    return {
      mode: "OFF",
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

  if (!maritimeBus || !Array.isArray(maritimeBus.radarContacts)) {
    const modeChanged = mode !== base.mode;
    return {
      mode,
      innerNm,
      outerNm,
      startBrgDeg,
      endBrgDeg,
      level,
      insideContactIds: modeChanged ? [] : sortedUniqueStrings(base.insideContactIds),
      capturedContactIds: modeChanged ? [] : sortedUniqueStrings(base.capturedContactIds),
      triggeredContactIds: modeChanged ? [] : sortedUniqueStrings(base.triggeredContactIds),
      alarmActive: modeChanged ? false : base.alarmActive,
      acknowledged: modeChanged ? false : base.acknowledged,
      audible: modeChanged ? false : base.audible,
    };
  }

  const minRcs = level === "LOW" ? 0 : (level === "HIGH" ? 100 : 10);
  const useRel = settings?.guardZoneBearingRef === "R";
  const ownship = maritimeBus.ownship ?? null;

  const rawInside = [];
  for (let i = 0; i < maritimeBus.radarContacts.length; i++) {
    const c = maritimeBus.radarContacts[i];
    if (!c || typeof c.contactId !== "string" || c.contactId.length === 0 ||
        typeof c.rangeNm !== "number" || !Number.isFinite(c.rangeNm) || c.rangeNm < 0) {
      continue;
    }
    if (c.rangeNm < innerNm || c.rangeNm > outerNm) continue;
    const brg = resolveContactBearing(c, useRel, ownship);
    if (!Number.isFinite(brg)) continue;
    if (!isBearingInSector(brg, startBrgDeg, endBrgDeg)) continue;
    const rcs = typeof c.rcsSqm === "number" && Number.isFinite(c.rcsSqm) ? c.rcsSqm : 100;
    if (rcs < minRcs) continue;
    rawInside.push(c.contactId);
  }
  const insideContactIds = sortedUniqueStrings(rawInside);

  let capturedContactIds;
  let triggeredContactIds;
  let alarmActive;
  let acknowledged;
  let audible;

  if (mode === "IN") {
    capturedContactIds = [...insideContactIds];
    triggeredContactIds = [...insideContactIds];
    alarmActive = triggeredContactIds.length > 0;
    const hasNewTrigger = base.mode !== "IN" ||
      triggeredContactIds.some(id => !base.triggeredContactIds.includes(id));
    acknowledged = alarmActive ? (hasNewTrigger ? false : Boolean(base.acknowledged)) : false;
    audible = alarmActive && !acknowledged;
  } else {
    // mode === "OUT"
    if (base.mode !== "OUT") {
      capturedContactIds = [...insideContactIds];
      triggeredContactIds = [];
      alarmActive = false;
      acknowledged = false;
      audible = false;
    } else {
      const prevCaptured = sortedUniqueStrings(base.capturedContactIds);
      capturedContactIds = sortedUniqueStrings([...prevCaptured, ...insideContactIds]);
      triggeredContactIds = prevCaptured
        .filter(id => !insideContactIds.includes(id));
      alarmActive = triggeredContactIds.length > 0;
      const hasNewTrigger = triggeredContactIds.some(id => !base.triggeredContactIds.includes(id));
      acknowledged = alarmActive ? (hasNewTrigger ? false : Boolean(base.acknowledged)) : false;
      audible = alarmActive && !acknowledged;
    }
  }

  return {
    mode,
    innerNm,
    outerNm,
    startBrgDeg,
    endBrgDeg,
    level,
    insideContactIds,
    capturedContactIds,
    triggeredContactIds,
    alarmActive,
    acknowledged,
    audible,
  };
}
