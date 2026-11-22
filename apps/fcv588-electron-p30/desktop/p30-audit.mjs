import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {getCurrentFuseWire,FuseV1Options,FuseState} from "@electron/fuses";
const require=createRequire(import.meta.url);
const asar=require("@electron/asar");
const stage=path.resolve(import.meta.dirname,"..");
const root=path.resolve(stage,"..","..");
const qa=path.join(root,"docs","qa","FCV588_ELECTRON_P30_INSTALLER_20261121");
const base=path.join(stage,"dist-p30-v2");
const exe=path.join(base,"win-unpacked","FCV588-Synthetic-POC.exe");
const archive=path.join(base,"win-unpacked","resources","app.asar");
const installer=path.join(base,"P30-FCV588-Synthetic-Training-POC-UNRELEASED-0.0.1-win-x64.exe");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const hashFile=f=>sha(fs.readFileSync(f));
const parent=[
  ["P28_FINAL","docs/qa/FCV588_P28_MODE_VISUAL_20261117/FCV588_P28_MODE_VISUAL_FINAL_INTEGRITY_20261117.json","313c323db96f706de07bd28cf3832d19cdcdb0ce7dc41baad0d726e09a27ca95"],
  ["P28_POST","docs/qa/FCV588_P28_MODE_VISUAL_20261117/FCV588_P28_MODE_VISUAL_INDEPENDENT_SHA_POSTRECEIPT_20261117.json","bb533ff8a36084c579fa33a24a18b914ae61930cf14d0634dc46e10523c24bed"],
  ["P29_FINAL","docs/qa/FCV588_ELECTRON_POC_20261121/FCV588_P29_ELECTRON_POC_FINAL_INTEGRITY_20261121.json","3af7f84251e8c838d8db188f521f9b7592eced42a3cd21090e8e878dfccf420c"],
  ["P29_POST","docs/qa/FCV588_ELECTRON_POC_20261121/FCV588_P29_ELECTRON_POC_INDEPENDENT_SHA_POSTRECEIPT_20261121.json","d63cb400bb7633ac42ee76156af8669c4b967dc8d812cb06769faff4de25e81e"]
];
const report={schema:"FCV588_P30_ASAR_FUSE_AUDIT_V1",status:"IN_PROGRESS",parents:{},fuses:{},files:[],artifacts:{},releaseApproval:"HOLD",hardwareValidated:false};
try {
  for(const [name,rel,expected] of parent){
    const actual=hashFile(path.join(root,rel));
    assert.equal(actual,expected,name+" SHA mismatch");
    report.parents[name]=actual;
  }
  const fuse=await getCurrentFuseWire(exe);
  const desired={RunAsNode:false,EnableCookieEncryption:true,EnableNodeOptionsEnvironmentVariable:false,EnableNodeCliInspectArguments:false,EnableEmbeddedAsarIntegrityValidation:true,OnlyLoadAppFromAsar:true,LoadBrowserProcessSpecificV8Snapshot:false,GrantFileProtocolExtraPrivileges:false,WasmTrapHandlers:true};
  for(const [key,val] of Object.entries(desired)){
    assert.equal(fuse[FuseV1Options[key]],val?FuseState.ENABLE:FuseState.DISABLE,key);
    report.fuses[key]=val;
  }
  assert.equal(fuse.version,"1");
  const listed=asar.listPackage(archive).filter(s=>path.posix.extname(s.replaceAll("\\","/")));
  assert.equal(listed.length,58,"58 packaged files");
  const bundled=path.join(stage,"bundle");
  for(const name of listed){
    const rel=name.replaceAll("\\","/").replace(/^\//,"");
    assert.match(rel,/^(web|src|desktop)\/|^package\.json$/);
    assert.ok(!/\.pdf$|\.jpe?g$|\/test\/|\/sources\/|\/docs\/|node_modules/i.test(rel),rel);
    let actual=asar.extractFile(archive,path.join(...rel.split("/")));
    const expected=fs.readFileSync(path.join(bundled,...rel.split("/")));
    if(rel==="package.json"){
      const x=JSON.parse(actual.toString()); const y=JSON.parse(expected.toString());
      assert.deepEqual(x,y);
    }else assert.equal(sha(actual),sha(expected),rel);
    report.files.push({path:rel,sha256:sha(actual)});
  }
  for(const [name,file] of Object.entries({exe,asar:archive,installer})){
    assert.ok(fs.statSync(file).size>1000);
    report.artifacts[name]={path:file,bytes:fs.statSync(file).size,sha256:hashFile(file)};
  }
  report.status="PASS";
}catch(err){report.status="FAILED";report.error=String(err.stack||err);}
const dst=path.join(qa,"P30_V2_ASAR_FUSES_SOURCE_AUDIT_ATTEMPT3_20261121.json");
fs.writeFileSync(dst,JSON.stringify(report,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({status:report.status,fileCount:report.files.length,artifacts:report.artifacts,receipt:dst,receiptSHA256:hashFile(dst),error:report.error}));
if(report.status!=="PASS")process.exitCode=3;
