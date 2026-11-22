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
OUT = ROOT / (
    "plans/261113-0911-fcv588-photo-reference-visual-conformance/"
    "research/qa-20261116/p07-browser"
)
NODE = Path(r"C:\nvm4w\nodejs\node.exe")
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
SERVER = ROOT / "tools/server.mjs"
HOST = "127.0.0.1"
PORT_CANDIDATES = (4207, 4208, 4209, 4210)
USER_PORT = 4173
PHOTOS = (
    "giaoDien.jpg", "lf.jpg", "hf.jpg", "dual.jpg",
    "zoom.jpg", "zoom2.jpg", "nav1.jpg", "nav2.jpg",
)
RUNTIME_EXT = {".mjs", ".js", ".css", ".svg", ".html"}
BODY_EXT = {".mjs", ".js", ".css", ".html"}
P04_FINAL = ROOT / (
    "docs/qa/FCV588_P04_PROVENANCE_20261116/"
    "FCV588_P04_PROVENANCE_FINAL_INTEGRITY_20261116.json"
)
P04_FINAL_SHA = "94d9bf997408d8fb51140b723319ea59faefb8122f66233839ad5a8f39b243d2"
DISPLAY_MODES = ("NAV1", "LF-ZOOM", "LF", "DUAL", "HF", "HF-ZOOM", "NAV2")
VIEWPORTS = ((375, 812), (1366, 768), (1920, 1080))
EXPECTED_LOADED_PATHS = {
    "src/core/lessons.mjs",
    "src/core/protocol.mjs",
    "src/core/scenario.mjs",
    "src/core/session.mjs",
    "src/devices/fcv588/adapter.mjs",
    "src/devices/fcv588/alarms.mjs",
    "src/devices/fcv588/calibration.mjs",
    "src/devices/fcv588/capabilities.mjs",
    "src/devices/fcv588/display-layout.mjs",
    "src/devices/fcv588/display-palette.mjs",
    "src/devices/fcv588/display-widgets.mjs",
    "src/devices/fcv588/echo-projection.mjs",
    "src/devices/fcv588/menu-atlas.mjs",
    "src/devices/fcv588/model.mjs",
    "src/devices/fcv588/navigation.mjs",
    "src/devices/fcv588/profile-version.mjs",
    "src/devices/fcv588/receiver-status.mjs",
    "src/devices/fcv588/settings.mjs",
    "src/devices/fcv588/tankenmaru-status.mjs",
    "src/devices/fcv588/training-faults.mjs",
    "src/devices/fcv588/units.mjs",
    "web/app.mjs",
    "web/fcv588-echo-rasterizer.mjs",
    "web/fcv588-training-source-matrix.mjs",
    "web/hold-input.mjs",
    "web/index.html",
    "web/instructor-tabs.mjs",
    "web/key-feedback.mjs",
    "web/keyboard-shortcuts.mjs",
    "web/lcd-config-presentation.mjs",
    "web/lcd-control-presentation.mjs",
    "web/lcd-instructor-meta.mjs",
    "web/lcd-presentation.mjs",
    "web/pad-repeat.mjs",
    "web/rotary-input.mjs",
    "web/styles.css",
}


def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha_file(path: Path) -> str:
    return sha_bytes(path.read_bytes())


def write_once(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, "wb") as stream:
        stream.write(data)


def runtime_manifest() -> dict[str, str]:
    result: dict[str, str] = {}
    for folder in ("src", "web"):
        for path in (ROOT / folder).rglob("*"):
            if path.is_file() and path.suffix.lower() in RUNTIME_EXT:
                result[path.relative_to(ROOT).as_posix()] = sha_file(path)
    return dict(sorted(result.items()))


def manifest_sha(manifest: dict[str, str]) -> str:
    return sha_bytes(json.dumps(
        manifest, sort_keys=True, separators=(",", ":")).encode("utf-8"))


def sealed_runtime() -> dict[str, str]:
    if sha_file(P04_FINAL) != P04_FINAL_SHA:
        raise RuntimeError("P04 final integrity seal drift")
    data = json.loads(P04_FINAL.read_text(encoding="utf-8"))
    rows = dict(sorted(data.get("runtimeSHA256", {}).items()))
    if data.get("runtimeCount") != 39 or len(rows) != 39:
        raise RuntimeError("P04 final does not contain sealed runtime39")
    return rows


def port_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind((HOST, port))
            return True
        except OSError:
            return False


