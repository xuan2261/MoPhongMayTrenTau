import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import * as Scenario from "../src/core/scenario.mjs";
import {initialFcv588State} from "../src/devices/fcv588/model.mjs";
import {projectFcvZoom,advanceFcvPictureHistory,projectFcvBottomZone} from
  "../src/devices/fcv588/echo-projection.mjs";

function blState(pictureAdvance="1x"){
  const state=initialFcv588State();
  state.settings={...state.settings,zoomMode:"Bottom Lock",blRange:"5",
    bottomZone:"Standard",pictureAdvance,smoothing:"Off",clutter:"0",
    colorErase:"0",interference:"Off",tvg:"Low"};
  return state;
}

function frameAt(tick,state){
  const columns=160;
  const world=Scenario.advanceWorld(Scenario.TRAINING_SCENARIO,
    Scenario.initialWorldState(Scenario.TRAINING_SCENARIO),tick);
  const observation=Scenario.observeSounder(Scenario.TRAINING_SCENARIO,world,
    {columns,rows:301});
  const seabedProvenance=Scenario.projectSyntheticSeabedProvenance(
    Scenario.TRAINING_SCENARIO,world,{columns});
  const seabedSourceIdentity=Scenario.projectSyntheticSounderSourceIdentity(
    Scenario.TRAINING_SCENARIO,world,{columns});
  const frame=projectFcvZoom(observation,state,{frequencyKhz:50,rows:120,
    seabedProvenance,seabedSourceIdentity});
  return {observation,frame:{...frame,bottomDepthM:observation.bottomDepthM}};
}

test("P04 provenance v3 Stop bottom-zone overlay follows frozen frame bottom metadata",async()=>{
  const running=blState("1x");
  const at231=frameAt(231,running);
  const history=advanceFcvPictureHistory(null,at231.frame,running,231);
  const stop=blState("Stop");
  const at241=frameAt(241,stop);
  const frozen=advanceFcvPictureHistory(history,at241.frame,stop,241);

  assert.equal(frozen.bottomDepthM,43.425751760434835);
  assert.equal(at241.observation.bottomDepthM,46.508297394017724);
  assert.deepEqual(projectFcvBottomZone(frozen,frozen.bottomDepthM,"Standard"),{
    widthM:10,topFraction:0,bottomFraction:1,sourceClass:"SYNTHETIC_DISPLAY_ONLY",
  });
  assert.equal(projectFcvBottomZone(frozen,at241.observation.bottomDepthM,"Standard"),null,
    "reviewer reproduction: current observation depth makes the frozen overlay disappear");

  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  const render=app.slice(app.indexOf("function renderScreen()"),
    app.indexOf("function renderMainMenuChrome("));
  const staleCalls=render.match(/drawOverlays\([^;]*o\.bottomDepthM\s*\)/gs)??[];
  assert.deepEqual(staleCalls,[],
    "drawOverlays must use each history-qualified frame.bottomDepthM, not current observation depth");
});
