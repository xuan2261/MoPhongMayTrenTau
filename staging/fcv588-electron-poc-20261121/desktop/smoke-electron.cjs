"use strict";
const path=require("node:path");
const { _electron }=require("playwright-core");
const exe=process.env.POC_EXE_PATH ||
  path.resolve(__dirname,"../dist/FCV588-Synthetic-POC-win32-x64/FCV588-Synthetic-POC.exe");
const qa=path.resolve(__dirname,"../../../docs/qa/FCV588_ELECTRON_POC_20261121");
(async()=>{
  const e=await _electron.launch({
    executablePath:exe,
    env:{...process.env,
      FCV588_POC_PROFILE_DIR:process.env.POC_SMOKE_PROFILE_DIR ||
        path.join(qa,"smoke-profile-v1"),
      HTTP_PROXY:"http://127.0.0.1:1",
      HTTPS_PROXY:"http://127.0.0.1:1"},
    timeout:30000,
  });
  try{
    const p=await e.firstWindow();
    await p.waitForLoadState("load");
    await p.waitForTimeout(1000);
    const d={url:p.url(),title:await p.title(),
      mode:await p.locator("#mode-state").textContent().catch(e=>"NO_MODE:"+e.message),
      status:await p.locator("#validation-status").textContent().catch(()=>"NO_STATUS"),
      transferControl:await p.locator("#desktop-export-settings").count(),
      appPackaged:await e.evaluate(({app})=>app.isPackaged),
      rootDOM:await p.evaluate(()=>document.documentElement.outerHTML.length),
      visibleText:(await p.locator("body").innerText()).slice(0,250)};
    console.log(JSON.stringify(d));
    if(d.url!=="app://fcv588/" || d.mode!=="LF" ||
       !d.transferControl || !d.appPackaged)process.exitCode=4;
  }finally{await e.close();}
})().catch(err=>{console.error("SMOKE_ERROR",err.stack);process.exitCode=3;});
