"use strict";
/** Independent byte-for-byte packaged ASAR and parent-P28 source audit. */
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const assert=require("node:assert/strict");
const asar=require("@electron/asar");
const stage=path.resolve(__dirname,"..");
const root=path.resolve(stage,"..","..");
const qa=path.join(root,"docs","qa","FCV588_ELECTRON_POC_20261121");
const parentQa=path.join(root,"docs","qa","FCV588_P28_MODE_VISUAL_20261117");
const parent=JSON.parse(fs.readFileSync(path.join(parentQa,
  "FCV588_P28_MODE_VISUAL_FINAL_INTEGRITY_20261117.json"),"utf8"));
const e2e=JSON.parse(fs.readFileSync(path.join(qa,
  "P29_PACKAGED_E2E_V5_20261121.json"),"utf8"));
const exepath=path.join(stage,"dist","FCV588-Synthetic-POC-win32-x64",
  "FCV588-Synthetic-POC.exe");
const asarPath=path.join(stage,"dist","FCV588-Synthetic-POC-win32-x64",
  "resources","app.asar");
const bundle=path.join(stage,"bundle");
const sha=buf=>crypto.createHash("sha256").update(buf).digest("hex");
const fileSha=p=>sha(fs.readFileSync(p));
const list=(folder)=>{
 const files=[];
 const walk=(at)=>{
  for(const item of fs.readdirSync(at,{withFileTypes:true})){
   const p=path.join(at,item.name);
   if(item.isSymbolicLink())throw Error("symbolic link in package "+p);
   if(item.isDirectory())walk(p);
   else if(item.isFile())files.push(path.relative(folder,p).replaceAll("\\","/"));
   else throw Error("unrecognized package content "+p);
  }
 };
 walk(folder);return files.sort();
};
const expected=list(bundle);
const actual=asar.listPackage(asarPath).map(p=>p.replaceAll("\\","/").replace(/^\/+/, ""));
const packages=actual.filter(p=>/\.(mjs|js|cjs|css|html|svg|json)$/i.test(p)).sort();
assert.deepEqual(packages,expected,"packaged files must be EXACTLY bundle allowlist");
assert.equal(expected.length,58,"56 web/src and 2 desktop/manifest files");
for(const file of expected){
 assert.ok(file.startsWith("src/")||file.startsWith("web/")||
   ["desktop/main.cjs","package.json"].includes(file),"foreign file "+file);
 assert.ok(!/jpe?g|\.pdf|manuals|sources|node_modules|\.test\./i.test(file),
   "forbidden/QA-only file in ASAR "+file);
 const packaged=asar.extractFile(asarPath,file.replaceAll("/",path.sep));
 if(file==="package.json"){
   // @electron/packager strips "private":true during prune.
   // Permit only this established packaging normalization.
   const before=JSON.parse(fs.readFileSync(path.join(bundle,file),"utf8"));
   assert.equal(before.private,true);
   delete before.private;
   assert.deepEqual(JSON.parse(packaged.toString("utf8")),before,
     "package.json may only lose private:true");
 }else{
   assert.equal(sha(packaged),fileSha(path.join(bundle,file)),
     "packaged bytes must equal allowlisted source: "+file);
 }
}
const original=fs.readFileSync(path.join(root,"web","index.html"),"utf8");
const current=fs.readFileSync(path.join(stage,"web","index.html"),"utf8");
const expectedHtml=original.replace(
  '  <script type="module" src="/web/app.mjs"></script>',
  '  <script type="module" src="/web/app.mjs"></script>\n'+
  '  <script type="module" src="/web/desktop-settings.mjs"></script>');
assert.equal(current,expectedHtml,"the only P28 index delta is desktop settings module");
let unchanged=0;
for(const [rel,digest] of Object.entries(parent.P27Runtime54UnchangedSHA256)){
 const originalPath=path.join(root,rel);
 const staged=path.join(stage,rel);
 assert.equal(fileSha(originalPath),digest,"canonical P28 source drift "+rel);
 if(rel==="web/index.html")continue;
 assert.equal(fileSha(staged),digest,"staging inherited P28 source drift "+rel);
 unchanged++;
}
assert.equal(unchanged,53);
const photos=parent.OEMReferenceOnly8SHA256;
for(const [name,digest] of Object.entries(photos)){
 assert.equal(fileSha(path.join(root,"sources",
   "FCV588_GiaoDienThucTeMay2016",name)),digest,"reference-only JPEG drift");
}
const parentFinalSha=fileSha(path.join(parentQa,
  "FCV588_P28_MODE_VISUAL_FINAL_INTEGRITY_20261117.json"));
const parentPostSha=fileSha(path.join(parentQa,
  "FCV588_P28_MODE_VISUAL_INDEPENDENT_SHA_POSTRECEIPT_20261117.json"));
assert.equal(parentFinalSha,
  "313c323db96f706de07bd28cf3832d19cdcdb0ce7dc41baad0d726e09a27ca95");
assert.equal(parentPostSha,
  "bb533ff8a36084c579fa33a24a18b914ae61930cf14d0634dc46e10523c24bed");
assert.equal(e2e.status,"PASS");
assert.equal(e2e.cases.length,25);
assert.equal(e2e.exeSHA256,fileSha(exepath));
assert.ok(e2e.reloadedTransportURLs.length>=50);
assert.ok(e2e.reloadedTransportURLs.every(u=>u.startsWith("app://fcv588/")));
assert.equal(e2e.releaseApproval,"HOLD");
assert.equal(e2e.airgappedVMInstallValidated,false);
for(const [name,digest] of Object.entries(e2e.screenshots)){
 assert.equal(fileSha(path.join(qa,name)),digest);
}
const result={
 schema:"FCV588_P29_ELECTRON_ASAR_SOURCE_AUDIT_V1",
 status:"P29_BOUNDED_PACKAGED_SOURCE_PASS_NOT_RELEASE",
 parentP28FinalSHA256:parentFinalSha,
 parentP28IndependentPostSHA256:parentPostSha,
 runtime54CanonicalUnchanged:54,runtime53InheritedStageExact:53,
 expectedIndexOnlyNewModuleScript:true,
 approvedWebSrcFiles:56,asarPackagedFiles:expected.length,
 forbiddenOEMReferenceFiles:0,foreignNodePackagesOrTests:0,
 packagedExeSHA256:fileSha(exepath),asarSHA256:fileSha(asarPath),
 allPackedFileSHA256:Object.fromEntries(expected.map(file=>[
   file,sha(asar.extractFile(asarPath,file.replaceAll("/",path.sep))),
 ])),
 E2EReceiptSHA256:fileSha(path.join(qa,
   "P29_PACKAGED_E2E_V5_20261121.json")),
 E2ECases:25,networkResourcesSameAppOrigin:e2e.reloadedTransportURLs.length,
 desktopSettingsExportSHA256:e2e.settingsExportSHA256,
 releaseApproval:"HOLD",hardwareValidated:false,
 airgappedVMInstallValidated:false,codeSigned:false,
};
const receipt=path.join(qa,"P29_ASAR_SOURCE_AUDIT_V3_20261121.json");
fs.writeFileSync(receipt,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({
 status:result.status,asarFiles:expected.length,
 exeSHA256:result.packagedExeSHA256,
 asarSHA256:result.asarSHA256,
 receiptSHA256:fileSha(receipt),
}));
