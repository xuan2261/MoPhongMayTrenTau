/**
 * Deterministic 2D multi-vessel maritime training world and internal NMEA-0183
 * sensor bus shared across bridge instruments (FCV-588, AIS R5, KODEN MDC-2060,
 * FURUNO FAR-2127, GPS, VHF DSC).
 *
 * Training-only kinematics; never connected to live shipboard navigation I/O.
 */
import {fingerprint, TICK_DURATION_MS} from "./protocol.mjs";
import {TRAINING_SCENARIO, bottomDepthAt} from "./scenario.mjs";

export const MARITIME_WORLD_VERSION = "maritime-2d-world-v1";
export const NMEA_BUS_CONTRACT_VERSION = "nmea0183-bridge-bus-v1";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const FEET_PER_METER = 3.280839895;
const FATHOMS_PER_METER = 0.546806649;

const round6 = value => Math.round(value * 1e6) / 1e6;
const round3 = value => Math.round(value * 1e3) / 1e3;
const normalizeDeg360 = deg => {
  const mod = deg % 360;
  return mod < 0 ? mod + 360 : (Object.is(mod, -0) ? 0 : mod);
};
const normalizeSignedDeg180 = deg => {
  const norm = normalizeDeg360(deg + 180) - 180;
  return Object.is(norm, -0) ? 0 : norm;
};
const wrapLon180 = lon => {
  if (lon >= -180 && lon <= 180) return lon;
  return ((((lon + 180) % 360) + 360) % 360) - 180;
};
const clampLat = lat => Math.max(-85, Math.min(85, lat));

export const DEFAULT_BRIDGE_WORLD_SCENARIO = Object.freeze({
  id: "bridge-coastal-traffic-001",
  version: 1,
  label: "Buồng lái đa máy — Luồng hàng hải ven biển",
  seed: 2026,
  syntheticOwnship: TRAINING_SCENARIO.syntheticOwnship,
  bottomClassification: TRAINING_SCENARIO.bottomClassification,
  bottomDepthM: TRAINING_SCENARIO.bottomDepthM,
  bottomVariationM: TRAINING_SCENARIO.bottomVariationM,
  fish: TRAINING_SCENARIO.fish,
  ownship: Object.freeze({
    mmsi: "574001588",
    name: "MV BIEN DONG 01",
    callSign: "3WBD1",
    lat: 10.5,
    lon: 106.75,
    sogKn: 7.0,
    stwKn: 6.8,
    cogDeg: 90.0,
    hdgDeg: 89.0,
    rotDegPerMin: 0.0,
    rudderDeg: 0.0,
    waterTempC: 18.0,
    draftM: 4.2,
  }),
  traffic: Object.freeze([
    Object.freeze({
      mmsi: "574002101",
      name: "PACIFIC STAR",
      callSign: "3WPS2",
      navStatus: 0,
      shipType: 70,
      lat: 10.525,
      lon: 106.82,
      sogKn: 11.5,
      cogDeg: 255.0,
      hdgDeg: 254.0,
      rotDegPerMin: 0.0,
      lengthM: 142,
      beamM: 22,
      rcsSqm: 1200,
    }),
    Object.freeze({
      mmsi: "574009330",
      name: "HAI AU 18",
      callSign: "3WHA8",
      navStatus: 7,
      shipType: 30,
      lat: 10.488,
      lon: 106.795,
      sogKn: 4.2,
      cogDeg: 340.0,
      hdgDeg: 338.0,
      rotDegPerMin: 0.0,
      lengthM: 28,
      beamM: 7,
      rcsSqm: 85,
    }),
  ]),
});

