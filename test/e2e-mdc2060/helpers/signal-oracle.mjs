import assert from "node:assert/strict";
import {TRAINING_SCENARIO} from "../../../src/core/scenario.mjs";

export const EXPECTED_MDC2060_RANGES = Object.freeze([
  Object.freeze({nm: 0.0625, ringNm: 0.03125, rings: 2, defaultPw: "S1"}),
  Object.freeze({nm: 0.125, ringNm: 0.0625, rings: 2, defaultPw: "S1"}),
  Object.freeze({nm: 0.25, ringNm: 0.125, rings: 2, defaultPw: "S1"}),
  Object.freeze({nm: 0.5, ringNm: 0.25, rings: 2, defaultPw: "S1"}),
  Object.freeze({nm: 0.75, ringNm: 0.25, rings: 3, defaultPw: "S2"}),
  Object.freeze({nm: 1, ringNm: 0.25, rings: 4, defaultPw: "S2"}),
  Object.freeze({nm: 1.5, ringNm: 0.5, rings: 3, defaultPw: "M1"}),
  Object.freeze({nm: 2, ringNm: 0.5, rings: 4, defaultPw: "M1"}),
  Object.freeze({nm: 3, ringNm: 0.75, rings: 4, defaultPw: "M1"}),
  Object.freeze({nm: 4, ringNm: 1, rings: 4, defaultPw: "M2"}),
  Object.freeze({nm: 6, ringNm: 1.5, rings: 4, defaultPw: "M2"}),
  Object.freeze({nm: 8, ringNm: 2, rings: 4, defaultPw: "M2"}),
  Object.freeze({nm: 12, ringNm: 3, rings: 4, defaultPw: "L"}),
  Object.freeze({nm: 16, ringNm: 4, rings: 4, defaultPw: "L"}),
  Object.freeze({nm: 24, ringNm: 6, rings: 4, defaultPw: "L"}),
  Object.freeze({nm: 32, ringNm: 8, rings: 4, defaultPw: "L"}),
  Object.freeze({nm: 48, ringNm: 12, rings: 4, defaultPw: "L"}),
  Object.freeze({nm: 64, ringNm: 16, rings: 4, defaultPw: "L"}),
]);

export function binForRange(rangeNm, activeRangeNm, numBins = 160) {
  if (!Number.isFinite(rangeNm) || !Number.isFinite(activeRangeNm) || activeRangeNm <= 0) return 0;
  return Math.max(0, Math.min(numBins - 1, Math.floor((rangeNm / activeRangeNm) * numBins)));
}

export function sectorEnergy(grid, azStart, azEnd, binStart, binEnd, numBins = 160) {
  const b0 = Math.max(0, Math.floor(binStart));
  const b1 = Math.min(numBins - 1, Math.floor(binEnd));
  let sum = 0;
  let peak = 0;
  let countAbove1 = 0;
  let countNonZero = 0;
  let cells = 0;
  for (let a = Math.floor(azStart); a <= Math.floor(azEnd); a++) {
    const az = ((a % 360) + 360) % 360;
    const base = az * numBins;
    for (let b = b0; b <= b1; b++) {
      const v = grid[base + b];
      sum += v;
      if (v > peak) peak = v;
      if (v > 0) countNonZero++;
      if (v >= 2) countAbove1++;
      cells++;
    }
  }
  return {
    sum,
    peak,
    countAbove1,
    countNonZero,
    cells,
    mean: cells > 0 ? sum / cells : 0,
  };
}

export function meanGridEnergy(grid) {
  if (!grid || grid.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < grid.length; i++) sum += grid[i];
  return sum / grid.length;
}

export function countAbove(grid, threshold = 0) {
  let count = 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] > threshold) count++;
  }
  return count;
}

