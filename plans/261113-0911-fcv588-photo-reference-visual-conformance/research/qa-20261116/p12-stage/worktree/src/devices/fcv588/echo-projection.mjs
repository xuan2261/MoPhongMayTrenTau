/**
 * Deterministic synthetic FCV-588 DISPLAY projection, not acoustic physics.
 * No world/sensor mutation, real probe access, OEM image or calibration claim.
 */
import {makeEchoFrame,SYNTHETIC_SEABED_PROVENANCE_SOURCE,
  SYNTHETIC_SOUNDER_SOURCE_IDENTITY,SOUNDER_COLUMN_SECONDS,sounderSourceRowForDepth} from
  "../../core/scenario.mjs";
import {resolveFcvCapability} from "./capabilities.mjs";

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function depthFractionOnFcvFrame(frame,depthM){
  if(!frame || !Number.isFinite(frame.rangeM) || frame.rangeM<=0 ||
    !Number.isFinite(frame.startDepthM??0) || !Number.isFinite(depthM)){
    throw new TypeError("invalid synthetic display depth window");
  }
  return (depthM-(frame.startDepthM??0))/frame.rangeM;
}
/** Display-only source-graded highlight around the synthetic seabed. */
export function projectFcvBottomZone(frame,bottomDepthM,choice="Standard"){
  const widthM={Narrow:4,Standard:10,Wide:20}[choice];
  if(!widthM)throw new RangeError("invalid bottom-zone training option");
  const at=depthFractionOnFcvFrame(frame,bottomDepthM);
  if(at<0 || at>1)return null;
  const half=widthM/(2*frame.rangeM);
  return {widthM,topFraction:Math.max(0,at-half),
    bottomFraction:Math.min(1,at+half),sourceClass:"SYNTHETIC_DISPLAY_ONLY"};
}
/** Pure A-Scope band from synthetic display samples (not acoustic hardware). */
export function projectFcvAScope(frame){
  if (!frame?.overlays?.aScope) return null;
  const {columns,rows,pixels}=frame;
  if(!Number.isInteger(columns) || columns<1 ||
      !Number.isInteger(rows) || rows<2 ||
      pixels?.length!==rows*columns){
    throw new TypeError("invalid synthetic A-Scope frame");
  }
  const peak=frame.overlays.aScopeMode==="Peak";
  const lookback=Math.min(columns,16);
  const intensities=new Uint8Array(rows);
  for(let y=0;y<rows;y++){
    const offset=y*columns;
    let intensity=pixels[offset+columns-1];
    if(peak){
      for(let x=columns-lookback;x<columns;x++){
        intensity=Math.max(intensity,pixels[offset+x]);
      }
    }
    intensities[y]=intensity;
  }
  return intensities;
}
/** Interpret only an explicit teaching fixture; never estimate actual seabed type. */
export function projectFcvBottomDiscrimination(frame){
  if(!frame?.overlays?.bottomDiscrimination)return null;
  const mode=frame.overlays.bottomDiscriminationMode;
  if(!["Graphic","Probability"].includes(mode))return {
    mode:"Off",status:"UNSUPPORTED_MODE",values:[],
  };
  const fixture=frame.overlays.bottomClassification;
  const types=["Mud","Sand","Gravel","Rock"];
  const values=types.map(label=>({
    label,weight:fixture?.classes?.[label],
  }));
  if(fixture?.sourceClass!=="SYNTHETIC_FIXTURE" ||
     values.some(v=>!Number.isFinite(v.weight)||v.weight<0||v.weight>1) ||
     Math.abs(values.reduce((sum,v)=>sum+v.weight,0)-1)>1e-6){
    return {mode,status:"NO_SYNTHETIC_CLASSIFICATION",values:[]};
  }
  const dominantType=values.reduce((winner,value)=>
    value.weight>winner.weight?value:winner).label;
  return {mode,status:"SYNTHETIC_ONLY",values,dominantType};
}
/** Display synthetic fish markers only when a named capability is enabled. */
export function projectFcvFishAnnotations(observation,frame,enabled){
  if(!enabled || !Array.isArray(observation?.syntheticTargets))return [];
  if(!Number.isInteger(observation.simTick) ||
      !Number.isInteger(frame?.columns) || frame.columns<1 ||
      !Number.isFinite(frame.rangeM) || frame.rangeM<=0)return [];
  const spanSeconds=observation.columns*0.46;
  return observation.syntheticTargets.flatMap(target=>{
    if(target.sourceClass!=="SYNTHETIC_FIXTURE" ||
       !Number.isFinite(target.depthM) ||
       !Number.isFinite(target.sizeCm) || target.sizeCm<=0 ||
       !Number.isFinite(target.time))return [];
    const xFraction=1-(observation.simTick-target.time)/spanSeconds;
    const yFraction=depthFractionOnFcvFrame(frame,target.depthM);
    if(xFraction<0 || xFraction>1 || yFraction<0 || yFraction>1)return [];
    return [{xFraction,yFraction,sizeCm:target.sizeCm,
      sourceClass:"SYNTHETIC_FIXTURE"}];
  });
}
const speeds=Object.freeze({
  "4x":4,"2x":2,"1x":1,"1/2":0.5,"1/4":0.25,"1/8":0.125,"1/16":0.0625,"Stop":0,
});

