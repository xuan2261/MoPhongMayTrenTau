import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {projectFcvSourceCue} from "../web/lcd-instructor-meta.mjs";
import {shouldRouteFcvShortcut} from "../web/keyboard-shortcuts.mjs";
import {getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";

const text=relative=>readFile(new URL(relative,import.meta.url),"utf8");
const sample=()=>({
  observedAtTick:10,
  position:{source:"SYNTHETIC_FIXTURE",lat:10.5,lon:106.4},
  speedKn:5.7,temperatureC:24.2
});
const device=()=>({
  power:"on",mode:"NAV2",overlay:null,rangeMode:"auto",
  settings:{speedSource:"Own",tempSource:"Own",tripSource:"Own",
    tankenmaru:"Off",transducer:"GENERIC_600W",aScope:"Off"},
  navigation:{tripNm:2.1},
  trainingFixture:{navigation:true,tankenmaruOption:false},
  navigationObservation:sample()
});

test("source cue: off, booting and malformed modes cannot suggest active NAV",()=>{
  const s=device();
  s.power="off";
  assert.equal(projectFcvSourceCue(s,10).visible,false);
  s.power="booting";
  assert.equal(projectFcvSourceCue(s,10).visible,false);
  s.power="on";s.mode="LF";
  const cue=projectFcvSourceCue(s,10);
  assert.equal(cue.status,"SIMULATED_SONAR");
  assert.match(cue.title,/MODE hiện tại: LF/);
  assert.match(cue.detail,/Không kết nối đầu dò/);
});

test("C11: typed fresh Own source, stale boundary and negative-age sample",()=>{
  const s=device();
  const fresh=projectFcvSourceCue(s,20);
  assert.equal(fresh.status,"SYNTHETIC_TRAINING_OBSERVATION");
  assert.match(fresh.detail,/Own tổng hợp còn hiệu lực/);
  assert.doesNotMatch(fresh.detail,/GPS .*của tàu thật/);
  const stale=projectFcvSourceCue(s,21);
  assert.equal(stale.status,"STALE_TRAINING_DATA");
  assert.match(stale.detail,/đã hết hạn/);
  assert.equal(projectFcvSourceCue(s,9).status,"STALE_TRAINING_DATA");
});

test("C11: revoked, missing, invalid typed position fail closed",()=>{
  const s=device();
  s.trainingFixture.navigation=false;
  assert.equal(projectFcvSourceCue(s,10).status,"NO_TRAINING_DATA");
  s.trainingFixture.navigation=true;
  s.navigationObservation=null;
  assert.equal(projectFcvSourceCue(s,10).status,"NO_TRAINING_DATA");
  s.navigationObservation=sample();
  s.navigationObservation.position.lat=120;
  assert.equal(projectFcvSourceCue(s,10).status,"NO_TRAINING_DATA");
  assert.match(projectFcvSourceCue(s,10).detail,/sai kiểu/);
});

test("C11/D14: selected unavailable NMEA cannot be projected as Own",()=>{
  const s=device();
  s.settings.speedSource="NMEA";
  s.settings.tempSource="NMEA";
  let cue=projectFcvSourceCue(s,10);
  assert.match(cue.detail,/Speed, Temp/);
  assert.match(cue.detail,/không có đầu thu/);
  assert.match(cue.detail,/NO DATA/);
  s.overlay={kind:"receiver-status"};
  cue=projectFcvSourceCue(s,10);
  assert.match(cue.title,/D14/);
  assert.equal(cue.status,"SYNTHETIC_TRAINING_OBSERVATION");
});

test("D09: virtual option On and revoke change only external provenance",()=>{
  const s=device();
  s.overlay={kind:"tankenmaru-details"};
  s.trainingFixture.tankenmaruOption=true;
  s.settings.tankenmaru="On";
  let cue=projectFcvSourceCue(s,10);
  assert.equal(cue.status,"VIRTUAL_OPTION_REFERENCE");
  assert.match(cue.detail,/Không có thiết bị đối tác hoặc phát RF/);
  s.trainingFixture.tankenmaruOption=false;
  cue=projectFcvSourceCue(s,10);
  assert.equal(cue.status,"SOURCE_GAP_OPTION_NOT_ACTIVE");
  assert.match(cue.detail,/Chưa có quyền tùy chọn ảo/);
  s.overlay=null;
  cue=projectFcvSourceCue(s,10);
  assert.equal(cue.status,"INACTIVE_TANKENMARU");
});

test("source-unverified menu path: warning is external, verified rows do not inherit it",()=>{
  const s=device();
  const entries=getFcvMenuItems("Data",s);
  const idx=entries.findIndex(item=>item.id==="data.trip");
  assert.ok(idx>=0);
  s.overlay={kind:"menu",category:"Data",itemIndex:idx,editing:false};
  let cue=projectFcvSourceCue(s,10);
  assert.equal(cue.status,"SYNTHETIC_TRAINING_MENU_PATH_UNVERIFIED");
  assert.match(cue.detail,/nền tảng lớp học bổ sung/);
  s.overlay.itemIndex=entries.findIndex(item=>item.id==="data.nav1");
  cue=projectFcvSourceCue(s,10);
  assert.notEqual(cue.status,"SYNTHETIC_TRAINING_MENU_PATH_UNVERIFIED");
});

test("D11: diagnostic display has instructor-only, not hardware wording",()=>{
  const s=device();
  s.overlay={kind:"lcd-test"};
  const cue=projectFcvSourceCue(s,10);
  assert.equal(cue.status,"SYNTHETIC_LCD_TEST");
  assert.match(cue.detail,/không phải kết quả chẩn đoán/);
});

function keyEvent(key,{teacher=false,button=false,knob=false,field=false,
  repeat=false}={}){
  return {key,repeat,target:{closest(selector){
    if(selector===".training-panel")return teacher?{}:null;
    if(selector.startsWith("input, textarea"))return field?{}:null;
    if(selector==="button")return button?{}:null;
    if(selector.startsWith("#gain-knob"))return knob?{}:null;
    return null;
  }}};
}

test("keyboard focus boundary: teacher keyboard cannot steer physical controls",()=>{
  for(const key of ["ArrowDown","ArrowRight","Escape","r","g","[","]"]){
    assert.equal(shouldRouteFcvShortcut(keyEvent(key,{teacher:true,button:true})),false,key);
  }
  assert.equal(shouldRouteFcvShortcut(keyEvent("ArrowDown",{button:true})),true);
  assert.equal(shouldRouteFcvShortcut(keyEvent("r")),true);
  assert.equal(shouldRouteFcvShortcut(keyEvent("ArrowUp",{knob:true,button:true})),false);
  assert.equal(shouldRouteFcvShortcut(keyEvent("Enter",{button:true})),false);
  assert.equal(shouldRouteFcvShortcut(keyEvent("Spacebar",{button:true})),false);
  assert.equal(shouldRouteFcvShortcut(keyEvent("ArrowDown",{field:true})),false);
  assert.equal(shouldRouteFcvShortcut(keyEvent("ArrowDown",{repeat:true})),false);
});

test("external notes and accessibility: data provenance cannot become LCD artwork",async()=>{
  const [html,css,app]=await Promise.all([
    text("../web/index.html"),text("../web/styles.css"),text("../web/app.mjs")]);
  const cue=html.indexOf('id="source-cue"');
  const face=html.indexOf('<div class="device-frame"');
  assert.ok(cue>0 && cue<face);
  assert.match(html,/id="source-cue"[^>]*role="note"[^>]*hidden>/);
  assert.match(html,/id="lcd" class="lcd" role="group"/);
  assert.doesNotMatch(html,/id="lcd"[^>]*aria-live/);
  assert.match(html,/id="operator-guidance"[^>]*role="group"/,
    "D15 visual countdown must not repeat within a broad status live region");
  assert.match(html,/id="operator-guidance-announcement"[^>]*role="status" aria-live="polite" aria-atomic="true"/,
    "semantic D15 guidance transitions must retain accessible polite announcements");
  assert.match(css,/\.source-cue\[hidden\]/);
  assert.doesNotMatch(css,/\.lcd-menu-row\[data-training-path=/);
  assert.match(app,/row\.dataset\.trainingPath="unverified"/);
  assert.match(app,/publishSourceCue\(s,session\.worldState\.simTick\)/);
});
