/**
 * Photo-informed, independently authored synthetic sonar *display artwork*.
 * This does not reconstruct an OEM framebuffer, sensor reading or fish target.
 * The authoritative world, source observations, events and replay stay intact.
 * Only a non-empty, coherent synthetic bottom allows illustrative water-surface
 * clutter and bottom trailing. A blank/disabled frame stays empty.
 */
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const hash01=(x,y,salt)=>{
  let n=(Math.imul(x+17,0x45d9f3b) ^ Math.imul(y+31,0x119de1f3) ^ salt)|0;
  n=Math.imul(n^(n>>>16),0x45d9f3b);
  n=Math.imul(n^(n>>>16),0x45d9f3b);
  return ((n^(n>>>16))>>>0)/4294967295;
};
function coherentBottom(frame){
  const {columns,rows,pixels}=frame;
  // A broad school is not the seabed: anchor to typed synthetic bottom depth.
  const observed=frame.bottomDepthM;
  if(!Number.isFinite(observed))return null;
  const fraction=(observed-(frame.startDepthM??0))/frame.rangeM;
  if(fraction<0||fraction>1)return null;
  const expectedY=Math.round(fraction*(rows-1));
  const limit=Math.max(2,Math.min(16,Math.ceil(8/frame.rangeM*(rows-1))));
  const candidates=new Int32Array(columns).fill(-1);
  const found=[];
  for(let x=0;x<columns;x++){
    // Search only near the known synthetic bottom, not arbitrary wide returns.
    for(let y=Math.min(rows-2,expectedY+limit);y>=Math.max(0,expectedY-limit);y--){
      if(pixels[y*columns+x]>=100){
        candidates[x]=y;
        found.push(y);
        break;
      }
    }
  }
  if(found.length<Math.ceil(columns*.68))return null;
  found.sort((a,b)=>a-b);
  const median=found[Math.floor(found.length/2)];
  const tolerance=Math.max(4,Math.floor(rows*.09));
  let count=0;
  for(let i=0;i<columns;i++){
    if(Math.abs(candidates[i]-median)>tolerance)candidates[i]=-1;
    if(candidates[i]>=0)count++;
  }
  return count>=Math.ceil(columns*.62)?candidates:null;
}
function at(frame,x,y){
  return frame.pixels[
    clamp(y,0,frame.rows-1)*frame.columns+clamp(x,0,frame.columns-1)
  ];
}
function bilinear(frame,x,y){
  const ax=Math.floor(x), ay=Math.floor(y);
  const tx=clamp(x-ax,0,1),ty=clamp(y-ay,0,1);
  const a=at(frame,ax,ay)*(1-tx)+at(frame,ax+1,ay)*tx;
  const b=at(frame,ax,ay+1)*(1-tx)+at(frame,ax+1,ay+1)*tx;
  return a*(1-ty)+b*ty;
}
export function rasterizeFcvEcho(frame,palette,options={}){
  const {columns,rows,pixels}=frame??{};
  if(!Number.isInteger(columns)||columns<1||columns>500||
    !Number.isInteger(rows)||rows<2||rows>400||
    !(pixels instanceof Uint8Array)||pixels.length!==columns*rows)
    throw new TypeError("invalid synthetic pixel buffer or columns/rows");
  if(!Number.isFinite(frame.rangeM)||frame.rangeM<=0||
    !Number.isFinite(frame.startDepthM??0))
    throw new RangeError("invalid synthetic depth range");
  if(!Array.isArray(palette)||![8,16].includes(palette.length)||
    palette.some(c=>!Array.isArray(c)||c.length!==3||
      c.some(v=>!Number.isInteger(v)||v<0||v>255)))
    throw new TypeError("invalid original classroom color palette");
  const sx=2,sy=4,width=columns*sx,height=rows*sy;
  const data=new Uint8ClampedArray(width*height*4);
  // Bottom Lock has already consumed source-authored per-column provenance in
  // the projector. Do not run a second pixel/global-depth inference here: it
  // can turn a near-bottom fish school into a decorative seabed tail.
  const bottom=frame.synthetic===true && frame.zoomMode!=="Bottom Lock"
    ?coherentBottom(frame):null;
  const lf=frame.frequencyKhz===50;
  const hf=frame.frequencyKhz===200;
  const clutterPct=clamp(Number(options.clutterPct??0)||0,0,100);
  const erasePct=clamp(Number(options.colorErasePct??0)||0,0,50);
  const attenuate=(1-clutterPct/100)**1.45*(1-erasePct/50)**0.5;
  const band=lf?Math.min(11,frame.rangeM*.5):
    hf?Math.min(2.5,frame.rangeM*.18):0;
  const drawn=bottom!==null && attenuate>0;
  for(let py=0;py<height;py++){
    const sy0=(py+.5)/sy-.5;
    const depth=frame.startDepthM+
      clamp(sy0/(rows-1),0,1)*frame.rangeM;
    const surface=drawn&&depth>=0&&depth<band;
    const fade=surface?1-depth/band:0;
    for(let px=0;px<width;px++){
      const sx0=(px+.5)/sx-.5;
      const srcX=clamp(Math.round(sx0),0,columns-1);
      let intensity=bilinear(frame,sx0,sy0);
      const anchor=bottom?.[srcX]??-1;
      if(anchor>=0){
        // Echo core and weaker, colored signal beneath the authored bottom.
        const d=sy0-anchor;
        if(d>=-.85 && d<=.18)
          intensity=Math.max(intensity,200*(1-.28*Math.abs(d)));
        if(d>.18 && d<3.1)
          intensity=Math.max(intensity,135*(1-(d-.18)/2.92));
      }
      if(surface && !options.zeroLineRejector && anchor>=0){
        const patch=hash01(Math.floor(px/5),Math.floor(py/5),lf?50:200);
        const broad=hash01(Math.floor(px/17),Math.floor(py/21),lf?509:209);
        const grain=patch*.62+broad*.38;
        const threshold=lf?.15+.38*(1-fade):.92+.07*(1-fade);
        if(grain>threshold){
          const strength=lf?(115+125*grain)*(.45+.55*fade):
            (50+55*grain)*fade;
          intensity=Math.max(intensity,strength*attenuate);
        }
      }
      // Original dither avoids large nearest-neighbor blocks yet preserves
      // the 8/16 independently authored operator palette entries.
      if(intensity>0)
        intensity+=((hash01(px,py,frame.frequencyKhz??0)-.5)*18);
      const value=clamp(Math.round(intensity),0,255);
      const color=palette[Math.min(palette.length-1,
        Math.floor(value/256*palette.length))];
      const j=(py*width+px)*4;
      data[j]=color[0];data[j+1]=color[1];data[j+2]=color[2];data[j+3]=255;
    }
  }
  return {width,height,data,sourceClass:"SYNTHETIC_DISPLAY_ONLY",
    hardwareValidated:false};
}