export function radialSpanAtAzimuth(grid, azDeg, binStart = 0, binEnd = 159, threshold = 1, numBins = 160) {
  const az = ((Math.round(azDeg) % 360) + 360) % 360;
  const base = az * numBins;
  let count = 0;
  let minBin = -1;
  let maxBin = -1;
  for (let b = Math.max(0, binStart); b <= Math.min(numBins - 1, binEnd); b++) {
    if (grid[base + b] >= threshold) {
      count++;
      if (minBin === -1) minBin = b;
      maxBin = b;
    }
  }
  return {count, span: minBin === -1 ? 0 : (maxBin - minBin + 1), minBin, maxBin};
}

/**
 * Normalizes polar grid parameters by supplying BOTH flat keys and nested settings/fixtures
 * so tests remain strictly opaque-box regardless of flat vs nested param destructuring.
 */
export function normalizePolarParams(scenario, maritimeBus, overrides = {}) {
  const rangeNm = overrides.rangeNm ?? 6;
  const gain = overrides.gain ?? 60;
  const stc = overrides.stc ?? 0;
  const stcCurve = overrides.stcCurve ?? 4;
  const ftc = overrides.ftc ?? 0;
  const ir = overrides.ir ?? "OFF";
  const exp = overrides.exp ?? false;
  const pw = overrides.pw ?? "M2";
  const process = overrides.process ?? "OFF";
  const subGain = overrides.subGain ?? 0;
  const interferenceSource = Boolean(overrides.interferenceSource ?? false);
  const seaStateOverride = overrides.seaStateOverride ?? null;
  const rainIntensityOverride = overrides.rainIntensityOverride ?? null;
  const simTick = overrides.simTick ?? maritimeBus?.simTick ?? 0;

  const settings = {
    rangeNm,
    gain,
    stc,
    stcCurve,
    ftc,
    ir,
    exp,
    pw,
    process,
    subGain,
    ...(overrides.settings ?? {}),
  };
  const fixtures = {
    interferenceSource,
    ...(overrides.fixtures ?? {}),
  };

  return {
    scenario,
    maritimeBus,
    simTick,
    rangeNm,
    gain,
    stc,
    stcCurve,
    ftc,
    ir,
    exp,
    pw,
    process,
    subGain,
    interferenceSource,
    seaStateOverride,
    rainIntensityOverride,
    settings,
    fixtures,
    ...overrides,
  };
}

/**
 * Runs evaluatePolarEchoGrid and strictly enforces the 360x160 8-level Uint8Array contract.
 */
export function evalGridStrict(evaluatePolarEchoGrid, scenario, maritimeBus, overrides = {}, options = {}) {
  const {requireNonZero: overrideNonZero, ...gridOverrides} = overrides ?? {};
  const requireNonZero = Boolean(options?.requireNonZero ?? overrideNonZero ?? false);
  const params = normalizePolarParams(scenario, maritimeBus, gridOverrides);
  const res = evaluatePolarEchoGrid(params);
  assert.ok(res && typeof res === "object", "evaluatePolarEchoGrid must return an object");
  assert.equal(res.numAzimuths, 360, "numAzimuths must be 360");
  assert.equal(res.numRangeBins, 160, "numRangeBins must be 160");
  assert.equal(res.rangeNm, params.rangeNm, `res.rangeNm (${res.rangeNm}) must match requested rangeNm (${params.rangeNm})`);
  assert.ok(res.grid instanceof Uint8Array, "grid must be Uint8Array");
  assert.equal(res.grid.length, 360 * 160, "grid length must be 57600");
  assert.ok(res.shadowMask instanceof Uint8Array, "shadowMask must be Uint8Array");
  assert.equal(res.shadowMask.length, 360 * 160, "shadowMask length must be 57600");
  assert.ok(
    res.stats && typeof res.stats === "object" && !Array.isArray(res.stats),
    "evaluatePolarEchoGrid must return a non-null stats object",
  );
  const statEntries = Object.entries(res.stats);
  assert.ok(statEntries.length > 0, "evaluatePolarEchoGrid res.stats must not be empty");
  let numericStatCount = 0;
  for (const [k, val] of statEntries) {
    if (typeof val === "number") {
      assert.ok(Number.isFinite(val), `evaluatePolarEchoGrid res.stats.${k} must be finite, got ${val}`);
      numericStatCount++;
    }
  }
  assert.ok(numericStatCount >= 1, "evaluatePolarEchoGrid res.stats must contain finite numeric stat fields");

  let nonZeroCount = 0;
  for (let i = 0; i < res.grid.length; i++) {
    const v = res.grid[i];
    if (!Number.isInteger(v) || v < 0 || v > 7) {
      assert.fail(`grid[${i}] out of 8-level bounds 0..7: ${v}`);
    }
    if (v > 0) nonZeroCount++;
  }
  if (requireNonZero) {
    assert.ok(nonZeroCount > 0, "evaluatePolarEchoGrid grid must contain non-zero echoes (requireNonZero=true)");
  }
  return res;
}

