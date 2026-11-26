/**
 * KODEN MDC-2060 Marine Radar — Tier 5 White-Box Adversarial Hardening Suite.
 *
 * Permanent fast Node-only regression suite covering:
 * - F1: Bridge adapter forgery & TOCTOU rejection in assessMdc2060Lesson
 * - F2: Symmetric aisDisplay + aisCpaAlarm restoration on aisBoardOption false -> true
 * - F3: Land-cache self-freezing getter TOCTOU prevention in radar-signal.mjs
 * - Defensive engine guards: scenarios.mjs NaN fallback, arpa-ais.mjs Guard Zone OUT
 *   deduplication, and model.mjs OFF-state ent/menu hold suppression
 * - D2-01..D2-04: UTF-8 byte-length parity, lcdLangOverride reset on restore-settings &
 *   DEMO/ALL RESET, Chay-MDC2060.bat %/# URI encoding, and PPI pointer non-finite rect guard
 * - G2-01..G2-03: Full PPI renderer matrix (zero NaN draw args), complete input-controls.mjs
 *   behavioral coverage, app.mjs fake-DOM resilience, and tools/server.mjs attack probes
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createBridgeSession,
  dispatchBridgeInput,
  bridgeSessionHash,
  createBridgeReplay,
  replayBridgeSession,
} from "../src/core/device-runtime.mjs";
import { FCV588_ADAPTER } from "../src/devices/fcv588/adapter.mjs";
import { MDC2060_ADAPTER } from "../src/devices/mdc2060/adapter.mjs";
import {
  MDC2060_RANGES,
  MDC2060_COLOR_PALETTES,
  MDC2060_PRESENTATION_MODES,
  MDC2060_SCREEN_MODES,
} from "../src/devices/mdc2060/spec.mjs";
import {
  MDC2060_COASTAL_SCENARIO,
  MDC2060_STORM_SCENARIO,
  createCustomOwnshipScenario,
} from "../src/devices/mdc2060/scenarios.mjs";
import { evaluatePolarEchoGrid } from "../src/devices/mdc2060/radar-signal.mjs";
import { evaluateGuardZone, projectAisTargets } from "../src/devices/mdc2060/arpa-ais.mjs";
import {
  MDC2060_SETTINGS_STORAGE_KEY,
  encodeMdc2060Settings,
  decodeMdc2060Settings,
  initialMdc2060State,
  reduceMdc2060,
} from "../src/devices/mdc2060/model.mjs";
import { assessMdc2060Lesson } from "../src/devices/mdc2060/lessons.mjs";
import { createMdc2060PpiRenderer } from "../web/mdc2060/ppi-renderer.mjs";
import {
  bindMdc2060RotaryControl,
  bindMdc2060RepeatPadControl,
  bindMdc2060PpiPointer,
  shouldRouteMdc2060Shortcut,
  classifyMdc2060HardwareSound,
  bindMdc2060InstructorTabs,
} from "../web/mdc2060/input-controls.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEV = MDC2060_ADAPTER.id;

function makeClassList(initial = []) {
  const set = new Set(initial);
  return {
    add(...names) { for (const n of names) if (n) set.add(n); },
    remove(...names) { for (const n of names) set.delete(n); },
    toggle(name, force) {
      if (force === undefined) {
        if (set.has(name)) { set.delete(name); return false; }
        set.add(name); return true;
      }
      if (force) set.add(name); else set.delete(name);
      return Boolean(force);
    },
    contains(name) { return set.has(name); },
    toArray() { return [...set]; },
  };
}

function createFakeElement(tagName, { id = "", classes = [], attrs = {}, parent = null } = {}) {
  const listeners = new Map();
  const children = [];
  const attrMap = new Map(Object.entries(attrs));
  if (id) attrMap.set("id", id);
  const el = {
    tagName: tagName.toUpperCase(),
    id,
    type: attrs.type ?? "",
    value: attrs.value ?? "",
    checked: attrs.checked === true || attrs.checked === "checked",
    disabled: false,
    hidden: Object.hasOwn(attrs, "hidden"),
    tabIndex: Number.isInteger(Number(attrs.tabindex)) ? Number(attrs.tabindex) : 0,
    textContent: "",
    dataset: {},
    style: { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } },
    classList: makeClassList(classes),
    parentNode: parent,
    parentElement: parent,
    children,
    files: [],
    focused: false,
    focus() { this.focused = true; },
    setPointerCapture() {},
    releasePointerCapture() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 480, height: 640 }; },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    dispatchEventSync(ev) {
      const event = { target: el, currentTarget: el, preventDefault() {}, stopPropagation() {}, ...ev };
      const set = listeners.get(event.type);
      if (!set) return;
      for (const fn of [...set]) {
        fn(event);
      }
    },
    async dispatchEvent(ev) {
      const event = { target: el, currentTarget: el, preventDefault() {}, stopPropagation() {}, ...ev };
      const set = listeners.get(event.type);
      if (!set) return;
      for (const fn of [...set]) {
        await fn(event);
      }
    },
    click() { return el.dispatchEvent({ type: "click", detail: 1 }); },
    getAttribute(name) {
      if (name === "id") return el.id || null;
      return attrMap.has(name) ? String(attrMap.get(name)) : null;
    },
    setAttribute(name, val) {
      attrMap.set(name, String(val));
      if (name === "id") el.id = String(val);
    },
    removeAttribute(name) {
      attrMap.delete(name);
    },
    appendChild(child) {
      child.parentNode = el;
      child.parentElement = el;
      children.push(child);
      return child;
    },
    append(...nodes) {
      for (const n of nodes) {
        if (n && typeof n === "object") el.appendChild(n);
      }
    },
    replaceChildren(...nodes) {
      children.length = 0;
      for (const n of nodes) {
        if (n && typeof n === "object") el.appendChild(n);
      }
    },
    remove() {
      if (el.parentNode) {
        const idx = el.parentNode.children.indexOf(el);
        if (idx >= 0) el.parentNode.children.splice(idx, 1);
      }
    },
    matches(selector) {
      return selector.split(",").map(s => s.trim()).some(part => {
        if (!part) return false;
        if (part.startsWith("#")) return el.id === part.slice(1);
        if (part.startsWith(".")) return el.classList.contains(part.slice(1));
        if (part === '[role="tab"]') return el.getAttribute("role") === "tab";
        if (part === '[role="tabpanel"]') return el.getAttribute("role") === "tabpanel";
        if (part === "[contenteditable='true']") return el.getAttribute("contenteditable") === "true";
        return el.tagName.toLowerCase() === part.toLowerCase();
      });
    },
    closest(selector) {
      let cur = el;
      while (cur) {
        if (cur.matches(selector)) return cur;
        cur = cur.parentElement;
      }
      return null;
    },
    querySelector(sel) {
      return el.querySelectorAll(sel)[0] ?? null;
    },
    querySelectorAll(sel) {
      const out = [];
      const walk = (node) => {
        for (const c of node.children) {
          if (sel === '.d15-tablist [role="tab"]') {
            if (c.getAttribute("role") === "tab" && c.closest(".d15-tablist")) out.push(c);
          } else if (sel === '.d15-tabpanels > [role="tabpanel"]') {
            if (c.getAttribute("role") === "tabpanel" && c.parentElement?.classList?.contains("d15-tabpanels")) {
              out.push(c);
            }
          } else if (c.matches(sel)) {
            out.push(c);
          }
          walk(c);
        }
      };
      walk(el);
      return out;
    },
    listenerCount(type) {
      return listeners.get(type)?.size ?? 0;
    },
  };
  return el;
}

function createRecordingCanvas2D(tracker) {
  const checkFinite = (fnName, args) => {
    tracker.drawCalls += 1;
    for (let i = 0; i < args.length; i++) {
      const v = args[i];
      if (typeof v === "number" && !Number.isFinite(v)) {
        tracker.invalidCalls.push({ fnName, args: [...args] });
      }
    }
  };
  const ctx = {
    fillStyle: "#000000",
    strokeStyle: "#ffffff",
    lineWidth: 1,
    font: "12px monospace",
    textAlign: "left",
    textBaseline: "alphabetic",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    save() { tracker.drawCalls += 1; },
    restore() { tracker.drawCalls += 1; },
    beginPath() { tracker.drawCalls += 1; },
    closePath() { tracker.drawCalls += 1; },
    clip() { tracker.drawCalls += 1; },
    fill() { tracker.drawCalls += 1; },
    stroke() { tracker.drawCalls += 1; },
    setLineDash(arr) {
      tracker.drawCalls += 1;
      if (Array.isArray(arr)) checkFinite("setLineDash", arr);
    },
    moveTo(x, y) { checkFinite("moveTo", [x, y]); },
    lineTo(x, y) { checkFinite("lineTo", [x, y]); },
    rect(x, y, w, h) { checkFinite("rect", [x, y, w, h]); },
    fillRect(x, y, w, h) { checkFinite("fillRect", [x, y, w, h]); },
    strokeRect(x, y, w, h) { checkFinite("strokeRect", [x, y, w, h]); },
    clearRect(x, y, w, h) { checkFinite("clearRect", [x, y, w, h]); },
    arc(x, y, r, s, e) {
      checkFinite("arc", [x, y, r, s, e]);
      if (typeof r === "number" && r < 0) {
        tracker.invalidCalls.push({ fnName: "arc-negative-radius", args: [x, y, r, s, e] });
      }
    },
    ellipse(x, y, rx, ry, rot, s, e) {
      checkFinite("ellipse", [x, y, rx, ry, rot, s, e]);
      if ((typeof rx === "number" && rx < 0) || (typeof ry === "number" && ry < 0)) {
        tracker.invalidCalls.push({ fnName: "ellipse-negative-radius", args: [x, y, rx, ry] });
      }
    },
    translate(x, y) { checkFinite("translate", [x, y]); },
    scale(x, y) { checkFinite("scale", [x, y]); },
    rotate(a) { checkFinite("rotate", [a]); },
    fillText(t, x, y, maxW) {
      checkFinite("fillText", maxW === undefined ? [x, y] : [x, y, maxW]);
    },
    strokeText(t, x, y, maxW) {
      checkFinite("strokeText", maxW === undefined ? [x, y] : [x, y, maxW]);
    },
    measureText(t) { return { width: String(t ?? "").length * 6 }; },
    drawImage(_img, ...coords) { checkFinite("drawImage", coords); },
    createRadialGradient(x0, y0, r0, x1, y1, r1) {
      checkFinite("createRadialGradient", [x0, y0, r0, x1, y1, r1]);
      return { addColorStop() {} };
    },
    createLinearGradient(x0, y0, x1, y1) {
      checkFinite("createLinearGradient", [x0, y0, x1, y1]);
      return { addColorStop() {} };
    },
  };
  return {
    width: 480,
    height: 640,
    getContext(kind) { return kind === "2d" ? ctx : null; },
  };
}

// ============================================================================
// F1 — Forged Bridge Adapters & TOCTOU Rejection in assessMdc2060Lesson
// ============================================================================

test("F1: assessMdc2060Lesson rejects forged MDC2060/FCV588 adapters and TOCTOU getters, while allowing legitimate 3rd-party adapters", () => {
  // 1. Forged MDC2060_ADAPTER clone bypassing 120s preheat must fail closed
  const forgedMdc = Object.freeze({
    ...MDC2060_ADAPTER,
    reduce(state, ev) {
      if (ev.kind === "press" && ev.control === "power" && state.powerMode === "off") {
        return { ...state, powerMode: "standby", preheatRemainingSec: 0 };
      }
      return MDC2060_ADAPTER.reduce(state, ev);
    },
  });
  let bForged = createBridgeSession([forgedMdc], MDC2060_COASTAL_SCENARIO);
  bForged = dispatchBridgeInput(bForged, [forgedMdc], DEV, { kind: "down", control: "power" }, MDC2060_COASTAL_SCENARIO);
  bForged = dispatchBridgeInput(bForged, [forgedMdc], DEV, { kind: "up", control: "power", durationMs: 100 }, MDC2060_COASTAL_SCENARIO);
  bForged = dispatchBridgeInput(bForged, [forgedMdc], DEV, { kind: "press", control: "stby_tx" }, MDC2060_COASTAL_SCENARIO);

  const resForgedMdc = assessMdc2060Lesson(bForged, "MDC2060-LEARN-01", {
    adapters: [forgedMdc],
    scenario: MDC2060_COASTAL_SCENARIO,
  });
  assert.equal(resForgedMdc.passed, false);
  assert.equal(resForgedMdc.replayVerified, false);
  assert.equal(resForgedMdc.score, 0);
  assert.ok(resForgedMdc.reasons.includes("REPLAY_STATE_MISMATCH"));

  // 2. Forged FCV588_ADAPTER clone alongside canonical MDC2060_ADAPTER must fail closed
  const forgedFcv = Object.freeze({
    ...FCV588_ADAPTER,
    reduce(state, ev) {
      return FCV588_ADAPTER.reduce(state, ev);
    },
  });
  let bForgedFcv = createBridgeSession([forgedFcv, MDC2060_ADAPTER], MDC2060_COASTAL_SCENARIO);
  bForgedFcv = dispatchBridgeInput(bForgedFcv, [forgedFcv, MDC2060_ADAPTER], DEV, { kind: "down", control: "power" }, MDC2060_COASTAL_SCENARIO);
  bForgedFcv = dispatchBridgeInput(bForgedFcv, [forgedFcv, MDC2060_ADAPTER], DEV, { kind: "up", control: "power", durationMs: 100 }, MDC2060_COASTAL_SCENARIO);
  for (let i = 0; i < 6; i++) {
    bForgedFcv = dispatchBridgeInput(bForgedFcv, [forgedFcv, MDC2060_ADAPTER], "bridge", { kind: "tick", steps: 20 }, MDC2060_COASTAL_SCENARIO);
  }
  bForgedFcv = dispatchBridgeInput(bForgedFcv, [forgedFcv, MDC2060_ADAPTER], DEV, { kind: "press", control: "stby_tx" }, MDC2060_COASTAL_SCENARIO);

  const resForgedFcv = assessMdc2060Lesson(bForgedFcv, "MDC2060-LEARN-01", {
    adapters: [forgedFcv, MDC2060_ADAPTER],
    scenario: MDC2060_COASTAL_SCENARIO,
  });
  assert.equal(resForgedFcv.passed, false);
  assert.equal(resForgedFcv.replayVerified, false);
  assert.ok(resForgedFcv.reasons.includes("REPLAY_STATE_MISMATCH"));

  // 3. Array slot getter TOCTOU attempting to swap canonical adapter after validation
  let slotReads = 0;
  const evilAdapters = [];
  Object.defineProperty(evilAdapters, 0, {
    enumerable: true,
    configurable: true,
    get() {
      slotReads += 1;
      return slotReads <= 2 ? MDC2060_ADAPTER : forgedMdc;
    },
  });
  evilAdapters.length = 1;
  const resToctou = assessMdc2060Lesson(bForged, "MDC2060-LEARN-01", {
    adapters: evilAdapters,
    scenario: MDC2060_COASTAL_SCENARIO,
  });
  assert.equal(resToctou.passed, false);
  assert.equal(resToctou.replayVerified, false);
  assert.ok(resToctou.reasons.includes("REPLAY_STATE_MISMATCH"));

  // 3b. Stateful accessor .id getter on adapter trying to impersonate FCV588_ADAPTER fails closed
  let idReads = 0;
  const getterFcv = {
    ...FCV588_ADAPTER,
    get id() {
      idReads += 1;
      return idReads === 1 ? "custom.harmless" : FCV588_ADAPTER.id;
    },
  };
  const resGetterId = assessMdc2060Lesson(bForgedFcv, "MDC2060-LEARN-01", {
    adapters: [getterFcv, MDC2060_ADAPTER],
    scenario: MDC2060_COASTAL_SCENARIO,
  });
  assert.equal(resGetterId.passed, false);
  assert.equal(resGetterId.replayVerified, false);
  assert.ok(resGetterId.reasons.includes("REPLAY_STATE_MISMATCH"));

  // 3c. Unfrozen Proxy adapter switching .id on read #8 inside dispatchBridgeInput fails closed (R2-01)
  let proxyIdReads = 0;
  let proxyOffset = 10; // createBridgeSession performs 10 reads of adapter.id before dispatchBridgeInput
  const proxyTarget = {
    ...MDC2060_ADAPTER,
    id: "custom.harmless",
    reduce(state, ev) {
      if (ev.kind === "press" && ev.control === "power" && state.powerMode === "off") {
        return { ...state, powerMode: "standby", preheatRemainingSec: 0 };
      }
      return MDC2060_ADAPTER.reduce(state, ev);
    },
  };
  const proxyEvil = new Proxy(proxyTarget, {
    get(target, prop, receiver) {
      if (prop === "id") {
        proxyIdReads += 1;
        // Return MDC2060_ADAPTER.id on read #8 of each dispatchBridgeInput (adapters.find)
        if (proxyIdReads > proxyOffset && (proxyIdReads - proxyOffset) % 8 === 0) {
          return MDC2060_ADAPTER.id;
        }
        return "custom.harmless";
      }
      return Reflect.get(target, prop, receiver);
    },
  });
  let bProxy = createBridgeSession([proxyEvil, MDC2060_ADAPTER], MDC2060_COASTAL_SCENARIO);
  bProxy = dispatchBridgeInput(bProxy, [proxyEvil, MDC2060_ADAPTER], DEV, { kind: "down", control: "power" }, MDC2060_COASTAL_SCENARIO);
  bProxy = dispatchBridgeInput(bProxy, [proxyEvil, MDC2060_ADAPTER], DEV, { kind: "up", control: "power", durationMs: 100 }, MDC2060_COASTAL_SCENARIO);
  bProxy = dispatchBridgeInput(bProxy, [proxyEvil, MDC2060_ADAPTER], DEV, { kind: "press", control: "stby_tx" }, MDC2060_COASTAL_SCENARIO);
  // Confirm the forged bridge really bypassed 120s preheat in raw dispatchBridgeInput
  assert.equal(bProxy.devices[DEV].deviceState.powerMode, "transmit");
  assert.equal(bProxy.devices[DEV].deviceState.preheatRemainingSec, 0);

  // Reset proxy counter to match pre-fix lessons.mjs (1 initial read + 10 createBridgeSession reads = 11)
  proxyIdReads = 0;
  proxyOffset = 11;
  const resProxyEvil = assessMdc2060Lesson(bProxy, "MDC2060-LEARN-01", {
    adapters: [proxyEvil, MDC2060_ADAPTER],
    scenario: MDC2060_COASTAL_SCENARIO,
  });
  assert.equal(resProxyEvil.passed, false);
  assert.equal(resProxyEvil.replayVerified, false);
  assert.equal(resProxyEvil.score, 0);
  assert.ok(resProxyEvil.reasons.includes("REPLAY_STATE_MISMATCH"));
  // Verify lessons.mjs snapshotted proxyEvil.id once and never re-invoked its Proxy .id trap
  assert.equal(proxyIdReads, 1);

  // 4. Legitimate custom 3rd-party adapters (both frozen and unfrozen) alongside canonical MDC2060_ADAPTER pass cleanly
  const CUSTOM_3P_ADAPTER = Object.freeze({
    id: "custom.bridge.gps-monitor-v1",
    revision: "CUSTOM-1",
    profile: Object.freeze({ id: "custom.bridge.gps-monitor-v1", model: "GPS-MON" }),
    controls: Object.freeze(["ping"]),
    gestures: Object.freeze({ ping: Object.freeze(["press"]) }),
    holdThresholdMs: Object.freeze({}),
    initial: () => ({ ticks: 0, pings: 0 }),
    reduce: (st, ev) => {
      if (ev.kind === "tick") return { ...st, ticks: st.ticks + (ev.steps ?? 1) };
      if (ev.kind === "press" && ev.control === "ping") return { ...st, pings: st.pings + 1 };
      return st;
    },
    probe: st => ({ ...st }),
  });
  const UNFROZEN_3P_ADAPTER = {
    id: "custom.bridge.unfrozen-monitor-v1",
    revision: "CUSTOM-2",
    profile: { id: "custom.bridge.unfrozen-monitor-v1", model: "UNF-MON" },
    controls: ["ping"],
    gestures: { ping: ["press"] },
    holdThresholdMs: {},
    initial() { return { ticks: 0 }; },
    reduce(st, ev) {
      return ev.kind === "tick" ? { ...st, ticks: st.ticks + (ev.steps ?? 1) } : st;
    },
  };
  for (const legitAdapters of [
    [MDC2060_ADAPTER, CUSTOM_3P_ADAPTER],
    [UNFROZEN_3P_ADAPTER, MDC2060_ADAPTER],
  ]) {
    let bLegit = createBridgeSession(legitAdapters, MDC2060_COASTAL_SCENARIO);
    bLegit = dispatchBridgeInput(bLegit, legitAdapters, DEV, { kind: "down", control: "power" }, MDC2060_COASTAL_SCENARIO);
    bLegit = dispatchBridgeInput(bLegit, legitAdapters, DEV, { kind: "up", control: "power", durationMs: 100 }, MDC2060_COASTAL_SCENARIO);
    for (let i = 0; i < 6; i++) {
      bLegit = dispatchBridgeInput(bLegit, legitAdapters, "bridge", { kind: "tick", steps: 20 }, MDC2060_COASTAL_SCENARIO);
    }
    bLegit = dispatchBridgeInput(bLegit, legitAdapters, DEV, { kind: "press", control: "stby_tx" }, MDC2060_COASTAL_SCENARIO);

    const resLegit = assessMdc2060Lesson(bLegit, "MDC2060-LEARN-01", {
      adapters: legitAdapters,
      scenario: MDC2060_COASTAL_SCENARIO,
    });
    assert.equal(resLegit.passed, true);
    assert.equal(resLegit.replayVerified, true);
    assert.equal(resLegit.score, 1);
    assert.deepEqual(resLegit.reasons, []);
  }
});

// ============================================================================
// F2 — Symmetric aisBoardOption false -> true Restoration
// ============================================================================

test("F2: aisBoardOption true -> false -> true symmetrically restores aisDisplay, aisCpaAlarm, and AIS_CPA_DANGER while true -> true preserves operator OFF", () => {
  const A = [MDC2060_ADAPTER];
  const s = MDC2060_COASTAL_SCENARIO;
  let b = createBridgeSession(A, s);
  b = dispatchBridgeInput(b, A, DEV, { kind: "training-fixture", fixture: "skipPreheat", enabled: true }, s);
  b = dispatchBridgeInput(b, A, DEV, { kind: "down", control: "power" }, s);
  b = dispatchBridgeInput(b, A, DEV, { kind: "up", control: "power", durationMs: 100 }, s);
  b = dispatchBridgeInput(b, A, DEV, { kind: "press", control: "stby_tx" }, s);

  const before = b.devices[DEV].deviceState;
  assert.equal(before.settings.aisDisplay, "ON");
  assert.equal(before.settings.aisCpaAlarm, "ON");
  assert.equal(before.ais.alarmActive, true);
  assert.ok(before.alarms.activeIds.includes("AIS_CPA_DANGER"));

  // Remove AIS option board -> both stripped to OFF
  b = dispatchBridgeInput(b, A, DEV, { kind: "training-fixture", fixture: "aisBoardOption", enabled: false }, s);
  const removed = b.devices[DEV].deviceState;
  assert.equal(removed.settings.aisDisplay, "OFF");
  assert.equal(removed.settings.aisCpaAlarm, "OFF");
  assert.equal(removed.ais.alarmActive, false);
  assert.equal(removed.alarms.activeIds.includes("AIS_CPA_DANGER"), false);

  // Restore AIS option board -> BOTH aisDisplay and aisCpaAlarm symmetrically restored to ON
  b = dispatchBridgeInput(b, A, DEV, { kind: "training-fixture", fixture: "aisBoardOption", enabled: true }, s);
  const restored = b.devices[DEV].deviceState;
  assert.equal(restored.settings.aisDisplay, "ON");
  assert.equal(restored.settings.aisCpaAlarm, "ON");
  assert.equal(restored.ais.alarmActive, true);
  assert.ok(restored.alarms.activeIds.includes("AIS_CPA_DANGER"));
  assert.equal(restored.notice, "");

  // Idempotent true -> true must still respect operator manually turning aisDisplay OFF via menu
  // Main menu: group 5 (AIS), item 0 (DISPLAY) -> toggle to OFF
  b = dispatchBridgeInput(b, A, DEV, { kind: "down", control: "menu" }, s);
  b = dispatchBridgeInput(b, A, DEV, { kind: "up", control: "menu", durationMs: 120 }, s);
  for (let i = 0; i < 5; i++) {
    b = dispatchBridgeInput(b, A, DEV, { kind: "pad", control: "cursorpad", direction: "right" }, s);
  }
  b = dispatchBridgeInput(b, A, DEV, { kind: "down", control: "ent" }, s);
  b = dispatchBridgeInput(b, A, DEV, { kind: "up", control: "ent", durationMs: 120 }, s);
  b = dispatchBridgeInput(b, A, DEV, { kind: "pad", control: "cursorpad", direction: "right" }, s);
  b = dispatchBridgeInput(b, A, DEV, { kind: "down", control: "ent" }, s);
  b = dispatchBridgeInput(b, A, DEV, { kind: "up", control: "ent", durationMs: 120 }, s);
  b = dispatchBridgeInput(b, A, DEV, { kind: "down", control: "menu" }, s);
  b = dispatchBridgeInput(b, A, DEV, { kind: "up", control: "menu", durationMs: 120 }, s);
  assert.equal(b.devices[DEV].deviceState.settings.aisDisplay, "OFF");

  b = dispatchBridgeInput(b, A, DEV, { kind: "training-fixture", fixture: "aisBoardOption", enabled: true }, s);
  assert.equal(b.devices[DEV].deviceState.settings.aisDisplay, "OFF");

  // ataBoardOption true -> false -> true preserves ataAutoArea === "OFF"
  b = dispatchBridgeInput(b, A, DEV, { kind: "training-fixture", fixture: "ataBoardOption", enabled: false }, s);
  assert.equal(b.devices[DEV].deviceState.settings.ataAutoArea, "OFF");
  b = dispatchBridgeInput(b, A, DEV, { kind: "training-fixture", fixture: "ataBoardOption", enabled: true }, s);
  assert.equal(b.devices[DEV].deviceState.settings.ataAutoArea, "OFF");
});

// ============================================================================
// F3 — Land-Cache Self-Freezing Getter TOCTOU Prevention
// ============================================================================

test("F3: evaluatePolarEchoGrid resists self-freezing getter TOCTOU and matches fresh polyB bit-for-bit", () => {
  const polyA = Object.freeze([
    Object.freeze({ lat: 10.35, lon: 107.01 }),
    Object.freeze({ lat: 10.35, lon: 107.04 }),
    Object.freeze({ lat: 10.37, lon: 107.025 }),
  ]);
  const polyB = Object.freeze([
    Object.freeze({ lat: 10.27, lon: 107.01 }),
    Object.freeze({ lat: 10.27, lon: 107.04 }),
    Object.freeze({ lat: 10.25, lon: 107.025 }),
  ]);
  const item = {};
  const lm = [item];
  Object.defineProperty(item, "polygon", {
    configurable: true,
    enumerable: true,
    get() {
      Object.defineProperty(item, "polygon", {
        value: polyB,
        writable: false,
        configurable: false,
        enumerable: true,
      });
      Object.freeze(item);
      Object.freeze(lm);
      return polyA;
    },
  });
  const ownship = { lat: 10.32, lon: 107.02 };
  evaluatePolarEchoGrid({ ownship, landmasses: lm, rangeNm: 6, gain: 55, simTick: 0 });
  const r2 = evaluatePolarEchoGrid({ ownship, landmasses: lm, rangeNm: 6, gain: 55, simTick: 0 });
  const refB = evaluatePolarEchoGrid({ ownship, landmasses: [{ polygon: polyB }], rangeNm: 6, gain: 55, simTick: 0 });

  let differingBins = 0;
  for (let i = 0; i < r2.grid.length; i++) {
    if (r2.grid[i] !== refB.grid[i]) differingBins += 1;
  }
  assert.equal(differingBins, 0);
  assert.equal(r2.stats.landBins, refB.stats.landBins);
  assert.equal(r2.stats.shadowedBins, refB.stats.shadowedBins);
});

// ============================================================================
// 3 Defensive Engine Guards
// ============================================================================

test("Defensive engine guards: scenarios NaN fallback, Guard Zone OUT deduplication, and OFF-state ent/menu hold suppression", () => {
  // 1. scenarios.mjs createCustomOwnshipScenario NaN fallback on malformed baseScenario.ownship
  const malformedBase = {
    ...MDC2060_COASTAL_SCENARIO,
    id: "custom-malformed-ownship",
    ownship: {
      mmsi: "574001588",
      name: "BROKEN",
      callSign: "BRK1",
      lat: Number.NaN,
      lon: Number.POSITIVE_INFINITY,
      sogKn: Number.NaN,
      stwKn: Number.NaN,
      cogDeg: Number.NaN,
      hdgDeg: Number.NaN,
      rotDegPerMin: Number.NaN,
      rudderDeg: Number.NaN,
      waterTempC: Number.NaN,
      draftM: Number.NaN,
    },
  };
  const derived = createCustomOwnshipScenario(malformedBase, {});
  for (const field of ["lat", "lon", "sogKn", "stwKn", "cogDeg", "hdgDeg", "rotDegPerMin", "rudderDeg", "waterTempC", "draftM"]) {
    assert.ok(Number.isFinite(derived.ownship[field]), `derived.ownship.${field} must be finite`);
  }
  assert.ok(Object.isFrozen(derived.ownship));

  // Also test missing base.ownship with malformed syntheticOwnship NaN fields
  const malformedSynthBase = {
    ...MDC2060_COASTAL_SCENARIO,
    id: "custom-malformed-synth",
    ownship: undefined,
    syntheticOwnship: {
      lat: Number.NaN,
      lon: Number.NEGATIVE_INFINITY,
      speedKn: Number.NaN,
      courseDeg: Number.NaN,
      temperatureC: Number.NaN,
    },
  };
  const derivedSynth = createCustomOwnshipScenario(malformedSynthBase, {});
  for (const field of ["lat", "lon", "sogKn", "stwKn", "cogDeg", "hdgDeg", "waterTempC"]) {
    assert.ok(Number.isFinite(derivedSynth.ownship[field]), `derivedSynth.ownship.${field} must be finite`);
  }

  // 2. arpa-ais.mjs evaluateGuardZone OUT mode sanitizes corrupted capturedContactIds
  const gzOut = evaluateGuardZone(
    {
      mode: "OUT",
      innerNm: 1,
      outerNm: 4,
      startBrgDeg: 330,
      endBrgDeg: 30,
      capturedContactIds: ["tgt-B", "tgt-A", "tgt-A", 123, null, "", undefined],
      triggeredContactIds: ["", null],
      insideContactIds: [],
    },
    { ownship: { hdgDeg: 0 }, radarContacts: [] },
    { alarmMode: "OUT", alarmInnerNm: 1, alarmOuterNm: 4, alarmStartBrgDeg: 330, alarmEndBrgDeg: 30 },
  );
  assert.deepEqual(gzOut.capturedContactIds, ["tgt-A", "tgt-B"]);
  assert.deepEqual(gzOut.triggeredContactIds, ["tgt-A", "tgt-B"]);
  assert.equal(gzOut.alarmActive, true);

  // 3. model.mjs OFF-state ent/menu down + power ON + up must NOT fire spurious press
  const A = [MDC2060_ADAPTER];
  const s = MDC2060_COASTAL_SCENARIO;
  let b = createBridgeSession(A, s);
  b = dispatchBridgeInput(b, A, DEV, { kind: "training-fixture", fixture: "skipPreheat", enabled: true }, s);
  b = dispatchBridgeInput(b, A, DEV, { kind: "down", control: "ent" }, s);
  b = dispatchBridgeInput(b, A, DEV, { kind: "down", control: "menu" }, s);
  assert.equal(b.devices[DEV].deviceState.entHeld, false);
  assert.equal(b.devices[DEV].deviceState.hlSuppressed, false);
  assert.equal(b.devices[DEV].deviceState.menuHeld, false);

  b = dispatchBridgeInput(b, A, DEV, { kind: "down", control: "power" }, s);
  b = dispatchBridgeInput(b, A, DEV, { kind: "up", control: "power", durationMs: 120 }, s);
  b = dispatchBridgeInput(b, A, DEV, { kind: "press", control: "stby_tx" }, s);
  assert.equal(b.devices[DEV].deviceState.powerMode, "transmit");

  // Releasing ent and menu held since OFF must swallow synthesized press completely
  b = dispatchBridgeInput(b, A, DEV, { kind: "up", control: "ent", durationMs: 150 }, s);
  assert.equal(b.devices[DEV].deviceState.measureAnchor, null);
  assert.equal(b.devices[DEV].deviceState.overlay, null);
  b = dispatchBridgeInput(b, A, DEV, { kind: "up", control: "menu", durationMs: 150 }, s);
  assert.equal(b.devices[DEV].deviceState.overlay, null);

  // Subsequent normal ent & menu holds must work identically
  b = dispatchBridgeInput(b, A, DEV, { kind: "down", control: "ent" }, s);
  b = dispatchBridgeInput(b, A, DEV, { kind: "up", control: "ent", durationMs: 150 }, s);
  assert.notEqual(b.devices[DEV].deviceState.measureAnchor, null);

  b = dispatchBridgeInput(b, A, DEV, { kind: "down", control: "menu" }, s);
  b = dispatchBridgeInput(b, A, DEV, { kind: "up", control: "menu", durationMs: 150 }, s);
  assert.equal(b.devices[DEV].deviceState.overlay?.kind, "menu");

  // Holding ent while ON -> powering OFF via long power -> powering ON -> releasing ent swallows spurious press
  let bCross = createBridgeSession(A, s);
  bCross = dispatchBridgeInput(bCross, A, DEV, { kind: "training-fixture", fixture: "skipPreheat", enabled: true }, s);
  bCross = dispatchBridgeInput(bCross, A, DEV, { kind: "down", control: "power" }, s);
  bCross = dispatchBridgeInput(bCross, A, DEV, { kind: "up", control: "power", durationMs: 120 }, s);
  bCross = dispatchBridgeInput(bCross, A, DEV, { kind: "press", control: "stby_tx" }, s);
  bCross = dispatchBridgeInput(bCross, A, DEV, { kind: "down", control: "ent" }, s);
  bCross = dispatchBridgeInput(bCross, A, DEV, { kind: "down", control: "power" }, s);
  bCross = dispatchBridgeInput(bCross, A, DEV, { kind: "up", control: "power", durationMs: 3200 }, s);
  assert.equal(bCross.devices[DEV].deviceState.powerMode, "off");
  bCross = dispatchBridgeInput(bCross, A, DEV, { kind: "down", control: "power" }, s);
  bCross = dispatchBridgeInput(bCross, A, DEV, { kind: "up", control: "power", durationMs: 120 }, s);
  bCross = dispatchBridgeInput(bCross, A, DEV, { kind: "press", control: "stby_tx" }, s);
  bCross = dispatchBridgeInput(bCross, A, DEV, { kind: "up", control: "ent", durationMs: 150 }, s);
  assert.equal(bCross.devices[DEV].deviceState.measureAnchor, null);
  assert.equal(bCross.devices[DEV].deviceState.hlSuppressed, false);

  // R2-02: ent/menu down initiated during power-hold -> power OFF -> power ON -> stby_tx -> up must NOT fire spurious press
  let bPowerHold = createBridgeSession(A, s);
  bPowerHold = dispatchBridgeInput(bPowerHold, A, DEV, { kind: "training-fixture", fixture: "skipPreheat", enabled: true }, s);
  bPowerHold = dispatchBridgeInput(bPowerHold, A, DEV, { kind: "down", control: "power" }, s);
  bPowerHold = dispatchBridgeInput(bPowerHold, A, DEV, { kind: "up", control: "power", durationMs: 120 }, s);
  bPowerHold = dispatchBridgeInput(bPowerHold, A, DEV, { kind: "press", control: "stby_tx" }, s);
  bPowerHold = dispatchBridgeInput(bPowerHold, A, DEV, { kind: "down", control: "power" }, s);
  assert.equal(bPowerHold.devices[DEV].deviceState.overlay?.kind, "power-hold");
  bPowerHold = dispatchBridgeInput(bPowerHold, A, DEV, { kind: "down", control: "ent" }, s);
  bPowerHold = dispatchBridgeInput(bPowerHold, A, DEV, { kind: "down", control: "menu" }, s);
  bPowerHold = dispatchBridgeInput(bPowerHold, A, DEV, { kind: "up", control: "power", durationMs: 3200 }, s);
  assert.equal(bPowerHold.devices[DEV].deviceState.powerMode, "off");
  bPowerHold = dispatchBridgeInput(bPowerHold, A, DEV, { kind: "down", control: "power" }, s);
  bPowerHold = dispatchBridgeInput(bPowerHold, A, DEV, { kind: "up", control: "power", durationMs: 120 }, s);
  bPowerHold = dispatchBridgeInput(bPowerHold, A, DEV, { kind: "press", control: "stby_tx" }, s);
  assert.equal(bPowerHold.devices[DEV].deviceState.powerMode, "transmit");
  bPowerHold = dispatchBridgeInput(bPowerHold, A, DEV, { kind: "up", control: "ent", durationMs: 120 }, s);
  assert.equal(bPowerHold.devices[DEV].deviceState.measureAnchor, null);
  assert.equal(bPowerHold.devices[DEV].deviceState.hlSuppressed, false);
  bPowerHold = dispatchBridgeInput(bPowerHold, A, DEV, { kind: "up", control: "menu", durationMs: 120 }, s);
  assert.equal(bPowerHold.devices[DEV].deviceState.overlay, null);
  // Also verify power-hold cancel path: down power -> down ent -> cancel power -> up ent 120ms
  bPowerHold = dispatchBridgeInput(bPowerHold, A, DEV, { kind: "down", control: "power" }, s);
  bPowerHold = dispatchBridgeInput(bPowerHold, A, DEV, { kind: "down", control: "ent" }, s);
  bPowerHold = dispatchBridgeInput(bPowerHold, A, DEV, { kind: "cancel", control: "power" }, s);
  bPowerHold = dispatchBridgeInput(bPowerHold, A, DEV, { kind: "up", control: "ent", durationMs: 120 }, s);
  assert.equal(bPowerHold.devices[DEV].deviceState.measureAnchor, null);
  assert.equal(bPowerHold.devices[DEV].deviceState.overlay, null);
  const replayedPowerHold = replayBridgeSession(A, s, createBridgeReplay(bPowerHold));
  assert.equal(bridgeSessionHash(replayedPowerHold), bridgeSessionHash(bPowerHold));

  // Direct reducer press (without prior down) remains compatible
  const direct = reduceMdc2060(
    { ...initialMdc2060State(), powerMode: "transmit" },
    { kind: "press", control: "menu", hold: "short" },
  );
  assert.equal(direct.overlay?.kind, "menu");
});

// ============================================================================
// D2-01 (codec) & D2-03 (Chay-MDC2060.bat) & D2-04 (input-controls.mjs)
// ============================================================================

test("D2-01 (codec) & D2-03 (Chay-MDC2060.bat %/# URI encoding): UTF-8 byte cap and safe Windows FILE_URI", async () => {
  // 5,000 Vietnamese 'ệ' chars -> UTF-16 length 5008 <= 12000, UTF-8 byte length 15008 > 12000
  const utf8Over12k = `{"a":"${"ệ".repeat(5000)}"}`;
  assert.ok(utf8Over12k.length < 12000);
  assert.ok(new TextEncoder().encode(utf8Over12k).byteLength > 12000);
  assert.equal(decodeMdc2060Settings(utf8Over12k), null);

  // Valid ASCII settings still round-trip cleanly
  const encoded = encodeMdc2060Settings({ language: "vi", colorPalette: "NIGHT" });
  const decoded = decodeMdc2060Settings(encoded);
  assert.equal(decoded?.language, "vi");
  assert.equal(decoded?.colorPalette, "NIGHT");

  // D2-03: Verify Chay-MDC2060.bat percent-encodes % then # then space inside EnableDelayedExpansion
  const bat = await readFile(path.join(ROOT, "Chay-MDC2060.bat"), "utf8");
  const idxPct = bat.indexOf('set "FILE_URI=!FILE_URI:%%=%%25!"');
  const idxHash = bat.indexOf('set "FILE_URI=!FILE_URI:#=%%23!"');
  const idxSpace = bat.indexOf('set "FILE_URI=!FILE_URI: =%%20!"');
  assert.ok(idxPct > 0, "Chay-MDC2060.bat must encode % to %25");
  assert.ok(idxHash > idxPct, "Chay-MDC2060.bat must encode # to %23 after %");
  assert.ok(idxSpace > idxHash, "Chay-MDC2060.bat must encode space to %20 after #");

  // Simulate cmd.exe delayed-expansion replacements on tricky legal Windows paths
  const sampleWinPath = "C:\\Radar #1\\100%Offline Docs\\dist\\MDC-2060-Standalone.html";
  const simulatedUri = `file:///${sampleWinPath.replace(/\\/g, "/")}`
    .replaceAll("%", "%25")
    .replaceAll("#", "%23")
    .replaceAll(" ", "%20");
  const parsed = new URL(simulatedUri);
  assert.equal(parsed.hash, "");
  assert.equal(decodeURIComponent(parsed.pathname), "/C:/Radar #1/100%Offline Docs/dist/MDC-2060-Standalone.html");
});

// ============================================================================
// G2-01 — Full createMdc2060PpiRenderer Stress & Zero-NaN Matrix
// ============================================================================

test("G2-01: createMdc2060PpiRenderer renders all palettes, screen/presentation/motion modes, 18 ranges, 8 overlays, 50 ATA + 100 AIS, faults & null bus with 0 NaN draw args", () => {
  const tracker = { drawCalls: 0, invalidCalls: [] };
  const prevDocument = globalThis.document;
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, "canvas");
      return createRecordingCanvas2D(tracker);
    },
  };

  try {
    const mainCanvas = createRecordingCanvas2D(tracker);
    const renderer = createMdc2060PpiRenderer(mainCanvas);

    const A = [MDC2060_ADAPTER];
    let b = createBridgeSession(A, MDC2060_COASTAL_SCENARIO);
    b = dispatchBridgeInput(b, A, DEV, { kind: "training-fixture", fixture: "skipPreheat", enabled: true }, MDC2060_COASTAL_SCENARIO);
    b = dispatchBridgeInput(b, A, DEV, { kind: "down", control: "power" }, MDC2060_COASTAL_SCENARIO);
    b = dispatchBridgeInput(b, A, DEV, { kind: "up", control: "power", durationMs: 120 }, MDC2060_COASTAL_SCENARIO);
    b = dispatchBridgeInput(b, A, DEV, { kind: "press", control: "stby_tx" }, MDC2060_COASTAL_SCENARIO);
    b = dispatchBridgeInput(b, A, "bridge", { kind: "tick", steps: 4 }, MDC2060_COASTAL_SCENARIO);
    const baseState = b.devices[DEV].deviceState;
    const baseBus = b.sensorBus;

    // Synthesize 50 ATA targets and 100 AIS targets (including dangerous CPA targets)
    const ata50 = Array.from({ length: 50 }, (_, idx) => ({
      targetId: `T${String(idx + 1).padStart(2, "0")}`,
      contactId: `tgt-synth-${idx}`,
      acquisitionType: idx % 2 === 0 ? "M" : "A",
      status: idx < 40 ? "tracking" : (idx < 45 ? "acquiring" : "lost"),
      rangeNm: 0.4 + (idx * 0.11),
      bearingDeg: (idx * 7.2) % 360,
      cogDeg: (idx * 13) % 360,
      sogKn: 8 + (idx % 12),
      cpaNm: idx % 7 === 0 ? 0.2 : 1.8,
      tcpaMin: idx % 7 === 0 ? 6.5 : 22,
      dangerous: idx % 7 === 0,
      pastPositions: [
        { lat: 10.32 + idx * 0.001, lon: 107.02 + idx * 0.001, rangeNm: 0.5 + idx * 0.1, bearingDeg: (idx * 7) % 360 },
        { lat: 10.321 + idx * 0.001, lon: 107.021 + idx * 0.001, rangeNm: 0.6 + idx * 0.1, bearingDeg: (idx * 7 + 1) % 360 },
      ],
    }));
    const ais100 = Array.from({ length: 100 }, (_, idx) => ({
      mmsi: String(574010000 + idx),
      name: `VESSEL ${idx + 1}`,
      callSign: `3WV${idx}`,
      shipType: "Cargo",
      navStatus: idx % 10 === 0 ? "At anchor" : "Under way using engine",
      rangeNm: 0.3 + idx * 0.055,
      bearingDeg: (idx * 3.6) % 360,
      hdgDeg: (idx * 11) % 360,
      cogDeg: (idx * 11) % 360,
      sogKn: idx % 10 === 0 ? 0 : 12,
      rotDegPerMin: idx % 3 === 0 ? 8 : (idx % 3 === 1 ? -8 : 0),
      cpaNm: idx % 9 === 0 ? 0.15 : 2.1,
      tcpaMin: idx % 9 === 0 ? 5.0 : 25,
      bcrNm: idx % 2 === 0 ? 0.45 : null,
      bctMin: idx % 2 === 0 ? 8.2 : null,
      lengthM: 120,
      beamM: 20,
      status: idx % 9 === 0 ? "dangerous" : (idx % 2 === 0 ? "active" : "sleeping"),
      dangerous: idx % 9 === 0,
    }));
    const aisProjection100 = {
      enabled: true,
      targets: ais100,
      dangerousMmsis: ais100.filter(t => t.dangerous).map(t => t.mmsi),
      selectedTarget: ais100[0],
      alarmActive: true,
    };

    const richTxState = {
      ...baseState,
      hlSuppressed: false,
      settings: {
        ...baseState.settings,
        ebl1: "ON",
        ebl2: "ON",
        ebl1Float: "ON",
        vrm1: "ON",
        vrm2: "ON",
        piLine: "2",
        offCenter: "ON",
        alarmMode: "IN",
        alarmStartBrgDeg: 350,
        alarmEndBrgDeg: 10,
        ataAutoArea: "ON",
        ataPastPos: "ON",
        aisDisplay: "ON",
      },
      offCenterOffset: { xFrac: 0.25, yFrac: -0.2 },
      ebl1Origin: { xFrac: 0.15, yFrac: -0.1 },
      measureAnchor: { xFrac: 0.1, yFrac: -0.1, rangeNm: 1.2, bearingDeg: 45, lat: 10.33, lon: 107.03 },
      measureResult: { toXFrac: 0.35, toYFrac: 0.15, rangeNm: 1.85, bearingDeg: 112.4 },
      guardZone: {
        ...baseState.guardZone,
        mode: "IN",
        innerNm: 1.0,
        outerNm: 3.5,
        startBrgDeg: 350,
        endBrgDeg: 10,
        alarmActive: true,
        audible: true,
      },
      ata: {
        ...baseState.ata,
        targets: ata50,
        selectedTargetId: "T01",
        dangerousIds: ata50.filter(t => t.dangerous).map(t => t.targetId),
        alarmActive: true,
      },
      ais: {
        ...baseState.ais,
        selectedMmsi: ais100[0].mmsi,
        selectedTarget: ais100[0],
        dangerousMmsis: aisProjection100.dangerousMmsis,
        alarmActive: true,
      },
      alarms: { ...baseState.alarms, activeIds: ["AIS_CPA_DANGER", "ATA_CPA_DANGER", "GUARD_ZONE_IN"], visualActive: true, audible: true },
    };

    // 1. All 4 palettes x 3 screen modes x 4 presentation modes + sweep step
    let az = 0;
    for (const palette of Object.keys(MDC2060_COLOR_PALETTES)) {
      for (const screenMode of MDC2060_SCREEN_MODES) {
        for (const pres of MDC2060_PRESENTATION_MODES) {
          const st = {
            ...richTxState,
            settings: { ...richTxState.settings, colorPalette: palette, screenMode, presentationMode: pres },
            effectiveModes: { ...richTxState.effectiveModes, presentationMode: pres },
          };
          renderer.render({
            state: st,
            scenario: MDC2060_COASTAL_SCENARIO,
            maritimeBus: baseBus,
            aisProjection: aisProjection100,
            visualAzimuthDeg: az,
            lcdLang: palette === "NIGHT" ? "vi" : "en",
            nowMs: 1200 + az,
          });
          az = (az + 19) % 360;
          // Trigger incremental stepScopePhosphor path
          renderer.render({
            state: st,
            scenario: MDC2060_COASTAL_SCENARIO,
            maritimeBus: baseBus,
            aisProjection: aisProjection100,
            visualAzimuthDeg: az,
            lcdLang: palette === "NIGHT" ? "vi" : "en",
            nowMs: 1250 + az,
          });
        }
      }
    }

    // 2. All 18 ranges + TM + HL OFF + Guard Zone OUT 360° + SLEEP resting & burst + OFF/PREHEAT/STANDBY
    for (let rIdx = 0; rIdx < MDC2060_RANGES.length; rIdx++) {
      renderer.render({
        state: {
          ...richTxState,
          rangeIndex: rIdx,
          hlSuppressed: rIdx % 2 === 0,
          settings: { ...richTxState.settings, motionMode: rIdx % 2 === 0 ? "TM" : "RM", offCenter: rIdx % 2 === 0 ? "OFF" : "ON" },
          effectiveModes: { ...richTxState.effectiveModes, motionMode: rIdx % 2 === 0 ? "TM" : "RM" },
          tmOffset: { xFrac: -0.2, yFrac: 0.15 },
          guardZone: { ...richTxState.guardZone, mode: "OUT", startBrgDeg: 0, endBrgDeg: 360 },
        },
        scenario: MDC2060_STORM_SCENARIO,
        maritimeBus: baseBus,
        aisProjection: aisProjection100,
        visualAzimuthDeg: rIdx * 20,
        lcdLang: "en",
        nowMs: 2000 + rIdx * 100,
      });
    }

    for (const extraState of [
      { ...richTxState, powerMode: "off" },
      { ...richTxState, powerMode: "preheat", preheatRemainingSec: 42 },
      { ...richTxState, powerMode: "standby" },
      { ...richTxState, powerMode: "sleep", sleepState: { phase: "resting", remainingSec: 180, intervalSec: 300, burstSec: 30 } },
      { ...richTxState, powerMode: "sleep", sleepState: { phase: "burst", remainingSec: 22, intervalSec: 300, burstSec: 30 } },
    ]) {
      renderer.render({
        state: extraState,
        scenario: MDC2060_COASTAL_SCENARIO,
        maritimeBus: baseBus,
        aisProjection: aisProjection100,
        visualAzimuthDeg: 90,
        lcdLang: "en",
        nowMs: 3000,
      });
    }

    // 3. All 8 modal overlays (including lcd-test patterns 0..3 and ais-info with null target)
    const overlays = [
      { kind: "power-hold", elapsedMs: 1500, remainingMs: 1500, priorOverlay: null },
      { kind: "brill", activeField: "lcd", lcdBrightness: 7, panelBrightness: 5, elapsedMs: 200 },
      { kind: "menu", groupIndex: 0, itemIndex: 1, editing: true, draftValue: "2" },
      { kind: "system-menu", groupIndex: 2, itemIndex: 2, editing: false, draftValue: null },
      { kind: "ais-info", mmsi: ais100[0].mmsi },
      { kind: "ais-info", mmsi: "999999999" },
      { kind: "confirm-all-reset", confirm: true },
      { kind: "panel-test", lastControl: "gain", pressCount: 4 },
      { kind: "lcd-test", patternIndex: 0 },
      { kind: "lcd-test", patternIndex: 1 },
      { kind: "lcd-test", patternIndex: 2 },
      { kind: "lcd-test", patternIndex: 3 },
    ];
    for (const ov of overlays) {
      renderer.render({
        state: {
          ...richTxState,
          overlay: ov,
          ais: ov.mmsi === "999999999"
            ? { ...richTxState.ais, selectedMmsi: "999999999", selectedTarget: null }
            : richTxState.ais,
        },
        scenario: MDC2060_COASTAL_SCENARIO,
        maritimeBus: baseBus,
        aisProjection: ov.mmsi === "999999999" ? { ...aisProjection100, selectedTarget: null } : aisProjection100,
        visualAzimuthDeg: 45,
        lcdLang: "vi",
        nowMs: 4000,
      });
    }

    // 4. All sensor faults + null bus + null scenario + non-finite visualAzimuthDeg / nowMs
    renderer.render({
      state: {
        ...richTxState,
        sensorFaults: { hdgNoSignal: true, llNoSignal: true, spdNoSignal: true },
        ownshipSnapshot: { lat: null, lon: null, hdgDeg: null, cogDeg: null, sogKn: null, depthM: null, waterTempC: null },
        cursor: { xFrac: 0.2, yFrac: -0.2, rangeNm: 1.5, bearingDeg: 45, relBearingDeg: 45, lat: null, lon: null },
        measureAnchor: { xFrac: 0.1, yFrac: -0.1, rangeNm: 1.0, bearingDeg: 30, lat: null, lon: null },
        measureResult: null,
        notice: "allResetDone",
      },
      scenario: null,
      maritimeBus: null,
      aisProjection: projectAisTargets(null, richTxState.settings, null),
      visualAzimuthDeg: Number.NaN,
      lcdLang: "en",
      nowMs: Number.POSITIVE_INFINITY,
    });

    assert.ok(tracker.drawCalls > 10000, `Expected > 10000 Canvas 2D draw calls, got ${tracker.drawCalls}`);
    assert.deepEqual(tracker.invalidCalls, [], `Found non-finite or negative-radius Canvas 2D args: ${JSON.stringify(tracker.invalidCalls.slice(0, 5))}`);
  } finally {
    globalThis.document = prevDocument;
  }
});

// ============================================================================
// G2-02 & D2-04 — Complete input-controls.mjs Behavioral Coverage
// ============================================================================

test("G2-02 & D2-04: input-controls.mjs rotary, repeat-pad, PPI pointer (incl. non-finite rect), shortcuts, buzzer classifier, and 5-tab ARIA binder", async () => {
  const win = createFakeElement("window");
  const doc = createFakeElement("document");

  // 1. bindMdc2060RotaryControl
  const rotaryEvents = [];
  const knob = createFakeElement("button", { id: "gain-knob" });
  let captureFail = false;
  knob.setPointerCapture = () => { if (captureFail) throw new Error("no capture"); };
  const rotary = bindMdc2060RotaryControl({
    button: knob,
    control: "gain",
    emit: ev => rotaryEvents.push(ev),
    windowTarget: win,
    stepPixels: 18,
  });

  // setPointerCapture failure rejects drag start cleanly
  captureFail = true;
  await knob.dispatchEvent({ type: "pointerdown", button: 0, isPrimary: true, pointerId: 1, clientY: 100 });
  assert.equal(knob.classList.contains("pressing"), false);
  captureFail = false;

  // Vertical drag clamps steps to +-20 and suppresses trailing pointer click
  await knob.dispatchEvent({ type: "pointerdown", button: 0, isPrimary: true, pointerId: 1, clientY: 1000 });
  await knob.dispatchEvent({ type: "pointermove", pointerId: 1, clientY: 0 });
  assert.deepEqual(rotaryEvents[0], { kind: "rotate", control: "gain", steps: 20 });
  await knob.dispatchEvent({ type: "pointerup", pointerId: 1 });
  assert.equal(rotary.suppressClick({ detail: 1 }), true);
  assert.equal(rotary.suppressClick({ detail: 1 }), false);
  assert.equal(rotary.suppressClick({ detail: 0 }), false);

  // Wheel filters 0 and NaN, emits -1 / +1
  await knob.dispatchEvent({ type: "wheel", deltaY: 0 });
  await knob.dispatchEvent({ type: "wheel", deltaY: Number.NaN });
  await knob.dispatchEvent({ type: "wheel", deltaY: -120 });
  await knob.dispatchEvent({ type: "wheel", deltaY: 120 });
  assert.deepEqual(rotaryEvents.slice(1), [
    { kind: "rotate", control: "gain", steps: 1 },
    { kind: "rotate", control: "gain", steps: -1 },
  ]);

  // Arrow keys + lostpointercapture + blur + dispose
  await knob.dispatchEvent({ type: "keydown", key: "ArrowUp", repeat: false });
  await knob.dispatchEvent({ type: "keydown", key: "ArrowDown", repeat: true });
  assert.deepEqual(rotaryEvents[3], { kind: "rotate", control: "gain", steps: 1 });
  await knob.dispatchEvent({ type: "pointerdown", button: 0, isPrimary: true, pointerId: 2, clientY: 200 });
  await knob.dispatchEvent({ type: "lostpointercapture", pointerId: 2 });
  assert.equal(knob.classList.contains("pressing"), false);
  await knob.dispatchEvent({ type: "pointerdown", button: 0, isPrimary: true, pointerId: 3, clientY: 200 });
  await win.dispatchEvent({ type: "blur" });
  assert.equal(knob.classList.contains("pressing"), false);
  rotary.dispose();
  await knob.dispatchEvent({ type: "wheel", deltaY: -10 });
  assert.equal(rotaryEvents.length, 4);

  // 2. bindMdc2060RepeatPadControl with deterministic fake scheduler (0 leaked timers)
  const padEvents = [];
  const activeTimers = new Map();
  let nextTid = 1;
  const padBtn = createFakeElement("button", { id: "pad-up" });
  const pad = bindMdc2060RepeatPadControl({
    button: padBtn,
    direction: "up",
    emit: ev => padEvents.push(ev),
    documentTarget: doc,
    windowTarget: win,
    schedule(fn, ms) { const id = nextTid++; activeTimers.set(id, { fn, ms }); return id; },
    cancelTimer(id) { activeTimers.delete(id); },
    initialDelayMs: 450,
    repeatDelayMs: 150,
  });
  await padBtn.dispatchEvent({ type: "pointerdown", button: 0, isPrimary: true, pointerId: 7 });
  assert.equal(padEvents.length, 1);
  assert.equal(activeTimers.size, 1);
  const [[firstId, firstTimer]] = [...activeTimers.entries()];
  assert.equal(firstTimer.ms, 450);
  activeTimers.delete(firstId);
  firstTimer.fn();
  assert.equal(padEvents.length, 2);
  assert.equal(activeTimers.size, 1);
  assert.equal([...activeTimers.values()][0].ms, 150);
  await padBtn.dispatchEvent({ type: "pointerup", pointerId: 7 });
  assert.equal(activeTimers.size, 0);

  // Keyboard hold & synthetic click suppression (synchronous click before microtask flush)
  padBtn.dispatchEventSync({ type: "keydown", key: "Enter", repeat: false });
  assert.equal(padEvents.length, 3);
  doc.dispatchEventSync({ type: "keyup", key: "Enter" });
  assert.equal(activeTimers.size, 0);
  padBtn.dispatchEventSync({ type: "click", detail: 0 });
  assert.equal(padEvents.length, 3);
  await Promise.resolve(); // flush microtask
  padBtn.dispatchEventSync({ type: "click", detail: 0 });
  assert.equal(padEvents.length, 4);
  pad.dispose();
  assert.equal(activeTimers.size, 0);

  // 3. bindMdc2060PpiPointer + D2-04 non-finite DOMRect rejection
  const ppiEvents = [];
  const dblClicks = [];
  const canvas = createFakeElement("canvas", { id: "ppi-canvas" });
  let rect = { left: 10, top: 20, width: 240, height: 320 };
  canvas.getBoundingClientRect = () => rect;
  const ppi = bindMdc2060PpiPointer({
    canvas,
    emit: ev => ppiEvents.push(ev),
    emitDoubleActivate: c => dblClicks.push(c),
    windowTarget: win,
  });

  // D2-04: non-finite rect fields must emit ZERO events (never NaN!)
  for (const badRect of [
    { left: Number.NaN, top: 0, width: 480, height: 640 },
    { left: 0, top: Number.POSITIVE_INFINITY, width: 480, height: 640 },
    { left: 0, top: 0, width: Number.NaN, height: 640 },
    { left: 0, top: 0, width: 480, height: undefined },
    { left: 0, top: 0, width: 0, height: 640 },
  ]) {
    rect = badRect;
    await canvas.dispatchEvent({ type: "pointerdown", button: 0, isPrimary: true, pointerId: 1, clientX: 100, clientY: 100 });
    await canvas.dispatchEvent({ type: "dblclick", clientX: 100, clientY: 100 });
  }
  assert.equal(ppiEvents.length, 0);
  assert.equal(dblClicks.length, 0);

  // Valid scaling, clamping, <2px deadzone, move, dblclick, blur cancel, dispose
  rect = { left: 10, top: 20, width: 240, height: 320 };
  await canvas.dispatchEvent({ type: "pointerdown", button: 0, isPrimary: true, pointerId: 5, clientX: 130, clientY: 180 });
  assert.deepEqual(ppiEvents[0], { kind: "touch", control: "ppi_cursor", x: 240, y: 320, phase: "down" });
  // <2px deadzone ignored
  await canvas.dispatchEvent({ type: "pointermove", pointerId: 5, clientX: 130.4, clientY: 180.4 });
  assert.equal(ppiEvents.length, 1);
  // Clamped outside bounds
  await canvas.dispatchEvent({ type: "pointermove", pointerId: 5, clientX: 999, clientY: -50 });
  assert.deepEqual(ppiEvents[1], { kind: "touch", control: "ppi_cursor", x: 480, y: 0, phase: "move" });
  await win.dispatchEvent({ type: "blur" });
  assert.deepEqual(ppiEvents[2], { kind: "touch", control: "ppi_cursor", x: 480, y: 0, phase: "cancel" });
  await canvas.dispatchEvent({ type: "dblclick", clientX: 130, clientY: 180 });
  assert.deepEqual(dblClicks, [{ x: 240, y: 320 }]);
  ppi.dispose();

  // 4. shouldRouteMdc2060Shortcut matrix (explicitly proving #settings-json-io leaks 0 hotkeys)
  const panel = createFakeElement("aside", { classes: ["training-panel"] });
  const settingsTa = createFakeElement("textarea", { id: "settings-json-io", parent: panel });
  const standaloneTa = createFakeElement("textarea", { id: "other-textarea" });
  const focusChk = createFakeElement("input", { id: "device-focus-toggle", attrs: { type: "checkbox" } });
  const gainBtn = createFakeElement("button", { id: "gain-knob" });
  const plainDiv = createFakeElement("div");

  for (const key of ["p", "m", "t", "f", "r", "a", "1", "2", "Enter", "Escape"]) {
    assert.equal(shouldRouteMdc2060Shortcut({ key, target: settingsTa }), false);
    assert.equal(shouldRouteMdc2060Shortcut({ key, target: standaloneTa }), false);
  }
  assert.equal(shouldRouteMdc2060Shortcut({ key: " ", target: focusChk }), false);
  assert.equal(shouldRouteMdc2060Shortcut({ key: "Enter", target: focusChk }), false);
  assert.equal(shouldRouteMdc2060Shortcut({ key: "t", target: focusChk }), true);
  assert.equal(shouldRouteMdc2060Shortcut({ key: "ArrowUp", target: gainBtn }), false);
  assert.equal(shouldRouteMdc2060Shortcut({ key: "t", target: gainBtn }), true);
  assert.equal(shouldRouteMdc2060Shortcut({ key: "t", ctrlKey: true, target: plainDiv }), false);
  assert.equal(shouldRouteMdc2060Shortcut({ key: "t", repeat: true, target: plainDiv }), false);
  assert.equal(shouldRouteMdc2060Shortcut({ key: "t", target: plainDiv }), true);

  // 5. classifyMdc2060HardwareSound
  const offSt = { powerMode: "off", settings: { buzzer: "HIGH" }, alarms: { audible: false } };
  const txSt = { powerMode: "transmit", settings: { buzzer: "HIGH" }, alarms: { audible: true } };
  const silentSt = { powerMode: "transmit", settings: { buzzer: "OFF" }, alarms: { audible: true } };
  assert.equal(classifyMdc2060HardwareSound(offSt, txSt, { kind: "up", control: "power" }), "power-on");
  assert.equal(classifyMdc2060HardwareSound(txSt, offSt, { kind: "up", control: "power" }), "power-off");
  assert.equal(classifyMdc2060HardwareSound(txSt, txSt, { kind: "tick" }), "alarm");
  assert.equal(classifyMdc2060HardwareSound(silentSt, silentSt, { kind: "tick" }), null);
  assert.equal(classifyMdc2060HardwareSound(txSt, txSt, { kind: "rotate", control: "gain" }), "detent");
  assert.equal(classifyMdc2060HardwareSound(txSt, txSt, { kind: "press", control: "f1" }), "key");
  assert.equal(classifyMdc2060HardwareSound(silentSt, silentSt, { kind: "press", control: "f1" }, { keySoundOverride: true }), "tactile");
  assert.equal(classifyMdc2060HardwareSound(silentSt, silentSt, { kind: "press", control: "f1" }, { keySoundOverride: false }), null);
  assert.equal(classifyMdc2060HardwareSound(txSt, txSt, { kind: "touch", phase: "move" }), null);
  assert.equal(classifyMdc2060HardwareSound(txSt, txSt, { kind: "press", control: "f1" }, { speakerEnabled: false }), null);

  // 6. bindMdc2060InstructorTabs (fail-open + 5-tab navigation)
  const badRoot = createFakeElement("section");
  assert.equal(bindMdc2060InstructorTabs(badRoot), null);
  assert.equal(badRoot.dataset.d15TabsReady, undefined);

  const tabRoot = createFakeElement("section", { classes: ["training-panel"] });
  const liveRail = createFakeElement("div", { classes: ["d15-live-rail"] });
  const tablist = createFakeElement("div", { classes: ["d15-tablist"] });
  const tabpanels = createFakeElement("div", { classes: ["d15-tabpanels"] });
  tabRoot.appendChild(liveRail);
  tabRoot.appendChild(tablist);
  tabRoot.appendChild(tabpanels);
  const tabs = [];
  const panels = [];
  for (let i = 0; i < 5; i++) {
    const pid = `d15-panel-${i}`;
    const t = createFakeElement("button", { id: `d15-tab-${i}`, attrs: { role: "tab", "aria-controls": pid } });
    const p = createFakeElement("div", { id: pid, attrs: { role: "tabpanel" } });
    tablist.appendChild(t);
    tabpanels.appendChild(p);
    tabs.push(t);
    panels.push(p);
  }
  const boundTabs = bindMdc2060InstructorTabs(tabRoot);
  assert.ok(boundTabs);
  assert.equal(tabRoot.dataset.d15TabsReady, "true");
  assert.equal(boundTabs.getActiveIndex(), 0);
  assert.equal(panels[0].hidden, false);
  assert.equal(panels[1].hidden, true);
  await tabs[0].dispatchEvent({ type: "keydown", key: "ArrowRight" });
  assert.equal(boundTabs.getActiveIndex(), 1);
  assert.equal(panels[1].hidden, false);
  assert.equal(tabs[1].focused, true);
  await tabs[1].dispatchEvent({ type: "keydown", key: "End" });
  assert.equal(boundTabs.getActiveIndex(), 4);
  await tabs[4].click();
  assert.equal(boundTabs.getActiveIndex(), 4);
  boundTabs.dispose();
});

// ============================================================================
// G2-03 + D2-01 (UI) + D2-02 (UI) — Fake-DOM app.mjs Resilience & Parity Tests
// ============================================================================

let appBootCounter = 0;

async function bootAppWithFakeDom({ initialStorage = {}, throwQuotaOnSet = false } = {}) {
  const html = await readFile(path.join(ROOT, "web/mdc2060/index.html"), "utf8");
  const idMap = new Map();
  const tracker = { drawCalls: 0, invalidCalls: [] };

  const body = createFakeElement("body");
  const trainingPanel = createFakeElement("aside", { classes: ["training-panel"] });
  const controlsCol = createFakeElement("div", { classes: ["controls"] });
  body.appendChild(controlsCol);
  body.appendChild(trainingPanel);

  // Build every element declared with id="..." in web/mdc2060/index.html
  const tagRegex = /<([a-z0-9-]+)([^>]*)>/gi;
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const attrStr = match[2];
    const idMatch = /\bid="([^"]+)"/.exec(attrStr);
    if (!idMatch) continue;
    const id = idMatch[1];
    if (idMap.has(id)) continue;
    const typeMatch = /\btype="([^"]+)"/.exec(attrStr);
    const valMatch = /\bvalue="([^"]*)"/.exec(attrStr);
    const roleMatch = /\brole="([^"]+)"/.exec(attrStr);
    const ariaCtrlMatch = /\baria-controls="([^"]+)"/.exec(attrStr);
    const checked = /\bchecked\b/.test(attrStr);
    const clsMatch = /\bclass="([^"]+)"/.exec(attrStr);
    const classes = clsMatch ? clsMatch[1].split(/\s+/).filter(Boolean) : [];
    const attrs = {};
    if (typeMatch) attrs.type = typeMatch[1];
    if (valMatch) attrs.value = valMatch[1];
    if (roleMatch) attrs.role = roleMatch[1];
    if (ariaCtrlMatch) attrs["aria-controls"] = ariaCtrlMatch[1];
    if (checked) attrs.checked = true;
    const el = createFakeElement(tag, { id, classes, attrs });
    if (tag === "canvas") {
      const rec = createRecordingCanvas2D(tracker);
      el.width = 480;
      el.height = 640;
      el.getContext = rec.getContext;
    }
    idMap.set(id, el);
    body.appendChild(el);
  }

  const storageMap = new Map(Object.entries(initialStorage));
  const localStorage = {
    getItem(k) { return storageMap.has(k) ? storageMap.get(k) : null; },
    setItem(k, v) {
      if (throwQuotaOnSet) {
        const err = new Error("QuotaExceededError");
        err.name = "QuotaExceededError";
        throw err;
      }
      storageMap.set(k, String(v));
    },
    removeItem(k) { storageMap.delete(k); },
  };

  const docListeners = new Map();
  const winListeners = new Map();
  const fakeDoc = {
    readyState: "complete",
    body,
    documentElement: createFakeElement("html"),
    fullscreenElement: null,
    getElementById: id => idMap.get(id) ?? null,
    querySelector: sel => {
      if (sel === ".controls") return controlsCol;
      if (sel === ".training-panel") return trainingPanel;
      return body.querySelector(sel);
    },
    createElement: tag => {
      if (tag === "canvas") return createRecordingCanvas2D(tracker);
      return createFakeElement(tag);
    },
    createDocumentFragment: () => createFakeElement("#fragment"),
    addEventListener(type, fn) {
      if (!docListeners.has(type)) docListeners.set(type, new Set());
      docListeners.get(type).add(fn);
    },
    removeEventListener(type, fn) { docListeners.get(type)?.delete(fn); },
    async dispatchEvent(ev) {
      for (const fn of [...(docListeners.get(ev.type) ?? [])]) await fn(ev);
    },
  };
  let rafSeq = 0;
  const fakeWin = {
    localStorage,
    requestAnimationFrame() { return ++rafSeq; },
    cancelAnimationFrame() {},
    addEventListener(type, fn) {
      if (!winListeners.has(type)) winListeners.set(type, new Set());
      winListeners.get(type).add(fn);
    },
    removeEventListener(type, fn) { winListeners.get(type)?.delete(fn); },
    async dispatchEvent(ev) {
      for (const fn of [...(winListeners.get(ev.type) ?? [])]) await fn(ev);
    },
  };

  const saved = {
    window: globalThis.window,
    document: globalThis.document,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    URL: globalThis.URL,
  };
  globalThis.window = fakeWin;
  globalThis.document = fakeDoc;
  globalThis.requestAnimationFrame = fakeWin.requestAnimationFrame;
  globalThis.cancelAnimationFrame = fakeWin.cancelAnimationFrame;

  const url = new URL("../web/mdc2060/app.mjs", import.meta.url);
  url.searchParams.set("tier5", String(++appBootCounter));
  await import(url.href);

  const cleanup = async () => {
    await fakeWin.dispatchEvent({ type: "pagehide" });
    globalThis.window = saved.window;
    globalThis.document = saved.document;
    globalThis.requestAnimationFrame = saved.requestAnimationFrame;
    globalThis.cancelAnimationFrame = saved.cancelAnimationFrame;
    globalThis.URL = saved.URL;
  };

  return { idMap, storageMap, fakeDoc, fakeWin, cleanup };
}

async function tapHoldKey(btn, durationMs = 120) {
  let now = 1000;
  const origNow = performance.now;
  performance.now = () => now;
  try {
    await btn.dispatchEvent({ type: "pointerdown", button: 0, isPrimary: true, pointerId: 1 });
    now += durationMs;
    await btn.dispatchEvent({ type: "pointerup", pointerId: 1 });
  } finally {
    performance.now = origNow;
  }
}

test("D2-01 (UI parity) & D2-02 (lcdLangOverride reset on restore-settings and DEMO/ALL RESET)", async () => {
  const app = await bootAppWithFakeDom();
  try {
    const { idMap } = app;
    const btnPower = idMap.get("btn-power");
    const btnLang = idMap.get("btn-lang-toggle");
    const btnSkipPreheat = idMap.get("btn-skip-preheat");
    const btnStbyTx = idMap.get("btn-stby-tx");
    const btnMenu = idMap.get("btn-menu");
    const btnEnt = idMap.get("btn-ent");
    const padRight = idMap.get("pad-right");
    const padDown = idMap.get("pad-down");
    const settingsTa = idMap.get("settings-json-io");
    const fileInput = idMap.get("input-import-settings");
    const btnImport = idMap.get("btn-import-settings");
    const settingsStatus = idMap.get("settings-status");

    // D2-01: 3-byte UTF-8 Vietnamese payload (9998 UTF-16 units, 29978 UTF-8 bytes > 18000)
    const bigUtf8 = `{"a":"${"ệ".repeat(9990)}"}`;
    assert.ok(bigUtf8.length < 18000);
    const bigUtf8Bytes = new TextEncoder().encode(bigUtf8).byteLength;
    assert.ok(bigUtf8Bytes > 18000);

    // 1) Textarea path must reject immediately with 18 KB size error (matching file path!)
    fileInput.files = [];
    settingsTa.value = bigUtf8;
    await btnImport.click();
    assert.equal(settingsStatus.dataset.state, "rejected");
    assert.match(settingsStatus.textContent, /18 KB/);

    // 2) File path with same payload also rejects with 18 KB size error
    fileInput.files = [{ size: bigUtf8Bytes, async text() { return bigUtf8; } }];
    await btnImport.click();
    assert.equal(settingsStatus.dataset.state, "rejected");
    assert.match(settingsStatus.textContent, /18 KB/);
    fileInput.files = [];

    // D2-02 Path A: Toggle VI/EN during PREHEAT -> power OFF -> import EN settings -> override cleared!
    await tapHoldKey(btnPower, 120); // OFF -> PREHEAT
    assert.equal(btnLang.getAttribute("aria-pressed"), "false");
    await btnLang.click(); // sets lcdLangOverride = "vi" while canonical stays "en"
    assert.equal(btnLang.getAttribute("aria-pressed"), "true");

    await tapHoldKey(btnPower, 3200); // PREHEAT -> OFF
    settingsTa.value = encodeMdc2060Settings({ language: "en", colorPalette: "NIGHT" });
    await btnImport.click();
    assert.equal(settingsStatus.dataset.state, "pass");
    assert.equal(btnLang.getAttribute("aria-pressed"), "false", "restore-settings must clear stale lcdLangOverride");

    // D2-02 Path B: Toggle VI/EN during PREHEAT -> TX -> SYSTEM > PRESET > DEMO/ALL RESET -> override cleared!
    await tapHoldKey(btnPower, 120); // OFF -> PREHEAT
    await btnLang.click(); // sets lcdLangOverride = "vi"
    assert.equal(btnLang.getAttribute("aria-pressed"), "true");
    await btnSkipPreheat.click();
    await btnStbyTx.click();
    // Open System Menu (long MENU > 1500ms), navigate to PRESET (group 2), DEMO/ALL RESET (item 2)
    await tapHoldKey(btnMenu, 1600);
    await padRight.dispatchEvent({ type: "click", detail: 0 });
    await padRight.dispatchEvent({ type: "click", detail: 0 });
    await padDown.dispatchEvent({ type: "click", detail: 0 });
    await padDown.dispatchEvent({ type: "click", detail: 0 });
    await tapHoldKey(btnEnt, 120); // open confirm-all-reset
    await padRight.dispatchEvent({ type: "click", detail: 0 }); // NO -> YES
    await tapHoldKey(btnEnt, 120); // execute DEMO/ALL RESET -> notice = "allResetDone"
    assert.equal(btnLang.getAttribute("aria-pressed"), "false", "DEMO/ALL RESET must clear stale lcdLangOverride");

    // Follow-up edge check: setting lcdLangOverride during an active lesson right after ALL RESET
    // must NOT be wiped by a subsequent range_up key press
    await idMap.get("btn-start-lesson").click();
    await btnLang.click();
    assert.equal(btnLang.getAttribute("aria-pressed"), "true");
    await idMap.get("btn-range-up").click();
    assert.equal(btnLang.getAttribute("aria-pressed"), "true");
  } finally {
    await app.cleanup();
  }
});

test("G2-03 (app.mjs resilience): corrupted localStorage, QuotaExceededError, and btnImportReplay negative cases", async () => {
  // 1. Corrupted localStorage (__proto__ payload + QuotaExceededError on setItem)
  const app = await bootAppWithFakeDom({
    initialStorage: {
      [MDC2060_SETTINGS_STORAGE_KEY]: '{"__proto__":{"pollutedTier5":true}}',
    },
    throwQuotaOnSet: true,
  });
  try {
    assert.equal(({}).pollutedTier5, undefined);
    const { idMap } = app;
    await tapHoldKey(idMap.get("btn-power"), 120);
    await idMap.get("btn-skip-preheat").click();
    await idMap.get("btn-stby-tx").click();
    await idMap.get("btn-range-down").click();

    // btnImportReplay negative cases
    const inputReplay = idMap.get("input-import-replay");
    const btnImportReplay = idMap.get("btn-import-replay");
    const status = idMap.get("replay-import-status");

    // a) No file selected
    inputReplay.files = [];
    await btnImportReplay.click();
    assert.equal(status.dataset.state, "rejected");

    // b) > 2 MiB file rejected before reading
    let readCalled = false;
    inputReplay.files = [{ size: 2 * 1024 * 1024 + 1, async text() { readCalled = true; return "{}"; } }];
    await btnImportReplay.click();
    assert.equal(status.dataset.state, "rejected");
    assert.equal(readCalled, false);

    // c) Duplicate / unsupported deviceOrder
    const b = createBridgeSession([MDC2060_ADAPTER], MDC2060_COASTAL_SCENARIO);
    const dupEnv = { ...createBridgeReplay(b), deviceOrder: [DEV, DEV] };
    inputReplay.files = [{ size: 512, async text() { return JSON.stringify(dupEnv); } }];
    await btnImportReplay.click();
    assert.equal(status.dataset.state, "rejected");

    // d) Unknown scenarioId
    const badScenEnv = { ...createBridgeReplay(b), scenarioId: "nonexistent-scenario-999" };
    inputReplay.files = [{ size: 512, async text() { return JSON.stringify(badScenEnv); } }];
    await btnImportReplay.click();
    assert.equal(status.dataset.state, "rejected");
  } finally {
    await app.cleanup();
  }
});

// ============================================================================
// G2-03 (server.mjs) — Ephemeral Loopback Security Probes
// ============================================================================

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function rawHttpGet(port, rawPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, method: "GET", path: rawPath }, res => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString("utf8"),
      }));
    });
    req.once("error", reject);
    req.end();
  });
}

test("G2-03 (tools/server.mjs): blocks %00, %5c, %2f traversal, malformed UTF-8 %E0%A4%A, and /sources/manuals while serving /mdc2060 with strict headers", async () => {
  const port = await getFreePort();
  const proc = spawn(process.execPath, [path.join(ROOT, "tools/server.mjs")], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("server startup timeout")), 4000);
      proc.stdout.on("data", chunk => {
        if (chunk.toString("utf8").includes(`127.0.0.1:${port}`)) {
          clearTimeout(timer);
          resolve();
        }
      });
      proc.once("exit", code => {
        clearTimeout(timer);
        reject(new Error(`server exited prematurely with code ${code}`));
      });
    });

    const ok = await rawHttpGet(port, "/mdc2060");
    assert.equal(ok.status, 200);
    assert.match(ok.headers["content-security-policy"] ?? "", /connect-src 'none'/);
    assert.equal(ok.headers["x-content-type-options"], "nosniff");

    const attackPaths = [
      "/web/mdc2060/index.html%00.js",
      "/web/..%5cpackage.json",
      "/web/%2e%2e%2fpackage.json",
      "/src/%2e%2e%2fpackage.json",
      "/web/%E0%A4%A",
      "/sources/manuals/MDC-2060/README.md",
      "/sources/manuals/MDC-2060/MDC-2060_OM.pdf",
    ];
    for (const p of attackPaths) {
      const res = await rawHttpGet(port, p);
      assert.ok(res.status === 403 || res.status === 404, `Expected 403/404 for ${p}, got ${res.status}`);
      assert.doesNotMatch(res.body, /build:standalone|PDF-/);
      assert.equal(res.headers["x-content-type-options"], "nosniff");
    }
  } finally {
    proc.kill("SIGTERM");
    await new Promise(resolve => {
      const killer = setTimeout(() => {
        try { proc.kill("SIGKILL"); } catch {}
        resolve();
      }, 2000);
      proc.once("exit", () => {
        clearTimeout(killer);
        resolve();
      });
    });
  }
});
