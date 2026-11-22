"""Chrome media emulation only, NOT Windows High Contrast native certification."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import time
import urllib.request
from playwright.sync_api import sync_playwright

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=ROOT/"plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/p10-forced-colors"
OUT=QA/"P10_CHROME_EMULATED_FORCED_COLORS_20261116.json"
PNG=QA/"P10_CHROME_EMULATED_FORCED_COLORS_1366x768_20261116.png"
P09=ROOT/"docs/qa/FCV588_P09_ROI_BOUNDARY_20261116/FCV588_P09_ROI_BOUNDARY_FINAL_INTEGRITY_20261116.json"
PORT=4208
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def open_port(port):
    with socket.socket() as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1",port))==0
def wait_server(proc):
    for _ in range(40):
        if proc.poll() is not None: raise RuntimeError("owned server exited")
        if open_port(PORT):
            with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/",timeout=2) as r:
                assert r.status==200
            return
        time.sleep(0.1)
    raise RuntimeError("test server HTTP timeout")
def main():
    assert not OUT.exists() and not PNG.exists()
    assert sha(P09)=="759f146c349c2ad348fc5b98e21fbc79d1d857623253811f0a01d3b9408995b9"
    p07=json.loads((ROOT/"docs/qa/FCV588_P07_BOUNDED_20261116/FCV588_P07_BOUNDED_FINAL_INTEGRITY_20261116.json").read_text(encoding="utf-8"))
    assert all(sha(ROOT/n)==h for n,h in p07["canonicalRuntimeSHA256"].items())
    assert open_port(4173) and not open_port(PORT)
    QA.mkdir(parents=True,exist_ok=True)
    server=None
    browser=None
    evidence={
        "schema":"fcv588-p10-chrome-forced-colors-emulation-v1",
        "createdAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),
        "scope":"CHROME_FORCED_COLORS_MEDIA_EMULATION_NOT_NATIVE_WINDOWS_HIGH_CONTRAST",
        "parentP09SHA256":sha(P09),
        "mode":"1366x768 only; source unchanged; one owned Chrome and port",
        "nativeNarratorSpeech":"NOT_RUN","realWindowsForcedColors":"NOT_RUN",
        "realOSWindowBlur":"NOT_VERIFIED"}
    try:
        env=os.environ.copy();env["PORT"]=str(PORT)
        server=subprocess.Popen([r"C:\nvm4w\nodejs\node.exe",str(ROOT/"tools/server.mjs")],
            cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,
            creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
        wait_server(server)
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",headless=True)
            context=browser.new_context(viewport={"width":1366,"height":768},device_scale_factor=1)
            page=context.new_page()
            errors=[]
            page.on("pageerror",lambda x:errors.append(str(x)))
            page.emulate_media(forced_colors="active")
            page.goto(f"http://127.0.0.1:{PORT}/",wait_until="load")
            page.locator("#key-power").focus()
            observation=page.evaluate("""() => {
              const el=document.getElementById('key-power'),style=getComputedStyle(el);
              const tabs=[...document.querySelectorAll('[role=tab]')];
              return {
                forcedColorsMatch:matchMedia('(forced-colors: active)').matches,
                focusedId:document.activeElement?.id,
                powerVisible:!!el.getClientRects().length,
                powerOutlineStyle:style.outlineStyle,
                powerOutlineWidth:style.outlineWidth,
                powerColor:style.color,
                powerBackground:style.backgroundColor,
                instructorTabCount:tabs.length,
                instructorPanelCount:document.querySelectorAll('[role=tabpanel]').length,
                tabsWithNames:tabs.filter(x=>!!(x.getAttribute('aria-label')||x.textContent.trim())).length,
                lcdIsGlobalLiveRegion:!!document.querySelector('.lcd[aria-live]'),
                pageHorizontalOverflow:document.documentElement.scrollWidth>innerWidth
              };
            }""")
            assert observation["forcedColorsMatch"] and observation["focusedId"]=="key-power"
            assert observation["powerVisible"] and observation["instructorTabCount"]==5
            assert observation["instructorPanelCount"]==5 and observation["tabsWithNames"]==5
            assert not observation["lcdIsGlobalLiveRegion"]
            assert not errors
            page.screenshot(path=str(PNG),full_page=False)
            evidence["status"]="PASS_EMULATED_FORCED_COLORS_BOUNDED_DOM_CHECKS"
            evidence["observation"]=observation
            evidence["consolePageErrors"]=errors
            evidence["screenshot"]={"path":str(PNG.relative_to(ROOT)).replace("\\","/"),
                                    "sha256":sha(PNG),"bytes":PNG.stat().st_size}
            context.close()
            browser.close();browser=None
    except Exception as exc:
        evidence["status"]="FAILED_OR_BLOCKED"
        evidence["failure"]=repr(exc)
    finally:
        if browser is not None:
            try:browser.close()
            except Exception:pass
        if server is not None:
            try:server.terminate();server.wait(timeout=5)
            except Exception:
                try:server.kill();server.wait(timeout=3)
                except Exception:pass
        evidence["cleanup"]={"testPortClosed":not open_port(PORT),"user4173Alive":open_port(4173)}
        evidence["runtime39Unchanged"]=all(sha(ROOT/n)==h for n,h in p07["canonicalRuntimeSHA256"].items())
        with OUT.open("x",encoding="utf-8",newline="\n") as f:
            json.dump(evidence,f,ensure_ascii=False,sort_keys=True,indent=2)
            f.write("\n")
        print(json.dumps({"status":evidence["status"],"receiptSHA256":sha(OUT),"cleanup":evidence["cleanup"],"failure":evidence.get("failure")}))
    if evidence["status"]!="PASS_EMULATED_FORCED_COLORS_BOUNDED_DOM_CHECKS":raise SystemExit(2)
if __name__=="__main__":main()
