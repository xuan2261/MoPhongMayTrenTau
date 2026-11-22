import json,hashlib,os,pathlib,socket,subprocess,time,traceback
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(r"C:\Work\MoPhongMayTrenTau")
STAGE=ROOT/"staging/fcv588-p26-historical-bz-viewer-20261117"
QA=ROOT/"docs/qa/FCV588_P26_HISTORICAL_BZ_VIEWER_20261117"
Q24=ROOT/"docs/qa/FCV588_P24_ZOOM_ARCHIVE_SIDECAR_20261117"
PORT=4227
NODE=r"C:\nvm4w\nodejs\node.exe"
CHROME=r"C:\Program Files\Google\Chrome\Application\chrome.exe"
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def listen(port):
 with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as c:
  c.settimeout(0.18)
  return c.connect_ex(("127.0.0.1",port))==0
def check(cond,msg):
 if not cond:raise AssertionError(msg)
def data(page,name):
 kebab="".join("-"+x.lower() if x.isupper() else x for x in name)
 return page.locator("#archive-replay-status").get_attribute("data-"+kebab)
def canvas_sha(page, selector, region=None):
 return page.evaluate("""async ({selector,region})=>{
   const c=document.querySelector(selector);if(!c)return null;
   const ctx=c.getContext('2d');if(!ctx)return null;
   const [x,y,w,h]=region??[0,0,c.width,c.height];
   const bytes=ctx.getImageData(x,y,w,h).data;
   const digest=await crypto.subtle.digest('SHA-256',bytes);
   const hex=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
   const colors=new Set();
   for(let i=0;i<bytes.length;i+=388)colors.add(bytes[i]+','+bytes[i+1]+','+bytes[i+2]);
   return {sha256:hex,width:c.width,height:c.height,sampledColors:colors.size};
 }""",{"selector":selector,"region":region})
receipt={
 "schema":"FCV588_P26_STAGE_BZ_CANVAS_CHROME_V2",
 "status":"IN_PROGRESS","port":PORT,"root":str(STAGE),
 "cases":[],"httpBodies":{},"errors":[],"screenshots":{},
 "userServer4173Interaction":"NONE_BY_DESIGN_NOT_PROBED",
 "observedSourceClass":"SYNTHETIC_TRAINING_ONLY"}