export function extractAtaState(result) {
  if (!result || typeof result !== "object") return result;
  if (result.ataState && typeof result.ataState === "object") return result.ataState;
  if (result.state && typeof result.state === "object" && Array.isArray(result.state.targets)) return result.state;
  return result;
}

export function extractAtaTargets(result) {
  if (Array.isArray(result)) return result;
  if (!result || typeof result !== "object") return [];
  if (Array.isArray(result.targets)) return result.targets;
  if (Array.isArray(result.ataState?.targets)) return result.ataState.targets;
  if (Array.isArray(result.state?.targets)) return result.state.targets;
  if (Array.isArray(result.tracks)) return result.tracks;
  return [];
}

export function extractAisTargets(result) {
  if (Array.isArray(result)) return result;
  if (!result || typeof result !== "object") return [];
  if (Array.isArray(result.targets)) return result.targets;
  if (Array.isArray(result.aisTargets)) return result.aisTargets;
  if (Array.isArray(result.projectedTargets)) return result.projectedTargets;
  return [];
}

export function extractAisResult(result) {
  const targets = extractAisTargets(result);
  const selectedTarget = result && !Array.isArray(result)
    ? (result.selectedTarget ?? result.selected ?? result.detail ?? null)
    : null;
  const alarmActive = result && !Array.isArray(result)
    ? Boolean(result.alarmActive ?? result.cpaAlarmActive ?? result.alarm ?? targets.some(t => t?.status === "dangerous" || t?.dangerous === true))
    : false;
  return {targets, selectedTarget, alarmActive, raw: result};
}

export function extractGuardZoneStatus(result) {
  if (!result || typeof result !== "object") {
    return {mode: "OFF", triggered: false, intruders: [], insideIds: [], capturedIds: [], state: result, raw: result};
  }
  const inner = result.guardState ?? result.state ?? result;
  const mode = String(
    result.mode ??
    result.alarmMode ??
    inner?.mode ??
    inner?.alarmMode ??
    "OFF",
  ).toUpperCase();
  const intruders =
    Array.isArray(result.triggeredContactIds) ? result.triggeredContactIds
    : Array.isArray(result.intruders) ? result.intruders
    : Array.isArray(result.triggeredContacts) ? result.triggeredContacts
    : Array.isArray(result.triggeredIds) ? result.triggeredIds
    : Array.isArray(inner?.triggeredContactIds) ? inner.triggeredContactIds
    : Array.isArray(inner?.intruders) ? inner.intruders
    : Array.isArray(inner?.triggeredContacts) ? inner.triggeredContacts
    : Array.isArray(inner?.triggeredIds) ? inner.triggeredIds
    : [];
  const insideIds =
    Array.isArray(result.insideContactIds) ? result.insideContactIds
    : Array.isArray(result.insideIds) ? result.insideIds
    : Array.isArray(inner?.insideContactIds) ? inner.insideContactIds
    : Array.isArray(inner?.insideIds) ? inner.insideIds
    : Array.isArray(result.capturedContactIds) ? result.capturedContactIds
    : Array.isArray(inner?.capturedContactIds) ? inner.capturedContactIds
    : Array.isArray(inner?.capturedIds) ? inner.capturedIds
    : [];
  const capturedIds =
    Array.isArray(result.capturedContactIds) ? result.capturedContactIds
    : Array.isArray(result.capturedIds) ? result.capturedIds
    : Array.isArray(inner?.capturedContactIds) ? inner.capturedContactIds
    : Array.isArray(inner?.capturedIds) ? inner.capturedIds
    : insideIds;
  const triggered = Boolean(
    result.triggered ??
    result.alarmActive ??
    result.alarm ??
    inner?.triggered ??
    inner?.alarmActive ??
    false,
  );
  return {mode, triggered, intruders, insideIds, capturedIds, state: inner, raw: result};
}

