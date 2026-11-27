import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

import {
  DEFAULT_BRIDGE_WORLD_SCENARIO,
  initialMaritimeWorldState,
  advanceMaritimeWorld,
  projectMaritimeSensorBus,
  computeTargetEncounter,
  nmeaChecksum,
} from "../src/core/maritime-world.mjs";
import { observeTrainingStatus } from "../src/core/scenario.mjs";
import { stableSerialize, fingerprint, snapshotEventData } from "../src/core/protocol.mjs";

import {
  MDC2060_ID,
  MDC2060_PROFILE_REVISION,
  MDC2060_RANGES,
  MDC2060_PRESENTATION_MODES,
  MDC2060_MOTION_MODES,
  MDC2060_SCREEN_MODES,
  MDC2060_RANGE_UNITS,
  MDC2060_RADAR_SPECS,
  MDC2060_COLOR_PALETTES,
  MDC2060_FKEY_PRESETS,
  MDC2060_MAIN_MENU_TREE,
  MDC2060_SYSTEM_MENU_TREE,
  formatRangeValue,
} from "../src/devices/mdc2060/spec.mjs";

import {
  MDC2060_COASTAL_SCENARIO,
  MDC2060_STORM_SCENARIO,
  MDC2060_BRIDGE_SYNC_SCENARIO,
  MDC2060_SCENARIOS,
  getMdc2060ScenarioById,
  createCustomOwnshipScenario,
} from "../src/devices/mdc2060/scenarios.mjs";

import {
  MDC2060_NOISE_STREAM,
  POLAR_NUM_AZIMUTHS,
  POLAR_NUM_RANGE_BINS,
  evaluatePolarEchoGrid,
  isPointOccludedByLand,
} from "../src/devices/mdc2060/radar-signal.mjs";

import {
  isBearingInSector,
  computeBowCrossing,
  initialAtaState,
  acquireAtaTarget,
  deleteAtaTarget,
  deleteAllAtaTargets,
  stepAtaTracking,
  formatRattmSentence,
  projectAisTargets,
  initialGuardZoneState,
  evaluateGuardZone,
} from "../src/devices/mdc2060/arpa-ais.mjs";

import {
  MDC2060_LANGUAGES,
  MDC2060_I18N_KEYS,
  MDC2060_I18N_VI_KEYS,
  resolveMdc2060Lang,
  isVietnameseMdc2060,
  hasMdc2060Key,
  tMdc2060,
  localizeMdc2060MenuGroup,
  localizeMdc2060MenuItem,
  localizeMdc2060Choice,
  localizeMdc2060PowerMode,
  localizeMdc2060Alarm,
} from "../src/devices/mdc2060/i18n.mjs";

function assertDeepFrozen(value, path = "root") {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true, `Expected ${path} to be frozen`);
  for (const key of Object.keys(value)) {
    assertDeepFrozen(value[key], `${path}.${key}`);
  }
}

function assertJsonCanonical(value, path = "root") {
  assert.notEqual(value, undefined, `Unexpected undefined at ${path}`);
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return;
  }
  if (typeof value === "number") {
    assert.equal(Number.isFinite(value), true, `Non-finite number at ${path}: ${value}`);
    assert.equal(Object.is(value, -0), false, `Negative zero (-0) at ${path}`);
    return;
  }
  assert.equal(typeof value, "object", `Unsupported type ${typeof value} at ${path}`);
  assert.equal(value instanceof Map, false, `Unexpected Map at ${path}`);
  assert.equal(value instanceof Set, false, `Unexpected Set at ${path}`);
  assert.equal(ArrayBuffer.isView(value), false, `Unexpected TypedArray/DataView at ${path}`);
  if (Array.isArray(value)) {
    assert.equal(
      Reflect.ownKeys(value).length,
      value.length + 1,
      `Non-canonical array properties at ${path}`
    );
    for (let i = 0; i < value.length; i++) {
      assert.equal(Object.hasOwn(value, String(i)), true, `Sparse array hole at ${path}[${i}]`);
      assertJsonCanonical(value[i], `${path}[${i}]`);
    }
    return;
  }
  const proto = Object.getPrototypeOf(value);
  assert.ok(proto === Object.prototype || proto === null, `Non-plain object prototype at ${path}`);
  for (const key of Object.keys(value)) {
    assertJsonCanonical(value[key], `${path}.${key}`);
  }
}

function samplePatchStats(grid, rangeNm, centerAzDeg, centerRangeNm, azRadiusDeg = 2, binRadius = 2) {
  const centerBin = Math.round((centerRangeNm / rangeNm) * POLAR_NUM_RANGE_BINS - 0.5);
  const centerAz = ((Math.round(centerAzDeg) % 360) + 360) % 360;
  let maxVal = 0;
  let sum = 0;
  let nonZero = 0;
  let count = 0;
  for (let da = -azRadiusDeg; da <= azRadiusDeg; da++) {
    const az = ((centerAz + da) % 360 + 360) % 360;
    for (let db = -binRadius; db <= binRadius; db++) {
      const b = centerBin + db;
      if (b < 0 || b >= POLAR_NUM_RANGE_BINS) continue;
      const v = grid[az * POLAR_NUM_RANGE_BINS + b];
      if (v > maxVal) maxVal = v;
      if (v > 0) nonZero++;
      sum += v;
      count++;
    }
  }
  return { maxVal, sum, nonZero, mean: count > 0 ? sum / count : 0 };
}

// ============================================================================
// 1-3. spec.mjs: Hardware Specs, 18 Ranges, 4 Palettes, Menu Trees, Formatter
// ============================================================================

test("spec.mjs: hardware profile, 18 standard ranges, and deep-freeze invariants", () => {
  assert.equal(MDC2060_ID, "koden.mdc2060.mrd104");
  assert.equal(MDC2060_PROFILE_REVISION, "F1-mdc2060-public-ref-1");
  assert.equal(MDC2060_RANGES.length, 18);

  assert.deepEqual(MDC2060_RANGES[0], { nm: 0.0625, ringNm: 0.03125, rings: 2, defaultPw: "S1" });
  assert.deepEqual(MDC2060_RANGES[17], { nm: 64, ringNm: 16, rings: 4, defaultPw: "L" });

  for (let i = 0; i < MDC2060_RANGES.length; i++) {
    const r = MDC2060_RANGES[i];
    assert.ok(Math.abs(r.rings * r.ringNm - r.nm) < 1e-12, `Range ${i} rings*ringNm mismatch`);
    if (i > 0) {
      assert.ok(r.nm > MDC2060_RANGES[i - 1].nm, `Range ${i} must be strictly increasing`);
    }
  }

  assert.deepEqual(MDC2060_PRESENTATION_MODES, ["H-UP", "N-UP", "C-UP", "W-UP"]);
  assert.deepEqual(MDC2060_MOTION_MODES, ["RM", "TM"]);
  assert.deepEqual(MDC2060_SCREEN_MODES, ["PPI", "PPI/PPI", "PPI/NAV"]);
  assert.deepEqual(MDC2060_RANGE_UNITS, ["NM", "km", "sm"]);

  assert.equal(MDC2060_RADAR_SPECS.horizontalBeamwidthDeg, 1.8);
  assert.equal(MDC2060_RADAR_SPECS.txPowerKw, 6);
  assert.equal(MDC2060_RADAR_SPECS.lcdWidthPx, 480);
  assert.equal(MDC2060_RADAR_SPECS.lcdHeightPx, 640);
  assert.equal(MDC2060_RADAR_SPECS.preheatAuthenticSec, 120);
  assert.equal(MDC2060_RADAR_SPECS.preheatFastSec, 5);
  assert.equal(MDC2060_RADAR_SPECS.sleepBurstSec, 30);
  assert.equal(MDC2060_RADAR_SPECS.offCenterMaxFrac, 0.66);
  assert.equal(MDC2060_RADAR_SPECS.maxAtaTargets, 50);
  assert.equal(MDC2060_RADAR_SPECS.ataStabilizeTicks, 6);
  assert.equal(MDC2060_RADAR_SPECS.maxAisTargets, 100);
  assert.equal(MDC2060_RADAR_SPECS.polarAzimuths, 360);
  assert.equal(MDC2060_RADAR_SPECS.polarRangeBins, 160);
  assert.deepEqual(MDC2060_RADAR_SPECS.motorRpmOptions, [24, 48]);

  assertDeepFrozen(MDC2060_RANGES, "MDC2060_RANGES");
  assertDeepFrozen(MDC2060_RADAR_SPECS, "MDC2060_RADAR_SPECS");
  assertDeepFrozen(MDC2060_COLOR_PALETTES, "MDC2060_COLOR_PALETTES");
  assertDeepFrozen(MDC2060_FKEY_PRESETS, "MDC2060_FKEY_PRESETS");
  assertDeepFrozen(MDC2060_MAIN_MENU_TREE, "MDC2060_MAIN_MENU_TREE");
  assertDeepFrozen(MDC2060_SYSTEM_MENU_TREE, "MDC2060_SYSTEM_MENU_TREE");
});

test("spec.mjs: 4 original 8-level palettes and Main/System menu trees with aligned subGain", () => {
  const paletteIds = ["DAY", "NIGHT", "GREEN", "WHITE"];
  for (const id of paletteIds) {
    const p = MDC2060_COLOR_PALETTES[id];
    assert.ok(p, `Missing palette ${id}`);
    assert.equal(p.sourceClass, "ORIGINAL_TRAINING_ARTWORK");
    assert.equal(p.echoLutHex.length, 8);
    assert.equal(p.echoLutRgb.length, 8);
    assert.equal(p.echoLutHex[0], p.ppiFill);
    assert.deepEqual(p.echoLutRgb[0], p.ppiFillRgb);
    for (let i = 0; i < 8; i++) {
      const hex = p.echoLutHex[i];
      const [r, g, b] = p.echoLutRgb[i];
      const rebuilt = `#${[r, g, b].map(c => c.toString(16).padStart(2, "0")).join("")}`;
      assert.equal(rebuilt, hex.toLowerCase(), `Palette ${id} LUT[${i}] hex/RGB mismatch`);
    }
  }

  assert.equal(MDC2060_COLOR_PALETTES.WHITE.isLightBackground, true);
  assert.equal(MDC2060_COLOR_PALETTES.DAY.isLightBackground, false);
  // WHITE palette must use dark ink for readability
  const whiteInk = parseInt(MDC2060_COLOR_PALETTES.WHITE.textPrimary.slice(1), 16);
  const inkR = (whiteInk >> 16) & 255;
  const inkG = (whiteInk >> 8) & 255;
  const inkB = whiteInk & 255;
  assert.ok((inkR + inkG + inkB) / 3 < 80, "WHITE palette textPrimary must be dark high-contrast ink");

  assert.equal(MDC2060_MAIN_MENU_TREE.length, 8);
  assert.deepEqual(
    MDC2060_MAIN_MENU_TREE.map(g => g.id),
    ["echo", "display", "ebl_vrm", "alarm", "ata", "ais", "sleep", "system"]
  );
  // Verify cross-module seam alignment #1: subGain is offset -20..+20, default 0
  const echoGroup = MDC2060_MAIN_MENU_TREE.find(g => g.id === "echo");
  const subGainItem = echoGroup.items.find(it => it.key === "subGain");
  assert.deepEqual(subGainItem, {
    key: "subGain",
    label: "SUB GAIN",
    labelKey: "menu.item.subGain",
    type: "int",
    min: -20,
    max: 20,
    step: 1,
    default: 0,
  });

  assert.equal(MDC2060_SYSTEM_MENU_TREE.length, 4);
  assert.deepEqual(
    MDC2060_SYSTEM_MENU_TREE.map(g => g.id),
    ["assist", "adjust", "preset", "maint"]
  );
  assert.equal(MDC2060_FKEY_PRESETS.length, 12);
});

test("spec.mjs: formatRangeValue handles NM/km/sm, radar fractions, invalid inputs, and options", () => {
  assert.equal(formatRangeValue(0.0625, "NM"), "0.0625 NM");
  assert.equal(formatRangeValue(0.03125, "NM"), "0.03125 NM");
  assert.equal(formatRangeValue(0.125, "NM"), "0.125 NM");
  assert.equal(formatRangeValue(0.5, "NM"), "0.5 NM");
  assert.equal(formatRangeValue(1.5, "NM"), "1.5 NM");
  assert.equal(formatRangeValue(6, "NM"), "6 NM");
  assert.equal(formatRangeValue(64, "NM"), "64 NM");

  assert.equal(formatRangeValue(0.0625, "km"), "0.116 km");
  assert.equal(formatRangeValue(0.125, "km"), "0.23 km");
  assert.equal(formatRangeValue(1, "km"), "1.85 km");
  assert.equal(formatRangeValue(6, "km"), "11.1 km");
  assert.equal(formatRangeValue(64, "km"), "118.5 km");

  assert.equal(formatRangeValue(0.0625, "sm"), "0.072 sm");
  assert.equal(formatRangeValue(1, "sm"), "1.15 sm");
  assert.equal(formatRangeValue(64, "sm"), "73.6 sm");

  assert.equal(formatRangeValue(0, "NM"), "0 NM");
  assert.equal(formatRangeValue(-1, "NM"), "--");
  assert.equal(formatRangeValue(NaN, "NM"), "--");
  assert.equal(formatRangeValue(Infinity, "NM"), "--");
  assert.equal(formatRangeValue("6", "NM"), "--");
  assert.equal(formatRangeValue(6, "bad-unit"), "6 NM");
  assert.equal(formatRangeValue(6, "NM", { includeUnit: false }), "6");

  // Overflow & scientific-notation preservation regressions
  assert.equal(formatRangeValue(1e308, "km"), "--");
  assert.equal(formatRangeValue(1.7e308, "sm"), "--");
  assert.equal(formatRangeValue(1.5e200, "NM"), "1.5e+200 NM");
  assert.equal(formatRangeValue(-0, "NM"), "0 NM");
});

