from __future__ import annotations

import hashlib
import json
import os
import socket
import subprocess
import time
import traceback
import uuid
from datetime import datetime
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import urlopen

from playwright.sync_api import sync_playwright


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT / "staging/fcv588-photo-p05menu-20261116"
OUT = ROOT / "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/p05-menu/browser"
NODE = Path(r"C:\nvm4w\nodejs\node.exe")
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
SERVER = STAGE / "tools/server.mjs"
HOST = "127.0.0.1"
PHOTOS = ("giaoDien.jpg", "lf.jpg", "hf.jpg", "dual.jpg", "zoom.jpg", "zoom2.jpg", "nav1.jpg", "nav2.jpg")
HASH_EXT = {".mjs", ".js", ".css"}


def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha_file(path: Path) -> str:
    return sha_bytes(path.read_bytes())


def write_once(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL)
    try:
        os.write(fd, data)
    finally:
        os.close(fd)


def pick_port() -> int:
    for port in (4192, 4193, 4194, 4195):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind((HOST, port))
                return port
            except OSError:
                continue
    raise RuntimeError("no free test-owned port in 4192-4195")


def runtime_path(url: str) -> Path | None:
    path = urlsplit(url).path
    if path == "/":
        return STAGE / "web/index.html"
    if path.startswith("/web/"):
        return STAGE / "web" / path[5:]
    if path.startswith("/src/"):
        return STAGE / "src" / path[5:]
    return None


def manifest() -> list[dict]:
    rows = []
    for folder in ("src", "web"):
        for path in sorted((STAGE / folder).rglob("*")):
            if path.is_file() and path.suffix.lower() in HASH_EXT:
                rows.append({"path": path.relative_to(STAGE).as_posix(), "bytes": path.stat().st_size, "sha256": sha_file(path)})
    return rows


def manifest_sha(rows: list[dict]) -> str:
    return sha_bytes(json.dumps(rows, sort_keys=True, separators=(",", ":")).encode("utf-8"))


def wait_server(proc: subprocess.Popen, base: str) -> None:
    deadline = time.time() + 8
    while time.time() < deadline:
        if proc.poll() is not None:
            raise RuntimeError(f"test server exited early {proc.returncode}")
        try:
            with urlopen(base, timeout=1) as response:
                if response.status == 200:
                    return
        except Exception:
            pass
        time.sleep(0.15)
    raise RuntimeError("test server did not become ready")


def photo_deny(base: str) -> dict:
    rows = []
    for name in PHOTOS:
        url = base.rstrip("/") + "/sources/FCV588_GiaoDienThucTeMay2016/" + name
        status = None
        try:
            with urlopen(url, timeout=2) as response:
                status = response.status
        except HTTPError as exc:
            status = exc.code
        rows.append({"name": name, "statusCode": status, "status": "PASS" if status == 404 else "FAILED"})
    return {"status": "PASS" if all(row["status"] == "PASS" for row in rows) else "FAILED", "paths": rows}


def boot(page) -> None:
    page.locator("#btn-pause").click()
    page.locator("#key-power").click()
    for _ in range(4):
        page.locator("#btn-step").click()
    page.wait_for_timeout(150)
    if not page.locator("#off-screen").is_hidden():
        raise AssertionError("boot did not reach powered-on LCD")


def open_menu(page) -> None:
    if page.locator("#lcd-overlay").is_hidden():
        page.locator("#key-menu").click()
    if page.locator("#lcd-overlay").get_attribute("data-layout") != "main-menu":
        raise AssertionError("main menu did not open")


def position_palette(page, target: str) -> dict:
    open_menu(page)
    if page.locator("#dialog-title").inner_text().strip() != "Sounder":
        raise AssertionError("fresh session did not open Sounder menu")
    page.locator("#pad-right").click()
    if page.locator("#dialog-title").inner_text().strip() != "Display":
        raise AssertionError("pad-right did not reach Display")
    for _ in range(9):
        page.locator("#pad-down").click()
    row = page.locator("#dialog-content .lcd-menu-row[aria-current='true']")
    if "Palette" not in row.inner_text():
        raise AssertionError("Palette row not reached")
    before = row.inner_text().strip()
    if target == "White":
        page.locator("#key-enter").click()
        current = page.locator("#lcd-menu-options [aria-current='true']").inner_text().strip()
        if current != "Blue":
            raise AssertionError(f"expected Blue default, got {current}")
        page.locator("#pad-left").click()
        current = page.locator("#lcd-menu-options [aria-current='true']").inner_text().strip()
        if current != "White":
            raise AssertionError(f"White choice not reached, got {current}")
        page.locator("#key-enter").click()
    after = row.inner_text().strip()
    if target not in after:
        raise AssertionError(f"Palette row does not show {target}: {after}")
    return {"before": before, "after": after, "target": target}


