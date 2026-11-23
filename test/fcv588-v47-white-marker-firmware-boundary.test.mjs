import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {FCV_MENU_CATEGORIES,FCV_MENU_ENTRIES,getFcvMenuItems}
  from "../src/devices/fcv588/menu-atlas.mjs";
import {initialFcv588State} from "../src/devices/fcv588/model.mjs";
import {getFcvDisplayPalette} from "../src/devices/fcv588/display-palette.mjs";
import {projectFcvMainMenu} from "../web/lcd-presentation.mjs";
import {projectFcvSourceCue} from "../web/lcd-instructor-meta.mjs";
import {FCV588_PUBLIC_PROFILE_REVISION} from "../src/devices/fcv588/profile-version.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario,initialWorldState,observeSounder}
  from "../src/core/scenario.mjs";
import {createSession,sessionHash} from "../src/core/session.mjs";
import {fingerprint} from "../src/core/protocol.mjs";

// FURUNO OME-23890-E §1.22: White Marker uses a color bar and UP/DOWN
// to choose the echo color rendered white; Off disables. Software history
// notes changes in v2.01 but not which firmware is installed on a unit.
// Current Off/White/Gray are training choices, not manufacturer enum.
const trainingState=()=>{
  const state={...initialFcv588State(),power:"on"};
  const itemIndex=getFcvMenuItems("Sounder",state)
    .findIndex(item=>item.id==="sounder.whiteMarker");
  assert.ok(itemIndex>=0,"White Marker must remain an operator menu entry");
  return {...state,overlay:{kind:"menu",category:"Sounder",categoryIndex:0,
    itemIndex,editing:false,draftValue:null,editEntryId:null}};
};

test("V47 White Marker OEM operator label remains exact but training choice/source grade is explicit",()=>{
  const item=getFcvMenuItems("Sounder",trainingState())
    .find(x=>x.id==="sounder.whiteMarker");
  assert.ok(item);
  assert.equal(item.label,"White Marker");
  assert.equal(item.menuPath,"Sounder > White Marker");
  assert.equal(item.manualSection,"§1.22");
  assert.deepEqual(item.choices,["Off","White","Gray"],
    "old profile21 training choices must not be silently reinterpreted");
  assert.equal(item.sourceStatus,
    "TRAINING_WHITE_MARKER_PREVIEW_FIRMWARE_UNKNOWN");
});

test("V47 firmware-dependent White Marker D15 cue correctly distinguishes OEM color-bar versus training choices",()=>{
  const cue=projectFcvSourceCue(trainingState(),0);
  assert.equal(cue.visible,true);
  assert.equal(cue.status,
    "TRAINING_WHITE_MARKER_PREVIEW_FIRMWARE_UNKNOWN");
  assert.match(cue.title,/White Marker/);
  assert.match(cue.detail,/thanh màu/i);
  assert.match(cue.detail,/Off/);
  assert.match(cue.detail,/White.*Gray/);
  assert.match(cue.detail,/giả lập|huấn luyện/i);
  assert.match(cue.detail,/firmware/i);
  assert.doesNotMatch(cue.detail,/firmware đã xác nhận/i);
});

test("V47 LCD menu projector remains OEM-label only and pure while D15 keeps source grading",()=>{
  const state=trainingState();
  const original=structuredClone(state);
  const projected=projectFcvMainMenu(state);
  const row=projected.rows.find(x=>x.id==="sounder.whiteMarker");
  assert.ok(row?.selected);
  assert.equal(row.text.trim(),"▶ White Marker");
  assert.equal(row.sourceStatus,
    "TRAINING_WHITE_MARKER_PREVIEW_FIRMWARE_UNKNOWN");
  assert.doesNotMatch(projected.rows.map(x=>x.text).join(" "),
    /WHITE_MARKER_PREVIEW|FIRMWARE_UNKNOWN|giả lập|huấn luyện|SOURCE_GAP/i);
  assert.deepEqual(state,original);
});

