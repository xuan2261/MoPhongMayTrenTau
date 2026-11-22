"use strict";
/**
 * Source-bound P29 packaged Electron test. This runs the *packaged EXE*,
 * never the user's browser/server, with an isolated profile and dead proxy.
 */
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const assert=require("node:assert/strict");
const { _electron }=require("playwright-core");
const attempt=Number(process.env.POC_E2E_ATTEMPT??1);
if(!Number.isInteger(attempt)||attempt<1||attempt>10)throw Error("invalid attempt");
const stage=path.resolve(__dirname,"..");
const root=path.resolve(stage,"..","..");
const qa=path.join(root,"docs","qa","FCV588_ELECTRON_POC_20261121");
const exe=path.join(stage,"dist","FCV588-Synthetic-POC-win32-x64",
  "FCV588-Synthetic-POC.exe");
const receipt=path.join(qa,`P29_PACKAGED_E2E_V${attempt}_20261121.json`);
const profile=path.join(qa,`profile-e2e-v${attempt}`);
const sha=buffer=>crypto.createHash("sha256").update(buffer).digest("hex");
const p28qa=path.join(root,"docs","qa","FCV588_P28_MODE_VISUAL_20261117");
const fcsv=JSON.parse(fs.readFileSync(path.join(p28qa,
  "P28_SYNTHETIC_FIXTURE_PROVENANCE_20261117.json"),"utf8"));
const fixture=fcsv.entries.find(row=>row.name==="profile22-dual");
let electron=null;
const report={schema:"FCV588_P29_ELECTRON_PACKAGED_E2E_V1",
  attempt,status:"IN_PROGRESS",exeSHA256:sha(fs.readFileSync(exe)),
  isolatedProfile:profile,launchOrigin:"app://fcv588/",
  cases:[],screenshots:{},errors:[],
  syntheticOnly:true,hardwareValidated:false,releaseApproval:"HOLD",
  externalBrowserUsed:false,userServer4173HTTPRequests:0,
  externalNetworkDisabledByHostPolicies:true,airgappedVMInstallValidated:false};
const check=(name,condition)=>{
  assert.ok(condition,name);
  report.cases.push(name);
};
const env={...process.env,
  FCV588_POC_PROFILE_DIR:profile,
  HTTP_PROXY:"http://127.0.0.1:1",
  HTTPS_PROXY:"http://127.0.0.1:1",
  ALL_PROXY:"http://127.0.0.1:1"};
