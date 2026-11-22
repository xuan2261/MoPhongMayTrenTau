#!/usr/bin/env python3
"""Real isolated Chrome accessibility check for the *training* phone layout.

Mobile layout is allowed to stack/reflow the original training artwork. It is
NOT a measurement or depiction of a hardware-certified FURUNO front panel.
No physical transceiver, transducer, GPS, receiver or OEM image is accessed.
"""
from __future__ import annotations

import hashlib
import json
import traceback
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

import fcv588_chrome_viewport_acceptance as shared_verifier
from fcv588_chrome_viewport_acceptance import (
    DEFAULT_CHROME, ROOT, require, verify_browser_loaded_source,
    verify_served_source, capture_harness_source_identity,
    require_harness_source_stable,
)

URL = "http://127.0.0.1:4173/"
SIZES = ((360, 800), (390, 844))
RECEIPT = ROOT / "docs/qa/FCV588_CHROME_MOBILE_V30_RECEIPT.json"
SCREENSHOTS = ROOT / "docs/qa/screenshots"
PHYSICAL_TOUCH_CONTROLS = (
    "key-menu", "pad-up", "pad-down", "pad-left", "pad-right",
    "key-enter", "key-range", "key-mark", "key-func",
    "gain-knob", "mode-knob", "key-power",
)
INSTRUCTOR_TOUCH_CONTROLS = (
    "gain-minus", "gain-plus", "mode-minus", "mode-plus",
    "btn-pause", "btn-step", "btn-reset", "btn-replay",
    "btn-nav-fixture", "btn-mount-fixture", "btn-tankenmaru-fixture",
    "btn-battery-fixture", "btn-error-fixture", "lesson-picker",
    "btn-start-lesson", "btn-score",
)


