/**
 * Manual OME-23890-E §1.4, PDF pp. 10–11: DUAL LF/HF, zoom-left,
 * NAV boxes occupying the left 2/3 with a sonar strip at the right.
 * Canvas geometry is our original illustrative implementation.
 */
export function planFcvScreenLayout(state,{width=480,height=640}={}){
  if(!Number.isFinite(width) || width<=0 || !Number.isFinite(height) ||
    height<=0)throw new RangeError("invalid training LCD viewport");
  const mode=state?.mode??"LF";
  const sourceStatus="CURATED_PUBLIC_MANUAL_NOT_HARDWARE_VERIFIED";
  const pane=(x,w)=>Object.freeze({x,y:0,width:w,height});
  if(mode==="NAV1" || mode==="NAV2"){
    const left=width*2/3;
    return {mode,sourceStatus,panes:Object.freeze({nav:pane(0,left),
      sonar:pane(left,width-left)})};
  }
  const requested=Number(state?.settings?.windowRatio??50);
  const ratio=Number.isFinite(requested)?Math.min(0.75,Math.max(0.25,requested/100)):0.5;
  const left=Math.round(width*ratio);
  if(mode==="DUAL")return {mode,sourceStatus,panes:Object.freeze({
    lf:pane(0,left),hf:pane(left,width-left)})};
  if(mode.includes("ZOOM"))return {mode,sourceStatus,panes:Object.freeze({
    zoom:pane(0,left),normal:pane(left,width-left)})};
  return {mode,sourceStatus,panes:Object.freeze({normal:pane(0,width)})};
}
