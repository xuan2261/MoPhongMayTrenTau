"""P36: Current profile22 LIVE synthetic LF-ZOOM/HF-ZOOM + Bottom Zoom Chrome QA.
Not OEM pixel calibration, real sonar measurements or historical LCD replay.
Owned QA server only on 127.0.0.1:4296; user 4173 is never contacted.
"""
import hashlib
import json
import os
import socket
import subprocess
import time
import traceback
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
STAGE=ROOT/"staging/fcv588-p36-live-bottom-zoom-20261122"
QA=ROOT/"docs/qa/FCV588_P36_LIVE_BOTTOM_ZOOM_20261122"
MANIFEST=QA/"P36_CANONICAL_RUNTIME_SOURCE_MANIFEST_V1_20261122.json"
RECEIPT=QA/"P36_STAGE_CHROME_LIVE_BOTTOM_ZOOM_V1_20261122.json"
PORT=4296
BASE=f"http://127.0.0.1:{PORT}"
CHROME=r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def sha(data):return hashlib.sha256(data).hexdigest()
def file_sha(path):return sha(path.read_bytes())
def listening(port):
    with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as sock:
        sock.settimeout(.2)
        return sock.connect_ex(("127.0.0.1",port))==0
def check(value,message):
    if not value:raise AssertionError(message)

manifest=json.loads(MANIFEST.read_text(encoding="utf-8"))
source_paths=manifest["files"]
def verify_sources():
    for relative,digest in source_paths.items():
        check(file_sha(ROOT/relative)==digest,"CANONICAL_SOURCE_DRIFT: "+relative)
        check(file_sha(STAGE/relative)==digest,"STAGED_SOURCE_DRIFT: "+relative)
    check(file_sha(STAGE/"tools/server.mjs")==manifest["serverSha256"],
          "STAGE_SERVER_SOURCE_DRIFT")
    check(file_sha(ROOT/"docs/qa/FCV588_P35_POWER_BRILL_A11Y_20261121/FCV588_P35_POWER_BRILL_A11Y_INDEPENDENT_SHA_POSTRECEIPT_20261121.json")
          ==manifest["parentP35PostSHA256"],"P35_PARENT_SHA_DRIFT")
def parse_pixels(page):
    return page.evaluate("""async () => {
      const c=document.querySelector('#echo-canvas');
      if(!c||c.width!==480||c.height!==640)throw new Error('LCD_480_640_REQUIRED');
      const pixels=c.getContext('2d',{willReadFrequently:true})
        .getImageData(0,0,480,640).data;
      const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))
        .map(v=>v.toString(16).padStart(2,'0')).join('');
      const sample=async (x0,x1,y0,y1)=>{
        const out=new Uint8Array((x1-x0)*(y1-y0)*4);
        const colors=new Map();
        let offset=0;
        for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
          const pos=4*(480*y+x);
          const r=pixels[pos],g=pixels[pos+1],b=pixels[pos+2];
          out[offset++]=r;out[offset++]=g;out[offset++]=b;out[offset++]=pixels[pos+3];
          if(((x-x0)&3)===0&&((y-y0)&3)===0){
            const key=(r<<16)|(g<<8)|b;
            colors.set(key,(colors.get(key)||0)+1);
          }
        }
        const top=Math.max(...colors.values());
        const total=[...colors.values()].reduce((s,n)=>s+n,0);
        return {x0,x1,y0,y1,sha256:await hash(out),distinctColors:colors.size,
          sampledPixels:total,nonDominantFraction:(total-top)/total};
      };
      const left=await sample(16,216,125,605);
      const right=await sample(264,464,125,605);
      const leftLower=await sample(16,216,380,605);
      const leftUpper=await sample(16,216,125,350);
      let shared=0,vsNeighbor=0,total=0;
      for(let y=85;y<605;y++){
        const pix=x=>4*(480*y+x);
        const a=pix(239),b=pix(240),other=pix(235);
        const eq=(i,j)=>pixels[i]===pixels[j]&&pixels[i+1]===pixels[j+1]
          &&pixels[i+2]===pixels[j+2];
        if(eq(a,b))shared++;
        if(!eq(a,other))vsNeighbor++;
        total++;
      }
      return {canvasSize:[c.width,c.height],fullSha256:await hash(pixels),
        left,right,leftLower,leftUpper,
        dividerSharedFraction:shared/total,dividerDistinctFromLeftFraction:vsNeighbor/total};
    }""")

