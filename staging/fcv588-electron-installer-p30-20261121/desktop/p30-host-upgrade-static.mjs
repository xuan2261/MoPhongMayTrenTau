import * as asar from "@electron/asar";
import {getCurrentFuseWire,FuseV1Options,FuseState} from "@electron/fuses";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";
const stage=path.resolve(import.meta.dirname,"..");
const qa=path.resolve(stage,"..","..","docs","qa","FCV588_ELECTRON_P30_INSTALLER_20261121");
const target=path.join(qa,"P30_HOST_UPGRADE_002_STATIC_ATTEMPT2_20261121.json");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const old=path.join(stage,"dist-p30-v2","win-unpacked","resources","app.asar");
const dir=path.join(stage,"dist-p30-host-upgrade-0.0.2");
const next=path.join(dir,"win-unpacked","resources","app.asar");
const exe=path.join(dir,"win-unpacked","FCV588-Synthetic-POC.exe");
const installer=path.join(dir,"P30-FCV588-Synthetic-Training-POC-UNRELEASED-0.0.2-win-x64.exe");
const report={schema:"P30_HOST_002_STATIC_GATE_V1",status:"IN_PROGRESS",releaseApproval:"HOLD"};
try{
  const oldFiles=asar.listPackage(old).filter(x=>path.extname(x));
  const newFiles=asar.listPackage(next).filter(x=>path.extname(x));
  assert.deepEqual(oldFiles,newFiles);
  assert.equal(newFiles.length,58);
  const changed=[];
  for(const name of oldFiles){
    const relative=name.slice(1);
    const a=asar.extractFile(old,relative),b=asar.extractFile(next,relative);
    if(!a.equals(b))changed.push(relative.replaceAll(path.sep,"/"));
  }
  assert.deepEqual(changed,["package.json"]);
  const pkg=JSON.parse(asar.extractFile(next,"package.json").toString());
  assert.equal(pkg.version,"0.0.2");
  const fuses=await getCurrentFuseWire(exe);
  for(const [name,enabled] of Object.entries({
    RunAsNode:false,EnableCookieEncryption:true,EnableNodeOptionsEnvironmentVariable:false,
    EnableNodeCliInspectArguments:false,EnableEmbeddedAsarIntegrityValidation:true,
    OnlyLoadAppFromAsar:true,LoadBrowserProcessSpecificV8Snapshot:false,
    GrantFileProtocolExtraPrivileges:false,WasmTrapHandlers:true
  }))assert.equal(fuses[FuseV1Options[name]],enabled?FuseState.ENABLE:FuseState.DISABLE,name);
  report.artifacts={installerSHA256:sha(fs.readFileSync(installer)),executableSHA256:sha(fs.readFileSync(exe)),asarSHA256:sha(fs.readFileSync(next))};
  report.filesExact=58;
  report.changedLeaves=changed;
  report.fusesPass=9;
  report.status="PASS";
}catch(e){report.status="FAILED";report.error=String(e.stack||e);}
fs.writeFileSync(target,JSON.stringify(report,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({status:report.status,artifacts:report.artifacts,receiptSHA256:sha(fs.readFileSync(target)),error:report.error}));
if(report.status!=="PASS")process.exitCode=3;