def interaction_proof(page) -> dict:
    page.locator("#key-menu").click()
    row = page.locator("#dialog-content .lcd-menu-row[aria-current='true']")
    if "Pic. Advance" not in row.inner_text():
        raise AssertionError("Pic. Advance not selected")
    page.locator("#key-enter").click()
    page.locator("#pad-right").click()
    staged = page.locator("#lcd-menu-options [aria-current='true']").inner_text().strip()
    page.locator("#key-menu").click()
    canceled = row.inner_text().strip()
    if staged != "1/2" or "1x" not in canceled:
        raise AssertionError("MENU/ESC did not cancel staged Picture Advance")
    page.locator("#key-enter").click()
    page.locator("#pad-right").click()
    page.locator("#key-enter").click()
    committed = row.inner_text().strip()
    if "1/2" not in committed:
        raise AssertionError("ENTER did not commit Picture Advance")
    page.evaluate("document.activeElement && document.activeElement.blur()")
    page.keyboard.press("ArrowRight")
    keyboard_right = page.locator("#dialog-title").inner_text().strip()
    page.keyboard.press("ArrowLeft")
    keyboard_left = page.locator("#dialog-title").inner_text().strip()
    page.keyboard.press("Escape")
    keyboard_escape = page.locator("#lcd-overlay").is_hidden()
    if (keyboard_right, keyboard_left, keyboard_escape) != ("Display", "Sounder", True):
        raise AssertionError("keyboard menu navigation/escape contract failed")
    return {"staged": staged, "canceledRow": canceled, "committedRow": committed,
            "keyboardRight": keyboard_right, "keyboardLeft": keyboard_left, "keyboardEscapeClosed": keyboard_escape}


def geometry(page) -> dict:
    return page.evaluate("""() => {
      const rect = el => { const r=el.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}; };
      const lcd=document.getElementById('lcd'), overlay=document.getElementById('lcd-overlay');
      const cats=document.getElementById('lcd-menu-categories'), content=document.getElementById('dialog-content');
      const selected=content.querySelector('.lcd-menu-row[aria-current="true"]');
      const label=selected?.querySelector('.lcd-menu-label'), value=selected?.querySelector('.lcd-menu-value');
      const footer=document.getElementById('dialog-footer');
      const lr=rect(lcd), or=rect(overlay), cr=rect(cats), rr=rect(content), sr=selected?rect(selected):null;
      const uncovered=(lr.bottom-or.bottom)/lr.height;
      return {
        layout:overlay.dataset.layout,lcd:lr,overlay:or,categories:cr,content:rr,selected:sr,
        categoryCount:cats.children.length,footerHidden:footer.hidden,footerText:footer.textContent,
        selectedDisplay:selected?getComputedStyle(selected).display:null,
        selectedGrid:selected?getComputedStyle(selected).gridTemplateColumns:null,
        labelText:label?.textContent??null,valueText:value?.textContent??null,
        rowOverflow:selected?selected.scrollWidth>selected.clientWidth:false,
        contentOverflowX:content.scrollWidth>content.clientWidth,
        uncoveredBottomFraction:uncovered,
        overlayInsideLcd:or.left>=lr.left-1 && or.right<=lr.right+1 && or.top>=lr.top-1 && or.bottom<=lr.bottom+1,
        sidebarBeforeContent:cr.left<rr.left && cr.right<=rr.left+1,
        viewportWidth:innerWidth,documentScrollWidth:document.documentElement.scrollWidth,
      };
    }""")


