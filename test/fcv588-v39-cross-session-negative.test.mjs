import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {
  createSession,dispatch,reset,replay,sessionHash,createReplayEnvelope
} from "../src/core/session.mjs";
import {fingerprint} from "../src/core/protocol.mjs";
import {getFcvMenuItems,getInstallationMenu} from "../src/devices/fcv588/menu-atlas.mjs";
import {
  encodeFcvSettings,decodeFcvSettings,decodeFcvProfile19Settings
} from "../src/devices/fcv588/settings.mjs";
import {projectFcvTrainingReceiver} from "../src/devices/fcv588/receiver-status.mjs";
import {projectFcvInstructorSourceMatrix,projectFcvInstructorSourceTransition} from
  "../web/fcv588-training-source-matrix.mjs";

// Source-bounded OFFLINE contract tests; not physical OEM firmware equivalence.
// All sequence transitions are canonical session inputs, never real sensor I/O.
const send=(s,event)=>dispatch(s,adapter,event,scenario);
const press=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
const fixture=(s,name,enabled)=>send(s,{kind:"training-fixture",fixture:name,enabled});
const tick=(s,steps=1)=>send(s,{kind:"tick",steps});
const matrix=s=>Object.fromEntries(projectFcvInstructorSourceMatrix(
  s.deviceState,s.worldState.simTick).rows.map(row=>[row.id,row]));
const sha=value=>createHash("sha256").update(value).digest("hex");
function assertReplay(s){
  const played=replay(adapter,scenario,createReplayEnvelope(s));
  assert.equal(sessionHash(played),sessionHash(s));
  assert.deepEqual(matrix(played),matrix(s));
}
function boot(s=createSession(adapter,scenario)){
  s=send(s,{kind:"down",control:"power"});
  s=send(s,{kind:"up",control:"power",durationMs:100});
  s=tick(s,4);
  assert.equal(s.deviceState.power,"on");
  return s;
}
function freshNav(){
  let s=boot();
  s=fixture(s,"navigation",true);
  return tick(s,1);
}
function mark(s,count=1){
  for(let n=0;n<count;n++)s=press(s,"mark");
  return s;
}
function openRow(s,category,id){
  for(let i=0;s.deviceState.overlay && i<8;i++)s=press(s,"menu");
  assert.equal(s.deviceState.overlay,null,"begin from menu-free state");
  s=press(s,"menu");
  for(let i=0;s.deviceState.overlay.category!==category&&i<7;i++)
    s=pad(s,"right");
  assert.equal(s.deviceState.overlay.category,category);
  const entries=getFcvMenuItems(category,s.deviceState);
  const wanted=entries.findIndex(row=>row.id===id);
  assert.ok(wanted>=0,"required operator row: "+id);
  for(let i=0;i<wanted;i++)s=pad(s,"down");
  assert.equal(entries[s.deviceState.overlay.itemIndex].id,id);
  return s;
}
function openDeleteAll(s){
  s=press(openRow(s,"Data","data.deleteAllWaypoint"),"enter");
  assert.equal(s.deviceState.overlay.kind,"confirm-delete-all-waypoints");
  assert.equal(s.deviceState.overlay.confirm,false);
  return s;
}
function setDestination(s,index=1){
  s=press(openRow(s,"Data","data.destination"),"enter");
  assert.equal(s.deviceState.overlay.kind,"waypoints");
  for(let i=0;i<index;i++)s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.navigation.destinationId,
    index===0?null:"WP"+String(index).padStart(3,"0"));
  return s;
}
function setSource(s,key){
  s=press(openRow(s,"Data","data."+key),"enter");
  assert.equal(s.deviceState.overlay.editing,true);
  s=pad(s,"right");
  assert.equal(s.deviceState.overlay.draftValue,"NMEA");
  s=press(s,"enter");
  assert.equal(s.deviceState.settings[key],"NMEA");
  return s;
}
function enableTankenmaru(s){
  s=fixture(s,"tankenmaruOption",true);
  s=press(openRow(s,"System","system.tankenmaru"),"enter");
  assert.equal(s.deviceState.overlay.draftValue,"Off");
  s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.settings.tankenmaru,"On");
  return s;
}

test("V39 C11: Delete All with a selected destination remains atomic through POWER-suspended confirmation",()=>{
  let s=mark(freshNav(),2);
  s=setDestination(s,2);
  const saved=structuredClone(s.deviceState.navigation);
  const world=structuredClone(s.worldState);
  s=openDeleteAll(s);
  s=pad(s,"right");
  assert.equal(s.deviceState.overlay.confirm,true);
  s=send(s,{kind:"down",control:"power"});
  s=send(s,{kind:"ui-tick",elapsedMs:1100});
  assert.equal(s.deviceState.overlay.kind,"power-hold");
  assert.equal(s.deviceState.overlay.priorOverlay.confirm,true);
  s=send(s,{kind:"cancel",control:"power"});
  assert.equal(s.deviceState.overlay.kind,"confirm-delete-all-waypoints");
  assert.deepEqual(s.deviceState.navigation,saved);
  s=press(s,"menu");
  assert.deepEqual(s.deviceState.navigation,saved,"MENU aborts staged delete");
  s=openDeleteAll(s);
  s=pad(s,"right");
  s=press(s,"enter");
  assert.deepEqual(s.deviceState.navigation,saved,
    "even a confirmed Delete All must reject an active destination");
  assert.match(s.deviceState.notice,/DESTINATION PROTECTED/);
  assert.deepEqual(s.worldState,world,"menu and UI clock must not mutate world");
  assertReplay(s);
});

