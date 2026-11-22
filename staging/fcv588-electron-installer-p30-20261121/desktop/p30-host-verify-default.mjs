// Read-only app settings verification through the sealed P29 renderer on real Windows.
// Profile is the newly created P30 host QA userData; no imports or writes requested.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {_electron}=require("playwright-core");
const stage=path.resolve(import.meta.dirname,"..");
const root=path.resolve(stage,"..","..");
const qa=path.join(root,"docs","qa","FCV588_ELECTRON_P30_INSTALLER_20261121");
const seal=JSON.parse(fs.readFileSync(path.join(qa,"P30_HOST_DEFAULT_PROFILE_SEED_ATTEMPT1_20261121.json")));
const tag=process.argv[2];
if(!["before-upgrade","after-upgrade","after-uninstall","after-reinstall"].includes(tag))throw Error("invalid verification tag");
const receipt=path.join(qa,"P30_HOST_PROFILE_VERIFY_"+tag+"_20261121.json");
const exe=path.join(root,"staging","fcv588-electron-poc-20261121","dist","FCV588-Synthetic-POC-win32-x64","FCV588-Synthetic-POC.exe");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const report={schema:"P30_HOST_PROFILE_READBACK_V1",tag,status:"IN_PROGRESS",expectedSettingsSHA256:seal.settingsSHA256,releaseApproval:"HOLD"};
let instance=null;
try{
  assert.ok(!fs.existsSync(receipt),"receipt exists");
  assert.equal(seal.status,"PASS");
  assert.equal(sha(fs.readFileSync(exe)),"40d554e62de4dec79458a5e8ad73b7c2e709641b576f1ec35056cada6a887bc3");
  const env={...process.env,HTTP_PROXY:"http://127.0.0.1:1",HTTPS_PROXY:"http://127.0.0.1:1"};
  delete env.FCV588_POC_PROFILE_DIR;
  instance=await _electron.launch({executablePath:exe,env,timeout:30000});
  const page=await instance.firstWindow();
  await page.locator("#desktop-export-settings").waitFor();
  const actual=await page.evaluate(key=>localStorage.getItem(key),seal.storageKey);
  assert.equal(typeof actual,"string");
  assert.equal(sha(actual),seal.settingsSHA256);
  assert.equal(page.url(),"app://fcv588/");
  assert.equal(path.resolve(await instance.evaluate(({app})=>app.getPath("userData"))).toLowerCase(),path.resolve(seal.profile).toLowerCase());
  assert.equal(await page.locator("#off-screen").isVisible(),true);
  report.actualSettingsSHA256=sha(actual);
  report.origin=page.url();
  report.profile=seal.profile;
  report.powerOffOnRestart=true;
  report.status="PASS";
}catch(e){report.status="FAILED";report.error=String(e.stack||e);}
finally{
  if(instance){try{await instance.close()}catch(e){report.cleanupError=String(e);report.status="FAILED"}}
  fs.writeFileSync(receipt,JSON.stringify(report,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify({status:report.status,tag,receiptSHA256:sha(fs.readFileSync(receipt)),error:report.error}));
}
if(report.status!=="PASS")process.exitCode=3;
