"""P15 bounded real Chrome 7-mode/3-viewport and 3-zoom matrix.
QA only: no canonical source edit, no OEM assets copied to web, owns port 4216.
"""
import json,sys,os,re,hashlib,subprocess,traceback
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=Path(__file__).resolve().parent
PORT=4216
BASE=f"http://127.0.0.1:{PORT}"
MODES=["NAV1","LF-ZOOM","LF","DUAL","HF","HF-ZOOM","NAV2"]
VIEWS=[(375,812),(1366,768),(1920,1080)]
ZOOMS=["Bottom Lock","Bottom Zoom","Marker Zoom"]
RESULT={"schema":"FCV588_P15_CHROME_MODE_GEOMETRY_V1","scope":"BOUNDED_SYNTHETIC_NO_OEM_PIXEL_CLAIM","canonicalRoot":str(ROOT),"testOwnedPort":PORT,"screenshots":[],"views":[],"zoomCases":[],"checks":[],"errors":[],"httpBodies":[],"jpegRoutes":[],"pageErrors":[],"networkExternal":[]}

def digest(b):return hashlib.sha256(b).hexdigest()
def check(test,label):
 RESULT["checks"].append({"name":label,"pass":bool(test)})
 if not test:RESULT["errors"].append(label)
def bounds(page,selector):
 r=page.locator(selector).bounding_box()
 if r is None:return None
 return {k:round(v,3) for k,v in r.items()}
def addshot(page,label,viewport):
 path=QA/("P15_V2_"+label+"_"+str(viewport[0])+"x"+str(viewport[1])+"_20261116.png")
 page.locator(".device-frame").screenshot(path=str(path),timeout=15000)
 record={"file":str(path),"name":path.name,"sha256":digest(path.read_bytes()),"bytes":path.stat().st_size,"viewport":list(viewport),"label":label}
 RESULT["screenshots"].append(record)
 return record

def boot(page):
 page.locator("#key-power").click()
 for _ in range(4):page.locator("#btn-step").click()
 page.locator("#btn-pause").click()
 check("POWER OFF" not in page.locator("#status-line").inner_text(),"boot turns on synthetic training session")

def choose_mode(page,target):
 assert target in MODES
 current=page.locator("#mode-state").inner_text().strip()
 if current==target:return current
 assert current in MODES,(current,target)
 i,j=MODES.index(current),MODES.index(target)
 forward=(j-i)%len(MODES);backward=(i-j)%len(MODES)
 key="ArrowRight" if forward<=backward else "ArrowLeft"
 page.locator("#mode-knob").focus()
 for _ in range(min(forward,backward)):page.keyboard.press(key)
 # UI-time elapses in the reducer, not a synthetic world-sensor source.
 page.clock.run_for(6500)
 observed=page.locator("#mode-state").inner_text().strip()
 check(observed==target,f"mode {current}->{target} commits after UI timeout")
 return observed

def record_network(page,response_rows):
 def done(request):
  response=request.response()
  if response is None:return
  url=urlparse(response.url)
  if url.netloc!=f"127.0.0.1:{PORT}":
   RESULT["networkExternal"].append(response.url);return
  path=url.path
  if response.status!=200:return
  if path=="/":local=ROOT/"web/index.html"
  elif path.startswith("/web/"):local=ROOT/"web"/path[5:]
  elif path.startswith("/src/"):local=ROOT/"src"/path[5:]
  else:return
  try:
   data=response.body();expected=local.read_bytes() if local.is_file() else b""
   response_rows.append({"path":path,"httpStatus":200,"hash":digest(data),"match":data==expected and local.is_file()})
  except Exception as ex:response_rows.append({"path":path,"error":str(ex),"match":False})
 page.on("requestfinished",done)
 page.on("pageerror",lambda error:RESULT["pageErrors"].append(str(error)))


def inspect_view(page,viewport):
 face=bounds(page,".device-frame");equip=bounds(page,".equipment");lcd=bounds(page,"#lcd")
 housing=bounds(page,".display-housing");ctrl=bounds(page,".controls")
 geometry={"frame":face,"equipment":equip,"lcd":lcd,"housing":housing,"controls":ctrl,
  "mobileTrainingNoteVisible":page.locator(".mobile-training-note").is_visible(),
  "horizontalScrollPx":page.evaluate("Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth"),
  "canvasWidth":page.locator("#echo-canvas").get_attribute("width"),
  "canvasHeight":page.locator("#echo-canvas").get_attribute("height")}
 check(all(x is not None for x in (face,equip,lcd,housing,ctrl)),f"{viewport} physical DOM geometry exists")
 check(geometry["canvasWidth"]=="480" and geometry["canvasHeight"]=="640",f"{viewport} logical LCD canvas 480x640")
 check(abs(lcd["width"]/lcd["height"]-128/171)<.025,f"{viewport} LCD screen design ratio 128:171")
 check(geometry["horizontalScrollPx"]<=3,f"{viewport} no unintended horizontal document overflow")
 if viewport[0]>1240:check(ctrl["x"]>=housing["x"]+housing["width"]-3,f"{viewport} desktop right controls do not overlap LCD housing")
 else:check(geometry["mobileTrainingNoteVisible"],f"{viewport} mobile non-OEM teaching-layout warning remains visible")
 return geometry

