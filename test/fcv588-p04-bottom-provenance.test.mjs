import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import * as Scenario from "../src/core/scenario.mjs";
import {initialFcv588State} from "../src/devices/fcv588/model.mjs";
import {projectFcvEcho,projectFcvZoom,advanceFcvPictureHistory} from
  "../src/devices/fcv588/echo-projection.mjs";
import {rasterizeFcvEcho} from "../web/fcv588-echo-rasterizer.mjs";
import {getFcvDisplayPalette} from "../src/devices/fcv588/display-palette.mjs";
import {createSession,dispatch,createReplayEnvelope,replay,sessionHash} from
  "../src/core/session.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {FCV588_PUBLIC_PROFILE_REVISION} from "../src/devices/fcv588/profile-version.mjs";

const digest=value=>createHash("sha256").update(value).digest("hex");
const white=getFcvDisplayPalette({palette:"White",colors:"8"});
const provenanceFor=(scenario,world,columns)=>
  typeof Scenario.projectSyntheticSeabedProvenance==="function"
    ?Scenario.projectSyntheticSeabedProvenance(scenario,world,{columns}):null;
const identityFor=(scenario,world,columns)=>
  typeof Scenario.projectSyntheticSounderSourceIdentity==="function"
    ?Scenario.projectSyntheticSounderSourceIdentity(scenario,world,{columns}):null;

function stateFor(zoomMode="Bottom Lock"){
  const state=initialFcv588State();
  state.settings={...state.settings,zoomMode,blRange:"5",zoomRange:"8",
    smoothing:"Off",clutter:"0",colorErase:"0",interference:"Off",tvg:"Low"};
  return state;
}

function manualFishOnlyObservation(){
  const columns=10,rows=81,maxDepthM=80;
  const channel=new Uint8Array(columns*rows);
  for(let x=0;x<columns;x++){
    channel[48*columns+x]=245;
    channel[49*columns+x]=190;
  }
  return {modelVersion:"P04_SOURCE_NEGATIVE",simTick:0,bottomDepthM:50,
    recommendedAutoRangeM:80,maxDepthM,syntheticTargets:[],columns,rows,
    channels:{50:channel,200:Uint8Array.from(channel)}};
}

function absoluteBottomWindow(observation,state,{frequencyKhz=50,rows=81}={}){
  const base=projectFcvEcho(observation,state,{frequencyKhz,rows});
  const bottom=observation.bottomDepthM;
  const windowDepthM=Number(state.settings.blRange);
  const startDepthM=Math.max(0,bottom-windowDepthM);
  const pixels=new Uint8Array(base.pixels.length);
  for(let y=0;y<rows;y++){
    const depth=startDepthM+y/(rows-1)*windowDepthM;
    const from=Math.max(0,Math.min(rows-1,Math.round(
      ((depth-(base.startDepthM??0))/base.rangeM)*(rows-1))));
    pixels.set(base.pixels.subarray(from*base.columns,(from+1)*base.columns),
      y*base.columns);
  }
  return pixels;
}

function deepestStrong(frame,x,threshold=150){
  let result=-1;
  for(let y=0;y<frame.rows;y++)if(frame.pixels[y*frame.columns+x]>=threshold)result=y;
  return result;
}

test("P04 provenance producer authors absent seabed for a near-bottom fish-only synthetic scenario",()=>{
  const scenario={...Scenario.TRAINING_SCENARIO,id:"p04-fish-only-source",version:1,
    bottomDepthM:50,bottomVariationM:0,syntheticBottomReturnPresent:false,
    fish:Object.freeze([Object.freeze({time:0,depthM:48,strength:1,sizeCm:30,
      syntheticCategory:"Bottom Fish"})])};
  const world={simTick:0,bottomDepthM:50};
  const noBottomLevel=Scenario.rawEchoLevel(scenario,{time:0,depthM:50,frequencyKhz:50});
  const withBottomLevel=Scenario.rawEchoLevel(
    {...scenario,syntheticBottomReturnPresent:true},{time:0,depthM:50,frequencyKhz:50});
  const fishLevel=Scenario.rawEchoLevel(scenario,{time:0,depthM:48,frequencyKhz:50});
  assert.ok(withBottomLevel>noBottomLevel,
    "source switch must remove the authored seabed contribution rather than relabel pixels");
  assert.ok(fishLevel>0.5,"fish target must remain source-generated when seabed is absent");
  const observation=Scenario.observeSounder(scenario,world,{columns:10,rows:301});
  const provenance=provenanceFor(scenario,world,10);
  const sourceIdentity=identityFor(scenario,world,10);
  assert.ok(provenance,"source companion producer is required");
  assert.equal(provenance.sourceClass,"SYNTHETIC_SCENARIO_BOTTOM_PROVENANCE_V1");
  assert.equal(provenance.simTick,observation.simTick);
  assert.equal(provenance.sensorModelVersion,observation.modelVersion);
  assert.equal(provenance.latestWorldBottomDepthM,observation.bottomDepthM);
  assert.equal(provenance.columnBottoms.length,observation.columns);
  assert.ok(provenance.columnBottoms.every(column=>column.present===false));
  const before=structuredClone(observation);
  const state=stateFor();
  const zoom=projectFcvZoom(observation,state,{frequencyKhz:50,rows:81,
    seabedProvenance:provenance,seabedSourceIdentity:sourceIdentity});
  assert.deepEqual(zoom.pixels,absoluteBottomWindow(observation,state,{rows:81}),
    "fish-only source must remain in its absolute Bottom-Lock window position");
  assert.deepEqual(observation,before,"provenance/display projection must not mutate observation");
});

