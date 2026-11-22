import test from "node:test";
import assert from "node:assert/strict";
import {evaluateFcvAlarms,acknowledgeFcvAlarms} from "../src/devices/fcv588/alarms.mjs";

const alarm=(id,conditions,enabled=true)=>({id,enabled,conditions});
const fish={fishPresent:true,bottomType:"Rock",bottomDepthM:50,temperatureC:18};
const depth={kind:"depthRange",min:40,max:60};
const rock={kind:"bottomType",value:"Rock"};
const fishHit={kind:"fishPresent",value:true};

test("one ALARM profile AND-combines enabled conditions, never ORs them", () => {
  const settings=[alarm("ALARM1",[depth,rock,fishHit])];
  assert.deepEqual(evaluateFcvAlarms(settings,fish).activeIds,["ALARM1"]);
  assert.deepEqual(evaluateFcvAlarms(settings,{...fish,bottomType:"Sand"}).activeIds,[]);
  assert.deepEqual(evaluateFcvAlarms(settings,{...fish,bottomDepthM:100}).activeIds,[]);
  assert.deepEqual(evaluateFcvAlarms(settings,{...fish,fishPresent:false}).activeIds,[]);
});

test("separate ALARM1-5 profiles can fire simultaneously without merging conditions", () => {
  const settings=[alarm("ALARM1",[depth,rock]),alarm("ALARM2",[fishHit]),
    alarm("ALARM3",[depth],false)];
  const result=evaluateFcvAlarms(settings,fish);
  assert.deepEqual(result.activeIds,["ALARM1","ALARM2"]);
  assert.equal(result.audible,true);
});

test("acknowledging silences active causes but never clears them prematurely", () => {
  const profiles=[alarm("ALARM1",[depth])];
  const first=evaluateFcvAlarms(profiles,fish);
  const ack=acknowledgeFcvAlarms(first);
  assert.deepEqual(ack.activeIds,["ALARM1"]);
  assert.equal(ack.audible,false);
  const still=evaluateFcvAlarms(profiles,fish,ack);
  assert.deepEqual(still.activeIds,["ALARM1"]);
  assert.equal(still.audible,false);
  const cleared=evaluateFcvAlarms(profiles,{...fish,bottomDepthM:90},still);
  assert.deepEqual(cleared.activeIds,[]);
  assert.equal(cleared.audible,false);
  const retrigger=evaluateFcvAlarms(profiles,fish,cleared);
  assert.equal(retrigger.audible,true);
});

test("missing synthetic sensor data does not fabricate causes", () => {
  const profiles=[alarm("ALARM1",[depth]),alarm("ALARM2",[fishHit])];
  const state=evaluateFcvAlarms(profiles,{});
  assert.deepEqual(state.activeIds,[]);
  assert.equal(state.audible,false);
});

test("Inside/Outside profile conditions fail closed on missing values and honor boundaries",()=>{
  const inside=alarm("INSIDE",[{kind:"temperatureRange",min:15,max:21}]);
  const outside=alarm("OUTSIDE",[{kind:"temperatureRange",min:15,max:21,outside:true}]);
  assert.deepEqual(evaluateFcvAlarms([inside,outside],{temperatureC:18}).activeIds,["INSIDE"]);
  assert.deepEqual(evaluateFcvAlarms([inside,outside],{temperatureC:24}).activeIds,["OUTSIDE"]);
  assert.deepEqual(evaluateFcvAlarms([inside,outside],{temperatureC:null}).activeIds,[]);
  const speedOut=alarm("SPEED_OUT",[{kind:"speedRange",min:1,max:10,outside:true}]);
  assert.deepEqual(evaluateFcvAlarms([speedOut],{speedKn:11}).activeIds,["SPEED_OUT"]);
  assert.deepEqual(evaluateFcvAlarms([speedOut],{speedKn:7}).activeIds,[]);
  assert.deepEqual(evaluateFcvAlarms([speedOut],{speedKn:null}).activeIds,[]);
});

test("C04 invalid negative speed never triggers an Outside alarm, while valid zero does",()=>{
  const outside=alarm("ALARM4",[{kind:"speedRange",min:1,max:10,outside:true}]);
  const inside=alarm("INSIDE",[{kind:"speedRange",min:1,max:10}]);
  for(const speedKn of [-4,-0.001,NaN,Infinity,undefined]){
    assert.deepEqual(evaluateFcvAlarms([outside,inside],{speedKn}).activeIds,[],
      "out-of-domain training speed cannot activate an inside OR outside alarm");
  }
  assert.deepEqual(evaluateFcvAlarms([outside,inside],{speedKn:0}).activeIds,
    ["ALARM4"],"a genuine stationary source is a valid outside-range cause");
  assert.deepEqual(evaluateFcvAlarms([outside,inside],{speedKn:7}).activeIds,
    ["INSIDE"]);
});

test("fish alarm threshold and source category are explicit and do not infer an ACCU-FISH device",()=>{
  const high=alarm("HIGH",[{kind:"fishPresent",value:true,
    level:"High",syntheticType:"Fish School"}]);
  const accu=alarm("ACCU",[{kind:"fishPresent",value:true,
    level:"Low",syntheticType:"ACCU-FISH"}]);
  const s={fishPresent:true,fishStrength:0.85,fishCategory:"Fish School",
    accuFishAvailable:false};
  assert.deepEqual(evaluateFcvAlarms([high,accu],s).activeIds,["HIGH"]);
  assert.deepEqual(evaluateFcvAlarms([high,accu],
    {...s,fishStrength:0.2}).activeIds,[]);
  assert.deepEqual(evaluateFcvAlarms([high,accu],
    {...s,accuFishAvailable:true}).activeIds,["HIGH","ACCU"]);
  assert.deepEqual(evaluateFcvAlarms([high,accu],
    {...s,fishCategory:"Bottom Fish",accuFishAvailable:false}).activeIds,[]);
});
