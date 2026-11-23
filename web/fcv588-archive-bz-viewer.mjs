/**
 * P26 D15-only reconstructed *synthetic* Bottom Zoom pane.
 * Historical contract comes ONLY from P24's validated sidecar. The
 * viewport is not a captured OEM LCD/framebuffer or historical pixels.
 * Manual OME23890E section 1.4.3: BZ is LEFT half; the bottom stays in
 * LOWER PART, without a specified OEM pixel fraction. P23's 0.75 is
 * classroom-only, and P04 keeps its recorded 0.5 projective behavior.
 * Originals are REFERENCE_ONLY, never embedded/served in runtime.
 */
import {resolveValidatedArchivePair} from "./fcv588-archive-import.mjs";
import {TRAINING_SCENARIO,observeSounder} from "../src/core/scenario.mjs";
import {projectFcvEcho,projectFcvZoom} from "../src/devices/fcv588/echo-projection.mjs";
import {getFcvDisplayPalette} from "../src/devices/fcv588/display-palette.mjs";
import {rasterizeFcvEcho} from "./fcv588-echo-rasterizer.mjs";

export const P26_VIEWER_COLUMNS=72;
export const P26_VIEWER_ROWS=121;
const CONTRACTS=new Set(["P04_HISTORIC","P23_LOWER_BOTTOM"]);

/** Project an already-validated, deterministic event-prefix Session.
 * Called by P27 only after full P24/P25 archive validation and source-bound
 * prefix replay. Never turns a prefix into a new archive or sidecar.
 */
export function projectFcv588ArchiveBZSession(session,presentationContract){
  if(!CONTRACTS.has(presentationContract) ||
     !session?.deviceState || !session?.worldState)
    throw new TypeError("P27 requires validated session and explicit display contract");
  const state=session.deviceState;
  // Saved preference alone is not the active LCD. POWER OFF also suppresses.
  if(state.power!=="on" ||
     !["LF-ZOOM","HF-ZOOM"].includes(state.mode) ||
     state.settings?.zoomMode!=="Bottom Zoom")
    return Object.freeze({renderable:false,reason:"ARCHIVE_NOT_BOTTOM_ZOOM",
      activeMode:state.mode});
  const frequencyKhz=state.mode.startsWith("HF")?200:50;
  const observation=observeSounder(TRAINING_SCENARIO,
    session.worldState,{columns:P26_VIEWER_COLUMNS,rows:P26_VIEWER_ROWS});
  const zoom=projectFcvZoom(observation,state,{
    frequencyKhz,rows:P26_VIEWER_ROWS,displayContract:presentationContract,
  });
  const normal=projectFcvEcho(observation,state,{
    frequencyKhz,rows:P26_VIEWER_ROWS,
  });
  const palette=getFcvDisplayPalette(state.settings);
  const rasterOptions={
    clutterPct:Number(state.settings.clutter??0),
    colorErasePct:Number(state.settings.colorErase??0),
    zeroLineRejector:state.settings.zeroLineRejector==="On",
  };
  const zoomRaster=rasterizeFcvEcho(zoom,palette,rasterOptions);
  const normalRaster=rasterizeFcvEcho(normal,palette,rasterOptions);
  const fraction=(observation.bottomDepthM-zoom.startDepthM)/zoom.windowDepthM;
  if(!Number.isFinite(fraction) || fraction<0 || fraction>1)
    throw new Error("P26 BZ synthetic projection out of bounds");
  return Object.freeze({
    renderable:true,presentationContract,
    frequencyKhz,sourceClass:"SYNTHETIC_TRAINING_ONLY",
    zoomRaster,normalRaster,
    geometry:Object.freeze({
      startDepthM:zoom.startDepthM,windowDepthM:zoom.windowDepthM,
      bottomDepthM:observation.bottomDepthM,bottomFraction:fraction,
    }),
  });
}

/** Original P26 full-file archive API continues to enforce sidecar binding
 * and final hash before rendering. Do not infer historical image provenance.
 */