test("V39 C11: Delete All NO/MENU/POWER OFF cancel; after GO TO Off numbering never reuses waypoint IDs",()=>{
  let s=mark(freshNav(),2);
  const initial=structuredClone(s.deviceState.navigation);
  s=openDeleteAll(s);
  s=press(s,"enter"); // default NO
  assert.deepEqual(s.deviceState.navigation,initial);
  s=openDeleteAll(s);
  s=pad(s,"right"); // YES staged
  s=send(s,{kind:"down",control:"power"});
  s=send(s,{kind:"up",control:"power",durationMs:3001});
  assert.equal(s.deviceState.power,"off");
  assert.equal(s.deviceState.overlay,null);
  assert.deepEqual(s.deviceState.navigation,initial);
  s=boot(s);
  s=openDeleteAll(s);
  s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.navigation.waypoints.length,0);
  assert.equal(s.deviceState.navigation.nextWaypointNumber,3,
    "deleting points must not recycle event-log waypoint identity");
  s=press(s,"mark");
  assert.deepEqual(s.deviceState.navigation.waypoints.map(w=>w.id),["WP003"]);
  assert.equal(matrix(s).C11.status,"NO_DESTINATION");
  assertReplay(s);
});

test("V39 D14: NMEA draft survives short POWER cancel only as draft; POWER OFF discards it",()=>{
  let s=freshNav();
  const original={...s.deviceState.settings};
  s=press(openRow(s,"Data","data.speedSource"),"enter");
  s=pad(s,"right");
  assert.equal(s.deviceState.overlay.draftValue,"NMEA");
  s=send(s,{kind:"down",control:"power"});
  s=send(s,{kind:"ui-tick",elapsedMs:1100});
  s=send(s,{kind:"cancel",control:"power"});
  assert.equal(s.deviceState.overlay.editing,true);
  assert.equal(s.deviceState.overlay.draftValue,"NMEA");
  assert.deepEqual(s.deviceState.settings,original);
  s=press(s,"menu");
  assert.deepEqual(s.deviceState.settings,original);
  s=press(openRow(s,"Data","data.tempSource"),"enter");
  s=pad(s,"right");
  s=send(s,{kind:"down",control:"power"});
  s=send(s,{kind:"up",control:"power",durationMs:3001});
  assert.equal(s.deviceState.power,"off");
  assert.equal(s.deviceState.overlay,null);
  assert.deepEqual(s.deviceState.settings,original);
  s=boot(s);
  s=setSource(s,"speedSource");
  assert.equal(projectFcvTrainingReceiver(s.deviceState,s.worldState.simTick)
    .selectedSources.speedStatus,"NO_EXTERNAL_RECEIVER");
  assert.equal(projectFcvTrainingReceiver(s.deviceState,s.worldState.simTick)
    .transport,"NONE");
  assertReplay(s);
});

test("V39 D09/D14: virtual option excludes NMEA rows but never changes stored NMEA source choice",()=>{
  let s=freshNav();
  for(const key of ["speedSource","tempSource","tripSource"])s=setSource(s,key);
  const stored=encodeFcvSettings(s.deviceState.settings);
  const beforeSource=matrix(s).D14;
  assert.match(beforeSource.details,/NMEA không có đầu thu/);
  s=enableTankenmaru(s);
  assert.equal(matrix(s).D14.status,"INACTIVE_TANKENMARU");
  assert.equal(matrix(s).D09.status,"VIRTUAL_OPTION_REFERENCE");
  assert.ok(!getFcvMenuItems("System",s.deviceState).some(
    row=>["system.nmea","system.receiverStatus"].includes(row.id)));
  assert.ok(!getInstallationMenu(s.deviceState).some(row=>row.settingKey==="nmea"));
  const savedNmea=s.deviceState.settings;
  s=fixture(s,"tankenmaruOption",false);
  assert.equal(s.deviceState.settings.tankenmaru,"Off");
  assert.equal(s.deviceState.settings.speedSource,savedNmea.speedSource);
  assert.equal(s.deviceState.settings.tempSource,savedNmea.tempSource);
  assert.equal(s.deviceState.settings.tripSource,savedNmea.tripSource);
  assert.ok(getInstallationMenu(s.deviceState).some(row=>row.settingKey==="nmea"));
  assert.equal(matrix(s).D14.status,"SYNTHETIC_TRAINING_OBSERVATION");
  assert.match(matrix(s).D14.details,/NMEA không có đầu thu/);
  assert.equal(projectFcvTrainingReceiver(s.deviceState,s.worldState.simTick)
    .transport,"NONE");
  s=fixture(s,"tankenmaruOption",true);
  assert.equal(s.deviceState.settings.tankenmaru,"Off",
    "regrant alone must not resurrect On");
  assert.deepEqual(decodeFcvSettings(stored).speedSource,"NMEA");
  assertReplay(s);
});