// ============================================================================
// 4. scenarios.mjs: 3 Scenarios, Core Compatibility & Custom Ownship Builder
// ============================================================================

test("scenarios.mjs: all 3 scenarios pass core world/bus/status/fingerprint and match verified kinematics", () => {
  assert.equal(MDC2060_SCENARIOS.length, 3);
  assert.strictEqual(MDC2060_BRIDGE_SYNC_SCENARIO, DEFAULT_BRIDGE_WORLD_SCENARIO);
  assert.strictEqual(getMdc2060ScenarioById("mdc2060-coastal-approach"), MDC2060_COASTAL_SCENARIO);
  assert.strictEqual(getMdc2060ScenarioById("mdc2060-storm-clutter"), MDC2060_STORM_SCENARIO);
  assert.strictEqual(getMdc2060ScenarioById("bridge-coastal-traffic-001"), DEFAULT_BRIDGE_WORLD_SCENARIO);
  assert.equal(getMdc2060ScenarioById("unknown-id"), null);

  assert.equal(MDC2060_COASTAL_SCENARIO.traffic.length, 6);
  assert.equal(MDC2060_COASTAL_SCENARIO.buoys.length, 4);
  assert.equal(MDC2060_COASTAL_SCENARIO.landmasses.length, 3);

  assert.equal(MDC2060_STORM_SCENARIO.weather.seaState, 5);
  assert.equal(MDC2060_STORM_SCENARIO.weather.rainSqualls.length, 2);
  assert.equal(MDC2060_STORM_SCENARIO.weather.rainSqualls[0].intensity, 0.85);
  assert.equal(MDC2060_STORM_SCENARIO.weather.rainSqualls[1].intensity, 0.85);

  for (const scen of MDC2060_SCENARIOS) {
    assertDeepFrozen(scen, scen.id);
    assert.ok(fingerprint(scen).startsWith("f0-fnv1a32-"));
    const w0 = initialMaritimeWorldState(scen);
    const w10 = advanceMaritimeWorld(scen, w0, 10);
    const bus = projectMaritimeSensorBus(scen, w10);
    const status = observeTrainingStatus(scen, w10);
    assert.equal(bus.simTick, 10);
    assert.ok(bus.depthBelowTransducerM > 0);
    assert.equal(status.sourceClass, "SYNTHETIC_FIXTURE");
  }

  // Verify exact mathematical encounter geometry of coastal scenario at t=0
  const coastalBus0 = projectMaritimeSensorBus(
    MDC2060_COASTAL_SCENARIO,
    initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO)
  );
  const pacificStar = coastalBus0.aisTargets.find(t => t.name === "PACIFIC STAR");
  assert.ok(Math.abs(pacificStar.cpaNm - 0.28) < 0.01);
  assert.ok(Math.abs(pacificStar.tcpaMin - 11.0) < 0.05);

  const haiAu = coastalBus0.aisTargets.find(t => t.name === "HAI AU 18");
  assert.ok(Math.abs(haiAu.rangeNm - 1.4) < 0.01);

  // Verify buoy-shoal is strictly occluded by island-hon-cau
  assert.equal(
    isPointOccludedByLand(
      MDC2060_COASTAL_SCENARIO.ownship,
      258.0,
      3.6,
      MDC2060_COASTAL_SCENARIO.landmasses
    ),
    true
  );

  // Verify MEKONG CONTAINER remains inside squall-storm-1 for t = 0..180s
  const stormSq1 = MDC2060_STORM_SCENARIO.weather.rainSqualls[0];
  let wStorm = initialMaritimeWorldState(MDC2060_STORM_SCENARIO);
  for (const targetTick of [0, 60, 120, 180]) {
    if (targetTick > wStorm.simTick) {
      wStorm = advanceMaritimeWorld(MDC2060_STORM_SCENARIO, wStorm, targetTick - wStorm.simTick);
    }
    const mekong = wStorm.targets.find(t => t.name === "MEKONG CONTAINER");
    const driftNm = stormSq1.driftKn * (targetTick / 3600);
    const rad = stormSq1.driftDirDeg * (Math.PI / 180);
    const sqLat = stormSq1.lat + (driftNm * Math.cos(rad)) / 60;
    const sqLon = stormSq1.lon + (driftNm * Math.sin(rad)) / (60 * Math.cos(((stormSq1.lat + sqLat) * 0.5) * Math.PI / 180));
    const dy = (mekong.lat - sqLat) * 60;
    const dx = (mekong.lon - sqLon) * 60 * Math.cos(((mekong.lat + sqLat) * 0.5) * Math.PI / 180);
    const dist = Math.hypot(dx, dy);
    assert.ok(dist < stormSq1.radiusNm, `MEKONG CONTAINER at t=${targetTick}s should remain inside squall-storm-1 (dist=${dist})`);
  }
});

test("scenarios.mjs: createCustomOwnshipScenario is immutable, fingerprint-pure, and preserves DEFAULT_BRIDGE_WORLD_SCENARIO", () => {
  const baseFp = fingerprint(MDC2060_COASTAL_SCENARIO);
  const noop = createCustomOwnshipScenario(MDC2060_COASTAL_SCENARIO, {});
  assert.strictEqual(noop, MDC2060_COASTAL_SCENARIO);

  const custom1 = createCustomOwnshipScenario(MDC2060_COASTAL_SCENARIO, {
    hdgDeg: 135,
    sogKn: 14.5,
    rotDegPerMin: 12,
  });
  assertDeepFrozen(custom1, "custom1");
  assert.equal(fingerprint(MDC2060_COASTAL_SCENARIO), baseFp);
  assert.equal(custom1.ownship.hdgDeg, 135);
  assert.equal(custom1.ownship.cogDeg, 135); // synced with hdgDeg when cogDeg omitted
  assert.equal(custom1.ownship.sogKn, 14.5);
  assert.equal(custom1.ownship.stwKn, 14.5); // synced with sogKn when stwKn omitted
  assert.equal(custom1.ownship.rotDegPerMin, 12);
  assert.equal(custom1.syntheticOwnship.speedKn, 14.5);
  assert.equal(custom1.syntheticOwnship.courseDeg, 135);
  assert.ok(fingerprint(custom1).startsWith("f0-fnv1a32-"));

  // Repeated edits must not accumulate -custom-...-custom-...
  const custom2 = createCustomOwnshipScenario(custom1, { hdgDeg: 210, sogKn: 8, rotDegPerMin: NaN });
  assert.equal((custom2.id.match(/-custom-/g) ?? []).length, 1);
  assert.equal(custom2.ownship.hdgDeg, 210);
  assert.equal(custom2.ownship.rotDegPerMin, 12); // NaN ignored cleanly

  // Works on DEFAULT_BRIDGE_WORLD_SCENARIO without introducing undefined keys!
  const bridgeCustom = createCustomOwnshipScenario(DEFAULT_BRIDGE_WORLD_SCENARIO, { hdgDeg: 45, sogKn: 10 });
  assert.equal(Object.hasOwn(bridgeCustom, "landmasses"), false);
  assert.ok(fingerprint(bridgeCustom).startsWith("f0-fnv1a32-"));
  const wBridge = initialMaritimeWorldState(bridgeCustom);
  const bBridge = projectMaritimeSensorBus(bridgeCustom, wBridge);
  assert.equal(bBridge.ownship.hdgDeg, 45);
  assert.equal(observeTrainingStatus(bridgeCustom, wBridge).speedKn, 10);

  // Compass [0, 360) rounding wrap, idempotence, and bus/status agreement on near-360° inputs
  for (const nearZeroHdg of [359.9999, -0.0001, -1e-17, 360]) {
    const wrapped = createCustomOwnshipScenario(MDC2060_COASTAL_SCENARIO, { hdgDeg: nearZeroHdg });
    assert.equal(wrapped.ownship.hdgDeg, 0);
    assert.equal(wrapped.ownship.cogDeg, 0);
    assert.equal(wrapped.syntheticOwnship.courseDeg, 0);
    assert.equal(Object.is(wrapped.ownship.hdgDeg, -0), false);
    // Strict idempotence on empty overrides
    assert.strictEqual(createCustomOwnshipScenario(wrapped, {}), wrapped);
    // Exact agreement between observeTrainingStatus and projectMaritimeSensorBus
    const wWrap = initialMaritimeWorldState(wrapped);
    const busWrap = projectMaritimeSensorBus(wrapped, wWrap);
    const statusWrap = observeTrainingStatus(wrapped, wWrap);
    assert.equal(busWrap.ownship.hdgDeg, 0);
    assert.equal(busWrap.ownship.cogDeg, 0);
    assert.equal(statusWrap.navigation.courseDeg, 0);
  }
});

// ============================================================================
// 5-9. radar-signal.mjs: Determinism, Perf, Shadow, STC, FTC, GAIN, IR, PW, EXP
// ============================================================================

