import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {projectFcvConfiguration,FCV_CONFIGURATION_KINDS} from "../web/lcd-config-presentation.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario,observeSounder} from "../src/core/scenario.mjs";
import {createSession,dispatch,replay,createReplayEnvelope,sessionHash} from "../src/core/session.mjs";
import {FCV_MENU_CATEGORIES,FCV_RANGE_BANK_FIELDS,FCV_FISH_ALARM_FIELDS,
  FCV_FUNC_TARGETS,getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";
import {FCV_UNIT_FIELDS,formatFcvDepth} from "../src/devices/fcv588/units.mjs";
import {FCV_CALIBRATION_FIELDS} from "../src/devices/fcv588/calibration.mjs";
import {encodeFcvSettings,decodeFcvSettings} from "../src/devices/fcv588/settings.mjs";

const send=(s,input)=>dispatch(s,adapter,input,scenario);
const key=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
const func=(s,ms=1100)=>send(send(s,{kind:"down",control:"func"}),
  {kind:"up",control:"func",durationMs:ms});
function boot(){
  let s=createSession(adapter,scenario);
  for(const input of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},{kind:"tick",steps:4}])s=send(s,input);
  return s;
}
function open(s,category,id){
  for(let i=0;s.deviceState.overlay && i<5;i++)s=key(s,"menu");
  assert.equal(s.deviceState.overlay,null);
  s=key(s,"menu");
  for(let i=0;i<FCV_MENU_CATEGORIES.indexOf(category);i++)s=pad(s,"right");
  const target=getFcvMenuItems(category,s.deviceState).findIndex(e=>e.id===id);
  assert.ok(target>=0);
  for(let i=0;i<target;i++)s=pad(s,"down");
  return key(s,"enter");
}
const cases=[
  ["range-bank",s=>open(s,"System","system.rangePresets"),FCV_RANGE_BANK_FIELDS.map(f=>f.key)],
  ["units",s=>open(s,"System","system.units"),FCV_UNIT_FIELDS.map(f=>f.key)],
  ["calibration",s=>open(s,"System","system.calibration"),FCV_CALIBRATION_FIELDS.map(f=>f.key)],
  ["nav-boxes",s=>open(s,"Data","data.nav1"),[1,2,3,4].map(n=>"nav1Box"+n)],
  ["fish-alarm",s=>open(s,"Alarm","alarm.alarm5"),["alarm5.setting","alarm5"]],
  ["fish-alarm-setting",s=>key(open(s,"Alarm","alarm.alarm5"),"enter"),
    FCV_FISH_ALARM_FIELDS.map(f=>"alarm5"+f.key[0].toUpperCase()+f.key.slice(1))],
  ["installation",s=>open(s,"System","system.installation"),
    ["language","transducer","units","demo","tankenmaru","nmea"]],
  ["func-program",s=>func(s),FCV_FUNC_TARGETS.map(f=>f.entryId)],
];
for(const [kind,enter,fieldKeys] of cases){
  test(kind+" projects only the existing semantic operator fields and never mutates state",()=>{
    const s=enter(boot()),before=sessionHash(s);
    const view=projectFcvConfiguration(s.deviceState);
    assert.equal(view.kind,kind);
    assert.deepEqual(view.rows.map(r=>r.fieldKey),fieldKeys);
    assert.equal(new Set(fieldKeys).size,fieldKeys.length);
    assert.equal(view.rows.filter(r=>r.selected).length,1);
    assert.ok(view.rows.every(r=>!r.text.includes("ENTER") && !r.text.includes("MENU/ESC")));
    assert.match(view.help,/ENTER/); assert.match(view.help,/MENU\/ESC/);
    assert.equal(view.hardwareValidated,false);
    assert.equal(view.geometryGrade,"ORIGINAL_REFERENCE_ESTIMATE");
    assert.equal(sessionHash(s),before);
  });
}

