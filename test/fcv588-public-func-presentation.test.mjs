import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {projectFcvFuncSetting,projectFcvMainMenu} from "../web/lcd-presentation.mjs";
import {FCV_FUNC_TARGETS,getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario,observeSounder} from "../src/core/scenario.mjs";
import {createSession,dispatch,replay,createReplayEnvelope,sessionHash} from "../src/core/session.mjs";
import {encodeFcvSettings,decodeFcvSettings} from "../src/devices/fcv588/settings.mjs";

const send=(s,input)=>dispatch(s,adapter,input,scenario);
const press=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
const func=(s,durationMs=100)=>send(send(s,{kind:"down",control:"func"}),
  {kind:"up",control:"func",durationMs});
function boot(){
  let s=createSession(adapter,scenario);
  for(const input of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},{kind:"tick",steps:4}])s=send(s,input);
  return s;
}
function assign(s,label){
  s=func(s,1100);
  const target=FCV_FUNC_TARGETS.findIndex(item=>item.label===label);
  assert.ok(target>=0);
  while(s.deviceState.overlay.itemIndex!==target)s=pad(s,"down");
  return press(s,"enter");
}

test("FUNC projects every Clutter value through a bounded ordered window with one selected value",()=>{
  let s=func(assign(boot(),"Clutter"));
  const values=s.deviceState.overlay.choices;
  assert.equal(values.length,101);
  for(let i=0;i<values.length;i++){
    const before=sessionHash(s);
    const view=projectFcvFuncSetting(s.deviceState);
    assert.equal(view.total,values.length);
    assert.equal(view.index,i);
    assert.ok(view.choices.length<=7);
    assert.deepEqual(view.choices.filter(c=>c.selected).map(c=>c.value),[values[i]]);
    const start=values.indexOf(view.choices[0].value);
    assert.deepEqual(view.choices.map(c=>c.value),values.slice(start,start+view.choices.length));
    assert.equal(sessionHash(s),before,"projection must not dispatch or mutate state");
    s=pad(s,"down");
  }
  assert.equal(s.deviceState.overlay.draftValue,"0");
  assert.equal(s.deviceState.settings.clutter,undefined,"all 101 previews remain uncommitted");
});

test("main-menu and FUNC use identical windows for Clutter, Color Erase and White Line",()=>{
  for(const label of ["Clutter","Color Erase","White Line"]){
    const s=func(assign(boot(),label));
    const state=s.deviceState;
    const entries=getFcvMenuItems("Sounder",state);
    const itemIndex=entries.findIndex(entry=>entry.settingKey===state.overlay.settingKey);
    for(const draftValue of state.overlay.choices){
      const f=projectFcvFuncSetting({...state,overlay:{...state.overlay,draftValue}});
      const m=projectFcvMainMenu({...state,overlay:{kind:"menu",category:"Sounder",
        itemIndex,editing:true,draftValue,editEntryId:entries[itemIndex].id}}).editor;
      for(const key of ["total","index","choices","before","after"])
        assert.deepEqual(f[key],m[key],label+" / "+draftValue+" / "+key);
    }
  }
});

test("FUNC visibility changes preserve stage, cancel, commit, raw observations, persistence and replay",()=>{
  let s=func(assign(boot(),"White Line"));
  const world=structuredClone(s.worldState);
  const raw=observeSounder(scenario,s.worldState);
  const settings=encodeFcvSettings(s.deviceState.settings);
  assert.deepEqual(s.deviceState.overlay.choices,["Off","On"],"numeric/Edge remains a source gate");
  s=pad(s,"down");
  assert.deepEqual(projectFcvFuncSetting(s.deviceState).choices.filter(c=>c.selected),[{value:"On",selected:true}]);
  assert.equal(encodeFcvSettings(s.deviceState.settings),settings);
  s=press(s,"menu");
  assert.equal(projectFcvFuncSetting(s.deviceState),null);
  assert.equal(encodeFcvSettings(s.deviceState.settings),settings);
  s=func(s);
  s=func(s); // an extra short FUNC selects once, not a second editor or commit
  assert.equal(s.deviceState.overlay.draftValue,"On");
  s=press(s,"enter");
  assert.equal(s.deviceState.settings.whiteLine,"On");
  assert.deepEqual(decodeFcvSettings(encodeFcvSettings(s.deviceState.settings)),s.deviceState.settings);
  assert.deepEqual(s.worldState,world);
  assert.deepEqual(observeSounder(scenario,s.worldState),raw);
  assert.equal(sessionHash(replay(adapter,scenario,createReplayEnvelope(s))),sessionHash(s));
});

test("FUNC presentation rejects missing, powered-off and invalid draft inputs without inventing a choice",()=>{
  const state=func(assign(boot(),"Clutter")).deviceState;
  for(const candidate of [null,{}, {...state,power:"off"}, {...state,overlay:null},
    {...state,overlay:{...state.overlay,draftValue:"101"}},
    {...state,overlay:{...state.overlay,choices:[]}},
    {...state,overlay:{...state.overlay,choices:[null]}},
    {...state,overlay:{...state.overlay,choices:null}}]){
    assert.equal(projectFcvFuncSetting(candidate),null);
  }
});

test("renderer consumes the bounded FUNC projection and keeps help outside operator choice rows",async()=>{
  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  const branch=app.slice(app.indexOf("if(funcSetting){"),app.indexOf('if (overlay.kind === "range")'));
  assert.match(branch,/funcSetting\.choices\.map/);
  assert.match(branch,/replaceChildren/);
  assert.match(branch,/keepMenuSelectionVisible/);
  assert.match(branch,/publishInstructorGuidance\(\{/,
    "FUNC instructions and source provenance must reach instructor guidance");
  assert.match(branch,/help:funcSetting\.help/,
    "bounded FUNC menu still publishes the complete help text externally");
  assert.doesNotMatch(branch,/\$\("dialog-footer"\)\.textContent\s*=/,
    "FUNC source/help must not be painted on the device's footer");
  assert.doesNotMatch(branch,/innerHTML|dispatch\(|send\(/);
});
