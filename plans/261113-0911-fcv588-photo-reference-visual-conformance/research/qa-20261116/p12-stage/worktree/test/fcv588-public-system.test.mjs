import test from "node:test";
import assert from "node:assert/strict";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {getFcvMenuItems,getInstallationMenu} from "../src/devices/fcv588/menu-atlas.mjs";
import {createSession, dispatch} from "../src/core/session.mjs";
import {replay,sessionHash,createReplayEnvelope} from "../src/core/session.mjs";
import {TRAINING_SCENARIO} from "../src/core/scenario.mjs";
import {encodeFcvSettings,decodeFcvSettings} from "../src/devices/fcv588/settings.mjs";
import {projectFcvTankenmaruTrainingStatus} from
  "../src/devices/fcv588/tankenmaru-status.mjs";

const send = (s,input) => dispatch(s,adapter,input,TRAINING_SCENARIO);
const press = (s,control) => send(s,{kind:"press",control});
const pad = (s,direction) => send(s,{kind:"pad",control:"trackpad",direction});
function boot() {
  let s = createSession(adapter,TRAINING_SCENARIO);
  for(const input of [{kind:"down",control:"power"},{kind:"up",control:"power"},{kind:"tick",steps:4}]) s=send(s,input);
  return s;
}
function choose(s, category, key) {
  if(s.deviceState.overlay?.kind !== "menu") s=press(s,"menu");
  while(s.deviceState.overlay.category !== category) s=pad(s,"right");
  const desired=getFcvMenuItems(category,s.deviceState).findIndex(x=>x.settingKey===key);
  assert.ok(desired>=0, "option missing: "+category+"/"+key);
  while(s.deviceState.overlay.itemIndex!==desired) s=pad(s,"down");
  return press(s,"enter");
}

test("generic virtual 600W cannot enter ACCU-FISH or Bottom Discrimination editing", () => {
  let s=boot();
  s=choose(s,"Display","accuFish");
  assert.equal(s.deviceState.overlay.kind,"menu");
  assert.equal(s.deviceState.overlay.editing,false);
  assert.match(s.deviceState.notice,/GENERIC_TRANSDUCER_TYPE/);
  s=choose(s,"Display","bottomDiscrimination");
  assert.equal(s.deviceState.overlay.editing,false);
  assert.equal(s.deviceState.settings.bottomDiscrimination,"Off");
});

test("Tankenmaru On suppresses normal System NMEA without any ship interface", () => {
  let s=send(boot(),{kind:"training-fixture",fixture:"tankenmaruOption",enabled:true});
  s=choose(s,"System","tankenmaru");
  assert.equal(s.deviceState.overlay.editing,true);
  s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.settings.tankenmaru,"On");
  assert.ok(!getFcvMenuItems("System",s.deviceState).some(e=>e.id==="system.nmea"));
  assert.equal(s.deviceState.settings.nmea,"Off");
});

test("D09 Installation NMEA row disappears during virtual Tankenmaru On and returns on Off",()=>{
  let s=send(boot(),{kind:"training-fixture",fixture:"tankenmaruOption",enabled:true});
  s=choose(s,"System","installation");
  assert.equal(s.deviceState.overlay.kind,"installation");
  const before=getInstallationMenu(s.deviceState);
  assert.ok(before.some(item=>item.settingKey==="nmea"));
  const index=before.findIndex(item=>item.settingKey==="tankenmaru");
  for(let i=0;s.deviceState.overlay.itemIndex!==index&&i<10;i++)s=pad(s,"down");
  s=press(s,"enter");s=pad(s,"right");s=press(s,"enter");
  assert.equal(s.deviceState.settings.tankenmaru,"On");
  assert.equal(s.deviceState.settings.nmea,"Off");
  assert.equal(getInstallationMenu(s.deviceState).some(item=>
    item.settingKey==="nmea"),false,
    "Installation and System must present the same documented NMEA suppression");
  s=press(s,"enter");s=pad(s,"left");s=press(s,"enter");
  assert.equal(s.deviceState.settings.tankenmaru,"Off");
  assert.ok(getInstallationMenu(s.deviceState).some(item=>item.settingKey==="nmea"));
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});

