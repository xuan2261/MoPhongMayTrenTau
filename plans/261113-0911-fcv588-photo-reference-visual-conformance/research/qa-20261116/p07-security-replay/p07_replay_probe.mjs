import assert from "node:assert/strict";
import {createHash} from "node:crypto";

import {createSession,dispatch,createReplayEnvelope,replay,sessionHash} from
  "../../../../../src/core/session.mjs";
import {fingerprint} from "../../../../../src/core/protocol.mjs";
import * as Scenario from "../../../../../src/core/scenario.mjs";
import {FCV588_ADAPTER} from "../../../../../src/devices/fcv588/adapter.mjs";
import {FCV588_PUBLIC_PROFILE_REVISION} from
  "../../../../../src/devices/fcv588/profile-version.mjs";
import {projectFcvEcho,projectFcvZoom} from
  "../../../../../src/devices/fcv588/echo-projection.mjs";

const digest=value=>createHash("sha256").update(value).digest("hex");

function runSession(){
  let session=createSession(FCV588_ADAPTER,Scenario.TRAINING_SCENARIO);
  const inputs=[
    {kind:"tick",steps:2},
    {kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},
    {kind:"tick",steps:4},
    {kind:"training-fixture",fixture:"navigation",enabled:true},
    {kind:"tick",steps:3},
  ];
  for(const input of inputs){
    session=dispatch(session,FCV588_ADAPTER,input,Scenario.TRAINING_SCENARIO);
  }
  return session;
}

const sessionA=runSession();
const sessionB=runSession();
const hashA=sessionHash(sessionA);
const hashB=sessionHash(sessionB);
assert.equal(hashA,hashB,"same source-valid event sequence must have stable sessionHash");

const envelope=createReplayEnvelope(sessionA);
assert.equal(FCV588_ADAPTER.revision,FCV588_PUBLIC_PROFILE_REVISION);
assert.equal(FCV588_PUBLIC_PROFILE_REVISION,"F1-public-reference-21");
assert.equal(envelope.profileRevision,FCV588_PUBLIC_PROFILE_REVISION);
assert.equal(envelope.finalSessionHash,hashA);
const replayed=replay(FCV588_ADAPTER,Scenario.TRAINING_SCENARIO,envelope);
const replayHash=sessionHash(replayed);
assert.equal(replayHash,hashA,"replay must reproduce final canonical session hash");

let wrongProfileRejected=false;
try{
  replay({...FCV588_ADAPTER,revision:"P07_WRONG_PROFILE"},
    Scenario.TRAINING_SCENARIO,envelope);
}catch(error){
  wrongProfileRejected=/profile|contract/i.test(String(error?.message??error));
}
assert.equal(wrongProfileRejected,true,"profile drift must be rejected by replay contract");

const observationArgs={columns:40,rows:121};
const observationA=Scenario.observeSounder(Scenario.TRAINING_SCENARIO,
  sessionA.worldState,observationArgs);
const observationB=Scenario.observeSounder(Scenario.TRAINING_SCENARIO,
  sessionA.worldState,observationArgs);
const rawBefore={
  lf:digest(observationA.channels[50]),
  hf:digest(observationA.channels[200]),
};
assert.equal(rawBefore.lf,digest(observationB.channels[50]));
assert.equal(rawBefore.hf,digest(observationB.channels[200]));
assert.deepEqual(Object.keys(observationA).sort(),[
  "bottomDepthM","channels","columns","maxDepthM","modelVersion",
  "recommendedAutoRangeM","rows","simTick","syntheticTargets",
]);

const baseState=sessionA.deviceState;
const projectionRows=80;
const provenance=Scenario.projectSyntheticSeabedProvenance(
  Scenario.TRAINING_SCENARIO,sessionA.worldState,{columns:observationA.columns});
const sourceIdentity=Scenario.projectSyntheticSounderSourceIdentity(
  Scenario.TRAINING_SCENARIO,sessionA.worldState,{columns:observationA.columns});

