import test from "node:test";
import assert from "node:assert/strict";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {createSession,dispatch,createReplayEnvelope,replay,sessionHash} from
  "../src/core/session.mjs";
import {getFcvMenuItems,getInstallationMenu} from
  "../src/devices/fcv588/menu-atlas.mjs";
import {projectFcvManualNavBoxes} from "../src/devices/fcv588/navigation.mjs";
import {projectFcvTrainingReceiver} from
  "../src/devices/fcv588/receiver-status.mjs";
import {projectFcvTankenmaruTrainingStatus} from
  "../src/devices/fcv588/tankenmaru-status.mjs";
import {projectFcvInstructorSourceMatrix} from
  "../web/fcv588-training-source-matrix.mjs";

// V37 source-bounded, OFFLINE cross-feature negative vectors.
// No vessel equipment, serial transport, external GPS or OEM signoff.
const send=(s,event)=>dispatch(s,adapter,event,scenario);
const press=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
const fixture=(s,name,enabled)=>send(s,{kind:"training-fixture",fixture:name,enabled});
const tick=(s,steps=1)=>send(s,{kind:"tick",steps});
const rows=s=>Object.fromEntries(projectFcvInstructorSourceMatrix(
  s.deviceState,s.worldState.simTick).rows.map(row=>[row.id,row]));

function boot(s=createSession(adapter,scenario)){
  s=send(s,{kind:"down",control:"power"});
  s=send(s,{kind:"up",control:"power",durationMs:120});
  s=tick(s,4);
  assert.equal(s.deviceState.power,"on");
  return s;
}
function inMenu(s,category,id){
  for(let n=0;s.deviceState.overlay && n<8;n++)s=press(s,"menu");
  assert.equal(s.deviceState.overlay,null,"start a fresh transaction");
  s=press(s,"menu");
  for(let n=0;s.deviceState.overlay.category!==category&&n<7;n++)
    s=pad(s,"right");
  assert.equal(s.deviceState.overlay.category,category);
  const index=getFcvMenuItems(category,s.deviceState)
    .findIndex(row=>row.id===id);
  assert.ok(index>=0,"expected source-scoped row "+id);
  for(let n=0;n<index;n++)s=pad(s,"down");
  assert.equal(getFcvMenuItems(category,s.deviceState)[
    s.deviceState.overlay.itemIndex].id,id);
  return s;
}
function chooseNext(s,category,id){
  s=press(inMenu(s,category,id),"enter");
  assert.equal(s.deviceState.overlay.editing,true,id);
  s=pad(s,"right");
  return press(s,"enter");
}
function replayMatches(s){
  const re=replay(adapter,scenario,createReplayEnvelope(s));
  assert.equal(sessionHash(re),sessionHash(s));
  assert.deepEqual(rows(re),rows(s),"D15 readback must survive replay");
}

test("V37 C11: premature MARK cannot invent position; committed synthetic waypoint uses Own only",()=>{
  let s=createSession(adapter,scenario);
  s=press(s,"mark"); // intentionally out of order: POWER OFF
  assert.equal(s.deviceState.navigation.waypoints.length,0);
  assert.equal(rows(s).C11.status,"DEVICE_OFF");
  s=boot(s);
  s=press(s,"mark"); // power on, but no teacher source
  assert.equal(s.deviceState.navigation.waypoints.length,0);
  assert.match(s.deviceState.notice,/NO POSITION/);
  s=fixture(s,"navigation",true);
  s=tick(s);
  const world=s.worldState;
  s=press(s,"mark");
  assert.equal(s.deviceState.navigation.waypoints.length,1);
  assert.equal(s.deviceState.navigation.waypoints[0].position.source,
    "SYNTHETIC_FIXTURE");
  assert.deepEqual(s.worldState,world,"MARK cannot alter world truth");
  s=press(inMenu(s,"Data","data.destination"),"enter");
  assert.equal(s.deviceState.overlay.kind,"waypoints");
  s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.navigation.destinationId,"WP001");
  assert.equal(rows(s).C11.status,"SYNTHETIC_DESTINATION_READY");
  const sample=s.deviceState.navigationObservation;
  const settings={...s.deviceState.settings,nav2Box1:"RANGE",
    nav2Box2:"TIME TO GO"};
  const nav=projectFcvManualNavBoxes({mode:"NAV2",sample,settings,
    navState:s.deviceState.navigation,simTick:s.worldState.simTick});
  assert.match(nav.boxes[0].value,/SIM/);
  assert.match(nav.boxes[1].value,/SIM EST/);
  replayMatches(s);
});

