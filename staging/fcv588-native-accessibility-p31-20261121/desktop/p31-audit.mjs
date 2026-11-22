import * as asar from "@electron/asar";
import {getCurrentFuseWire,FuseV1Options,FuseState} from "@electron/fuses";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";

const stage=path.resolve(import.meta.dirname,"..");
const root=path.resolve(stage,"..","..");
const parent=path.join(root,"staging","fcv588-electron-installer-p30-20261121");
const qa=path.join(root,"docs","qa","FCV588_ELECTRON_P31_NATIVE_A11Y_20261121");
const sha=f=>crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const archive=path.join(stage,"dist-p31","win-unpacked","resources","app.asar");
const old=path.join(parent,"dist-p30-v2","win-unpacked","resources","app.asar");
const exe=path.join(stage,"dist-p31","win-unpacked","FCV588-Synthetic-POC.exe");
const installer=path.join(stage,"dist-p31","P31-FCV588-Synthetic-Training-POC-UNRELEASED-0.0.3-win-x64.exe");
const receipt=path.join(qa,"P31_STAGE_FUSES_ASAR_SOURCE_AUDIT_V1_20261121.json");
const result={schema:"FCV588_P31_A11Y_STAGE_AUDIT_V1",status:"IN_PROGRESS",changedASARLeaves:[],artifacts:{},releaseApproval:"HOLD"};
try {
  const prior=asar.listPackage(old).filter(x=>path.extname(x));
  const next=asar.listPackage(archive).filter(x=>path.extname(x));
  assert.deepEqual(next,prior);assert.equal(next.length,58);
  for(const name of next){
    const relative=name.replaceAll("\\","/").replace(/^\//,"");
    assert.ok(/^(src|web|desktop)\/|^package\.json$/.test(relative),relative);
    assert.ok(!/\.jpe?g$|\.pdf$|\/sources\/|\/test\/|\/docs\/|node_modules/.test(relative),relative);
    const before=asar.extractFile(old,path.join(...relative.split("/")));
    const after=asar.extractFile(archive,path.join(...relative.split("/")));
    if(!before.equals(after))result.changedASARLeaves.push(relative);
    const owned=fs.readFileSync(path.join(stage,"bundle",...relative.split("/")));
    assert.deepEqual(after,owned,relative);
  }
  assert.deepEqual(result.changedASARLeaves,["desktop/main.cjs","package.json"]);
  assert.equal(JSON.parse(asar.extractFile(archive,"package.json")).version,"0.0.3");
  const config={RunAsNode:false,EnableCookieEncryption:true,EnableNodeOptionsEnvironmentVariable:false,EnableNodeCliInspectArguments:false,EnableEmbeddedAsarIntegrityValidation:true,OnlyLoadAppFromAsar:true,LoadBrowserProcessSpecificV8Snapshot:false,GrantFileProtocolExtraPrivileges:false,WasmTrapHandlers:true};
  const readback=await getCurrentFuseWire(exe);
  for(const [key,val] of Object.entries(config))assert.equal(readback[FuseV1Options[key]],val?FuseState.ENABLE:FuseState.DISABLE,key);
  const main=fs.readFileSync(path.join(stage,"desktop","main.cjs"),"utf8");
  assert.ok(main.includes("app.setAccessibilitySupportEnabled(true);"));
  assert.equal(sha(path.join(parent,"dist-p30-v2","win-unpacked","FCV588-Synthetic-POC.exe")),"8db6a2dbe8b6f419a9a21acc5e3fab281585257bde313b940f0a0afd6bacf6c9");
  for(const [k,v] of Object.entries({installer,executable:exe,asar:archive}))result.artifacts[k]={sha256:sha(v),bytes:fs.statSync(v).size};
  result.fuseCount=9;result.asarLeaves=next.length;result.status="PASS";
}catch(e){result.status="FAILED";result.error=String(e.stack||e)}
fs.writeFileSync(receipt,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({status:result.status,changedLeaves:result.changedASARLeaves,artifacts:result.artifacts,receiptSHA256:sha(receipt),error:result.error}));
if(result.status!=="PASS")process.exitCode=3;
