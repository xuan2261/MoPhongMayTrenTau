import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {projectFcv588ArchiveBZViewer} from "../web/fcv588-archive-bz-viewer.mjs";
const html=readFileSync(new URL("../web/index.html",import.meta.url),"utf8");
test("P26 D15 BZ viewer exists outside the live LCD and uses explicit archive contract",()=>{
 for(const id of ["archive-bz-viewer","archive-bz-canvas","archive-bz-view-status"])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/Không phải ảnh LCD OEM/);
 assert.equal(typeof projectFcv588ArchiveBZViewer,"function");
});

import {createSession,dispatch,createReplayEnvelope,sessionHash} from "../src/core/session.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {createFcv588ArchiveSidecar} from "../src/devices/fcv588/archive-compat.mjs";
const live=()=>{
 let s=createSession(adapter,scenario);
 s=dispatch(s,adapter,{kind:"restore-settings",
  settings:{zoomMode:"Bottom Zoom",zoomRange:"10"}},scenario);
 return s;
};
const zoomActive=()=>{
 let s=live();
 for(const input of [
  {kind:"down",control:"power"},{kind:"up",control:"power"},
  {kind:"tick",steps:4},{kind:"rotate",control:"mode",steps:-1},
  {kind:"ui-tick",elapsedMs:6000},
 ])s=dispatch(s,adapter,input,scenario);
 assert.equal(s.deviceState.mode,"LF-ZOOM");
 return s;
};
const pair=(envelope,contract)=>{
 const sidecar=createFcv588ArchiveSidecar(envelope,{presentationContract:contract});
 return [JSON.stringify(envelope),JSON.stringify(sidecar)];
};
test("P26 two explicit sidecar contracts reconstruct distinct BZ synthetic pixels for identical replay envelope",()=>{
 const state=zoomActive(),envelope=createReplayEnvelope(state);
 const original=JSON.stringify(envelope);
 const historical=projectFcv588ArchiveBZViewer(...pair(envelope,"P04_HISTORIC"));
 const lower=projectFcv588ArchiveBZViewer(...pair(envelope,"P23_LOWER_BOTTOM"));
 assert.equal(historical.renderable,true);
 assert.equal(lower.renderable,true);
 assert.equal(historical.presentationContract,"P04_HISTORIC");
 assert.equal(lower.presentationContract,"P23_LOWER_BOTTOM");
 assert.equal(historical.summary.sessionHash,sessionHash(state));
 assert.equal(lower.summary.sessionHash,sessionHash(state));
 assert.equal(historical.geometry.bottomFraction,0.5);
 assert.equal(lower.geometry.bottomFraction,0.75);
 assert.equal(historical.zoomRaster.width,144);
 assert.equal(historical.zoomRaster.height,484);
 assert.equal(historical.normalRaster.width,144);
 assert.equal(historical.normalRaster.height,484);
 assert.equal(historical.zoomRaster.data.length,144*484*4);
 assert.notDeepEqual(historical.zoomRaster.data,lower.zoomRaster.data);
 assert.deepEqual(historical.normalRaster.data,lower.normalRaster.data);
 assert.equal(JSON.stringify(envelope),original,"never re-label or mutate original replay");
});
test("P26 synthetic BZ generation deterministic; no external frame pixels accepted",()=>{
 const env=createReplayEnvelope(zoomActive());
 const args=pair(env,"P23_LOWER_BOTTOM");
 const a=projectFcv588ArchiveBZViewer(...args);
 const b=projectFcv588ArchiveBZViewer(...args);
 assert.deepEqual(a.zoomRaster.data,b.zoomRaster.data);
 assert.deepEqual(a.normalRaster.data,b.normalRaster.data);
 assert.equal(a.zoomRaster.sourceClass,"SYNTHETIC_DISPLAY_ONLY");
 assert.equal(a.sourceClass,"SYNTHETIC_TRAINING_ONLY");
 assert.equal(a.summary.zoomPreview.bottomFraction,0.75);
 assert.equal(a.geometry.bottomFraction,0.75);
});
test("P26 saved BZ preference while active mode LF is NOT a historical BZ screen",()=>{
 const env=createReplayEnvelope(live()); // BZ preference, but mode remains LF.
 const out=projectFcv588ArchiveBZViewer(...pair(env,"P23_LOWER_BOTTOM"));
 assert.equal(out.summary.zoomPreview.bottomFraction,0.75,"P25 preference schematic is allowed");
 assert.equal(out.renderable,false,"an LF screen must not be presented as historic BZ LCD");
 assert.equal(out.reason,"ARCHIVE_NOT_BOTTOM_ZOOM");
});

