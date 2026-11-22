/**
 * Training-only world/sensor fixture. Numerical profiles are illustrative,
 * not a sonar physics or hydrographic model and not fit for navigation.
 */
import {fingerprint} from "./protocol.mjs";

export const TRAINING_SCENARIO = Object.freeze({
  id: "fcv588-demo-depth-001",
  version: 7,
  label: "Đáy biển và đàn cá minh họa",
  seed: 588,
  // Explicitly artificial classroom position, NEVER a receiver observation.
  syntheticOwnship: Object.freeze({
    lat: 10.5, lon: 106.75, speedKn: 7, courseDeg: 90, temperatureC: 18,
  }),
  // Explicit artificial training-only categorical fixture, not a sonar
  // bottom-discrimination measurement or real seabed composition.
  bottomClassification:Object.freeze({
    sourceClass:"SYNTHETIC_FIXTURE",
    classes:Object.freeze({Mud:0.1,Sand:0.1,Gravel:0.2,Rock:0.6}),
  }),
  bottomDepthM: 49.6,
  bottomVariationM: 5,
  fish: Object.freeze([
    Object.freeze({time: 8, depthM: 17, strength: 0.75,sizeCm:24,
      syntheticCategory:"Fish School"}),
    Object.freeze({time: 24, depthM: 29, strength: 0.9,sizeCm:43,
      syntheticCategory:"Fish School"}),
    Object.freeze({time: 42, depthM: 34, strength: 0.65,sizeCm:31,
      syntheticCategory:"Bottom Fish"}),
  ]),
});

export function bottomDepthAt(scenario, step) {
  if (!Number.isFinite(step)) throw new TypeError("step must be finite");
  return scenario.bottomDepthM +
    scenario.bottomVariationM * Math.sin(step * 0.075) +
    scenario.bottomVariationM * 0.24 * Math.sin(step * 0.21);
}

