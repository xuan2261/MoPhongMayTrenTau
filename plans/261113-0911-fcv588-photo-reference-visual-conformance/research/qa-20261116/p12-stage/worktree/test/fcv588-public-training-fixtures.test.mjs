import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";
import {createSession,dispatch,createReplayEnvelope,replay,sessionHash} from "../src/core/session.mjs";
import {getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";
import {observeSounder} from "../src/core/scenario.mjs";
import {projectFcvEcho,projectFcvBottomDiscrimination} from "../src/devices/fcv588/echo-projection.mjs";

const send=(s,input)=>dispatch(s,adapter,input,TRAINING_SCENARIO);
const boot=()=>{
  let s=createSession(adapter,TRAINING_SCENARIO);
  for(const input of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},{kind:"tick",steps:4}])
    s=send(s,input);
  return s;
};
const teacher=(s,fixture,enabled)=>send(s,{kind:"training-fixture",fixture,enabled});

test("instructor-only synthetic navigation can be enabled and disabled without fictional FCV menu",()=>{
  let s=boot();
  assert.equal(s.deviceState.trainingFixture.navigation,false);
  s=send(s,{kind:"press",control:"mark"});
  assert.equal(s.deviceState.navigation.waypoints.length,0);
  assert.match(s.deviceState.notice,/NO POSITION/);
  s=teacher(s,"navigation",true);
  s=send(s,{kind:"press",control:"mark"});
  assert.equal(s.deviceState.navigation.waypoints.length,1);
  s=teacher(s,"navigation",false);
  s=send(s,{kind:"press",control:"mark"});
  assert.equal(s.deviceState.navigation.waypoints.length,1,
    "disable must immediately revoke synthetic position, not delete saved waypoint");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),
    sessionHash(s));
  for(const category of ["Data","System"]){
    const choices=getFcvMenuItems(category,s.deviceState);
    assert.ok(choices.length>=4);
    for(const item of choices){
      assert.ok(!item.choices?.some(x=>/Synthetic|Vietnamese \(training\)/.test(x)),
        category+" device menu must not contain a fictitious training input option");
    }
  }
  assert.ok(!getFcvMenuItems("Data",s.deviceState).some(x=>x.id==="data.position"));
});

test("a separately declared virtual mount fixture enables BDS only with named transducer and operating guards",()=>{
  const settings={...createSession(adapter,TRAINING_SCENARIO).deviceState.settings,
    transducer:"525STID-PWD",draft:"1",bottomDiscrimination:"Graphic"};
  let s=createSession(adapter,TRAINING_SCENARIO);
  s=send(s,{kind:"restore-settings",settings});
  for(const input of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},{kind:"tick",steps:4},
    {kind:"tick",steps:1}])s=send(s,input);
  assert.equal(getFcvMenuItems("Display",s.deviceState).find(x=>
    x.id==="display.bottomDiscrimination").disabled,true);
  s=teacher(s,"virtualMounting",true);
  assert.equal(s.deviceState.syntheticConditions.mountCompatible,true);
  assert.equal(s.deviceState.syntheticConditions.mountAligned,true);
  assert.equal(getFcvMenuItems("Display",s.deviceState).find(x=>
    x.id==="display.bottomDiscrimination").disabled,false);
  const obs=observeSounder(TRAINING_SCENARIO,s.worldState,{columns:24,rows:60});
  assert.equal(projectFcvEcho(obs,s.deviceState,{rows:48}).overlays.bottomDiscrimination,true);
  s=teacher(s,"virtualMounting",false);
  assert.equal(getFcvMenuItems("Display",s.deviceState).find(x=>
    x.id==="display.bottomDiscrimination").disabled,true);
  assert.equal(projectFcvEcho(obs,s.deviceState,{rows:48}).overlays.bottomDiscrimination,false);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),
    sessionHash(s));
});

test("ACCU-FISH and RezBoost require separately enabled named virtual training fixture",()=>{
  const settings={...createSession(adapter,TRAINING_SCENARIO).deviceState.settings,
    transducer:"525STID-PWD",accuFish:"On",rezBoost:"Enhanced"};
  let s=createSession(adapter,TRAINING_SCENARIO);
  s=send(s,{kind:"restore-settings",settings});
  s=send(s,{kind:"down",control:"power"});
  s=send(s,{kind:"up",control:"power",durationMs:100});
  s=send(s,{kind:"tick",steps:4});
  s=send(s,{kind:"tick",steps:1});
  const obs=observeSounder(TRAINING_SCENARIO,s.worldState,{columns:24,rows:60});
  for(const feature of ["accuFish","rezBoost"]){
    assert.equal(getFcvMenuItems("Display",s.deviceState).find(item=>
      item.id==="display."+feature).disabled,true,feature+" must fail closed");
    assert.equal(projectFcvEcho(obs,s.deviceState,{rows:48}).overlays[feature],
      false,feature+" cannot appear from a dropdown choice alone");
  }
  s=teacher(s,"virtualMounting",true);
  for(const feature of ["accuFish","rezBoost"]){
    assert.equal(getFcvMenuItems("Display",s.deviceState).find(item=>
      item.id==="display."+feature).disabled,false,feature+" is synthetic-only");
    assert.equal(projectFcvEcho(obs,s.deviceState,{rows:48}).overlays[feature],true);
  }
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),
    sessionHash(s));
});

