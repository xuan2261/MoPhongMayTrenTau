"""One isolated Chrome/QA-port P28 manual-mode archive regression, source-bound.
Does not use the user-owned 127.0.0.1:4173 service or any OEM image asset.
"""
import hashlib
import json
import os
import pathlib
import socket
import subprocess
import time
import traceback
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(r"C:\Work\MoPhongMayTrenTau")
STAGE=ROOT/"staging/fcv588-p28-mode-visual-20261117"
QA=ROOT/"docs/qa/FCV588_P28_MODE_VISUAL_20261117"
PORT=4231
NODE=r"C:\nvm4w\nodejs\node.exe"
CHROME=r"C:\Program Files\Google\Chrome\Application\chrome.exe"
MANIFEST=QA/"P28_SYNTHETIC_FIXTURE_PROVENANCE_20261117.json"
OUTPUT=QA/"P28_STAGE_BROWSER_MODE_MATRIX_V1_20261117.json"

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def listening(port):
 with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as s:
  s.settimeout(.15)
  return s.connect_ex(("127.0.0.1",port))==0
def require(condition,message):
 if not condition:raise AssertionError(message)
def canvas(page,selector):
 return page.evaluate("""async selector=>{
   const c=document.querySelector(selector),ctx=c.getContext('2d');
   const pixels=ctx.getImageData(0,0,c.width,c.height).data;
   const sha=await crypto.subtle.digest('SHA-256',pixels);
   const colors=new Set();
   for(let i=0;i<pixels.length;i+=4)
     colors.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]+','+pixels[i+3]);
   return {sha256:Array.from(new Uint8Array(sha),v=>v.toString(16).padStart(2,'0')).join(''),
           width:c.width,height:c.height,uniqueColors:colors.size};
 }""",selector)

proof={
 "schema":"FCV588_P28_STAGE_BROWSER_MODE_MATRIX_V1",
 "status":"IN_PROGRESS","root":str(STAGE),"qaPort":PORT,
 "fixtureManifestSHA256":sha(MANIFEST),"cases":[],"screenshots":{},
 "httpBodies":{},"errors":[],"userServer4173Interaction":"NONE_BY_DESIGN_NOT_PROBED",
 "syntheticOnly":True,"oemPixelComparison":False,
}
fixture=json.loads(MANIFEST.read_text(encoding="utf8"))
require(fixture["sourceClass"]=="SYNTHETIC_QA_ONLY_NOT_OEM_NOT_HISTORICAL" and
        fixture["historicalAuthentication"] is False and len(fixture["entries"])==6,
        "fixture provenance is not trusted as synthetic QA")
entries={item["name"]:item for item in fixture["entries"]}
for item in entries.values():
 require(sha(QA/item["envelopeFile"])==item["envelopeSHA256"] and
         sha(QA/item["sidecarFile"])==item["sidecarSHA256"],
         "fixture SHA mismatch: "+item["name"])
