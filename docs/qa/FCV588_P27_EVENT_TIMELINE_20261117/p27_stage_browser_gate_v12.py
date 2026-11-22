import json,hashlib,os,pathlib,socket,subprocess,time,traceback
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(r"C:\Work\MoPhongMayTrenTau")
STAGE=ROOT/"staging/fcv588-p27-event-timeline-20261117"
QA=ROOT/"docs/qa/FCV588_P27_EVENT_TIMELINE_20261117"
P26=ROOT/"docs/qa/FCV588_P26_HISTORICAL_BZ_VIEWER_20261117"
Q24=ROOT/"docs/qa/FCV588_P24_ZOOM_ARCHIVE_SIDECAR_20261117"
PORT=4228
NODE=r"C:\nvm4w\nodejs\node.exe"
CHROME=r"C:\Program Files\Google\Chrome\Application\chrome.exe"
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def listening(port):
 with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as s:
  s.settimeout(.2)
  return s.connect_ex(("127.0.0.1",port))==0
def check(v,message):
 if not v:raise AssertionError(message)
def dataset(page,key):
 kebab="".join("-"+c.lower() if c.isupper() else c for c in key)
 return page.locator("#archive-replay-status").get_attribute("data-"+kebab)
def canvas_hash(page,selector):
 return page.evaluate("""async selector=>{
  const c=document.querySelector(selector);if(!c)return null;
  const ctx=c.getContext('2d');if(!ctx)return null;
  const bytes=ctx.getImageData(0,0,c.width,c.height).data;
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const hex=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  const colors=new Set();
  for(let i=0;i<bytes.length;i+=4)colors.add(bytes[i]+','+bytes[i+1]+','+bytes[i+2]);
  return {sha256:hex,width:c.width,height:c.height,colors:colors.size};
 }""",selector)
receipt={"schema":"FCV588_P27_STAGE_BROWSER_EVENT_TIMELINE_V12","status":"IN_PROGRESS",
 "root":str(STAGE),"qaPort":PORT,"cases":[],"httpBodies":{},"errors":[],"screenshots":{},
 "userServer4173Interaction":"NONE_BY_DESIGN_NOT_PROBED"}
