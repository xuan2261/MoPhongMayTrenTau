/**
 * P13 source-frozen replay guard. A Sounder menu row is selected by numeric
 * overlay.itemIndex, not a stable semantic ID. Never silently equate green UI
 * tests with historical replay/profile compatibility.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {join,relative} from "node:path";
import {pathToFileURL} from "node:url";

const ROOT="C:\\Work\\MoPhongMayTrenTau";
const STAGE=join(ROOT,"_p13_stage_20261116");
const QA=join(ROOT,"plans","261113-0911-fcv588-photo-reference-visual-conformance",
  "research","qa-20261116","p13-semantic");
const DEST=join(QA,"P13_PROFILE21_REPLAY_SEMANTIC_DRIFT_20261116.json");
const sha=async p=>createHash("sha256").update(await readFile(p)).digest("hex");
const moduleAt=(root,p)=>import(pathToFileURL(join(root,p)).href);
const [oldSession,newSession,oldAdapter,newAdapter,oldMenu,newMenu,oldScenario,newScenario]=
 await Promise.all([
   moduleAt(ROOT,"src/core/session.mjs"),
   moduleAt(STAGE,"src/core/session.mjs"),
   moduleAt(ROOT,"src/devices/fcv588/adapter.mjs"),
   moduleAt(STAGE,"src/devices/fcv588/adapter.mjs"),
   moduleAt(ROOT,"src/devices/fcv588/menu-atlas.mjs"),
   moduleAt(STAGE,"src/devices/fcv588/menu-atlas.mjs"),
   moduleAt(ROOT,"src/core/scenario.mjs"),
   moduleAt(STAGE,"src/core/scenario.mjs"),
 ]);
const oldA=oldAdapter.FCV588_ADAPTER;
const newA=newAdapter.FCV588_ADAPTER;
const oldS=oldScenario.TRAINING_SCENARIO;
const newS=newScenario.TRAINING_SCENARIO;
assert.equal(oldA.revision,"F1-public-reference-21");
assert.equal(newA.revision,oldA.revision);
assert.equal(await sha(join(ROOT,"src/devices/fcv588/menu-atlas.mjs")),
  "992d7a6e1f3a645680ea73f87ce2863a9e9f38eb16428a4581ad5e7e71a58aed");
assert.equal(await sha(join(STAGE,"src/devices/fcv588/menu-atlas.mjs")),
  "e2ba214cf81aa739452dc1ecd0ddfdcc7fad7814478a2d5e27e6925eda945aca");

const inputs=[
 {kind:"down",control:"power"},
 {kind:"up",control:"power",durationMs:100},
 {kind:"tick",steps:4},
 {kind:"press",control:"menu"},
 ...Array.from({length:5},()=>({kind:"pad",control:"trackpad",direction:"down"}))
];
function run(api,adapter,scenario,events){
 let s=api.createSession(adapter,scenario);
 for(const event of events)s=api.dispatch(s,adapter,event,scenario);
 return s;
}
const previous=run(oldSession,oldA,oldS,inputs);
const candidate=run(newSession,newA,newS,inputs);
const oldSelected=oldMenu.getFcvMenuItems("Sounder",previous.deviceState)
  [previous.deviceState.overlay.itemIndex].id;
const newSelected=newMenu.getFcvMenuItems("Sounder",candidate.deviceState)
  [candidate.deviceState.overlay.itemIndex].id;
assert.equal(oldSelected,"sounder.whiteMarker");
assert.equal(newSelected,"sounder.clutter");
assert.notEqual(newSelected,oldSelected);
assert.equal(previous.deviceState.overlay.itemIndex,candidate.deviceState.overlay.itemIndex);
const beforeHash=oldSession.sessionHash(previous);
const afterHash=newSession.sessionHash(candidate);
assert.equal(beforeHash,afterHash,
  "selection-only source drift is not protected by the profile21 session hash");
const oldEnvelope=oldSession.createReplayEnvelope(previous);
const oldReplayedUnderNew=newSession.replay(newA,newS,oldEnvelope);
assert.equal(newSession.sessionHash(oldReplayedUnderNew),oldEnvelope.finalSessionHash);
const acceptedId=newMenu.getFcvMenuItems("Sounder",oldReplayedUnderNew.deviceState)
  [oldReplayedUnderNew.deviceState.overlay.itemIndex].id;
assert.equal(acceptedId,newSelected);
assert.notEqual(acceptedId,oldSelected);
const committedOld=oldSession.dispatch(previous,oldA,{kind:"press",control:"enter"},oldS);
const committedEnvelope=oldSession.createReplayEnvelope(committedOld);
let rejectedEditingReplay=null;
try{
 newSession.replay(newA,newS,committedEnvelope);
}catch(err){
 rejectedEditingReplay={name:err?.name??"Error",message:err?.message??String(err)};
}
assert.match(rejectedEditingReplay?.message??"",/replay final state hash mismatch/);
const result={
 schema:"fcv588-p13-profile21-replay-semantic-drift-v1",
 createdAt:new Date().toISOString(),
 status:"VERIFIED_PROFILE21_SELECTION_ONLY_REPLAY_SILENT_SEMANTIC_DRIFT_APPLY_BLOCKER",
 currentMenuSourceSHA256:await sha(join(ROOT,"src/devices/fcv588/menu-atlas.mjs")),
 candidateMenuSourceSHA256:await sha(join(STAGE,"src/devices/fcv588/menu-atlas.mjs")),
 profileRevisionOld:oldA.revision,profileRevisionCandidate:newA.revision,
 sampleOriginalSourceEntryId:oldSelected,
 sampleStagingSourceEntryId:newSelected,
 identicalOperatorEventCount:inputs.length,
 selectionItemIndex:previous.deviceState.overlay.itemIndex,
 originalSessionHash:beforeHash,stagingSessionHash:afterHash,
 sameFinalStateHashEvenThoughSelectedMenuItemDiffers:true,
 historicalReplayAcceptedUnderChangedCode:true,
 historicalReplayInterpretedItem:acceptedId,
 editingCommittedReplayRejection:rejectedEditingReplay,
 expectedConstraint:"Existing profile21 event log/replay semantics must remain intact",
 decision:"NO_GO_SAME_PROFILE_REVISION_MENU_REORDER",
 nextRequired:"Explicit new semantic menu-order revision and supported backward-compatible profile21 replay path (or equivalent source-valid version binding); do not merely patch numeric-index tests and claim compatibility",
 scopeLimits:["No device/runtime/source edits","No external OEM firmware claims",
   "Source-valid new menu order remains staged only, not applied"],
};
await mkdir(QA,{recursive:true});
await writeFile(DEST,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
assert.equal(JSON.parse(await readFile(DEST,"utf8")).decision,result.decision);
console.log(JSON.stringify({status:result.status,
  oldEntry:oldSelected,newEntry:newSelected,
  sameSessionHash:true,replayAccepted:true,
  editingReplayRejected:!!rejectedEditingReplay,
  receiptSHA256:await sha(DEST)}));