server=None
browser=None
try:
 require(not listening(PORT),"QA port 4231 busy, never terminate foreign server")
 env=os.environ.copy();env["PORT"]=str(PORT)
 server=subprocess.Popen([NODE,"tools/server.mjs"],cwd=STAGE,env=env,
   creationflags=subprocess.CREATE_NO_WINDOW,
   stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 for _ in range(80):
  if server.poll() is not None:raise RuntimeError("owned QA service failed")
  if listening(PORT):break
  time.sleep(.1)
 require(listening(PORT),"isolated QA server didn't bind")
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=CHROME,
    args=["--no-first-run","--disable-background-networking"])
  page=browser.new_page(viewport={"width":1366,"height":768},locale="vi-VN")
  page.on("pageerror",lambda err:proof["errors"].append("PAGE_ERROR "+str(err)))
  def check_response(request):
   try:
    uri=urlparse(request.url)
    if uri.hostname!="127.0.0.1" or uri.port!=PORT:
     proof["errors"].append("EXTERNAL_RESOURCE "+request.url);return
    route=uri.path
    if route!="/" and not route.startswith(("/src/","/web/")):
     proof["errors"].append("OUT_OF_SCOPE_ROUTE "+route);return
    local=STAGE/("web/index.html" if route=="/" else route.lstrip("/"))
    response=request.response()
    if not local.is_file() or response is None or response.status!=200:
     proof["errors"].append("HTTP_NON200_OR_UNKNOWN "+route);return
    body=hashlib.sha256(response.body()).hexdigest()
    if body!=sha(local):proof["errors"].append("HTTP_SOURCE_SHA_MISMATCH "+route)
    proof["httpBodies"][route]=body
   except Exception as err:proof["errors"].append("HTTP_PROBE "+str(err))
  page.on("requestfinished",check_response)
  page.goto(f"http://127.0.0.1:{PORT}/",wait_until="load",timeout=20000)
  page.wait_for_selector("#archive-timeline-range",state="attached")
  page.locator("#btn-pause").click()
  baseline={key:page.locator(key).inner_text() for key in
    ["#mode-state","#tick-count","#event-count"]}
  baseline["lcd"]=canvas(page,"#echo-canvas")["sha256"]
  def stable():
   for key in ["#mode-state","#tick-count","#event-count"]:
    require(page.locator(key).inner_text()==baseline[key],"live state mutated "+key)
   require(canvas(page,"#echo-canvas")["sha256"]==baseline["lcd"],
      "live LCD RGBA changed during archive-only QA")
  def load(name,expected="pass",otherSidecar=None):
   item=entries[name]
   sidecar=entries[otherSidecar] if otherSidecar else item
   page.locator("#archive-envelope-file").set_input_files(str(QA/item["envelopeFile"]))
   page.locator("#archive-sidecar-file").set_input_files(str(QA/sidecar["sidecarFile"]))
   page.locator("#archive-replay-button").click()
   page.wait_for_function("(s)=>document.getElementById('archive-replay-status')?.dataset.state===s",
                          arg=expected,timeout=20000)
   stable()
   return item
  def verify_mode(item):
   page.wait_for_function("(m)=>document.getElementById('archive-timeline-status')?.textContent.includes('mode '+m)",
                           arg=item["activeMode"])
   require(page.locator("#archive-timeline-panel").is_visible(),"timeline panel missing")
   require(page.locator("#archive-timeline-range").input_value()==str(item["eventCount"]),
           "not positioned at final event")
   require(page.locator("#archive-timeline-canvas").get_attribute("data-prefix-hash")==
           item["fullSessionHash"],"event-prefix full hash drift")
   require(item["profileRevision"]==page.locator("#archive-replay-status").get_attribute("data-profile-revision"),
           "wrong versioned adapter displayed")
   require(item["presentationContract"]==page.locator("#archive-replay-status").get_attribute("data-contract"),
           "sidecar contract drift")
   require("không phải LCD OEM" in page.locator("#archive-timeline-panel").inner_text(),
           "synthetic/OEM provenance disclaimer missing")
  def record(label,saveScreenshot=False):
   stable()
   row={"name":label,
     "finalStep":page.locator("#archive-timeline-range").input_value(),
     "modeSummary":page.locator("#archive-timeline-status").inner_text(),
     "canvasVisible":page.locator("#archive-timeline-canvas").is_visible(),
     "prefixHash":page.locator("#archive-timeline-canvas").get_attribute("data-prefix-hash"),
     "liveStateAndLCDRGBAUnchanged":True}
   if saveScreenshot:
    target=QA/("P28_STAGE_"+label.upper().replace("-","_")+"_V1_20261117.png")
    page.locator("#archive-timeline-panel").screenshot(path=str(target))
    proof["screenshots"][target.name]=sha(target)
    row["screenshotSHA256"]=sha(target)
   proof["cases"].append(row)

  for name in ["profile22-lf","profile22-dual","profile22-hf"]:
   item=load(name);verify_mode(item)
   require(page.locator("#archive-timeline-canvas").is_hidden(),
           "saved BZ preference must not mint historical pixels for "+name)
   require(page.locator("#archive-bz-viewer").is_hidden(),
           "P26 viewer must not draw inactive BZ mode "+name)
   if name=="profile22-dual":
    page.locator("#archive-timeline-prev").click()
    require("mode LF" in page.locator("#archive-timeline-status").inner_text(),
            "transitional DUAL mode incorrectly committed before ui-tick")
    page.locator("#archive-timeline-next").click()
    require("mode DUAL" in page.locator("#archive-timeline-status").inner_text(),
            "DUAL seek not restored")
   record(name,True)
  zoomHashes={}
  for name in ["profile22-lfzoom","profile22-hfzoom"]:
   item=load(name);verify_mode(item)
   require(page.locator("#archive-timeline-canvas").is_visible(),"active BZ synthetic pane missing")
   require(page.locator("#archive-timeline-canvas").get_attribute("data-bottom-fraction")=="0.75",
           "P23 classroom bottomFraction drift")
   full=canvas(page,"#archive-timeline-canvas")
   require(full["uniqueColors"]>4,"rendered BZ canvas unexpectedly blank")
   zoomHashes[name]=full["sha256"]
   page.locator("#archive-timeline-prev").click()
   require(page.locator("#archive-timeline-canvas").is_hidden(),
           "mode selection preview should not show active zoom pixels before commit")
   page.locator("#archive-timeline-next").click()
   require(canvas(page,"#archive-timeline-canvas")["sha256"]==full["sha256"],
           "same-mode revisited BZ raw RGBA SHA drift")
   record(name,True)
  require(zoomHashes["profile22-lfzoom"]!=zoomHashes["profile22-hfzoom"],
          "LF50/HF200 BZ must not accidentally share identical canvas pixel data")
  item=load("profile21-dual");verify_mode(item)
  require(page.locator("#archive-timeline-canvas").is_hidden(),
          "profile21 DUAL synthetic replay should not invent BZ")
  record("profile21-dual",True)
  load("profile22-dual","rejected","profile22-hfzoom")
  require(page.locator("#archive-timeline-panel").is_hidden() and
          page.locator("#archive-timeline-range").is_disabled(),
          "invalid sidecar did not reset timeline controls")
  require(page.locator("#archive-timeline-canvas").get_attribute("data-prefix-hash") is None,
          "invalid import kept old timeline source hash")
  require(canvas(page,"#archive-timeline-canvas")["uniqueColors"]==1,
          "invalid pair retained synthetic BZ canvas pixels")
  record("invalid-cross-sidecar")
  require(len(proof["httpBodies"])==52,"expected 52 exact stage source response paths")
  require(not proof["errors"],"Chrome JS/security/source response errors "+str(proof["errors"]))
  proof["liveOriginalLCDRGBA_SHA256"]=baseline["lcd"]
  page.close();browser.close();browser=None
