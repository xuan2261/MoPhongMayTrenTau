import test from "node:test";
import assert from "node:assert/strict";
import {createSession,dispatch,createReplayEnvelope,replay,sessionHash} from
  "../src/core/session.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {FCV588_ADAPTER as currentAdapter} from "../src/devices/fcv588/adapter.mjs";
import {FCV588_PROFILE21_ADAPTER as historicAdapter} from
  "../src/devices/fcv588/adapter-profile21.mjs";
import {getFcvReplayAdapter,replayFcv588Envelope} from
  "../src/devices/fcv588/replay-compat.mjs";
import {FCV588_PUBLIC_PROFILE_REVISION} from "../src/devices/fcv588/profile-version.mjs";
import {FCV_MENU_ENTRIES as currentMenu,getFcvMenuItems as currentItems} from
  "../src/devices/fcv588/menu-atlas.mjs";
import {FCV_MENU_ENTRIES as historicMenu,getFcvMenuItems as historicItems} from
  "../src/devices/fcv588/menu-atlas-profile21.mjs";
import {encodeFcvSettings as encodeHistoricSettings} from
  "../src/devices/fcv588/settings-profile21.mjs";
import {decodeFcvSettings,decodeFcvProfile21Settings,decodeFcvProfile19Settings,
  encodeFcvSettings,FCV_SETTINGS_STORAGE_KEY} from "../src/devices/fcv588/settings.mjs";
import {readFile} from "node:fs/promises";

const historicControls=[
  {kind:"down",control:"power"},
  {kind:"up",control:"power",durationMs:100},
  {kind:"tick",steps:4},
  {kind:"press",control:"menu"},
  ...Array.from({length:5},()=>({kind:"pad",control:"trackpad",direction:"down"})),
];
const simulate=(adapter,events=historicControls)=>{
  let session=createSession(adapter,scenario);
  for(const event of events)session=dispatch(session,adapter,event,scenario);
  return session;
};
const selected=(session,atlas)=>atlas("Sounder",session.deviceState)
  [session.deviceState.overlay.itemIndex].id;

test("P14 exposes active profile22 with manual AP-1 menu order bound into adapter profile hash",()=>{
  assert.equal(FCV588_PUBLIC_PROFILE_REVISION,"F1-public-reference-23");
  assert.equal(currentAdapter.revision,FCV588_PUBLIC_PROFILE_REVISION);
  const expected=["sounder.pictureAdvance","sounder.zoomMode","sounder.shift",
    "sounder.interference","sounder.colorErase","sounder.clutter",
    "sounder.whiteLine","sounder.whiteMarker","sounder.tvg",
    "sounder.smoothing","sounder.bottomZone","sounder.txPower","sounder.txRate"];
  assert.deepEqual(currentMenu.filter(x=>x.category==="Sounder").map(x=>x.id),expected);
  assert.deepEqual(currentAdapter.profile.menuEntryOrderIds,
    currentMenu.map(entry=>entry.id),"active replay profile must cryptographically bind ordered row IDs");
  const next=createSession(currentAdapter,scenario);
  const reordered={...currentAdapter,profile:{...currentAdapter.profile,
    menuEntryOrderIds:[...currentAdapter.profile.menuEntryOrderIds].reverse()}};
  assert.throws(()=>replay(reordered,scenario,
    createReplayEnvelope(next)),/replay contract\/profile\/scenario mismatch/);
});

test("P14 archived profile21 menu/adapter preserves original selected row and byte-for-byte historic replay hashes",()=>{
  assert.equal(historicAdapter.revision,"F1-public-reference-21");
  assert.equal(historicMenu.length,currentMenu.length);
  assert.equal(selected(simulate(historicAdapter),historicItems),"sounder.whiteMarker");
  const session=simulate(historicAdapter);
  const envelope=createReplayEnvelope(session);
  assert.equal(session.meta.profileHash,"f0-fnv1a32-f2d5289b");
  assert.equal(sessionHash(session),"f0-fnv1a32-b7e35e70");
  assert.equal(envelope.contentFingerprint,"f0-fnv1a32-b93e124e");
  const historic=replayFcv588Envelope(scenario,envelope);
  assert.equal(historic.profileRevision,"F1-public-reference-21");
  assert.equal(sessionHash(historic),sessionHash(session));
  assert.equal(selected(historic,historicItems),"sounder.whiteMarker");
  assert.notEqual(selected(historic,currentItems),selected(historic,historicItems));
  assert.equal(getFcvReplayAdapter(envelope.profileRevision),historicAdapter);
});