test("radar-signal.mjs: determinism, 8-level bounds, DEFAULT_BRIDGE_WORLD_SCENARIO support, and < 1.5 ms perf", () => {
  assert.equal(MDC2060_NOISE_STREAM, "sensor:mdc2060:radar-v1");
  const w0 = initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO);
  const bus0 = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, w0);
  const inputFpBefore = fingerprint(MDC2060_COASTAL_SCENARIO);

  const r1 = evaluatePolarEchoGrid({
    scenario: MDC2060_COASTAL_SCENARIO,
    maritimeBus: bus0,
    rangeNm: 6,
    gain: 55,
    stc: 20,
    ftc: 0,
    ir: "OFF",
    simTick: 0,
  });
  const r2 = evaluatePolarEchoGrid({
    scenario: MDC2060_COASTAL_SCENARIO,
    maritimeBus: bus0,
    rangeNm: 6,
    gain: 55,
    stc: 20,
    ftc: 0,
    ir: "OFF",
    simTick: 0,
  });

  assert.equal(r1.numAzimuths, 360);
  assert.equal(r1.numRangeBins, 160);
  assert.equal(r1.grid.length, 360 * 160);
  assert.equal(r1.shadowMask.length, 360 * 160);
  assert.notStrictEqual(r1.grid, r2.grid);
  assert.deepEqual(r1.grid, r2.grid);
  assert.deepEqual(r1.shadowMask, r2.shadowMask);
  assert.equal(fingerprint(MDC2060_COASTAL_SCENARIO), inputFpBefore);

  for (let i = 0; i < r1.grid.length; i++) {
    assert.ok(r1.grid[i] <= 7, `Grid bin ${i} exceeded level 7: ${r1.grid[i]}`);
    assert.ok(r1.shadowMask[i] === 0 || r1.shadowMask[i] === 1);
  }

  // Graceful execution with empty params, gain=0, and DEFAULT_BRIDGE_WORLD_SCENARIO
  const emptyRes = evaluatePolarEchoGrid({});
  assert.equal(emptyRes.grid.length, 57600);

  const zeroGainRes = evaluatePolarEchoGrid({
    scenario: MDC2060_COASTAL_SCENARIO,
    maritimeBus: bus0,
    gain: 0,
    interferenceSource: true,
  });
  assert.equal(zeroGainRes.stats.nonZeroBins, 0);
  assert.equal(zeroGainRes.stats.totalEnergy, 0);
  assert.equal(zeroGainRes.stats.interferenceDotsInjected, 0);
  assert.ok(zeroGainRes.stats.shadowedBins > 0);

  const bridgeBus = projectMaritimeSensorBus(
    DEFAULT_BRIDGE_WORLD_SCENARIO,
    initialMaritimeWorldState(DEFAULT_BRIDGE_WORLD_SCENARIO)
  );
  const bridgeNoRain = evaluatePolarEchoGrid({
    scenario: DEFAULT_BRIDGE_WORLD_SCENARIO,
    maritimeBus: bridgeBus,
    rangeNm: 6,
    gain: 55,
  });
  assert.equal(bridgeNoRain.stats.renderedContacts, 2);
  assert.equal(bridgeNoRain.stats.activeRainCells, 0);

  // Synthetic rain cell created when rainIntensityOverride > 0 on scenario with no rainSqualls
  const bridgeWithRain = evaluatePolarEchoGrid({
    scenario: DEFAULT_BRIDGE_WORLD_SCENARIO,
    maritimeBus: bridgeBus,
    rangeNm: 6,
    gain: 55,
    rainIntensityOverride: 0.8,
  });
  assert.equal(bridgeWithRain.stats.activeRainCells, 1);
  assert.equal(bridgeWithRain.stats.effectiveRainIntensity, 0.8);
  assert.ok(bridgeWithRain.stats.totalEnergy > bridgeNoRain.stats.totalEnergy);

  // rainIntensityOverride ([0, 1]) & rainPercentOverride ([0, 100]) strict monotonicity (zero cliff at 1 vs 2)
  const normOverrides = [0, 0.01, 0.25, 0.5, 1, 2];
  let prevNormEff = -1;
  let prevNormEnergy = -1;
  for (const val of normOverrides) {
    const res = evaluatePolarEchoGrid({
      scenario: DEFAULT_BRIDGE_WORLD_SCENARIO,
      maritimeBus: bridgeBus,
      rangeNm: 6,
      gain: 55,
      rainIntensityOverride: val,
    });
    assert.ok(res.stats.effectiveRainIntensity >= prevNormEff, `Non-monotonic rainIntensityOverride at ${val}`);
    assert.ok(res.stats.totalEnergy >= prevNormEnergy, `Non-monotonic rain energy at ${val}`);
    prevNormEff = res.stats.effectiveRainIntensity;
    prevNormEnergy = res.stats.totalEnergy;
  }
  assert.equal(prevNormEff, 1);

  const pctOverrides = [0, 1, 2, 50, 100];
  let prevPctEff = -1;
  let prevPctEnergy = -1;
  for (const pct of pctOverrides) {
    const res = evaluatePolarEchoGrid({
      scenario: DEFAULT_BRIDGE_WORLD_SCENARIO,
      maritimeBus: bridgeBus,
      rangeNm: 6,
      gain: 55,
      rainPercentOverride: pct,
    });
    assert.ok(res.stats.effectiveRainIntensity >= prevPctEff, `Non-monotonic rainPercentOverride at ${pct}`);
    assert.ok(res.stats.totalEnergy >= prevPctEnergy, `Non-monotonic rainPercentOverride energy at ${pct}`);
    prevPctEff = res.stats.effectiveRainIntensity;
    prevPctEnergy = res.stats.totalEnergy;
  }
  assert.equal(prevPctEff, 1);

  // Corrupt rainSqualls ([null, {}]) with rain override never throws and falls back cleanly
  const corruptRainRes = evaluatePolarEchoGrid({
    weather: { seaState: 0, windDirDeg: 90, rainSqualls: [null, {}] },
    rainIntensityOverride: 0.8,
    rangeNm: 6,
    gain: 55,
  });
  assert.equal(corruptRainRes.stats.activeRainCells, 1);
  assert.ok(corruptRainRes.stats.totalEnergy > 0);

  // Corrupt rainSqualls without rain override must report 0 cells, 0 intensity, and 0 energy
  const corruptNoOverrideRes = evaluatePolarEchoGrid({
    weather: {
      seaState: 0,
      windDirDeg: 90,
      rainSqualls: [null, {}, { lat: NaN, lon: 107 }, { lat: 10, lon: Infinity }],
    },
    rangeNm: 6,
    gain: 55,
  });
  assert.equal(corruptNoOverrideRes.stats.activeRainCells, 0);
  assert.equal(corruptNoOverrideRes.stats.effectiveRainIntensity, 0);
  assert.equal(corruptNoOverrideRes.stats.totalEnergy, 0);

  // Off-screen targets & buoys at 0.0625 NM must NOT be counted in stats
  const offScreenRes = evaluatePolarEchoGrid({
    ownship: { lat: 10.0, lon: 107.0 },
    rangeNm: 0.0625,
    gain: 55,
    radarContacts: [{ contactId: "tgt-off", bearingDeg: 90, rangeNm: 0.10, rcsSqm: 1000 }],
    buoys: [{ id: "b-off", lat: 10.0 + 0.10 / 60, lon: 107.0, rcsSqm: 50 }],
  });
  assert.equal(offScreenRes.stats.nonZeroBins, 0);
  assert.equal(offScreenRes.stats.renderedContacts, 0);
  assert.equal(offScreenRes.stats.occludedContacts, 0);
  assert.equal(offScreenRes.stats.renderedBuoys, 0);

  // Tight 0.0625 NM boundary: 0.0632 NM off-screen contact/buoy stays uncounted, while 0.0625 NM renders
  const tightOffRes = evaluatePolarEchoGrid({
    ownship: { lat: 10.0, lon: 107.0 },
    rangeNm: 0.0625,
    gain: 55,
    radarContacts: [{ contactId: "tgt-tight-off", bearingDeg: 90, rangeNm: 0.0632, rcsSqm: 1000 }],
    buoys: [{ id: "b-tight-off", lat: 10.0 + 0.0632 / 60, lon: 107.0, rcsSqm: 50 }],
  });
  assert.equal(tightOffRes.stats.renderedContacts, 0);
  assert.equal(tightOffRes.stats.renderedBuoys, 0);
  assert.equal(tightOffRes.stats.nonZeroBins, 0);

  const onRingRes = evaluatePolarEchoGrid({
    ownship: { lat: 10.0, lon: 107.0 },
    rangeNm: 0.0625,
    gain: 55,
    radarContacts: [{ contactId: "tgt-on-ring", bearingDeg: 90, rangeNm: 0.0625, rcsSqm: 1000 }],
  });
  assert.equal(onRingRes.stats.renderedContacts, 1);
  assert.ok(onRingRes.stats.nonZeroBins > 0);

  // Hardening: negative lengthM/beamM clamped and extreme simTick=1e308 never produces NaN
  const negDimRes = evaluatePolarEchoGrid({
    ownship: { lat: 10.0, lon: 107.0 },
    rangeNm: 6,
    gain: 55,
    radarContacts: [{ contactId: "tgt-negdim", bearingDeg: 90, rangeNm: 3.0, rcsSqm: 100, lengthM: -5000, beamM: -200 }],
  });
  const zeroDimRes = evaluatePolarEchoGrid({
    ownship: { lat: 10.0, lon: 107.0 },
    rangeNm: 6,
    gain: 55,
    radarContacts: [{ contactId: "tgt-zerodim", bearingDeg: 90, rangeNm: 3.0, rcsSqm: 100, lengthM: 0, beamM: 0 }],
  });
  assert.deepEqual(negDimRes.grid, zeroDimRes.grid);

  const hugeTickRes = evaluatePolarEchoGrid({
    ownship: { lat: 10.0, lon: 107.0 },
    rangeNm: 6,
    gain: 55,
    interferenceSource: true,
    ir: "OFF",
    simTick: 1e308,
  });
  assert.ok(hugeTickRes.stats.interferenceDotsInjected > 0);
  assert.ok(hugeTickRes.stats.totalEnergy > 0);

  // Performance budget checks (< 1.5 ms average over 120 frames after JIT warmup)
  // 1) Coastal 6 NM
  for (let i = 0; i < 60; i++) {
    evaluatePolarEchoGrid({
      scenario: MDC2060_COASTAL_SCENARIO,
      maritimeBus: bus0,
      rangeNm: 6,
      gain: 55,
      stc: 20,
      simTick: i,
    });
  }
  const t0 = performance.now();
  const N = 120;
  for (let i = 0; i < N; i++) {
    evaluatePolarEchoGrid({
      scenario: MDC2060_COASTAL_SCENARIO,
      maritimeBus: bus0,
      rangeNm: 6,
      gain: 55,
      stc: 20,
      simTick: i,
    });
  }
  const coastalAvgMs = (performance.now() - t0) / N;
  assert.ok(coastalAvgMs < 1.5, `Expected coastal average frame time < 1.5 ms, got ${coastalAvgMs.toFixed(3)} ms`);

  // 2) Storm 6 NM (STC=35, FTC=5, IR=2, interference=true) at gain=55 AND elevated thermal gain=75
  const stormBus0 = projectMaritimeSensorBus(
    MDC2060_STORM_SCENARIO,
    initialMaritimeWorldState(MDC2060_STORM_SCENARIO)
  );
  for (const [label, opts] of [
    ["storm_g55_ftc5_ir2", { scenario: MDC2060_STORM_SCENARIO, maritimeBus: stormBus0, rangeNm: 6, gain: 55, stc: 35, ftc: 5, ir: "2", interferenceSource: true }],
    ["storm_g75_thermal_ftc5_ir1", { scenario: MDC2060_STORM_SCENARIO, maritimeBus: stormBus0, rangeNm: 6, gain: 75, stc: 35, ftc: 5, ir: "1", interferenceSource: true }],
  ]) {
    for (let i = 0; i < 60; i++) {
      evaluatePolarEchoGrid({ ...opts, simTick: i });
    }
    const ts = performance.now();
    for (let i = 0; i < N; i++) {
      evaluatePolarEchoGrid({ ...opts, simTick: i });
    }
    const stormAvgMs = (performance.now() - ts) / N;
    assert.ok(stormAvgMs < 1.5, `Expected ${label} average frame time < 1.5 ms, got ${stormAvgMs.toFixed(3)} ms`);
  }
});

test("radar-signal.mjs: distant rain independence (zero spooky action) and exact stats-vs-grid parity", () => {
  const coastalBus = projectMaritimeSensorBus(
    MDC2060_COASTAL_SCENARIO,
    initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO)
  );
  const stormBus = projectMaritimeSensorBus(
    MDC2060_STORM_SCENARIO,
    initialMaritimeWorldState(MDC2060_STORM_SCENARIO)
  );

  // 1) Distant rain squall (>= 4.97 NM) on MDC2060_COASTAL_SCENARIO must change ZERO dry pixels in az=60..89, b=0..100
  const dryBase = evaluatePolarEchoGrid({
    scenario: MDC2060_COASTAL_SCENARIO,
    maritimeBus: coastalBus,
    rangeNm: 6,
    gain: 75,
    stc: 0,
    ftc: 0,
    rainIntensityOverride: 0,
    simTick: 0,
  });
  for (const rainIntensityOverride of [0.0001, 0.45]) {
    const wetRes = evaluatePolarEchoGrid({
      scenario: MDC2060_COASTAL_SCENARIO,
      maritimeBus: coastalBus,
      rangeNm: 6,
      gain: 75,
      stc: 0,
      ftc: 0,
      rainIntensityOverride,
      simTick: 0,
    });
    let dryDiffs = 0;
    for (let az = 60; az <= 89; az++) {
      const off = az * POLAR_NUM_RANGE_BINS;
      for (let b = 0; b <= 100; b++) {
        if (dryBase.grid[off + b] !== wetRes.grid[off + b]) dryDiffs++;
      }
    }
    assert.equal(dryDiffs, 0, `Distant rain (${rainIntensityOverride}) altered ${dryDiffs} dry pixels in 0..3.75 NM`);
  }

  // 2) Weak target on sea clutter (3.5 NM, az=90) must be bit-for-bit identical when adding a disjoint squall at 5.5 NM
  const own = { lat: 10.22, lon: 107.18, hdgDeg: 90, cogDeg: 90, sogKn: 0 };
  const weakTarget = [{ contactId: "small-boat", rangeNm: 3.5, bearingDeg: 90, rcsSqm: 1.5, lengthM: 10, beamM: 3, hdgDeg: 90 }];
  const cosLat = Math.cos(own.lat * (Math.PI / 180));
  const noSquall = evaluatePolarEchoGrid({
    ownship: own,
    radarContacts: weakTarget,
    weather: { seaState: 5, windDirDeg: 90, rainSqualls: [] },
    rangeNm: 6,
    gain: 35,
    stc: 0,
    ftc: 0,
    seed: 2061,
    simTick: 5,
  });
  const withFarSquall = evaluatePolarEchoGrid({
    ownship: own,
    radarContacts: weakTarget,
    weather: {
      seaState: 5,
      windDirDeg: 90,
      rainSqualls: [{ id: "sq-far", lat: own.lat, lon: own.lon + 5.5 / (60 * cosLat), radiusNm: 0.35, intensity: 0.85, driftKn: 0 }],
    },
    rangeNm: 6,
    gain: 35,
    stc: 0,
    ftc: 0,
    seed: 2061,
    simTick: 5,
  });
  const centerBin = Math.round((3.5 / 6) * POLAR_NUM_RANGE_BINS - 0.5);
  for (let az = 88; az <= 92; az++) {
    const off = az * POLAR_NUM_RANGE_BINS;
    for (let b = centerBin - 2; b <= centerBin + 2; b++) {
      assert.equal(
        noSquall.grid[off + b],
        withFarSquall.grid[off + b],
        `Disjoint far squall changed weak-target pixel at az=${az}, b=${b}`
      );
    }
  }

  // 3) Exact stats-vs-grid parity across Coastal, Storm g55, Storm g75 thermal, Storm g75+PEAK, and empty g75 thermal
  const parityCases = [
    ["coastal_default", { scenario: MDC2060_COASTAL_SCENARIO, maritimeBus: coastalBus, rangeNm: 6, gain: 55, stc: 20, simTick: 2 }],
    ["storm_g55", { scenario: MDC2060_STORM_SCENARIO, maritimeBus: stormBus, rangeNm: 6, gain: 55, stc: 35, ftc: 5, ir: "2", interferenceSource: true, simTick: 3 }],
    ["storm_g75_thermal", { scenario: MDC2060_STORM_SCENARIO, maritimeBus: stormBus, rangeNm: 6, gain: 75, stc: 35, ftc: 5, ir: "1", interferenceSource: true, simTick: 3 }],
    ["storm_g75_peak", { scenario: MDC2060_STORM_SCENARIO, maritimeBus: stormBus, rangeNm: 6, gain: 75, stc: 35, ftc: 5, ir: "1", process: "PEAK", interferenceSource: true, simTick: 3 }],
    ["empty_g75_thermal", { ownship: own, rangeNm: 6, gain: 75, stc: 0, ftc: 0, simTick: 4 }],
  ];
  for (const [label, opts] of parityCases) {
    const res = evaluatePolarEchoGrid(opts);
    const nearMaxBin = Math.min(POLAR_NUM_RANGE_BINS, Math.ceil((2.5 / res.rangeNm) * POLAR_NUM_RANGE_BINS));
    let maxLevel = 0;
    let nonZeroBins = 0;
    let totalEnergy = 0;
    let nearClutterEnergy = 0;
    for (let az = 0; az < POLAR_NUM_AZIMUTHS; az++) {
      const off = az * POLAR_NUM_RANGE_BINS;
      for (let b = 0; b < POLAR_NUM_RANGE_BINS; b++) {
        const v = res.grid[off + b];
        if (v > maxLevel) maxLevel = v;
        if (v > 0) nonZeroBins++;
        totalEnergy += v;
        if (b < nearMaxBin) nearClutterEnergy += v;
      }
    }
    assert.equal(res.stats.maxLevel, maxLevel, `${label}: maxLevel mismatch`);
    assert.equal(res.stats.nonZeroBins, nonZeroBins, `${label}: nonZeroBins mismatch`);
    assert.equal(res.stats.totalEnergy, totalEnergy, `${label}: totalEnergy mismatch`);
    assert.equal(res.stats.nearClutterEnergy, nearClutterEnergy, `${label}: nearClutterEnergy mismatch`);
  }
});