function resolveOwnshipSeed(scenario) {
  if (scenario?.ownship && typeof scenario.ownship === "object") {
    const o = scenario.ownship;
    return Object.freeze({
      mmsi: String(o.mmsi ?? "574001588"),
      name: String(o.name ?? "OWNSHIP"),
      callSign: String(o.callSign ?? "3W000"),
      lat: round6(Number(o.lat ?? 10.5)),
      lon: round6(Number(o.lon ?? 106.75)),
      sogKn: round3(Number(o.sogKn ?? 0)),
      stwKn: round3(Number(o.stwKn ?? o.sogKn ?? 0)),
      cogDeg: round3(normalizeDeg360(Number(o.cogDeg ?? 0))),
      hdgDeg: round3(normalizeDeg360(Number(o.hdgDeg ?? o.cogDeg ?? 0))),
      rotDegPerMin: round3(Number(o.rotDegPerMin ?? 0)),
      rudderDeg: round3(Number(o.rudderDeg ?? 0)),
      waterTempC: round3(Number(o.waterTempC ?? 18)),
      draftM: round3(Number(o.draftM ?? 4.0)),
    });
  }
  const s = scenario?.syntheticOwnship;
  return Object.freeze({
    mmsi: "574001588",
    name: "TRAINING VESSEL",
    callSign: "3WTRN",
    lat: round6(Number(s?.lat ?? 10.5)),
    lon: round6(Number(s?.lon ?? 106.75)),
    sogKn: round3(Number(s?.speedKn ?? 0)),
    stwKn: round3(Number(s?.speedKn ?? 0)),
    cogDeg: round3(normalizeDeg360(Number(s?.courseDeg ?? 0))),
    hdgDeg: round3(normalizeDeg360(Number(s?.courseDeg ?? 0))),
    rotDegPerMin: 0,
    rudderDeg: 0,
    waterTempC: round3(Number(s?.temperatureC ?? 18)),
    draftM: 3.5,
  });
}

function normalizeTargetRecord(target) {
  return Object.freeze({
    mmsi: String(target.mmsi),
    name: String(target.name ?? "UNKNOWN"),
    callSign: String(target.callSign ?? ""),
    navStatus: Number(target.navStatus ?? 0),
    shipType: Number(target.shipType ?? 0),
    lat: round6(Number(target.lat)),
    lon: round6(Number(target.lon)),
    sogKn: round3(Number(target.sogKn ?? 0)),
    cogDeg: round3(normalizeDeg360(Number(target.cogDeg ?? 0))),
    hdgDeg: round3(normalizeDeg360(Number(target.hdgDeg ?? target.cogDeg ?? 0))),
    rotDegPerMin: round3(Number(target.rotDegPerMin ?? 0)),
    lengthM: round3(Number(target.lengthM ?? 30)),
    beamM: round3(Number(target.beamM ?? 8)),
    rcsSqm: round3(Number(target.rcsSqm ?? 100)),
  });
}

function stepVesselKinematics(vessel, dtSeconds) {
  const dtHours = dtSeconds / 3600;
  const dtMinutes = dtSeconds / 60;
  const deltaHdg = (vessel.rotDegPerMin ?? 0) * dtMinutes;
  const nextCog = round3(normalizeDeg360(vessel.cogDeg + deltaHdg));
  const nextHdg = round3(normalizeDeg360(vessel.hdgDeg + deltaHdg));
  const meanCogRad = normalizeDeg360(vessel.cogDeg + deltaHdg * 0.5) * DEG_TO_RAD;
  const distanceNm = vessel.sogKn * dtHours;
  const nextLat = round6(clampLat(vessel.lat + (distanceNm * Math.cos(meanCogRad)) / 60));
  const cosLat = Math.max(0.1, Math.cos(((vessel.lat + nextLat) * 0.5) * DEG_TO_RAD));
  const nextLon = round6(wrapLon180(vessel.lon + (distanceNm * Math.sin(meanCogRad)) / (60 * cosLat)));
  return {
    ...vessel,
    lat: nextLat,
    lon: nextLon,
    cogDeg: nextCog,
    hdgDeg: nextHdg,
  };
}

export function initialMaritimeWorldState(scenario = DEFAULT_BRIDGE_WORLD_SCENARIO) {
  if (!scenario?.id || !Number.isInteger(scenario.version) || !Number.isInteger(scenario.seed)) {
    throw new TypeError("maritime scenario must declare id/version/integer seed");
  }
  const bottomDepthM = Number.isFinite(scenario.bottomDepthM)
    ? bottomDepthAt(scenario, 0)
    : 50;
  const traffic = Array.isArray(scenario.traffic)
    ? scenario.traffic.map(normalizeTargetRecord)
    : [];
  return Object.freeze({
    worldVersion: MARITIME_WORLD_VERSION,
    simTick: 0,
    bottomDepthM,
    ownship: resolveOwnshipSeed(scenario),
    targets: Object.freeze(traffic),
  });
}

