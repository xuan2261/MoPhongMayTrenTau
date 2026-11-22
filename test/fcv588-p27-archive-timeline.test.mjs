import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createFcv588ArchiveTimeline} from "../web/fcv588-archive-timeline.mjs";
const html=readFileSync(new URL("../web/index.html",import.meta.url),"utf8");
test("P27 archive D15 timeline controls exist and model is pure",()=>{
  for(const id of ["archive-timeline-panel","archive-timeline-prev",
   "archive-timeline-next","archive-timeline-range","archive-timeline-status",
   "archive-timeline-canvas"])
    assert.match(html,new RegExp('id="'+id+'"'),id+" is missing");
  assert.equal(typeof createFcv588ArchiveTimeline,"function");
});

import {createSession,dispatch,createReplayEnvelope,sessionHash} from "../src/core/session.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {createFcv588ArchiveSidecar} from "../src/devices/fcv588/archive-compat.mjs";
const activeBZ=()=>{
 let session=createSession(adapter,scenario);
 for(const input of [
  {kind:"restore-settings",settings:{zoomMode:"Bottom Zoom",zoomRange:"10"}},
  {kind:"down",control:"power"},
  {kind:"up",control:"power"},
  {kind:"tick",steps:4},
  {kind:"rotate",control:"mode",steps:-1},
  {kind:"ui-tick",elapsedMs:6000},
 ])session=dispatch(session,adapter,input,scenario);
 assert.equal(session.deviceState.mode,"LF-ZOOM");
 assert.equal(session.deviceState.power,"on");
 return session;
};
const pair=(envelope,contract="P23_LOWER_BOTTOM")=>[
 JSON.stringify(envelope),
 JSON.stringify(createFcv588ArchiveSidecar(envelope,{presentationContract:contract})),
];
test("P27 exact full replay at N and zero-event prefix reconstruct initial deterministic state",()=>{
 const original=activeBZ(),env=createReplayEnvelope(original);
 const before=JSON.stringify(env);
 const timeline=createFcv588ArchiveTimeline(...pair(env));
 assert.equal(timeline.eventCount,6);
 assert.equal(timeline.presentationContract,"P23_LOWER_BOTTOM");
 assert.equal(timeline.fullSessionHash,sessionHash(original));
 const zero=timeline.select(0);
 assert.equal(zero.index,0);
 assert.equal(zero.eventKind,"initial");
 assert.equal(zero.eventControl,null);
 assert.equal(zero.worldTick,0);
 assert.equal(zero.visual.renderable,false);
 assert.equal(zero.derivedPrefixOnly,true);
 const at5=timeline.select(5);
 assert.equal(at5.index,5);
 assert.equal(at5.visual.renderable,false,"mode-change UI timer not elapsed yet");
 const end=timeline.select(6);
 assert.equal(end.derivedPrefixOnly,false);
 assert.equal(end.prefixSessionHash,sessionHash(original));
 assert.equal(end.fullSessionHash,end.prefixSessionHash);
 assert.equal(end.worldTick,4);
 assert.equal(end.visual.renderable,true);
 assert.equal(end.visual.geometry.bottomFraction,0.75);
 assert.equal(end.activeMode,"LF-ZOOM");
 assert.equal(JSON.stringify(env),before,"archive bytes must never change");
});
test("P27 random seek is deterministic and does not retain mutable cached frame pixels",()=>{
 const t=createFcv588ArchiveTimeline(...pair(createReplayEnvelope(activeBZ())));
 const first=t.select(6),prev=t.select(5),again=t.select(6);
 assert.equal(prev.visual.renderable,false);
 assert.equal(first.prefixSessionHash,again.prefixSessionHash);
 assert.deepEqual(first.visual.zoomRaster.data,again.visual.zoomRaster.data);
 assert.deepEqual(first.visual.normalRaster.data,again.visual.normalRaster.data);
 first.visual.zoomRaster.data[10]^=255;
 const third=t.select(6);
 assert.deepEqual(again.visual.zoomRaster.data,third.visual.zoomRaster.data);
});
test("P27 P04/P23 explicit sidecar changes only synthetic BZ left projection",()=>{
 const env=createReplayEnvelope(activeBZ());
 const a=createFcv588ArchiveTimeline(...pair(env,"P04_HISTORIC"));
 const b=createFcv588ArchiveTimeline(...pair(env,"P23_LOWER_BOTTOM"));
 const old=a.select(6),now=b.select(6);
 assert.equal(a.fullSessionHash,b.fullSessionHash);
 assert.equal(old.prefixSessionHash,now.prefixSessionHash);
 assert.equal(old.visual.geometry.bottomFraction,0.5);
 assert.equal(now.visual.geometry.bottomFraction,0.75);
 assert.notDeepEqual(old.visual.zoomRaster.data,now.visual.zoomRaster.data);
 assert.deepEqual(old.visual.normalRaster.data,now.visual.normalRaster.data);
 assert.equal(old.sourceClass,"SYNTHETIC_TIMELINE_PREVIEW_NOT_ARCHIVED_PIXELS");
});
test("P27 frozen profile22 legacy archive and profile21 legacy fixtures can replay selected prefixes",()=>{
 const frozen=JSON.parse(readFileSync(new URL("./fixtures/P24_PINNED_PRE_P23_PROFILE22_ENVELOPE_20261117.json",import.meta.url),"utf8"));
 const p22=createFcv588ArchiveTimeline(...pair(frozen,"P04_HISTORIC"));
 assert.equal(p22.fullSessionHash,"f0-fnv1a32-a429fc78");
 assert.equal(p22.select(p22.eventCount).prefixSessionHash,"f0-fnv1a32-a429fc78");
 assert.equal(p22.select(p22.eventCount).visual.renderable,false);
 const p21bytes=readFileSync(new URL("./fixtures/P14_LEGACY_PROFILE21_SELECTION_ENVELOPE_20261116.json",import.meta.url),"utf8");
 const p21=createFcv588ArchiveTimeline(...pair(JSON.parse(p21bytes),"P04_HISTORIC"));
 assert.equal(p21.profileRevision,"F1-public-reference-21");
 assert.equal(p21.eventCount,9);
 assert.equal(p21.select(9).prefixSessionHash,"f0-fnv1a32-b7e35e70");
 assert.equal(p21.select(0).worldTick,0);
});
test("P27 rejects invalid step numbers and enforces bounded source schema",()=>{
 const env=createReplayEnvelope(activeBZ()),t=createFcv588ArchiveTimeline(...pair(env));
 for(const value of [-1,7,1.2,Number.NaN,Infinity,"6",null])
  assert.throws(()=>t.select(value),/event index/);
 const [e,s]=pair(env);
 assert.throws(()=>createFcv588ArchiveTimeline(e,""),/rỗng|dung lượng/);
 assert.throws(()=>createFcv588ArchiveTimeline(e,"{"),/JSON/);
 const tamper=JSON.parse(s);tamper.presentationContract="P04_HISTORIC";
 assert.throws(()=>createFcv588ArchiveTimeline(e,JSON.stringify(tamper)),/fingerprint/);
 assert.throws(()=>createFcv588ArchiveTimeline(JSON.stringify({...env,events:[]}),s),/content|mismatch/);
 assert.throws(()=>createFcv588ArchiveTimeline(e+" ".repeat(1048576),s),/dung lượng/);
});
test("P27 reset and navigation UI are D15-only and never write live session or storage",()=>{
 const app=readFileSync(new URL("../web/app.mjs",import.meta.url),"utf8");
 const module=readFileSync(new URL("../web/fcv588-archive-timeline.mjs",import.meta.url),"utf8");
 assert.match(app,/resetArchiveTimeline\(\); \/\/ Fail closed/);
 assert.match(app,/renderArchiveTimelineStep\(archiveTimeline,index\)/);
 assert.match(app,/timelineRange\.max=String\(candidate\.eventCount\);\s*details\.hidden=false;\s*timelinePanel\.hidden=false;\s*renderArchiveTimelineStep/);
 assert.match(app,/timelineCanvas\.width=432/);
 assert.match(app,/timelineStatus\.textContent=/);
 assert.match(app,/TIMELINE REJECTED —/);
 assert.match(app,/\$\("archive-replay-details"\)\.hidden=true/);
 assert.doesNotMatch(module,/\bfetch\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|window\.session/);
 assert.doesNotMatch(module,/\bDate\.now\(/);
 assert.doesNotMatch(module,/createReplayEnvelope\(prefix\)|createFcv588ArchiveSidecar\(/,
   "event prefixes must not be re-authored as v7 replay envelope/sidecar archives");
 assert.match(module,/projectFcv588ArchiveBZSession\(prefix,presentationContract\)/);
});

test("P27 first canvas frame is painted only after panel shown and stale RGBA is reset",()=>{
 const app=readFileSync(new URL("../web/app.mjs",import.meta.url),"utf8");
 assert.match(app,/details\.hidden=false;\s*timelinePanel\.hidden=false;\s*renderArchiveTimelineStep\(candidate,candidate\.eventCount\)/,
   "first canvas paint requires both archive details ancestor and timeline panel visible");
 assert.match(app,/function renderArchiveTimelineStep\(timeline,index\)[\s\S]*?timelineCanvas\.hidden=!frame\.visual\.renderable;[\s\S]*?if\(frame\.visual\.renderable\)\{[\s\S]*?renderFcv588ArchiveBZViewer\(timelineCanvas,frame\.visual,\{showTextLabels:false\}\)/,
   "text and synthetic pixels must be painted with the canvas visible, including first paint");
 assert.match(app,/renderFcv588ArchiveBZViewer\(timelineCanvas,frame\.visual,\{showTextLabels:false\}\)/,
   "P27 should keep native-font labels in D15 HTML status, outside deterministic synthetic raster");
 assert.match(app,/function resetArchiveTimeline\(\)[\s\S]*?fillRect\(0,0,timelineCanvas\.width,timelineCanvas\.height\)/,
   "reset should explicitly repaint a uniform synthetic-only background");
 assert.match(app,/\}catch\(err\)\{\s*resetArchiveTimeline\(\);\s*bzViewer\.hidden=true;/,
   "failed archive import must reset timeline even after partial render");
});
