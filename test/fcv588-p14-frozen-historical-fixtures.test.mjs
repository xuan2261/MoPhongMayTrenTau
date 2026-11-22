import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";
import {replayFcv588Envelope} from "../src/devices/fcv588/replay-compat.mjs";
import {getFcvMenuItems as historicItems} from "../src/devices/fcv588/menu-atlas-profile21.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {sessionHash,replay} from "../src/core/session.mjs";
import {FCV588_ADAPTER as active} from "../src/devices/fcv588/adapter.mjs";
import {FCV588_PROFILE21_ADAPTER as archived} from "../src/devices/fcv588/adapter-profile21.mjs";
const qa=resolve(dirname(fileURLToPath(import.meta.url)),"fixtures");
const cases=[
 ["P14_LEGACY_PROFILE21_SELECTION_ENVELOPE_20261116.json","d795b05494618c2e4482598b1e98a65e63bb9aa67e367bf266782e66d1a803dd","f0-fnv1a32-b7e35e70","f0-fnv1a32-b93e124e",9,null],
 ["P14_LEGACY_PROFILE21_EDITING_ENVELOPE_20261116.json","07553d5bb42e0830e5938f9b1879fbed74a621634f3c5b194e2ce38ae18412dd","f0-fnv1a32-138abeb4","f0-fnv1a32-336863c3",10,"sounder.whiteMarker"]
];
for(const [file,sha,expectedSession,expectedFingerprint,eventCount,editor] of cases){
 test(`P14 frozen original canonical profile21 fixture ${file}`,()=>{
  const bytes=readFileSync(resolve(qa,file));
  assert.equal(createHash("sha256").update(bytes).digest("hex"),sha,"immutable canonical JSON bytes");
  const envelope=JSON.parse(bytes.toString("utf8"));
  assert.equal(envelope.profileRevision,"F1-public-reference-21");
  assert.equal(envelope.contentFingerprint,expectedFingerprint);
  const restored=replayFcv588Envelope(scenario,envelope);
  assert.equal(restored.events.length,eventCount);
  assert.equal(restored.meta.profileHash,"f0-fnv1a32-f2d5289b");
  assert.equal(sessionHash(restored),expectedSession);
  assert.equal(historicItems("Sounder",restored.deviceState)[restored.deviceState.overlay.itemIndex].id,"sounder.whiteMarker");
  assert.equal(restored.deviceState.overlay.editEntryId??null,editor);
  assert.throws(()=>replay(active,scenario,envelope),/contract|profile/);
  assert.equal(sessionHash(replay(archived,scenario,envelope)),expectedSession);
 });
}