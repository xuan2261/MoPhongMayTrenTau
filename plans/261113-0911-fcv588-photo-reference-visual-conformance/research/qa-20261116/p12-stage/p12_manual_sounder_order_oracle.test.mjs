import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";
import {join} from "node:path";

// Two independent observations:
// FURUNO 2025 OME-23890-E, PDF page 59 printed AP-1 "Menu Tree";
// 2016 collection giaoDien.jpg literal 13 Sounder rows (not firmware version).
// This oracle compares existing English entry IDs/order only. It does not
// certify a complete Vietnamese language pack or undocumented choices.
const CANONICAL = "C:\\Work\\MoPhongMayTrenTau";
const ROOT=process.env.P12_RUNTIME_ROOT || CANONICAL;
const expectedOrder=[
  "sounder.pictureAdvance","sounder.zoomMode","sounder.shift",
  "sounder.interference","sounder.colorErase","sounder.clutter",
  "sounder.whiteLine","sounder.whiteMarker","sounder.tvg",
  "sounder.smoothing","sounder.bottomZone","sounder.txPower",
  "sounder.txRate",
];
const sha=async p=>createHash("sha256").update(await readFile(p)).digest("hex");
const manual=join(CANONICAL,"sources/manuals/FCV-588/FURUNO_FCV628_FCV588_Operators_Manual_OME23890E_2025.pdf");
const photo=join(CANONICAL,"sources/FCV588_GiaoDienThucTeMay2016/giaoDien.jpg");
const mod=await import(pathToFileURL(join(ROOT,"src/devices/fcv588/menu-atlas.mjs")).href);

test("P12 source identity: manufacturer AP-1 manual and original photographed 2016 menu immutable",async()=>{
  assert.equal(await sha(manual),"3003e23b9d1eda509ceb968130249fe02aa279c2efb3cf900dde54ab9d709cd3");
  assert.equal(await sha(photo),"e7b78466fa582dc0cc50aec8e2fc264f8b3ee187d93a53cace1e88d1e156c99c");
});

test("P12 OME23890E PDF59 printed AP-1 Sounder menu order (also visible in photo)",()=>{
  const actual=mod.FCV_MENU_ENTRIES.filter(x=>x.category==="Sounder").map(x=>x.id);
  assert.deepEqual(actual,expectedOrder);
});

test("P12 remains 5 menu groups, 67 entries and unchanged English-only language safety gate",()=>{
  assert.deepEqual(mod.FCV_MENU_CATEGORIES,["Sounder","Display","Alarm","Data","System"]);
  assert.equal(mod.FCV_MENU_ENTRIES.length,67);
  const lang=mod.FCV_MENU_ENTRIES.find(x=>x.id==="system.language");
  assert.deepEqual(lang.choices,["English"]);
  const current=mod.getFcvMenuItems("System",{settings:{tankenmaru:"Off"},mode:"LF",rangeMode:"manual"}).find(x=>x.id==="system.language");
  assert.equal(current.disabled,true);
  assert.equal(current.disabledReason,"RIGHTS_HOLD_LANGUAGE_ASSETS_AND_REBOOT_SOURCE_GAP");
});