def port_listening(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.4)
        return sock.connect_ex((HOST, port)) == 0


def pick_port() -> int:
    for port in PORT_CANDIDATES:
        if port != USER_PORT and port_free(port):
            return port
    raise RuntimeError("no free QA-owned port in 4207-4210")


def runtime_path(url: str) -> Path | None:
    path = urlsplit(url).path
    if path == "/":
        return ROOT / "web/index.html"
    if path.startswith("/web/"):
        return ROOT / "web" / path[5:]
    if path.startswith("/src/"):
        return ROOT / "src" / path[5:]
    return None


def wait_server(proc: subprocess.Popen, base: str) -> None:
    deadline = time.time() + 8
    while time.time() < deadline:
        if proc.poll() is not None:
            raise RuntimeError(f"QA server exited early: {proc.returncode}")
        try:
            with urlopen(base, timeout=1) as response:
                if response.status == 200:
                    return
        except Exception:
            pass
        time.sleep(0.15)
    raise RuntimeError("QA server did not become ready")


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
        rows.append({
            "name": name, "statusCode": status,
            "status": "PASS" if status == 404 else "FAILED",
        })
    return {
        "status": "PASS" if all(row["status"] == "PASS" for row in rows) else "FAILED",
        "paths": rows,
    }


def boot(page) -> None:
    page.locator("#btn-pause").click()
    page.locator("#key-power").click()
    for _ in range(4):
        page.locator("#btn-step").click()
    page.wait_for_timeout(180)
    if not page.locator("#off-screen").is_hidden():
        raise AssertionError("boot did not reach powered-on LCD")
    if page.locator("#mode-state").inner_text().strip() != "LF":
        raise AssertionError("fresh boot mode is not LF")


def set_mode(page, target: str) -> dict:
    current = page.locator("#mode-state").inner_text().strip()
    if current not in DISPLAY_MODES or target not in DISPLAY_MODES:
        raise AssertionError(f"invalid mode transition {current!r}->{target!r}")
    if current == target:
        return {"before": current, "target": target, "steps": 0}
    ci, ti = DISPLAY_MODES.index(current), DISPLAY_MODES.index(target)
    right = (ti - ci) % len(DISPLAY_MODES)
    left = (ci - ti) % len(DISPLAY_MODES)
    steps = right if right <= left else -left
    knob = page.locator("#mode-knob")
    knob.scroll_into_view_if_needed()
    knob.focus()
    key = "ArrowRight" if steps > 0 else "ArrowLeft"
    for _ in range(abs(steps)):
        page.keyboard.press(key)
    page.wait_for_timeout(6300)
    actual = page.locator("#mode-state").inner_text().strip()
    if actual != target:
        raise AssertionError(f"mode expected {target}, got {actual}")
    return {"before": current, "target": target, "steps": steps, "actual": actual}


def open_menu(page) -> None:
    if page.locator("#lcd-overlay").is_hidden():
        page.locator("#key-menu").click()
    if page.locator("#lcd-overlay").get_attribute("data-layout") != "main-menu":
        raise AssertionError("main menu did not open")


def select_menu_entry(page, entry_id: str) -> None:
    open_menu(page)
    for _ in range(5):
        rows = page.locator("#dialog-content .lcd-menu-row")
        ids = [rows.nth(i).get_attribute("data-entry-id") for i in range(rows.count())]
        if entry_id in ids:
            break
        page.locator("#pad-right").click()
    else:
        raise AssertionError("menu entry category not found: " + entry_id)
    for _ in range(40):
        selected = page.locator("#dialog-content .lcd-menu-row[aria-current='true']")
        if selected.get_attribute("data-entry-id") == entry_id:
            return
        page.locator("#pad-down").click()
    raise AssertionError("menu entry not reached: " + entry_id)


def set_menu_choice(page, entry_id: str, target: str, close: bool = True) -> dict:
    select_menu_entry(page, entry_id)
    selected = page.locator("#dialog-content .lcd-menu-row[aria-current='true']")
    before = selected.inner_text().strip()
    page.locator("#key-enter").click()
    for _ in range(40):
        choice = page.locator("#lcd-menu-options [aria-current='true']")
        current = choice.inner_text().strip()
        if current == target:
            break
        page.locator("#pad-right").click()
    else:
        raise AssertionError(f"choice {target!r} not reached for {entry_id}")
    page.locator("#key-enter").click()
    after = selected.inner_text().strip()
    if target not in after:
        raise AssertionError(f"menu did not commit {entry_id}={target}: {after}")
    if close:
        page.locator("#key-menu").click()
        if not page.locator("#lcd-overlay").is_hidden():
            raise AssertionError("MENU/ESC did not close menu")
    return {"entryId": entry_id, "before": before, "target": target, "after": after}