test("P04 missing or spoofed bottom provenance fails closed to the absolute BL slice",()=>{
  const observation=manualFishOnlyObservation();
  const state=stateFor();
  const expected=absoluteBottomWindow(observation,state,{rows:81});
  const missing=projectFcvZoom(observation,state,{frequencyKhz:50,rows:81});
  assert.deepEqual(missing.pixels,expected);
  const validColumns=Array.from({length:10},(_,x)=>({present:true,depthM:50,
    sampleTime:observation.simTick-(observation.columns-x)*0.46}));
  const validBase={sourceClass:"SYNTHETIC_SCENARIO_BOTTOM_PROVENANCE_V1",
    sensorModelVersion:observation.modelVersion,latestWorldBottomDepthM:observation.bottomDepthM,
    simTick:0,columns:10,columnBottoms:validColumns};
  const invalid=[
    {...validBase,sourceClass:"RAW_PIXEL_GUESS"},
    {...validBase,simTick:1},
    {...validBase,columns:9},
    {...validBase,sensorModelVersion:"wrong-model"},
    {...validBase,latestWorldBottomDepthM:49},
    {...validBase,columnBottoms:validColumns.map((column,index)=>
      index===3?{...column,sampleTime:column.sampleTime+0.5}:column)},
    {...validBase,columnBottoms:validColumns.map((column,index)=>
      index===4?{...column,depthM:NaN}:column)},
  ];
  for(const seabedProvenance of invalid){
    const rejected=projectFcvZoom(observation,state,{frequencyKhz:50,rows:81,seabedProvenance});
    assert.deepEqual(rejected.pixels,expected,
      "spoofed/stale/malformed provenance must fail closed to absolute BL slice");
  }
  assert.ok(deepestStrong(missing,0)<missing.rows-2,
    "near-bottom fish must not be promoted to the BL lower edge without source provenance");
});

test("P04 two-column authored historical seabed is flattened from per-column source depth",()=>{
  const scenario={...Scenario.TRAINING_SCENARIO,id:"p04-two-column-bottom",version:1,
    bottomDepthM:50,bottomVariationM:20,syntheticBottomReturnPresent:true,fish:Object.freeze([])};
  const world={simTick:1,bottomDepthM:Scenario.bottomDepthAt(scenario,1)};
  const observation=Scenario.observeSounder(scenario,world,{columns:2,rows:301});
  const provenance=provenanceFor(scenario,world,2);
  const sourceIdentity=identityFor(scenario,world,2);
  assert.ok(provenance,"source companion producer is required");
  assert.ok(provenance.columnBottoms.every(column=>column.present===true));
  assert.notEqual(provenance.columnBottoms[0].depthM,provenance.columnBottoms[1].depthM);
  const zoom=projectFcvZoom(observation,stateFor(),{frequencyKhz:50,rows:81,
    seabedProvenance:provenance,seabedSourceIdentity:sourceIdentity});
  const anchors=[0,1].map(x=>deepestStrong(zoom,x,120));
  assert.ok(anchors.every(y=>y>=zoom.rows-3),`authored bottom did not reach BL edge: ${anchors}`);
  assert.ok(Math.max(...anchors)-Math.min(...anchors)<=1,
    `per-column authored bottom was not flattened: ${anchors}`);
});

test("P04 BZ/MZ remain byte-identical to the sealed P05/P06 canonical projection",()=>{
  const world=Scenario.advanceWorld(Scenario.TRAINING_SCENARIO,
    Scenario.initialWorldState(Scenario.TRAINING_SCENARIO),20);
  const observation=Scenario.observeSounder(Scenario.TRAINING_SCENARIO,world,
    {columns:48,rows:151});
  const state=stateFor("Bottom Zoom");
  const bottomZoom=projectFcvZoom(observation,state,{frequencyKhz:50,rows:80});
  const markerZoom=projectFcvZoom(observation,{...state,vrmDepthM:30,
    settings:{...state.settings,zoomMode:"Marker Zoom"}},{frequencyKhz:50,rows:80});
  assert.equal(digest(bottomZoom.pixels),
    "efe712c15b072f07da63487ad630ef8d5bf060ebc04db0491b925c07623132e3");
  assert.equal(digest(markerZoom.pixels),
    "3959bbf444817583042348fe3f26275c342e47c18bc3babedadb3c2394597f2a");
});

