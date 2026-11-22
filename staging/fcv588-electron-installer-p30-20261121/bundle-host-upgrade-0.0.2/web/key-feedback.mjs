/**
 * Optional classroom audio indicator for Key Beep (§2.3).
 * The timbre, frequency and envelope do not represent OEM hardware evidence.
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
