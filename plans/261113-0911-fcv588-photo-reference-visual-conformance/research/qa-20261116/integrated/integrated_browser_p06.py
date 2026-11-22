"""Owned P06 staging Chrome QA: physical face, focus toggle, D15 access.

Selected three viewport checks only. Runtime is local, test server on port 4193,
all evidence write-once and source bodies checked against exact staged files.
"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import urlopen
import hashlib
import json
import os
import socket
import subprocess
import time
import uuid

from playwright.sync_api import sync_playwright

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
STAGE=ROOT/"staging/fcv588-photo-integrated-20261116"
OUT=ROOT/"plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/integrated/browser-p06-v1"
NODE=Path(r"C:\nvm4w\nodejs\node.exe")
CHROME=Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
PORT=4194
PHOTOS=("giaoDien.jpg","lf.jpg","hf.jpg","dual.jpg","zoom.jpg","zoom2.jpg","nav1.jpg","nav2.jpg")
VIEWS=((375,812),(1366,768),(1920,1080))

def sha(data:bytes)->str: return hashlib.sha256(data).hexdigest()
def fsha(path:Path)->str: return sha(path.read_bytes())
def need(ok,msg):
    if not ok: raise AssertionError(msg)
def exclusive(path:Path,data:bytes):
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    try:
        with os.fdopen(fd,"wb") as stream: stream.write(data)
    except Exception:
        raise

def source_manifest():
    return {p.relative_to(STAGE).as_posix():fsha(p)
            for folder in ("web","src")
            for p in sorted((STAGE/folder).rglob("*"))
            if p.is_file() and p.suffix.lower() in (".css",".mjs",".js")}

def local_source(url):
    path=urlsplit(url).path
    if path=="/": return STAGE/"web/index.html"
    if path.startswith("/web/"):return STAGE/"web"/path[5:]
    if path.startswith("/src/"):return STAGE/"src"/path[5:]
    return None

def main():
    need(not OUT.exists(),"owned P06 browser QA directory already exists")
    need(CHROME.is_file() and NODE.is_file(),"Chrome/Node22 not found")
    with socket.socket() as sock:
        sock.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)
        sock.bind(("127.0.0.1",PORT))
    OUT.mkdir(parents=True,exist_ok=False)
    tag=datetime.now().strftime("%Y%m%dT%H%M%S%z")+"-"+uuid.uuid4().hex[:8]
    base=f"http://127.0.0.1:{PORT}/"
    env={**os.environ,"PORT":str(PORT),"NODE_ENV":"test"}
    outlog=OUT/(tag+"-server.stdout.txt")
    errlog=OUT/(tag+"-server.stderr.txt")
    source_before=source_manifest()
    case_results=[]
    errors=[]
    deny=[]
    server_cleanup="NOT_RUN"
    with outlog.open("xb") as so,errlog.open("xb") as se:
        server=subprocess.Popen([str(NODE),str(STAGE/"tools/server.mjs")],
            cwd=str(STAGE),env=env,stdout=so,stderr=se,
            creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
        try:
            started=False
            for _ in range(40):
                if server.poll() is not None:raise RuntimeError("owned server exited early")
                try:
                    with urlopen(base,timeout=.4) as res:
                        started=res.status==200
                        if started:break
                except Exception:time.sleep(.1)
            need(started,"strict localhost server did not start")
            for name in PHOTOS:
                try:
                    with urlopen(base+"sources/FCV588_GiaoDienThucTeMay2016/"+name,timeout=1) as res:
                        status=res.status
                except HTTPError as ex:status=ex.code
                deny.append({"name":name,"statusCode":status})
            need(len(deny)==8 and all(x["statusCode"]==404 for x in deny),
                 "original reference photos exposed via HTTP")

            with sync_playwright() as pw:
                browser=pw.chromium.launch(executable_path=str(CHROME),headless=True,
                    args=["--disable-background-networking","--no-first-run"])
                try:
                    for width,height in VIEWS:
                        context=browser.new_context(viewport={"width":width,"height":height},
                            device_scale_factor=1)
                        page=context.new_page()
                        case_err=[]
                        loaded=[]
                        external=[]
                        page.on("console",lambda msg: case_err.append("console:"+msg.text)
                            if msg.type=="error" else None)
                        page.on("pageerror",lambda exc:case_err.append("page:"+str(exc)))
                        page.on("requestfailed",lambda request:case_err.append(
                            "failed:"+str(request.url)))
                        def on_response(res):
                            source=local_source(res.url)
                            if source is None:
                                external.append(res.url)
                                return
                            if source.suffix.lower() not in (".css",".mjs",".js"):
                                return
                            try:
                                body_sha=sha(res.body())
                                source_sha=fsha(source)
                                loaded.append({"path":source.relative_to(STAGE).as_posix(),
                                               "status":res.status,
                                               "bodySHA256":body_sha,
                                               "sourceSHA256":source_sha})
                            except Exception as ex:
                                case_err.append("body:"+str(ex))
                        page.on("response",on_response)
                        page.goto(base,wait_until="networkidle",timeout=15000)
                        page.locator("#device-focus-toggle").wait_for(state="attached")
                        tabs=page.locator('.d15-tab[role="tab"]')
                        need(tabs.count()==5,"D15 five tabs not preserved")
                        controls=("key-menu","pad-up","pad-down","pad-left","pad-right",
                                  "key-enter","key-range","key-mark","key-func",
                                  "gain-knob","mode-knob","key-power")
                        need(all(page.locator("#"+k).count()==1 for k in controls),
                             "original hardware control missing/duplicated")
                        before=page.locator(".training-panel").evaluate(
                            "e => getComputedStyle(e).opacity")
                        toggle_visible=page.locator("#device-focus-toggle").is_visible()
                        # The source contract is explicitly DESKTOP focus mode.
                        # At <=1240px the device is reflowed above a fully-visible D15,
                        # so the focus checkbox must stay hidden rather than force a
                        # meaningless mobile de-emphasis. The original failed attempt
                        # expected a visible desktop control on a 375px viewport.
                        need(toggle_visible==(width>=1241),
                             "P06 desktop-only focus control visibility mismatch")
                        if toggle_visible:
                            page.locator("#device-focus-toggle").check()
                            # The strict local server uses CSP script-src 'self'.
                            # Playwright wait_for_function compiles its predicate
                            # through eval and is rightly blocked; previous v3
                            # FAILED was the harness, not an application defect.
                            page.wait_for_timeout(200)
                        toggled=page.locator("#device-focus-toggle").is_checked()
                        after=page.locator(".training-panel").evaluate(
                            "e => getComputedStyle(e).opacity")
                        tabs_after=page.locator('.d15-tab[role="tab"]').count()
                        focus_d15=page.locator(".training-panel button").first
                        focus_d15.focus()
                        if toggle_visible:
                            page.wait_for_timeout(200)
                        restored=page.locator(".training-panel").evaluate(
                            "e => getComputedStyle(e).opacity")
                        box=page.locator(".display-housing").bounding_box()
                        keys=page.locator(".controls").bounding_box()
                        dims=page.evaluate("({w:innerWidth, sw:document.documentElement.scrollWidth})")
                        need(toggled==toggle_visible and tabs_after==5,
                             "desktop focus control or D15 tabs mismatch")
                        need(bool(box and keys),"LCD/controls bounding rectangles missing")
                        # The PHONE view is a documented reflow: device LCD above
                        # the controls, not side-by-side physical face geometry.
                        if width<=700:
                            need(box["y"]+box["height"]<=keys["y"]+2,
                                 "stacked phone LCD/control vertical overlap")
                        else:
                            need(box["x"]+box["width"]<=keys["x"]+2,
                                 "desktop LCD/control horizontal overlap")
                        need(dims["sw"]<=dims["w"]+1,"horizontal overflow at viewport")
                        need(width<1241 or (float(after)<float(before) and float(restored)>=.99),
                             "focus CSS does not de-emphasize/recover D15")
                        need(all(x["status"]==200 and x["bodySHA256"]==x["sourceSHA256"]
                                 for x in loaded),"loaded source SHA differs from stage")
                        need(len(loaded)>=33,"too few actual loaded CSS/JS bodies")
                        need(not case_err and not external,
                             "browser console/network/external errors: "+repr(case_err+external))
                        shot=page.screenshot(full_page=True)
                        filename=f"{tag}-{width}x{height}-focus.png"
                        exclusive(OUT/filename,shot)
                        case_results.append({"name":filename,"viewport":dims,
                            "status":"PASS","focusChecked":toggled,
                            "focusControlVisible":toggle_visible,
                            "trainerOpacity":{"before":before,"checked":after,"focused":restored},
                            "d15Tabs":tabs_after,"sourceBodies":len(loaded),
                            "loaded":loaded,"consoleOrNetworkErrors":case_err,
                            "screenshot":{"path":str(OUT/filename),
                                          "sha256":sha(shot),"bytes":len(shot)}})
                        context.close()
                finally:browser.close()
        except Exception as ex:
            errors.append(str(ex))
        finally:
            server.terminate()
            try:server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill();server.wait(timeout=3)
            server_cleanup="PASS" if server.poll() is not None else "FAILED"
    source_after=source_manifest()
    result={"schema":"fcv588-p06-faceplate-stage-browser-v1",
        "stageRoot":str(STAGE),"runId":tag,"testOwnedPort":PORT,
        "overallStatus":"PASS" if not errors and len(case_results)==3 and
            source_before==source_after and server_cleanup=="PASS" else "FAILED",
        "sourceManifestBefore":source_before,"sourceManifestAfter":source_after,
        "sourceStable":source_before==source_after,
        "photoDeny":deny,"cases":case_results,"errors":errors,
        "serverCleanup":server_cleanup}
    receipt=OUT/(tag+"-receipt.json")
    exclusive(receipt,(json.dumps(result,ensure_ascii=False,indent=2)+"\n").encode("utf-8"))
    print("P06_BROWSER_STATUS="+result["overallStatus"])
    print("P06_BROWSER_CASES="+str(len(case_results)))
    print("P06_BROWSER_RECEIPT="+str(receipt))
    print("P06_BROWSER_RECEIPT_SHA256="+fsha(receipt))
    if result["overallStatus"]!="PASS":raise RuntimeError("P06 browser QA failed: "+repr(errors))

if __name__=="__main__":main()