def run_case(browser, base: str, prefix: str, width: int, height: int, palette: str, do_interaction: bool) -> dict:
    result = {"name": f"{width}x{height}-{palette}", "viewport": {"width": width, "height": height},
              "palette": palette, "status": "NOT_RUN", "objectiveFailures": [], "loadedBodies": [],
              "consoleErrors": [], "pageErrors": [], "requestFailures": [], "externalRequests": [], "bodyErrors": []}
    context = None
    try:
        context = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=1, locale="vi-VN")
        page = context.new_page()
        origin = urlsplit(base)
        loaded = []
        page.on("console", lambda m: result["consoleErrors"].append({"type": m.type, "text": m.text}) if m.type == "error" else None)
        page.on("pageerror", lambda e: result["pageErrors"].append(str(e)))
        page.on("requestfailed", lambda req: result["requestFailures"].append(req.url))
        page.on("request", lambda req: result["externalRequests"].append(req.url)
                if (urlsplit(req.url).scheme, urlsplit(req.url).hostname, urlsplit(req.url).port) !=
                   (origin.scheme, origin.hostname, origin.port) else None)

        def record(req):
            try:
                response = req.response()
                if response is None:
                    return
                parsed = urlsplit(response.url)
                if (parsed.scheme, parsed.hostname, parsed.port) != (origin.scheme, origin.hostname, origin.port):
                    return
                local = runtime_path(response.url)
                if local is None or local.suffix.lower() not in HASH_EXT:
                    return
                body = response.body()
                loaded.append({"path": local.relative_to(STAGE).as_posix(), "bodySha256": sha_bytes(body),
                               "sourceSha256": sha_file(local), "matches": sha_bytes(body) == sha_file(local)})
            except Exception as exc:
                result["bodyErrors"].append(str(exc))

        page.on("requestfinished", record)
        response = page.goto(base, wait_until="networkidle", timeout=30000)
        if response is None or response.status != 200:
            raise AssertionError("root did not load HTTP 200")
        boot(page)
        if do_interaction:
            result["interactionProof"] = interaction_proof(page)
        result["paletteProof"] = position_palette(page, palette)
        page.wait_for_timeout(120)
        result["geometryProof"] = geometry(page)
        proof = result["geometryProof"]
        if proof["layout"] != "main-menu" or proof["categoryCount"] != 5:
            result["objectiveFailures"].append("main-menu layout/category count mismatch")
        if not proof["overlayInsideLcd"] or proof["uncoveredBottomFraction"] < 0.15:
            result["objectiveFailures"].append("menu overlay does not leave the lower sonar/depth region visible")
        if not proof["sidebarBeforeContent"]:
            result["objectiveFailures"].append("menu sidebar is not left of the value/content pane")
        if proof["selectedDisplay"] != "grid" or proof["rowOverflow"] or proof["contentOverflowX"]:
            result["objectiveFailures"].append("two-column selected row overflows or is not grid")
        if proof["footerHidden"] or "ENTER" not in proof["footerText"] or "MENU/ESC" not in proof["footerText"]:
            result["objectiveFailures"].append("operator key footer missing")
        if proof["documentScrollWidth"] > width:
            result["objectiveFailures"].append("responsive page has horizontal overflow")
        shot = OUT / f"{prefix}-{width}x{height}-{palette}.png"
        if width <= 700:
            page.locator(".device-frame").scroll_into_view_if_needed()
        else:
            page.evaluate("window.scrollTo(0,0)")
        page.screenshot(path=str(shot), full_page=False)
        result["screenshot"] = {"path": str(shot), "bytes": shot.stat().st_size, "sha256": sha_file(shot)}
        loaded.sort(key=lambda row: (row["path"], row["bodySha256"]))
        result["loadedBodies"] = loaded
        if not loaded or not all(row["matches"] for row in loaded):
            result["objectiveFailures"].append("loaded JS/CSS body differs from staging source")
        for key, label in (("consoleErrors", "console errors"), ("pageErrors", "page errors"),
                           ("requestFailures", "request failures"), ("externalRequests", "external requests"),
                           ("bodyErrors", "body read errors")):
            if result[key]:
                result["objectiveFailures"].append(label)
        result["status"] = "PASS" if not result["objectiveFailures"] else "FAILED"
    except Exception as exc:
        result["status"] = "FAILED"
        result["objectiveFailures"].append(str(exc))
        result["failure"] = {"error": str(exc), "traceback": traceback.format_exc()}
    finally:
        if context is not None:
            context.close()
    return result


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    port = pick_port()
    base = f"http://{HOST}:{port}/"
    run_id = datetime.now().astimezone().strftime("%Y%m%dT%H%M%S%z") + "-" + uuid.uuid4().hex[:8]
    prefix = "fcv588-p05-menu-browser-" + run_id
    receipt_path = OUT / f"{prefix}.json"
    manifest_path = OUT / f"{prefix}-sha256.txt"
    stdout_path = OUT / f"{prefix}-server.stdout.txt"
    stderr_path = OUT / f"{prefix}-server.stderr.txt"
    before = manifest()
    receipt = {"schema": "fcv588-p05-menu-browser-v1", "stageRoot": str(STAGE), "port": port,
               "sourceManifestBefore": {"files": len(before), "sha256": manifest_sha(before)},
               "photoDeny": {"status": "NOT_RUN", "paths": []}, "cases": [], "objectiveFailures": [],
               "overallStatus": "NOT_RUN", "serverCleanup": "NOT_RUN"}
    proc = browser = out_handle = err_handle = None
    try:
        out_handle = open(stdout_path, "xb")
        err_handle = open(stderr_path, "xb")
        env = dict(os.environ)
        env["PORT"] = str(port)
        proc = subprocess.Popen([str(NODE), str(SERVER)], cwd=str(STAGE), env=env,
                                stdout=out_handle, stderr=err_handle,
                                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        wait_server(proc, base)
        receipt["server"] = {"path": str(SERVER), "sha256": sha_file(SERVER), "node": str(NODE), "pid": proc.pid}
        receipt["photoDeny"] = photo_deny(base)
        if receipt["photoDeny"]["status"] != "PASS":
            receipt["objectiveFailures"].append("8 reference photo URLs are not all HTTP 404")
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=str(CHROME), headless=False)
            receipt["browser"] = {"version": browser.version, "executable": str(CHROME)}
            for width, height, palette, interaction in ((1366, 768, "Blue", True), (1366, 768, "White", False), (375, 812, "Blue", False)):
                case = run_case(browser, base, prefix, width, height, palette, interaction)
                receipt["cases"].append({k: v for k, v in case.items() if k not in
                    ("consoleErrors", "pageErrors", "requestFailures", "externalRequests", "bodyErrors", "loadedBodies")} |
                    {"loadedBodyCount": len(case["loadedBodies"]),
                     "loadedBodyMatches": sum(1 for row in case["loadedBodies"] if row["matches"]),
                     "errorCounts": {key: len(case[key]) for key in
                        ("consoleErrors", "pageErrors", "requestFailures", "externalRequests", "bodyErrors")}})
                if case["status"] != "PASS":
                    receipt["objectiveFailures"].extend(f"{case['name']}: {msg}" for msg in case["objectiveFailures"])
            browser.close()
            browser = None
        after = manifest()
        receipt["sourceManifestAfter"] = {"files": len(after), "sha256": manifest_sha(after)}
        receipt["sourceTreeStable"] = before == after
        if not receipt["sourceTreeStable"]:
            receipt["objectiveFailures"].append("stage JS/CSS source changed during browser QA")
        receipt["overallStatus"] = "PASS" if (len(receipt["cases"]) == 3 and
            all(case["status"] == "PASS" for case in receipt["cases"]) and
            receipt["photoDeny"]["status"] == "PASS" and receipt["sourceTreeStable"] and
            not receipt["objectiveFailures"]) else "FAILED"
    except Exception as exc:
        receipt["overallStatus"] = "FAILED"
        receipt["objectiveFailures"].append(str(exc))
        receipt["fatalError"] = traceback.format_exc()
    finally:
        if browser is not None:
            browser.close()
        if proc is not None:
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=4)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait(timeout=4)
            receipt["serverCleanup"] = "PASS" if proc.poll() is not None else "FAILED"
        if out_handle is not None:
            out_handle.close()
        if err_handle is not None:
            err_handle.close()
        receipt["finishedAt"] = datetime.now().astimezone().isoformat()
        write_once(receipt_path, (json.dumps(receipt, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
        artifacts = sorted(path for path in OUT.iterdir() if path.is_file() and path.name.startswith(prefix))
        write_once(manifest_path, ("\n".join(f"{sha_file(path)} *{path.name}" for path in artifacts) + "\n").encode("ascii"))
        print(json.dumps({"status": receipt["overallStatus"], "port": port,
                          "objectiveFailures": receipt["objectiveFailures"],
                          "receipt": str(receipt_path), "receiptSha256": sha_file(receipt_path),
                          "manifest": str(manifest_path), "manifestSha256": sha_file(manifest_path),
                          "photoDeny": receipt["photoDeny"], "cleanup": receipt["serverCleanup"],
                          "cases": [{"name": c["name"], "status": c["status"],
                                     "loadedBodyCount": c["loadedBodyCount"],
                                     "loadedBodyMatches": c["loadedBodyMatches"],
                                     "screenshotSha256": (c.get("screenshot") or {}).get("sha256"),
                                     "geometryProof": c.get("geometryProof"),
                                     "interactionProof": c.get("interactionProof")}
                                    for c in receipt["cases"]]}, ensure_ascii=True, indent=2))
    return 0 if receipt["overallStatus"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
