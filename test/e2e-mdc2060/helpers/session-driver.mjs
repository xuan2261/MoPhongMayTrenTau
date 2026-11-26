import assert from "node:assert/strict";
import {
  BRIDGE_RUNTIME_VERSION,
  bridgeSessionHash,
  createBridgeReplay,
  createBridgeSession,
  dispatchBridgeInput,
  replayBridgeSession,
} from "../../../src/core/device-runtime.mjs";
import {
  DEFAULT_BRIDGE_WORLD_SCENARIO,
  MARITIME_WORLD_VERSION,
  NMEA_BUS_CONTRACT_VERSION,
  advanceMaritimeWorld,
  computeTargetEncounter,
  formatNmeaSentence,
  initialMaritimeWorldState,
  nmeaChecksum,
  projectMaritimeSensorBus,
} from "../../../src/core/maritime-world.mjs";
import {
  CORE_CONTRACT_VERSION,
  EVENT_SCHEMA_VERSION,
  REPLAY_ENVELOPE_VERSION,
  TICK_DURATION_MS,
  classifyHoldDurationMs,
  fingerprint,
  stableSerialize,
  validateInput,
} from "../../../src/core/protocol.mjs";
import {
  createReplayEnvelope,
  createSession,
  dispatch,
  replay,
  reset,
  sessionHash,
} from "../../../src/core/session.mjs";
import {FCV588_ADAPTER} from "../../../src/devices/fcv588/adapter.mjs";

export {
  BRIDGE_RUNTIME_VERSION,
  CORE_CONTRACT_VERSION,
  DEFAULT_BRIDGE_WORLD_SCENARIO,
  EVENT_SCHEMA_VERSION,
  FCV588_ADAPTER,
  MARITIME_WORLD_VERSION,
  NMEA_BUS_CONTRACT_VERSION,
  REPLAY_ENVELOPE_VERSION,
  TICK_DURATION_MS,
  advanceMaritimeWorld,
  bridgeSessionHash,
  classifyHoldDurationMs,
  computeTargetEncounter,
  createBridgeReplay,
  createBridgeSession,
  createReplayEnvelope,
  createSession,
  dispatch,
  dispatchBridgeInput,
  fingerprint,
  formatNmeaSentence,
  initialMaritimeWorldState,
  nmeaChecksum,
  projectMaritimeSensorBus,
  replay,
  replayBridgeSession,
  reset,
  sessionHash,
  stableSerialize,
  validateInput,
};

export function assertDeepFrozen(value, label = "object", seen = new WeakSet()) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true, `${label} must be Object.freeze()d`);
  for (const key of Object.keys(value)) {
    assertDeepFrozen(value[key], `${label}.${key}`, seen);
  }
}

/**
 * Strictly validates that a deviceState tree is pure canonical JSON data per PROJECT.md § Interface Contracts:
 * rejects NaN, +/-Infinity, undefined, functions, symbols, bigint, ArrayBuffer/TypedArrays, Map/Set/Weak*,
 * Date/RegExp/Error, non-plain prototypes, symbol keys, non-enumerable/accessor descriptors,
 * sparse or extra-property arrays, and cyclic references (while permitting frozen DAG structural sharing).
 */
export function assertCanonicalJsonValue(value, label = "deviceState") {
  const activeAncestors = new WeakSet();

  function walk(node, pathLabel) {
    if (node === null) return;
    const t = typeof node;
    if (t === "boolean" || t === "string") return;
    if (t === "number") {
      if (!Number.isFinite(node)) {
        assert.fail(`${pathLabel} contains non-finite number (${String(node)})`);
      }
      return;
    }
    if (t === "undefined" || t === "function" || t === "symbol" || t === "bigint") {
      assert.fail(`${pathLabel} contains non-JSON primitive type "${t}"`);
    }
    if (activeAncestors.has(node)) {
      assert.fail(`${pathLabel} contains a cyclic object reference`);
    }
    if (ArrayBuffer.isView(node) || node instanceof ArrayBuffer) {
      assert.fail(`${pathLabel} contains binary buffer/typed array (${node.constructor?.name ?? "ArrayBufferView"})`);
    }
    if (node instanceof Map || node instanceof Set || node instanceof WeakMap || node instanceof WeakSet) {
      assert.fail(`${pathLabel} contains disallowed collection (${node.constructor?.name ?? "Collection"})`);
    }
    if (node instanceof Date || node instanceof RegExp || node instanceof Error) {
      assert.fail(`${pathLabel} contains non-plain object (${node.constructor?.name ?? "Object"})`);
    }

    activeAncestors.add(node);
    try {
      if (Array.isArray(node)) {
        if (Object.getPrototypeOf(node) !== Array.prototype) {
          assert.fail(`${pathLabel} is a non-plain Array subclass`);
        }
        const ownKeys = Reflect.ownKeys(node);
        if (ownKeys.length !== node.length + 1) {
          assert.fail(`${pathLabel} array has sparse slots, symbol keys, or extra own properties`);
        }
        for (let i = 0; i < node.length; i++) {
          const desc = Object.getOwnPropertyDescriptor(node, String(i));
          if (!desc || !desc.enumerable || !Object.hasOwn(desc, "value")) {
            assert.fail(`${pathLabel}[${i}] is sparse, non-enumerable, or an accessor`);
          }
          walk(desc.value, `${pathLabel}[${i}]`);
        }
        return;
      }

      const proto = Object.getPrototypeOf(node);
      if (proto !== Object.prototype && proto !== null) {
        assert.fail(`${pathLabel} has non-plain prototype (${node.constructor?.name ?? "unknown"})`);
      }
      if (Object.getOwnPropertySymbols(node).length > 0) {
        assert.fail(`${pathLabel} contains symbol keys`);
      }
      for (const key of Object.getOwnPropertyNames(node)) {
        const desc = Object.getOwnPropertyDescriptor(node, key);
        if (!desc || !desc.enumerable || !Object.hasOwn(desc, "value")) {
          assert.fail(`${pathLabel}.${key} is non-enumerable or an accessor getter/setter`);
        }
        walk(desc.value, `${pathLabel}.${key}`);
      }
    } finally {
      activeAncestors.delete(node);
    }
  }

  walk(value, label);
}

export function deepCloneFreeze(value) {
  const cloned = structuredClone(value);
  const freezeRec = node => {
    if (!node || typeof node !== "object" || Object.isFrozen(node)) return node;
    for (const k of Object.keys(node)) freezeRec(node[k]);
    return Object.freeze(node);
  };
  return freezeRec(cloned);
}

export function assertValidNmeaSentence(sentence, expectedHeader = null) {
  assert.equal(typeof sentence, "string", "NMEA sentence must be a string");
  assert.match(
    sentence,
    /^\$[A-Z]{5},[^*]*\*[0-9A-F]{2}$/,
    `Malformed NMEA-0183 sentence: ${sentence}`,
  );
  const starIdx = sentence.lastIndexOf("*");
  const body = sentence.slice(1, starIdx);
  const checksumHex = sentence.slice(starIdx + 1);
  assert.equal(
    checksumHex,
    nmeaChecksum(body),
    `NMEA checksum mismatch for ${sentence}: expected ${nmeaChecksum(body)}, got ${checksumHex}`,
  );
  if (expectedHeader) {
    assert.ok(
      sentence.startsWith(`$${expectedHeader},`),
      `Expected NMEA header $${expectedHeader}, got ${sentence}`,
    );
  }
}

