import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";
import {initialFcv588State} from "../src/devices/fcv588/model.mjs";
import {projectFcvSourceCue} from "../web/lcd-instructor-meta.mjs";
import {FCV588_PUBLIC_PROFILE_REVISION} from
  "../src/devices/fcv588/profile-version.mjs";

const read=relative=>readFile(new URL("../"+relative,import.meta.url),"utf8");
const [html,app]=await Promise.all([read("web/index.html"),read("web/app.mjs")]);
const device=html.slice(html.indexOf('<div class="device-frame"'),
  html.indexOf('<aside class="training-panel">'));
const instructor=html.slice(html.indexOf('<aside class="training-panel">'));

test("V49 live D15 announcement is separate from per-250ms guidance countdown",()=>{
  assert.match(instructor,/<section id="operator-guidance"[^>]*role="group"/,
    "a visually ticking guidance panel must not itself be an ARIA status");
  assert.doesNotMatch(instructor,/<section id="operator-guidance"[^>]*aria-live=/);
  assert.match(instructor,
    /id="operator-guidance-announcement"[^>]*class="sr-only"[^>]*role="status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
  assert.equal((html.match(/id="operator-guidance-announcement"/g)??[]).length,1);
  assert.ok(!device.includes("operator-guidance-announcement"));
  assert.ok(!device.includes("operator-guidance-current"));
  assert.ok(!device.includes("source-matrix-announcement"));
});

test("V49 D15 status announcements depend on semantic heading, never timer-countdown text",()=>{
  const block=app.slice(app.indexOf("function publishInstructorGuidance("),
    app.indexOf("function publishSourceCue("));
  assert.match(block,/operator-guidance-announcement/);
  assert.match(block,/previousGuidanceAnnouncementTitle/);
  assert.match(block,/if\(previousGuidanceAnnouncementTitle!==/);
  assert.match(block,/if\(live\.textContent!==/);
  assert.doesNotMatch(block,/live\.textContent\s*=\s*help/);
  assert.doesNotMatch(block,/live\.textContent\s*=\s*summary/);
  assert.doesNotMatch(block,/live\.textContent\s*=\s*compact/);
  assert.ok(instructor.includes('id="operator-guidance-help"'),
    "the instructor must still see the full countdown in visual text");
});

test("V49 LCD remains outside ARIA instructor statuses, with exact physical UI label",()=>{
  assert.match(device,/id="key-menu"[^>]*>MENU\/ESC<\/button>/);
  assert.match(device,/<canvas id="echo-canvas" width="480" height="640"/);
  assert.doesNotMatch(device,/id="operator-guidance"|id="source-matrix-announcement"/);
  assert.match(instructor,/id="source-matrix-announcement"[^>]*role="status"/);
});

test("V49 White Marker remains a firmware-unknown classroom enum in profile21",()=>{
  const base={...initialFcv588State(),power:"on"};
  const itemIndex=getFcvMenuItems("Sounder",base)
    .findIndex(item=>item.id==="sounder.whiteMarker");
  assert.ok(itemIndex>=0,"White Marker entry missing in active menu");
  const s={...base,
    overlay:{kind:"menu",category:"Sounder",categoryIndex:0,
      itemIndex,editing:false,draftValue:null,editEntryId:null}};
  const white=getFcvMenuItems("Sounder",s).find(x=>x.id==="sounder.whiteMarker");
  assert.equal(white?.label,"White Marker");
  assert.deepEqual(white?.choices,["Off","White","Gray"]);
  assert.equal(white?.sourceStatus,
    "TRAINING_WHITE_MARKER_PREVIEW_FIRMWARE_UNKNOWN");
  const cue=projectFcvSourceCue(s,0);
  assert.equal(cue.visible,true);
  assert.equal(cue.status,"TRAINING_WHITE_MARKER_PREVIEW_FIRMWARE_UNKNOWN");
  assert.equal(FCV588_PUBLIC_PROFILE_REVISION,"F1-public-reference-23");
});
