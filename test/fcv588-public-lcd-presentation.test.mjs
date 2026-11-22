import test from "node:test";
import assert from "node:assert/strict";
import {createSession,dispatch,createReplayEnvelope,replay,sessionHash} from "../src/core/session.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";
import {projectFcvLcdPresentation,projectFcvMainMenu,
  FCV_TRAINING_LCD_TEST_PATTERNS} from "../web/lcd-presentation.mjs";

const send=(session,input)=>dispatch(session,adapter,input,scenario);
const press=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
function boot(){
  let s=createSession(adapter,scenario);
  for(const input of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},{kind:"tick",steps:4}])s=send(s,input);
  return s;
}
function shortPower(s){
  s=send(s,{kind:"down",control:"power"});
  return send(s,{kind:"up",control:"power",durationMs:100});
}

test("Brill draft drives visible luminance before commit without mutating canonical state",()=>{
  let s=pad(shortPower(boot()),"left");
  assert.equal(s.deviceState.brightness,9);
  assert.equal(s.deviceState.overlay.value,8);
  const before=sessionHash(s);
  const view=projectFcvLcdPresentation(s.deviceState);
  assert.equal(view.brightnessLevel,8);
  assert.equal(view.luminance,"0.917");
  assert.equal(sessionHash(s),before);
  const tick=s.worldState.simTick;
  s=press(s,"enter");
  assert.equal(projectFcvLcdPresentation(s.deviceState).luminance,view.luminance);
  assert.equal(s.worldState.simTick,tick);
  assert.equal(sessionHash(replay(adapter,scenario,createReplayEnvelope(s))),sessionHash(s));
});

test("cancelled POWER hold keeps the prior Brill preview; timeout commits that same projection",()=>{
  let s=pad(shortPower(boot()),"left");
  s=send(s,{kind:"down",control:"power"});
  assert.equal(projectFcvLcdPresentation(s.deviceState).brightnessLevel,8);
  s=send(s,{kind:"cancel",control:"power"});
  assert.equal(projectFcvLcdPresentation(s.deviceState).brightnessLevel,8);
  s=send(s,{kind:"ui-tick",elapsedMs:6000});
  assert.equal(s.deviceState.overlay,null);
  assert.equal(s.deviceState.brightness,8);
  assert.equal(projectFcvLcdPresentation(s.deviceState).brightnessLevel,8);
});

test("LCD diagnostic projection consumes each existing color index and rejects invalid or powered-off patterns",()=>{
  const state=boot().deviceState;
  assert.deepEqual(FCV_TRAINING_LCD_TEST_PATTERNS.map(p=>p.rgb),
    [[0,0,0],[255,255,255],[255,0,0],[0,255,0],[0,0,255]]);
  for(const [colorIndex,pattern] of FCV_TRAINING_LCD_TEST_PATTERNS.entries()){
    assert.equal(projectFcvLcdPresentation({...state,overlay:{kind:"lcd-test",colorIndex}}).testPattern,pattern);
    assert.ok(Object.isFrozen(pattern.rgb));
  }
  for(const colorIndex of [-1,5,NaN,1.5,"1"]){
    assert.equal(projectFcvLcdPresentation({...state,overlay:{kind:"lcd-test",colorIndex}}).testPattern,null);
  }
  assert.equal(projectFcvLcdPresentation({...state,power:"off",
    overlay:{kind:"lcd-test",colorIndex:1}}).testPattern,null);
});

test("main menu projects five named categories and exactly the operator rows, without help-as-item",()=>{
  let s=press(boot(),"menu");
  const view=projectFcvMainMenu(s.deviceState);
  assert.deepEqual(view.categories.map(c=>c.label),["Sounder","Display","Alarm","Data","System"]);
  assert.deepEqual(view.categories.filter(c=>c.selected).map(c=>c.label),["Sounder"]);
  assert.deepEqual(view.rows.map(r=>r.id),getFcvMenuItems("Sounder",s.deviceState).map(r=>r.id));
  assert.equal(view.rows.length,13);
  assert.ok(view.rows.every(r=>!r.text.includes("ENTER")));
  assert.match(view.help,/ENTER/);
  const before=sessionHash(s);
  projectFcvMainMenu(s.deviceState);
  assert.equal(sessionHash(s),before);
  s=pad(s,"right");
  assert.equal(projectFcvMainMenu(s.deviceState).category,"Display");
  assert.equal(projectFcvMainMenu({...s.deviceState,power:"off"}),null);
});

