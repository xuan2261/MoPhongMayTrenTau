#!/usr/bin/env python3
"""V35 canonical post-integration Chrome and browser-loaded byte verification.

This is an offline, local training UI only. All receipts and screenshots are
write-once. It never enables a hardware receiver or communicates with a ship.
"""
from __future__ import annotations

from datetime import datetime,timezone
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import urlopen
import json
import os
import socket
import subprocess
import time

from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
CHROME=Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
HOST="127.0.0.1"
PORT=4201
BASE=f"http://{HOST}:{PORT}"
VIEWPORTS=((1366,768),(1920,1080),(360,800),(390,844),(320,720))
SCREENSHOTS=ROOT/"docs/qa/screenshots"
RECEIPT=ROOT/"docs/qa/FCV588_V35_CANONICAL_CHROME_20261018.json"

def digest(path:Path)->str:
    return sha256(path.read_bytes()).hexdigest()

def sources():
    return {p.relative_to(ROOT).as_posix():digest(p)
       for d in ("src","web")
       for p in sorted((ROOT/d).rglob("*"))
       if p.is_file() and p.suffix.lower() in {".mjs",".js",".css",".html",".svg"}}

def expected_integrated_source():
    v34=json.loads((ROOT/"docs/qa/FCV588_V34_POSTINTEGRATION_INTEGRITY_20261018.json")
                   .read_text(encoding="utf-8"))
    base=v34["sourceManifest"]
    stage=ROOT/"staging/fcv588-v35-c11-d09-d14-instructor"
    manifest=json.loads((stage/"evidence/V35_C11_D09_D14_D15_PATCH_MANIFEST.json")
                        .read_text(encoding="utf-8"))
    if len(base)!=36 or len(manifest["changedFiles"])!=4:
        raise AssertionError("Unexpected canonical V34 or reviewed V35 source set")
    expected=dict(base)
    for item in manifest["changedFiles"]:
        path=item["path"]
        if item["baselineSha256"]!=base.get(path) or (
            digest(stage/path)!=item["stagedSha256"]
        ):
            raise AssertionError("V35 patch source provenance mismatch: "+path)
        expected[path]=item["stagedSha256"]
    if len(expected)!=37 or expected!=sources():
        raise AssertionError("Current canonical V35 differs from frozen V34+V35")
    return expected

