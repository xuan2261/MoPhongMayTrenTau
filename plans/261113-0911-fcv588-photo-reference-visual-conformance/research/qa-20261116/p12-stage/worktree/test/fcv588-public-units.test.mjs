import test from "node:test";
import assert from "node:assert/strict";
import * as Unit from "../src/devices/fcv588/units.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";
import {createSession,dispatch,replay,sessionHash,createReplayEnvelope} from
  "../src/core/session.mjs";
import {getFcvMenuItems} from "../src/devices/fcv588/menu-atlas.mjs";

const send=(s,event)=>dispatch(s,adapter,event,TRAINING_SCENARIO);
const key=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
function boot(){let s=createSession(adapter,TRAINING_SCENARIO);for(const input of [
  {kind:"down",control:"power"},{kind:"up",control:"power",durationMs:100},
  {kind:"tick",steps:4}])s=send(s,input);return s;}
function openUnits(s){
  if(s.deviceState.overlay?.kind!=="menu")s=key(s,"menu");
  for(let i=0;s.deviceState.overlay?.category!=="System"&&i<6;i++)s=pad(s,"right");
  const i=getFcvMenuItems("System",s.deviceState).findIndex(x=>x.id==="system.units");
  assert.ok(i>=0);
  for(let n=0;s.deviceState.overlay.itemIndex!==i&&n<25;n++)s=pad(s,"down");
  return key(s,"enter");
}

test("OME-23890-E §2.5 has six distinct unit categories, not one global unit switch",()=>{
  const fields=Unit.FCV_UNIT_FIELDS??[];
  assert.deepEqual(fields.map(x=>x.key),
    ["units","tempUnit","fishSizeUnit","speedUnit","windUnit","distanceUnit"]);
  assert.ok(fields.every(x=>x.manualSection==="§2.5"));
  assert.equal(getFcvMenuItems("System",boot().deviceState)
    .find(x=>x.id==="system.units").kind,"action");
  assert.equal(openUnits(boot()).deviceState.overlay.kind,"units");
});

test("independent unit choices format synthetic temperature, fish, speed, wind and trip",()=>{
  assert.equal(Unit.formatFcvTemperature?.(18,"C"),"18.0 °C");
  assert.equal(Unit.formatFcvTemperature?.(18,"F"),"64.4 °F");
  assert.equal(Unit.formatFcvFishSize?.(25.4,"inch"),"10.0 in");
  assert.equal(Unit.formatFcvSpeed?.(10,"km/h"),"18.5 km/h");
  assert.equal(Unit.formatFcvSpeed?.(10,"mph"),"11.5 mph");
  assert.equal(Unit.formatFcvWind?.(10,"m/s"),"5.1 m/s");
  assert.equal(Unit.formatFcvDistance?.(2,"km"),"3.70 km");
  assert.equal(Unit.formatFcvDistance?.(2,"SM"),"2.30 SM");
  assert.equal(Unit.formatFcvTemperature?.(null,"F"),"NO DATA");
});

test("D05 Units nested transaction stages, cancels and commits independent temperature unit",()=>{
  let s=openUnits(boot());
  assert.equal(s.deviceState.settings.units,"Metric");
  assert.equal(s.deviceState.settings.tempUnit,"C");
  s=pad(s,"down");
  s=key(s,"enter");
  s=pad(s,"right");
  assert.equal(s.deviceState.settings.tempUnit,"C");
  s=key(s,"menu");
  assert.equal(s.deviceState.settings.tempUnit,"C");
  s=key(s,"enter");s=pad(s,"right");s=key(s,"enter");
  assert.equal(s.deviceState.settings.tempUnit,"F");
  assert.equal(s.deviceState.settings.units,"Metric");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});
