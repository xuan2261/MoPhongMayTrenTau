import test from "node:test";
import assert from "node:assert/strict";
import {getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";
import {TRAINING_SCENARIO,initialWorldState,observeSounder} from "../src/core/scenario.mjs";
import {projectFcvEcho} from "../src/devices/fcv588/echo-projection.mjs";
import {initialFcv588State} from "../src/devices/fcv588/model.mjs";
import {FCV588_ADAPTER} from "../src/devices/fcv588/adapter.mjs";
import {createSession,dispatch} from "../src/core/session.mjs";

const baseline=initialFcv588State();
const conditions={depthM:50,speedKn:7,mountCompatible:true,mountAligned:true};

test("generic Type=[600W] forbids all advanced visual claims, even under forged On settings", () => {
  const settings={...baseline.settings,accuFish:"On",rezBoost:"Enhanced",
    bottomDiscrimination:"Graphic",draft:"1"};
  const guarded=getFcvMenuItems("Display",{...baseline,settings,syntheticConditions:conditions});
  for(const id of ["display.accuFish","display.rezBoost","display.bottomDiscrimination"]) {
    assert.equal(guarded.find(x=>x.id===id).disabled,true,id);
  }
  const o=observeSounder(TRAINING_SCENARIO,initialWorldState(TRAINING_SCENARIO),
    {columns:24,rows:60});
  const projection=projectFcvEcho(o,{...baseline,settings,syntheticConditions:conditions},
    {rows:48,frequencyKhz:50});
  assert.equal(projection.overlays.bottomDiscrimination,false);
  assert.equal(projection.overlays.accuFish,false);
  assert.equal(projection.overlays.rezBoost,false);
});

test("virtual 525STID-PWD permits BDS only with draft, mount, Auto and environment guards", () => {
  const settings={...baseline.settings,transducer:"525STID-PWD",draft:"1",
    bottomDiscrimination:"Graphic"};
  const good={...baseline,settings,rangeMode:"auto",syntheticConditions:conditions};
  assert.equal(getFcvMenuItems("Display",good).find(x=>
    x.id==="display.bottomDiscrimination").disabled,false);
  for(const bad of [{depthM:4.9},{depthM:100.1},{speedKn:10.1},
    {mountCompatible:false},{mountAligned:false}]) {
    const context={...good,syntheticConditions:{...conditions,...bad}};
    assert.equal(getFcvMenuItems("Display",context).find(x=>
      x.id==="display.bottomDiscrimination").disabled,true,JSON.stringify(bad));
  }
});

test("runtime never invents a compatible/aligned mounting merely from a named transducer setting",()=>{
  const settings={...baseline.settings,transducer:"525STID-PWD",
    draft:"1",bottomDiscrimination:"Graphic"};
  let session=createSession(FCV588_ADAPTER,TRAINING_SCENARIO);
  const send=input=>{session=dispatch(session,FCV588_ADAPTER,input,TRAINING_SCENARIO);};
  send({kind:"restore-settings",settings});
  assert.notEqual(session.deviceState.syntheticConditions.mountCompatible,true);
  assert.notEqual(session.deviceState.syntheticConditions.mountAligned,true);
  send({kind:"down",control:"power"});
  send({kind:"up",control:"power",durationMs:100});
  send({kind:"tick",steps:4});
  send({kind:"tick",steps:1});
  const state=session.deviceState;
  assert.notEqual(state.syntheticConditions.mountCompatible,true,
    "plain synthetic sonar observations do not attest physical mounting");
  assert.notEqual(state.syntheticConditions.mountAligned,true);
  const entry=getFcvMenuItems("Display",state).find(x=>x.id==="display.bottomDiscrimination");
  assert.equal(entry.disabled,true,"named transducer selection cannot pass unverified mount guards");
  const o=observeSounder(TRAINING_SCENARIO,session.worldState,{columns:24,rows:60});
  assert.equal(projectFcvEcho(o,state,{rows:48}).overlays.bottomDiscrimination,false);
});
