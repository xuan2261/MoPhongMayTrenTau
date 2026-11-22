import {readFileSync} from "node:fs";
import {replayFcv588Envelope} from "../src/devices/fcv588/replay-compat.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {createSession,dispatch} from "../src/core/session.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {FCV588_PROFILE21_ADAPTER as oldAdapter} from "../src/devices/fcv588/adapter-profile21.mjs";
import {FCV588_ADAPTER as activeAdapter} from "../src/devices/fcv588/adapter.mjs";
import {projectFcvMainMenu} from "../web/lcd-presentation.mjs";
const events=[{kind:"down",control:"power"},{kind:"up",control:"power",durationMs:100},{kind:"tick",steps:4},{kind:"press",control:"menu"},...Array.from({length:5},()=>({kind:"pad",control:"trackpad",direction:"down"}))];
function simulated(adapter){let state=createSession(adapter,scenario);for(const event of events)state=dispatch(state,adapter,event,scenario);return state;}
test("P14 archived21 historical menu presentation must use its original semantic atlas",()=>{
 const old=simulated(oldAdapter),now=simulated(activeAdapter);
 const oldView=projectFcvMainMenu(old.deviceState,{profileRevision:"F1-public-reference-21"});
 const currentView=projectFcvMainMenu(now.deviceState,{profileRevision:"F1-public-reference-22"});
 assert.equal(oldView.rows.find(row=>row.selected)?.id,"sounder.whiteMarker");
 assert.equal(currentView.rows.find(row=>row.selected)?.id,"sounder.clutter");
 assert.throws(()=>projectFcvMainMenu(old.deviceState,{profileRevision:"F1-public-reference-999"}),/profile|unsupported/i);
});
// Presentation must consume the declared revision from the exact archived replay,
// not reinterpret its numeric menu cursor through the active profile22 atlas.
test("P14 frozen profile21 envelope renders historically named White Marker after replay",()=>{
 const bytes=readFileSync(new URL("./fixtures/P14_LEGACY_PROFILE21_SELECTION_ENVELOPE_20261116.json",import.meta.url));
 const envelope=JSON.parse(bytes.toString("utf8"));
 const restored=replayFcv588Envelope(scenario,envelope);
 const view=projectFcvMainMenu(restored.deviceState,{profileRevision:restored.profileRevision});
 assert.equal(view.rows.find(row=>row.selected)?.id,"sounder.whiteMarker");
 assert.notEqual(view.rows.find(row=>row.selected)?.id,"sounder.clutter");
});