export function shouldAdvancePicture(state) {
  return (state?.settings?.pictureAdvance ?? "1x") !== "Stop";
}

/** Synthetic sonar is available only in Demo or a named instructor fixture. */
export function shouldRenderFcvSonar(state) {
  return state?.demoOn===true ||
    (state?.trainingFixture?.virtualMounting===true &&
      state?.settings?.transducer==="525STID-PWD");
}

/**
 * Compose the latest synthetic column(s) into an immutable picture history.
 * Picture Advance is a time rate, not a scale transform of historical echoes.
 * Remainders make slow rates deterministic across successive integer ticks.
 * This is a display-only cache: the authoritative observation and event log
 * remain unchanged and can be used to reconstruct it by replay.
 */
export function advanceFcvPictureHistory(previous, latest, state, sourceTick) {
  if (!Number.isInteger(sourceTick) || sourceTick < 0 ||
      !latest || !Number.isInteger(latest.columns) ||
      !Number.isInteger(latest.rows) ||
      latest.pixels?.length !== latest.columns * latest.rows) {
    throw new TypeError("invalid synthetic picture history input");
  }
  const reset = !previous || sourceTick < previous.sourceTick ||
    previous.columns !== latest.columns || previous.rows !== latest.rows ||
    previous.frequencyKhz !== latest.frequencyKhz ||
    previous.projectionKey !== latest.projectionKey ||
    previous.pixels?.length !== latest.pixels.length;
  if (reset) {
    return {...latest, pixels:Uint8Array.from(latest.pixels),
      sourceTick, advanceRemainder:0};
  }
  const speed=speeds[state?.settings?.pictureAdvance ?? "1x"] ?? 1;
  if(speed===0){
    // Stop freezes the complete display snapshot, not only its pixel bytes.
    // Source time still advances so resuming does not freeze the shared world.
    return {...previous,pictureAdvance:latest.pictureAdvance,
      pixels:Uint8Array.from(previous.pixels),
      syntheticFish:previous.syntheticFish??[],sourceTick,
      advanceRemainder:previous.advanceRemainder??0};
  }
  // One world tick is not a real transmit pulse. The TX Rate choice changes
  // only illustrative display sampling cadence, never real acoustic output.
  const txRate=state?.settings?.txRate??"10";
  const rateFactor=txRate==="Max"?1.25:txRate==="S"?0.5:
    /^\d+$/.test(txRate)?clamp(Number(txRate),1,10)/10:1;
  const total=(previous.advanceRemainder ?? 0)+
    speed*rateFactor*(sourceTick - previous.sourceTick);
  const steps=Math.floor(total);
  const shift=Math.min(latest.columns,steps);
  const pixels=new Uint8Array(latest.pixels.length);
  let syntheticFish=previous.syntheticFish??[];
  if (shift === 0) {
    pixels.set(previous.pixels);
  } else if(shift===latest.columns){
    syntheticFish=latest.syntheticFish??[];
    pixels.set(latest.pixels);
  } else {
    for(let y=0;y<latest.rows;y++){
      const row=y*latest.columns;
      pixels.set(previous.pixels.subarray(row+shift,row+latest.columns),row);
      pixels.set(latest.pixels.subarray(row+latest.columns-shift,row+latest.columns),
        row+latest.columns-shift);
    }
    const fraction=shift/latest.columns;
    const previousMarkers=(previous.syntheticFish??[])
      .filter(marker=>marker.xFraction>=fraction)
      .map(marker=>({...marker,xFraction:marker.xFraction-fraction}));
    const newestMarkers=(latest.syntheticFish??[])
      .filter(marker=>marker.xFraction>1-fraction);
    syntheticFish=[...previousMarkers,...newestMarkers];
  }
  return {...latest,pixels,syntheticFish,sourceTick,advanceRemainder:total-steps};
}

