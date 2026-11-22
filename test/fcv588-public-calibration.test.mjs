import test from "node:test";
import assert from "node:assert/strict";
import {FCV_CALIBRATION_FIELDS,projectFcvCalibratedReadings} from
  "../src/devices/fcv588/calibration.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO,observeSounder} from "../src/core/scenario.mjs";
import {createSession,dispatch,sessionHash,replay,createReplayEnvelope} from
  "../src/core/session.mjs";
import {getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";
import {projectFcvEcho} from "../src/devices/fcv588/echo-projection.mjs";
import {validateFcvSettings,encodeFcvSettings,decodeFcvSettings} from
  "../src/devices/fcv588/settings.mjs";

const send=(s,event)=>dispatch(s,adapter,event,TRAINING_SCENARIO);
const key=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
function boot(){
  let s=createSession(adapter,TRAINING_SCENARIO);
  for(const e of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},
    {kind:"tick",steps:4}])s=send(s,e);
  return s;
}
function openCalibration(s){
  if(s.deviceState.overlay?.kind!=="menu")s=key(s,"menu");
  for(let i=0;s.deviceState.overlay.category!=="System"&&i<6;i++)s=pad(s,"right");
  const idx=getFcvMenuItems("System",s.deviceState).findIndex(x=>x.id==="system.calibration");
  assert.ok(idx>=0);
  for(let i=0;s.deviceState.overlay.itemIndex!==idx&&i<25;i++)s=pad(s,"down");
  return key(s,"enter");
}

test("D06 Calib is a nested operator workflow with sourced fields, not an inert 0..3 scalar",()=>{
  const entry=getFcvMenuItems("System").find(x=>x.id==="system.calibration");
  assert.equal(entry.kind,"action");
  assert.ok(FCV_CALIBRATION_FIELDS.length>=7);
  for(const id of ["gainAdjHF","gainAdjLF","tempAdjust","speedAdjust",
    "fishSizeAdjust","waterType","zeroLineRejector"]){
    const field=FCV_CALIBRATION_FIELDS.find(x=>x.key===id);
    assert.ok(field,id);
    assert.match(field.sourceStatus,/SIMULATED|UNVERIFIED/);
    assert.equal(field.manualSection,"§2.6");
  }
  assert.equal(openCalibration(boot()).deviceState.overlay?.kind,"calibration");
});

test("D06 gain-adjust edits remain staged, cancelable, persistent, replayable and field bounded",()=>{
  let s=openCalibration(boot());
  assert.equal(s.deviceState.settings.gainAdjHF,"0");
  s=key(s,"enter");
  s=pad(s,"right");
  assert.equal(s.deviceState.overlay.draftValue,"1");
  assert.equal(s.deviceState.settings.gainAdjHF,"0");
  s=key(s,"menu");
  assert.equal(s.deviceState.settings.gainAdjHF,"0");
  s=key(s,"enter");s=pad(s,"right");s=key(s,"enter");
  assert.equal(s.deviceState.settings.gainAdjHF,"1");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
  assert.deepEqual(decodeFcvSettings(encodeFcvSettings(s.deviceState.settings)),
    s.deviceState.settings);
  assert.throws(()=>validateFcvSettings({...s.deviceState.settings,
    gainAdjHF:"200"}),/invalid/);
});

test("D06 classroom gain, temperature, speed and fish adjustments affect projections, not source observation",()=>{
  const s=boot();
  const o=observeSounder(TRAINING_SCENARIO,s.worldState,{columns:22,rows:100});
  const srcBefore=Array.from(o.channels[200]);
  const regular=projectFcvEcho(o,s.deviceState,{frequencyKhz:200,rows:70});
  const changed=projectFcvEcho(o,{...s.deviceState,settings:{...s.deviceState.settings,
    gainAdjHF:"20"}},{frequencyKhz:200,rows:70});
  assert.notDeepEqual(Array.from(regular.pixels),Array.from(changed.pixels));
  const reading=projectFcvCalibratedReadings(s.deviceState.settings,{
    sourceClass:"SYNTHETIC_FIXTURE",bottomDepthM:50,speedKn:7,temperatureC:18,
    fishSizeCm:24,
  });
  const adjusted=projectFcvCalibratedReadings({...s.deviceState.settings,
    tempAdjust:"5",speedAdjust:"10",fishSizeAdjust:"20"},{
    sourceClass:"SYNTHETIC_FIXTURE",bottomDepthM:50,speedKn:7,
    temperatureC:18,fishSizeCm:24,
  });
  assert.equal(reading.status,"SYNTHETIC_ONLY");
  assert.equal(adjusted.temperatureC,23);
  assert.equal(adjusted.speedKn,7.7);
  assert.equal(adjusted.fishSizeCm,28.8);
  assert.deepEqual(Array.from(o.channels[200]),srcBefore);
  const unknown=projectFcvCalibratedReadings(s.deviceState.settings,null);
  assert.equal(unknown.status,"NO_DATA");
});

test("D06 Water Type and Zero Line change training display state, never water salinity measurements",()=>{
  const s=boot();
  const m=projectFcvCalibratedReadings({...s.deviceState.settings,
    waterType:"Fresh",zeroLineRejector:"On"},{sourceClass:"SYNTHETIC_FIXTURE",
      bottomDepthM:40});
  assert.equal(m.waterType,"Fresh");
  assert.equal(m.zeroLineRejector,"On");
  assert.equal(m.hardwareValidated,false);
});