test("radar-signal.mjs: land ray-casting, leading shoreline return, and island radar shadow (x0.12)", () => {
  const own = MDC2060_COASTAL_SCENARIO.ownship;
  const lands = MDC2060_COASTAL_SCENARIO.landmasses;

  // Az 026° hits island-hon-ba (1.929..2.459 NM); point at 3.5 NM is occluded, point at 1.2 NM is clear
  assert.equal(isPointOccludedByLand(own, 26.0, 3.5, lands), true);
  assert.equal(isPointOccludedByLand(own, 26.0, 1.2, lands), false);
  // Az 258° hits island-hon-cau (1.893..2.454 NM); buoy-shoal at 3.6 NM is occluded
  assert.equal(isPointOccludedByLand(own, 258.0, 3.6, lands), true);

  // Leading shoreline of coast-nw along 336° (~3.39 NM) should produce strong video (>= 6)
  const coastalRes = evaluatePolarEchoGrid({
    scenario: MDC2060_COASTAL_SCENARIO,
    maritimeBus: projectMaritimeSensorBus(
      MDC2060_COASTAL_SCENARIO,
      initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO)
    ),
    rangeNm: 6,
    gain: 55,
    stc: 0,
  });
  const shorePatch = samplePatchStats(coastalRes.grid, 6, 336, 3.39, 1, 2);
  assert.ok(shorePatch.maxVal >= 6, `Expected leading shore return >= 6, got ${shorePatch.maxVal}`);

  // Synthetic target behind island-hon-ba (az=26°, range=3.5 NM, rcs=1400): compare occluded vs open water
  const hiddenContact = [
    { contactId: "tgt-shadow-test", rcsSqm: 1400, rangeNm: 3.5, bearingDeg: 26.0, lengthM: 140, beamM: 22 },
  ];
  const openRes = evaluatePolarEchoGrid({
    ownship: own,
    landmasses: [],
    buoys: [],
    radarContacts: hiddenContact,
    rangeNm: 6,
    gain: 55,
    stc: 0,
    seaStateOverride: 0,
    rainIntensityOverride: 0,
  });
  const shadowedRes = evaluatePolarEchoGrid({
    ownship: own,
    landmasses: lands,
    buoys: [],
    radarContacts: hiddenContact,
    rangeNm: 6,
    gain: 55,
    stc: 0,
    seaStateOverride: 0,
    rainIntensityOverride: 0,
  });
  assert.equal(openRes.stats.occludedContacts, 0);
  assert.equal(shadowedRes.stats.occludedContacts, 1);

  const bin35 = Math.round((3.5 / 6) * 160 - 0.5);
  assert.equal(shadowedRes.shadowMask[26 * 160 + bin35], 1);
  const openPatch = samplePatchStats(openRes.grid, 6, 26, 3.5, 1, 1);
  const shadowPatch = samplePatchStats(shadowedRes.grid, 6, 26, 3.5, 1, 1);
  assert.ok(openPatch.maxVal >= 6, `Expected unoccluded target >= 6, got ${openPatch.maxVal}`);
  assert.ok(
    shadowPatch.maxVal <= 2 && shadowPatch.maxVal < openPatch.maxVal,
    `Expected occluded target strongly attenuated (<=2), got ${shadowPatch.maxVal} vs ${openPatch.maxVal}`
  );

  // Ownship inside polygon must not throw or produce NaN
  const insidePoly = [{ polygon: [
    { lat: own.lat - 0.05, lon: own.lon - 0.05 },
    { lat: own.lat - 0.05, lon: own.lon + 0.05 },
    { lat: own.lat + 0.05, lon: own.lon + 0.05 },
    { lat: own.lat + 0.05, lon: own.lon - 0.05 },
  ] }];
  const insideRes = evaluatePolarEchoGrid({ ownship: own, landmasses: insidePoly, rangeNm: 6 });
  assert.equal(insideRes.grid.length, 57600);
});

test("radar-signal.mjs: STC suppresses near sea clutter, attenuates HAI AU 18 at high STC, and STC Curve adjusts roll-off", () => {
  const stormBus = projectMaritimeSensorBus(
    MDC2060_STORM_SCENARIO,
    initialMaritimeWorldState(MDC2060_STORM_SCENARIO)
  );
  const energies = [0, 20, 40, 60, 80].map(stc =>
    evaluatePolarEchoGrid({
      scenario: MDC2060_STORM_SCENARIO,
      maritimeBus: stormBus,
      rangeNm: 6,
      gain: 55,
      stc,
      rainIntensityOverride: 0,
    }).stats.nearClutterEnergy
  );
  for (let i = 1; i < energies.length; i++) {
    assert.ok(
      energies[i] < energies[i - 1],
      `Expected monotonic STC reduction at step ${i}: ${energies.join(" > ")}`
    );
  }
  assert.ok(energies[4] < energies[0] * 0.25, "STC=80 should drastically suppress storm sea clutter");

  // Wind anisotropy: upwind energy > downwind energy
  const windGrid = evaluatePolarEchoGrid({
    ownship: MDC2060_COASTAL_SCENARIO.ownship,
    landmasses: [],
    buoys: [],
    radarContacts: [],
    weather: { seaState: 4, windDirDeg: 135, windSpeedKn: 20, rainSqualls: [] },
    rangeNm: 6,
    gain: 55,
    stc: 0,
  }).grid;
  const upwind = samplePatchStats(windGrid, 6, 135, 1.2, 15, 15).sum;
  const downwind = samplePatchStats(windGrid, 6, 315, 1.2, 15, 15).sum;
  assert.ok(upwind > downwind * 1.5, `Expected upwind (${upwind}) > 1.5x downwind (${downwind})`);

  // Excessive STC (90) attenuates near small fishing boat HAI AU 18 (~1.4 NM @ 138°) while PACIFIC STAR survives
  const coastalBus = projectMaritimeSensorBus(
    MDC2060_COASTAL_SCENARIO,
    initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO)
  );
  const lowStc = evaluatePolarEchoGrid({
    scenario: MDC2060_COASTAL_SCENARIO,
    maritimeBus: coastalBus,
    rangeNm: 6,
    gain: 55,
    stc: 0,
    seaStateOverride: 0,
    rainIntensityOverride: 0,
  });
  const highStc = evaluatePolarEchoGrid({
    scenario: MDC2060_COASTAL_SCENARIO,
    maritimeBus: coastalBus,
    rangeNm: 6,
    gain: 55,
    stc: 90,
    seaStateOverride: 0,
    rainIntensityOverride: 0,
  });
  const haiAuLow = samplePatchStats(lowStc.grid, 6, 138, 1.4, 2, 2).maxVal;
  const haiAuHigh = samplePatchStats(highStc.grid, 6, 138, 1.4, 2, 2).maxVal;
  const pacLow = samplePatchStats(lowStc.grid, 6, 112, 4.08, 2, 2).maxVal;
  const pacHigh = samplePatchStats(highStc.grid, 6, 112, 4.08, 2, 2).maxVal;
  assert.ok(haiAuLow >= 5, `Expected HAI AU 18 strong at STC=0, got ${haiAuLow}`);
  assert.ok(haiAuHigh <= 1, `Expected HAI AU 18 heavily attenuated at STC=90, got ${haiAuHigh}`);
  assert.ok(pacHigh >= 5 && pacLow >= 6, `Expected distant PACIFIC STAR to remain strong (low=${pacLow}, high=${pacHigh})`);

  // STC Curve 1 vs 8 at STC=50
  const curve1 = evaluatePolarEchoGrid({
    scenario: MDC2060_STORM_SCENARIO,
    maritimeBus: stormBus,
    rangeNm: 6,
    gain: 55,
    stc: 50,
    stcCurve: 1,
    rainIntensityOverride: 0,
  }).stats.nearClutterEnergy;
  const curve8 = evaluatePolarEchoGrid({
    scenario: MDC2060_STORM_SCENARIO,
    maritimeBus: stormBus,
    rangeNm: 6,
    gain: 55,
    stc: 50,
    stcCurve: 8,
    rainIntensityOverride: 0,
  }).stats.nearClutterEnergy;
  assert.ok(curve8 < curve1, `Expected deeper STC Curve 8 (${curve8}) < Curve 1 (${curve1})`);
});

test("radar-signal.mjs: FTC dissolves storm rain squalls while preserving MEKONG CONTAINER edge return", () => {
  const stormBus = projectMaritimeSensorBus(
    MDC2060_STORM_SCENARIO,
    initialMaritimeWorldState(MDC2060_STORM_SCENARIO)
  );
  const mekong = stormBus.radarContacts.find(c => c.contactId === "tgt-574004401");

  const ftc0 = evaluatePolarEchoGrid({
    scenario: MDC2060_STORM_SCENARIO,
    maritimeBus: stormBus,
    rangeNm: 6,
    gain: 55,
    stc: 35,
    ftc: 0,
  });
  const ftc5 = evaluatePolarEchoGrid({
    scenario: MDC2060_STORM_SCENARIO,
    maritimeBus: stormBus,
    rangeNm: 6,
    gain: 55,
    stc: 35,
    ftc: 5,
  });
  const ftc8 = evaluatePolarEchoGrid({
    scenario: MDC2060_STORM_SCENARIO,
    maritimeBus: stormBus,
    rangeNm: 6,
    gain: 55,
    stc: 35,
    ftc: 8,
  });

  // Sample surrounding rain bulk inside squall-storm-1 (~10° off MEKONG CONTAINER)
  const rainAz = Math.round(mekong.bearingDeg) + 10;
  const rainBulk0 = samplePatchStats(ftc0.grid, 6, rainAz, mekong.rangeNm, 3, 5).mean;
  const rainBulk5 = samplePatchStats(ftc5.grid, 6, rainAz, mekong.rangeNm, 3, 5).mean;
  const rainBulk8 = samplePatchStats(ftc8.grid, 6, rainAz, mekong.rangeNm, 3, 5).mean;

  assert.ok(rainBulk0 > 2.0, `Expected dense storm rain bulk at FTC=0, got ${rainBulk0}`);
  assert.ok(rainBulk5 < rainBulk0 * 0.5, `Expected FTC=5 to dissolve rain bulk (${rainBulk5} vs ${rainBulk0})`);
  assert.ok(rainBulk8 <= rainBulk5, `Expected FTC=8 <= FTC=5 (${rainBulk8} vs ${rainBulk5})`);

  // MEKONG CONTAINER leading edge inside squall-storm-1 must remain strongly detectable (>= 6)
  const ship0 = samplePatchStats(ftc0.grid, 6, mekong.bearingDeg, mekong.rangeNm, 2, 2).maxVal;
  const ship5 = samplePatchStats(ftc5.grid, 6, mekong.bearingDeg, mekong.rangeNm, 2, 2).maxVal;
  const ship8 = samplePatchStats(ftc8.grid, 6, mekong.bearingDeg, mekong.rangeNm, 2, 2).maxVal;
  assert.ok(ship0 >= 6 && ship5 >= 6 && ship8 >= 6, `Expected ship edge >= 6 across FTC (0:${ship0}, 5:${ship5}, 8:${ship8})`);
  assert.ok(ship5 > rainBulk5 + 3.5, "Ship contrast above surrounding rain must be dramatic at FTC=5");

  // Verify squall driftKn advects rain squall position deterministically over simTick
  const rainT0 = evaluatePolarEchoGrid({
    scenario: MDC2060_STORM_SCENARIO,
    maritimeBus: stormBus,
    rangeNm: 6,
    gain: 55,
    stc: 60,
    ftc: 0,
    simTick: 0,
  });
  const rainT360 = evaluatePolarEchoGrid({
    scenario: MDC2060_STORM_SCENARIO,
    maritimeBus: stormBus,
    rangeNm: 6,
    gain: 55,
    stc: 60,
    ftc: 0,
    simTick: 360,
  });
  assert.notDeepEqual(rainT0.grid, rainT360.grid);
});

