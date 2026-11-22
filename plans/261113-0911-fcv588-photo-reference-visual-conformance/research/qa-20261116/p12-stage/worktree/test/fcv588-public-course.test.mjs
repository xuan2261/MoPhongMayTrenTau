import test from "node:test";
import assert from "node:assert/strict";
import {createSession,dispatch,createReplayEnvelope,replay,sessionHash} from "../src/core/session.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";
import {FCV588_TRAINING_LESSONS,assessFcvLesson} from "../src/core/lessons.mjs";
import {getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";

const send=(s,event)=>dispatch(s,adapter,event,TRAINING_SCENARIO);
const power=[
  {kind:"down",control:"power"},{kind:"up",control:"power",durationMs:120},
  {kind:"tick",steps:4},
];
const run=events=>events.reduce((s,event)=>send(s,event),
  createSession(adapter,TRAINING_SCENARIO));

test("every available lesson is explicitly training-only and source referenced",()=>{
  assert.ok(FCV588_TRAINING_LESSONS.length>=3);
  for(const lesson of FCV588_TRAINING_LESSONS){
    assert.match(lesson.id,/^FCV588-LEARN-\d{2}$/);
    assert.ok(lesson.titleVi && lesson.instructionVi);
    assert.equal(lesson.profileId,"FCV588_PUBLIC_DEMO_UNKNOWN_FW");
    assert.equal(lesson.hardwareValidated,false);
    assert.equal(lesson.releaseApproved,false,"cannot preapprove a lesson without browser/reviewer");
    assert.match(lesson.manualSection,/§\d/);
    assert.ok(Array.isArray(lesson.actions) && lesson.actions.length>0);
    assert.ok(lesson.expectedProbes && Object.keys(lesson.expectedProbes).length>0);
    assert.ok(lesson.negativeCaseDescription);
  }
});

test("MODE lesson passes on actual deterministic recorded transitions and replay",()=>{
  const lesson=FCV588_TRAINING_LESSONS.find(x=>x.id==="FCV588-LEARN-02");
  assert.ok(lesson);
  const s=run([...power,{kind:"rotate",control:"mode",steps:1},
    {kind:"ui-tick",elapsedMs:6000}]);
  const result=assessFcvLesson(s,lesson.id);
  assert.equal(result.passed,true,JSON.stringify(result.reasons));
  assert.equal(result.hardwareApproved,false);
  const envelope=createReplayEnvelope(s);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,envelope)),sessionHash(s));
});

test("missing required action is not graded PASS even if mode field happens to match",()=>{
  const s=run(power);
  const result=assessFcvLesson(s,"FCV588-LEARN-02");
  assert.equal(result.passed,false);
  assert.ok(result.reasons.length>0);
  assert.equal(assessFcvLesson(s,"not-real").passed,false);
});

test("teacher assessment is a semantic probe, not browser pixel or anti-cheat attestation",()=>{
  const s=run([...power,
    {kind:"press",control:"range"},
    {kind:"pad",control:"trackpad",direction:"right"},
    {kind:"press",control:"enter"}]);
  const result=assessFcvLesson(s,"FCV588-LEARN-01");
  assert.equal(result.passed,true,JSON.stringify(result.reasons));
  assert.equal(result.sourceClass,"INSTRUCTOR_PLATFORM");
  assert.equal(result.firmwareInstalled,null);
  assert.equal(result.antiCheatAuthenticated,false);
});

test("scoring a new lesson attempt cannot credit actions or UI time from before start",()=>{
  const previous=run([...power,{kind:"rotate",control:"mode",steps:1},
    {kind:"ui-tick",elapsedMs:6000}]);
  assert.equal(assessFcvLesson(previous,"FCV588-LEARN-02").passed,true,
    "legacy full-log probe remains deterministic for test fixtures");
  const atStart=previous.events.length;
  const stale=assessFcvLesson(previous,"FCV588-LEARN-02",{
    startSeq:atStart,startSessionHash:sessionHash(previous)});
  assert.equal(stale.passed,false);
  assert.ok(stale.reasons.includes("MISSING_REQUIRED_ACTION_SEQUENCE"));
  assert.ok(stale.reasons.includes("UI_TIMER_NOT_OBSERVED"));
  const malformed=assessFcvLesson(previous,"FCV588-LEARN-02",
    {startSeq:atStart+1});
  assert.equal(malformed.passed,false);
  assert.ok(malformed.reasons.includes("INVALID_LESSON_BOUNDARY"));
});

