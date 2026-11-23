import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createSession,dispatch,createReplayEnvelope,sessionHash} from "../src/core/session.mjs";
import {fingerprint} from "../src/core/protocol.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {getFcvReplayAdapter,replayFcv588Envelope} from "../src/devices/fcv588/replay-compat.mjs";
import {projectFcvZoom} from "../src/devices/fcv588/echo-projection.mjs";
import {FCV588_ARCHIVE_SIDECAR_VERSION,FCV588_PRESENTATION_CONTRACTS,
  createFcv588ArchiveSidecar,replayFcv588Archive} from "../src/devices/fcv588/archive-compat.mjs";
import * as archiveCompatibility from "../src/devices/fcv588/archive-compat.mjs";
const historicalRaw=readFileSync(new URL("./fixtures/P24_PINNED_PRE_P23_PROFILE22_ENVELOPE_20261117.json",import.meta.url));
const oldEnvelope=JSON.parse(historicalRaw.toString("utf8"));
const profile22Adapter=getFcvReplayAdapter("F1-public-reference-22");
const liveBZ=()=>{
 let state=createSession(profile22Adapter,scenario);
 state=dispatch(state,profile22Adapter,{kind:"restore-settings",
  settings:{zoomMode:"Bottom Zoom",zoomRange:"10"}},scenario);
 return state;
};
const observation=()=>({modelVersion:"P24_SYNTHETIC_ONLY",simTick:0,
 bottomDepthM:50,recommendedAutoRangeM:80,maxDepthM:80,
 syntheticTargets:[],columns:2,rows:81,
 channels:{50:Uint8Array.from({length:162},(_,i)=>Math.floor(i/2)%9*20),
  200:Uint8Array.from({length:162},(_,i)=>Math.floor(i/2)%9*20)}});
const calc=(replayed)=>projectFcvZoom(observation(),replayed.session.deviceState,
 {frequencyKhz:50,rows:81,displayContract:replayed.presentationContract});

test("P24 immutable pre-P23 profile22 envelope fixture remains a state-only replay artifact",()=>{
 assert.equal(createHash("sha256").update(historicalRaw).digest("hex"),
  "a48c56d3856daebad17dedd919d99e80def1c515b9898d77c1c245ee9e69487d");
 assert.equal(oldEnvelope.profileRevision,"F1-public-reference-22");
 assert.equal(oldEnvelope.contentFingerprint,"f0-fnv1a32-e4b18ddb");
 const historical=replayFcv588Envelope(scenario,oldEnvelope);
 assert.equal(sessionHash(historical),"f0-fnv1a32-a429fc78");
 assert.equal(FCV588_ARCHIVE_SIDECAR_VERSION,1);
 assert.deepEqual(FCV588_PRESENTATION_CONTRACTS,["P04_HISTORIC","P23_LOWER_BOTTOM"]);
});

test("P24 old and current profile22 cannot be distinguished without explicit sidecar",()=>{
 const now=createReplayEnvelope(liveBZ());
 for(const envelope of [oldEnvelope,now]){
  assert.equal(envelope.profileRevision,"F1-public-reference-22");
  assert.throws(()=>replayFcv588Archive(scenario,envelope,null),
   /FCV588_ARCHIVE_PRESENTATION_AMBIGUOUS/);
  assert.throws(()=>replayFcv588Archive(scenario,envelope,undefined),
   /FCV588_ARCHIVE_PRESENTATION_AMBIGUOUS/);
 }
 assert.equal(sessionHash(replayFcv588Envelope(scenario,oldEnvelope)),"f0-fnv1a32-a429fc78",
  "core state-only replay remains valid without a display sidecar");
});

test("P24 source-bound legacy sidecar replays frozen profile22 without rewriting envelope",()=>{
 const bytes=JSON.stringify(oldEnvelope),sidecar=createFcv588ArchiveSidecar(oldEnvelope,
  {presentationContract:"P04_HISTORIC"});
 assert.deepEqual(Object.keys(sidecar).sort(),["contentFingerprint","presentationContract",
  "replayContentFingerprint","sidecarVersion"].sort());
 assert.equal(sidecar.replayContentFingerprint,oldEnvelope.contentFingerprint);
 assert.equal(replayFcv588Archive(scenario,oldEnvelope,sidecar).presentationContract,"P04_HISTORIC");
 const restored=replayFcv588Archive(scenario,oldEnvelope,sidecar);
 assert.equal(restored.presentationContract,"P04_HISTORIC");
 assert.equal(sessionHash(restored.session),"f0-fnv1a32-a429fc78");
 assert.equal(JSON.stringify(oldEnvelope),bytes,"original replay envelope bytes unchanged");
});

