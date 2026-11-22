"""P11: one owned Chrome + real Win32 foreground witness; source-frozen QA.

No native-blur PASS is possible until foreground HWND is proven to be Chrome.
No synthetic JavaScript blur events are dispatched.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import time
import tkinter as tk
import urllib.request

import psutil
import win32con
import win32gui
import win32process
from playwright.sync_api import sync_playwright

ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
QA = ROOT / "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/p11-os-focus"
OUT = QA / "P11_GENUINE_WIN32_FOREGROUND_POWER_V2_20261116.json"
READY = QA / "P11_V2_FOREGROUND_READY_20261116.json"
P10_FINAL = ROOT / "docs/qa/FCV588_P10_A11Y_BOUNDARIES_20261116/FCV588_P10_A11Y_BOUNDARIES_FINAL_INTEGRITY_20261116.json"
P07_FINAL = ROOT / "docs/qa/FCV588_P07_BOUNDED_20261116/FCV588_P07_BOUNDED_FINAL_INTEGRITY_20261116.json"
NODE = Path(r"C:\nvm4w\nodejs\node.exe")
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
PORT = 4211

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def is_listening(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.35)
        return s.connect_ex(("127.0.0.1", port)) == 0

def hwnd_info(hwnd):
    if not hwnd or not win32gui.IsWindow(hwnd):
        return {"hwnd": hwnd, "valid": False}
    tid, pid = win32process.GetWindowThreadProcessId(hwnd)
    try:
        proc = psutil.Process(pid)
        executable = proc.name()
        executable_path = proc.exe()
    except Exception:
        executable = "UNKNOWN"
        executable_path = "UNKNOWN"
    return {"hwnd": hwnd, "valid": True, "threadId": tid, "pid": pid,
            "processName": executable, "executablePath": executable_path,
            "title": win32gui.GetWindowText(hwnd)}

def foreground():
    return hwnd_info(win32gui.GetForegroundWindow())

def enumerated_windows():
    result = []
    def add(hwnd, unused):
        if not win32gui.IsWindowVisible(hwnd):
            return
        title = win32gui.GetWindowText(hwnd)
        if not title.strip():
            return
        item = hwnd_info(hwnd)
        if item["processName"].lower() == "chrome.exe":
            result.append(item)
    win32gui.EnumWindows(add, None)
    return result

def activate_owned_top_level(hwnd):
    if not win32gui.IsWindow(hwnd):
        return False
    win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
    try:
        win32gui.SetForegroundWindow(hwnd)
    except Exception:
        pass
    # Windows foreground lock must be respected, not bypassed using pointer
    # injection; a denial is an environment/harness BLOCKED outcome.
    for _ in range(8):
        if win32gui.GetForegroundWindow() == hwnd:
            return True
        time.sleep(0.1)
    return False

def wait_server(proc):
    for _ in range(50):
        if proc.poll() is not None:
            raise RuntimeError("P11 owned loopback server exited")
        if is_listening(PORT):
            with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/", timeout=3) as response:
                if response.status == 200:
                    return
        time.sleep(0.1)
    raise RuntimeError("P11 owned server failed to respond HTTP200")

SCRIPT = """(() => {
 window.__p11OS = [];
 for (const type of ['focus', 'blur']) {
   window.addEventListener(type, (ev) => {
     window.__p11OS.push({
       type, isTrusted: ev.isTrusted, timestampMs: performance.now(),
       documentHasFocus: document.hasFocus(),
       powerPressing: !!document.getElementById('key-power')?.classList.contains('pressing'),
       eventCount: document.getElementById('event-count')?.textContent?.trim()
     });
   }, true);
 }
})()"""

def snapshot(page):
    return page.evaluate("""() => ({
      hasFocus:document.hasFocus(),
      activeId:document.activeElement?.id,
      powerPressing:document.querySelector('#key-power')?.classList.contains('pressing'),
      eventCount:Number(document.querySelector('#event-count')?.textContent?.trim() || 0),
      status:document.querySelector('#status-line')?.textContent?.trim(),
      screen:document.querySelector('#screen-top')?.textContent?.trim(),
      osEvents:window.__p11OS || []
    })""")

def main():
    QA.mkdir(parents=True, exist_ok=True)
    assert not OUT.exists() and not READY.exists(), "P11 v2 evidence already exists; never overwrite"
    assert sha(P10_FINAL) == "414c0151053bec55271032170e0fba2139fd1627e5fee7524cdf6c1bcf490655"
    p07 = json.loads(P07_FINAL.read_text(encoding="utf-8"))
    assert len(p07["canonicalRuntimeSHA256"]) == 39
    for name, h in p07["canonicalRuntimeSHA256"].items():
        assert sha(ROOT/name) == h, ("runtime SHA drift", name)
    assert is_listening(4173) and not is_listening(PORT)
    assert NODE.is_file() and CHROME.is_file()

    evidence = {
        "schema": "fcv588-p11-real-win32-foreground-power-blur-v2",
        "createdAt": datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),
        "parentP10FinalSHA256": sha(P10_FINAL),
        "scriptSHA256": sha(Path(__file__)),
        "runtimeFrozenSHA256Count": 39,
        "ownedTestPort": PORT,
        "scope": "WIN32_NATIVE_WINDOW_FOREGROUND_AND_BROWSER_IS_TRUSTED_BLUR_FOR_KEYBOARD_SPACE_POWER_HOLD",
        "nativeNarratorSpokenOutput": "NOT_RUN",
        "nativeNVDA": "NOT_RUN",
        "nativeHighContrast": "NOT_RUN",
        "physicalHardwarePOWERKey": "NOT_USED_BROWSER_KEYBOARD_AUTOMATION",
        "disallowFabricatedEvent": True,
    }
    previous_foreground = win32gui.GetForegroundWindow()
    evidence["previousForeground"] = hwnd_info(previous_foreground)
    server = browser = witness = None
    stage = "preflight"
    try:
        stage = "owned server and headed Chrome"
        env = os.environ.copy()
        env["PORT"] = str(PORT)
        server = subprocess.Popen(
            [str(NODE), str(ROOT/"tools/server.mjs")], cwd=ROOT, env=env,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        wait_server(server)
        with sync_playwright() as play:
            browser = play.chromium.launch(
                executable_path=str(CHROME), headless=False,
                args=["--no-first-run", "--no-default-browser-check",
                      "--window-position=160,80", "--window-size=1000,820"])
            context = browser.new_context(viewport={"width": 950, "height": 720})
            context.add_init_script(SCRIPT)
            page = context.new_page()
            page.goto(f"http://127.0.0.1:{PORT}/", wait_until="load", timeout=15000)
            page.locator("#key-power").wait_for()

            stage = "verify Chrome top-level HWND foreground"
            windows = enumerated_windows()
            candidates = [w for w in windows if "FCV-588 Public Reference" in w["title"]]
            evidence["chromeWindows"] = windows[:12]
            evidence["chromeCandidates"] = candidates
            if len(candidates) != 1:
                raise RuntimeError(f"Expected exactly 1 owned Chrome window title, got {len(candidates)}")
            owned = candidates[0]
            assert owned["processName"].lower() == "chrome.exe"
            assert os.path.normcase(owned["executablePath"]) == os.path.normcase(str(CHROME)), (
                "Chrome executable is not the isolated Google Chrome binary", owned)
            activated = activate_owned_top_level(owned["hwnd"])
            if not activated:
                # A separate desktop owner will explicitly activate this
                # observed, owned HWND; no mouse injection or foreground hacks.
                with READY.open("x", encoding="utf-8") as fh:
                    json.dump({"chromeHwnd": owned["hwnd"],
                               "chromePID": owned["pid"],
                               "chromeExecutable": owned["executablePath"],
                               "chromeTitle": owned["title"],
                               "status": "READY_FOR_USER_DESKTOP_ACTIVATION"}, fh)
                print(json.dumps({"status":"READY_FOR_DESKTOP_ACTIVATION",
                                  "chromeHwnd":owned["hwnd"],
                                  "chromePID":owned["pid"]}),flush=True)
                for _ in range(150):
                    if win32gui.GetForegroundWindow() == owned["hwnd"]:
                        activated = True
                        break
                    time.sleep(0.2)
            time.sleep(0.12)
            os_before = foreground()
            evidence["activation"] = {"activated": activated,
                                      "ChromeOwnedHwnd": owned["hwnd"],
                                      "beforeKeyDownForeground": os_before}
            if not activated or os_before["hwnd"] != owned["hwnd"]:
                raise RuntimeError("P11 test Chrome did not own real Win32 foreground before POWER keydown")
            page.locator("#key-power").focus()
            pre = snapshot(page)
            assert pre["hasFocus"] and pre["activeId"] == "key-power", pre
            # Reset only the test-owned recorder, not app session event log.
            page.evaluate("window.__p11OS = []")
            evidence["beforePowerDown"] = pre

            stage = "POWER keydown under proven foreground HWND"
            page.keyboard.down("Space")
            held = snapshot(page)
            os_held = foreground()
            evidence["powerHeld"] = held
            evidence["powerHeldForeground"] = os_held
            assert os_held["hwnd"] == owned["hwnd"], "Chrome foreground lost before controlled focus-switch"
            assert held["powerPressing"], "POWER key not visually held"
            assert held["eventCount"] == pre["eventCount"] + 1, "POWER down edge not logged exactly once"

            stage = "true Win32 foreground transfer to test-owned witness"
            witness = tk.Tk()
            witness.title("FCV588-P11-REAL-FOCUS-WITNESS")
            witness.geometry("410x145+30+30")
            tk.Label(witness, text="P11 — real native OS focus witness").pack(pady=14)
            witness.update()
            title_to_hwnd = []
            def match_witness(hwnd, unused):
                if win32gui.GetWindowText(hwnd) == "FCV588-P11-REAL-FOCUS-WITNESS":
                    title_to_hwnd.append(hwnd)
            win32gui.EnumWindows(match_witness, None)
            if len(title_to_hwnd) != 1:
                raise RuntimeError("Owned top-level witness HWND not uniquely discoverable")
            witness_hwnd = title_to_hwnd[0]
            assert hwnd_info(witness_hwnd)["pid"] == os.getpid(), "Witness HWND owned by another process"
            # Tk may foreground itself on creation; if not, activate its
            # real top-level HWND (not Tk's child/winfo_id).
            if win32gui.GetForegroundWindow() != witness_hwnd:
                activate_owned_top_level(witness_hwnd)
            for _ in range(16):
                witness.update()
                if win32gui.GetForegroundWindow() == witness_hwnd and not snapshot(page)["hasFocus"]:
                    break
                time.sleep(0.1)
            os_after = foreground()
            after_blur = snapshot(page)
            evidence["witnessHwnd"] = hwnd_info(witness_hwnd)
            evidence["afterNativeForegroundTransfer"] = os_after
            evidence["afterNativeBlur"] = after_blur
            if os_after["hwnd"] != witness_hwnd:
                raise RuntimeError("Win32 foreground did not transfer to owned witness")
            if after_blur["hasFocus"]:
                raise RuntimeError("Document still focused despite valid native foreground transfer")
            trusted_blurs = [x for x in after_blur["osEvents"]
                             if x["type"] == "blur" and x["isTrusted"]]
            assert trusted_blurs, "No isTrusted browser blur after real Win32 foreground transfer"
            assert not after_blur["powerPressing"], "POWER held class stranded after OS blur"
            assert after_blur["eventCount"] == held["eventCount"] + 1, (
                "POWER cancel edge not exactly once after OS blur", after_blur)

            stage = "release held Space while background without stray up"
            page.keyboard.up("Space")
            after_background_release = snapshot(page)
            evidence["afterBackgroundRelease"] = after_background_release
            assert after_background_release["eventCount"] == after_blur["eventCount"], (
                "Spurious POWER up edge after cancel")
            stage = "restore Chrome foreground and verify no stranded hold"
            assert activate_owned_top_level(owned["hwnd"]), "Chrome could not regain native foreground"
            after_release = snapshot(page)
            evidence["afterRefocusAndRelease"] = after_release
            evidence["afterRefocusForeground"] = foreground()
            assert after_release["eventCount"] == after_blur["eventCount"], "Spurious POWER up edge after cancel"
            assert not after_release["powerPressing"], "POWER remained held after refocus"
            assert after_release["status"] == pre["status"], "POWER state unexpectedly changed"
            evidence["status"] = "PASS_PROVEN_WIN32_FOREGROUND_AND_TRUSTED_POWER_CANCEL"
            context.close()
            browser.close()
            browser = None
    except Exception as exc:
        evidence["status"] = "FAILED_OR_BLOCKED_NO_NATIVE_ACCEPTANCE"
        evidence["failureStage"] = stage
        evidence["failure"] = repr(exc)
    finally:
        if witness is not None:
            try:
                witness.destroy()
            except Exception:
                pass
        if browser is not None:
            try:
                browser.close()
            except Exception:
                pass
        if server is not None:
            try:
                server.terminate()
                server.wait(timeout=5)
            except Exception:
                try:
                    server.kill()
                    server.wait(timeout=3)
                except Exception:
                    pass
        if previous_foreground and win32gui.IsWindow(previous_foreground):
            try:
                activate_owned_top_level(previous_foreground)
            except Exception:
                pass
        evidence["cleanup"] = {"ownedPortClosed": not is_listening(PORT),
                               "userPort4173Alive": is_listening(4173),
                               "restoredForeground": foreground()}
        evidence["runtime39Unchanged"] = all(
            sha(ROOT/n) == h for n,h in p07["canonicalRuntimeSHA256"].items())
        evidence["parentP10Unchanged"] = sha(P10_FINAL) == "414c0151053bec55271032170e0fba2139fd1627e5fee7524cdf6c1bcf490655"
        with OUT.open("x", encoding="utf-8", newline="\n") as handle:
            json.dump(evidence, handle, ensure_ascii=False, sort_keys=True, indent=2)
            handle.write("\n")
        print(json.dumps({
            "status": evidence["status"], "stage": evidence.get("failureStage"),
            "failure": evidence.get("failure"),
            "receiptSHA256": sha(OUT), "cleanup": evidence["cleanup"]
        }, ensure_ascii=False))
    if evidence["status"] != "PASS_PROVEN_WIN32_FOREGROUND_AND_TRUSTED_POWER_CANCEL":
        raise SystemExit(2)

if __name__ == "__main__":
    main()