test("radar-signal.mjs: GAIN, subGain, IR (OFF..3), PW (AUTO/S1/L), EXP (OFF/1/2), and PROCESS alignment", () => {
  const coastalBus = projectMaritimeSensorBus(
    MDC2060_COASTAL_SCENARIO,
    initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO)
  );

  // GAIN monotonicity + subGain offset
  const g10 = evaluatePolarEchoGrid({ scenario: MDC2060_COASTAL_SCENARIO, maritimeBus: coastalBus, gain: 10 }).stats.totalEnergy;
  const g55 = evaluatePolarEchoGrid({ scenario: MDC2060_COASTAL_SCENARIO, maritimeBus: coastalBus, gain: 55 }).stats.totalEnergy;
  const g95 = evaluatePolarEchoGrid({ scenario: MDC2060_COASTAL_SCENARIO, maritimeBus: coastalBus, gain: 95 }).stats.totalEnergy;
  assert.ok(g10 < g55 && g55 < g95, `Expected GAIN energy g10(${g10}) < g55(${g55}) < g95(${g95})`);

  const g55SubPlus15 = evaluatePolarEchoGrid({ scenario: MDC2060_COASTAL_SCENARIO, maritimeBus: coastalBus, gain: 55, subGain: 15 });
  const g70Sub0 = evaluatePolarEchoGrid({ scenario: MDC2060_COASTAL_SCENARIO, maritimeBus: coastalBus, gain: 70, subGain: 0 });
  assert.equal(g55SubPlus15.stats.effectiveGain, 70);
  assert.deepEqual(g55SubPlus15.grid, g70Sub0.grid);

  // IR progressive suppression: OFF > 1 > 2 > 3 === clean baseline
  const clean = evaluatePolarEchoGrid({
    ownship: MDC2060_COASTAL_SCENARIO.ownship,
    radarContacts: [],
    rangeNm: 6,
    gain: 55,
    interferenceSource: false,
  });
  const irOff = evaluatePolarEchoGrid({
    ownship: MDC2060_COASTAL_SCENARIO.ownship,
    radarContacts: [],
    rangeNm: 6,
    gain: 55,
    interferenceSource: true,
    ir: "OFF",
  });
  const ir1 = evaluatePolarEchoGrid({
    ownship: MDC2060_COASTAL_SCENARIO.ownship,
    radarContacts: [],
    rangeNm: 6,
    gain: 55,
    interferenceSource: true,
    ir: "1",
  });
  const ir2 = evaluatePolarEchoGrid({
    ownship: MDC2060_COASTAL_SCENARIO.ownship,
    radarContacts: [],
    rangeNm: 6,
    gain: 55,
    interferenceSource: true,
    ir: "2",
  });
  const ir3 = evaluatePolarEchoGrid({
    ownship: MDC2060_COASTAL_SCENARIO.ownship,
    radarContacts: [],
    rangeNm: 6,
    gain: 55,
    interferenceSource: true,
    ir: "3",
  });
  assert.ok(irOff.stats.interferenceDotsInjected > ir1.stats.interferenceDotsInjected);
  assert.ok(ir1.stats.interferenceDotsInjected > ir2.stats.interferenceDotsInjected);
  assert.ok(ir2.stats.interferenceDotsInjected > 0);
  assert.equal(ir3.stats.interferenceDotsInjected, 0);
  assert.deepEqual(ir3.grid, clean.grid);

  // PW AUTO selection & S1 vs L footprint
  const singleContact = [{ contactId: "tgt-pilot", rcsSqm: 32, rangeNm: 2.25, bearingDeg: 180, lengthM: 16, beamM: 4.5 }];
  const pwAuto = evaluatePolarEchoGrid({ ownship: MDC2060_COASTAL_SCENARIO.ownship, radarContacts: singleContact, rangeNm: 6, pw: "AUTO" });
  assert.equal(pwAuto.stats.effectivePw, "M2");
  const pwS1 = evaluatePolarEchoGrid({ ownship: MDC2060_COASTAL_SCENARIO.ownship, radarContacts: singleContact, rangeNm: 6, pw: "S1" });
  const pwL = evaluatePolarEchoGrid({ ownship: MDC2060_COASTAL_SCENARIO.ownship, radarContacts: singleContact, rangeNm: 6, pw: "L" });
  assert.ok(pwL.stats.nonZeroBins > pwS1.stats.nonZeroBins, `Expected PW L (${pwL.stats.nonZeroBins}) > S1 (${pwS1.stats.nonZeroBins})`);

  // EXP monotonicity: OFF < 1 < 2
  const expOff = evaluatePolarEchoGrid({ ownship: MDC2060_COASTAL_SCENARIO.ownship, radarContacts: singleContact, rangeNm: 6, exp: "OFF" });
  const exp1 = evaluatePolarEchoGrid({ ownship: MDC2060_COASTAL_SCENARIO.ownship, radarContacts: singleContact, rangeNm: 6, exp: "1" });
  const exp2 = evaluatePolarEchoGrid({ ownship: MDC2060_COASTAL_SCENARIO.ownship, radarContacts: singleContact, rangeNm: 6, exp: "2" });
  assert.ok(
    expOff.stats.nonZeroBins < exp1.stats.nonZeroBins && exp1.stats.nonZeroBins < exp2.stats.nonZeroBins,
    `Expected EXP bins OFF(${expOff.stats.nonZeroBins}) < 1(${exp1.stats.nonZeroBins}) < 2(${exp2.stats.nonZeroBins})`
  );

  // PROCESS option normalization across spec forms ("AVG1"/"AVG2"/"PEAK") and numeric forms ("1"/"2"/"3")
  const procAvg1 = evaluatePolarEchoGrid({ scenario: MDC2060_COASTAL_SCENARIO, maritimeBus: coastalBus, gain: 85, process: "AVG1" });
  const proc1 = evaluatePolarEchoGrid({ scenario: MDC2060_COASTAL_SCENARIO, maritimeBus: coastalBus, gain: 85, process: "1" });
  const procPeak = evaluatePolarEchoGrid({ scenario: MDC2060_COASTAL_SCENARIO, maritimeBus: coastalBus, gain: 85, process: "PEAK" });
  const proc3 = evaluatePolarEchoGrid({ scenario: MDC2060_COASTAL_SCENARIO, maritimeBus: coastalBus, gain: 85, process: 3 });
  assert.deepEqual(procAvg1.grid, proc1.grid);
  assert.deepEqual(procPeak.grid, proc3.grid);

  // PROCESS physics: strictly reduces isolated interference speckles (both nonZeroBins & totalEnergy)
  // without smearing dots into adjacent empty water, while preserving level-7 vessel peak under PEAK
  const shipContact = [{ contactId: "tgt-proc-ship", rcsSqm: 1400, rangeNm: 3.0, bearingDeg: 90, lengthM: 140, beamM: 22 }];
  const procResults = ["OFF", "AVG1", "AVG2", "PEAK"].map(proc => {
    const r = evaluatePolarEchoGrid({
      ownship: { lat: 10.0, lon: 107.0 },
      radarContacts: shipContact,
      rangeNm: 6,
      gain: 55,
      interferenceSource: true,
      ir: "OFF",
      process: proc,
    });
    return {
      proc,
      nonZeroBins: r.stats.nonZeroBins,
      totalEnergy: r.stats.totalEnergy,
      shipPeak: samplePatchStats(r.grid, 6, 90, 3.0, 2, 2).maxVal,
    };
  });
  assert.ok(
    procResults[0].nonZeroBins > procResults[1].nonZeroBins &&
    procResults[1].nonZeroBins > procResults[2].nonZeroBins &&
    procResults[2].nonZeroBins > procResults[3].nonZeroBins,
    `Expected PROCESS to strictly suppress isolated speckle count: ${JSON.stringify(procResults)}`
  );
  assert.ok(
    procResults[0].totalEnergy > procResults[1].totalEnergy &&
    procResults[1].totalEnergy > procResults[2].totalEnergy &&
    procResults[2].totalEnergy > procResults[3].totalEnergy,
    `Expected PROCESS to strictly suppress isolated speckle energy: ${JSON.stringify(procResults)}`
  );
  assert.equal(procResults[0].shipPeak, 7);
  assert.equal(procResults[3].shipPeak, 7, "PEAK mode must preserve coherent level-7 vessel return");
});

test("radar-signal.mjs: malformed mmsi guards and ifBuf exception-safety recovery across subsequent calls", () => {
  const coastalBus = projectMaritimeSensorBus(
    MDC2060_COASTAL_SCENARIO,
    initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO)
  );
  const stormBus = projectMaritimeSensorBus(
    MDC2060_STORM_SCENARIO,
    initialMaritimeWorldState(MDC2060_STORM_SCENARIO)
  );

  const coastalParams = {
    scenario: MDC2060_COASTAL_SCENARIO,
    maritimeBus: coastalBus,
    rangeNm: 6,
    gain: 55,
    stc: 20,
    ftc: 0,
    simTick: 0,
  };
  const emptyOceanParams = {
    ownship: { lat: 10.22, lon: 107.18, hdgDeg: 0, cogDeg: 0, sogKn: 0 },
    landmasses: [],
    buoys: [],
    radarContacts: [],
    weather: { seaState: 0, rainSqualls: [] },
    rangeNm: 6,
    gain: 55,
    stc: 0,
    ftc: 0,
    process: "OFF",
    interferenceSource: false,
    simTick: 0,
  };
  const farProbeParams = {
    ...emptyOceanParams,
    radarContacts: [{ contactId: "probe", bearingDeg: 70, rangeNm: 5.8, rcsSqm: 500 }],
  };

  const baselineCoastal = evaluatePolarEchoGrid(coastalParams);
  const baselineEmpty = evaluatePolarEchoGrid(emptyOceanParams);
  const baselineProbe = evaluatePolarEchoGrid(farProbeParams);
  assert.equal(baselineEmpty.stats.nonZeroBins, 0);
  assert.equal(baselineEmpty.stats.totalEnergy, 0);

  // (a) Non-primitive / non-finite mmsi in aisTargets and scenario.traffic must NOT throw
  //     and must leave subsequent coastal grids bit-for-bit identical to clean baseline.
  const malformedMmsiList = [
    { mmsi: Object.create(null) },
    { mmsi: Symbol("x") },
    { mmsi: NaN },
    { mmsi: Infinity },
  ];
  const resBadAis = evaluatePolarEchoGrid({
    scenario: MDC2060_STORM_SCENARIO,
    maritimeBus: stormBus,
    aisTargets: malformedMmsiList,
    rangeNm: 6,
    gain: 75,
    stc: 0,
    ftc: 0,
    simTick: 0,
  });
  assert.equal(resBadAis.grid.length, POLAR_NUM_AZIMUTHS * POLAR_NUM_RANGE_BINS);
  const coastalAfterBadAis = evaluatePolarEchoGrid(coastalParams);
  assert.deepEqual(coastalAfterBadAis.grid, baselineCoastal.grid);
  assert.deepEqual(coastalAfterBadAis.shadowMask, baselineCoastal.shadowMask);
  assert.deepEqual(coastalAfterBadAis.stats, baselineCoastal.stats);

  // Pass aisTargets: [] so the scenario.traffic fallback map loop is directly exercised
  const resBadTraffic = evaluatePolarEchoGrid({
    scenario: { ...MDC2060_STORM_SCENARIO, traffic: malformedMmsiList },
    maritimeBus: stormBus,
    aisTargets: [],
    rangeNm: 6,
    gain: 75,
    stc: 0,
    ftc: 0,
    simTick: 0,
  });
  assert.equal(resBadTraffic.grid.length, POLAR_NUM_AZIMUTHS * POLAR_NUM_RANGE_BINS);
  const coastalAfterBadTraffic = evaluatePolarEchoGrid(coastalParams);
  assert.deepEqual(coastalAfterBadTraffic.grid, baselineCoastal.grid);
  assert.deepEqual(coastalAfterBadTraffic.shadowMask, baselineCoastal.shadowMask);
  assert.deepEqual(coastalAfterBadTraffic.stats, baselineCoastal.stats);

  // (b) Mid-call throwing getter on radarContacts[0].rangeNm (thrown in Stage 4 AFTER
  //     Stages 1-2 wrote storm land/rain into ifBuf) must recover cleanly via ifBufDirty.
  const makeThrowingContact = () => {
    const contact = { contactId: "tgt-boom", bearingDeg: 70, rcsSqm: 500 };
    Object.defineProperty(contact, "rangeNm", {
      enumerable: true,
      get() {
        throw new Error("mid_stage4_contact_boom");
      },
    });
    return contact;
  };
  const triggerMidStage4Throw = () => {
    assert.throws(
      () => evaluatePolarEchoGrid({
        scenario: MDC2060_STORM_SCENARIO,
        maritimeBus: stormBus,
        radarContacts: [makeThrowingContact()],
        rangeNm: 6,
        gain: 75,
        stc: 0,
        ftc: 0,
        simTick: 0,
      }),
      /mid_stage4_contact_boom/
    );
  };

  // Immediate MDC2060_COASTAL_SCENARIO call after throw -> 0 leaked ghost pixels
  triggerMidStage4Throw();
  const recoveredCoastal = evaluatePolarEchoGrid(coastalParams);
  assert.deepEqual(recoveredCoastal.grid, baselineCoastal.grid);
  assert.deepEqual(recoveredCoastal.shadowMask, baselineCoastal.shadowMask);
  assert.deepEqual(recoveredCoastal.stats, baselineCoastal.stats);

  // Immediate empty-ocean call after throw -> 0 leaked pixels, followed by far-probe -> 0 leaked ghost pixels
  triggerMidStage4Throw();
  const recoveredEmpty = evaluatePolarEchoGrid(emptyOceanParams);
  assert.deepEqual(recoveredEmpty.grid, baselineEmpty.grid);
  assert.deepEqual(recoveredEmpty.stats, baselineEmpty.stats);
  const probeAfterEmpty = evaluatePolarEchoGrid(farProbeParams);
  assert.deepEqual(probeAfterEmpty.grid, baselineProbe.grid);
  assert.deepEqual(probeAfterEmpty.stats, baselineProbe.stats);

  // Immediate far-probe call directly after throw (rowMaxBin[70] spans storm squall bins) -> 0 leaked ghost pixels
  triggerMidStage4Throw();
  const probeDirectlyAfterThrow = evaluatePolarEchoGrid(farProbeParams);
  assert.deepEqual(probeDirectlyAfterThrow.grid, baselineProbe.grid);
  assert.deepEqual(probeDirectlyAfterThrow.stats, baselineProbe.stats);

  // Intervening effGain=0 call after throw still clears ifBufDirty before subsequent active call
  triggerMidStage4Throw();
  const zeroGainRecovery = evaluatePolarEchoGrid({ ...coastalParams, gain: 0 });
  assert.equal(zeroGainRecovery.stats.nonZeroBins, 0);
  const probeAfterZeroGain = evaluatePolarEchoGrid(farProbeParams);
  assert.deepEqual(probeAfterZeroGain.grid, baselineProbe.grid);
  assert.deepEqual(probeAfterZeroGain.stats, baselineProbe.stats);
});

// ============================================================================
// 10-18. arpa-ais.mjs: Canonical Purity, ATA, BCR/BCT, $RATTM, AIS, Guard Zone
// ============================================================================