test("P24 identical profile22 state bytes select historical or current BZ by explicit bound sidecar",()=>{
 const state=liveBZ(),envelope=createReplayEnvelope(state),before=JSON.stringify(envelope);
 const legacy=createFcv588ArchiveSidecar(envelope,{presentationContract:"P04_HISTORIC"});
 const modern=createFcv588ArchiveSidecar(envelope,{presentationContract:"P23_LOWER_BOTTOM"});
 const old=replayFcv588Archive(scenario,envelope,legacy);
 const fresh=replayFcv588Archive(scenario,envelope,modern);
 assert.equal(sessionHash(old.session),sessionHash(state));
 assert.equal(sessionHash(fresh.session),sessionHash(state));
 assert.equal(JSON.stringify(envelope),before);
 const a=calc(old),b=calc(fresh);
 assert.equal(a.startDepthM,45);
 assert.equal(b.startDepthM,42.5);
 assert.equal((50-a.startDepthM)/a.windowDepthM,.5);
 assert.equal((50-b.startDepthM)/b.windowDepthM,.75);
 assert.notDeepEqual(a.pixels,b.pixels,"depth-patterned synthetic zoom bytes respond to display version");
});

test("P24 mismatched, tampered, spoofed or ambiguous metadata fails closed",()=>{
 const source=createReplayEnvelope(liveBZ());
 const sidecar=createFcv588ArchiveSidecar(source,{presentationContract:"P23_LOWER_BOTTOM"});
 const other={...source,contentFingerprint:oldEnvelope.contentFingerprint};
 assert.throws(()=>replayFcv588Archive(scenario,other,sidecar),/fingerprint|mismatch|content/i);
 assert.throws(()=>replayFcv588Archive(scenario,oldEnvelope,sidecar),/mismatch|binding|fingerprint/i);
 assert.throws(()=>replayFcv588Archive(scenario,source,{...sidecar,presentationContract:"P04_HISTORIC"}),
  /fingerprint|mismatch/i);
 assert.throws(()=>replayFcv588Archive(scenario,source,{...sidecar,unexpected:true}),
  /schema|fields|shape|unknown/i);
 assert.throws(()=>createFcv588ArchiveSidecar(source,{presentationContract:"UNKNOWN"}),
  /unsupported|contract/i);
 assert.throws(()=>replayFcv588Archive(scenario,source,{...sidecar,replayContentFingerprint:"f0-bad"}),
  /fingerprint|binding|mismatch/i);
 assert.throws(()=>replayFcv588Archive(scenario,{...source,events:[]},sidecar),
  /content|mismatch|replay/i);
 assert.throws(()=>replayFcv588Archive(scenario,source,{...sidecar,sidecarVersion:2}),
  /version|schema/i);
 assert.throws(()=>replayFcv588Archive(scenario,source,{...sidecar,contentFingerprint:"f0-bad"}),
  /fingerprint|mismatch/i);
});

test("P24 hidden non-enumerable contract may not escape the sidecar fingerprint",()=>{
 const envelope=createReplayEnvelope(liveBZ());
 const body={sidecarVersion:1,replayContentFingerprint:envelope.contentFingerprint};
 const attacker={...body,contentFingerprint:fingerprint(body)};
 Object.defineProperty(attacker,"presentationContract",{value:"P04_HISTORIC",
  writable:true,enumerable:false,configurable:true});
 assert.throws(()=>replayFcv588Archive(scenario,envelope,attacker),/schema|fields/i);
 attacker.presentationContract="P23_LOWER_BOTTOM";
 assert.throws(()=>replayFcv588Archive(scenario,envelope,attacker),/schema|fields/i);
});

test("P24 no public partial resolver can declare a display contract without replay",()=>{
 assert.equal(Object.hasOwn(archiveCompatibility,"resolveFcv588ArchivePresentation"),false);
});
