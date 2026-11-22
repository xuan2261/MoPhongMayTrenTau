import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import * as Scenario from "../src/core/scenario.mjs";
import {fingerprint} from "../src/core/protocol.mjs";
import {initialFcv588State} from "../src/devices/fcv588/model.mjs";
import {projectFcvZoom,advanceFcvPictureHistory} from
  "../src/devices/fcv588/echo-projection.mjs";

const digest=value=>createHash("sha256").update(value).digest("hex");

function stateFor(){
  const state=initialFcv588State();
  state.settings={...state.settings,zoomMode:"Bottom Lock",blRange:"5",
    smoothing:"Off",clutter:"0",colorErase:"0",interference:"Off",tvg:"Low"};
  return state;
}

function sourceIdentityFor(scenario,world,columns){
  if(typeof Scenario.projectSyntheticSounderSourceIdentity==="function"){
    return Scenario.projectSyntheticSounderSourceIdentity(scenario,world,{columns});
  }
  return Object.freeze({
    sourceClass:"SYNTHETIC_SOUNDER_SOURCE_IDENTITY_V1",
    scenarioId:scenario.id,scenarioVersion:scenario.version,
    scenarioFingerprint:fingerprint(scenario),
    sensorModelVersion:Scenario.SENSOR_MODEL_VERSION,
    simTick:world.simTick,worldBottomDepthM:world.bottomDepthM,columns,
  });
}

test("P04 provenance v2 rejects cross-scenario metadata and inconsistent world bottom",()=>{
  const columns=24;
  const scenarioA={...Scenario.TRAINING_SCENARIO,id:"p04-binding-A",version:11,
    bottomDepthM:50,bottomVariationM:5,fish:Object.freeze([])};
  const scenarioB={...Scenario.TRAINING_SCENARIO,id:"p04-binding-B",version:12,
    bottomDepthM:50,bottomVariationM:20,fish:Object.freeze([])};
  // At tick 0 both worlds have the same current bottom. Historical columns do not,
  // so model/tick/current-bottom checks alone cannot distinguish the sources.
  const worldA=Scenario.initialWorldState(scenarioA);
  const worldB=Scenario.initialWorldState(scenarioB);
  assert.equal(worldA.bottomDepthM,worldB.bottomDepthM);
  const observation=Scenario.observeSounder(scenarioA,worldA,{columns,rows:301});
  const own=Scenario.projectSyntheticSeabedProvenance(scenarioA,worldA,{columns});
  const foreign=Scenario.projectSyntheticSeabedProvenance(scenarioB,worldB,{columns});
  const authoritative=sourceIdentityFor(scenarioA,worldA,columns);
  assert.notEqual(own.scenarioId,foreign.scenarioId);
  assert.notEqual(own.scenarioVersion,foreign.scenarioVersion);

  const state=stateFor();
  const failClosed=projectFcvZoom(observation,state,{frequencyKhz:50,rows:120,
    seabedSourceIdentity:authoritative});
  const accepted=projectFcvZoom(observation,state,{frequencyKhz:50,rows:120,
    seabedProvenance:own,seabedSourceIdentity:authoritative});
  const crossed=projectFcvZoom(observation,state,{frequencyKhz:50,rows:120,
    seabedProvenance:foreign,seabedSourceIdentity:authoritative});
  assert.notEqual(digest(accepted.pixels),digest(failClosed.pixels),
    "source-valid own-scenario provenance must remain eligible for Bottom Lock");
  assert.equal(digest(crossed.pixels),digest(failClosed.pixels),
    "foreign scenario provenance must fail closed even when tick/model/current bottom match");

  assert.throws(()=>Scenario.projectSyntheticSeabedProvenance(scenarioA,
    {...worldA,bottomDepthM:worldA.bottomDepthM+1},{columns}),/world.*bottom/i,
  "producer must reject a world bottom inconsistent with the authored scenario at that tick");
});

test("P04 provenance v2 tick231 maps authored raw bottom through makeEchoFrame sampling",()=>{
  const columns=160;
  const world=Scenario.advanceWorld(Scenario.TRAINING_SCENARIO,
    Scenario.initialWorldState(Scenario.TRAINING_SCENARIO),231);
  const observation=Scenario.observeSounder(Scenario.TRAINING_SCENARIO,world,
    {columns,rows:301});
  const provenance=Scenario.projectSyntheticSeabedProvenance(
    Scenario.TRAINING_SCENARIO,world,{columns});
  const authoritative=sourceIdentityFor(Scenario.TRAINING_SCENARIO,world,columns);
  const zoom=projectFcvZoom(observation,stateFor(),{frequencyKhz:50,rows:120,
    seabedProvenance:provenance,seabedSourceIdentity:authoritative});
  const missed=[];
  for(let x=0;x<columns;x++){
    let strong=false;
    for(let y=114;y<120;y++)if(zoom.pixels[y*columns+x]>=80)strong=true;
    if(!strong)missed.push(x);
  }
  assert.deepEqual(missed,[],
    `all authored historical bottom columns must reach the BL lower band; missed ${missed.length}`);
});

test("P04 provenance v2 Stop freezes BL depth-window metadata with frozen pixels",()=>{
  const columns=160,state=stateFor();
  const frameAt=(tick,frameState)=>{
    const world=Scenario.advanceWorld(Scenario.TRAINING_SCENARIO,
      Scenario.initialWorldState(Scenario.TRAINING_SCENARIO),tick);
    const observation=Scenario.observeSounder(Scenario.TRAINING_SCENARIO,world,
      {columns,rows:301});
    const provenance=Scenario.projectSyntheticSeabedProvenance(
      Scenario.TRAINING_SCENARIO,world,{columns});
    const authoritative=sourceIdentityFor(Scenario.TRAINING_SCENARIO,world,columns);
    const projected=projectFcvZoom(observation,frameState,{frequencyKhz:50,rows:120,
      seabedProvenance:provenance,seabedSourceIdentity:authoritative});
    return {...projected,bottomDepthM:observation.bottomDepthM};
  };
  const first=frameAt(231,state);
  const history=advanceFcvPictureHistory(null,first,state,231);
  const stop={...state,settings:{...state.settings,pictureAdvance:"Stop"}};
  const latest=frameAt(241,stop);
  assert.notEqual(latest.startDepthM,history.startDepthM,
    "fixture must move the authored bottom while display is stopped");
  const frozen=advanceFcvPictureHistory(history,latest,stop,241);
  assert.equal(digest(frozen.pixels),digest(history.pixels));
  assert.equal(frozen.startDepthM,history.startDepthM,
    "frozen pixels must keep the depth window that produced them");
  assert.equal(frozen.bottomDepthM,history.bottomDepthM,
    "frozen pixels must keep matching typed bottom display metadata");
  assert.equal(frozen.sourceTick,241,"world/source time still advances while picture is stopped");
});