export function advanceMaritimeWorld(scenario, worldState, steps = 1) {
  if (!Number.isInteger(steps) || steps < 1 || steps > 3600) {
    throw new RangeError("maritime world steps must be integer 1..3600");
  }
  const dtSingle = TICK_DURATION_MS / 1000;
  let ownship = worldState.ownship;
  let targets = worldState.targets;
  for (let i = 0; i < steps; i++) {
    ownship = stepVesselKinematics(ownship, dtSingle);
    targets = targets.map(t => stepVesselKinematics(t, dtSingle));
  }
  const simTick = worldState.simTick + steps;
  const bottomDepthM = Number.isFinite(scenario?.bottomDepthM)
    ? bottomDepthAt(scenario, simTick)
    : worldState.bottomDepthM;
  return Object.freeze({
    worldVersion: MARITIME_WORLD_VERSION,
    simTick,
    bottomDepthM,
    ownship: Object.freeze(ownship),
    targets: Object.freeze(targets.map(t => Object.freeze(t))),
  });
}

/**
 * Compute tangent-plane range, true/relative bearing, CPA (NM) and TCPA (min)
 * from `ownship` to `target` for AIS R5 and ARPA Radar (MDC-2060 / FAR-2127).
 */
export function computeTargetEncounter(ownship, target) {
  const meanLatRad = ((ownship.lat + target.lat) * 0.5) * DEG_TO_RAD;
  const cosLat = Math.max(0.1, Math.cos(meanLatRad));
  const dyNm = (target.lat - ownship.lat) * 60;
  const dxNm = wrapLon180(target.lon - ownship.lon) * 60 * cosLat;
  const rangeNm = Math.hypot(dxNm, dyNm);
  const bearingDeg = rangeNm < 1e-9
    ? 0
    : normalizeDeg360(Math.atan2(dxNm, dyNm) * RAD_TO_DEG);
  const relBearingDeg = normalizeSignedDeg180(bearingDeg - ownship.hdgDeg);

  const ownCogRad = ownship.cogDeg * DEG_TO_RAD;
  const tgtCogRad = target.cogDeg * DEG_TO_RAD;
  const ovx = ownship.sogKn * Math.sin(ownCogRad);
  const ovy = ownship.sogKn * Math.cos(ownCogRad);
  const tvx = target.sogKn * Math.sin(tgtCogRad);
  const tvy = target.sogKn * Math.cos(tgtCogRad);
  const rvxKn = tvx - ovx;
  const rvyKn = tvy - ovy;
  const relSpeedSq = rvxKn * rvxKn + rvyKn * rvyKn;
  const relSpeedKn = Math.sqrt(relSpeedSq);

  let tcpaHours = 0;
  let cpaNm = rangeNm;
  if (relSpeedSq > 1e-9) {
    tcpaHours = -(dxNm * rvxKn + dyNm * rvyKn) / relSpeedSq;
    if (tcpaHours > 0) {
      const cpaDx = dxNm + rvxKn * tcpaHours;
      const cpaDy = dyNm + rvyKn * tcpaHours;
      cpaNm = Math.hypot(cpaDx, cpaDy);
    } else {
      cpaNm = rangeNm;
    }
  }
  return Object.freeze({
    rangeNm: round3(rangeNm),
    bearingDeg: round3(bearingDeg),
    relBearingDeg: round3(relBearingDeg),
    relSpeedKn: round3(relSpeedKn),
    cpaNm: round3(cpaNm),
    tcpaMin: round3(tcpaHours * 60),
  });
}

export function nmeaChecksum(body) {
  let xor = 0;
  for (let i = 0; i < body.length; i++) {
    xor ^= body.charCodeAt(i);
  }
  return xor.toString(16).toUpperCase().padStart(2, "0");
}

export function formatNmeaSentence(talkerFormatter, fields) {
  const body = `${talkerFormatter},${fields.join(",")}`;
  return `$${body}*${nmeaChecksum(body)}`;
}

