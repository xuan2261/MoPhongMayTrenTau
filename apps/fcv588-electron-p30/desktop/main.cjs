"use strict";
/**
 * Windows-only Electron POC. Electron runs a closed static app origin:
 * no localhost server, renderer Node API, preload bridge or host device access.
 * The P28 browser implementation is served unmodified from web/ + src/.
 * This is synthetic training software, NOT OEM/hardware-approved.
 */
const {app,BrowserWindow,protocol,session}=require("electron");
const fs=require("node:fs/promises");
const path=require("node:path");
const {URL}=require("node:url");

const ROOT=path.resolve(__dirname,"..");
const SCHEME="app";
const HOST="fcv588";
const ORIGIN=SCHEME+"://"+HOST;
const CONTENT_SECURITY_POLICY=[
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
].join("; ");
const MIME=Object.freeze({
  ".html":"text/html; charset=utf-8",
  ".mjs":"text/javascript; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".svg":"image/svg+xml",
});
const ALLOWED=Object.freeze({
  web:new Set([".html",".mjs",".js",".css",".svg"]),
  src:new Set([".mjs",".js"]),
});

protocol.registerSchemesAsPrivileged([{
  scheme:SCHEME,
  privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true},
}]);

function forbidden(){
  return new Response("Not found",{
    status:404,headers:{"Content-Type":"text/plain; charset=utf-8",
      "X-Content-Type-Options":"nosniff","Cache-Control":"no-store"},
  });
}

async function serveLocal(request){
  if(request.method!=="GET" && request.method!=="HEAD")return forbidden();
  let pathname;
  try{
    const url=new URL(request.url);
    if(url.protocol!==SCHEME+":" || url.hostname!==HOST ||
       url.username || url.password || url.port || url.search || url.hash)
      return forbidden();
    pathname=decodeURIComponent(url.pathname);
  }catch{return forbidden();}
  if(pathname==="/")pathname="/web/index.html";
  if(pathname.includes("\\") || pathname.includes("\0") ||
     pathname.slice(1).split("/").some(segment=>segment===".." || segment==="." ||
       !segment || segment.startsWith(".")))return forbidden();
  const segments=pathname.slice(1).split("/");
  const tree=segments.shift();
  if(!Object.hasOwn(ALLOWED,tree) || !segments.length)return forbidden();
  const file=path.resolve(ROOT,tree,...segments);
  const parent=path.resolve(ROOT,tree);
  const relative=path.relative(parent,file);
  if(!relative || relative===".." || relative.startsWith(".."+path.sep) ||
     path.isAbsolute(relative) ||
     !ALLOWED[tree].has(path.extname(file).toLowerCase()))return forbidden();
  try{
    const baseReal=await fs.realpath(parent);
    const fileReal=await fs.realpath(file);
    const realRelative=path.relative(baseReal,fileReal);
    if(!realRelative || realRelative===".." ||
       realRelative.startsWith(".."+path.sep) ||
       path.isAbsolute(realRelative))return forbidden();
    const stat=await fs.stat(fileReal);
    if(!stat.isFile() || stat.size>4_000_000)return forbidden();
    const bytes=request.method==="HEAD"?undefined:await fs.readFile(fileReal);
    return new Response(bytes,{status:200,headers:{
      "Content-Type":MIME[path.extname(fileReal).toLowerCase()],
      "Content-Security-Policy":CONTENT_SECURITY_POLICY,
      "X-Content-Type-Options":"nosniff",
      "Cache-Control":"no-store",
    }});
  }catch{return forbidden();}
}

function registerSecurityPolicies(){
  const own=session.defaultSession;
  own.setPermissionRequestHandler((_webContents,permission,callback)=>
    callback(permission==="fullscreen"));
  own.setPermissionCheckHandler((_webContents,permission)=>
    permission==="fullscreen");
  own.webRequest.onBeforeRequest((details,callback)=>{
    // Block HTTP(S), sockets and every external scheme at the network layer.
    // blob: downloads originate only from the local UI's explicit export action.
    const allowed=details.url.startsWith(ORIGIN+"/") ||
      details.url.startsWith("blob:"+ORIGIN+"/") ||
      details.url.startsWith("data:");
    callback({cancel:!allowed});
  });
  own.on("will-download",(event,item)=>{
    if(!item.getURL().startsWith("blob:"+ORIGIN+"/") ||
       !/^FCV588-[A-Za-z0-9._-]+\.json$/i.test(item.getFilename()))
      event.preventDefault();
  });
}

function logProcessDiagnostic(kind,details){
  const entry=JSON.stringify({
    at:new Date().toISOString(),
    kind,
    reason:String(details?.reason??details?.type??"unknown"),
    exitCode:Number.isInteger(details?.exitCode)?details.exitCode:null,
  })+"\n";
  try{
    const target=path.join(app.getPath("userData"),"fcv588-crash-diagnostics.log");
    fs.appendFile(target,entry,"utf8").catch(()=>{});
  }catch{
    // Local diagnostic logging is best-effort and must never crash main process.
  }
}

function makeWindow(){
  const win=new BrowserWindow({
    width:1450,height:920,minWidth:850,minHeight:620,show:false,
    autoHideMenuBar:true,
    icon:path.join(__dirname,"fcv588.ico"),
    title:"FURUNO FCV-588 — Mô phỏng Máy Đo Sâu Dò Cá Độc Lập",
    webPreferences:{
      nodeIntegration:false,
      contextIsolation:true,
      sandbox:true,
      webSecurity:true,
      allowRunningInsecureContent:false,
      devTools:false,
    },
  });
  win.on("page-title-updated",event=>event.preventDefault());
  win.webContents.setWindowOpenHandler(()=>({action:"deny"}));
  win.webContents.on("before-input-event",(event,input)=>{
    if(input.type==="keyDown" && input.key==="F11"){
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
  win.webContents.on("will-navigate",(event,navigationURL)=>{
    if(navigationURL!==ORIGIN+"/" &&
       navigationURL!==ORIGIN+"/web/index.html")event.preventDefault();
  });
  win.webContents.on("render-process-gone",(_event,details)=>{
    logProcessDiagnostic("render-process-gone",details);
  });
  win.once("ready-to-show",()=>win.show());
  win.loadURL(ORIGIN+"/");
  return win;
}

if(!app.requestSingleInstanceLock()){
  app.quit();
}else{
  app.on("second-instance",()=>{
    const existing=BrowserWindow.getAllWindows()[0];
    if(!existing || existing.isDestroyed())return;
    if(existing.isMinimized())existing.restore();
    if(!existing.isVisible())existing.show();
    existing.focus();
  });
  app.on("child-process-gone",(_event,details)=>{
    logProcessDiagnostic("child-process-gone",details);
  });
  app.commandLine.appendSwitch("disable-background-networking");
  app.commandLine.appendSwitch("no-proxy-server");
  app.setAppUserModelId("vn.mophongmaytrentau.fcv588.standalone");
  const privateRoot=process.env.FCV588_POC_PROFILE_DIR;
  if(privateRoot && path.isAbsolute(privateRoot)){
    app.setPath("userData",path.resolve(privateRoot));
  }else{
    app.setPath("userData",path.join(app.getPath("appData"),
      "FURUNO-FCV588-Simulator"));
  }
  app.whenReady().then(()=>{
    app.setAccessibilitySupportEnabled(true);
    protocol.handle(SCHEME,serveLocal);
    registerSecurityPolicies();
    makeWindow();
    app.on("activate",()=>{
      if(BrowserWindow.getAllWindows().length===0)makeWindow();
    });
  });
  app.on("window-all-closed",()=>app.quit());
}
