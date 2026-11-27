import assert from "node:assert/strict";
import {loadAdapter, loadScenarios, loadSpec} from "./helpers/module-loader.mjs";
import {
  createMdcBridgeDriver,
  createMdcSingleDriver,
  getGain,
  getMeasurementInfo,
  getOverlayKind,
  getPowerMode,
  getPreheatRemaining,
  getStc,
  isHlSuppressed,
  isMenuOpen,
  operateMenuItem,
} from "./helpers/session-driver.mjs";

function readAnalogOverrides(drv, adapter) {
  const p = drv.probe() ?? {};
  const st = drv.state() ?? {};
  const sea = p.seaStateOverride ?? p.instSeaState ?? st?.overrides?.seaState ?? st?.weatherOverrides?.seaState ?? st?.instructor?.seaState ?? st?.seaStateOverride ?? st?.instSeaState;
  const rain = p.rainIntensityOverride ?? p.rainOverride ?? p.instRain ?? st?.overrides?.rain ?? st?.overrides?.rainIntensity ?? st?.weatherOverrides?.rain ?? st?.instructor?.rain ?? st?.rainIntensityOverride ?? st?.instRain;
  const ftc = p.ftcOverride ?? p.instFtc ?? st?.overrides?.ftc ?? st?.instructor?.ftc ?? st?.ftcOverride ?? st?.instFtc ?? p.effectiveFtc ?? p.ftc ?? st?.settings?.ftc ?? st?.ftc;
  return {
    sea: sea === undefined ? undefined : sea,
    rain: rain === undefined ? undefined : rain,
    ftc: ftc === undefined ? undefined : ftc,
    adapterId: adapter?.id,
  };
}

export const TIER = 2;
export const SUITE = "tier2-protocol-hold-power-bounds";

