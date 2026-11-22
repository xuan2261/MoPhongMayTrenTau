import json,hashlib,os,pathlib,socket,subprocess,time,traceback
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(r"C:\Work\MoPhongMayTrenTau")
STAGE=ROOT/"staging/fcv588-p25-offline-archive-ui-20261117"
QA=ROOT/"docs/qa/FCV588_P25_OFFLINE_ARCHIVE_UI_20261117"
Q24=ROOT/"docs/qa/FCV588_P24_ZOOM_ARCHIVE_SIDECAR_20261117"
PORT=4226
CHROME=r"C:\Program Files\Google\Chrome\Application\chrome.exe"
NODE=r"C:\nvm4w\nodejs\node.exe"
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def is_listening(port):
 with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as s:
  s.settimeout(0.18)
  return s.connect_ex(("127.0.0.1",port))==0
def require(ok,msg):
 if not ok:raise AssertionError(msg)
def data(page,name):
 kebab="".join(("-"+c.lower()) if c.isupper() else c for c in name)
 return page.locator("#archive-replay-status").get_attribute("data-"+kebab)
receipt={"schema":"FCV588_P25_STAGE_OFFLINE_ARCHIVE_BROWSER_V3",
 "status":"IN_PROGRESS","qaPort":PORT,"sourceRoot":str(STAGE),"cases":[],
 "sourceBodies":{},"errors":[],"screenshots":{}}
owned=None
browser=None
try:
 require(not is_listening(PORT),"QA PORT BUSY, DO NOT TOUCH")
 env=os.environ.copy();env["PORT"]=str(PORT)
 owned=subprocess.Popen([NODE,"tools/server.mjs"],cwd=STAGE,env=env,
  stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW)
 for _ in range(50):
  if owned.poll() is not None:raise RuntimeError("owned QA server exited prematurely")
  if is_listening(PORT):break
  time.sleep(0.1)
 require(is_listening(PORT),"isolated QA server did not listen")
 with sync_playwright() as playwright:
  browser=playwright.chromium.launch(executable_path=CHROME,headless=True,
   args=["--no-first-run","--disable-background-networking"])
  page=browser.new_page(viewport={"width":1366,"height":768},locale="vi-VN")
  page.on("pageerror",lambda error:receipt["errors"].append("PAGE_ERROR "+str(error)))
  def on_finished(request):
   try:
    u=urlparse(request.url)
    if u.hostname!="127.0.0.1" or u.port!=PORT:
     receipt["errors"].append("NONLOCAL_HTTP "+request.url);return
    path=u.path
    rel="web/index.html" if path=="/" else path.removeprefix("/")
    allowed=(path=="/" or path.startswith("/web/") or path.startswith("/src/"))
    if not allowed:
     receipt["errors"].append("OUTSIDE_STATIC_ROUTE "+path);return
    source=STAGE/rel
    response=request.response()
    if not source.is_file() or response is None or response.status!=200:
     receipt["errors"].append("SOURCE_LOAD_MISSING "+path);return
    actual=hashlib.sha256(response.body()).hexdigest()
    expected=sha(source)
    if actual!=expected:receipt["errors"].append("HTTP_BODY_SHA_DRIFT "+path)
    receipt["sourceBodies"][path]=actual
   except Exception as e:
    receipt["errors"].append("LOAD_PROBE "+str(e))
  page.on("requestfinished",on_finished)
  page.goto(f"http://127.0.0.1:{PORT}/",wait_until="load",timeout=20000)
  page.wait_for_selector("#archive-replay-button",timeout=15000)
  page.locator("#btn-pause").click()
  baseline=tuple(page.locator(i).inner_text() for i in ["#mode-state","#tick-count","#event-count"])
  def stable():
   require(tuple(page.locator(i).inner_text() for i in ["#mode-state","#tick-count","#event-count"])==baseline,
     "archive import mutated or advanced the live classroom state")
  def load(envelope,sidecar,expected,contract=None,hash_expected=None):
   page.locator("#archive-envelope-file").set_input_files(str(envelope))
   page.locator("#archive-sidecar-file").set_input_files(str(sidecar))
   page.locator("#archive-replay-button").click()
   page.wait_for_function("(s)=>document.getElementById('archive-replay-status')?.dataset.state===s",
     arg=expected,timeout=12000)
   stable()
   require(data(page,"state")==expected,"wrong result state")
   if expected=="pass":
    require(data(page,"contract")==contract,"wrong archive sidecar contract")
    require(data(page,"sessionHash")==hash_expected,"wrong exact replay hash")
    require(page.locator("#archive-replay-details").is_visible(),"archive details hidden")
   else:
    require(data(page,"contract") is None and data(page,"sessionHash") is None,
     "stale success leaked into rejected result")
    require(not page.locator("#archive-replay-details").is_visible(),
     "old details leaked through rejection")
   receipt["cases"].append({"state":expected,"contract":data(page,"contract"),
     "sessionHash":data(page,"sessionHash"),"liveUnchanged":True})
  old=ROOT/"test/fixtures/P24_PINNED_PRE_P23_PROFILE22_ENVELOPE_20261117.json"
  oldside=Q24/"P24_FROZEN_PREP23_PROFILE22_LEGACY_SIDECAR_20261117.json"
  now=Q24/"P24_SAMPLE_CURRENT_PROFILE22_BZ_ENVELOPE_20261117.json"
  nowside=Q24/"P24_SAMPLE_CURRENT_PROFILE22_BZ_SIDECAR_20261117.json"
  load(old,oldside,"pass","P04_HISTORIC","f0-fnv1a32-a429fc78")
  require(data(page,"profileRevision")=="F1-public-reference-22","old profile revision")
  load(now,nowside,"pass","P23_LOWER_BOTTOM","f0-fnv1a32-1ed9e57e")
  fraction=data(page,"bottomFraction")
  require(fraction is not None and abs(float(fraction)-0.75)<1e-9,"BZ lower fraction not selected")
  require(page.locator("#archive-zoom-track").is_visible(),"BZ instructor schematic not shown")
  screenshot=QA/"P25_STAGE_CURRENT_BZ_ARCHIVE_V3_20261117.png"
  page.locator("#archive-replay-panel").screenshot(path=str(screenshot))
  receipt["screenshots"][screenshot.name]=sha(screenshot)
  load(old,nowside,"rejected")
  require("REJECTED" in page.locator("#archive-replay-status").inner_text(),"rejected feedback absent")
  screenshot=QA/"P25_STAGE_INVALID_ARCHIVE_V3_20261117.png"
  page.locator("#archive-replay-panel").screenshot(path=str(screenshot))
  receipt["screenshots"][screenshot.name]=sha(screenshot)
  page.locator("#archive-envelope-file").set_input_files({"name":"too-large.json",
    "mimeType":"application/json","buffer":b" "*(1024*1024+1)})
  page.locator("#archive-sidecar-file").set_input_files(str(nowside))
  page.locator("#archive-replay-button").click()
  page.wait_for_function("document.getElementById('archive-replay-status')?.dataset.state==='rejected'",timeout=12000)
  require("dung lượng" in page.locator("#archive-replay-status").inner_text(),"oversize not rejected before read")
  stable()
  receipt["cases"].append({"state":"rejected","reason":"oversize-before-read","liveUnchanged":True})
  # Browser-only fault injection: simulate File.text() NotReadableError with
  # malicious HTML in its message. Only the parser is faulted; app API runs as-is.
  page.evaluate("""() => {
    const base=File.prototype.text;
    File.prototype.text=function(){
      if(this.name==="unreadable.json")
        return Promise.reject(new Error('NotReadableError <img src=x onerror=alert(1)>'));
      return base.call(this);
    };
  }""")
  page.locator("#archive-envelope-file").set_input_files({"name":"unreadable.json",
    "mimeType":"application/json","buffer":b"{}"})
  page.locator("#archive-sidecar-file").set_input_files(str(nowside))
  page.locator("#archive-replay-button").click()
  page.wait_for_function("document.getElementById('archive-replay-status')?.dataset.state==='rejected'",timeout=12000)
  require("NotReadableError <img src=x onerror=alert(1)>" in page.locator("#archive-replay-status").inner_text(),
    "File.text error text was not delivered as literal DOM text")
  require(page.locator("#archive-replay-panel img").count()==0,
    "untrusted error HTML was injected as image")
  require(not page.locator("#archive-replay-button").is_disabled(),"file read reject did not re-enable button")
  require(data(page,"sessionHash") is None and data(page,"contract") is None,
    "file read rejection retained stale success")
  require(not page.locator("#archive-replay-details").is_visible(),
    "file read rejection retained stale details")
  stable()
  receipt["cases"].append({"state":"rejected","reason":"File.text NotReadableError+HTML literal",
    "liveUnchanged":True})
  require("/src/devices/fcv588/archive-compat.mjs" in receipt["sourceBodies"],
    "P24 canonical source import not browser-loaded in stage")
  require("/web/fcv588-archive-import.mjs" in receipt["sourceBodies"],
    "P25 imported module not browser-loaded")
  require(not receipt["errors"],"browser errors: "+str(receipt["errors"]))
  page.close()
  browser.close()
  browser=None