def viewport(browser, width, height, manifest):
    context = browser.new_context(viewport={"width": width, "height": height},
                                  device_scale_factor=1, is_mobile=True,
                                  has_touch=True, locale="vi-VN")
    page = context.new_page()
    errors = []
    failed = []
    responses = []
    bodies = []
    body_errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text)
            if message.type == "error" else None)
    page.on("requestfailed", lambda request: failed.append(request.url))
    page.on("response", lambda response: responses.append(
        {"url": response.url, "status": response.status}))

    def on_finished(request):
        try:
            response = request.response()
            require(response is not None, "completed request lacked HTTP response")
            bodies.append({"url": response.url, "status": response.status,
                           "sha256": hashlib.sha256(response.body()).hexdigest()})
        except Exception as exc:
            body_errors.append(f"{request.url}: {exc}")

    page.on("requestfinished", on_finished)
    try:
        response = page.goto(URL, wait_until="networkidle", timeout=30000)
        require(response is not None and response.status == 200,
                "mobile browser failed to load local training app")
        require(page.evaluate("() => Object.keys(localStorage).length") == 0,
                "isolated mobile classroom context inherited storage")
        metrics = page.evaluate("""(ids) => {
          const rect = element => {
            const r=element.getBoundingClientRect();
            return {x:r.x,y:r.y,width:r.width,height:r.height,
              right:r.right,bottom:r.bottom};
          };
          return {width:innerWidth,height:innerHeight,
            scrollWidth:document.documentElement.scrollWidth,
            frame:rect(document.querySelector('.device-frame')),
            lcd:rect(document.querySelector('#lcd')),
            pad:rect(document.querySelector('.pad')),
            teacherLesson:rect(document.querySelector('#lesson-panel-title').closest('.lesson-panel')),
            instructorControls:Object.fromEntries(ids.instructor.map(
              id=>[id,rect(document.getElementById(id))])),
            controls:Object.fromEntries(ids.physical.map(
              id=>[id,rect(document.getElementById(id))]))};
        }""", {"physical":list(PHYSICAL_TOUCH_CONTROLS),
                "instructor":list(INSTRUCTOR_TOUCH_CONTROLS)})
        require((metrics["width"], metrics["height"]) == (width, height),
                f"mobile Chrome actual viewport mismatch: {metrics}")
        require(metrics["scrollWidth"] <= width,
                "horizontal document clipping/overflow on narrow phone")
        require(metrics["frame"]["x"] >= -1 and
                metrics["frame"]["right"] <= width + 1,
                "training face exceeds viewport width")
        require(metrics["lcd"]["width"] >= 235,
                "small phone LCD is too narrow for operator-readable training")
        warning=page.locator(".mobile-training-note").bounding_box()
        physical=page.locator(".equipment").bounding_box()
        require(warning is not None and physical is not None and
                warning["y"]>=0 and
                warning["y"]+warning["height"]<=physical["y"]+2,
                "phone non-OEM training layout warning appeared after physical controls")
        require(abs(metrics["lcd"]["width"]/metrics["lcd"]["height"]-
                    128/171)<0.015,
                "phone training LCD cannot lose its portrait physical proportion")
        for name, r in metrics["controls"].items():
            require(r["width"] >= 44 and r["height"] >= 44,
                    f"tiny phone physical hit area {name}: {r['width']}x{r['height']}")
            require(r["x"] >= -1 and r["right"] <= width + 1,
                    f"unreachable phone control {name}")
        for name, r in metrics["instructorControls"].items():
            require(r["width"] >= 44 and r["height"] >= 44,
                    f"undersized D15 instructor touch control: {name}: {r}")
            require(r["x"] >= -1 and r["right"] <= width + 1,
                    f"instructor touch control outside phone viewport: {name}")
            if name in ("lesson-picker","btn-start-lesson","btn-score"):
                require(r["width"] >= metrics["teacherLesson"]["width"]*.8 and
                        r["height"] <= 90,
                        f"D15 lesson control is distorted by a nested grid: {name}, {r}")
        ids=("pad-up", "pad-down", "pad-left", "pad-right")
        for i, one in enumerate(ids):
            a=metrics["controls"][one]
            for other in ids[i+1:]:
                b=metrics["controls"][other]
                overlap_x=min(a["right"],b["right"])-max(a["x"],b["x"])
                overlap_y=min(a["bottom"],b["bottom"])-max(a["y"],b["y"])
                require(overlap_x <= 1 or overlap_y <= 1,
                        f"phone touch controls overlap: {one} / {other}")

        # Browser-native tap, not a scripted fake DOM event. The TrackPad
        # pointerdown is already a canonical input; the follow-up click may
        # never double-dispatch it. Device world time remains instructor-owned.
        page.locator("#btn-pause").click()
        page.locator("#key-power").tap()
        for _ in range(4):
            page.locator("#btn-step").click()
        require("[DEMO]" in page.locator("#screen-top").inner_text(),
                "mobile finger tap did not start synthetic face")
        page.locator("#key-menu").tap()
        before=int(page.locator("#event-count").inner_text())
        page.locator("#pad-down").tap()
        after=int(page.locator("#event-count").inner_text())
        require(after-before==1,"phone TrackPad tap emitted duplicate event")
        page.locator("#key-menu").tap()
        page.locator("#key-menu").tap()
        for _ in range(4):
            page.locator("#pad-right").tap()
        require("System" in page.locator("#dialog-title").inner_text(),
                "phone TrackPad could not navigate System")
        rows=page.locator("#dialog-content .lcd-menu-row").all_inner_texts()
        # Only actual menu items are selectable. Keep label-based navigation
        # independent of the separate V27 category rail and help footer.
        installation_index=next((index for index, text in enumerate(rows)
                                 if "Installation Settings" in text),None)
        require(installation_index is not None,
                "System Installation row missing on mobile LCD")
        for _ in range(installation_index):
            page.locator("#pad-down").tap()
        cursor=page.locator("#dialog-content .lcd-menu-row[aria-current='true']")
        require("Installation" in cursor.inner_text(),
                "last System menu row inaccessible by phone touch: "+
                str({"rowCount":len(rows),"cursor":cursor.inner_text(),
                     "events":page.locator("#event-count").inner_text(),
                     "title":page.locator("#dialog-title").inner_text()}))
        c=cursor.bounding_box()
        content=page.locator("#dialog-content").bounding_box()
        lcd=page.locator("#lcd").bounding_box()
        overlay=page.locator("#lcd-overlay").bounding_box()
        require(all(item is not None for item in (c,content,lcd,overlay)),
                "mobile menu geometry missing")
        require(c["y"] >= content["y"]-2 and
                c["y"]+c["height"] <= content["y"]+content["height"]+2,
                "last phone menu cursor clipped out of scrollport")
        require(overlay["y"] >= lcd["y"]-2 and
                overlay["y"]+overlay["height"] <= lcd["y"]+lcd["height"]+2,
                "phone menu dialog is clipped outside its LCD")
        # P1 regression: touch navigation must exit a conditional optional
        # System modal by physical MENU/ESC, not clear all LCD menu state.
        # The option fixture is instructor-only and never enables real RF.
        tanken_index=next((i for i,txt in enumerate(rows)
                           if "Tankenmaru System" in txt),None)
        require(tanken_index is not None and tanken_index < installation_index,
                "phone System menu lost the source-held Tankenmaru row")
        for _ in range(installation_index-tanken_index):
            page.locator("#pad-up").tap()
        tanken_cursor=page.locator(
            "#dialog-content .lcd-menu-row[aria-current='true']")
        require("Tankenmaru System [HOLD]" in tanken_cursor.inner_text(),
                "unverified D09 option must remain source-held before fixture")
        page.locator("#btn-tankenmaru-fixture").tap()
        require("Tankenmaru System [HOLD]" not in tanken_cursor.inner_text(),
                "teacher mobile fixture failed to declare synthetic option")
        page.locator("#key-enter").tap()
        page.locator("#pad-right").tap()
        page.locator("#key-enter").tap()
        require("Tankenmaru System : On" in tanken_cursor.inner_text(),
                "mobile touch failed to commit virtual option On")
        page.locator("#pad-down").tap()
        require("Tankenmaru Details" in page.locator(
            "#dialog-content .lcd-menu-row[aria-current='true']").inner_text(),
            "phone could not select conditional Tankenmaru Details")
        page.locator("#key-enter").tap()
        require("TANKENMARU" in page.locator("#dialog-title").inner_text() and
                "Output: Off" in page.locator("#dialog-content").inner_text() and
                "NO REAL RF" in page.locator("#dialog-content").inner_text(),
                "phone D09 source-default modal falsely implies real RF")
        page.locator("#key-menu").tap()
        require("System / MENU" in page.locator("#dialog-title").inner_text() and
                any("FUNC Key" in text for text in page.locator(
                    "#dialog-content .lcd-menu-row").all_inner_texts()),
                "mobile MENU/ESC did not return from Tankenmaru Details to System")
        page.locator("#btn-tankenmaru-fixture").tap()
        after_revoke=page.locator(
            "#dialog-content .lcd-menu-row").all_inner_texts()
        require(any("Tankenmaru System [HOLD]" in txt for txt in after_revoke)
                and any(txt.lstrip().startswith("NMEA ") for txt in after_revoke),
                "mobile D09 revoke failed to restore HOLD and source-guarded NMEA")

        # White LCD mode is an original color projection; the phone-training
        # reflow must keep source/status text legible after a real touch
        # sequence on the physical face, not simply scale the old dark CSS.
        page.locator("#key-menu").tap()   # leave System
        page.locator("#key-menu").tap()   # open Sounder
        page.locator("#pad-right").tap()  # Display
        require("Display / MENU" in page.locator("#dialog-title").inner_text(),
                "phone B19 Display choices inaccessible")
        for _ in range(9):
            page.locator("#pad-down").tap()
        require("Palette : Blue" in page.locator(
            "#dialog-content .lcd-menu-row[aria-current='true']").inner_text(),
            "phone B19 palette did not start with Blue")
        page.locator("#key-enter").tap()
        page.locator("#pad-left").tap()
        page.locator("#key-enter").tap()
        page.locator("#key-menu").tap()
        light=page.evaluate("""() => ({
          palette:JSON.parse(localStorage.getItem(
            'mophongmaytrentau.fcv588.public-reference.settings.v18')).settings.palette,
          ink:getComputedStyle(document.getElementById('screen-top')).color,
        })""")
        require(light["palette"]=="White" and
                light["ink"]=="rgb(16, 38, 49)",
                f"phone White LCD header is not contrast-readable: {light}")
        SCREENSHOTS.mkdir(parents=True,exist_ok=True)
        if width==390:
            light_shot=SCREENSHOTS / "fcv588_public_v30_mobile_390x844_palette_white.png"
            page.screenshot(path=str(light_shot),full_page=True)
        # Restore the original Blue training reference by the same trusted
        # TrackPad inputs and verify its corresponding bright ink.
        page.locator("#key-menu").tap()
        page.locator("#pad-right").tap()
        for _ in range(9):
            page.locator("#pad-down").tap()
        page.locator("#key-enter").tap()
        page.locator("#pad-right").tap()
        page.locator("#key-enter").tap()
        page.locator("#key-menu").tap()
        blue=page.evaluate("""() => ({
          palette:JSON.parse(localStorage.getItem(
            'mophongmaytrentau.fcv588.public-reference.settings.v18')).settings.palette,
          ink:getComputedStyle(document.getElementById('screen-top')).color,
        })""")
        require(blue["palette"]=="Blue" and
                blue["ink"]=="rgb(245, 249, 251)",
                "phone White->Blue LCD ink did not restore safely")
        shot=SCREENSHOTS / f"fcv588_public_v30_mobile_{width}x{height}.png"
        page.screenshot(path=str(shot),full_page=True)
        require(not errors and not failed,
                f"mobile Chrome JS/network errors: {errors+failed}")
        origin=urlsplit(URL)
        require(all(urlsplit(r["url"]).hostname==origin.hostname and
                    urlsplit(r["url"]).port==origin.port and
                    r["status"]==200 for r in responses),
                "mobile Chrome requested outside loopback or got HTTP failure")
        verified=verify_browser_loaded_source(bodies,manifest,URL,
            response_count=len(responses),body_errors=body_errors)
        return {"viewport":f"{width}x{height}","status":"PASS",
                "metrics":metrics,"touchMinCssPx":44,
                "steps":["ACTUAL_PHONE_TOUCH_TARGETS_PASS",
                         "ACTUAL_PHONE_TRACKPAD_NO_DUPLICATE_PASS",
                         "ACTUAL_PHONE_LAST_SYSTEM_MENU_IN_LCD_PASS",
                         "ACTUAL_PHONE_D09_DETAILS_RETURN_AND_REVOKE_PASS",
                         "ACTUAL_PHONE_B19_WHITE_PALETTE_READABLE_PASS",
                         "BROWSER_LOADED_SOURCE_BYTES_PASS"],
                "screenshots":[shot.relative_to(ROOT).as_posix()]+(
                    ["docs/qa/screenshots/fcv588_public_v30_mobile_390x844_palette_white.png"]
                    if width==390 else []),
                "browserLoadedSourceIdentity":verified,
                "consoleErrors":errors,"requestFailures":failed}
    finally:
        context.close()


