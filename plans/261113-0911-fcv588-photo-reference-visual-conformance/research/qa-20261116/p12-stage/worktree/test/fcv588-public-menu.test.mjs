import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {FCV_MENU_CATEGORIES, FCV_MENU_ENTRIES, getFcvMenuItems,
  getInstallationMenu,FCV_FISH_ALARM_FIELDS} from "../src/devices/fcv588/menu-atlas.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";
import {createSession, dispatch} from "../src/core/session.mjs";

const atlas = JSON.parse(await readFile(new URL(
  "../docs/evidence/fcv588-public-menu-atlas.json", import.meta.url), "utf8"));
const send = (s, input) => dispatch(s, adapter, input, TRAINING_SCENARIO);
function boot() {
  let s = createSession(adapter, TRAINING_SCENARIO);
  for (const input of [{kind:"down",control:"power"}, {kind:"up",control:"power"},
    {kind:"tick",steps:4}]) s=send(s,input);
  return s;
}
const key = (s, control) => send(s, {kind:"press",control});
const pad = (s, direction) => send(s, {kind:"pad",control:"trackpad",direction});

test("all five authentic main menu headings expose public annotated entries", () => {
  assert.deepEqual(FCV_MENU_CATEGORIES, ["Sounder","Display","Alarm","Data","System"]);
  assert.ok(FCV_MENU_ENTRIES.length >= 30, "a placeholder is not an operator menu");
  assert.deepEqual(new Set(FCV_MENU_ENTRIES.map(x => x.id)).size, FCV_MENU_ENTRIES.length);
  for (const entry of FCV_MENU_ENTRIES) {
    assert.ok(FCV_MENU_CATEGORIES.includes(entry.category), entry.id);
    assert.equal(entry.sourceId, "PUB-FCV-001");
    assert.match(entry.manualSection, /^§\d|Appendix/);
    assert.ok(entry.menuPath && entry.label && entry.kind && entry.sourceStatus, entry.id);
  }
  for (const category of FCV_MENU_CATEGORIES) {
    assert.ok(getFcvMenuItems(category, {}).length >= 4, category + " lacks operator options");
  }
  assert.equal(atlas.entries.length, FCV_MENU_ENTRIES.length);
  assert.deepEqual(atlas.categories, FCV_MENU_CATEGORIES);
});

test("manual Appendix 1 menu branches and System sections are attributed to their actual roots",()=>{
  for(const id of ["display.aScope","display.accuFish","display.bottomDiscrimination",
    "display.rezBoost"]){
    const item=FCV_MENU_ENTRIES.find(x=>x.id===id);
    assert.ok(item && item.category==="Display",id+" belongs to Display menu");
  }
  for(const [id,ref] of [
    ["system.keySetup","§2.3"],
    ["system.keyBeep","§2.3"],
    ["system.language","§2.4"],
    ["system.units","§2.5"],
    ["system.calibration","§2.6"],
    ["system.draft","§2.6"],
    ["system.transducer","§2.7"],
    ["system.demo","§2.8"],
  ]){
    assert.equal(FCV_MENU_ENTRIES.find(item=>item.id===id)?.manualSection,ref,id);
  }
});

test("§1.22 Sounder TX Power and TX Rate expose the documented option ranges",()=>{
  const power=FCV_MENU_ENTRIES.find(item=>item.id==="sounder.txPower");
  const rate=FCV_MENU_ENTRIES.find(item=>item.id==="sounder.txRate");
  assert.deepEqual(power.choices,["Auto","10%","20%","30%","40%","50%",
    "60%","70%","80%","90%","100%","Off"]);
  assert.deepEqual(rate.choices,["1","2","3","4","5","6","7","8","9",
    "10","S","Max"]);
});

