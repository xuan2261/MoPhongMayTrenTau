import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";
import {projectFcvSourceCue,projectFcvSelectionAnnouncement} from
  "../web/lcd-instructor-meta.mjs";

const read=file=>readFile(new URL(file,import.meta.url),"utf8");
const state=()=>({
  power:"on",mode:"LF",overlay:null,
  settings:{tankenmaru:"Off",transducer:"GENERIC_600W",
    speedSource:"Own",tempSource:"Own",tripSource:"Own",
    headerInfo:"Off",aScope:"Off"},
  trainingFixture:{navigation:true,tankenmaruOption:false},
  navigationObservation:{observedAtTick:8,
    position:{source:"SYNTHETIC_FIXTURE",lat:10,lon:107},speedKn:7},
  navigation:{tripNm:3}
});

test("V34: D04 Language source/rights disabled reason is visible before the device",()=>{
  const s=state();
  const entries=getFcvMenuItems("System",s);
  const index=entries.findIndex(item=>item.id==="system.language");
  assert.ok(index>=0);
  s.overlay={kind:"menu",category:"System",itemIndex:index,editing:false};
  const cue=projectFcvSourceCue(s,8);
  assert.equal(cue.visible,true);
  assert.equal(cue.status,"SOURCE_HOLD_DISABLED_MENU_OPTION");
  assert.match(cue.title,/Language/);
  assert.match(cue.detail,/D04: Chưa có quyền/);
  assert.doesNotMatch(cue.detail,/RIGHTS_HOLD|SOURCE_GAP/);
});

test("V34: procedural disabled item cannot expose raw state codes",()=>{
  const s=state();
  s.rangeMode="auto";
  const entries=getFcvMenuItems("Sounder",s);
  const index=entries.findIndex(item=>item.id==="sounder.shift");
  assert.ok(index>=0);
  s.overlay={kind:"menu",category:"Sounder",itemIndex:index,editing:false};
  const cue=projectFcvSourceCue(s,8);
  assert.equal(cue.status,"DISABLED_MENU_OPTION");
  assert.match(cue.detail,/điều kiện thao tác/);
  assert.doesNotMatch(cue.detail,/SHIFT_UNAVAILABLE|SOURCE_GAP/);
});

test("V34: NAV2 and NAV1 always disclose current MODE when Header Info is Off",()=>{
  const s=state();
  s.mode="NAV2";
  let cue=projectFcvSourceCue(s,8);
  assert.match(cue.title,/MODE NAV2/);
  assert.equal(cue.status,"SYNTHETIC_TRAINING_OBSERVATION");
  s.mode="NAV1";
  cue=projectFcvSourceCue(s,8);
  assert.match(cue.title,/MODE NAV1/);
  s.overlay={kind:"receiver-status"};
  cue=projectFcvSourceCue(s,8);
  assert.match(cue.title,/D14.*MODE NAV1/);
});

test("V34: unknown active MODE fails closed without synthetic sonar claim",()=>{
  const s=state();
  s.mode="ALIEN-FW";
  const cue=projectFcvSourceCue(s,8);
  assert.equal(cue.status,"INVALID_MODE");
  assert.match(cue.detail,/không diễn giải như màn hình OEM/);
  assert.doesNotMatch(cue.title,/MODE hiện tại/);
});

test("V34: accessible selection projects concise discrete row/choice text",()=>{
  const input={visible:true,layout:"main-menu",title:"System",rowText:"▶ Language",
    choiceText:"",disabled:true};
  const first=projectFcvSelectionAnnouncement(input);
  assert.equal(first.text,"System. Language. Mục không khả dụng.");
  assert.deepEqual(first,projectFcvSelectionAnnouncement({...input}));
  const moved=projectFcvSelectionAnnouncement({...input,rowText:"  Units",
    disabled:false});
  assert.notEqual(moved.key,first.key);
  assert.match(moved.text,/System\. Units\./);
  const edited=projectFcvSelectionAnnouncement({...input,
    rowText:"  Speed Source",choiceText:"▶ NMEA",disabled:false});
  assert.match(edited.text,/Speed Source\. Đang chọn NMEA/);
  assert.notEqual(edited.key,moved.key);
  assert.equal(projectFcvSelectionAnnouncement({...input,visible:false}),null);
  assert.equal(projectFcvSelectionAnnouncement({...input,rowText:""}),null);
  assert.equal(projectFcvSelectionAnnouncement({...input,layout:"unknown"}),null);
});

test("V34: a dedicated off-device live selection replaces all-LCD aria-live",async()=>{
  const [html,css,app]=await Promise.all([
    read("../web/index.html"),read("../web/styles.css"),read("../web/app.mjs")]);
  const cue=html.indexOf('id="source-cue"');
  const live=html.indexOf('id="operator-selection-status"');
  const face=html.indexOf('<div class="device-frame"');
  assert.ok(cue>0 && live>cue && face>live);
  assert.match(html,/id="operator-selection-status" class="sr-only" role="status"/);
  assert.match(html,/aria-live="polite" aria-atomic="true"/);
  assert.match(css,/\.sr-only\s*\{/);
  assert.match(html,/id="lcd" class="lcd" role="group"/);
  assert.doesNotMatch(html,/id="lcd"[^>]*aria-live/);
  assert.match(app,/lastA11ySelectionKey!==cue\.key/);
  assert.match(app,/publishOperatorSelection\(\)/);
});
