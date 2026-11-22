import test from "node:test";
import assert from "node:assert/strict";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {createSession,dispatch,replay,reset,createReplayEnvelope,sessionHash} from
  "../src/core/session.mjs";
import {getFcvMenuItems,getInstallationMenu} from
  "../src/devices/fcv588/menu-atlas.mjs";
import {projectFcvManualNavBoxes} from
  "../src/devices/fcv588/navigation.mjs";
import {projectFcvTrainingReceiver} from
  "../src/devices/fcv588/receiver-status.mjs";
import {projectFcvTankenmaruTrainingStatus} from
  "../src/devices/fcv588/tankenmaru-status.mjs";
import {projectFcvInstructorSourceMatrix} from
  "../web/fcv588-training-source-matrix.mjs";

// V38: source-bounded OFFLINE negative vectors; not an installed OEM firmware
// oracle. Input flows below use canonical session events, not fabricated
// sensorObservation injected through external device APIs.
const send=(s,event)=>dispatch(s,adapter,event,scenario);
const press=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
const tick=(s,steps=1)=>send(s,{kind:"tick",steps});
const fixture=(s,name,enabled)=>send(s,{kind:"training-fixture",fixture:name,enabled});
const readRows=s=>Object.fromEntries(projectFcvInstructorSourceMatrix(
  s.deviceState,s.worldState.simTick).rows.map(row=>[row.id,row]));

function boot(s=createSession(adapter,scenario)){
  s=send(s,{kind:"down",control:"power"});
  s=send(s,{kind:"up",control:"power",durationMs:130});
  s=tick(s,4);
  assert.equal(s.deviceState.power,"on");
  return s;
}
function openRow(s,category,id){
  for(let n=0;s.deviceState.overlay&&n<8;n++)s=press(s,"menu");
  assert.equal(s.deviceState.overlay,null);
  s=press(s,"menu");
  for(let n=0;s.deviceState.overlay.category!==category&&n<6;n++)
    s=pad(s,"right");
  assert.equal(s.deviceState.overlay.category,category);
  const entries=getFcvMenuItems(category,s.deviceState);
  const target=entries.findIndex(e=>e.id===id);
  assert.ok(target>=0,"missing source-backed menu id "+id);
  for(let n=0;n<target;n++)s=pad(s,"down");
  assert.equal(s.deviceState.overlay.itemIndex,target);
  return s;
}
function marked(){
  let s=boot();
  s=fixture(s,"navigation",true);
  s=tick(s,1);
  s=press(s,"mark");
  assert.equal(s.deviceState.navigation.waypoints.length,1);
  assert.equal(s.deviceState.navigation.waypoints[0].id,"WP001");
  return s;
}
function destination(s,id="WP001"){
  s=press(openRow(s,"Data","data.destination"),"enter");
  assert.equal(s.deviceState.overlay.kind,"waypoints");
  if(id!==null)s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.navigation.destinationId,id);
  return s;
}
function waypointDetail(s){
  s=press(openRow(s,"Data","data.waypoint"),"enter");
  assert.equal(s.deviceState.overlay.kind,"waypoints");
  s=press(s,"enter");
  assert.equal(s.deviceState.overlay.kind,"waypoint-detail");
  return s;
}
function assertReplay(s){
  const restored=replay(adapter,scenario,createReplayEnvelope(s));
  assert.equal(sessionHash(restored),sessionHash(s));
  assert.deepEqual(readRows(restored),readRows(s));
}

test("V38 C11 name editor cancels without commit, then explicit save survives replay",()=>{
  let s=waypointDetail(marked());
  const before=structuredClone(s.deviceState.navigation);
  s=press(s,"enter");
  assert.equal(s.deviceState.overlay.kind,"waypoint-name");
  s=pad(s,"up");
  const draft=s.deviceState.overlay.draftName;
  assert.notEqual(draft,before.waypoints[0].name);
  s=press(s,"menu");
  assert.equal(s.deviceState.overlay.kind,"waypoint-detail");
  assert.deepEqual(s.deviceState.navigation,before,
    "MENU/ESC in editor cannot write pending waypoint name");
  s=press(s,"enter");
  assert.equal(s.deviceState.overlay.draftName,before.waypoints[0].name);
  s=pad(s,"up");
  s=press(s,"enter");
  assert.equal(s.deviceState.navigation.waypoints[0].name,draft);
  assert.equal(s.deviceState.overlay.kind,"waypoints");
  assert.equal(s.deviceState.navigation.waypoints[0].position.source,
    "SYNTHETIC_FIXTURE");
  assertReplay(s);
});

