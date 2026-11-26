/**
 * KODEN MDC-2060 Marine Radar — Deterministic 2D Maritime Training Scenarios.
 *
 * Compatible with src/core/maritime-world.mjs (initialMaritimeWorldState,
 * advanceMaritimeWorld, projectMaritimeSensorBus) and src/core/scenario.mjs
 * (observeTrainingStatus, fingerprint) without modifying DEFAULT_BRIDGE_WORLD_SCENARIO.
 *
 * Training-only synthetic coordinates; not for shipboard navigation.
 */
import { DEFAULT_BRIDGE_WORLD_SCENARIO } from "../../core/maritime-world.mjs";
import { fingerprint } from "../../core/protocol.mjs";

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

const cleanZero = v => (Object.is(v, -0) ? 0 : v);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round3 = v => cleanZero(Math.round(v * 1e3) / 1e3);
const round6 = v => cleanZero(Math.round(v * 1e6) / 1e6);

function normalizeDeg360(deg) {
  if (typeof deg !== "number" || !Number.isFinite(deg)) return 0;
  const mod = deg % 360;
  const res = mod < 0 ? mod + 360 : mod;
  return res >= 360 ? 0 : cleanZero(res);
}

function roundDeg360(deg) {
  return normalizeDeg360(round3(normalizeDeg360(deg)));
}

function wrapLon180(lon) {
  if (typeof lon !== "number" || !Number.isFinite(lon)) return 0;
  if (lon >= -180 && lon <= 180) return cleanZero(lon);
  return cleanZero(((((lon + 180) % 360) + 360) % 360) - 180);
}