def cancel_then_commit_picture_advance(page) -> dict:
    select_menu_entry(page, "sounder.pictureAdvance")
    row = page.locator("#dialog-content .lcd-menu-row[aria-current='true']")
    before = row.inner_text().strip()
    if "1x" not in before:
        raise AssertionError("Picture Advance baseline is not 1x")
    page.locator("#key-enter").click()
    for _ in range(10):
        current = page.locator("#lcd-menu-options [aria-current='true']").inner_text().strip()
        if current == "1/2":
            break
        page.locator("#pad-right").click()
    else:
        raise AssertionError("Picture Advance 1/2 choice not reached")
    staged = current
    page.locator("#key-menu").click()
    canceled = row.inner_text().strip()
    if staged != "1/2" or "1x" not in canceled:
        raise AssertionError("MENU/ESC did not cancel Picture Advance draft")
    page.locator("#key-enter").click()
    for _ in range(10):
        current = page.locator("#lcd-menu-options [aria-current='true']").inner_text().strip()
        if current == "1/2":
            break
        page.locator("#pad-right").click()
    page.locator("#key-enter").click()
    committed = row.inner_text().strip()
    if "1/2" not in committed:
        raise AssertionError("ENTER did not commit Picture Advance 1/2")
    page.locator("#key-menu").click()
    if not page.locator("#lcd-overlay").is_hidden():
        raise AssertionError("menu remained open after Picture Advance workflow")
    return {"before": before, "staged": staged, "canceled": canceled, "committed": committed}


def brill_workflow(page) -> dict:
    before_filter = page.locator("#lcd").evaluate("el => getComputedStyle(el).filter")
    page.locator("#key-power").click()
    page.wait_for_timeout(80)
    overlay = page.locator("#lcd-overlay")
    if overlay.is_hidden() or overlay.get_attribute("data-layout") != "control":
        raise AssertionError("short POWER/BRILL did not open brilliance control")
    summary = page.locator("#lcd-control-summary")
    first = {
        "current": summary.get_attribute("data-current-value"),
        "draft": summary.get_attribute("data-draft-value"),
    }
    page.locator("#key-power").click()
    page.wait_for_timeout(80)
    second = {
        "current": summary.get_attribute("data-current-value"),
        "draft": summary.get_attribute("data-draft-value"),
    }
    if first != {"current": "9", "draft": "9"} or second != {"current": "9", "draft": "8"}:
        raise AssertionError(f"unexpected BRILL staged values: {first} -> {second}")
    page.locator("#key-enter").click()
    page.wait_for_timeout(80)
    if not overlay.is_hidden():
        raise AssertionError("ENTER did not close BRILL overlay")
    after_filter = page.locator("#lcd").evaluate("el => getComputedStyle(el).filter")
    if "0.917" not in after_filter:
        raise AssertionError("BRILL level 8 did not update LCD luminance")
    return {"beforeFilter": before_filter, "first": first, "second": second,
            "afterFilter": after_filter, "committedBrightness": 8}


def display_geometry(page, name: str) -> dict:
    return page.evaluate("""name => {
      const rect = el => { const r=el.getBoundingClientRect(); return {
        left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}; };
      const lcd=document.getElementById('lcd');
      const canvas=document.getElementById('echo-canvas');
      const depth=document.querySelector('.depth-indicator');
      const lr=rect(lcd), cr=rect(canvas), dr=rect(depth);
      const anchor=parseFloat(getComputedStyle(depth).getPropertyValue('--dual-depth-anchor'));
      const dividerX=Number.isFinite(anchor)?lr.left+lr.width*anchor/100:null;
      return {
        name,mode:document.getElementById('mode-state').textContent.trim(),
        header:document.getElementById('screen-top').textContent.trim(),
        depthHidden:depth.hidden,depthText:document.getElementById('depth-display').textContent.trim(),
        depthUnit:document.getElementById('depth-unit').textContent.trim(),
        lcdRect:lr,canvasRect:cr,depthRect:dr,
        dualAnchorPercent:Number.isFinite(anchor)?anchor:null,dividerX,
        depthIntersectsDivider:dividerX===null?null:dr.left<dividerX&&dr.right>dividerX,
        scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,
        viewportHeight:innerHeight,
        canvasInsideLcd:cr.left>=lr.left-1&&cr.right<=lr.right+1&&cr.top>=lr.top-1&&cr.bottom<=lr.bottom+1,
      };
    }""", name)


