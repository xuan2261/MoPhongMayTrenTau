// Non-installer profile compatibility check. P29 -> hardened P30 native -> P29.
// Does not claim P30 renderer state or installer upgrade (not accessible to Playwright with RunAsNode OFF).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import {spawn,execFileSync} from "node:child_process";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
const require=createRequire(import.meta.url);
const {_electron}=require("playwright-core");
const stage=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const root=path.resolve(stage,"..","..");
const qa=path.join(root,"docs","qa","FCV588_ELECTRON_P30_INSTALLER_20261121");
const profile=path.join(qa,"profile-p29-p30-p29-upgrade-v1");
const receipt=path.join(qa,"P30_V2_NATIVE_P29_PROFILE_COMPAT_ATTEMPT1_20261121.json");
const p29=path.join(root,"staging","fcv588-electron-poc-20261121","dist","FCV588-Synthetic-POC-win32-x64","FCV588-Synthetic-POC.exe");
const p30=path.join(stage,"dist-p30-v2","win-unpacked","FCV588-Synthetic-POC.exe");
const hash=b=>crypto.createHash("sha256").update(b).digest("hex");
const report={schema:"FCV588_P30_PROFILE_COMPAT_V1",status:"IN_PROGRESS",profile,source:"P29",middle:"P30_NATIVE",end:"P29",steps:[],releaseApproval:"HOLD",installerExecuted:false};
let old=null,child=null;
try {
  assert.ok(!fs.existsSync(profile),"QA profile must be unused");
  assert.ok(!fs.existsSync(receipt),"receipt must not exist");
  const {createSession}=await import("../src/core/session.mjs");
  const {FCV588_ADAPTER}=await import("../src/devices/fcv588/adapter.mjs");
  const {TRAINING_SCENARIO}=await import("../src/core/scenario.mjs");
  const {encodeFcvSettings,FCV_SETTINGS_STORAGE_KEY:key}=await import("../src/devices/fcv588/settings.mjs");
  const {exportDesktopSettingsText}=await import("../web/desktop-settings-core.mjs");
  const raw=encodeFcvSettings(createSession(FCV588_ADAPTER,TRAINING_SCENARIO).deviceState.settings);
  const env={...process.env,FCV588_POC_PROFILE_DIR:profile,HTTP_PROXY:"http://127.0.0.1:1",HTTPS_PROXY:"http://127.0.0.1:1"};
  old=await _electron.launch({executablePath:p29,env,timeout:30000});
  let page=await old.firstWindow();
  await page.locator("#desktop-import-settings-file").setInputFiles({name:"FCV588-settings-training-only.json",mimeType:"application/json",buffer:Buffer.from(exportDesktopSettingsText(raw))});
  page.once("dialog",d=>d.accept());
  await page.locator("#desktop-import-settings").click();
  await page.waitForFunction(k=>localStorage.getItem(k)!==null,key);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),raw);
  const prevData=await old.evaluate(({app})=>app.getPath("userData"));
  assert.equal(path.resolve(prevData).toLowerCase(),path.resolve(profile).toLowerCase());
  report.steps.push("P29_SEEDED_EXACT_SETTINGS");
  await old.close();old=null;
  child=spawn(p30,[],{env,windowsHide:true,stdio:"ignore"});
  await new Promise((resolve,reject)=>{
    let settled=false;const fail=e=>{if(!settled){settled=true;reject(e)}};
    child.once("error",fail);
    child.once("exit",(code)=>fail(new Error("P30 exited prematurely: "+code)));
    setTimeout(()=>{if(!settled){settled=true;resolve()}},4500);
  });
  assert.equal(child.exitCode,null);
  assert.ok(fs.existsSync(profile));
  report.p30NativePid=child.pid;
  report.steps.push("P30_NATIVE_PROCESS_ALIVE_SAME_QA_PROFILE");
  execFileSync("taskkill",["/PID",String(child.pid),"/T","/F"],{windowsHide:true,stdio:"ignore"});
  child=null;
  old=await _electron.launch({executablePath:p29,env,timeout:30000});
  page=await old.firstWindow();
  await page.locator("#desktop-export-settings").waitFor();
  assert.equal(page.url(),"app://fcv588/");
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),raw);
  assert.equal(await page.locator("#off-screen").isVisible(),true);
  report.steps.push("P29_REOPEN_EXACT_SETTINGS_AFTER_P30");
  report.settingsSHA256=hash(raw);
  report.status="PASS";
}catch(e){report.status="FAILED";report.error=String(e.stack||e);}
finally{
  if(old){try{await old.close()}catch(e){report.cleanupError=String(e);report.status="FAILED"}}
  if(child){try{execFileSync("taskkill",["/PID",String(child.pid),"/T","/F"],{windowsHide:true,stdio:"ignore"})}catch(e){report.cleanupError=String(e);report.status="FAILED"}}
  fs.writeFileSync(receipt,JSON.stringify(report,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify({status:report.status,steps:report.steps,error:report.error,receipt,receiptSHA256:hash(fs.readFileSync(receipt))}));
}
if(report.status!=="PASS")process.exitCode=3;