test("a fresh lesson attempt with new events passes from its own recorded sequence",()=>{
  const prior=run([...power,{kind:"press",control:"range"},
    {kind:"pad",control:"trackpad",direction:"right"},
    {kind:"press",control:"enter"}]);
  const atStart=prior.events.length;
  let s=prior;
  for(const input of [{kind:"press",control:"range"},
    {kind:"pad",control:"trackpad",direction:"right"},
    {kind:"press",control:"enter"}])s=send(s,input);
  const result=assessFcvLesson(s,"FCV588-LEARN-01",{
    startSeq:atStart,startSessionHash:sessionHash(prior)});
  assert.equal(result.passed,true,JSON.stringify(result.reasons));
  assert.equal(result.startSeq,atStart);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),
    sessionHash(s));
});

test("waypoint lesson does not credit an earlier MARK when a later MARK has NO POSITION",()=>{
  let s=run([...power,{kind:"training-fixture",fixture:"navigation",enabled:true},
    {kind:"press",control:"mark"}]);
  assert.equal(s.deviceState.navigation.waypoints.length,1);
  const startSeq=s.events.length;
  const startSessionHash=sessionHash(s);
  s=send(s,{kind:"training-fixture",fixture:"navigation",enabled:false});
  s=send(s,{kind:"press",control:"mark"});
  assert.equal(s.deviceState.navigation.waypoints.length,1);
  const falsePass=assessFcvLesson(s,"FCV588-LEARN-03",{
    startSeq,startSessionHash,baselineWaypointCount:1});
  assert.equal(falsePass.passed,false);
  assert.ok(falsePass.reasons.includes("WRONG_PROBE_minimumWaypoints"));
  assert.equal(assessFcvLesson(s,"FCV588-LEARN-03",{
    startSeq,startSessionHash}).passed,false,
    "nonzero lesson start requires an explicit waypoint baseline");
  s=send(s,{kind:"training-fixture",fixture:"navigation",enabled:true});
  s=send(s,{kind:"press",control:"mark"});
  assert.equal(s.deviceState.navigation.waypoints.length,2);
  assert.equal(assessFcvLesson(s,"FCV588-LEARN-03",{
    startSeq,startSessionHash,baselineWaypointCount:1}).passed,true);
});

test("D15 training score refuses forged device state or altered event sequence, even when probes match",()=>{
  const s=run([...power,{kind:"press",control:"range"},
    {kind:"pad",control:"trackpad",direction:"right"},
    {kind:"press",control:"enter"}]);
  const valid=assessFcvLesson(s,"FCV588-LEARN-01");
  assert.equal(valid.passed,true);
  assert.equal(valid.replayVerified,true);
  assert.equal(valid.publicReleaseEligible,false);
  const corrupted={...s,deviceState:{...s.deviceState,manualGain:99}};
  const forged=assessFcvLesson(corrupted,"FCV588-LEARN-01");
  assert.equal(forged.passed,false);
  assert.ok(forged.reasons.includes("REPLAY_STATE_MISMATCH"));
  const events=s.events.map(e=>({...e}));
  events[0]={...events[0],seq:999};
  const tampered=assessFcvLesson({...s,events},"FCV588-LEARN-01");
  assert.equal(tampered.passed,false);
  assert.ok(tampered.reasons.some(r=>r.includes("REPLAY")));
});

test("D15 scoring ignores inherited lesson state without a new event in the current attempt",()=>{
  const s=run([...power,{kind:"press",control:"range"},
    {kind:"pad",control:"trackpad",direction:"right"},
    {kind:"press",control:"enter"}]);
  const startSeq=s.events.length;
  const result=assessFcvLesson(s,"FCV588-LEARN-01",{
    startSeq,startSessionHash:sessionHash(s)});
  assert.equal(result.passed,false);
  assert.ok(result.reasons.includes("MISSING_REQUIRED_ACTION_SEQUENCE"));
});

test("D15 rejects unrelated physical inputs even if final range probe matches; legitimate action retries are allowed",()=>{
  const s=run([...power,{kind:"press",control:"mark"},
    {kind:"press",control:"range"},
    {kind:"pad",control:"trackpad",direction:"right"},
    {kind:"press",control:"enter"}]);
  assert.equal(s.deviceState.rangeMode,"manual");
  const result=assessFcvLesson(s,"FCV588-LEARN-01");
  assert.equal(result.passed,false);
  assert.ok(result.reasons.includes("UNEXPECTED_OPERATOR_ACTIONS"));
  const clean=run([...power,{kind:"press",control:"range"},
    {kind:"pad",control:"trackpad",direction:"right"},
    {kind:"press",control:"enter"}]);
  assert.equal(assessFcvLesson(clean,"FCV588-LEARN-01").passed,true);
});

