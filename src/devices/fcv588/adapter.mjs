import {FCV588, initialFcv588State, reduceFcv588} from "./model.mjs";

/** Other devices will provide the same four members, not inherit FCV menus. */
export const FCV588_ADAPTER = Object.freeze({
  id: FCV588.id,
  revision: FCV588.revision,
  profile: FCV588,
  controls: Object.freeze(["power", "menu", "enter", "range", "mark", "func", "trackpad", "mode", "gain"]),
  // POWER >3 s from manual §1.2. FUNC timing is a provisional F0 heuristic,
  // not a manufacturer specification; hardware validation required for F1.
  holdThresholdMs: Object.freeze({power: 3000, func: 650}),
  gestures: Object.freeze({
    power: Object.freeze(["down", "up", "cancel"]),
    menu: Object.freeze(["press"]),
    enter: Object.freeze(["press"]),
    range: Object.freeze(["press"]),
    mark: Object.freeze(["press"]),
    func: Object.freeze(["down", "up", "cancel"]),
    trackpad: Object.freeze(["pad"]),
    mode: Object.freeze(["rotate"]),
    gain: Object.freeze(["push", "rotate"]),
  }),
  initial: initialFcv588State,
  reduce: reduceFcv588,
  probe: state => ({
    power: state.power,
    mode: state.mode,
    rangeMode: state.rangeMode,
    rangeIndex: state.rangeIndex,
    gainMode: state.gainMode,
    manualGain: state.manualGain,
    autoGainOffset: state.autoGainOffset,
    uiElapsedMs: state.uiElapsedMs,
    modeCandidate: state.overlay?.kind === "mode" ? state.overlay.candidate : null,
    vrmVisible: state.vrmVisible,
    vrmDepthM: state.vrmDepthM,
    brightness: state.brightness,
    dialog: state.overlay?.kind ?? null,
  }),
});