test("§4.10 Installation is a different fixture from normal System", () => {
  const install = getInstallationMenu();
  for (const label of ["Language", "Type", "Units", "Demonstrate", "Tankenmaru System", "NMEA"]) {
    assert.ok(install.some(x => x.label === label), label + " absent from setup");
  }
  const normal = getFcvMenuItems("System", {settings:{tankenmaru:"Off"}});
  const tanken = getFcvMenuItems("System", {settings:{tankenmaru:"On"}});
  assert.ok(normal.some(x => x.id === "system.nmea"));
  assert.ok(tanken.every(x => x.id !== "system.nmea"));
  assert.ok(tanken.some(x => x.id === "system.tankenmaru"));
});

test("§1.18 alarm controls expose real ALARM1-5, not independent no-op toggle duplicates",()=>{
  const entries=getFcvMenuItems("Alarm",{});
  for(const id of ["alarm.fishAlarm","alarm.bottomAlarm","alarm.temperatureAlarm"]){
    assert.equal(entries.some(x=>x.id===id),false,
      id+" is not connected to alarmProfiles and must not offer a fictitious edit");
  }
  assert.equal(entries.filter(x=>/^alarm\.alarm[1-5]$/.test(x.id)).length,5);
});

test("D04 Language is explicitly unavailable until licensed language resources and reboot semantics",()=>{
  const entry=getFcvMenuItems("System",{}).find(x=>x.id==="system.language");
  assert.equal(entry.disabled,true);
  assert.match(entry.disabledReason,/SOURCE_GAP|RIGHTS_HOLD|UNAVAILABLE/);
});

test("MENU opens a navigable category, arrows move focus and ESC closes", () => {
  let s = key(boot(), "menu");
  assert.equal(s.deviceState.overlay?.kind, "menu");
  assert.equal(s.deviceState.overlay?.category, "Sounder");
  s = pad(s, "right");
  assert.equal(s.deviceState.overlay?.category, "Display");
  s = pad(s, "down");
  assert.equal(s.deviceState.overlay?.itemIndex, 1);
  s = key(s, "menu");
  assert.equal(s.deviceState.overlay, null);
});

test("menu edit stages then commits or cancels and survives power cycling", () => {
  let s = key(boot(), "menu");
  // Sounder Picture Advance first item: a staged choice, not an instant write.
  s = key(s, "enter");
  assert.equal(s.deviceState.overlay?.editing, true);
  s = pad(s, "right");
  assert.equal(s.deviceState.settings.pictureAdvance, "1x");
  s = key(s, "menu");
  assert.equal(s.deviceState.settings.pictureAdvance, "1x", "ESC must cancel draft");
  s = key(s, "enter");
  s = pad(s, "right");
  s = key(s, "enter");
  assert.notEqual(s.deviceState.settings.pictureAdvance, "1x", "ENTER commits");
  const committed = s.deviceState.settings.pictureAdvance;
  s = send(s,{kind:"down",control:"power"});
  s = send(s,{kind:"up",control:"power",durationMs:3500});
  s = send(s,{kind:"down",control:"power"});
  s = send(s,{kind:"up",control:"power",durationMs:100});
  s = send(s,{kind:"tick",steps:4});
  assert.equal(s.deviceState.settings.pictureAdvance, committed);
});

test("menu atlas evidence file separately traces five synthetic ALARM Setting profiles",()=>{
  assert.equal(atlas.schemaVersion,2,"extended atlas contract explicitly versioned");
  assert.deepEqual(atlas.alarmSettings.profileIds,
    ["ALARM1","ALARM2","ALARM3","ALARM4","ALARM5"]);
  assert.deepEqual(atlas.alarmSettings.fields,FCV_FISH_ALARM_FIELDS.map(field=>({
    ...field,sourceId:"PUB-FCV-001",
    claimDecision:"SIMULATED_ONLY_NEEDS_OPERATOR_REVIEW",
  })));
  assert.ok(atlas.alarmSettings.fields.every(field=>
    field.manualSection==="§1.18" && field.sourceStatus.includes("SIMULATED")));
});
