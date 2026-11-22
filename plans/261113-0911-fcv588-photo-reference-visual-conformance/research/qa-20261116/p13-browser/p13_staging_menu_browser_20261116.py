"""Single-owned Chrome menu traversal against P13 isolated staging, no OEM rights use.

Verifies source AP-1 row order, 2 real viewports, 36 actual module HTTP bodies
per viewport, no external I/O, replay gap explicitly NOT accepted.
"""
import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import socket
import subprocess
import time
from urllib.error import HTTPError
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
STAGE=ROOT/"_p13_stage_20261116"
QA=ROOT/"plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/p13-browser"
OUT=QA/"P13_STAGING_REAL_CHROME_MENU_AP1_20261116.json"
PORT=4213
NODE=Path(r"C:\nvm4w\nodejs\node.exe")
CHROME=Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
P12=ROOT/"docs/qa/FCV588_P12_MENU_SOURCE_20261116/FCV588_P12_MENU_SOURCE_FINAL_INTEGRITY_20261116.json"
P07=ROOT/"docs/qa/FCV588_P07_BOUNDED_20261116/FCV588_P07_BOUNDED_FINAL_INTEGRITY_20261116.json"
EXPECTED=[
  "sounder.pictureAdvance","sounder.zoomMode","sounder.shift",
  "sounder.interference","sounder.colorErase","sounder.clutter",
  "sounder.whiteLine","sounder.whiteMarker","sounder.tvg",
  "sounder.smoothing","sounder.bottomZone","sounder.txPower","sounder.txRate",
]
P07_HARNESS=ROOT/"plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/p07-browser/p07_independent_visual_browser_qa.py"

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def hash_bytes(data):
    return hashlib.sha256(data).hexdigest()
def listening(port):
    with socket.socket() as sock:
        sock.settimeout(0.35)
        return sock.connect_ex(("127.0.0.1",port))==0
def wait_server(process):
    for _ in range(70):
        if process.poll() is not None:
            raise RuntimeError("owned P13 staging server died")
        if listening(PORT):
            with urlopen(f"http://127.0.0.1:{PORT}/",timeout=3) as response:
                if response.status==200:return
        time.sleep(0.1)
    raise RuntimeError("P13 staging server HTTP200 timeout")
def rows(page):
    return page.evaluate("""()=>[...document.querySelectorAll('#dialog-content .lcd-menu-row')]
      .map((node,i)=>({index:i,id:node.dataset.entryId,
        selected:node.getAttribute('aria-current')==='true',
        label:node.querySelector('.lcd-menu-label')?.textContent,
        sourceGrade:node.dataset.sourceGrade}))""")
def capture(page,basename):
    path=QA/(basename+".png")
    if path.exists():raise RuntimeError("write-once screenshot collision")
    page.screenshot(path=str(path),full_page=False)
    return {"path":str(path.relative_to(ROOT)).replace("\\","/"),
            "sha256":sha(path),"bytes":path.stat().st_size}

def verify_sources():
    assert not OUT.exists()
    assert sha(P12)=="5afe2663a1d0d3dff6e213fc537fad3b7dfe5817d7aa776ee4a769e580780855"
    assert sha(STAGE/"src/devices/fcv588/menu-atlas.mjs")=="e2ba214cf81aa739452dc1ecd0ddfdcc7fad7814478a2d5e27e6925eda945aca"
    sealed=json.loads(P07.read_text(encoding="utf-8"))
    assert len(sealed["canonicalRuntimeSHA256"])==39
    stage_sha={}
    for rel,old_sha in sealed["canonicalRuntimeSHA256"].items():
        assert sha(ROOT/rel)==old_sha,("canonical source changed",rel)
        stage_sha[rel]=sha(STAGE/rel)
        if rel!="src/devices/fcv588/menu-atlas.mjs":
            assert stage_sha[rel]==old_sha,("unexpected staging runtime edit",rel)
    assert listening(4173) and not listening(PORT)
    assert NODE.is_file() and CHROME.is_file()
    return stage_sha