server=None;browser=None
try:
 check(not listen(PORT),"QA port busy, refuse to touch")
 env=os.environ.copy();env["PORT"]=str(PORT)
 server=subprocess.Popen([NODE,"tools/server.mjs"],cwd=STAGE,
  env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,
  creationflags=subprocess.CREATE_NO_WINDOW)
 for _ in range(60):
  if server.poll() is not None:raise RuntimeError("QA server exited")
  if listen(PORT):break
  time.sleep(.1)
 check(listen(PORT),"isolated QA server did not start")
 with sync_playwright() as playwright:
  browser=playwright.chromium.launch(executable_path=CHROME,headless=True,
   args=["--no-first-run","--disable-background-networking"])
  page=browser.new_page(viewport={"width":1366,"height":768},locale="vi-VN")
  page.on("pageerror",lambda e:receipt["errors"].append("PAGE_ERROR "+str(e)))
  def observe_request(request):
   try:
    url=urlparse(request.url)
    if url.hostname!="127.0.0.1" or url.port!=PORT:
     receipt["errors"].append("NONLOCAL_RESOURCE "+request.url);return
    route=url.path
    if route!="/" and not (route.startswith("/src/") or route.startswith("/web/")):
     receipt["errors"].append("INVALID_ROUTE "+route);return
    rel="web/index.html" if route=="/" else route.lstrip("/")
    path=STAGE/rel
    response=request.response()
    if not path.is_file() or response is None or response.status!=200:
     receipt["errors"].append("MISSING_HTTP_BODY "+route);return
    h=hashlib.sha256(response.body()).hexdigest()
    if h!=sha(path):receipt["errors"].append("HTTP_SHA_MISMATCH "+route)
    receipt["httpBodies"][route]=h
   except Exception as e:receipt["errors"].append("HTTP_PROBE "+str(e))
  page.on("requestfinished",observe_request)
  page.goto(f"http://127.0.0.1:{PORT}/",wait_until="load",timeout=25000)
  page.wait_for_selector("#archive-replay-button",timeout=10000)
  page.locator("#btn-pause").click() # isolated QA page only, never user server
  # Freeze synthetic ticks in the owned isolated QA page (not the user session).
  baseline={"mode":page.locator("#mode-state").inner_text(),
    "tick":page.locator("#tick-count").inner_text(),
    "events":page.locator("#event-count").inner_text(),
    "LCD":canvas_sha(page,"#echo-canvas")}
  check(baseline["LCD"] and baseline["LCD"]["sha256"],"live LCD no pixels")
  def stable():
   check(page.locator("#mode-state").inner_text()==baseline["mode"],"live mode mutated")
   check(page.locator("#tick-count").inner_text()==baseline["tick"],"live tick mutated")
   check(page.locator("#event-count").inner_text()==baseline["events"],"live events mutated")
   check(canvas_sha(page,"#echo-canvas")["sha256"]==baseline["LCD"]["sha256"],
    "live LCD raw RGBA mutated")
  def load(envelope,sidecar,expected,contract=None,hash_expected=None):
   page.locator("#archive-envelope-file").set_input_files(str(envelope))
   page.locator("#archive-sidecar-file").set_input_files(str(sidecar))
   page.locator("#archive-replay-button").click()
   page.wait_for_function("(status)=>document.getElementById('archive-replay-status')?.dataset.state===status",
    arg=expected,timeout=18000)
   stable()
   check(data(page,"state")==expected,"wrong status")
   if expected=="pass":
    check(data(page,"contract")==contract,"wrong declared contract")
    check(data(page,"sessionHash")==hash_expected,"wrong archive replay hash")
    check(page.locator("#archive-replay-details").is_visible(),"archive details hidden")
   else:
    check(data(page,"contract") is None and data(page,"sessionHash") is None,
     "stale archive success metadata")
    check(page.locator("#archive-bz-viewer").is_hidden(),"invalid view still visible")
    check(page.locator("#archive-replay-details").is_hidden(),"invalid archive details still visible")
    check(page.locator("#archive-bz-canvas").get_attribute("data-projection-contract") is None,
     "stale canvas metadata")
   receipt["cases"].append({"status":expected,"contract":data(page,"contract"),
    "liveModeTickEventAndLcdPixelsUnchanged":True})
  old=ROOT/"test/fixtures/P24_PINNED_PRE_P23_PROFILE22_ENVELOPE_20261117.json"
  oldside=Q24/"P24_FROZEN_PREP23_PROFILE22_LEGACY_SIDECAR_20261117.json"
  current=Q24/"P24_SAMPLE_CURRENT_PROFILE22_BZ_ENVELOPE_20261117.json"
  compare=QA/"P26_SYNTHETIC_BZ_P04_COMPARISON_SIDECAR_20261117.json"
  currentSide=Q24/"P24_SAMPLE_CURRENT_PROFILE22_BZ_SIDECAR_20261117.json"
  check(sha(old)=="a48c56d3856daebad17dedd919d99e80def1c515b9898d77c1c245ee9e69487d","old source fixture SHA")
  check(sha(current)=="6124b4f896abbce80c6423253b264a88c07520cb1a57578c60383c2fbf8b84bd","current source SHA")
  check(sha(compare)=="5aa4656c77a5d9dbca2217bbfc5ccfa23b294fb66a621924cfc760ad37041c1f","comparison SHA")
  # TRUE pre-P23 archived profile22 is LF, not BZ; never invent old pixels.
  load(old,oldside,"pass","P04_HISTORIC","f0-fnv1a32-a429fc78")
  check(page.locator("#archive-bz-viewer").is_hidden(),"genuine nonBZ historic archive fabricated viewer")
  check(data(page,"bottomFraction") is None,"nonBZ produced fake bottom fraction")
  check("không chọn Bottom Zoom" in page.locator("#archive-replay-zoom-summary").inner_text(),
    "missing nonBZ explanation")
  # Test-only P04 sidecar for SAME current synthetic BZ envelope (not historic).
  load(current,compare,"pass","P04_HISTORIC","f0-fnv1a32-1ed9e57e")
  check(page.locator("#archive-bz-viewer").is_visible(),"P04 synthetic canvas hidden")
  check(data(page,"bottomFraction")=="0.5","P04 selected fraction not 0.5")
  check(page.locator("#archive-bz-canvas").get_attribute("data-projection-contract")=="P04_HISTORIC",
    "P04 canvas contract missing")
  a=canvas_sha(page,"#archive-bz-canvas")
  azoom=canvas_sha(page,"#archive-bz-canvas",[8,27,199,202])
  anorm=canvas_sha(page,"#archive-bz-canvas",[225,27,199,202])
  check(a["width"]==432 and a["height"]==256 and a["sampledColors"]>4,
    "P04 canvas empty or wrong geometry")
  receipt["cases"][-1].update({"viewerSHA256":a["sha256"],"zoomPaneSHA256":azoom["sha256"],
    "normalPaneSHA256":anorm["sha256"],"fraction":.5,
    "provenance":"TEST_ONLY_SYNTHETIC_P04_NOT_HISTORIC"})
  screen=QA/"P26_STAGE_P04_SYNTHETIC_VIEWER_V2_20261117.png"
  page.locator("#archive-bz-viewer").screenshot(path=str(screen))
  receipt["screenshots"][screen.name]=sha(screen)
  # Same exact event bytes, P23 sidecar -> lower bottom, normal pane unchanged.
  load(current,currentSide,"pass","P23_LOWER_BOTTOM","f0-fnv1a32-1ed9e57e")
  check(page.locator("#archive-bz-viewer").is_visible(),"P23 synthetic canvas hidden")
  check(data(page,"bottomFraction")=="0.75","P23 selected fraction not 0.75")
  check(page.locator("#archive-bz-canvas").get_attribute("data-projection-contract")=="P23_LOWER_BOTTOM",
    "P23 canvas contract missing")
  b=canvas_sha(page,"#archive-bz-canvas")
  bzoom=canvas_sha(page,"#archive-bz-canvas",[8,27,199,202])
  bnorm=canvas_sha(page,"#archive-bz-canvas",[225,27,199,202])
  check(b["width"]==432 and b["height"]==256 and b["sampledColors"]>4,
    "P23 canvas empty or wrong geometry")
  check(azoom["sha256"]!=bzoom["sha256"],
    "zoom visual pixels did NOT respond to explicit P04/P23 contract")
  check(anorm["sha256"]==bnorm["sha256"],
    "normal pane changed even though archive envelope was identical")
  receipt["cases"][-1].update({"viewerSHA256":b["sha256"],"zoomPaneSHA256":bzoom["sha256"],
    "normalPaneSHA256":bnorm["sha256"],"fraction":.75,
    "provenance":"CURRENT_SYNTHETIC_P23_NOT_OEM"})
  screen=QA/"P26_STAGE_P23_SYNTHETIC_VIEWER_V2_20261117.png"
  page.locator("#archive-bz-viewer").screenshot(path=str(screen))
  receipt["screenshots"][screen.name]=sha(screen)
  load(old,currentSide,"rejected")
  page.locator("#archive-envelope-file").set_input_files({
    "name":"oversize.json","mimeType":"application/json","buffer":b" "*(1024*1024+1)})
  page.locator("#archive-sidecar-file").set_input_files(str(currentSide))
  page.locator("#archive-replay-button").click()
  page.wait_for_function("document.getElementById('archive-replay-status')?.dataset.state==='rejected'",timeout=15000)
  check("dung lượng" in page.locator("#archive-replay-status").inner_text(),
    "oversize not rejected before File.text")
  stable()
  check(page.locator("#archive-bz-viewer").is_hidden(),"oversize left stale BZ viewer")
  receipt["cases"].append({"status":"rejected","reason":"oversize-before-read",
    "liveModeTickEventAndLcdPixelsUnchanged":True})
  # Simulated browser File.text NotReadableError carrying hostile HTML literal:
  page.evaluate("""() => {
    const original=File.prototype.text;
    File.prototype.text=function(){
      if(this.name==="unreadable.json")
        return Promise.reject(new Error('NotReadableError <img src=x onerror=alert(1)>'));
      return original.call(this);
    };
  }""")
  page.locator("#archive-envelope-file").set_input_files({
    "name":"unreadable.json","mimeType":"application/json","buffer":b"{}"})
  page.locator("#archive-sidecar-file").set_input_files(str(currentSide))
  page.locator("#archive-replay-button").click()
  page.wait_for_function("document.getElementById('archive-replay-status')?.dataset.state==='rejected'",timeout=15000)
  stable()
  check("NotReadableError <img src=x onerror=alert(1)>" in page.locator("#archive-replay-status").inner_text(),
    "error text missing or escaped wrongly")
  check(page.locator("#archive-replay-panel img").count()==0,
    "hostile HTML image injected into DOM")
  check(not page.locator("#archive-replay-button").is_disabled(),
    "button not re-enabled after file error")
  check(page.locator("#archive-bz-viewer").is_hidden(),"stale canvas visible after File.text error")
  receipt["cases"].append({"status":"rejected","reason":"file-read-HTML-literal",
    "liveModeTickEventAndLcdPixelsUnchanged":True})
  required={
    "/web/app.mjs","/web/fcv588-archive-import.mjs",
    "/web/fcv588-archive-bz-viewer.mjs",
    "/src/devices/fcv588/archive-compat.mjs",
    "/src/devices/fcv588/echo-projection.mjs"}
  check(required.issubset(set(receipt["httpBodies"])),"missing required source requests")
  check(len(receipt["httpBodies"])>=50,"too few source HTTP bodies")
  check(not receipt["errors"],"browser page/source errors "+str(receipt["errors"]))
  receipt["baselineLCDPixelSHA256"]=baseline["LCD"]["sha256"]
  page.close()
  browser.close()
  browser=None