test("§1.18 Bottom Type alarm never identifies seabed when Bottom Disc. is unavailable",()=>{
  let s=createSession(adapter,TRAINING_SCENARIO);
  s=send(s,{kind:"restore-settings",settings:{...s.deviceState.settings,
    alarm1:"On"}});
  for(const ev of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},
    {kind:"tick",steps:4},{kind:"tick",steps:1}])s=send(s,ev);
  assert.equal(s.deviceState.settings.transducer,"GENERIC_600W");
  assert.equal(getFcvMenuItems("Display",s.deviceState).find(x=>
    x.id==="display.bottomDiscrimination").disabled,true);
  assert.deepEqual(s.deviceState.alarms.activeIds,[],
    "unavailable BDS may never trigger a synthetic rock alarm");
  assert.equal(s.deviceState.alarms.audible,false);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});

test("fixture event is strictly bounded and is not a persistent device setting",async()=>{
  let s=boot();
  for(const bad of [{kind:"training-fixture",fixture:"gps",enabled:true},
    {kind:"training-fixture",fixture:"navigation",enabled:"true"},
    {kind:"training-fixture",fixture:"navigation",enabled:true,realNmea:true}]){
    assert.throws(()=>send(s,bad),
      /invalid|unsupported|unrecognized|unknown|fixture/i);
  }
  s=teacher(s,"navigation",true);
  const settings=s.deviceState.settings;
  assert.equal(Object.hasOwn(settings,"navigation"),false);
  assert.equal(Object.hasOwn(settings,"virtualMounting"),false);
  assert.equal(Object.hasOwn(settings,"tankenmaruOption"),false);
  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  assert.match(app,/btn-nav-fixture/);
  assert.match(app,/btn-mount-fixture/);
  assert.match(app,/btn-tankenmaru-fixture/);
  const html=await readFile(new URL("../web/index.html",import.meta.url),"utf8");
  const instructor=html.split('<aside class="training-panel">')[1];
  assert.match(instructor,/id="btn-nav-fixture"/);
  assert.match(instructor,/id="btn-mount-fixture"/);
  assert.match(instructor,/id="btn-tankenmaru-fixture"/);
  assert.equal(html.split('<aside class="training-panel">')[0].includes("btn-nav-fixture"),false);
});

test("Bottom Disc Graphic and Probability consume only explicitly labeled synthetic seabed categories",()=>{
  const settings={...createSession(adapter,TRAINING_SCENARIO).deviceState.settings,
    transducer:"525STID-PWD",draft:"1",bottomDiscrimination:"Graphic"};
  let s=createSession(adapter,TRAINING_SCENARIO);
  s=send(s,{kind:"restore-settings",settings});
  for(const ev of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},{kind:"tick",steps:4},
    {kind:"training-fixture",fixture:"virtualMounting",enabled:true},
    {kind:"tick",steps:1}]) s=send(s,ev);
  const fixture=s.deviceState.syntheticConditions.bottomClassification;
  assert.equal(fixture?.sourceClass,"SYNTHETIC_FIXTURE");
  assert.deepEqual(Object.keys(fixture.classes).sort(),
    ["Gravel","Mud","Rock","Sand"]);
  const observation=observeSounder(TRAINING_SCENARIO,s.worldState,{columns:24,rows:60});
  const graphic=projectFcvBottomDiscrimination(projectFcvEcho(observation,
    s.deviceState,{rows:40}));
  assert.equal(graphic.status,"SYNTHETIC_ONLY");
  assert.equal(graphic.mode,"Graphic");
  const probability=projectFcvBottomDiscrimination(projectFcvEcho(observation,
    {...s.deviceState,settings:{...settings,
      bottomDiscrimination:"Probability"}},{rows:40}));
  assert.equal(probability.status,"SYNTHETIC_ONLY");
  assert.equal(probability.mode,"Probability");
  assert.equal(probability.dominantType,graphic.dominantType);
  assert.deepEqual(probability.values,graphic.values);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});