except Exception:
 receipt["errors"].append(traceback.format_exc())
finally:
 # sync_playwright context owns the browser lifetime; no second cleanup call
 if owned:
  try:
   owned.terminate();owned.wait(timeout=7)
  except Exception:
   try:owned.kill();owned.wait(timeout=7)
   except Exception as error:receipt["errors"].append("OWNED_SERVER_CLEANUP "+str(error))
  receipt["ownedServerExited"]=owned.poll() is not None
 time.sleep(.2)
 receipt["qaPortClosed"]=not is_listening(PORT)
 if not receipt["qaPortClosed"]:receipt["errors"].append("OWNED_QA_PORT_STILL_OPEN")
 receipt["status"]="PASS" if len(receipt["cases"])==5 and not receipt["errors"] and receipt.get("qaPortClosed") else "FAILED"
 receipt["sourceBodiesCount"]=len(receipt["sourceBodies"])
 receipt["changesAppliedToCanonical"]=False
 receipt["liveUserServerTouched"]=False
 receipt["sourceSHA256"]={rel:sha(STAGE/rel) for rel in [
  "web/app.mjs","web/index.html","web/styles.css","web/fcv588-archive-import.mjs"]}
 out=QA/"P25_STAGE_BROWSER_V3_20261117.json"
 with out.open("x",encoding="utf8") as f:json.dump(receipt,f,indent=2,ensure_ascii=False);f.write("\n")
 print(json.dumps({"status":receipt["status"],"cases":len(receipt["cases"]),
   "httpBodies":receipt["sourceBodiesCount"],"errors":receipt["errors"][:2],
   "portClosed":receipt["qaPortClosed"],"receiptSHA256":sha(out)},ensure_ascii=False))
 if receipt["status"]!="PASS":raise SystemExit(3)