function overlaysFor(state,frequencyKhz) {
  const settings=state.settings ?? {};
  const type=settings.transducer ?? "GENERIC_600W";
  const named=type==="525STID-PWD";
  const profile={profileClass:"PUBLIC_REFERENCE",hardwareValidated:false,
    firmwareInstalled:null,virtualTransducerType:type,
    advancedCapabilities:named
      ? {accuFish:"CONDITIONAL",rezBoost:"CONDITIONAL",bottomDiscrimination:"CONDITIONAL"}
      : {}};
  const condition={...state.syntheticConditions,
    draftM:settings.draft===null ? null : Number(settings.draft ?? NaN),
    rangeMode:state.rangeMode};
  const aScopeMode=["Normal","Peak"].includes(settings.aScope)
    ? settings.aScope:"Off";
  return {
    whiteLine:settings.whiteLine==="On",
    bottomZone:settings.bottomZone??"Standard",
    // In DUAL the A-scope is shown on the HF side only (§1.14).
    aScope:aScopeMode!=="Off" && (state.mode!=="DUAL" || frequencyKhz===200),
    aScopeMode,
    fishSymbol:settings.fishSymbol??"Off",
    fishSize:settings.fishSize??"Small",
    accuFish:settings.accuFish==="On" &&
      resolveFcvCapability(profile,"accuFish",condition).enabled,
    rezBoost:!["Off",undefined].includes(settings.rezBoost) &&
      resolveFcvCapability(profile,"rezBoost",condition).enabled,
    bottomDiscrimination:["Graphic","Probability"].includes(settings.bottomDiscrimination) &&
      resolveFcvCapability(profile,"bottomDiscrimination",condition).enabled,
    bottomDiscriminationMode:settings.bottomDiscrimination??"Off",
    bottomClassification:state.syntheticConditions?.bottomClassification??null,
  };
}

