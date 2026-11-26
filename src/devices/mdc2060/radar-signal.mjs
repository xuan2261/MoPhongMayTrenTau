/**
 * KODEN MDC-2060 Marine Radar — Deterministic Polar Echo Grid Engine (360 x 160).
 *
 * Synthetic classroom training radar model (NOT RF propagation physics,
 * NOT OEM calibration, and NOT fit for shipboard navigation).
 *
 * Pure deterministic computation using streamSeed / noise01 from src/core/scenario.mjs.
 * Zero Math.random(), zero Date.now()/performance.now(), zero import.meta, zero DOM.
 */
import { streamSeed, noise01 } from "../../core/scenario.mjs";

export const MDC2060_NOISE_STREAM = "sensor:mdc2060:radar-v1";
export const POLAR_NUM_AZIMUTHS = 360;
export const POLAR_NUM_RANGE_BINS = 160;

const TOTAL_BINS = POLAR_NUM_AZIMUTHS * POLAR_NUM_RANGE_BINS;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const INV_TWO_LEAD_SQ = 1 / (2 * 0.28 * 0.28);
const QUANT_SLOPE = 7 / 0.91; // maps [0.09, 1.00) -> 1..7

// Precomputed 360-azimuth unit ray table (+X East = sin, +Y North = cos)
const SIN_AZ = new Float64Array(POLAR_NUM_AZIMUTHS);
const COS_AZ = new Float64Array(POLAR_NUM_AZIMUTHS);
for (let az = 0; az < POLAR_NUM_AZIMUTHS; az++) {
  const rad = az * DEG_TO_RAD;
  SIN_AZ[az] = Math.sin(rad);
  COS_AZ[az] = Math.cos(rad);
}

const SEA_CUTOFF = 0.015;
const IS_LITTLE_ENDIAN = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;

// Precomputed 256-entry rain cloud envelope LUT (+1 zero guard): exp(-1.8 * (d^2)^1.2)
const RAIN_LUT_MAX_D2 = 1.82;
const RAIN_LUT_SCALE = 255 / RAIN_LUT_MAX_D2;
const RAIN_LUT_SQRT_MAX = Math.sqrt(RAIN_LUT_MAX_D2);
const RAIN_LUT = new Float32Array(257);
for (let i = 0; i < 256; i++) {
  const d2 = (i / 255) * RAIN_LUT_MAX_D2;
  RAIN_LUT[i] = Math.exp(-1.8 * Math.pow(d2, 1.2));
}
RAIN_LUT[256] = 0;

// Precomputed 512-byte azimuthal correlation PROCESS LUTs for levels 1..3
// (1 = AVG1, 2 = AVG2, 3 = PEAK). Never smears isolated 1-azimuth speckles
// into empty water; progressively suppresses isolated speckles while
// preserving coherent target/shoreline peaks (especially under PEAK).
const PROCESS_META_LUTS = [null];
for (let pl = 1; pl <= 3; pl++) {
  const metaLut = new Int32Array(512);
  const isoScale = pl === 1 ? 0.65 : (pl === 2 ? 0.40 : 0.25);
  const isoBias = pl === 1 ? 1.50 : (pl === 2 ? 1.30 : 1.00);
  const wSide = pl === 1 ? 0.15 : (pl === 2 ? 0.20 : 0.22);
  const wCenter = 1 - 2 * wSide;
  const cohBoost = pl === 1 ? 1.04 : (pl === 2 ? 1.08 : 1.10);
  const bridgeScale = pl === 1 ? 0.25 : (pl === 2 ? 0.35 : 0.45);
  for (let p = 0; p < 8; p++) {
    for (let c = 0; c < 8; c++) {
      for (let n = 0; n < 8; n++) {
        let out = 0;
        if (c === 0) {
          // Bridge a 1-degree dropout ONLY when both flanks carry coherent echo
          if (p >= 2 && n >= 2) {
            out = Math.min(7, Math.round(bridgeScale * (p + n)));
          }
        } else if (p === 0 && n === 0) {
          // Isolated 1-azimuth speckle: progressively attenuate count & energy
          const raw = c * isoScale - isoBias;
          out = raw < 0.5 ? 0 : Math.min(7, Math.round(raw));
        } else if (p >= 2 || n >= 2) {
          // Coherent target/shoreline return
          let v = wSide * p + wCenter * c + wSide * n;
          if (p >= 2 && n >= 2) {
            v *= cohBoost;
          }
          const rounded = v < 0.5 ? 0 : Math.min(7, Math.round(v));
          out = pl === 3 ? Math.max(c, rounded) : rounded;
        } else {
          // Weak 1-level neighbor wing (max(p, n) === 1)
          const v = wSide * p + wCenter * c + wSide * n;
          out = v < 0.5 ? 0 : Math.min(7, Math.round(v));
        }
        const idx = (p << 6) | (c << 3) | n;
        metaLut[idx] = out | (out > 0 ? 0x1000 : 0);
      }
    }
  }
  PROCESS_META_LUTS.push(metaLut);
}

const PW_TABLE = Object.freeze({
  S1: Object.freeze({ pulseNm: 0.010, minBins: 0.55, gainBoost: 0.94 }),
  S2: Object.freeze({ pulseNm: 0.022, minBins: 0.72, gainBoost: 0.98 }),
  M1: Object.freeze({ pulseNm: 0.045, minBins: 0.95, gainBoost: 1.00 }),
  M2: Object.freeze({ pulseNm: 0.085, minBins: 1.25, gainBoost: 1.05 }),
  L:  Object.freeze({ pulseNm: 0.160, minBins: 1.65, gainBoost: 1.14 }),
});

const EXP_TABLE = Object.freeze([
  Object.freeze({ azMult: 1.0, rMult: 1.0, gainMult: 1.0 }),
  Object.freeze({ azMult: 1.6, rMult: 1.65, gainMult: 1.08 }),
  Object.freeze({ azMult: 2.1, rMult: 2.15, gainMult: 1.14 }),
]);

// Pure deterministic memoized noise tables keyed by streamSeed (bounded max 8).
// Size 4096 + 160 wrap-around suffix fits comfortably inside L1D cache so each
// azimuth starts at an independent hashed offset in [0, 4095] and streams
// sequentially along range bins with zero wrap checks or cache thrashing.
const NOISE_TABLE_SIZE = 4096;
const NOISE_TABLE_MASK = NOISE_TABLE_SIZE - 1;
const NOISE_TABLE_PADDED = NOISE_TABLE_SIZE + POLAR_NUM_RANGE_BINS;
const NOISE_TABLE_CACHE = new Map();

function getNoiseTables(baseSeed) {
  let entry = NOISE_TABLE_CACHE.get(baseSeed);
  if (entry) return entry;
  const seaRaw = new Float32Array(NOISE_TABLE_SIZE);
  const seaCoh = new Float32Array(NOISE_TABLE_PADDED);
  const thermal = new Float32Array(NOISE_TABLE_PADDED);
  const seaSeed = (baseSeed ^ 0x2468ace0) | 0;
  const thSeed = (baseSeed ^ 0x48bf1357) | 0;
  for (let i = 0; i < NOISE_TABLE_SIZE; i++) {
    seaRaw[i] = noise01(seaSeed, i, 17);
    const u = noise01(thSeed, i, 53);
    thermal[i] = u * u * 1.45;
  }
  for (let i = 0; i < NOISE_TABLE_SIZE; i++) {
    const prev = seaRaw[i];
    const next = seaRaw[(i + 1) & NOISE_TABLE_MASK];
    seaCoh[i] = 0.45 + 0.55 * (0.55 * prev + 0.45 * next);
  }
  seaCoh.copyWithin(NOISE_TABLE_SIZE, 0, POLAR_NUM_RANGE_BINS);
  thermal.copyWithin(NOISE_TABLE_SIZE, 0, POLAR_NUM_RANGE_BINS);

  entry = { seaCoh, thermal };
  if (NOISE_TABLE_CACHE.size >= 8) {
    const oldest = NOISE_TABLE_CACHE.keys().next().value;
    NOISE_TABLE_CACHE.delete(oldest);
  }
  NOISE_TABLE_CACHE.set(baseSeed, entry);
  return entry;
}

// Synchronous module-level scratch buffers (never returned to caller).
// ifBuf is cleared sparsely inside Stage 5 (starts and ends 100% all-zero);
// ifBufDirty guarantees full recovery if a prior call threw before Stage 5.
const ifBuf = new Float32Array(TOTAL_BINS);
let ifBufDirty = false;
const procScratch = new Uint8Array(TOTAL_BINS);
const procScratch32 = new Uint32Array(procScratch.buffer);
let procScratchDirty = false;
const firstLandBin = new Uint8Array(POLAR_NUM_AZIMUTHS);
const landExitBin = new Uint8Array(POLAR_NUM_AZIMUTHS);
const rowMinBin = new Uint8Array(POLAR_NUM_AZIMUTHS);
const rowMaxBin = new Uint8Array(POLAR_NUM_AZIMUTHS);
const rowMaxGridBin = new Uint8Array(POLAR_NUM_AZIMUTHS);
const rowHasRain = new Uint8Array(POLAR_NUM_AZIMUTHS);
const rowRainMinBin = new Uint8Array(POLAR_NUM_AZIMUTHS);
const rowSeaEndBin = new Uint8Array(POLAR_NUM_AZIMUTHS);
const rowSeaAmp = new Float64Array(POLAR_NUM_AZIMUTHS);
const rainTexRow = new Float32Array(POLAR_NUM_RANGE_BINS);
const thermalAmpBuf = new Float32Array(NOISE_TABLE_PADDED);
const thermalGapBuf = new Float32Array(NOISE_TABLE_PADDED);
const thermalLvlBuf = new Uint8Array(NOISE_TABLE_PADDED);
const thermalLvlRows = new Array(NOISE_TABLE_SIZE >>> 3);
for (let k = 0; k < thermalLvlRows.length; k++) {
  thermalLvlRows[k] = thermalLvlBuf.subarray(k << 3, (k << 3) + POLAR_NUM_RANGE_BINS);
}
const thermalEnergyPrefix = new Int32Array(NOISE_TABLE_PADDED + 1);
const thermalNonZeroPrefix = new Int32Array(NOISE_TABLE_PADDED + 1);
const quantAccTmp = new Int32Array(4);
let cachedThermalTbl = null;
let cachedThermalAmp = -1;
let cachedThermalMax = 0;
const seaDecayLut = new Float64Array(POLAR_NUM_RANGE_BINS);
const stcLut = new Float64Array(POLAR_NUM_RANGE_BINS);
const stcRainLut = new Float64Array(POLAR_NUM_RANGE_BINS);
const seaDecayGainLut = new Float64Array(POLAR_NUM_RANGE_BINS);
const stcGainLut = new Float64Array(POLAR_NUM_RANGE_BINS);
const seaDecayGainHalfLut = new Float64Array(POLAR_NUM_RANGE_BINS);
const stcGainHalfLut = new Float64Array(POLAR_NUM_RANGE_BINS);
const rangeLut = new Float64Array(POLAR_NUM_RANGE_BINS);
const landDecayLut = new Float32Array(POLAR_NUM_RANGE_BINS);
const targetWRLut = new Float32Array(POLAR_NUM_RANGE_BINS);
let hitsTmp = new Float64Array(64);

// Pure scalar-keyed memoization state for 160-bin Math.exp() LUTs
let cachedLutRangeNm = -1;
let cachedLutStcAmp = -1;
let cachedLutInvRStc = -1;
let cachedLutSeaAmpBase = -1;
let cachedLutInvRSea = -1;
let cachedLutGainScale = -1;
let cachedLutMaxSeaBin = 0;
let lutRevision = 0;

const EMPTY_LANDMASSES = Object.freeze([]);

// Pure memoization state for deeply-frozen landmass pass (never caches mutable/getter objects)
let cachedLandRef = null;
let cachedLandOwnLat = NaN;
let cachedLandOwnLon = NaN;
let cachedLandRangeNm = -1;
let cachedLandSeed = 0;
let cachedLandStcAmp = -1;
let cachedLandInvRStc = -1;
let cachedLandHasIf = false;
let cachedLandPolys = null;
let cachedLandBins = 0;
let cachedShadowedBins = 0;
let cachedLandVersion = 0;
let nextLandVersion = 0;
const cachedFirstLandBin = new Uint8Array(POLAR_NUM_AZIMUTHS);
const cachedLandExitBin = new Uint8Array(POLAR_NUM_AZIMUTHS);
const cachedShadowMask = new Uint8Array(TOTAL_BINS);
const cachedLandIfPacked = new Float32Array(TOTAL_BINS);
const cachedLandIfViews = new Array(POLAR_NUM_AZIMUTHS);
const cachedLandRunAz = new Uint16Array(POLAR_NUM_AZIMUTHS);
const cachedLandRunStart = new Uint8Array(POLAR_NUM_AZIMUTHS);
const cachedLandRunEnd = new Uint8Array(POLAR_NUM_AZIMUTHS);
let cachedLandRunCount = 0;