function toOnOffChoice(val, defaultOn = false) {
  if (val === undefined || val === null) return defaultOn ? "ON" : "OFF";
  if (typeof val === "boolean") return val ? "ON" : "OFF";
  if (typeof val === "number") return val !== 0 ? "ON" : "OFF";
  const norm = String(val).trim().toUpperCase();
  if (norm === "OFF" || norm === "FALSE" || norm === "0" || norm === "NO") return "OFF";
  if (norm === "ON" || norm === "TRUE" || norm === "1" || norm === "YES") return "ON";
  return defaultOn ? "ON" : "OFF";
}

/**
 * Normalizes ATA settings with BOTH short aliases and spec.mjs canonical ata* keys.
 */
export function normalizeAtaSettings(overrides = {}) {
  const cpaLimitNm = overrides.ataCpaLimitNm ?? overrides.cpaLimitNm ?? 0.5;
  const tcpaLimitMin = overrides.ataTcpaLimitMin ?? overrides.tcpaLimitMin ?? 15;
  const vectorTimeMin = overrides.ataVectorTimeMin ?? overrides.vectorTimeMin ?? 6;
  const vectorMode = overrides.vectorMode ?? "T";
  const pastPos = overrides.ataPastPos ?? overrides.pastPos ?? "30s";
  const ataAutoArea = toOnOffChoice(overrides.ataAutoArea ?? overrides.autoArea ?? overrides.autoAreaEnabled, false);
  const ataBoardOption = overrides.ataBoardOption !== undefined ? Boolean(overrides.ataBoardOption) : true;
  const autoDetectArea = overrides.autoDetectArea ?? (
    overrides.innerNm !== undefined || overrides.outerNm !== undefined ||
    overrides.alarmInnerNm !== undefined || overrides.alarmOuterNm !== undefined
      ? {
          innerNm: overrides.alarmInnerNm ?? overrides.innerNm ?? 1.0,
          outerNm: overrides.alarmOuterNm ?? overrides.outerNm ?? 3.0,
          startBrgDeg: overrides.alarmStartBrgDeg ?? overrides.startBrgDeg ?? 330,
          endBrgDeg: overrides.alarmEndBrgDeg ?? overrides.endBrgDeg ?? 30,
          bearingRef: overrides.bearingRef ?? "T",
        }
      : undefined
  );
  return {
    ...overrides,
    ataCpaLimitNm: cpaLimitNm,
    cpaLimitNm,
    ataTcpaLimitMin: tcpaLimitMin,
    tcpaLimitMin,
    ataVectorTimeMin: vectorTimeMin,
    vectorTimeMin,
    vectorMode,
    ataPastPos: pastPos,
    pastPos,
    ataAutoArea,
    autoArea: ataAutoArea,
    autoAreaEnabled: ataAutoArea === "ON",
    ataBoardOption,
    ...(autoDetectArea ? {autoDetectArea} : {}),
  };
}

/**
 * Normalizes AIS settings with BOTH short aliases and spec.mjs canonical ais* / ata* keys.
 */