export function noise01(seed, x, y) {
  // 32-bit integer mix: identical inputs always produce identical results.
  let h = (seed | 0) ^ Math.imul(x | 0, 0x45d9f3b) ^ Math.imul(y | 0, 0x119de1f3);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const FISHFINDER_NOISE_STREAM = "sensor:fcv588:sonar-v1";

export function streamSeed(seed, name) {
  if (!Number.isInteger(seed) || typeof name !== "string" || !name) {
    throw new TypeError("seed and named stream required");
  }
  return parseInt(fingerprint({seed, name}).slice(-8), 16) | 0;
}

/** Return a 0..1 synthetic echo level at the supplied training coordinates. */
export function rawEchoLevel(scenario, {time, depthM, frequencyKhz, noiseSeed}) {
  const bottom = bottomDepthAt(scenario, time);
  const offset = depthM - bottom;
  // Test/training scenarios may explicitly author no seabed return while still
  // carrying fish targets. The default scenario omits this switch and keeps the
  // historical bottom signal unchanged.
  let strength = scenario.syntheticBottomReturnPresent===false
    ?0:offset >= 0 && offset < 2.3 ? 0.85 - offset * 0.17 : 0;
  const spread = frequencyKhz === 50 ? 5.2 : 2.6;
  for (const fish of scenario.fish) {
    const dx = (time - fish.time) / spread;
    const dy = (depthM - fish.depthM) / 2.3;
    strength += fish.strength * Math.exp(-0.5 * (dx * dx + dy * dy));
  }
  const randomLike = noise01(noiseSeed ?? streamSeed(scenario.seed, FISHFINDER_NOISE_STREAM), Math.round(time * 4), Math.round(depthM * 5));
  strength += randomLike > 0.975 ? 0.20 : randomLike * 0.014;
  return clamp(strength, 0, 1);
}

export const DEFAULT_RANGES_M = Object.freeze([5, 10, 20, 40, 80, 150, 200, 300]);
export const SENSOR_MODEL_VERSION = "fcv588-sonar-illustrative-v1";
export const SYNTHETIC_SEABED_PROVENANCE_SOURCE =
  "SYNTHETIC_SCENARIO_BOTTOM_PROVENANCE_V1";
export const SYNTHETIC_SOUNDER_SOURCE_IDENTITY =
  "SYNTHETIC_SOUNDER_SOURCE_IDENTITY_V1";
export const SOUNDER_COLUMN_SECONDS=0.46;

const sounderColumnTime=(simTick,columns,x)=>
  simTick-(columns-x)*SOUNDER_COLUMN_SECONDS;

function assertSyntheticSounderWorld(scenario,worldState,columns){
  if(!scenario?.id || !Number.isInteger(scenario.version) ||
      !Number.isInteger(scenario.seed) || !Number.isFinite(scenario.bottomDepthM) ||
      !Number.isFinite(scenario.bottomVariationM) ||
      !Number.isInteger(worldState?.simTick) || !Number.isFinite(worldState.bottomDepthM) ||
      !Number.isInteger(columns) || columns<1 || columns>500){
    throw new TypeError("invalid synthetic sounder source identity input");
  }
  const expectedBottom=bottomDepthAt(scenario,worldState.simTick);
  if(Math.abs(worldState.bottomDepthM-expectedBottom)>1e-9){
    throw new TypeError("world bottom inconsistent with authored scenario at simTick");
  }
}

/** Authoritative, non-serialized binding for display companions. */
export function projectSyntheticSounderSourceIdentity(scenario,worldState,{columns=120}={}){
  assertSyntheticSounderWorld(scenario,worldState,columns);
  return Object.freeze({
    sourceClass:SYNTHETIC_SOUNDER_SOURCE_IDENTITY,
    scenarioId:scenario.id,scenarioVersion:scenario.version,
    scenarioFingerprint:fingerprint(scenario),
    sensorModelVersion:SENSOR_MODEL_VERSION,
    simTick:worldState.simTick,worldBottomDepthM:worldState.bottomDepthM,columns,
  });
}

/**
 * Display-only companion metadata from the authored synthetic scenario.
 * This is deliberately separate from observeSounder(): replay/session/sensor
 * schema bytes remain unchanged while Bottom Lock can distinguish an authored
 * seabed from a near-bottom fish return without scanning pixel intensity.
 */
export function projectSyntheticSeabedProvenance(scenario,worldState,{columns=120}={}){
  const identity=projectSyntheticSounderSourceIdentity(scenario,worldState,{columns});
  const present=scenario.syntheticBottomReturnPresent!==false;
  const columnBottoms=Array.from({length:columns},(_,x)=>{
    const sampleTime=sounderColumnTime(worldState.simTick,columns,x);
    return Object.freeze({present,depthM:bottomDepthAt(scenario,sampleTime),sampleTime});
  });
  return Object.freeze({
    sourceClass:SYNTHETIC_SEABED_PROVENANCE_SOURCE,
    scenarioId:identity.scenarioId,scenarioVersion:identity.scenarioVersion,
    scenarioFingerprint:identity.scenarioFingerprint,
    sensorModelVersion:identity.sensorModelVersion,
    simTick:identity.simTick,columns:identity.columns,
    latestWorldBottomDepthM:worldState.bottomDepthM,
    columnBottoms:Object.freeze(columnBottoms),
  });
}

/** Exact raw-row sampler shared by makeEchoFrame and Bottom Lock provenance mapping. */
export function sounderSourceRowForDepth(observation,depthM){
  if(!Number.isInteger(observation?.rows) || observation.rows<2 ||
      !Number.isFinite(observation.maxDepthM) || observation.maxDepthM<=0 ||
      !Number.isFinite(depthM))throw new TypeError("invalid sounder source-row input");
  return Math.min(observation.rows-1,
    Math.round(depthM/observation.maxDepthM*(observation.rows-1)));
}

export function initialWorldState(scenario) {
  return {simTick: 0, bottomDepthM: bottomDepthAt(scenario, 0)};
}

export function advanceWorld(scenario, worldState, steps) {
  const simTick = worldState.simTick + steps;
  return {simTick, bottomDepthM: bottomDepthAt(scenario, simTick)};
}

/** Cheap typed world observation for offline alarms and navigation only. */
export function observeTrainingStatus(scenario, worldState) {
  const source = scenario.syntheticOwnship ?? null;
  // Deliberately authored motion for waypoint lessons; this is neither GPS
  // reception nor vessel dead reckoning suitable for actual navigation.
  const courseRad=(source?.courseDeg??0)*Math.PI/180;
  const distanceNm=(source?.speedKn??0)*worldState.simTick/3600;
  const currentLat=source ? source.lat+distanceNm*Math.cos(courseRad)/60:null;
  const currentLon=source ? source.lon+
    distanceNm*Math.sin(courseRad)/(60*Math.max(0.1,
      Math.cos(source.lat*Math.PI/180))):null;
  const visibleFish=scenario.fish.filter(f=>
    Math.abs(worldState.simTick-f.time)<=4);
  const strongestFish=visibleFish.length
    ?visibleFish.reduce((strongest,f)=>f.strength>strongest.strength?f:strongest)
    :null;
  return {
    sourceClass: "SYNTHETIC_FIXTURE",
    bottomDepthM: worldState.bottomDepthM,
    bottomType: "Rock",
    bottomClassification:scenario.bottomClassification??null,
    fishPresent: visibleFish.length>0,
    fishStrength: strongestFish?.strength??null,
    fishCategory:strongestFish?.syntheticCategory??null,
    speedKn: source?.speedKn ?? null,
    temperatureC: source?.temperatureC ?? null,
    navigation: source ? {
      observedAtTick: worldState.simTick,
      position: {lat:currentLat,lon:currentLon,source:"SYNTHETIC_FIXTURE"},
      speedKn: source.speedKn,
      courseDeg: source.courseDeg,
      temperatureC: source.temperatureC,
      depthM: worldState.bottomDepthM,
    } : null,
  };
}

export function effectiveRangeM(observation, state) {
  if (state.rangeMode === "manual"){
    const index=state.rangeIndex;
    const stored=state.settings?.["rangePreset"+(index+1)];
    const configured=Number(stored);
    return typeof stored==="string" && DEFAULT_RANGES_M.includes(configured)
      ?configured:DEFAULT_RANGES_M[index]??80;
  }
  // Manual §2.2: Auto Range cannot see deeper than the largest configured
  // manual preset. This limits the display projection, never raw water depth.
  const bank=DEFAULT_RANGES_M.map((fallback,i)=>{
    const stored=state.settings?.["rangePreset"+(i+1)];
    const value=Number(stored);
    return typeof stored==="string" && DEFAULT_RANGES_M.includes(value)
      ?value:fallback;
  });
  return Math.min(observation.recommendedAutoRangeM,Math.max(...bank));
}

export function effectiveGain(state) {
  return state.gainMode === "off"
    ? state.manualGain
    : state.gainMode === "fishing" ? 6.5 : 3.8;
}

/**
 * Sensor observation is independent of device power, menu, Gain and Range.
 * The static water-column extent is an F0 shortcut, not a calibrated sonar.
 */
export function observeSounder(scenario, worldState, {columns = 120, rows = 301} = {}) {
  if (!Number.isInteger(columns) || columns < 1 || columns > 500) throw new RangeError("invalid columns");
  if (!Number.isInteger(rows) || rows < 2 || rows > 500) throw new RangeError("invalid rows");
  const maxDepthM = 300;
  const noiseSeed = streamSeed(scenario.seed, FISHFINDER_NOISE_STREAM);
  const channels = {};
  for (const frequencyKhz of [50, 200]) {
    const raw = new Uint8Array(columns * rows);
    for (let x = 0; x < columns; x++) {
      const time = sounderColumnTime(worldState.simTick,columns,x);
      for (let y = 0; y < rows; y++) {
        const depthM = y / (rows - 1) * maxDepthM;
        raw[y * columns + x] = Math.round(rawEchoLevel(scenario, {
          time, depthM, frequencyKhz, noiseSeed,
        }) * 255);
      }
    }
    channels[frequencyKhz] = raw;
  }
  const desiredRange = worldState.bottomDepthM + 8;
  return {
    modelVersion: SENSOR_MODEL_VERSION,
    simTick: worldState.simTick,
    bottomDepthM: worldState.bottomDepthM,
    recommendedAutoRangeM: DEFAULT_RANGES_M.find(range => range >= desiredRange) ?? 300,
    maxDepthM,
    syntheticTargets:scenario.fish.map(f=>({
      sourceClass:"SYNTHETIC_FIXTURE",time:f.time,depthM:f.depthM,sizeCm:f.sizeCm,
    })),
    columns,
    rows,
    channels,
  };
}

/** Device-only display processing. Never changes the observation or world. */
export function makeEchoFrame(observation, deviceState, {rows = 120, frequencyKhz = 50} = {}) {
  if (!Number.isInteger(rows) || rows < 2 || rows > 400) throw new RangeError("invalid display rows");
  if (![50, 200].includes(frequencyKhz)) throw new RangeError("unsupported frequency");
  const rangeM = effectiveRangeM(observation, deviceState);
  const gain = effectiveGain(deviceState);
  // Manual §1.9 Shift moves only the displayed depth slice, not observations.
  // It is not effective under Auto Range; menu guards prevent editing there.
  const candidateShift=Number(deviceState.settings?.shift ?? 0);
  const startDepthM=deviceState.rangeMode==="manual" && Number.isFinite(candidateShift)
    ? clamp(candidateShift,0,observation.maxDepthM):0;
  const columns = observation.columns;
  const pixels = new Uint8Array(columns * rows);
  const src = observation.channels[frequencyKhz];
  for (let y = 0; y < rows; y++) {
    const depthM = startDepthM + y / (rows - 1) * rangeM;
    const srcY = sounderSourceRowForDepth(observation,depthM);
    for (let x = 0; x < columns; x++) {
      pixels[y * columns + x] = Math.round(clamp(
        (src[srcY * columns + x] / 255) * (0.2 + 0.16 * gain), 0, 1,
      ) * 255);
    }
  }
  return {columns, rows, frequencyKhz, rangeM, startDepthM, gain, pixels};
}
