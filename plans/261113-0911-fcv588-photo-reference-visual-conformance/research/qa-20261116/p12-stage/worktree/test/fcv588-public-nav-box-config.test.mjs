import test from "node:test";
import assert from "node:assert/strict";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";
import {createSession,dispatch,replay,sessionHash,createReplayEnvelope} from
  "../src/core/session.mjs";
import * as Menu from "../src/devices/fcv588/menu-atlas.mjs";
import {projectFcvManualNavBoxes} from "../src/devices/fcv588/navigation.mjs";
import {distanceNmBetween} from "../src/devices/fcv588/navigation.mjs";
import {encodeFcvSettings,decodeFcvSettings,validateFcvSettings} from
  "../src/devices/fcv588/settings.mjs";

const send=(s,e)=>dispatch(s,adapter,e,TRAINING_SCENARIO);
const key=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
function boot(){let s=createSession(adapter,TRAINING_SCENARIO);for(const e of [
  {kind:"down",control:"power"},{kind:"up",control:"power",durationMs:100},
  {kind:"tick",steps:4}])s=send(s,e);return s;}
function openNavBoxes(s,mode){
  if(s.deviceState.overlay?.kind!=="menu")s=key(s,"menu");
  for(let i=0;s.deviceState.overlay.category!=="Data"&&i<5;i++)s=pad(s,"right");
  const index=Menu.getFcvMenuItems("Data",s.deviceState).findIndex(x=>
    x.id==="data."+mode.toLowerCase());
  assert.ok(index>=0);
  for(let i=0;s.deviceState.overlay.itemIndex!==index&&i<20;i++)s=pad(s,"down");
  s=key(s,"enter");
  assert.equal(s.deviceState.overlay?.kind,"nav-boxes");
  assert.equal(s.deviceState.overlay?.mode,mode);
  return s;
}

test("C11 manual §1.21 NAV1/2 expose four individually configured editable operator boxes",()=>{
  assert.ok(Array.isArray(Menu.FCV_NAV_BOX_OPTIONS));
  assert.ok(Menu.FCV_NAV_BOX_OPTIONS.includes("TEMPERATURE"));
  assert.ok(Menu.FCV_NAV_BOX_OPTIONS.includes("WIND"));
  assert.equal(Menu.getFcvMenuItems("Data").find(x=>x.id==="data.nav1").kind,"action");
  assert.equal(Menu.getFcvMenuItems("Data").find(x=>x.id==="data.nav2").kind,"action");
  const s=boot();
  assert.deepEqual([1,2,3,4].map(i=>s.deviceState.settings["nav1Box"+i]),
    ["SPEED (STW)","WIND","Off","Off"]);
  assert.deepEqual([1,2,3,4].map(i=>s.deviceState.settings["nav2Box"+i]),
    ["DEPTH","TEMPERATURE","TRIP","ODOMETER"]);
  assert.equal(openNavBoxes(s,"NAV1").deviceState.overlay.kind,"nav-boxes");
});

test("C11 NAV1 add third box stages/cancels then commits and changes actual projected boxes",()=>{
  let s=openNavBoxes(boot(),"NAV1");
  for(let i=0;i<2;i++)s=pad(s,"down");
  assert.equal(s.deviceState.overlay.itemIndex,2);
  s=key(s,"enter");
  s=pad(s,"right");
  assert.equal(s.deviceState.settings.nav1Box3,"Off");
  s=key(s,"menu");
  assert.equal(s.deviceState.overlay.kind,"nav-boxes");
  assert.equal(s.deviceState.settings.nav1Box3,"Off");
  s=key(s,"enter");s=pad(s,"right");s=key(s,"enter");
  assert.equal(s.deviceState.settings.nav1Box3,"DEPTH");
  const nav=projectFcvManualNavBoxes({mode:"NAV1",settings:s.deviceState.settings,
    sample:null,sonarDepthM:49.6});
  assert.deepEqual(nav.boxes.map(b=>b.label),["SPEED (STW)","WIND","DEPTH"]);
  assert.match(nav.boxes[2].value,/49\.6.*SIM/);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
  assert.deepEqual(decodeFcvSettings(encodeFcvSettings(s.deviceState.settings)),
    s.deviceState.settings);
});

