import assert from "node:assert/strict";
import {loadScenarios, loadSignal, loadSpec} from "./helpers/module-loader.mjs";
import {
  DEFAULT_BRIDGE_WORLD_SCENARIO,
  deepCloneFreeze,
  initialMaritimeWorldState,
  projectMaritimeSensorBus,
} from "./helpers/session-driver.mjs";
import {
  binForRange,
  buildSyntheticIslandShadowScenario,
  buildSyntheticSingleTargetScenario,
  countAbove,
  evalGridStrict,
  meanGridEnergy,
  sectorEnergy,
} from "./helpers/signal-oracle.mjs";

export const TIER = 2;
export const SUITE = "tier2-signal-clutter-bounds";

function projectBus(scenario, tick = 0) {
  const ws = initialMaritimeWorldState(scenario);
  return projectMaritimeSensorBus(scenario, {...ws, simTick: tick});
}

export const TESTS = [
  {
    id: "T2-037",
    name: "GAIN = 0 Darkens Weak Echoes vs GAIN = 100 Saturates Background Noise",
    features: [18],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const bus = projectBus(MDC2060_COASTAL_SCENARIO, 0);
      const g0 = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, bus, {rangeNm: 6, gain: 0, stc: 0, ftc: 0});
      const g50 = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, bus, {rangeNm: 6, gain: 50, stc: 0, ftc: 0});
      const g100 = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, bus, {rangeNm: 6, gain: 100, stc: 0, ftc: 0});
      const m0 = meanGridEnergy(g0.grid);
      const m50 = meanGridEnergy(g50.grid);
      const m100 = meanGridEnergy(g100.grid);
      assert.ok(m0 < m50 && m50 < m100, `Expected mean(0) < mean(50) < mean(100), got ${m0.toFixed(3)} / ${m50.toFixed(3)} / ${m100.toFixed(3)}`);
      assert.ok(m0 < 0.5, `GAIN=0 mean grid energy should be minimal, got ${m0.toFixed(3)}`);
    },
  },
  {
    id: "T2-038",
    name: "High STC (>= 85) Realistically Over-Suppresses Small Near Vessel HAI AU 18 (~1.4 NM)",
    features: [16],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const bus = projectBus(MDC2060_COASTAL_SCENARIO, 0);
      const haiAu = bus.radarContacts.find(c => String(c.contactId).includes("574009330"));
      assert.ok(haiAu, "Coastal scenario must include HAI AU 18 contact");
      const az = Math.round(haiAu.bearingDeg);
      const bin = binForRange(haiAu.rangeNm, 6);

      const lowStc = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, bus, {rangeNm: 6, gain: 60, stc: 15, ftc: 0});
      const highStc = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, bus, {rangeNm: 6, gain: 60, stc: 95, ftc: 0});
      const eLow = sectorEnergy(lowStc.grid, az - 3, az + 3, bin - 4, bin + 4);
      const eHigh = sectorEnergy(highStc.grid, az - 3, az + 3, bin - 4, bin + 4);
      assert.ok(eLow.peak >= 3, `HAI AU 18 at STC=15 must have peak >= 3, got ${eLow.peak}`);
      assert.ok(eHigh.peak < eLow.peak || eHigh.sum < eLow.sum * 0.6, `STC=95 must over-suppress HAI AU 18: low(peak=${eLow.peak},sum=${eLow.sum}) vs high(peak=${eHigh.peak},sum=${eHigh.sum})`);
    },
  },
  {
    id: "T2-039",
    name: "STC = 0 vs STC = 100 & seaState = 0 vs seaState = 6 Clutter Extremes",
    features: [16],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const calm = buildSyntheticSingleTargetScenario({includePrimaryTarget: false, seaState: 0});
      const storm = buildSyntheticSingleTargetScenario({includePrimaryTarget: false, seaState: 6, windDirDeg: 135});
      const nearEndBin = binForRange(2.0, 6);

      const calm0 = evalGridStrict(evaluatePolarEchoGrid, calm, projectBus(calm, 0), {rangeNm: 6, gain: 55, stc: 0});
      const storm0 = evalGridStrict(evaluatePolarEchoGrid, storm, projectBus(storm, 0), {rangeNm: 6, gain: 55, stc: 0});
      const storm100 = evalGridStrict(evaluatePolarEchoGrid, storm, projectBus(storm, 0), {rangeNm: 6, gain: 55, stc: 100});

      const nearCalm = sectorEnergy(calm0.grid, 0, 359, 2, nearEndBin);
      const nearStorm0 = sectorEnergy(storm0.grid, 0, 359, 2, nearEndBin);
      const nearStorm100 = sectorEnergy(storm100.grid, 0, 359, 2, nearEndBin);

      assert.ok(nearStorm0.countNonZero / nearStorm0.cells > 0.4, "seaState=6, STC=0 must heavily saturate >40% of <2 NM bins");
      assert.ok(nearStorm0.sum > nearCalm.sum * 2, "seaState=6 must produce far more near clutter than seaState=0");
      assert.ok(nearStorm100.sum < nearStorm0.sum * 0.5, "STC=100 must sharply suppress <2 NM sea clutter");
    },
  },
  {
    id: "T2-040",
    name: "STC Curve Clamped/Bounded at Extremes 1 and 8",
    features: [16],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const scen = buildSyntheticSingleTargetScenario({includePrimaryTarget: false, seaState: 5});
      const bus = projectBus(scen, 0);
      const c1 = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 65, stc: 55, stcCurve: 1});
      const c8 = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 65, stc: 55, stcCurve: 8});
      evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 65, stc: 55, stcCurve: 0});
      evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 65, stc: 55, stcCurve: 99});
      assert.notEqual(Buffer.compare(Buffer.from(c1.grid), Buffer.from(c8.grid)), 0);
    },
  },
  {
    id: "T2-041",
    name: "FTC = 0 vs FTC = 5 vs FTC = 8 on Uniform Rain Squall with Embedded Ship",
    features: [17],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const {MDC2060_STORM_SCENARIO} = await loadScenarios();
      const bus = projectBus(MDC2060_STORM_SCENARIO, 0);
      const f0 = evalGridStrict(evaluatePolarEchoGrid, MDC2060_STORM_SCENARIO, bus, {rangeNm: 6, gain: 65, stc: 35, ftc: 0});
      const f5 = evalGridStrict(evaluatePolarEchoGrid, MDC2060_STORM_SCENARIO, bus, {rangeNm: 6, gain: 65, stc: 35, ftc: 5});
      const f8 = evalGridStrict(evaluatePolarEchoGrid, MDC2060_STORM_SCENARIO, bus, {rangeNm: 6, gain: 65, stc: 35, ftc: 8});
      const sum0 = sectorEnergy(f0.grid, 0, 359, 35, 145).sum;
      const sum5 = sectorEnergy(f5.grid, 0, 359, 35, 145).sum;
      const sum8 = sectorEnergy(f8.grid, 0, 359, 35, 145).sum;
      assert.ok(sum5 < sum0 && sum8 <= sum0, `FTC must reduce rain squall interior energy: f0=${sum0}, f5=${sum5}, f8=${sum8}`);
      const target = bus.radarContacts.reduce((best, c) =>
        Math.abs(c.rangeNm - 3.2) < Math.abs((best?.rangeNm ?? 999) - 3.2) ? c : best,
      null);
      const az = Math.round(target.bearingDeg);
      const bin = binForRange(target.rangeNm, 6);
      assert.ok(sectorEnergy(f5.grid, az - 3, az + 3, bin - 4, bin + 4).peak >= 4);
    },
  },
  {
    id: "T2-042",
    name: "Zero Rain (rainIntensity = 0, rainSqualls = []) Keeps FTC Clean Without Artifacts",
    features: [17],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const scen = buildSyntheticSingleTargetScenario({includePrimaryTarget: false, seaState: 0, rainSqualls: []});
      const bus = projectBus(scen, 0);
      const f0 = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 45, stc: 0, ftc: 0});
      const f5 = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 45, stc: 0, ftc: 5});
      assert.ok(
        meanGridEnergy(f5.grid) <= meanGridEnergy(f0.grid) + 0.15,
        "Enabling FTC with zero rain must not generate spurious ghost rain returns",
      );
    },
  },
  {
    id: "T2-043",
    name: "IR = OFF vs IR = 3 With interferenceSource = false Produces Zero Spiral Dots",
    features: [18],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const scen = buildSyntheticSingleTargetScenario({includePrimaryTarget: false, seaState: 0});
      const bus = projectBus(scen, 2);
      const noIntOff = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 45, ir: "OFF", interferenceSource: false});
      const intOff = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 45, ir: "OFF", interferenceSource: true});
      const noIntCount = countAbove(noIntOff.grid, 2);
      const intCount = countAbove(intOff.grid, 2);
      assert.ok(noIntCount < intCount, `interferenceSource=false (${noIntCount}) must lack spiral dots seen when true (${intCount})`);
    },
  },
  {
    id: "T2-044",
    name: "IR = 3 Maximum Suppression Eliminates Majority (>= 75%) of Spiral Interference Dots",
    features: [18],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const scen = buildSyntheticSingleTargetScenario({includePrimaryTarget: false, seaState: 0});
      const bus = projectBus(scen, 5);
      const rOff = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 45, ir: "OFF", interferenceSource: true});
      const r3 = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 45, ir: 3, interferenceSource: true});
      const base = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 45, ir: "OFF", interferenceSource: false});
      const baseCount = countAbove(base.grid, 1);
      const excessOff = Math.max(0, countAbove(rOff.grid, 1) - baseCount);
      const excess3 = Math.max(0, countAbove(r3.grid, 1) - baseCount);
      assert.ok(excessOff > 0, "Expected non-zero excess interference dots at IR=OFF");
      assert.ok(excess3 <= excessOff * 0.25, `IR=3 must remove >=75% of interference dots: OFF_excess=${excessOff}, IR3_excess=${excess3}`);
    },
  },
  {
    id: "T2-045",
    name: "Land Shadow Exact Boundary: Target Behind Island (true) vs Just Outside Edge (false)",
    features: [14],
    async run() {
      const {isPointOccludedByLand} = await loadSignal();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const scen = buildSyntheticIslandShadowScenario(MDC2060_COASTAL_SCENARIO.landmasses?.[0]);
      const own = scen.ownship;
      assert.equal(isPointOccludedByLand(own, 45, 3.0, scen.landmasses), true, "Behind island centroid must be occluded");
      assert.equal(isPointOccludedByLand(own, 35, 3.0, scen.landmasses), false, "Just outside left angular edge must not be occluded");
      assert.equal(isPointOccludedByLand(own, 55, 3.0, scen.landmasses), false, "Just outside right angular edge must not be occluded");
      assert.equal(isPointOccludedByLand(own, 45, 1.0, scen.landmasses), false, "In front of island leading shore must not be occluded");
    },
  },
  {
    id: "T2-046",
    name: "Land Shadow Factor ~0.12 Quantitatively Verified Against Unoccluded Twin",
    features: [14],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const scen = buildSyntheticIslandShadowScenario(MDC2060_COASTAL_SCENARIO.landmasses?.[0]);
      const bus = projectBus(scen, 0);
      const res = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 60, stc: 0, ftc: 0});
      const rBin = binForRange(3.0, 6);
      const occ = sectorEnergy(res.grid, 43, 47, rBin - 3, rBin + 3);
      const open = sectorEnergy(res.grid, 133, 137, rBin - 3, rBin + 3);
      assert.ok(open.peak >= 4, `Open water twin peak must be >= 4, got ${open.peak}`);
      assert.ok(occ.peak <= Math.ceil(open.peak * 0.5) && occ.sum < open.sum * 0.5, `Shadow attenuation not strong enough: occ=${JSON.stringify(occ)} vs open=${JSON.stringify(open)}`);
    },
  },
  {
    id: "T2-047",
    name: "Missing landmasses / buoys / weather (DEFAULT_BRIDGE_WORLD_SCENARIO) Handled Gracefully",
    features: [14, 30],
    async run() {
      const {evaluatePolarEchoGrid, isPointOccludedByLand} = await loadSignal();
      const bus = projectBus(DEFAULT_BRIDGE_WORLD_SCENARIO, 0);
      assert.equal(isPointOccludedByLand(bus.ownship, 90, 2.0, undefined), false);
      const res = evalGridStrict(evaluatePolarEchoGrid, DEFAULT_BRIDGE_WORLD_SCENARIO, bus, {rangeNm: 6, gain: 60});
      assert.equal(countAbove(res.shadowMask, 0), 0, "shadowMask must be all 0 when scenario has no landmasses");
      for (const c of bus.radarContacts) {
        if (c.rangeNm > 6) continue;
        const bin = binForRange(c.rangeNm, 6);
        const e = sectorEnergy(res.grid, Math.round(c.bearingDeg) - 3, Math.round(c.bearingDeg) + 3, bin - 3, bin + 3);
        assert.ok(e.peak >= 2, `DEFAULT_BRIDGE_WORLD_SCENARIO contact ${c.contactId} must render cleanly`);
      }
    },
  },
  {
    id: "T2-048",
    name: "Out-of-Range & Zero-Range Targets Clipped Without TypedArray Overflow",
    features: [15],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const inRangeTargets = [
        {mmsi: "574920001", name: "ZERO RANGE", azDeg: 45, rangeNm: 0.0001, rcsSqm: 500},
        {mmsi: "574920004", name: "IN RANGE", azDeg: 270, rangeNm: 0.035, rcsSqm: 800},
      ];
      const scenFull = buildSyntheticSingleTargetScenario({
        includePrimaryTarget: false,
        extraTargets: [
          ...inRangeTargets,
          {mmsi: "574920002", name: "OUT OF RANGE", azDeg: 180, rangeNm: 100.0, rcsSqm: 3000},
          {mmsi: "574920003", name: "MID RANGE", azDeg: 90, rangeNm: 4.8, rcsSqm: 1500},
        ],
      });
      const scenInOnly = buildSyntheticSingleTargetScenario({
        includePrimaryTarget: false,
        extraTargets: inRangeTargets,
      });
      const resFull = evalGridStrict(evaluatePolarEchoGrid, scenFull, projectBus(scenFull, 0), {rangeNm: 0.0625, gain: 65}, {requireNonZero: true});
      const resInOnly = evalGridStrict(evaluatePolarEchoGrid, scenInOnly, projectBus(scenInOnly, 0), {rangeNm: 0.0625, gain: 65}, {requireNonZero: true});
      assert.ok(countAbove(resFull.grid, 0) > 0, "In-range target must render non-zero echoes at 0.0625 NM");
      const inBin = binForRange(0.035, 0.0625);
      const inEnergy = sectorEnergy(resFull.grid, 266, 274, inBin - 4, inBin + 4);
      assert.ok(inEnergy.peak >= 3, `In-range control target at 0.035 NM must render peak >= 3, got ${inEnergy.peak}`);
      assert.equal(
        Buffer.compare(Buffer.from(resFull.grid), Buffer.from(resInOnly.grid)),
        0,
        "Out-of-range targets (100 NM, 4.8 NM) must be cleanly clipped without folding into 0.0625 NM grid",
      );
    },
  },
  {
    id: "T2-049",
    name: "All 18 Standard Ranges (0.0625..64 NM) Render Cleanly Through evaluatePolarEchoGrid",
    features: [6, 13],
    async run() {
      const {MDC2060_RANGES} = await loadSpec();
      const {evaluatePolarEchoGrid} = await loadSignal();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const bus = projectBus(MDC2060_COASTAL_SCENARIO, 0);
      for (const entry of MDC2060_RANGES) {
        const res = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, bus, {
          rangeNm: entry.nm,
          pw: entry.defaultPw,
          gain: 60,
        }, {requireNonZero: true});
        assert.equal(res.rangeNm, entry.nm);
        assert.ok(countAbove(res.grid, 0) > 0, `Range ${entry.nm} NM must render non-zero coastal echoes`);
        const statNums = Object.values(res.stats).filter(v => typeof v === "number");
        assert.ok(statNums.length > 0, `Range ${entry.nm} NM res.stats must expose numeric stats`);
        for (const val of statNums) {
          assert.ok(Number.isFinite(val), `NaN/Infinity stat at range ${entry.nm} NM`);
        }
      }
    },
  },
  {
    id: "T2-050",
    name: "Zero Mutation of Input scenario, maritimeBus, or settings",
    features: [13],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const frozenBus = deepCloneFreeze(projectBus(MDC2060_COASTAL_SCENARIO, 0));
      const frozenSettings = deepCloneFreeze({
        rangeNm: 6,
        gain: 65,
        stc: 25,
        stcCurve: 4,
        ftc: 2,
        ir: 1,
        exp: true,
        pw: "M2",
      });
      const res = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, frozenBus, {
        rangeNm: 6,
        settings: frozenSettings,
      }, {requireNonZero: true});
      assert.ok(countAbove(res.grid, 0) > 0, "Frozen-input evaluation must still render non-zero coastal echoes");
      assert.ok(countAbove(res.shadowMask, 0) > 0, "Frozen-input evaluation must still compute island shadowMask");
      assert.ok(res.stats && typeof res.stats === "object", "Frozen-input evaluation must return stats object");
    },
  },
  {
    id: "T2-051",
    name: "Target Bearing Boundary 0.0 / 359.9 Wraps Cleanly Across Azimuth Bin 359 <-> 0",
    features: [15],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const scen = buildSyntheticSingleTargetScenario({targetAzDeg: 0.0, targetRangeNm: 2.5, rcsSqm: 2000});
      const bus = projectBus(scen, 0);
      const res = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 70, exp: true, pw: "M2"});
      const rBin = binForRange(2.5, 6);
      const bin0 = sectorEnergy(res.grid, 0, 1, rBin - 3, rBin + 3);
      const bin359 = sectorEnergy(res.grid, 358, 359, rBin - 3, rBin + 3);
      assert.ok(bin0.peak >= 3, `Target at 0.0 deg must light azimuth 0..1, got peak ${bin0.peak}`);
      assert.ok(bin359.peak >= 2, `Wide-beam/EXP target at 0.0 deg must wrap cleanly into azimuth 358..359, got peak ${bin359.peak}`);
    },
  },
];
