import hashlib
import json
import os
import socket
import subprocess
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).parent
port=4295
base=f"http://127.0.0.1:{port}"
expected="POWER/BRILL: nhấn ngắn để bật máy hoặc chỉnh độ sáng; nhấn giữ hơn 3 giây để tắt"
with socket.socket() as check:
    if check.connect_ex(("127.0.0.1",port))==0:
        raise RuntimeError("P35_QA_PORT_PREOWNED")
startup=subprocess.CREATE_NO_WINDOW if os.name=="nt" else 0
proc=subprocess.Popen(["node","tools/server.mjs"],cwd=root,stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,creationflags=startup)
try:
    html=None
    for attempt in range(40):
        if proc.poll() is not None:
            raise RuntimeError(f"QA_SERVER_EXITED_{proc.returncode}")
        try:
            with urllib.request.urlopen(base+"/",timeout=1) as resp:
                html=resp.read()
                assert resp.status==200
            break
        except Exception:
            time.sleep(0.1)
    if html is None:
        raise RuntimeError("QA_SERVER_NOT_READY")
    source=(root/"web"/"index.html").read_bytes()
    if html!=source: raise AssertionError("HTTP_HTML_NOT_STAGE_SOURCE")
    pageerrors=[]
    external=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel="chrome",headless=True)
        context=browser.new_context(viewport={"width":1366,"height":768},locale="vi-VN")
        page=context.new_page()
        page.on("pageerror",lambda e:pageerrors.append(str(e)))
        page.on("request",lambda q:external.append(q.url) if not q.url.startswith(base+"/") else None)
        response=page.goto(base+"/",wait_until="load",timeout=15000)
        assert response and response.status==200
        locator=page.get_by_role("button",name=expected,exact=True)
        assert locator.count()==1,"LIVE_ACCESSIBLE_NAME_MISSING"
        assert page.locator("#key-power").get_attribute("aria-label")==expected
        assert page.locator("#key-power").inner_text()=="BRILL"
        assert not pageerrors, f"PAGE_ERRORS:{pageerrors}"
        assert not external, f"EXTERNAL_REQUESTS:{external}"
        report={
          "stageHtmlSha256":hashlib.sha256(source).hexdigest(),
          "httpHtmlSha256":hashlib.sha256(html).hexdigest(),
          "accessibleName":expected,
          "matchedNativeButtonRoleCount":locator.count(),
          "visibleButtonText":"BRILL",
          "pageErrors":pageerrors,
          "externalRequests":external,
          "browser":"installed Chrome via Playwright",
          "port":port,
          "status":"PASS_BOUNDED_LIVE_DOM_ACCESSIBLE_NAME",
          "notSpokenNarratorProof":True,
        }
        print(json.dumps(report,ensure_ascii=False,sort_keys=True))
        context.close()
        browser.close()
finally:
    if proc.poll() is None:
        proc.terminate()
        try: proc.wait(timeout=4)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=3)
    with socket.socket() as c:
        if c.connect_ex(("127.0.0.1",port))==0:
            raise RuntimeError("P35_TEST_OWNED_SERVER_PORT_STILL_LISTENING")