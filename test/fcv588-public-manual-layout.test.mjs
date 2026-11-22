import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {planFcvScreenLayout} from "../src/devices/fcv588/display-layout.mjs";
import {projectFcvManualNavBoxes} from "../src/devices/fcv588/navigation.mjs";

test("manual OME-23890-E §1.4.3 puts zoom left and normal sounder right",()=>{
  const plan=planFcvScreenLayout({mode:"LF-ZOOM",settings:{windowRatio:"50"}});
  assert.equal(plan.panes.zoom.x,0);
  assert.equal(plan.panes.zoom.width,240);
  assert.equal(plan.panes.normal.x,240);
  assert.equal(plan.panes.normal.width,240);
  assert.equal(plan.sourceStatus,"CURATED_PUBLIC_MANUAL_NOT_HARDWARE_VERIFIED");
  const resized=planFcvScreenLayout({mode:"HF-ZOOM",settings:{windowRatio:"60"}});
  assert.equal(resized.panes.zoom.width,288);
  assert.equal(resized.panes.normal.x,288);
});

test("manual §1.4.2 dual shows LF left/HF right, NAV left two-thirds and sonar right third",()=>{
  const dual=planFcvScreenLayout({mode:"DUAL",settings:{windowRatio:"50"}});
  assert.deepEqual([dual.panes.lf.x,dual.panes.lf.width,
    dual.panes.hf.x,dual.panes.hf.width],[0,240,240,240]);
  const nav1=planFcvScreenLayout({mode:"NAV1"});
  const nav2=planFcvScreenLayout({mode:"NAV2"});
  for(const plan of [nav1,nav2]){
    assert.equal(plan.panes.nav.x,0);
    assert.equal(plan.panes.nav.width,320);
    assert.equal(plan.panes.sonar.x,320);
    assert.equal(plan.panes.sonar.width,160);
  }
});

test("manual NAV1 default boxes are SPEED STW and WIND; absent wind remains NO DATA",()=>{
  const nav=projectFcvManualNavBoxes({mode:"NAV1",simTick:4,
    sample:{sourceClass:"SYNTHETIC_FIXTURE",observedAtTick:4,
      speedKn:7,position:{lat:10.5,lon:106.75,source:"SYNTHETIC_FIXTURE"}},
    navState:{tripNm:0,odometerNm:0},sonarDepthM:49.6});
  assert.deepEqual(nav.boxes.map(box=>box.label),["SPEED (STW)","WIND"]);
  assert.match(nav.boxes[0].value,/7\.0.*SIM/);
  assert.equal(nav.boxes[1].value,"NO DATA");
  assert.equal(nav.trainingOnly,true);
});

test("manual NAV2 defaults DEPTH TEMP TRIP ODOMETER without false real receiver claims",()=>{
  const nav=projectFcvManualNavBoxes({mode:"NAV2",simTick:15,
    sample:{sourceClass:"SYNTHETIC_FIXTURE",observedAtTick:15,
      temperatureC:18,position:{lat:10.5,lon:106.75,source:"SYNTHETIC_FIXTURE"}},
    navState:{tripNm:0.3,odometerNm:4.6},sonarDepthM:49.6});
  assert.deepEqual(nav.boxes.map(box=>box.label),
    ["DEPTH","TEMPERATURE","TRIP","ODOMETER"]);
  assert.match(nav.boxes[0].value,/49\.6.*SIM/);
  assert.match(nav.boxes[1].value,/18\.0.*SIM/);
  assert.match(nav.boxes[2].value,/0\.300.*SIM/);
  assert.match(nav.boxes[3].value,/4\.600.*SIM/);
  const missing=projectFcvManualNavBoxes({mode:"NAV2",simTick:25,
    sample:null,navState:{tripNm:0,odometerNm:0},sonarDepthM:null});
  assert.ok(missing.boxes.every(box=>box.value==="NO DATA" || box.value.includes("SIM")));
  assert.equal(missing.boxes[0].value,"NO DATA");
  assert.equal(missing.boxes[1].value,"NO DATA");
});

test("Chrome Canvas uses manual-derived split plan, not reversed zoom or full-screen NAV",async()=>{
  const app=await readFile(new URL("../web/app.mjs",import.meta.url),"utf8");
  assert.match(app,/planFcvScreenLayout/);
  assert.match(app,/projectFcvManualNavBoxes/);
  assert.match(app,/layout\.panes\.zoom/);
  assert.match(app,/layout\.panes\.sonar/);
});
