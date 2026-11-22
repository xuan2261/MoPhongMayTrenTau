"""P28 isolated live illustrative LCD mode visual pass, NOT historical replay pixels."""
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import time
import traceback
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
STAGE=ROOT/"staging/fcv588-p28-mode-visual-20261117"
QA=ROOT/"docs/qa/FCV588_P28_MODE_VISUAL_20261117"
PORT=4233
RECEIPT=QA/"P28_STAGE_LIVE_LCD_MODES_V2_20261117.json"
NODE=r"C:\nvm4w\nodejs\node.exe"
CHROME=r"C:\Program Files\Google\Chrome\Application\chrome.exe"
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def listening(port):
 with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as s:
  s.settimeout(.15)
  return s.connect_ex(("127.0.0.1",port))==0
def check(v,msg):
 if not v:raise AssertionError(msg)
def rgba(page,selector):
 return page.evaluate("""async selector=>{
  const c=document.querySelector(selector),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  const h=await crypto.subtle.digest('SHA-256',data);
  return {width:c.width,height:c.height,sha256:Array.from(new Uint8Array(h),x=>x.toString(16).padStart(2,'0')).join('')};
 }""",selector)
proof={
 "schema":"FCV588_P28_STAGE_LIVE_LCD_MODES_V2",
 "scope":"ISOLATED_SYNTHETIC_LF_DUAL_HF_LIVE_LCD_QUALITATIVE",
 "oemPixelValidation":False,"historicalLCDReplay":False,
 "status":"IN_PROGRESS","cases":[],"httpBodies":{},"screenshots":{},"errors":[],
 "qaPort":PORT,"userServer4173Interaction":"NONE_BY_DESIGN_NOT_PROBED",
}
owned=None
try:
 check(not listening(PORT),"QA port4233 busy: do not terminate foreign service")
 env=os.environ.copy();env["PORT"]=str(PORT)
 owned=subprocess.Popen([NODE,"tools/server.mjs"],cwd=STAGE,env=env,
   creationflags=subprocess.CREATE_NO_WINDOW,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 for _ in range(75):
  if owned.poll() is not None:raise RuntimeError("owned server stopped")
  if listening(PORT):break
  time.sleep(.1)
 check(listening(PORT),"owned isolated QA server unavailable")
 with sync_playwright() as playwright:
  browser=playwright.chromium.launch(headless=True,executable_path=CHROME,
    args=["--no-first-run","--disable-background-networking"])
  page=browser.new_page(viewport={"width":1366,"height":768},locale="vi-VN")
  page.on("pageerror",lambda err:proof["errors"].append("JS_PAGE_ERROR "+str(err)))
  def source_bound(req):
   try:
    u=urlparse(req.url)
    if u.hostname!="127.0.0.1" or u.port!=PORT:
     proof["errors"].append("NONLOCAL_RESOURCE "+req.url);return
    route=u.path
    if route!="/" and not route.startswith(("/src/","/web/")):
     proof["errors"].append("OTHER_ROUTE "+route);return
    f=STAGE/("web/index.html" if route=="/" else route.lstrip("/"))
    resp=req.response()
    if not f.is_file() or resp is None or resp.status!=200:
     proof["errors"].append("HTTP_ROUTE_FAILED "+route);return
    h=hashlib.sha256(resp.body()).hexdigest()
    if h!=sha(f):proof["errors"].append("HTTP_SOURCE_SHA_DRIFT "+route)
    proof["httpBodies"][route]=h
   except Exception as err:proof["errors"].append("SOURCE_PROBE "+str(err))
  page.on("requestfinished",source_bound)
  page.goto(f"http://127.0.0.1:{PORT}/",wait_until="load",timeout=22000)
  page.locator("#btn-pause").click()
  check(page.locator("#mode-state").inner_text()=="LF","initial LCD mode not LF")
  # Exercise QA page's genuine UI controls, never user-owned port 4173.
  page.locator("#key-power").click()
  for _ in range(5):
   page.locator("#btn-step").click()
  page.wait_for_function("document.querySelector('#status-line')?.textContent!=='POWER OFF'",
                         timeout=10000)
  baselineTick=page.locator("#tick-count").inner_text()
  def capture(mode):
   check(page.locator("#mode-state").inner_text()==mode,"mode not committed "+mode)
   check(page.locator("#tick-count").inner_text()==baselineTick,
         "world clock advanced during paused visual comparison "+mode)
   c=rgba(page,"#echo-canvas")
   check((c["width"],c["height"])==(480,640),"logical LCD canvas size changed")
   name="P28_STAGE_LIVE_LCD_"+mode+"_V2_20261117.png"
   target=QA/name
   page.locator("#lcd").screenshot(path=str(target))
   proof["screenshots"][name]=sha(target)
   proof["cases"].append({
    "mode":mode,"worldTick":baselineTick,"canvasRGBA_SHA256":c["sha256"],
    "canvasSize":[c["width"],c["height"]],
    "statusTop":page.locator("#screen-top").inner_text(),
    "screenshotSHA256":sha(target),
    "syntheticBrowserOnly":True,
   })
  capture("LF")
  page.locator("#mode-knob").focus();page.keyboard.press("]")
  page.wait_for_function("document.querySelector('#mode-state')?.textContent==='DUAL'",
                         timeout=11500)
  capture("DUAL")
  page.locator("#mode-knob").focus();page.keyboard.press("]")
  page.wait_for_function("document.querySelector('#mode-state')?.textContent==='HF'",
                         timeout=11500)
  capture("HF")
  check(len({c["canvasRGBA_SHA256"] for c in proof["cases"]})==3,
        "LF/DUAL/HF canvas remained pixel-identical")
  check(len(proof["httpBodies"])==52,"expected 52 source-bound browser-loaded HTTP bodies")
  check(not proof["errors"],"source/browser error")
  page.close();browser.close()
except Exception:
 proof["errors"].append(traceback.format_exc())
finally:
 if owned:
  try:owned.terminate();owned.wait(timeout=8)
  except Exception:
   try:owned.kill();owned.wait(timeout=8)
   except Exception as e:proof["errors"].append("OWNED_SERVER_CLEANUP "+str(e))
  proof["ownedQAServerExited"]=owned.poll() is not None
 time.sleep(.2)
 proof["qaPortClosed"]=not listening(PORT)
 if not proof["qaPortClosed"]:proof["errors"].append("OWNED_QA_PORT_NOT_CLOSED")
 proof["loadedHTTPSourceCount"]=len(proof["httpBodies"])
 proof["status"]="PASS" if len(proof["cases"])==3 and not proof["errors"] and proof["qaPortClosed"] else "FAILED"
 with RECEIPT.open("x",encoding="utf8") as f:
  json.dump(proof,f,indent=2,ensure_ascii=False);f.write("\n")
 print(json.dumps({"status":proof["status"],"cases":len(proof["cases"]),
  "httpBodies":proof["loadedHTTPSourceCount"],"qaPortClosed":proof["qaPortClosed"],
  "errors":proof["errors"][:2],"receiptSHA256":sha(RECEIPT)},ensure_ascii=True))
 if proof["status"]!="PASS":raise SystemExit(3)