test("D15 rejects a stale lesson-start fingerprint from another session with the same event count",()=>{
  const originalStart=run(power);
  const startSeq=originalStart.events.length;
  const otherStart=run([power[0],power[1],{kind:"tick",steps:5}]);
  assert.equal(otherStart.events.length,startSeq);
  assert.notEqual(sessionHash(originalStart),sessionHash(otherStart));
  let swapped=otherStart;
  for(const action of [{kind:"press",control:"range"},
    {kind:"pad",control:"trackpad",direction:"right"},
    {kind:"press",control:"enter"}])swapped=send(swapped,action);
  assert.equal(swapped.deviceState.rangeMode,"manual");
  const result=assessFcvLesson(swapped,"FCV588-LEARN-01",{
    startSeq,startSessionHash:sessionHash(originalStart),
  });
  assert.equal(result.passed,false);
  assert.ok(result.reasons.includes("LESSON_BOUNDARY_MISMATCH"));
});

test("D15 nonzero lesson boundary cannot be scored without a verified start-session fingerprint",()=>{
  const prior=run(power);
  const startSeq=prior.events.length;
  const s=[{kind:"press",control:"range"},
    {kind:"pad",control:"trackpad",direction:"right"},
    {kind:"press",control:"enter"}].reduce(send,prior);
  assert.equal(s.deviceState.rangeMode,"manual");
  const noIdentity=assessFcvLesson(s,"FCV588-LEARN-01",{startSeq});
  assert.equal(noIdentity.passed,false,
    "a caller may not silently omit the per-attempt fingerprint");
  assert.ok(noIdentity.reasons.includes("INVALID_LESSON_BOUNDARY"));
  const current=assessFcvLesson(s,"FCV588-LEARN-01",{
    startSeq,startSessionHash:sessionHash(prior)});
  assert.equal(current.passed,true,JSON.stringify(current.reasons));
});

test("D15 cannot credit a RANGE exercise where its physical actions occurred while powered off",()=>{
  let s=run([...power,{kind:"press",control:"range"},
    {kind:"pad",control:"trackpad",direction:"right"},
    {kind:"press",control:"enter"}]);
  assert.equal(s.deviceState.rangeMode,"manual");
  s=send(s,{kind:"down",control:"power"});
  s=send(s,{kind:"up",control:"power",durationMs:3200});
  assert.equal(s.deviceState.power,"off");
  const startSeq=s.events.length;
  const startSessionHash=sessionHash(s);
  for(const action of [{kind:"press",control:"range"},
    {kind:"pad",control:"trackpad",direction:"right"},
    {kind:"press",control:"enter"},...power])s=send(s,action);
  assert.equal(s.deviceState.power,"on");
  assert.equal(s.deviceState.rangeMode,"manual");
  const result=assessFcvLesson(s,"FCV588-LEARN-01",{
    startSeq,startSessionHash,
  });
  assert.equal(result.passed,false);
  assert.ok(result.reasons.includes("ACTION_WHILE_POWERED_OFF"));
});

test("D15 §1.21 Data Source lesson has a complete physical-key workflow, replay and new-attempt boundary",()=>{
  const lesson=FCV588_TRAINING_LESSONS.find(x=>x.id==="FCV588-LEARN-04");
  assert.ok(lesson,"teacher course must expose the source-aware operator exercise");
  assert.equal(lesson.manualSection,"§1.21");
  assert.equal(lesson.expectedProbes.tripSource,"NMEA");
  const start=run(power);
  const inputs=[{kind:"press",control:"menu"},
    ...Array.from({length:3},()=>({kind:"pad",control:"trackpad",direction:"right"})),
    ...Array.from({length:9},()=>({kind:"pad",control:"trackpad",direction:"down"})),
    {kind:"press",control:"enter"},
    {kind:"pad",control:"trackpad",direction:"right"},
    {kind:"press",control:"enter"}];
  const finished=inputs.reduce(send,start);
  assert.equal(finished.deviceState.settings.tripSource,"NMEA");
  const grade=assessFcvLesson(finished,lesson.id,{
    startSeq:start.events.length,startSessionHash:sessionHash(start)});
  assert.equal(grade.passed,true,JSON.stringify(grade.reasons));
  assert.equal(grade.hardwareApproved,false);
  assert.equal(grade.publicReleaseEligible,false);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(finished))),sessionHash(finished));
  const old=assessFcvLesson(finished,lesson.id,{
    startSeq:finished.events.length,
    startSessionHash:sessionHash(finished)});
  assert.equal(old.passed,false,"historical source selection cannot earn a new lesson");
});

