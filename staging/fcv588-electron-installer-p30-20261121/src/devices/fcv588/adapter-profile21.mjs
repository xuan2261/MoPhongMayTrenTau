import {FCV588, initialFcv588State, reduceFcv588} from "./model-profile21.mjs";

/** Other devices will provide the same four members, not inherit FCV menus. */
export const FCV588_PROFILE21_ADAPTER = Object.freeze({
  id: FCV588.id,
  revision: FCV588.revision,
  profile: FCV588,
  controls: Object.freeze(["power", "menu", "enter", "range", "mark", "func", "trackpad", "mode", "gain"]),
  // POWER >3 s from manual §1.2. FUNC timing is a provisional F0 heuristic,
  // not a manufacturer specification; hardware validation required for F1.
  holdThresholdMs: Object.freeze({power: 3000, func: 650}),
  gestures: Object.freeze({
    power: ["down", "up", "cancel"],
    menu: ["press"],
    enter: ["press"],
    range: ["press"],
    mark: ["press"],
    func: ["down", "up", "cancel"],
    trackpad: ["pad"],
    mode: ["rotate"],
    gain: ["push", "rotate"],
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