export const MDC2060_COASTAL_SCENARIO = deepFreeze({
  id: "mdc2060-coastal-approach",
  version: 1,
  seed: 2060,
  label: "Luồng hàng hải ven biển Vũng Tàu — Tiếp cận cảng",
  bottomDepthM: 28.5,
  bottomVariationM: 3.2,
  fish: [],
  syntheticOwnship: {
    lat: 10.32,
    lon: 107.02,
    speedKn: 10.5,
    courseDeg: 90.0,
    temperatureC: 27.5,
  },
  bottomClassification: {
    sourceClass: "SYNTHETIC_FIXTURE",
    classes: { Mud: 0.35, Sand: 0.45, Gravel: 0.15, Rock: 0.05 },
  },
  ownship: {
    mmsi: "574001588",
    name: "MV BIEN DONG 01",
    callSign: "3WBD1",
    lat: 10.32,
    lon: 107.02,
    sogKn: 10.5,
    stwKn: 10.2,
    cogDeg: 90.0,
    hdgDeg: 89.0,
    rotDegPerMin: 0.0,
    rudderDeg: 0.0,
    waterTempC: 27.5,
    draftM: 4.2,
  },
  traffic: [
    {
      mmsi: "574002101",
      name: "PACIFIC STAR",
      callSign: "3WPS2",
      navStatus: 0,
      shipType: 70,
      lat: 10.295045,
      lon: 107.084296,
      sogKn: 13.5,
      cogDeg: 315.0,
      hdgDeg: 314.0,
      rotDegPerMin: 0.0,
      lengthM: 142,
      beamM: 22,
      rcsSqm: 1400,
    },
    {
      mmsi: "574009330",
      name: "HAI AU 18",
      callSign: "3WHA8",
      navStatus: 7,
      shipType: 30,
      lat: 10.30266,
      lon: 107.035869,
      sogKn: 6.2,
      cogDeg: 112.0,
      hdgDeg: 110.0,
      rotDegPerMin: 0.0,
      lengthM: 28,
      beamM: 7,
      rcsSqm: 85,
    },
    {
      mmsi: "574003812",
      name: "SAIGON EXPRESS",
      callSign: "3WSGE",
      navStatus: 0,
      shipType: 71,
      lat: 10.240195,
      lon: 107.014328,
      sogKn: 16.5,
      cogDeg: 90.0,
      hdgDeg: 89.0,
      rotDegPerMin: 0.0,
      lengthM: 185,
      beamM: 28,
      rcsSqm: 2200,
    },
    {
      mmsi: "574005204",
      name: "PHU QUOC FERRY",
      callSign: "3WPQF",
      navStatus: 0,
      shipType: 40,
      lat: 10.353861,
      lon: 107.064056,
      sogKn: 18.0,
      cogDeg: 122.0,
      hdgDeg: 121.0,
      rotDegPerMin: 0.0,
      lengthM: 62,
      beamM: 13,
      rcsSqm: 420,
    },
    {
      mmsi: "574007009",
      name: "VIETNAM TANKER 09",
      callSign: "3WVT9",
      navStatus: 1,
      shipType: 80,
      lat: 10.285853,
      lon: 106.992884,
      sogKn: 0.0,
      cogDeg: 0.0,
      hdgDeg: 140.0,
      rotDegPerMin: 0.0,
      lengthM: 120,
      beamM: 21,
      rcsSqm: 980,
    },
    {
      mmsi: "574008102",
      name: "SMALL PILOT 02",
      callSign: "3WPL2",
      navStatus: 0,
      shipType: 50,
      lat: 10.354258,
      lon: 107.004496,
      sogKn: 7.5,
      cogDeg: 104.0,
      hdgDeg: 103.0,
      rotDegPerMin: 0.0,
      lengthM: 16,
      beamM: 4.5,
      rcsSqm: 32,
    },
  ],
  landmasses: [
    {
      id: "coast-nw",
      name: "Mũi bờ Bắc-Tây Bắc",
      kind: "coastline",
      elevationM: 55,
      polygon: [
        { lat: 10.373333, lon: 106.904793 },
        { lat: 10.3675, lon: 106.938678 },
        { lat: 10.370833, lon: 106.970868 },
        { lat: 10.371667, lon: 106.997975 },
        { lat: 10.375833, lon: 107.023388 },
        { lat: 10.389167, lon: 107.038637 },
        { lat: 10.416667, lon: 107.043721 },
        { lat: 10.456667, lon: 107.030167 },
        { lat: 10.463333, lon: 106.977639 },
        { lat: 10.46, lon: 106.904777 },
        { lat: 10.41, lon: 106.892926 },
      ],
    },
    {
      id: "island-hon-ba",
      name: "Đảo Hòn Bà",
      kind: "island",
      elevationM: 38,
      polygon: [
        { lat: 10.349456, lon: 107.03271 },
        { lat: 10.348146, lon: 107.036518 },
        { lat: 10.350674, lon: 107.041031 },
        { lat: 10.356495, lon: 107.039725 },
        { lat: 10.357654, lon: 107.034693 },
        { lat: 10.353982, lon: 107.031558 },
      ],
    },
    {
      id: "island-hon-cau",
      name: "Đảo Hòn Cau",
      kind: "island",
      elevationM: 42,
      polygon: [
        { lat: 10.310839, lon: 106.989544 },
        { lat: 10.3161, lon: 106.987716 },
        { lat: 10.31872, lon: 106.982753 },
        { lat: 10.313534, lon: 106.978505 },
        { lat: 10.306869, lon: 106.981238 },
        { lat: 10.306764, lon: 106.986702 },
      ],
    },
  ],
  buoys: [
    {
      id: "buoy-ch-0",
      name: "Phao Luồng Số 0",
      buoyType: "safe-water",
      lat: 10.324291,
      lon: 107.051036,
      rcsSqm: 26,
    },
    {
      id: "buoy-turn-1",
      name: "Phao Rẽ Luồng",
      buoyType: "starboard",
      lat: 10.310937,
      lon: 107.067393,
      rcsSqm: 24,
    },
    {
      id: "buoy-headland",
      name: "Phao Mũi Đất",
      buoyType: "port",
      lat: 10.349553,
      lon: 106.986636,
      rcsSqm: 22,
    },
    {
      id: "buoy-shoal",
      name: "Phao Cạn Ngầm",
      buoyType: "isolated-danger",
      lat: 10.307525,
      lon: 106.960347,
      rcsSqm: 20,
    },
  ],
  weather: {
    seaState: 2,
    windDirDeg: 135,
    windSpeedKn: 10,
    rainSqualls: [
      {
        id: "squall-coastal-1",
        name: "Mây mưa ngoài khơi",
        lat: 10.346208,
        lon: 107.126848,
        radiusNm: 1.25,
        intensity: 0.45,
        driftKn: 5.0,
        driftDirDeg: 315.0,
      },
    ],
  },
});