/** Return original-view pixels of synthetic 50/200 kHz data. */
export function projectFcvEcho(observation,state,{frequencyKhz=50,rows=120}={}) {
  const frame=makeEchoFrame(observation,state,{frequencyKhz,rows});
  const settings=state.settings ?? {};
  const overlays=overlaysFor(state,frequencyKhz);
  const {columns}=frame;
  const output=new Uint8Array(frame.pixels.length);
  const clutter=clamp(Number(settings.clutter ?? 0),0,100);
  const erase=clamp(Number(settings.colorErase ?? 0),0,50);
  const interference=settings.interference ?? "Auto";
  const interferenceThreshold={Off:0,Low:3,Medium:8,High:14,Auto:5}[interference] ?? 5;
  const tvg=settings.tvg ?? "Low";
  const txPower=settings.txPower??"Auto";
  const txScale=txPower==="Off"?0:
    typeof txPower==="string" && /^\d+%$/.test(txPower)
      ?clamp(Number(txPower.slice(0,-1))/100,0,1):1;
  const gainAdj=Number(settings[frequencyKhz===200?"gainAdjHF":"gainAdjLF"]??"0");
  const gainScale=clamp(1+(Number.isFinite(gainAdj)?gainAdj:0)/100,0.8,1.2);
  for(let y=0;y<rows;y++){
    const depthFraction=y/(rows-1);
    for(let x=0;x<columns;x++){
      let value=frame.pixels[y*columns+x];
      if(value<=clutter*1.25+erase*2+interferenceThreshold) value=0;
      if(tvg==="High") value=Math.round(value*(0.73+depthFraction*0.27));
      else if(tvg==="Medium") value=Math.round(value*(0.88+depthFraction*0.12));
      if(overlays.rezBoost) value=clamp(Math.round((value-25)*1.22+25),0,255);
      if(settings.zeroLineRejector==="On" && y<2)value=0;
      output[y*columns+x]=clamp(Math.round(value*txScale*gainScale),0,255);
    }
  }
  let pixels=output;
  if(settings.smoothing==="On"){
    // Per-row 1:2:1 filter is a deterministic illustrative approximation,
    // never a modification of acoustic observations or a firmware claim.
    pixels=new Uint8Array(output.length);
    for(let y=0;y<rows;y++){
      for(let x=0;x<columns;x++){
        const i=y*columns+x;
        pixels[i]=Math.round((output[y*columns+Math.max(0,x-1)]+
          output[i]*2+output[y*columns+Math.min(columns-1,x+1)])/4);
      }
    }
  }
  const projectionKey=JSON.stringify([state.rangeMode,state.rangeIndex,
    state.gainMode,state.manualGain,state.autoGainOffset,settings.clutter,
    settings.colorErase,settings.interference,settings.tvg,settings.rezBoost,
    settings.zoomMode,settings.shift,settings.smoothing,settings.txPower,
    settings.fishSymbol,settings.fishSize,settings.zoomRange,settings.blRange,
    settings.gainAdjHF,settings.gainAdjLF,settings.zeroLineRejector,
    settings.fishSizeAdjust,
    ...Array.from({length:8},(_,i)=>settings["rangePreset"+(i+1)])]);
  const fishSizeFactor=clamp(1+Number(settings.fishSizeAdjust??0)/100,0.2,2);
  const fishTargets=projectFcvFishAnnotations(observation,frame,overlays.accuFish)
    .map(marker=>({...marker,sizeCm:Math.round(marker.sizeCm*fishSizeFactor)}));
  return {...frame,pixels,synthetic:true,overlays,projectionKey,
    syntheticFish:fishTargets,
    pictureAdvance:settings.pictureAdvance ?? "1x",physicalMeasurement:false};
}

/** Bottom Lock consumes only authored per-column synthetic seabed provenance.
 * Raw pixel intensity is never used to decide whether a return is seabed. */