test("V47 White Marker notice is selection-scoped, does not leak into another Sounder entry",()=>{
  const markerState=trainingState();
  const unrelatedIndex=getFcvMenuItems("Sounder",markerState)
    .findIndex(item=>item.id==="sounder.colorErase");
  assert.ok(unrelatedIndex>=0,"Color Erase must remain an unrelated menu row");
  const nearby={...markerState,overlay:{...markerState.overlay,itemIndex:unrelatedIndex}};
  assert.equal(getFcvMenuItems("Sounder",nearby)[nearby.overlay.itemIndex].id,
    "sounder.colorErase");
  const white=projectFcvSourceCue(markerState,5);
  const other=projectFcvSourceCue(nearby,5);
  assert.equal(white.status,
    "TRAINING_WHITE_MARKER_PREVIEW_FIRMWARE_UNKNOWN");
  assert.notEqual(other.status,white.status);
  assert.doesNotMatch(other.detail??"",/White.*Gray/);
});

test("V47 independently authored White/Gray visual mock never changes raw sensor or physical firmware",()=>{
  const before=fingerprint([...observeSounder(scenario,
    initialWorldState(scenario),{columns:36,rows:80}).channels[50]]);
  const off=getFcvDisplayPalette({colors:"8",whiteMarker:"Off"});
  const white=getFcvDisplayPalette({colors:"8",whiteMarker:"White"});
  const gray=getFcvDisplayPalette({colors:"8",whiteMarker:"Gray"});
  assert.notDeepEqual(off[7],white[7]);
  assert.notDeepEqual(white[7],gray[7]);
  assert.deepEqual(off[0],white[0]);
  assert.equal(fingerprint([...observeSounder(scenario,
    initialWorldState(scenario),{columns:36,rows:80}).channels[50]]),
    before,"drawing a training palette may never change sensor observations");
  assert.equal(adapter.profile.firmware,null);
  assert.equal(FCV588_PUBLIC_PROFILE_REVISION,"F1-public-reference-23");
});

test("V47 manufacturer's R&D-only System Echo remains unexposed; Display Colors still source-graded",()=>{
  assert.deepEqual(FCV_MENU_CATEGORIES,
    ["Sounder","Display","Alarm","Data","System"]);
  assert.equal(FCV_MENU_ENTRIES.filter(x=>x.id==="sounder.whiteMarker").length,1);
  assert.equal(getFcvMenuItems("System",trainingState())
    .some(x=>x.label==="Echo"),false);
  const colors=getFcvMenuItems("Display",trainingState())
    .find(x=>x.id==="display.colors");
  assert.equal(colors?.sourceStatus,
    "TRAINING_PALETTE_PREVIEW_FIRMWARE_UNKNOWN");
  assert.equal(colors?.label,"Colors");
  assert.deepEqual(colors?.choices,["8","16"]);
  const sess=createSession(adapter,scenario);
  const hash=sessionHash(sess);
  projectFcvMainMenu(trainingState());
  projectFcvSourceCue(trainingState(),0);
  assert.equal(sessionHash(sess),hash);
});

test("V47 live menu atlas source grade and B07 claim HOLD match runtime training-only contract",async()=>{
  const atlas=JSON.parse(await readFile(
    new URL("../docs/evidence/fcv588-public-menu-atlas.json",import.meta.url),"utf8"));
  const row=atlas.entries.find(x=>x.id==="sounder.whiteMarker");
  assert.equal(row?.label,"White Marker");
  assert.equal(row?.sourceStatus,
    "TRAINING_WHITE_MARKER_PREVIEW_FIRMWARE_UNKNOWN");
  assert.deepEqual(row?.choices,["Off","White","Gray"]);
  const claims=JSON.parse(await readFile(
    new URL("../docs/evidence/fcv588-public-implementation-status.json",import.meta.url),"utf8"));
  const feature=claims.operatorRows.find(x=>x.featureId==="B07");
  assert.equal(feature?.claimDecision,"HOLD");
  assert.match(feature?.note??"",/firmware/i);
  assert.match(feature?.note??"",/White.*Gray/);
  assert.equal(claims.hardwareValidated,false);
});