export function projectFcv588ArchiveBZViewer(envelopeText,sidecarText){
  const replayed=resolveValidatedArchivePair(envelopeText,sidecarText);
  const {summary}=replayed;
  if(!CONTRACTS.has(summary.presentationContract))
    throw new TypeError("P26 unrecognized display contract");
  if(!summary.zoomPreview)
    return Object.freeze({summary,renderable:false,
      reason:"ARCHIVE_NOT_BOTTOM_ZOOM"});
  if(replayed.presentationContract!==summary.presentationContract)
    throw new Error("P26 archive contract drift");
  const visual=projectFcv588ArchiveBZSession(
    replayed.session,replayed.presentationContract);
  if(!visual.renderable)
    return Object.freeze({...visual,summary});
  if(Math.abs(visual.geometry.bottomFraction-
      summary.zoomPreview.bottomFraction)>1e-9)
    throw new Error("P26 historical BZ projection drift");
  return Object.freeze({...visual,summary});
}

/** Paint only the independently owned D15 canvas (never the live LCD).
 * Manually authored split: zoom LEFT half, original RIGHT half per
 * OME23890E section 1.4.3. All pixel colors come from existing synthetic
 * rasterizer/palette, not photographs/OEM firmware framebuffer.
 */
export function renderFcv588ArchiveBZViewer(canvas,view,{showTextLabels=true}={}){
  if(!canvas || typeof canvas.getContext!=="function" || !view?.renderable ||
     !view.zoomRaster || !view.normalRaster ||
     !CONTRACTS.has(view.presentationContract))
    throw new TypeError("P26 requires validated synthetic BZ view and canvas");
  const context=canvas.getContext("2d",{alpha:false});
  if(!context)throw new Error("P26 Canvas 2D unavailable");
  const width=432,height=256,top=27,paneHeight=202,paneWidth=199;
  canvas.width=width;canvas.height=height;
  context.fillStyle="#06182b";context.fillRect(0,0,width,height);
  if(showTextLabels){
    context.font="12px Consolas, monospace";
    context.textBaseline="middle";
    context.fillStyle="#d8e9ed";
    context.fillText("BZ-"+(view.frequencyKhz===200?"HF":"LF")+
      " / "+(view.presentationContract==="P04_HISTORIC"?"P04":"P23"),8,13);
    context.fillText((view.frequencyKhz===200?"HF":"LF")+" NORMAL",228,13);
  }
  const draw=(raster,x)=>{
    if(!Number.isInteger(raster.width)||!Number.isInteger(raster.height)||
       raster.width<=0||raster.height<=0||
       !(raster.data instanceof Uint8ClampedArray)||
       raster.data.length!==raster.width*raster.height*4)
      throw new TypeError("invalid P26 synthetic raster");
    const off=document.createElement("canvas");
    off.width=raster.width;off.height=raster.height;
    const offCtx=off.getContext("2d",{alpha:false});
    if(!offCtx)throw new Error("P26 offscreen Canvas 2D unavailable");
    const pixels=offCtx.createImageData(raster.width,raster.height);
    pixels.data.set(raster.data);
    offCtx.putImageData(pixels,0,0);
    context.imageSmoothingEnabled=false;
    context.drawImage(off,x,top,paneWidth,paneHeight);
    context.strokeStyle="#6d849d";
    context.strokeRect(x+.5,top+.5,paneWidth-1,paneHeight-1);
  };
  draw(view.zoomRaster,8);
  draw(view.normalRaster,225);
  if(showTextLabels){
    context.fillStyle="#cce0ed";
    context.font="11px Consolas, monospace";
    context.fillText("depth "+view.geometry.bottomDepthM.toFixed(1)+" m",8,241);
    context.fillText("synthetic only / not OEM",225,241);
  }
  canvas.dataset.projectionContract=view.presentationContract;
  canvas.dataset.bottomFraction=String(view.geometry.bottomFraction);
  canvas.dataset.sourceClass=view.sourceClass;
  return Object.freeze({width,height});
}