test("C11 NAV2 operator can change a box to STW, with missing source explicitly NO DATA",()=>{
  let s=openNavBoxes(boot(),"NAV2");
  s=key(s,"enter");s=pad(s,"right");s=key(s,"enter");
  assert.equal(s.deviceState.settings.nav2Box1,"SPEED (STW)");
  const projected=projectFcvManualNavBoxes({mode:"NAV2",settings:s.deviceState.settings,
    sample:null,sonarDepthM:49.6});
  assert.equal(projected.boxes[0].label,"SPEED (STW)");
  assert.equal(projected.boxes[0].value,"NO DATA");
  assert.throws(()=>validateFcvSettings({...s.deviceState.settings,
    nav2Box1:"GPS ACTUAL"}),/invalid/);
});

test("C11 RANGE box uses only an active synthetic waypoint and fresh ownship, with source-safe negative states",()=>{
  let s=boot();
  s=send(s,{kind:"training-fixture",fixture:"navigation",enabled:true});
  s=key(s,"mark");
  assert.equal(s.deviceState.navigation.waypoints.length,1);
  s=send(s,{kind:"tick",steps:20});
  s=key(s,"menu");
  for(let i=0;s.deviceState.overlay.category!=="Data"&&i<7;i++)s=pad(s,"right");
  const destinationEntry=Menu.getFcvMenuItems("Data",s.deviceState)
    .findIndex(item=>item.id==="data.destination");
  for(let i=0;s.deviceState.overlay.itemIndex!==destinationEntry&&i<20;i++)s=pad(s,"down");
  s=key(s,"enter");
  assert.equal(s.deviceState.overlay.purpose,"destination");
  s=pad(s,"down");
  s=key(s,"enter");
  assert.equal(s.deviceState.navigation.destinationId,"WP001");
  const worldBefore=s.worldState;
  s=openNavBoxes(s,"NAV2");
  s=pad(s,"down");s=pad(s,"down");
  s=key(s,"enter");
  for(let i=0;s.deviceState.overlay.draftValue!=="RANGE"&&i<30;i++)s=pad(s,"right");
  assert.equal(s.deviceState.overlay.draftValue,"RANGE");
  s=key(s,"enter");
  assert.equal(s.deviceState.settings.nav2Box3,"RANGE");
  assert.deepEqual(s.worldState,worldBefore,
    "changing a NAV display box cannot move the classroom ownship");
  const project=(session,overrides={})=>projectFcvManualNavBoxes({
    mode:"NAV2",sample:session.deviceState.navigationObservation,
    navState:session.deviceState.navigation,settings:session.deviceState.settings,
    simTick:session.worldState.simTick,...overrides});
  const expected=distanceNmBetween(s.deviceState.navigationObservation.position,
    s.deviceState.navigation.waypoints[0].position);
  assert.ok(expected>0);
  const visible=project(s);
  assert.equal(visible.boxes[2].label,"RANGE");
  assert.equal(visible.boxes[2].value,expected.toFixed(2)+" nm (SIM)",
    "range to selected virtual destination must be observable on NAV2");
  assert.equal(project(s,{distanceUnit:"km"}).boxes[2].value,
    (expected*1.852).toFixed(2)+" km (SIM)",
    "changing units must convert a synthetic destination range, not its world position");
  assert.equal(project(s,{simTick:s.worldState.simTick+12}).boxes[2].value,"NO DATA");
  assert.equal(project(s,{navState:{...s.deviceState.navigation,destinationId:null}})
    .boxes[2].value,"NO DATA");
  assert.equal(project(s,{sample:{...s.deviceState.navigationObservation,
    position:{...s.deviceState.navigationObservation.position,source:"UNKNOWN"}}})
    .boxes[2].value,"NO DATA");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});

