import test from "node:test";
import assert from "node:assert/strict";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {createSession,dispatch,replay,createReplayEnvelope,sessionHash} from "../src/core/session.mjs";
import {projectFcvLcdPresentation} from "../web/lcd-presentation.mjs";
const send=(s,e)=>dispatch(s,adapter,e,scenario);
const ui=(s,elapsedMs)=>send(s,{kind:"ui-tick",elapsedMs});
const power=s=>send(send(s,{kind:"down",control:"power"}),{kind:"up",control:"power",durationMs:100});
function opened(){return power(send(power(createSession(adapter,scenario)),{kind:"tick",steps:4}));}

for(const direction of ["left","down","right","up"]){
  test(`A04 BRILL ${direction} restarts the existing training inactivity interval`,()=>{
    let s=opened();const tick=s.worldState.simTick;
    s=ui(s,5900);
    s=send(s,{kind:"pad",control:"trackpad",direction});
    const expected=["left","down"].includes(direction)?8:9;
    assert.equal(s.deviceState.overlay.value,expected);
    assert.equal(s.deviceState.overlay.elapsedMs,0,"recognized adjustment is an operation, including a clamped boundary");
    const luminance=projectFcvLcdPresentation(s.deviceState).luminance;
    s=ui(s,5999);
    assert.equal(s.deviceState.overlay?.kind,"brill","close only after a fresh full idle interval");
    assert.equal(s.deviceState.brightness,9,"uncommitted preview remains separate from canonical brightness");
    assert.equal(projectFcvLcdPresentation(s.deviceState).luminance,luminance);
    s=ui(s,1);
    assert.equal(s.deviceState.overlay,null);assert.equal(s.deviceState.brightness,expected);
    assert.equal(s.worldState.simTick,tick);
    assert.equal(sessionHash(replay(adapter,scenario,createReplayEnvelope(s))),sessionHash(s));
  });
}

test("BRILL MENU/ESC keeps its existing commit semantics; cancelled POWER hold retains preview",()=>{
  let s=send(opened(),{kind:"pad",control:"trackpad",direction:"left"});
  s=send(s,{kind:"down",control:"power"});s=ui(s,1200);
  s=send(s,{kind:"cancel",control:"power"});
  assert.equal(s.deviceState.overlay.value,8);assert.equal(s.deviceState.brightness,9);
  s=send(s,{kind:"press",control:"menu"});
  assert.equal(s.deviceState.brightness,8);assert.equal(s.deviceState.overlay,null);
});

test("MODE ENTER remains non-committing; rotary resets timeout and MENU cancels",()=>{
  let s=send(power(createSession(adapter,scenario)),{kind:"tick",steps:4});
  s=send(s,{kind:"rotate",control:"mode",steps:1});s=ui(s,5900);
  s=send(s,{kind:"press",control:"enter"});
  assert.equal(s.deviceState.mode,"LF");assert.equal(s.deviceState.overlay.candidate,"DUAL");
  s=send(s,{kind:"rotate",control:"mode",steps:1});
  assert.equal(s.deviceState.overlay.elapsedMs,0);
  s=send(s,{kind:"press",control:"menu"});
  assert.equal(s.deviceState.mode,"LF");assert.equal(s.deviceState.overlay,null);
});