test("arpa-ais.mjs: ATA 6-tick stabilization, CPA/TCPA danger alarm, lost state, and JSON-canonical purity", () => {
  let w = initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO);
  let bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, w);
  const pacContact = bus.radarContacts.find(c => c.contactId === "tgt-574002101");

  let ata = initialAtaState();
  assert.ok(fingerprint(ata).startsWith("f0-fnv1a32-"));
  ata = acquireAtaTarget(ata, pacContact, 0, bus);
  assert.equal(ata.targets.length, 1);
  assert.equal(ata.targets[0].targetId, "T01");
  assert.equal(ata.targets[0].status, "acquiring");
  assert.equal(ata.targets[0].dangerous, false);
  assert.equal(ata.alarmActive, false);
  assert.deepEqual(ata.rattmSentences, []);

  // Ticks 1..5 remain acquiring, non-dangerous, no $RATTM emitted yet
  for (let t = 1; t <= 5; t++) {
    w = advanceMaritimeWorld(MDC2060_COASTAL_SCENARIO, w, 1);
    bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, w);
    ata = stepAtaTracking(ata, bus, { ataCpaLimitNm: 0.5, ataTcpaLimitMin: 15 }, t);
    assert.equal(ata.targets[0].status, "acquiring", `Tick ${t} must still be acquiring`);
    assert.equal(ata.targets[0].dangerous, false);
    assert.deepEqual(ata.rattmSentences, []);
  }

  // Tick 6 stabilizes to tracking -> CPA (~0.28 NM <= 0.5) & TCPA (~10.9 min <= 15) triggers danger alarm & $RATTM
  w = advanceMaritimeWorld(MDC2060_COASTAL_SCENARIO, w, 1);
  bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, w);
  ata = stepAtaTracking(ata, bus, { ataCpaLimitNm: 0.5, ataTcpaLimitMin: 15 }, 6);
  assert.equal(ata.targets[0].status, "tracking");
  assert.equal(ata.targets[0].dangerous, true);
  assert.equal(ata.alarmActive, true);
  assert.deepEqual(ata.dangerousIds, ["T01"]);
  assert.equal(ata.rattmSentences.length, 1);
  assert.ok(ata.rattmSentences[0].includes(",T01,T,"));
  assert.ok(stableSerialize(ata).length > 10);
  assert.ok(fingerprint(ata).startsWith("f0-fnv1a32-"));

  // Disappearing contact becomes "lost" and emits "L" status in $RATTM
  const emptyBus = { ...bus, simTick: 7, radarContacts: [] };
  const lostAta = stepAtaTracking(ata, emptyBus, { ataCpaLimitNm: 0.5, ataTcpaLimitMin: 15 }, 7);
  assert.equal(lostAta.targets[0].status, "lost");
  assert.equal(lostAta.targets[0].dangerous, false);
  assert.equal(lostAta.alarmActive, false);
  assert.ok(lostAta.rattmSentences[0].includes(",T01,L,"));

  // Tier-2 radar-only fallback (no aisTargets on bus) estimates velocity via finite-differencing
  const radarOnlyBus0 = {
    simTick: 0,
    ownship: { lat: 10.0, lon: 107.0, hdgDeg: 0, cogDeg: 0, sogKn: 0 },
    radarContacts: [{ contactId: "tgt-radar-only", rcsSqm: 500, rangeNm: 3.0, bearingDeg: 90 }],
    aisTargets: [],
  };
  let roAta = acquireAtaTarget(initialAtaState(), radarOnlyBus0.radarContacts[0], 0, radarOnlyBus0);
  const radarOnlyBus60 = {
    simTick: 60,
    ownship: radarOnlyBus0.ownship,
    radarContacts: [{ contactId: "tgt-radar-only", rcsSqm: 500, rangeNm: 2.8, bearingDeg: 90 }],
    aisTargets: [],
  };
  roAta = stepAtaTracking(roAta, radarOnlyBus60, {}, 60);
  assert.equal(roAta.targets[0].status, "tracking");
  assert.ok(Math.abs(roAta.targets[0].sogKn - 12.0) < 0.2, `Expected ~12 kn from 0.2 NM/min, got ${roAta.targets[0].sogKn}`);
  assert.ok(Math.abs(roAta.targets[0].cogDeg - 270.0) < 1.0, `Expected ~270° West, got ${roAta.targets[0].cogDeg}`);

  // Canonical purity (no -0, NaN, Infinity, undefined, Map/Set) + snapshotEventData regressions
  assertJsonCanonical(ata, "ata");
  assertJsonCanonical(lostAta, "lostAta");
  assertJsonCanonical(roAta, "roAta");
  snapshotEventData(ata);
  snapshotEventData(lostAta);
  snapshotEventData(roAta);

  // Tiny negative tcpaMin & relBearingDeg must never leak -0
  const negZeroBus1 = {
    simTick: 1,
    ownship: { lat: 10.0, lon: 107.0, hdgDeg: 0, cogDeg: 0, sogKn: 0 },
    radarContacts: [{ contactId: "tgt-negzero", rangeNm: 2.0, bearingDeg: 0, sogKn: 10, cogDeg: 89.9999 }],
    aisTargets: [],
  };
  let nzAta = acquireAtaTarget(initialAtaState(), negZeroBus1.radarContacts[0], 0, negZeroBus1);
  nzAta = stepAtaTracking(nzAta, negZeroBus1, {}, 1);
  assertJsonCanonical(nzAta, "nzAta1");
  snapshotEventData(nzAta);

  const negZeroBus2 = {
    simTick: 2,
    ownship: { lat: 10.0, lon: 107.0, hdgDeg: 0.0001, cogDeg: 0, sogKn: 0 },
    radarContacts: [{ contactId: "tgt-negzero", rangeNm: 2.0, bearingDeg: 0, sogKn: 10, cogDeg: 180 }],
    aisTargets: [],
  };
  const nzAta2 = stepAtaTracking(nzAta, negZeroBus2, {}, 2);
  assertJsonCanonical(nzAta2, "nzAta2");
  snapshotEventData(nzAta2);

  // Partial / empty ownship must never inject NaN
  for (const partialOwn of [{ lat: 10.0, lon: 107.0 }, {}]) {
    const pBus = {
      simTick: 0,
      ownship: partialOwn,
      radarContacts: [{ contactId: "tgt-part", rangeNm: 2.0, bearingDeg: 90, lat: 10.0, lon: 107.05 }],
      aisTargets: [],
    };
    const pAcq = acquireAtaTarget(initialAtaState(), pBus.radarContacts[0], 0, pBus);
    const pStep = stepAtaTracking(pAcq, { ...pBus, simTick: 1 }, {}, 1);
    assertJsonCanonical(pAcq, "partialOwn.acq");
    assertJsonCanonical(pStep, "partialOwn.step");
    snapshotEventData(pAcq);
    snapshotEventData(pStep);
  }

  // Corrupt bearingDeg (NaN/Infinity/undefined) & negative rangeNm must mark target "lost" without NaN or inversion
  const baseOwn = { lat: 10.5, lon: 106.75, hdgDeg: 90, cogDeg: 90, sogKn: 10 };
  const validAcq = acquireAtaTarget(initialAtaState(), { contactId: "c1", rangeNm: 3, bearingDeg: 90 }, 0, { ownship: baseOwn, radarContacts: [] });
  for (const badContact of [
    { contactId: "c1", rangeNm: 3, bearingDeg: NaN, cpaNm: 0.5, tcpaMin: 5 },
    { contactId: "c1", rangeNm: 3, bearingDeg: Infinity },
    { contactId: "c1", rangeNm: 3, bearingDeg: undefined },
    { contactId: "c1", rangeNm: -5, bearingDeg: 90 },
  ]) {
    const stepped = stepAtaTracking(validAcq, { ownship: baseOwn, radarContacts: [badContact] }, {}, 1);
    assert.equal(stepped.targets[0].status, "lost");
    assert.equal(stepped.targets[0].dangerous, false);
    assertJsonCanonical(stepped, "corruptContact");
    snapshotEventData(stepped);
  }

  // [0, 360) wrap invariant on 359.9999 and -1e-17 (never 360)
  for (const wrapAngle of [359.9999, -1e-17]) {
    const wAcq = acquireAtaTarget(
      initialAtaState(),
      { contactId: `w-${wrapAngle}`, rangeNm: 2, bearingDeg: wrapAngle, cogDeg: wrapAngle },
      0,
      null
    );
    assert.equal(wAcq.targets[0].bearingDeg, 0);
    assert.equal(wAcq.targets[0].cogDeg, 0);
    assertJsonCanonical(wAcq, "wrapAngle");
  }
});

test("arpa-ais.mjs: 50-target cap, 51st rejection, duplicate rejection, DEL + slot reuse, DEL ALL", () => {
  let ata = initialAtaState();
  for (let i = 1; i <= 50; i++) {
    ata = acquireAtaTarget(ata, { contactId: `tgt-cap-${i}`, rangeNm: 2.0 + i * 0.05, bearingDeg: (i * 7) % 360 }, 0);
    assert.equal(ata.lastError, null);
    assert.equal(ata.lastAcquiredId, `T${String(i).padStart(2, "0")}`);
  }
  assert.equal(ata.targets.length, 50);
  assert.ok(fingerprint(ata).startsWith("f0-fnv1a32-"));

  // 51st rejected cleanly
  const over = acquireAtaTarget(ata, { contactId: "tgt-cap-51", rangeNm: 5.0, bearingDeg: 90 }, 0);
  assert.equal(over.targets.length, 50);
  assert.equal(over.lastError, "ATA_MAX_CAPACITY");
  assert.equal(over.lastAcquiredId, null);

  // Duplicate rejected cleanly
  const dup = acquireAtaTarget(ata, { contactId: "tgt-cap-5", rangeNm: 2.25, bearingDeg: 35 }, 0);
  assert.equal(dup.targets.length, 50);
  assert.equal(dup.lastError, "ATA_DUPLICATE_CONTACT");
  assert.equal(dup.selectedTargetId, "T05");

  // Invalid contact rejected cleanly
  const bad = acquireAtaTarget(ata, { rangeNm: -1, bearingDeg: NaN }, 0);
  assert.equal(bad.lastError, "ATA_INVALID_CONTACT");

  // Delete T02 -> count drops to 49 -> next acquisition reuses T02!
  const afterDel = deleteAtaTarget(ata, "T02");
  assert.equal(afterDel.targets.length, 49);
  assert.equal(afterDel.targets.some(t => t.targetId === "T02"), false);

  const reused = acquireAtaTarget(afterDel, { contactId: "tgt-reused", rangeNm: 3.1, bearingDeg: 45 }, 1);
  assert.equal(reused.targets.length, 50);
  assert.equal(reused.lastAcquiredId, "T02");
  assert.equal(reused.targets[1].targetId, "T02");
  assert.equal(reused.targets[1].contactId, "tgt-reused");

  // Delete unknown target returns error without mutating
  const missing = deleteAtaTarget(reused, "T99");
  assert.equal(missing.lastError, "ATA_TARGET_NOT_FOUND");
  assert.equal(missing.targets.length, 50);

  // Delete all resets cleanly
  const cleared = deleteAllAtaTargets(reused);
  assert.deepEqual(cleared, initialAtaState());
});

test("arpa-ais.mjs: ATA past positions record at 30s intervals and cap at 6 FIFO points", () => {
  let w = initialMaritimeWorldState(MDC2060_COASTAL_SCENARIO);
  let bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, w);
  let ata = acquireAtaTarget(initialAtaState(), bus.radarContacts[0], 0, bus);

  for (let t = 10; t <= 240; t += 10) {
    w = advanceMaritimeWorld(MDC2060_COASTAL_SCENARIO, w, 10);
    bus = projectMaritimeSensorBus(MDC2060_COASTAL_SCENARIO, w);
    ata = stepAtaTracking(ata, bus, { ataPastPos: "30s" }, t);
  }

  const past = ata.targets[0].pastPositions;
  assert.equal(past.length, 6);
  assert.deepEqual(past.map(p => p.tick), [90, 120, 150, 180, 210, 240]);
});

test("arpa-ais.mjs: Bow Crossing (BCR/BCT) ahead, astern, diverging, parallel, and head-on", () => {
  const own = { lat: 0, lon: 0, hdgDeg: 0, cogDeg: 0, sogKn: 10 };

  // Ahead bow crossing: (2E, 4N) heading 270° @ 10 kn -> crosses bow line x=0 at t = 2/10 h = 12 min, y = 4 - 10*(0.2) = 2 NM
  const ahead = computeBowCrossing(own, { lat: 4 / 60, lon: 2 / 60, cogDeg: 270, sogKn: 10 });
  assert.ok(Math.abs(ahead.bcrNm - 2.0) < 0.02, `Expected bcrNm ~2.0, got ${ahead.bcrNm}`);
  assert.ok(Math.abs(ahead.bctMin - 12.0) < 0.05, `Expected bctMin ~12.0, got ${ahead.bctMin}`);

  // Astern crossing: (2E, 1N) heading 270° @ 10 kn -> crosses x=0 at t = 12 min, y = 1 - 2 = -1 NM (astern -> null)
  const astern = computeBowCrossing(own, { lat: 1 / 60, lon: 2 / 60, cogDeg: 270, sogKn: 10 });
  assert.deepEqual(astern, { bcrNm: null, bctMin: null });

  // Diverging target: (2E, 4N) heading 045° @ 18 kn -> opening range (tcpaMin < 0) & never crosses bow
  const diverging = computeBowCrossing(own, { lat: 4 / 60, lon: 2 / 60, cogDeg: 45, sogKn: 18 });
  assert.deepEqual(diverging, { bcrNm: null, bctMin: null });
  const encDiv = computeTargetEncounter(own, { lat: 4 / 60, lon: 2 / 60, cogDeg: 45, sogKn: 18 });
  assert.ok(encDiv.tcpaMin < 0);

  // Parallel offset: (2E, 4N) heading 000° @ 10 kn -> null
  const parallel = computeBowCrossing(own, { lat: 4 / 60, lon: 2 / 60, cogDeg: 0, sogKn: 10 });
  assert.deepEqual(parallel, { bcrNm: null, bctMin: null });

  // Head-on dead ahead: (0E, 3N) heading 180° @ 10 kn -> bcrNm = 0, bctMin = 9.0
  const headOn = computeBowCrossing(own, { lat: 3 / 60, lon: 0, cogDeg: 180, sogKn: 10 });
  assert.equal(headOn.bcrNm, 0);
  assert.ok(Math.abs(headOn.bctMin - 9.0) < 0.02);

  // Full 360-heading exact 90° bow-collision sweep: ZERO headings dropped by floating-point yCross ~ -1e-16
  for (let h = 0; h < 360; h++) {
    const res = computeBowCrossing(
      { hdgDeg: h, cogDeg: h, sogKn: 10 },
      { rangeNm: Math.SQRT2, bearingDeg: (h + 45) % 360, cogDeg: (h + 270) % 360, sogKn: 10 }
    );
    assert.equal(res.bcrNm, 0, `Heading ${h}° dropped exact bow collision: ${JSON.stringify(res)}`);
    assert.equal(res.bctMin, 6, `Heading ${h}° wrong BCT: ${JSON.stringify(res)}`);
    assertJsonCanonical(res, `bowCross[${h}]`);
  }
});