function bottomLockSourceAnchors(frame,observation,seabedProvenance,seabedSourceIdentity){
  if(seabedProvenance?.sourceClass!==SYNTHETIC_SEABED_PROVENANCE_SOURCE ||
      seabedSourceIdentity?.sourceClass!==SYNTHETIC_SOUNDER_SOURCE_IDENTITY ||
      seabedProvenance.scenarioId!==seabedSourceIdentity.scenarioId ||
      seabedProvenance.scenarioVersion!==seabedSourceIdentity.scenarioVersion ||
      seabedProvenance.scenarioFingerprint!==seabedSourceIdentity.scenarioFingerprint ||
      seabedProvenance.simTick!==observation?.simTick ||
      seabedProvenance.simTick!==seabedSourceIdentity.simTick ||
      seabedProvenance.sensorModelVersion!==observation?.modelVersion ||
      seabedProvenance.sensorModelVersion!==seabedSourceIdentity.sensorModelVersion ||
      seabedProvenance.latestWorldBottomDepthM!==observation?.bottomDepthM ||
      seabedProvenance.latestWorldBottomDepthM!==seabedSourceIdentity.worldBottomDepthM ||
      seabedProvenance.columns!==frame?.columns ||
      seabedProvenance.columns!==seabedSourceIdentity.columns ||
      !Array.isArray(seabedProvenance.columnBottoms) ||
      seabedProvenance.columnBottoms.length!==frame.columns ||
      !Number.isInteger(frame?.rows) || frame.rows<2 ||
      !Number.isFinite(frame.rangeM) || frame.rangeM<=0)return null;
  const start=frame.startDepthM??0;
  const anchors=new Int32Array(frame.columns).fill(-1);
  for(let x=0;x<frame.columns;x++){
    const authored=seabedProvenance.columnBottoms[x];
    const expectedTime=observation.simTick-(frame.columns-x)*SOUNDER_COLUMN_SECONDS;
    if(authored?.present!==true || !Number.isFinite(authored.depthM) ||
        !Number.isFinite(authored.sampleTime) ||
        Math.abs(authored.sampleTime-expectedTime)>1e-12)return null;
    const rawBottomRow=Math.ceil(authored.depthM/observation.maxDepthM*
      (observation.rows-1));
    let anchor=-1;
    for(let y=0;y<frame.rows;y++){
      const displayDepth=start+y/(frame.rows-1)*frame.rangeM;
      if(sounderSourceRowForDepth(observation,displayDepth)>=rawBottomRow){
        anchor=y;
        break;
      }
    }
    if(anchor<0)return null;
    anchors[x]=anchor;
  }
  return anchors;
}

/** Zoom a visual slice around the bottom or VRM using only synthetic pixels. */
export function projectFcvZoom(observation,state,{
  frequencyKhz=50,rows=120,seabedProvenance=null,seabedSourceIdentity=null
}={}) {
  const base=projectFcvEcho(observation,state,{frequencyKhz,rows});
  const zoomMode=state.settings?.zoomMode ?? "Bottom Zoom";
  const bottom=observation.bottomDepthM;
  const center=zoomMode==="Marker Zoom" ? (state.vrmDepthM ?? bottom) : bottom;
  const configured=Number(zoomMode==="Bottom Lock"
    ?state.settings?.blRange:state.settings?.zoomRange);
  const windowDepthM=Number.isFinite(configured) && configured>=2 && configured<=40
    ?configured:zoomMode==="Bottom Lock"?5:20;
  // §1.4.3 / supplied BL photos: Bottom Lock expresses distance above the
  // typed bottom, so the selected B/L range terminates at the bottom edge.
  // BZ/MZ retain their existing centered absolute-depth window semantics.
  const startDepthM=Math.max(0,center-(zoomMode==="Bottom Lock"
    ?windowDepthM:windowDepthM/2));
  const pixels=new Uint8Array(base.pixels.length);
  const lockAnchors=zoomMode==="Bottom Lock"
    ?bottomLockSourceAnchors(base,observation,seabedProvenance,seabedSourceIdentity):null;
  const lockSpanRows=windowDepthM/base.rangeM*(rows-1);
  for(let y=0;y<rows;y++){
    const depth=startDepthM+(y/(rows-1))*windowDepthM;
    const absoluteFrom=clamp(Math.round(
      ((depth-(base.startDepthM??0))/base.rangeM)*(rows-1)),0,rows-1);
    if(lockAnchors){
      const rowsAboveBottom=(1-y/(rows-1))*lockSpanRows;
      for(let x=0;x<base.columns;x++){
        const anchor=lockAnchors[x];
        const from=anchor>=0
          ?clamp(Math.round(anchor-rowsAboveBottom),0,rows-1)
          :absoluteFrom;
        pixels[y*base.columns+x]=base.pixels[from*base.columns+x];
      }
    }else{
      pixels.set(base.pixels.subarray(
        absoluteFrom*base.columns,(absoluteFrom+1)*base.columns),
      y*base.columns);
    }
  }
  const zoomFrame={...base,pixels,rangeM:windowDepthM,windowDepthM,startDepthM,zoomMode};
  return {...zoomFrame,syntheticFish:projectFcvFishAnnotations(observation,
    zoomFrame,base.overlays.accuFish)};
}
