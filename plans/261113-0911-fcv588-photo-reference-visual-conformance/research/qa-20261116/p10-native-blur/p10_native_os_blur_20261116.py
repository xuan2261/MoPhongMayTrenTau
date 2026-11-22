"""Bounded genuine Win32 foreground-switch POWER hold test; no app source edits."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import tkinter
import time
import urllib.request

import win32gui
from playwright.sync_api import sync_playwright

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=ROOT/"plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/p10-native-blur"
P09=ROOT/"docs/qa/FCV588_P09_ROI_BOUNDARY_20261116/FCV588_P09_ROI_BOUNDARY_FINAL_INTEGRITY_20261116.json"
NODE=Path(r"C:\nvm4w\nodejs\node.exe")
CHROME=Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
OUT=QA/"P10_GENUINE_WINDOWS_POWER_BLUR_RECEIPT_20261116.json"
PORT=4208

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def port_open(port):
    with socket.socket() as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1",port))==0

def wait_port(proc):
    for _ in range(50):
        if proc.poll() is not None: raise RuntimeError("owned server exited")
        if port_open(PORT):
            with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/",timeout=2) as r:
                if r.status==200:return
        time.sleep(0.1)
    raise RuntimeError("owned server did not reach HTTP200")

JS="""(() => {
  window.__p10Events=[];
  for(const k of ['focus','blur']) {
    window.addEventListener(k,e=>window.__p10Events.push({
      type:k,trusted:e.isTrusted,ms:performance.now(),hasFocus:document.hasFocus(),
      powerPressing:!!document.getElementById('key-power')?.classList.contains('pressing'),
      eventCount:document.getElementById('event-count')?.textContent?.trim()
    }),true);
  }
})()"""

def snap(page):
    return page.evaluate("""()=>({
      focus:document.hasFocus(),
      powerPressing:document.getElementById('key-power').classList.contains('pressing'),
      eventCount:Number(document.getElementById('event-count')?.textContent?.trim()||0),
      status:document.getElementById('status-line')?.textContent?.trim(),
      screen:document.getElementById('screen-top')?.textContent?.trim(),
      events:window.__p10Events||[]
    })""")

def main():
    assert not OUT.exists(),"write-once receipt exists"
    assert sha(P09)=="759f146c349c2ad348fc5b98e21fbc79d1d857623253811f0a01d3b9408995b9"
    parent=json.loads(P09.read_text(encoding="utf-8"))
    p07=json.loads((ROOT/"docs/qa/FCV588_P07_BOUNDED_20261116/FCV588_P07_BOUNDED_FINAL_INTEGRITY_20261116.json").read_text(encoding="utf-8"))
    for name,h in p07["canonicalRuntimeSHA256"].items():
        assert sha(ROOT/name)==h,name
    assert port_open(4173) and not port_open(PORT)
    assert NODE.exists() and CHROME.exists()
    QA.mkdir(parents=True,exist_ok=True)
    server=None
    tk=None
    browser=None
    stage="preflight"
    evidence={"schema":"p10-windows-power-blur-v1","createdAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),
              "sourceP09FinalSHA256":sha(P09),"runtimeSourceCount":39,
              "port4173Unowned":True,"ownedPort":PORT,"eventProvenance":"real Win32 foreground change, browser window native Event.isTrusted",
              "limitations":["OS process activation proven, but no Narrator spoken output or NVDA tested","Test uses Chrome in a dedicated QA browser with isolated state, not user-owned browser"]}
    try:
        stage="start QA-owned server"
        env=os.environ.copy();env["PORT"]=str(PORT)
        server=subprocess.Popen([str(NODE),str(ROOT/"tools/server.mjs")],cwd=ROOT,env=env,
                                stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,
                                creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
        wait_port(server)
        stage="headed Chrome real OS focus"
        with sync_playwright() as play:
            browser=play.chromium.launch(executable_path=str(CHROME),headless=False,
                args=["--no-first-run","--no-default-browser-check","--window-position=80,80","--window-size=950,850"])
            context=browser.new_context(viewport={"width":900,"height":700})
            context.add_init_script(JS)
            page=context.new_page()
            page.goto(f"http://127.0.0.1:{PORT}/",wait_until="load",timeout=15000)
            page.locator("#key-power").wait_for()
            page.bring_to_front()
            page.locator("#key-power").focus()
            focus_start=snap(page)
            if not focus_start["focus"]:
                raise RuntimeError("Chrome not actually in foreground before keydown")
            stage="real keyboard held and helper Win32 foreground steal"
            page.keyboard.down("Space")
            during=snap(page)
            assert during["powerPressing"] and during["eventCount"]==focus_start["eventCount"]+1,during
            foreground_before=win32gui.GetForegroundWindow()
            tk=tkinter.Tk()
            tk.title("FCV588-P10-OWNED-FOCUS-WITNESS")
            tk.geometry("320x120+25+25")
            tkinter.Label(tk,text="P10 controlled OS focus witness").pack()
            tk.update()
            tk.lift()
            tk.focus_force()
            tk.update()
            try:win32gui.SetForegroundWindow(tk.winfo_id())
            except Exception:pass
            for _ in range(20):
                tk.update()
                if not snap(page)["focus"]:break
                time.sleep(0.1)
            foreground_during=win32gui.GetForegroundWindow()
            blurred=snap(page)
            assert foreground_during!=foreground_before,"foreground HWND unchanged"
            assert not blurred["focus"],"Chrome remained document-focused"
            assert any(x["type"]=="blur" and x["trusted"] for x in blurred["events"]),blurred
            assert not blurred["powerPressing"],"POWER stranded in pressed state after real blur"
            assert blurred["eventCount"]==during["eventCount"]+1,"cancel event count did not increment exactly once"
            stage="release keyboard and check no duplicate up"
            page.keyboard.up("Space")
            tk.destroy();tk=None
            page.bring_to_front()
            after=snap(page)
            assert after["eventCount"]==blurred["eventCount"],"stray POWER up after cancelled hold"
            assert after["status"]==focus_start["status"],"power status drift"
            evidence["measurement"]={"before":focus_start,"whileKeyHeld":during,
                "afterNativeOSBlur":blurred,"afterRefocusAndKeyRelease":after,
                "win32ForegroundHwndBefore":foreground_before,
                "win32ForegroundHwndDuring":foreground_during}
            evidence["status"]="PASS_GENUINE_WIN32_BLUR_CANCELS_POWER_HOLD"
            context.close()
            browser.close();browser=None
    except Exception as e:
        evidence["status"]="FAILED_OR_BLOCKED"
        evidence["failureStage"]=stage
        evidence["failure"]=repr(e)
    finally:
        if tk is not None:
            try:tk.destroy()
            except Exception:pass
        if browser is not None:
            try:browser.close()
            except Exception:pass
        if server is not None:
            try:
                server.terminate()
                server.wait(timeout=5)
            except Exception:
                try:server.kill();server.wait(timeout=3)
                except Exception:pass
        evidence["cleanup"]={"qaPortClosed":not port_open(PORT),"userPort4173Open":port_open(4173)}
        evidence["runtimeAfter"]=all(sha(ROOT/n)==h for n,h in p07["canonicalRuntimeSHA256"].items())
        evidence["p09Unchanged"]=sha(P09)=="759f146c349c2ad348fc5b98e21fbc79d1d857623253811f0a01d3b9408995b9"
        with OUT.open("x",encoding="utf-8",newline="\n") as f:
            json.dump(evidence,f,ensure_ascii=False,sort_keys=True,indent=2);f.write("\n")
        print(json.dumps({"status":evidence["status"],"receiptSHA256":sha(OUT),
            "cleanup":evidence["cleanup"],"stage":evidence.get("failureStage"),
            "failure":evidence.get("failure")}))
    if evidence["status"]!="PASS_GENUINE_WIN32_BLUR_CANCELS_POWER_HOLD":
        raise SystemExit(2)

if __name__=="__main__":
    main()
