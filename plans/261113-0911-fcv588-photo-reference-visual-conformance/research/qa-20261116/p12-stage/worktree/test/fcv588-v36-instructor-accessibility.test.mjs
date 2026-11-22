import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {projectFcvInstructorSourceMatrix,
  projectFcvInstructorSourceTransition} from
  "../web/fcv588-training-source-matrix.mjs";

const sample=()=>({
  power:"on",mode:"NAV2",
  settings:{speedSource:"Own",tempSource:"Own",tripSource:"Own",tankenmaru:"Off"},
  navigation:{waypoints:[],destinationId:null},
  trainingFixture:{navigation:true,tankenmaruOption:false},
  navigationObservation:{
    observedAtTick:5,position:{source:"SYNTHETIC_FIXTURE",lat:10,lon:106},
    speedKn:4.2,temperatureC:24
  }
});
const read=path=>readFile(new URL(path,import.meta.url),"utf8");

test("V36: source changes are discrete; first render is silent",()=>{
  const current=projectFcvInstructorSourceMatrix(sample(),5).rows;
  assert.equal(projectFcvInstructorSourceTransition(null,current),null);
  assert.equal(projectFcvInstructorSourceTransition([],current),null);
  assert.equal(projectFcvInstructorSourceTransition(current,current),null);
  assert.ok(current.every(row=>row.statusText && row.statusText!==row.status));
});

test("V36: world tick changes age but not announcement or stored state",()=>{
  const s=sample();
  const before=projectFcvInstructorSourceMatrix(s,5).rows;
  const after=projectFcvInstructorSourceMatrix(s,6).rows;
  assert.notEqual(before[0].details,after[0].details);
  assert.deepEqual(before.map(row=>row.status),
    after.map(row=>row.status));
  assert.equal(projectFcvInstructorSourceTransition(before,after),null);
  assert.equal(s.navigationObservation.observedAtTick,5,
    "instructor readback must never mutate the sample");
});

test("V36: revoke emits a single human-readable D14 status change",()=>{
  const s=sample();
  const before=projectFcvInstructorSourceMatrix(s,5).rows;
  s.trainingFixture.navigation=false;
  const after=projectFcvInstructorSourceMatrix(s,5).rows;
  const transition=projectFcvInstructorSourceTransition(before,after);
  assert.ok(transition);
  assert.deepEqual(transition.statuses,["D14:NO_TRAINING_DATA"]);
  assert.equal(transition.text,"D14: Chưa có dữ liệu Own hợp lệ.");
  assert.doesNotMatch(transition.text,/SYNTHETIC_|NO_TRAINING_DATA/);
  assert.equal(projectFcvInstructorSourceTransition(after,after),null);
  assert.ok(Object.isFrozen(transition.statuses));
});

test("V36: stale threshold notifies once, never on every expired tick",()=>{
  const s=sample();
  const fresh=projectFcvInstructorSourceMatrix(s,15).rows;
  const stale=projectFcvInstructorSourceMatrix(s,16).rows;
  const stillStale=projectFcvInstructorSourceMatrix(s,20).rows;
  const changed=projectFcvInstructorSourceTransition(fresh,stale);
  assert.deepEqual(changed.statuses,["D14:STALE_TRAINING_DATA"]);
  assert.match(changed.text,/đã hết hạn/);
  assert.equal(projectFcvInstructorSourceTransition(stale,stillStale),null);
});

test("V36: D09 grant/revoke and D14 exclusion combine into one announcement",()=>{
  const s=sample();
  const before=projectFcvInstructorSourceMatrix(s,5).rows;
  s.trainingFixture.tankenmaruOption=true;
  s.settings.tankenmaru="On";
  const on=projectFcvInstructorSourceMatrix(s,5).rows;
  const change=projectFcvInstructorSourceTransition(before,on);
  assert.deepEqual(change.statuses,["D09:VIRTUAL_OPTION_REFERENCE",
    "D14:INACTIVE_TANKENMARU"]);
  assert.match(change.text,/D09: Tùy chọn ảo đang bật/);
  assert.match(change.text,/D14: Nguồn ảo đang bị loại trừ/);
  s.trainingFixture.tankenmaruOption=false;
  const bad=projectFcvInstructorSourceMatrix(s,5).rows;
  assert.match(projectFcvInstructorSourceTransition(on,bad).text,
    /Cấu hình tùy chọn không nhất quán/);
});

