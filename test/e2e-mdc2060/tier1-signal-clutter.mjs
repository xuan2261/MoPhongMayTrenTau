import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {loadAdapter, loadScenarios, loadSignal, loadSpec} from "./helpers/module-loader.mjs";
import {
  createMdcBridgeDriver,
  findMenuEntry,
  initialMaritimeWorldState,
  operateMenuItem,
  projectMaritimeSensorBus,
} from "./helpers/session-driver.mjs";
import {
  binForRange,
  buildSyntheticIslandShadowScenario,
  buildSyntheticSingleTargetScenario,
  countAbove,
  evalGridStrict,
  radialSpanAtAzimuth,
  sectorEnergy,
} from "./helpers/signal-oracle.mjs";

export const TIER = 1;
export const SUITE = "tier1-signal-clutter";

function projectBus(scenario, tick = 0) {
  const ws = initialMaritimeWorldState(scenario);
  return projectMaritimeSensorBus(scenario, {...ws, simTick: tick});
}

export const TESTS = [
  {
    id: "T1-025",
    name: "Polar Echo Grid Dimensions (360 x 160) & 8-Level Quantization (0..7)",
    features: [13],
    async run() {
      const {MDC2060_NOISE_STREAM, evaluatePolarEchoGrid} = await loadSignal();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      assert.equal(MDC2060_NOISE_STREAM, "sensor:mdc2060:radar-v1");
      const bus = projectBus(MDC2060_COASTAL_SCENARIO, 0);
      const res = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, bus, {rangeNm: 6, gain: 60});
      assert.ok(res.stats && typeof res.stats === "object", "evaluatePolarEchoGrid must return stats object");
      assert.ok(countAbove(res.grid, 0) > 0, "Coastal approach scene at 6 NM must contain non-zero radar echoes");
    },
  },
  {
    id: "T1-026",
    name: "Strict Determinism & Zero-Randomness of evaluatePolarEchoGrid",
    features: [13],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const bus0 = projectBus(MDC2060_COASTAL_SCENARIO, 0);
      const bus1 = projectBus(MDC2060_COASTAL_SCENARIO, 1);
      const a = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, bus0, {rangeNm: 6, gain: 65, simTick: 0});
      const b = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, bus0, {rangeNm: 6, gain: 65, simTick: 0});
      assert.equal(Buffer.compare(Buffer.from(a.grid), Buffer.from(b.grid)), 0, "Identical inputs must produce byte-identical grid");
      assert.equal(Buffer.compare(Buffer.from(a.shadowMask), Buffer.from(b.shadowMask)), 0, "Identical inputs must produce byte-identical shadowMask");

      const c = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, bus1, {rangeNm: 6, gain: 65, simTick: 1});
      assert.notEqual(Buffer.compare(Buffer.from(a.grid), Buffer.from(c.grid)), 0, "Changing simTick must change seeded speckle deterministically");
    },
  },
  {
    id: "T1-027",
    name: "Node.js CPU Performance Budget (< 1.5 ms Average per Frame)",
    features: [13],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const bus = projectBus(MDC2060_COASTAL_SCENARIO, 0);
      // Warm up JIT
      for (let i = 0; i < 10; i++) {
        evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, bus, {rangeNm: 6, gain: 60, simTick: i});
      }
      const frames = 100;
      const t0 = performance.now();
      for (let i = 0; i < frames; i++) {
        evaluatePolarEchoGrid({
          scenario: MDC2060_COASTAL_SCENARIO,
          maritimeBus: bus,
          simTick: i,
          rangeNm: 6,
          gain: 60,
          stc: 15,
          stcCurve: 4,
          ftc: 0,
          ir: "OFF",
          exp: false,
          pw: "M2",
          settings: {rangeNm: 6, gain: 60, stc: 15, stcCurve: 4, ftc: 0, ir: "OFF", exp: false, pw: "M2"},
        });
      }
      const avgMs = (performance.now() - t0) / frames;
      assert.ok(avgMs < 1.5, `Average polar grid frame time ${avgMs.toFixed(3)}ms exceeded 1.5ms budget`);
    },
  },
  {
    id: "T1-028",
    name: "Land & Island Ray-Casting Leading Shore High Return (Level 6..7)",
    features: [14],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const cleanScenario = buildSyntheticIslandShadowScenario(MDC2060_COASTAL_SCENARIO.landmasses?.[0]);
      const bus = projectBus(cleanScenario, 0);
      const res = evalGridStrict(evaluatePolarEchoGrid, cleanScenario, bus, {rangeNm: 6, gain: 60, stc: 0, ftc: 0});
      const leadBin = binForRange(1.4, 6);
      const shore = sectorEnergy(res.grid, 42, 48, Math.max(0, leadBin - 3), Math.min(159, leadBin + 5));
      assert.ok(shore.peak >= 6, `Island leading shore peak must be >= 6, got ${shore.peak}`);

      // Also verify coastal scenario landmasses generate strong coastal returns
      const coastalBus = projectBus(MDC2060_COASTAL_SCENARIO, 0);
      const coastalRes = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, coastalBus, {rangeNm: 6, gain: 60});
      let maxLandLevel = 0;
      for (let i = 0; i < coastalRes.grid.length; i++) {
        if (coastalRes.grid[i] > maxLandLevel) maxLandLevel = coastalRes.grid[i];
      }
      assert.ok(maxLandLevel >= 6, `Coastal scenario leading shore must produce high-level return >= 6, got ${maxLandLevel}`);
    },
  },
  {
    id: "T1-029",
    name: "Radar Shadow Occlusion Behind Island (x0.12 Attenuation)",
    features: [14],
    async run() {
      const {evaluatePolarEchoGrid, isPointOccludedByLand} = await loadSignal();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const shadowScenario = buildSyntheticIslandShadowScenario(MDC2060_COASTAL_SCENARIO.landmasses?.[0]);
      const bus = projectBus(shadowScenario, 0);
      assert.equal(isPointOccludedByLand(bus.ownship, 45, 3.0, shadowScenario.landmasses), true, "Target behind island must be occluded");
      assert.equal(isPointOccludedByLand(bus.ownship, 135, 3.0, shadowScenario.landmasses), false, "Twin target in open water must not be occluded");
      assert.equal(isPointOccludedByLand(bus.ownship, 45, 1.0, shadowScenario.landmasses), false, "Point in front of island must not be occluded");

      const res = evalGridStrict(evaluatePolarEchoGrid, shadowScenario, bus, {rangeNm: 6, gain: 65, stc: 0, ftc: 0});
      const rBin = binForRange(3.0, 6);
      const occludedShadow = sectorEnergy(res.shadowMask, 44, 46, rBin - 2, rBin + 2);
      const openShadow = sectorEnergy(res.shadowMask, 134, 136, rBin - 2, rBin + 2);
      assert.ok(occludedShadow.countNonZero > 0, "shadowMask must mark bins behind island as occluded");
      assert.equal(openShadow.countNonZero, 0, "shadowMask must be 0 in open water");

      const occludedEcho = sectorEnergy(res.grid, 43, 47, rBin - 3, rBin + 3);
      const openEcho = sectorEnergy(res.grid, 133, 137, rBin - 3, rBin + 3);
      assert.ok(openEcho.peak >= 4, `Unoccluded twin peak must be >= 4, got ${openEcho.peak}`);
      assert.ok(
        occludedEcho.peak < openEcho.peak && occludedEcho.sum < openEcho.sum,
        `Occluded target (peak=${occludedEcho.peak}, sum=${occludedEcho.sum}) must be strongly attenuated vs open twin (peak=${openEcho.peak}, sum=${openEcho.sum})`,
      );
    },
  },
  {
    id: "T1-030",
    name: "Vessel Echo Synthesis Scales with rcsSqm & Inverse Range Falloff",
    features: [15],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const scenRcs = buildSyntheticSingleTargetScenario({
        includePrimaryTarget: false,
        extraTargets: [
          {mmsi: "574910001", name: "LARGE", azDeg: 90, rangeNm: 3.0, rcsSqm: 2200},
          {mmsi: "574910002", name: "SMALL", azDeg: 270, rangeNm: 3.0, rcsSqm: 32},
        ],
      });
      const resRcs = evalGridStrict(evaluatePolarEchoGrid, scenRcs, projectBus(scenRcs, 0), {rangeNm: 6, gain: 55, stc: 0, ftc: 0});
      const bin3 = binForRange(3.0, 6);
      const largeE = sectorEnergy(resRcs.grid, 86, 94, bin3 - 4, bin3 + 4);
      const smallE = sectorEnergy(resRcs.grid, 266, 274, bin3 - 4, bin3 + 4);
      assert.ok(largeE.peak >= smallE.peak && largeE.sum > smallE.sum, `Large RCS (sum=${largeE.sum}) must exceed small RCS (sum=${smallE.sum})`);

      const scenDist = buildSyntheticSingleTargetScenario({
        includePrimaryTarget: false,
        extraTargets: [
          {mmsi: "574910003", name: "NEAR", azDeg: 90, rangeNm: 1.5, rcsSqm: 250},
          {mmsi: "574910004", name: "FAR", azDeg: 270, rangeNm: 5.5, rcsSqm: 250},
        ],
      });
      const resDist = evalGridStrict(evaluatePolarEchoGrid, scenDist, projectBus(scenDist, 0), {rangeNm: 6, gain: 55, stc: 0, ftc: 0});
      const nearE = sectorEnergy(resDist.grid, 86, 94, binForRange(1.5, 6) - 4, binForRange(1.5, 6) + 4);
      const farE = sectorEnergy(resDist.grid, 266, 274, binForRange(5.5, 6) - 4, binForRange(5.5, 6) + 4);
      assert.ok(nearE.peak >= farE.peak && nearE.sum > farE.sum, `Near vessel (sum=${nearE.sum}) must exceed far vessel (sum=${farE.sum})`);
    },
  },
  {
    id: "T1-031",
    name: "Buoy Echo Synthesis Renders Fixed Navigation Buoys on MDC2060_COASTAL_SCENARIO",
    features: [15],
    async run() {
      const {evaluatePolarEchoGrid, isPointOccludedByLand} = await loadSignal();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      assert.ok(Array.isArray(MDC2060_COASTAL_SCENARIO.buoys) && MDC2060_COASTAL_SCENARIO.buoys.length === 4);
      const buoyOnlyScenario = {...MDC2060_COASTAL_SCENARIO, traffic: Object.freeze([])};
      const buoyNoLandScenario = {...buoyOnlyScenario, landmasses: Object.freeze([])};
      const bus = projectBus(buoyOnlyScenario, 0);
      const resWithLand = evalGridStrict(evaluatePolarEchoGrid, buoyOnlyScenario, bus, {rangeNm: 6, gain: 65, stc: 0, ftc: 0});
      const resNoLand = evalGridStrict(evaluatePolarEchoGrid, buoyNoLandScenario, bus, {rangeNm: 6, gain: 65, stc: 0, ftc: 0});
      const own = bus.ownship;
      let unoccludedRendered = 0;
      let occludedVerified = 0;
      for (const buoy of MDC2060_COASTAL_SCENARIO.buoys) {
        const dLatNm = (Number(buoy.lat) - own.lat) * 60;
        const dLonNm = (Number(buoy.lon) - own.lon) * 60 * Math.cos((own.lat * Math.PI) / 180);
        const rangeNm = Math.hypot(dLatNm, dLonNm);
        if (rangeNm > 6) continue;
        const az = (((Math.atan2(dLonNm, dLatNm) * 180) / Math.PI) + 360) % 360;
        const bin = binForRange(rangeNm, 6);
        const occluded = isPointOccludedByLand(own, az, rangeNm, MDC2060_COASTAL_SCENARIO.landmasses);
        const eLand = sectorEnergy(resWithLand.grid, Math.round(az) - 3, Math.round(az) + 3, bin - 3, bin + 3);
        const eOpen = sectorEnergy(resNoLand.grid, Math.round(az) - 3, Math.round(az) + 3, bin - 3, bin + 3);
        if (!occluded) {
          assert.ok(eLand.peak >= 3, `Unoccluded buoy at az=${az.toFixed(1)}, r=${rangeNm.toFixed(2)}NM must produce blip >= 3, got ${eLand.peak}`);
          unoccludedRendered++;
        } else {
          assert.ok(eOpen.peak >= 3, `Occluded buoy without landmasses at az=${az.toFixed(1)}, r=${rangeNm.toFixed(2)}NM must render >= 3, got ${eOpen.peak}`);
          assert.ok(
            eLand.peak < 3 && eLand.peak < eOpen.peak,
            `Island-occluded buoy at az=${az.toFixed(1)}, r=${rangeNm.toFixed(2)}NM must be shadow-attenuated (withLand=${eLand.peak} < noLand=${eOpen.peak})`,
          );
          occludedVerified++;
        }
      }
      assert.ok(unoccludedRendered >= 3, `Expected at least 3 unoccluded coastal buoys within 6 NM, got ${unoccludedRendered}`);
      assert.ok(occludedVerified >= 1, `Expected at least 1 island-occluded coastal buoy verified for shadow attenuation, got ${occludedVerified}`);
    },
  },
  {
    id: "T1-032",
    name: "Pulse Width (S1..L) & Echo Expansion (EXP) Increase Echo Footprint",
    features: [15],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const scen = buildSyntheticSingleTargetScenario({targetAzDeg: 90, targetRangeNm: 3.0, rcsSqm: 1500});
      const bus = projectBus(scen, 0);
      const bin3 = binForRange(3.0, 6);
      const s1 = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 65, pw: "S1", exp: false});
      const longPw = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 65, pw: "L", exp: false});
      const expanded = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 65, pw: "S1", exp: true});

      const s1Radial = radialSpanAtAzimuth(s1.grid, 90, bin3 - 10, bin3 + 10, 2);
      const lRadial = radialSpanAtAzimuth(longPw.grid, 90, bin3 - 10, bin3 + 10, 2);
      const s1Win = sectorEnergy(s1.grid, 82, 98, bin3 - 10, bin3 + 10);
      const lWin = sectorEnergy(longPw.grid, 82, 98, bin3 - 10, bin3 + 10);
      const expWin = sectorEnergy(expanded.grid, 82, 98, bin3 - 10, bin3 + 10);

      assert.ok(lRadial.count >= s1Radial.count && lWin.sum > s1Win.sum, `PW=L (radial=${lRadial.count}, sum=${lWin.sum}) must exceed PW=S1 (radial=${s1Radial.count}, sum=${s1Win.sum})`);
      assert.ok(expWin.countAbove1 > s1Win.countAbove1, `EXP=true (${expWin.countAbove1} cells) must expand footprint over EXP=false (${s1Win.countAbove1} cells)`);
    },
  },
  {
    id: "T1-033",
    name: "Wind-Directional Sea Clutter Stronger Upwind Than Downwind",
    features: [16],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const {MDC2060_STORM_SCENARIO} = await loadScenarios();
      const windDir = Number(MDC2060_STORM_SCENARIO.weather?.windDirDeg ?? 135);
      const scen = buildSyntheticSingleTargetScenario({includePrimaryTarget: false, seaState: 5, windDirDeg: windDir});
      const res = evalGridStrict(evaluatePolarEchoGrid, scen, projectBus(scen, 0), {rangeNm: 6, gain: 65, stc: 0, ftc: 0});
      const nearEndBin = binForRange(2.5, 6);
      const upwind = sectorEnergy(res.grid, windDir - 30, windDir + 30, 2, nearEndBin);
      const downwind = sectorEnergy(res.grid, windDir + 150, windDir + 210, 2, nearEndBin);
      assert.ok(upwind.sum > downwind.sum, `Upwind sea clutter (${upwind.sum}) must exceed downwind (${downwind.sum})`);
    },
  },
  {
    id: "T1-034",
    name: "STC Knob Progressively Suppresses Near-Range Sea Clutter",
    features: [16],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const {MDC2060_STORM_SCENARIO} = await loadScenarios();
      const bus = projectBus(MDC2060_STORM_SCENARIO, 0);
      const nearEndBin = binForRange(2.5, 6);
      const g0 = evalGridStrict(evaluatePolarEchoGrid, MDC2060_STORM_SCENARIO, bus, {rangeNm: 6, gain: 65, stc: 0, ftc: 0});
      const g35 = evalGridStrict(evaluatePolarEchoGrid, MDC2060_STORM_SCENARIO, bus, {rangeNm: 6, gain: 65, stc: 35, ftc: 0});
      const g75 = evalGridStrict(evaluatePolarEchoGrid, MDC2060_STORM_SCENARIO, bus, {rangeNm: 6, gain: 65, stc: 75, ftc: 0});
      const e0 = sectorEnergy(g0.grid, 0, 359, 2, nearEndBin).sum;
      const e35 = sectorEnergy(g35.grid, 0, 359, 2, nearEndBin).sum;
      const e75 = sectorEnergy(g75.grid, 0, 359, 2, nearEndBin).sum;
      assert.ok(e0 > e35 && e35 > e75, `STC must suppress sea clutter monotonically: stc0=${e0} > stc35=${e35} > stc75=${e75}`);
    },
  },
  {
    id: "T1-035",
    name: "STC Curve (1..8) Controls Radial Attenuation Decay Slope",
    features: [16],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const scen = buildSyntheticSingleTargetScenario({includePrimaryTarget: false, seaState: 5, windDirDeg: 135});
      const bus = projectBus(scen, 0);
      const c1 = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 65, stc: 50, stcCurve: 1, ftc: 0});
      const c8 = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 65, stc: 50, stcCurve: 8, ftc: 0});
      assert.notEqual(
        Buffer.compare(Buffer.from(c1.grid), Buffer.from(c8.grid)),
        0,
        "STC Curve 1 vs 8 must produce measurably different radial clutter attenuation profiles",
      );
      const near1 = sectorEnergy(c1.grid, 0, 359, 2, 25).sum;
      const mid1 = sectorEnergy(c1.grid, 0, 359, 26, 65).sum;
      const near8 = sectorEnergy(c8.grid, 0, 359, 2, 25).sum;
      const mid8 = sectorEnergy(c8.grid, 0, 359, 26, 65).sum;
      assert.notEqual(mid1 + near1, mid8 + near8, "STC Curve 1 vs 8 must change radial sea-clutter attenuation totals");
    },
  },
  {
    id: "T1-036",
    name: "Rain Clutter Squall Returns & FTC (0..8) Bulk Dissolution",
    features: [17],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const {MDC2060_STORM_SCENARIO} = await loadScenarios();
      const bus = projectBus(MDC2060_STORM_SCENARIO, 0);
      const g0 = evalGridStrict(evaluatePolarEchoGrid, MDC2060_STORM_SCENARIO, bus, {rangeNm: 6, gain: 65, stc: 40, ftc: 0});
      const g5 = evalGridStrict(evaluatePolarEchoGrid, MDC2060_STORM_SCENARIO, bus, {rangeNm: 6, gain: 65, stc: 40, ftc: 5});
      const bulk0 = sectorEnergy(g0.grid, 0, 359, 35, 145).sum;
      const bulk5 = sectorEnergy(g5.grid, 0, 359, 35, 145).sum;
      assert.ok(bulk0 > 0, "Storm scenario must produce rain squall echoes at FTC=0");
      assert.ok(bulk5 < bulk0 * 0.85, `FTC=5 must dissolve rain squall bulk: ftc5=${bulk5} vs ftc0=${bulk0}`);
    },
  },
  {
    id: "T1-037",
    name: "FTC Edge-Differentiation Preserves Sharp Vessel Contrast Inside Rain",
    features: [17],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const {MDC2060_STORM_SCENARIO} = await loadScenarios();
      const bus = projectBus(MDC2060_STORM_SCENARIO, 0);
      // Locate crossing container vessel near ~3.2 NM
      const target = bus.radarContacts.reduce((best, c) =>
        Math.abs(c.rangeNm - 3.2) < Math.abs((best?.rangeNm ?? 999) - 3.2) ? c : best,
      null);
      assert.ok(target, "Storm scenario must have crossing vessel inside rain squall");
      const az = Math.round(target.bearingDeg);
      const bin = binForRange(target.rangeNm, 6);

      const g0 = evalGridStrict(evaluatePolarEchoGrid, MDC2060_STORM_SCENARIO, bus, {rangeNm: 6, gain: 65, stc: 35, ftc: 0});
      const g5 = evalGridStrict(evaluatePolarEchoGrid, MDC2060_STORM_SCENARIO, bus, {rangeNm: 6, gain: 65, stc: 35, ftc: 5});
      const ship0 = sectorEnergy(g0.grid, az - 3, az + 3, bin - 4, bin + 4);
      const ship5 = sectorEnergy(g5.grid, az - 3, az + 3, bin - 4, bin + 4);
      const surround0 = sectorEnergy(g0.grid, az - 20, az + 20, Math.max(30, bin - 22), Math.min(150, bin + 22));
      const surround5 = sectorEnergy(g5.grid, az - 20, az + 20, Math.max(30, bin - 22), Math.min(150, bin + 22));

      assert.ok(ship5.peak >= 4, `Vessel peak inside rain must stay >= 4 at FTC=5, got ${ship5.peak}`);
      const contrast0 = ship0.peak / Math.max(0.05, surround0.mean);
      const contrast5 = ship5.peak / Math.max(0.05, surround5.mean);
      assert.ok(contrast5 > contrast0, `FTC=5 must improve ship-to-rain contrast (${contrast5.toFixed(2)} > ${contrast0.toFixed(2)})`);
    },
  },
  {
    id: "T1-038",
    name: "Receiver GAIN (0..100) Scales Echoes & Thermal Noise Background",
    features: [18],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const bus = projectBus(MDC2060_COASTAL_SCENARIO, 0);
      const g25 = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, bus, {rangeNm: 6, gain: 25, stc: 0, ftc: 0});
      const g55 = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, bus, {rangeNm: 6, gain: 55, stc: 0, ftc: 0});
      const g85 = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, bus, {rangeNm: 6, gain: 85, stc: 0, ftc: 0});
      const s25 = sectorEnergy(g25.grid, 0, 359, 0, 159).sum;
      const s55 = sectorEnergy(g55.grid, 0, 359, 0, 159).sum;
      const s85 = sectorEnergy(g85.grid, 0, 359, 0, 159).sum;
      assert.ok(s25 < s55 && s55 < s85, `GAIN must strictly increase total echo+noise energy: ${s25} < ${s55} < ${s85}`);
    },
  },
  {
    id: "T1-039",
    name: "Interference Rejection IR (OFF / 1 / 2 / 3) Suppresses Spiral Radar Interference",
    features: [18],
    async run() {
      const {evaluatePolarEchoGrid} = await loadSignal();
      const scen = buildSyntheticSingleTargetScenario({includePrimaryTarget: false, seaState: 0});
      const bus = projectBus(scen, 3);
      const rOff = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 50, ir: "OFF", interferenceSource: true});
      const r1 = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 50, ir: 1, interferenceSource: true});
      const r2 = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 50, ir: 2, interferenceSource: true});
      const r3 = evalGridStrict(evaluatePolarEchoGrid, scen, bus, {rangeNm: 6, gain: 50, ir: 3, interferenceSource: true});
      const dOff = countAbove(rOff.grid, 1);
      const d1 = countAbove(r1.grid, 1);
      const d2 = countAbove(r2.grid, 1);
      const d3 = countAbove(r3.grid, 1);
      assert.ok(dOff > 0, "interferenceSource=true with IR=OFF must inject visible spiral interference dots");
      assert.ok(dOff > d1 && d1 >= d2 && d2 >= d3 && dOff > d3, `IR 1..3 must progressively suppress interference: OFF=${dOff}, 1=${d1}, 2=${d2}, 3=${d3}`);
    },
  },
  {
    id: "T1-040",
    name: "SUB GAIN & PROCESS Echo Processing Modes Affect Signal Output Deterministically",
    features: [15, 18],
    async run() {
      const spec = await loadSpec();
      const {evaluatePolarEchoGrid} = await loadSignal();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      const beforeFp = drv.assertCanonicalState();
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ECHO$/i, /SUB\s*GAIN/i, {adjustSteps: 2, confirm: true, closeAfter: true});
      const afterSubFp = drv.assertCanonicalState();
      assert.notEqual(afterSubFp, beforeFp, "Editing MENU > ECHO > SUB GAIN must update device state");
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ECHO$/i, /PROCESS/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      const afterProcFp = drv.assertCanonicalState();
      assert.notEqual(afterProcFp, afterSubFp, "Editing MENU > ECHO > PROCESS must update device state");

      const procOpts = findMenuEntry(spec.MDC2060_MAIN_MENU_TREE, /^ECHO$/i, /^PROCESS$/i)?.item?.raw?.options ?? [];
      const nonOffProcess = procOpts.find(o => !/^OFF$/i.test(String(o))) ?? "AVG1";

      const bus = projectBus(MDC2060_COASTAL_SCENARIO, 0);
      const base = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, bus, {rangeNm: 6, gain: 55, subGain: 0, process: "OFF"});
      const subOnly = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, bus, {rangeNm: 6, gain: 55, subGain: 15, process: "OFF"});
      const procOnly = evalGridStrict(evaluatePolarEchoGrid, MDC2060_COASTAL_SCENARIO, bus, {rangeNm: 6, gain: 55, subGain: 0, process: nonOffProcess});

      assert.notEqual(
        Buffer.compare(Buffer.from(base.grid), Buffer.from(subOnly.grid)),
        0,
        "SUB GAIN=15 must deterministically alter polar grid output",
      );
      assert.ok(
        sectorEnergy(subOnly.grid, 0, 359, 0, 159).sum > sectorEnergy(base.grid, 0, 359, 0, 159).sum,
        "Positive SUB GAIN must increase total polar grid echo energy",
      );
      assert.notEqual(
        Buffer.compare(Buffer.from(base.grid), Buffer.from(procOnly.grid)),
        0,
        `PROCESS=${String(nonOffProcess)} must deterministically alter polar grid output`,
      );
    },
  },
];