const cases=[
  {label:"LF",mode:"LF",frequencyKhz:50,zoom:null},
  {label:"HF",mode:"HF",frequencyKhz:200,zoom:null},
  {label:"DUAL-LF",mode:"DUAL",frequencyKhz:50,zoom:null},
  {label:"DUAL-HF",mode:"DUAL",frequencyKhz:200,zoom:null},
  {label:"NAV1-sonar",mode:"NAV1",frequencyKhz:50,zoom:null},
  {label:"NAV2-sonar",mode:"NAV2",frequencyKhz:50,zoom:null},
  {label:"Bottom Zoom",mode:"LF-ZOOM",frequencyKhz:50,zoom:"Bottom Zoom"},
  {label:"Bottom Lock",mode:"LF-ZOOM",frequencyKhz:50,zoom:"Bottom Lock"},
  {label:"Marker Zoom",mode:"LF-ZOOM",frequencyKhz:50,zoom:"Marker Zoom"},
];

const projections=[];
for(const item of cases){
  const state={...baseState,mode:item.mode,
    vrmDepthM:item.zoom==="Marker Zoom"?30:baseState.vrmDepthM,
    settings:{...baseState.settings,
      zoomMode:item.zoom??baseState.settings.zoomMode,
      smoothing:"Off",clutter:"0",colorErase:"0",interference:"Off",tvg:"Low",
    }};
  const options={frequencyKhz:item.frequencyKhz,rows:projectionRows};
  let first,second;
  if(item.zoom){
    const zoomOptions=item.zoom==="Bottom Lock"
      ?{...options,seabedProvenance:provenance,seabedSourceIdentity:sourceIdentity}
      :options;
    first=projectFcvZoom(observationA,state,zoomOptions);
    second=projectFcvZoom(observationA,state,zoomOptions);
  }else{
    first=projectFcvEcho(observationA,state,options);
    second=projectFcvEcho(observationA,state,options);
  }
  const firstHash=digest(first.pixels),secondHash=digest(second.pixels);
  assert.equal(firstHash,secondHash,`${item.label} display projection must be deterministic`);
  projections.push({label:item.label,mode:item.mode,frequencyKhz:item.frequencyKhz,
    zoomMode:item.zoom,pixelSha256:firstHash,rangeM:first.rangeM,
    startDepthM:first.startDepthM??0,bottomDepthM:observationA.bottomDepthM});
}

const observationAfter=Scenario.observeSounder(Scenario.TRAINING_SCENARIO,
  sessionA.worldState,observationArgs);
const rawAfter={
  lf:digest(observationAfter.channels[50]),
  hf:digest(observationAfter.channels[200]),
};
assert.deepEqual(rawAfter,rawBefore,
  "mode/zoom display projections must not mutate or reinterpret raw sonar bytes");
assert.equal(observationAfter.simTick,observationA.simTick);
assert.equal(observationAfter.bottomDepthM,observationA.bottomDepthM);

const result={
  schema:"fcv588-p07-security-replay-probe-v1",
  status:"PASS",
  profileRevision:FCV588_PUBLIC_PROFILE_REVISION,
  sensorModelVersion:Scenario.SENSOR_MODEL_VERSION,
  scenario:{id:Scenario.TRAINING_SCENARIO.id,version:Scenario.TRAINING_SCENARIO.version,
    seed:Scenario.TRAINING_SCENARIO.seed,fingerprint:fingerprint(Scenario.TRAINING_SCENARIO)},
  session:{eventCount:sessionA.events.length,simTick:sessionA.worldState.simTick,
    sessionHash:hashA,repeatSessionHash:hashB,replayHash,
    replayEnvelopeVersion:envelope.envelopeVersion,
    envelopeFingerprint:envelope.contentFingerprint,
    profileRevision:envelope.profileRevision,wrongProfileRejected},
  rawSonar:{columns:observationA.columns,rows:observationA.rows,
    simTick:observationA.simTick,bottomDepthM:observationA.bottomDepthM,
    before:rawBefore,after:rawAfter,deterministic:true,
    unchangedAcrossDisplayProjection:true},
  projections,
  sourceValidBottomCompanion:{
    sourceClass:provenance.sourceClass,
    sourceIdentityClass:sourceIdentity.sourceClass,
    scenarioId:provenance.scenarioId,scenarioVersion:provenance.scenarioVersion,
    simTick:provenance.simTick,columns:provenance.columns,
  },
};

process.stdout.write(JSON.stringify(result,null,2)+"\n");
