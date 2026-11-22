import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname,resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FCV588_ADAPTER as adapter } from "../../../../../src/devices/fcv588/adapter.mjs";
import { TRAINING_SCENARIO as scenario } from "../../../../../src/core/scenario.mjs";
import { createSession, dispatch, createReplayEnvelope, replay, sessionHash } from "../../../../../src/core/session.mjs";
import { getFcvMenuItems } from "../../../../../src/devices/fcv588/menu-atlas.mjs";
const inputs=[{kind:"down",control:"power"},{kind:"up",control:"power",durationMs:100},{kind:"tick",steps:4},{kind:"press",control:"menu"},...Array.from({length:5},()=>({kind:"pad",control:"trackpad",direction:"down"}))];
let selection=createSession(adapter,scenario);
for(const input of inputs)selection=dispatch(selection,adapter,input,scenario);
const editing=dispatch(selection,adapter,{kind:"press",control:"enter"},scenario);
const target=dirname(fileURLToPath(import.meta.url));
for(const [name,session,expectedSessionHash,expectedEnvelopeHash] of [
["P14_LEGACY_PROFILE21_SELECTION_ENVELOPE_20261116.json",selection,"f0-fnv1a32-b7e35e70","f0-fnv1a32-b93e124e"],
["P14_LEGACY_PROFILE21_EDITING_ENVELOPE_20261116.json",editing,"f0-fnv1a32-138abeb4","f0-fnv1a32-336863c3"]]){
 const envelope=createReplayEnvelope(session);
 const chosen=getFcvMenuItems("Sounder",session.deviceState)[session.deviceState.overlay.itemIndex]?.id;
 if(adapter.revision!=="F1-public-reference-21"||chosen!=="sounder.whiteMarker"||session.meta.profileHash!=="f0-fnv1a32-f2d5289b"||sessionHash(session)!==expectedSessionHash||envelope.contentFingerprint!==expectedEnvelopeHash||sessionHash(replay(adapter,scenario,envelope))!==expectedSessionHash)throw new Error(`canonical baseline mismatch ${name}`);
 const bytes=JSON.stringify(envelope,null,2)+"\n";
 const path=resolve(target,name);writeFileSync(path,bytes,{flag:"wx"});
 console.log(JSON.stringify({file:path,byteLength:Buffer.byteLength(bytes),sha256:createHash("sha256").update(bytes).digest("hex"),sessionHash:expectedSessionHash,envelopeHash:expectedEnvelopeHash,chosen}));
}