except Exception:
 proof["errors"].append(traceback.format_exc())
finally:
 if browser:
  try:browser.close()
  except Exception as err:proof["errors"].append("BROWSER_CLEANUP "+str(err))
 if server:
  try:server.terminate();server.wait(timeout=8)
  except Exception:
   try:server.kill();server.wait(timeout=8)
   except Exception as err:proof["errors"].append("OWNED_QA_SERVER_CLEANUP "+str(err))
  proof["ownedQAServerExited"]=server.poll() is not None
 time.sleep(.2)
 proof["qaPortClosed"]=not listening(PORT)
 if not proof["qaPortClosed"]:proof["errors"].append("OWNED_QA_PORT_STILL_OPEN")
 proof["sourceBodiesCount"]=len(proof["httpBodies"])
 proof["sourcePathsSHA256"]={name:sha(STAGE/name) for name in [
    "web/app.mjs","web/index.html","web/styles.css",
    "web/fcv588-archive-bz-viewer.mjs","web/fcv588-archive-timeline.mjs",
    "test/fcv588-p28-mode-replay-matrix.test.mjs",
 ]}
 proof["status"]="PASS" if len(proof["cases"])==7 and not proof["errors"] and proof["qaPortClosed"] else "FAILED"
 with OUTPUT.open("x",encoding="utf8") as file:
  json.dump(proof,file,ensure_ascii=False,indent=2)
  file.write("\n")
 print(json.dumps({"status":proof["status"],"caseCount":len(proof["cases"]),
       "httpSourceSHA256Count":proof["sourceBodiesCount"],
       "errors":proof["errors"][:2],"qaPortClosed":proof["qaPortClosed"],
       "receiptSHA256":sha(OUTPUT)},ensure_ascii=True))
 if proof["status"]!="PASS":raise SystemExit(3)
