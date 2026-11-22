import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {projectFcvInstructorSourceMatrix} from
  "../web/fcv588-training-source-matrix.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {createSession,dispatch,replay,createReplayEnvelope,sessionHash} from
  "../src/core/session.mjs";

const state=()=>({
  power:"on",mode:"NAV2",
  settings:{speedSource:"Own",tempSource:"Own",tripSource:"Own",
    tankenmaru:"Off"},
  navigation:{waypoints:[{
    id:"WP001",name:"MARK-1",
    position:{source:"SYNTHETIC_FIXTURE",lat:10.1,lon:106.3}
  }],destinationId:"WP001",tripNm:2},
  trainingFixture:{navigation:true,tankenmaruOption:false},
  navigationObservation:{observedAtTick:5,
    position:{source:"SYNTHETIC_FIXTURE",lat:10,lon:106},
    speedKn:4.2,temperatureC:24}
});

const rows=(s,tick=5)=>Object.fromEntries(
  projectFcvInstructorSourceMatrix(s,tick).rows.map(r=>[r.id,r]));

test("V35: three deterministic D15 rows and no physical transport claims",()=>{
  const snapshot=projectFcvInstructorSourceMatrix(state(),5);
  assert.equal(snapshot.sourceClass,"D15_INSTRUCTOR_SYNTHETIC_STATUS_ONLY");
  assert.equal(snapshot.hardwareValidated,false);
  assert.equal(snapshot.physicalTransport,"NONE");
  assert.deepEqual(snapshot.rows.map(row=>row.id),["C11","D09","D14"]);
  assert.ok(snapshot.rows.every(row=>row.statusText && !/^[A-Z_]+$/.test(row.statusText)),
    "teacher copy should not expose raw internal state enums");
  assert.ok(Object.isFrozen(snapshot.rows));
  assert.ok(snapshot.rows.every(r=>Object.isFrozen(r)));
});

test("V35 C11/D14: typed Own waypoint and fresh sample are classroom-only",()=>{
  const view=rows(state(),15);
  assert.equal(view.C11.status,"SYNTHETIC_DESTINATION_READY");
  assert.match(view.C11.summary,/WP001 · MARK-1/);
  assert.match(view.C11.details,/Tuổi mẫu Own: 10 tick/);
  assert.match(view.C11.details,/không phải ETA OEM/);
  assert.equal(view.D14.status,"SYNTHETIC_TRAINING_OBSERVATION");
  assert.match(view.D14.summary,/Mẫu Own giả lập còn hiệu lực/);
  assert.match(view.D14.details,/Transport: NONE/);
});

test("V35 C11/D14: stale, future, revoked and invalid positions never look current",()=>{
  const s=state();
  const stale=rows(s,16);
  assert.equal(stale.D14.status,"STALE_TRAINING_DATA");
  assert.equal(stale.C11.status,"DESTINATION_WAITING_SOURCE");
  assert.match(stale.D14.summary,/NO DATA/);
  const future=rows(s,4);
  assert.equal(future.D14.status,"STALE_TRAINING_DATA");
  assert.equal(future.C11.status,"DESTINATION_WAITING_SOURCE");
  assert.match(future.C11.details,/Tuổi mẫu: không xác định/);
  s.trainingFixture.navigation=false;
  const disabled=rows(s,5);
  assert.equal(disabled.D14.status,"NO_TRAINING_DATA");
  assert.equal(disabled.C11.status,"DESTINATION_WAITING_SOURCE");
  s.trainingFixture.navigation=true;
  s.navigationObservation.position.lat=99;
  assert.equal(rows(s,5).D14.status,"NO_TRAINING_DATA");
});

test("V35 C11: absent and invalid destinations cannot fabricate a route",()=>{
  const s=state();
  s.navigation.destinationId=null;
  assert.equal(rows(s).C11.status,"NO_DESTINATION");
  assert.match(rows(s).C11.summary,/Chưa chọn waypoint đích/);
  s.navigation.destinationId="WP404";
  assert.equal(rows(s).C11.status,"INVALID_DESTINATION");
  assert.match(rows(s).C11.summary,/NO DATA/);
  s.navigation.destinationId="WP001";
  s.navigation.waypoints[0].position.lon=199;
  assert.equal(rows(s).C11.status,"INVALID_DESTINATION");
});

test("V35 D14: NMEA selected with no receiver masks Own source provenance",()=>{
  const s=state();
  s.settings.speedSource="NMEA";
  s.settings.tempSource="NMEA";
  s.settings.tripSource="NMEA";
  const out=rows(s);
  assert.match(out.D14.details,/Speed: NMEA — NMEA không có đầu thu/);
  assert.match(out.D14.details,/Temp: NMEA — NMEA không có đầu thu/);
  assert.match(out.D14.details,/Trip: NMEA — NMEA không có đầu thu/);
  assert.match(out.D14.details,/NMEA vật lý: OFF; Transport: NONE/);
  assert.equal(s.settings.speedSource,"NMEA",
    "projection must not mutate the saved source selection");
});