// Pure memoization state for sea-clutter row preparation
let cachedSeaAmpBase = -1;
let cachedSeaMaxBin = -1;
let cachedSeaWindDirRad = NaN;
let cachedSeaLutRev = -1;
let cachedSeaLandVer = -1;
const cachedRowSeaEndBin = new Uint8Array(POLAR_NUM_AZIMUTHS);
const cachedRowSeaAmp = new Float64Array(POLAR_NUM_AZIMUTHS);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function finiteOr(v, fallback) {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function normalizeDeg360(deg) {
  const mod = deg % 360;
  return mod < 0 ? mod + 360 : (Object.is(mod, -0) ? 0 : mod);
}

function wrapLon180(lon) {
  if (lon >= -180 && lon <= 180) return lon;
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

function defaultPwForRange(rangeNm) {
  if (rangeNm <= 0.5) return "S1";
  if (rangeNm <= 1) return "S2";
  if (rangeNm <= 3) return "M1";
  if (rangeNm <= 8) return "M2";
  return "L";
}

function normalizePw(pw, rangeNm) {
  if (typeof pw === "string") {
    const upper = pw.trim().toUpperCase();
    if (upper !== "AUTO" && Object.hasOwn(PW_TABLE, upper)) {
      return upper;
    }
  }
  return defaultPwForRange(rangeNm);
}

function normalizeIr(ir) {
  if (ir === 1 || ir === "1") return 1;
  if (ir === 2 || ir === "2") return 2;
  if (ir === 3 || ir === "3") return 3;
  return 0;
}

function normalizeExpLevel(exp) {
  if (exp === 2 || exp === "2") return 2;
  if (exp === 1 || exp === "1" || exp === true) return 1;
  if (typeof exp === "string") {
    const upper = exp.trim().toUpperCase();
    if (upper === "2") return 2;
    if (upper === "1" || upper === "ON") return 1;
  }
  return 0;
}

function normalizeProcessLevel(proc) {
  if (proc === 1) return 1;
  if (proc === 2) return 2;
  if (proc === 3) return 3;
  if (typeof proc === "string") {
    const upper = proc.trim().toUpperCase();
    if (upper === "1" || upper === "2ND" || upper === "AVG1") return 1;
    if (upper === "2" || upper === "3RD" || upper === "AVG2") return 2;
    if (upper === "3" || upper === "SCAN" || upper === "PEAK") return 3;
  }
  return 0;
}

function projectPolygons(ownship, landmasses) {
  if (!ownship || typeof ownship !== "object" || !Array.isArray(landmasses) || landmasses.length === 0) {
    return [];
  }
  const ownLat = finiteOr(ownship.lat, 10.5);
  const ownLon = finiteOr(ownship.lon, 106.75);
  const projected = [];

  for (let i = 0; i < landmasses.length; i++) {
    const lm = landmasses[i];
    if (!lm || typeof lm !== "object") continue;
    const rawVerts = lm.polygon ?? lm.points ?? lm.vertices;
    if (!Array.isArray(rawVerts) || rawVerts.length < 3) continue;

    const n = rawVerts.length;
    const xs = new Float64Array(n);
    const ys = new Float64Array(n);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let valid = true;

    for (let j = 0; j < n; j++) {
      const pt = rawVerts[j];
      const vLat = Array.isArray(pt) ? pt[0] : pt?.lat;
      const vLon = Array.isArray(pt) ? pt[1] : pt?.lon;
      if (!Number.isFinite(vLat) || !Number.isFinite(vLon)) {
        valid = false;
        break;
      }
      const meanLatRad = ((ownLat + vLat) * 0.5) * DEG_TO_RAD;
      const cosLat = Math.max(0.1, Math.cos(meanLatRad));
      const y = (vLat - ownLat) * 60;
      const x = wrapLon180(vLon - ownLon) * 60 * cosLat;
      xs[j] = x;
      ys[j] = y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    if (!valid) continue;
    const cx = clamp(0, minX, maxX);
    const cy = clamp(0, minY, maxY);
    const minDist = Math.hypot(cx, cy);
    const lmProto = Object.getPrototypeOf(lm);
    const rawRefl = (lmProto === Object.prototype || lmProto === null)
      ? (Object.hasOwn(lm, "reflectivity") ? lm.reflectivity : 0.96)
      : lm.reflectivity;
    const refl = clamp(finiteOr(rawRefl, 0.96), 0.6, 1.0);
    projected.push({ xs, ys, n, minDist, refl });
  }

  return projected;
}

function rayPolygonHits(dx, dy, poly) {
  const { xs, ys, n } = poly;
  let count = 0;

  let x1 = xs[n - 1];
  let y1 = ys[n - 1];
  let s1 = dx * y1 - dy * x1;

  for (let i = 0; i < n; i++) {
    const x2 = xs[i];
    const y2 = ys[i];
    const s2 = dx * y2 - dy * x2;

    if ((s1 >= 0 && s2 < 0) || (s2 >= 0 && s1 < 0)) {
      const u = s1 / (s1 - s2);
      const ix = x1 + u * (x2 - x1);
      const iy = y1 + u * (y2 - y1);
      const t = ix * dx + iy * dy;
      if (t >= 0) {
        if (count + 1 >= hitsTmp.length) {
          const grown = new Float64Array(hitsTmp.length * 2);
          grown.set(hitsTmp);
          hitsTmp = grown;
        }
        hitsTmp[count++] = t;
      }
    }

    x1 = x2;
    y1 = y2;
    s1 = s2;
  }

  if (count === 2) {
    if (hitsTmp[0] > hitsTmp[1]) {
      const tmp = hitsTmp[0];
      hitsTmp[0] = hitsTmp[1];
      hitsTmp[1] = tmp;
    }
  } else if (count > 2) {
    for (let i = 1; i < count; i++) {
      const val = hitsTmp[i];
      let j = i - 1;
      while (j >= 0 && hitsTmp[j] > val) {
        hitsTmp[j + 1] = hitsTmp[j];
        j--;
      }
      hitsTmp[j + 1] = val;
    }
  }

  if ((count & 1) === 1) {
    if (count + 1 >= hitsTmp.length) {
      const grown = new Float64Array(hitsTmp.length * 2);
      grown.set(hitsTmp);
      hitsTmp = grown;
    }
    for (let i = count; i > 0; i--) {
      hitsTmp[i] = hitsTmp[i - 1];
    }
    hitsTmp[0] = 0;
    count++;
  }

  return count;
}

function isOccludedPreprojected(dx, dy, targetRangeNm, polys) {
  for (let p = 0; p < polys.length; p++) {
    const poly = polys[p];
    if (poly.minDist >= targetRangeNm) continue;
    const count = rayPolygonHits(dx, dy, poly);
    for (let k = 0; k + 1 < count; k += 2) {
      const a = hitsTmp[k];
      const b = hitsTmp[k + 1];
      if (b - a <= 1e-6) continue;
      if (a < targetRangeNm - 1e-5 && b > 1e-5) {
        return true;
      }
    }
  }
  return false;
}

export function isPointOccludedByLand(ownship, targetAzDeg, targetRangeNm, landmasses) {
  if (!ownship || typeof ownship !== "object" || !Array.isArray(landmasses) || landmasses.length === 0 ||
      typeof targetAzDeg !== "number" || !Number.isFinite(targetAzDeg) ||
      typeof targetRangeNm !== "number" || !Number.isFinite(targetRangeNm) ||
      targetRangeNm <= 1e-4) {
    return false;
  }
  const rad = normalizeDeg360(targetAzDeg) * DEG_TO_RAD;
  const dx = Math.sin(rad);
  const dy = Math.cos(rad);
  const polys = projectPolygons(ownship, landmasses);
  if (polys.length === 0) return false;
  return isOccludedPreprojected(dx, dy, targetRangeNm, polys);
}

function buildSyntheticUpwindSquall(ownLat, ownLon, windDirDeg, intensity, driftKn) {
  const windRad = normalizeDeg360(windDirDeg) * DEG_TO_RAD;
  const distNm = 3.0;
  const dyNm = distNm * Math.cos(windRad);
  const dxNm = distNm * Math.sin(windRad);
  const lat = clamp(ownLat + dyNm / 60, -85, 85);
  const cosLat = Math.max(0.1, Math.cos(((ownLat + lat) * 0.5) * DEG_TO_RAD));
  const lon = wrapLon180(ownLon + dxNm / (60 * cosLat));
  return {
    id: "squall-synthetic-upwind",
    lat,
    lon,
    radiusNm: 1.3,
    aspectRatio: 1.25,
    intensity,
    driftKn,
    driftDirDeg: normalizeDeg360(windDirDeg + 180),
  };
}

function hasOnlyOwnDataProps(obj) {
  const keys = Object.getOwnPropertyNames(obj);
  for (let i = 0; i < keys.length; i++) {
    const desc = Object.getOwnPropertyDescriptor(obj, keys[i]);
    if (!desc || !Object.hasOwn(desc, "value") || desc.configurable || desc.writable) return false;
  }
  return true;
}

function isPlainFrozenDataObj(obj) {
  const proto = Object.getPrototypeOf(obj);
  if (proto !== Object.prototype && proto !== null) return false;
  return hasOnlyOwnDataProps(obj);
}

function isDeeplyFrozenLandmasses(lm) {
  if (!Array.isArray(lm) || !Object.isFrozen(lm)) return false;
  if (Object.getPrototypeOf(lm) !== Array.prototype || !hasOnlyOwnDataProps(lm)) return false;
  for (let i = 0; i < lm.length; i++) {
    const d = Object.getOwnPropertyDescriptor(lm, i);
    if (!d || !Object.hasOwn(d, "value") || d.configurable || d.writable) return false;
    const item = d.value;
    if (!item || typeof item !== "object" || !Object.isFrozen(item) || !isPlainFrozenDataObj(item)) {
      return false;
    }
    const polyDesc = Object.getOwnPropertyDescriptor(item, "polygon");
    if (!polyDesc || !Object.hasOwn(polyDesc, "value") || polyDesc.configurable || polyDesc.writable) {
      return false;
    }
    const rawVerts = polyDesc.value;
    if (!Array.isArray(rawVerts) || rawVerts.length < 3 || !Object.isFrozen(rawVerts) ||
        Object.getPrototypeOf(rawVerts) !== Array.prototype || !hasOnlyOwnDataProps(rawVerts)) {
      return false;
    }
    for (let j = 0; j < rawVerts.length; j++) {
      const vd = Object.getOwnPropertyDescriptor(rawVerts, j);
      if (!vd || !Object.hasOwn(vd, "value") || vd.configurable || vd.writable) return false;
      const pt = vd.value;
      if (!pt || typeof pt !== "object" || !Object.isFrozen(pt)) return false;
      if (Array.isArray(pt)) {
        if (Object.getPrototypeOf(pt) !== Array.prototype || !hasOnlyOwnDataProps(pt)) return false;
        const d0 = Object.getOwnPropertyDescriptor(pt, 0);
        const d1 = Object.getOwnPropertyDescriptor(pt, 1);
        if (!d0 || !Object.hasOwn(d0, "value") || d0.configurable || d0.writable ||
            !d1 || !Object.hasOwn(d1, "value") || d1.configurable || d1.writable) {
          return false;
        }
      } else {
        if (!isPlainFrozenDataObj(pt)) return false;
        const dLat = Object.getOwnPropertyDescriptor(pt, "lat");
        const dLon = Object.getOwnPropertyDescriptor(pt, "lon");
        if (!dLat || !Object.hasOwn(dLat, "value") || dLat.configurable || dLat.writable ||
            !dLon || !Object.hasOwn(dLon, "value") || dLon.configurable || dLon.writable) {
          return false;
        }
      }
    }
  }
  return true;
}

function snapshotCachedLand(
  landmasses, ownLatVal, ownLonVal, rangeNm, landSeed, stcAmp, invRStc,
  polys, shadowMask, landBins, shadowedBins, writeIf, ver
) {
  cachedFirstLandBin.set(firstLandBin);
  cachedLandExitBin.set(landExitBin);
  if (shadowedBins > 0) {
    cachedShadowMask.set(shadowMask);
  }
  let runCount = 0;
  if (writeIf && polys.length > 0) {
    let packedCursor = 0;
    for (let az = 0; az < POLAR_NUM_AZIMUTHS; az++) {
      const eb = rowMaxBin[az];
      if (eb === 0) continue;
      const sb = rowMinBin[az];
      const len = eb - sb;
      const rowOff = az * POLAR_NUM_RANGE_BINS;
      for (let k = 0; k < len; k++) {
        cachedLandIfPacked[packedCursor + k] = ifBuf[rowOff + sb + k];
      }
      cachedLandIfViews[runCount] = cachedLandIfPacked.subarray(packedCursor, packedCursor + len);
      cachedLandRunAz[runCount] = az;
      cachedLandRunStart[runCount] = sb;
      cachedLandRunEnd[runCount] = eb;
      packedCursor += len;
      runCount++;
    }
  }
  cachedLandRunCount = runCount;
  cachedLandPolys = polys;
  cachedLandBins = landBins;
  cachedShadowedBins = shadowedBins;
  cachedLandVersion = ver;
  cachedLandHasIf = writeIf;
  cachedLandOwnLat = ownLatVal;
  cachedLandOwnLon = ownLonVal;
  cachedLandRangeNm = rangeNm;
  cachedLandSeed = landSeed;
  cachedLandStcAmp = stcAmp;
  cachedLandInvRStc = invRStc;
  cachedLandRef = landmasses;
}

function restoreCachedLand(shadowMask, writeIf) {
  firstLandBin.set(cachedFirstLandBin);
  landExitBin.set(cachedLandExitBin);
  if (cachedShadowedBins > 0) {
    shadowMask.set(cachedShadowMask);
  }
  if (writeIf) {
    for (let i = 0; i < cachedLandRunCount; i++) {
      const az = cachedLandRunAz[i];
      const sb = cachedLandRunStart[i];
      ifBuf.set(cachedLandIfViews[i], az * POLAR_NUM_RANGE_BINS + sb);
      rowMinBin[az] = sb;
      rowMaxBin[az] = cachedLandRunEnd[i];
    }
  }
}

function passLand(polys, rangeNm, invBinWidth, landSeed, shadowMask, writeIf) {
  let landBins = 0;
  let shadowedBins = 0;
  if (polys.length === 0) {
    firstLandBin.fill(POLAR_NUM_RANGE_BINS);
    landExitBin.fill(POLAR_NUM_RANGE_BINS);
    return { landBins, shadowedBins };
  }

  for (let az = 0; az < POLAR_NUM_AZIMUTHS; az++) {
    const dx = SIN_AZ[az];
    const dy = COS_AZ[az];
    let nearestEnter = Infinity;
    let nearestExit = Infinity;
    let nearestRefl = 0.96;

    for (let p = 0; p < polys.length; p++) {
      const poly = polys[p];
      if (poly.minDist >= rangeNm) continue;
      const count = rayPolygonHits(dx, dy, poly);
      for (let k = 0; k + 1 < count; k += 2) {
        const a = hitsTmp[k];
        const b = hitsTmp[k + 1];
        if (b - a <= 1e-6) continue;
        if (a < rangeNm && a < nearestEnter) {
          nearestEnter = a;
          nearestExit = b;
          nearestRefl = poly.refl;
        }
      }
    }

    if (nearestEnter < rangeNm) {
      const rowOff = az * POLAR_NUM_RANGE_BINS;
      const shoreBin = Math.min(POLAR_NUM_RANGE_BINS - 1, Math.floor(nearestEnter * invBinWidth));
      const exitBin = Math.min(
        POLAR_NUM_RANGE_BINS,
        Math.max(shoreBin + 1, Math.ceil(nearestExit * invBinWidth))
      );
      firstLandBin[az] = shoreBin;
      landExitBin[az] = exitBin;
      landBins += (exitBin - shoreBin);

      if (writeIf) {
        let firstWritten = POLAR_NUM_RANGE_BINS;
        let lastWritten = 0;
        const shoreV = (0.88 + 0.12 * noise01(landSeed, az, shoreBin)) * nearestRefl;
        const shorePost = shoreV - 0.20 * stcLut[shoreBin];
        if (shorePost > 0) {
          ifBuf[rowOff + shoreBin] = shorePost;
          firstWritten = shoreBin;
          lastWritten = shoreBin + 1;
        }

        for (let b = shoreBin + 1; b < exitBin; b++) {
          const lv = landDecayLut[b - shoreBin] *
            (0.72 + 0.28 * noise01(landSeed, az, b)) * nearestRefl -
            0.20 * stcLut[b];
          if (lv > 0) {
            ifBuf[rowOff + b] = lv;
            if (firstWritten === POLAR_NUM_RANGE_BINS) firstWritten = b;
            lastWritten = b + 1;
          }
        }
        if (lastWritten > 0) {
          if (firstWritten < rowMinBin[az]) rowMinBin[az] = firstWritten;
          if (lastWritten > rowMaxBin[az]) rowMaxBin[az] = lastWritten;
        }
      }

      if (exitBin < POLAR_NUM_RANGE_BINS) {
        shadowMask.fill(1, rowOff + exitBin, rowOff + POLAR_NUM_RANGE_BINS);
        shadowedBins += (POLAR_NUM_RANGE_BINS - exitBin);
      }
    } else {
      firstLandBin[az] = POLAR_NUM_RANGE_BINS;
      landExitBin[az] = POLAR_NUM_RANGE_BINS;
    }
  }

  return { landBins, shadowedBins };
}

function prepareSeaClutterRows(seaAmpBase, maxSeaBin, windDirRad) {
  const cosWind = Math.cos(windDirRad);
  const sinWind = Math.sin(windDirRad);

  for (let az = 0; az < POLAR_NUM_AZIMUTHS; az++) {
    let rayEndBin = firstLandBin[az] < maxSeaBin ? firstLandBin[az] : maxSeaBin;
    if (rayEndBin <= 0) {
      rowSeaEndBin[az] = 0;
      continue;
    }
    const dirFactor = 1 + 0.35 * (COS_AZ[az] * cosWind + SIN_AZ[az] * sinWind);
    const azSeaAmp = seaAmpBase * dirFactor;

    // Uniform SEA_CUTOFF across ALL azimuths regardless of rain, thermal, or gain
    // so distant rain squalls never alter dry near-range sea clutter or target visibility.
    while (rayEndBin > 0 && azSeaAmp * seaDecayLut[rayEndBin - 1] <= stcLut[rayEndBin - 1] + SEA_CUTOFF) {
      rayEndBin--;
    }
    rowSeaEndBin[az] = rayEndBin;
    rowSeaAmp[az] = azSeaAmp;
  }
}

function materializeSeaRow(az, seaCohTbl, seaTickHash) {
  const seaEnd = rowSeaEndBin[az];
  if (seaEnd === 0) return;
  const azSeaAmp = rowSeaAmp[az];
  const rowOff = az * POLAR_NUM_RANGE_BINS;
  const sOff = ((Math.imul(az + 1, 0x165667b1) ^ seaTickHash) >>> 20);
  if (rowHasRain[az] === 1) {
    const rainMin = rowRainMinBin[az];
    const dryEnd = seaEnd < rainMin ? seaEnd : rainMin;
    for (let b = 0; b < dryEnd; b++) {
      const seaV = azSeaAmp * seaDecayLut[b] * seaCohTbl[sOff + b] - stcLut[b];
      ifBuf[rowOff + b] = seaV > 0 ? seaV : 0;
    }
    for (let b = dryEnd; b < seaEnd; b++) {
      const seaV = azSeaAmp * seaDecayLut[b] * seaCohTbl[sOff + b] - stcLut[b];
      const posSea = seaV > 0 ? seaV : 0;
      const rv = ifBuf[rowOff + b];
      ifBuf[rowOff + b] = 0.65 * (posSea + rv) + 0.35 * Math.abs(posSea - rv);
    }
  } else {
    for (let b = 0; b < seaEnd; b++) {
      const seaV = azSeaAmp * seaDecayLut[b] * seaCohTbl[sOff + b] - stcLut[b];
      ifBuf[rowOff + b] += seaV > 0 ? seaV : 0;
    }
  }
  rowMinBin[az] = 0;
  if (seaEnd > rowMaxBin[az]) rowMaxBin[az] = seaEnd;
  rowSeaEndBin[az] = 0;
}

function fillRainRay(az, bStart, bEnd, u0, v0, ku, kv, binWidthNm, directWrite) {
  const rowOff = az * POLAR_NUM_RANGE_BINS;
  const rFirst = rangeLut[bStart];
  let ux = u0 + rFirst * ku;
  let uy = v0 + rFirst * kv;
  const dux = binWidthNm * ku;
  const duy = binWidthNm * kv;
  let firstRainB = POLAR_NUM_RANGE_BINS;
  let maxRainB = 0;

  if (directWrite) {
    for (let b = bStart; b <= bEnd; b++) {
      const d2 = ux * ux + uy * uy;
      const rv = RAIN_LUT[(d2 * RAIN_LUT_SCALE) | 0] * rainTexRow[b] - stcRainLut[b];
      if (rv > 0) {
        ifBuf[rowOff + b] = rv;
        if (firstRainB === POLAR_NUM_RANGE_BINS) firstRainB = b;
        maxRainB = b + 1;
      }
      ux += dux;
      uy += duy;
    }
  } else {
    for (let b = bStart; b <= bEnd; b++) {
      const d2 = ux * ux + uy * uy;
      const rv = RAIN_LUT[(d2 * RAIN_LUT_SCALE) | 0] * rainTexRow[b] - stcRainLut[b];
      if (rv > 0) {
        const idx = rowOff + b;
        const cur = ifBuf[idx];
        ifBuf[idx] = 0.65 * (cur + rv) + 0.35 * Math.abs(cur - rv);
        if (firstRainB === POLAR_NUM_RANGE_BINS) firstRainB = b;
        maxRainB = b + 1;
      }
      ux += dux;
      uy += duy;
    }
  }
  if (maxRainB > 0) {
    rowHasRain[az] = 1;
    if (bStart < rowRainMinBin[az]) rowRainMinBin[az] = bStart;
    if (firstRainB < rowMinBin[az]) rowMinBin[az] = firstRainB;
    if (maxRainB > rowMaxBin[az]) rowMaxBin[az] = maxRainB;
  }
}

function passRainSqualls(
  activeSqualls, ownLat, ownLon, weather, effectiveSeaState, windDirDeg,
  rangeNm, binWidthNm, invBinWidth, simTick, rainSeed
) {
  let activeRainCells = 0;

  for (let s = 0; s < activeSqualls.length; s++) {
    const entry = activeSqualls[s];
    if (!entry || typeof entry !== "object") continue;
    const { sq, intensity } = entry;
    if (!sq || typeof sq !== "object" || !Number.isFinite(sq.lat) || !Number.isFinite(sq.lon)) continue;

    const advDirDeg = normalizeDeg360(finiteOr(sq.driftDirDeg, windDirDeg + 180));
    const advRad = advDirDeg * DEG_TO_RAD;
    const advKn = Math.max(0, finiteOr(
      sq.driftKn,
      finiteOr(sq.driftSpeedKn, finiteOr(weather?.windSpeedKn, 6 + effectiveSeaState * 2.5))
    ));
    const driftNm = advKn * (simTick / 3600);
    if (!Number.isFinite(driftNm)) continue;

    const curLat = clamp(sq.lat + (driftNm * Math.cos(advRad)) / 60, -85, 85);
    const driftCosLat = Math.max(0.1, Math.cos(((sq.lat + curLat) * 0.5) * DEG_TO_RAD));
    const curLon = wrapLon180(sq.lon + (driftNm * Math.sin(advRad)) / (60 * driftCosLat));
    if (!Number.isFinite(curLat) || !Number.isFinite(curLon)) continue;

    const meanLatRad = ((ownLat + curLat) * 0.5) * DEG_TO_RAD;
    const cosLat = Math.max(0.1, Math.cos(meanLatRad));
    const cy = (curLat - ownLat) * 60;
    const cx = wrapLon180(curLon - ownLon) * 60 * cosLat;
    const dist = Math.hypot(cx, cy);

    const radius = Math.max(0.2, finiteOr(sq.radiusNm, 1.2));
    const aspect = clamp(finiteOr(sq.aspectRatio, 1.25), 0.5, 3.0);
    const sqrtAspect = Math.sqrt(aspect);
    const rMajor = radius * sqrtAspect;
    const rMinor = radius / sqrtAspect;
    const maxExtent = Math.max(rMajor, rMinor) * RAIN_LUT_SQRT_MAX;

    if (dist > rangeNm + maxExtent) continue;
    activeRainCells++;

    const ax = Math.sin(advRad);
    const ay = Math.cos(advRad);
    const invMajorAx = ax / rMajor;
    const invMajorAy = ay / rMajor;
    const invMinorPx = ay / rMinor;
    const invMinorPy = -ax / rMinor;

    const minBin = Math.max(0, Math.floor((dist - maxExtent) * invBinWidth));
    const maxBin = Math.min(POLAR_NUM_RANGE_BINS - 1, Math.ceil((dist + maxExtent) * invBinWidth));
    if (minBin > maxBin) continue;

    let azStart = 0;
    let azCount = POLAR_NUM_AZIMUTHS;
    if (dist > maxExtent) {
      const centerAz = normalizeDeg360(Math.atan2(cx, cy) * RAD_TO_DEG);
      const halfSpan = Math.min(180, Math.ceil(Math.asin(clamp(maxExtent / dist, 0, 1)) * RAD_TO_DEG) + 1);
      azStart = Math.floor(centerAz) - halfSpan;
      azCount = halfSpan * 2 + 2;
      if (azCount >= POLAR_NUM_AZIMUTHS) {
        azStart = 0;
        azCount = POLAR_NUM_AZIMUTHS;
      }
    }

    const rainAmp = 0.72 * intensity;
    const sqSalt = s * 31;
    const u0 = -(cx * invMajorAx + cy * invMajorAy);
    const v0 = -(cx * invMinorPx + cy * invMinorPy);
    const c0 = u0 * u0 + v0 * v0 - RAIN_LUT_MAX_D2;
    const sqMinBlk = minBin >> 3;
    const sqMaxBlk = maxBin >> 3;
    let cachedAzQ = -1;

    for (let ai = 0; ai < azCount; ai++) {
      const az = ((azStart + ai) % POLAR_NUM_AZIMUTHS + POLAR_NUM_AZIMUTHS) % POLAR_NUM_AZIMUTHS;
      const sx = SIN_AZ[az];
      const sy = COS_AZ[az];

      const ku = sx * invMajorAx + sy * invMajorAy;
      const kv = sx * invMinorPx + sy * invMinorPy;
      const A = ku * ku + kv * kv;
      const B = u0 * ku + v0 * kv;
      const disc = B * B - A * c0;
      if (disc <= 0) continue;

      const sqrtDisc = Math.sqrt(disc);
      const invA = 1 / A;
      const rEnter = (-B - sqrtDisc) * invA;
      const rExit = (-B + sqrtDisc) * invA;
      if (rExit <= 0 || rEnter >= rangeNm) continue;

      const maxUnshadowed = landExitBin[az] - 1;
      if (maxUnshadowed < minBin) continue;

      let bStart = rEnter <= 0 ? minBin : Math.max(minBin, Math.ceil(rEnter * invBinWidth - 0.5));
      let bEnd = Math.min(maxUnshadowed, maxBin, Math.floor(rExit * invBinWidth - 0.5));
      if (bStart > bEnd) continue;

      while (bStart <= bEnd) {
        const r = rangeLut[bStart];
        const tx = u0 + r * ku;
        const ty = v0 + r * kv;
        if (tx * tx + ty * ty < RAIN_LUT_MAX_D2) break;
        bStart++;
      }
      while (bEnd >= bStart) {
        const r = rangeLut[bEnd];
        const tx = u0 + r * ku;
        const ty = v0 + r * kv;
        if (tx * tx + ty * ty < RAIN_LUT_MAX_D2) break;
        bEnd--;
      }
      if (bStart > bEnd) continue;

      const azQ = az >> 2;
      if (azQ !== cachedAzQ) {
        cachedAzQ = azQ;
        let n0 = noise01(rainSeed, azQ, sqMinBlk + sqSalt);
        for (let blk = sqMinBlk; blk <= sqMaxBlk; blk++) {
          const n1 = noise01(rainSeed, azQ, blk + 1 + sqSalt);
          const baseB = blk << 3;
          const endBlkB = baseB + 8 < POLAR_NUM_RANGE_BINS ? baseB + 8 : POLAR_NUM_RANGE_BINS;
          const stepVal = (n1 - n0) * 0.125;
          let tex = n0;
          for (let tb = baseB; tb < endBlkB; tb++) {
            rainTexRow[tb] = rainAmp * (0.82 + 0.18 * tex);
            tex += stepVal;
          }
          n0 = n1;
        }
      }

      fillRainRay(az, bStart, bEnd, u0, v0, ku, kv, binWidthNm, s === 0 && bEnd < firstLandBin[az]);
    }
  }

  return activeRainCells;
}

function paintTargetEcho(
  azDeg, rNm, rcsSqm, lengthM, beamM, hdgDeg,
  rangeNm, edgeMarginNm, invBinWidth, pwParams, expParams, polys, shadowMask, effGain, gainScale,
  seaCohTbl, seaTickHash
) {
  if (rNm <= 1e-4 || rNm > rangeNm + edgeMarginNm) return 0; // 0 = skipped, 1 = rendered clear, 2 = rendered occluded
  const normAz = normalizeDeg360(azDeg);

  const psi = (normalizeDeg360(hdgDeg) - normAz) * DEG_TO_RAD;
  const absSinPsi = Math.abs(Math.sin(psi));
  const absCosPsi = Math.abs(Math.cos(psi));
  const wPerp = lengthM * absSinPsi + beamM * absCosPsi;
  const dPar = lengthM * absCosPsi + beamM * absSinPsi;

  const thetaShip = ((wPerp / 1852) / Math.max(rNm, 0.03)) * RAD_TO_DEG;
  const sigmaAz = clamp(Math.hypot(0.85, 0.45 * thetaShip) * expParams.azMult, 0.75, 18);
  const sigmaR = clamp(
    Math.max(pwParams.minBins, (0.5 * pwParams.pulseNm + 0.35 * dPar / 1852) * invBinWidth) * expParams.rMult,
    0.55,
    10
  );

  const centerBin = rNm * invBinWidth - 0.5;
  const minBin = Math.max(0, Math.floor(centerBin - 2));
  const maxBin = Math.min(POLAR_NUM_RANGE_BINS - 1, Math.ceil(centerBin + sigmaR * 3.0));
  if (minBin > maxBin) return 0;

  const inRange = rNm <= rangeNm;
  const azRad = normAz * DEG_TO_RAD;
  const targetOccluded = polys.length > 0 &&
    isOccludedPreprojected(Math.sin(azRad), Math.cos(azRad), rNm, polys);

  if (effGain <= 0) {
    return inRange ? (targetOccluded ? 2 : 1) : 0;
  }

  const rcs = Math.max(0, finiteOr(rcsSqm, 50));
  const peak = 0.145 * pwParams.gainBoost *
    (Math.log(1 + rcs) / (1 + Math.pow(rNm / 12, 1.6))) *
    expParams.gainMult;

  const invTwoSigmaRSq = 1 / (2 * sigmaR * sigmaR);
  for (let b = minBin; b <= maxBin; b++) {
    const dr = b - centerBin;
    targetWRLut[b] = dr < 0
      ? Math.exp(-(dr * dr) * INV_TWO_LEAD_SQ)
      : Math.exp(-(dr * dr) * invTwoSigmaRSq);
  }

  const invTwoSigmaAzSq = 1 / (2 * sigmaAz * sigmaAz);
  const azHalf = Math.min(179, Math.ceil(sigmaAz * 3.0));
  const azCenter = Math.round(normAz) % POLAR_NUM_AZIMUTHS;
  let visibleOffEdge = false;

  for (let da = -azHalf; da <= azHalf; da++) {
    const az = ((azCenter + da) % POLAR_NUM_AZIMUTHS + POLAR_NUM_AZIMUTHS) % POLAR_NUM_AZIMUTHS;
    let diffAz = az - normAz;
    if (diffAz > 180) diffAz -= 360;
    else if (diffAz < -180) diffAz += 360;
    const wAz = Math.exp(-(diffAz * diffAz) * invTwoSigmaAzSq);
    if (wAz < 0.015) continue;

    // Materialize sea clutter (and sea+rain blend) onto target-bearing rows before adding target echo
    if (rowSeaEndBin[az] > 0) {
      materializeSeaRow(az, seaCohTbl, seaTickHash);
    }

    if (paintTargetAzRow(az, minBin, maxBin, peak * wAz, targetOccluded, shadowMask, inRange, gainScale)) {
      visibleOffEdge = true;
    }
  }

  return (inRange || visibleOffEdge) ? (targetOccluded ? 2 : 1) : 0;
}

function paintTargetAzRow(az, minBin, maxBin, peakAz, targetOccluded, shadowMask, inRange, gainScale) {
  const rowOff = az * POLAR_NUM_RANGE_BINS;
  let firstB = rowMinBin[az];
  let lastB = rowMaxBin[az];
  let visibleOffEdge = false;

  if (!targetOccluded && maxBin < landExitBin[az]) {
    for (let b = minBin; b <= maxBin; b++) {
      const val = peakAz * targetWRLut[b] - 0.92 * stcLut[b];
      if (val > 0) {
        ifBuf[rowOff + b] += val;
        if (b < firstB) firstB = b;
        if (b + 1 > lastB) lastB = b + 1;
        if (!inRange && val * gainScale >= 0.09) visibleOffEdge = true;
      }
    }
  } else {
    for (let b = minBin; b <= maxBin; b++) {
      const idx = rowOff + b;
      const occ = (targetOccluded || shadowMask[idx] === 1) ? 0.12 : 1.0;
      const val = peakAz * targetWRLut[b] * occ - 0.92 * stcLut[b];
      if (val > 0) {
        ifBuf[idx] += val;
        if (b < firstB) firstB = b;
        if (b + 1 > lastB) lastB = b + 1;
        if (!inRange && val * gainScale >= 0.09) visibleOffEdge = true;
      }
    }
  }
  rowMinBin[az] = firstB;
  rowMaxBin[az] = lastB;
  return visibleOffEdge;
}

function prepareThermalTables(noiseAmp, thermalTbl) {
  if (cachedThermalTbl === thermalTbl && cachedThermalAmp === noiseAmp) {
    return cachedThermalMax;
  }
  let eSum = 0;
  let nSum = 0;
  let thMax = 0;
  for (let i = 0; i < NOISE_TABLE_PADDED; i++) {
    thermalAmpBuf[i] = noiseAmp * thermalTbl[i];
    // Quantize from the stored Float32 thermalAmpBuf value so lvl >= old is an
    // exact IEEE-754 invariant for every non-negative signal addition in Stage 5.
    const tv = thermalAmpBuf[i];
    const tc = tv < 0.99 ? tv : 0.99;
    const lvl = ((tc - 0.09) * QUANT_SLOPE + 1) | 0;
    thermalLvlBuf[i] = lvl;
    if (lvl >= 7) {
      thermalGapBuf[i] = Infinity;
    } else {
      const rawGap = (0.09 + lvl * 0.13) - tv;
      thermalGapBuf[i] = rawGap > 1e-6 ? rawGap * 0.999 : 0;
    }
    if (lvl > thMax) thMax = lvl;
    eSum += lvl;
    nSum += (lvl + 7) >>> 3;
    thermalEnergyPrefix[i + 1] = eSum;
    thermalNonZeroPrefix[i + 1] = nSum;
  }
  cachedThermalTbl = thermalTbl;
  cachedThermalAmp = noiseAmp;
  cachedThermalMax = thMax;
  return thMax;
}

function quantizeNoFtcNoThermal(grid, gainScale, nearMaxBin, seaCohTbl, seaTickHash) {
  let lvlMask = 0;
  let nonZeroBins = 0;
  let totalEnergy = 0;
  let nearClutterEnergy = 0;

  for (let az = 0; az < POLAR_NUM_AZIMUTHS; az++) {
    let seaEnd = rowSeaEndBin[az];
    const sparseEnd = rowMaxBin[az];
    if (seaEnd === 0 && sparseEnd === 0) { rowMaxGridBin[az] = 0; continue; }

    const rowOff = az * POLAR_NUM_RANGE_BINS;
    let lastGridB = 0;
    const azSeaAmp = seaEnd > 0 ? rowSeaAmp[az] : 0;
    if (sparseEnd === 0 && seaEnd > 0) {
      while (seaEnd > 0 && azSeaAmp * seaDecayGainLut[seaEnd - 1] - stcGainLut[seaEnd - 1] < 0.09) {
        seaEnd--;
      }
      if (seaEnd === 0) { rowMaxGridBin[az] = 0; continue; }
    }

    const sOff = seaEnd > 0 ? ((Math.imul(az + 1, 0x165667b1) ^ seaTickHash) >>> 20) : 0;
    const rainMin = rowRainMinBin[az];
    const dryEnd = seaEnd < rainMin ? seaEnd : rainMin;
    const ovRaw = seaEnd < sparseEnd ? seaEnd : sparseEnd;
    const overlapEnd = ovRaw > dryEnd ? ovRaw : dryEnd;

    for (let b = 0; b < dryEnd; b++) {
      const v = azSeaAmp * seaDecayGainLut[b] * seaCohTbl[sOff + b] - stcGainLut[b];
      if (v < 0.09) continue;
      const vc = v < 0.99 ? v : 0.99;
      const lvl = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
      grid[rowOff + b] = lvl;
      totalEnergy += lvl;
      if (b < nearMaxBin) nearClutterEnergy += lvl;
      nonZeroBins++;
      lvlMask |= 1 << lvl;
      lastGridB = b + 1;
    }
    for (let b = dryEnd; b < overlapEnd; b++) {
      const rawH = azSeaAmp * seaDecayGainHalfLut[b] * seaCohTbl[sOff + b] - stcGainHalfLut[b];
      const posG = rawH + Math.abs(rawH);
      const rvG = ifBuf[rowOff + b] * gainScale;
      ifBuf[rowOff + b] = 0;
      const v = 0.65 * (posG + rvG) + 0.35 * Math.abs(posG - rvG);
      if (v < 0.09) continue;
      const vc = v < 0.99 ? v : 0.99;
      const lvl = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
      grid[rowOff + b] = lvl;
      totalEnergy += lvl;
      if (b < nearMaxBin) nearClutterEnergy += lvl;
      nonZeroBins++;
      lvlMask |= 1 << lvl;
      lastGridB = b + 1;
    }
    for (let b = overlapEnd; b < seaEnd; b++) {
      const v = azSeaAmp * seaDecayGainLut[b] * seaCohTbl[sOff + b] - stcGainLut[b];
      if (v < 0.09) continue;
      const vc = v < 0.99 ? v : 0.99;
      const lvl = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
      grid[rowOff + b] = lvl;
      totalEnergy += lvl;
      if (b < nearMaxBin) nearClutterEnergy += lvl;
      nonZeroBins++;
      lvlMask |= 1 << lvl;
      lastGridB = b + 1;
    }
    if (seaEnd < sparseEnd) {
      const minB = rowMinBin[az];
      const spStart = seaEnd > minB ? seaEnd : minB;
      for (let b = spStart; b < sparseEnd; b++) {
        const idx = rowOff + b;
        const raw = ifBuf[idx];
        if (raw === 0) continue;
        ifBuf[idx] = 0;
        const v = raw * gainScale;
        if (v < 0.09) continue;
        const vc = v < 0.99 ? v : 0.99;
        const lvl = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
        grid[idx] = lvl;
        totalEnergy += lvl;
        if (b < nearMaxBin) nearClutterEnergy += lvl;
        nonZeroBins++;
        lvlMask |= 1 << lvl;
        lastGridB = b + 1;
      }
    }
    rowMaxGridBin[az] = lastGridB;
  }
  const activeMask = lvlMask & 0xFE;
  const maxLevel = activeMask !== 0 ? 31 - Math.clz32(activeMask) : 0;
  return { maxLevel, nonZeroBins, totalEnergy, nearClutterEnergy };
}

function quantizeFtcNoThermal(grid, gainScale, ftcMix, ftcAlpha, nearMaxBin, seaCohTbl, seaTickHash) {
  let lvlMask = 0;
  let nonZeroBins = 0;
  let totalEnergy = 0;
  let nearClutterEnergy = 0;
  const ftcKeep = 1 - ftcMix;
  const ftcMixHalf = 0.5 * ftcMix;
  const oneMinusAlpha = 1 - ftcAlpha;

  for (let az = 0; az < POLAR_NUM_AZIMUTHS; az++) {
    let seaEnd = rowSeaEndBin[az];
    const sparseEnd = rowMaxBin[az];
    if (seaEnd === 0 && sparseEnd === 0) { rowMaxGridBin[az] = 0; continue; }

    const rowOff = az * POLAR_NUM_RANGE_BINS;
    let lpG = 0;
    let lastGridB = 0;
    const azSeaAmp = seaEnd > 0 ? rowSeaAmp[az] : 0;
    if (sparseEnd === 0 && seaEnd > 0) {
      while (seaEnd > 0 && azSeaAmp * seaDecayGainLut[seaEnd - 1] - stcGainLut[seaEnd - 1] < 0.09) {
        seaEnd--;
      }
      if (seaEnd === 0) { rowMaxGridBin[az] = 0; continue; }
    }

    const sOff = seaEnd > 0 ? ((Math.imul(az + 1, 0x165667b1) ^ seaTickHash) >>> 20) : 0;
    const rainMin = rowRainMinBin[az];
    const dryEnd = seaEnd < rainMin ? seaEnd : rainMin;
    const ovRaw = seaEnd < sparseEnd ? seaEnd : sparseEnd;
    const overlapEnd = ovRaw > dryEnd ? ovRaw : dryEnd;

    for (let b = 0; b < dryEnd; b++) {
      const rawH = azSeaAmp * seaDecayGainHalfLut[b] * seaCohTbl[sOff + b] - stcGainHalfLut[b];
      const posG = rawH + Math.abs(rawH);
      const d = posG - lpG;
      const postG = posG * ftcKeep + (d + Math.abs(d)) * ftcMixHalf;
      lpG = lpG * oneMinusAlpha + posG * ftcAlpha;
      if (postG < 0.09) continue;
      const vc = postG < 0.99 ? postG : 0.99;
      const lvl = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
      grid[rowOff + b] = lvl;
      totalEnergy += lvl;
      if (b < nearMaxBin) nearClutterEnergy += lvl;
      nonZeroBins++;
      lvlMask |= 1 << lvl;
      lastGridB = b + 1;
    }
    for (let b = dryEnd; b < overlapEnd; b++) {
      const rawH = azSeaAmp * seaDecayGainHalfLut[b] * seaCohTbl[sOff + b] - stcGainHalfLut[b];
      const posG = rawH + Math.abs(rawH);
      const rvG = ifBuf[rowOff + b] * gainScale;
      ifBuf[rowOff + b] = 0;
      const combG = 0.65 * (posG + rvG) + 0.35 * Math.abs(posG - rvG);
      const d = combG - lpG;
      const postG = combG * ftcKeep + (d + Math.abs(d)) * ftcMixHalf;
      lpG = lpG * oneMinusAlpha + combG * ftcAlpha;
      if (postG < 0.09) continue;
      const vc = postG < 0.99 ? postG : 0.99;
      const lvl = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
      grid[rowOff + b] = lvl;
      totalEnergy += lvl;
      if (b < nearMaxBin) nearClutterEnergy += lvl;
      nonZeroBins++;
      lvlMask |= 1 << lvl;
      lastGridB = b + 1;
    }
    for (let b = overlapEnd; b < seaEnd; b++) {
      const rawH = azSeaAmp * seaDecayGainHalfLut[b] * seaCohTbl[sOff + b] - stcGainHalfLut[b];
      const posG = rawH + Math.abs(rawH);
      const d = posG - lpG;
      const postG = posG * ftcKeep + (d + Math.abs(d)) * ftcMixHalf;
      lpG = lpG * oneMinusAlpha + posG * ftcAlpha;
      if (postG < 0.09) continue;
      const vc = postG < 0.99 ? postG : 0.99;
      const lvl = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
      grid[rowOff + b] = lvl;
      totalEnergy += lvl;
      if (b < nearMaxBin) nearClutterEnergy += lvl;
      nonZeroBins++;
      lvlMask |= 1 << lvl;
      lastGridB = b + 1;
    }
    for (let b = seaEnd; b < sparseEnd; b++) {
      const rawG = ifBuf[rowOff + b] * gainScale;
      ifBuf[rowOff + b] = 0;
      const d = rawG - lpG;
      const postG = rawG * ftcKeep + (d + Math.abs(d)) * ftcMixHalf;
      lpG = lpG * oneMinusAlpha + rawG * ftcAlpha;
      if (postG < 0.09) continue;
      const vc = postG < 0.99 ? postG : 0.99;
      const lvl = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
      grid[rowOff + b] = lvl;
      totalEnergy += lvl;
      if (b < nearMaxBin) nearClutterEnergy += lvl;
      nonZeroBins++;
      lvlMask |= 1 << lvl;
      lastGridB = b + 1;
    }
    rowMaxGridBin[az] = lastGridB;
  }
  const activeMask = lvlMask & 0xFE;
  const maxLevel = activeMask !== 0 ? 31 - Math.clz32(activeMask) : 0;
  return { maxLevel, nonZeroBins, totalEnergy, nearClutterEnergy };
}

function quantizeNoFtcThermalRowNoStats(
  dst, az, seaEnd, sparseEnd, rowOff, tOff, gainScale, hasStc, seaCohTbl, seaTickHash
) {
  const azSeaAmp = seaEnd > 0 ? rowSeaAmp[az] : 0;
  const sOff = seaEnd > 0 ? ((Math.imul(az + 1, 0x165667b1) ^ seaTickHash) >>> 20) : 0;
  const rainMin = rowRainMinBin[az];
  const dryEnd = seaEnd < rainMin ? seaEnd : rainMin;
  const ovRaw = seaEnd < sparseEnd ? seaEnd : sparseEnd;
  const overlapEnd = ovRaw > dryEnd ? ovRaw : dryEnd;

  if (dryEnd > 0) {
    if (!hasStc) {
      for (let b = 0; b < dryEnd; b++) {
        const v = azSeaAmp * seaDecayGainLut[b] * seaCohTbl[sOff + b] + thermalAmpBuf[tOff + b];
        const vc = v < 0.99 ? v : 0.99;
        dst[rowOff + b] = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
      }
    } else {
      for (let b = 0; b < dryEnd; b++) {
        const rawG = azSeaAmp * seaDecayGainLut[b] * seaCohTbl[sOff + b] - stcGainLut[b];
        const posG = rawG > 0 ? rawG : 0;
        const v = posG + thermalAmpBuf[tOff + b];
        const vc = v < 0.99 ? v : 0.99;
        dst[rowOff + b] = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
      }
    }
  }
  for (let b = dryEnd; b < overlapEnd; b++) {
    const rawH = azSeaAmp * seaDecayGainHalfLut[b] * seaCohTbl[sOff + b] - stcGainHalfLut[b];
    const posG = rawH + Math.abs(rawH);
    const rvG = ifBuf[rowOff + b] * gainScale;
    ifBuf[rowOff + b] = 0;
    const combG = 0.65 * (posG + rvG) + 0.35 * Math.abs(posG - rvG);
    const v = combG + thermalAmpBuf[tOff + b];
    const vc = v < 0.99 ? v : 0.99;
    dst[rowOff + b] = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
  }
  if (overlapEnd < seaEnd) {
    if (!hasStc) {
      for (let b = overlapEnd; b < seaEnd; b++) {
        const v = azSeaAmp * seaDecayGainLut[b] * seaCohTbl[sOff + b] + thermalAmpBuf[tOff + b];
        const vc = v < 0.99 ? v : 0.99;
        dst[rowOff + b] = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
      }
    } else {
      for (let b = overlapEnd; b < seaEnd; b++) {
        const rawG = azSeaAmp * seaDecayGainLut[b] * seaCohTbl[sOff + b] - stcGainLut[b];
        const posG = rawG > 0 ? rawG : 0;
        const v = posG + thermalAmpBuf[tOff + b];
        const vc = v < 0.99 ? v : 0.99;
        dst[rowOff + b] = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
      }
    }
  }
  if (seaEnd < sparseEnd) {
    const minB = rowMinBin[az];
    const spStart = seaEnd > minB ? seaEnd : minB;
    for (let b = spStart; b < sparseEnd; b++) {
      const idx = rowOff + b;
      const raw = ifBuf[idx];
      if (raw === 0) continue;
      ifBuf[idx] = 0;
      const rawG = raw * gainScale;
      if (rawG < thermalGapBuf[tOff + b]) continue;
      const v = rawG + thermalAmpBuf[tOff + b];
      const vc = v < 0.99 ? v : 0.99;
      dst[idx] = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
    }
  }
}

function quantizeNoFtcThermalNoStats(
  dst, gainScale, hasStc, noiseAmp, thermalTbl, thermalTickHash, seaCohTbl, seaTickHash
) {
  const thMax = prepareThermalTables(noiseAmp, thermalTbl);
  const thActive = thMax > 0;
  if (!thActive && procScratchDirty) {
    dst.fill(0);
  }
  procScratchDirty = true;

  for (let az = 0; az < POLAR_NUM_AZIMUTHS; az++) {
    const seaEnd = rowSeaEndBin[az];
    const sparseEnd = rowMaxBin[az];
    const endBin = seaEnd > sparseEnd ? seaEnd : sparseEnd;
    const rowOff = az * POLAR_NUM_RANGE_BINS;
    const tOff = ((Math.imul(az + 13, 0x2c1b3c6d) ^ thermalTickHash) >>> 20) & 4088;

    if (thActive) {
      dst.set(thermalLvlRows[tOff >>> 3], rowOff);
      rowMaxGridBin[az] = POLAR_NUM_RANGE_BINS;
    } else {
      rowMaxGridBin[az] = endBin;
    }

    if (endBin === 0) continue;
    quantizeNoFtcThermalRowNoStats(
      dst, az, seaEnd, sparseEnd, rowOff, tOff, gainScale, hasStc, seaCohTbl, seaTickHash
    );
  }
  return { maxLevel: 0, nonZeroBins: 0, totalEnergy: 0, nearClutterEnergy: 0 };
}

function quantizeNoFtcThermalRowWithStats(
  grid, az, seaEnd, sparseEnd, rowOff, tOff, gainScale, nearMaxBin, seaCohTbl, seaTickHash
) {
  let lvlMask = 0;
  let nonZeroBins = 0;
  let totalEnergy = 0;
  let nearClutterEnergy = 0;
  const azSeaAmp = seaEnd > 0 ? rowSeaAmp[az] : 0;
  const sOff = seaEnd > 0 ? ((Math.imul(az + 1, 0x165667b1) ^ seaTickHash) >>> 20) : 0;
  const rainMin = rowRainMinBin[az];
  const dryEnd = seaEnd < rainMin ? seaEnd : rainMin;
  const ovRaw = seaEnd < sparseEnd ? seaEnd : sparseEnd;
  const overlapEnd = ovRaw > dryEnd ? ovRaw : dryEnd;

  for (let b = 0; b < dryEnd; b++) {
    const rawG = azSeaAmp * seaDecayGainLut[b] * seaCohTbl[sOff + b] - stcGainLut[b];
    if (rawG < thermalGapBuf[tOff + b]) continue;
    const v = rawG + thermalAmpBuf[tOff + b];
    const vc = v < 0.99 ? v : 0.99;
    const lvl = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
    const old = thermalLvlBuf[tOff + b];
    const diff = lvl - old;
    if (diff > 0) {
      grid[rowOff + b] = lvl;
      totalEnergy += diff;
      if (b < nearMaxBin) nearClutterEnergy += diff;
      nonZeroBins += 1 - ((old + 7) >>> 3);
      lvlMask |= 1 << lvl;
    }
  }
  for (let b = dryEnd; b < overlapEnd; b++) {
    const rawH = azSeaAmp * seaDecayGainHalfLut[b] * seaCohTbl[sOff + b] - stcGainHalfLut[b];
    const posG = rawH + Math.abs(rawH);
    const rvG = ifBuf[rowOff + b] * gainScale;
    ifBuf[rowOff + b] = 0;
    const combG = 0.65 * (posG + rvG) + 0.35 * Math.abs(posG - rvG);
    if (combG < thermalGapBuf[tOff + b]) continue;
    const v = combG + thermalAmpBuf[tOff + b];
    const vc = v < 0.99 ? v : 0.99;
    const lvl = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
    const old = thermalLvlBuf[tOff + b];
    const diff = lvl - old;
    if (diff > 0) {
      grid[rowOff + b] = lvl;
      totalEnergy += diff;
      if (b < nearMaxBin) nearClutterEnergy += diff;
      nonZeroBins += 1 - ((old + 7) >>> 3);
      lvlMask |= 1 << lvl;
    }
  }
  for (let b = overlapEnd; b < seaEnd; b++) {
    const rawG = azSeaAmp * seaDecayGainLut[b] * seaCohTbl[sOff + b] - stcGainLut[b];
    if (rawG < thermalGapBuf[tOff + b]) continue;
    const v = rawG + thermalAmpBuf[tOff + b];
    const vc = v < 0.99 ? v : 0.99;
    const lvl = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
    const old = thermalLvlBuf[tOff + b];
    const diff = lvl - old;
    if (diff > 0) {
      grid[rowOff + b] = lvl;
      totalEnergy += diff;
      if (b < nearMaxBin) nearClutterEnergy += diff;
      nonZeroBins += 1 - ((old + 7) >>> 3);
      lvlMask |= 1 << lvl;
    }
  }
  if (seaEnd < sparseEnd) {
    const minB = rowMinBin[az];
    const spStart = seaEnd > minB ? seaEnd : minB;
    for (let b = spStart; b < sparseEnd; b++) {
      const idx = rowOff + b;
      const raw = ifBuf[idx];
      if (raw === 0) continue;
      ifBuf[idx] = 0;
      const rawG = raw * gainScale;
      if (rawG < thermalGapBuf[tOff + b]) continue;
      const v = rawG + thermalAmpBuf[tOff + b];
      const vc = v < 0.99 ? v : 0.99;
      const lvl = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
      const old = thermalLvlBuf[tOff + b];
      const diff = lvl - old;
      if (diff > 0) {
        grid[idx] = lvl;
        totalEnergy += diff;
        if (b < nearMaxBin) nearClutterEnergy += diff;
        nonZeroBins += 1 - ((old + 7) >>> 3);
        lvlMask |= 1 << lvl;
      }
    }
  }
  quantAccTmp[0] |= lvlMask;
  quantAccTmp[1] += nonZeroBins;
  quantAccTmp[2] += totalEnergy;
  quantAccTmp[3] += nearClutterEnergy;
}

function quantizeNoFtcThermal(grid, gainScale, noiseAmp, thermalTbl, thermalTickHash, nearMaxBin, seaCohTbl, seaTickHash) {
  const thMax = prepareThermalTables(noiseAmp, thermalTbl);
  const thActive = thMax > 0;
  let thMaxSeen = 0;
  let nonZeroBins = 0;
  let totalEnergy = 0;
  let nearClutterEnergy = 0;
  quantAccTmp[0] = 0;
  quantAccTmp[1] = 0;
  quantAccTmp[2] = 0;
  quantAccTmp[3] = 0;

  for (let az = 0; az < POLAR_NUM_AZIMUTHS; az++) {
    const seaEnd = rowSeaEndBin[az];
    const sparseEnd = rowMaxBin[az];
    const endBin = seaEnd > sparseEnd ? seaEnd : sparseEnd;
    const rowOff = az * POLAR_NUM_RANGE_BINS;
    const tOff = ((Math.imul(az + 13, 0x2c1b3c6d) ^ thermalTickHash) >>> 20) & 4088;

    if (thActive) {
      grid.set(thermalLvlRows[tOff >>> 3], rowOff);
      const tEnd = tOff + POLAR_NUM_RANGE_BINS;
      const rowN = thermalNonZeroPrefix[tEnd] - thermalNonZeroPrefix[tOff];
      totalEnergy += thermalEnergyPrefix[tEnd] - thermalEnergyPrefix[tOff];
      nonZeroBins += rowN;
      nearClutterEnergy += thermalEnergyPrefix[tOff + nearMaxBin] - thermalEnergyPrefix[tOff];
      if (rowN > 0 && thMaxSeen < thMax) {
        for (let ti = tOff; ti < tEnd; ti++) {
          const lv = thermalLvlBuf[ti];
          if (lv > thMaxSeen) {
            thMaxSeen = lv;
            if (thMaxSeen === thMax) break;
          }
        }
      }
      rowMaxGridBin[az] = POLAR_NUM_RANGE_BINS;
    } else {
      rowMaxGridBin[az] = endBin;
    }

    if (endBin === 0) continue;
    quantizeNoFtcThermalRowWithStats(
      grid, az, seaEnd, sparseEnd, rowOff, tOff, gainScale, nearMaxBin, seaCohTbl, seaTickHash
    );
  }
  const activeMask = (quantAccTmp[0] | (1 << thMaxSeen)) & 0xFE;
  const maxLevel = activeMask !== 0 ? 31 - Math.clz32(activeMask) : 0;
  return {
    maxLevel,
    nonZeroBins: nonZeroBins + quantAccTmp[1],
    totalEnergy: totalEnergy + quantAccTmp[2],
    nearClutterEnergy: nearClutterEnergy + quantAccTmp[3],
  };
}

function quantizeFtcThermalRow(
  dst, az, seaEnd, sparseEnd, rowOff, tOff, gainScale, ftcKeep, ftcMixHalf, ftcAlpha, oneMinusAlpha,
  nearMaxBin, seaCohTbl, seaTickHash, skipStats
) {
  let lpG = 0;
  let lvlMask = 0;
  let nonZeroBins = 0;
  let totalEnergy = 0;
  let nearClutterEnergy = 0;
  const azSeaAmp = seaEnd > 0 ? rowSeaAmp[az] : 0;
  const sOff = seaEnd > 0 ? ((Math.imul(az + 1, 0x165667b1) ^ seaTickHash) >>> 20) : 0;
  const rainMin = rowRainMinBin[az];
  const dryEnd = seaEnd < rainMin ? seaEnd : rainMin;
  const ovRaw = seaEnd < sparseEnd ? seaEnd : sparseEnd;
  const overlapEnd = ovRaw > dryEnd ? ovRaw : dryEnd;

  for (let b = 0; b < dryEnd; b++) {
    const rawH = azSeaAmp * seaDecayGainHalfLut[b] * seaCohTbl[sOff + b] - stcGainHalfLut[b];
    const posG = rawH + Math.abs(rawH);
    const d = posG - lpG;
    const postG = posG * ftcKeep + (d + Math.abs(d)) * ftcMixHalf;
    lpG = lpG * oneMinusAlpha + posG * ftcAlpha;
    if (postG < thermalGapBuf[tOff + b]) continue;
    const v = postG + thermalAmpBuf[tOff + b];
    const vc = v < 0.99 ? v : 0.99;
    const lvl = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
    if (skipStats) {
      dst[rowOff + b] = lvl;
    } else {
      const old = thermalLvlBuf[tOff + b];
      const diff = lvl - old;
      if (diff > 0) {
        dst[rowOff + b] = lvl;
        totalEnergy += diff;
        if (b < nearMaxBin) nearClutterEnergy += diff;
        nonZeroBins += 1 - ((old + 7) >>> 3);
        lvlMask |= 1 << lvl;
      }
    }
  }
  for (let b = dryEnd; b < overlapEnd; b++) {
    const rawH = azSeaAmp * seaDecayGainHalfLut[b] * seaCohTbl[sOff + b] - stcGainHalfLut[b];
    const posG = rawH + Math.abs(rawH);
    const rvG = ifBuf[rowOff + b] * gainScale;
    ifBuf[rowOff + b] = 0;
    const combG = 0.65 * (posG + rvG) + 0.35 * Math.abs(posG - rvG);
    const d = combG - lpG;
    const postG = combG * ftcKeep + (d + Math.abs(d)) * ftcMixHalf;
    lpG = lpG * oneMinusAlpha + combG * ftcAlpha;
    if (postG < thermalGapBuf[tOff + b]) continue;
    const v = postG + thermalAmpBuf[tOff + b];
    const vc = v < 0.99 ? v : 0.99;
    const lvl = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
    if (skipStats) {
      dst[rowOff + b] = lvl;
    } else {
      const old = thermalLvlBuf[tOff + b];
      const diff = lvl - old;
      if (diff > 0) {
        dst[rowOff + b] = lvl;
        totalEnergy += diff;
        if (b < nearMaxBin) nearClutterEnergy += diff;
        nonZeroBins += 1 - ((old + 7) >>> 3);
        lvlMask |= 1 << lvl;
      }
    }
  }
  for (let b = overlapEnd; b < seaEnd; b++) {
    const rawH = azSeaAmp * seaDecayGainHalfLut[b] * seaCohTbl[sOff + b] - stcGainHalfLut[b];
    const posG = rawH + Math.abs(rawH);
    const d = posG - lpG;
    const postG = posG * ftcKeep + (d + Math.abs(d)) * ftcMixHalf;
    lpG = lpG * oneMinusAlpha + posG * ftcAlpha;
    if (postG < thermalGapBuf[tOff + b]) continue;
    const v = postG + thermalAmpBuf[tOff + b];
    const vc = v < 0.99 ? v : 0.99;
    const lvl = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
    if (skipStats) {
      dst[rowOff + b] = lvl;
    } else {
      const old = thermalLvlBuf[tOff + b];
      const diff = lvl - old;
      if (diff > 0) {
        dst[rowOff + b] = lvl;
        totalEnergy += diff;
        if (b < nearMaxBin) nearClutterEnergy += diff;
        nonZeroBins += 1 - ((old + 7) >>> 3);
        lvlMask |= 1 << lvl;
      }
    }
  }
  // CRITICAL: Never skip raw === 0 in FTC because lpG decays across zero bins.
  for (let b = seaEnd; b < sparseEnd; b++) {
    const rawG = ifBuf[rowOff + b] * gainScale;
    ifBuf[rowOff + b] = 0;
    const d = rawG - lpG;
    const postG = rawG * ftcKeep + (d + Math.abs(d)) * ftcMixHalf;
    lpG = lpG * oneMinusAlpha + rawG * ftcAlpha;
    if (postG < thermalGapBuf[tOff + b]) continue;
    const v = postG + thermalAmpBuf[tOff + b];
    const vc = v < 0.99 ? v : 0.99;
    const lvl = ((vc - 0.09) * QUANT_SLOPE + 1) | 0;
    if (skipStats) {
      dst[rowOff + b] = lvl;
    } else {
      const old = thermalLvlBuf[tOff + b];
      const diff = lvl - old;
      if (diff > 0) {
        dst[rowOff + b] = lvl;
        totalEnergy += diff;
        if (b < nearMaxBin) nearClutterEnergy += diff;
        nonZeroBins += 1 - ((old + 7) >>> 3);
        lvlMask |= 1 << lvl;
      }
    }
  }
  if (!skipStats) {
    quantAccTmp[0] |= lvlMask;
    quantAccTmp[1] += nonZeroBins;
    quantAccTmp[2] += totalEnergy;
    quantAccTmp[3] += nearClutterEnergy;
  }
}

function quantizeFtcThermal(
  dst, gainScale, ftcMix, ftcAlpha, noiseAmp, thermalTbl, thermalTickHash, nearMaxBin, seaCohTbl, seaTickHash, skipStats
) {
  const thMax = prepareThermalTables(noiseAmp, thermalTbl);
  const thActive = thMax > 0;
  if (skipStats) {
    if (!thActive && procScratchDirty) {
      dst.fill(0);
    }
    procScratchDirty = true;
  } else {
    quantAccTmp[0] = 0;
    quantAccTmp[1] = 0;
    quantAccTmp[2] = 0;
    quantAccTmp[3] = 0;
  }
  let thMaxSeen = 0;
  let nonZeroBins = 0;
  let totalEnergy = 0;
  let nearClutterEnergy = 0;
  const ftcKeep = 1 - ftcMix;
  const ftcMixHalf = 0.5 * ftcMix;
  const oneMinusAlpha = 1 - ftcAlpha;

  for (let az = 0; az < POLAR_NUM_AZIMUTHS; az++) {
    const seaEnd = rowSeaEndBin[az];
    const sparseEnd = rowMaxBin[az];
    const endBin = seaEnd > sparseEnd ? seaEnd : sparseEnd;
    const rowOff = az * POLAR_NUM_RANGE_BINS;
    const tOff = ((Math.imul(az + 13, 0x2c1b3c6d) ^ thermalTickHash) >>> 20) & 4088;

    if (thActive) {
      dst.set(thermalLvlRows[tOff >>> 3], rowOff);
      if (!skipStats) {
        const tEnd = tOff + POLAR_NUM_RANGE_BINS;
        const rowN = thermalNonZeroPrefix[tEnd] - thermalNonZeroPrefix[tOff];
        totalEnergy += thermalEnergyPrefix[tEnd] - thermalEnergyPrefix[tOff];
        nonZeroBins += rowN;
        nearClutterEnergy += thermalEnergyPrefix[tOff + nearMaxBin] - thermalEnergyPrefix[tOff];
        if (rowN > 0 && thMaxSeen < thMax) {
          for (let ti = tOff; ti < tEnd; ti++) {
            const lv = thermalLvlBuf[ti];
            if (lv > thMaxSeen) {
              thMaxSeen = lv;
              if (thMaxSeen === thMax) break;
            }
          }
        }
      }
      rowMaxGridBin[az] = POLAR_NUM_RANGE_BINS;
    } else {
      rowMaxGridBin[az] = endBin;
    }

    if (endBin === 0) continue;
    quantizeFtcThermalRow(
      dst, az, seaEnd, sparseEnd, rowOff, tOff, gainScale, ftcKeep, ftcMixHalf, ftcAlpha, oneMinusAlpha,
      nearMaxBin, seaCohTbl, seaTickHash, skipStats
    );
  }
  if (skipStats) {
    return { maxLevel: 0, nonZeroBins: 0, totalEnergy: 0, nearClutterEnergy: 0 };
  }
  const activeMask = (quantAccTmp[0] | (1 << thMaxSeen)) & 0xFE;
  const maxLevel = activeMask !== 0 ? 31 - Math.clz32(activeMask) : 0;
  return {
    maxLevel,
    nonZeroBins: nonZeroBins + quantAccTmp[1],
    totalEnergy: totalEnergy + quantAccTmp[2],
    nearClutterEnergy: nearClutterEnergy + quantAccTmp[3],
  };
}

function patchInterferenceOnGrid(grid, baseSeed, simTick, irLevel, gainScale, nearMaxBin, acc) {
  const irSeed = (baseSeed ^ 0x5f3759df) | 0;
  const irThresh = irLevel === 0 ? 0.35 : (irLevel === 1 ? 0.72 : 0.92);
  const irScale = irLevel === 0 ? 1.0 : (irLevel === 1 ? 0.65 : 0.35);
  const invSpan = 1 / (1 - irThresh);
  const tickMod = simTick % 86400;
  let interferenceDotsInjected = 0;

  for (let arm = 0; arm < 6; arm++) {
    const baseAz = (arm * 60 + tickMod * 23 + Math.floor(noise01(irSeed, arm, tickMod) * 37)) % 360;
    const curve = 0.45 + (arm % 3) * 0.28;
    const step = 2 + (arm % 2);
    const startBin = 4 + (arm * 3) % 7;

    for (let b = startBin; b < POLAR_NUM_RANGE_BINS; b += step) {
      const az = ((Math.round(baseAz + b * curve) % 360) + 360) % 360;
      const u = noise01(irSeed, arm * 997 + b, tickMod * 13 + az);
      if (u > irThresh) {
        interferenceDotsInjected++;
        const amp = (0.45 + 0.55 * ((u - irThresh) * invSpan)) * irScale * gainScale;
        const ac = amp < 0.99 ? amp : 0.99;
        const irLvl = ((ac - 0.09) * QUANT_SLOPE + 1) | 0;
        const idx = az * POLAR_NUM_RANGE_BINS + b;
        const old = grid[idx];
        if (irLvl > old) {
          grid[idx] = irLvl;
          if (b + 1 > rowMaxGridBin[az]) rowMaxGridBin[az] = b + 1;
          const diff = irLvl - old;
          acc.totalEnergy += diff;
          if (b < nearMaxBin) acc.nearClutterEnergy += diff;
          if (old === 0) acc.nonZeroBins++;
          if (irLvl > acc.maxLevel) acc.maxLevel = irLvl;
        }
      }
    }
  }

  return interferenceDotsInjected;
}

function processWordSpanLE(ps32, g32, lutMeta, pOff, rOff, nOff, wStart, wEnd, maxIn) {
  let acc = 0;
  let binSum = 0;
  let maxL = maxIn;
  for (let w = wStart; w < wEnd; w++) {
    const pw = ps32[pOff + w];
    const cw = ps32[rOff + w];
    const nw = ps32[nOff + w];
    const any = pw | cw | nw;
    if (any === 0) continue;
    if ((any & 0x06060606) === 0) {
      // Exact SWAR identity across AVG1/AVG2/PEAK for all (p, c, n) in {0, 1}^3
      const outW = cw & (pw | nw);
      g32[rOff + w] = outW;
      binSum += outW;
      continue;
    }
    const idx02 = ((pw & 0x00070007) << 6) | ((cw & 0x00070007) << 3) | (nw & 0x00070007);
    const p13 = (pw >>> 8) & 0x00070007;
    const c13 = (cw >>> 8) & 0x00070007;
    const n13 = (nw >>> 8) & 0x00070007;
    const idx13 = (p13 << 6) | (c13 << 3) | n13;
    const m0 = lutMeta[idx02 & 511];
    const m1 = lutMeta[idx13 & 511];
    const m2 = lutMeta[idx02 >>> 16];
    const m3 = lutMeta[idx13 >>> 16];
    const l0 = m0 & 7;
    const l1 = m1 & 7;
    const l2 = m2 & 7;
    const l3 = m3 & 7;
    g32[rOff + w] = l0 | (l1 << 8) | (l2 << 16) | (l3 << 24);
    acc += m0 + m1 + m2 + m3;
    if (maxL < 7) {
      if (l0 > maxL) maxL = l0;
      if (l1 > maxL) maxL = l1;
      if (l2 > maxL) maxL = l2;
      if (l3 > maxL) maxL = l3;
    }
  }
  if (binSum !== 0) {
    const bCount = (binSum & 255) + ((binSum >>> 8) & 255) + ((binSum >>> 16) & 255) + (binSum >>> 24);
    acc += bCount + (bCount << 12);
    if (maxL === 0) maxL = 1;
  }
  return acc | (maxL << 24);
}

function passProcessLutLE(grid, processLevel, nearMaxBin) {
  const lutMeta = PROCESS_META_LUTS[processLevel];
  const g32 = new Uint32Array(grid.buffer);
  const ps32 = procScratch32;
  let maxLevel = 0;
  let nonZeroBins = 0;
  let totalEnergy = 0;
  let nearClutterEnergy = 0;

  for (let az = 0; az < POLAR_NUM_AZIMUTHS; az++) {
    const prevAz = az === 0 ? POLAR_NUM_AZIMUTHS - 1 : az - 1;
    const nextAz = az === POLAR_NUM_AZIMUTHS - 1 ? 0 : az + 1;
    let rowLimit = rowMaxGridBin[az];
    const pMax = rowMaxGridBin[prevAz];
    const nMax = rowMaxGridBin[nextAz];
    if (pMax > rowLimit) rowLimit = pMax;
    if (nMax > rowLimit) rowLimit = nMax;
    if (rowLimit === 0) continue;

    const prevOff = prevAz * POLAR_NUM_RANGE_BINS;
    const rowOff = az * POLAR_NUM_RANGE_BINS;
    const nextOff = nextAz * POLAR_NUM_RANGE_BINS;
    const prevOff32 = prevAz * 40;
    const rowOff32 = az * 40;
    const nextOff32 = nextAz * 40;
    const nearEnd = rowLimit < nearMaxBin ? rowLimit : nearMaxBin;
    const nearWords = nearEnd >>> 2;
    const fullWords = rowLimit >>> 2;

    if (nearWords > 0) {
      const res = processWordSpanLE(ps32, g32, lutMeta, prevOff32, rowOff32, nextOff32, 0, nearWords, maxLevel);
      const e = res & 0xFFF;
      totalEnergy += e;
      nearClutterEnergy += e;
      nonZeroBins += (res >>> 12) & 0xFFF;
      maxLevel = res >>> 24;
    }

    const nearTailStart = nearWords << 2;
    if (nearWords < fullWords) {
      const res = processWordSpanLE(ps32, g32, lutMeta, prevOff32, rowOff32, nextOff32, nearWords, fullWords, maxLevel);
      totalEnergy += res & 0xFFF;
      nonZeroBins += (res >>> 12) & 0xFFF;
      maxLevel = res >>> 24;
      for (let b = nearTailStart; b < nearEnd; b++) {
        nearClutterEnergy += grid[rowOff + b];
      }
      const farTailStart = fullWords << 2;
      for (let b = farTailStart; b < rowLimit; b++) {
        const m = lutMeta[(procScratch[prevOff + b] << 6) | (procScratch[rowOff + b] << 3) | procScratch[nextOff + b]];
        const lvl = m & 7;
        grid[rowOff + b] = lvl;
        totalEnergy += lvl;
        nonZeroBins += m >>> 12;
        if (lvl > maxLevel) maxLevel = lvl;
      }
    } else {
      for (let b = nearTailStart; b < nearEnd; b++) {
        const m = lutMeta[(procScratch[prevOff + b] << 6) | (procScratch[rowOff + b] << 3) | procScratch[nextOff + b]];
        const lvl = m & 7;
        grid[rowOff + b] = lvl;
        totalEnergy += lvl;
        nearClutterEnergy += lvl;
        nonZeroBins += m >>> 12;
        if (lvl > maxLevel) maxLevel = lvl;
      }
      for (let b = nearEnd; b < rowLimit; b++) {
        const m = lutMeta[(procScratch[prevOff + b] << 6) | (procScratch[rowOff + b] << 3) | procScratch[nextOff + b]];
        const lvl = m & 7;
        grid[rowOff + b] = lvl;
        totalEnergy += lvl;
        nonZeroBins += m >>> 12;
        if (lvl > maxLevel) maxLevel = lvl;
      }
    }
  }

  return { maxLevel, nonZeroBins, totalEnergy, nearClutterEnergy };
}

function passProcessLutBE(grid, processLevel, nearMaxBin) {
  const lutMeta = PROCESS_META_LUTS[processLevel];
  let maxLevel = 0;
  let nonZeroBins = 0;
  let totalEnergy = 0;
  let nearClutterEnergy = 0;

  for (let az = 0; az < POLAR_NUM_AZIMUTHS; az++) {
    const prevAz = az === 0 ? POLAR_NUM_AZIMUTHS - 1 : az - 1;
    const nextAz = az === POLAR_NUM_AZIMUTHS - 1 ? 0 : az + 1;
    let rowLimit = rowMaxGridBin[az];
    const pMax = rowMaxGridBin[prevAz];
    const nMax = rowMaxGridBin[nextAz];
    if (pMax > rowLimit) rowLimit = pMax;
    if (nMax > rowLimit) rowLimit = nMax;
    if (rowLimit === 0) continue;

    const prevOff = prevAz * POLAR_NUM_RANGE_BINS;
    const rowOff = az * POLAR_NUM_RANGE_BINS;
    const nextOff = nextAz * POLAR_NUM_RANGE_BINS;
    const nearEnd = rowLimit < nearMaxBin ? rowLimit : nearMaxBin;

    for (let b = 0; b < nearEnd; b++) {
      const m = lutMeta[(procScratch[prevOff + b] << 6) | (procScratch[rowOff + b] << 3) | procScratch[nextOff + b]];
      const lvl = m & 7;
      grid[rowOff + b] = lvl;
      totalEnergy += lvl;
      nearClutterEnergy += lvl;
      nonZeroBins += m >>> 12;
      if (lvl > maxLevel) maxLevel = lvl;
    }
    for (let b = nearEnd; b < rowLimit; b++) {
      const m = lutMeta[(procScratch[prevOff + b] << 6) | (procScratch[rowOff + b] << 3) | procScratch[nextOff + b]];
      const lvl = m & 7;
      grid[rowOff + b] = lvl;
      totalEnergy += lvl;
      nonZeroBins += m >>> 12;
      if (lvl > maxLevel) maxLevel = lvl;
    }
  }

  return { maxLevel, nonZeroBins, totalEnergy, nearClutterEnergy };
}

const passProcessLut = IS_LITTLE_ENDIAN ? passProcessLutLE : passProcessLutBE;

/**
 * Evaluates a pure deterministic 360 x 160 8-level polar radar echo grid.
 *
 * Rain override contract (strictly monotonic, zero discontinuity):
 * - `rainIntensityOverride`: normalized `[0, 1]` (`null`/`undefined`/`< 0` = scenario default;
 *   values `> 1` clamp monotonically to `1`).
 * - `rainPercentOverride`: D15 instructor slider percentage `[0, 100]` (`null`/`undefined`/`< 0` = unused;
 *   mapped monotonically via `clamp(rainPercentOverride, 0, 100) / 100` when `rainIntensityOverride` is absent).
 */
export function evaluatePolarEchoGrid(params = {}) {
  const safeParams = params && typeof params === "object" ? params : {};
  const scenario = safeParams.scenario ?? null;
  const maritimeBus = safeParams.maritimeBus ?? null;
  const weather = safeParams.weather ?? scenario?.weather ?? null;
  const landmasses = safeParams.landmasses ?? scenario?.landmasses ?? EMPTY_LANDMASSES;
  const buoys = safeParams.buoys ?? scenario?.buoys ?? [];
  const radarContacts = safeParams.radarContacts ?? maritimeBus?.radarContacts ?? [];
  const aisTargets = safeParams.aisTargets ?? maritimeBus?.aisTargets ?? [];
  const scenarioTraffic = scenario?.traffic ?? [];

  const ownship = safeParams.ownship ??
    maritimeBus?.ownship ??
    scenario?.ownship ??
    scenario?.syntheticOwnship ??
    { lat: 10.5, lon: 106.75, hdgDeg: 0, cogDeg: 0, sogKn: 0 };
  const hasOwnshipObj = Boolean(ownship && typeof ownship === "object");
  const ownLatVal = hasOwnshipObj ? finiteOr(ownship.lat, 10.5) : 10.5;
  const ownLonVal = hasOwnshipObj ? finiteOr(ownship.lon, 106.75) : 106.75;
  const ownshipSnap = hasOwnshipObj ? { lat: ownLatVal, lon: ownLonVal } : null;

  const rawRange = safeParams.rangeNm;
  const rangeNm = typeof rawRange === "number" && Number.isFinite(rawRange) && rawRange > 0
    ? clamp(rawRange, 0.0625, 64)
    : 6;
  const binWidthNm = rangeNm / POLAR_NUM_RANGE_BINS;
  const invBinWidth = POLAR_NUM_RANGE_BINS / rangeNm;
  const edgeMarginNm = Math.min(0.05, 0.75 * binWidthNm);

  const gain = clamp(finiteOr(safeParams.gain, 55), 0, 100);
  const subGain = clamp(finiteOr(safeParams.subGain, 0), -50, 50);
  const effGain = clamp(gain + subGain, 0, 100);
  const stc = clamp(finiteOr(safeParams.stc, 0), 0, 100);
  const stcCurve = clamp(Math.round(finiteOr(safeParams.stcCurve, 4)), 1, 8);
  const ftc = clamp(finiteOr(safeParams.ftc, 0), 0, 8);
  const irLevel = normalizeIr(safeParams.ir);
  const expLevel = normalizeExpLevel(safeParams.exp);
  const expParams = EXP_TABLE[expLevel];
  const effectivePw = normalizePw(safeParams.pw, rangeNm);
  const pwParams = PW_TABLE[effectivePw];
  const processLevel = normalizeProcessLevel(safeParams.process);

  const hasSeaOverride = typeof safeParams.seaStateOverride === "number" &&
    Number.isFinite(safeParams.seaStateOverride) &&
    safeParams.seaStateOverride >= 0;
  const effectiveSeaState = hasSeaOverride
    ? clamp(safeParams.seaStateOverride, 0, 6)
    : clamp(finiteOr(weather?.seaState, 0), 0, 6);

  const hasRainOverride = typeof safeParams.rainIntensityOverride === "number" &&
    Number.isFinite(safeParams.rainIntensityOverride) &&
    safeParams.rainIntensityOverride >= 0;
  const hasRainPercentOverride = typeof safeParams.rainPercentOverride === "number" &&
    Number.isFinite(safeParams.rainPercentOverride) &&
    safeParams.rainPercentOverride >= 0;
  const rainOverrideVal = hasRainOverride
    ? clamp(safeParams.rainIntensityOverride, 0, 1)
    : (hasRainPercentOverride ? clamp(safeParams.rainPercentOverride, 0, 100) / 100 : null);

  const windDirDeg = normalizeDeg360(finiteOr(weather?.windDirDeg, 90));
  const windDirRad = windDirDeg * DEG_TO_RAD;
  const interferenceSource = safeParams.interferenceSource !== undefined
    ? Boolean(safeParams.interferenceSource)
    : Boolean(weather?.interferenceSource);

  const rawTick = safeParams.simTick ?? maritimeBus?.simTick ?? 0;
  const simTick = typeof rawTick === "number" && Number.isFinite(rawTick)
    ? Math.max(0, Math.floor(rawTick))
    : 0;

  const rawSeed = safeParams.seed ?? scenario?.seed ?? 2060;
  const intSeed = typeof rawSeed === "number" && Number.isFinite(rawSeed)
    ? Math.trunc(rawSeed)
    : 2060;
  const baseSeed = streamSeed(intSeed, MDC2060_NOISE_STREAM);
  const { seaCoh: seaCohTbl, thermal: thermalTbl } = getNoiseTables(baseSeed);

  const grid = new Uint8Array(TOTAL_BINS);
  const shadowMask = new Uint8Array(TOTAL_BINS);
  // ifBuf is maintained all-zero across calls via sparse clearing inside Stage 5;
  // recover with a full zero-fill if a prior call threw mid-pipeline before Stage 5.
  if (ifBufDirty) {
    ifBuf.fill(0);
    ifBufDirty = false;
  }
  rowMinBin.fill(POLAR_NUM_RANGE_BINS);
  rowMaxBin.fill(0);
  rowMaxGridBin.fill(0);
  rowHasRain.fill(0);
  rowRainMinBin.fill(POLAR_NUM_RANGE_BINS);
  rowSeaEndBin.fill(0);

  const gainScale = effGain > 0 ? Math.pow(effGain / 55, 1.15) : 0;
  const gNorm = effGain / 100;
  const noiseAmp = effGain > 0
    ? 0.03 * gNorm + 0.44 * Math.pow(Math.max(0, (gNorm - 0.50) / 0.50), 1.9)
    : 0;
  const hasThermal = noiseAmp >= 0.035;

  const stcAmp = (stc / 100) * 1.38;
  const rStc = 1.05 + 0.24 * (stcCurve - 1);
  const invRStc = 1 / rStc;
  const seaAmpBase = effectiveSeaState <= 0
    ? 0
    : (0.10 * effectiveSeaState + 0.014 * effectiveSeaState * effectiveSeaState);
  const rSea = 0.35 + 0.26 * effectiveSeaState;
  const invRSea = 1 / rSea;
  const landDecayNm = Math.max(0.22, rangeNm * 0.07);
  const invLandDecay = 1 / landDecayNm;

  let maxSeaBin = 0;
  if (rangeNm === cachedLutRangeNm &&
      stcAmp === cachedLutStcAmp &&
      invRStc === cachedLutInvRStc &&
      seaAmpBase === cachedLutSeaAmpBase &&
      invRSea === cachedLutInvRSea &&
      gainScale === cachedLutGainScale) {
    maxSeaBin = cachedLutMaxSeaBin;
  } else {
    const halfGainScale = 0.5 * gainScale;
    for (let b = 0; b < POLAR_NUM_RANGE_BINS; b++) {
      const r = (b + 0.5) * binWidthNm;
      rangeLut[b] = r;
      const stcV = stcAmp > 0 ? stcAmp * Math.exp(-r * invRStc) : 0;
      stcLut[b] = stcV;
      stcRainLut[b] = 0.30 * stcV;
      stcGainLut[b] = stcV * gainScale;
      stcGainHalfLut[b] = stcV * halfGainScale;
      const seaDecay = seaAmpBase > 0 ? Math.exp(-r * invRSea) : 0;
      seaDecayLut[b] = seaDecay;
      seaDecayGainLut[b] = seaDecay * gainScale;
      seaDecayGainHalfLut[b] = seaDecay * halfGainScale;
      if (seaAmpBase > 0 && seaAmpBase * 1.35 * seaDecay > stcV + SEA_CUTOFF) {
        maxSeaBin = b + 1;
      }
      landDecayLut[b] = 0.24 + 0.62 * Math.exp(-(b * binWidthNm) * invLandDecay);
    }
    cachedLutRangeNm = rangeNm;
    cachedLutStcAmp = stcAmp;
    cachedLutInvRStc = invRStc;
    cachedLutSeaAmpBase = seaAmpBase;
    cachedLutInvRSea = invRSea;
    cachedLutGainScale = gainScale;
    cachedLutMaxSeaBin = maxSeaBin;
    lutRevision++;
  }

  // Stage 1: Land & Island Ray-Casting + Radar Shadow (pure cache for deeply-frozen landmasses)
  const landSeed = (baseSeed ^ 0x13579bdf) | 0;
  const writeIf = effGain > 0;
  let polys;
  let landBins;
  let shadowedBins;
  let activeLandVer;

  if (hasOwnshipObj &&
      cachedLandRef !== null &&
      landmasses === cachedLandRef &&
      ownLatVal === cachedLandOwnLat &&
      ownLonVal === cachedLandOwnLon &&
      rangeNm === cachedLandRangeNm &&
      landSeed === cachedLandSeed &&
      stcAmp === cachedLandStcAmp &&
      invRStc === cachedLandInvRStc &&
      (!writeIf || cachedLandHasIf)) {
    if (writeIf) ifBufDirty = true;
    restoreCachedLand(shadowMask, writeIf);
    polys = cachedLandPolys;
    landBins = cachedLandBins;
    shadowedBins = cachedShadowedBins;
    activeLandVer = cachedLandVersion;
  } else {
    const canCacheLand = hasOwnshipObj && isDeeplyFrozenLandmasses(landmasses);
    polys = projectPolygons(ownshipSnap, landmasses);
    if (writeIf) ifBufDirty = true;
    const landRes = passLand(polys, rangeNm, invBinWidth, landSeed, shadowMask, writeIf);
    landBins = landRes.landBins;
    shadowedBins = landRes.shadowedBins;
    activeLandVer = ++nextLandVersion;
    if (canCacheLand) {
      snapshotCachedLand(
        landmasses, ownLatVal, ownLonVal, rangeNm, landSeed, stcAmp, invRStc,
        polys, shadowMask, landBins, shadowedBins, writeIf, activeLandVer
      );
    }
  }

  // Stage 2: Wind-Advected Rain Squall Cells (runs before sea preparation so
  // rain-hit rows blend exact sea+rain while non-rain rows fuse sea into Stage 5)
  const baseSqualls = Array.isArray(weather?.rainSqualls) ? weather.rainSqualls : [];
  let activeSqualls = [];
  let effectiveRainIntensity = 0;

  if (rainOverrideVal === 0) {
    activeSqualls = [];
    effectiveRainIntensity = 0;
  } else if (rainOverrideVal !== null && rainOverrideVal > 0) {
    effectiveRainIntensity = rainOverrideVal;
    const validBaseSqualls = baseSqualls.filter(
      sq => sq && typeof sq === "object" && Number.isFinite(sq.lat) && Number.isFinite(sq.lon)
    );
    if (validBaseSqualls.length > 0) {
      activeSqualls = validBaseSqualls.map(sq => ({ sq, intensity: rainOverrideVal }));
    } else {
      const synthDrift = finiteOr(weather?.windSpeedKn, 6 + effectiveSeaState * 2.5);
      activeSqualls = [{
        sq: buildSyntheticUpwindSquall(ownLatVal, ownLonVal, windDirDeg, rainOverrideVal, synthDrift),
        intensity: rainOverrideVal,
      }];
    }
  } else {
    for (let i = 0; i < baseSqualls.length; i++) {
      const sq = baseSqualls[i];
      if (!sq || typeof sq !== "object" || !Number.isFinite(sq.lat) || !Number.isFinite(sq.lon)) continue;
      const inten = clamp(finiteOr(sq.intensity, 0.5), 0, 1);
      if (inten > 0) {
        activeSqualls.push({ sq, intensity: inten });
        if (inten > effectiveRainIntensity) effectiveRainIntensity = inten;
      }
    }
  }

  let activeRainCells = 0;
  if (activeSqualls.length > 0 && effGain > 0) {
    const rainSeed = (baseSeed ^ 0x31415926) | 0;
    activeRainCells = passRainSqualls(
      activeSqualls, ownLatVal, ownLonVal, weather, effectiveSeaState, windDirDeg,
      rangeNm, binWidthNm, invBinWidth, simTick, rainSeed
    );
  }

  // Stage 3: Prepare Sea Clutter & STC (uniform SEA_CUTOFF across all azimuths;
  // fused directly in registers inside Stage 5, materialized only on target-bearing rows)
  const seaTickHash = Math.imul(simTick + 1, 0x27d4eb2d);
  if (seaAmpBase > 0 && maxSeaBin > 0 && effGain > 0) {
    if (seaAmpBase === cachedSeaAmpBase &&
        maxSeaBin === cachedSeaMaxBin &&
        windDirRad === cachedSeaWindDirRad &&
        lutRevision === cachedSeaLutRev &&
        activeLandVer === cachedSeaLandVer) {
      rowSeaEndBin.set(cachedRowSeaEndBin);
      rowSeaAmp.set(cachedRowSeaAmp);
    } else {
      prepareSeaClutterRows(seaAmpBase, maxSeaBin, windDirRad);
      cachedRowSeaEndBin.set(rowSeaEndBin);
      cachedRowSeaAmp.set(rowSeaAmp);
      cachedSeaAmpBase = seaAmpBase;
      cachedSeaMaxBin = maxSeaBin;
      cachedSeaWindDirRad = windDirRad;
      cachedSeaLutRev = lutRevision;
      cachedSeaLandVer = activeLandVer;
    }
  }

  // Stage 4: Vessel & Buoy Echo Synthesis
  const aisByContactId = aisTargets.length > 0 ? new Map() : null;
  if (aisByContactId) {
    for (let i = 0; i < aisTargets.length; i++) {
      const a = aisTargets[i];
      if (a) {
        const mmsi = a.mmsi;
        if (typeof mmsi === "string" || (typeof mmsi === "number" && Number.isFinite(mmsi))) {
          aisByContactId.set(`tgt-${mmsi}`, a);
        }
      }
    }
  }
  const trafficByContactId = !aisByContactId && scenarioTraffic.length > 0 ? new Map() : null;
  if (trafficByContactId) {
    for (let i = 0; i < scenarioTraffic.length; i++) {
      const t = scenarioTraffic[i];
      if (t) {
        const mmsi = t.mmsi;
        if (typeof mmsi === "string" || (typeof mmsi === "number" && Number.isFinite(mmsi))) {
          trafficByContactId.set(`tgt-${mmsi}`, t);
        }
      }
    }
  }

  let renderedContacts = 0;
  let occludedContacts = 0;
  let renderedBuoys = 0;

  for (let i = 0; i < radarContacts.length; i++) {
    const c = radarContacts[i];
    if (!c || !Number.isFinite(c.rangeNm) || !Number.isFinite(c.bearingDeg)) continue;
    const aisInfo = aisByContactId?.get(c.contactId) ?? trafficByContactId?.get(c.contactId) ?? null;
    const rcs = Math.max(1, finiteOr(c.rcsSqm, finiteOr(aisInfo?.rcsSqm, 100)));
    const fallbackLen = clamp(8 * Math.pow(rcs, 0.38), 8, 220);
    const lengthM = Math.max(0, finiteOr(c.lengthM, finiteOr(aisInfo?.lengthM, fallbackLen)));
    const beamM = Math.max(0, finiteOr(c.beamM, finiteOr(aisInfo?.beamM, 0.18 * lengthM)));
    const hdgDeg = finiteOr(c.hdgDeg, finiteOr(aisInfo?.hdgDeg, c.bearingDeg));
    const res = paintTargetEcho(
      c.bearingDeg, c.rangeNm, rcs, lengthM, beamM, hdgDeg,
      rangeNm, edgeMarginNm, invBinWidth, pwParams, expParams, polys, shadowMask, effGain, gainScale,
      seaCohTbl, seaTickHash
    );
    if (res > 0) {
      renderedContacts++;
      if (res === 2) occludedContacts++;
    }
  }

  if (Array.isArray(buoys) && buoys.length > 0) {
    const ownLat = ownLatVal;
    const ownLon = ownLonVal;
    for (let i = 0; i < buoys.length; i++) {
      const buoy = buoys[i];
      if (!buoy || !Number.isFinite(buoy.lat) || !Number.isFinite(buoy.lon)) continue;
      const meanLatRad = ((ownLat + buoy.lat) * 0.5) * DEG_TO_RAD;
      const cosLat = Math.max(0.1, Math.cos(meanLatRad));
      const dy = (buoy.lat - ownLat) * 60;
      const dx = wrapLon180(buoy.lon - ownLon) * 60 * cosLat;
      const rNm = Math.hypot(dx, dy);
      if (rNm <= 1e-4 || rNm > rangeNm + edgeMarginNm) continue;
      const azDeg = normalizeDeg360(Math.atan2(dx, dy) * RAD_TO_DEG);
      const rcs = finiteOr(buoy.rcsSqm, 20);
      const lengthM = Math.max(0, finiteOr(buoy.lengthM, 3));
      const beamM = Math.max(0, finiteOr(buoy.beamM, 3));
      const res = paintTargetEcho(
        azDeg, rNm, rcs, lengthM, beamM, azDeg,
        rangeNm, edgeMarginNm, invBinWidth, pwParams, expParams, polys, shadowMask, effGain, gainScale,
        seaCohTbl, seaTickHash
      );
      if (res > 0) renderedBuoys++;
    }
  }

  let acc = { maxLevel: 0, nonZeroBins: 0, totalEnergy: 0, nearClutterEnergy: 0 };
  let interferenceDotsInjected = 0;
  const nearMaxBin = Math.min(POLAR_NUM_RANGE_BINS, Math.ceil((2.5 / rangeNm) * POLAR_NUM_RANGE_BINS));

  if (effGain > 0) {
    // Stage 5: Fused Sea + Rain + FTC + GAIN + Thermal Noise + 8-Level Quantization
    const useProc = processLevel > 0;
    const stage5Dst = useProc ? procScratch : grid;
    const hasFtc = ftc > 0;
    const ftcNorm = ftc / 8;
    const ftcMix = hasFtc ? (1 - Math.pow(1 - ftcNorm, 1.75)) : 0;
    const ftcAlpha = 0.14 + 0.14 * ftcNorm;
    const thermalTickHash = Math.imul(simTick + 7, 0x3c6ef372);

    if (!hasThermal) {
      if (useProc) {
        if (procScratchDirty) procScratch.fill(0);
        procScratchDirty = true;
      }
      if (!hasFtc) {
        acc = quantizeNoFtcNoThermal(stage5Dst, gainScale, nearMaxBin, seaCohTbl, seaTickHash);
      } else {
        acc = quantizeFtcNoThermal(stage5Dst, gainScale, ftcMix, ftcAlpha, nearMaxBin, seaCohTbl, seaTickHash);
      }
    } else if (!hasFtc) {
      if (useProc) {
        acc = quantizeNoFtcThermalNoStats(
          stage5Dst, gainScale, stcAmp > 0, noiseAmp, thermalTbl, thermalTickHash, seaCohTbl, seaTickHash
        );
      } else {
        acc = quantizeNoFtcThermal(
          stage5Dst, gainScale, noiseAmp, thermalTbl, thermalTickHash, nearMaxBin, seaCohTbl, seaTickHash
        );
      }
    } else {
      acc = quantizeFtcThermal(
        stage5Dst, gainScale, ftcMix, ftcAlpha, noiseAmp, thermalTbl, thermalTickHash,
        nearMaxBin, seaCohTbl, seaTickHash, useProc
      );
    }
    ifBufDirty = false;

    // Stage 6: Spiral Radar-to-Radar Interference & IR
    if (interferenceSource && irLevel < 3) {
      interferenceDotsInjected = patchInterferenceOnGrid(
        stage5Dst, baseSeed, simTick, irLevel, gainScale, nearMaxBin, acc
      );
    }

    // Stage 7: PROCESS Azimuthal Correlation Filter
    if (useProc) {
      acc = passProcessLut(grid, processLevel, nearMaxBin);
    }
  }

  return {
    numAzimuths: POLAR_NUM_AZIMUTHS,
    numRangeBins: POLAR_NUM_RANGE_BINS,
    rangeNm,
    grid,
    shadowMask,
    stats: {
      maxLevel: acc.maxLevel,
      nonZeroBins: acc.nonZeroBins,
      totalEnergy: acc.totalEnergy,
      nearClutterEnergy: acc.nearClutterEnergy,
      shadowedBins,
      landBins,
      renderedContacts,
      occludedContacts,
      renderedBuoys,
      activeRainCells,
      interferenceDotsInjected,
      effectiveSeaState,
      effectiveRainIntensity,
      effectivePw,
      effectiveGain: effGain,
    },
  };
}
