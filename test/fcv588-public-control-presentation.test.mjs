import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {createSession,dispatch,sessionHash} from "../src/core/session.mjs";
import {DISPLAY_MODES} from "../src/devices/fcv588/model.mjs";
import {projectFcvControl} from "../web/lcd-control-presentation.mjs";
const send=(s,e)=>dispatch(s,adapter,e,scenario);
const key=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
const power=s=>send(send(s,{kind:"down",control:"power"}),{kind:"up",control:"power",durationMs:100});
const boot=()=>send(power(createSession(adapter,scenario)),{kind:"tick",steps:4});

test("Range shows current and pending mode/preset without persisting a phantom control value",()=>{
  let s=pad(key(boot(),"range"),"right");
  const before=sessionHash(s),v=projectFcvControl(s.deviceState);
  assert.equal(v.kind,"range");assert.equal(v.currentValue,"auto:3");
  assert.equal(v.draftValue,"manual:3");assert.equal(v.rows.length,2);
  assert.deepEqual(v.rows.filter(r=>r.selected).map(r=>r.value),["manual"]);
  assert.match(v.draftText,/Range 4.*40 m/);
  assert.match(v.help,/ENTER lưu.*MENU\/ESC hủy/);
  assert.doesNotMatch(v.currentText,/Đã lưu/);
  assert.equal(sessionHash(s),before);
  s=key(s,"enter");assert.equal(projectFcvControl(s.deviceState),null);
  s=key(key(s,"range"),"range");
  assert.equal(projectFcvControl(s.deviceState).draftValue,"manual:4");
  assert.equal(projectFcvControl(s.deviceState).currentValue,"manual:3");
});

test("Range formatting reads existing configured meters and current depth unit without changing storage",()=>{
  // The operator opens RANGE in Auto. Manual presets are only previewed
  // after the real TrackPad RIGHT staging event (manual §1.5).
  const s=pad(key(boot(),"range"),"right").deviceState;
  const state={...s,settings:{...s.settings,units:"Feet",rangePreset4:"200"}};
  const v=projectFcvControl(state);
  assert.equal(v.currentValue,"auto:3");
  assert.equal(v.draftValue,"manual:3");
  assert.match(v.draftText,/656 ft/);assert.equal(state.settings.rangePreset4,"200");
  assert.match(v.currentText,/Auto/);
});

test("Gain exposes the pending mode and offset, while committed control values remain separate",()=>{
  let s=send(boot(),{kind:"push",control:"gain"});
  s=pad(pad(s,"down"),"right");
  const before=sessionHash(s),v=projectFcvControl(s.deviceState);
  assert.equal(v.currentValue,"fishing:0");assert.equal(v.draftValue,"cruising:1");
  assert.deepEqual(v.rows.map(r=>r.value),["fishing","cruising","off"]);
  assert.match(v.draftText,/Cruising.*\+1/);
  assert.match(v.help,/▲\/▼.*◀\/▶.*ENTER lưu.*MENU\/ESC hủy/);
  assert.equal(sessionHash(s),before);
});

test("BRILL selected level and existing idle timer are projected without a second clock",()=>{
  const s=power(boot());
  for(let value=0;value<=9;value++){
    const state={...s.deviceState,overlay:{...s.deviceState.overlay,value,elapsedMs:1250}};
    const v=projectFcvControl(state);
    assert.equal(v.currentValue,"9");assert.equal(v.draftValue,String(value));
    assert.equal(v.rows.length,7);
    assert.deepEqual(v.rows.filter(r=>r.selected).map(r=>r.value),[String(value)]);
    assert.equal(v.remainingMs,4750);
    assert.match(v.help,/MENU\/ESC lưu/);assert.doesNotMatch(v.help,/hủy/);
    assert.match(v.note,/mô phỏng/);
  }
});

test("MODE displays all existing rotary positions and never advertises ENTER as commit",()=>{
  const s=send(boot(),{kind:"rotate",control:"mode",steps:1});
  const v=projectFcvControl(s.deviceState);
  assert.equal(v.currentValue,"LF");assert.equal(v.draftValue,"DUAL");
  assert.deepEqual(v.rows.map(r=>r.value),DISPLAY_MODES);
  assert.equal(v.remainingMs,6000);
  assert.match(v.help,/Xoay MODE.*tự.*MENU\/ESC hủy/);
  assert.doesNotMatch(v.help,/ENTER/);
  assert.equal(projectFcvControl(key(s,"enter").deviceState).draftValue,"DUAL");
  assert.equal(projectFcvControl(key(s,"menu").deviceState),null);
});

test("basic-control projection fails closed on missing, foreign, powered-off and invalid pending values",()=>{
  const state=key(boot(),"range").deviceState;
  for(const s of [null,{}, {...state,power:"off"}, {...state,overlay:null},
    {...state,overlay:{kind:"menu"}}, {...state,overlay:{kind:"range",mode:"auto",index:8}},
    {...state,overlay:{kind:"range",mode:"INVALID",index:0}},
    {...state,overlay:{kind:"gain",mode:"fishing",offset:6}},
    {...state,overlay:{kind:"brill",value:10,elapsedMs:0}},
    {...state,overlay:{kind:"brill",value:8,elapsedMs:-1}},
    {...state,overlay:{kind:"mode",candidate:"UNKNOWN",elapsedMs:0}}]){
    assert.equal(projectFcvControl(s),null);
  }
});

test("basic control renderer uses original inert DOM and has no independent state transitions",async()=>{
  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  const branch=app.slice(app.indexOf("function renderControlChrome("),app.indexOf("function renderDialog()"));
  assert.match(branch,/projected\.rows/);assert.match(branch,/textContent/);
  assert.match(branch,/controlValue/);assert.match(branch,/lcd-control-summary/);
  assert.doesNotMatch(branch,/innerHTML|dispatch\(|send\(|setTimeout|setInterval|Date\.now/);
});
