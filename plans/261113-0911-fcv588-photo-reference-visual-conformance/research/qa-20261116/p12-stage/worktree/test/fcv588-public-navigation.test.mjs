import test from "node:test";
import assert from "node:assert/strict";
import {createNavigationState,addWaypoint,editWaypoint,deleteWaypoint,
  setDestination,projectNavData} from "../src/devices/fcv588/navigation.mjs";

const position={lat:10.5,lon:106.75,source:"SYNTHETIC_FIXTURE"};

test("MARK cannot invent a waypoint without position; synthetic positions are explicit", () => {
  const initial=createNavigationState();
  assert.throws(()=>addWaypoint(initial,{name:"WP"}),/position|synthetic|missing/i);
  const updated=addWaypoint(initial,{name:"WP",position});
  assert.equal(updated.waypoints.length,1);
  assert.equal(updated.waypoints[0].id,"WP001");
  assert.deepEqual(updated.waypoints[0].position,position);
  assert.deepEqual(initial.waypoints,[],"waypoint operations must be immutable");
});

test("waypoints support edit, destination selection, deletion and invalid target rejection", () => {
  let s=addWaypoint(createNavigationState(),{name:"A",position});
  s=addWaypoint(s,{name:"B",position:{...position,lat:11}});
  assert.equal(s.waypoints.length,2);
  s=editWaypoint(s,"WP001",{name:"A1"});
  assert.equal(s.waypoints[0].name,"A1");
  s=setDestination(s,"WP002");
  assert.equal(s.destinationId,"WP002");
  assert.throws(()=>setDestination(s,"NONEXISTENT"),/waypoint/i);
  assert.throws(()=>deleteWaypoint(s,"WP002"),/destination|protected/i);
  s=setDestination(s,null);
  s=deleteWaypoint(s,"WP002");
  assert.equal(s.destinationId,null);
  assert.equal(s.waypoints.length,1);
});

test("NAV1 and NAV2 show no-data for missing/stale observations, not real GPS", () => {
  assert.equal(projectNavData(null,"NAV1",{simTick:20}).status,"NO_DATA");
  assert.equal(projectNavData({position,observedAtTick:1},"NAV1",
    {simTick:20,staleAfterTicks:10}).status,"STALE_DATA");
  const valid=projectNavData({position,observedAtTick:19,speedKn:7},"NAV2",
    {simTick:20,staleAfterTicks:10});
  assert.equal(valid.status,"SYNTHETIC_DATA");
  assert.ok(valid.boxes.some(b=>b.label==="POSITION" && /SIM/.test(b.value)));
  assert.ok(valid.boxes.some(b=>b.label==="SPEED"));
  assert.notDeepEqual(projectNavData({position,observedAtTick:19},"NAV1",
    {simTick:20}).boxes,valid.boxes);
});

test("FCV-588 operator manual §1.20 limits the stored waypoint list to 20",()=>{
  let state=createNavigationState();
  for(let n=0;n<20;n++)state=addWaypoint(state,{name:"SIM"+n,position});
  assert.equal(state.waypoints.length,20);
  assert.throws(()=>addWaypoint(state,{name:"OVERFLOW",position}),/limit|waypoint/i);
  const afterDeletion=deleteWaypoint(state,"WP001");
  assert.equal(addWaypoint(afterDeletion,{name:"REUSE",position}).waypoints.length,20);
});

test("§1.20 waypoint names accept no more than eight operator-editable characters",()=>{
  const seed=createNavigationState();
  assert.equal(addWaypoint(seed,{name:"ABCDEFGH",position}).waypoints[0].name,"ABCDEFGH");
  assert.throws(()=>addWaypoint(seed,{name:"ABCDEFGHI",position}),/name/i);
  const stored=addWaypoint(seed,{name:"A",position});
  assert.throws(()=>editWaypoint(stored,"WP001",{name:"ABCDEFGHI"}),/name/i);
});
