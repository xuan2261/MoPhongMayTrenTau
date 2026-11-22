import test from "node:test";
import assert from "node:assert/strict";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario,observeSounder} from "../src/core/scenario.mjs";
import {createSession,dispatch,reset,replay,createReplayEnvelope,sessionHash} from "../src/core/session.mjs";
import {getFcvMenuItems,getInstallationMenu,FCV_FISH_ALARM_FIELDS} from "../src/devices/fcv588/menu-atlas.mjs";
import {encodeFcvSettings,decodeFcvSettings} from "../src/devices/fcv588/settings.mjs";

const send=(s,e)=>dispatch(s,adapter,e,scenario);
const key=(s,control)=>send(s,{kind:"press",control});
const pad=(s,direction)=>send(s,{kind:"pad",control:"trackpad",direction});
const fixture=(s,enabled,name="tankenmaruOption")=>send(s,{kind:"training-fixture",fixture:name,enabled});
function boot(settings){
  let s=createSession(adapter,scenario);
  if(settings)s=send(s,{kind:"restore-settings",settings:{...s.deviceState.settings,...settings}});
  for(const e of [{kind:"down",control:"power"},{kind:"up",control:"power",durationMs:100},
    {kind:"tick",steps:4}])s=send(s,e);
  return s;
}
function entry(s,id){
  for(let i=0;s.deviceState.overlay&&i<6;i++)s=key(s,"menu");
  assert.equal(s.deviceState.overlay,null);
  s=key(s,"menu");
  for(let i=0;s.deviceState.overlay.category.toLowerCase()!==id.split(".")[0]&&i<5;i++)s=pad(s,"right");
  const rows=getFcvMenuItems(s.deviceState.overlay.category,s.deviceState);
  const index=rows.findIndex(row=>row.id===id);
  assert.ok(index>=0,id);
  for(let i=0;i<index;i++)s=pad(s,"down");
  return s;
}
function option(s,route){
  s=entry(s,route==="menu"?"system.tankenmaru":"system.installation");
  if(route==="installation"){
    s=key(s,"enter");
    const index=getInstallationMenu(s.deviceState).findIndex(row=>row.settingKey==="tankenmaru");
    for(let i=0;i<index;i++)s=pad(s,"down");
  }
  return s;
}
const activeOverlay=s=>s.deviceState.overlay?.kind==="power-hold"
  ?s.deviceState.overlay.priorOverlay:s.deviceState.overlay;
function unchangedWorldAndReplay(s,world,raw){
  assert.deepEqual(s.worldState,world);
  assert.deepEqual(observeSounder(scenario,s.worldState),raw);
  assert.equal(sessionHash(replay(adapter,scenario,createReplayEnvelope(s))),sessionHash(s));
}