test("P14 historic profile21 committed White Marker editor also replays under its exact old hash",()=>{
  const original=dispatch(simulate(historicAdapter),historicAdapter,
    {kind:"press",control:"enter"},scenario);
  assert.equal(original.deviceState.overlay.editEntryId,"sounder.whiteMarker");
  assert.equal(sessionHash(original),"f0-fnv1a32-138abeb4");
  assert.equal(original.meta.profileHash,"f0-fnv1a32-f2d5289b");
  const envelope=createReplayEnvelope(original);
  assert.equal(envelope.contentFingerprint,"f0-fnv1a32-336863c3");
  const again=replayFcv588Envelope(scenario,envelope);
  assert.equal(again.deviceState.overlay.editEntryId,"sounder.whiteMarker");
  assert.equal(sessionHash(again),sessionHash(original));
});

test("P14 profile22 menu navigation and selection-only replay deterministic, no reinterpretation with old profile",()=>{
  const current=simulate(currentAdapter);
  assert.equal(selected(current,currentItems),"sounder.clutter");
  assert.equal(current.profileRevision,"F1-public-reference-23");
  const envelope=createReplayEnvelope(current);
  const back=replayFcv588Envelope(scenario,envelope);
  assert.equal(sessionHash(back),sessionHash(current));
  assert.equal(selected(back,currentItems),"sounder.clutter");
  assert.notEqual(envelope.contentFingerprint,"f0-fnv1a32-b93e124e");
  assert.notEqual(current.meta.profileHash,"f0-fnv1a32-f2d5289b");
  assert.throws(()=>replay(currentAdapter,scenario,
    createReplayEnvelope(simulate(historicAdapter))),
    /replay contract\/profile\/scenario mismatch/);
  assert.throws(()=>replay(historicAdapter,scenario,envelope),
    /replay contract\/profile\/scenario mismatch/);
  assert.equal(getFcvReplayAdapter(current.profileRevision),currentAdapter);
  assert.throws(()=>getFcvReplayAdapter("F1-public-reference-24"),/unsupported|unknown/i);
  assert.throws(()=>replayFcv588Envelope(scenario,{profileRevision:"F1-public-reference-999"}),
    /unsupported|unknown/i);
});

test("P14 legacy stored profile21 settings import explicitly, current22 decode rejects old without implicit rewrite",()=>{
  assert.match(FCV_SETTINGS_STORAGE_KEY,/settings\.v18$/);
  const legacyRaw=encodeHistoricSettings({pictureAdvance:"1/2",tankenmaru:"Off",palette:"Blue"});
  assert.equal(JSON.parse(legacyRaw).profileRevision,"F1-public-reference-21");
  assert.equal(decodeFcvSettings(legacyRaw),null,
    "current decoder must not silently accept another profile");
  const imported=decodeFcvProfile21Settings(legacyRaw);
  assert.deepEqual(imported,{pictureAdvance:"1/2",tankenmaru:"Off",palette:"Blue"});
  assert.equal(decodeFcvProfile19Settings(legacyRaw),null);
  const revised=encodeFcvSettings(imported);
  assert.equal(JSON.parse(revised).profileRevision,"F1-public-reference-23");
  assert.deepEqual(decodeFcvSettings(revised),imported);
  assert.equal(decodeFcvProfile21Settings(revised),null);
  const tampered=JSON.parse(legacyRaw);
  tampered.settings.pictureAdvance="4x";
  assert.equal(decodeFcvProfile21Settings(JSON.stringify(tampered)),null);
  assert.equal(decodeFcvProfile21Settings('{"__proto__":{}}'),null);
});

test("P14 explicit legacy compatibility is reachable in app storage logic without replay migration or forced original storage rewrite",async()=>{
  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  assert.match(app,/decodeFcvProfile21Settings/);
  assert.match(app,/decodeFcvProfile19Settings/);
  assert.match(app,/getItem\(FCV_SETTINGS_STORAGE_KEY\)/);
  assert.match(app,/if\s*\(raw === null\) return ""/);
  assert.match(app,/if\s*\(!currentSettings\)/);
  assert.doesNotMatch(app,/localStorage\.setItem\(FCV_SETTINGS_STORAGE_KEY,\s*raw\)/);
});
