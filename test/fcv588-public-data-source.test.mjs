import test from "node:test";
import assert from "node:assert/strict";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";
import {createSession,dispatch,replay,createReplayEnvelope,sessionHash} from
  "../src/core/session.mjs";
import {FCV_NAV_BOX_OPTIONS,getFcvMenuItems} from
  "../src/devices/fcv588/menu-atlas.mjs";
import {projectFcvManualNavBoxes} from "../src/devices/fcv588/navigation.mjs";
import {projectFcvTrainingReceiver} from "../src/devices/fcv588/receiver-status.mjs";
import {encodeFcvSettings,decodeFcvSettings} from "../src/devices/fcv588/settings.mjs";

// Operator data-source choices are taught as offline-only, never NMEA I/O.
// Public operator manual OME-23890-E §1.21, Data menu.
const send=(s,event)=>dispatch(s,adapter,event,TRAINING_SCENARIO);
const press=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
function boot(){
  let s=createSession(adapter,TRAINING_SCENARIO);
  for(const event of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:120},
    {kind:"tick",steps:4},
    {kind:"training-fixture",fixture:"navigation",enabled:true}])s=send(s,event);
  return s;
}
function setDataChoice(s,id){
  if(s.deviceState.overlay?.kind!=="menu")s=press(s,"menu");
  for(let i=0;s.deviceState.overlay.category!=="Data"&&i<5;i++)s=pad(s,"right");
  const entry=getFcvMenuItems("Data",s.deviceState).findIndex(x=>x.id===id);
  assert.ok(entry>=0,`missing source-graded data setting ${id}`);
  for(let i=0;s.deviceState.overlay.itemIndex!==entry&&i<50;i++)s=pad(s,"down");
  s=press(s,"enter");
  assert.equal(s.deviceState.overlay.editing,true,id);
  s=pad(s,"right");
  s=press(s,"enter");
  return s;
}

test("Data menu declares documented bearing, wind, trip, speed and temperature source selectors",()=>{
  const items=getFcvMenuItems("Data");
  for(const [id,choices] of Object.entries({
    "data.bearing":["True","Mag"],
    "data.windSpeedDirection":["True","Apparent"],
    "data.tripSource":["Own","NMEA"],
    "data.tempSource":["Own","NMEA"],
    "data.speedSource":["Own","NMEA"],
  })){
    const entry=items.find(item=>item.id===id);
    assert.ok(entry,id);
    assert.deepEqual(entry.choices,choices,id);
    assert.match(entry.manualSection,/§1\.21/);
  }
  for(const value of ["SPEED (SOG)","RANGE","BEARING","HEADING",
    "BAROM PRESS","TIME TO GO","XTE"]){
    assert.ok(FCV_NAV_BOX_OPTIONS.includes(value),value);
  }
});

test("Trip Source changes counted world ticks: synthetic Own advances; unavailable NMEA never fabricates motion",()=>{
  let s=boot();
  s=send(s,{kind:"tick",steps:20});
  const first=s.deviceState.navigation.tripNm;
  assert.ok(first>0);
  s=setDataChoice(s,"data.tripSource");
  assert.equal(s.deviceState.settings.tripSource,"NMEA");
  s=send(s,{kind:"tick",steps:20});
  assert.equal(s.deviceState.navigation.tripNm,first,
    "a synthetic position fixture is not an NMEA receiver");
  assert.equal(s.deviceState.navigation.odometerNm,first);
  const clock=s.worldState.simTick;
  s=send(s,{kind:"ui-tick",elapsedMs:4500});
  assert.equal(s.worldState.simTick,clock);
  s=setDataChoice(s,"data.tripSource");
  assert.equal(s.deviceState.settings.tripSource,"Own");
  s=send(s,{kind:"tick",steps:20});
  assert.ok(s.deviceState.navigation.tripNm>first);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});

test("C11 Trip Source NMEA masks previously accumulated Own trip on NAV and in the operator Trip overlay",()=>{
  let s=boot();
  s=send(s,{kind:"tick",steps:20});
  const accrued=s.deviceState.navigation.tripNm;
  assert.ok(accrued>0);
  const nav=()=>projectFcvManualNavBoxes({mode:"NAV2",
    sample:s.deviceState.navigationObservation,
    navState:s.deviceState.navigation,settings:s.deviceState.settings,
    simTick:s.worldState.simTick});
  assert.match(nav().boxes[2].value,/SIM/);
  s=setDataChoice(s,"data.tripSource");
  assert.equal(s.deviceState.settings.tripSource,"NMEA");
  assert.equal(s.deviceState.navigation.tripNm,accrued,
    "changing display data source must not erase historical classroom distance");
  assert.equal(nav().boxes[2].value,"NO DATA",
    "without an external receiver NAV must not present an earlier Own trip as NMEA data");
  assert.match(nav().boxes[3].value,/SIM/,
    "odometer retains previously counted synthetic distance, not a live NMEA measurement");
  s=setDataChoice(s,"data.tripSource");
  assert.match(nav().boxes[2].value,/SIM/,
    "reselecting available Own source should restore the historical trip");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});

