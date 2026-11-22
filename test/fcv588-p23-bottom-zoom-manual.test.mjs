import test from "node:test";
import assert from "node:assert/strict";
import {projectFcvZoom} from "../src/devices/fcv588/echo-projection.mjs";
import {initialFcv588State} from "../src/devices/fcv588/model.mjs";
// Manual OME23890-E §1.4.3, PDF page12: Bottom Zoom automatically
// shifts to keep the bottom echo in the LOWER PART of the zoom screen.
// The manual doesn't pin OEM pixels; only a strict lower-half relationship.
const observation=depth=>({modelVersion:"P23_MANUAL_BZ_FIXTURE",simTick:0,
 bottomDepthM:depth,recommendedAutoRangeM:80,maxDepthM:80,
 syntheticTargets:[],columns:2,rows:81,
 channels:{50:new Uint8Array(162),200:new Uint8Array(162)}});
const setting=(zoomMode)=>({...initialFcv588State(),
 settings:{...initialFcv588State().settings,
 zoomMode,zoomRange:"8",blRange:"8",smoothing:"Off"}});
test("P23 Bottom Zoom keeps typed bottom below the midpoint, both frequencies",()=>{
 for(const khz of [50,200]){
  for(const depth of [50,52]){
   const p=projectFcvZoom(observation(depth),setting("Bottom Zoom"),
    {frequencyKhz:khz,rows:81,displayContract:"P23_LOWER_BOTTOM"});
   const fraction=(depth-p.startDepthM)/p.windowDepthM;
   assert.ok(fraction>0.5 && fraction<=1,
    `BZ bottom must be in lower portion, got fraction ${fraction}`);
   assert.equal(p.windowDepthM,8);
   // Changing only synthetic bottom depth must move the window, not ratio.
   assert.equal(p.startDepthM,depth-6);
  }
 }
});
test("P23 Marker Zoom remains VRM-centered; BL remains bottom-edge",()=>{
 const marker=projectFcvZoom(observation(50),
  {...setting("Marker Zoom"),vrmDepthM:30},{frequencyKhz:50,rows:81});
 assert.equal(marker.startDepthM,26);
 const lock=projectFcvZoom(observation(50),
  setting("Bottom Lock"),{frequencyKhz:50,rows:81});
 assert.equal(lock.startDepthM,42);
});

test("P23 historic P04 display projection remains centered by default",()=>{
 const p=projectFcvZoom(observation(50),setting("Bottom Zoom"),
  {frequencyKhz:50,rows:81});
 assert.equal(p.startDepthM,46);
});