const transactions=[
  ["Range8",cases[0][1],7,"rangePreset8","300","5"],
  ["Units",cases[1][1],0,"units","Metric","Feet"],
  ["Calibration",cases[2][1],4,"fishSizeAdjust","0","1"],
  ["NAV Box3",cases[3][1],2,"nav1Box3","Off","DEPTH"],
  ["ALARM5 Bottom From",cases[5][1],1,"alarm5BottomFrom","20","21"],
];
for(const [name,enter,index,fieldKey,oldValue,next] of transactions){
  test(name+" keeps displayed stored/draft, cancel, commit, codec, replay and raw world consistent",()=>{
    let s=enter(boot());
    for(let i=0;i<index;i++)s=pad(s,"down");
    const world=structuredClone(s.worldState),raw=observeSounder(scenario,s.worldState);
    const stored=encodeFcvSettings(s.deviceState.settings);
    s=pad(key(s,"enter"),"right");
    let view=projectFcvConfiguration(s.deviceState);
    assert.equal(view.transaction.fieldKey,fieldKey);
    assert.equal(view.transaction.committedValue,oldValue);
    assert.equal(view.transaction.draftValue,next);
    assert.deepEqual(view.editor.choices.filter(c=>c.selected).map(c=>c.value),[next]);
    assert.equal(encodeFcvSettings(s.deviceState.settings),stored);
    s=key(s,"menu");
    view=projectFcvConfiguration(s.deviceState);
    assert.equal(view.editor,null);assert.equal(view.transaction,null);
    assert.equal(encodeFcvSettings(s.deviceState.settings),stored);
    s=key(pad(key(s,"enter"),"right"),"enter");
    assert.equal(s.deviceState.settings[fieldKey],next);
    assert.equal(projectFcvConfiguration(s.deviceState).editor,null);
    assert.deepEqual(decodeFcvSettings(encodeFcvSettings(s.deviceState.settings)),s.deviceState.settings);
    assert.deepEqual(s.worldState,world);
    assert.deepEqual(observeSounder(scenario,s.worldState),raw);
    assert.equal(sessionHash(replay(adapter,scenario,createReplayEnvelope(s))),sessionHash(s));
  });
}

test("all bounded numeric configuration windows keep edge and middle drafts visible in original order",()=>{
  for(const [enter,fields] of [[cases[0][1],FCV_RANGE_BANK_FIELDS],
    [cases[1][1],FCV_UNIT_FIELDS],[cases[2][1],FCV_CALIBRATION_FIELDS],
    [cases[5][1],FCV_FISH_ALARM_FIELDS]]){
    const state=enter(boot()).deviceState;
    for(const [itemIndex,field] of fields.entries()){
      for(const position of new Set([0,1,Math.floor(field.choices.length/2),field.choices.length-1])){
        const value=field.choices[position];
        const view=projectFcvConfiguration({...state,overlay:{...state.overlay,
          itemIndex,editing:true,draftValue:value}});
        const window=view.editor;
        assert.ok(window.choices.length>=1 && window.choices.length<=7);
        assert.equal(window.total,field.choices.length);
        assert.equal(window.index,position);
        assert.deepEqual(window.choices.filter(c=>c.selected).map(c=>c.value),[value]);
        const indices=window.choices.map(c=>field.choices.indexOf(c.value));
        assert.ok(indices.every((n,i)=>n>=0 && (i===0 || n===indices[i-1]+1)));
      }
    }
  }
});

test("Range Bank uses selected depth units consistently without reinterpreting stored meters",()=>{
  const s=cases[0][1](boot());
  const state={...s.deviceState,settings:{...s.deviceState.settings,units:"Feet"},
    overlay:{...s.deviceState.overlay,itemIndex:7,editing:true,draftValue:"200"}};
  const view=projectFcvConfiguration(state);
  assert.equal(view.transaction.committedValue,"300");
  assert.equal(view.transaction.draftValue,"200");
  assert.equal(view.transaction.committedText,formatFcvDepth(300,"Feet",0));
  assert.equal(view.transaction.draftText,formatFcvDepth(200,"Feet",0));
  assert.equal(view.editor.choices.find(c=>c.selected).text,view.transaction.draftText);
});

test("alarm display reads per-profile cause and acknowledgement, never treats enabled as triggered",()=>{
  let s=cases[4][1](boot());
  s=key(pad(key(pad(s,"down"),"enter"),"right"),"enter");
  assert.equal(s.deviceState.settings.alarm5,"On");
  let view=projectFcvConfiguration(s.deviceState);
  assert.equal(view.profileStatus.active,false);
  s=send(s,{kind:"tick",steps:1});
  view=projectFcvConfiguration(s.deviceState);
  assert.equal(view.profileStatus.active,true);
  assert.equal(view.profileStatus.acknowledged,false);
  s=pad(s,"up");
  view=projectFcvConfiguration(s.deviceState);
  assert.equal(view.profileStatus.active,true);
  assert.equal(view.profileStatus.acknowledged,true);
  assert.match(view.note,/ACTIVE.*ACK/);
  const different=projectFcvConfiguration({...s.deviceState,
    overlay:{...s.deviceState.overlay,profileIndex:4}});
  assert.equal(different.profileStatus.active,false);
  assert.equal(different.profileStatus.acknowledged,false);
  assert.equal(sessionHash(replay(adapter,scenario,createReplayEnvelope(s))),sessionHash(s));
});