export const MDC2060_STORM_SCENARIO = deepFreeze({
  id: "mdc2060-storm-clutter",
  version: 1,
  seed: 2061,
  label: "Mưa giông & Sóng cấp 5 — Luyện khử nhiễu STC / FTC / IR",
  bottomDepthM: 42.0,
  bottomVariationM: 4.5,
  fish: [],
  syntheticOwnship: {
    lat: 10.22,
    lon: 107.18,
    speedKn: 9.0,
    courseDeg: 90.0,
    temperatureC: 26.2,
  },
  bottomClassification: {
    sourceClass: "SYNTHETIC_FIXTURE",
    classes: { Mud: 0.2, Sand: 0.55, Gravel: 0.2, Rock: 0.05 },
  },
  ownship: {
    mmsi: "574001588",
    name: "MV BIEN DONG 01",
    callSign: "3WBD1",
    lat: 10.22,
    lon: 107.18,
    sogKn: 9.0,
    stwKn: 8.6,
    cogDeg: 90.0,
    hdgDeg: 89.0,
    rotDegPerMin: 0.0,
    rudderDeg: 0.0,
    waterTempC: 26.2,
    draftM: 4.2,
  },
  traffic: [
    {
      mmsi: "574004401",
      name: "MEKONG CONTAINER",
      callSign: "3WMKC",
      navStatus: 0,
      shipType: 71,
      lat: 10.233424,
      lon: 107.233547,
      sogKn: 14.0,
      cogDeg: 238.0,
      hdgDeg: 237.0,
      rotDegPerMin: 0.0,
      lengthM: 192,
      beamM: 28,
      rcsSqm: 2400,
    },
    {
      mmsi: "574009412",
      name: "BINH THUAN 09",
      callSign: "3WBT9",
      navStatus: 7,
      shipType: 30,
      lat: 10.205795,
      lon: 107.199866,
      sogKn: 5.0,
      cogDeg: 102.0,
      hdgDeg: 100.0,
      rotDegPerMin: 0.0,
      lengthM: 24,
      beamM: 6.5,
      rcsSqm: 65,
    },
    {
      mmsi: "574006118",
      name: "COASTAL PATROL 04",
      callSign: "3WCP4",
      navStatus: 0,
      shipType: 55,
      lat: 10.267239,
      lon: 107.139719,
      sogKn: 12.0,
      cogDeg: 118.0,
      hdgDeg: 117.0,
      rotDegPerMin: 0.0,
      lengthM: 48,
      beamM: 9.5,
      rcsSqm: 260,
    },
    {
      mmsi: "574003990",
      name: "OCEAN BULKER",
      callSign: "3WOB0",
      navStatus: 0,
      shipType: 70,
      lat: 10.149165,
      lon: 107.160716,
      sogKn: 11.5,
      cogDeg: 92.0,
      hdgDeg: 91.0,
      rotDegPerMin: 0.0,
      lengthM: 155,
      beamM: 24,
      rcsSqm: 1500,
    },
  ],
  landmasses: [
    {
      id: "island-storm-shoal",
      name: "Đảo Côn Lôn Giả Lập",
      kind: "island",
      elevationM: 48,
      polygon: [
        { lat: 10.182083, lon: 107.113272 },
        { lat: 10.192525, lon: 107.107275 },
        { lat: 10.194506, lon: 107.100276 },
        { lat: 10.184749, lon: 107.099554 },
        { lat: 10.174957, lon: 107.106759 },
        { lat: 10.175265, lon: 107.112612 },
      ],
    },
  ],
  buoys: [
    {
      id: "buoy-storm-1",
      name: "Phao Luồng Bão 01",
      buoyType: "starboard",
      lat: 10.211526,
      lon: 107.199339,
      rcsSqm: 18,
    },
    {
      id: "buoy-storm-2",
      name: "Phao Luồng Bão 02",
      buoyType: "safe-water",
      lat: 10.198934,
      lon: 107.197961,
      rcsSqm: 22,
    },
    {
      id: "buoy-storm-3",
      name: "Phao Cảng Ngoài",
      buoyType: "port",
      lat: 10.186193,
      lon: 107.189204,
      rcsSqm: 20,
    },
  ],
  weather: {
    seaState: 5,
    windDirDeg: 120,
    windSpeedKn: 26,
    rainSqualls: [
      {
        id: "squall-storm-1",
        name: "Đám mưa giông phía trước",
        lat: 10.233424,
        lon: 107.233547,
        radiusNm: 1.35,
        intensity: 0.85,
        driftKn: 8.0,
        driftDirDeg: 300.0,
      },
      {
        id: "squall-storm-2",
        name: "Đám mưa giông mạn trái",
        lat: 10.267685,
        lon: 107.136369,
        radiusNm: 1.35,
        intensity: 0.85,
        driftKn: 8.0,
        driftDirDeg: 300.0,
      },
    ],
  },
});

