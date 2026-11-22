// Host QA only. Initializes the previously non-existent default training profile
// through the immutable P29 Electron UI. Does not read another browser profile.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {_electron}=require("playwright-core");
const root=path.resolve(import.meta.dirname,"..","..","..");
const qa=path.join(root,"docs","qa","FCV588_ELECTRON_P30_INSTALLER_20261121");
const exe=path.join(root,"staging","fcv588-electron-poc-20261121","dist","FCV588-Synthetic-POC-win32-x64","FCV588-Synthetic-POC.exe");
const expected="40d554e62de4dec79458a5e8ad73b7c2e709641b576f1ec35056cada6a887bc3";
const profile=path.join(process.env.APPDATA||path.join(os.homedir(),"AppData","Roaming"),"FCV588-Synthetic-POC-UNRELEASED");
const receipt=path.join(qa,"P30_HOST_DEFAULT_PROFILE_SEED_ATTEMPT1_20261121.json");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const report={schema:"P30_HOST_DEFAULT_PROFILE_SEED_V1",status:"IN_PROGRESS",profile,source:"P29_SEALED",releaseApproval:"HOLD"};
let electron=null;
try{
  assert.ok(!fs.existsSync(receipt),"receipt exists");
  assert.ok(!fs.existsSync(profile),"default userData already exists; do not overwrite user data");
  assert.equal(sha(fs.readFileSync(exe)),expected,"P29 exe drift");
  const {createSession}=await import("../src/core/session.mjs");
  const {FCV588_ADAPTER}=await import("../src/devices/fcv588/adapter.mjs");
  const {TRAINING_SCENARIO}=await import("../src/core/scenario.mjs");
  const {encodeFcvSettings,FCV_SETTINGS_STORAGE_KEY:key}=await import("../src/devices/fcv588/settings.mjs");
  const {exportDesktopSettingsText}=await import("../web/desktop-settings-core.mjs");
  const raw=encodeFcvSettings(createSession(FCV588_ADAPTER,TRAINING_SCENARIO).deviceState.settings);
  const env={...process.env,HTTP_PROXY:"http://127.0.0.1:1",HTTPS_PROXY:"http://127.0.0.1:1"};
  delete env.FCV588_POC_PROFILE_DIR;
  electron=await _electron.launch({executablePath:exe,env,timeout:30000});
  const page=await electron.firstWindow();
  assert.equal(page.url(),"app://fcv588/");
  await page.locator("#desktop-import-settings-file").setInputFiles({name:"FCV588-settings-training-only.json",mimeType:"application/json",buffer:Buffer.from(exportDesktopSettingsText(raw))});
  page.once("dialog",dialog=>dialog.accept());
  await page.locator("#desktop-import-settings").click();
  await page.waitForFunction(k=>localStorage.getItem(k)!==null,key);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),raw);
  assert.equal(path.resolve(await electron.evaluate(({app})=>app.getPath("userData"))).toLowerCase(),path.resolve(profile).toLowerCase());
  assert.ok(await page.locator("#off-screen").isVisible());
  report.settingsSHA256=sha(raw);
  report.settingsLength=raw.length;
  report.storageKey=key;
  report.origin=page.url();
  report.status="PASS";
}catch(e){report.status="FAILED";report.error=String(e.stack||e);}
finally{
  if(electron){try{await electron.close()}catch(e){report.cleanupError=String(e);report.status="FAILED"}}
  fs.writeFileSync(receipt,JSON.stringify(report,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify({status:report.status,settingsSHA256:report.settingsSHA256,receiptSHA256:sha(fs.readFileSync(receipt)),error:report.error}));
}
if(report.status!=="PASS")process.exitCode=3;
