import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO,DEFAULT_RANGES_M,effectiveRangeM} from "../src/core/scenario.mjs";
import {createSession,dispatch,replay,sessionHash,createReplayEnvelope} from "../src/core/session.mjs";
import * as MenuAtlas from "../src/devices/fcv588/menu-atlas.mjs";
import {encodeFcvSettings,decodeFcvSettings,validateFcvSettings} from "../src/devices/fcv588/settings.mjs";

const send=(s,input)=>dispatch(s,adapter,input,TRAINING_SCENARIO);
const {getFcvMenuItems}=MenuAtlas;
const FCV_RANGE_BANK_FIELDS=MenuAtlas.FCV_RANGE_BANK_FIELDS??[];
const key=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
function boot(){
  let s=createSession(adapter,TRAINING_SCENARIO);
  for(const input of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},
    {kind:"tick",steps:4}])s=send(s,input);
  return s;
}
function openBank(s){
  if(s.deviceState.overlay?.kind!=="menu")s=key(s,"menu");
  for(let i=0;s.deviceState.overlay?.category!=="System"&&i<6;i++)s=pad(s,"right");
  assert.equal(s.deviceState.overlay?.category,"System");
  const index=getFcvMenuItems("System",s.deviceState).findIndex(x=>x.id==="system.rangePresets");
  assert.ok(index>=0);
  for(let i=0;s.deviceState.overlay.itemIndex!==index&&i<25;i++)s=pad(s,"down");
  s=key(s,"enter");
  assert.equal(s.deviceState.overlay?.kind,"range-bank");
  return s;
}

test("D02 has eight numbered, versioned training range slots with default bank",()=>{
  assert.equal(FCV_RANGE_BANK_FIELDS.length,8,
    "D02 synthetic bank must define eight configurable positions");
  assert.deepEqual(FCV_RANGE_BANK_FIELDS.map(f=>f.key),
    Array.from({length:8},(_,i)=>"rangePreset"+(i+1)));
  assert.deepEqual(FCV_RANGE_BANK_FIELDS.map(f=>Number(f.defaultValue)),DEFAULT_RANGES_M);
  assert.ok(FCV_RANGE_BANK_FIELDS.every(f=>f.sourceStatus.includes("SYNTHETIC")));
  const settings=createSession(adapter,TRAINING_SCENARIO).deviceState.settings;
  assert.deepEqual(FCV_RANGE_BANK_FIELDS.map(f=>Number(settings[f.key])),DEFAULT_RANGES_M);
  const entry=getFcvMenuItems("System").find(x=>x.id==="system.rangePresets");
  assert.equal(entry.kind,"action","8-slot edit is a nested workflow, not one flat value");
});

test("D02 evidence atlas lists each training slot with explicit HOLD",async()=>{
  const evidence=JSON.parse(await readFile(new URL(
    "../docs/evidence/fcv588-public-menu-atlas.json",import.meta.url),"utf8"));
  assert.equal(evidence.rangeBank?.fields.length,8);
  assert.ok(evidence.rangeBank.fields.every(x=>x.claimDecision==="HOLD"));
  assert.match(evidence.rangeBank.sourceDecision,/SYNTHETIC/);
});

test("D02 System Range Presets stages, cancels and commits a single slot without rewriting other presets",()=>{
  let s=openBank(boot());
  const initial=s.deviceState.settings.rangePreset1;
  s=key(s,"enter");
  assert.equal(s.deviceState.overlay.editing,true);
  s=pad(s,"right");
  assert.equal(s.deviceState.settings.rangePreset1,initial,"draft is not committed");
  assert.equal(s.deviceState.overlay.draftValue,"10");
  s=key(s,"menu");
  assert.equal(s.deviceState.settings.rangePreset1,initial,"MENU cancels edit");
  assert.equal(s.deviceState.overlay.kind,"range-bank");
  assert.equal(s.deviceState.overlay.editing,false);
  s=key(s,"enter");
  s=pad(s,"right");
  s=key(s,"enter");
  assert.equal(s.deviceState.settings.rangePreset1,"10");
  assert.equal(s.deviceState.settings.rangePreset2,"10");
  assert.equal(effectiveRangeM({recommendedAutoRangeM:80},{...s.deviceState,
    rangeMode:"manual",rangeIndex:0}),10);
  assert.equal(effectiveRangeM({recommendedAutoRangeM:80},{...s.deviceState,
    rangeMode:"auto",rangeIndex:0}),80,"Auto Range independent of bank");
  s=key(s,"menu");
  assert.equal(s.deviceState.overlay.category,"System");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),sessionHash(s));
});

