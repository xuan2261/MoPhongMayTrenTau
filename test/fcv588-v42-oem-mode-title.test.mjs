import test from "node:test";
import assert from "node:assert/strict";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {createSession,dispatch,sessionHash} from "../src/core/session.mjs";
import {DISPLAY_MODES} from "../src/devices/fcv588/model.mjs";
import {projectFcvControl} from "../web/lcd-control-presentation.mjs";

// Public primary oracle: FURUNO OME-23890-E §1.4, MODE setting
// window heading is the literal "MODE" (not "MODE SELECT").
// Source-bound text assertion only: no artwork, firmware bytes or
// pixel coordinates are asserted or embedded.
const send=(state,input)=>dispatch(state,adapter,input,scenario);
function boot() {
  let state=createSession(adapter,scenario);
  for(const input of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},{kind:"tick",steps:4}])
    state=send(state,input);
  return state;
}
test("V42 OEM §1.4 MODE dialog heading is exactly MODE, without invented SELECT",()=>{
  const state=send(boot(),{kind:"rotate",control:"mode",steps:1});
  const before=sessionHash(state),view=projectFcvControl(state.deviceState);
  assert.equal(view.kind,"mode");
  assert.equal(view.title,"MODE","FURUNO §1.4 labels this selection window MODE");
  assert.deepEqual(view.rows.map(row=>row.value),
    ["NAV1","LF-ZOOM","LF","DUAL","HF","HF-ZOOM","NAV2"]);
  assert.equal(view.draftValue,"DUAL");
  assert.equal(view.currentValue,"LF");
  assert.equal(view.remainingMs,6000);
  assert.equal(sessionHash(state),before,"read-only projector cannot affect replay");
});

test("V42 selected MODE projector retains timeout, cancellation and seven choices",()=>{
  let state=send(boot(),{kind:"rotate",control:"mode",steps:1});
  const view=projectFcvControl(state.deviceState);
  assert.deepEqual(view.rows.map(row=>row.value),DISPLAY_MODES);
  assert.match(view.help,/MODE/);
  assert.doesNotMatch(view.help,/ENTER/,"MODE selection is not committed by ENTER");
  const cancelled=send(state,{kind:"press",control:"menu"});
  assert.equal(projectFcvControl(cancelled.deviceState),null);
  assert.equal(cancelled.deviceState.mode,"LF");
});

test("V42 change must not alter RANGE, BRILL and Auto Gain dialog names",()=>{
  const state=boot().deviceState;
  const sample=[
    [{kind:"range",mode:"auto",index:3},"Range"],
    [{kind:"brill",value:9,elapsedMs:0},"Brill"],
    [{kind:"gain",mode:"fishing",offset:0},"Auto Gain"],
  ];
  for(const [overlay,title] of sample){
    assert.equal(projectFcvControl({...state,overlay})?.title,title);
  }
});