#!/usr/bin/env python3
"""Actual isolated Google Chrome acceptance for the public-reference mock.

Runs no hardware I/O and sends no traffic outside the existing loopback server.
Chromium rendering / real pointer-keyboard inputs are tested at EXACT viewport
dimensions. Produces independently drawn LCD screenshots and a JSON receipt.
No image from a manufacturer manual or video is copied into the runtime.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import traceback
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import urlopen

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
SCREENSHOTS = ROOT / "docs" / "qa" / "screenshots"
RECEIPT = ROOT / "docs" / "qa" / "FCV588_CHROME_VIEWPORT_V27_RECEIPT.json"
SIZES = ((1366, 768), (1920, 1080))
SERVED_EXTENSIONS = {"src": frozenset({".mjs", ".js"}),
                     "web": frozenset({".html", ".mjs", ".js", ".css", ".svg"})}


def require(ok: bool, message: str) -> None:
    if not ok:
        raise AssertionError(message)


def capture_harness_source_identity(sources: dict[str, Path]) -> dict[str, str]:
    """Pin the exact Python scripts controlling acceptance in this process."""
    supported = {"desktopRunner", "mobileRunner", "sharedChromeVerifier"}
    require(bool(sources) and set(sources).issubset(supported),
            "incomplete or unexpected Chrome QA harness source set")
    return {name: hashlib.sha256(path.read_bytes()).hexdigest()
            for name, path in sources.items()}


def require_harness_source_stable(sources: dict[str, Path],
                                  initial: dict[str, str]) -> bool:
    require(capture_harness_source_identity(sources) == initial,
            "Chrome QA harness source drift during browser workflow")
    return True


def compare_source_bytes(local: bytes, served: bytes, relative_path: str) -> str:
    """Fail closed when localhost serves other bytes than the live workspace."""
    expected = hashlib.sha256(local).hexdigest()
    actual = hashlib.sha256(served).hexdigest()
    require(expected == actual, f"stale/foreign localhost source: {relative_path}")
    return expected


def verify_served_source(url: str) -> dict:
    """Bind the browser receipt to *every* original JS/CSS/HTML/SVG served asset.

    Manufacturer manuals, archives, images and other non-runtime data must NOT
    be fetched or hashed by this check. The existing static server already
    denies their paths; this verifies only its explicitly public file types.
    """
    manifest = []
    for directory, allowed in SERVED_EXTENSIONS.items():
        base = ROOT / directory
        for local in sorted(base.rglob("*")):
            if not local.is_file() or local.suffix.lower() not in allowed:
                continue
            relative_path = local.relative_to(ROOT).as_posix()
            with urlopen(url.rstrip("/") + "/" + relative_path, timeout=10) as resp:
                require(resp.status == 200,
                        f"localhost did not serve runtime asset: {relative_path}")
                digest = compare_source_bytes(local.read_bytes(), resp.read(),
                                              relative_path)
            manifest.append({"path":relative_path,"sha256":digest})
    manifest.sort(key=lambda item: item["path"])
    paths = {item["path"] for item in manifest}
    require({"web/index.html", "web/app.mjs",
             "src/core/session.mjs",
             "src/devices/fcv588/profile-version.mjs"}.issubset(paths),
            "mandatory browser/source identity files missing")
    profile_file = (ROOT / "src/devices/fcv588/profile-version.mjs").read_text(
        encoding="utf-8")
    profile = re.search(r'FCV588_PUBLIC_PROFILE_REVISION\s*=\s*"([^"]+)"',
                        profile_file)
    require(profile is not None, "cannot identify live FCV profile revision")
    manifest_bytes = json.dumps(manifest, sort_keys=True,
                                separators=(",", ":")).encode("utf-8")
    return {"status":"PASS", "profileRevision":profile.group(1),
            "filesCompared":len(manifest),
            "sourceManifestSha256":hashlib.sha256(manifest_bytes).hexdigest(),
            "fileDigests":manifest}


def verify_browser_loaded_source(body_records: list[dict], served_source: dict,
                                 url: str, *, response_count: int,
                                 body_errors: list[str]) -> dict:
    """Verify bytes actually delivered to Chrome, even during a transient swap.

    This is separate from preflight/postflight: both snapshots can match if a
    file was briefly replaced and restored during the browser's own request.
    Every completed browser response is checked, including the reload copies.
    The hash is a drift check, not an authenticity signature of the OEM.
    """
    require(not body_errors, f"browser body capture failure: {body_errors}")
    require(response_count > 0 and len(body_records) == response_count,
            f"incomplete/unhashed browser responses: {len(body_records)}/{response_count}")
    reference = urlsplit(url)
    expected = {"/" + entry["path"]: entry["sha256"]
                for entry in served_source["fileDigests"]}
    require("/web/index.html" in expected, "missing index.html source identity")
    expected["/"] = expected["/web/index.html"]
    observed = set()
    digests = []
    for item in body_records:
        requested = urlsplit(item["url"])
        require((requested.scheme, requested.hostname, requested.port) ==
                (reference.scheme, reference.hostname, reference.port),
                f"browser response escaped loopback: {item['url']}")
        path = requested.path
        require(path in expected, f"unrecognized browser runtime source: {path}")
        require(item["status"] == 200,
                f"browser runtime source HTTP {item['status']}: {path}")
        require(item["sha256"] == expected[path],
                f"browser source mismatch against preflight manifest: {path}")
        observed.add(path)
        digests.append({"path":path,"sha256":item["sha256"]})
    mandatory = {"/", "/web/app.mjs", "/src/core/session.mjs",
                 "/src/devices/fcv588/profile-version.mjs"}
    require(mandatory.issubset(observed),
            f"missing critical browser-loaded runtime files: {sorted(mandatory-observed)}")
    bytes_for_hash = json.dumps(digests, sort_keys=True,
                                separators=(",", ":")).encode("utf-8")
    return {"status":"PASS","verifiedResponses":len(body_records),
            "verifiedUniquePaths":len(observed),
            "browserLoadedResponsesSha256":hashlib.sha256(bytes_for_hash).hexdigest(),
            "verifiedPaths":sorted(observed)}


def app_state(page):
    return page.evaluate("""() => ({
        width: innerWidth, height: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        canvasWidth: document.getElementById('echo-canvas').width,
        canvasHeight: document.getElementById('echo-canvas').height,
        top: document.getElementById('screen-top').textContent,
        dialogTitle: document.getElementById('dialog-title').textContent,
        eventCount: document.getElementById('event-count').textContent,
        validation: document.getElementById('validation-status').textContent,
        mode: document.getElementById('mode-state').textContent,
        desktopGeometry: Object.fromEntries(['.workbench','.device-frame',
          '.training-panel','#lcd'].map(selector => {
          const r=document.querySelector(selector).getBoundingClientRect();
          return [selector,{left:r.left,right:r.right,width:r.width,
            top:r.top,bottom:r.bottom,height:r.height}];
        })),
        controls: Object.fromEntries(['key-power','key-menu','pad-up','pad-down',
            'pad-left','pad-right','key-enter','gain-knob','mode-knob'].map(id => {
            const r = document.getElementById(id).getBoundingClientRect();
            return [id,{left:r.left,right:r.right,width:r.width,height:r.height}];
        })),
    })""")


def check_layout(state, width, height):
    require(state["width"] == width and state["height"] == height,
            f"wrong actual viewport: {state['width']}x{state['height']}")
    require(state["scrollWidth"] <= width, "horizontal document overflow")
    require((state["canvasWidth"], state["canvasHeight"]) == (480, 640),
            "FCV physical LCD logical resolution drift")
    if width>1240:
        geometry=state["desktopGeometry"]
        workbench=geometry[".workbench"]
        face=geometry[".device-frame"]
        teacher=geometry[".training-panel"]
        lcd=geometry["#lcd"]
        # The desktop workbench has two columns and a declared CSS 25px gap.
        # This preserves a full 233:270 reference silhouette and centers it
        # within the left teaching column, independent of instructor controls.
        first_column_width=teacher["left"]-workbench["left"]-25
        expected=workbench["left"]+first_column_width/2
        center=(face["left"]+face["right"])/2
        require(abs(center-expected)<=4 and face["width"]>=550 and
                abs(face["width"]/face["height"]-233/270)<0.03 and
                face["right"]+20<=teacher["left"],
                "desktop reference face not centered inside teaching workbench: "+
                str({"center":center,"expected":expected,"face":face,
                     "teacher":teacher}))
        # Compare original CSS geometry with published dimensions, rather
        # than reading copyrighted photograph or manufacturer screen pixels.
        # Tolerance is a training drawing allowance, NOT measured OEM accuracy.
        require(abs(lcd["width"]/face["width"]-128/233)<0.045 and
                abs(lcd["height"]/face["height"]-171/270)<0.045 and
                abs(lcd["width"]/lcd["height"]-128/171)<0.008,
                "desktop public-reference LCD aperture/face fractions drift: "+
                str({"face":face,"lcd":lcd}))
    for name, r in state["controls"].items():
        require(r["left"] >= 0 and r["right"] <= width,
                f"inaccessible horizontal physical control: {name}")
        require(r["width"] >= 22 and r["height"] >= 20,
                f"tiny/inaccessible physical control: {name}")


def check_panel_projection(page):
    """Observe all seven original dial positions without changing core state.

    This sequence starts/ends with effective LF, automatic Fishing and Offset0.
    These are display-state contracts, NOT measured OEM knob angles.
    """
    def dial(name):
        return page.locator("#"+name+"-knob").evaluate("""el => ({
          selection:el.dataset.selection,pending:el.dataset.pending,
          transform:getComputedStyle(el,'::before').transform,
          label:el.getAttribute('aria-label')
        })""")

    initial=dial("mode")
    tick=page.locator("#tick-count").inner_text()
    seen=[]
    for target in ("DUAL","HF","HF-ZOOM","NAV2","NAV1","LF-ZOOM","LF"):
        page.locator("#mode-knob").focus()
        page.keyboard.press("ArrowRight")
        result=dial("mode")
        selected=page.locator('.mode-scale [data-selected="true"]')
        require(result["selection"]==target and result["pending"]=="true"
                and selected.count()==1 and selected.get_attribute("data-mode")==target,
                "MODE visual selection or printed label drift: "+str(result))
        require(page.locator("#mode-state").inner_text()=="LF",
                "MODE presentation committed a candidate early")
        seen.append(result["transform"])
    require(len(set(seen))==7,"seven mode positions must have distinct original indicators")
    page.locator("#key-menu").click()
    require(dial("mode")["transform"]==initial["transform"] and
            dial("mode")["pending"]=="false",
            "cancel did not restore the effective MODE indicator")
    require(page.locator("#tick-count").inner_text()==tick,
            "dial projection advanced instructor-owned world time")

    page.locator("#gain-knob").focus()
    before=dial("gain")
    page.keyboard.press("ArrowUp")
    after=dial("gain")
    require("Offset +1" in after["label"] and after["transform"]!=before["transform"],
            "auto GAIN indicator/value ignored the recorded offset")
    page.keyboard.press("ArrowDown")
    require(dial("gain")["transform"]==before["transform"],
            "GAIN inverse input did not restore original projected value")

    page.locator("#gain-knob").click()
    page.locator("#pad-down").click()  # Fishing -> Cruising draft
    page.locator("#pad-down").click()  # Cruising -> Manual draft
    page.locator("#key-enter").click()
    manual=dial("gain")
    require("Manual 5.0" in manual["label"],"manual gain commit did not update accessible value")
    page.locator("#gain-knob").focus()
    page.keyboard.press("ArrowUp")
    require("Manual 5.5" in dial("gain")["label"] and
            dial("gain")["transform"]!=manual["transform"],
            "manual half-step gain not projected to the original dial")
    page.keyboard.press("ArrowDown")
    page.locator("#gain-knob").click()
    page.locator("#pad-down").click()  # Manual -> Fishing draft
    page.locator("#key-enter").click()
    require("Auto fishing" in dial("gain")["label"],"GAIN fixture did not restore Fishing")
    page.locator("#btn-replay").click()
    require("REPLAY PASS" in page.locator("#validation-status").inner_text(),
            "physical display-state checks changed canonical replay semantics")
    return {"modePositions":7,"candidateDoesNotCommitEarly":True,
            "cancelRestoresNeedle":True,"gainAutoAndManual":True,
            "canonicalReplay":True,"worldTickPreserved":True}


def run_viewport(browser, width, height, url, served_source):
    context = browser.new_context(viewport={"width": width, "height": height},
                                  device_scale_factor=1, locale="vi-VN",
                                  has_touch=True)
    page = context.new_page()
    messages: list[str] = []
    request_failures: list[str] = []
    responses: list[dict] = []
    body_records: list[dict] = []
    body_errors: list[str] = []
    origin = urlsplit(url)
    page.on("pageerror", lambda error: messages.append(str(error)))
    page.on("console", lambda message: messages.append(message.text)
            if message.type == "error" else None)
    page.on("requestfailed", lambda request: request_failures.append(request.url))
    page.on("response", lambda response: responses.append({
        "url": response.url, "status": response.status,
    }))
    def record_request_finished(request):
        try:
            response = request.response()
            require(response is not None,
                    f"no browser response for completed request: {request.url}")
            raw_bytes = response.body()
            body_records.append({"url":response.url,"status":response.status,
                                 "sha256":hashlib.sha256(raw_bytes).hexdigest(),
                                 "bytes":len(raw_bytes)})
        except Exception as error:
            body_errors.append(f"{request.url}: {error}")
    page.on("requestfinished", record_request_finished)
    steps = []
    artifacts = []
    try:
        response = page.goto(url, wait_until="networkidle", timeout=30000)
        require(response is not None and response.status == 200,
                "local FCV page did not load HTTP 200")
        page.locator("#key-power").wait_for(state="visible")
        state = app_state(page)
        check_layout(state, width, height)
        steps.append("LOOPBACK_LOAD_AND_LAYOUT_PASS")
        if width>1240:
            steps.append("SOURCE_GRADED_128x171_LCD_TO_233x270_FACE_RATIO_PASS")
            face=state["desktopGeometry"][".device-frame"]
            require(state["scrollHeight"]+2>=face["bottom"],
                    "physical face extends beyond scrollable document height")
            for control_id in ["key-menu","pad-up","pad-down","key-enter",
                               "key-range","key-mark","key-func",
                               "gain-knob","mode-knob","key-power"]:
                actual=page.locator("#"+control_id)
                actual.scroll_into_view_if_needed()
                box=actual.bounding_box()
                require(box is not None and box["y"]>=-2 and
                        box["y"]+box["height"]<=height+2,
                        "scrolling does not make physical control reachable: "+control_id)
            page.evaluate("window.scrollTo(0,0)")
            steps.append("DESKTOP_ALL_PHYSICAL_CONTROLS_SCROLL_REACHABLE_PASS")

        ownership=page.evaluate("""() => ({
          clock: document.getElementById('clock-line').closest('.training-panel')!==null,
          notice: document.getElementById('status-line').closest('.training-panel')!==null,
          clockInFace: document.querySelector('.device-frame').contains(
            document.getElementById('clock-line')),
        })""")
        require(ownership=={"clock":True,"notice":True,"clockInFace":False},
                "D15 clock/status telemetry was painted as FCV hardware: "+str(ownership))
        steps.append("INSTRUCTOR_TELEMETRY_OUTSIDE_FACE_PASS")

        # A fresh Playwright context should never inherit earlier classroom
        # settings. Attest this *before* teacher inputs intentionally persist
        # Range1, then verify that reload restores those new settings below.
        pre_scenario_storage_keys = page.evaluate("() => Object.keys(localStorage).sort()")
        require(pre_scenario_storage_keys == [],
                f"browser training context has stale storage: {pre_scenario_storage_keys}")
        steps.append("ISOLATED_STORAGE_EMPTY_PASS")

        # Pause teacher clock and boot using actual browser DOM button clicks.
        page.locator("#btn-pause").click()
        page.locator("#key-power").click()
        for _ in range(4):
            page.locator("#btn-step").click()
        require("[DEMO]" in page.locator("#screen-top").inner_text(),
                "POWER/boot on classroom steps failed")
        steps.append("PHYSICAL_POWER_AND_BOOT_PASS")

        panel_projection=check_panel_projection(page)
        steps.append("ACTUAL_SEVEN_MODE_AND_AUTO_MANUAL_GAIN_PROJECTION_PASS")

        # An actual held key must generate bounded auto-repeat without duplicates.
        page.locator("#key-menu").click()
        before = int(page.locator("#event-count").inner_text())
        page.locator("#pad-down").focus()
        page.keyboard.down("Enter")
        page.wait_for_timeout(840)
        page.keyboard.up("Enter")
        after = int(page.locator("#event-count").inner_text())
        require(2 <= after-before <= 9,
                f"TrackPad hold repeat count outside bounds: {after-before}")
        page.locator("#key-menu").click()
        steps.append("ACTUAL_KEYBOARD_HOLD_REPEAT_PASS")

        # Browser-native pointer capture release: start a real mouse hold and
        # deliberately release the browser's captured pointer via DOM API.
        # Chromium (not the test runner) dispatches lostpointercapture.
        func = page.locator("#key-func")
        func.scroll_into_view_if_needed()
        page.evaluate("""() => {
            const el=document.getElementById('key-func');
            window.__fcvPointerAudit=[];
            for(const name of ['pointerdown','gotpointercapture','lostpointercapture',
                                'pointermove','pointerup','pointercancel']){
                el.addEventListener(name,e=>window.__fcvPointerAudit.push({
                    type:e.type,id:e.pointerId,captured:el.hasPointerCapture(e.pointerId),
                    pressed:el.classList.contains('pressing'),
                }),{capture:true});
            }
        }""")
        bounds = func.bounding_box()
        require(bounds is not None, "FUNC key lacks usable geometry")
        point = {"x": bounds["x"] + bounds["width"] / 2,
                 "y": bounds["y"] + bounds["height"] / 2}
        page.mouse.move(point["x"], point["y"])
        edge_before = int(page.locator("#event-count").inner_text())
        page.mouse.down()
        # setPointerCapture first queues a pending request. The first trusted
        # pointermove activates capture and dispatches gotpointercapture.
        page.mouse.move(point["x"]+1, point["y"]+1)
        require(any(e["type"]=="gotpointercapture" for e in
                    page.evaluate("window.__fcvPointerAudit")),
                "pending capture never became active before release test")
        require(page.evaluate("document.getElementById('key-func').hasPointerCapture(1)"),
                "physical pointerdown did not capture FUNC key")
        page.evaluate("document.getElementById('key-func').releasePointerCapture(1)")
        # Per Pointer Events pending-capture processing, a subsequent trusted
        # pointer event flushes the lostpointercapture notification.
        page.mouse.move(point["x"]+3, point["y"]+1)
        page.wait_for_timeout(40)
        require("pressing" not in (func.get_attribute("class") or ""),
                "lostpointercapture stranded held FUNC key: "+
                str(page.evaluate("window.__fcvPointerAudit")))
        page.mouse.up()
        edge_after = int(page.locator("#event-count").inner_text())
        require(edge_after - edge_before == 2,
                f"capture release should log DOWN+CANCEL only, got {edge_after-edge_before}")

        # Trusted browser touch sequence with a CDP touchCancel. This is not
        # JavaScript constructing or dispatching a fake PointerEvent.
        client = context.new_cdp_session(page)
        touch_before = int(page.locator("#event-count").inner_text())
        client.send("Input.dispatchTouchEvent", {"type":"touchStart",
            "touchPoints":[{"x":point["x"],"y":point["y"],"id":4}]})
        require("pressing" in (func.get_attribute("class") or ""),
                "native touch did not press FUNC control")
        client.send("Input.dispatchTouchEvent", {"type":"touchCancel",
            "touchPoints":[]})
        page.wait_for_timeout(40)
        require("pressing" not in (func.get_attribute("class") or ""),
                "touchCancel did not clear held FUNC key")
        touch_after = int(page.locator("#event-count").inner_text())
        require(touch_after - touch_before == 2,
                f"touch cancel should log DOWN+CANCEL only, got {touch_after-touch_before}")
        client.detach()
        steps.append("ACTUAL_POINTER_CANCEL_AND_CAPTURE_RELEASE_PASS")

        # New original faceplate rotary gesture. Use trusted Chrome pointer
        # motion, not synthetic JS PointerEvent. The three trusted movement
        # steps can each cross the input adapter's 18px detent threshold; this
        # 41px total drag emits TWO detent events, not a single pointer gesture
        # event. Critically, it must NOT cause GAIN's separate push overlay.
        gain=page.locator("#gain-knob")
        gain.scroll_into_view_if_needed()
        gain_box=gain.bounding_box()
        require(gain_box is not None,"GAIN knob has no visible hit target")
        x=gain_box["x"]+gain_box["width"]/2
        y=gain_box["y"]+gain_box["height"]/2
        before=int(page.locator("#event-count").inner_text())
        page.mouse.move(x,y)
        page.mouse.down()
        page.mouse.move(x,y-41,steps=3)
        page.mouse.up()
        after=int(page.locator("#event-count").inner_text())
        require(after-before == 2 and page.locator("#lcd-overlay").is_hidden(),
                f"GAIN multi-detent drag or accidental push: {after-before}")
        gain.click()
        require(int(page.locator("#event-count").inner_text()) == after+1,
                "GAIN short push must still work after a rotary drag")
        require("GAIN" in page.locator("#dialog-title").inner_text().upper(),
                "GAIN short push failed to open its mode/offset overlay")
        page.locator("#key-menu").click()  # Close GAIN edit overlay.

        # Independent audit P1: a real rotary detent followed by browser-native
        # lostpointercapture must never turn into a separate GAIN short push.
        # This deliberately releases a captured pointer while still *inside*
        # the illustrated knob, then completes the trusted pointer sequence.
        gained_before=int(page.locator("#event-count").inner_text())
        page.mouse.move(x,y)
        page.mouse.down()
        page.mouse.move(x,y-25)
        require(page.evaluate("document.getElementById('gain-knob').hasPointerCapture(1)"),
                "GAIN drag did not acquire native Chromium pointer capture")
        page.evaluate("document.getElementById('gain-knob').releasePointerCapture(1)")
        page.mouse.move(x,y-24)
        page.wait_for_timeout(35)
        page.mouse.up()
        gained_after=int(page.locator("#event-count").inner_text())
        require(gained_after-gained_before == 1 and
                page.locator("#lcd-overlay").is_hidden(),
                f"GAIN native lostcapture leaked a push after drag: {gained_after-gained_before}")
        steps.append("ACTUAL_ROTARY_LOSTCAPTURE_AFTER_DETENT_NO_PUSH_PASS")

        mode=page.locator("#mode-knob")
        mode.scroll_into_view_if_needed()
        mode_box=mode.bounding_box()
        require(mode_box is not None,"MODE knob has no visible hit target")
        x=mode_box["x"]+mode_box["width"]/2
        y=mode_box["y"]+mode_box["height"]/2
        before=int(page.locator("#event-count").inner_text())
        page.mouse.move(x,y)
        page.mouse.down()
        page.mouse.move(x,y-23,steps=2)
        page.mouse.up()
        require(int(page.locator("#event-count").inner_text()) == before+1,
                "MODE native drag must issue exactly one rotate event")
        # The candidate moved LF -> DUAL (one detent). Return to LF using
        # instructor-only assist before the pre-existing 6-second scenario.
        page.locator("#mode-minus").click()
        steps.append("ACTUAL_FACEPLATE_MODE_GAIN_POINTER_ROTARY_PASS")

        # Instructor rotary affordance is separate from physical FCV bezel.
        if width == 1366:
            page.locator("#mode-minus").click()  # LF -> LF-ZOOM
            target_mode = "LF-ZOOM"
        else:
            for _ in range(4):
                page.locator("#mode-plus").click()  # LF -> NAV2
            target_mode = "NAV2"
        require("LF" in page.locator("#mode-state").inner_text(),
                "MODE changed before six-second UI window")
        page.wait_for_timeout(6300)
        require(page.locator("#mode-state").inner_text().strip() == target_mode,
                f"MODE UI timer failed for {target_mode}")
        steps.append("MODE_SELECTOR_TIMER_WHILE_WORLD_PAUSED_PASS")

        SCREENSHOTS.mkdir(parents=True, exist_ok=True)
        screenshot = SCREENSHOTS / f"fcv588_public_v27_{width}x{height}.png"
        page.screenshot(path=str(screenshot), full_page=True)
        artifacts.append(str(screenshot.relative_to(ROOT)).replace("\\", "/"))

        if width == 1920:
            # Configurable §1.21 NAV2 boxes: changes must affect the LCD,
            # not merely make a menu label editable.
            page.locator("#key-menu").click()
            for _ in range(3):
                page.keyboard.press("ArrowRight")
            require("Data" in page.locator("#dialog-title").inner_text(),
                    "Data menu not reachable")
            page.locator("#pad-down").click()  # NAV2 second item
            page.locator("#key-enter").click()
            require("NAV2 DATA BOXES" in page.locator("#dialog-title").inner_text(),
                    "§1.21 NAV2 box editor did not open")
            page.locator("#key-enter").click()  # edit first box
            page.locator("#pad-right").click()  # DEPTH -> SPEED (STW)
            require("Box 1 : SPEED (STW)" in
                    page.locator("#dialog-content").inner_text(),
                    "NAV2 field change not visible while staged")
            page.locator("#key-enter").click()
            page.locator("#key-menu").click()  # back Data menu
            page.locator("#key-menu").click()  # leave Data menu
            require("SPEED (STW)" in page.locator("#screen-top").inner_text()
                    or "SPEED (STW)" in page.locator("#lcd").inner_text()
                    or page.evaluate("() => JSON.parse(localStorage.getItem("
                      "'mophongmaytrentau.fcv588.public-reference.settings.v18'"
                      ")).settings.nav2Box1") == "SPEED (STW)",
                    "NAV2 first field did not commit")
            configured = SCREENSHOTS / "fcv588_public_v27_1920x1080_nav2_configured.png"
            page.screenshot(path=str(configured), full_page=True)
            artifacts.append(str(configured.relative_to(ROOT)).replace("\\", "/"))
            steps.append("ACTUAL_NAV2_BOX_CONFIGURED_AND_LIVE_LCD_PASS")

            # Source-linked §1.21 Data source selection: an absent NMEA
            # receiver must not turn a typed classroom fixture into a live
            # vessel feed. Verify on a real physical-key sequence and storage.
            page.locator("#key-menu").click()
            for _ in range(3):
                page.keyboard.press("ArrowRight")
            require("Data" in page.locator("#dialog-title").inner_text(),
                    "C11 Data menu missing during source-choice acceptance")
            for _ in range(9):
                page.locator("#pad-down").click()
            cursor = page.locator("#dialog-content .lcd-menu-row[aria-current='true']")
            require(cursor.count() == 1 and "Trip Source" in cursor.inner_text(),
                    "TrackPad could not reach the source-linked Trip Source row")
            page.locator("#key-enter").click()
            page.locator("#pad-right").click()
            page.locator("#key-enter").click()
            require("Trip Source : NMEA" in page.locator("#dialog-content").inner_text(),
                    "Data > Trip Source edit did not commit in LCD menu")
            selected_storage = page.evaluate("""() => JSON.parse(localStorage.getItem(
                'mophongmaytrentau.fcv588.public-reference.settings.v18'))""")
            require(selected_storage and selected_storage["settings"]["tripSource"] == "NMEA",
                    "Data source not persisted; external NMEA cannot be synthesized")
            page.locator("#key-menu").click()
            steps.append("ACTUAL_C11_DATA_SOURCE_SELECTION_PASS")
        else:
            # D15 trainer starts a fresh scored attempt; the source-graded
            # three-action RANGE exercise is assessed on real browser inputs.
            page.locator("#lesson-picker").select_option("FCV588-LEARN-01")
            page.locator("#btn-start-lesson").click()
            page.locator("#key-range").click()
            page.locator("#pad-right").click()
            page.locator("#key-enter").click()
            page.locator("#btn-score").click()
            require("ĐẠT chuỗi thao tác mô phỏng" in
                    page.locator("#lesson-result").inner_text(),
                    "D15 concrete range lesson failed actual keyboard/pointer scoring")
            steps.append("ACTUAL_D15_LESSON_SCORING_PASS")

            # A second D15 lesson exercises the newly source-graded Data
            # source selector. Starting the lesson after previous operator
            # actions must not give historical credit; all inputs are new,
            # real Chrome key clicks in the same recorded session.
            page.locator("#lesson-picker").select_option("FCV588-LEARN-04")
            page.locator("#btn-start-lesson").click()
            page.locator("#key-menu").click()
            for _ in range(3):
                page.locator("#pad-right").click()
            for _ in range(9):
                page.locator("#pad-down").click()
            require("Trip Source" in page.locator(
                "#dialog-content .lcd-menu-row[aria-current='true']").inner_text(),
                "D15 source selector was not reached by student TrackPad")
            page.locator("#key-enter").click()
            page.locator("#pad-right").click()
            page.locator("#key-enter").click()
            page.locator("#btn-score").click()
            require("ĐẠT chuỗi thao tác mô phỏng" in
                    page.locator("#lesson-result").inner_text(),
                    "D15 §1.21 Trip Source new-attempt lesson did not pass")
            page.locator("#key-menu").click()
            steps.append("ACTUAL_D15_C11_DATA_SOURCE_LESSON_PASS")

            # A third independently scored classroom attempt covers a
            # documented source-absence hazard (not an actual NMEA port).
            # The student must operate the real face MENU/TrackPad/ENTER to
            # inspect System Receiver Status with the D15 NAV fixture off.
            page.locator("#lesson-picker").select_option("FCV588-LEARN-05")
            page.locator("#btn-start-lesson").click()
            page.locator("#key-menu").click()
            for _ in range(4):
                page.locator("#pad-right").click()
            require("System / MENU" in page.locator("#dialog-title").inner_text(),
                    "D15 receiver-absence course did not reach System")
            rows=page.locator("#dialog-content .lcd-menu-row").all_inner_texts()
            receiver_index=next((i for i,row in enumerate(rows)
                                 if "Receiver Status" in row),None)
            require(receiver_index==13,
                    "D15 source-graded no-receiver path changed unexpectedly")
            for _ in range(receiver_index):
                page.locator("#pad-down").click()
            require("Receiver Status" in page.locator(
                "#dialog-content .lcd-menu-row[aria-current='true']").inner_text(),
                "D15 no-receiver student cursor could not access the menu")
            page.locator("#key-enter").click()
            require("RECEIVER STATUS" in page.locator("#dialog-title").inner_text()
                    and "NO_TRAINING_DATA" in page.locator("#dialog-content").inner_text()
                    and "Transport: NONE" in page.locator("#dialog-content").inner_text(),
                    "D15 absence lesson has a phantom receiver or source")
            page.locator("#btn-score").click()
            require("ĐẠT chuỗi thao tác mô phỏng" in
                    page.locator("#lesson-result").inner_text(),
                    "D15 receiver-absence lesson did not score a fresh real input sequence")
            page.locator("#key-menu").click()  # Receiver modal -> System
            page.locator("#key-menu").click()  # System -> faceplate
            steps.append("ACTUAL_D15_D14_RECEIVER_ABSENCE_LESSON_PASS")

        # Click new D10 instructor faults; do not imply physical voltage.
        page.locator("#btn-battery-fixture").click()
        require(page.locator("#btn-battery-fixture").get_attribute("aria-pressed")
                == "true", "D10 instructor fault toggle not wired")
        require("LOW_BATTERY" in page.locator("#training-fault-status").inner_text(),
                "D10 cue did not reach trainee UI")
        page.locator("#btn-battery-fixture").click()
        steps.append("D10_TEACHER_FAULT_ON_OFF_PASS")

        # Exercise canonical MENU/TrackPad/ENTER edit, replay, teacher reset.
        page.locator("#key-menu").click()
        for _ in range(4):
            page.keyboard.press("ArrowRight")
        require("System" in page.locator("#dialog-title").inner_text(),
                "System menu inaccessible by physical keyboard")
        # An operator navigating the full System menu must see the selected
        # row inside the LCD scrollport even on a tight portrait layout.
        visible_rows = page.locator("#dialog-content .lcd-menu-row").count()
        require(visible_rows >= 17,"unexpectedly incomplete System menu rows")
        for _ in range(3):
            page.locator("#pad-down").click()
        hold_cursor=page.locator("#dialog-content .lcd-menu-row[aria-current='true']")
        require(hold_cursor.count() == 1 and
                "Language [HOLD]" in hold_cursor.inner_text() and
                "RIGHTS_HOLD" in page.locator("#dialog-footer").inner_text(),
                "Language must be a source/rights HOLD, not an absent OEM capability")
        # V27 separates classroom help from selectable rows. Navigate by the
        # actual semantic ID, not the old accidental extra instruction row.
        row_ids=page.locator("#dialog-content .lcd-menu-row").evaluate_all(
            "rows => rows.map(row => row.dataset.entryId)")
        require(all(row_ids) and "system.installation" in row_ids,
                "main menu contains an instruction masquerading as a selectable row")
        installation_index=row_ids.index("system.installation")
        require(installation_index==visible_rows-1,
                "Installation must remain the final source-graded operator item")
        for _ in range(installation_index - 3):
            page.locator("#pad-down").click()
        cursor = page.locator("#dialog-content .lcd-menu-row[aria-current='true']")
        require(cursor.count() == 1 and "Installation" in cursor.inner_text(),
                "System menu last row does not own a visible operator cursor")
        cursor_box = cursor.bounding_box()
        port_box = page.locator("#dialog-content").bounding_box()
        require(cursor_box is not None and port_box is not None and
                cursor_box["y"] >= port_box["y"]-2 and
                cursor_box["y"]+cursor_box["height"] <=
                    port_box["y"]+port_box["height"]+2,
                "LCD menu selection is clipped outside the scrollport: " +
                str({"cursor":cursor_box,"scrollport":port_box,
                     "scrollTop":page.locator("#dialog-content").evaluate(
                         "element => element.scrollTop")}))
        screen_box=page.locator("#lcd").bounding_box()
        overlay_box=page.locator("#lcd-overlay").bounding_box()
        require(screen_box is not None and overlay_box is not None and
                overlay_box["y"]>=screen_box["y"]-2 and
                overlay_box["y"]+overlay_box["height"]<=
                    screen_box["y"]+screen_box["height"]+2,
                "entire long menu escaped LCD viewport despite inner scroll")
        # D09 is an optional hardware branch, never inferred from a generic
        # PUBLIC_REFERENCE profile. Its D15 virtual entitlement must be
        # declared by the instructor, and revocation must restore the guards.
        page.locator("#key-menu").click()
        page.locator("#key-menu").click()
        for _ in range(4):
            page.keyboard.press("ArrowRight")
        items=page.locator("#dialog-content .lcd-menu-row").all_inner_texts()
        tanken_rows=[i for i,label in enumerate(items)
                     if "Tankenmaru System" in label]
        require(len(tanken_rows)==1,"D09 optional operator menu row missing")
        for _ in range(tanken_rows[0]):
            page.locator("#pad-down").click()
        cursor=page.locator("#dialog-content .lcd-menu-row[aria-current='true']")
        require("Tankenmaru System [HOLD]" in cursor.inner_text(),
                "unknown D09 optional interface may not be enabled by default")
        page.locator("#key-enter").click()
        require("SOURCE_GAP_TANKENMARU_OPTION_NOT_DECLARED" in
                page.locator("#status-line").inner_text(),
                "a source-held optional menu must not stage the operator edit")
        page.locator("#btn-tankenmaru-fixture").click()
        require(page.locator("#btn-tankenmaru-fixture").get_attribute("aria-pressed")
                == "true" and "[HOLD]" not in cursor.inner_text(),
                "only a teacher can declare the synthetic optional fixture")
        page.locator("#key-enter").click()
        page.locator("#pad-right").click()
        page.locator("#key-enter").click()
        require("Tankenmaru System : On" in cursor.inner_text(),
                "D09 synthetic On did not affect its actual operator menu")
        require(not any(label.lstrip().startswith("NMEA ") for label in
                page.locator("#dialog-content .lcd-menu-row").all_inner_texts()),
                "System NMEA remained exposed while synthetic Tankenmaru was On")
        page.locator("#btn-tankenmaru-fixture").click()
        require(page.locator("#btn-tankenmaru-fixture").get_attribute("aria-pressed")
                == "false" and "Tankenmaru System [HOLD]" in cursor.inner_text() and
                ": Off" in cursor.inner_text(),
                "teacher revoke did not return optional menu to source HOLD")
        require(any(label.lstrip().startswith("NMEA ") for label in
                page.locator("#dialog-content .lcd-menu-row").all_inner_texts()),
                "NMEA menu failed to return after teacher revoked Tankenmaru")
        # V18 independent D09 P1: two System rows are filtered only while
        # Tank On. Revoking that option during a staged FUNC edit cannot carry
        # the old positional draft into reappearing NMEA/receiver rows.
        page.locator("#btn-tankenmaru-fixture").click()
        page.locator("#key-enter").click()
        page.locator("#pad-right").click()
        page.locator("#key-enter").click()  # virtual Tankenmaru On again
        # New §2.9 read-only training reference: verified manufacturer-manual
        # default labels, but NEVER virtual RF transmit or connected partner.
        page.locator("#pad-down").click()
        require("Tankenmaru Details" in page.locator(
            "#dialog-content .lcd-menu-row[aria-current='true']").inner_text(),
            "D09 conditional read-only option reference missing")
        page.locator("#key-enter").click()
        require("TANKENMARU" in page.locator("#dialog-title").inner_text() and
                "Output: Off" in page.locator("#dialog-content").inner_text() and
                "Pic. Sync: Yes" in page.locator("#dialog-content").inner_text() and
                "Sub Clutter: 4" in page.locator("#dialog-content").inner_text() and
                "NO REAL RF" in page.locator("#dialog-content").inner_text(),
                "D09 manual defaults panel fabricated output or lacks source labels")
        if width == 1920:
            details = SCREENSHOTS / "fcv588_public_v27_1920x1080_tankenmaru_details.png"
            page.screenshot(path=str(details),full_page=True)
            artifacts.append(str(details.relative_to(ROOT)).replace("\\","/"))
        page.locator("#key-menu").click()
        rows=page.locator("#dialog-content .lcd-menu-row").all_inner_texts()
        func_index=next((i for i,txt in enumerate(rows) if "FUNC Key" in txt),None)
        require(func_index is not None,"FUNC Key lost after read-only D09 panel")
        for _ in range(func_index):
            page.locator("#pad-down").click()
        steps.append("ACTUAL_D09_READ_ONLY_MANUAL_DEFAULTS_NO_OUTPUT_PASS")
        require("FUNC Key" in page.locator(
            "#dialog-content .lcd-menu-row[aria-current='true']").inner_text(),
            "D09 filtered menu successor unexpectedly changed")
        page.locator("#key-enter").click()
        page.locator("#pad-right").click()  # stage different FUNC assignment
        page.locator("#btn-tankenmaru-fixture").click()  # reinsert NMEA rows
        current=page.locator("#dialog-content .lcd-menu-row[aria-current='true']")
        require("FUNC Key" in current.inner_text() and
                "System / MENU" in page.locator("#dialog-title").inner_text(),
                "D09 shifted-row edit was not canceled or semantically reselected")
        page.locator("#key-enter").click()  # only stage FUNC again
        post_revoke=page.evaluate("""() => JSON.parse(localStorage.getItem(
            'mophongmaytrentau.fcv588.public-reference.settings.v18')).settings""")
        require(post_revoke["nmea"]=="Off" and
                "receiverStatus" not in post_revoke and
                post_revoke["keySetup"]=="Pic. Advance",
                "stale FUNC draft corrupted NMEA or local settings after D09 revoke")
        page.locator("#key-menu").click()  # cancel fresh FUNC edit
        page.locator("#key-menu").click()
        page.locator("#key-menu").click()
        for _ in range(4):
            page.keyboard.press("ArrowRight")
        page.locator("#key-enter").click()  # Range Presets, System first item
        require("RANGE BANK" in page.locator("#dialog-title").inner_text(),
                "D02 eight-slot bank did not open")
        page.locator("#key-enter").click()  # Stage Range1
        page.locator("#pad-right").click()
        require("Range 1 : 10" in page.locator("#dialog-content").inner_text(),
                "Range1 edited value not visible")
        page.locator("#key-enter").click()  # Commit
        storage_key = "mophongmaytrentau.fcv588.public-reference.settings.v18"
        saved = page.evaluate("key => JSON.parse(localStorage.getItem(key))",storage_key)
        require(saved is not None and saved["settings"]["rangePreset1"] == "10",
                "D02 Range1 did not persist")
        page.locator("#btn-replay").click()
        require("REPLAY PASS" in page.locator("#validation-status").inner_text(),
                "deterministic replay did not match actual UI actions")
        steps.append("D02_COMMIT_AND_DETERMINISTIC_REPLAY_PASS")
        steps.append("ACTUAL_LONG_MENU_CURSOR_VISIBLE_PASS")
        steps.append("ACTUAL_SOURCE_HOLD_AND_BOUNDED_LCD_MODAL_PASS")
        steps.append("ACTUAL_D09_OPTION_HOLD_TEACHER_GRANT_AND_REVOKE_PASS")
        steps.append("ACTUAL_D09_DYNAMIC_MENU_REINDEX_SAFE_EDIT_PASS")

        # Changing lesson session resets volatile fixtures but retains settings.
        page.locator("#btn-reset").click()
        require("POWER OFF" in page.locator("#screen-top").inner_text(),
                "teacher session reset did not power off")
        assert page.evaluate("key => JSON.parse(localStorage.getItem(key))",storage_key)[
            "settings"]["rangePreset1"] == "10"
        reload_begin = len(responses)
        page.reload(wait_until="networkidle")
        state = app_state(page)
        check_layout(state,width,height)
        require("POWER OFF" in state["top"], "reload should not auto-power on")
        require("khôi phục" in state["validation"].lower(),
                "browser reload did not log verified settings restore")
        saved_again=page.evaluate("key => JSON.parse(localStorage.getItem(key))",storage_key)
        require(saved_again and saved_again["settings"]["rangePreset1"] == "10",
                "reload lost Range1 training setting")
        require(page.locator("#btn-battery-fixture").get_attribute("aria-pressed")
                == "false", "instructor fault persisted across reload unexpectedly")
        steps.append("TEACHER_RESET_RELOAD_AND_SETTINGS_PERSISTENCE_PASS")

        # Final physical long press in Chrome: no simulated DOM-dispatch shortcut.
        page.locator("#btn-pause").click()
        page.locator("#key-power").click()
        for _ in range(4):
            page.locator("#btn-step").click()
        require("[DEMO]" in page.locator("#screen-top").inner_text(),
                "second POWER startup missing")

        # B19 original art: White palette previously kept a white foreground
        # on a near-white echo background, making depth/frequency text
        # unreadable. Prove the actual browser CSS ink changes on commit,
        # capture the light LCD and restore Blue through physical controls.
        page.locator("#key-menu").click()
        page.locator("#pad-right").click()
        require("Display / MENU" in page.locator("#dialog-title").inner_text(),
                "B19 Display settings inaccessible on physical keys")
        for _ in range(9):
            page.locator("#pad-down").click()
        require("Palette : Blue" in page.locator(
            "#dialog-content .lcd-menu-row[aria-current='true']").inner_text(),
            "B19 could not find the active original Blue palette")
        page.locator("#key-enter").click()
        page.locator("#pad-left").click()  # Blue -> White
        page.locator("#key-enter").click()
        page.locator("#key-menu").click()
        ink=page.evaluate("""() => ({
            caption:getComputedStyle(document.querySelector('#screen-top')).color,
            depth:getComputedStyle(document.querySelector('.depth-indicator')).color,
            setting:JSON.parse(localStorage.getItem(
                'mophongmaytrentau.fcv588.public-reference.settings.v18')).settings.palette,
        })""")
        require(ink["setting"]=="White" and
                ink["caption"]=="rgb(16, 38, 49)" and
                ink["depth"]=="rgb(16, 38, 49)",
                f"B19 White palette is not contrast-readable on the actual LCD: {ink}")
        white_shot=SCREENSHOTS / f"fcv588_public_v27_{width}x{height}_palette_white.png"
        page.screenshot(path=str(white_shot),full_page=True)
        artifacts.append(str(white_shot.relative_to(ROOT)).replace("\\","/"))
        page.locator("#key-menu").click()
        page.locator("#pad-right").click()
        for _ in range(9):
            page.locator("#pad-down").click()
        page.locator("#key-enter").click()
        page.locator("#pad-right").click()  # White -> Blue
        page.locator("#key-enter").click()
        page.locator("#key-menu").click()
        restored=page.evaluate("""() => ({
            ink:getComputedStyle(document.querySelector('#screen-top')).color,
            palette:JSON.parse(localStorage.getItem(
                'mophongmaytrentau.fcv588.public-reference.settings.v18')).settings.palette,
        })""")
        require(restored["ink"]=="rgb(245, 249, 251)" and
                restored["palette"]=="Blue",
                "B19 Blue palette restoration did not restore readable LCD ink")
        steps.append("ACTUAL_B19_WHITE_PALETTE_LEGIBILITY_PASS")

        page.locator("#key-power").focus()
        page.keyboard.down("Space")
        page.wait_for_timeout(3450)
        page.keyboard.up("Space")
        require("POWER OFF" in page.locator("#screen-top").inner_text(),
                "actual POWER keyboard hold >3000 ms did not shut down")
        steps.append("ACTUAL_POWER_LONG_HOLD_PASS")

        # Assistive technology can activate a button without pointer/key
        # edges; this is separate from the real keyboard/pointer checks above.
        # The accessible activation must still produce exactly one canonical
        # short POWER cycle rather than leave the device OFF.
        page.locator("#key-power").evaluate("button => button.click()")
        for _ in range(4):
            page.locator("#btn-step").click()
        require("[DEMO]" in page.locator("#screen-top").inner_text(),
                "accessibility-only POWER activation did not produce short input edges")
        steps.append("ASSISTIVE_POWER_SHORT_ACTIVATION_PASS")

        # D15 lesson 06: the student must commit the System > Key Beep On
        # edit via actual physical-key clicks after a new, hashed attempt.
        page.locator("#btn-reset").click()
        page.locator("#key-power").click()
        for _ in range(4):
            page.locator("#btn-step").click()
        page.locator("#lesson-picker").select_option("FCV588-LEARN-06")
        page.locator("#btn-start-lesson").click()
        page.locator("#key-menu").click()
        for _ in range(4):
            page.locator("#pad-right").click()
        for _ in range(15):
            page.locator("#pad-down").click()
        require("Key Beep" in page.locator(
            "#dialog-content .lcd-menu-row[aria-current='true']").inner_text(),
            "D15 lesson06 lost source-indexed Key Beep row")
        page.locator("#key-enter").click()
        page.locator("#pad-right").click()
        page.locator("#key-enter").click()
        page.locator("#btn-score").click()
        require("ĐẠT" in page.locator("#lesson-result").inner_text(),
                "new Key Beep D15 lesson did not score a committed keyboard path")
        steps.append("ACTUAL_D15_A17_KEY_BEEP_LESSON_PASS")

        # Lesson 07: two short real POWER/BRILL clicks preview 9 -> 0,
        # ENTER commits; reset provides an explicit new brightness=9 start.
        page.locator("#btn-reset").click()
        page.locator("#key-power").click()
        for _ in range(4):
            page.locator("#btn-step").click()
        page.locator("#lesson-picker").select_option("FCV588-LEARN-07")
        page.locator("#btn-start-lesson").click()
        page.locator("#key-power").click()
        page.locator("#key-power").click()
        page.locator("#key-enter").click()
        page.locator("#btn-score").click()
        require("ĐẠT" in page.locator("#lesson-result").inner_text(),
                "new BRILL D15 lesson failed real short POWER/BRILL input")
        steps.append("ACTUAL_D15_A02_BRILL_LESSON_PASS")

        post_reload = responses[reload_begin:]
        bad = [item for item in responses if (
            urlsplit(item["url"]).scheme != origin.scheme or
            urlsplit(item["url"]).hostname != origin.hostname or
            urlsplit(item["url"]).port != origin.port or item["status"] >= 400)]
        require(not messages, f"Chrome JavaScript console errors: {messages}")
        require(not request_failures and not bad,
                f"browser network escaped loopback or failed: {bad+request_failures}")
        steps.append("CHROME_CONSOLE_AND_LOOPBACK_NETWORK_PASS")
        browser_source = verify_browser_loaded_source(
            body_records, served_source, url, response_count=len(responses),
            body_errors=body_errors)
        steps.append("BROWSER_LOADED_SOURCE_BYTES_PASS")
        return {"viewport":f"{width}x{height}","status":"PASS",
                "pageId":"ISOLATED_PLAYWRIGHT_CHROME_CONTEXT",
                "actualViewport":{k:state[k] for k in ["width","height","scrollWidth"]},
                "canvasLogical":[state["canvasWidth"],state["canvasHeight"]],
                "steps":steps,"screenshots":artifacts,
                "physicalPanelProjection":panel_projection,
                "preScenarioStorageKeys":pre_scenario_storage_keys,
                "storageContext":"ISOLATED_NEW_BROWSER_CONTEXT",
                "browserLoadedSourceIdentity":browser_source,
                "requestsCaptured":len(responses),
                "postReloadRequestsCaptured":len(post_reload),
                "consoleErrors":messages,"requestFailures":request_failures,
                "networkErrors":bad,"settingsSchema":18}
    finally:
        context.close()


def main() -> int:
    parser=argparse.ArgumentParser()
    parser.add_argument("--url",default="http://127.0.0.1:4173/")
    parser.add_argument("--chrome",default=str(DEFAULT_CHROME))
    args=parser.parse_args()
    parsed=urlsplit(args.url)
    if parsed.scheme!="http" or parsed.hostname!="127.0.0.1" or parsed.port!=4173:
        raise SystemExit("only existing loopback FCV training server is authorized")
    if not Path(args.chrome).is_file():
        raise SystemExit(f"Chrome executable unavailable: {args.chrome}")
    report={"schemaVersion":1,"collectedAtUtc":datetime.now(timezone.utc).isoformat(),
        "profileClass":"PUBLIC_REFERENCE","hardwareValidated":False,
        "releaseApproval":"HOLD","engine":"actual Google Chrome via Python Playwright",
        "chromeExecutable":args.chrome,"baseUrl":args.url,
        "preflight":"NOT_RUN","postflight":"NOT_RUN",
        "viewports":[],"sourceRights":"ORIGINAL_CANVAS_ONLY",
        "limitations":["Headless Chrome viewport is exact; not physical monitor pixel geometry",
          "No manufacturer asset or installed firmware conformance approval",
          "Long-duration pointer capture was tested by Chromium touchCancel and releasePointerCapture; physical touchscreen hardware remains unverified"]}
    harness_sources={"desktopRunner":Path(__file__).resolve()}
    try:
        harness_before=capture_harness_source_identity(harness_sources)
        report["qaHarnessSourceIdentity"]={
            "status":"PRECHECK_PASS",
            "sourceDigestsSha256":harness_before,
            "sourcePaths":{"desktopRunner":"tools/fcv588_chrome_viewport_acceptance.py"},
        }
        report["servedSourceIdentity"] = verify_served_source(args.url)
        report["preflight"] = "SOURCE_TREE_IDENTITY_PASS"
    except Exception as exc:
        report["preflight"] = "FAIL_SOURCE_TREE_IDENTITY"
        report["preflightError"] = str(exc)

    if report["preflight"] == "SOURCE_TREE_IDENTITY_PASS":
        try:
            with sync_playwright() as playwright:
                browser=playwright.chromium.launch(
                    executable_path=args.chrome,headless=True)
                try:
                    for width,height in SIZES:
                        try:
                            report["viewports"].append(
                                run_viewport(browser,width,height,args.url,
                                             report["servedSourceIdentity"]))
                        except Exception as exc:
                            report["viewports"].append({
                                "viewport":f"{width}x{height}",
                                "status":"FAIL","error":str(exc),
                                "traceback":traceback.format_exc(limit=8)})
                finally:
                    browser.close()
        except Exception as exc:
            report["browserError"] = str(exc)
        # No PASS if a build/source change races a long Chrome acceptance.
        try:
            postflight = verify_served_source(args.url)
            require(postflight["sourceManifestSha256"] ==
                    report["servedSourceIdentity"]["sourceManifestSha256"],
                    "localhost source changed during browser run")
            require(postflight["filesCompared"] ==
                    report["servedSourceIdentity"]["filesCompared"],
                    "localhost source file set changed during browser run")
            report["postflight"] = "SOURCE_TREE_STABLE_PASS"
        except Exception as exc:
            report["postflight"] = "FAIL_SOURCE_TREE_DRIFT"
            report["postflightError"] = str(exc)
        try:
            require_harness_source_stable(harness_sources,harness_before)
            report["qaHarnessSourceIdentity"]["status"]="PASS_UNCHANGED"
        except Exception as exc:
            report["qaHarnessSourceIdentity"]["status"]="FAIL_HARNESS_DRIFT"
            report["qaHarnessSourceIdentity"]["error"]=str(exc)

    report["status"]="PASS_OBSERVED_VIEWPORTS" if (
        report["preflight"] == "SOURCE_TREE_IDENTITY_PASS" and
        report["postflight"] == "SOURCE_TREE_STABLE_PASS" and
        report.get("qaHarnessSourceIdentity",{}).get("status")=="PASS_UNCHANGED" and
        len(report["viewports"]) == len(SIZES) and
        all(item["status"] == "PASS" for item in report["viewports"])
        ) else "FAIL_QA"
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    RECEIPT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"status":report["status"],"viewports":report["viewports"],
        "receipt":str(RECEIPT)},ensure_ascii=False,indent=2))
    return 0 if report["status"]=="PASS_OBSERVED_VIEWPORTS" else 1


if __name__=="__main__":
    raise SystemExit(main())