export function normalizeAisSettings(overrides = {}) {
  const aisDisplay = toOnOffChoice(overrides.aisDisplay ?? overrides.display, true);
  const aisCpaAlarm = toOnOffChoice(overrides.aisCpaAlarm ?? overrides.cpaAlarm, true);
  const aisFilterRangeNm = overrides.aisFilterRangeNm ?? overrides.filterRangeNm ?? 12;
  const cpaLimitNm = overrides.ataCpaLimitNm ?? overrides.cpaLimitNm ?? 0.5;
  const tcpaLimitMin = overrides.ataTcpaLimitMin ?? overrides.tcpaLimitMin ?? 15;
  const aisBoardOption = overrides.aisBoardOption !== undefined ? Boolean(overrides.aisBoardOption) : true;
  return {
    ...overrides,
    aisDisplay,
    display: aisDisplay === "ON",
    aisCpaAlarm,
    cpaAlarm: aisCpaAlarm === "ON",
    aisFilterRangeNm,
    filterRangeNm: aisFilterRangeNm,
    ataCpaLimitNm: cpaLimitNm,
    cpaLimitNm,
    ataTcpaLimitMin: tcpaLimitMin,
    tcpaLimitMin,
    aisBoardOption,
  };
}

/**
 * Normalizes Guard Zone settings with BOTH short aliases and spec.mjs canonical alarm* keys.
 * Intentionally preserves unnormalized bearings (-30/390) and degenerate ranges (inner>=outer)
 * so boundary tests exercise evaluateGuardZone's own validation/normalization logic.
 */
export function normalizeGuardZoneSettings(overrides = {}) {
  const mode = String(overrides.alarmMode ?? overrides.guardZoneMode ?? overrides.mode ?? "OFF").trim().toUpperCase();
  const innerNm = overrides.alarmInnerNm ?? overrides.guardZoneInnerNm ?? overrides.innerNm ?? 1.0;
  const outerNm = overrides.alarmOuterNm ?? overrides.guardZoneOuterNm ?? overrides.outerNm ?? 3.0;
  const startBrgDeg = overrides.alarmStartBrgDeg ?? overrides.guardZoneStartBrgDeg ?? overrides.startBrgDeg ?? 330;
  const endBrgDeg = overrides.alarmEndBrgDeg ?? overrides.guardZoneEndBrgDeg ?? overrides.endBrgDeg ?? 30;
  const level = String(overrides.alarmLevel ?? overrides.guardZoneLevel ?? overrides.level ?? "MID").trim().toUpperCase();
  return {
    ...overrides,
    alarmMode: mode,
    guardZoneMode: mode,
    mode,
    alarmInnerNm: innerNm,
    guardZoneInnerNm: innerNm,
    innerNm,
    alarmOuterNm: outerNm,
    guardZoneOuterNm: outerNm,
    outerNm,
    alarmStartBrgDeg: startBrgDeg,
    guardZoneStartBrgDeg: startBrgDeg,
    startBrgDeg,
    alarmEndBrgDeg: endBrgDeg,
    guardZoneEndBrgDeg: endBrgDeg,
    endBrgDeg,
    alarmLevel: level,
    guardZoneLevel: level,
    level,
  };
}

export function offsetLatLon(originLat, originLon, bearingDeg, rangeNm) {
  const rad = (bearingDeg * Math.PI) / 180;
  const dNorthNm = rangeNm * Math.cos(rad);
  const dEastNm = rangeNm * Math.sin(rad);
  const lat = originLat + dNorthNm / 60;
  const cosLat = Math.max(0.1, Math.cos((originLat * Math.PI) / 180));
  const lon = originLon + dEastNm / (60 * cosLat);
  return {
    lat: Math.round(lat * 1e6) / 1e6,
    lon: Math.round(lon * 1e6) / 1e6,
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }
  return Object.freeze(value);
}

/**
 * Builds a complete, deeply frozen synthetic scenario compatible with
 * initialMaritimeWorldState, observeTrainingStatus, and evaluatePolarEchoGrid.
 */
