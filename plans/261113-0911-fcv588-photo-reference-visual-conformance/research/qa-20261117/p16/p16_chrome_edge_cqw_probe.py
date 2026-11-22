"""P16 Windows real installed Chrome/Edge CSS cqw + offline source geometry gate.
One test-owned loopback server 4217; sequential headless browsers; read-only canonical.
Never installs an older browser or touches user's 4173 server/profile.
"""
from pathlib import Path
from hashlib import sha256
from urllib.parse import urlparse
from urllib.error import HTTPError
from urllib.request import urlopen
from playwright.sync_api import sync_playwright
import json,sys,subprocess,socket,os,traceback
ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=Path(__file__).resolve().parent
PORT=4217
BASE=f"http://127.0.0.1:{PORT}"
OUT=QA/"P16_CHROME_EDGE_CQW_BROWSER_GATE_20261117.json"
VIEWS=[(375,812),(1366,768),(1920,1080)]
BROWSERS=[("chrome",r"C:\Program Files\Google\Chrome\Application\chrome.exe"),("msedge",r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")]
EXPECTED=["Pic. Advance","Zoom Mode","Shift","Interference","Color Erase","Clutter","White Line","White Marker","TVG","Smoothing","Bottom Zone","TX Power","TX Rate"]
RESULT={"schema":"FCV588_P16_WINDOWS_CQW_REAL_BROWSER_V1","scope":"CHROME_EDGE_INSTALLED_WIN_LOOPBACK_OFFLINE_ONLY","canonicalRoot":str(ROOT),"ownedPort":PORT,"views":[],"checks":[],"errors":[],"loadedBodies":[],"externalRequests":[],"pageErrors":[],"referenceOnlyRouteStatus":[],"browserVersions":{},"warnings":[]}
def sha(data):return sha256(data).hexdigest()
def check(condition,label):
 ok=bool(condition);RESULT["checks"].append({"name":label,"pass":ok})
 if not ok:RESULT["errors"].append(label)
 return ok
def owner_port_free():
 with socket.socket() as s:
  s.settimeout(.4)
  return s.connect_ex(("127.0.0.1",PORT))!=0

def extract(page):
 return page.evaluate("""() => {
  const lcd=document.querySelector('#lcd');const frame=document.querySelector('#echo-canvas');
  const head=document.querySelector('#screen-top');const depth=document.querySelector('#depth-display');
  const b=lcd.getBoundingClientRect(),c=frame.getBoundingClientRect();
  const bbox = e => {const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
  return {ua:navigator.userAgent,cqw:CSS.supports('font-size','3cqw'),containerType:CSS.supports('container-type','inline-size'),
   containerComputed:getComputedStyle(lcd).containerType,
   lcd:bbox(lcd),canvas:bbox(frame),canvasIntrinsic:[frame.width,frame.height],
   headerFontPx:parseFloat(getComputedStyle(head).fontSize),
   depthFontPx:parseFloat(getComputedStyle(depth).fontSize),
   documentOverflowPx:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth,
   lcdVisible:getComputedStyle(lcd).visibility!='hidden',
   mobileTeachingNoteVisible: (() => {const n=document.querySelector('.mobile-training-note');return n&&getComputedStyle(n).display!='none';})()
  };
 }""")
def run():
 if OUT.exists():raise FileExistsError("P16 write-once result already exists")
 if not owner_port_free():raise RuntimeError("P16 owned port4217 is not free; do not touch other listener")
 env={**os.environ,"PORT":str(PORT)}
 server=subprocess.Popen([r"C:\nvm4w\nodejs\node.exe",str(ROOT/"tools/server.mjs")],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
 RESULT["ownedServerPid"]=server.pid
 try:
  with sync_playwright() as pw:
   for name,exe in BROWSERS:
    check(Path(exe).is_file(),f"{name} installed browser binary exists")
    if not Path(exe).is_file():continue
    browser=pw.chromium.launch(executable_path=exe,headless=True)
    try:
     version=browser.version;RESULT["browserVersions"][name]=version
     expectedPathSet=None
     firstDesktop=None
     for w,h in VIEWS:
      context=browser.new_context(viewport={"width":w,"height":h},device_scale_factor=1)
      page=context.new_page();responses=[]
      def finished(req):
       response=req.response()
       if response is None:return
       url=urlparse(response.url)
       if url.netloc!=f"127.0.0.1:{PORT}":
        RESULT["externalRequests"].append(response.url)
        return
       path=url.path
       if response.status!=200:return
       if path=="/":local=ROOT/"web/index.html"
       elif path.startswith("/src/") or path.startswith("/web/"):local=ROOT/path[1:]
       else:return
       try:
        body=response.body();valid=local.is_file() and body==local.read_bytes()
        responses.append({"path":path,"bodySHA256":sha(body),"sourceSHA256":sha(local.read_bytes()) if local.is_file() else None,"match":valid})
       except Exception as exc:
        responses.append({"path":path,"match":False,"error":str(exc)})
      page.on("requestfinished",finished)
      page.on("pageerror",lambda e:RESULT["pageErrors"].append(str(e)))
      page.goto(BASE+"/",wait_until="networkidle",timeout=25000)
      page.locator("#key-power").click()
      for _ in range(4):page.locator("#btn-step").click()
      page.locator("#btn-pause").click()
      dims=extract(page)
      check(dims["cqw"] and dims["containerType"],f"{name} {w} browser CSS cqw/inline-size support")
      check(dims["containerComputed"]=="inline-size",f"{name} {w} LCD resolves CSS container")
      check(dims["canvasIntrinsic"]==[480,640],f"{name} {w} original canvas logical pixels")
      canvas=dims["canvas"];lcd=dims["lcd"]
      ratio=canvas["width"]/canvas["height"]
      check(abs(ratio-.75)<.00075,f"{name} {w} canvas preserves intrinsic 480:640 ratio")
      check(canvas["x"]>=lcd["x"]-1 and canvas["x"]+canvas["width"]<=lcd["x"]+lcd["width"]+1,f"{name} {w} canvas within LCD")
      check(dims["documentOverflowPx"]<=3,f"{name} {w} no document horizontal overflow")
      check(dims["lcdVisible"],f"{name} {w} LCD displayed")
      if w==375:check(dims["mobileTeachingNoteVisible"],f"{name} {w} non-OEM mobile teaching note")
      page.locator("#key-menu").click()
      txt=page.locator("#dialog-content").inner_text()
      positions=[txt.lower().find(word.lower()) for word in EXPECTED]
      check(all(i>=0 for i in positions) and positions==sorted(positions),f"{name} {w} active22 AP-1 13 Sounder rows order")
      page.locator("#key-menu").click()
      # A screenshot here is a bounded visual witness, not a pixel OEM oracle.
      if w in (375,1366):
       img=QA/f"P16_{name}_{w}x{h}_20261117.png"
       if img.exists():raise FileExistsError("P16 write-once screenshot exists "+str(img))
       page.locator(".device-frame").screenshot(path=str(img))
       dims["screenshot"]={"path":str(img),"sha256":sha(img.read_bytes()),"bytes":img.stat().st_size}
      paths=sorted([row["path"] for row in responses])
      check(len(paths)>=30 and len(paths)==len(set(paths)) and all(row["match"] for row in responses),f"{name} {w} each requested HTTP source exact SHA")
      if expectedPathSet is None:expectedPathSet=paths
      check(paths==expectedPathSet,f"{name} {w} consistent runtime request path set")
      check(not RESULT["pageErrors"] and not RESULT["externalRequests"],f"{name} {w} zero JS errors/external network")
      entry={"browser":name,"version":version,"viewport":[w,h],"measurement":dims,"sourceBodyCount":len(responses),"sourceBodiesMatch":sum(row["match"] for row in responses),"httpPaths":paths}
      RESULT["views"].append(entry)
      RESULT["loadedBodies"].extend([{"browser":name,"viewport":[w,h],**row} for row in responses])
      if w==1366:firstDesktop=entry
      if w==1920 and firstDesktop:
       d=firstDesktop["measurement"]
       sameLCD=abs(d["lcd"]["width"]-lcd["width"])<.25 and abs(d["lcd"]["height"]-lcd["height"])<.25
       check(sameLCD,f"{name} desktop1366/1920 same LCD dimensions")
       if sameLCD:
        check(abs(d["headerFontPx"]-dims["headerFontPx"])<=.15,f"{name} cqw LCD header size not viewport-coupled")
        check(abs(d["depthFontPx"]-dims["depthFontPx"])<=.15,f"{name} cqw LCD depth size not viewport-coupled")
      context.close()
    finally:browser.close()
   # OEM reference images cannot be fetched from the runtime even on test server.
   for name in ("dual.jpg","giaoDien.jpg","hf.jpg","lf.jpg","nav1.jpg","nav2.jpg","zoom.jpg","zoom2.jpg"):
    try:
     with urlopen(BASE+"/sources/FCV588_GiaoDienThucTeMay2016/"+name,timeout=8) as response:status=response.status
    except HTTPError as exc:status=exc.code
    RESULT["referenceOnlyRouteStatus"].append({"file":name,"status":status})
   check(len(RESULT["referenceOnlyRouteStatus"])==8 and all(x["status"]==404 for x in RESULT["referenceOnlyRouteStatus"]),"8 original OEM photo routes HTTP404")
 except Exception as exc:
  RESULT["errors"].append("EXCEPTION "+str(exc));RESULT["traceback"]=traceback.format_exc()
 finally:
  server.terminate()
  try:server.wait(timeout=8)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  RESULT["ownedServerExited"]=server.poll() is not None
  check(RESULT["ownedServerExited"],"only owned test server4217 was shut down")
  for view in RESULT["views"]:
   shot=view["measurement"].get("screenshot")
   if shot:
    img=Path(shot["path"])
    check(img.is_file() and sha(img.read_bytes())==shot["sha256"],"captured screenshot SHA stable before receipt "+img.name)
  with OUT.open("x",encoding="utf8") as f:
   json.dump(RESULT,f,ensure_ascii=False,indent=2);f.write("\n")
  print(json.dumps({"status":"PASS" if not RESULT["errors"] else "FAILED","checks":len(RESULT["checks"]),"passed":sum(c["pass"] for c in RESULT["checks"]),"browserVersions":RESULT["browserVersions"],"views":len(RESULT["views"]),"httpBodies":len(RESULT["loadedBodies"]),"screenshots":sum(bool(v["measurement"].get("screenshot")) for v in RESULT["views"]),"errors":RESULT["errors"][:10],"receiptSHA256":sha(OUT.read_bytes())},ensure_ascii=True))
 if RESULT["errors"]:sys.exit(1)
if __name__=="__main__":run()