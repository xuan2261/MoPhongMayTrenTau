import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";
import {createSession,dispatch,replay,createReplayEnvelope,sessionHash} from
  "../src/core/session.mjs";
import {getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";
import {projectFcvTrainingReceiver} from "../src/devices/fcv588/receiver-status.mjs";
const send=(s,e)=>dispatch(s,adapter,e,TRAINING_SCENARIO);
const press=(s,k)=>send(s,{kind:"press",control:k});
const pad=(s,d)=>send(s,{kind:"pad",control:"trackpad",direction:d});
function boot(){let s=createSession(adapter,TRAINING_SCENARIO);for(const e of [
  {kind:"down",control:"power"},{kind:"up",control:"power",durationMs:100},
  {kind:"tick",steps:4}])s=send(s,e);return s;}
function choose(s,id){if(s.deviceState.overlay?.kind!=="menu")s=press(s,"menu");
  while(s.deviceState.overlay.category!=="System")s=pad(s,"right");
  const idx=getFcvMenuItems("System",s.deviceState).findIndex(x=>x.id===id);
  assert.ok(idx>=0,id);while(s.deviceState.overlay.itemIndex!==idx)s=pad(s,"down");
  return press(s,"enter");}

test("D14 real receiver stays disconnected; status defaults to NO DATA",()=>{
  const s=boot();
  const result=projectFcvTrainingReceiver(s.deviceState,s.worldState.simTick);
  assert.equal(result.status,"NO_TRAINING_DATA");
  assert.equal(result.transport,"NONE");
  assert.equal(result.physicalReceiverConnected,false);
  assert.equal(result.hardwareValidated,false);
  assert.equal(result.sourceClass,"SIMULATED_ONLY");
  assert.deepEqual(getFcvMenuItems("System",s.deviceState).find(x=>
    x.id==="system.nmea").choices,["Off"]);
});

test("D14 typed D15 ownship appears only as fresh synthetic training receive data",()=>{
  let s=boot();
  s=send(s,{kind:"training-fixture",fixture:"navigation",enabled:true});
  s=send(s,{kind:"tick",steps:1});
  const seen=projectFcvTrainingReceiver(s.deviceState,s.worldState.simTick);
  assert.equal(seen.status,"SYNTHETIC_TRAINING_OBSERVATION");
  assert.match(seen.positionText,/SIM/);
  assert.equal(seen.transport,"NONE");
  assert.equal(seen.physicalReceiverConnected,false);
  const stale=projectFcvTrainingReceiver(s.deviceState,s.worldState.simTick+12);
  assert.equal(stale.status,"STALE_TRAINING_DATA");
  s=send(s,{kind:"training-fixture",fixture:"navigation",enabled:false});
  assert.equal(projectFcvTrainingReceiver(s.deviceState,s.worldState.simTick).status,
    "NO_TRAINING_DATA");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});

test("D14 receiver projection shares NAV hemisphere/range validity and never accepts fake real fixes",()=>{
  const s=boot();
  const current={...s.deviceState,trainingFixture:{
    ...s.deviceState.trainingFixture,navigation:true},
    navigationObservation:{observedAtTick:24,
      position:{source:"SYNTHETIC_FIXTURE",lat:-12.5,lon:-45.125},
      speedKn:5.25,temperatureC:23}};
  const projected=projectFcvTrainingReceiver(current,24);
  assert.equal(projected.status,"SYNTHETIC_TRAINING_OBSERVATION");
  assert.equal(projected.positionText,"SIM 12.5000°S 45.1250°W",
    "receiver modal must show the same hemisphere-safe coordinate as NAV");
  assert.equal(projected.selectedSources.speedStatus,"SYNTHETIC_OWN");
  const stale=projectFcvTrainingReceiver(current,35);
  assert.equal(stale.status,"STALE_TRAINING_DATA");
  assert.equal(stale.positionText,"NO DATA");
  for(const position of [
    {source:"SYNTHETIC_FIXTURE",lat:91,lon:20},
    {source:"SYNTHETIC_FIXTURE",lat:12,lon:181},
    {source:"SYNTHETIC_FIXTURE",lat:-91,lon:-181},
    {source:"EXTERNAL_NMEA",lat:-12.5,lon:-45.125},
  ]){
    const invalid=projectFcvTrainingReceiver({...current,
      navigationObservation:{...current.navigationObservation,position}},24);
    assert.equal(invalid.status,"NO_TRAINING_DATA",
      "out-of-range or untyped data cannot become a valid receiver fix");
    assert.equal(invalid.positionText,"NO DATA");
    assert.equal(invalid.selectedSources.speedStatus,"NO_TRAINING_DATA",
      "invalid ownship cannot validate a speed source either");
  }
  assert.equal(projectFcvTrainingReceiver({...current,
    settings:{...current.settings,speedSource:"NMEA"}},24)
    .selectedSources.speedStatus,"NO_EXTERNAL_RECEIVER");
  assert.equal(projected.transport,"NONE");
  assert.equal(projected.physicalReceiverConnected,false);
});

test("D14 never reports usable Own trip/speed/temperature when synthetic fix is missing, stale or suppressed",()=>{
  const s=boot();
  const base={...s.deviceState,trainingFixture:{
    ...s.deviceState.trainingFixture,navigation:true},
    navigationObservation:{observedAtTick:8,
      position:{source:"SYNTHETIC_FIXTURE",lat:-12.5,lon:45.125},
      speedKn:6,temperatureC:25}};
  const fresh=projectFcvTrainingReceiver(base,8);
  assert.equal(fresh.status,"SYNTHETIC_TRAINING_OBSERVATION");
  assert.equal(fresh.selectedSources.speedStatus,"SYNTHETIC_OWN");
  assert.equal(fresh.selectedSources.tempStatus,"SYNTHETIC_OWN");
  assert.equal(fresh.selectedSources.tripStatus,"SYNTHETIC_OWN");
  const stale=projectFcvTrainingReceiver(base,19);
  assert.equal(stale.status,"STALE_TRAINING_DATA");
  for(const field of ["speedStatus","tempStatus","tripStatus"]){
    assert.equal(stale.selectedSources[field],"NO_TRAINING_DATA",
      field+" must not remain live when the only classroom fix expired");
  }
  const missing=projectFcvTrainingReceiver({...base,navigationObservation:null},8);
  for(const field of ["speedStatus","tempStatus","tripStatus"]){
    assert.equal(missing.selectedSources[field],"NO_TRAINING_DATA",
      field+" must not claim a fixture before the first valid tick");
  }
  const suppressed=projectFcvTrainingReceiver({...base,
    settings:{...base.settings,tankenmaru:"On"}},8);
  assert.equal(suppressed.status,"INACTIVE_TANKENMARU");
  for(const field of ["speedStatus","tempStatus","tripStatus"]){
    assert.equal(suppressed.selectedSources[field],"INACTIVE_TANKENMARU",
      field+" must not contradict the disabled receiver status");
  }
  const noExternal=projectFcvTrainingReceiver({...base,
    settings:{...base.settings,tankenmaru:"On",speedSource:"NMEA",
      tempSource:"NMEA",tripSource:"NMEA"}},8);
  for(const field of ["speedStatus","tempStatus","tripStatus"])
    assert.equal(noExternal.selectedSources[field],"NO_EXTERNAL_RECEIVER");
  assert.equal(suppressed.transport,"NONE");
  assert.equal(suppressed.physicalReceiverConnected,false);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});

test("D14 Receiver Status does not expose an invalid or source-disabled ownship speed",()=>{
  const s=boot();
  const base={...s.deviceState,trainingFixture:{
    ...s.deviceState.trainingFixture,navigation:true},
    navigationObservation:{observedAtTick:8,
      position:{source:"SYNTHETIC_FIXTURE",lat:10,lon:106},
      speedKn:7,temperatureC:24}};
  assert.equal(projectFcvTrainingReceiver(base,8).speedKn,7);
  const negative=projectFcvTrainingReceiver({...base,navigationObservation:{
    ...base.navigationObservation,speedKn:-4}},8);
  assert.equal(negative.status,"SYNTHETIC_TRAINING_OBSERVATION");
  assert.equal(negative.selectedSources.speedStatus,"NO_TRAINING_DATA");
  assert.equal(negative.speedKn,null,
    "a negative speed cannot leak while its source is explicitly invalid");
  const nmea=projectFcvTrainingReceiver({...base,settings:{
    ...base.settings,speedSource:"NMEA"}},8);
  assert.equal(nmea.selectedSources.speedStatus,"NO_EXTERNAL_RECEIVER");
  assert.equal(nmea.speedKn,null,
    "an unavailable selected NMEA speed cannot borrow the ownship sample");
});

test("D14 training status opens on device without pretending to use a physical NMEA port",()=>{
  let s=choose(boot(),"system.receiverStatus");
  assert.equal(s.deviceState.overlay.kind,"receiver-status");
  assert.equal(s.deviceState.overlay.simulated,true);
  s=press(s,"menu");
  assert.equal(s.deviceState.overlay.category,"System");
  s=send(s,{kind:"training-fixture",fixture:"tankenmaruOption",enabled:true});
  s=choose(s,"system.tankenmaru");s=pad(s,"right");s=press(s,"enter");
  assert.equal(s.deviceState.settings.tankenmaru,"On");
  assert.ok(!getFcvMenuItems("System",s.deviceState).some(x=>
    ["system.nmea","system.receiverStatus"].includes(x.id)));
  assert.equal(projectFcvTrainingReceiver(s.deviceState,s.worldState.simTick).status,
    "INACTIVE_TANKENMARU");
});

test("D14 explicitly labels synthetic receiver state and forbids physical transport code",async()=>{
  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  const moduleSource=await readFile(new URL("../src/devices/fcv588/receiver-status.mjs",import.meta.url),"utf8");
  const instructor=await readFile(new URL("../web/lcd-instructor-meta.mjs",import.meta.url),"utf8");
  assert.match(app,/projectFcvTrainingReceiver/);
  assert.match(app,/receiver-status/);
  assert.match(app,/NMEA: OFF\\nOWN POSITION:/,
    "LCD must not claim actual NMEA transport or borrow untyped ownship data");
  assert.match(instructor,/NMEA physical port: OFF\. Transport: NONE/,
    "physical receiver absence must remain visible in instructor metadata");
  assert.doesNotMatch(moduleSource+app+instructor,/requestPort\(|requestDevice\(|\.getPorts\(/);
});