receipt={
  "schema":"P36_STAGE_CHROME_LIVE_BOTTOM_ZOOM_V1",
  "scope":"CURRENT_PROFILE22_LIVE_SYNTHETIC_LF_HF_BOTTOM_ZOOM",
  "status":"IN_PROGRESS",
  "timestampUtc":__import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
  "sourceManifestSHA256":file_sha(MANIFEST),
  "parentP35SHA256":manifest["parentP35PostSHA256"],
  "sourceCount":len(source_paths),
  "qaPort":PORT,
  "userServer4173Interaction":"NONE_BY_DESIGN",
  "onlyStageChrome":True,
  "notAnOEMPixelOrHardwareClaim":True,
  "notSpokenNarratorProof":True,
  "cases":[],"negativeRoutes":[],"powerOff":None,"screenshots":{},"errors":[],
}
owned=None
browser=None
try:
    check(not listening(PORT),"QA_PORT_PREOWNED")
    verify_sources()
    check(len(source_paths)==54,"EXPECTED_54_RUNTIME_SOURCES")
    env=os.environ.copy()
    env["PORT"]=str(PORT)
    flags=subprocess.CREATE_NO_WINDOW if os.name=="nt" else 0
    owned=subprocess.Popen(["node","tools/server.mjs"],cwd=STAGE,env=env,
       stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=flags)
    for _ in range(70):
        check(owned.poll() is None,"OWNED_SERVER_DIED")
        if listening(PORT):break
        time.sleep(.1)
    check(listening(PORT),"QA_SERVER_NOT_LISTENING")
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=CHROME,
            args=["--no-first-run","--disable-background-networking"])
        for vp in [(1366,768),(1920,1080)]:
            for mode,key_seq,khz in [
                ("LF-ZOOM",["["],50),
                ("HF-ZOOM",["]","]","]"],200),
            ]:
                context=browser.new_context(
                    viewport={"width":vp[0],"height":vp[1]},
                    locale="vi-VN",service_workers="block")
                page=context.new_page()
                sources={}
                errors=[]
                def route_guard(request):
                    u=urlparse(request.url)
                    if u.scheme not in ("http","https"):
                        return
                    if u.hostname!="127.0.0.1" or u.port!=PORT:
                        errors.append("EXTERNAL_REQUEST "+request.url)
                def loaded(request):
                    try:
                        u=urlparse(request.url)
                        if u.hostname!="127.0.0.1" or u.port!=PORT:
                            errors.append("NONLOCAL_BODY "+request.url)
                            return
                        path=u.path
                        if path!="/" and not path.startswith(("/web/","/src/")):
                            errors.append("NON_SOURCE_PATH "+path)
                            return
                        source_path="web/index.html" if path=="/" else path[1:]
                        expected=source_paths.get(source_path)
                        response=request.response()
                        if expected is None or response is None or response.status!=200:
                            errors.append("UNEXPECTED_LOADED "+path)
                            return
                        actual=sha(response.body())
                        if actual!=expected:
                            errors.append("HTTP_SHA_DRIFT "+path)
                        sources[path]=actual
                    except Exception as exc:
                        errors.append("RESPONSE_HANDLER "+str(exc))
                page.on("request",route_guard)
                page.on("requestfinished",loaded)
                page.on("requestfailed",lambda req:errors.append("FAILED_REQUEST "+req.url))
                page.on("pageerror",lambda err:errors.append("PAGE_ERROR "+str(err)))
                page.on("console",lambda msg:errors.append("CONSOLE_ERROR "+msg.text) if msg.type=="error" else None)
                try:
                    response=page.goto(BASE+"/",wait_until="load",timeout=22000)
                    check(response is not None and response.status==200,"ROOT_HTTP_NOT_200")
                    page.locator("#btn-pause").click()
                    check(page.locator("#mode-state").inner_text()=="LF","INITIAL_NOT_LF")
                    check(page.locator("#status-line").inner_text()=="POWER OFF","INITIAL_POWER_NOT_OFF")
                    page.locator("#key-power").click()
                    for _ in range(5):page.locator("#btn-step").click()
                    page.wait_for_function("()=>document.querySelector('#status-line')?.textContent==='RUN · DEMO DATA'",
                                           timeout=8000)
                    baseline=page.locator("#tick-count").inner_text()
                    check(not page.locator("#off-screen").is_visible(),"POWER_ON_LCD_STILL_OFF")
                    check(page.locator("#screen-top").is_visible(),"LIVE_HEADER_MISSING")
                    page.locator("#mode-knob").focus()
                    for key in key_seq:page.keyboard.press(key)
                    page.wait_for_function("expected=>document.querySelector('#mode-state')?.textContent===expected",
                                           arg=mode,timeout=11500)
                    check(page.locator("#tick-count").inner_text()==baseline,
                          "WORLD_TICK_CHANGED_DURING_PAUSED_MODE_TRANSITION")
                    check(page.locator("#mode-knob").get_attribute("data-selection")==mode,
                          "MODE_DIAL_SELECTION_MISMATCH")
                    check(page.locator(f'.mode-scale [data-mode="{mode}"]').get_attribute("data-selected")=="true",
                          "MODE_SCALE_SELECTION_MISMATCH")
                    check(not page.locator("#lcd-overlay").is_visible(),"MODE_OVERLAY_STILL_ACTIVE")
                    check(not page.locator("#off-screen").is_visible(),"MODE_LCD_OFF")
                    pixels=parse_pixels(page)
                    check(pixels["canvasSize"]==[480,640],"LCD_DIMENSION_DRIFT")
                    check(pixels["left"]["distinctColors"]>=5
                          and pixels["right"]["distinctColors"]>=5,
                          "PANE_LACKS_NONTRIVIAL_IMAGE_CONTENT")
                    check(pixels["left"]["nonDominantFraction"]>0.005
                          and pixels["right"]["nonDominantFraction"]>0.005,
                          "PANE_IS_ESSENTIALLY_FLAT")
                    check(pixels["left"]["sha256"]!=pixels["right"]["sha256"],
                          "ZOOM_AND_NORMAL_IDENTICAL")
                    check(pixels["dividerSharedFraction"]>=0.95
                          and pixels["dividerDistinctFromLeftFraction"]>=0.65,
                          "EXPECTED_CENTER_PANE_DIVIDER_MISSING")
                    check(pixels["leftLower"]["distinctColors"]>=5,
                          "LOWER_ZOOM_PANE_NO_SYNTHETIC_CONTENT")
                    page.wait_for_timeout(100)
                    required={"/","/web/app.mjs","/web/styles.css","/web/fcv588-echo-rasterizer.mjs","/src/devices/fcv588/model.mjs","/src/devices/fcv588/display-layout.mjs","/src/devices/fcv588/echo-projection.mjs"}
                    check(required.issubset(sources),
                          "CRITICAL_SERVED_SOURCE_MISSING "+str(sorted(required-set(sources))))
                    check(not errors,"SOURCE_OR_PAGE_ERRORS "+str(errors))
                    picture=f"P36_STAGE_{mode.replace('-','_')}_{vp[0]}x{vp[1]}_20261122.png"
                    target=QA/picture
                    check(not target.exists(),"SCREENSHOT_EXISTS")
                    page.locator("#lcd").screenshot(path=str(target))
                    receipt["screenshots"][picture]=file_sha(target)
                    receipt["cases"].append({
                      "viewport":list(vp),"mode":mode,"frequencyKhzFromContract":khz,
                      "worldTick":baseline,"zoomMode":"Bottom Zoom (default fallback)",
                      "visibleHeader":page.locator("#screen-top").inner_text(),
                      "pixels":pixels,
                      "loadedHTTPSourceCount":len(sources),
                      "loadedHTTPSourceHashes":sources,
                      "screenshot":picture,"screenshotSHA256":file_sha(target),
                      "status":"PASS_LIVE_SYNTHETIC_BOUNDED",
                    })
                    if vp==(1366,768) and mode=="LF-ZOOM":
                        power=page.locator("#key-power")
                        power.scroll_into_view_if_needed()
                        bounds=power.bounding_box()
                        check(bounds is not None,"POWER_BUTTON_NOT_VISIBLE")
                        px=bounds["x"]+bounds["width"]/2
                        py=bounds["y"]+bounds["height"]/2
                        page.mouse.move(px,py)
                        page.mouse.down()
                        page.wait_for_timeout(3350)
                        page.mouse.up()
                        page.wait_for_function("()=>document.querySelector('#status-line')?.textContent==='POWER OFF'",
                                               timeout=6500)
                        check(page.locator("#off-screen").is_visible(),"OFF_LCD_COVER_MISSING")
                        receipt["powerOff"]={
                          "status":"PASS_LIVE_LONG_HOLD_POWER_OFF",
                          "afterMode":mode,
                          "afterState":page.locator("#status-line").inner_text(),
                          "offScreenVisible":True,
                          "durationMs":3350,
                          "noBottomZoomAcceptedWhileOff":True,
                        }
                finally:
                    page.close()
                    context.close()
        # Compare distinct LF/HF source-dependent output at equivalent world tick/viewport.
        for vp in [(1366,768),(1920,1080)]:
            items=[case for case in receipt["cases"] if case["viewport"]==list(vp)]
            check(len(items)==2,"MISSING_LF_HF_VIEWPORT_PAIR")
            check(items[0]["worldTick"]==items[1]["worldTick"],
                  "LF_HF_WORLD_TICKS_NOT_MATCHED")
            check(items[0]["pixels"]["right"]["sha256"]!=items[1]["pixels"]["right"]["sha256"],
                  "LF_AND_HF_NORMAL_PANES_IDENTICAL")
            check(items[0]["pixels"]["left"]["sha256"]!=items[1]["pixels"]["left"]["sha256"],
                  "LF_AND_HF_ZOOM_PANES_IDENTICAL")
        browser.close()
        browser=None
    for name in ["giaoDien","lf","hf","dual","zoom","zoom2","nav1","nav2"]:
        route=f"/sources/FCV588_GiaoDienThucTeMay2016/{name}.jpg"
        try:
            with urlopen(BASE+route,timeout=3) as response:
                status=response.status
        except HTTPError as exc:
            status=exc.code
        check(status==404,"PROTECTED_SOURCE_SERVED_"+name)
        receipt["negativeRoutes"].append({"route":route,"status":status})
    check(len(receipt["cases"])==4,"LIVE_CASES_NOT_FOUR")
    check(receipt["powerOff"] is not None,"POWER_OFF_NEGATIVE_NOT_VERIFIED")
    verify_sources()
