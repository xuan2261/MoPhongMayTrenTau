import test from "node:test";
import assert from "node:assert/strict";
import {createSession} from "../src/core/session.mjs";
import {FCV588_ADAPTER as adapter} from "../src/devices/fcv588/adapter.mjs";
import {TRAINING_SCENARIO as scenario} from "../src/core/scenario.mjs";
import {encodeFcvSettings,FCV_SETTINGS_STORAGE_KEY} from "../src/devices/fcv588/settings.mjs";
import {exportDesktopSettingsText,importDesktopSettingsText,
  DESKTOP_SETTINGS_KEY} from "../web/desktop-settings-core.mjs";

test("Windows POC manual migration roundtrip: only signed/versioned settings",()=>{
  const s=createSession(adapter,scenario);
  const raw=encodeFcvSettings(s.deviceState.settings);
  const file=exportDesktopSettingsText(raw);
  assert.equal(DESKTOP_SETTINGS_KEY,FCV_SETTINGS_STORAGE_KEY);
  assert.equal(importDesktopSettingsText(file),raw);
  assert.doesNotMatch(file,/waypoints|eventLog|worldState|authToken/i);
});
test("Windows POC rejects invalid, oversize, unrecognized and tampered imports",()=>{
  const raw=encodeFcvSettings(createSession(adapter,scenario).deviceState.settings);
  const good=JSON.parse(exportDesktopSettingsText(raw));
  for(const bad of [
    "","not-json","x".repeat(18001),"[]",
    JSON.stringify({...good,trainingOnly:false}),
    JSON.stringify({...good,extra:{role:"admin"}}),
    JSON.stringify({...good,schema:"NOT_FCV"}),
    JSON.stringify({...good,encodedSettings:raw.replace("PUBLIC_REFERENCE","HARDWARE_APPROVED")}),
    JSON.stringify({...good,settingsStorageKey:"other-localstorage-key"}),
  ]){
    assert.throws(()=>importDesktopSettingsText(bad));
  }
});