def run():
 env={**os.environ,"PORT":str(PORT)}
 server=subprocess.Popen([r"C:\nvm4w\nodejs\node.exe",str(ROOT/"tools/server.mjs")],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
 RESULT["ownedServerPid"]=server.pid
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(channel="chrome",headless=True)
   try:
    for vw in VIEWS:
     context=browser.new_context(viewport={"width":vw[0],"height":vw[1]},device_scale_factor=1)
     page=context.new_page();page.clock.install();responses=[];record_network(page,responses)
     page.goto(BASE+"/",wait_until="networkidle",timeout=25000)
     boot(page)
     geometry=inspect_view(page,vw)
     cases=[]
     for mode in MODES:
      observed=choose_mode(page,mode)
      header=page.locator("#screen-top").inner_text()
      check(mode==observed,f"{vw} mode identity {mode}")
      check(page.locator("#lcd").is_visible() and not page.locator("#off-screen").is_visible(),f"{vw} LCD shows display in {mode}")
      screenshot=addshot(page,"MODE_"+mode.replace("-","_"),vw)
      cases.append({"mode":mode,"observed":observed,"header":header[:180],"screenshotSHA256":screenshot["sha256"]})
     check(len({v["screenshotSHA256"] for v in cases})==7,f"{vw} seven modes yield distinct real display captures")
     check(len(responses)>=45 and all(v["match"] for v in responses),f"{vw} loaded HTTP source body SHA {len(responses)} exact")
     check(not RESULT["networkExternal"] and not RESULT["pageErrors"],f"{vw} no external requests or JS exceptions")
     RESULT["httpBodies"].extend([{"viewport":list(vw),**v} for v in responses])
     RESULT["views"].append({"viewport":list(vw),"geometry":geometry,"modes":cases,"sourceCount":len(responses)})
     context.close()
    # Zoom settings are version-22 encoded training preference, not replay migration.
    vw=(1366,768)
    context=browser.new_context(viewport={"width":vw[0],"height":vw[1]},device_scale_factor=1)
    page=context.new_page();page.clock.install();responses=[];record_network(page,responses)
    page.goto(BASE+"/",wait_until="networkidle",timeout=25000)
    for zoom in ZOOMS:
     raw=page.evaluate("""async zoom => {const {initialFcv588State}=await import('/src/devices/fcv588/model.mjs');const {encodeFcvSettings}=await import('/src/devices/fcv588/settings.mjs');return encodeFcvSettings({...initialFcv588State().settings,zoomMode:zoom});}""",zoom)
     key=page.evaluate("""async ()=>(await import('/src/devices/fcv588/settings.mjs')).FCV_SETTINGS_STORAGE_KEY""")
     page.evaluate("([key,raw])=>{localStorage.clear();localStorage.setItem(key,raw)}",[key,raw]);page.reload(wait_until="networkidle")
     boot(page);observed=choose_mode(page,"LF-ZOOM")
     header=page.locator("#screen-top").inner_text()
     expected={"Bottom Lock":"BL","Bottom Zoom":"BZ","Marker Zoom":"MZ"}[zoom]
     check(observed=="LF-ZOOM" and (expected+"-LF") in header,f"zoom {zoom} LCD header {expected}-LF, no invented zoom label")
     shot=addshot(page,"ZOOM_"+zoom.upper().replace(" ","_"),vw)
     RESULT["zoomCases"].append({"zoomMode":zoom,"header":header[:180],"screenshotSha":shot["sha256"]})
     page.locator("#btn-reset").click()
     page.locator("#btn-pause").click() if page.locator("#btn-pause").inner_text().startswith("Tiếp tục") else None
    check(len(RESULT["zoomCases"])==3 and len({z["screenshotSha"] for z in RESULT["zoomCases"]})==3,"three zoom types visibly distinct")
    check(len(responses)>=45 and all(x["match"] for x in responses),f"zoom HTTP source bodies {len(responses)} exact")
    RESULT["httpBodies"].extend([{"viewport":[1366,768],"zoomSession":True,**v} for v in responses]);context.close()
    context=browser.new_context();page=context.new_page()
    for img in ["dual.jpg","giaoDien.jpg","hf.jpg","lf.jpg","nav1.jpg","nav2.jpg","zoom.jpg","zoom2.jpg"]:
     r=page.request.get(BASE+"/sources/FCV588_GiaoDienThucTeMay2016/"+img)
     RESULT["jpegRoutes"].append({"image":img,"status":r.status})
    check(all(x["status"]==404 for x in RESULT["jpegRoutes"]),"eight OEM JPEG routes rejected as REFERENCE_ONLY")
    context.close()
   finally:browser.close()
 except Exception as exc:
  RESULT["errors"].append("exception: "+str(exc));RESULT["traceback"]=traceback.format_exc()
 finally:
  server.terminate()
  try:server.wait(timeout=8)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  RESULT["ownedServerExited"]=server.poll() is not None
  check(RESULT["ownedServerExited"],"only test-owned server 4216 cleaned")
  # Preserve actual run result, including RED, never overwrite.
  receipt=QA/"P15_CHROME_MODE_GEOMETRY_ATTEMPT2_20261116.json"
  with receipt.open("x",encoding="utf8") as f:json.dump(RESULT,f,ensure_ascii=False,indent=2);f.write("\n")
  print(json.dumps({"status":"PASS" if not RESULT["errors"] else "FAILED","checksPassed":sum(c["pass"] for c in RESULT["checks"]),"checksTotal":len(RESULT["checks"]),"errors":RESULT["errors"][:8],"capturedScreenshots":len(RESULT["screenshots"]),"views":len(RESULT["views"]),"zoomCases":len(RESULT["zoomCases"]),"loadedBodies":len(RESULT["httpBodies"]),"receiptSha":digest(receipt.read_bytes()),"receiptPath":str(receipt)},ensure_ascii=True))
 if RESULT["errors"]:sys.exit(1)
if __name__=="__main__":run()