except Exception:
    receipt["errors"].append(traceback.format_exc())
finally:
    if browser is not None:
        try:browser.close()
        except Exception as err:receipt["errors"].append("BROWSER_CLEANUP "+repr(err))
    if owned is not None:
        try:
            if owned.poll() is None:
                owned.terminate()
                owned.wait(timeout=8)
        except Exception as err:
            try:
                owned.kill()
                owned.wait(timeout=8)
            except Exception as err2:
                receipt["errors"].append("OWNED_SERVER_CLEANUP "+repr(err2))
        receipt["ownedServerExited"]=owned.poll() is not None
    else:receipt["ownedServerExited"]=None
    time.sleep(.2)
    receipt["qaPortClosed"]=not listening(PORT)
    if not receipt["qaPortClosed"]:
        receipt["errors"].append("QA_PORT_REMAINS_OPEN")
    receipt["status"]=("PASS_BOUNDED_LIVE_BOTTOM_ZOOM_QA"
      if len(receipt["cases"])==4 and len(receipt["negativeRoutes"])==8
         and receipt["powerOff"] is not None and receipt["qaPortClosed"]
         and receipt["ownedServerExited"] and not receipt["errors"]
      else "FAILED_OR_PARTIAL")
    with RECEIPT.open("x",encoding="utf-8") as f:
        json.dump(receipt,f,indent=2,ensure_ascii=False)
        f.write("\n")
    print(json.dumps({
      "status":receipt["status"],
      "cases":len(receipt["cases"]),
      "protectedRoutes":len(receipt["negativeRoutes"]),
      "powerOffVerified":receipt["powerOff"] is not None,
      "qaPortClosed":receipt["qaPortClosed"],
      "errors":receipt["errors"][:2],
      "receiptSha256":file_sha(RECEIPT),
    },ensure_ascii=True))
    if receipt["status"]!="PASS_BOUNDED_LIVE_BOTTOM_ZOOM_QA":
        raise SystemExit(3)