test("arpa-ais.mjs: ATA autoDetectArea handles 0/360 wrap-around and ignores out-of-sector contacts", () => {
  const synthBus = {
    simTick: 10,
    ownship: { lat: 10.32, lon: 107.02, hdgDeg: 0, cogDeg: 0, sogKn: 10 },
    radarContacts: [
      { contactId: "tgt-north-west", rcsSqm: 200, rangeNm: 2.5, bearingDeg: 355, relBearingDeg: -5 },
      { contactId: "tgt-north-east", rcsSqm: 200, rangeNm: 2.2, bearingDeg: 5, relBearingDeg: 5 },
      { contactId: "tgt-south", rcsSqm: 200, rangeNm: 2.5, bearingDeg: 180, relBearingDeg: 180 },
      { contactId: "tgt-far-north", rcsSqm: 200, rangeNm: 6.0, bearingDeg: 0, relBearingDeg: 0 },
    ],
    aisTargets: [],
  };

  const settings = {
    ataAutoArea: "ON",
    ataBoardOption: true,
    autoDetectArea: { innerNm: 1.0, outerNm: 4.0, startBrgDeg: 330, endBrgDeg: 30, bearingRef: "T" },
  };

  const ata = stepAtaTracking(initialAtaState(), synthBus, settings, 10);
  assert.equal(ata.targets.length, 2);
  assert.deepEqual(ata.targets.map(t => t.contactId), ["tgt-north-west", "tgt-north-east"]);
  assert.equal(ata.targets[0].acquisitionType, "A");
  assert.equal(ata.targets[1].acquisitionType, "A");

  // Disabled ATA option board must not auto-acquire
  const noBoard = stepAtaTracking(initialAtaState(), synthBus, { ...settings, ataBoardOption: false }, 10);
  assert.equal(noBoard.targets.length, 0);
});

test("arpa-ais.mjs: formatRattmSentence emits valid 15-field IEC 61162-1 $RATTM with exact checksum", () => {
  const sTrack = formatRattmSentence({
    targetNumber: 1,
    targetId: "T01",
    rangeNm: 4.08,
    bearingDeg: 111.529,
    sogKn: 13.5,
    cogDeg: 315.0,
    cpaNm: 0.28,
    tcpaMin: 11.0,
    status: "tracking",
    acquisitionType: "M",
  }, null, 6);

  assert.match(sTrack, /^\$RATTM,\d{2},.*\*[0-9A-F]{2}$/);
  const [rawBody, rawCs] = sTrack.slice(1).split("*");
  assert.equal(rawCs, nmeaChecksum(rawBody));
  const parts = rawBody.split(",");
  assert.equal(parts.length, 16); // talker+formatter + 15 data fields
  assert.equal(parts[1], "01");
  assert.equal(parts[2], "4.08");
  assert.equal(parts[3], "111.5");
  assert.equal(parts[4], "T");
  assert.equal(parts[5], "13.5");
  assert.equal(parts[6], "315.0");
  assert.equal(parts[7], "T");
  assert.equal(parts[8], "0.28");
  assert.equal(parts[9], "11.0");
  assert.equal(parts[10], "N");
  assert.equal(parts[11], "T01");
  assert.equal(parts[12], "T");
  assert.equal(parts[13], "");
  assert.equal(parts[14], "000006.00");
  assert.equal(parts[15], "M");

  // Acquiring (Q), Lost (L), name sanitization, bearing wrap near 360°, and UTC wrap at 86400
  const sAcq = formatRattmSentence({
    targetNumber: 7,
    name: "BAD,NAME*$X",
    rangeNm: 1.5,
    bearingDeg: 359.98,
    sogKn: 5,
    cogDeg: 5.2,
    cpaNm: 1.2,
    tcpaMin: -4.5,
    status: "acquiring",
    acquisitionType: "A",
  }, null, 86405);
  const [b2, cs2] = sAcq.slice(1).split("*");
  assert.equal(cs2, nmeaChecksum(b2));
  const p2 = b2.split(",");
  assert.equal(p2[3], "000.0");
  assert.equal(p2[6], "005.2");
  assert.equal(p2[11], "BADNAMEX");
  assert.equal(p2[12], "Q");
  assert.equal(p2[14], "000005.00");
  assert.equal(p2[15], "A");

  // Non-ASCII Vietnamese names, reserved NMEA delimiters/control chars, and -0.01 TCPA -> "0.0"
  const sVi = formatRattmSentence({
    targetNumber: 7,
    name: "Tàu cá vệ tinh 18",
    rangeNm: 2.0,
    bearingDeg: 45.0,
    tcpaMin: -0.01,
    status: "tracking",
    acquisitionType: "M",
  }, null, 120);
  assert.match(sVi, /^\$RATTM,07,.*\*[0-9A-F]{2}$/);
  const [bVi, csVi] = sVi.slice(1).split("*");
  assert.equal(csVi, nmeaChecksum(bVi));
  const pVi = bVi.split(",");
  assert.equal(pVi[9], "0.0", "TCPA -0.01 must format as '0.0', never '-0.0'");
  assert.equal(pVi[11], "Tau ca ve tinh 18");

  const sDelim = formatRattmSentence({
    targetNumber: 8,
    name: "Đảo!B^C\\D\u0000E~F",
    rangeNm: 2.0,
    bearingDeg: 90.0,
    status: "tracking",
  }, null, 0);
  assert.match(sDelim, /^\$RATTM,08,.*\*[0-9A-F]{2}$/);
  const [bDelim, csDelim] = sDelim.slice(1).split("*");
  assert.equal(csDelim, nmeaChecksum(bDelim));
  assert.equal(bDelim.split(",")[11], "DaoBCDEF");
});

test("arpa-ais.mjs: projectAisTargets enforces 100-target cap, range filter, statuses, selection, and board option", () => {
  const own = { lat: 10.32, lon: 107.02, hdgDeg: 90, cogDeg: 90, sogKn: 10 };
  const aisTargets = [];
  for (let i = 1; i <= 120; i++) {
    aisTargets.push({
      mmsi: String(574000000 + i),
      name: `SHIP ${i}`,
      callSign: `3W${i}`,
      navStatus: 0,
      shipType: 70,
      lat: 10.32 + i * 0.002,
      lon: 107.02,
      sogKn: 10,
      cogDeg: 90,
      hdgDeg: 90,
      lengthM: 100,
      beamM: 16,
      rangeNm: i * 0.12,
      bearingDeg: 0,
      relBearingDeg: -90,
      relSpeedKn: 0,
      cpaNm: i === 2 ? 0.2 : 5.0,
      tcpaMin: i === 2 ? 8.0 : 30.0,
    });
  }
  const bus = { ownship: own, aisTargets };

  // Cap at 100 nearest within 20 NM
  const proj = projectAisTargets(bus, { aisFilterRangeNm: 20, ataCpaLimitNm: 0.5, ataTcpaLimitMin: 15 }, "574000080");
  assert.equal(proj.enabled, true);
  assert.equal(proj.totalInBus, 120);
  assert.equal(proj.targets.length, 100);
  assert.ok(proj.targets[0].rangeNm <= proj.targets[99].rangeNm);
  assert.ok(fingerprint(proj).startsWith("f0-fnv1a32-"));

  // Check dangerous, active, sleeping, and selected promotion (target 80 is at 9.6 NM > 6 NM active threshold!)
  const tDanger = proj.targets.find(t => t.mmsi === "574000002");
  const tActive = proj.targets.find(t => t.mmsi === "574000010");
  const tSleeping = proj.targets.find(t => t.mmsi === "574000075");
  const tSelected = proj.targets.find(t => t.mmsi === "574000080");
  assert.equal(tDanger.status, "dangerous");
  assert.equal(tActive.status, "active");
  assert.equal(tSleeping.status, "sleeping");
  assert.equal(tSelected.selected, true);
  assert.equal(tSelected.status, "active");
  assert.equal(proj.selectedTarget.mmsi, "574000080");
  assert.deepEqual(proj.dangerousMmsis, ["574000002"]);
  assert.equal(proj.alarmActive, true);

  // aisCpaAlarm: "OFF" suppresses alarmActive
  const noAlarm = projectAisTargets(bus, { aisFilterRangeNm: 20, aisCpaAlarm: "OFF" });
  assert.equal(noAlarm.alarmActive, false);

  // Strict range filter
  const shortFilter = projectAisTargets(bus, { aisFilterRangeNm: 1.0 });
  assert.ok(shortFilter.targets.every(t => t.rangeNm <= 1.0));

  // aisBoardOption: false and aisDisplay: "OFF" return empty targets
  const noBoard = projectAisTargets(bus, { aisBoardOption: false });
  assert.equal(noBoard.boardInstalled, false);
  assert.equal(noBoard.enabled, false);
  assert.deepEqual(noBoard.targets, []);

  const displayOff = projectAisTargets(bus, { aisDisplay: "OFF" });
  assert.equal(displayOff.enabled, false);
  assert.deepEqual(displayOff.targets, []);

  // Canonical purity against -0 (navStatus/shipType), negative rangeNm rejection, and [0,360) wrap
  const advAis = projectAisTargets({
    ownship: own,
    aisTargets: [
      { mmsi: "574999001", rangeNm: -5, bearingDeg: 45 },
      { mmsi: "574999002", rangeNm: 2.0, bearingDeg: 359.9999, cogDeg: 359.9999, hdgDeg: -1e-17, navStatus: -0.5, shipType: -0.2 },
    ],
  }, { aisFilterRangeNm: 12 });
  assert.equal(advAis.targets.length, 1);
  assert.equal(advAis.targets[0].mmsi, "574999002");
  assert.equal(advAis.targets[0].navStatus, 0);
  assert.equal(advAis.targets[0].shipType, 0);
  assert.equal(advAis.targets[0].bearingDeg, 0);
  assert.equal(advAis.targets[0].cogDeg, 0);
  assert.equal(advAis.targets[0].hdgDeg, 0);
  assertJsonCanonical(proj, "ais.proj");
  assertJsonCanonical(advAis, "ais.adv");
  snapshotEventData(advAis);
});

