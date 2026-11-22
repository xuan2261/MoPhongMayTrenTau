import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO,observeTrainingStatus} from "../src/core/scenario.mjs";
import {createSession,dispatch,replay,createReplayEnvelope,sessionHash} from
  "../src/core/session.mjs";
import {getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";
import {projectFcvDisplayWidgets,projectFcvZoomWindowMarker} from
  "../src/devices/fcv588/display-widgets.mjs";
import {projectFcvZoom} from "../src/devices/fcv588/echo-projection.mjs";
import {observeSounder} from "../src/core/scenario.mjs";

const send=(s,e)=>dispatch(s,adapter,e,TRAINING_SCENARIO);
const key=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
function boot(){
  let s=createSession(adapter,TRAINING_SCENARIO);
  for(const e of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},
    {kind:"tick",steps:4}])s=send(s,e);
  return s;
}
function openDisplay(s,id){
  if(s.deviceState.overlay?.kind!=="menu")s=key(s,"menu");
  for(let i=0;s.deviceState.overlay.category!=="Display"&&i<5;i++)s=pad(s,"right");
  const index=getFcvMenuItems("Display",s.deviceState).findIndex(x=>x.id===id);
  assert.ok(index>=0,id);
  for(let i=0;s.deviceState.overlay.itemIndex!==index&&i<30;i++)s=pad(s,"down");
  return key(s,"enter");
}

test("B18 supplemental Display controls have source-graded options and no orphan editable switches",()=>{
  const items=getFcvMenuItems("Display",boot().deviceState);
  assert.deepEqual(items.find(x=>x.id==="display.tempGraph")?.choices,
    ["Off","Narrow","Wide"]);
  assert.equal(items.find(x=>x.id==="display.windowSize")?.kind,"action");
  assert.deepEqual(items.find(x=>x.id==="display.battery")?.choices,["Off","On"]);
  assert.deepEqual(items.find(x=>x.id==="display.headerInfo")?.choices,["Off","On"]);
});

test("B18 Temp Graph only draws typed instructor water temperature, with NO DATA otherwise",()=>{
  let s=boot();
  let settings={...s.deviceState.settings,tempGraph:"Narrow"};
  let state={...s.deviceState,settings};
  const absent=projectFcvDisplayWidgets(state,null,s.worldState.simTick);
  assert.equal(absent.tempGraph.status,"NO_DATA");
  s=send(s,{kind:"training-fixture",fixture:"navigation",enabled:true});
  s=send(s,{kind:"tick",steps:1});
  settings={...s.deviceState.settings,tempGraph:"Narrow"};
  state={...s.deviceState,settings};
  const shown=projectFcvDisplayWidgets(state,s.deviceState.navigationObservation,
    s.worldState.simTick);
  assert.equal(shown.tempGraph.status,"SYNTHETIC_DATA");
  assert.equal(shown.tempGraph.sourceClass,"SYNTHETIC_FIXTURE");
  assert.ok(shown.tempGraph.samples.length>=16);
  assert.ok(shown.tempGraph.samples.every(n=>Number.isFinite(n)));
  assert.deepEqual(shown,projectFcvDisplayWidgets(state,
    s.deviceState.navigationObservation,s.worldState.simTick));
  const wider=projectFcvDisplayWidgets({...state,settings:{...settings,
    tempGraph:"Wide"}},s.deviceState.navigationObservation,s.worldState.simTick);
  assert.ok(wider.tempGraph.scaleSpanC>shown.tempGraph.scaleSpanC);
  assert.equal(projectFcvDisplayWidgets({...state,settings:{...settings,
    tempGraph:"Off"}},s.deviceState.navigationObservation,s.worldState.simTick).tempGraph,null);
});

test("B18 supplemental graph cannot promote an out-of-range synthetic position into a live Own source",()=>{
  let s=boot();
  s=send(s,{kind:"training-fixture",fixture:"navigation",enabled:true});
  s=send(s,{kind:"tick",steps:1});
  const state={...s.deviceState,settings:{...s.deviceState.settings,
    tempGraph:"Narrow",navData:"Expanded",tempSource:"Own",speedSource:"Own"}};
  const valid=s.deviceState.navigationObservation;
  const live=projectFcvDisplayWidgets(state,valid,s.worldState.simTick);
  assert.equal(live.tempGraph.status,"SYNTHETIC_DATA");
  assert.equal(live.navData.status,"SYNTHETIC_DATA");
  for(const position of [
    {source:"SYNTHETIC_FIXTURE",lat:91,lon:20},
    {source:"SYNTHETIC_FIXTURE",lat:11,lon:-181},
    {source:"EXTERNAL_NMEA",lat:11,lon:20},
  ]){
    const projected=projectFcvDisplayWidgets(state,{...valid,position},
      s.worldState.simTick);
    assert.equal(projected.tempGraph.status,"NO_DATA",
      "invalid or external-only navigation samples cannot authorize Own temperature");
    assert.deepEqual(projected.tempGraph.samples,[]);
    assert.equal(projected.navData.status,"NO_DATA");
  }
  assert.equal(projectFcvDisplayWidgets(state,{...valid,observedAtTick:
    s.worldState.simTick-11},s.worldState.simTick).tempGraph.status,"NO_DATA");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s),
    "display-only validation must not rewrite any canonical operator event");
});