test("Installation preserves Language HOLD, virtual option guards and dynamic NMEA rows",()=>{
  const s=cases[6][1](boot());
  const state=s.deviceState;
  const baseline=projectFcvConfiguration(state);
  assert.match(baseline.rows[0].text,/Language/);
  assert.doesNotMatch(baseline.rows[0].text,/\[HOLD\]|\[N\/A\]/,
    "training-only capability warnings belong outside the device LCD");
  assert.equal(baseline.rows[0].disabled,true);
  assert.match(baseline.note,/RIGHTS_HOLD_LANGUAGE/);
  assert.equal(baseline.editor,null);
  assert.equal(state.settings.language,undefined);
  assert.equal(projectFcvConfiguration({...state,overlay:{...state.overlay,
    editing:true,draftValue:"English"}}).editor,null);
  const enabled={...state,trainingFixture:{...state.trainingFixture,tankenmaruOption:true},
    settings:{...state.settings,tankenmaru:"On"}};
  assert.equal(projectFcvConfiguration(enabled).rows.length,5);
  assert.ok(!projectFcvConfiguration(enabled).rows.some(r=>r.fieldKey==="nmea"));
  assert.equal(projectFcvConfiguration(state).rows.length,6);
});

test("FUNC assignment shows current assignment and pending target without changing V29 short FUNC",()=>{
  let s=pad(cases[7][1](boot()),"up");
  const view=projectFcvConfiguration(s.deviceState);
  assert.equal(view.transaction.fieldKey,"keySetup");
  assert.equal(view.transaction.committedValue,"Pic. Advance");
  assert.equal(view.transaction.draftValue,"Fish Symbols");
  s=key(s,"menu");
  assert.equal(s.deviceState.settings.keySetup,"Pic. Advance");
  s=func(s,100);
  assert.equal(s.deviceState.overlay.kind,"func-setting");
  assert.equal(s.deviceState.overlay.settingKey,"pictureAdvance");
  assert.equal(projectFcvConfiguration(s.deviceState),null);
});

test("configuration rejects invalid selections and drafts; missing stored values are never OEM defaults",()=>{
  assert.deepEqual(FCV_CONFIGURATION_KINDS,cases.map(c=>c[0]));
  const state=cases[1][1](boot()).deviceState;
  for(const candidate of [null,{}, {...state,power:"off"}, {...state,settings:null},
    {...state,overlay:null}, {...state,overlay:{...state.overlay,itemIndex:-1}},
    {...state,overlay:{...state.overlay,itemIndex:NaN}},
    {...state,overlay:{...state.overlay,itemIndex:99}},
    {...state,overlay:{...state.overlay,editing:true,draftValue:"HR"}},
    {...state,overlay:{kind:"fish-alarm",itemIndex:0,profileIndex:6}},
    {...state,overlay:{kind:"nav-boxes",itemIndex:0,mode:"NAV3"}}]){
    assert.equal(projectFcvConfiguration(candidate),null);
  }
  const missing=projectFcvConfiguration({...state,settings:{},
    overlay:{...state.overlay,editing:true,draftValue:"Feet"}});
  assert.equal(missing.transaction.committedValue,null);
  assert.equal(missing.transaction.committedText,"--",
    "LCD must fail closed for missing persisted values without teacher prose");
  assert.notEqual(missing.transaction.committedText,
    missing.transaction.draftText,"missing stored value cannot copy the draft");
});

test("runtime configuration renderer consumes semantic projections using safe inert DOM",async()=>{
  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  const body=app.slice(app.indexOf("function renderConfigurationChrome("),app.indexOf("function renderDialog()"));
  assert.match(body,/projected\.rows\.map/);
  assert.match(body,/dataset\.fieldKey/);
  assert.match(body,/dataset\.committedValue/);
  assert.match(body,/dataset\.draftValue/);
  assert.match(body,/keepMenuSelectionVisible/);
  assert.doesNotMatch(body,/innerHTML|dispatch\(|send\(|addEventListener/);
  assert.match(app,/projectFcvConfiguration\(session\.deviceState\)/);
});