owned=None
browser=None
try:
 check(not listening(PORT),"QA port 4228 occupied; leave it untouched")
 env=os.environ.copy();env["PORT"]=str(PORT)
 owned=subprocess.Popen([NODE,"tools/server.mjs"],cwd=STAGE,env=env,
  creationflags=subprocess.CREATE_NO_WINDOW,
  stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 for _ in range(55):
  if owned.poll() is not None:raise RuntimeError("owned QA server exited")
  if listening(PORT):break
  time.sleep(.1)
 check(listening(PORT),"isolated QA server not listening")
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=CHROME,
    args=["--no-first-run","--disable-background-networking"])
  page=browser.new_page(viewport={"width":1366,"height":768},locale="vi-VN")
  page.on("pageerror",lambda e:receipt["errors"].append("PAGE_ERROR "+str(e)))
  def source_check(request):
   try:
    u=urlparse(request.url)
    if u.hostname!="127.0.0.1" or u.port!=PORT:
     receipt["errors"].append("NONLOCAL_RESOURCE "+request.url);return
    route=u.path
    if route!="/" and not (route.startswith("/web/") or route.startswith("/src/")):
     receipt["errors"].append("OUTSIDE_ROUTE "+route);return
    local=STAGE/("web/index.html" if route=="/" else route.lstrip("/"))
    response=request.response()
    if not local.is_file() or response is None or response.status!=200:
     receipt["errors"].append("MISSING_ROUTE "+route);return
    h=hashlib.sha256(response.body()).hexdigest()
    if h!=sha(local):receipt["errors"].append("HTTP_SOURCE_SHA_DRIFT "+route)
    receipt["httpBodies"][route]=h
   except Exception as e:receipt["errors"].append("HTTP_PROBE "+str(e))
  page.on("requestfinished",source_check)
  page.goto(f"http://127.0.0.1:{PORT}/",wait_until="load",timeout=20000)
  page.wait_for_selector("#archive-timeline-range",state="attached",timeout=12000)
  # All teacher controls are operated on THIS isolated QA page only.
  page.locator("#btn-pause").click()
  baseline={i:page.locator(i).inner_text() for i in
   ("#mode-state","#tick-count","#event-count")}
  baseline["lcd"]=canvas_hash(page,"#echo-canvas")
  check(baseline["lcd"] and baseline["lcd"]["sha256"],"no baseline LCD pixel hash")
  def stable():
   for key in ("#mode-state","#tick-count","#event-count"):
    check(page.locator(key).inner_text()==baseline[key],"LIVE STATE CHANGED "+key)
   check(canvas_hash(page,"#echo-canvas")["sha256"]==baseline["lcd"]["sha256"],
      "LIVE LCD RGBA changed by archive/timeline UI")
  def record(label):
   stable()
   receipt["cases"].append({"name":label,"liveModeTickEventsAndLCDRGBAUnchanged":True,
    "archiveState":dataset(page,"state"),
    "step":page.locator("#archive-timeline-canvas").get_attribute("data-step"),
    "prefixHash":page.locator("#archive-timeline-canvas").get_attribute("data-prefix-hash"),
    "timelineVisible":page.locator("#archive-timeline-panel").is_visible(),
    "canvasVisible":page.locator("#archive-timeline-canvas").is_visible()})
  def load(envelope,sidecar,expected,contract=None):
   page.locator("#archive-envelope-file").set_input_files(str(envelope))
   page.locator("#archive-sidecar-file").set_input_files(str(sidecar))
   page.locator("#archive-replay-button").click()
   page.wait_for_function("(s)=>document.getElementById('archive-replay-status')?.dataset.state===s",
    arg=expected,timeout=18000)
   if expected=="pass":
    check(dataset(page,"contract")==contract,"wrong P24 declared contract")
    check(page.locator("#archive-timeline-panel").is_visible(),"P27 panel not shown")
   else:
    check(page.locator("#archive-timeline-panel").is_hidden(),"invalid input leaves old timeline")
    check(page.locator("#archive-replay-details").is_hidden(),"old archive details leaked")
    check(page.locator("#archive-timeline-prev").is_disabled(),"stale prev enabled")
    check(page.locator("#archive-timeline-next").is_disabled(),"stale next enabled")
    check(page.locator("#archive-timeline-range").is_disabled(),"stale range enabled")
    check(page.locator("#archive-timeline-canvas").get_attribute("data-prefix-hash") is None,
      "old timeline backing metadata leaked")
   stable()
  old=ROOT/"test/fixtures/P24_PINNED_PRE_P23_PROFILE22_ENVELOPE_20261117.json"
  oldside=Q24/"P24_FROZEN_PREP23_PROFILE22_LEGACY_SIDECAR_20261117.json"
  env=P26/"P26_SYNTHETIC_ACTIVE_BZ_PROFILE22_ENVELOPE_20261117.json"
  p04=P26/"P26_SYNTHETIC_ACTIVE_BZ_P04_TEST_ONLY_SIDECAR_20261117.json"
  p23=P26/"P26_SYNTHETIC_ACTIVE_BZ_P23_CLASSROOM_SIDECAR_20261117.json"
  prov=json.loads((P26/"P26_SYNTHETIC_ACTIVE_BZ_FIXTURE_PROVENANCE_20261117.json").read_text(encoding="utf8"))
  check(prov["status"]=="SYNTHETIC_TEST_ONLY_NOT_HISTORICAL_OEM" and not prov["sidecarP04HistoricalProvenance"],"P04 test-only sidecar provenance mislabeled")
  check(sha(env)==prov["fileSHA256"][env.name] and sha(p04)==prov["fileSHA256"][p04.name] and sha(p23)==prov["fileSHA256"][p23.name],"test-only pair SHA")
  load(old,oldside,"pass","P04_HISTORIC")
  check(page.locator("#archive-timeline-canvas").is_hidden(),"frozen historical LF fabricated timeline BZ")
  check(page.locator("#archive-bz-viewer").is_hidden(),"old LF archive fabricated P26 BZ")
  record("frozen_profile22_real_legacy_no_BZ")
  load(env,p04,"pass","P04_HISTORIC")
  check(page.locator("#archive-timeline-range").get_attribute("max")=="6" and
    page.locator("#archive-timeline-range").input_value()=="6","P04 timeline not at N=6")
  check(page.locator("#archive-timeline-canvas").is_visible(),"P04 final timeline BZ hidden")
  check(page.locator("#archive-timeline-canvas").get_attribute("data-bottom-fraction")=="0.5",
        "P04 fraction not .5")
  check("Không phải ảnh LCD OEM" in page.locator("#archive-timeline-panel").inner_text(),
        "missing disclaimer")
  oldHash=canvas_hash(page,"#archive-timeline-canvas")
  check(oldHash["colors"]>4,"P04 canvas blank")
  screen=QA/"P27_STAGE_TIMELINE_P04_TESTONLY_V12_20261117.png"
  page.locator("#archive-timeline-panel").screenshot(path=str(screen))
  receipt["screenshots"][screen.name]=sha(screen)
  receipt["P04FinalCanvasSHA256"]=oldHash["sha256"]
  record("P04_test_only_synthetic_active_BZ")
  load(env,p23,"pass","P23_LOWER_BOTTOM")
  check(page.locator("#archive-timeline-range").input_value()=="6","P23 timeline not at N=6")
  check(page.locator("#archive-timeline-canvas").get_attribute("data-bottom-fraction")=="0.75",
        "P23 fraction not .75")
  final=canvas_hash(page,"#archive-timeline-canvas")
  check(final["sha256"]!=oldHash["sha256"],"P04/P23 BZ canvas should differ")
  check(page.locator("#archive-timeline-canvas").get_attribute("data-prefix-hash")=="f0-fnv1a32-8e55e324","final per-step hash mismatch")
  screen=QA/"P27_STAGE_TIMELINE_P23_V12_20261117.png"
  page.locator("#archive-timeline-panel").screenshot(path=str(screen))
  receipt["screenshots"][screen.name]=sha(screen)
  receipt["P23FinalCanvasSHA256"]=final["sha256"]
  record("P23_synthetic_full_step6")
  page.locator("#archive-timeline-prev").click()
  check(page.locator("#archive-timeline-range").input_value()=="5","previous did not go to 5")
  check(page.locator("#archive-timeline-canvas").is_hidden(),"step5 should not be BZ")
  check(page.locator("#archive-timeline-canvas").get_attribute("data-projection-contract") is None,
    "step5 stale BZ metadata")
  record("previous_to_step5_no_BZ")
  page.locator("#archive-timeline-next").click()
  check(page.locator("#archive-timeline-range").input_value()=="6","next did not return to 6")
  check(canvas_hash(page,"#archive-timeline-canvas")["sha256"]==final["sha256"],
    "step6 not deterministically restored")
  record("next_to_step6_identical_pixels")
  page.evaluate("""() => {
    const el=document.getElementById('archive-timeline-range');
    el.value="0";el.dispatchEvent(new Event('change',{bubbles:true}));
  }""")
  check(page.locator("#archive-timeline-range").input_value()=="0","range seek 0 failed")
  check(page.locator("#archive-timeline-canvas").is_hidden(),"step0 cannot show BZ")
  check(page.locator("#archive-timeline-prev").is_disabled(),"prev enabled at zero")
  record("range_seek_zero_initial")
  page.evaluate("""() => {
    const el=document.getElementById('archive-timeline-range');
    el.value="6";el.dispatchEvent(new Event('change',{bubbles:true}));
  }""")
  check(canvas_hash(page,"#archive-timeline-canvas")["sha256"]==final["sha256"],
        "seeking back to final changed canvas RGBA")
  record("range_seek_final_deterministic")
  load(old,p23,"rejected")
  check(canvas_hash(page,"#archive-timeline-canvas")["colors"]<=2,"invalid import retained raster bytes")
  record("mismatched_sidecar_resets_timeline")
  page.locator("#archive-envelope-file").set_input_files({"name":"huge.json",
    "mimeType":"application/json","buffer":b" "*(1048576+1)})
  page.locator("#archive-sidecar-file").set_input_files(str(p23))
  page.locator("#archive-replay-button").click()
  page.wait_for_function("document.getElementById('archive-replay-status')?.dataset.state==='rejected'",timeout=12000)
  check(page.locator("#archive-timeline-panel").is_hidden(),"oversize retained viewer")
  stable()
  record("oversize_rejected")
  page.evaluate("""() => {
    const old=File.prototype.text;
    File.prototype.text=function(){
      if(this.name==="unreadable.json")
        return Promise.reject(new Error('NotReadableError <img src=x onerror=alert(1)>'));
      return old.call(this);
    };
  }""")
  page.locator("#archive-envelope-file").set_input_files({"name":"unreadable.json",
    "mimeType":"application/json","buffer":b"{}"})
  page.locator("#archive-sidecar-file").set_input_files(str(p23))
  page.locator("#archive-replay-button").click()
  page.wait_for_function("document.getElementById('archive-replay-status')?.dataset.state==='rejected'",timeout=12000)
  check(page.locator("#archive-replay-panel img").count()==0,"hostile error HTML became DOM")
  check(not page.locator("#archive-replay-button").is_disabled(),"file read did not reenable button")
  check(page.locator("#archive-timeline-panel").is_hidden(),"File.text error retained timeline")
  record("File_text_error_HTML_literal")
  check(len(receipt["httpBodies"])>=52,"expected all P27 source routes")
  required={"/web/fcv588-archive-timeline.mjs","/web/fcv588-archive-bz-viewer.mjs",
    "/web/app.mjs","/src/devices/fcv588/archive-compat.mjs"}
  check(required.issubset(receipt["httpBodies"]),"P27 source modules missing from browser")
  check(not receipt["errors"],"Chrome/source errors "+str(receipt["errors"]))
  receipt["liveLCDOriginalSHA256"]=baseline["lcd"]["sha256"]
  page.close()
  browser.close()
  browser=None
