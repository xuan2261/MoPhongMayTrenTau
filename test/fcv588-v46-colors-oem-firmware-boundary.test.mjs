import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {createSession,sessionHash} from "../src/core/session.mjs";
import {FCV_MENU_CATEGORIES,FCV_MENU_ENTRIES,getFcvMenuItems}
  from "../src/devices/fcv588/menu-atlas.mjs";
import {initialFcv588State} from "../src/devices/fcv588/model.mjs";
import {getFcvDisplayPalette} from "../src/devices/fcv588/display-palette.mjs";
import {projectFcvMainMenu} from "../web/lcd-presentation.mjs";
import {projectFcvSourceCue} from "../web/lcd-instructor-meta.mjs";
import {FCV588_PUBLIC_PROFILE_REVISION} from "../src/devices/fcv588/profile-version.mjs";

// Primary OEM source: FCV588/628 Software History (September 2016 v2.01):
// official menu reference is Display > Colors with 8 and 16 choices.
// The student's actual installed firmware is UNKNOWN. A training-only
// source disclaimer belongs OUTSIDE the OEM-looking LCD, in D15.
const current=()=>({ ...initialFcv588State(), power:"on",
  overlay:{kind:"menu",category:"Display",itemIndex:1,editing:false} });

test("V46 FURUNO v2.01 literal Display > Colors excludes instructor suffix on OEM-facing menu",()=>{
  const entry=getFcvMenuItems("Display",current()).find(x=>x.id==="display.colors");
  assert.ok(entry,"Colors is a source-graded training preview");
  assert.equal(entry.label,"Colors");
  assert.equal(entry.menuPath,"Display > Colors");
  assert.deepEqual(entry.choices,["8","16"]);
  assert.equal(entry.sourceStatus,"TRAINING_PALETTE_PREVIEW_FIRMWARE_UNKNOWN");
  assert.notEqual(entry.disabled,true,
    "The Colors training preview is available without claiming physical firmware entitlement");
});

test("V46 Colors choice window and operator LCD label must not print SIM or training provenance",()=>{
  const state=current();
  const before=structuredClone(state);
  const view=projectFcvMainMenu(state);
  assert.equal(view.category,"Display");
  assert.equal(view.rows.find(x=>x.id==="display.colors")?.text.replace(/^▶\s*/u,"").trim(),"Colors");
  assert.equal(view.rows.find(x=>x.id==="display.colors")?.sourceStatus,
    "TRAINING_PALETTE_PREVIEW_FIRMWARE_UNKNOWN");
  assert.doesNotMatch(view.rows.map(x=>x.text).join(" "),/Colors\s*·\s*SIM/i);
  assert.deepEqual(state,before,"read-only LCD projection must not mutate device state");
});

test("V46 D15 outside the device explicitly discloses Colors preview and unknown firmware",()=>{
  const cue=projectFcvSourceCue(current(),0);
  assert.equal(cue.visible,true);
  assert.equal(cue.status,"TRAINING_PALETTE_PREVIEW_FIRMWARE_UNKNOWN");
  assert.match(cue.title,/Colors/);
  assert.match(cue.detail,/huấn luyện|giả lập/i);
  assert.match(cue.detail,/firmware|phiên bản/i);
  assert.doesNotMatch(cue.detail,/đã xác nhận firmware/i);
});

test("V46 System R&D Echo history is research evidence, not an invented exposed OEM menu",()=>{
  assert.deepEqual(FCV_MENU_CATEGORIES,["Sounder","Display","Alarm","Data","System"]);
  const system=getFcvMenuItems("System",current());
  assert.equal(system.some(x=>/^Echo$/.test(x.label)),false,
    "R&D-only System Echo path is not a confirmed operator function of installed firmware");
  const colors=FCV_MENU_ENTRIES.filter(x=>x.id==="display.colors");
  assert.equal(colors.length,1);
  assert.equal(colors[0].manualSection,"§1.22");
});

test("V46 original palette remains synthetic only, firmware/profile/replay unaffected",()=>{
  const a=getFcvDisplayPalette({colors:"8",palette:"Blue"});
  const b=getFcvDisplayPalette({colors:"16",palette:"Blue"});
  assert.equal(a.length,8);
  assert.equal(b.length,16);
  assert.notDeepEqual(a,b);
  assert.equal(initialFcv588State().settings.colors,undefined);
  assert.equal(FCV588_PUBLIC_PROFILE_REVISION,"F1-public-reference-24");
  assert.equal(adapter.profile.firmware,null);
  const session=createSession(adapter,scenario);
  const before=sessionHash(session);
  projectFcvMainMenu(current());
  assert.equal(sessionHash(session),before);
});

test("V46 public menu atlas metadata mirrors OEM literal and retains firmware unknown grade",async()=>{
  const atlas=JSON.parse(await readFile(
    new URL("../docs/evidence/fcv588-public-menu-atlas.json",import.meta.url),"utf8"));
  const array=Array.isArray(atlas)?atlas:Array.isArray(atlas.entries)?atlas.entries:
    Array.isArray(atlas.menuEntries)?atlas.menuEntries:null;
  assert.ok(array,"Need full metadata entries and source provenance");
  const item=array.find(x=>x.id==="display.colors");
  assert.equal(item?.label,"Colors");
  assert.equal(item?.menuPath,"Display > Colors");
  assert.equal(item?.sourceStatus,"TRAINING_PALETTE_PREVIEW_FIRMWARE_UNKNOWN");
});
