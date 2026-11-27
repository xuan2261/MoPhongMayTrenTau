import assert from "node:assert/strict";
import {loadAdapter, loadModel, loadScenarios, loadSpec} from "./helpers/module-loader.mjs";
import {
  applySettingsViaCodecRestore,
  closeMenu,
  closeOverlayOrMenu,
  createMdcBridgeDriver,
  findMenuEntry,
  getColorPalette,
  getFtc,
  getMeasurementInfo,
  getOverlayKind,
  getPowerMode,
  getRangeInfo,
  getTxSeconds,
  isHlSuppressed,
  isMenuOpen,
  normalizeMenuTree,
  openMainMenu,
  openSystemMenu,
  operateMenuItem,
  setChoiceSetting,
} from "./helpers/session-driver.mjs";

export const TIER = 1;
export const SUITE = "tier1-measurements-menus";

export const TESTS = [
  {
    id: "T1-041",
    name: "EBL1 Activation, Bearing Adjustment & True (T) Mode",
    features: [19],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      const m = getMeasurementInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(Boolean(m.ebl1?.enabled), true, "EBL1 must be enabled via MENU > EBL/VRM > EBL1");
      const brg = Number(m.ebl1?.bearingDeg ?? m.ebl1?.angleDeg);
      assert.ok(Number.isFinite(brg) && brg >= 0 && brg < 360, `EBL1 bearing out of [0, 360): ${brg}`);
      assert.match(String(m.brgMode), /^T|TRUE$/i);
      drv.verifyReplay();
    },
  },
  {
    id: "T1-042",
    name: "EBL2 Independent Operation & Relative (R) Bearing Mode",
    features: [19],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      applySettingsViaCodecRestore(drv, model, (s, keys) => {
        setChoiceSetting(s, keys.brgMode, "R");
      });
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL2$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      const m = getMeasurementInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(Boolean(m.ebl2?.enabled), true, "EBL2 must activate independently of EBL1");
      assert.equal(Boolean(m.ebl1?.enabled), false, "Enabling EBL2 must not implicitly enable EBL1");
      assert.match(String(m.brgMode), /^R|REL/i);
    },
  },
  {
    id: "T1-043",
    name: "EBL1 FLOAT Detached Origin at Crosshair Position",
    features: [19],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      drv.pointer(75, -60);
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /EBL1\s*FLOAT/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      const m = getMeasurementInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(Boolean(m.ebl1?.floating ?? m.ebl1?.floatEnabled), true, "EBL1 FLOAT must enable floating origin");
      const ox = Number(m.ebl1?.originX ?? m.ebl1?.origin?.x ?? m.ebl1?.floatX);
      const oy = Number(m.ebl1?.originY ?? m.ebl1?.origin?.y ?? m.ebl1?.floatY);
      assert.ok(Number.isFinite(ox) && Number.isFinite(oy) && Math.hypot(ox, oy) > 0, "EBL1 FLOAT origin must detach to non-zero crosshair position");
      drv.verifyReplay();
    },
  },
  {
    id: "T1-044",
    name: "VRM1 & VRM2 Dual Concentric Range Markers",
    features: [20],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^VRM1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^VRM2$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      const m = getMeasurementInfo(drv.state(), MDC2060_ADAPTER);
      const rangeNm = getRangeInfo(drv.state(), MDC2060_ADAPTER, spec.MDC2060_RANGES).rangeNm;
      assert.equal(Boolean(m.vrm1?.enabled), true, "VRM1 must be active");
      assert.equal(Boolean(m.vrm2?.enabled), true, "VRM2 must be active");
      const r1 = Number(m.vrm1?.rangeNm ?? m.vrm1?.value);
      const r2 = Number(m.vrm2?.rangeNm ?? m.vrm2?.value);
      assert.ok(Number.isFinite(r1) && r1 > 0 && r1 <= rangeNm, `VRM1 (${r1}) must be within (0, ${rangeNm}]`);
      assert.ok(Number.isFinite(r2) && r2 > 0 && r2 <= rangeNm, `VRM2 (${r2}) must be within (0, ${rangeNm}]`);
    },
  },
  {
    id: "T1-045",
    name: "Parallel Index Lines (PI LINE) Enable, Bearing & Spacing",
    features: [21],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /PI\s*LINE/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      const m = getMeasurementInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(Boolean(m.pi?.enabled), true, "PI LINE must be active after enabling in DISPLAY menu");
      const brg = Number(m.pi?.bearingDeg);
      const spacing = Number(m.pi?.spacingNm);
      assert.ok(Number.isFinite(brg) && brg >= 0 && brg < 360);
      assert.ok(Number.isFinite(spacing) && spacing > 0, `PI spacingNm must be > 0, got ${spacing}`);
    },
  },
  {
    id: "T1-046",
    name: "Crosshair Cursor Movement via cursorpad Computes Live BRG/RNG/LAT/LON",
    features: [22],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      const before = structuredClone(getMeasurementInfo(drv.state(), MDC2060_ADAPTER).cursor);
      for (let i = 0; i < 4; i++) drv.pad("up");
      for (let i = 0; i < 4; i++) drv.pad("right");
      const after = getMeasurementInfo(drv.state(), MDC2060_ADAPTER).cursor;
      assert.notDeepEqual(after, before, "cursorpad movement must update crosshair cursor coordinates");
      const rng = Number(after?.rangeNm);
      const brg = Number(after?.bearingDeg);
      const lat = Number(after?.lat);
      const lon = Number(after?.lon);
      assert.ok(Number.isFinite(rng) && rng > 0, `Cursor rangeNm must be > 0, got ${rng}`);
      assert.ok(Number.isFinite(brg) && brg >= 0 && brg < 360, `Cursor bearingDeg invalid: ${brg}`);
      assert.ok(Number.isFinite(lat) && Number.isFinite(lon), "Cursor must compute valid LAT/LON");
      assert.ok(Math.abs(lat - drv.bus().ownship.lat) < 2 && Math.abs(lon - drv.bus().ownship.lon) < 2);
    },
  },
  {
    id: "T1-047",
    name: "Direct PPI Cursor Positioning via ppi_cursor pointer & touch",
    features: [22],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      const c0 = structuredClone(getMeasurementInfo(drv.state(), MDC2060_ADAPTER).cursor);
      drv.pointer(20, -15);
      const c1 = structuredClone(getMeasurementInfo(drv.state(), MDC2060_ADAPTER).cursor);
      assert.notDeepEqual(c1, c0, "pointer gesture on ppi_cursor must reposition crosshair");
      drv.touch(300, 240, "down");
      const c2 = getMeasurementInfo(drv.state(), MDC2060_ADAPTER).cursor;
      assert.notDeepEqual(c2, c1, "touch gesture on ppi_cursor must place crosshair directly");
      drv.touch(300, 240, "up");
      drv.verifyReplay();
    },
  },
  {
    id: "T1-048",
    name: "2-Point Distance & Bearing Measurement via Short ENT",
    features: [22],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      // Position at point A (open water, away from targets) and anchor with short ENT
      drv.touch(150, 260, "down");
      drv.touch(150, 260, "up");
      drv.holdPress("ent", 200);
      // Move to point B
      drv.touch(310, 290, "down");
      drv.touch(310, 290, "up");
      const m = getMeasurementInfo(drv.state(), MDC2060_ADAPTER);
      assert.ok(m.twoPoint && (m.twoPoint.active || m.twoPoint.anchor || m.twoPoint.rangeNm > 0), "Short ENT with menu closed must anchor 2-point measurement");
      const distNm = Number(m.twoPoint.rangeNm ?? m.twoPoint.distanceNm);
      const brgDeg = Number(m.twoPoint.bearingDeg);
      assert.ok(Number.isFinite(distNm) && distNm > 0, `2-point rangeNm must be > 0, got ${distNm}`);
      assert.ok(Number.isFinite(brgDeg) && brgDeg >= 0 && brgDeg < 360);
      // Confirm/clear cleanly
      drv.holdPress("ent", 200);
      drv.assertCanonicalState();
      drv.verifyReplay();
    },
  },
  {
    id: "T1-049",
    name: "Hold ENT >1200ms Temporarily Suppresses Heading Line (HL OFF)",
    features: [22],
    async run() {
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      assert.equal(isHlSuppressed(drv.state(), MDC2060_ADAPTER), false);
      drv.down("ent");
      assert.equal(isHlSuppressed(drv.state(), MDC2060_ADAPTER), true, "Holding ENT down must suppress heading line (HL OFF)");
      drv.up("ent", 1400);
      assert.equal(isHlSuppressed(drv.state(), MDC2060_ADAPTER), false, "Releasing ENT must restore heading line");
      const m = getMeasurementInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(Boolean(m.twoPoint?.active), false, "Long ENT >1200ms must NOT trigger short-ENT 2-point anchor side effect");
      drv.verifyReplay();
    },
  },
  {
    id: "T1-050",
    name: "Concurrent EBL1/VRM1/PI/Cursor Readouts Stay Mutually Independent",
    features: [19, 20, 21, 22],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^EBL1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /EBL\/VRM/i, /^VRM1$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /PI\s*LINE/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      drv.pointer(40, 30);
      const m = getMeasurementInfo(drv.state(), MDC2060_ADAPTER);
      assert.equal(Boolean(m.ebl1?.enabled), true);
      assert.equal(Boolean(m.vrm1?.enabled), true);
      assert.equal(Boolean(m.pi?.enabled), true);
      assert.ok(Number(m.cursor?.rangeNm) > 0);
      drv.assertCanonicalState();
    },
  },
  {
    id: "T1-051",
    name: "Main Menu Tree Declares Exact 8 Groups & Documented Items",
    features: [26],
    async run() {
      const {MDC2060_MAIN_MENU_TREE} = await loadSpec();
      const groups = normalizeMenuTree(MDC2060_MAIN_MENU_TREE);
      assert.equal(groups.length, 8, `Main Menu must have exact 8 groups, got ${groups.length}`);
      const expectedGroups = [
        {group: /^ECHO$/i, items: [/FTC/i, /^IR$/i, /EXP/i, /PROCESS/i, /^PW$/i, /SUB\s*GAIN/i]},
        {group: /^DISPLAY$/i, items: [/MODE/i, /MOTION/i, /SCREEN/i, /OFF\s*CENT/i, /TRAIL\s*MODE/i, /TRAIL\s*TIME/i, /COLOR/i, /PI\s*LINE/i, /BRG\s*MODE/i, /VECTOR/i]},
        {group: /^EBL\/VRM$/i, items: [/^EBL1$/i, /^EBL2$/i, /^VRM1$/i, /^VRM2$/i, /EBL1\s*FLOAT/i]},
        {group: /^ALARM$/i, items: [/MODE/i, /INNER/i, /OUTER/i, /START/i, /END/i, /LEVEL/i]},
        {group: /^ATA$/i, items: [/^ACQ$/i, /^DEL$/i, /DEL\s*ALL/i, /AUTO\s*AREA/i, /CPA/i, /TCPA/i, /VECTOR/i, /PAST\s*POS/i]},
        {group: /^AIS$/i, items: [/DISPLAY/i, /FILTER/i, /INFO/i, /CPA/i]},
        {group: /^SLEEP$/i, items: [/MODE/i, /INTERVAL/i]},
        {group: /^SYSTEM$/i, items: []},
      ];
      for (const specGrp of expectedGroups) {
        const gEntry = findMenuEntry(MDC2060_MAIN_MENU_TREE, specGrp.group);
        assert.ok(gEntry, `Main Menu missing group matching ${specGrp.group}`);
        for (const itemRe of specGrp.items) {
          const iEntry = findMenuEntry(MDC2060_MAIN_MENU_TREE, specGrp.group, itemRe);
          assert.ok(iEntry, `Main Menu group ${gEntry.group.key} missing item matching ${itemRe}`);
        }
      }
    },
  },
  {
    id: "T1-052",
    name: "System Menu Tree Declares Exact 4 Groups & Documented Items",
    features: [27],
    async run() {
      const {MDC2060_SYSTEM_MENU_TREE} = await loadSpec();
      const groups = normalizeMenuTree(MDC2060_SYSTEM_MENU_TREE);
      assert.equal(groups.length, 4, `System Menu must have exact 4 groups, got ${groups.length}`);
      const expectedGroups = [
        {group: /^ASSIST$/i, items: [/RINGS/i, /RANGE\s*UNIT/i, /MOTOR/i, /BUZZER/i, /CURSOR/i, /LANG/i]},
        {group: /^ADJUST$/i, items: [/STC\s*CURVE/i, /BRG\s*ADJ/i, /TUNE/i]},
        {group: /^PRESET$/i, items: [/F1/i, /F2/i, /RESET/i]},
        {group: /^MAINT$/i, items: [/PANEL\s*TEST/i, /LCD\s*TEST/i, /TX\s*HOURS/i]},
      ];
      for (const specGrp of expectedGroups) {
        const gEntry = findMenuEntry(MDC2060_SYSTEM_MENU_TREE, specGrp.group);
        assert.ok(gEntry, `System Menu missing group matching ${specGrp.group}`);
        for (const itemRe of specGrp.items) {
          const iEntry = findMenuEntry(MDC2060_SYSTEM_MENU_TREE, specGrp.group, itemRe);
          assert.ok(iEntry, `System Menu group ${gEntry.group.key} missing item matching ${itemRe}`);
        }
      }
    },
  },
  {
    id: "T1-053",
    name: "Short Press MENU Opens, Navigates & Closes Main Menu",
    features: [26],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      assert.equal(isMenuOpen(drv.state(), MDC2060_ADAPTER).open, false);
      openMainMenu(drv);
      const beforeFtc = getFtc(drv.state(), MDC2060_ADAPTER);
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ECHO$/i, /^FTC$/i, {adjustSteps: 2, confirm: true, closeAfter: true});
      assert.equal(isMenuOpen(drv.state(), MDC2060_ADAPTER).open, false);
      assert.notEqual(getFtc(drv.state(), MDC2060_ADAPTER), beforeFtc, "Editing ECHO > FTC in Main Menu must commit value");
      drv.verifyReplay();
    },
  },
  {
    id: "T1-054",
    name: "Long Hold MENU >1500ms & MAIN > SYSTEM Both Open System Menu",
    features: [27],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      openSystemMenu(drv);
      const sys1 = isMenuOpen(drv.state(), MDC2060_ADAPTER);
      assert.equal(sys1.open, true);
      assert.match(String(sys1.kind ?? sys1.overlay ?? ""), /system/i);
      closeMenu(drv);

      const sysItem = findMenuEntry(spec.MDC2060_MAIN_MENU_TREE, /^SYSTEM$/i, /SYSTEM/i);
      if (sysItem) {
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^SYSTEM$/i, /SYSTEM/i, {adjustSteps: 0, confirm: true, closeAfter: false});
      } else {
        operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^SYSTEM$/i, null, {adjustSteps: 0, confirm: true, closeAfter: false});
      }
      const sysCheck = isMenuOpen(drv.state(), MDC2060_ADAPTER);
      if (!/system/i.test(String(sysCheck.kind ?? sysCheck.overlay ?? ""))) {
        drv.holdPress("ent", 150);
      }
      const sys2 = isMenuOpen(drv.state(), MDC2060_ADAPTER);
      assert.equal(sys2.open, true);
      assert.match(String(sys2.kind ?? sys2.overlay ?? ""), /system/i);
    },
  },
  {
    id: "T1-055",
    name: "F1 & F2 Customizable Preset Shortcut Keys",
    features: [27],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      assert.ok(Array.isArray(spec.MDC2060_FKEY_PRESETS) && spec.MDC2060_FKEY_PRESETS.length >= 3);
      assert.equal(Object.isFrozen(spec.MDC2060_FKEY_PRESETS), true);

      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_SYSTEM_MENU_TREE, /^PRESET$/i, /F1/i, {system: true, adjustSteps: 1, confirm: true, closeAfter: true});
      const fpBeforeF1 = drv.assertCanonicalState();
      drv.press("f1");
      const fpAfterF1 = drv.assertCanonicalState();
      assert.notEqual(fpAfterF1, fpBeforeF1, "Pressing F1 must immediately execute its assigned preset action");

      const fpBeforeF2 = drv.assertCanonicalState();
      drv.press("f2");
      const fpAfterF2 = drv.assertCanonicalState();
      assert.notEqual(fpAfterF2, fpBeforeF2, "Pressing F2 must immediately execute its assigned preset action");
      drv.verifyReplay();
    },
  },
  {
    id: "T1-056",
    name: "SYSTEM > PRESET > ALL RESET Restores Factory Defaults Deterministically",
    features: [27],
    async run() {
      const spec = await loadSpec();
      const model = await loadModel();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const defaults = model.initialMdc2060State();
      const defaultPalette = getColorPalette(defaults, MDC2060_ADAPTER);
      const defaultFtc = getFtc(defaults, MDC2060_ADAPTER);

      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^DISPLAY$/i, /^COLOR$/i, {adjustSteps: 1, confirm: true, closeAfter: true});
      operateMenuItem(drv, spec.MDC2060_MAIN_MENU_TREE, /^ECHO$/i, /^FTC$/i, {adjustSteps: 3, confirm: true, closeAfter: true});
      drv.press("range_down");
      assert.notEqual(getColorPalette(drv.state(), MDC2060_ADAPTER), defaultPalette);
      assert.notEqual(getFtc(drv.state(), MDC2060_ADAPTER), defaultFtc);

      operateMenuItem(drv, spec.MDC2060_SYSTEM_MENU_TREE, /^PRESET$/i, /RESET/i, {system: true, adjustSteps: 0, confirm: true, closeAfter: true});
      assert.equal(getColorPalette(drv.state(), MDC2060_ADAPTER), defaultPalette, "ALL RESET must restore default palette");
      assert.equal(getFtc(drv.state(), MDC2060_ADAPTER), defaultFtc, "ALL RESET must restore default FTC");
      assert.equal(getPowerMode(drv.state(), MDC2060_ADAPTER), "transmit", "ALL RESET must keep unit powered");
      drv.verifyReplay();
    },
  },
  {
    id: "T1-057",
    name: "SYSTEM > MAINT > PANEL TEST & LCD TEST Diagnostic Screens",
    features: [27],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToTransmit({fastPreheat: true});

      operateMenuItem(drv, spec.MDC2060_SYSTEM_MENU_TREE, /^MAINT$/i, /PANEL\s*TEST/i, {system: true, adjustSteps: 0, confirm: true, closeAfter: false});
      const ovPanel = getOverlayKind(drv.state(), MDC2060_ADAPTER);
      assert.ok(ovPanel && /panel/i.test(String(ovPanel)), `Expected PANEL TEST overlay, got ${String(ovPanel)}`);
      const fpBeforeKey = drv.assertCanonicalState();
      drv.press("f1");
      assert.notEqual(drv.assertCanonicalState(), fpBeforeKey, "PANEL TEST must record hardware key press");
      closeOverlayOrMenu(drv);

      operateMenuItem(drv, spec.MDC2060_SYSTEM_MENU_TREE, /^MAINT$/i, /LCD\s*TEST/i, {system: true, adjustSteps: 0, confirm: true, closeAfter: false});
      const ovLcd = getOverlayKind(drv.state(), MDC2060_ADAPTER);
      assert.ok(ovLcd && /lcd/i.test(String(ovLcd)), `Expected LCD TEST overlay, got ${String(ovLcd)}`);
      closeOverlayOrMenu(drv);
      assert.equal(getOverlayKind(drv.state(), MDC2060_ADAPTER), null);
    },
  },
  {
    id: "T1-058",
    name: "SYSTEM > MAINT > TX HOURS & ADJUST (BRG ADJ, TUNE AUTO/MAN, BUZZER)",
    features: [27],
    async run() {
      const spec = await loadSpec();
      const {MDC2060_ADAPTER} = await loadAdapter();
      const {MDC2060_COASTAL_SCENARIO} = await loadScenarios();
      const drv = createMdcBridgeDriver({adapter: MDC2060_ADAPTER, scenario: MDC2060_COASTAL_SCENARIO});
      drv.powerOnToStandby({fastPreheat: true});
      const tx0 = getTxSeconds(drv.state(), MDC2060_ADAPTER);
      drv.tick(5);
      assert.equal(getTxSeconds(drv.state(), MDC2060_ADAPTER), tx0, "TX hours/seconds must stay flat in STANDBY");

      drv.press("stby_tx");
      drv.tick(8);
      const tx1 = getTxSeconds(drv.state(), MDC2060_ADAPTER);
      assert.equal(tx1, tx0 + 8, `TX seconds must increment strictly during TRANSMIT (expected ${tx0 + 8}, got ${tx1})`);

      const fp0 = drv.assertCanonicalState();
      operateMenuItem(drv, spec.MDC2060_SYSTEM_MENU_TREE, /^ADJUST$/i, /BRG\s*ADJ/i, {system: true, adjustSteps: 1, confirm: true, closeAfter: true});
      const fp1 = drv.assertCanonicalState();
      assert.notEqual(fp1, fp0, "BRG ADJ must update state");
      operateMenuItem(drv, spec.MDC2060_SYSTEM_MENU_TREE, /^ADJUST$/i, /TUNE/i, {system: true, adjustSteps: 1, confirm: true, closeAfter: true});
      const fp2 = drv.assertCanonicalState();
      assert.notEqual(fp2, fp1, "TUNE AUTO/MAN must update state");
      operateMenuItem(drv, spec.MDC2060_SYSTEM_MENU_TREE, /^ASSIST$/i, /BUZZER/i, {system: true, adjustSteps: 1, confirm: true, closeAfter: true});
      assert.notEqual(drv.assertCanonicalState(), fp2, "BUZZER setting must update state");
    },
  },
];