test("V38 C11 protected destination refuses waypoint deletion until GO TO cleared",()=>{
  let s=destination(marked());
  const saved=structuredClone(s.deviceState.navigation);
  s=waypointDetail(s);
  s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.overlay.kind,"confirm-waypoint-delete");
  assert.equal(s.deviceState.overlay.confirm,false);
  s=press(s,"enter"); // no confirmation
  assert.equal(s.deviceState.overlay.kind,"waypoints");
  assert.deepEqual(s.deviceState.navigation,saved);
  s=press(s,"enter");
  s=pad(s,"right");
  s=press(s,"enter");
  s=pad(s,"right");
  s=press(s,"enter"); // confirm, but current destination is protected
  assert.equal(s.deviceState.navigation.destinationId,"WP001");
  assert.equal(s.deviceState.navigation.waypoints.length,1);
  assert.match(s.deviceState.notice,/DESTINATION PROTECTED/);
  s=destination(s,null);
  s=waypointDetail(s);
  s=pad(s,"right");
  s=press(s,"enter");
  s=pad(s,"right");
  s=press(s,"enter"); // exact same delete now valid
  assert.equal(s.deviceState.navigation.destinationId,null);
  assert.equal(s.deviceState.navigation.waypoints.length,0);
  assertReplay(s);
});

test("V38 C11 power-off drops an uncommitted name; cancel of POWER preserves editor without saving",()=>{
  let s=waypointDetail(marked());
  s=press(s,"enter");
  s=pad(s,"up");
  const before=s.deviceState.navigation.waypoints[0].name;
  const pending=s.deviceState.overlay.draftName;
  assert.notEqual(before,pending);
  s=send(s,{kind:"down",control:"power"});
  assert.equal(s.deviceState.overlay.kind,"power-hold");
  s=send(s,{kind:"ui-tick",elapsedMs:1200});
  s=send(s,{kind:"cancel",control:"power"});
  assert.equal(s.deviceState.overlay.kind,"waypoint-name");
  assert.equal(s.deviceState.overlay.draftName,pending);
  assert.equal(s.deviceState.navigation.waypoints[0].name,before);
  s=send(s,{kind:"down",control:"power"});
  s=send(s,{kind:"up",control:"power",durationMs:3001});
  assert.equal(s.deviceState.power,"off");
  assert.equal(s.deviceState.overlay,null);
  assert.equal(s.deviceState.navigation.waypoints[0].name,before);
  s=boot(s);
  assert.equal(s.deviceState.overlay,null);
  assert.equal(s.deviceState.navigation.waypoints[0].name,before);
  assertReplay(s);
});

test("V38 C11 MARK has 20-waypoint limit; teacher reset removes fixtures and waypoints",()=>{
  let s=marked();
  const world=structuredClone(s.worldState);
  for(let i=1;i<20;i++)s=press(s,"mark");
  assert.equal(s.deviceState.navigation.waypoints.length,20);
  assert.equal(s.deviceState.navigation.waypoints.at(-1).id,"WP020");
  const capped=s.deviceState.navigation;
  s=press(s,"mark");
  assert.equal(s.deviceState.navigation,capped,
    "a rejected 21st MARK cannot mutate waypoint state");
  assert.match(s.deviceState.notice,/waypoint limit 20/);
  assert.deepEqual(s.worldState,world,"MARK events do not advance world clock");
  assertReplay(s);
  const fresh=reset(adapter,scenario);
  assert.equal(fresh.deviceState.navigation.waypoints.length,0);
  assert.equal(fresh.deviceState.navigation.destinationId,null);
  assert.equal(fresh.deviceState.trainingFixture.navigation,false);
  assert.equal(readRows(fresh).C11.status,"DEVICE_OFF");
});

