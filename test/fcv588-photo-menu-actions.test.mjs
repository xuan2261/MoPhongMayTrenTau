import test from "node:test";
import assert from "node:assert/strict";
import {createSession,dispatch,createReplayEnvelope,replay,sessionHash} from "../src/core/session.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {projectFcvMainMenu} from "../web/lcd-presentation.mjs";

const send=(s,e)=>dispatch(s,adapter,e,scenario);
const key=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
function boot(){
  let s=createSession(adapter,scenario);
  for(const e of [{kind:"down",control:"power"},{kind:"up",control:"power",durationMs:100},
    {kind:"tick",steps:4}])s=send(s,e);
  return s;
}

test("P05 MENU ESC ENTER and pad keep draft separate, cancel old value, and commit selected value",()=>{
  let s=key(boot(),"menu");
  s=key(s,"enter");
  s=pad(s,"right");
  let row=projectFcvMainMenu(s.deviceState).rows[0];
  assert.equal(s.deviceState.settings.pictureAdvance,"1x");
  assert.equal(row.committedValue,"1x");
  assert.equal(row.draftValue,"1/2");
  assert.equal(row.valueText,"1/2");

  s=key(s,"menu");
  row=projectFcvMainMenu(s.deviceState).rows[0];
  assert.equal(row.valueText,"1x");
  assert.equal(s.deviceState.settings.pictureAdvance,"1x");

  s=key(s,"enter");
  s=pad(s,"right");
  s=key(s,"enter");
  assert.equal(s.deviceState.settings.pictureAdvance,"1/2");
  assert.equal(projectFcvMainMenu(s.deviceState).rows[0].valueText,"1/2");
  assert.equal(sessionHash(replay(adapter,scenario,createReplayEnvelope(s))),sessionHash(s));
});

test("P05 left/right category navigation preserves committed settings",()=>{
  let s=key(boot(),"menu");
  const before=structuredClone(s.deviceState.settings);
  s=pad(s,"right");
  assert.equal(projectFcvMainMenu(s.deviceState).category,"Display");
  s=pad(s,"left");
  assert.equal(projectFcvMainMenu(s.deviceState).category,"Sounder");
  assert.deepEqual(s.deviceState.settings,before);
});