test("NAV projection masks NMEA speed and temperature, preserves typed synthetic Own and never makes up wind",()=>{
  let s=boot();
  s=send(s,{kind:"tick",steps:1});
  const project=()=>projectFcvManualNavBoxes({mode:"NAV1",
    sample:s.deviceState.navigationObservation,
    settings:s.deviceState.settings,simTick:s.worldState.simTick,
    navState:s.deviceState.navigation,sonarDepthM:s.worldState.bottomDepthM});
  let projected=project();
  assert.match(projected.boxes[0].value,/SIM/);
  assert.equal(projected.boxes[1].value,"NO DATA");
  s=setDataChoice(s,"data.speedSource");
  assert.equal(s.deviceState.settings.speedSource,"NMEA");
  assert.equal(project().boxes[0].value,"NO DATA");
  s=setDataChoice(s,"data.tempSource");
  assert.equal(s.deviceState.settings.tempSource,"NMEA");
  const nav2=projectFcvManualNavBoxes({mode:"NAV2",
    sample:s.deviceState.navigationObservation,settings:s.deviceState.settings,
    simTick:s.worldState.simTick,navState:s.deviceState.navigation});
  assert.equal(nav2.boxes[1].value,"NO DATA");
  s=setDataChoice(s,"data.windSpeedDirection");
  assert.equal(s.deviceState.settings.windSpeedDirection,"Apparent");
  const wind=project();
  assert.match(wind.boxes[1].label,/WIND.*APPARENT/i);
  assert.equal(wind.boxes[1].value,"NO DATA");
  assert.deepEqual(decodeFcvSettings(encodeFcvSettings(s.deviceState.settings)),
    s.deviceState.settings);
});

test("C11 rejects negative synthetic STW/SOG rather than displaying a physically impossible speed",()=>{
  const s=boot();
  const sample={observedAtTick:10,
    position:{source:"SYNTHETIC_FIXTURE",lat:10,lon:106},
    speedKn:-4,speedOverGroundKn:-2,temperatureC:20};
  const settings={...s.deviceState.settings,nav2Box1:"SPEED (SOG)"};
  const nav1=projectFcvManualNavBoxes({mode:"NAV1",sample,
    settings,simTick:10});
  const nav2=projectFcvManualNavBoxes({mode:"NAV2",sample,
    settings,simTick:10});
  assert.equal(nav1.boxes[0].value,"NO DATA");
  assert.equal(nav2.boxes[0].value,"NO DATA");
  assert.match(projectFcvManualNavBoxes({mode:"NAV1",settings,
    sample:{...sample,speedKn:0},simTick:10}).boxes[0].value,/^0/,
    "stationary zero speed remains a valid classroom observation");
});

test("C11 NAV bearing/heading/SOG/pressure/XTE demand independently tagged, bounded synthetic fields",()=>{
  const s=boot();
  const sample={observedAtTick:10,
    position:{source:"SYNTHETIC_FIXTURE",lat:10,lon:106},
    courseDeg:721,bearingDeg:361,headingDeg:-1,
    speedOverGroundKn:11,barometerHPa:1013.25,crossTrackNm:-0.5};
  const settings={...s.deviceState.settings,
    nav1Box1:"COURSE",nav1Box2:"BEARING",nav1Box3:"HEADING",
    nav1Box4:"SPEED (SOG)",nav2Box1:"BAROM PRESS",nav2Box2:"XTE"};
  const view=(mode,source)=>projectFcvManualNavBoxes({
    mode,settings,sample:source,simTick:10});
  assert.deepEqual(view("NAV1",sample).boxes.map(x=>x.value),
    ["NO DATA","NO DATA","NO DATA","NO DATA"],
    "a typed position alone does not authenticate separate bearing, heading or speed sensors");
  assert.deepEqual(view("NAV2",sample).boxes.slice(0,2).map(x=>x.value),
    ["NO DATA","NO DATA"]);
  const valid={...sample,courseDeg:90,bearingDeg:225,headingDeg:120,
    fieldSources:{bearingDeg:"SYNTHETIC_FIXTURE",headingDeg:"SYNTHETIC_FIXTURE",
      speedOverGroundKn:"SYNTHETIC_FIXTURE",barometerHPa:"SYNTHETIC_FIXTURE",
      crossTrackNm:"SYNTHETIC_FIXTURE"}};
  assert.match(view("NAV1",valid).boxes[0].value,/90°.*SIM/,
    "typed ownship course may come from the original world fixture");
  assert.match(view("NAV1",valid).boxes[1].value,/225°.*SIM/);
  assert.match(view("NAV1",valid).boxes[2].value,/120°.*SIM/);
  assert.match(view("NAV1",valid).boxes[3].value,/11\.0 kn.*SIM/);
  assert.match(view("NAV2",valid).boxes[0].value,/1013\.3 hPa.*SIM/);
  assert.match(view("NAV2",valid).boxes[1].value,/-0\.50 NM.*SIM/,
    "formatFcvDistance uses the documented display code NM for nautical miles");
  const wrongSource={...valid,fieldSources:{...valid.fieldSources,
    headingDeg:"EXTERNAL_NMEA"}};
  assert.equal(view("NAV1",wrongSource).boxes[2].value,"NO DATA");
  const impossible={...valid,headingDeg:360,bearingDeg:-2,
    speedOverGroundKn:-1,barometerHPa:-1};
  for(const field of [1,2,3])assert.equal(view("NAV1",impossible).boxes[field].value,
    "NO DATA");
  assert.equal(view("NAV2",impossible).boxes[0].value,"NO DATA");
});