test("V36: malformed previous rows fail closed instead of announcing",()=>{
  const current=projectFcvInstructorSourceMatrix(sample(),5).rows;
  assert.equal(projectFcvInstructorSourceTransition([{id:"C11"}],current),null);
  assert.equal(projectFcvInstructorSourceTransition(
    [{id:"C11",status:"OLD"},{id:"C11",status:"OLD"},{id:"D14",status:"OLD"}],
    current),null);
  assert.equal(projectFcvInstructorSourceTransition(current,{}),null);
});

test("V36: three named h4 articles and one off-device polite live status",async()=>{
  const html=await read("../web/index.html");
  const matrix=html.slice(html.indexOf('id="instructor-source-matrix"'),
    html.indexOf('<div class="stats">'));
  for(const id of ["c11","d09","d14"]){
    assert.match(matrix,new RegExp('aria-labelledby="source-matrix-'+id+'-title"'));
    assert.match(matrix,new RegExp('<h4 id="source-matrix-'+id+'-title">'));
    assert.match(matrix,new RegExp('id="source-matrix-'+id+'-details" class="source-matrix-details"'));
  }
  assert.match(matrix,/id="instructor-source-matrix-description"/);
  assert.match(matrix,/id="source-matrix-announcement" class="sr-only" role="status"/);
  assert.match(matrix,/aria-live="polite" aria-atomic="true"/);
  assert.equal((html.match(/id="source-matrix-announcement"/g)??[]).length,1);
  assert.ok(html.indexOf('id="instructor-source-matrix"')>
    html.indexOf('<aside class="training-panel">'));
  assert.doesNotMatch(html.slice(html.indexOf('<div class="device-frame"'),
    html.indexOf('<aside class="training-panel">')),/source-matrix-(?:announcement|c11|d09|d14)/);
  assert.match(html,/id="lcd" class="lcd" role="group"/);
  assert.doesNotMatch(html,/id="lcd"[^>]*aria-live=/);
});

test("V36: D15 typography is rem-based without editing OEM LCD CSS",async()=>{
  const css=await read("../web/styles.css");
  const d15=css.slice(css.indexOf("/* V36: only instructor D15"),
    css.indexOf(".controls { position: absolute;"));
  assert.ok(d15.length>800,"Expected explicit scoped D15 typography");
  for(const rule of [".instructor-source-matrix", ".source-matrix-item",
    ".source-matrix-state",".source-matrix-item h4",
    ".source-matrix-item .source-matrix-details"]){
    assert.ok(d15.includes(rule),rule);
  }
  assert.match(d15,/font-size: \.875rem/);
  assert.match(d15,/font-size: \.8125rem/);
  assert.match(d15,/font: 650 \.8125rem\/1\.55/);
  assert.match(d15,/overflow-wrap: anywhere/);
  assert.doesNotMatch(d15,/\.lcd\b|\.equipment\b|\.hardware-key\b/,
    "No D15 readability rule should restyle OEM-simulated hardware");
});

test("V36: app announces only semantic changes, without timers or FCV input",async()=>{
  const app=await read("../web/app.mjs");
  const block=app.slice(app.indexOf("let previousInstructorSourceRows=null;"),
    app.indexOf("let lastA11ySelectionKey=null;"));
  assert.match(block,/projectFcvInstructorSourceTransition\(/);
  assert.match(block,/previousInstructorSourceRows=projection\.rows/);
  assert.match(block,/if\(transition\)/);
  assert.match(block,/source-matrix-announcement/);
  assert.doesNotMatch(block,/setInterval|setTimeout|dispatch\(|send\(|addEventListener|focus\(/);
  assert.match(app,/publishInstructorSourceMatrix\(s,session\.worldState\.simTick\)/);
});