def one_viewport(browser,width,height,expected):
    ctx=browser.new_context(
        viewport={"width":width,"height":height},locale="vi-VN",
        device_scale_factor=1,has_touch=True,is_mobile=width<=700)
    page=ctx.new_page()
    errors,requests,loaded,bad_source=[],[],[],[]
    page.on("pageerror",lambda err:errors.append(str(err)))
    page.on("console",lambda m:errors.append(m.text) if m.type=="error" else None)
    page.on("request",lambda req:requests.append(req.url))
    page.on("requestfailed",lambda req:errors.append("failed "+req.url))
    def finished(req):
        try:
            response=req.response()
            uri=urlsplit(req.url)
            path="web/index.html" if uri.path=="/" else uri.path.lstrip("/")
            actual=sha256(response.body()).hexdigest() if response else None
            if response is None or response.status!=200 or uri.hostname!=HOST or (
                uri.port!=PORT or expected.get(path)!=actual
            ):
                raise AssertionError("source bytes, route or status failed: "+path)
            loaded.append({"path":path,"sha256":actual})
        except Exception as exc:
            bad_source.append(str(exc))
    page.on("requestfinished",finished)
    checks=[]
    screenshots=[]
    def check(name,condition,observed=None):
        checks.append({"name":name,"passed":bool(condition),"observed":observed})
        if not condition:
            raise AssertionError(f"{width}x{height} {name}: {observed}")
    def tap(selector):
        element=page.locator(selector)
        if width<=700:element.tap()
        else:element.click()
    def pad(direction,n=1):
        for _ in range(n):tap("#pad-"+direction)
    def snap(label,selector="#instructor-source-matrix"):
        path=SCREENSHOTS/f"fcv588-v35-canonical-20261018-{width}x{height}-{label}.png"
        if path.exists():raise RuntimeError("Refusing overwrite "+str(path))
        page.locator(selector).screenshot(path=str(path))
        screenshots.append({"path":path.relative_to(ROOT).as_posix(),
                             "sha256":digest(path)})
    def state(code):
        return page.locator('[data-matrix-id="'+code+'"]').get_attribute("data-source-state")
    def clear_dialog():
        for _ in range(8):
            if page.locator("#lcd-overlay").is_hidden():return
            tap("#key-menu")
        raise AssertionError("MENU/ESC did not close dialog")
    def menu_entry(category,entry):
        clear_dialog()
        tap("#key-menu")
        names=["Sounder","Display","Alarm","Data","System"]
        pad("right",names.index(category))
        ids=page.locator("#dialog-content .lcd-menu-row").evaluate_all(
            "rows=>rows.map(x=>x.dataset.entryId)")
        check(f"{entry}_present",entry in ids,ids)
        pad("down",ids.index(entry))
        check(f"{entry}_selected",
            page.locator('[data-entry-id="'+entry+'"][aria-current="true"]').count()==1)
    try:
        page.goto(BASE,wait_until="networkidle",timeout=20000)
        block=page.locator("#instructor-source-matrix")
        check("source_matrix_outside_face",block.count()==1 and
              block.evaluate("el=>!el.closest('.equipment') && !el.closest('.device-frame')"))
        check("matrix_is_not_oem_menu",block.locator("text=chỉ đọc").count()>0)
        check("source_status_labels_are_human_readable",
              block.locator(".source-matrix-state").evaluate_all(
                  "els=>els.every(e=>!(/^[A-Z0-9_]{5,}$/.test(e.textContent.trim())))"))
        check("initial_c11_off",state("C11")=="DEVICE_OFF")
        check("initial_d09_ungranted",state("D09")=="NO_VIRTUAL_OPTION")
        check("initial_d14_off",state("D14")=="DEVICE_OFF")
        snap("initial")
        tap("#btn-pause")
        tap("#key-power")
        for _ in range(4):tap("#btn-step")
        check("booted_without_nav_data",state("D14")=="NO_TRAINING_DATA")
        tap("#btn-nav-fixture")
        tap("#btn-step")
        check("typed_own_fresh",state("D14")=="SYNTHETIC_TRAINING_OBSERVATION"
              and "Transport: NONE" in block.inner_text())
        check("no_destination_yet",state("C11")=="NO_DESTINATION")
        snap("fresh-no-destination")
        tap("#key-mark")
        check("mark_wpt_exists", "Waypoint: 1/20" in
              page.locator("#source-matrix-c11-details").inner_text())
        menu_entry("Data","data.destination")
        tap("#key-enter")
        pad("down")
        tap("#key-enter")
        check("typed_waypoint_selected",state("C11")=="SYNTHETIC_DESTINATION_READY" and
              "WP001" in page.locator("#source-matrix-c11-summary").inner_text())
        snap("active-waypoint")
        tap("#btn-nav-fixture")
        check("revoked_position_not_route",state("D14")=="NO_TRAINING_DATA" and
              state("C11")=="DESTINATION_WAITING_SOURCE")
        tap("#btn-tankenmaru-fixture")
        check("virtual_grant_still_off",state("D09")=="DECLARED_BUT_OFF")
        menu_entry("System","system.tankenmaru")
        tap("#key-enter")
        pad("right")
        tap("#key-enter")
        check("virtual_on_suppresses_nmea",
              state("D09")=="VIRTUAL_OPTION_REFERENCE" and
              state("D14")=="INACTIVE_TANKENMARU")
        check("no_rf_claim",
              "Không phát RF" in page.locator("#source-matrix-d09-details").inner_text())
        snap("tankenmaru-on")
        tap("#btn-tankenmaru-fixture")
        check("revoking_option_fails_closed",
              state("D09")=="NO_VIRTUAL_OPTION" and
              state("D14")=="NO_TRAINING_DATA")
        snap("option-revoked")
        check("no_horizontal_overflow",page.evaluate(
              "document.documentElement.scrollWidth<=window.innerWidth+1"))
        check("all_requests_local",all(
              urlsplit(url).hostname==HOST and urlsplit(url).port==PORT for url in requests),
              requests)
        check("all_loaded_bytes_match",not bad_source and len(loaded)==len(requests) and
              {"web/index.html","web/app.mjs",
               "web/fcv588-training-source-matrix.mjs"}.issubset(
                   {item["path"] for item in loaded}),
              bad_source)
        check("no_console_or_network_errors",not errors,errors)
        return {"viewport":f"{width}x{height}","checks":checks,
                "screenshots":screenshots,"verifiedBrowserResponses":len(loaded),
                "requestedPaths":sorted({urlsplit(url).path for url in requests}),
                "result":"PASS"}
    finally:
        ctx.close()

