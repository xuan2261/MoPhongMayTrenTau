import { bindHoldControl } from "../hold-input.mjs";
import { createFcvHardwareBuzzer } from "../key-feedback.mjs";
import { nextInstructorTabIndex } from "../instructor-tabs.mjs";

export { bindHoldControl, createFcvHardwareBuzzer };

const ROTARY_CONTROLS = Object.freeze(["gain", "stc"]);
const PAD_DIRECTIONS = Object.freeze(["up", "down", "left", "right"]);
const HOLD_CONTROLS = Object.freeze(["power", "ent", "menu"]);

/**
 * Bind an MDC-2060 physical rotary knob (GAIN or STC) with pointer vertical drag,
 * mouse wheel detents, and keyboard arrow support.
 */
export function bindMdc2060RotaryControl({
  button,
  control,
  emit,
  windowTarget = typeof window !== "undefined" ? window : null,
  stepPixels = 18,
}) {
  if (!button || !ROTARY_CONTROLS.includes(control) || typeof emit !== "function") {
    throw new TypeError("button, valid rotary control (gain|stc), and emit required");
  }
  if (!Number.isFinite(stepPixels) || stepPixels < 8 || stepPixels > 80) {
    throw new RangeError("stepPixels must be between 8 and 80");
  }

  let active = null;
  let suppressPointerClick = false;
  let disposed = false;

  const cancel = () => {
    if (!active) return false;
    active = null;
    button.classList?.remove("pressing");
    return true;
  };

  const onPointerDown = (event) => {
    if (disposed || active) return;
    if (event.button !== 0 || event.isPrimary === false || !Number.isFinite(event.clientY)) return;
    try {
      button.setPointerCapture?.(event.pointerId);
    } catch {
      return;
    }
    suppressPointerClick = false;
    active = { id: event.pointerId, lastY: event.clientY, moved: false };
    button.classList?.add("pressing");
  };

  const onPointerMove = (event) => {
    if (!active || event.pointerId !== active.id || !Number.isFinite(event.clientY)) return;
    const delta = active.lastY - event.clientY;
    const steps = Math.max(-20, Math.min(20, Math.trunc(delta / stepPixels)));
    if (steps === 0) return;
    active.lastY -= steps * stepPixels;
    active.moved = true;
    emit({ kind: "rotate", control, steps });
    event.preventDefault?.();
  };

  const onPointerUp = (event) => {
    if (!active || event.pointerId !== active.id) return;
    suppressPointerClick = active.moved;
    active = null;
    button.classList?.remove("pressing");
  };

  const onPointerCancel = (event) => {
    if (!active || event.pointerId !== active.id) return;
    const moved = active.moved;
    cancel();
    suppressPointerClick = moved;
  };

  const onLostPointerCapture = (event) => {
    if (!active || (event.pointerId !== undefined && event.pointerId !== active.id)) return;
    const moved = active.moved;
    cancel();
    suppressPointerClick = moved;
  };

  const onWheel = (event) => {
    if (disposed) return;
    if (!Number.isFinite(event.deltaY) || event.deltaY === 0) return;
    event.preventDefault?.();
    emit({ kind: "rotate", control, steps: event.deltaY > 0 ? -1 : 1 });
  };

  const onKeyDown = (event) => {
    if (disposed || event.repeat) return;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault?.();
    const steps = (event.key === "ArrowRight" || event.key === "ArrowUp") ? 1 : -1;
    emit({ kind: "rotate", control, steps });
  };

  button.addEventListener("pointerdown", onPointerDown);
  button.addEventListener("pointermove", onPointerMove);
  button.addEventListener("pointerup", onPointerUp);
  button.addEventListener("pointercancel", onPointerCancel);
  button.addEventListener("lostpointercapture", onLostPointerCapture);
  button.addEventListener("wheel", onWheel, { passive: false });
  button.addEventListener("keydown", onKeyDown);
  windowTarget?.addEventListener("blur", cancel);

  return {
    cancel,
    suppressClick(event) {
      if (event?.detail === 0) return false;
      const shouldSuppress = suppressPointerClick;
      suppressPointerClick = false;
      return shouldSuppress;
    },
    dispose() {
      disposed = true;
      cancel();
      button.removeEventListener("pointerdown", onPointerDown);
      button.removeEventListener("pointermove", onPointerMove);
      button.removeEventListener("pointerup", onPointerUp);
      button.removeEventListener("pointercancel", onPointerCancel);
      button.removeEventListener("lostpointercapture", onLostPointerCapture);
      button.removeEventListener("wheel", onWheel);
      button.removeEventListener("keydown", onKeyDown);
      windowTarget?.removeEventListener("blur", cancel);
    },
  };
}