test("arpa-ais.mjs: Guard Zone OFF/IN/OUT, 0/360 wrap-around, full-circle, and plain JSON arrays", () => {
  assert.equal(isBearingInSector(355, 330, 30), true);
  assert.equal(isBearingInSector(5, 330, 30), true);
  assert.equal(isBearingInSector(180, 330, 30), false);
  assert.equal(isBearingInSector(200, 0, 360), true);

  const busIn = {
    radarContacts: [
      { contactId: "tgt-nw", rcsSqm: 200, rangeNm: 2.0, bearingDeg: 355 },
      { contactId: "tgt-ne", rcsSqm: 200, rangeNm: 2.5, bearingDeg: 5 },
      { contactId: "tgt-south", rcsSqm: 200, rangeNm: 2.0, bearingDeg: 180 },
    ],
  };

  let gz = initialGuardZoneState();
  assert.ok(fingerprint(gz).startsWith("f0-fnv1a32-"));

  // Mode IN with wrap sector 330..30
  gz = evaluateGuardZone(gz, busIn, {
    alarmMode: "IN",
    alarmInnerNm: 1.0,
    alarmOuterNm: 3.0,
    alarmStartBrgDeg: 330,
    alarmEndBrgDeg: 30,
    alarmLevel: "MID",
  });
  assert.equal(gz.alarmActive, true);
  assert.equal(gz.audible, true);
  assert.deepEqual(gz.insideContactIds, ["tgt-ne", "tgt-nw"]);
  assert.deepEqual(gz.triggeredContactIds, ["tgt-ne", "tgt-nw"]);
  assert.equal(Array.isArray(gz.capturedContactIds), true);
  assert.ok(fingerprint(gz).startsWith("f0-fnv1a32-"));

  // Full circle 0..360 captures tgt-south too
  const gzFull = evaluateGuardZone(initialGuardZoneState(), busIn, {
    alarmMode: "IN",
    alarmInnerNm: 1.0,
    alarmOuterNm: 3.0,
    alarmStartBrgDeg: 0,
    alarmEndBrgDeg: 360,
  });
  assert.deepEqual(gzFull.insideContactIds, ["tgt-ne", "tgt-nw", "tgt-south"]);

  // Mode OUT lifecycle: capture on entry -> alarm on exit -> clear on re-entry
  let gzOut = evaluateGuardZone(initialGuardZoneState(), {
    radarContacts: [{ contactId: "tgt-anchor", rcsSqm: 500, rangeNm: 2.0, bearingDeg: 10 }],
  }, {
    alarmMode: "OUT",
    alarmInnerNm: 1.0,
    alarmOuterNm: 3.0,
    alarmStartBrgDeg: 330,
    alarmEndBrgDeg: 30,
  });
  assert.equal(gzOut.alarmActive, false);
  assert.deepEqual(gzOut.capturedContactIds, ["tgt-anchor"]);

  // Target leaves zone -> alarmActive: true
  gzOut = evaluateGuardZone(gzOut, {
    radarContacts: [{ contactId: "tgt-anchor", rcsSqm: 500, rangeNm: 4.5, bearingDeg: 10 }],
  }, { alarmMode: "OUT" });
  assert.equal(gzOut.alarmActive, true);
  assert.equal(gzOut.audible, true);
  assert.deepEqual(gzOut.triggeredContactIds, ["tgt-anchor"]);

  // Target re-enters -> alarm clears
  gzOut = evaluateGuardZone(gzOut, {
    radarContacts: [{ contactId: "tgt-anchor", rcsSqm: 500, rangeNm: 2.2, bearingDeg: 10 }],
  }, { alarmMode: "OUT" });
  assert.equal(gzOut.alarmActive, false);
  assert.deepEqual(gzOut.triggeredContactIds, []);

  // Mode OFF clears all alarms; inverted inner>=outer and null bus handled cleanly
  const gzOff = evaluateGuardZone(gzOut, busIn, { alarmMode: "OFF", alarmInnerNm: 5.0, alarmOuterNm: 2.0 });
  assert.equal(gzOff.alarmActive, false);
  assert.ok(gzOff.innerNm < gzOff.outerNm);

  const gzNullBus = evaluateGuardZone(gz, null, { alarmMode: "IN" });
  assert.equal(gzNullBus.mode, "IN");
  assert.ok(fingerprint(gzNullBus).startsWith("f0-fnv1a32-"));

  // Sector wrap normalization & tick-1/tick-2 consistency: [-30, 350] -> [330, 350], [-30, 390] -> [330, 30], [90, 90] full circle
  assert.equal(isBearingInSector(180, -30, 350), false);
  assert.equal(isBearingInSector(340, -30, 350), true);
  assert.equal(isBearingInSector(180, -30, 390), false);
  assert.equal(isBearingInSector(355, -30, 390), true);
  assert.equal(isBearingInSector(5, -30, 390), true);
  assert.equal(isBearingInSector(180, 90, 90), true);

  const gzWrap350T1 = evaluateGuardZone(initialGuardZoneState(), busIn, {
    alarmMode: "IN",
    alarmInnerNm: 1.0,
    alarmOuterNm: 3.0,
    alarmStartBrgDeg: -30,
    alarmEndBrgDeg: 350,
  });
  const gzWrap350T2 = evaluateGuardZone(gzWrap350T1, busIn, {});
  assert.equal(gzWrap350T1.startBrgDeg, 330);
  assert.equal(gzWrap350T1.endBrgDeg, 350);
  assert.deepEqual(gzWrap350T1.insideContactIds, []);
  assert.deepEqual(gzWrap350T2.insideContactIds, gzWrap350T1.insideContactIds);

  const gzWrap390T1 = evaluateGuardZone(initialGuardZoneState(), busIn, {
    alarmMode: "IN",
    alarmInnerNm: 1.0,
    alarmOuterNm: 3.0,
    alarmStartBrgDeg: -30,
    alarmEndBrgDeg: 390,
  });
  const gzWrap390T2 = evaluateGuardZone(gzWrap390T1, busIn, {});
  assert.equal(gzWrap390T1.startBrgDeg, 330);
  assert.equal(gzWrap390T1.endBrgDeg, 30);
  assert.deepEqual(gzWrap390T1.insideContactIds, ["tgt-ne", "tgt-nw"]);
  assert.deepEqual(gzWrap390T2.insideContactIds, ["tgt-ne", "tgt-nw"]);

  // [0, 360) wrap on Guard Zone angles
  const gzBrgWrap = evaluateGuardZone(initialGuardZoneState(), busIn, {
    alarmMode: "IN",
    alarmStartBrgDeg: 359.9999,
    alarmEndBrgDeg: -1e-17,
  });
  assert.equal(gzBrgWrap.startBrgDeg, 0);
  assert.equal(gzBrgWrap.endBrgDeg, 0);

  // IN -> OUT mode transition with null bus must reset alarm & captured state (no false OUT alarm!)
  const gzSwitchNull = evaluateGuardZone(gz, null, { alarmMode: "OUT" });
  assert.equal(gzSwitchNull.mode, "OUT");
  assert.equal(gzSwitchNull.alarmActive, false);
  assert.equal(gzSwitchNull.audible, false);
  assert.deepEqual(gzSwitchNull.capturedContactIds, []);
  const gzAfterNull = evaluateGuardZone(gzSwitchNull, { radarContacts: [] }, {});
  assert.equal(gzAfterNull.alarmActive, false);
  assert.deepEqual(gzAfterNull.triggeredContactIds, []);

  // alarmLevel LOW/MID/HIGH RCS thresholds, empty contactId rejection, & relative bearing fallback
  const rcsBus = {
    ownship: { hdgDeg: 90 },
    radarContacts: [
      { contactId: "", rangeNm: 2.0, bearingDeg: 90, rcsSqm: 500 },
      { contactId: "c-tiny", rangeNm: 2.0, bearingDeg: 90, rcsSqm: 5 },
      { contactId: "c-med", rangeNm: 2.0, bearingDeg: 90, rcsSqm: 50 },
      { contactId: "c-big", rangeNm: 2.0, bearingDeg: 90, rcsSqm: 200 },
    ],
  };
  const gzLow = evaluateGuardZone(initialGuardZoneState(), rcsBus, { alarmMode: "IN", alarmInnerNm: 1, alarmOuterNm: 3, alarmStartBrgDeg: 330, alarmEndBrgDeg: 30, guardZoneBearingRef: "R", alarmLevel: "LOW" });
  const gzMid = evaluateGuardZone(initialGuardZoneState(), rcsBus, { alarmMode: "IN", alarmInnerNm: 1, alarmOuterNm: 3, alarmStartBrgDeg: 330, alarmEndBrgDeg: 30, guardZoneBearingRef: "R", alarmLevel: "MID" });
  const gzHigh = evaluateGuardZone(initialGuardZoneState(), rcsBus, { alarmMode: "IN", alarmInnerNm: 1, alarmOuterNm: 3, alarmStartBrgDeg: 330, alarmEndBrgDeg: 30, guardZoneBearingRef: "R", alarmLevel: "HIGH" });
  assert.deepEqual(gzLow.insideContactIds, ["c-big", "c-med", "c-tiny"]);
  assert.deepEqual(gzMid.insideContactIds, ["c-big", "c-med"]);
  assert.deepEqual(gzHigh.insideContactIds, ["c-big"]);

  // acknowledged persistence & re-trigger on a new intruder
  const gzAcked = { ...gzHigh, acknowledged: true, audible: false };
  const gzStillAcked = evaluateGuardZone(gzAcked, rcsBus, { guardZoneBearingRef: "R" });
  assert.equal(gzStillAcked.acknowledged, true);
  assert.equal(gzStillAcked.audible, false);
  const gzNewIntruder = evaluateGuardZone(gzStillAcked, {
    ownship: { hdgDeg: 90 },
    radarContacts: [...rcsBus.radarContacts, { contactId: "c-new", rangeNm: 2.0, bearingDeg: 95, rcsSqm: 250 }],
  }, { guardZoneBearingRef: "R" });
  assert.equal(gzNewIntruder.alarmActive, true);
  assert.equal(gzNewIntruder.acknowledged, false);
  assert.equal(gzNewIntruder.audible, true);

  assertJsonCanonical(gz, "gz");
  assertJsonCanonical(gzSwitchNull, "gzSwitchNull");
  assertJsonCanonical(gzNewIntruder, "gzNewIntruder");
  snapshotEventData(gz);
  snapshotEventData(gzSwitchNull);
  snapshotEventData(gzNewIntruder);
});

// ============================================================================
// 19. i18n.mjs: 100% EN/VI Parity, Spec LabelKey Coverage, Prototype Safety
// ============================================================================

test("i18n.mjs: 100% EN/VI parity, full menu/fkey key coverage, and prototype safety", () => {
  assert.deepEqual(MDC2060_LANGUAGES, ["en", "vi"]);
  assert.equal(Object.isFrozen(MDC2060_LANGUAGES), true);
  assert.ok(MDC2060_I18N_KEYS.length >= 150);

  // True symmetric EN <-> VI keyset parity (NO EN fallback masking!)
  assert.deepEqual(MDC2060_I18N_KEYS, MDC2060_I18N_VI_KEYS);
  assert.equal(Object.isFrozen(MDC2060_I18N_VI_KEYS), true);
  for (const key of MDC2060_I18N_KEYS) {
    assert.equal(hasMdc2060Key("en", key), true, `Missing strict EN key: ${key}`);
    assert.equal(hasMdc2060Key("vi", key), true, `Missing strict VI key: ${key}`);
    assert.equal(hasMdc2060Key("fr", key), false);
    const enVal = tMdc2060("en", key, "__MISSING__");
    const viVal = tMdc2060("vi", key, "__MISSING__");
    assert.notEqual(enVal, "__MISSING__", `Missing EN key: ${key}`);
    assert.notEqual(viVal, "__MISSING__", `Missing VI key: ${key}`);
    assert.ok(typeof enVal === "string" && enVal.length > 0, `Empty EN key: ${key}`);
    assert.ok(typeof viVal === "string" && viVal.length > 0, `Empty VI key: ${key}`);
  }

  // Every labelKey in spec.mjs menus and F-keys exists strictly in BOTH EN and VI,
  // and EVERY choice option resolves cleanly via localizeMdc2060Choice in BOTH EN and VI!
  for (const tree of [MDC2060_MAIN_MENU_TREE, MDC2060_SYSTEM_MENU_TREE]) {
    for (const group of tree) {
      assert.equal(hasMdc2060Key("en", group.labelKey), true);
      assert.equal(hasMdc2060Key("vi", group.labelKey), true);
      for (const item of group.items) {
        assert.equal(hasMdc2060Key("en", item.labelKey), true, `Missing EN ${item.labelKey}`);
        assert.equal(hasMdc2060Key("vi", item.labelKey), true, `Missing VI ${item.labelKey}`);
        if (item.type === "choice" && Array.isArray(item.options)) {
          for (const opt of item.options) {
            const hasEnOpt = hasMdc2060Key("en", `choice.${opt}`) || hasMdc2060Key("en", `mode.${opt}`) ||
              hasMdc2060Key("en", `palette.${opt}`) || hasMdc2060Key("en", `fkey.${opt}`);
            const hasViOpt = hasMdc2060Key("vi", `choice.${opt}`) || hasMdc2060Key("vi", `mode.${opt}`) ||
              hasMdc2060Key("vi", `palette.${opt}`) || hasMdc2060Key("vi", `fkey.${opt}`);
            assert.equal(hasEnOpt, true, `Missing EN choice localization for ${item.key}=${opt}`);
            assert.equal(hasViOpt, true, `Missing VI choice localization for ${item.key}=${opt}`);
            assert.ok(localizeMdc2060Choice(opt, "en").length > 0);
            assert.ok(localizeMdc2060Choice(opt, "vi").length > 0);
          }
        }
      }
    }
  }
  for (const preset of MDC2060_FKEY_PRESETS) {
    assert.equal(hasMdc2060Key("en", preset.labelKey), true);
    assert.equal(hasMdc2060Key("vi", preset.labelKey), true);
  }

  // Prototype safety: never leak Object.prototype methods
  for (const badKey of ["toString", "constructor", "__proto__", "valueOf", "hasOwnProperty"]) {
    assert.equal(hasMdc2060Key("en", badKey), false);
    assert.equal(hasMdc2060Key("vi", badKey), false);
    assert.equal(tMdc2060("en", badKey, "SAFE_FB"), "SAFE_FB");
    assert.equal(tMdc2060("vi", badKey, "SAFE_FB"), "SAFE_FB");
    assert.equal(localizeMdc2060Choice(badKey, "en"), badKey);
  }

  // Language resolution & convenience helpers (including mode/palette/fkey choice namespaces)
  assert.equal(resolveMdc2060Lang("vi"), "vi");
  assert.equal(resolveMdc2060Lang({ settings: { language: "vi" } }), "vi");
  assert.equal(resolveMdc2060Lang("fr"), "en");
  assert.equal(isVietnameseMdc2060("vi"), true);
  assert.equal(isVietnameseMdc2060("en"), false);

  assert.equal(localizeMdc2060MenuGroup("echo", "en"), "ECHO");
  assert.equal(localizeMdc2060MenuGroup("echo", "vi"), "HỒI ÂM");
  assert.equal(localizeMdc2060MenuItem("ftc", "vi"), "Khử mưa FTC");
  assert.equal(localizeMdc2060Choice("IN", "vi"), "XÂM NHẬP");
  assert.equal(localizeMdc2060Choice("NIGHT", "vi"), "BAN ĐÊM");
  assert.equal(localizeMdc2060Choice("N-UP", "vi"), "N-UP (Bắc thật)");
  assert.equal(localizeMdc2060Choice("TM", "vi"), "TM (Chuyển động thật)");
  assert.equal(localizeMdc2060Choice("PPI/PPI", "vi"), "PPI/PPI (2 Thang)");
  assert.equal(localizeMdc2060Choice("ATA_ACQ", "en"), "ATA ACQ");
  assert.equal(localizeMdc2060Choice("ATA_ACQ", "vi"), "Bắt ATA");
  assert.equal(localizeMdc2060Choice(null, "en"), "--");
  assert.equal(localizeMdc2060PowerMode("standby", "en"), "ST'BY");
  assert.equal(localizeMdc2060Alarm("cpaDanger", "vi"), "BÁO ĐỘNG VA CHẠM ATA");
});
