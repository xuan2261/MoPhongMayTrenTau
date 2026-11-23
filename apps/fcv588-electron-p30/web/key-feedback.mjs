/**
 * Optional classroom audio indicator for Key Beep (§2.3) and external hardware
 * buzzer synthesizer (power pip, key beep, rotary detent, and §1.18 alarms).
 * Purely view-layer Web Audio synthesis; never enters reducer or replay state.
 */
export function shouldPlayFcvKeyTone(state,input){
  if(state?.power!=="on" || state?.settings?.keyBeep!=="On")return false;
  if(["pad","rotate","push"].includes(input?.kind))return true;
  if(input?.kind==="press")return true;
  return input?.kind==="up" && ["power","func"].includes(input.control);
}

export function createFcvKeyTonePlayer({
  createAudioContext=()=>new (window.AudioContext||window.webkitAudioContext)(),
}={}){
  let context=null;
  return function play(){
    try{
      if(!context)context=createAudioContext();
      if(context.state==="suspended"){
        const result=context.resume();
        result?.catch?.(()=>{});
      }
      const oscillator=context.createOscillator();
      const gain=context.createGain();
      oscillator.type="sine";
      oscillator.frequency.value=880;
      oscillator.connect(gain);
      gain.connect(context.destination);
      const start=context.currentTime;
      gain.gain.setValueAtTime(0.024,start);
      gain.gain.exponentialRampToValueAtTime(0.001,start+0.045);
      oscillator.start(start);
      oscillator.stop(start+0.046);
      return true;
    }catch{return false;}
  };
}

export function classifyFcvHardwareSound(
  prevState,
  nextState,
  input,
  alarmPresentation,
  {speakerEnabled = true, keySoundOverride = true} = {},
) {
  if (!speakerEnabled || !nextState || !input) return null;
  if (prevState?.power === "off" && (nextState.power === "booting" || nextState.power === "on")) {
    return "power-on";
  }
  if (prevState?.power === "on" && nextState.power === "off") {
    return "power-off";
  }
  if (input.kind === "tick") {
    if (nextState.power === "on" && alarmPresentation?.audible === true) {
      return "alarm";
    }
    return null;
  }
  if (nextState.power !== "on") return null;
  const isPhysicalAction =
    ["pad", "rotate", "push", "press"].includes(input.kind) ||
    (input.kind === "up" && ["power", "func"].includes(input.control));
  if (!isPhysicalAction) return null;
  if (nextState.settings?.keyBeep === "On" || keySoundOverride) {
    return input.kind === "rotate" ? "detent" : "key";
  }
  return null;
}

const SOUND_PATTERNS = Object.freeze({
  "power-on": Object.freeze([
    Object.freeze({freq: 2350, duration: 0.042, delay: 0, peak: 0.036, type: "triangle"}),
    Object.freeze({freq: 3050, duration: 0.065, delay: 0.055, peak: 0.042, type: "sine"}),
  ]),
  "power-off": Object.freeze([
    Object.freeze({freq: 1850, duration: 0.045, delay: 0, peak: 0.032, type: "sine"}),
    Object.freeze({freq: 980, duration: 0.075, delay: 0.05, peak: 0.03, type: "triangle"}),
  ]),
  key: Object.freeze([
    Object.freeze({freq: 2420, duration: 0.036, delay: 0, peak: 0.03, type: "sine"}),
  ]),
  detent: Object.freeze([
    Object.freeze({freq: 1520, duration: 0.016, delay: 0, peak: 0.018, type: "triangle"}),
  ]),
  alarm: Object.freeze([
    Object.freeze({freq: 2820, duration: 0.085, delay: 0, peak: 0.05, type: "square"}),
    Object.freeze({freq: 2820, duration: 0.085, delay: 0.13, peak: 0.05, type: "square"}),
  ]),
});

export function createFcvHardwareBuzzer({
  createAudioContext = () => new (window.AudioContext || window.webkitAudioContext)(),
} = {}) {
  let context = null;
  function play(kind) {
    const pulses = SOUND_PATTERNS[kind];
    if (!pulses) return false;
    try {
      if (!context) context = createAudioContext();
      if (context.state === "suspended") {
        const res = context.resume?.();
        res?.catch?.(() => {});
      }
      const baseTime = context.currentTime;
      for (const pulse of pulses) {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = pulse.type;
        osc.frequency.value = pulse.freq;
        osc.connect(gain);
        gain.connect(context.destination);
        const t0 = baseTime + pulse.delay;
        gain.gain.setValueAtTime(pulse.peak, t0);
        gain.gain.exponentialRampToValueAtTime(0.0008, t0 + pulse.duration);
        osc.start(t0);
        osc.stop(t0 + pulse.duration + 0.002);
      }
      return true;
    } catch {
      return false;
    }
  }
  return Object.freeze({play});
}