test("D15 Data Source lesson does not give credit when MENU/ESC cancels the NMEA edit",()=>{
  const start=run(power);
  let s=start;
  for(const event of [{kind:"press",control:"menu"},
    ...Array.from({length:3},()=>({kind:"pad",control:"trackpad",direction:"right"})),
    ...Array.from({length:9},()=>({kind:"pad",control:"trackpad",direction:"down"})),
    {kind:"press",control:"enter"},
    {kind:"pad",control:"trackpad",direction:"right"},
    {kind:"press",control:"menu"}])s=send(s,event);
  assert.equal(s.deviceState.settings.tripSource,"Own");
  const grade=assessFcvLesson(s,"FCV588-LEARN-04",{
    startSeq:start.events.length,startSessionHash:sessionHash(start)});
  assert.equal(grade.passed,false);
  assert.ok(grade.reasons.includes("WRONG_PROBE_tripSource") ||
    grade.reasons.includes("UNEXPECTED_OPERATOR_ACTIONS"));
});

test("D15 C11/D14 receiver-absence lesson grades a real System menu workflow, not just a saved setting",()=>{
  const id="FCV588-LEARN-05";
  const lesson=FCV588_TRAINING_LESSONS.find(x=>x.id===id);
  assert.ok(lesson,
    "instructor needs a separately scored no-receiver exercise, not only a Data menu toggle");
  assert.equal(lesson.manualSection,"§4.9");
  assert.equal(lesson.expectedProbes.receiverStatus,"NO_TRAINING_DATA");
  assert.equal(lesson.expectedProbes.receiverTransport,"NONE");
  const start=run(power);
  const actions=[{kind:"press",control:"menu"},
    ...Array.from({length:4},()=>({kind:"pad",control:"trackpad",direction:"right"})),
    ...Array.from({length:13},()=>({kind:"pad",control:"trackpad",direction:"down"})),
    {kind:"press",control:"enter"}];
  const finished=actions.reduce(send,start);
  assert.equal(finished.deviceState.overlay?.kind,"receiver-status");
  const atStart={startSeq:start.events.length,startSessionHash:sessionHash(start)};
  const scored=assessFcvLesson(finished,id,atStart);
  assert.equal(scored.passed,true,JSON.stringify(scored.reasons));
  assert.equal(scored.hardwareApproved,false);
  assert.equal(scored.publicReleaseEligible,false);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(finished))),sessionHash(finished));
  const historical=assessFcvLesson(finished,id,{
    startSeq:finished.events.length,startSessionHash:sessionHash(finished)});
  assert.equal(historical.passed,false,
    "an already-open Receiver Status panel cannot award a fresh D15 attempt");
  assert.ok(historical.reasons.includes("MISSING_REQUIRED_ACTION_SEQUENCE"));
});

test("D15 receiver-absence lesson rejects a genuine synthetic NAV fixture instead of calling it no data",()=>{
  const id="FCV588-LEARN-05";
  let start=run([...power,
    {kind:"training-fixture",fixture:"navigation",enabled:true},
    {kind:"tick",steps:1}]);
  const initial={startSeq:start.events.length,startSessionHash:sessionHash(start)};
  const sequence=[{kind:"press",control:"menu"},
    ...Array.from({length:4},()=>({kind:"pad",control:"trackpad",direction:"right"})),
    ...Array.from({length:13},()=>({kind:"pad",control:"trackpad",direction:"down"})),
    {kind:"press",control:"enter"}];
  for(const action of sequence)start=send(start,action);
  assert.equal(start.deviceState.overlay?.kind,"receiver-status");
  const rejected=assessFcvLesson(start,id,initial);
  assert.equal(rejected.passed,false,
    "a correctly executed menu path with the wrong source context may not pass");
  assert.ok(rejected.reasons.includes("WRONG_PROBE_receiverStatus"),
    JSON.stringify(rejected.reasons));
});

test("D15 LEARN-05 rejects temporary fixture enable-then-disable during the scored attempt",()=>{
  const id="FCV588-LEARN-05";
  const start=run(power);
  let s=start;
  s=send(s,{kind:"training-fixture",fixture:"navigation",enabled:true});
  s=send(s,{kind:"tick",steps:1});
  s=send(s,{kind:"training-fixture",fixture:"navigation",enabled:false});
  for(const action of FCV588_TRAINING_LESSONS.find(l=>l.id===id).actions)
    s=send(s,action);
  assert.equal(s.deviceState.overlay?.kind,"receiver-status");
  assert.equal(s.deviceState.trainingFixture.navigation,false);
  assert.equal(assessFcvLesson(s,id,{startSeq:start.events.length,
    startSessionHash:sessionHash(start)}).passed,false,
    "final OFF status cannot erase invalid fixture history within this lesson");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
  const clean=FCV588_TRAINING_LESSONS.find(l=>l.id===id).actions.reduce(send,start);
  assert.equal(assessFcvLesson(clean,id,{startSeq:start.events.length,
    startSessionHash:sessionHash(start)}).passed,true);
});

