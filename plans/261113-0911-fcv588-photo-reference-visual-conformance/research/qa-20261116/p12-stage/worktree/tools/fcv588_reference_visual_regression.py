#!/usr/bin/env python3
"""Original UI regression against qualitative, observed manufacturer references.

Only the simulator's pixels/DOM are inspected. No reference image is fetched,
processed, embedded, or compared numerically. No application state is injected.
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
CATEGORIES = ("Sounder", "Display", "Alarm", "Data", "System")
# Existing original project palette, deliberately NOT sampled from OEM imagery.
LEGEND = [[139,31,49,255],[227,59,39,255],[244,149,40,255],
          [221,218,62,255],[77,173,135,255],[33,109,191,255],
          [15,62,153,255],[5,25,68,255]]


def run_context(browser, width, height, stage, source):
    context = browser.new_context(viewport={"width": width, "height": height},
        device_scale_factor=1, has_touch=True, is_mobile=width < 700, locale="vi-VN")
    page = context.new_page()
    result = {"viewport": f"{width}x{height}", "checks": [], "screenshots": []}
    errors, failed, responses, bodies, body_errors = [], [], [], [], []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("requestfailed", lambda r: failed.append(r.url))
    page.on("response", lambda r: responses.append(r.url))

    def finished(request):
        try:
            response = request.response()
            if response is None:
                raise RuntimeError("missing completed response")
            bodies.append({"url": response.url, "status": response.status,
                "sha256": hashlib.sha256(response.body()).hexdigest()})
        except Exception as error:
            body_errors.append(str(error))

    page.on("requestfinished", finished)

    def check(name, ok, observation):
        result["checks"].append({"name": name, "passed": bool(ok), "observed": observation})

    def tap(selector):
        locator = page.locator(selector)
        locator.tap() if width < 700 else locator.click()

    def close_menu():
        for _ in range(5):
            if page.locator("#lcd-overlay").is_hidden():
                return
            tap("#key-menu")
        raise RuntimeError("existing MENU/ESC exit did not close overlay")

    def select_entry(category, entry_id):
        close_menu()
        tap("#key-menu")
        for _ in range(CATEGORIES.index(category)):
            tap("#pad-right")
        for _ in range(30):
            selected = page.locator('#dialog-content .lcd-menu-row[aria-current="true"]')
            if selected.get_attribute("data-entry-id") == entry_id:
                if selected.get_attribute("aria-disabled") == "true":
                    raise RuntimeError("existing operator fixture is unavailable: " + entry_id)
                tap("#key-enter")
                return
            tap("#pad-down")
        raise RuntimeError("existing menu entry not reachable: " + entry_id)

    def choose(category, entry_id, value):
        select_entry(category, entry_id)
        for _ in range(110):
            current = page.locator('#lcd-menu-options [aria-current="true"]')
            if current.count() == 1 and current.inner_text() == value:
                tap("#key-enter")
                close_menu()
                return
            tap("#pad-right")
        raise RuntimeError("existing choice not reachable: " + entry_id + "=" + value)

    def depth_rect():
        return page.locator(".depth-indicator").evaluate("""el => {
          const r=el.getBoundingClientRect(), c=document.querySelector('#lcd').getBoundingClientRect();
          return {x:(r.x-c.x)/c.width,bottom:(r.bottom-c.y)/c.height,
            width:r.width/c.width,visible:!el.hidden,text:el.textContent};
        }""")

    def legend_pixels(x=7):
        return page.locator("#echo-canvas").evaluate("""(el,x) => {
          const ctx=el.getContext('2d');
          return Array.from({length:8},(_,i)=>Array.from(ctx.getImageData(x,74+i*20,1,1).data));
        }""", x)

    def shot(label):
        page.locator("#lcd").scroll_into_view_if_needed()
        p = ROOT / f"docs/qa/screenshots/fcv588_reference_v28_{stage}_{width}x{height}_{label}.png"
        page.screenshot(path=str(p), full_page=False)
        result["screenshots"].append(p.relative_to(ROOT).as_posix())

    try:
        page.goto(URL, wait_until="networkidle")
        if page.evaluate("Object.keys(localStorage).length") != 0:
            raise RuntimeError("expected isolated initial storage")
        brand = page.locator(".bezel-header").evaluate("""el => {
          const r=el.getBoundingClientRect(), s=document.querySelector('.display-housing').getBoundingClientRect();
          const lcd=document.querySelector('#lcd').getBoundingClientRect();
          return {insideHousing:!!el.closest('.display-housing'),
            aboveLcd:r.bottom<=lcd.top+1,relativeHeight:r.height/lcd.height,
            x:r.x,y:r.y,housingTop:s.y};
        }""")
        check("BRAND_IN_NARROW_DISPLAY_SURROUND", brand["insideHousing"]
              and brand["aboveLcd"] and brand["relativeHeight"] < .065, brand)
        if width >= 700:
            mount = page.locator(".device-frame").evaluate("""el => {
              const b=getComputedStyle(el,'::before'), a=getComputedStyle(el,'::after');
              return {stemFraction:parseFloat(b.width)/el.clientWidth,
                stemBorder:parseFloat(b.borderLeftWidth),baseHeight:parseFloat(a.height),
                inert:b.pointerEvents==='none' && a.pointerEvents==='none'};
            }""")
            check("SOURCE_PHOTO_CENTRAL_PEDESTAL_NOT_U_FRAME",
                mount["stemFraction"] < .5 and mount["stemBorder"] == 0
                and mount["baseHeight"] > 24 and mount["inert"], mount)
        tap("#btn-pause")
        tap("#key-power")
        for _ in range(4):
            tap("#btn-step")
        if "[DEMO]" not in page.locator("#screen-top").inner_text():
            raise RuntimeError("existing physical boot failed")
        tick = page.locator("#tick-count").inner_text()
        depth = depth_rect()
        check("SINGLE_SONAR_DEPTH_IS_LOWER_LEFT", depth["visible"]
            and 0 <= depth["x"] < .10 and .80 < depth["bottom"] < 1, depth)
        check("HEADER_SHOWS_COMMITTED_PICTURE_RATE",
            "x1" in page.locator("#screen-top").inner_text(),
            page.locator("#screen-top").inner_text())
        choose("Sounder", "sounder.pictureAdvance", "Stop")
        check("HEADER_FOLLOWS_STOP_WITHOUT_WORLD_TICK",
            "STOP" in page.locator("#screen-top").inner_text()
            and page.locator("#tick-count").inner_text() == tick,
            page.locator("#screen-top").inner_text())
        choose("Sounder", "sounder.pictureAdvance", "1x")
        choose("Display", "display.colorBar", "On")
        check("SINGLE_VERTICAL_STRONG_TO_WEAK_LEGEND", legend_pixels() == LEGEND, legend_pixels())
        choose("Display", "display.colorBar", "Off")
        check("COLOR_BAR_OFF_REMOVES_LEGEND", legend_pixels() != LEGEND, legend_pixels())
        choose("Display", "display.colorBar", "On")
        choose("Display", "display.palette", "White")
        shot("single_white")
        choose("Display", "display.palette", "Blue")
        page.locator("#mode-knob").focus()
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(6300)
        if page.locator("#mode-state").inner_text() != "DUAL":
            raise RuntimeError("existing MODE timer did not commit DUAL")
        depth = depth_rect()
        check("DUAL_DEPTH_STAYS_LOWER_LEFT", 0 <= depth["x"] < .10, depth)
        check("DUAL_HAS_ONE_LEGEND_NOT_ONE_PER_CHANNEL",
            legend_pixels() == LEGEND and legend_pixels(247) != LEGEND,
            {"left": legend_pixels(), "right": legend_pixels(247)})
        choose("System", "system.transducer", "525STID-PWD")
        choose("System", "system.draft", "1")
        tap("#btn-mount-fixture")
        choose("Display", "display.bottomDiscrimination", "Graphic")
        depth = depth_rect()
        check("DEPTH_CLEARS_VISIBLE_BOTTOM_CLASSIFICATION", depth["x"] < .10
            and depth["bottom"] <= .825, depth)
        shot("dual_bottom")
        tap("#btn-mount-fixture")
        depth = depth_rect()
        check("REVOKED_BOTTOM_FIXTURE_RESTORES_DEPTH_POSITION", depth["bottom"] > .90, depth)
        tap("#btn-replay")
        replay = page.locator("#validation-status").inner_text()
        check("CANONICAL_REPLAY_AND_WORLD_CLOCK_UNCHANGED", "REPLAY PASS" in replay
            and page.locator("#tick-count").inner_text() == tick, replay)
        tap("#btn-reset")
        page.reload(wait_until="networkidle")
        check("RESET_RELOAD_RETAINS_BLANK_UNPOWERED_LCD", page.locator("#off-screen").is_visible()
            and page.locator("#off-screen").inner_text() == "", page.locator("#screen-top").text_content())
        result["browserLoadedSourceIdentity"] = verify_browser_loaded_source(
            bodies, source, URL, response_count=len(responses), body_errors=body_errors)
        check("NO_CONSOLE_OR_NETWORK_FAILURES", not errors and not failed,
            {"console": errors, "network": failed})
    except Exception as error:
        result["executionError"] = str(error)
        result["traceback"] = traceback.format_exc(limit=6)
    finally:
        context.close()
    result["status"] = "PASS" if not result.get("executionError") and result["checks"] \
        and all(c["passed"] for c in result["checks"]) else "FAIL"
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=("red", "green", "final"), required=True)
    args = parser.parse_args()
    output = ROOT / f"docs/qa/FCV588_REFERENCE_V28_{args.stage.upper()}_RECEIPT.json"
    if output.exists():
        raise SystemExit("Refusing to overwrite existing evidence: " + str(output))
    paths = (Path(__file__).resolve(), ROOT / "tools/fcv588_chrome_viewport_acceptance.py")
    hashes = lambda: {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
    report = {"collectedAtUtc": datetime.now(timezone.utc).isoformat(), "stage": args.stage,
        "scope": "QUALITATIVE_REFERENCE_PLACEMENT_ORIGINAL_ARTWORK",
        "hardwareValidated": False, "releaseApproval": "HOLD", "viewports": [],
        "harnessSha256": hashes()}
    try:
        source = verify_served_source(URL)
        report["servedSourceIdentity"] = source
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=str(DEFAULT_CHROME), headless=True)
            try:
                for width, height in SIZES:
                    report["viewports"].append(run_context(browser,width,height,args.stage,source))
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
        and all(v["status"] == "PASS" for v in report["viewports"])) else "FAIL"
    with output.open("x", encoding="utf-8") as stream:
        json.dump(report,stream,ensure_ascii=False,indent=2)
        stream.write("\n")
    print(json.dumps({"status": report["status"], "error":report.get("executionError"),
        "receipt":str(output), "viewports":[{"viewport":v["viewport"],
        "checks":len(v["checks"]),"failed":[c["name"] for c in v["checks"] if not c["passed"]],
        "executionError":v.get("executionError")} for v in report["viewports"]]},indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