test("FCV manual §1.1 Tankenmaru mode disables MARK even with synthetic ownship",()=>{
  let s=send(boot(),{kind:"training-fixture",fixture:"navigation",enabled:true});
  s=press(s,"mark");
  assert.equal(s.deviceState.navigation.waypoints.length,1);
  s=send(s,{kind:"training-fixture",fixture:"tankenmaruOption",enabled:true});
  s=choose(s,"System","tankenmaru");
  s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.settings.tankenmaru,"On");
  s=press(s,"mark");
  assert.equal(s.deviceState.navigation.waypoints.length,1,
    "Tankenmaru cannot register a new waypoint through hardware MARK");
  assert.match(s.deviceState.notice,/TANKENMARU|DISABLED|UNAVAILABLE/);
  s=choose(s,"System","tankenmaru");
  s=pad(s,"left");
  s=press(s,"enter");
  s=press(s,"mark");
  assert.equal(s.deviceState.navigation.waypoints.length,2);
});

test("D09 default PUBLIC_REFERENCE shows Tankenmaru source HOLD in both System and Installation, without enabling option",()=>{
  let s=boot();
  assert.equal(s.deviceState.trainingFixture.tankenmaruOption,false);
  const row=getFcvMenuItems("System",s.deviceState).find(x=>x.id==="system.tankenmaru");
  assert.equal(row.disabled,true);
  assert.match(row.disabledReason,/SOURCE_GAP|OPTION/);
  s=choose(s,"System","tankenmaru");
  assert.equal(s.deviceState.overlay.editing,false);
  assert.equal(s.deviceState.settings.tankenmaru,"Off");
  assert.match(s.deviceState.notice,/SOURCE_GAP|OPTION/);
  s=choose(s,"System","installation");
  const options=getInstallationMenu(s.deviceState);
  const position=options.findIndex(x=>x.settingKey==="tankenmaru");
  assert.ok(position>=0);
  assert.equal(options[position].disabled,true);
  for(let i=0;s.deviceState.overlay.itemIndex!==position&&i<12;i++)s=pad(s,"down");
  s=press(s,"enter");
  assert.equal(s.deviceState.overlay.editing,false);
  assert.equal(s.deviceState.settings.tankenmaru,"Off");
  assert.match(s.deviceState.notice,/SOURCE_GAP|OPTION/);
});

test("D09 declared teacher-only optional virtual fixture permits synthetic On but revocation immediately fails closed",()=>{
  let s=boot();
  s=send(s,{kind:"training-fixture",fixture:"tankenmaruOption",enabled:true});
  assert.equal(getFcvMenuItems("System",s.deviceState).find(x=>x.id==="system.tankenmaru").disabled,false);
  s=choose(s,"System","tankenmaru");
  assert.equal(s.deviceState.overlay.editing,true);
  s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.settings.tankenmaru,"On");
  assert.ok(!getFcvMenuItems("System",s.deviceState).some(x=>x.id==="system.nmea"));
  s=send(s,{kind:"training-fixture",fixture:"tankenmaruOption",enabled:false});
  assert.equal(s.deviceState.settings.tankenmaru,"Off",
    "virtual option removed during training must immediately revoke all Tankenmaru semantics");
  assert.ok(getFcvMenuItems("System",s.deviceState).some(x=>x.id==="system.nmea"));
  assert.equal(getFcvMenuItems("System",s.deviceState).find(x=>x.id==="system.tankenmaru").disabled,true);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),
    sessionHash(s),"D09 virtual option must be deterministic, not a mutable hardware flag");
});

