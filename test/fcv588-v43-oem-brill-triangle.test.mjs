import test from "node:test";
import assert from "node:assert/strict";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {createSession,dispatch,replay,createReplayEnvelope,sessionHash} from "../src/core/session.mjs";
import {EVENT_SCHEMA_VERSION,REPLAY_ENVELOPE_VERSION,fingerprint} from "../src/core/protocol.mjs";
import {encodeFcvSettings,decodeFcvSettings} from "../src/devices/fcv588/settings.mjs";
import {projectFcvControl} from "../web/lcd-control-presentation.mjs";
import {FCV588_TRAINING_LESSONS,assessFcvLesson} from "../src/core/lessons.mjs";

// Primary public oracle: FURUNO FCV-628/FCV-588 OME-23890-E §1.3.
// Repeated BRILL uses 0→1→...→9→8→...→0→1, not modulo 10.
// These assertions concern offline training logic, not installed firmware.
const send=(s,event)=>dispatch(s,adapter,event,scenario);
const short=s=>send(send(s,{kind:"down",control:"power"}),
  {kind:"up",control:"power",durationMs:200});
const powerOn=()=>send(short(createSession(adapter,scenario)),{kind:"tick",steps:4});

test("V43 OEM §1.3 initial BRILL opens at 9 and next SHORT previews 8",()=>{
  const start=powerOn();
  const opened=short(start);
  assert.equal(start.deviceState.brightness,9);
  assert.equal(opened.deviceState.overlay?.kind,"brill");
  assert.equal(opened.deviceState.overlay?.value,9);
  const next=short(opened);
  assert.equal(next.deviceState.overlay?.value,8,"at peak, OEM requires 9→8, not 9→0");
  assert.equal(next.deviceState.brightness,9,"draft is not committed yet");
  assert.equal(projectFcvControl(next.deviceState)?.title,"Brill");
  assert.equal(sessionHash(replay(adapter,scenario,createReplayEnvelope(next))),sessionHash(next));
});

test("V43 repeated BRILL follows OEM rise/fall at BOTH endpoints deterministically",()=>{
  let s=short(powerOn());
  const expected=[8,7,6,5,4,3,2,1,0,1,2,3,4,5,6,7,8,9,8];
  const worldBefore=s.worldState.simTick;
  for(const level of expected){
    s=short(s);
    assert.equal(s.deviceState.overlay?.value,level,"wrong BRILL level at sequence position "+level);
    assert.equal(s.deviceState.overlay?.elapsedMs,0);
  }
  assert.equal(s.worldState.simTick,worldBefore);
  assert.equal(s.deviceState.brightness,9);
  assert.equal(sessionHash(replay(adapter,scenario,createReplayEnvelope(s))),sessionHash(s));
});

test("V43 independent six-second UI clock and ENTER/MENU commits keep preview",()=>{
  let s=short(short(powerOn()));
  const before=s.worldState.simTick;
  s=send(s,{kind:"ui-tick",elapsedMs:5999});
  assert.equal(s.deviceState.overlay?.value,8);
  s=send(s,{kind:"ui-tick",elapsedMs:1});
  assert.equal(s.deviceState.overlay,null);
  assert.equal(s.deviceState.brightness,8);
  assert.equal(s.worldState.simTick,before);
  s=short(s); // reopen without changing committed brightness
  assert.equal(s.deviceState.overlay?.value,8);
  s=send(s,{kind:"press",control:"menu"});
  assert.equal(s.deviceState.overlay,null);
  assert.equal(s.deviceState.brightness,8);
  assert.equal(sessionHash(replay(adapter,scenario,createReplayEnvelope(s))),sessionHash(s));
});

test("V43 cancelled POWER hold preserves BRILL preview and descending progression",()=>{
  let s=short(short(powerOn())); // preview 8 from 9
  s=send(s,{kind:"down",control:"power"});
  assert.equal(s.deviceState.overlay?.kind,"power-hold");
  s=send(s,{kind:"ui-tick",elapsedMs:1200});
  s=send(s,{kind:"cancel",control:"power"});
  assert.equal(s.deviceState.overlay?.value,8);
  assert.equal(s.deviceState.brightness,9);
  s=short(s);
  assert.equal(s.deviceState.overlay?.value,7);
  s=send(s,{kind:"press",control:"enter"});
  assert.equal(s.deviceState.brightness,7);
  assert.equal(sessionHash(replay(adapter,scenario,createReplayEnvelope(s))),sessionHash(s));
});

test("V43 behavior profile separates legacy replay/settings without schema trickery",()=>{
  assert.equal(adapter.revision,"F1-public-reference-24");
  assert.equal(EVENT_SCHEMA_VERSION,5);
  assert.equal(REPLAY_ENVELOPE_VERSION,7);
  const s=short(short(powerOn()));
  const envelope=createReplayEnvelope(s);
  const {contentFingerprint,...body}=envelope;
  const old={...body,profileRevision:"F1-public-reference-20"};
  assert.throws(()=>replay(adapter,scenario,{...old,contentFingerprint:fingerprint(old)}),
    /profile|contract/);
  const current=JSON.parse(encodeFcvSettings(s.deviceState.settings));
  const previous={schemaVersion:current.schemaVersion,profileClass:current.profileClass,
    profileRevision:"F1-public-reference-20",settings:current.settings};
  assert.equal(decodeFcvSettings(JSON.stringify({...previous,
    contentFingerprint:fingerprint(previous)})),null);
  assert.deepEqual(decodeFcvSettings(JSON.stringify(current)),s.deviceState.settings);
});

test("V43 instructor LEARN-07 corresponds to the OEM 9→8 step outside the LCD",()=>{
  const lesson=FCV588_TRAINING_LESSONS.find(x=>x.id==="FCV588-LEARN-07");
  assert.ok(lesson);
  assert.match(lesson.titleVi,/9.*8/);
  assert.equal(lesson.expectedProbes.brightness,8);
  const start=powerOn();
  let s=short(short(start));
  s=send(s,{kind:"press",control:"enter"});
  assert.equal(assessFcvLesson(s,lesson.id,{
    startSeq:start.events.length,startSessionHash:sessionHash(start)}).passed,true);
});