def main():
    QA.mkdir(parents=True,exist_ok=True)
    stage_sha=verify_sources()
    evidence={
      "schema":"fcv588-p13-stage-chrome-ap1-menu-v1",
      "createdAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),
      "scope":"STAGING_2_REAL_VIEWPORTS_OPERATOR_MENU_AND_ACTUAL_HTTP_BODY_HASHES",
      "ap1Source":"FURUNO OME-23890-E PDF page59 printed AP-1; photographed Vietnamese menu separate",
      "sourceP12FinalSHA256":sha(P12),
      "stageRuntimeCount":len(stage_sha),
      "stageMenuSHA256":stage_sha["src/devices/fcv588/menu-atlas.mjs"],
      "nativeFirmwareLocale":"UNKNOWN_NOT_CERTIFIED",
      "profile21HistoricalReplay":"NOT_VERIFIED_APPLY_HOLD",
      "browser":"Google Chrome installed - Playwright-owned one process",
      "states":[],"externalRequests":[],"consoleErrors":[],"requestFailures":[]}
    spec=importlib.util.spec_from_file_location("p07_reference_browser",P07_HARNESS)
    p07=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(p07)
    expected_bodies=set(p07.EXPECTED_LOADED_PATHS)
    assert len(expected_bodies)==36
    server=None
    stage="preflight"
    try:
        stage="start test-owned loopback server"
        env=os.environ.copy()
        env["PORT"]=str(PORT)
        server=subprocess.Popen([str(NODE),str(STAGE/"tools/server.mjs")],
            cwd=STAGE,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,
            creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
        wait_server(server)
        for forbidden in [
            "/sources/FCV588_GiaoDienThucTeMay2016/giaoDien.jpg",
            "/docs/qa/FCV588_P12_MENU_SOURCE_20261116/",
            "/_p13_stage_20261116/sources/manuals/MANIFEST.json",
        ]:
            try:
                with urlopen(f"http://127.0.0.1:{PORT}{forbidden}",timeout=3):
                    raise AssertionError("test server exposed reference/QA asset")
            except HTTPError as err:
                assert err.code in (403,404)
        stage="headed Chrome menu actions"
        with sync_playwright() as play:
            browser=play.chromium.launch(executable_path=str(CHROME),headless=True,
                args=["--no-first-run","--no-default-browser-check"])
            try:
                for w,h in ((375,812),(1366,768)):
                    context=browser.new_context(viewport={"width":w,"height":h})
                    page=context.new_page()
                    responses=[]
                    page.on("response",lambda x:responses.append(x))
                    page.on("request",lambda x:evidence["externalRequests"].append(x.url)
                        if not x.url.startswith(f"http://127.0.0.1:{PORT}/") else None)
                    page.on("pageerror",lambda x:evidence["consoleErrors"].append(str(x)))
                    page.on("requestfailed",lambda x:evidence["requestFailures"].append(x.url))
                    page.goto(f"http://127.0.0.1:{PORT}/",wait_until="networkidle",timeout=16000)
                    page.locator("#btn-pause").click()
                    page.locator("#key-power").click()
                    for _ in range(4):page.locator("#btn-step").click()
                    assert page.locator("#off-screen").is_hidden(),"LCD did not boot"
                    page.locator("#key-menu").click()
                    assert page.locator("#lcd-overlay").get_attribute("data-layout")=="main-menu"
                    all_rows=rows(page)
                    actual=[x["id"] for x in all_rows]
                    assert actual==EXPECTED,("Sounder menu order differs from AP-1",actual)
                    assert all(x["sourceGrade"] for x in all_rows)
                    assert page.locator("#dialog-title").inner_text().strip()=="Sounder"
                    assert page.locator("#lcd-menu-categories [aria-current='true']").inner_text().strip()=="Sounder"
                    screenshots=[capture(page,f"P13_STAGE_{w}x{h}_00_AP1_FIRST")]
                    trace=[{"ordinal":0,"selectedId":all_rows[0]["id"]}]
                    for target in (1,2,5,7):
                        for _ in range(target-int(trace[-1]["ordinal"])):
                            page.locator("#pad-down").click()
                        selected=[x for x in rows(page) if x["selected"]]
                        assert len(selected)==1 and selected[0]["id"]==EXPECTED[target],(
                            "wrong physical TrackPad selected row",target,selected)
                        trace.append({"ordinal":target,"selectedId":selected[0]["id"],
                                      "label":selected[0]["label"]})
                        if target in (2,7):
                            screenshots.append(capture(page,
                                f"P13_STAGE_{w}x{h}_{target:02d}_{selected[0]['id'].split('.')[-1]}"))
                    # White Marker is a TRAINING enum, not OEM firmware value proof.
                    page.locator("#key-enter").click()
                    assert not page.locator("#lcd-menu-options").is_hidden()
                    options=page.locator("#lcd-menu-options [role=listitem]").all_inner_texts()
                    assert options==["Off","White","Gray"],("training-only White Marker enum drift",options)
                    screenshots.append(capture(page,f"P13_STAGE_{w}x{h}_07_WhiteMarker_Editing"))
                    page.locator("#key-menu").click()
                    assert page.locator("#lcd-menu-options").is_hidden()
                    assert page.locator("#dialog-content .lcd-menu-row[aria-current=true]").get_attribute(
                        "data-entry-id")=="sounder.whiteMarker"
                    # Require body of every loaded source to match STAGING files.
                    body_hashes={}
                    for response in responses:
                        if not response.url.startswith(f"http://127.0.0.1:{PORT}/"):
                            continue
                        path=response.url.split(f"http://127.0.0.1:{PORT}/",1)[1].split("?",1)[0]
                        rel="web/index.html" if not path else path
                        if rel not in expected_bodies:
                            continue
                        assert response.status==200,("loaded module HTTP not 200",rel)
                        actual_hash=hash_bytes(response.body())
                        assert actual_hash==stage_sha[rel],("served wrong byte source",rel)
                        body_hashes[rel]=actual_hash
                    assert set(body_hashes)==expected_bodies,(
                        "browser did not actually load expected 36 source bodies",
                        sorted(expected_bodies-set(body_hashes)))
                    assert not evidence["consoleErrors"] and not evidence["externalRequests"]
                    assert not evidence["requestFailures"]
                    evidence["states"].append({"viewport":[w,h],"menuOrder":actual,
                        "operatorSelectionTrace":trace,"editorTrainingValues":options,
                        "screenshots":screenshots,"loadedBodySHA256":body_hashes,
                        "loadedBodyCount":len(body_hashes),
                        "horizontalOverflow":page.evaluate(
                            "()=>document.documentElement.scrollWidth>innerWidth")})
                    context.close()
                evidence["status"]="PASS_BOUNDED_CHROME_AP1_ORDER_AND_ACTUAL_SOURCE_BYTES_NATIVE_REPLAY_HOLD"
            finally:
                browser.close()
    except Exception as exc:
        evidence["status"]="FAILED_OR_BLOCKED"
        evidence["failureStage"]=stage
        evidence["failure"]=repr(exc)
    finally:
        if server is not None:
            try:server.terminate();server.wait(timeout=5)
            except Exception:
                try:server.kill();server.wait(timeout=5)
                except Exception:pass
        evidence["cleanup"]={"testPortClosed":not listening(PORT),
                             "user4173Alive":listening(4173)}
        evidence["stageRuntime39Stable"]=all(sha(STAGE/rel)==digest for rel,digest in stage_sha.items())
        evidence["canonicalRuntime39Stable"]=all(
            sha(ROOT/rel)==digest for rel,digest
            in json.loads(P07.read_text(encoding="utf-8"))["canonicalRuntimeSHA256"].items())
        with OUT.open("x",encoding="utf-8",newline="\n") as f:
            json.dump(evidence,f,indent=2,sort_keys=True,ensure_ascii=False)
            f.write("\n")
        print(json.dumps({"status":evidence["status"],
            "states":len(evidence["states"]),
            "screenshots":sum(len(x["screenshots"]) for x in evidence["states"]),
            "loadedBodies":sum(x["loadedBodyCount"] for x in evidence["states"]),
            "receiptSHA256":sha(OUT),
            "cleanup":evidence["cleanup"],
            "failure":evidence.get("failure")}))
    if not evidence["status"].startswith("PASS_BOUNDED"):raise SystemExit(2)

if __name__=="__main__":main()