test("V37 C11/D14: NMEA selected after destination cannot borrow Own ETA or live speed",()=>{
  let s=boot();
  s=fixture(s,"navigation",true);
  s=tick(s);
  s=press(s,"mark");
  s=press(inMenu(s,"Data","data.destination"),"enter");
  s=pad(s,"right");
  s=press(s,"enter");
  const ownRange=()=>projectFcvManualNavBoxes({mode:"NAV2",
    sample:s.deviceState.navigationObservation,navState:s.deviceState.navigation,
    settings:{...s.deviceState.settings,nav2Box1:"RANGE",
      nav2Box2:"TIME TO GO"},simTick:s.worldState.simTick}).boxes;
  assert.match(ownRange()[1].value,/SIM EST/);
  s=chooseNext(s,"Data","data.speedSource"); // Own -> absent NMEA
  assert.equal(s.deviceState.settings.speedSource,"NMEA");
  assert.match(ownRange()[0].value,/SIM/,"waypoint range uses typed position");
  assert.equal(ownRange()[1].value,"NO DATA",
    "Own speed cannot produce a route ETA under NMEA selection");
  const rx=projectFcvTrainingReceiver(s.deviceState,s.worldState.simTick);
  assert.equal(rx.transport,"NONE");
  assert.equal(rx.physicalReceiverConnected,false);
  assert.equal(rx.selectedSources.speedStatus,"NO_EXTERNAL_RECEIVER");
  assert.match(rows(s).D14.details,/Speed: NMEA/);
  replayMatches(s);
});

test("V37 D09: revoke suspended edit and regrant cannot revive RF or a draft",()=>{
  let s=boot();
  s=fixture(s,"navigation",true);
  s=tick(s);
  s=fixture(s,"tankenmaruOption",true);
  s=chooseNext(s,"System","system.tankenmaru");
  assert.equal(s.deviceState.settings.tankenmaru,"On");
  assert.equal(rows(s).D09.status,"VIRTUAL_OPTION_REFERENCE");
  assert.equal(rows(s).D14.status,"INACTIVE_TANKENMARU");
  assert.equal(projectFcvTankenmaruTrainingStatus(s.deviceState).transport,"NONE");
  assert.equal(projectFcvTankenmaruTrainingStatus(s.deviceState).transmissionAllowed,false);
  const count=s.deviceState.navigation.waypoints.length;
  s=press(s,"mark");
  assert.equal(s.deviceState.navigation.waypoints.length,count);
  assert.match(s.deviceState.notice,/MARK DISABLED/);
  assert.ok(!getFcvMenuItems("System",s.deviceState)
    .some(row=>row.id==="system.receiverStatus"));
  assert.ok(!getInstallationMenu(s.deviceState)
    .some(row=>row.settingKey==="nmea"));
  s=press(inMenu(s,"System","system.tankenmaru"),"enter");
  s=pad(s,"right"); // Off, not yet saved
  assert.equal(s.deviceState.overlay.draftValue,"Off");
  s=send(s,{kind:"down",control:"power"});
  assert.equal(s.deviceState.overlay.kind,"power-hold");
  s=fixture(s,"tankenmaruOption",false);
  assert.equal(s.deviceState.overlay.priorOverlay.editing,false);
  assert.equal(s.deviceState.overlay.priorOverlay.draftValue,null);
  s=send(s,{kind:"cancel",control:"power"});
  s=fixture(s,"tankenmaruOption",true);
  assert.equal(s.deviceState.settings.tankenmaru,"Off");
  assert.equal(s.deviceState.overlay.editing,false);
  assert.equal(rows(s).D09.status,"DECLARED_BUT_OFF");
  assert.notEqual(rows(s).D14.status,"INACTIVE_TANKENMARU");
  assert.ok(getInstallationMenu(s.deviceState)
    .some(row=>row.settingKey==="nmea"));
  replayMatches(s);
});

test("V37 D14: three NMEA preferences survive power cycle but never imply a receiver",()=>{
  let s=boot();
  s=fixture(s,"navigation",true);
  s=tick(s);
  for(const key of ["tripSource","tempSource","speedSource"])
    s=chooseNext(s,"Data","data."+key);
  const before={...s.deviceState.settings};
  let rx=projectFcvTrainingReceiver(s.deviceState,s.worldState.simTick);
  assert.deepEqual([rx.selectedSources.trip,rx.selectedSources.temperature,
    rx.selectedSources.speed],["NMEA","NMEA","NMEA"]);
  assert.deepEqual([rx.selectedSources.tripStatus,rx.selectedSources.tempStatus,
    rx.selectedSources.speedStatus],
    ["NO_EXTERNAL_RECEIVER","NO_EXTERNAL_RECEIVER","NO_EXTERNAL_RECEIVER"]);
  assert.equal(rx.transport,"NONE");
  s=send(s,{kind:"down",control:"power"});
  s=send(s,{kind:"up",control:"power",durationMs:3001});
  assert.equal(s.deviceState.power,"off");
  assert.equal(rows(s).D14.status,"DEVICE_OFF");
  s=boot(s);
  assert.deepEqual(s.deviceState.settings,before);
  rx=projectFcvTrainingReceiver(s.deviceState,s.worldState.simTick);
  assert.equal(rx.transport,"NONE");
  assert.equal(rx.physicalReceiverConnected,false);
  assert.equal(rx.selectedSources.speedStatus,"NO_EXTERNAL_RECEIVER");
  assert.equal(rows(s).D14.details.includes("NMEA không có đầu thu"),true);
  const future={...s.deviceState,navigationObservation:{
    ...s.deviceState.navigationObservation,observedAtTick:s.worldState.simTick+1}};
  assert.equal(projectFcvTrainingReceiver(future,s.worldState.simTick).status,
    "STALE_TRAINING_DATA");
  replayMatches(s);
});
