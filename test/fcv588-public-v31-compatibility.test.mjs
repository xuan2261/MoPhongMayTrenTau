import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {createSession,dispatch,replay,createReplayEnvelope,sessionHash} from "../src/core/session.mjs";
import {fingerprint,CORE_CONTRACT_VERSION,EVENT_SCHEMA_VERSION,REPLAY_ENVELOPE_VERSION} from "../src/core/protocol.mjs";
import {encodeFcvSettings,decodeFcvSettings,decodeFcvProfile19Settings,FCV_SETTINGS_STORAGE_KEY} from "../src/devices/fcv588/settings.mjs";
const legacy=await readFile(new URL("./fixtures/fcv588-v30-profile19-settings.json",import.meta.url),"utf8");
const replayBytes=await readFile(new URL("./fixtures/fcv588-v30-profile19-replay.json",import.meta.url),"utf8");
const hash=s=>createHash("sha256").update(s).digest("hex");
const withFingerprint=body=>JSON.stringify({...body,contentFingerprint:fingerprint(body)});

test("V31 rejects the actual captured V30 replay rather than reinterpreting its staged option history",()=>{
  assert.equal(hash(replayBytes),"adb919e666598127b2f76e284a0ba4dea4506ae15eac11535574ac562297bf4c");
  assert.throws(()=>replay(adapter,scenario,JSON.parse(replayBytes)),/contract|profile/);
  assert.equal(adapter.revision,"F1-public-reference-22");
  assert.equal(CORE_CONTRACT_VERSION,"f1-core-7");
  assert.equal(EVENT_SCHEMA_VERSION,5);assert.equal(REPLAY_ENVELOPE_VERSION,7);
});

test("explicit profile19 migration preserves all validated committed settings but does not weaken normal decode",()=>{
  assert.equal(hash(legacy),"f14235c481a35c5e2af2118729dcfd51c3eb2039bdec739047ba9e5b7e00f111");
  assert.equal(decodeFcvSettings(legacy),null,"normal decoder remains strict to profile21");
  const migrated=decodeFcvProfile19Settings(legacy);
  assert.deepEqual(migrated,JSON.parse(legacy).settings);
  const encoded=encodeFcvSettings(migrated);
  assert.equal(JSON.parse(encoded).schemaVersion,18);
  assert.equal(JSON.parse(encoded).profileRevision,"F1-public-reference-22");
  assert.match(FCV_SETTINGS_STORAGE_KEY,/settings\.v18$/);
  assert.deepEqual(decodeFcvSettings(encoded),migrated);
  let s=createSession(adapter,scenario);
  s=dispatch(s,adapter,{kind:"restore-settings",settings:migrated},scenario);
  assert.equal(s.deviceState.power,"off");assert.equal(s.deviceState.overlay,null);
  assert.equal(s.deviceState.trainingFixture.tankenmaruOption,false);
  assert.equal(s.deviceState.settings.tankenmaru,"Off");
  assert.equal(s.deviceState.settings.whiteLine,"On");assert.equal(s.deviceState.settings.clutter,"67");
  assert.equal(s.events[0].kind,"restore-settings");assert.equal(s.worldState.simTick,0);
  assert.equal(sessionHash(replay(adapter,scenario,createReplayEnvelope(s))),sessionHash(s));
});

test("legacy migration rejects wrong shape, profile, schema, digest and unsupported settings",()=>{
  const {contentFingerprint,...body}=JSON.parse(legacy);
  const candidates=["",null,"not json",legacy.replace('"67"','"68"'),
    withFingerprint({...body,profileRevision:"F1-public-reference-18"}),
    withFingerprint({...body,profileRevision:"F1-public-reference-20"}),
    withFingerprint({...body,profileRevision:"F1-public-reference-999"}),
    withFingerprint({...body,schemaVersion:17}),
    withFingerprint({...body,profileClass:"HARDWARE"}),
    withFingerprint({...body,overlay:{kind:"menu",editing:true,draftValue:"On"}}),
    withFingerprint({...body,settings:{...body.settings,trainingFixture:{tankenmaruOption:true}}}),
    withFingerprint({...body,settings:{...body.settings,whiteLine:"Edge"}}),
    withFingerprint({...body,settings:JSON.parse('{"__proto__":"unsafe"}')}),
  ];
  for(const input of candidates)assert.equal(decodeFcvProfile19Settings(input),null);
});

test("migration retains legitimate ship draft while rejecting transaction draftValue",()=>{
  const {contentFingerprint,...body}=JSON.parse(legacy);
  assert.equal(decodeFcvProfile19Settings(withFingerprint({...body,
    settings:{...body.settings,draft:"5"}}))?.draft,"5");
  assert.equal(decodeFcvProfile19Settings(withFingerprint({...body,
    settings:{...body.settings,draftValue:"On"}})),null);
});