/**
 * Bind one directional segment of the MRD-104 4-way cursor pad with
 * press-and-hold auto-repeat.
 */
export function bindMdc2060RepeatPadControl({
  button,
  direction,
  emit,
  documentTarget = typeof document !== "undefined" ? document : null,
  windowTarget = typeof window !== "undefined" ? window : null,
  schedule = setTimeout,
  cancelTimer = clearTimeout,
  initialDelayMs = 450,
  repeatDelayMs = 150,
}) {
  if (!button || typeof emit !== "function" || !PAD_DIRECTIONS.includes(direction)) {
    throw new TypeError("button, valid direction, and emit required");
  }
  if (!Number.isInteger(initialDelayMs) || initialDelayMs < 250 || initialDelayMs > 2000) {
    throw new RangeError("initialDelayMs must be an integer between 250 and 2000");
  }
  if (!Number.isInteger(repeatDelayMs) || repeatDelayMs < 70 || repeatDelayMs > 1000) {
    throw new RangeError("repeatDelayMs must be an integer between 70 and 1000");
  }

  let active = null;
  let timerId = null;
  let suppressKeyboardClick = false;
  let disposed = false;

  const edge = () => {
    emit({ kind: "pad", control: "cursorpad", direction });
  };

  const clearScheduled = () => {
    if (timerId !== null) {
      cancelTimer(timerId);
      timerId = null;
    }
  };

  const armRepeat = (delayMs) => {
    clearScheduled();
    timerId = schedule(() => {
      timerId = null;
      if (!active || disposed) return;
      edge();
      armRepeat(repeatDelayMs);
    }, delayMs);
  };

  const cancel = () => {
    clearScheduled();
    if (!active) return false;
    active = null;
    button.classList?.remove("pressing");
    return true;
  };

  const onPointerDown = (event) => {
    if (disposed || active || event.button !== 0 || event.isPrimary === false) return;
    try {
      button.setPointerCapture?.(event.pointerId);
    } catch {
      return;
    }
    active = { kind: "pointer", id: event.pointerId };
    button.classList?.add("pressing");
    edge();
    armRepeat(initialDelayMs);
    event.preventDefault?.();
  };

  const onPointerEnd = (event) => {
    if (!active || active.kind !== "pointer") return;
    if (event.pointerId !== undefined && event.pointerId !== active.id) return;
    cancel();
  };

  const onKeyDown = (event) => {
    if (disposed || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault?.();
    if (event.repeat || active) return;
    active = { kind: "keyboard", key: event.key };
    button.classList?.add("pressing");
    edge();
    armRepeat(initialDelayMs);
  };

  const onDocumentKeyUp = (event) => {
    if (!active || active.kind !== "keyboard" || event.key !== active.key) return;
    cancel();
    suppressKeyboardClick = true;
    queueMicrotask(() => {
      suppressKeyboardClick = false;
    });
    event.preventDefault?.();
  };

  const handleClick = (event) => {
    if (disposed) return;
    if (event.detail === 0 && !active && !suppressKeyboardClick) {
      edge();
    }
  };

  const onButtonBlur = () => {
    if (active?.kind === "keyboard") cancel();
  };

  button.addEventListener("pointerdown", onPointerDown);
  button.addEventListener("pointerup", onPointerEnd);
  button.addEventListener("pointercancel", onPointerEnd);
  button.addEventListener("lostpointercapture", onPointerEnd);
  button.addEventListener("keydown", onKeyDown);
  button.addEventListener("click", handleClick);
  button.addEventListener("blur", onButtonBlur);
  documentTarget?.addEventListener("keyup", onDocumentKeyUp, true);
  windowTarget?.addEventListener("blur", cancel);

  return {
    cancel,
    dispose() {
      disposed = true;
      cancel();
      button.removeEventListener("pointerdown", onPointerDown);
      button.removeEventListener("pointerup", onPointerEnd);
      button.removeEventListener("pointercancel", onPointerEnd);
      button.removeEventListener("lostpointercapture", onPointerEnd);
      button.removeEventListener("keydown", onKeyDown);
      button.removeEventListener("click", handleClick);
      button.removeEventListener("blur", onButtonBlur);
      documentTarget?.removeEventListener("keyup", onDocumentKeyUp, true);
      windowTarget?.removeEventListener("blur", cancel);
    },
  };
}

/**
 * Bind direct pointer click, drag, and double-click onto the 480x640 PPI canvas.
 * Emits canonical touch coordinates (0..480, 0..640) matching model.mjs geometry.
 */
export function bindMdc2060PpiPointer({
  canvas,
  emit,
  emitDoubleActivate = null,
  windowTarget = typeof window !== "undefined" ? window : null,
}) {
  if (!canvas || typeof emit !== "function") {
    throw new TypeError("canvas and emit required");
  }

  let active = null;
  let disposed = false;

  const toLogicalCoords = (event) => {
    const rect = canvas.getBoundingClientRect?.();
    if (!rect ||
        !Number.isFinite(rect.left) || !Number.isFinite(rect.top) ||
        !Number.isFinite(rect.width) || !Number.isFinite(rect.height) ||
        rect.width <= 0 || rect.height <= 0) {
      return null;
    }
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return null;
    const x = Math.max(0, Math.min(480, Math.round(((event.clientX - rect.left) / rect.width) * 480)));
    const y = Math.max(0, Math.min(640, Math.round(((event.clientY - rect.top) / rect.height) * 640)));
    return { x, y };
  };

  const cancel = () => {
    if (!active) return false;
    const last = active;
    active = null;
    emit({ kind: "touch", control: "ppi_cursor", x: last.x, y: last.y, phase: "cancel" });
    return true;
  };

  const onPointerDown = (event) => {
    if (disposed || active || event.button !== 0 || event.isPrimary === false) return;
    const coords = toLogicalCoords(event);
    if (!coords) return;
    try {
      canvas.setPointerCapture?.(event.pointerId);
    } catch {
      // Allow click positioning even when pointer capture is unavailable
    }
    active = { id: event.pointerId, x: coords.x, y: coords.y };
    emit({ kind: "touch", control: "ppi_cursor", x: coords.x, y: coords.y, phase: "down" });
    event.preventDefault?.();
  };

  const onPointerMove = (event) => {
    if (!active || event.pointerId !== active.id) return;
    const coords = toLogicalCoords(event);
    if (!coords) return;
    if (Math.hypot(coords.x - active.x, coords.y - active.y) < 2) return;
    active.x = coords.x;
    active.y = coords.y;
    emit({ kind: "touch", control: "ppi_cursor", x: coords.x, y: coords.y, phase: "move" });
    event.preventDefault?.();
  };

  const onPointerUp = (event) => {
    if (!active || event.pointerId !== active.id) return;
    const coords = toLogicalCoords(event) ?? { x: active.x, y: active.y };
    active = null;
    emit({ kind: "touch", control: "ppi_cursor", x: coords.x, y: coords.y, phase: "up" });
  };

  const onPointerCancel = (event) => {
    if (!active || (event.pointerId !== undefined && event.pointerId !== active.id)) return;
    cancel();
  };

  const onDoubleClick = (event) => {
    if (disposed || typeof emitDoubleActivate !== "function") return;
    const coords = toLogicalCoords(event);
    if (!coords) return;
    emitDoubleActivate(coords);
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("lostpointercapture", onPointerCancel);
  canvas.addEventListener("dblclick", onDoubleClick);
  windowTarget?.addEventListener("blur", cancel);

  return {
    cancel,
    dispose() {
      disposed = true;
      cancel();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("lostpointercapture", onPointerCancel);
      canvas.removeEventListener("dblclick", onDoubleClick);
      windowTarget?.removeEventListener("blur", cancel);
    },
  };
}

/**
 * Guard global MDC-2060 keyboard shortcuts so form inputs, D15 instructor
 * controls, and focused interactive buttons remain conflict-free.
 */
export function shouldRouteMdc2060Shortcut(event) {
  if (!event || event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
    return false;
  }
  const target = event.target;
  if (!target || typeof target.closest !== "function") return false;
  if (target.closest(".training-panel")) return false;
  if (target.type === "checkbox") {
    return !["Enter", " ", "Spacebar"].includes(event.key);
  }
  if (target.closest("input, textarea, select, [contenteditable='true']")) {
    return false;
  }
  if (target.closest("button")) {
    if (["Enter", " ", "Spacebar"].includes(event.key)) return false;
    if (/^Arrow(Up|Down|Left|Right)$/.test(event.key) &&
        target.closest("#gain-knob, #stc-knob")) {
      return false;
    }
  }
  return true;
}

/**
 * Classify MDC-2060 hardware buzzer feedback for Web Audio synthesis.
 * Respects spec.mjs buzzer choices ("OFF" | "LOW" | "HIGH", default "HIGH").
 */
export function classifyMdc2060HardwareSound(
  prevState,
  nextState,
  input,
  { speakerEnabled = true, keySoundOverride = true } = {},
) {
  if (!speakerEnabled || !nextState || !input) return null;

  const buzzerEnabled = nextState.settings?.buzzer !== "OFF";

  if (prevState?.powerMode === "off" && nextState.powerMode !== "off") {
    return "power-on";
  }
  if (prevState?.powerMode && prevState.powerMode !== "off" && nextState.powerMode === "off") {
    return "power-off";
  }

  if (input.kind === "tick") {
    if (nextState.powerMode !== "off" && nextState.alarms?.audible === true && buzzerEnabled) {
      return "alarm";
    }
    return null;
  }

  if (nextState.powerMode === "off") return null;

  if (input.kind === "touch" && input.phase !== "down") {
    return null;
  }

  if (input.kind === "rotate") {
    return "detent";
  }

  const isPhysicalAction =
    input.kind === "pad" ||
    input.kind === "press" ||
    input.kind === "pointer" ||
    (input.kind === "touch" && input.phase === "down") ||
    (input.kind === "up" && HOLD_CONTROLS.includes(input.control));

  if (!isPhysicalAction) return null;
  if (buzzerEnabled) return "key";
  return keySoundOverride ? "tactile" : null;
}

/**
 * Progressive-enhancement WAI-ARIA 5-tab binder for the D15 instructor sidebar.
 * Fail-open: validates every tab and panel before mutating DOM or hiding panels.
 */
export function bindMdc2060InstructorTabs(root) {
  if (!root || root.dataset.d15TabsReady === "true") return null;

  const tablist = root.querySelector(".d15-tablist");
  const liveRail = root.querySelector(".d15-live-rail");
  const tabs = Array.from(root.querySelectorAll('.d15-tablist [role="tab"]'));
  const panels = Array.from(root.querySelectorAll('.d15-tabpanels > [role="tabpanel"]'));

  if (!tablist || !liveRail || tabs.length !== 5 || panels.length !== 5) {
    return null;
  }

  for (let i = 0; i < tabs.length; i++) {
    const controlsId = tabs[i].getAttribute("aria-controls");
    if (!controlsId || panels[i].id !== controlsId) {
      return null;
    }
  }

  let activeIndex = 0;

  const activate = (nextIndex, shouldFocus = false) => {
    if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= tabs.length) return;
    activeIndex = nextIndex;
    for (let i = 0; i < tabs.length; i++) {
      const selected = i === activeIndex;
      tabs[i].setAttribute("aria-selected", selected ? "true" : "false");
      tabs[i].tabIndex = selected ? 0 : -1;
      panels[i].hidden = !selected;
    }
    if (shouldFocus) {
      tabs[activeIndex].focus();
    }
  };

  const listeners = [];
  for (let i = 0; i < tabs.length; i++) {
    const handleClick = () => activate(i, false);
    const onKeyDown = (event) => {
      const next = nextInstructorTabIndex(i, tabs.length, event.key);
      if (next === null) return;
      event.preventDefault();
      activate(next, true);
    };
    tabs[i].addEventListener("click", handleClick);
    tabs[i].addEventListener("keydown", onKeyDown);
    listeners.push({ tab: tabs[i], handleClick, onKeyDown });
  }

  activate(0, false);
  root.classList.add("d15-enhanced");
  root.dataset.d15TabsReady = "true";
  tablist.hidden = false;

  return {
    activate,
    getActiveIndex: () => activeIndex,
    dispose() {
      for (const item of listeners) {
        item.tab.removeEventListener("click", item.handleClick);
        item.tab.removeEventListener("keydown", item.onKeyDown);
      }
    },
  };
}
