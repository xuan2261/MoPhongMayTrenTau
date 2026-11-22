import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {FCV_MENU_ENTRIES, FCV_FUNC_TARGETS} from "../src/devices/fcv588/menu-atlas.mjs";
import {projectFcvMainMenu} from "../web/lcd-presentation.mjs";

// Scope: visible Sounder menu strings, not firmware-specific pixel geometry.
// The independently observed FCV-588 Sounder menu photograph has the strings
// "Pic. Advance" and "Interference". The official operator manual
// OME-23890-E §§1.10-1.11 describes those actions. The copyrighted photo
// is not bundled, copied or republished with this test/simulator.
const entry=id=>FCV_MENU_ENTRIES.find(item=>item.id===id);
const state={power:"on",rangeMode:"manual",settings:{
  pictureAdvance:"1x",interference:"Auto",tankenmaru:"Off"},
  overlay:{kind:"menu",category:"Sounder",itemIndex:0,editing:false}};

test("V41 FCV-588 Sounder shows Pic. Advance, retaining setting ID and value",()=>{
  const item=entry("sounder.pictureAdvance");
  assert.ok(item);
  assert.equal(item.label,"Pic. Advance");
  assert.equal(item.menuPath,"Sounder > Pic. Advance");
  assert.equal(item.settingKey,"pictureAdvance");
  assert.deepEqual(item.choices,["4x","2x","1x","1/2","1/4","1/8","1/16","Stop"]);
  const view=projectFcvMainMenu(state);
  assert.equal(view.rows[0].id,"sounder.pictureAdvance");
  assert.match(view.rows[0].text,/^▶ Pic\. Advance : 1x$/);
});

test("V41 FCV-588 Sounder shows Interference, not a classroom-expanded name",()=>{
  const item=entry("sounder.interference");
  assert.ok(item);
  assert.equal(item.label,"Interference");
  assert.equal(item.menuPath,"Sounder > Interference");
  assert.equal(item.settingKey,"interference");
  assert.deepEqual(item.choices,["Auto","High","Medium","Low","Off"]);
  const view=projectFcvMainMenu(state);
  assert.ok(view.rows.some(row=>row.id===item.id &&
    row.text.trim()==="Interference : Auto"));
  assert.ok(FCV_FUNC_TARGETS.some(x=>x.label==="Interference" &&
    x.entryId==="sounder.interference"));
});

test("V41 versioned public-reference atlas agrees with the two runtime menu labels",async()=>{
  const evidence=JSON.parse(await readFile(new URL(
    "../docs/evidence/fcv588-public-menu-atlas.json",import.meta.url),"utf8"));
  for(const id of ["sounder.pictureAdvance","sounder.interference"]){
    const src=entry(id),record=evidence.entries.find(item=>item.id===id);
    assert.ok(record,"missing reference record "+id);
    assert.equal(record.label,src.label,id);
    assert.equal(record.menuPath,src.menuPath,id);
    assert.deepEqual(record.choices,src.choices,id);
  }
});

test("V41 label scope leaves five menu roots and training metadata outside display",()=>{
  const p=projectFcvMainMenu(state);
  assert.deepEqual(p.categories.map(x=>x.label),
    ["Sounder","Display","Alarm","Data","System"]);
  assert.ok(p.help.includes("MENU/ESC"),"teacher guidance must still exist");
  assert.ok(!p.rows.some(row=>/SYNTHETIC_TRAINING|SOURCE_GAP|RIGHTS_HOLD/.test(row.text)));
});