export function buildSyntheticSingleTargetScenario({
  id = "mdc2060-e2e-synthetic-single",
  seed = 4242,
  ownshipLat = 10.5,
  ownshipLon = 106.75,
  ownshipHdgDeg = 0,
  ownshipSogKn = 0,
  targetAzDeg = 90,
  targetRangeNm = 3.0,
  rcsSqm = 1500,
  targetSogKn = 0,
  targetCogDeg = 180,
  includePrimaryTarget = true,
  extraTargets = [],
  seaState = 0,
  windDirDeg = 90,
  rainSqualls = [],
  landmasses = [],
  buoys = [],
} = {}) {
  const traffic = [];
  if (includePrimaryTarget) {
    const pos = offsetLatLon(ownshipLat, ownshipLon, targetAzDeg, targetRangeNm);
    traffic.push({
      mmsi: "574900001",
      name: "SYNTHETIC TARGET 01",
      callSign: "3WSY1",
      navStatus: 0,
      shipType: 70,
      lat: pos.lat,
      lon: pos.lon,
      sogKn: targetSogKn,
      cogDeg: targetCogDeg,
      hdgDeg: targetCogDeg,
      rotDegPerMin: 0,
      lengthM: 120,
      beamM: 20,
      rcsSqm,
    });
  }
  for (let i = 0; i < extraTargets.length; i++) {
    const t = extraTargets[i];
    const pos = t.lat !== undefined && t.lon !== undefined
      ? {lat: t.lat, lon: t.lon}
      : offsetLatLon(ownshipLat, ownshipLon, t.azDeg ?? 180, t.rangeNm ?? 3.0);
    traffic.push({
      mmsi: String(t.mmsi ?? (574900010 + i)),
      name: String(t.name ?? `SYNTHETIC EXTRA ${i + 1}`),
      callSign: String(t.callSign ?? `3WX${i}`),
      navStatus: t.navStatus ?? 0,
      shipType: t.shipType ?? 70,
      lat: pos.lat,
      lon: pos.lon,
      sogKn: t.sogKn ?? 0,
      cogDeg: t.cogDeg ?? 0,
      hdgDeg: t.hdgDeg ?? t.cogDeg ?? 0,
      rotDegPerMin: t.rotDegPerMin ?? 0,
      lengthM: t.lengthM ?? 100,
      beamM: t.beamM ?? 18,
      rcsSqm: t.rcsSqm ?? 1000,
    });
  }

  return deepFreeze({
    id,
    version: 1,
    label: "Synthetic E2E Radar Scenario",
    seed,
    syntheticOwnship: TRAINING_SCENARIO.syntheticOwnship,
    bottomClassification: TRAINING_SCENARIO.bottomClassification,
    bottomDepthM: TRAINING_SCENARIO.bottomDepthM,
    bottomVariationM: TRAINING_SCENARIO.bottomVariationM,
    fish: [],
    ownship: {
      mmsi: "574001588",
      name: "MV E2E OWNSHIP",
      callSign: "3WE2E",
      lat: ownshipLat,
      lon: ownshipLon,
      sogKn: ownshipSogKn,
      stwKn: ownshipSogKn,
      cogDeg: ownshipHdgDeg,
      hdgDeg: ownshipHdgDeg,
      rotDegPerMin: 0,
      rudderDeg: 0,
      waterTempC: 24,
      draftM: 4.0,
    },
    traffic,
    landmasses,
    buoys,
    weather: {
      seaState,
      windDirDeg,
      rainSqualls,
    },
  });
}

/**
 * Adapts a synthetic rectangular island spanning az [40..50] deg, r [1.4..2.1] NM
 * to whatever polygon vertex schema M1 uses in MDC2060_COASTAL_SCENARIO.landmasses.
 */