const legacyRaw=await readFile(new URL("./fixtures/fcv588-v30-profile19-settings.json",
  import.meta.url),"utf8");
const legacyReplay=await readFile(new URL("./fixtures/fcv588-v30-profile19-replay.json",
  import.meta.url),"utf8");

test("V39 legacy profile19: explicit settings import preserves validated NMEA choices, strips virtual entitlement",()=>{
  assert.equal(sha(legacyRaw),
    "f14235c481a35c5e2af2118729dcfd51c3eb2039bdec739047ba9e5b7e00f111");
  assert.equal(decodeFcvSettings(legacyRaw),null,
    "ordinary profile20 decoder must not silently migrate old bytes");
  const {contentFingerprint,...body}=JSON.parse(legacyRaw);
  const modified={...body,settings:{...body.settings,
    speedSource:"NMEA",tempSource:"NMEA",tripSource:"NMEA",tankenmaru:"On"}};
  const imported=decodeFcvProfile19Settings(JSON.stringify({
    ...modified,contentFingerprint:fingerprint(modified)
  }));
  assert.ok(imported);
  assert.equal(imported.tankenmaru,"On","import parses committed preference only");
  let s=createSession(adapter,scenario);
  s=send(s,{kind:"restore-settings",settings:imported});
  assert.equal(s.deviceState.settings.tankenmaru,"Off",
    "no virtual grant inferred from historical preference");
  assert.equal(s.deviceState.trainingFixture.tankenmaruOption,false);
  assert.deepEqual([
    s.deviceState.settings.speedSource,
    s.deviceState.settings.tempSource,
    s.deviceState.settings.tripSource
  ],["NMEA","NMEA","NMEA"]);
  assert.equal(matrix(s).C11.status,"DEVICE_OFF");
  assert.ok(getInstallationMenu(s.deviceState).some(row=>row.settingKey==="nmea"));
  s=boot(s);
  assert.throws(()=>send(s,{kind:"restore-settings",settings:imported}),
    /restore-settings only during off\/startup/,
    "cannot inject storage restore into a live device session");
  assert.equal(projectFcvTrainingReceiver(s.deviceState,s.worldState.simTick)
    .physicalReceiverConnected,false);
  assert.equal(projectFcvTrainingReceiver(s.deviceState,s.worldState.simTick)
    .transport,"NONE");
  const encoded=encodeFcvSettings(s.deviceState.settings);
  assert.deepEqual(decodeFcvSettings(encoded),s.deviceState.settings);
  let resetState=reset(adapter,scenario);
  resetState=send(resetState,{kind:"restore-settings",
    settings:decodeFcvSettings(encoded)});
  assert.equal(resetState.deviceState.settings.tankenmaru,"Off");
  assert.equal(resetState.deviceState.trainingFixture.tankenmaruOption,false);
  assert.equal(resetState.deviceState.settings.speedSource,"NMEA");
  assertReplay(s);
  assertReplay(resetState);
});

test("V39 archived replay/profile is rejected even with a valid explicit settings import",()=>{
  assert.equal(sha(legacyReplay),
    "adb919e666598127b2f76e284a0ba4dea4506ae15eac11535574ac562297bf4c");
  assert.throws(()=>replay(adapter,scenario,JSON.parse(legacyReplay)),
    /contract|profile/,
    "settings importer must never become implicit replay migration");
  const {contentFingerprint,...legacy}=JSON.parse(legacyRaw);
  const changed={...legacy,settings:{...legacy.settings,
    speedSource:"NMEA",trainingFixture:{tankenmaruOption:true}}};
  assert.equal(decodeFcvProfile19Settings(JSON.stringify({
    ...changed,contentFingerprint:fingerprint(changed)})),null,
    "recomputed fingerprint cannot authorize an unsupported option grant");
  assert.equal(decodeFcvProfile19Settings(legacyRaw)?.tankenmaru,"On");
});

test("V39 no source event that only changes teacher projection may mutate world clock",()=>{
  let s=freshNav();
  const before=structuredClone(s.worldState);
  const previous=projectFcvInstructorSourceMatrix(
    s.deviceState,s.worldState.simTick).rows;
  s=fixture(s,"navigation",false);
  assert.deepEqual(s.worldState,before);
  const next=projectFcvInstructorSourceMatrix(
    s.deviceState,s.worldState.simTick).rows;
  const transition=projectFcvInstructorSourceTransition(previous,next);
  assert.ok(transition && transition.statuses.some(st=>st==="D14:NO_TRAINING_DATA"));
  assert.equal(projectFcvInstructorSourceTransition(next,next),null);
  assert.equal(projectFcvTrainingReceiver(s.deviceState,s.worldState.simTick)
    .transport,"NONE");
  assertReplay(s);
});