test("D15 LEARN-06 scores a committed §2.3 Key Beep change, not a canceled or historical menu edit",()=>{
  const id="FCV588-LEARN-06";
  const start=run(power);
  const index=getFcvMenuItems("System",start.deviceState).findIndex(item=>
    item.id==="system.keyBeep");
  assert.equal(index,15,"lesson path must follow current source-graded menu atlas");
  const lead=[{kind:"press",control:"menu"},
    ...Array.from({length:4},()=>({kind:"pad",control:"trackpad",direction:"right"})),
    ...Array.from({length:index},()=>({kind:"pad",control:"trackpad",direction:"down"})),
    {kind:"press",control:"enter"},
    {kind:"pad",control:"trackpad",direction:"right"}];
  const boundary={startSeq:start.events.length,startSessionHash:sessionHash(start)};
  const staged=lead.reduce(send,start);
  assert.equal(staged.deviceState.settings.keyBeep,"Off");
  const canceled=send(staged,{kind:"press",control:"menu"});
  assert.equal(canceled.deviceState.settings.keyBeep,"Off");
  assert.equal(assessFcvLesson(canceled,id,boundary).passed,false,
    "a canceled edit must not score as committed Key Beep On");
  const finished=send(staged,{kind:"press",control:"enter"});
  assert.equal(finished.deviceState.settings.keyBeep,"On");
  const graded=assessFcvLesson(finished,id,boundary);
  assert.equal(graded.passed,true,JSON.stringify(graded.reasons));
  assert.equal(graded.hardwareApproved,false);
  assert.equal(graded.publicReleaseEligible,false);
  assert.equal(assessFcvLesson(finished,id,{
    startSeq:finished.events.length,startSessionHash:sessionHash(finished)}).passed,false,
    "a finished prior attempt cannot score again without new inputs");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(finished))),sessionHash(finished));
});

test("D15 LEARN-06 rejects unrelated FUNC hold-and-cancel before a valid menu procedure",()=>{
  const start=run(power);
  let s=send(start,{kind:"down",control:"func"});
  s=send(s,{kind:"cancel",control:"func"});
  const lesson=FCV588_TRAINING_LESSONS.find(l=>l.id==="FCV588-LEARN-06");
  for(const action of lesson.actions)s=send(s,action);
  assert.equal(s.deviceState.settings.keyBeep,"On");
  const scored=assessFcvLesson(s,lesson.id,{
    startSeq:start.events.length,startSessionHash:sessionHash(start)});
  assert.equal(scored.passed,false,
    "unrelated raw hold/cancel must not become invisible to the D15 operator scorer");
  assert.ok(scored.reasons.includes("UNEXPECTED_OPERATOR_ACTIONS"));
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});

test("D15 LEARN-07 grades two SHORT BRILL holds and ENTER from an initial level 9",()=>{
  const id="FCV588-LEARN-07";
  const start=run(power);
  assert.equal(start.deviceState.brightness,9);
  const short=[{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:200}];
  const stage=short.reduce(send,start);
  assert.equal(stage.deviceState.overlay?.kind,"brill");
  const one=send(stage,{kind:"press",control:"enter"});
  assert.equal(one.deviceState.brightness,9);
  assert.equal(assessFcvLesson(one,id,{
    startSeq:start.events.length,startSessionHash:sessionHash(start)}).passed,false);
  let two=short.reduce(send,stage);
  assert.equal(two.deviceState.overlay?.value,8);
  assert.equal(two.deviceState.brightness,9,
    "brilliance preview must be staged until operator ENTER commits");
  two=send(two,{kind:"press",control:"enter"});
  assert.equal(two.deviceState.brightness,8);
  const result=assessFcvLesson(two,id,{
    startSeq:start.events.length,startSessionHash:sessionHash(start)});
  assert.equal(result.passed,true,JSON.stringify(result.reasons));
  assert.equal(result.hardwareApproved,false);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(two))),sessionHash(two));
  const cancel=send(short.reduce(send,stage),{kind:"press",control:"menu"});
  assert.equal(assessFcvLesson(cancel,id,{
    startSeq:start.events.length,startSessionHash:sessionHash(start)}).passed,false,
    "MENU/ESC before ENTER must not count as the prescribed BRILL confirmation");
});