test("C11 POSITION NAV box uses S/W hemispheres for negative typed synthetic latitude and longitude",()=>{
  const s=boot();
  const position={source:"SYNTHETIC_FIXTURE",lat:-12.5,lon:-45.125};
  const sample={observedAtTick:10,position};
  const settings={...s.deviceState.settings,nav2Box1:"POSITION"};
  const project=(observation,simTick=10)=>projectFcvManualNavBoxes({
    mode:"NAV2",settings,sample:observation,simTick,
  });
  assert.equal(project(sample).boxes[0].value,"SIM 12.5000°S 45.1250°W",
    "the visible hemisphere must agree with a valid negative synthetic position");
  assert.equal(project({...sample,position:{...position,lat:14.25,lon:104.5}})
    .boxes[0].value,"SIM 14.2500°N 104.5000°E");
  assert.equal(project(sample,21).boxes[0].value,"NO DATA",
    "stale synthetic coordinates must not remain in the live NAV box");
  assert.equal(project({...sample,position:{...position,source:"NMEA"}})
    .boxes[0].value,"NO DATA",
    "a differently sourced position is not a typed instructor fixture");
});

test("C11 TIME TO GO is a visible source-gated synthetic destination estimate, never an NMEA substitute",()=>{
  let s=boot();
  s=send(s,{kind:"training-fixture",fixture:"navigation",enabled:true});
  s=key(s,"mark");
  assert.equal(s.deviceState.navigation.waypoints.length,1);
  // Use the same operator-facing destination menu instead of silently
  // injecting a waypoint as a sensor or physical navigation receiver.
  s=key(s,"menu");
  for(let i=0;s.deviceState.overlay.category!=="Data"&&i<7;i++)s=pad(s,"right");
  const destinationEntry=Menu.getFcvMenuItems("Data",s.deviceState)
    .findIndex(item=>item.id==="data.destination");
  for(let i=0;s.deviceState.overlay.itemIndex!==destinationEntry&&i<20;i++)s=pad(s,"down");
  s=key(s,"enter");s=pad(s,"down");s=key(s,"enter");
  assert.equal(s.deviceState.navigation.destinationId,"WP001");
  s=send(s,{kind:"tick",steps:20});
  const originalWorld=s.worldState;
  s=openNavBoxes(s,"NAV2");
  s=pad(s,"down");s=pad(s,"down");s=key(s,"enter");
  for(let i=0;s.deviceState.overlay.draftValue!=="TIME TO GO"&&i<30;i++)s=pad(s,"right");
  assert.equal(s.deviceState.overlay.draftValue,"TIME TO GO");
  s=key(s,"enter");
  assert.equal(s.deviceState.settings.nav2Box3,"TIME TO GO");
  const opts={mode:"NAV2",simTick:s.worldState.simTick,
    navState:s.deviceState.navigation,settings:s.deviceState.settings,
    sample:s.deviceState.navigationObservation};
  const render=(change={})=>projectFcvManualNavBoxes({...opts,...change});
  const visible=render().boxes[2];
  assert.equal(visible.label,"TIME TO GO");
  assert.match(visible.value,/^\d\d:\d\d \(SIM EST\)$/,
    "own synthetic distance/speed must produce an actual visible estimated time");
  assert.equal(render({settings:{...opts.settings,speedSource:"NMEA"}}).boxes[2].value,
    "NO DATA","without a receiver NMEA speed must not borrow Own estimate");
  assert.equal(render({sample:{...opts.sample,speedKn:0}}).boxes[2].value,
    "NO DATA","zero speed cannot yield finite arrival time");
  assert.equal(render({simTick:opts.simTick+11}).boxes[2].value,
    "NO DATA","stale position cannot keep a future time estimate");
  assert.equal(render({navState:{...opts.navState,destinationId:null}}).boxes[2].value,
    "NO DATA","destination must be explicitly selected");
  assert.equal(render({sample:{...opts.sample,
    position:{...opts.sample.position,source:"UNKNOWN"}}}).boxes[2].value,
    "NO DATA","untyped/external position must never be treated as a fixture");
  assert.deepEqual(s.worldState,originalWorld,
    "changing TIME TO GO display settings cannot modify the shared world");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});