// Strict reference equality to core bridge scenario — NEVER mutate.
export const MDC2060_BRIDGE_SYNC_SCENARIO = DEFAULT_BRIDGE_WORLD_SCENARIO;

export const MDC2060_SCENARIOS = Object.freeze([
  MDC2060_COASTAL_SCENARIO,
  MDC2060_STORM_SCENARIO,
  MDC2060_BRIDGE_SYNC_SCENARIO,
]);

export function getMdc2060ScenarioById(id) {
  if (typeof id !== "string" || id.length === 0) return null;
  return MDC2060_SCENARIOS.find(s => s.id === id) ?? null;
}

function isFiniteNum(v) {
  return typeof v === "number" && Number.isFinite(v);
}

export function createCustomOwnshipScenario(baseScenario = MDC2060_COASTAL_SCENARIO, overrides = {}) {
  const base = baseScenario ?? MDC2060_COASTAL_SCENARIO;
  if (!base || typeof base !== "object" || !base.id ||
      !Number.isInteger(base.version) || !Number.isInteger(base.seed)) {
    throw new TypeError("baseScenario must declare id, integer version, and integer seed");
  }

  const ov = overrides && typeof overrides === "object" && !Array.isArray(overrides)
    ? overrides
    : {};

  const srcOwn = base.ownship && typeof base.ownship === "object"
    ? base.ownship
    : {
        mmsi: "574001588",
        name: "MV BIEN DONG 01",
        callSign: "3WBD1",
        lat: isFiniteNum(base.syntheticOwnship?.lat) ? base.syntheticOwnship.lat : 10.5,
        lon: isFiniteNum(base.syntheticOwnship?.lon) ? base.syntheticOwnship.lon : 106.75,
        sogKn: isFiniteNum(base.syntheticOwnship?.speedKn) ? base.syntheticOwnship.speedKn : 0,
        stwKn: isFiniteNum(base.syntheticOwnship?.speedKn) ? base.syntheticOwnship.speedKn : 0,
        cogDeg: isFiniteNum(base.syntheticOwnship?.courseDeg) ? base.syntheticOwnship.courseDeg : 0,
        hdgDeg: isFiniteNum(base.syntheticOwnship?.courseDeg) ? base.syntheticOwnship.courseDeg : 0,
        rotDegPerMin: 0,
        rudderDeg: 0,
        waterTempC: isFiniteNum(base.syntheticOwnship?.temperatureC) ? base.syntheticOwnship.temperatureC : 18,
        draftM: 4.0,
      };

  const hasHdg = isFiniteNum(ov.hdgDeg);
  const hasCog = isFiniteNum(ov.cogDeg);
  const hasSog = isFiniteNum(ov.sogKn);
  const hasStw = isFiniteNum(ov.stwKn);

  const baseHdg = isFiniteNum(srcOwn.hdgDeg)
    ? srcOwn.hdgDeg
    : (isFiniteNum(srcOwn.headingDeg) ? srcOwn.headingDeg : 0);
  const baseCog = isFiniteNum(srcOwn.cogDeg)
    ? srcOwn.cogDeg
    : (isFiniteNum(srcOwn.courseDeg) ? srcOwn.courseDeg : 0);
  const baseSog = isFiniteNum(srcOwn.sogKn)
    ? srcOwn.sogKn
    : (isFiniteNum(srcOwn.speedKn) ? srcOwn.speedKn : 0);
  const baseRot = isFiniteNum(srcOwn.rotDegPerMin) ? srcOwn.rotDegPerMin : 0;
  const baseRudder = isFiniteNum(srcOwn.rudderDeg) ? srcOwn.rudderDeg : 0;
  const baseLat = isFiniteNum(srcOwn.lat) ? srcOwn.lat : 10.5;
  const baseLon = isFiniteNum(srcOwn.lon) ? srcOwn.lon : 106.75;
  const baseTemp = isFiniteNum(srcOwn.waterTempC) ? srcOwn.waterTempC : 18;
  const baseDraft = isFiniteNum(srcOwn.draftM) ? srcOwn.draftM : 4.0;

  const nextHdg = hasHdg ? roundDeg360(ov.hdgDeg) : roundDeg360(baseHdg);
  const nextCog = hasCog
    ? roundDeg360(ov.cogDeg)
    : (hasHdg ? nextHdg : roundDeg360(baseCog));
  const nextSog = hasSog ? round3(clamp(ov.sogKn, 0, 40)) : round3(clamp(baseSog, 0, 40));
  const baseStw = isFiniteNum(srcOwn.stwKn) ? srcOwn.stwKn : nextSog;
  const nextStw = hasStw
    ? round3(clamp(ov.stwKn, 0, 40))
    : (hasSog ? nextSog : round3(clamp(baseStw, 0, 40)));
  const nextRot = isFiniteNum(ov.rotDegPerMin)
    ? round3(clamp(ov.rotDegPerMin, -180, 180))
    : round3(clamp(baseRot, -180, 180));
  const nextRudder = isFiniteNum(ov.rudderDeg)
    ? round3(clamp(ov.rudderDeg, -35, 35))
    : round3(clamp(baseRudder, -35, 35));
  const nextLat = isFiniteNum(ov.lat)
    ? round6(clamp(ov.lat, -85, 85))
    : round6(clamp(baseLat, -85, 85));
  const nextLon = isFiniteNum(ov.lon)
    ? round6(wrapLon180(ov.lon))
    : round6(wrapLon180(baseLon));
  const nextTemp = isFiniteNum(ov.waterTempC)
    ? round3(clamp(ov.waterTempC, -2, 40))
    : round3(clamp(baseTemp, -2, 40));
  const nextDraft = isFiniteNum(ov.draftM)
    ? round3(clamp(ov.draftM, 0.5, 25))
    : round3(clamp(baseDraft, 0.5, 25));

  const nextOwnship = Object.freeze({
    mmsi: String(srcOwn.mmsi ?? "574001588"),
    name: String(srcOwn.name ?? "MV BIEN DONG 01"),
    callSign: String(srcOwn.callSign ?? "3WBD1"),
    lat: nextLat,
    lon: nextLon,
    sogKn: nextSog,
    stwKn: nextStw,
    cogDeg: nextCog,
    hdgDeg: nextHdg,
    rotDegPerMin: nextRot,
    rudderDeg: nextRudder,
    waterTempC: nextTemp,
    draftM: nextDraft,
  });

  const unchanged = Boolean(base.ownship) && Object.isFrozen(base) &&
    nextOwnship.lat === srcOwn.lat &&
    nextOwnship.lon === srcOwn.lon &&
    nextOwnship.sogKn === srcOwn.sogKn &&
    nextOwnship.stwKn === srcOwn.stwKn &&
    nextOwnship.cogDeg === srcOwn.cogDeg &&
    nextOwnship.hdgDeg === srcOwn.hdgDeg &&
    nextOwnship.rotDegPerMin === srcOwn.rotDegPerMin &&
    nextOwnship.rudderDeg === srcOwn.rudderDeg &&
    nextOwnship.waterTempC === srcOwn.waterTempC &&
    nextOwnship.draftM === srcOwn.draftM;

  if (unchanged) {
    return base;
  }

  const rootId = String(base.id).replace(/-custom-[0-9a-f]{8}$/, "");
  const suffix = fingerprint(nextOwnship).slice(-8);
  const nextSyntheticOwnship = Object.freeze({
    lat: nextOwnship.lat,
    lon: nextOwnship.lon,
    speedKn: nextOwnship.sogKn,
    courseDeg: nextOwnship.cogDeg,
    temperatureC: nextOwnship.waterTempC,
  });

  // Preserve exact own keys from base without introducing undefined properties.
  const derived = {
    ...base,
    id: `${rootId}-custom-${suffix}`,
    ownship: nextOwnship,
    syntheticOwnship: nextSyntheticOwnship,
  };

  return deepFreeze(derived);
}