test("D02 slot eight can be edited independently and manual RANGE displays its configured depth",()=>{
  let s=openBank(boot());
  for(let i=0;i<7;i++)s=pad(s,"down");
  assert.equal(s.deviceState.overlay.itemIndex,7);
  s=key(s,"enter");
  s=pad(s,"left");
  assert.equal(s.deviceState.overlay.draftValue,"200");
  s=key(s,"enter");
  assert.equal(s.deviceState.settings.rangePreset8,"200");
  assert.equal(s.deviceState.settings.rangePreset7,"200");
  assert.equal(effectiveRangeM({recommendedAutoRangeM:80},{...s.deviceState,
    rangeMode:"manual",rangeIndex:7}),200);
  const encoded=encodeFcvSettings(s.deviceState.settings);
  assert.deepEqual(decodeFcvSettings(encoded),s.deviceState.settings);
  assert.throws(()=>validateFcvSettings({...s.deviceState.settings,rangePreset8:"9999"}),
    /invalid settings value/);
});

test("§2.2 units change restores all eight depth presets, including customized entries",()=>{
  let s=openBank(boot());
  s=key(s,"enter");
  s=pad(s,"right");
  s=key(s,"enter");
  assert.equal(s.deviceState.settings.rangePreset1,"10");
  s=key(s,"menu");
  const index=getFcvMenuItems("System",s.deviceState)
    .findIndex(x=>x.id==="system.units");
  assert.ok(index>=0);
  for(let i=0;s.deviceState.overlay.itemIndex!==index&&i<30;i++)
    s=pad(s,"down");
  s=key(s,"enter"); // System > Units nested §2.5 categories
  assert.equal(s.deviceState.overlay.kind,"units");
  s=key(s,"enter"); // edit Depth unit; other five remain independently chosen
  s=pad(s,"right");
  assert.equal(s.deviceState.settings.units,"Metric","draft cannot reset ranges");
  s=key(s,"menu");
  assert.equal(s.deviceState.settings.rangePreset1,"10","ESC cancels unit change");
  s=key(s,"enter");
  s=pad(s,"right");
  s=key(s,"enter");
  assert.equal(s.deviceState.settings.units,"Feet");
  assert.deepEqual(FCV_RANGE_BANK_FIELDS.map(f=>s.deviceState.settings[f.key]),
    FCV_RANGE_BANK_FIELDS.map(f=>f.defaultValue),
    "Manual §2.2 says changing depth units restores all Range 1–8 defaults");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),
    sessionHash(s));
});

test("§2.2 Auto Range ceiling cannot exceed highest manually configured preset",()=>{
  const state=createSession(adapter,TRAINING_SCENARIO).deviceState;
  const settings={...state.settings,...Object.fromEntries(
    FCV_RANGE_BANK_FIELDS.map(f=>[f.key,"5"]))};
  const configured={...state,settings,rangeMode:"auto"};
  assert.equal(effectiveRangeM({recommendedAutoRangeM:80},configured),5);
  assert.equal(effectiveRangeM({recommendedAutoRangeM:20},
    {...configured,settings:{...settings,rangePreset8:"40"}}),20);
  assert.equal(effectiveRangeM({recommendedAutoRangeM:80},
    {...configured,settings:{...settings,rangePreset8:"40"}}),40);
});

test("D02 range dialog and bank render dynamic values but display is explicitly a training approximation",async()=>{
  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  const presentation=await readFile(new URL("../web/lcd-config-presentation.mjs",import.meta.url),"utf8");
  // V30 moves the bank view, not its reducer/options, into its owning projector.
  assert.match(presentation,/range-bank/);
  assert.match(app,/projectFcvConfiguration\(session\.deviceState\)/);
  assert.match(presentation,/FCV_RANGE_BANK_FIELDS/);
  assert.match(app,/FCV_RANGE_BANK_FIELDS/);
  assert.match(presentation,/8 dải lớp học; giới hạn OEM chưa xác minh/,
    "Range bank must retain source uncertainty in the teacher-only projection");
  assert.match(app,/publishInstructorGuidance\(\{/,
    "bounded Range bank notes must be routed out of the operator LCD");
  assert.doesNotMatch(app,/ctx\.fillText\("RANGE.*TRAINING/,
    "do not paint an unsourced training label onto the physical screen");
  assert.doesNotMatch(app,/const ranges = \[5, 10, 20, 40, 80, 150, 200, 300\]/);
});