def main():
    if RECEIPT.exists():
        raise SystemExit("refusing to overwrite existing evidence: " + str(RECEIPT))
    if any(SCREENSHOTS.glob("fcv588_public_v30_mobile_*.png")):
        raise SystemExit("refusing to overwrite existing V30 mobile screenshots")
    report={"schemaVersion":1,
            "collectedAtUtc":datetime.now(timezone.utc).isoformat(),
            "profileClass":"PUBLIC_REFERENCE", "releaseApproval":"HOLD",
            "hardwareValidated":False,"browser":"Google Chrome",
            "preflight":"NOT_RUN","postflight":"NOT_RUN","viewports":[],
            "limitations":["This is a responsive classroom reflow, not OEM face geometry",
                           "Phone/touch simulation is Chrome emulation, not measured physical hardware"]}
    try:
        harness_sources={
            "mobileRunner":Path(__file__).resolve(),
            "sharedChromeVerifier":Path(shared_verifier.__file__).resolve(),
        }
        require(harness_sources["sharedChromeVerifier"] ==
                (ROOT / "tools/fcv588_chrome_viewport_acceptance.py").resolve(),
                "mobile QA imported an unexpected source-verification helper")
        harness_before=capture_harness_source_identity(harness_sources)
        report["qaHarnessSourceIdentity"]={
            "status":"PRECHECK_PASS",
            "sourceDigestsSha256":harness_before,
            "sourcePaths":{
                "mobileRunner":"tools/fcv588_mobile_viewport_acceptance.py",
                "sharedChromeVerifier":"tools/fcv588_chrome_viewport_acceptance.py",
            },
        }
        source=verify_served_source(URL)
        report["servedSourceIdentity"]=source
        report["preflight"]="SOURCE_TREE_IDENTITY_PASS"
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=str(DEFAULT_CHROME),headless=True)
            report["chromeVersion"]=browser.version
            try:
                for width,height in SIZES:
                    try:
                        report["viewports"].append(viewport(browser,width,height,source))
                    except Exception as exc:
                        report["viewports"].append({"viewport":f"{width}x{height}",
                            "status":"FAIL","error":str(exc),
                            "traceback":traceback.format_exc(limit=6)})
            finally:
                browser.close()
        after=verify_served_source(URL)
        report["postflight"]=("SOURCE_TREE_STABLE_PASS" if
            after["sourceManifestSha256"]==source["sourceManifestSha256"] and
            after["filesCompared"]==source["filesCompared"]
            else "FAIL_SOURCE_TREE_DRIFT")
        require_harness_source_stable(harness_sources,harness_before)
        report["qaHarnessSourceIdentity"]["status"]="PASS_UNCHANGED"
    except Exception as exc:
        report["error"]=str(exc)
        report["traceback"]=traceback.format_exc(limit=6)
    report["status"]="PASS_OBSERVED_PHONE_VIEWPORTS" if (
        report["preflight"]=="SOURCE_TREE_IDENTITY_PASS" and
        report["postflight"]=="SOURCE_TREE_STABLE_PASS" and
        report.get("qaHarnessSourceIdentity",{}).get("status")=="PASS_UNCHANGED" and
        len(report["viewports"])==len(SIZES) and
        all(v["status"]=="PASS" for v in report["viewports"])) else "FAIL_QA"
    RECEIPT.parent.mkdir(parents=True,exist_ok=True)
    RECEIPT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",
                       encoding="utf8")
    print(json.dumps({"status":report["status"],"viewports":[
        {k:v.get(k) for k in ("viewport","status","error")}
        for v in report["viewports"]]},ensure_ascii=True,indent=2))
    return 0 if report["status"]=="PASS_OBSERVED_PHONE_VIEWPORTS" else 1


if __name__=="__main__":
    raise SystemExit(main())