test("choice preview tracks real staged value and cancel restores committed value",()=>{
  let s=press(press(boot(),"menu"),"enter");
  const initial=projectFcvMainMenu(s.deviceState);
  assert.deepEqual(initial.editor.choices.filter(c=>c.selected).map(c=>c.value),["1x"]);
  s=pad(s,"right");
  assert.equal(s.deviceState.settings.pictureAdvance,"1x");
  assert.deepEqual(projectFcvMainMenu(s.deviceState).editor.choices.filter(c=>c.selected).map(c=>c.value),["1/2"]);
  s=press(s,"menu");
  const cancelled=projectFcvMainMenu(s.deviceState);
  assert.equal(cancelled.editor,null);
  assert.match(cancelled.rows[0].text,/1x$/);
});

test("large option lists are bounded while preserving the active value and original ordering",()=>{
  let s=press(boot(),"menu");
  const targetIndex=getFcvMenuItems("Sounder",s.deviceState)
    .findIndex(item=>item.id==="sounder.clutter");
  assert.ok(targetIndex>=0,"source-authored Clutter row missing");
  for(let i=0;i<targetIndex;i++)s=pad(s,"down");
  assert.equal(getFcvMenuItems("Sounder",s.deviceState)[s.deviceState.overlay.itemIndex].id,
    "sounder.clutter","operator must navigate to Clutter, not a stale row number");
  s=press(s,"enter");
  assert.equal(s.deviceState.overlay.editEntryId,"sounder.clutter");
  const state={...s.deviceState,overlay:{...s.deviceState.overlay,draftValue:"100"}};
  const editor=projectFcvMainMenu(state).editor;
  assert.equal(editor.total,101);
  assert.equal(editor.choices.length,7);
  assert.deepEqual(editor.choices.map(c=>c.value),["94","95","96","97","98","99","100"]);
  assert.deepEqual(editor.choices.filter(c=>c.selected).map(c=>c.value),["100"]);
});

test("source HOLD, capability N/A and optional row filtering stay distinct in visible projection",()=>{
  let s=press(boot(),"menu");
  for(let i=0;i<4;i++)s=pad(s,"right");
  for(let i=0;i<3;i++)s=pad(s,"down");
  const view=projectFcvMainMenu(s.deviceState);
  assert.match(view.rows.find(r=>r.selected).text,/Language/);
  assert.doesNotMatch(view.rows.find(r=>r.selected).text,/\[HOLD\]|\[N\/A\]/);
  assert.equal(view.rows.find(r=>r.selected).disabled,true);
  assert.match(view.reason,/RIGHTS_HOLD_LANGUAGE/);
  assert.equal(view.editor,null);
  const tank={...s.deviceState,trainingFixture:{...s.deviceState.trainingFixture,tankenmaruOption:true},
    settings:{...s.deviceState.settings,tankenmaru:"On"}};
  assert.ok(!projectFcvMainMenu(tank).rows.some(r=>r.id==="system.nmea"));
  const sounderIndex=getFcvMenuItems("Sounder",s.deviceState)
    .findIndex(item=>item.id==="sounder.shift");
  assert.ok(sounderIndex>=0,"source-authored Shift row missing");
  const sounder={...s.deviceState,overlay:{kind:"menu",category:"Sounder",itemIndex:sounderIndex,editing:false}};
  const shift=projectFcvMainMenu(sounder);
  assert.equal(shift.rows[sounderIndex].id,"sounder.shift");
  assert.equal(shift.rows[sounderIndex].selected,true);
  assert.match(shift.rows[sounderIndex].text,/Shift/);
  assert.doesNotMatch(shift.rows[sounderIndex].text,/\[HOLD\]|\[N\/A\]/);
  assert.equal(shift.rows[sounderIndex].disabled,true);
  assert.match(shift.reason,/SHIFT_UNAVAILABLE_IN_AUTO_RANGE/);
});
