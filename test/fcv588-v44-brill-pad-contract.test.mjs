import test from "node:test";
import assert from "node:assert/strict";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {createSession,dispatch,sessionHash,replay,createReplayEnvelope} from "../src/core/session.mjs";
import {projectFcvControl} from "../web/lcd-control-presentation.mjs";
import {FCV588_PUBLIC_PROFILE_REVISION} from "../src/devices/fcv588/profile-version.mjs";

// FURUNO OME-23890-E §1.3 explicitly permits ◄/► to adjust Brill.
// Mixed TrackPad→BRILL sweep *direction* is unverified: assert only
// safety, deterministic replay and committed-vs-preview contracts.
// These are offline software checks, NOT physical-device acceptance.
const send=(s,event)=>dispatch(s,adapter,event,scenario);
const short=s=>send(send(s,{kind:"down",control:"power"}),
  {kind:"up",control:"power",durationMs:150});
const arrow=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
const ui=(s,elapsedMs)=>send(s,{kind:"ui-tick",elapsedMs});
const enter=s=>send(s,{kind:"press",control:"enter"});
const menu=s=>send(s,{kind:"press",control:"menu"});
const boot=()=>send(short(createSession(adapter,scenario)),{kind:"tick",steps:4});
const open=()=>short(boot());
const sameReplay=s=>assert.equal(sessionHash(replay(adapter,scenario,
  createReplayEnvelope(s))),sessionHash(s));

test("V44 §1.3 left/right adjust Brill draft without committing and clamp at 9",()=>{
  const start=open();
  assert.equal(start.deviceState.brightness,9);
  assert.equal(start.deviceState.overlay?.value,9);
  let s=arrow(start,"left");
  assert.equal(s.deviceState.overlay?.value,8);
  assert.equal(s.deviceState.brightness,9);
  s=arrow(s,"right");
  assert.equal(s.deviceState.overlay?.value,9);
  s=arrow(s,"right");
  assert.equal(s.deviceState.overlay?.value,9,"right arrow clamps at upper boundary");
  assert.equal(s.deviceState.overlay?.elapsedMs,0,"boundary adjustment resets training idle clock");
  sameReplay(s);
});

test("V44 §1.3 mixed left/right input respects the 0 lower bound",()=>{
  let s=open();
  const before=s.worldState.simTick;
  for(let i=0;i<12;i++)s=arrow(s,"left");
  assert.equal(s.deviceState.overlay?.value,0);
  s=arrow(s,"left");
  assert.equal(s.deviceState.overlay?.value,0);
  assert.equal(s.deviceState.overlay?.elapsedMs,0);
  s=arrow(s,"right");
  assert.equal(s.deviceState.overlay?.value,1);
  assert.equal(s.worldState.simTick,before);
  assert.equal(s.deviceState.brightness,9);
  sameReplay(s);
});

test("V44 mixed POWER/BRILL and TrackPad never jumps outside 0..9 or mutates observations",()=>{
  let s=open();
  const worldHash=JSON.stringify(s.worldState);
  const sensorHash=JSON.stringify(s.sensorState);
  const observations=JSON.stringify(s.deviceState.syntheticConditions);
  const operations=["brill","left","right","brill","left","brill","right",
    "right","left","brill","brill","left","right"];
  for(const command of operations){
    s=command==="brill"?short(s):arrow(s,command);
    assert.equal(s.deviceState.overlay?.kind,"brill");
    assert.ok(Number.isInteger(s.deviceState.overlay?.value));
    assert.ok(s.deviceState.overlay.value>=0 && s.deviceState.overlay.value<=9);
    assert.equal(s.deviceState.overlay.elapsedMs,0);
    assert.equal(s.deviceState.brightness,9);
  }
  assert.equal(JSON.stringify(s.worldState),worldHash);
  assert.equal(JSON.stringify(s.sensorState),sensorHash);
  assert.equal(JSON.stringify(s.deviceState.syntheticConditions),observations);
  sameReplay(s);
});

test("V44 §1.3 left/right restarts training inactivity timer after mixed BRILL",()=>{
  let s=short(open()); // §1.3: 9→8
  assert.equal(s.deviceState.overlay?.value,8);
  s=ui(s,5900);
  s=arrow(s,"left");
  assert.equal(s.deviceState.overlay?.value,7);
  assert.equal(s.deviceState.overlay?.elapsedMs,0,"left resets pending inactivity timer");
  const tick=s.worldState.simTick;
  s=ui(s,5999);
  assert.equal(s.deviceState.overlay?.value,7);
  assert.equal(s.deviceState.brightness,9);
  s=ui(s,1);
  assert.equal(s.deviceState.overlay,null);
  assert.equal(s.deviceState.brightness,7);
  assert.equal(s.worldState.simTick,tick);
  sameReplay(s);
});

test("V44 §1.3 ENTER/MENU save staged TrackPad value and reopening is non-committing",()=>{
  let s=arrow(open(),"left");
  s=enter(s);
  assert.equal(s.deviceState.brightness,8);
  assert.equal(s.deviceState.overlay,null);
  s=short(s);
  assert.equal(s.deviceState.overlay?.value,8);
  assert.equal(s.deviceState.brightness,8);
  s=arrow(s,"left");
  assert.equal(s.deviceState.overlay?.value,7);
  s=menu(s);
  assert.equal(s.deviceState.overlay,null);
  assert.equal(s.deviceState.brightness,7);
  sameReplay(s);
});

test("V44 canceled POWER hold retains mixed BRILL preview, the UI clock and sensor separation",()=>{
  let s=arrow(short(open()),"left"); // 9→8→7
  assert.equal(s.deviceState.overlay?.value,7);
  s=ui(s,1700);
  const previewHash=JSON.stringify(s.deviceState.overlay);
  const world=s.worldState.simTick;
  s=send(s,{kind:"down",control:"power"});
  assert.equal(s.deviceState.overlay?.kind,"power-hold");
  s=ui(s,1000);
  s=send(s,{kind:"cancel",control:"power"});
  assert.equal(JSON.stringify(s.deviceState.overlay),previewHash);
  s=arrow(s,"right");
  assert.equal(s.deviceState.overlay?.value,8);
  assert.equal(s.deviceState.brightness,9);
  assert.equal(s.worldState.simTick,world);
  sameReplay(s);
});

test("V44 projector remains read-only and source gap does not alter V43 profile",()=>{
  let s=arrow(short(open()),"left");
  assert.equal(FCV588_PUBLIC_PROFILE_REVISION,"F1-public-reference-24");
  assert.equal(s.profileRevision,FCV588_PUBLIC_PROFILE_REVISION);
  const before=sessionHash(s);
  const view=projectFcvControl(s.deviceState);
  assert.equal(view?.kind,"brill");
  assert.equal(view.title,"Brill");
  assert.equal(view.currentValue,"9");
  assert.equal(view.draftValue,"7");
  assert.equal(view.remainingMs,6000);
  assert.equal(view.persistence,"CURRENT_DEVICE_CONTROL_NOT_SERIALIZED_SETTINGS");
  assert.equal(sessionHash(s),before);
  sameReplay(s);
});
