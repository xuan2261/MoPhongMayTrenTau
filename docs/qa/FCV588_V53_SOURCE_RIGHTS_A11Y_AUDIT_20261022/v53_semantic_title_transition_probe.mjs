import assert from "node:assert/strict";
import {readFileSync, writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";
import {createSession,dispatch} from "../../../src/core/session.mjs";
import {TRAINING_SCENARIO} from "../../../src/core/scenario.mjs";
import {FCV588_ADAPTER} from "../../../src/devices/fcv588/adapter.mjs";
import {projectFcvInstructorMeta} from "../../../web/lcd-instructor-meta.mjs";

const dir=dirname(fileURLToPath(import.meta.url));
const root=resolve(dir,"../../..");
const sha=file=>createHash("sha256").update(readFileSync(file)).digest("hex");
const locked=resolve(root,"docs/qa/FCV588_V52_FINAL_INTEGRITY_20261022.json");
assert.equal(sha(locked),"4650306d6c088fc19eaa09b66922faaf29712015ae9a2f8fdf5795d2e780107f");
const v52=JSON.parse(readFileSync(locked,"utf8"));
for(const [p,digest] of Object.entries(v52.runtimeSourceSHA))
  assert.equal(sha(resolve(root,p)),digest,"runtime SHA drift "+p);
const send=(session,event)=>dispatch(session,FCV588_ADAPTER,event,TRAINING_SCENARIO);
const snapshots=[];
function see(label,s){
  const cue=projectFcvInstructorMeta(s.deviceState,s.deviceState.overlay,s.worldState.simTick);
  snapshots.push({label,power:s.deviceState.power,overlay:s.deviceState.overlay?.kind??null,
    uiElapsedMs:s.deviceState.uiElapsedMs,remainingMs:s.deviceState.overlay?.remainingMs??null,
    title:cue.title,summary:cue.summary,help:cue.help});
  return cue;
}
let s=createSession(FCV588_ADAPTER,TRAINING_SCENARIO);
s=send(s,{kind:"down",control:"power"});
s=send(s,{kind:"up",control:"power",durationMs:100});
s=send(s,{kind:"tick",steps:4});
assert.equal(s.deviceState.power,"on");
const idle=see("ready",s);
s=send(s,{kind:"down",control:"power"});
assert.equal(s.deviceState.overlay?.kind,"power-hold");
const hold=see("physical-down",s);
s=send(s,{kind:"ui-tick",elapsedMs:250});
const tick1=see("held-250ms",s);
s=send(s,{kind:"ui-tick",elapsedMs:250});
const tick2=see("held-500ms",s);
assert.equal(hold.title,tick1.title);
assert.equal(tick1.title,tick2.title);
assert.notEqual(tick1.summary,tick2.summary);
s=send(s,{kind:"up",control:"power",durationMs:500});
assert.equal(s.deviceState.overlay?.kind,"brill");
const released=see("physical-up-brill",s);
s=send(s,{kind:"ui-tick",elapsedMs:250});
const brill250=see("brill-250ms",s);
assert.equal(released.title,brill250.title);
const transitions=snapshots.slice(1).filter((x,i)=>x.title!==snapshots[i].title)
  .map(x=>({stage:x.label,title:x.title}));
assert.ok(transitions.length>=2,"POWER down/up can cause multiple semantic transitions");
const output={
  status:"MODEL_SEMANTIC_TITLES_STABLE_PER_UI_TICK_NOT_BROWSER_SPEECH",
  recordedUtc:new Date().toISOString(),
  source:"Canonical V52 runtime; synthetic reducer and instructor projection",
  root,sourceShaPinned:true,phase6:"OPEN",publicClaimsHold:65,
  noRealNarratorNvdaSpeech:true,noGenuineOsWindowBlur:true,
  titleTransitionCount:transitions.length,
  transitions,
  powerHoldTitleStable:true,
  holdVisualCountdownChanged:true,
  brillTitleStableUnderUiTick:true,
  snapshots
};
const path=resolve(dir,"V53_SEMANTIC_TITLE_REDUCER_PROBE_20261022.json");
writeFileSync(path,JSON.stringify(output,null,2)+"\n",{flag:"wx"});
console.log("PROBE_RESULT",output.status);
console.log("TRANSITION_COUNT",transitions.length,JSON.stringify(transitions));
console.log("POWER_HOLD_TICK_SUMMARIES",tick1.summary,tick2.summary);
console.log("RESULT_SHA256",sha(path));