except Exception:
 receipt["errors"].append(traceback.format_exc())
finally:
 if server:
  try:server.terminate();server.wait(timeout=7)
  except Exception:
   try:server.kill();server.wait(timeout=7)
   except Exception as e:receipt["errors"].append("QA_OWNED_SERVER_CLEANUP "+str(e))
  receipt["ownedServerTerminated"]=server.poll() is not None
 time.sleep(.2)
 receipt["qaPortClosed"]=not listen(PORT)
 if not receipt["qaPortClosed"]:receipt["errors"].append("QA_PORT_STILL_OPEN")
 receipt["loadedSourceBodiesCount"]=len(receipt["httpBodies"])
 receipt["stageSourceSHA256"]={name:sha(STAGE/name) for name in [
  "web/app.mjs","web/index.html","web/styles.css",
  "web/fcv588-archive-bz-viewer.mjs","test/fcv588-p26-archive-bz-viewer.test.mjs"]}
 receipt["status"]="PASS" if len(receipt["cases"])==6 and not receipt["errors"] and receipt["qaPortClosed"] else "FAILED"
 out=QA/"P26_STAGE_BROWSER_V2_20261117.json"
 with out.open("x",encoding="utf8") as f:json.dump(receipt,f,ensure_ascii=False,indent=2);f.write("\n")
 print(json.dumps({"status":receipt["status"],"cases":len(receipt["cases"]),
  "sourceBodies":receipt["loadedSourceBodiesCount"],
  "errors":receipt["errors"][:2],
  "qaPortClosed":receipt["qaPortClosed"],
  "receiptSHA256":sha(out)},ensure_ascii=False))
 if receipt["status"]!="PASS":raise SystemExit(4)