test("B18 Nav Data and Battery widgets display source status without inventing position or voltage",()=>{
  let s=boot();
  const initial={...s.deviceState,settings:{...s.deviceState.settings,
    navData:"Expanded",battery:"On"}};
  const unavailable=projectFcvDisplayWidgets(initial,null,s.worldState.simTick);
  assert.equal(unavailable.navData.status,"NO_DATA");
  assert.equal(unavailable.battery.status,"NO_HARDWARE_DATA");
  assert.match(unavailable.battery.label,/NO DATA|SIM/i);
  s=send(s,{kind:"training-fixture",fixture:"navigation",enabled:true});
  s=send(s,{kind:"tick",steps:1});
  const expanded=projectFcvDisplayWidgets({...s.deviceState,
    settings:{...s.deviceState.settings,navData:"Expanded"}},
    s.deviceState.navigationObservation,s.worldState.simTick);
  assert.equal(expanded.navData.status,"SYNTHETIC_DATA");
  assert.ok(expanded.navData.boxes.length>=3);
  assert.match(expanded.navData.boxes[0].value,/SIM/);
  const basic=projectFcvDisplayWidgets({...s.deviceState,
    settings:{...s.deviceState.settings,navData:"Basic"}},
    s.deviceState.navigationObservation,s.worldState.simTick);
  assert.ok(basic.navData.boxes.length<expanded.navData.boxes.length);
});

test("B18 supplemental Temp Graph and NAV speed honor §1.21 source selection instead of leaking Own data into NMEA",()=>{
  let s=boot();
  s=send(s,{kind:"training-fixture",fixture:"navigation",enabled:true});
  s=send(s,{kind:"tick",steps:1});
  const own={...s.deviceState,settings:{...s.deviceState.settings,
    tempGraph:"Narrow",navData:"Expanded",speedSource:"Own",tempSource:"Own"}};
  const fromOwn=projectFcvDisplayWidgets(own,
    s.deviceState.navigationObservation,s.worldState.simTick);
  assert.equal(fromOwn.tempGraph.status,"SYNTHETIC_DATA");
  assert.match(fromOwn.navData.boxes.find(b=>b.label==="SPEED").value,/SIM/);
  const disconnected={...own,settings:{...own.settings,
    speedSource:"NMEA",tempSource:"NMEA"}};
  const nmea=projectFcvDisplayWidgets(disconnected,
    s.deviceState.navigationObservation,s.worldState.simTick);
  assert.equal(nmea.tempGraph.status,"NO_DATA");
  assert.equal(nmea.navData.boxes.find(b=>b.label==="SPEED").value,"NO DATA");
  assert.match(nmea.navData.boxes.find(b=>b.label==="POSITION").value,/SIM/,
    "independent typed classroom position may remain visible without speed");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});

test("B18 supplemental NAV speed follows configured §2.5 units without changing sensor truth",()=>{
  let s=boot();
  s=send(s,{kind:"training-fixture",fixture:"navigation",enabled:true});
  s=send(s,{kind:"tick",steps:1});
  const initialHash=sessionHash(s);
  const sample=s.deviceState.navigationObservation;
  const settings={...s.deviceState.settings,navData:"Expanded",speedUnit:"km/h"};
  const p=projectFcvDisplayWidgets({...s.deviceState,settings},sample,s.worldState.simTick);
  assert.equal(p.navData.status,"SYNTHETIC_DATA");
  assert.equal(p.navData.boxes.find(b=>b.label==="SPEED").value,"13.0 km/h (SIM)",
    "typed 7 kn source must display 12.964 km/h rounded to 13.0");
  assert.equal(projectFcvDisplayWidgets({...s.deviceState,settings:{...settings,
    speedUnit:"mph"}},sample,s.worldState.simTick)
    .navData.boxes.find(b=>b.label==="SPEED").value,"8.1 mph (SIM)");
  assert.equal(sample.speedKn,7);
  assert.equal(sessionHash(s),initialHash);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),initialHash);
});

