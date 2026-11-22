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

/**
 * Presentation-only placement for the large depth readout. The supplied
 * DUAL photo shows the value crossing the LF/HF divider; no state is changed.
 */
export function planFcvDepthReadout(state,layout,{width=480,height=640}={}){
  if(!Number.isFinite(width)||width<=0||!Number.isFinite(height)||height<=0)
    throw new RangeError("invalid depth readout viewport");
  const mode=state?.mode??layout?.mode??"LF";
  if(mode==="DUAL"){
    const anchorX=layout?.panes?.hf?.x;
    if(!Number.isFinite(anchorX)||anchorX<=0||anchorX>=width)
      throw new RangeError("invalid DUAL divider");
    return Object.freeze({kind:"dual-divider",anchorX,
      anchorFraction:anchorX/width});
  }
  return Object.freeze({kind:"left",anchorX:11,anchorFraction:11/width});
}

const navValueLines=(label,value)=>{
  const text=String(value??"NO DATA").trim()||"NO DATA";
  if(label!=="POSITION" || text==="NO DATA")return Object.freeze([text]);
  const parts=text.split(/\s+/);
  if(parts[0]==="SIM" && parts.length>=3)
    return Object.freeze([parts.slice(0,2).join(" "),parts.slice(2).join(" ")]);
  if(parts.length>=2)
    return Object.freeze([parts[0],parts.slice(1).join(" ")]);
  return Object.freeze([text]);
};

/**
 * Photo-grounded NAV presentation geometry. Boxes and values are consumed
 * read-only; projector/default semantics remain owned by navigation.mjs.
 */
export function planFcvNavRows(boxes,{x=0,y=0,width=320,height=640}={}){
  if(!Array.isArray(boxes)||boxes.length<1||boxes.length>4 ||
      !Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(width)||
      !Number.isFinite(height)||width<=0||height<=0)
    throw new RangeError("invalid NAV presentation geometry");
  const rowHeight=height/boxes.length;
  return Object.freeze(boxes.map((box,index)=>{
    const label=String(box?.label??"");
    const value=String(box?.value??"NO DATA");
    const rowY=y+index*rowHeight;
    const kind=label==="DEPTH"?"depth":label==="POSITION"?"position":"numeric";
    const valueFontPx=kind==="depth"?46:kind==="position"?18:30;
    return Object.freeze({
      x,y:rowY,width,height:rowHeight,label,value,kind,
      labelX:x+16,labelY:rowY+22,labelFontPx:14,
      valueX:x+16,valueY:rowY+(kind==="position"?50:58),
      valueFontPx,valueLineHeight:kind==="position"?24:valueFontPx+4,
      valueLines:navValueLines(label,value),
      separatorY:index===boxes.length-1?null:rowY+rowHeight,
    });
  }));
}
