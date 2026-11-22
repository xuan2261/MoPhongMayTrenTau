import test from "node:test";
import assert from "node:assert/strict";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";
import {createSession,dispatch,createReplayEnvelope,replay,sessionHash} from "../src/core/session.mjs";
import {getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";

const send=(s,input)=>dispatch(s,adapter,input,TRAINING_SCENARIO);
const press=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
const boot=()=>{
  let s=createSession(adapter,TRAINING_SCENARIO);
  for(const input of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:110},{kind:"tick",steps:4},
    {kind:"training-fixture",fixture:"navigation",enabled:true}])s=send(s,input);
  return s;
};
function selectData(s,id){
  if(s.deviceState.overlay?.kind!=="menu")s=press(s,"menu");
  for(let n=0;s.deviceState.overlay.category!=="Data"&&n<6;n++)s=pad(s,"right");
  assert.equal(s.deviceState.overlay.category,"Data");
  const target=getFcvMenuItems("Data",s.deviceState).findIndex(x=>x.id===id);
  assert.ok(target>=0,id);
  for(let n=0;s.deviceState.overlay.itemIndex!==target&&n<15;n++)s=pad(s,"down");
  assert.equal(s.deviceState.overlay.itemIndex,target);
  return press(s,"enter");
}

test("manual §1.20 WPT List opens waypoint fields, and TrackPad name editor commits deterministically",()=>{
  let s=press(boot(),"mark");
  const initial=s.deviceState.navigation.waypoints[0];
  s=selectData(s,"data.waypoint");
  assert.equal(s.deviceState.overlay?.kind,"waypoints");
  assert.equal(s.deviceState.overlay?.purpose,"edit");
  s=press(s,"enter");
  assert.equal(s.deviceState.overlay?.kind,"waypoint-detail");
  assert.equal(s.deviceState.navigation.destinationId,null,
    "WPT List is NOT the same action as Go to WPT");
  s=press(s,"enter");
  assert.equal(s.deviceState.overlay?.kind,"waypoint-name");
  s=pad(s,"up");
  s=press(s,"enter");
  assert.equal(s.deviceState.navigation.waypoints[0].name,"NARK 1");
  assert.equal(s.deviceState.navigation.destinationId,null);
  assert.notEqual(initial.name,s.deviceState.navigation.waypoints[0].name);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),
    sessionHash(s));
});

test("deletion needs confirmation and the currently selected destination is protected",()=>{
  let s=press(boot(),"mark");
  s=press(s,"mark");
  s=selectData(s,"data.waypoint");
  s=press(s,"enter");
  s=pad(s,"down");
  s=press(s,"enter");
  assert.equal(s.deviceState.overlay?.kind,"confirm-waypoint-delete");
  s=press(s,"enter");
  assert.equal(s.deviceState.navigation.waypoints.length,2,"NO must never delete");
  s=press(s,"enter"); // from list -> detail
  s=pad(s,"down");
  s=press(s,"enter");
  s=pad(s,"right"); // YES
  s=press(s,"enter");
  assert.equal(s.deviceState.navigation.waypoints.length,1);
  assert.equal(s.deviceState.navigation.waypoints[0].id,"WP002");

  s=selectData(s,"data.destination");
  assert.equal(s.deviceState.overlay?.purpose,"destination");
  s=pad(s,"down"); // OFF -> WP002
  s=press(s,"enter");
  assert.equal(s.deviceState.navigation.destinationId,"WP002");
  s=selectData(s,"data.waypoint");
  s=press(s,"enter");
  s=pad(s,"down");
  s=press(s,"enter");
  s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.navigation.waypoints.length,1,
    "FCV manual forbids erasing the active destination");
  assert.match(s.deviceState.notice,/DESTINATION.*PROTECTED/i);
});

test("Go to WPT Off clears destination and Delete All WPT confirmation clears unprotected points",()=>{
  let s=press(boot(),"mark");
  s=press(s,"mark");
  s=selectData(s,"data.destination");
  s=pad(s,"down");
  s=press(s,"enter");
  assert.equal(s.deviceState.navigation.destinationId,"WP001");
  s=selectData(s,"data.deleteAllWaypoint");
  s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.navigation.waypoints.length,2,
    "Delete All cannot erase an active destination");
  s=selectData(s,"data.destination");
  s=press(s,"enter"); // OFF
  assert.equal(s.deviceState.navigation.destinationId,null);
  s=selectData(s,"data.deleteAllWaypoint");
  s=press(s,"enter"); // default NO
  assert.equal(s.deviceState.navigation.waypoints.length,2);
  s=selectData(s,"data.deleteAllWaypoint");
  s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.navigation.waypoints.length,0);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),
    sessionHash(s));
});