def validate_display_geometry(geometry: dict, mode: str, zoom_mode: str | None) -> list[str]:
    failures: list[str] = []
    if geometry["mode"] != mode:
        failures.append(f"mode mismatch {geometry['mode']} != {mode}")
    if geometry["scrollWidth"] > geometry["viewportWidth"]:
        failures.append("horizontal overflow")
    if not geometry["canvasInsideLcd"] or geometry["lcdRect"]["width"] <= 0 or geometry["lcdRect"]["height"] <= 0:
        failures.append("invalid LCD/canvas geometry")
    header = geometry["header"]
    if mode in ("NAV1", "NAV2"):
        if header != "":
            failures.append("NAV header must be empty photo-style data surface")
        if not geometry["depthHidden"]:
            failures.append("NAV must hide global depth readout")
    else:
        if geometry["depthHidden"] or geometry["depthText"] in ("", "--.-"):
            failures.append("sonar mode depth readout missing")
        expected = None
        if mode == "LF": expected = "LF"
        elif mode == "HF": expected = "HF"
        elif mode == "DUAL": expected = "LF/HF"
        elif mode in ("LF-ZOOM", "HF-ZOOM"):
            prefix = {"Bottom Lock":"BL", "Bottom Zoom":"BZ", "Marker Zoom":"MZ"}[zoom_mode]
            expected = prefix + ("-LF" if mode == "LF-ZOOM" else "-HF")
        if expected and expected not in header:
            failures.append(f"header missing {expected}: {header!r}")
    if mode == "DUAL":
        if geometry["dualAnchorPercent"] is None or not geometry["depthIntersectsDivider"]:
            failures.append("DUAL depth readout does not intersect pane divider")
    return failures


def menu_geometry(page) -> dict:
    return page.evaluate("""() => {
      const rect = el => { const r=el.getBoundingClientRect(); return {
        left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}; };
      const lcd=document.getElementById('lcd'), overlay=document.getElementById('lcd-overlay');
      const cats=document.getElementById('lcd-menu-categories');
      const content=document.getElementById('dialog-content');
      const selected=content.querySelector('.lcd-menu-row[aria-current="true"]');
      const lr=rect(lcd), or=rect(overlay), cr=rect(cats), rr=rect(content);
      return {layout:overlay.dataset.layout,lcd:lr,overlay:or,categories:cr,content:rr,
        categoryCount:cats.children.length,selectedEntry:selected?.dataset.entryId??null,
        selectedText:selected?.textContent??null,rowOverflow:selected?selected.scrollWidth>selected.clientWidth:false,
        contentOverflowX:content.scrollWidth>content.clientWidth,
        overlayInsideLcd:or.left>=lr.left-1&&or.right<=lr.right+1&&or.top>=lr.top-1&&or.bottom<=lr.bottom+1,
        scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};
    }""")