test("V35 D09: virtual option is not installed hardware, even when declared",()=>{
  const s=state();
  let out=rows(s);
  assert.equal(out.D09.status,"NO_VIRTUAL_OPTION");
  assert.match(out.D09.summary,/không có quyền phần cứng/);
  s.trainingFixture.tankenmaruOption=true;
  out=rows(s);
  assert.equal(out.D09.status,"DECLARED_BUT_OFF");
  s.settings.tankenmaru="On";
  out=rows(s);
  assert.equal(out.D09.status,"VIRTUAL_OPTION_REFERENCE");
  assert.match(out.D09.summary,/NMEA bị loại trừ/);
  assert.match(out.D09.details,/Không phát RF/);
  assert.equal(out.D14.status,"INACTIVE_TANKENMARU");
  s.trainingFixture.tankenmaruOption=false;
  out=rows(s);
  assert.equal(out.D09.status,"MISSING_VIRTUAL_ENTITLEMENT");
  assert.doesNotMatch(out.D09.summary,/được bật trong lớp học/);
});

test("V35: power-off fails closed for NAV and receiver even with cached samples",()=>{
  const s=state();s.power="off";
  const snapshot=rows(s);
  assert.equal(snapshot.C11.status,"DEVICE_OFF");
  assert.equal(snapshot.D14.status,"DEVICE_OFF");
  assert.match(snapshot.C11.summary,/LCD chưa bật/);
  assert.doesNotMatch(snapshot.D14.summary,/còn hiệu lực/);
});

test("V35: actual deterministic teacher fixture event and replay keep readback stable",()=>{
  let s=createSession(adapter,scenario);
  for(const event of [
    {kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:100},
    {kind:"tick",steps:4},
    {kind:"training-fixture",fixture:"navigation",enabled:true},
    {kind:"tick",steps:1},
  ])s=dispatch(s,adapter,event,scenario);
  assert.equal(s.deviceState.power,"on");
  assert.equal(s.deviceState.trainingFixture.navigation,true);
  const before=projectFcvInstructorSourceMatrix(
    s.deviceState,s.worldState.simTick);
  assert.equal(before.rows[2].status,"SYNTHETIC_TRAINING_OBSERVATION");
  assert.equal(before.rows[0].status,"NO_DESTINATION");
  const envelope=createReplayEnvelope(s);
  const played=replay(adapter,scenario,envelope);
  assert.equal(sessionHash(played),sessionHash(s));
  assert.deepEqual(projectFcvInstructorSourceMatrix(
    played.deviceState,played.worldState.simTick),before);
});

test("V35: matrix owns no device I/O and stays entirely outside the face",async()=>{
  const [moduleSource,app,html,css]=await Promise.all([
    readFile(new URL("../web/fcv588-training-source-matrix.mjs",import.meta.url),"utf8"),
    readFile(new URL("../web/app.mjs",import.meta.url),"utf8"),
    readFile(new URL("../web/index.html",import.meta.url),"utf8"),
    readFile(new URL("../web/styles.css",import.meta.url),"utf8")
  ]);
  for(const src of [moduleSource,app]){
    assert.doesNotMatch(src,/navigator\.serial|navigator\.usb|requestPort\(|requestDevice\(/);
  }
  assert.doesNotMatch(moduleSource,/\b(?:fetch|WebSocket|EventSource)\s*\(/);
  assert.match(app,/projectFcvInstructorSourceMatrix\(state,simTick\)/);
  assert.match(app,/state:entry\.statusText/,
    "operator/instructor boundary must present human wording instead of raw enums");
  assert.match(app,/publishInstructorSourceMatrix\(s,session\.worldState\.simTick\)/);
  const face=html.indexOf('<div class="device-frame"');
  const instructor=html.indexOf('<aside class="training-panel"');
  const matrix=html.indexOf('id="instructor-source-matrix"');
  assert.ok(face>0 && instructor>face && matrix>instructor);
  assert.equal((html.match(/id="instructor-source-matrix"/g)??[]).length,1);
  for(const id of ["c11","d09","d14"]){
    assert.match(html,new RegExp('id="source-matrix-'+id+'-summary"'));
    assert.match(html,new RegExp('id="source-matrix-'+id+'-details"'));
    assert.match(html,new RegExp('id="source-matrix-'+id+'-state"'));
  }
  assert.match(css,/\.training-panel > \.instructor-source-matrix/);
  assert.doesNotMatch(html.slice(face,instructor),/id="source-matrix-/,
    "teacher source diagnostics cannot appear inside the physical instrument");
});