test("D09 exposes a read-only documented-option status only after virtual option On, never real Output",()=>{
  let s=boot();
  assert.equal(projectFcvTankenmaruTrainingStatus(s.deviceState).values,null);
  const visible=state=>getFcvMenuItems("System",state)
    .find(x=>x.id==="system.tankenmaruDetails");
  assert.equal(visible(s.deviceState),undefined,
    "unknown installed option may not show partner-display controls");
  s=send(s,{kind:"training-fixture",fixture:"tankenmaruOption",enabled:true});
  assert.equal(visible(s.deviceState),undefined,
    "declaring an option for instruction is distinct from turning it On");
  s=choose(s,"System","tankenmaru");
  s=pad(s,"right");s=press(s,"enter");
  assert.equal(s.deviceState.settings.tankenmaru,"On");
  const projected=projectFcvTankenmaruTrainingStatus(s.deviceState);
  assert.equal(projected.status,"VIRTUAL_OPTION_REFERENCE");
  assert.deepEqual(projected.values,{output:"Off",pictureSync:"Yes",subClutter:"4"});
  assert.equal(projected.transport,"NONE");
  assert.equal(projected.physicalPartnerConnected,false);
  assert.equal(projected.transmissionAllowed,false);
  assert.equal(projected.editable,false);
  assert.equal(projected.hardwareValidated,false);
  const row=visible(s.deviceState);
  assert.ok(row && row.kind==="action",
    "enabled synthetic option must expose a separate observable details panel");
  assert.match(row.label,/Tankenmaru.*Details|Details.*Tankenmaru/i);
  const originalSettings=s.deviceState.settings;
  const beforeWorld=s.worldState;
  s=choose(s,"System","tankenmaruDetails");
  assert.equal(s.deviceState.overlay?.kind,"tankenmaru-details");
  assert.equal(s.deviceState.overlay?.simulated,true);
  assert.deepEqual(s.deviceState.settings,originalSettings,
    "a reference-only display must not fabricate a changed OEM output choice");
  assert.deepEqual(s.worldState,beforeWorld);
  s=press(s,"menu");
  assert.equal(s.deviceState.overlay?.kind,"menu",
    "hardware MENU/ESC must return from read-only details to System");
  assert.equal(s.deviceState.overlay?.category,"System");
  assert.ok(getFcvMenuItems("System",s.deviceState).some(
    row=>row.id==="system.keySetup"),
    "FUNC Key must be operable immediately after returning from details");
  s=choose(s,"System","tankenmaruDetails");
  assert.equal(s.deviceState.overlay?.kind,"tankenmaru-details");
  s=send(s,{kind:"training-fixture",fixture:"tankenmaruOption",enabled:false});
  assert.equal(s.deviceState.settings.tankenmaru,"Off");
  assert.equal(projectFcvTankenmaruTrainingStatus(s.deviceState).values,null);
  assert.equal(visible(s.deviceState),undefined);
  assert.equal(s.deviceState.overlay?.kind,"menu",
    "revocation must close optional details that the student can no longer use");
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,
    createReplayEnvelope(s))),sessionHash(s));
});

test("D09 revoking teacher option mid-edit prevents a delayed System or Installation commit",()=>{
  let s=send(boot(),{kind:"training-fixture",fixture:"tankenmaruOption",enabled:true});
  s=choose(s,"System","tankenmaru");
  s=pad(s,"right");
  assert.equal(s.deviceState.overlay.draftValue,"On");
  s=send(s,{kind:"training-fixture",fixture:"tankenmaruOption",enabled:false});
  s=press(s,"enter");
  assert.equal(s.deviceState.settings.tankenmaru,"Off");
  assert.equal(s.deviceState.overlay.editing,false);
  assert.match(s.deviceState.notice,/SOURCE_GAP/);
  s=send(s,{kind:"training-fixture",fixture:"tankenmaruOption",enabled:true});
  s=choose(s,"System","installation");
  const idx=getInstallationMenu(s.deviceState).findIndex(x=>x.settingKey==="tankenmaru");
  for(let i=0;s.deviceState.overlay.itemIndex!==idx&&i<10;i++)s=pad(s,"down");
  s=press(s,"enter");
  assert.equal(s.deviceState.overlay.editing,true);
  s=pad(s,"right");
  assert.equal(s.deviceState.overlay.draftValue,"On");
  s=send(s,{kind:"training-fixture",fixture:"tankenmaruOption",enabled:false});
  s=press(s,"enter");
  assert.equal(s.deviceState.settings.tankenmaru,"Off");
  assert.equal(s.deviceState.overlay.editing,false);
  assert.match(s.deviceState.notice,/SOURCE_GAP/);
  assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),
    sessionHash(s));
});