test("B18 expanded NAV widget masks invalid negative synthetic speed without hiding valid position",()=>{
  let s=boot();
  s=send(s,{kind:"training-fixture",fixture:"navigation",enabled:true});
  s=send(s,{kind:"tick",steps:1});
  const state={...s.deviceState,settings:{...s.deviceState.settings,
    navData:"Expanded",speedSource:"Own"}};
  const sample={...s.deviceState.navigationObservation,speedKn:-9};
  const result=projectFcvDisplayWidgets(state,sample,s.worldState.simTick);
  assert.equal(result.navData.status,"SYNTHETIC_DATA",
    "the typed position remains independently valid");
  assert.equal(result.navData.boxes.find(b=>b.label==="SPEED").value,"NO DATA");
  assert.match(result.navData.boxes.find(b=>b.label==="POSITION").value,/SIM/);
});

test("B18 Zoom Marker brackets the actual active zoom window and does not exist on NAV/single views",()=>{
  const base={rangeM:80,startDepthM:0};
  const zoom={rangeM:20,startDepthM:30};
  const state={...boot().deviceState,mode:"LF-ZOOM",settings:{
    ...boot().deviceState.settings,zoomMarker:"On"}};
  assert.deepEqual(projectFcvZoomWindowMarker(state,base,zoom),{
    topFraction:0.375,bottomFraction:0.625,sourceClass:"SYNTHETIC_DISPLAY_ONLY"});
  assert.equal(projectFcvZoomWindowMarker({...state,mode:"LF"},base,zoom),null);
  assert.equal(projectFcvZoomWindowMarker({...state,settings:{...state.settings,
    zoomMarker:"Off"}},base,zoom),null);
});

test("B18 Window Size acts only on split display, with staged TrackPad edit/cancel/replay",()=>{
  let s=boot();
  assert.equal(getFcvMenuItems("Display",s.deviceState).find(x=>
    x.id==="display.windowSize")?.disabled,true);
  s=send(s,{kind:"rotate",control:"mode",steps:1});
  s=send(s,{kind:"ui-tick",elapsedMs:6000});
  assert.equal(s.deviceState.mode,"DUAL");
  assert.equal(getFcvMenuItems("Display",s.deviceState).find(x=>
    x.id==="display.windowSize")?.disabled,false);
  s=openDisplay(s,"display.windowSize");
  assert.equal(s.deviceState.overlay?.kind,"window-size");
  const initial=s.deviceState.settings.windowRatio;
  s=pad(s,"right");
  assert.equal(s.deviceState.settings.windowRatio,initial,"draft is staged");
  s=key(s,"menu");
  assert.equal(s.deviceState.settings.windowRatio,initial,"cancel discards draft");
  s=openDisplay(s,"display.windowSize");
  s=pad(s,"right");
  s=key(s,"enter");
  assert.equal(s.deviceState.settings.windowRatio,"55");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});

test("B13 Zoom Range and B/L Range alter synthetic depth windows without mutating raw sonar",()=>{
  const s=boot();
  const observed=observeSounder(TRAINING_SCENARIO,s.worldState,{columns:30,rows:100});
  const state={...s.deviceState,mode:"LF-ZOOM",settings:{
    ...s.deviceState.settings,zoomMode:"Bottom Zoom",zoomRange:"5"}};
  const narrow=projectFcvZoom(observed,state,{rows:60});
  assert.equal(narrow.windowDepthM,5);
  const wider=projectFcvZoom(observed,{...state,settings:{...state.settings,
    zoomRange:"40"}},{rows:60});
  assert.equal(wider.windowDepthM,40);
  const lock=projectFcvZoom(observed,{...state,settings:{...state.settings,
    zoomMode:"Bottom Lock",blRange:"8"}},{rows:60});
  assert.equal(lock.windowDepthM,8);
  assert.ok(Math.abs(lock.startDepthM+lock.windowDepthM-observed.bottomDepthM)<1e-9,
    "Bottom Lock window must terminate at the typed bottom, matching the 2016 BL photos");
  const lock5=projectFcvZoom(observed,{...state,settings:{...state.settings,
    zoomMode:"Bottom Lock",blRange:"5"}},{rows:60});
  assert.equal(lock5.windowDepthM,5);
  assert.ok(Math.abs(lock5.startDepthM+lock5.windowDepthM-observed.bottomDepthM)<1e-9);
  assert.deepEqual(observed,observeSounder(TRAINING_SCENARIO,s.worldState,
    {columns:30,rows:100}));
});

test("supplemental LCD features are actually consumed by Canvas/DOM rendering",async()=>{
  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  for(const marker of ["projectFcvDisplayWidgets","projectFcvZoomWindowMarker",
    "tempGraph.samples","navData.boxes","planFcvScreenLayout"]){
    assert.ok(app.includes(marker),marker+" must alter active projection, not just a menu value");
  }
  const layout=await readFile(new URL("../src/devices/fcv588/display-layout.mjs",
    import.meta.url),"utf8");
  assert.match(layout,/windowRatio/,
    "the shared pane-layout helper must consume the committed Window Size setting");
});