test("bearing choice changes only synthetic display label; missing external heading/bearing remains NO DATA",()=>{
  let s=boot();
  s=send(s,{kind:"tick",steps:1});
  const before=s.worldState;
  s=setDataChoice(s,"data.bearing");
  assert.equal(s.deviceState.settings.bearing,"Mag");
  const settings={...s.deviceState.settings,nav1Box3:"BEARING",nav1Box4:"HEADING"};
  const nav=projectFcvManualNavBoxes({mode:"NAV1",settings,
    sample:s.deviceState.navigationObservation,simTick:s.worldState.simTick});
  assert.match(nav.boxes[2].label,/BEARING.*MAG/i);
  assert.equal(nav.boxes[2].value,"NO DATA");
  assert.equal(nav.boxes[3].value,"NO DATA");
  assert.deepEqual(s.worldState,before,"Data choice cannot alter world truth");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});

test("C11 Data source selection cannot fabricate C01 temperature/speed alarm inputs",()=>{
  const base=createSession(adapter,TRAINING_SCENARIO);
  let s=send(base,{kind:"restore-settings",settings:{
    ...base.deviceState.settings,alarm3:"On",alarm4:"On",
    alarm3Temperature:"Inside",alarm4SpeedType:"Inside",
  }});
  for(const input of [{kind:"down",control:"power"},
    {kind:"up",control:"power",durationMs:120},{kind:"tick",steps:4},
    {kind:"training-fixture",fixture:"navigation",enabled:true},
    {kind:"tick",steps:1}])s=send(s,input);
  assert.ok(s.deviceState.alarms.activeIds.includes("ALARM3"));
  assert.ok(s.deviceState.alarms.activeIds.includes("ALARM4"));
  s=setDataChoice(s,"data.tempSource");
  s=setDataChoice(s,"data.speedSource");
  s=send(s,{kind:"tick",steps:1});
  assert.ok(!s.deviceState.alarms.activeIds.includes("ALARM3"));
  assert.ok(!s.deviceState.alarms.activeIds.includes("ALARM4"));
  const receiver=projectFcvTrainingReceiver(s.deviceState,s.worldState.simTick);
  assert.equal(receiver.transport,"NONE");
  assert.equal(receiver.selectedSources.speed,"NMEA");
  assert.equal(receiver.selectedSources.temperature,"NMEA");
  assert.equal(receiver.selectedSources.speedStatus,"NO_EXTERNAL_RECEIVER");
  assert.equal(receiver.selectedSources.tempStatus,"NO_EXTERNAL_RECEIVER");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});

test("D04 installer does not allow an unverified firmware language/reboot branch",()=>{
  let s=boot();
  s=press(s,"menu");
  for(let i=0;s.deviceState.overlay.category!=="System"&&i<7;i++)s=pad(s,"right");
  const position=getFcvMenuItems("System",s.deviceState).findIndex(x=>
    x.id==="system.installation");
  assert.ok(position>=0);
  for(let i=0;s.deviceState.overlay.itemIndex!==position&&i<30;i++)s=pad(s,"down");
  s=press(s,"enter");
  assert.equal(s.deviceState.overlay.kind,"installation");
  assert.equal(s.deviceState.overlay.itemIndex,0);
  const unchanged={...s.deviceState.settings};
  s=press(s,"enter");
  assert.equal(s.deviceState.overlay.editing,false);
  assert.match(s.deviceState.notice,/LANGUAGE.*(RIGHTS_HOLD|SOURCE_GAP)/i);
  assert.deepEqual(s.deviceState.settings,unchanged,
    "unsupported language cannot forge a persisted setting");
});