def main():
    if RECEIPT.exists() or any(SCREENSHOTS.glob("fcv588-v35-canonical-20261018-*.png")):
        raise RuntimeError("V35 run is write-once; do not overwrite evidence")
    SCREENSHOTS.mkdir(parents=True,exist_ok=True)
    with socket.socket() as sock:
        sock.settimeout(.3)
        if sock.connect_ex((HOST,PORT))==0:
            raise RuntimeError("QA port occupied; refuse foreign service")
    before=expected_integrated_source()
    harness_before=digest(Path(__file__))
    flags=getattr(subprocess,"CREATE_NO_WINDOW",0)
    env=os.environ.copy();env["PORT"]=str(PORT)
    server=subprocess.Popen(["node",str(ROOT/"tools/server.mjs")],
        cwd=str(ROOT),env=env,stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,
        creationflags=flags)
    try:
        for _ in range(60):
            if server.poll() is not None:raise RuntimeError("Loopback server exited")
            try:
                with urlopen(BASE,timeout=.5) as resp:
                    if resp.status==200:break
            except OSError:time.sleep(.1)
        else:raise RuntimeError("Loopback server not ready")
        result={"collectedAtUtc":datetime.now(timezone.utc).isoformat(),
                "scope":"V35_CANONICAL_D15_C11_D09_D14_SOURCE_BOUND",
                "viewports":[],"hardwareValidated":False,"releaseApproval":"HOLD",
                "runtimeIntegrated":True}
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=str(CHROME),headless=True)
            result["chromeVersion"]=browser.version
            try:
                for width,height in VIEWPORTS:
                    result["viewports"].append(one_viewport(browser,width,height,before))
            finally:browser.close()
        if before!=sources() or digest(Path(__file__))!=harness_before:
            raise AssertionError("V35 canonical source or test harness drift")
        result["servedRuntimeFiles"]=len(before)
        result["sourceManifestSha256"]=sha256(json.dumps(
            before,sort_keys=True).encode()).hexdigest()
        result["browserHarnessSha256"]=harness_before
        result["sourceStable"]=True
        result["status"]="CANONICAL_V35_SOURCE_MATRIX_BROWSER_PASS"
        with RECEIPT.open("x",encoding="utf-8",newline="\n") as out:
            json.dump(result,out,ensure_ascii=False,indent=2)
            out.write("\n")
        print(json.dumps({"status":result["status"],
          "viewports":[v["viewport"] for v in result["viewports"]],
          "checks":sum(len(v["checks"]) for v in result["viewports"]),
          "images":sum(len(v["screenshots"]) for v in result["viewports"]),
          "servedSourceFiles":len(before),"receiptSha256":digest(RECEIPT)},ensure_ascii=False))
    finally:
        server.terminate()
        try:server.wait(timeout=4)
        except subprocess.TimeoutExpired:
            server.kill();server.wait(timeout=4)

if __name__=="__main__":
    main()