function formatNmeaLat(lat) {
  const abs = Math.abs(lat);
  const deg = Math.floor(abs);
  const min = (abs - deg) * 60;
  const hemi = lat >= 0 ? "N" : "S";
  return [`${String(deg).padStart(2, "0")}${min.toFixed(4).padStart(7, "0")}`, hemi];
}

function formatNmeaLon(lon) {
  const abs = Math.abs(lon);
  const deg = Math.floor(abs);
  const min = (abs - deg) * 60;
  const hemi = lon >= 0 ? "E" : "W";
  return [`${String(deg).padStart(3, "0")}${min.toFixed(4).padStart(7, "0")}`, hemi];
}

function formatUtcTimeFromTick(simTick) {
  const totalSec = ((simTick % 86400) + 86400) % 86400;
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, "0");
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${hh}${mm}${ss}.00`;
}

/**
 * Deterministic internal NMEA-0183 / ARPA / AIS bus projection for a single
 * `simTick`. Every instrument reads this immutable snapshot without coupling.
 */
export function projectMaritimeSensorBus(scenario, worldState) {
  const own = worldState.ownship;
  const depthBelowTransducerM = Math.max(0, round3(worldState.bottomDepthM - own.draftM));
  const depthFeet = round3(depthBelowTransducerM * FEET_PER_METER);
  const depthFathoms = round3(depthBelowTransducerM * FATHOMS_PER_METER);
  const [latStr, latHemi] = formatNmeaLat(own.lat);
  const [lonStr, lonHemi] = formatNmeaLon(own.lon);
  const utcStr = formatUtcTimeFromTick(worldState.simTick);

  const sentences = Object.freeze([
    formatNmeaSentence("SDDBT", [
      depthFeet.toFixed(1), "f",
      depthBelowTransducerM.toFixed(1), "M",
      depthFathoms.toFixed(1), "F",
    ]),
    formatNmeaSentence("SDDPT", [
      depthBelowTransducerM.toFixed(1),
      own.draftM.toFixed(1),
    ]),
    formatNmeaSentence("HEHDT", [own.hdgDeg.toFixed(1), "T"]),
    formatNmeaSentence("VWVHW", [
      own.hdgDeg.toFixed(1), "T",
      "", "M",
      own.stwKn.toFixed(1), "N",
      (own.stwKn * 1.852).toFixed(1), "K",
    ]),
    formatNmeaSentence("VWMTW", [own.waterTempC.toFixed(1), "C"]),
    formatNmeaSentence("GPRMC", [
      utcStr, "A",
      latStr, latHemi,
      lonStr, lonHemi,
      own.sogKn.toFixed(1),
      own.cogDeg.toFixed(1),
      "221126", "", "", "A",
    ]),
    formatNmeaSentence("GPVTG", [
      own.cogDeg.toFixed(1), "T",
      "", "M",
      own.sogKn.toFixed(1), "N",
      (own.sogKn * 1.852).toFixed(1), "K", "A",
    ]),
  ]);

  const aisTargets = Object.freeze(worldState.targets.map(target => {
    const encounter = computeTargetEncounter(own, target);
    return Object.freeze({
      mmsi: target.mmsi,
      name: target.name,
      callSign: target.callSign,
      navStatus: target.navStatus,
      shipType: target.shipType,
      lat: target.lat,
      lon: target.lon,
      sogKn: target.sogKn,
      cogDeg: target.cogDeg,
      hdgDeg: target.hdgDeg,
      lengthM: target.lengthM,
      beamM: target.beamM,
      ...encounter,
    });
  }));

  const radarContacts = Object.freeze(worldState.targets.map(target => {
    const encounter = computeTargetEncounter(own, target);
    return Object.freeze({
      contactId: `tgt-${target.mmsi}`,
      rcsSqm: target.rcsSqm,
      ...encounter,
    });
  }));

  const payload = {
    contractVersion: NMEA_BUS_CONTRACT_VERSION,
    scenarioId: scenario.id,
    simTick: worldState.simTick,
    ownship: own,
    depthM: round3(worldState.bottomDepthM),
    depthBelowTransducerM,
    sentences,
    aisTargets,
    radarContacts,
  };
  return Object.freeze({
    ...payload,
    busFingerprint: fingerprint(payload),
  });
}
