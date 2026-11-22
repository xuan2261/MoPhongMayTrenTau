import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {replayFcv588Envelope} from "../src/devices/fcv588/replay-compat.mjs";
import {FCV588_ADAPTER as currentAdapter} from "../src/devices/fcv588/adapter.mjs";
import {FCV588_PROFILE21_ADAPTER as legacyAdapter} from "../src/devices/fcv588/adapter-profile21.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {replay,sessionHash} from "../src/core/session.mjs";
import {projectFcvManualNavBoxes} from "../src/devices/fcv588/navigation-profile21.mjs";
import {getFcvMenuItems} from "../src/devices/fcv588/menu-atlas-profile21.mjs";
const fixtures=[
 ["P14_LEGACY_PROFILE21_NAV1_ENVELOPE_20261116.json","a6086514bd01985178c006213e255d7d50afe4696266994a4ad0c73a5e87346b","f0-fnv1a32-3e46462e","f0-fnv1a32-460d29de",13],
 ["P14_LEGACY_PROFILE21_NAV2_ENVELOPE_20261116.json","da97774bb74ace7d55687eccabf30fc792cac9d5ffdb6290a7d14bae6ce34798","f0-fnv1a32-37f4868c","f0-fnv1a32-d24577ef",14],
 ["P14_LEGACY_PROFILE21_DATA_SOURCE_ENVELOPE_20261116.json","c35fff983ab301b7efd6db771cdf6e8b92e1dda551930b81174d05ac4ee6953c","f0-fnv1a32-ecc515d3","f0-fnv1a32-df56c9d2",17],
 ["P14_LEGACY_PROFILE21_NMEA_COMMITTED_ENVELOPE_20261116.json","b7d844b666e9309822decdc3b92eb8b86e333403a544816cbf937fd95560fc7a","f0-fnv1a32-ef61e8e1","f0-fnv1a32-80843fcc",19]
];
for(const [file,sha,expectedSession,expectedFingerprint,count] of fixtures){
 test(`P14 canonical profile21 pinned NAV/Data fixture: ${file}`,()=>{
  const bytes=readFileSync(new URL(`./fixtures/${file}`,import.meta.url));
  assert.equal(createHash("sha256").update(bytes).digest("hex"),sha);
  const envelope=JSON.parse(bytes.toString());
  assert.equal(envelope.profileRevision,"F1-public-reference-21");
  assert.equal(envelope.contentFingerprint,expectedFingerprint);
  const s=replayFcv588Envelope(scenario,envelope);
  assert.equal(s.events.length,count);
  assert.equal(s.meta.profileHash,"f0-fnv1a32-f2d5289b");
  assert.equal(sessionHash(s),expectedSession);
  assert.equal(sessionHash(replay(legacyAdapter,scenario,envelope)),expectedSession);
  assert.throws(()=>replay(currentAdapter,scenario,envelope),/profile|contract/);
  if(file.includes("NAV1")){
   assert.equal(s.deviceState.settings.nav1Box3,"DEPTH");
   assert.equal(s.deviceState.overlay.mode,"NAV1");
   assert.deepEqual(projectFcvManualNavBoxes({mode:"NAV1",settings:s.deviceState.settings,sample:null,sonarDepthM:49.6}).boxes.map(b=>b.label),["SPEED (STW)","WIND","DEPTH"]);
  }
  if(file.includes("NAV2")){
   assert.equal(s.deviceState.settings.nav2Box1,"SPEED (STW)");
   assert.equal(s.deviceState.navigation.waypoints[0].id,"WP001");
  }
  if(file.includes("DATA_SOURCE"))assert.equal(getFcvMenuItems("Data",s.deviceState)[s.deviceState.overlay.itemIndex].id,"data.tripSource");
  if(file.includes("NMEA_COMMITTED")){
   assert.equal(s.deviceState.settings.tripSource,"NMEA");
   assert.equal(projectFcvManualNavBoxes({mode:"NAV2",settings:s.deviceState.settings,sample:null,sonarDepthM:49.6}).boxes.find(x=>x.label==="TRIP")?.value,"NO DATA");
  }
 });
}