for(const route of ["menu","installation"]){
  for(const wrapped of [false,true])test(`V30-B ${route}: revoke cancels ${wrapped?"POWER-wrapped":"visible"} draft and regrant cannot revive it`,()=>{
    let s=option(fixture(boot(),true),route);
    s=pad(key(s,"enter"),"right");
    assert.equal(s.deviceState.overlay.draftValue,"On");
    const world=structuredClone(s.worldState),raw=observeSounder(scenario,s.worldState);
    const before=encodeFcvSettings(s.deviceState.settings);
    if(wrapped)s=send(s,{kind:"down",control:"power"});
    s=fixture(s,false);
    assert.equal(activeOverlay(s).editing,false,"revocation must cancel canonical editing immediately");
    assert.equal(activeOverlay(s).draftValue,null,"hidden draft must not survive revocation");
    assert.equal(encodeFcvSettings(s.deviceState.settings),before,"uncommitted On was never stored");
    if(wrapped){
      assert.equal(s.deviceState.overlay.kind,"power-hold");
      s=send(s,{kind:"cancel",control:"power"});
      assert.deepEqual(s.heldControls,{});
    }
    s=fixture(s,true);
    assert.equal(s.deviceState.overlay.editing,false);
    assert.equal(s.deviceState.overlay.draftValue,null);
    s=key(s,"enter");
    assert.equal(s.deviceState.settings.tankenmaru,"Off","ENTER starts a fresh edit, not a stale commit");
    assert.equal(s.deviceState.overlay.draftValue,"Off");
    s=pad(s,"right");s=key(s,"menu");
    assert.equal(s.deviceState.settings.tankenmaru,"Off","MENU cancels the new edit");
    s=pad(key(s,"enter"),"right");s=key(s,"enter");
    assert.equal(s.deviceState.settings.tankenmaru,"On","an explicit new transaction may commit");
    assert.equal(s.deviceState.settings.nmea,"Off");
    assert.ok(!getFcvMenuItems("System",s.deviceState).some(e=>["system.nmea","system.receiverStatus"].includes(e.id)));
    assert.ok(!getInstallationMenu(s.deviceState).some(e=>e.settingKey==="nmea"));
    unchangedWorldAndReplay(s,world,raw);
  });

  test(`V30-B ${route}: revoke committed On cancels an Off draft, retains other settings and restores NMEA rows`,()=>{
    let s=option(fixture(boot({clutter:"67",whiteLine:"On"}),true),route);
    s=key(pad(key(s,"enter"),"right"),"enter");
    assert.equal(s.deviceState.settings.tankenmaru,"On");
    s=pad(key(s,"enter"),"right");
    assert.equal(s.deviceState.overlay.draftValue,"Off");
    const stored={...s.deviceState.settings};
    s=fixture(s,false);
    assert.equal(s.deviceState.overlay.editing,false);
    assert.equal(s.deviceState.overlay.draftValue,null);
    assert.deepEqual(s.deviceState.settings,{...stored,tankenmaru:"Off"});
    assert.ok(getFcvMenuItems("System",s.deviceState).some(e=>e.id==="system.receiverStatus"));
    assert.ok(getInstallationMenu(s.deviceState).some(e=>e.settingKey==="nmea"));
    s=fixture(s,true);
    assert.equal(s.deviceState.settings.tankenmaru,"Off");
    assert.equal(s.deviceState.overlay.editing,false);
    assert.equal(sessionHash(replay(adapter,scenario,createReplayEnvelope(s))),sessionHash(s));
  });

  test(`${route}: power-off drops the draft; teacher reset/reload never invents an option grant`,()=>{
    let s=option(fixture(boot({clutter:"67",whiteLine:"On"}),true),route);
    s=key(pad(key(s,"enter"),"right"),"enter"); // stored On
    s=pad(key(s,"enter"),"right"); // pending Off
    const encoded=encodeFcvSettings(s.deviceState.settings);
    s=send(s,{kind:"down",control:"power"});
    s=send(s,{kind:"up",control:"power",durationMs:3001});
    assert.equal(s.deviceState.power,"off");assert.equal(s.deviceState.overlay,null);
    assert.equal(encodeFcvSettings(s.deviceState.settings),encoded);
    s=send(send(s,{kind:"down",control:"power"}),{kind:"up",control:"power",durationMs:100});
    s=send(s,{kind:"tick",steps:4});
    assert.equal(s.deviceState.settings.tankenmaru,"On","same-session power cycle retains its declared virtual option");
    assert.equal(s.deviceState.overlay,null);
    s=send(reset(adapter,scenario),{kind:"restore-settings",settings:decodeFcvSettings(encoded)});
    assert.equal(s.deviceState.power,"off");assert.equal(s.deviceState.overlay,null);
    assert.equal(s.deviceState.trainingFixture.tankenmaruOption,false);
    assert.equal(s.deviceState.settings.tankenmaru,"Off","new session must not infer option presence from a preference");
    assert.equal(s.deviceState.settings.clutter,"67");assert.equal(s.deviceState.settings.whiteLine,"On");
    assert.equal(sessionHash(replay(adapter,scenario,createReplayEnvelope(s))),sessionHash(s));
  });
}

