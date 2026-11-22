import test from "node:test";
import assert from "node:assert/strict";
import {getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {createSession,dispatch,replay,createReplayEnvelope,sessionHash} from "../src/core/session.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";

const send=(s,input)=>dispatch(s,adapter,input,TRAINING_SCENARIO);
const press=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
const boot=()=>{
  let s=createSession(adapter,TRAINING_SCENARIO);
  for(const input of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:120},{kind:"tick",steps:4}])
    s=send(s,input);
  return s;
};

test("FCV-588 manual §§1.15–1.17 places advanced echo modes in Display, not Sounder",()=>{
  const display=getFcvMenuItems("Display");
  const sounder=getFcvMenuItems("Sounder");
  for(const id of ["display.accuFish","display.bottomDiscrimination","display.rezBoost"]){
    assert.ok(display.some(x=>x.id===id),id+" absent from source-backed Display");
    assert.ok(!sounder.some(x=>x.settingKey===id.split(".")[1]),
      id+" must not be misfiled into Sounder");
  }
  assert.deepEqual(display.find(x=>x.id==="display.bottomDiscrimination").choices,
    ["Off","Graphic","Probability"],"manual §1.16 offers two BDS display types");
});

test("AUTO_R disables Shift, and RANGE key is inoperative when BDS is active",()=>{
  let s=boot();
  assert.equal(getFcvMenuItems("Sounder",s.deviceState).find(x=>x.id==="sounder.shift").disabled,
    true,"manual §1.9");
  s=press(s,"range");
  s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.rangeMode,"manual");
  assert.notEqual(getFcvMenuItems("Sounder",s.deviceState).find(x=>x.id==="sounder.shift").disabled,
    true);

  // Explicit teacher mounting fixture is not inferred from a transducer name.
  let started=createSession(adapter,TRAINING_SCENARIO);
  started=send(started,{kind:"restore-settings",settings:{
    ...started.deviceState.settings,transducer:"525STID-PWD",draft:"1",
    bottomDiscrimination:"Graphic"}});
  started=send(started,{kind:"down",control:"power"});
  started=send(started,{kind:"up",control:"power",durationMs:100});
  started=send(started,{kind:"tick",steps:4});
  started=send(started,{kind:"tick",steps:1});
  started=send(started,{kind:"training-fixture",fixture:"virtualMounting",enabled:true});
  const before=started.deviceState.rangeIndex;
  started=press(started,"range");
  assert.equal(started.deviceState.overlay,null,
    "manual §1.5: range selector must remain unavailable during active BDS");
  assert.equal(started.deviceState.rangeIndex,before);
  assert.match(started.deviceState.notice,/RANGE.*BOTTOM/i);
  started=send(started,{kind:"training-fixture",fixture:"virtualMounting",enabled:false});
  started=press(started,"range");
  assert.equal(started.deviceState.overlay?.kind,"range");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(started))),
    sessionHash(started));
});

test("§1.16 choosing Bottom Disc. under Manual Range automatically activates AUTO_R",()=>{
  let s=createSession(adapter,TRAINING_SCENARIO);
  s=send(s,{kind:"restore-settings",settings:{
    ...s.deviceState.settings,transducer:"525STID-PWD",draft:"1"}});
  for(const input of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},
    {kind:"tick",steps:4},{kind:"tick",steps:1},
    {kind:"training-fixture",fixture:"virtualMounting",enabled:true}]){
    s=send(s,input);
  }
  s=press(s,"range");
  s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.rangeMode,"manual");
  const bds=getFcvMenuItems("Display",s.deviceState).find(x=>
    x.id==="display.bottomDiscrimination");
  assert.equal(bds.disabled,false,"manual §1.16 can enable AUTO_R on activation");
  s=press(s,"menu");
  for(let n=0;s.deviceState.overlay.category!=="Display"&&n<6;n++)
    s=pad(s,"right");
  const idx=getFcvMenuItems("Display",s.deviceState).findIndex(x=>
    x.id==="display.bottomDiscrimination");
  for(let n=0;s.deviceState.overlay.itemIndex!==idx&&n<30;n++)
    s=pad(s,"down");
  s=press(s,"enter");
  assert.equal(s.deviceState.overlay?.editing,true);
  s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.settings.bottomDiscrimination,"Graphic");
  assert.equal(s.deviceState.rangeMode,"auto","BDS must switch to AUTO_R");
  s=press(s,"menu");
  s=press(s,"range");
  assert.match(s.deviceState.notice,/RANGE.*BOTTOM/i);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});