test("D09 option revoke cannot reindex a staged FUNC Key or Key Beep edit into NMEA or Receiver Status",()=>{
  for(const target of ["keySetup","keyBeep"]){
    let s=send(boot(),{kind:"training-fixture",fixture:"tankenmaruOption",enabled:true});
    s=choose(s,"System","tankenmaru");
    s=pad(s,"right");
    s=press(s,"enter");
    assert.equal(s.deviceState.settings.tankenmaru,"On");
    const oldMenu=getFcvMenuItems("System",s.deviceState);
    assert.ok(!oldMenu.some(x=>x.id==="system.nmea"));
    s=choose(s,"System",target);
    assert.equal(s.deviceState.overlay.editing,true);
    const indexBefore=s.deviceState.overlay.itemIndex;
    assert.equal(oldMenu[indexBefore].settingKey,target);
    const beforeSettings={...s.deviceState.settings};
    s=pad(s,"right");
    assert.notEqual(s.deviceState.overlay.draftValue,beforeSettings[target]);
    s=send(s,{kind:"training-fixture",fixture:"tankenmaruOption",enabled:false});
    assert.equal(s.deviceState.settings.tankenmaru,"Off");
    assert.equal(s.deviceState.overlay.editing,false,
      "dynamic menu cardinality change must cancel any pending edit");
    const nowMenu=getFcvMenuItems("System",s.deviceState);
    assert.equal(nowMenu[s.deviceState.overlay.itemIndex].settingKey,target,
      "selection must remain on the same semantic item, not its old index");
    assert.ok(nowMenu.some(x=>x.id==="system.nmea"));
    s=press(s,"enter"); // should only stage the same original choice
    assert.equal(s.deviceState.settings[target],beforeSettings[target],
      "a stale pre-revoke draft must never commit to another setting");
    assert.equal(s.deviceState.settings.nmea,"Off");
    assert.equal(Object.hasOwn(s.deviceState.settings,"receiverStatus"),false);
    assert.deepEqual(decodeFcvSettings(encodeFcvSettings(s.deviceState.settings)),
      s.deviceState.settings,"state must remain encodable after the interrupted edit");
    assert.equal(sessionHash(replay(adapter,TRAINING_SCENARIO,createReplayEnvelope(s))),
      sessionHash(s),"interrupted dynamic menu edit must replay deterministically");
  }
});

test("System Demo change is reversible and unrelated to real sensor presence", () => {
  let s=choose(boot(),"System","demo");
  s=pad(s,"left");
  s=press(s,"enter");
  assert.equal(s.deviceState.demoOn,false);
  s=choose(s,"System","demo");
  s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.demoOn,true);
  assert.equal(s.worldState.simTick,4);
});

test("Demo Off without a declared virtual sounder clears sonar-dependent synthetic alarms",()=>{
  let s=choose(boot(),"Alarm","alarm5");
  assert.equal(s.deviceState.overlay.kind,"fish-alarm",
    "ALARM1-5 now use the nested §1.18 alarm workflow");
  s=pad(s,"down"); // Alarm On/Off (separate from Setting)
  s=press(s,"enter"); // staged Alarm state
  s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.settings.alarm5,"On");
  s=press(s,"menu"); // back to main Alarm menu
  s=send(s,{kind:"tick",steps:1});
  assert.deepEqual(s.deviceState.alarms.activeIds,["ALARM5"]);
  s=choose(s,"System","demo");
  s=pad(s,"left");
  s=press(s,"enter");
  assert.equal(s.deviceState.demoOn,false);
  s=send(s,{kind:"tick",steps:1});
  assert.deepEqual(s.deviceState.alarms.activeIds,[],
    "no demo + no physical sensor must not keep generating fish/bottom alarms");
  assert.equal(s.deviceState.alarms.audible,false);
});

test("§4.10 Installation setup opens separately from ordinary System menu", () => {
  let s=choose(boot(),"System","installation");
  assert.equal(s.deviceState.overlay.kind,"installation");
  assert.equal(s.deviceState.overlay.category,"Installation");
  s=pad(s,"down"); // Type, separate from normal main categories
  s=press(s,"enter");
  assert.equal(s.deviceState.overlay.editing,true);
  s=pad(s,"right");
  s=press(s,"enter");
  assert.equal(s.deviceState.settings.transducer,"GENERIC_1KW");
  s=press(s,"menu");
  assert.equal(s.deviceState.overlay.kind,"menu");
  assert.equal(s.deviceState.overlay.category,"System");
});
