import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

// Primary source: FURUNO FCV-628/588 Operator's Manual
// OME-23890-E §1.1 Control Description, row 1:
// printed control name MENU/ESC.
// Check only the source-supported operator label, not protected artwork,
// OEM fonts, pixel coordinates or installed firmware.
const html=await readFile(new URL("../web/index.html",import.meta.url),"utf8");

test("V40 OEM §1.1 control 1 prints the complete MENU/ESC name on the actual face",()=>{
  const face=html.split('<div class="device-frame"')[1]
    ?.split('<aside class="training-panel">')[0];
  assert.ok(face,"cannot locate physical face boundary");
  const button=face.match(/<button\s+id="key-menu"[^>]*>([\s\S]*?)<\/button>/);
  assert.ok(button,"distinct physical MENU/ESC button missing");
  const visibleText=button[1].replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim();
  assert.equal(visibleText,"MENU/ESC",
    "Manual §1.1 names this physical input MENU/ESC, not MENUESC");
  assert.doesNotMatch(button[1],/<br\s*\/?\s*>/i,
    "a broken two-line label loses the OEM slash and accessible name");
});

test("V40 label-only correction preserves all nine OEM §1.1 operator controls",()=>{
  const expected=["key-menu","pad-up","pad-down","pad-left","pad-right",
    "key-enter","key-range","key-mark","key-func","gain-knob",
    "mode-knob","key-power"];
  const face=html.split('<div class="device-frame"')[1]
    ?.split('<aside class="training-panel">')[0];
  assert.ok(face);
  for(const id of expected){
    assert.match(face,new RegExp('<button[^>]*id="'+id+'"'),
      "operator control removed: "+id);
  }
  assert.match(face,/<canvas id="echo-canvas" width="480" height="640"/);
  assert.doesNotMatch(face,/INSTRUCTOR CONTROL|nguồn dữ liệu nhận|SYNTHETIC ON/i,
    "teacher-only labels must not be printed on the device");
});
