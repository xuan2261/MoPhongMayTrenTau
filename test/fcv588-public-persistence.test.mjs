import test from "node:test";
import assert from "node:assert/strict";
import {initialFcv588State} from "../src/devices/fcv588/model.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";
import {createSession,dispatch,sessionHash,replay,createReplayEnvelope} from "../src/core/session.mjs";
import {encodeFcvSettings,decodeFcvSettings,validateFcvSettings,
  FCV_SETTINGS_STORAGE_KEY} from "../src/devices/fcv588/settings.mjs";
import {readFile} from "node:fs/promises";
import {fingerprint} from "../src/core/protocol.mjs";

const send=(s,input)=>dispatch(s,adapter,input,TRAINING_SCENARIO);

test("local training settings roundtrip is schema-versioned, bounded and never includes serials",()=>{
  const settings={...initialFcv588State().settings,pictureAdvance:"1/4",
    transducer:"GENERIC_1KW",units:"Feet",demo:"Off"};
  const encoded=encodeFcvSettings(settings);
  assert.match(encoded,/"schemaVersion":18/);
  assert.equal(adapter.revision,"F1-public-reference-23",
    "V43 OEM BRILL behavior requires a distinct replay/settings profile boundary");
  assert.match(FCV_SETTINGS_STORAGE_KEY,/settings\.v18$/);
  assert.equal(JSON.parse(encoded).profileRevision,adapter.revision);
  assert.match(FCV_SETTINGS_STORAGE_KEY,/fcv588.*settings/);
  const decoded=decodeFcvSettings(encoded);
  assert.deepEqual(decoded,settings);
  assert.equal(Object.keys(JSON.parse(encoded)).includes("serialNumber"),false);
  assert.equal(decodeFcvSettings("not json"),null,"corrupt storage fails closed");
});

test("stored settings reject old schema and same-schema foreign profile even if checksum is recomputed",()=>{
  const settings=initialFcv588State().settings;
  const encoded=JSON.parse(encodeFcvSettings(settings));
  assert.equal(encoded.schemaVersion,18);
  const old={...encoded,schemaVersion:17,
    profileRevision:"F1-public-reference-18"};
  const oldBody={schemaVersion:old.schemaVersion,profileClass:old.profileClass,
    profileRevision:old.profileRevision,settings:old.settings};
  old.contentFingerprint=fingerprint(oldBody);
  assert.equal(decodeFcvSettings(JSON.stringify(old)),null);
  const wrong={...encoded,profileRevision:"F0-provisional-1"};
  wrong.contentFingerprint=fingerprint({schemaVersion:wrong.schemaVersion,
    profileClass:wrong.profileClass,profileRevision:wrong.profileRevision,
    settings:wrong.settings});
  assert.equal(decodeFcvSettings(JSON.stringify(wrong)),null);
});

test("reloaded settings are applied only through a canonical logged replay event",()=>{
  const settings={...initialFcv588State().settings,units:"Feet",
    pictureAdvance:"1/2"};
  let s=createSession(adapter,TRAINING_SCENARIO);
  s=send(s,{kind:"restore-settings",settings:decodeFcvSettings(
    encodeFcvSettings(settings))});
  assert.equal(s.deviceState.settings.units,"Feet");
  assert.equal(s.deviceState.power,"off","browser reload should not secretly turn on");
  assert.equal(s.worldState.simTick,0);
  assert.equal(s.events[0].kind,"restore-settings");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),
    sessionHash(s),"profile-bound setting restoration must replay");
});

test("new profile never treats a stored Tankenmaru On preference as proof of optional hardware",()=>{
  const initial=initialFcv588State();
  const encoded=encodeFcvSettings({...initial.settings,tankenmaru:"On"});
  const restored=decodeFcvSettings(encoded);
  assert.equal(restored.tankenmaru,"On",
    "settings codec may store this menu value but does not grant option presence");
  let s=createSession(adapter,TRAINING_SCENARIO);
  s=send(s,{kind:"restore-settings",settings:restored});
  assert.equal(s.deviceState.settings.tankenmaru,"Off",
    "without D15 option declaration, boot must fail closed and not hide NMEA");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),
    sessionHash(s));
  const legacy=JSON.parse(encoded);
  legacy.schemaVersion=17;
  legacy.profileRevision="F1-public-reference-18";
  legacy.contentFingerprint=fingerprint({schemaVersion:legacy.schemaVersion,
    profileClass:legacy.profileClass,profileRevision:legacy.profileRevision,
    settings:legacy.settings});
  assert.equal(decodeFcvSettings(JSON.stringify(legacy)),null,
    "previous profile's persisted option state must not gain new meaning silently");
});

test("malformed settings and prototype-pollution keys are rejected, not executed",()=>{
  const original=initialFcv588State().settings;
  assert.equal(decodeFcvSettings(JSON.stringify({schemaVersion:1,settings:{
    ...original,transducer:"NOT_A_REAL_TYPE"}})),null);
  assert.throws(()=>validateFcvSettings({...original,
    ["__proto__"]:"evil"}),/invalid|unknown|unsafe/i);
  const valid={...original};
  assert.throws(()=>encodeFcvSettings({...valid,externalNmeaPublisher:"udp"}),
    /invalid|unknown|unsafe/i);
});

test("browser reload explicitly replays vetted local settings, not an unlogged state mutation",async()=>{
  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  assert.match(app,/FCV_SETTINGS_STORAGE_KEY/);
  assert.match(app,/decodeFcvSettings/);
  assert.match(app,/encodeFcvSettings/);
  assert.match(app,/kind:\s*"restore-settings"/);
  assert.match(app,/localStorage\.getItem/);
  assert.match(app,/localStorage\.setItem/);
  assert.doesNotMatch(app,/innerHTML\s*=/);
});