export function createMdcBridgeDriver({
  adapter,
  extraAdapters = [],
  adapters = null,
  scenario,
  targetId = adapter.id,
}) {
  if (!adapter) throw new TypeError("createMdcBridgeDriver requires adapter");
  if (!scenario) throw new TypeError("createMdcBridgeDriver requires explicit scenario");
  const orderedAdapters = adapters ? [...adapters] : [adapter, ...extraAdapters];
  let bridge = createBridgeSession(orderedAdapters, scenario);

  const driver = {
    get bridge() {
      return bridge;
    },
    get adapter() {
      return orderedAdapters.find(a => a.id === targetId) ?? adapter;
    },
    get adapters() {
      return orderedAdapters;
    },
    get scenario() {
      return scenario;
    },
    get targetId() {
      return targetId;
    },
    state(id = targetId) {
      return bridge.devices[id].deviceState;
    },
    probe(id = targetId) {
      const targetAdapter = orderedAdapters.find(a => a.id === id) ?? adapter;
      return targetAdapter.probe(bridge.devices[id].deviceState);
    },
    bus() {
      return bridge.sensorBus;
    },
    world() {
      return bridge.maritimeWorld;
    },
    hash() {
      return bridgeSessionHash(bridge);
    },
    dispatch(input, id = targetId) {
      bridge = dispatchBridgeInput(bridge, orderedAdapters, id, input, scenario);
      return bridge;
    },
    tick(totalSteps = 1) {
      let remaining = totalSteps;
      while (remaining > 0) {
        const chunk = Math.min(20, remaining);
        bridge = dispatchBridgeInput(bridge, orderedAdapters, "bridge", {kind: "tick", steps: chunk}, scenario);
        remaining -= chunk;
      }
      return bridge;
    },
    uiTick(elapsedMs, id = targetId) {
      let remaining = elapsedMs;
      while (remaining > 0) {
        const chunk = Math.min(60000, remaining);
        driver.dispatch({kind: "ui-tick", elapsedMs: chunk}, id);
        remaining -= chunk;
      }
      return bridge;
    },
    press(control, id = targetId) {
      return driver.dispatch({kind: "press", control}, id);
    },
    down(control, id = targetId) {
      return driver.dispatch({kind: "down", control}, id);
    },
    up(control, durationMs = 150, id = targetId) {
      return driver.dispatch({kind: "up", control, durationMs}, id);
    },
    cancel(control, id = targetId) {
      return driver.dispatch({kind: "cancel", control}, id);
    },
    holdPress(control, durationMs = 150, id = targetId) {
      driver.down(control, id);
      return driver.up(control, durationMs, id);
    },
    holdCancel(control, id = targetId) {
      driver.down(control, id);
      return driver.cancel(control, id);
    },
    rotate(control, steps, id = targetId) {
      if (steps === 0) return bridge;
      const sign = steps > 0 ? 1 : -1;
      let remaining = Math.abs(steps);
      while (remaining > 0) {
        const chunk = Math.min(20, remaining) * sign;
        driver.dispatch({kind: "rotate", control, steps: chunk}, id);
        remaining -= Math.abs(chunk);
      }
      return bridge;
    },
    analog(control, value, id = targetId) {
      return driver.dispatch({kind: "analog", control, value}, id);
    },
    pad(direction, control = "cursorpad", id = targetId) {
      return driver.dispatch({kind: "pad", control, direction}, id);
    },
    pointer(dx, dy, control = "ppi_cursor", id = targetId) {
      return driver.dispatch({kind: "pointer", control, dx, dy}, id);
    },
    touch(x, y, phase, control = "ppi_cursor", id = targetId) {
      return driver.dispatch({kind: "touch", control, x, y, phase}, id);
    },
    fixture(fixtureName, enabled, id = targetId) {
      return driver.dispatch({kind: "training-fixture", fixture: fixtureName, enabled}, id);
    },
    restoreSettings(settings, id = targetId) {
      return driver.dispatch({kind: "restore-settings", settings}, id);
    },
    powerOnToStandby({fastPreheat = false, skipPreheat = false} = {}) {
      if (fastPreheat) driver.fixture("fastPreheat", true);
      driver.holdPress("power", 150);
      if (skipPreheat) {
        driver.fixture("skipPreheat", true);
      } else {
        driver.tick(fastPreheat ? 5 : 120);
      }
      return bridge;
    },
    powerOnToTransmit(opts = {}) {
      driver.powerOnToStandby(opts);
      return driver.press("stby_tx");
    },
    verifyReplay() {
      const envelope = createBridgeReplay(bridge);
      const restored = replayBridgeSession(orderedAdapters, scenario, envelope);
      const expectedHash = bridgeSessionHash(bridge);
      const restoredHash = bridgeSessionHash(restored);
      assert.equal(restoredHash, expectedHash, "replayBridgeSession hash must match live bridgeSessionHash");
      return {envelope, restored, hash: expectedHash};
    },
    assertCanonicalState(id = targetId) {
      const st = driver.state(id);
      assertCanonicalJsonValue(st, `deviceState(${id})`);
      stableSerialize(st);
      return fingerprint(st);
    },
    assertProbeParity(probeFn, id = targetId) {
      const st = driver.state(id);
      const targetAdapter = orderedAdapters.find(a => a.id === id) ?? adapter;
      assert.deepEqual(targetAdapter.probe(st), probeFn(st), "adapter.probe(state) must equal probeMdc2060(state)");
    },
  };

  return driver;
}

export function createMdcSingleDriver({adapter, scenario}) {
  if (!adapter) throw new TypeError("createMdcSingleDriver requires adapter");
  if (!scenario) throw new TypeError("createMdcSingleDriver requires scenario");
  let session = createSession(adapter, scenario);

  const driver = {
    get session() {
      return session;
    },
    get adapter() {
      return adapter;
    },
    get targetId() {
      return adapter.id;
    },
    get scenario() {
      return scenario;
    },
    state() {
      return session.deviceState;
    },
    probe() {
      return adapter.probe(session.deviceState);
    },
    hash() {
      return sessionHash(session);
    },
    dispatch(input) {
      session = dispatch(session, adapter, input, scenario);
      return session;
    },
    tick(totalSteps = 1) {
      let remaining = totalSteps;
      while (remaining > 0) {
        const chunk = Math.min(20, remaining);
        session = dispatch(session, adapter, {kind: "tick", steps: chunk}, scenario);
        remaining -= chunk;
      }
      return session;
    },
    uiTick(elapsedMs) {
      let remaining = elapsedMs;
      while (remaining > 0) {
        const chunk = Math.min(60000, remaining);
        driver.dispatch({kind: "ui-tick", elapsedMs: chunk});
        remaining -= chunk;
      }
      return session;
    },
    press(control) {
      return driver.dispatch({kind: "press", control});
    },
    down(control) {
      return driver.dispatch({kind: "down", control});
    },
    up(control, durationMs = 150) {
      return driver.dispatch({kind: "up", control, durationMs});
    },
    cancel(control) {
      return driver.dispatch({kind: "cancel", control});
    },
    holdPress(control, durationMs = 150) {
      driver.down(control);
      return driver.up(control, durationMs);
    },
    holdCancel(control) {
      driver.down(control);
      return driver.cancel(control);
    },
    rotate(control, steps) {
      if (steps === 0) return session;
      const sign = steps > 0 ? 1 : -1;
      let remaining = Math.abs(steps);
      while (remaining > 0) {
        const chunk = Math.min(20, remaining) * sign;
        driver.dispatch({kind: "rotate", control, steps: chunk});
        remaining -= Math.abs(chunk);
      }
      return session;
    },
    analog(control, value) {
      return driver.dispatch({kind: "analog", control, value});
    },
    pad(direction, control = "cursorpad") {
      return driver.dispatch({kind: "pad", control, direction});
    },
    pointer(dx, dy, control = "ppi_cursor") {
      return driver.dispatch({kind: "pointer", control, dx, dy});
    },
    touch(x, y, phase, control = "ppi_cursor") {
      return driver.dispatch({kind: "touch", control, x, y, phase});
    },
    fixture(fixtureName, enabled) {
      return driver.dispatch({kind: "training-fixture", fixture: fixtureName, enabled});
    },
    restoreSettings(settings) {
      return driver.dispatch({kind: "restore-settings", settings});
    },
    powerOnToStandby({fastPreheat = false, skipPreheat = false} = {}) {
      if (fastPreheat) driver.fixture("fastPreheat", true);
      driver.holdPress("power", 150);
      if (skipPreheat) {
        driver.fixture("skipPreheat", true);
      } else {
        driver.tick(fastPreheat ? 5 : 120);
      }
      return session;
    },
    powerOnToTransmit(opts = {}) {
      driver.powerOnToStandby(opts);
      return driver.press("stby_tx");
    },
    verifyReplay() {
      const envelope = createReplayEnvelope(session);
      const restored = replay(adapter, scenario, envelope);
      const expectedHash = sessionHash(session);
      const restoredHash = sessionHash(restored);
      assert.equal(restoredHash, expectedHash, "single-session replay hash must match live sessionHash");
      return {envelope, restored, hash: expectedHash};
    },
    assertCanonicalState() {
      const st = session.deviceState;
      assertCanonicalJsonValue(st, `deviceState(${adapter.id})`);
      stableSerialize(st);
      return fingerprint(st);
    },
  };

  return driver;
}