export function buildAdaptedIslandLandmass(templateLandmass, ownshipLat = 10.5, ownshipLon = 106.75) {
  const cornersPolar = [
    {az: 40, r: 1.4},
    {az: 50, r: 1.4},
    {az: 50, r: 2.1},
    {az: 40, r: 2.1},
  ];
  const latLonPts = cornersPolar.map(c => offsetLatLon(ownshipLat, ownshipLon, c.az, c.r));
  const nmPts = cornersPolar.map(c => {
    const rad = (c.az * Math.PI) / 180;
    return {
      xNm: Math.round(c.r * Math.sin(rad) * 1e4) / 1e4,
      yNm: Math.round(c.r * Math.cos(rad) * 1e4) / 1e4,
      eastNm: Math.round(c.r * Math.sin(rad) * 1e4) / 1e4,
      northNm: Math.round(c.r * Math.cos(rad) * 1e4) / 1e4,
    };
  });

  if (templateLandmass && typeof templateLandmass === "object") {
    const polyKey = ["polygon", "points", "vertices", "coords", "coordinates"].find(
      k => Array.isArray(templateLandmass[k]) && templateLandmass[k].length >= 3,
    );
    if (polyKey) {
      const sample = templateLandmass[polyKey][0];
      let adaptedPts;
      if (Array.isArray(sample)) {
        // Distinguish [lat, lon] vs [lon, lat] using ownship (~10.5, ~106.75)
        const firstIsLat = Math.abs(sample[0] - ownshipLat) < Math.abs(sample[0] - ownshipLon);
        adaptedPts = latLonPts.map(p => (firstIsLat ? [p.lat, p.lon] : [p.lon, p.lat]));
      } else if (sample && typeof sample === "object") {
        if ("lat" in sample && "lon" in sample) {
          adaptedPts = latLonPts.map(p => ({lat: p.lat, lon: p.lon}));
        } else if ("xNm" in sample && "yNm" in sample) {
          adaptedPts = nmPts.map(p => ({xNm: p.xNm, yNm: p.yNm}));
        } else if ("eastNm" in sample && "northNm" in sample) {
          adaptedPts = nmPts.map(p => ({eastNm: p.eastNm, northNm: p.northNm}));
        } else if ("x" in sample && "y" in sample) {
          adaptedPts = nmPts.map(p => ({x: p.xNm, y: p.yNm}));
        } else {
          adaptedPts = latLonPts;
        }
      } else {
        adaptedPts = latLonPts;
      }
      return deepFreeze({
        id: "island-e2e-shadow",
        name: "E2E Shadow Island",
        elevationM: templateLandmass.elevationM ?? 45,
        [polyKey]: adaptedPts,
      });
    }
  }

  return deepFreeze({
    id: "island-e2e-shadow",
    name: "E2E Shadow Island",
    elevationM: 45,
    polygon: latLonPts,
    points: latLonPts,
  });
}

export function buildSyntheticIslandShadowScenario(templateLandmass = null) {
  const ownshipLat = 10.5;
  const ownshipLon = 106.75;
  const island = buildAdaptedIslandLandmass(templateLandmass, ownshipLat, ownshipLon);
  return buildSyntheticSingleTargetScenario({
    id: "mdc2060-e2e-island-shadow",
    seed: 9090,
    ownshipLat,
    ownshipLon,
    includePrimaryTarget: false,
    extraTargets: [
      {mmsi: "574901001", name: "OCCLUDED TWIN", azDeg: 45, rangeNm: 3.0, rcsSqm: 1200},
      {mmsi: "574901002", name: "OPEN WATER TWIN", azDeg: 135, rangeNm: 3.0, rcsSqm: 1200},
    ],
    landmasses: [island],
    seaState: 0,
  });
}

export function buildSyntheticMaritimeBus({
  simTick = 0,
  ownship = null,
  radarContacts = [],
  aisTargets = [],
  depthM = 28.5,
  sentences = [],
} = {}) {
  const own = ownship ?? {
    mmsi: "574001588",
    name: "MV BIEN DONG 01",
    callSign: "3WBD1",
    lat: 10.5,
    lon: 106.75,
    sogKn: 10.0,
    stwKn: 9.8,
    cogDeg: 90.0,
    hdgDeg: 90.0,
    rotDegPerMin: 0,
    waterTempC: 24,
    draftM: 4.2,
  };
  return deepFreeze({
    contractVersion: "nmea0183-bridge-bus-v1",
    scenarioId: "e2e-synthetic-bus",
    simTick,
    ownship: own,
    depthM,
    depthBelowTransducerM: Math.max(0, depthM - 4.2),
    sentences,
    radarContacts,
    aisTargets,
    busFingerprint: "f0-fnv1a32-00000000",
  });
}