test("unrelated Units/Calibration draft is preserved by a Tankenmaru option change",()=>{
  for(const id of ["system.units","system.calibration"]){
    let s=key(entry(boot(),id),"enter");s=pad(key(s,"enter"),"right");
    const draft=structuredClone(s.deviceState.overlay);
    s=fixture(fixture(s,true),false);
    assert.deepEqual(s.deviceState.overlay,draft,"do not blanket-clear unrelated transactions");
  }
});

for(const id of ["display.accuFish","display.rezBoost","display.bottomDiscrimination"]){
  test(`P1 live capability loss cancels ${id} draft even without a row-list change`,()=>{
    let s=fixture(boot({transducer:"525STID-PWD",draft:"5"}),true,"virtualMounting");
    s=entry(s,id);
    assert.equal(getFcvMenuItems("Display",s.deviceState).find(e=>e.id===id).disabled,false);
    s=pad(key(s,"enter"),"right");
    const before={...s.deviceState.settings};
    const selected=s.deviceState.overlay.itemIndex;
    s=fixture(s,false,"virtualMounting");
    assert.equal(s.deviceState.overlay.editing,false,"N/A row must not retain a hidden transaction");
    assert.equal(s.deviceState.overlay.draftValue,null);
    assert.equal(s.deviceState.overlay.editEntryId,null);
    assert.equal(s.deviceState.overlay.itemIndex,selected);
    s=fixture(s,true,"virtualMounting");
    assert.equal(s.deviceState.overlay.editing,false);
    assert.deepEqual(s.deviceState.settings,before);
    assert.equal(sessionHash(replay(adapter,scenario,createReplayEnvelope(s))),sessionHash(s));
  });
}

test("live BDS capability loss reconciles a draft suspended by POWER without altering its countdown",()=>{
  let s=fixture(boot({transducer:"525STID-PWD",draft:"5"}),true,"virtualMounting");
  s=pad(key(entry(s,"display.bottomDiscrimination"),"enter"),"right");
  s=send(s,{kind:"down",control:"power"});
  s=send(s,{kind:"ui-tick",elapsedMs:1200});
  const world=structuredClone(s.worldState),raw=observeSounder(scenario,s.worldState);
  s=fixture(s,false,"virtualMounting");
  assert.equal(s.deviceState.overlay.kind,"power-hold");
  assert.equal(s.deviceState.overlay.remainingMs,1800);
  assert.equal(s.deviceState.overlay.priorOverlay.editing,false);
  assert.equal(s.deviceState.overlay.priorOverlay.draftValue,null);
  s=fixture(s,true,"virtualMounting");
  s=send(s,{kind:"cancel",control:"power"});
  assert.equal(s.deviceState.overlay.kind,"menu");
  assert.equal(s.deviceState.overlay.editing,false);
  assert.equal(s.deviceState.settings.bottomDiscrimination,"Off");
  unchangedWorldAndReplay(s,world,raw);
});

for(let n=1;n<=5;n++)test(`V30-E ALARM${n} enable and threshold notices identify the actual edited field`,()=>{
  let s=key(entry(boot(),"alarm.alarm"+n),"enter");
  s=pad(s,"down");
  const originalThreshold=s.deviceState.settings[`alarm${n}BottomFrom`];
  s=key(pad(key(s,"enter"),"right"),"enter");
  assert.equal(s.deviceState.notice,`ALARM${n} / Alarm = On`);
  assert.equal(s.deviceState.settings[`alarm${n}BottomFrom`],originalThreshold);
  s=key(pad(key(s,"enter"),"right"),"enter");
  assert.equal(s.deviceState.notice,`ALARM${n} / Alarm = Off`);
  s=key(pad(s,"up"),"enter");
  const i=FCV_FISH_ALARM_FIELDS.findIndex(f=>f.key==="bottomFrom");
  for(let j=0;j<i;j++)s=pad(s,"down");
  s=key(pad(key(s,"enter"),"right"),"enter");
  assert.equal(s.deviceState.notice,`ALARM${n} / Bottom From = ${Number(originalThreshold)+1}`);
  assert.equal(s.deviceState.settings["alarm"+n],"Off");
  assert.equal(sessionHash(replay(adapter,scenario,createReplayEnvelope(s))),sessionHash(s));
});
