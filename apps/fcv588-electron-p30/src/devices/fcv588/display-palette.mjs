/**
 * Original, independently chosen classroom color palettes.
 * These are NOT extracted Furuno firmware colors or pixel calibration data.
 */
const ECHO_COLORS=Object.freeze([
  [5,25,68],[15,62,153],[33,109,191],[77,173,135],
  [221,218,62],[244,149,40],[227,59,39],[139,31,49],
].map(ch=>Object.freeze(ch)));
const BACKGROUNDS=Object.freeze({
  Blue:Object.freeze([5,25,68]),
  Black:Object.freeze([3,6,12]),
  White:Object.freeze([241,245,240]),
  Mono:Object.freeze([6,12,18]),
  Night:Object.freeze([22,3,10]),
});
export function getFcvDisplayPalette(settings={}){
  const base=ECHO_COLORS.map(ch=>[...ch]);
  const scheme=settings.palette??settings.background??"Blue";
  base[0]=[...(BACKGROUNDS[scheme]??BACKGROUNDS.Blue)];
  if(scheme==="Mono"){
    for(let i=1;i<base.length;i++){
      const brightness=Math.round(16+i*29);
      base[i]=[brightness,brightness,brightness];
    }
  }else if(scheme==="Night"){
    // Independently designed low-luminance training palette, not OEM RGB.
    for(let i=1;i<base.length;i++){
      base[i]=[Math.min(190,22+i*23),Math.min(80,8+i*8),
        Math.min(105,15+i*11)];
    }
  }
  // Independent white-marker classroom visualization. Do not infer an
  // actual installed v2.01+ palette or copy proprietary firmware colors.
  if(settings.whiteMarker==="White")base[7]=[246,248,246];
  else if(settings.whiteMarker==="Gray")base[7]=[151,160,166];
  if(settings.colors!=="16")return base;
  const result=[];
  for(let i=0;i<base.length;i++){
    result.push(base[i]);
    const next=base[Math.min(i+1,base.length-1)];
    result.push(base[i].map((component,c)=>Math.round(component*0.7+next[c]*0.3)));
  }
  return result;
}

/**
 * Accessible labels for the independently drawn LCD artwork. White is a
 * documented palette choice, but vendor-specific ink/font/colorimetry is NOT
 * copied or inferred. Foreground and NAV pane must follow the *displayed*
 * background, otherwise a White palette leaves white annotations invisible.
 * Pure display projection; never changes observations or equipment settings.
 */
export function getFcvLcdContrastTheme(settings={}){
  const background=getFcvDisplayPalette(settings)[0];
  const luminance=background.reduce((sum,component,i)=>{
    const value=component/255;
    const linear=value<=0.04045?value/12.92:
      ((value+0.055)/1.055)**2.4;
    return sum+[0.2126,0.7152,0.0722][i]*linear;
  },0);
  const onLight=luminance>0.42;
  return {
    sourceClass:"ORIGINAL_TRAINING_ARTWORK",
    background,
    foreground:onLight?[16,38,49]:[245,249,251],
    secondary:onLight?[43,72,88]:[184,215,229],
    shadow:onLight?[246,249,241]:[6,18,34],
    navPanel:onLight?[230,237,228]:[23,54,78],
    navHeading:onLight?[20,43,59]:[200,239,255],
    navValue:onLight?[19,54,50]:[234,249,244],
  };
}