def d15_workflow(page, width: int) -> dict:
    tabs = page.locator(".d15-tablist [role='tab']")
    if tabs.count() != 5:
        raise AssertionError(f"D15 expected five tabs, got {tabs.count()}")
    page.locator("#d15-tab-session").click()
    page.locator("#d15-tab-session").focus()
    sequence = ["d15-tab-session"]
    for _ in range(4):
        page.keyboard.press("ArrowRight")
        sequence.append(page.evaluate("document.activeElement && document.activeElement.id"))
    expected = ["d15-tab-session", "d15-tab-help", "d15-tab-fixtures", "d15-tab-lessons", "d15-tab-sources"]
    if sequence != expected:
        raise AssertionError(f"D15 keyboard tab sequence mismatch: {sequence}")
    selected = page.locator(".d15-tablist [role='tab'][aria-selected='true']")
    if selected.get_attribute("id") != "d15-tab-sources":
        raise AssertionError("D15 Sources tab not selected after keyboard traversal")
    visible_panels = page.locator(".d15-tabpanel:not([hidden])")
    if visible_panels.count() != 1 or visible_panels.nth(0).get_attribute("id") != "d15-panel-sources":
        raise AssertionError("D15 must expose exactly one selected tabpanel")
    focus_control = page.locator(".device-focus-control")
    focus_display = focus_control.evaluate("el => getComputedStyle(el).display")
    focus_proof = {"cssDisplay": focus_display, "applicable": width >= 1241}
    if width >= 1241:
        checkbox = page.locator("#device-focus-toggle")
        checkbox.click()
        page.wait_for_timeout(160)
        panel = page.locator(".training-panel")
        dim = float(panel.evaluate("el => getComputedStyle(el).opacity"))
        page.locator("#d15-tab-session").focus()
        page.wait_for_timeout(160)
        restored = float(panel.evaluate("el => getComputedStyle(el).opacity"))
        if not checkbox.is_checked() or not (dim < 1.0 and abs(restored - 1.0) < 0.001):
            raise AssertionError(f"device focus opacity contract failed: dim={dim}, restored={restored}")
        focus_proof.update({"checked": True, "dimOpacity": dim, "focusWithinOpacity": restored})
    else:
        if focus_display != "none":
            raise AssertionError("mobile device-focus control should be hidden")
        focus_proof["status"] = "NOT_APPLICABLE_CSS_MAX700"
    geometry = page.evaluate("""() => ({
      scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,
      tabCount:document.querySelectorAll('.d15-tablist [role="tab"]').length,
      selected:document.querySelector('.d15-tablist [role="tab"][aria-selected="true"]')?.id??null,
      ready:document.querySelector('.training-panel')?.dataset.d15TabsReady??null
    })""")
    if geometry["scrollWidth"] > geometry["viewportWidth"]:
        raise AssertionError("D15 state has horizontal overflow")
    if geometry["ready"] != "true":
        raise AssertionError("D15 tab enhancement not ready")
    return {"sequence": sequence, "focusMode": focus_proof, "geometry": geometry}


def screenshot_state(page, prefix: str, width: int, height: int, ordinal: int, name: str, target: str) -> dict:
    if target == "d15":
        page.locator(".training-panel").scroll_into_view_if_needed()
    else:
        page.locator(".device-frame").scroll_into_view_if_needed()
    page.wait_for_timeout(100)
    safe = name.replace("/", "-").replace(" ", "-")
    path = OUT / f"{prefix}-{ordinal:02d}-{width}x{height}-{safe}.png"
    if path.exists():
        raise FileExistsError("screenshot exists: " + str(path))
    page.screenshot(path=str(path), full_page=False)
    return {"path": str(path), "bytes": path.stat().st_size, "sha256": sha_file(path)}