export const TESTS = [
  {
    id: "T2-001",
    name: "Exact power Hold Boundary: 3000ms Short vs 3001ms Long",
    features: [2, 3],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.holdPress("power", 3000);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "transmit", "3000ms on power must stay ON (short)");
      const ov = getOverlayKind(drv.state(), MDC2060_ADAPTER);
      assert.ok(ov && /brill|bright/i.test(String(ov)), `3000ms short power must open BRILL dialog, got ${String(ov)}`);
      drv.holdPress("power", 3001);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "off", "3001ms on power must power OFF (long)");
      drv.verifyReplay();
    },
  },
  {
    id: "T2-002",
    name: "Exact ent Hold Boundary: 1200ms Short vs 1201ms Long",
    features: [22],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.touch(190, 210, "down");
      drv.touch(190, 210, "up");
      drv.holdPress("ent", 1200);
      const afterShort = getMeasurementInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(Boolean(afterShort.twoPoint?.active || afterShort.twoPoint?.anchor), true, "1200ms ENT must execute short-ENT action");
      // Clear 2-point mode with short ENT
      drv.holdPress("ent", 200);

      drv.down("ent");
      assert.equal(isHlSuppressed(drv.state(), MDC2060_ADAPTER), true);
      drv.up("ent", 1201);
      assert.equal(isHlSuppressed(drv.state(), MDC2060_ADAPTER), false);
      assert.equal(Boolean(getMeasurementInfo(drv.state(), MDC2060_ADAPTER).twoPoint?.active), false, "1201ms long ENT must NOT trigger short-ENT action");
    },
  },
  {
    id: "T2-003",
    name: "Exact menu Hold Boundary: 1500ms Short vs 1501ms Long",
    features: [26, 27],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.holdPress("menu", 1500);
      const mShort = isMenuOpen(drv.state(), MDC2060_ADAPTER);
      assert.equal(mShort.open, true);
      assert.doesNotMatch(String(mShort.kind ?? mShort.overlay ?? ""), /system/i, "1500ms MENU must open Main Menu, not System Menu");
      drv.holdPress("menu", 200);
      assert.equal(isMenuOpen(drv.state(), MDC2060_ADAPTER).open, false);

      drv.holdPress("menu", 1501);
      const mLong = isMenuOpen(drv.state(), MDC2060_ADAPTER);
      assert.equal(mLong.open, true);
      assert.match(String(mLong.kind ?? mLong.overlay ?? ""), /system/i, "1501ms MENU must open System Menu");
    },
  },
  {
    id: "T2-004",
    name: "Direct {kind:'press'} Rejected on All 3 Hold Controls (power, ent, menu)",
    features: [2, 22, 26],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      for (const ctrl of ["power", "ent", "menu"]) {
        assert.throws(
          () => drv.dispatch({kind: "press", control: ctrl}),
          err => err instanceof TypeError && /hold-capable keys require deterministic down\/up edges/.test(err.message),
          `Direct press on hold control "${ctrl}" must throw TypeError`,
        );
      }
    },
  },
  {
    id: "T2-005",
    name: "Duplicate down, Orphan up, & Orphan cancel Rejected by Core",
    features: [2],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      const fp0 = drv.assertCanonicalState();
      assert.throws(() => drv.up("power", 100), /release without press edge/);
      assert.throws(() => drv.cancel("power"), /cancel without press edge/);
      assert.equal(drv.assertCanonicalState(), fp0);
      drv.down("power");
      assert.throws(() => drv.down("power"), /duplicate press edge/);
      drv.cancel("power");
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "off");
    },
  },
  {
    id: "T2-006",
    name: "cancel Edge Cleanly Releases Held Key (power / ent / menu) Without Firing Press",
    features: [2, 22],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});

      drv.down("ent");
      assert.equal(isHlSuppressed(drv.state(), MDC2060_ADAPTER), true);
      drv.cancel("ent");
      assert.equal(isHlSuppressed(drv.state(), MDC2060_ADAPTER), false);
      assert.equal(Boolean(getMeasurementInfo(drv.state(), MDC2060_ADAPTER).twoPoint?.active), false);

      drv.holdCancel("power");
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "transmit");
      assert.equal(getOverlayKind(drv.state(), MDC2060_ADAPTER), null);

      drv.holdCancel("menu");
      assert.equal(isMenuOpen(drv.state(), MDC2060_ADAPTER).open, false);
      drv.verifyReplay();
    },
  },
  {
    id: "T2-007",
    name: "stby_tx Is No-Op While OFF or PREHEAT",
    features: [2],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.press("stby_tx");
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "off");
      drv.holdPress("power", 200);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "preheat");
      drv.press("stby_tx");
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "preheat", "Cannot enter TX before magnetron warmup finishes");
      assert.ok(getPreheatRemaining(drv.state(), MDC2060_ADAPTER) > 0);
    },
  },
  {
    id: "T2-008",
    name: "Hold power >3000ms Powers OFF From Every Active State (PREHEAT, STANDBY, TRANSMIT, SLEEP)",
    features: [2, 4],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();

      // PREHEAT -> OFF
      {
        const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
        drv.holdPress("power", 200);
        assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "preheat");
        drv.holdPress("power", 3001);
        assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "off");
        assert.equal(getPreheatRemaining(drv.state(), MDC2060_ADAPTER), 0);
      }
      // STANDBY -> OFF
      {
        const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
        drv.powerOnToStandby({fastPreheat: true});
        drv.holdPress("power", 3001);
        assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "off");
      }
      // TRANSMIT -> OFF
      {
        const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
        drv.powerOnToTransmit({fastPreheat: true});
        drv.holdPress("power", 3001);
        assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "off");
      }
      // SLEEP -> OFF
      {
        const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
        drv.powerOnToTransmit({fastPreheat: true});
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^SLEEP$/i, /MODE/i, {adjustSteps: 1, confirm: true, closeAfter: true});
        assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "sleep");
        drv.holdPress("power", 3001);
        assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "off");
      }
    },
  },
  {
    id: "T2-009",
    name: "SLEEP Activation Ignored Outside TRANSMIT",
    features: [4],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToStandby({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^SLEEP$/i, /MODE/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      assert.notEqual(getPowerMode(drv.state(), MDC2060_ADAPTER), "sleep", "SLEEP must not engage while in STANDBY");
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "standby");
    },
  },
  {
    id: "T2-010",
    name: "tick.steps Boundary Validation (0, 21, 1.5, -1 Rejected; 1 & 20 Accepted)",
    features: [31],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.dispatch({kind: "tick", steps: 1}, "bridge");
      drv.dispatch({kind: "tick", steps: 20}, "bridge");
      assert.equal(drv.bus().simTick, 21);

      for (const badSteps of [0, 21, -1, 1.5]) {
        assert.throws(
          () => drv.dispatch({kind: "tick", steps: badSteps}, "bridge"),
          err => err instanceof RangeError && /tick steps must be 1\.\.20/.test(err.message),
          `Expected RangeError for tick steps=${badSteps}`,
        );
      }
      assert.throws(
        () => drv.dispatch({kind: "tick", steps: 1}, MDC2060_ADAPTER.id),
        err => err instanceof TypeError,
        "Dispatching tick to device ID instead of 'bridge' must throw",
      );
    },
  },
  {
    id: "T2-011",
    name: "training-fixture Rejects Non-Boolean enabled & Unknown Fixture Names",
    features: [31],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      const badPayloads = [
        {kind: "training-fixture", fixture: "fastPreheat", enabled: 5},
        {kind: "training-fixture", fixture: "fastPreheat", enabled: "true"},
        {kind: "training-fixture", fixture: "fastPreheat", enabled: null},
        {kind: "training-fixture", fixture: "seaStateOverride", enabled: true},
        {kind: "training-fixture", fixture: "nonexistentFixture", enabled: true},
      ];
      for (const input of badPayloads) {
        assert.throws(
          () => drv.dispatch(input),
          err => err instanceof TypeError && /invalid instructor training fixture/.test(err.message),
          `Expected TypeError for ${JSON.stringify(input)}`,
        );
      }
    },
  },
  {
    id: "T2-012",
    name: "pointer on ppi_cursor Rejects Zero-Delta (0, 0), |delta| > 500, NaN, Infinity",
    features: [22],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      const badPointers = [
        {dx: 0, dy: 0},
        {dx: 501, dy: 0},
        {dx: 0, dy: -501},
        {dx: Number.NaN, dy: 10},
        {dx: 10, dy: Number.POSITIVE_INFINITY},
      ];
      for (const p of badPointers) {
        assert.throws(
          () => drv.dispatch({kind: "pointer", control: "ppi_cursor", ...p}),
          err => err instanceof RangeError && /pointer dx\/dy/.test(err.message),
          `Expected RangeError for pointer ${JSON.stringify(p)}`,
        );
      }
      drv.pointer(500, -500);
      drv.assertCanonicalState();
    },
  },
  {
    id: "T2-013",
    name: "touch on ppi_cursor Rejects Out-of-Bounds Coordinates (<0 / >4096) & Invalid Phase",
    features: [22],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      const badTouches = [
        {x: -1, y: 100, phase: "down"},
        {x: 4097, y: 100, phase: "down"},
        {x: 100, y: -5, phase: "move"},
        {x: 100, y: 100, phase: "hover"},
      ];
      for (const t of badTouches) {
        assert.throws(
          () => drv.dispatch({kind: "touch", control: "ppi_cursor", ...t}),
          err => err instanceof TypeError && /invalid touch gesture/.test(err.message),
          `Expected TypeError for touch ${JSON.stringify(t)}`,
        );
      }
      drv.touch(0, 0, "down");
      drv.touch(4096, 4096, "up");
      drv.assertCanonicalState();
    },
  },
  {
    id: "T2-014",
    name: "rotate on gain/stc Rejects steps: 0, 21, -21, 1.5 & Clamps Values 0..100",
    features: [16, 18],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      for (const badSteps of [0, 21, -21, 1.5]) {
        assert.throws(
          () => drv.dispatch({kind: "rotate", control: "gain", steps: badSteps}),
          err => err instanceof RangeError && /rotation steps/.test(err.message),
        );
      }
      drv.rotate("gain", 200);
      assert.equal(getGain(drv.state(), MDC2060_ADAPTER), 100);
      drv.rotate("gain", -200);
      assert.equal(getGain(drv.state(), MDC2060_ADAPTER), 0);
      drv.rotate("stc", 200);
      assert.equal(getStc(drv.state(), MDC2060_ADAPTER), 100);
      drv.rotate("stc", -200);
      assert.equal(getStc(drv.state(), MDC2060_ADAPTER), 0);
    },
  },
  {
    id: "T2-015",
    name: "analog Instructor Controls Reject Out-of-Range (<-1000 / >1000 / NaN) & Clamp Domain",
    features: [32],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      for (const badVal of [-1001, 1001, Number.NaN, Number.POSITIVE_INFINITY]) {
        assert.throws(
          () => drv.dispatch({kind: "analog", control: "inst_sea_state", value: badVal}),
          err => err instanceof RangeError && /analog control value/.test(err.message),
        );
      }

      // Set operator panel FTC to non-zero 3 before testing inst_ftc override & -1 restore
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ECHO$/i, /^FTC$/i, {adjustSteps: 3, confirm: true, closeAfter: true});
      assert.equal(drv.probe().ftc, 3, `Operator panel FTC must be set to 3, got ${String(drv.probe().ftc)}`);
      assert.equal(drv.probe().effectiveFtc, 3, `effectiveFtc must reflect operator panel FTC=3 before override, got ${String(drv.probe().effectiveFtc)}`);

      drv.analog("inst_sea_state", 99);
      drv.analog("inst_rain", 200);
      drv.analog("inst_ftc", 99);
      const clamped = readAnalogOverrides(drv, MDC2060_ADAPTER);
      assert.equal(clamped.sea, 6, `inst_sea_state=99 must clamp to 6, got ${String(clamped.sea)}`);
      assert.equal(clamped.rain, 100, `inst_rain=200 must clamp to 100, got ${String(clamped.rain)}`);
      assert.equal(clamped.ftc, 8, `inst_ftc=99 must clamp to 8, got ${String(clamped.ftc)}`);
      assert.equal(drv.probe().effectiveFtc, 8, `inst_ftc=99 must propagate effectiveFtc=8, got ${String(drv.probe().effectiveFtc)}`);
      assert.equal(drv.probe().ftc, 3, `inst_ftc=99 must preserve operator panel ftc=3, got ${String(drv.probe().ftc)}`);
      drv.assertCanonicalState();

      drv.analog("inst_sea_state", -1);
      drv.analog("inst_rain", -1);
      drv.analog("inst_ftc", -1);
      const resetOv = readAnalogOverrides(drv, MDC2060_ADAPTER);
      assert.ok(resetOv.sea === null || resetOv.sea === -1, `inst_sea_state=-1 must clear override (null or -1), got ${String(resetOv.sea)}`);
      assert.ok(resetOv.rain === null || resetOv.rain === -1, `inst_rain=-1 must clear override (null or -1), got ${String(resetOv.rain)}`);
      assert.ok(resetOv.ftc === null || resetOv.ftc === -1, `inst_ftc=-1 must clear override (null or -1), got ${String(resetOv.ftc)}`);
      assert.equal(drv.probe().ftc, 3, `inst_ftc=-1 must preserve operator panel ftc=3, got ${String(drv.probe().ftc)}`);
      assert.equal(
        drv.probe().effectiveFtc,
        3,
        `inst_ftc=-1 must restore effectiveFtc to operator panel ftc (3), got ${String(drv.probe().effectiveFtc)}`,
      );
      assert.equal(
        drv.probe().effectiveFtc,
        drv.probe().ftc,
        `inst_ftc=-1 must restore effectiveFtc === panel ftc (${String(drv.probe().ftc)}), got ${String(drv.probe().effectiveFtc)}`,
      );
      drv.assertCanonicalState();
      drv.verifyReplay();
    },
  },
  {
    id: "T2-016",
    name: "down/up/cancel Rejected on Non-Hold Controls (stby_tx, range_up, f1, alarm_ack)",
    features: [26],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      for (const ctrl of ["stby_tx", "range_up", "f1", "alarm_ack"]) {
        assert.throws(
          () => drv.dispatch({kind: "down", control: ctrl}),
          err => err instanceof TypeError && /reserved for physical hold-capable keys/.test(err.message),
        );
      }
    },
  },
  {
    id: "T2-017",
    name: "pad Gesture Rejects Invalid Direction & Non-Pad Control",
    features: [22],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      assert.throws(
        () => drv.dispatch({kind: "pad", control: "cursorpad", direction: "diagonal"}),
        err => err instanceof TypeError && /invalid physical trackpad gesture/.test(err.message),
      );
      assert.throws(
        () => drv.dispatch({kind: "pad", control: "stby_tx", direction: "up"}),
        err => err instanceof TypeError && /invalid physical trackpad gesture/.test(err.message),
      );
    },
  },
  {
    id: "T2-018",
    name: "up Hold Duration Bounds (durationMs < 0, > 120000, non-integer Rejected; 0 & 120000 Accepted)",
    features: [31],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.down("power");
      for (const badMs of [-1, 120001, 50.5]) {
        assert.throws(
          () => drv.dispatch({kind: "up", control: "power", durationMs: badMs}),
          err => err instanceof RangeError && /invalid captured input duration/.test(err.message),
        );
      }
      drv.up("power", 0);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "preheat");
      drv.holdPress("power", 120000);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "off");
    },
  },
  {
    id: "T2-019",
    name: "deviceState Strict JSON-Canonical Purity Across All Operations (stableSerialize Never Throws)",
    features: [31],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      const check = () => {
        drv.assertCanonicalState();
      };
      check();
      drv.fixture("fastPreheat", true);
      check();
      drv.holdPress("power", 200);
      check();
      drv.tick(5);
      check();
      drv.press("stby_tx");
      check();
      drv.press("range_down");
      check();
      drv.rotate("gain", 5);
      check();
      drv.rotate("stc", 5);
      check();
      drv.pointer(40, -30);
      check();
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      check();
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ATA$/i, /^ACQ$/i, {adjustSteps: 0, confirm: true, closeAfter: true});
      check();
      drv.tick(6);
      check();
      drv.holdPress("power", 3100);
      check();
    },
  },
  {
    id: "T2-020",
    name: "reduceMdc2060 Tolerates Missing event.maritimeBus === undefined Cleanly",
    features: [31],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcSingleDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.tick(5);
      drv.press("range_down");
      drv.rotate("gain", 5);
      drv.pointer(30, -25);
      drv.holdPress("menu", 200);
      drv.pad("down");
      drv.holdPress("menu", 200);
      drv.holdPress("ent", 1350);
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "transmit");
      drv.assertCanonicalState();
      drv.verifyReplay();
    },
  },
];