test("P26 a powered-off archive is not a visible Bottom Zoom LCD even if LF-ZOOM remains selected",()=>{
 let off=zoomActive();
 off=dispatch(off,adapter,{kind:"down",control:"power"},scenario);
 off=dispatch(off,adapter,{kind:"up",control:"power",durationMs:3100},scenario);
 assert.equal(off.deviceState.mode,"LF-ZOOM");
 assert.equal(off.deviceState.power,"off");
 const view=projectFcv588ArchiveBZViewer(...pair(createReplayEnvelope(off),"P23_LOWER_BOTTOM"));
 assert.equal(view.renderable,false,"powered-off LCD must never show reconstructed BZ picture");
 assert.equal(view.reason,"ARCHIVE_NOT_BOTTOM_ZOOM");
});

test("P26 original frozen pre-P23 profile22 is not BZ; do not invent archived pixels",()=>{
 const frozen=JSON.parse(readFileSync(
  new URL("./fixtures/P24_PINNED_PRE_P23_PROFILE22_ENVELOPE_20261117.json",import.meta.url),"utf8"));
 const visual=projectFcv588ArchiveBZViewer(...pair(frozen,"P04_HISTORIC"));
 assert.equal(visual.summary.sessionHash,"f0-fnv1a32-a429fc78");
 assert.equal(visual.summary.presentationContract,"P04_HISTORIC");
 assert.equal(visual.renderable,false);
 assert.equal(visual.reason,"ARCHIVE_NOT_BOTTOM_ZOOM");
 assert.equal(Object.hasOwn(visual,"zoomRaster"),false);
});
test("P26 invalid or mismatched sidecar never reaches renderer",()=>{
 const env=createReplayEnvelope(live());
 const valid=pair(env,"P23_LOWER_BOTTOM");
 assert.throws(()=>projectFcv588ArchiveBZViewer(valid[0],""),/rỗng|dung lượng/);
 assert.throws(()=>projectFcv588ArchiveBZViewer(valid[0],"{"),/JSON/);
 const tamper=JSON.parse(valid[1]);
 tamper.presentationContract="P04_HISTORIC";
 assert.throws(()=>projectFcv588ArchiveBZViewer(valid[0],JSON.stringify(tamper)),/fingerprint/);
 assert.throws(()=>projectFcv588ArchiveBZViewer(JSON.stringify({...env,events:[]}),valid[1]),/content|mismatch/);
});
test("P26 viewer retains P25 byte and event caps, no archive image payload schema",()=>{
 const env=createReplayEnvelope(live());
 const [e,c]=pair(env,"P23_LOWER_BOTTOM");
 assert.throws(()=>projectFcv588ArchiveBZViewer(e+" ".repeat(1024*1024),c),/dung lượng/);
 assert.throws(()=>projectFcv588ArchiveBZViewer(e," ".repeat(8193)),/dung lượng/);
 assert.throws(()=>projectFcv588ArchiveBZViewer(
  JSON.stringify({...env,events:Array.from({length:2001},()=>({}))}),c),/sự kiện/);
 const module=readFileSync(new URL("../web/fcv588-archive-bz-viewer.mjs",import.meta.url),"utf8");
 assert.doesNotMatch(module,/fetch\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage/);
 assert.match(module,/projectFcvZoom\(observation,state,/);
});
test("P26 app integrates isolated D15 canvas without altering live LCD route",()=>{
 const app=readFileSync(new URL("../web/app.mjs",import.meta.url),"utf8");
 const css=readFileSync(new URL("../web/styles.css",import.meta.url),"utf8");
 assert.match(app,/renderFcv588ArchiveBZViewer\(bzCanvas,bzModel\)/);
 assert.match(app,/bzViewer.hidden=true/);
 assert.match(app,/delete bzCanvas.dataset\[name\]/);
 assert.match(app,/displayContract:"P23_LOWER_BOTTOM"/,"live LCD still current P23");
 assert.doesNotMatch(css.split("/* P26 isolated D15 canvas only:")[1],/\.lcd\s*\{/,"P26 CSS only styles the D15 viewer");
});