test("V38 D09 details close on option revoke even under POWER wrapper; no NMEA/RF resurrects",()=>{
  let s=boot();
  s=fixture(s,"tankenmaruOption",true);
  s=press(openRow(s,"System","system.tankenmaru"),"enter");
  s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.settings.tankenmaru,"On");
  s=press(openRow(s,"System","system.tankenmaruDetails"),"enter");
  assert.equal(s.deviceState.overlay.kind,"tankenmaru-details");
  assert.equal(projectFcvTankenmaruTrainingStatus(s.deviceState).transmissionAllowed,false);
  s=send(s,{kind:"down",control:"power"});
  assert.equal(s.deviceState.overlay.kind,"power-hold");
  s=fixture(s,"tankenmaruOption",false);
  assert.equal(s.deviceState.overlay.priorOverlay.kind,"menu",
    "lost virtual entitlement closes a suspended option detail view");
  s=send(s,{kind:"cancel",control:"power"});
  s=fixture(s,"tankenmaruOption",true);
  assert.equal(s.deviceState.settings.tankenmaru,"Off");
  assert.notEqual(s.deviceState.overlay?.kind,"tankenmaru-details");
  assert.ok(getInstallationMenu(s.deviceState).some(e=>e.settingKey==="nmea"));
  assert.equal(projectFcvTankenmaruTrainingStatus(s.deviceState).transport,"NONE");
  assert.equal(projectFcvTrainingReceiver(s.deviceState,s.worldState.simTick).transport,"NONE");
  assertReplay(s);
});

test("V38 D14/C11 bad-time, wrong-source, invalid-lat and NMEA cannot leak Own fields or ETA",()=>{
  const s=destination(marked());
  const tickNow=s.worldState.simTick;
  const base=s.deviceState;
  const pos=base.navigationObservation.position;
  const active={...base,settings:{...base.settings,nav2Box1:"POSITION",
    nav2Box2:"TIME TO GO"},navigationObservation:{
      ...base.navigationObservation,position:pos,observedAtTick:tickNow}};
  const nav=(state)=>projectFcvManualNavBoxes({
    mode:"NAV2",sample:state.navigationObservation,navState:state.navigation,
    settings:state.settings,simTick:tickNow});
  assert.equal(projectFcvTrainingReceiver(active,tickNow).status,
    "SYNTHETIC_TRAINING_OBSERVATION");
  assert.match(nav(active).boxes[0].value,/SIM/);
  assert.match(nav(active).boxes[1].value,/SIM EST/);
  const variants=[
    {name:"future observedAtTick",sample:{...active.navigationObservation,
      observedAtTick:tickNow+1},receiver:"STALE_TRAINING_DATA"},
    {name:"stale observedAtTick",sample:{...active.navigationObservation,
      observedAtTick:tickNow-11},receiver:"STALE_TRAINING_DATA"},
    {name:"non-synthetic origin",sample:{...active.navigationObservation,
      position:{...pos,source:"REAL_GPS"}},receiver:"NO_TRAINING_DATA"},
    {name:"invalid latitude",sample:{...active.navigationObservation,
      position:{...pos,lat:91}},receiver:"NO_TRAINING_DATA"},
    {name:"missing observation",sample:null,receiver:"NO_TRAINING_DATA"},
  ];
  for(const variant of variants){
    const state={...active,navigationObservation:variant.sample};
    assert.equal(projectFcvTrainingReceiver(state,tickNow).status,
      variant.receiver,variant.name);
    const view=nav(state);
    assert.equal(view.boxes[0].value,"NO DATA",variant.name+" position");
    assert.equal(view.boxes[1].value,"NO DATA",variant.name+" ETA");
  }
  const nmea={...active,settings:{...active.settings,speedSource:"NMEA",
    tempSource:"NMEA",tripSource:"NMEA"}};
  const rx=projectFcvTrainingReceiver(nmea,tickNow);
  assert.equal(rx.transport,"NONE");
  assert.equal(rx.physicalReceiverConnected,false);
  assert.equal(rx.speedKn,null);
  assert.deepEqual([rx.selectedSources.speedStatus,rx.selectedSources.tempStatus,
    rx.selectedSources.tripStatus],Array(3).fill("NO_EXTERNAL_RECEIVER"));
  assert.equal(nav(nmea).boxes[1].value,"NO DATA","No receiver ETA");
  assertReplay(s);
});

test("V38 protocol rejects out-of-order power edges without corrupting replay",()=>{
  const s=marked();
  const digest=sessionHash(s);
  assert.throws(()=>send(s,{kind:"up",control:"power",durationMs:3001}),
    /release without press edge/);
  assert.throws(()=>send(s,{kind:"cancel",control:"power"}),
    /cancel without press edge/);
  assert.equal(sessionHash(s),digest);
  assertReplay(s);
});
