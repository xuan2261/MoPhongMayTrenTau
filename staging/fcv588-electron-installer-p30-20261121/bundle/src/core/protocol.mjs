export const CORE_CONTRACT_VERSION = "f1-core-7";
export const EVENT_SCHEMA_VERSION = 5;
export const PRNG_VERSION = "counter-mix32-v1";
export const TICK_DURATION_MS = 1000;
// v7 binds the reducer's expected final canonical session hash in addition to
// profile/hold/event contracts. Old envelopes require explicit migration;
// their lack of a final-state witness is not silently interpreted as proof.
export const REPLAY_ENVELOPE_VERSION = 7;

/** A stable, non-cryptographic drift fingerprint for local training fixtures. */
export function stableSerialize(value) {
  if (Array.isArray(value)) {
    // Fingerprints may not silently omit named array props, symbols, getters
    // or sparse slots. The canonical dense JSON-array representation is
    // unchanged; only ambiguous, unsupported payloads are rejected.
    if (Reflect.ownKeys(value).length !== value.length + 1) {
      throw new TypeError("noncanonical array fields in fingerprint");
    }
    const entries=[];
    for(let i=0;i<value.length;i++){
      const field=Object.getOwnPropertyDescriptor(value,String(i));
      if(!field || !field.enumerable || !Object.hasOwn(field,"value")){
        throw new TypeError("noncanonical array fields in fingerprint");
      }
      entries.push(stableSerialize(field.value));
    }
    return `[${entries.join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableSerialize(value[k])}`).join(",")}}`;
  }
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") {
    throw new TypeError("unsupported fingerprint data");
  }
  return JSON.stringify(value);
}

export function fingerprint(value) {
  const input = stableSerialize(value);
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash = Math.imul(hash ^ input.charCodeAt(i), 0x01000193);
  }
  return `f0-fnv1a32-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

/**
 * Detach event payloads from mutable UI callers and from portable envelopes.
 * Only bounded plain data belongs in deterministic replay logs, never live
 * class instances, getters, functions, cyclic references or external objects.
 */
export function snapshotEventData(value,{freeze=false}={}) {
  const visited=new WeakSet();
  let nodes=0;
  function clone(data,depth){
    if(data===null || typeof data==="string" || typeof data==="boolean" ||
      (typeof data==="number" && Number.isFinite(data)))return data;
    if(!data || typeof data!=="object" || depth>8)
      throw new TypeError("unsupported replay event payload");
    if(visited.has(data))throw new TypeError("cyclic replay event payload");
    if(++nodes>1000)throw new RangeError("oversized replay event payload");
    const proto=Object.getPrototypeOf(data);
    if(!Array.isArray(data) && proto!==Object.prototype && proto!==null)
      throw new TypeError("non-plain replay event payload");
    visited.add(data);
    const out=Array.isArray(data)?[]:{};
    for(const key of Object.keys(data)){
      if(["__proto__","constructor","prototype"].includes(key))
        throw new TypeError("reserved replay event key");
      const descriptor=Object.getOwnPropertyDescriptor(data,key);
      if(!descriptor || !Object.hasOwn(descriptor,"value"))
        throw new TypeError("non-data replay event field");
      out[key]=clone(descriptor.value,depth+1);
    }
    visited.delete(data);
    return freeze?Object.freeze(out):out;
  }
  return clone(value,0);
}

export function classifyHoldTicks(elapsedTicks, thresholdMs = 3000) {
  if (!Number.isInteger(elapsedTicks) || elapsedTicks < 0) throw new RangeError("invalid hold ticks");
  return classifyHoldDurationMs(elapsedTicks * TICK_DURATION_MS, thresholdMs);
}

export function classifyHoldDurationMs(durationMs, thresholdMs) {
  if (!Number.isInteger(durationMs) || durationMs < 0 || durationMs > 120000 ||
      !Number.isInteger(thresholdMs) || thresholdMs < 0 || thresholdMs > 120000) {
    throw new RangeError("invalid hold duration or threshold");
  }
  return durationMs > thresholdMs ? "long" : "short";
}

export function validateInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("invalid input object");
  if (!["tick", "ui-tick", "restore-settings", "training-fixture", "press", "rotate", "push", "down", "up", "cancel", "pad"].includes(input.kind)) {
    throw new TypeError("unrecognized input kind");
  }
  const allowed = {
    tick: ["kind", "steps"],
    "ui-tick": ["kind", "elapsedMs"],
    "restore-settings": ["kind", "settings"],
    "training-fixture": ["kind", "fixture", "enabled"],
    press: ["kind", "control"],
    rotate: ["kind", "control", "steps"],
    push: ["kind", "control"],
    down: ["kind", "control"],
    up: ["kind", "control", "durationMs"],
    cancel: ["kind", "control"],
    pad: ["kind", "control", "direction"],
  };
  if (Object.keys(input).some(key => !allowed[input.kind].includes(key))) {
    throw new TypeError("unknown or reserved input field");
  }
  if (input.kind === "tick") {
    if (input.control !== undefined) throw new TypeError("tick has no control");
    if (!Number.isInteger(input.steps ?? 1) || (input.steps ?? 1) < 1 || (input.steps ?? 1) > 20) {
      throw new RangeError("tick steps must be 1..20");
    }
    return;
  }
  if (input.kind === "ui-tick") {
    if (!Number.isInteger(input.elapsedMs) || input.elapsedMs < 1 || input.elapsedMs > 60000) {
      throw new RangeError("ui-tick elapsedMs must be 1..60000");
    }
    return;
  }
  if (input.kind === "restore-settings") {
    if(!input.settings || typeof input.settings!=="object" ||
      Array.isArray(input.settings) ||
      // Core is device-agnostic; the FCV settings codec enforces the exact
      // 106-key allowlist. Bound the generic envelope, not a historic F0 count.
      Object.keys(input.settings).length>256){
      throw new TypeError("invalid settings restore payload");
    }
    return;
  }
  if (input.kind === "training-fixture") {
    if (!["navigation","virtualMounting","lowBattery","systemError",
      "tankenmaruOption"].includes(input.fixture) ||
        typeof input.enabled !== "boolean") {
      throw new TypeError("invalid instructor training fixture");
    }
    return;
  }
  if (typeof input.control !== "string" || !/^[a-z]{2,12}$/.test(input.control)) {
    throw new TypeError("invalid control id");
  }
  if (input.kind === "pad" && (input.control !== "trackpad" ||
      !["up", "down", "left", "right"].includes(input.direction))) {
    throw new TypeError("invalid physical trackpad gesture");
  }
  if (input.kind === "rotate" && (!Number.isInteger(input.steps) || input.steps === 0 || Math.abs(input.steps) > 20)) {
    throw new RangeError("rotation steps must be -20..-1 or 1..20");
  }
  if (["down", "up", "cancel"].includes(input.kind) && !["power", "func"].includes(input.control)) {
    throw new TypeError("press/release edges reserved for physical hold-capable keys");
  }
  if (input.kind === "up" && input.durationMs !== undefined &&
      (!Number.isInteger(input.durationMs) || input.durationMs < 0 || input.durationMs > 120000)) {
    throw new RangeError("invalid captured input duration");
  }
  if (input.kind === "press" && ["power", "func"].includes(input.control)) {
    throw new TypeError("hold-capable keys require deterministic down/up edges");
  }
}
