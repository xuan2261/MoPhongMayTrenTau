import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {displayOnlySyntheticValue,projectFcvInstructorMeta,
  describeTrainingStatus,explainFcvSourceReason} from "../web/lcd-instructor-meta.mjs";
import {projectFcvControl} from "../web/lcd-control-presentation.mjs";
import {projectFcvMainMenu} from "../web/lcd-presentation.mjs";
import {getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";

const read=name=>readFile(new URL(name,import.meta.url),"utf8");
const fake=()=>({
  power:"on",mode:"NAV2",rangeMode:"auto",rangeIndex:3,
  settings:{units:"Metric",rangePreset4:"40",speedSource:"Own",
    tempSource:"Own",tripSource:"Own",tankenmaru:"Off"},
  trainingFixture:{navigation:true,tankenmaruOption:false},
  navigation:{tripNm:1.5},
  navigationObservation:{observedAtTick:5,
    position:{source:"SYNTHETIC_FIXTURE",lat:10,lon:106},
    speedKn:5,temperatureC:22.3}
});

test("V34 presentation: source-backed [DEMO] moves to device LCD bottom-right, not the header",async()=>{
  const [html,app,css]=await Promise.all([
    read("../web/index.html"),read("../web/app.mjs"),read("../web/styles.css")]);
  assert.match(html,/id="demo-indicator" class="demo-indicator" hidden>\[DEMO\]/);
  assert.match(css,/\.demo-indicator\s*\{[^}]*right:\s*7px;\s*bottom:\s*5px;/);
  assert.match(app,/demo-indicator"\)\.hidden=state\.power!=="on" \|\| !state\.demoOn/);
  assert.doesNotMatch(app,/\(state\.demoOn \? "\[DEMO\]\s*"/,
    "operator header must no longer invent placement");
});

test("V34 presentation: instructor guidance and safety remain outside the instrument",async()=>{
  const html=await read("../web/index.html");
  const beforeFace=html.indexOf('<div class="device-frame"');
  const afterFace=html.indexOf('<aside class="training-panel"');
  const guidance=html.indexOf('id="operator-guidance"');
  const disclaimer=html.indexOf("PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY");
  assert.ok(beforeFace>0 && afterFace>beforeFace);
  assert.ok(guidance>afterFace);
  assert.ok(disclaimer<beforeFace);
  const deviceRegion=html.slice(beforeFace,afterFace);
  assert.doesNotMatch(deviceRegion,/class="mobile-training-note"/);
  assert.doesNotMatch(deviceRegion,/class="device-footer"/);
  assert.match(html.slice(0,beforeFace),/class="mobile-training-note"/,
    "phone-only non-OEM warning must precede the device in an external region");
  assert.equal((html.match(/class="mobile-training-note"/g)??[]).length,1);
  assert.match(html.slice(afterFace),/class="device-footer"/);
  assert.match(html,/id="dialog-footer" hidden>/);
  assert.ok(html.indexOf('id="operator-quick-guide"')<beforeFace,
    "mobile guidance must precede the device, but remain outside its face");
  assert.ok(html.indexOf('class="mobile-training-note"')<beforeFace);
});

test("V34 presentation: source tagged synthetic values lose only the visible teaching suffix",()=>{
  assert.equal(displayOnlySyntheticValue("SIM 12.5000°S 45.1250°W"),
    "12.5000°S 45.1250°W");
  assert.equal(displayOnlySyntheticValue("57.5 m (SIM)"),"57.5 m");
  assert.equal(displayOnlySyntheticValue("00:27 (SIM EST)"),"NO DATA",
    "unverified synthetic ETA cannot become an unlabeled OEM-looking reading");
  assert.equal(displayOnlySyntheticValue("Receiver Status · SIM"),"Receiver Status");
  assert.equal(displayOnlySyntheticValue("Language"),"Language");
  assert.equal(displayOnlySyntheticValue("NO DATA"),"NO DATA");
  assert.equal(displayOnlySyntheticValue(null),"NO DATA");
});

test("V34 presentation: normal range shows Auto without Vietnamese text; teacher copy stays available",()=>{
  const state={...fake(),overlay:{kind:"range",mode:"auto",index:3}};
  const view=projectFcvControl(state);
  assert.equal(view.currentText,"Auto");
  assert.equal(view.draftText,"Auto");
  assert.match(view.help,/MENU\/ESC hủy/,
    "teacher guidance stays accessible outside device");
});

test("V34 presentation: disabled menu options keep canonical guards, not painted [HOLD]",()=>{
  const state={...fake(),overlay:{kind:"menu",category:"System",itemIndex:3,editing:false}};
  const menu=projectFcvMainMenu(state);
  assert.ok(menu);
  const language=menu.rows.find(row=>row.id==="system.language");
  assert.ok(language.disabled);
  assert.doesNotMatch(language.text,/\[HOLD\]|\[N\/A\]/);
  assert.equal(getFcvMenuItems("System",state).find(x=>x.id==="system.language")
    .disabledReason,"RIGHTS_HOLD_LANGUAGE_ASSETS_AND_REBOOT_SOURCE_GAP");
});

test("V34 presentation: all new LCD help is routed to instructor metadata",async()=>{
  const app=await read("../web/app.mjs");
  assert.match(app,/publishInstructorGuidance\(\{\s*title:projected\.path/);
  assert.match(app,/summary\.hidden=true/);
  assert.match(app,/transaction\.hidden=true/);
  assert.match(app,/\$\("dialog-footer"\)\.hidden=true/);
  assert.doesNotMatch(app,/stored\.textContent="Đã lưu:/);
  assert.doesNotMatch(app,/current\.textContent="Hiện tại:/);
  assert.doesNotMatch(app,/ctx\.fillText\("TRAINING ONLY"/);
});

test("V34 presentation: NAV metadata reflects typed fresh, stale and disconnected states",()=>{
  const state=fake();
  let guide=projectFcvInstructorMeta(state,null,5);
  assert.match(guide.summary,/Dữ liệu giả lập còn hiệu lực/);
  assert.match(guide.source,/Không có GPS\/NMEA tàu/);
  guide=projectFcvInstructorMeta(state,{kind:"receiver-status"},16);
  assert.match(guide.summary,/Dữ liệu giả lập đã hết hạn/);
  assert.match(guide.source,/Transport: NONE/);
  state.settings={...state.settings,tankenmaru:"On"};
  guide=projectFcvInstructorMeta(state,{kind:"receiver-status"},5);
  assert.match(guide.summary,/Nguồn bị khóa khi bật Tankenmaru/);
});

test("V34 presentation: Tankenmaru details are explicit instructor-only provenance",()=>{
  const state=fake();
  state.settings={...state.settings,tankenmaru:"On"};
  state.trainingFixture={...state.trainingFixture,tankenmaruOption:true};
  const guide=projectFcvInstructorMeta(state,{kind:"tankenmaru-details"},5);
  assert.match(guide.summary,/Đã bật tùy chọn ảo/);
  assert.match(guide.source,/KHÔNG phát RF/);
  assert.match(guide.help,/chỉ đọc/);
});

test("V34 presentation: raw source failure codes do not leak to the instructor",()=>{
  assert.match(explainFcvSourceReason(
    "RIGHTS_HOLD_LANGUAGE_ASSETS_AND_REBOOT_SOURCE_GAP"),/D04: Chưa có quyền/);
  assert.doesNotMatch(explainFcvSourceReason(
    "RIGHTS_HOLD_LANGUAGE_ASSETS_AND_REBOOT_SOURCE_GAP"),/RIGHTS_HOLD/);
  assert.match(describeTrainingStatus("NO_EXTERNAL_RECEIVER"),/Không có đầu thu/);
});

test("V34 presentation: synthetic TIME TO GO is external teaching estimate, not operator ETA",()=>{
  const state=fake();
  const destination={
    id:"WP001",name:"WPT1",
    position:{source:"SYNTHETIC_FIXTURE",lat:10.1,lon:106}
  };
  state.navigation={...state.navigation,waypoints:[destination],destinationId:"WP001"};
  state.settings={...state.settings,nav2Box3:"TIME TO GO"};
  const guide=projectFcvInstructorMeta(state,null,5);
  assert.match(guide.help,/TIME TO GO ước tính lớp học:.*SIM EST/);
  assert.equal(displayOnlySyntheticValue(
    guide.help.match(/\d\d:\d\d \(SIM EST\)/)[0]),"NO DATA");
});

test("V34 presentation: early LCD-test return clears the separate DEMO painter",async()=>{
  const app=await read("../web/app.mjs");
  const demo=app.indexOf('$("demo-indicator").hidden=state.power!=="on"');
  const exit=app.indexOf("if(testPattern){",demo);
  assert.ok(demo>0 && exit>demo,
    "must hide [DEMO] before solid diagnostic pixels are painted");
  assert.match(app,/title.textContent = "POWER";\s*\/\/ Shutdown has not committed/);
  assert.match(app,/for\(const \[surface\] of quickSurfaces\)\$\(surface\)\.hidden=!active/);
});

test("V34 presentation: mobile guides bookend hardware without covering its LCD",async()=>{
  const [html,css,app]=await Promise.all([
    read("../web/index.html"),read("../web/styles.css"),read("../web/app.mjs")]);
  const face=html.indexOf('<div class="device-frame"');
  const bottom=html.indexOf('id="operator-quick-guide-bottom"');
  const trainer=html.indexOf('<aside class="training-panel"');
  assert.ok(face>0 && bottom>face && trainer>bottom);
  assert.match(html,/id="operator-quick-guide-bottom"[^>]*aria-hidden="true"/);
  assert.match(css,/\.workbench > \.operator-quick-guide:not\(\[hidden\]\)\s*\{[^}]*position: static;/);
  assert.match(app,/quickSurfaces=\[/);
  assert.match(app,/operator-quick-status-bottom/);
});

test("V34 presentation: root README/plan and protected bytes are not authored by UI branch",async()=>{
  const [app,html]=await Promise.all([
    read("../web/app.mjs"),read("../web/index.html")]);
  assert.ok(!app.includes("WebSerial") && !app.includes("navigator.serial"));
  assert.match(html,/TRAINING ONLY/);
  assert.match(app,/DISPLAY_MODES/);
});