// ---------------------------------------------------------------------------
// Probe-First Semantic Readers (Opaque-Box Contract Surface)
// ---------------------------------------------------------------------------

function readProbe(state, adapter = null) {
  if (adapter && typeof adapter.probe === "function") return adapter.probe(state) ?? {};
  return {};
}

function firstDefined(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

export function asBool(val, fallback = false) {
  if (val === undefined || val === null) return fallback;
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return Number.isFinite(val) ? val !== 0 : fallback;
  if (typeof val === "string") {
    const norm = val.trim().toUpperCase();
    if (norm === "OFF" || norm === "FALSE" || norm === "0" || norm === "NO" || norm === "NONE" || norm === "") {
      return false;
    }
    if (norm === "ON" || norm === "TRUE" || norm === "1" || norm === "YES") {
      return true;
    }
    // Non-OFF numbered options (e.g. PI LINE "1".."4", EXP "1"|"2") indicate enabled
    if (/^[1-9]\d*$/.test(norm)) return true;
    return fallback;
  }
  return Boolean(val);
}

export function getPowerMode(state, adapter = null) {
  const p = readProbe(state, adapter);
  const raw = firstDefined(p.powerMode, p.power, p.txState, p.status, state?.powerMode, state?.power);
  const norm = String(raw ?? "").trim().toLowerCase();
  if (norm === "stby" || norm === "st'by" || norm === "standby") return "standby";
  if (norm === "tx" || norm === "transmit" || norm === "transmitting") return "transmit";
  if (norm === "preheat" || norm === "warmup" || norm === "heating") return "preheat";
  if (norm === "sleep" || norm === "economy") return "sleep";
  if (norm === "off") return "off";
  return norm;
}

export function getPreheatRemaining(state, adapter = null) {
  const p = readProbe(state, adapter);
  return Number(firstDefined(
    p.preheatRemainingSec,
    p.preheatRemaining,
    p.preheatSec,
    state?.preheatRemainingSec,
    state?.preheatRemaining,
    state?.preheatSec,
  ));
}

export function getRangeInfo(state, adapter = null, rangesTable = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  const rangeIndex = firstDefined(p.rangeIndex, state?.rangeIndex, s.rangeIndex);
  const subRangeIndex = firstDefined(p.subRangeIndex, state?.subRangeIndex, s.subRangeIndex);
  const entry = Array.isArray(rangesTable) && Number.isInteger(rangeIndex) ? rangesTable[rangeIndex] : null;
  const subEntry = Array.isArray(rangesTable) && Number.isInteger(subRangeIndex) ? rangesTable[subRangeIndex] : null;
  const rangeNm = firstDefined(p.rangeNm, state?.rangeNm, entry?.nm);
  const subRangeNm = firstDefined(p.subRangeNm, state?.subRangeNm, subEntry?.nm);
  const ringNm = firstDefined(p.ringNm, state?.ringNm, entry?.ringNm);
  const rings = firstDefined(p.rings, p.ringCount, state?.rings, entry?.rings);
  const rangeUnit = firstDefined(p.rangeUnit, s.rangeUnit, state?.rangeUnit);
  const ringsVisible = asBool(
    firstDefined(p.ringsVisible, p.rangeRings, p.ringsOn, s.ringsVisible, s.rangeRings, s.rings, state?.ringsVisible),
    true,
  );
  const nonAuto = v => (
    v !== undefined &&
    v !== null &&
    String(v).trim().length > 0 &&
    String(v).trim().toUpperCase() !== "AUTO"
      ? v
      : undefined
  );
  const pw = firstDefined(
    nonAuto(p.effectivePw),
    nonAuto(p.activePw),
    nonAuto(p.pw),
    nonAuto(p.pulseWidth),
    nonAuto(state?.effectivePw),
    nonAuto(state?.activePw),
    nonAuto(state?.pw),
    nonAuto(s.pw),
    nonAuto(s.pulseWidth),
  ) ?? null;
  return {rangeIndex, rangeNm, ringNm, rings, subRangeIndex, subRangeNm, rangeUnit, ringsVisible, pw};
}

export function getGain(state, adapter = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  return Number(firstDefined(p.gain, s.gain, state?.gain));
}

export function getStc(state, adapter = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  return Number(firstDefined(p.stc, p.seaClutter, s.stc, s.seaClutter, state?.stc));
}

export function getStcCurve(state, adapter = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  return Number(firstDefined(p.stcCurve, s.stcCurve, state?.stcCurve));
}

export function getFtc(state, adapter = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  return Number(firstDefined(p.ftc, p.rainClutter, s.ftc, s.rainClutter, state?.ftc));
}

export function getIr(state, adapter = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  return firstDefined(p.ir, p.irLevel, s.ir, s.irLevel, state?.ir);
}

export function getSweepAngle(state, adapter = null) {
  const p = readProbe(state, adapter);
  return Number(firstDefined(
    p.sweepAngleDeg,
    p.sweepDeg,
    p.sweepAzimuthDeg,
    p.antennaAzimuthDeg,
    state?.sweepAngleDeg,
    state?.sweepDeg,
    state?.sweepAzimuthDeg,
    state?.antennaAngleDeg,
  ));
}

export function getMotorRpm(state, adapter = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  return Number(firstDefined(p.motorRpm, p.antennaRpm, s.motorRpm, s.antennaRpm, state?.motorRpm));
}

export function getBrilliance(state, adapter = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  return Number(firstDefined(
    p.brilliance,
    p.lcdBrilliance,
    p.brightness,
    s.brilliance,
    s.lcdBrilliance,
    s.brightness,
    state?.brilliance,
    state?.brightness,
  ));
}

export function getOverlayKind(state, adapter = null) {
  const p = readProbe(state, adapter);
  const readKind = v => {
    if (typeof v === "string") return v.length > 0 ? v : undefined;
    if (v && typeof v === "object") {
      return v.open !== false && typeof v.kind === "string" && v.kind.length > 0 ? v.kind : undefined;
    }
    return undefined;
  };
  return firstDefined(
    readKind(p.overlayKind),
    readKind(p.dialog),
    readKind(p.overlay),
    state?.overlay?.open !== false ? readKind(state?.overlay?.kind) : undefined,
    state?.dialog?.open !== false ? readKind(state?.dialog?.kind) : undefined,
    typeof state?.overlay === "string" && state.overlay.length > 0 ? state.overlay : undefined,
    typeof state?.dialog === "string" && state.dialog.length > 0 ? state.dialog : undefined,
    state?.menu?.open ? (state?.menu?.kind ?? "menu") : undefined,
  ) ?? null;
}

export function isMenuOpen(state, adapter = null) {
  const p = readProbe(state, adapter);
  const overlay = getOverlayKind(state, adapter);
  const menuObj = state?.menu && typeof state.menu === "object" ? state.menu : null;
  const overlayObj = state?.overlay && typeof state.overlay === "object" ? state.overlay : null;
  const overlayIsMenu = typeof overlay === "string" && /menu|system|main/i.test(overlay);
  const open = asBool(
    firstDefined(
      p.menuOpen,
      menuObj?.open,
      overlayObj && overlayObj.open !== undefined ? (asBool(overlayObj.open, false) && overlayIsMenu) : undefined,
      overlayIsMenu,
    ),
    false,
  );
  const metaObj = menuObj ?? overlayObj ?? {};
  const kind = firstDefined(
    p.menuKind,
    menuObj?.kind,
    overlayIsMenu && typeof overlay === "string" ? overlay : undefined,
    open ? "main" : undefined,
  ) ?? null;
  const groupIndex = firstDefined(p.menuGroupIndex, metaObj.groupIndex, 0);
  const itemIndex = firstDefined(p.menuItemIndex, metaObj.itemIndex, 0);
  const level = firstDefined(p.menuLevel, metaObj.level, metaObj.depth) ?? null;
  const editing = asBool(firstDefined(p.menuEditing, metaObj.editing), false);
  return {open, kind, groupIndex, itemIndex, level, editing, overlay};
}

export function isHlSuppressed(state, adapter = null) {
  const p = readProbe(state, adapter);
  return asBool(firstDefined(p.hlSuppressed, p.hlOff, p.headingLineOff, state?.hlSuppressed, state?.hlOff), false);
}

export function getPresentationMode(state, adapter = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  return firstDefined(p.presentationMode, p.displayMode, p.mode, s.presentationMode, s.displayMode, state?.presentationMode);
}

export function getMotionMode(state, adapter = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  return firstDefined(p.motionMode, p.motion, s.motionMode, s.motion, state?.motionMode);
}

export function getScreenMode(state, adapter = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  return firstDefined(p.screenMode, p.indicationMode, p.screen, s.screenMode, s.indicationMode, state?.screenMode);
}

export function getColorPalette(state, adapter = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  return firstDefined(p.colorPalette, p.palette, p.color, s.colorPalette, s.palette, s.color, state?.colorPalette);
}

export function getOffCenter(state, adapter = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  const oc = state?.offCenterOffset && typeof state.offCenterOffset === "object"
    ? state.offCenterOffset
    : (state?.offCenter && typeof state.offCenter === "object"
      ? state.offCenter
      : (p.offCenterOffset && typeof p.offCenterOffset === "object"
        ? p.offCenterOffset
        : (p.offCenter && typeof p.offCenter === "object" ? p.offCenter : {})));
  const enabled = asBool(
    firstDefined(
      p.offCenterEnabled,
      oc.enabled,
      typeof p.offCenter === "boolean" || typeof p.offCenter === "string" ? p.offCenter : undefined,
      typeof s.offCenter === "boolean" || typeof s.offCenter === "string" ? s.offCenter : undefined,
    ),
    false,
  );
  const xFrac = Number(firstDefined(p.offCenterX, oc.xFrac, oc.x, 0));
  const yFrac = Number(firstDefined(p.offCenterY, oc.yFrac, oc.y, 0));
  return {enabled, xFrac, yFrac};
}

export function getTmOffset(state, adapter = null) {
  const p = readProbe(state, adapter);
  const tm = state?.tmOffset ?? state?.trueMotion ?? state?.tm ?? p.tmOffset ?? p.trueMotion ?? {};
  const xFrac = Number(firstDefined(p.tmOffsetX, p.tmX, tm?.offsetX, tm?.xFrac, tm?.x, state?.tmOffsetX, 0));
  const yFrac = Number(firstDefined(p.tmOffsetY, p.tmY, tm?.offsetY, tm?.yFrac, tm?.y, state?.tmOffsetY, 0));
  const resetCount = Number(firstDefined(p.tmResetCount, tm?.resetCount, state?.tmResetCount, 0));
  return {xFrac, yFrac, resetCount};
}

export function getTrailInfo(state, adapter = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  const tr = state?.trails ?? state?.trail ?? {};
  const mode = firstDefined(p.trailMode, s.trailMode, tr?.mode, state?.trailMode);
  const time = firstDefined(p.trailTime, p.trailTimeMin, s.trailTime, s.trailTimeMin, tr?.time, state?.trailTime);
  const history = firstDefined(
    Array.isArray(state?.trailHistory) ? state.trailHistory : undefined,
    Array.isArray(tr?.history) ? tr.history : undefined,
    Array.isArray(tr?.points) ? tr.points : undefined,
    tr?.byTarget ?? state?.trailsByTarget ?? tr,
  );
  return {mode, time, history};
}

export function getMeasurementInfo(state, adapter = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  const asObj = v => (v && typeof v === "object" ? v : null);
  const asScalar = v => (typeof v === "boolean" || typeof v === "string" || typeof v === "number" ? v : undefined);

  const rawEbl1 = asObj(state?.ebl1) ?? asObj(p.ebl1) ?? asObj(s.ebl1);
  const ebl1OriginX = firstDefined(rawEbl1?.originX, rawEbl1?.origin?.x, state?.ebl1Origin?.xFrac, state?.ebl1Origin?.x, p.ebl1OriginX);
  const ebl1OriginY = firstDefined(rawEbl1?.originY, rawEbl1?.origin?.y, state?.ebl1Origin?.yFrac, state?.ebl1Origin?.y, p.ebl1OriginY);
  const ebl1 = {
    ...(rawEbl1 ?? {}),
    enabled: asBool(firstDefined(rawEbl1?.enabled, p.ebl1On, p.ebl1Enabled, asScalar(p.ebl1), asScalar(s.ebl1)), false),
    bearingDeg: firstDefined(rawEbl1?.bearingDeg, rawEbl1?.angleDeg, p.ebl1Deg, p.ebl1BearingDeg, state?.ebl1Deg, state?.ebl1BearingDeg),
    floating: asBool(firstDefined(rawEbl1?.floating, rawEbl1?.floatEnabled, p.ebl1Floating, p.ebl1Float, s.ebl1Float, state?.ebl1Float), false),
    ...(ebl1OriginX !== undefined ? {originX: ebl1OriginX} : {}),
    ...(ebl1OriginY !== undefined ? {originY: ebl1OriginY} : {}),
  };

  const rawEbl2 = asObj(state?.ebl2) ?? asObj(p.ebl2) ?? asObj(s.ebl2);
  const ebl2 = {
    ...(rawEbl2 ?? {}),
    enabled: asBool(firstDefined(rawEbl2?.enabled, p.ebl2On, p.ebl2Enabled, asScalar(p.ebl2), asScalar(s.ebl2)), false),
    bearingDeg: firstDefined(rawEbl2?.bearingDeg, rawEbl2?.angleDeg, p.ebl2Deg, p.ebl2BearingDeg, state?.ebl2Deg, state?.ebl2BearingDeg),
  };

  const rawVrm1 = asObj(state?.vrm1) ?? asObj(p.vrm1) ?? asObj(s.vrm1);
  const vrm1 = {
    ...(rawVrm1 ?? {}),
    enabled: asBool(firstDefined(rawVrm1?.enabled, p.vrm1On, p.vrm1Enabled, asScalar(p.vrm1), asScalar(s.vrm1)), false),
    rangeNm: firstDefined(rawVrm1?.rangeNm, rawVrm1?.value, p.vrm1Nm, p.vrm1RangeNm, state?.vrm1Nm, state?.vrm1RangeNm),
  };

  const rawVrm2 = asObj(state?.vrm2) ?? asObj(p.vrm2) ?? asObj(s.vrm2);
  const vrm2 = {
    ...(rawVrm2 ?? {}),
    enabled: asBool(firstDefined(rawVrm2?.enabled, p.vrm2On, p.vrm2Enabled, asScalar(p.vrm2), asScalar(s.vrm2)), false),
    rangeNm: firstDefined(rawVrm2?.rangeNm, rawVrm2?.value, p.vrm2Nm, p.vrm2RangeNm, state?.vrm2Nm, state?.vrm2RangeNm),
  };

  const rawPi = asObj(state?.pi) ?? asObj(state?.piLine) ?? asObj(p.pi) ?? asObj(s.pi) ?? asObj(s.piLine);
  const pi = {
    ...(rawPi ?? {}),
    enabled: asBool(firstDefined(rawPi?.enabled, p.piEnabled, asScalar(p.piLine), asScalar(p.pi), asScalar(s.piLine), asScalar(s.pi)), false),
    bearingDeg: firstDefined(rawPi?.bearingDeg, p.piBearingDeg, state?.piBearingDeg),
    spacingNm: firstDefined(rawPi?.spacingNm, p.piSpacingNm, state?.piSpacingNm),
  };

  const brgMode = firstDefined(p.brgMode, p.bearingMode, s.brgMode, s.bearingMode, state?.brgMode);
  const cursor = state?.cursor ?? p.cursor ?? {};
  let twoPoint = state?.twoPoint ?? state?.measureTwoPoint ?? p.twoPoint ?? null;
  if (!twoPoint && (state?.measureAnchor || state?.measureResult)) {
    const anchor = state?.measureAnchor ?? null;
    const result = state?.measureResult ?? null;
    twoPoint = {
      active: firstDefined(p.twoPointActive, Boolean(anchor && !result)),
      anchor,
      result,
      rangeNm: firstDefined(result?.rangeNm, p.twoPointRangeNm),
      bearingDeg: firstDefined(result?.bearingDeg, p.twoPointBearingDeg),
    };
  }
  return {ebl1, ebl2, vrm1, vrm2, pi, brgMode, cursor, twoPoint};
}

export function getAtaInfo(state, adapter = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  const ata = state?.ata ?? {};
  const targets = Array.isArray(ata.targets)
    ? ata.targets
    : Array.isArray(p.ataTargets)
      ? p.ataTargets
      : [];
  const rattmSentences = Array.isArray(ata.rattmSentences)
    ? ata.rattmSentences
    : Array.isArray(p.rattmSentences)
      ? p.rattmSentences
      : Array.isArray(state?.nmeaOut)
        ? state.nmeaOut.filter(x => typeof x === "string" && x.startsWith("$RATTM,"))
        : [];
  return {
    targets,
    targetCount: firstDefined(p.ataTargetCount, p.ataCount, targets.length),
    autoArea: asBool(firstDefined(p.ataAutoArea, s.ataAutoArea, ata.autoArea, s.autoArea), false),
    cpaLimitNm: firstDefined(p.ataCpaLimitNm, p.cpaLimitNm, s.ataCpaLimitNm, s.cpaLimitNm, ata.cpaLimitNm),
    tcpaLimitMin: firstDefined(p.ataTcpaLimitMin, p.tcpaLimitMin, s.ataTcpaLimitMin, s.tcpaLimitMin, ata.tcpaLimitMin),
    vectorMode: firstDefined(p.vectorMode, s.vectorMode, ata.vectorMode),
    vectorTimeMin: firstDefined(p.ataVectorTimeMin, p.vectorTimeMin, s.ataVectorTimeMin, s.vectorTimeMin, ata.vectorTimeMin),
    alarmActive: asBool(firstDefined(p.ataAlarmActive, p.ataDanger, ata.alarmActive, targets.some(t => t?.dangerous)), false),
    rattmSentences,
    boardEnabled: asBool(firstDefined(p.ataBoardOption, state?.trainingFixture?.ataBoardOption, state?.fixtures?.ataBoardOption), true),
  };
}

export function getAisInfo(state, adapter = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  const ais = state?.ais ?? {};
  const targets = Array.isArray(ais.targets)
    ? ais.targets
    : Array.isArray(p.aisTargets)
      ? p.aisTargets
      : [];
  return {
    display: asBool(firstDefined(p.aisDisplay, s.aisDisplay, ais.display, ais.enabled), true),
    filterRangeNm: firstDefined(p.aisFilterRangeNm, s.aisFilterRangeNm, ais.filterRangeNm),
    targets,
    targetCount: firstDefined(p.aisTargetCount, p.aisCount, ais.targetCount, targets.length),
    selectedMmsi: firstDefined(p.selectedAisMmsi, ais.selectedMmsi, state?.selectedAisMmsi) ?? null,
    selectedTarget: firstDefined(p.selectedAisTarget, ais.selectedTarget, ais.detail) ?? null,
    cpaAlarm: asBool(firstDefined(p.aisCpaAlarm, s.aisCpaAlarm, ais.cpaAlarm), false),
    alarmActive: asBool(firstDefined(p.aisAlarmActive, p.aisDanger, ais.alarmActive), false),
    boardEnabled: asBool(firstDefined(p.aisBoardOption, state?.trainingFixture?.aisBoardOption, ais.boardInstalled, state?.fixtures?.aisBoardOption), true),
  };
}

export function getGuardZoneInfo(state, adapter = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  const gz = state?.guardZone ?? s.guardZone ?? {};
  return {
    mode: firstDefined(p.guardZoneMode, p.alarmMode, gz.mode, s.alarmMode, s.guardZoneMode, "OFF"),
    innerNm: firstDefined(p.guardZoneInnerNm, p.alarmInnerNm, gz.innerNm, s.alarmInnerNm, s.guardZoneInnerNm),
    outerNm: firstDefined(p.guardZoneOuterNm, p.alarmOuterNm, gz.outerNm, s.alarmOuterNm, s.guardZoneOuterNm),
    startBrgDeg: firstDefined(p.guardZoneStartBrgDeg, p.alarmStartBrgDeg, gz.startBrgDeg, s.alarmStartBrgDeg, s.guardZoneStartBrgDeg),
    endBrgDeg: firstDefined(p.guardZoneEndBrgDeg, p.alarmEndBrgDeg, gz.endBrgDeg, s.alarmEndBrgDeg, s.guardZoneEndBrgDeg),
    level: firstDefined(p.guardZoneLevel, p.alarmLevel, gz.level, s.alarmLevel, s.guardZoneLevel),
    triggered: asBool(firstDefined(p.guardZoneTriggered, p.guardZoneAlarm, gz.triggered, gz.alarmActive), false),
    intruders: firstDefined(
      Array.isArray(gz.triggeredContactIds) ? gz.triggeredContactIds : undefined,
      Array.isArray(gz.intruders) ? gz.intruders : undefined,
      Array.isArray(gz.triggeredIds) ? gz.triggeredIds : undefined,
      Array.isArray(p.guardZoneTriggeredContactIds) ? p.guardZoneTriggeredContactIds : undefined,
      Array.isArray(p.guardZoneIntruders) ? p.guardZoneIntruders : undefined,
      [],
    ),
    insideIds: firstDefined(
      Array.isArray(gz.insideContactIds) ? gz.insideContactIds : undefined,
      Array.isArray(gz.insideIds) ? gz.insideIds : undefined,
      Array.isArray(gz.capturedContactIds) ? gz.capturedContactIds : undefined,
      Array.isArray(gz.capturedIds) ? gz.capturedIds : undefined,
      [],
    ),
  };
}

export function getAlarmInfo(state, adapter = null) {
  const p = readProbe(state, adapter);
  const al = state?.alarms ?? state?.alarm ?? {};
  const audible = asBool(firstDefined(p.alarmAudible, p.buzzerActive, al.audible, state?.alarmAudible), false);
  const visualActive = asBool(firstDefined(
    p.alarmVisualActive,
    p.alarmActive,
    al.visualActive,
    al.active,
    getAtaInfo(state, adapter).alarmActive ||
      getAisInfo(state, adapter).alarmActive ||
      getGuardZoneInfo(state, adapter).triggered,
  ), false);
  return {
    audible,
    visualActive,
    anyActive: audible || visualActive,
    acknowledged: asBool(firstDefined(p.alarmAcked, al.acknowledged), false),
  };
}

export function getLanguage(state, adapter = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  return firstDefined(p.language, p.lang, s.language, s.lang, state?.language);
}

export function getSensorWarnings(state, adapter = null) {
  const p = readProbe(state, adapter);
  const warnings = Array.isArray(p.warnings)
    ? p.warnings
    : Array.isArray(state?.warnings)
      ? state.warnings
      : Array.isArray(state?.sensorWarnings)
        ? state.sensorWarnings
        : [];
  const joined = warnings.join(" ").toUpperCase();
  const hdgNoSignal = Boolean(
    firstDefined(p.hdgNoSignal, state?.sensors?.hdgNoSignal, state?.hdgNoSignal) ??
    /HDG\s*NO\s*SIGNAL/.test(joined),
  );
  const llNoSignal = Boolean(
    firstDefined(p.llNoSignal, p.gpsNoSignal, state?.sensors?.llNoSignal, state?.llNoSignal) ??
    /L\/L\s*NO\s*SIGNAL|GPS\s*NO\s*SIGNAL/.test(joined),
  );
  const speedNoSignal = Boolean(
    firstDefined(p.speedNoSignal, p.spdNoSignal, state?.sensors?.speedNoSignal, state?.speedNoSignal) ??
    /SPD\s*NO\s*SIGNAL|SPEED\s*NO\s*SIGNAL/.test(joined),
  );
  return {hdgNoSignal, llNoSignal, speedNoSignal, warnings};
}

export function getTxSeconds(state, adapter = null) {
  const p = readProbe(state, adapter);
  return Number(firstDefined(p.txSeconds, p.txTimeSec, state?.txSeconds, state?.txTimeSec, state?.maint?.txSeconds, 0));
}

export function getSleepInfo(state, adapter = null) {
  const p = readProbe(state, adapter);
  const s = state?.settings ?? {};
  const sl = state?.sleepState ?? state?.sleep ?? {};
  const phase = firstDefined(p.sleepPhase, sl.phase);
  const inBurst = asBool(firstDefined(
    p.sleepInBurst,
    sl.inBurst,
    typeof phase === "string" ? phase.toLowerCase() === "burst" : undefined,
    typeof sl.burstRemainingSec === "number" ? sl.burstRemainingSec > 0 : undefined,
    false,
  ), false);
  return {
    mode: firstDefined(p.sleepMode, s.sleepMode, sl.mode),
    interval: firstDefined(p.sleepInterval, p.sleepIntervalMin, s.sleepInterval, s.sleepIntervalMin, sl.interval, sl.intervalSec),
    phase: phase ?? null,
    inBurst,
  };
}

export function getLanguageCodes(languagesExport) {
  const list = Array.isArray(languagesExport)
    ? languagesExport.map(x => (typeof x === "string" ? x : (x?.code ?? x?.id ?? String(x))))
    : languagesExport && typeof languagesExport === "object"
      ? Object.keys(languagesExport).map(k => (typeof languagesExport[k] === "string" ? languagesExport[k] : k))
      : [];
  const en = list.find(c => /^en($|[-_]|glish)/i.test(c)) ?? null;
  const vi = list.find(c => /^vi($|[-_]|et)/i.test(c)) ?? null;
  return {list, en, vi};
}

// ---------------------------------------------------------------------------
// Dynamic Menu Tree Normalizer & Opaque-Box Menu Navigator
// ---------------------------------------------------------------------------

export function normalizeMenuTree(tree) {
  if (Array.isArray(tree)) {
    return tree.map(group => {
      const key = String(group?.id ?? group?.key ?? group?.code ?? group?.name ?? group?.label ?? "");
      const label = String(group?.label ?? group?.title ?? group?.name ?? key);
      const rawItems = Array.isArray(group?.items)
        ? group.items
        : Array.isArray(group?.children)
          ? group.children
          : Array.isArray(group?.entries)
            ? group.entries
            : [];
      return {
        key,
        label,
        items: rawItems.map(item => {
          if (typeof item === "string") return {key: item, label: item, raw: item};
          const iKey = String(item?.id ?? item?.key ?? item?.code ?? item?.name ?? item?.label ?? "");
          const iLabel = String(item?.label ?? item?.title ?? item?.name ?? iKey);
          return {key: iKey, label: iLabel, raw: item};
        }),
        raw: group,
      };
    });
  }
  if (tree && typeof tree === "object") {
    return Object.entries(tree).map(([k, v]) => {
      const rawItems = Array.isArray(v)
        ? v
        : Array.isArray(v?.items)
          ? v.items
          : Array.isArray(v?.children)
            ? v.children
            : [];
      return {
        key: k,
        label: String(v?.label ?? v?.title ?? k),
        items: rawItems.map(item => {
          if (typeof item === "string") return {key: item, label: item, raw: item};
          const iKey = String(item?.id ?? item?.key ?? item?.code ?? item?.name ?? item?.label ?? "");
          const iLabel = String(item?.label ?? item?.title ?? item?.name ?? iKey);
          return {key: iKey, label: iLabel, raw: item};
        }),
        raw: v,
      };
    });
  }
  return [];
}

function matchesToken(candidate, matcher) {
  if (matcher instanceof RegExp) return matcher.test(candidate);
  return candidate.toUpperCase() === String(matcher).toUpperCase();
}

export function findMenuEntry(tree, groupMatcher, itemMatcher = null) {
  const groups = normalizeMenuTree(tree);
  const groupIndex = groups.findIndex(
    g => matchesToken(g.key, groupMatcher) || matchesToken(g.label, groupMatcher),
  );
  if (groupIndex === -1) return null;
  const group = groups[groupIndex];
  if (!itemMatcher) return {groupIndex, itemIndex: -1, group, item: null};
  const itemIndex = group.items.findIndex(
    it => matchesToken(it.key, itemMatcher) || matchesToken(it.label, itemMatcher),
  );
  if (itemIndex === -1) return null;
  return {groupIndex, itemIndex, group, item: group.items[itemIndex]};
}

export function resolveDriverAdapter(driver) {
  if (!driver || typeof driver !== "object") return null;
  if (driver.adapter && typeof driver.adapter.probe === "function") return driver.adapter;
  if (Array.isArray(driver.adapters)) {
    if (driver.targetId !== undefined) {
      const matched = driver.adapters.find(a => a?.id === driver.targetId);
      if (matched) return matched;
    }
    return driver.adapters[0] ?? null;
  }
  return null;
}

function isSystemMenuKind(menuInfo) {
  return Boolean(menuInfo?.open && /system/i.test(String(menuInfo.kind ?? menuInfo.overlay ?? "")));
}

function isMainMenuKind(menuInfo) {
  return Boolean(menuInfo?.open && !/system/i.test(String(menuInfo.kind ?? menuInfo.overlay ?? "")));
}

export function openMainMenu(driver) {
  const targetAdapter = resolveDriverAdapter(driver);
  for (let i = 0; i < 4; i++) {
    const cur = isMenuOpen(driver.state(), targetAdapter);
    if (isMainMenuKind(cur)) break;
    const ov = getOverlayKind(driver.state(), targetAdapter);
    if (!cur.open && ov === null) break;
    driver.holdPress("menu", 200);
  }
  if (!isMainMenuKind(isMenuOpen(driver.state(), targetAdapter))) {
    driver.holdPress("menu", 200);
  }
  const post = isMenuOpen(driver.state(), targetAdapter);
  assert.equal(post.open, true, "Main Menu must open on short MENU press");
  assert.equal(
    /system/i.test(String(post.kind ?? post.overlay ?? "")),
    false,
    `Main Menu must be open (not System Menu), got kind=${String(post.kind)} overlay=${String(post.overlay)}`,
  );
}

export function openSystemMenu(driver) {
  const targetAdapter = resolveDriverAdapter(driver);
  for (let i = 0; i < 4; i++) {
    const cur = isMenuOpen(driver.state(), targetAdapter);
    const ov = getOverlayKind(driver.state(), targetAdapter);
    if (!cur.open && ov === null) break;
    driver.holdPress("menu", 200);
  }
  driver.holdPress("menu", 1600);
  const post = isMenuOpen(driver.state(), targetAdapter);
  assert.equal(post.open, true, "System Menu must open on >1500ms MENU hold");
  assert.equal(
    isSystemMenuKind(post),
    true,
    `System Menu must be open (not Main Menu), got kind=${String(post.kind)} overlay=${String(post.overlay)}`,
  );
}

export function closeMenu(driver) {
  const targetAdapter = resolveDriverAdapter(driver);
  for (let i = 0; i < 4 && isMenuOpen(driver.state(), targetAdapter).open; i++) {
    driver.holdPress("menu", 200);
  }
  assert.equal(isMenuOpen(driver.state(), targetAdapter).open, false, "Menu must close cleanly");
}

export function closeOverlayOrMenu(driver) {
  const targetAdapter = resolveDriverAdapter(driver);
  for (
    let i = 0;
    i < 4 && (isMenuOpen(driver.state(), targetAdapter).open || getOverlayKind(driver.state(), targetAdapter) !== null);
    i++
  ) {
    driver.holdPress("menu", 200);
  }
  assert.equal(isMenuOpen(driver.state(), targetAdapter).open, false, "Menu must close cleanly");
  assert.equal(getOverlayKind(driver.state(), targetAdapter), null, "Overlay must close cleanly");
}

/**
 * Dynamically navigates a Main or System menu item using physical menu/cursorpad/ent inputs.
 * Computes exact groupIndex and itemIndex from the exported menu tree (zero magic counts).
 */
export function operateMenuItem(driver, tree, groupMatcher, itemMatcher, {
  system = false,
  adjustSteps = 1,
  adjustDirection = "right",
  confirm = true,
  confirmModal = confirm,
  closeAfter = true,
} = {}) {
  const entry = findMenuEntry(tree, groupMatcher, itemMatcher);
  assert.ok(entry, `Menu entry not found in tree: group=${String(groupMatcher)} item=${String(itemMatcher)}`);

  if (system) openSystemMenu(driver);
  else openMainMenu(driver);

  // Move to target groupIndex. Detect whether left/right or up/down changes groupIndex.
  const targetAdapter = resolveDriverAdapter(driver);
  let info = isMenuOpen(driver.state(), targetAdapter);
  if (info.editing) {
    // Exit any lingering draft edit mode cleanly before navigating
    driver.holdPress("menu", 200);
    info = isMenuOpen(driver.state(), targetAdapter);
  }
  if (info.groupIndex !== entry.groupIndex) {
    const beforeDown = info.groupIndex;
    driver.pad("down");
    const afterDown = isMenuOpen(driver.state(), targetAdapter).groupIndex;
    if (afterDown !== beforeDown) {
      // Vertical group list -> move to exact groupIndex, then enter group
      const maxHops = normalizeMenuTree(tree).length + 2;
      for (let i = 0; i < maxHops && isMenuOpen(driver.state(), targetAdapter).groupIndex !== entry.groupIndex; i++) {
        const cur = isMenuOpen(driver.state(), targetAdapter).groupIndex;
        driver.pad(cur < entry.groupIndex ? "down" : "up");
      }
      driver.holdPress("ent", 150);
    } else {
      // Horizontal group tabs -> left/right selects group, up/down selects item
      driver.pad("up");
      const maxHops = normalizeMenuTree(tree).length + 2;
      for (let i = 0; i < maxHops && isMenuOpen(driver.state(), targetAdapter).groupIndex !== entry.groupIndex; i++) {
        const cur = isMenuOpen(driver.state(), targetAdapter).groupIndex;
        driver.pad(cur < entry.groupIndex ? "right" : "left");
      }
    }
  } else if (entry.itemIndex >= 0) {
    // Check if we need ENT to step from group list into items
    const beforeItem = isMenuOpen(driver.state(), targetAdapter);
    if (beforeItem.level === 0 || beforeItem.level === "group" || beforeItem.level === "groups") {
      driver.holdPress("ent", 150);
    }
  }

  if (entry.itemIndex >= 0) {
    const maxItemHops = entry.group.items.length + 2;
    for (let i = 0; i < maxItemHops && isMenuOpen(driver.state(), targetAdapter).itemIndex !== entry.itemIndex; i++) {
      const cur = isMenuOpen(driver.state(), targetAdapter).itemIndex;
      driver.pad(cur < entry.itemIndex ? "down" : "up");
    }
    const dir = adjustSteps < 0 ? "left" : adjustDirection;
    const steps = Math.abs(adjustSteps);
    const itemType = entry.item?.raw?.type;
    const isAction = itemType === "action";
    const isReadonly = itemType === "readonly";

    if (steps > 0 && !isAction && !isReadonly) {
      const ovBefore = driver.state()?.overlay;
      const supportsEditingFlag = Boolean(ovBefore && typeof ovBefore === "object" && Object.hasOwn(ovBefore, "editing"));
      if (!isMenuOpen(driver.state(), targetAdapter).editing) {
        driver.holdPress("ent", 150);
      }
      if (!supportsEditingFlag || isMenuOpen(driver.state(), targetAdapter).editing) {
        for (let s = 0; s < steps; s++) {
          driver.pad(dir);
        }
        if (confirm) {
          driver.holdPress("ent", 150);
        }
      }
    } else if (confirm) {
      driver.holdPress("ent", 150);
      const postKind = getOverlayKind(driver.state(), targetAdapter);
      if (confirmModal && typeof postKind === "string" && /^confirm/i.test(postKind)) {
        const postOv = driver.state()?.overlay;
        if (postOv && typeof postOv === "object" && postOv.confirm === false) {
          driver.pad("right");
        }
        driver.holdPress("ent", 150);
      }
    }
  }

  if (closeAfter && isMenuOpen(driver.state(), targetAdapter).open) {
    closeMenu(driver);
  }
  return entry;
}

/**
 * Discovers allowlisted setting keys from initialMdc2060State().settings dynamically
 * by matching initial domain values or key names (zero hardcoded private paths).
 */
export function discoverSettingsKeys(initialSettings) {
  assert.ok(initialSettings && typeof initialSettings === "object", "initialMdc2060State().settings must be an object");
  const keys = Object.keys(initialSettings);
  const findByRegex = regex => keys.find(k => regex.test(k)) ?? null;
  const findByNameThenUniqueValue = (regex, expectedVal) => {
    const byName = findByRegex(regex);
    if (byName) return byName;
    if (expectedVal === undefined) return null;
    const matches = keys.filter(
      k => initialSettings[k] === expectedVal || String(initialSettings[k]) === String(expectedVal),
    );
    return matches.length === 1 ? matches[0] : null;
  };

  const cpaLimitKey = findByRegex(/^(ataCpaLimitNm|cpaLimitNm)$/i) ?? findByRegex(/(^|[^t])cpaLimit/i);
  const tcpaLimitKey = findByRegex(/^(ataTcpaLimitMin|tcpaLimitMin)$/i) ?? findByRegex(/tcpaLimit/i);
  const vectorTimeKey = findByRegex(/^(ataVectorTimeMin|vectorTimeMin)$/i) ?? findByRegex(/vectorTime/i);
  const autoAreaKey = findByRegex(/^(ataAutoArea|autoArea)$/i) ?? findByRegex(/autoArea/i);
  const pastPosKey = findByRegex(/^(ataPastPos|pastPos)$/i) ?? findByRegex(/pastPos/i);

  const alarmModeKey = findByRegex(/^(alarmMode|guardZoneMode)$/i);
  const alarmInnerKey = findByRegex(/^(alarmInnerNm|guardZoneInnerNm)$/i);
  const alarmOuterKey = findByRegex(/^(alarmOuterNm|guardZoneOuterNm)$/i);
  const alarmStartKey = findByRegex(/^(alarmStartBrgDeg|guardZoneStartBrgDeg)$/i);
  const alarmEndKey = findByRegex(/^(alarmEndBrgDeg|guardZoneEndBrgDeg)$/i);
  const alarmLevelKey = findByRegex(/^(alarmLevel|guardZoneLevel)$/i);

  return {
    allKeys: keys,
    presentationMode: findByNameThenUniqueValue(/^(presentationMode|displayMode)$/i, "H-UP")
      ?? findByNameThenUniqueValue(/presentation|displayMode/i, "H-UP"),
    motionMode: findByNameThenUniqueValue(/motion/i, "RM"),
    screenMode: findByNameThenUniqueValue(/screen|indication/i, "PPI"),
    colorPalette: findByNameThenUniqueValue(/palette|color/i, "DAY"),
    rangeUnit: findByNameThenUniqueValue(/rangeUnit/i, "NM"),
    motorRpm: findByNameThenUniqueValue(/motor|rpm/i, 24),
    language: findByRegex(/^lang(uage)?$/i) ?? findByRegex(/lang/i),
    rangeIndex: findByRegex(/^rangeIndex$/i),
    subRangeIndex: findByRegex(/^subRangeIndex$/i),
    gain: findByRegex(/^gain$/i),
    stc: findByRegex(/^stc$/i),
    stcCurve: findByRegex(/stcCurve/i),
    ftc: findByRegex(/^ftc$/i),
    ir: findByRegex(/^ir(Level)?$/i),
    exp: findByRegex(/^exp(Level|Mode)?$/i),
    pw: findByRegex(/^(pw|pulseWidth)$/i),
    process: findByRegex(/process/i),
    subGain: findByRegex(/subGain/i),
    offCenter: findByRegex(/^offCenter/i),
    trailMode: findByRegex(/trailMode/i),
    trailTime: findByRegex(/trailTime/i),
    piLine: findByRegex(/^pi(Line)?$/i),
    brgMode: findByRegex(/brgMode|bearingMode/i),
    ringsVisible: findByRegex(/^(rings|ringsVisible|rangeRings)$/i) ?? findByRegex(/rings/i),
    f1Preset: findByRegex(/^f1/i),
    f2Preset: findByRegex(/^f2/i),
    // ATA keys (both spec.mjs canonical and short aliases)
    ataCpaLimitNm: cpaLimitKey,
    cpaLimitNm: cpaLimitKey,
    ataTcpaLimitMin: tcpaLimitKey,
    tcpaLimitMin: tcpaLimitKey,
    ataVectorTimeMin: vectorTimeKey,
    vectorTimeMin: vectorTimeKey,
    ataAutoArea: autoAreaKey,
    ataPastPos: pastPosKey,
    vectorMode: findByRegex(/vectorMode/i),
    // AIS keys
    aisDisplay: findByRegex(/aisDisplay/i),
    aisFilterRangeNm: findByRegex(/aisFilter/i),
    aisCpaAlarm: findByRegex(/aisCpaAlarm/i),
    // Guard Zone keys (both spec.mjs alarm* and guardZone* aliases)
    alarmMode: alarmModeKey,
    guardZoneMode: alarmModeKey,
    alarmInnerNm: alarmInnerKey,
    guardZoneInnerNm: alarmInnerKey,
    alarmOuterNm: alarmOuterKey,
    guardZoneOuterNm: alarmOuterKey,
    alarmStartBrgDeg: alarmStartKey,
    guardZoneStartBrgDeg: alarmStartKey,
    alarmEndBrgDeg: alarmEndKey,
    guardZoneEndBrgDeg: alarmEndKey,
    alarmLevel: alarmLevelKey,
    guardZoneLevel: alarmLevelKey,
    // Sleep, Brilliance & System keys
    sleepMode: findByRegex(/sleepMode/i),
    sleepInterval: findByRegex(/sleepInterval/i),
    brilliance: findByRegex(/brill|bright/i),
    buzzer: findByRegex(/buzzer/i),
    tuneMode: findByRegex(/tune/i),
    brgAdj: findByRegex(/brgAdj|bearingAdj/i),
    cursorShape: findByRegex(/cursorShape/i),
  };
}

export function setToggleSetting(settings, key, boolVal, opts = {}) {
  assert.ok(
    settings && typeof settings === "object" && typeof key === "string" && key.length > 0 && Object.hasOwn(settings, key),
    `setToggleSetting requires an existing settings key, got "${String(key)}"`,
  );
  const onValue = opts.onValue ?? opts.stringOn ?? "ON";
  const offValue = opts.offValue ?? opts.stringOff ?? "OFF";
  const cur = settings[key];
  const desired = Boolean(boolVal);
  if (typeof cur === "boolean") {
    settings[key] = desired;
  } else if (typeof cur === "number") {
    settings[key] = desired ? 1 : 0;
  } else if (typeof cur === "string") {
    const upper = cur.trim().toUpperCase();
    if (upper === "TRUE" || upper === "FALSE") {
      settings[key] = desired ? "true" : "false";
    } else {
      settings[key] = desired ? onValue : offValue;
    }
  } else {
    settings[key] = desired;
  }
  return true;
}

export function setChoiceSetting(settings, key, value, opts = {}) {
  assert.ok(
    settings && typeof settings === "object" && typeof key === "string" && key.length > 0 && Object.hasOwn(settings, key),
    `setChoiceSetting requires an existing settings key, got "${String(key)}"`,
  );
  const onValue = opts.onValue ?? opts.stringOn ?? "ON";
  const offValue = opts.offValue ?? opts.stringOff ?? "OFF";
  const cur = settings[key];
  if (typeof cur === "string") {
    if (typeof value === "boolean") {
      settings[key] = value ? onValue : offValue;
    } else if (typeof value === "number") {
      if (cur.trim().toUpperCase() === "OFF" && value === 0) {
        settings[key] = offValue;
      } else {
        const unitMatch = cur.match(/^\d+([a-z]+)$/i);
        settings[key] = unitMatch ? `${value}${unitMatch[1]}` : String(value);
      }
    } else {
      settings[key] = String(value);
    }
  } else if (typeof cur === "number") {
    if (typeof value === "number") {
      settings[key] = value;
    } else if (typeof value === "boolean") {
      settings[key] = value ? 1 : 0;
    } else {
      const parsed = Number.parseFloat(String(value));
      settings[key] = Number.isFinite(parsed) ? parsed : 0;
    }
  } else if (typeof cur === "boolean") {
    settings[key] = asBool(value, cur);
  } else {
    settings[key] = value;
  }
  return true;
}

export function setGuardZoneSettings(settings, keyMap, {
  mode,
  innerNm,
  outerNm,
  startBrgDeg,
  endBrgDeg,
  level,
} = {}) {
  assert.ok(settings && typeof settings === "object", "setGuardZoneSettings requires a settings object");
  const km = keyMap ?? discoverSettingsKeys(settings);
  let wroteMode = false;
  let wroteInner = false;
  let wroteOuter = false;
  let wroteStart = false;
  let wroteEnd = false;
  let wroteLevel = false;
  let updated = false;

  const setField = (k, val) => {
    if (val !== undefined && k && Object.hasOwn(settings, k)) {
      setChoiceSetting(settings, k, val);
      updated = true;
      return true;
    }
    return false;
  };

  if (setField(km.alarmMode ?? km.guardZoneMode, mode)) wroteMode = true;
  if (setField(km.alarmInnerNm ?? km.guardZoneInnerNm, innerNm)) wroteInner = true;
  if (setField(km.alarmOuterNm ?? km.guardZoneOuterNm, outerNm)) wroteOuter = true;
  if (setField(km.alarmStartBrgDeg ?? km.guardZoneStartBrgDeg, startBrgDeg)) wroteStart = true;
  if (setField(km.alarmEndBrgDeg ?? km.guardZoneEndBrgDeg, endBrgDeg)) wroteEnd = true;
  if (setField(km.alarmLevel ?? km.guardZoneLevel, level)) wroteLevel = true;

  if (settings.guardZone && typeof settings.guardZone === "object") {
    if (mode !== undefined) {
      settings.guardZone.mode = mode;
      wroteMode = true;
      updated = true;
    }
    if (innerNm !== undefined) {
      settings.guardZone.innerNm = innerNm;
      wroteInner = true;
      updated = true;
    }
    if (outerNm !== undefined) {
      settings.guardZone.outerNm = outerNm;
      wroteOuter = true;
      updated = true;
    }
    if (startBrgDeg !== undefined) {
      settings.guardZone.startBrgDeg = startBrgDeg;
      wroteStart = true;
      updated = true;
    }
    if (endBrgDeg !== undefined) {
      settings.guardZone.endBrgDeg = endBrgDeg;
      wroteEnd = true;
      updated = true;
    }
    if (level !== undefined) {
      settings.guardZone.level = level;
      wroteLevel = true;
      updated = true;
    }
  }

  if (mode !== undefined) {
    assert.equal(wroteMode, true, "setGuardZoneSettings failed to write Guard Zone mode (no alarmMode/guardZoneMode or settings.guardZone)");
  }
  if (innerNm !== undefined) {
    assert.equal(wroteInner, true, "setGuardZoneSettings failed to write Guard Zone innerNm (no alarmInnerNm/guardZoneInnerNm or settings.guardZone)");
  }
  if (outerNm !== undefined) {
    assert.equal(wroteOuter, true, "setGuardZoneSettings failed to write Guard Zone outerNm (no alarmOuterNm/guardZoneOuterNm or settings.guardZone)");
  }
  if (startBrgDeg !== undefined) {
    assert.equal(wroteStart, true, "setGuardZoneSettings failed to write Guard Zone startBrgDeg (no alarmStartBrgDeg/guardZoneStartBrgDeg or settings.guardZone)");
  }
  if (endBrgDeg !== undefined) {
    assert.equal(wroteEnd, true, "setGuardZoneSettings failed to write Guard Zone endBrgDeg (no alarmEndBrgDeg/guardZoneEndBrgDeg or settings.guardZone)");
  }
  if (level !== undefined) {
    assert.equal(wroteLevel, true, "setGuardZoneSettings failed to write Guard Zone level (no alarmLevel/guardZoneLevel or settings.guardZone)");
  }
  assert.ok(updated, "setGuardZoneSettings did not update any Guard Zone field");
  return true;
}

/**
 * Applies a settings patch through the contracted encode -> decode -> restore-settings path
 * while powered OFF, ensuring allowlist and codec validity on every invocation.
 */
export function applySettingsViaCodecRestore(driver, modelMod, patcher) {
  const baseSettings = driver.state().settings ?? modelMod.initialMdc2060State().settings;
  const nextSettings = structuredClone(baseSettings);
  const keyMap = discoverSettingsKeys(nextSettings);
  patcher(nextSettings, keyMap);
  const encoded = modelMod.encodeMdc2060Settings(nextSettings);
  assert.equal(typeof encoded, "string", "encodeMdc2060Settings must return JSON string");
  const decoded = modelMod.decodeMdc2060Settings(encoded);
  assert.ok(decoded && typeof decoded === "object", "decodeMdc2060Settings must decode freshly encoded settings");
  driver.restoreSettings(decoded);
  return {encoded, decoded, keyMap};
}