def run_viewport(browser, base: str, prefix: str, width: int, height: int, ordinal_start: int) -> dict:
    result = {
        "viewport": {"width": width, "height": height}, "status": "NOT_RUN",
        "states": [], "loadedBodies": [], "consoleErrors": [], "pageErrors": [],
        "requestFailures": [], "externalRequests": [], "bodyErrors": [],
        "objectiveFailures": [],
    }
    context = None
    try:
        context = browser.new_context(
            viewport={"width": width, "height": height},
            device_scale_factor=1, locale="vi-VN")
        page = context.new_page()
        origin = urlsplit(base)
        loaded: dict[str, dict] = {}
        page.on("console", lambda m: result["consoleErrors"].append(
            {"type": m.type, "text": m.text}) if m.type == "error" else None)
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
                if (parsed.scheme, parsed.hostname, parsed.port) != (
                        origin.scheme, origin.hostname, origin.port):
                    return
                local = runtime_path(response.url)
                if local is None or local.suffix.lower() not in BODY_EXT:
                    return
                body = response.body()
                body_sha = sha_bytes(body)
                source_sha = sha_file(local)
                rel = local.relative_to(ROOT).as_posix()
                row = {"path": rel, "statusCode": response.status,
                       "bodySha256": body_sha, "sourceSha256": source_sha,
                       "matches": response.status == 200 and body_sha == source_sha}
                prior = loaded.get(rel)
                if prior is not None and prior != row:
                    result["bodyErrors"].append("inconsistent repeated body: " + rel)
                loaded[rel] = row
            except Exception as exc:
                result["bodyErrors"].append(str(exc))

        page.on("requestfinished", record)
        response = page.goto(base, wait_until="networkidle", timeout=30000)
        if response is None or response.status != 200:
            raise AssertionError("root did not load HTTP 200")
        boot(page)

        ordinal = ordinal_start
        def add_display(name: str, mode: str, zoom_mode: str | None = None):
            nonlocal ordinal
            state = {"ordinal": ordinal, "name": name, "kind": "display", "status": "NOT_RUN", "objectiveFailures": []}
            try:
                state["modeTransition"] = set_mode(page, mode)
                if zoom_mode is not None:
                    state["zoomChoice"] = set_menu_choice(page, "sounder.zoomMode", zoom_mode)
                geometry = display_geometry(page, name)
                state["geometry"] = geometry
                state["objectiveFailures"].extend(validate_display_geometry(geometry, mode, zoom_mode))
                state["screenshot"] = screenshot_state(page, prefix, width, height, ordinal, name, "device")
                state["status"] = "PASS" if not state["objectiveFailures"] else "FAILED"
            except Exception as exc:
                state["status"] = "FAILED"
                state["objectiveFailures"].append(str(exc))
                state["failure"] = {"error": str(exc), "traceback": traceback.format_exc()}
            result["states"].append(state)
            ordinal += 1

        # Source-grounded low-transition order: 11 display states.
        add_display("LF", "LF")
        add_display("LF-ZOOM-BL", "LF-ZOOM", "Bottom Lock")
        add_display("LF-ZOOM-BZ", "LF-ZOOM", "Bottom Zoom")
        add_display("LF-ZOOM-MZ", "LF-ZOOM", "Marker Zoom")
        add_display("NAV1", "NAV1")
        add_display("NAV2", "NAV2")
        add_display("HF-ZOOM-BL", "HF-ZOOM", "Bottom Lock")
        add_display("HF-ZOOM-BZ", "HF-ZOOM", "Bottom Zoom")
        add_display("HF-ZOOM-MZ", "HF-ZOOM", "Marker Zoom")
        add_display("HF", "HF")
        add_display("DUAL", "DUAL")

        menu_state = {"ordinal": ordinal, "name": "MENU-P05-WORKFLOW", "kind": "menu", "status": "NOT_RUN", "objectiveFailures": []}
        try:
            menu_state["pictureAdvance"] = cancel_then_commit_picture_advance(page)
            rate_header = page.locator("#screen-top").inner_text().strip()
            if "1/2" not in rate_header:
                raise AssertionError("committed Picture Advance 1/2 missing from header")
            menu_state["battery"] = set_menu_choice(page, "display.battery", "On")
            battery_header = page.locator("#screen-top").inner_text().strip()
            if "1/2" in battery_header:
                raise AssertionError("Battery On did not replace picture-rate slot")
            menu_state["headerBeforeBattery"] = rate_header
            menu_state["headerAfterBattery"] = battery_header
            menu_state["brill"] = brill_workflow(page)
            open_menu(page)
            menu_state["geometry"] = menu_geometry(page)
            g = menu_state["geometry"]
            if g["layout"] != "main-menu" or g["categoryCount"] != 5 or not g["overlayInsideLcd"]:
                menu_state["objectiveFailures"].append("main menu geometry/category contract failed")
            if g["rowOverflow"] or g["contentOverflowX"] or g["scrollWidth"] > g["viewportWidth"]:
                menu_state["objectiveFailures"].append("menu horizontal overflow")
            menu_state["screenshot"] = screenshot_state(page, prefix, width, height, ordinal, menu_state["name"], "device")
            page.locator("#key-menu").click()
            menu_state["status"] = "PASS" if not menu_state["objectiveFailures"] else "FAILED"
        except Exception as exc:
            menu_state["status"] = "FAILED"
            menu_state["objectiveFailures"].append(str(exc))
            menu_state["failure"] = {"error": str(exc), "traceback": traceback.format_exc()}
        result["states"].append(menu_state)
        ordinal += 1

        d15_state = {"ordinal": ordinal, "name": "D15-FOCUS-FIVE-TABS", "kind": "d15", "status": "NOT_RUN", "objectiveFailures": []}
        try:
            d15_state["proof"] = d15_workflow(page, width)
            d15_state["screenshot"] = screenshot_state(page, prefix, width, height, ordinal, d15_state["name"], "d15")
            d15_state["status"] = "PASS"
        except Exception as exc:
            d15_state["status"] = "FAILED"
            d15_state["objectiveFailures"].append(str(exc))
            d15_state["failure"] = {"error": str(exc), "traceback": traceback.format_exc()}
        result["states"].append(d15_state)

        page.wait_for_timeout(150)
        result["loadedBodies"] = [loaded[key] for key in sorted(loaded)]
        loaded_paths = set(loaded)
        if loaded_paths != EXPECTED_LOADED_PATHS:
            result["objectiveFailures"].append(
                "loaded URL set mismatch: missing=" + repr(sorted(EXPECTED_LOADED_PATHS - loaded_paths)) +
                " extra=" + repr(sorted(loaded_paths - EXPECTED_LOADED_PATHS)))
        if not result["loadedBodies"] or not all(row["matches"] for row in result["loadedBodies"]):
            result["objectiveFailures"].append("loaded HTTP body SHA differs from live canonical source")
        if len(result["states"]) != 13:
            result["objectiveFailures"].append("viewport did not produce exactly 13 bounded states")
        if any(state["status"] != "PASS" for state in result["states"]):
            result["objectiveFailures"].append("one or more viewport states failed")
        for key, label in (
            ("consoleErrors", "console errors"), ("pageErrors", "page errors"),
            ("requestFailures", "request failures"), ("externalRequests", "external requests"),
            ("bodyErrors", "HTTP body read errors"),
        ):
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
    run_id = datetime.now().astimezone().strftime("%Y%m%dT%H%M%S%z") + "-" + uuid.uuid4().hex[:8]
    prefix = "fcv588-p07-browser-" + run_id
    receipt_path = OUT / f"{prefix}.json"
    events_path = OUT / f"{prefix}-events.json"
    stdout_path = OUT / f"{prefix}-server.stdout.txt"
    stderr_path = OUT / f"{prefix}-server.stderr.txt"
    manifest_path = OUT / f"{prefix}-sha256.txt"

    sealed = sealed_runtime()
    before = runtime_manifest()
    if before != sealed:
        raise RuntimeError("live canonical runtime39 does not equal sealed P04 final")
    port4173_before = port_listening(USER_PORT)
    port = pick_port()
    base = f"http://{HOST}:{port}/"
    receipt = {
        "schema": "fcv588-p07-independent-visual-browser-v1",
        "createdAt": datetime.now().astimezone().isoformat(),
        "scope": "P07_CANONICAL_BROWSER_SOFTWARE_QA_ONLY_NOT_OEM_VISUAL_COMPLIANCE",
        "canonicalRoot": str(ROOT), "p04FinalPath": str(P04_FINAL),
        "p04FinalSHA256": P04_FINAL_SHA, "sealedRuntimeCount": 39,
        "sourceManifestBefore": {"files": len(before), "sha256": manifest_sha(before)},
        "ownedPort": port, "userOwnedPort4173": {"beforeListening": port4173_before, "operation": "NONE"},
        "matrix": {"viewports": [f"{w}x{h}" for w,h in VIEWPORTS],
                   "statesPerViewport": 13, "expectedTotalStates": 39,
                   "displayStatesPerViewport": 11,
                   "rationale": "5 non-zoom modes + LF/HF x BL/BZ/MZ + MENU + D15 = 13; avoids redundant 63-way Cartesian product"},
        "photoDeny": {"status": "NOT_RUN", "paths": []},
        "viewports": [], "objectiveFailures": [], "overallStatus": "NOT_RUN",
        "serverCleanup": "NOT_RUN",
        "limitations": [
            "Chrome PASS is bounded software/browser QA, not OEM visual compliance",
            "No camera-image RMSE/OEM glyph/RGB/detent claim",
            "No installed firmware, physical hardware, Narrator/NVDA, rights or release approval",
            "375px device-focus toggle is CSS-hidden; D15 five-tab keyboard behavior is still tested",
        ],
        "holds": {"phase6": "OPEN", "featureClaims": "65/65 HOLD", "hardware": "HOLD",
                  "firmware": "HOLD", "rights": "HOLD", "release": "HOLD"},
    }
    raw = {"viewports": []}
    proc = browser = out_handle = err_handle = None
    try:
        if port == USER_PORT:
            raise RuntimeError("refusing user-owned port 4173")
        if not port_free(port):
            raise RuntimeError(f"QA-owned port {port} became occupied")
        out_handle = open(stdout_path, "xb")
        err_handle = open(stderr_path, "xb")
        env = dict(os.environ)
        env["PORT"] = str(port)
        proc = subprocess.Popen(
            [str(NODE), str(SERVER)], cwd=str(ROOT), env=env,
            stdout=out_handle, stderr=err_handle,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        wait_server(proc, base)
        receipt["server"] = {"path": str(SERVER), "sha256": sha_file(SERVER),
                             "node": str(NODE), "pid": proc.pid, "base": base}
        receipt["photoDeny"] = photo_deny(base)
        if receipt["photoDeny"]["status"] != "PASS":
            receipt["objectiveFailures"].append("8 OEM reference photo URLs were not all HTTP404")

        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=str(CHROME), headless=False)
            receipt["browser"] = {"version": browser.version, "executable": str(CHROME), "instances": 1}
            ordinal = 1
            for width, height in VIEWPORTS:
                viewport = run_viewport(browser, base, prefix, width, height, ordinal)
                ordinal += 13
                receipt["viewports"].append({
                    "viewport": viewport["viewport"], "status": viewport["status"],
                    "stateCount": len(viewport["states"]),
                    "states": viewport["states"],
                    "loadedBodyCount": len(viewport["loadedBodies"]),
                    "loadedBodyPaths": [row["path"] for row in viewport["loadedBodies"]],
                    "loadedBodyAggregateSha256": sha_bytes(json.dumps(
                        viewport["loadedBodies"], sort_keys=True, separators=(",", ":")).encode("utf-8")),
                    "errorCounts": {"console": len(viewport["consoleErrors"]),
                                    "page": len(viewport["pageErrors"]),
                                    "requestFailed": len(viewport["requestFailures"]),
                                    "external": len(viewport["externalRequests"]),
                                    "body": len(viewport["bodyErrors"])},
                    "objectiveFailures": viewport["objectiveFailures"],
                })
                raw["viewports"].append(viewport)
                if viewport["status"] != "PASS":
                    receipt["objectiveFailures"].extend(
                        f"{width}x{height}: {msg}" for msg in viewport["objectiveFailures"])
            browser.close()
            browser = None

        after = runtime_manifest()
        receipt["sourceManifestAfter"] = {"files": len(after), "sha256": manifest_sha(after)}
        receipt["sourceTreeStable"] = before == after == sealed
        if not receipt["sourceTreeStable"]:
            receipt["objectiveFailures"].append("canonical source39 changed during P07 browser QA")
        total_states = sum(v["stateCount"] for v in receipt["viewports"])
        receipt["actualTotalStates"] = total_states
        if total_states != 39:
            receipt["objectiveFailures"].append(f"expected 39 states, got {total_states}")
        if len(receipt["viewports"]) != 3 or any(v["status"] != "PASS" for v in receipt["viewports"]):
            receipt["objectiveFailures"].append("one or more viewport suites failed")
        if any(v["loadedBodyCount"] != len(EXPECTED_LOADED_PATHS) for v in receipt["viewports"]):
            receipt["objectiveFailures"].append("expected exact 36 loaded HTML/JS/CSS paths per viewport")
        receipt["overallStatus"] = "PASS" if not receipt["objectiveFailures"] else "FAILED"
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
        port4173_after = port_listening(USER_PORT)
        receipt["userOwnedPort4173"]["afterListening"] = port4173_after
        receipt["userOwnedPort4173"]["preservedListeningState"] = port4173_after == port4173_before
        if port4173_after != port4173_before:
            receipt["overallStatus"] = "FAILED"
            receipt["objectiveFailures"].append("user-owned port4173 listening state changed")
        if receipt["serverCleanup"] != "PASS":
            receipt["overallStatus"] = "FAILED"
            receipt["objectiveFailures"].append("owned QA server cleanup failed")
        receipt["finishedAt"] = datetime.now().astimezone().isoformat()
        write_once(receipt_path, (json.dumps(receipt, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
        write_once(events_path, (json.dumps(raw, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
        artifacts = sorted(p for p in OUT.iterdir() if p.is_file() and p.name.startswith(prefix))
        lines = [f"{sha_file(path)} *{path.name}" for path in artifacts]
        write_once(manifest_path, ("\n".join(lines) + "\n").encode("ascii"))
        print(json.dumps({
            "status": receipt["overallStatus"],
            "receipt": str(receipt_path), "receiptSha256": sha_file(receipt_path),
            "events": str(events_path), "eventsSha256": sha_file(events_path),
            "manifest": str(manifest_path), "manifestSha256": sha_file(manifest_path),
            "ownedPort": port, "serverCleanup": receipt["serverCleanup"],
            "port4173Preserved": receipt["userOwnedPort4173"]["preservedListeningState"],
            "totalStates": receipt.get("actualTotalStates"),
            "viewportStatuses": [{"viewport": v["viewport"], "status": v["status"],
                                   "states": v["stateCount"], "loadedBodies": v["loadedBodyCount"]}
                                  for v in receipt["viewports"]],
            "objectiveFailures": receipt["objectiveFailures"],
        }, ensure_ascii=False, indent=2))
    return 0 if receipt["overallStatus"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())