test("P04 BL picture Stop and slow history remain deterministic after source-authored flattening",()=>{
  const scenario={...Scenario.TRAINING_SCENARIO,id:"p04-history-bottom",version:1,
    syntheticBottomReturnPresent:true};
  const state=stateFor();
  const frameAt=t=>{
    const world=Scenario.advanceWorld(scenario,Scenario.initialWorldState(scenario),t);
    const observation=Scenario.observeSounder(scenario,world,{columns:24,rows:301});
    const provenance=provenanceFor(scenario,world,24);
    const sourceIdentity=identityFor(scenario,world,24);
    assert.ok(provenance);
    return projectFcvZoom(observation,state,{frequencyKhz:50,rows:81,
      seabedProvenance:provenance,seabedSourceIdentity:sourceIdentity});
  };
  const slow={...state,settings:{...state.settings,pictureAdvance:"1/4"}};
  const run=()=>{
    let history=advanceFcvPictureHistory(null,frameAt(0),slow,0);
    for(let t=1;t<=4;t++)history=advanceFcvPictureHistory(history,frameAt(t),slow,t);
    return history;
  };
  const a=run(),b=run();
  assert.equal(digest(a.pixels),digest(b.pixels));
  const stop={...state,settings:{...state.settings,pictureAdvance:"Stop"}};
  const frozen=advanceFcvPictureHistory(a,frameAt(10),stop,10);
  assert.equal(digest(frozen.pixels),digest(a.pixels));
});

test("P04 BL rasterizer never reconstructs a seabed tail from global depth alone",()=>{
  const columns=10,rows=81,pixels=new Uint8Array(columns*rows);
  for(let x=0;x<columns;x++){
    pixels[70*columns+x]=245;
    pixels[71*columns+x]=190;
  }
  const base={frequencyKhz:50,columns,rows,pixels,rangeM:5,startDepthM:45,
    bottomDepthM:50,synthetic:true,zoomMode:"Bottom Lock",overlays:{},
    projectionKey:"p04-fish-only-bl"};
  const withGlobal=rasterizeFcvEcho(base,white,{clutterPct:0});
  const withoutGlobal=rasterizeFcvEcho({...base,bottomDepthM:undefined},white,{clutterPct:0});
  assert.equal(digest(withGlobal.data),digest(withoutGlobal.data),
    "BL raster art must not infer bottom from fish pixels plus a single global depth");
});

test("P04 companion provenance stays outside observation, replay and profile21 contracts",()=>{
  const observation=Scenario.observeSounder(Scenario.TRAINING_SCENARIO,
    Scenario.initialWorldState(Scenario.TRAINING_SCENARIO),{columns:12,rows:61});
  assert.deepEqual(Object.keys(observation).sort(),[
    "bottomDepthM","channels","columns","maxDepthM","modelVersion",
    "recommendedAutoRangeM","rows","simTick","syntheticTargets",
  ]);
  assert.equal(Scenario.SENSOR_MODEL_VERSION,"fcv588-sonar-illustrative-v1");
  assert.equal(adapter.revision,FCV588_PUBLIC_PROFILE_REVISION);
  assert.equal(FCV588_PUBLIC_PROFILE_REVISION,"F1-public-reference-22");
  let session=createSession(adapter,Scenario.TRAINING_SCENARIO);
  session=dispatch(session,adapter,{kind:"tick",steps:2},Scenario.TRAINING_SCENARIO);
  const envelope=createReplayEnvelope(session);
  assert.equal(sessionHash(replay(adapter,Scenario.TRAINING_SCENARIO,envelope)),sessionHash(session));
  assert.equal(Object.hasOwn(envelope,"seabedProvenance"),false);
});

test("P04 runtime wires companion metadata beside, not into, the cached observation",async()=>{
  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  assert.match(app,/cachedSeabedProvenance\s*=\s*projectSyntheticSeabedProvenance/);
  assert.match(app,/cachedSeabedSourceIdentity\s*=\s*projectSyntheticSounderSourceIdentity/);
  assert.match(app,/projectFcvZoom\(observation, state,\s*\{frequencyKhz,seabedProvenance,seabedSourceIdentity,\s*displayContract:"P23_LOWER_BOTTOM"\}\)/);
  assert.doesNotMatch(app,/cachedObservation\s*=\s*\{[^}]*seabedProvenance/s,
    "companion provenance must not silently extend the sensor observation schema");
});