async function launch(){
 return _electron.launch({executablePath:exe,env,timeout:30000});
}
async function pixels(page){
 return page.evaluate(async()=>{
   const c=document.getElementById("echo-canvas");
   const a=c.getContext("2d").getImageData(0,0,c.width,c.height).data;
   const h=await crypto.subtle.digest("SHA-256",a);
   return Array.from(new Uint8Array(h),v=>v.toString(16).padStart(2,"0")).join("");
 });
}
async function main(){
 // A complete synthetic settings transfer; external browser profiles are never read.
 const {createSession}=await import("../src/core/session.mjs");
 const {FCV588_ADAPTER}=await import("../src/devices/fcv588/adapter.mjs");
 const {TRAINING_SCENARIO}=await import("../src/core/scenario.mjs");
 const {encodeFcvSettings,FCV_SETTINGS_STORAGE_KEY}=await import("../src/devices/fcv588/settings.mjs");
 const {exportDesktopSettingsText}=await import("../web/desktop-settings-core.mjs");
 const raw=encodeFcvSettings(createSession(FCV588_ADAPTER,TRAINING_SCENARIO).deviceState.settings);
 check("settings-source-encoded-valid",raw.length>100);
 electron=await launch();
 const page=await electron.firstWindow();
 page.on("pageerror",err=>report.errors.push("PAGE_ERROR "+String(err)));
 const network=[];
 page.on("request",req=>network.push(req.url()));
 await page.waitForLoadState("load");
 await page.locator("#desktop-export-settings").waitFor();
  // Electron's custom scheme exposes zero performance-resource entries on
  // this Chromium build. Capture actual transport events during an explicit
  // reload instead of interpreting Performance API's absence as no imports.
  await page.reload({waitUntil:"load"});
  await page.locator("#desktop-export-settings").waitFor();
 check("packaged-electron",await electron.evaluate(({app})=>app.isPackaged));
 check("own-secure-origin",page.url()==="app://fcv588/");
 check("simulator-lf-initial",await page.locator("#mode-state").innerText()==="LF");
 const appLocal=await page.evaluate(()=>{
   const sources=performance.getEntriesByType("resource").map(row=>row.name);
   return {sources,storageOrigin:location.origin,
     nodeExpose:typeof window.require,processExpose:typeof window.process,
     audioApi:typeof window.AudioContext};
 });
  report.localResourceObservation=appLocal;
  report.reloadedTransportURLs=network;
  check("all-module-assets-local",network.length>25 &&
   network.every(url=>url.startsWith("app://fcv588/")));
 check("node-process-not-exposed-to-renderer",
   appLocal.nodeExpose==="undefined"&&appLocal.processExpose==="undefined");
 check("web-audio-api-available",appLocal.audioApi==="function");
 check("renderer-localstorage-origin",appLocal.storageOrigin==="app://fcv588");

 // The actual packaged app must reject all non-allowlisted routes.
 const security=await electron.evaluate(async({net})=>{
   const urls=[
     "app://fcv588/sources/manuals/a.pdf",
     "app://fcv588/web/lf.jpg",
     "app://fcv588/docs/qa/secret.json",
     "app://fcv588/src/core/../../package.json",
   ];
   const result=[];
   for(const url of urls){
     try{
       const r=await net.fetch(url);
       result.push({url,status:r.status});
     }catch(e){result.push({url,error:String(e)});}
   }
   let blockedExternal=false;
   try{await net.fetch("https://example.com/",{headers:{"X-POC-TEST":"must-block"}});}
   catch{blockedExternal=true;}
   return {result,blockedExternal};
 });
 check("deny-all-forbidden-package-asset-paths",
   security.result.every(r=>r.status===404 || Boolean(r.error)));
 check("deny-external-network-request",security.blockedExternal);
 check("deny-window-open",
   await page.evaluate(()=>{const w=window.open("https://example.com/");return w===null;}));

 // Import a versioned whitelisted settings JSON through the actual file chooser.
 await page.locator("#desktop-import-settings-file").setInputFiles({
   name:"FCV588-settings-training-only.json",mimeType:"application/json",
   buffer:Buffer.from(exportDesktopSettingsText(raw),"utf8")});
 page.once("dialog",dialog=>dialog.accept());
 await page.locator("#desktop-import-settings").click();
 await page.waitForLoadState("load");
 await page.waitForFunction(
   (key)=>localStorage.getItem(key)!==null,FCV_SETTINGS_STORAGE_KEY);
 const transferred=await page.evaluate(
   key=>localStorage.getItem(key),FCV_SETTINGS_STORAGE_KEY);
 check("import-exact-fingerprint-settings-and-key",transferred===raw);
 check("reloaded-device-still-power-off",
   await page.locator("#off-screen").isVisible());

 // Export through Blob download into owned QA, never reading browser profiles.
  const exported=path.join(qa,`P29_SETTINGS_EXPORTED_V${attempt}_20261121.json`);
  if(fs.existsSync(exported))throw Error("export output exists");
  await electron.evaluate(({session},destination)=>{
    globalThis.__POC_QA_DOWNLOADS=[];
    session.defaultSession.on("will-download",(_event,item)=>{
      const observed={
        url:item.getURL(),filename:item.getFilename(),
        mime:item.getMimeType(),bytes:item.getTotalBytes(),state:"STARTED",
      };
      globalThis.__POC_QA_DOWNLOADS.push(observed);
      // Electron DownloadItem is the native download owner. Playwright's
      // browser Page.download event does not fire for this embedded WebContents.
      if(observed.url.startsWith("blob:app://fcv588/") &&
         observed.filename==="FCV588-settings-training-only.json"){
        item.setSavePath(destination);
        item.once("done",(_e,state)=>{observed.state=state;});
      }
    });
  },exported);
  report.blobProbeURL=await page.evaluate(()=>{
    const url=URL.createObjectURL(new Blob(["{}"],{type:"application/json"}));
    URL.revokeObjectURL(url);
    return url;
  });
  await page.locator("#desktop-export-settings").click();
  let nativeDownloads=[];
  for(let i=0;i<50;i++){
    nativeDownloads=await electron.evaluate(()=>globalThis.__POC_QA_DOWNLOADS);
    if(nativeDownloads.some(row=>row.state!=="STARTED"))break;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  report.exportDiagnostics={
    status:await page.locator("#desktop-settings-status").innerText(),
    downloadMainEvents:nativeDownloads,
  };
  check("export-fixed-safe-filename",
    nativeDownloads.length===1 &&
    nativeDownloads[0].filename==="FCV588-settings-training-only.json" &&
    nativeDownloads[0].state==="completed");
  check("export-native-file-written",fs.existsSync(exported));
 check("export-byte-valid",fs.readFileSync(exported,"utf8")===
   exportDesktopSettingsText(raw));
 report.settingsExportSHA256=sha(fs.readFileSync(exported));

 // FCV UI input, Canvas output and D15 replay remain synthetic and deterministic.
 await page.locator("#btn-pause").click();
 await page.locator("#key-power").click();
 for(let i=0;i<5;i++)await page.locator("#btn-step").click();
 check("powered-on-synthetic-lcd",await page.locator("#off-screen").isHidden());
 const pictureLF=await pixels(page);
 await page.locator("#mode-knob").focus();
 await page.keyboard.press("]");
 await page.waitForFunction(
   ()=>document.getElementById("mode-state")?.textContent==="DUAL",
   undefined,{timeout:12000});
 const pictureDUAL=await pixels(page);
 check("LF-DUAL-differ-on-packaged-Canvas",pictureLF!==pictureDUAL);
 await page.locator("#mode-knob").focus();
 await page.keyboard.press("]");
 await page.waitForFunction(
   ()=>document.getElementById("mode-state")?.textContent==="HF",
   undefined,{timeout:12000});
 const pictureHF=await pixels(page);
 check("DUAL-HF-differ-on-packaged-Canvas",
   pictureDUAL!==pictureHF && pictureLF!==pictureHF);
 report.liveModeRGBA_SHA256={LF:pictureLF,DUAL:pictureDUAL,HF:pictureHF};
 const png=path.join(qa,`P29_PACKAGED_LCD_HF_V${attempt}_20261121.png`);
 if(fs.existsSync(png))throw Error("screenshot exists");
 await page.locator("#lcd").screenshot({path:png});
 report.screenshots[path.basename(png)]=sha(fs.readFileSync(png));

 await page.locator("#archive-envelope-file").setInputFiles(
   path.join(p28qa,fixture.envelopeFile));
 await page.locator("#archive-sidecar-file").setInputFiles(
   path.join(p28qa,fixture.sidecarFile));
 await page.locator("#archive-replay-button").click();
 await page.waitForFunction(
   ()=>document.getElementById("archive-replay-status")?.dataset.state==="pass",
   undefined,{timeout:15000});
 check("archive-p28-profile22-dual-validation",
   await page.locator("#archive-replay-status").getAttribute("data-session-hash")===
   fixture.fullSessionHash);
 check("archive-file-import-did-not-mutate-live-HF-Canvas",
   await pixels(page)===pictureHF);
 check("no-runtime-page-errors",report.errors.length===0);
 check("no-remote-page-resources",network.every(url=>url.startsWith("app://fcv588/")));
  report.loadedLocalAssetCount=network.length;

 await electron.close();electron=null;
 electron=await launch();
 const again=await electron.firstWindow();
 await again.locator("#desktop-export-settings").waitFor();
 check("settings-persist-after-process-restart",
   await again.evaluate(key=>localStorage.getItem(key),
     FCV_SETTINGS_STORAGE_KEY)===raw);
 check("restart-returns-default-device-power-off",
   await again.locator("#off-screen").isVisible());
 await electron.close();electron=null;
}
(async()=>{
 try{await main();report.status="PASS";}
 catch(err){
  report.status="FAILED";
  report.errors.push(err.stack||String(err));
 }
 finally{
  if(electron){try{await electron.close();}catch(err){
    report.errors.push("CLEANUP "+String(err));report.status="FAILED";
  }}
  fs.writeFileSync(receipt,JSON.stringify(report,null,2)+"\n",{flag:"wx"});
  console.log(JSON.stringify({status:report.status,passed:report.cases.length,
    errors:report.errors.slice(0,2),receipt,
    receiptSHA256:sha(fs.readFileSync(receipt))}));
  if(report.status!=="PASS")process.exitCode=3;
 }
})();
