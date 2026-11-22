#!/usr/bin/env python3
"""Observe original LCD pixels and menu semantics through real Chrome inputs.

No OEM media, physical ports, injected application state or external service.
The normalized geometry is measured from this simulator, not real hardware.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import traceback
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright
from fcv588_chrome_viewport_acceptance import (
    DEFAULT_CHROME, ROOT, verify_served_source, verify_browser_loaded_source,
)

URL = "http://127.0.0.1:4173/"
SIZES = ((1366, 768), (1920, 1080), (360, 800), (390, 844))
PATTERNS = (("BLACK", [0, 0, 0, 255]), ("WHITE", [255, 255, 255, 255]),
            ("RED", [255, 0, 0, 255]), ("GREEN", [0, 255, 0, 255]),
            ("BLUE", [0, 0, 255, 255]))


def run_context(browser, width, height, stage, source, checkpoint="V27"):
    context = browser.new_context(viewport={"width": width, "height": height},
                                  device_scale_factor=1, has_touch=True,
                                  is_mobile=width < 700, locale="vi-VN")
    page = context.new_page()
    result = {"viewport": f"{width}x{height}", "checks": [], "screenshots": []}
    errors, failed, responses, bodies, body_errors = [], [], [], [], []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text)
            if message.type == "error" else None)
    page.on("requestfailed", lambda request: failed.append(request.url))
    page.on("response", lambda response: responses.append(response.url))

    def finished(request):
        try:
            response = request.response()
            if response is None:
                raise RuntimeError("completed request lacks response")
            bodies.append({"url": response.url, "status": response.status,
                           "sha256": hashlib.sha256(response.body()).hexdigest()})
        except Exception as error:
            body_errors.append(str(error))

    page.on("requestfinished", finished)

    def check(name, passed, observation):
        result["checks"].append({"name": name, "passed": bool(passed),
                                 "observed": observation})

    def tap(selector):
        control = page.locator(selector)
        control.tap() if width < 700 else control.click()

    def brightness():
        return page.locator("#lcd").evaluate(
            "el => Number(getComputedStyle(el).filter.match(/brightness\\(([^)]+)/)?.[1])")

    def screenshot(label):
        page.locator("#lcd").scroll_into_view_if_needed()
        path = ROOT / f"docs/qa/screenshots/fcv588_lcd_{checkpoint.lower()}_{stage}_{width}x{height}_{label}.png"
        page.screenshot(path=str(path), full_page=False)
        result["screenshots"].append(path.relative_to(ROOT).as_posix())

    try:
        page.goto(URL, wait_until="networkidle")
        if page.evaluate("Object.keys(localStorage).length") != 0:
            raise RuntimeError("fresh Chrome context inherited local settings")
        result["geometry"] = page.evaluate("""() => {
          const head=document.querySelector('.equipment').getBoundingClientRect();
          const rect=selector => {
            const r=document.querySelector(selector).getBoundingClientRect();
            return {css:{x:r.x,y:r.y,width:r.width,height:r.height},
              relativeToHead:{x:(r.x-head.x)/head.width,y:(r.y-head.y)/head.height,
                width:r.width/head.width,height:r.height/head.height}};
          };
          return {basis:'OBSERVED_SIMULATOR_NOT_MEASURED_HARDWARE',
            layout:innerWidth<=700?'TRAINING_REFLOW':'REFERENCE_ESTIMATE',
            viewport:[innerWidth,innerHeight],logicalLcd:[
              document.querySelector('canvas').width,document.querySelector('canvas').height],
            elements:Object.fromEntries(['.device-frame','.equipment','#lcd',
              '#key-menu','.pad','#key-enter','#key-range','#key-mark','#key-func',
              '#gain-knob','#mode-knob','#key-power'].map(s=>[s,rect(s)]))};
        }""")
        tap("#btn-pause")
        tap("#key-power")
        for _ in range(4):
            tap("#btn-step")
        if "[DEMO]" not in page.locator("#screen-top").inner_text():
            raise RuntimeError("initial physical POWER sequence failed")
        tick = page.locator("#tick-count").inner_text()

        full = brightness()
        tap("#key-power")
        tap("#pad-left")  # visible draft 9 -> 8, before ENTER or timeout
        pending = brightness()
        check("BRILL_PREVIEW_CHANGES_LCD_BEFORE_COMMIT", 0 < pending < full,
              {"before": full, "preview": pending,
               "dialog": page.locator("#dialog-content").inner_text()})
        page.locator("#key-power").focus()
        page.keyboard.down("Space")
        held = brightness()
        page.locator("#key-menu").focus()  # native blur cancels the hold
        page.keyboard.up("Space")
        check("CANCELLED_POWER_HOLD_PRESERVES_BRILL_PREVIEW",
              held == pending and brightness() == pending and pending < full,
              {"held": held, "afterCancel": brightness(), "preview": pending})
        tap("#key-enter")
        check("BRILL_COMMIT_PRESERVES_PREVIEW_WITHOUT_WORLD_TICK",
              brightness() == pending and page.locator("#lcd-overlay").is_hidden()
              and page.locator("#tick-count").inner_text() == tick,
              {"committed": brightness(), "preview": pending})
        tap("#key-power")
        tap("#pad-right")
        tap("#key-enter")  # restore brightness 9

        tap("#key-menu")
        names = page.locator("#lcd-menu-categories [data-category]").all_text_contents()
        check("FIVE_CATEGORIES_VISIBLE_WITH_ACTIVE_SOUNDER",
              names == ["Sounder", "Display", "Alarm", "Data", "System"]
              and page.locator('#lcd-menu-categories [aria-current="true"]').all_text_contents() == ["Sounder"], names)
        check("MAIN_MENU_ROWS_HAVE_SEMANTIC_IDS_NOT_HELP_TEXT",
              page.locator("#dialog-content .lcd-menu-row[data-entry-id]").count() == 13
              and page.locator("#dialog-content .lcd-menu-row").count() == 13,
              page.locator("#dialog-content .lcd-menu-row").all_text_contents())
        tap("#key-enter")  # stage Picture Advance, without changing its value
        check("EDIT_HAS_SEPARATE_SELECTED_CHOICE_AND_UNCHANGED_CATEGORY",
              page.locator('#lcd-menu-categories [aria-current="true"]').all_text_contents() == ["Sounder"]
              and page.locator('#lcd-menu-options [aria-current="true"]').all_text_contents() == ["1x"],
              page.locator("#lcd-menu-options").all_text_contents())
        tap("#key-menu")  # cancel edit, same menu
        screenshot("sounder")
        for _ in range(4):
            tap("#pad-right")
        check("CATEGORY_RAIL_FOLLOWS_PHYSICAL_INPUT",
              page.locator('#lcd-menu-categories [aria-current="true"]').all_text_contents() == ["System"],
              page.locator("#dialog-title").inner_text())
        rows = page.locator("#dialog-content .lcd-menu-row").all_text_contents()
        target = next((i for i, text in enumerate(rows) if "LCD Test" in text), None)
        if target is None:
            raise RuntimeError("pre-existing System LCD Test not reachable")
        for _ in range(target):
            tap("#pad-down")
        tap("#key-enter")
        for index, (name, expected) in enumerate(PATTERNS):
            if index:
                tap("#pad-right")
            pixels = page.locator("#echo-canvas").evaluate("""el => {
              const ctx=el.getContext('2d');
              return [[8,8],[240,8],[471,8],[8,320],[240,320],[471,320],
                [8,631],[240,631],[471,631]].map(([x,y])=>
                  Array.from(ctx.getImageData(x,y,1,1).data));
            }""")
            check("LCD_TEST_DISPLAYS_" + name, all(pixel == expected for pixel in pixels), pixels)
        check("LCD_TEST_HAS_NO_SONAR_LABELS_OR_MENU_OBSTRUCTION",
              page.locator("#screen-top").is_hidden()
              and page.locator(".depth-indicator").is_hidden()
              and page.locator("#lcd-overlay").is_hidden(),
              {"headerVisible": page.locator("#screen-top").is_visible(),
               "depthVisible": page.locator(".depth-indicator").is_visible(),
               "menuVisible": page.locator("#lcd-overlay").is_visible()})
        screenshot("lcd_test_blue")
        tap("#key-menu")
        check("LCD_TEST_EXIT_RESTORES_SYSTEM_AND_SONAR",
              "System / MENU" in page.locator("#dialog-title").inner_text()
              and page.locator("#screen-top").is_visible(),
              page.locator("#dialog-title").inner_text())
        tap("#key-menu")
        tap("#btn-replay")
        replay = page.locator("#validation-status").inner_text()
        check("DISPLAY_WORKFLOWS_PRESERVE_REPLAY_AND_WORLD_CLOCK",
              "REPLAY PASS" in replay and page.locator("#tick-count").inner_text() == tick, replay)
        tap("#btn-reset")
        page.reload(wait_until="networkidle")
        check("RESET_RELOAD_CLEARS_DIAGNOSTIC_VIEW",
              page.locator("#off-screen").is_visible()
              and page.locator("#off-screen").inner_text() == ""
              and page.locator("#lcd-overlay").is_hidden(),
              page.locator("#screen-top").text_content())
        result["browserLoadedSourceIdentity"] = verify_browser_loaded_source(
            bodies, source, URL, response_count=len(responses), body_errors=body_errors)
        check("NO_BROWSER_CONSOLE_OR_NETWORK_ERRORS", not errors and not failed,
              {"console": errors, "network": failed})
    except Exception as error:
        result["executionError"] = str(error)
        result["traceback"] = traceback.format_exc(limit=6)
    finally:
        context.close()
    result["status"] = "PASS" if (not result.get("executionError")
        and result["checks"] and all(c["passed"] for c in result["checks"])) else "FAIL"
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=("red", "green"), required=True)
    parser.add_argument("--checkpoint", choices=("V27", "V28", "V29", "V30"), default="V27")
    args = parser.parse_args()
    output = ROOT / f"docs/qa/FCV588_LCD_{args.checkpoint}_{args.stage.upper()}_RECEIPT.json"
    if output.exists():
        raise SystemExit("Refusing to overwrite evidence: " + str(output))
    sources = (Path(__file__).resolve(), ROOT / "tools/fcv588_chrome_viewport_acceptance.py")
    hashes = lambda: {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sources}
    report = {"collectedAtUtc": datetime.now(timezone.utc).isoformat(),
              "scope": "ORIGINAL_LCD_TRAINING_RENDERER_NOT_OEM_PIXELS",
              "releaseApproval": "HOLD", "hardwareValidated": False,
              "stage": args.stage, "checkpoint": args.checkpoint,
              "viewports": [], "harnessSha256": hashes()}
    try:
        source = verify_served_source(URL)
        report["servedSourceIdentity"] = source
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=str(DEFAULT_CHROME), headless=True)
            try:
                for width, height in SIZES:
                    report["viewports"].append(run_context(browser, width, height, args.stage, source, args.checkpoint))
            finally:
                browser.close()
        report["sourceStable"] = verify_served_source(URL) == source
        report["harnessStable"] = hashes() == report["harnessSha256"]
    except Exception as error:
        report["executionError"] = str(error)
        report["traceback"] = traceback.format_exc(limit=6)
    report["status"] = "PASS" if (not report.get("executionError")
        and report.get("sourceStable") and report.get("harnessStable")
        and len(report["viewports"]) == len(SIZES)
        and all(item["status"] == "PASS" for item in report["viewports"])) else "FAIL"
    with output.open("x", encoding="utf-8") as stream:
        json.dump(report, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    print(json.dumps({"status": report["status"], "error": report.get("executionError"),
        "receipt": str(output), "viewports": [{"viewport": v["viewport"],
        "checks": len(v["checks"]), "failed": [c["name"] for c in v["checks"] if not c["passed"]],
        "executionError": v.get("executionError")} for v in report["viewports"]]}, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
