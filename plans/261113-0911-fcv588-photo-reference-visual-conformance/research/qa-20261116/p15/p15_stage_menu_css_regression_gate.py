import os,sys,time,json,hashlib,subprocess
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(r"C:\Work\MoPhongMayTrenTau\_p15_stage_20261116")
QA=Path(__file__).resolve().parent
BASE="http://127.0.0.1:4216"
RESULT={"stage":str(ROOT),"port":4216,"views":[],"errors":[],"checks":[],"loadedBodies":[],"originalJpegStatus":[]}
def check(ok,message):
 RESULT["checks"].append({"name":message,"pass":bool(ok)})
 if not ok: RESULT["errors"].append(message)
def sha(data):return hashlib.sha256(data).hexdigest()
def main():
 env={**os.environ,"PORT":"4216"}
 server=subprocess.Popen([r"C:\nvm4w\nodejs\node.exe",str(ROOT/"tools/server.mjs")],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
 RESULT["serverPid"]=server.pid
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(channel="chrome",headless=True)
   try:
    for width,height in [(375,812),(1366,768)]:
     context=browser.new_context(viewport={"width":width,"height":height},device_scale_factor=1)
     page=context.new_page();loaded=[];page_errors=[]
     page.on("pageerror",lambda e:page_errors.append(str(e)))
     page.on("requestfinished",lambda request:loaded.append((request.response(),request.response().body())))
     page.goto(BASE+"/",wait_until="networkidle",timeout=20000)
     raw=page.evaluate("""async () => { const x=await import('/src/devices/fcv588/settings-profile21.mjs');const raw=x.encodeFcvSettings({pictureAdvance:'1/2',tankenmaru:'Off',palette:'Blue'});localStorage.setItem('fcv588.settings.v18',raw);return raw; }""")
     # Do not rely on guessed storage key: inspect actual source constant.
     key=page.evaluate("""async () => (await import('/src/devices/fcv588/settings.mjs')).FCV_SETTINGS_STORAGE_KEY""")
     page.evaluate("([key,raw])=>{localStorage.clear();localStorage.setItem(key,raw)}",[key,raw]);page.reload(wait_until="networkidle")
     restored=page.evaluate("key=>localStorage.getItem(key)",key)
     check(restored==raw,f"{width} legacy21 storage raw retained at boot")
     page.locator("#key-power").click();[page.locator("#btn-step").click() for _ in range(4)];page.wait_for_timeout(200)
     page.locator("#key-menu").click();page.wait_for_timeout(200)
     text=page.locator("#dialog-content").inner_text(timeout=3000)
     expected=["Pic. Advance","Zoom Mode","Shift","Interference","Color Erase","Clutter","White Line","White Marker","TVG","Smoothing","Bottom Zone","TX Power","TX Rate"]
     ordered=[text.lower().find(s.lower()) for s in expected]
     check(all(i>=0 for i in ordered) and ordered==sorted(ordered),f"{width} AP-1 Sounder 13 row order")
     image=QA/f"P15_STAGE_CHROME_MENU_{width}x{height}_20261116.png";page.screenshot(path=str(image),full_page=True)
     items=[]
     for response,body in loaded:
      url=urlparse(response.url);path=url.path
      if url.netloc!="127.0.0.1:4216" or response.status!=200: continue
      if path=="/":source=ROOT/"web/index.html"
      elif path.startswith("/web/"):source=ROOT/"web"/path[5:]
      elif path.startswith("/src/"):source=ROOT/"src"/path[5:]
      else: continue
      try:
       match=source.is_file() and sha(body)==sha(source.read_bytes())
       items.append({"url":path,"sha256":sha(body),"match":match})
      except Exception as e:items.append({"url":path,"match":False,"error":str(e)})
     check(len(items)>=35 and all(item["match"] for item in items),f"{width} real browser source bodies {len(items)} all hash-match")
     RESULT["loadedBodies"].extend(items)
     RESULT["views"].append({"viewport":[width,height],"overlay":text[:1200],"screenshot":str(image),"screenshotSha":sha(image.read_bytes()),"sourceCount":len(items),"pageErrors":page_errors})
     check(not page_errors,f"{width} no browser JS exceptions")
     context.close()
    for name in ["dual.jpg","giaoDien.jpg","hf.jpg","lf.jpg","nav1.jpg","nav2.jpg","zoom.jpg","zoom2.jpg"]:
     response=browser.new_page().request.get(BASE+"/sources/FCV588_GiaoDienThucTeMay2016/"+name)
     RESULT["originalJpegStatus"].append({"name":name,"status":response.status})
    check(all(x["status"]==404 for x in RESULT["originalJpegStatus"]),"8 OEM reference JPEG not served")
   finally:browser.close()
 finally:
  server.terminate()
  try:server.wait(timeout=8)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  RESULT["serverExited"]=server.poll() is not None
  check(RESULT["serverExited"],"owned port4216 server cleaned")
  receipt=QA/"P15_STAGE_CHROME_MENU_CSS_20261116.json"
  with receipt.open("x",encoding="utf8") as f:json.dump(RESULT,f,ensure_ascii=False,indent=2)
  print(json.dumps({"pass":sum(c["pass"] for c in RESULT["checks"]),"checks":len(RESULT["checks"]),"failed":RESULT["errors"],"views":RESULT["views"],"receipt":str(receipt),"receiptSha":sha(receipt.read_bytes())},ensure_ascii=True))
 if RESULT["errors"]:sys.exit(1)
if __name__=="__main__":main()