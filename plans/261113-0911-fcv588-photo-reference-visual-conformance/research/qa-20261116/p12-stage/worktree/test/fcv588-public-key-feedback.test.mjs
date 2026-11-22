import test from "node:test";
import assert from "node:assert/strict";
import {initialFcv588State} from "../src/devices/fcv588/model.mjs";
import {getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";
import {createSession,dispatch,replay,createReplayEnvelope,sessionHash} from "../src/core/session.mjs";
import {shouldPlayFcvKeyTone,createFcvKeyTonePlayer} from "../web/key-feedback.mjs";

test("Key Beep Off/On is an operator choice per manual §2.3 but not a hardware beeper",()=>{
  const item=getFcvMenuItems("System").find(e=>e.id==="system.keyBeep");
  assert.deepEqual(item?.choices,["Off","On"]);
  assert.equal(item?.manualSection,"§2.3");
  const s=initialFcv588State();
  assert.equal(s.settings.keyBeep,"Off");
  assert.equal(shouldPlayFcvKeyTone(s,{kind:"pad",control:"trackpad",direction:"up"}),false);
  const on={...s,power:"on",settings:{...s.settings,keyBeep:"On"}};
  for(const kind of ["pad","push","rotate","press","up"]){
    assert.equal(shouldPlayFcvKeyTone(on,{kind,control:kind==="up"?"func":"trackpad"}),true,kind);
  }
  for(const event of [{kind:"tick",steps:1},
    {kind:"ui-tick",elapsedMs:250},
    {kind:"training-fixture",fixture:"navigation",enabled:true}]){
    assert.equal(shouldPlayFcvKeyTone(on,event),false,event.kind);
  }
});

test("optional key sound is lazily initialized, very short, and fails silently if no audio device",()=>{
  let created=0,started=0,stopped=0;
  const context={
    currentTime:7,
    destination:{},
    state:"running",
    createOscillator:()=>({frequency:{value:0},type:"sine",
      connect(){},start(){started++;},stop(){stopped++;}}),
    createGain:()=>({gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}),
  };
  const player=createFcvKeyTonePlayer({createAudioContext:()=>{created++;return context;}});
  assert.equal(created,0,"no audio permission/context until explicit key gesture");
  assert.equal(player(),true);
  assert.equal(player(),true);
  assert.equal(created,1);
  assert.equal(started,2);
  assert.equal(stopped,2);
  assert.equal(createFcvKeyTonePlayer({createAudioContext:()=>{throw new Error("blocked");}})(),false);
});

test("System > Key Beep commit/cancel is replayable; setting does not mutate device world",()=>{
  let s=createSession(adapter,TRAINING_SCENARIO);
  const send=event=>{s=dispatch(s,adapter,event,TRAINING_SCENARIO);};
  send({kind:"down",control:"power"});
  send({kind:"up",control:"power",durationMs:100});
  send({kind:"tick",steps:4});
  send({kind:"press",control:"menu"});
  for(let i=0;i<4;i++)send({kind:"pad",control:"trackpad",direction:"right"});
  assert.equal(s.deviceState.overlay.category,"System");
  const index=getFcvMenuItems("System",s.deviceState).findIndex(x=>x.id==="system.keyBeep");
  assert.ok(index>=0);
  for(let i=0;i<index;i++)send({kind:"pad",control:"trackpad",direction:"down"});
  send({kind:"press",control:"enter"});
  send({kind:"pad",control:"trackpad",direction:"right"});
  assert.equal(s.deviceState.settings.keyBeep,"Off","edit must be staged");
  send({kind:"press",control:"menu"});
  assert.equal(s.deviceState.settings.keyBeep,"Off","MENU cancels edit");
  send({kind:"press",control:"enter"});
  send({kind:"pad",control:"trackpad",direction:"right"});
  send({kind:"press",control:"enter"});
  assert.equal(s.deviceState.settings.keyBeep,"On");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),sessionHash(s));
});