except Exception:
 receipt["errors"].append(traceback.format_exc())
finally:
 # sync_playwright context owns its browser cleanup
 if owned:
  try:owned.terminate();owned.wait(timeout=7)
  except Exception:
   try:owned.kill();owned.wait(timeout=7)
   except Exception as e:receipt["errors"].append("OWNED_QA_SERVER_CLEANUP "+str(e))
  receipt["ownedServerExited"]=owned.poll() is not None
 time.sleep(.2)
 receipt["qaPortClosed"]=not listening(PORT)
 if not receipt["qaPortClosed"]:receipt["errors"].append("OWNED_QA_PORT_STILL_OPEN")
 receipt["sourceBodiesCount"]=len(receipt["httpBodies"])
 receipt["sourceSHA256"]={n:sha(STAGE/n) for n in [
  "web/app.mjs","web/index.html","web/styles.css",
  "web/fcv588-archive-bz-viewer.mjs","web/fcv588-archive-timeline.mjs",
  "test/fcv588-p27-archive-timeline.test.mjs"]}
 receipt["status"]="PASS" if len(receipt["cases"])==10 and not receipt["errors"] and receipt["qaPortClosed"] else "FAILED"
 path=QA/"P27_STAGE_BROWSER_V12_20261117.json"
 with path.open("x",encoding="utf8") as f:json.dump(receipt,f,indent=2,ensure_ascii=False);f.write("\n")
 print(json.dumps({"status":receipt["status"],"cases":len(receipt["cases"]),"httpSHA":receipt["sourceBodiesCount"],
  "errors":receipt["errors"][:2],"qaPortClosed":receipt["qaPortClosed"],"receiptSHA256":sha(path)},ensure_ascii=True))
 if receipt["status"]!="PASS":raise SystemExit(3)
