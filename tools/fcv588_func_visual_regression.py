#!/usr/bin/env python3
"""V29: real FUNC choice visibility, original UI only; no injected app state."""
from __future__ import annotations

import argparse
import hashlib
import json
import traceback
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright
from fcv588_chrome_viewport_acceptance import (
    ROOT, DEFAULT_CHROME, verify_served_source, verify_browser_loaded_source,
)

URL = "http://127.0.0.1:4173/"
SIZES = ((1366, 768), (1920, 1080), (360, 800), (390, 844))
STORAGE = "mophongmaytrentau.fcv588.public-reference.settings.v18"


def run_context(browser, width, height, stage, source, checkpoint="V29"):
    context = browser.new_context(viewport={"width": width, "height": height},
                                  device_scale_factor=1, has_touch=True,
                                  is_mobile=width < 700, locale="vi-VN")
    page = context.new_page()
    result = {"viewport": f"{width}x{height}", "checks": [], "screenshots": []}
    errors, failures, responses, bodies, body_errors = [], [], [], [], []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text)
            if message.type == "error" else None)
    page.on("requestfailed", lambda request: failures.append(request.url))
    page.on("response", lambda response: responses.append(response.url))

    def finished(request):
        try:
            response = request.response()
            if response is None:
                raise RuntimeError("completed request has no response")
            bodies.append({"url": response.url, "status": response.status,
                           "sha256": hashlib.sha256(response.body()).hexdigest()})
        except Exception as error:
            body_errors.append(str(error))

    page.on("requestfinished", finished)

    def check(name, passed, observed):
        result["checks"].append({"name": name, "passed": bool(passed), "observed": observed})

    def tap(selector):
        control = page.locator(selector)
        control.tap() if width < 700 else control.click()

    def saved():
        return page.evaluate("key => JSON.parse(localStorage.getItem(key))?.settings ?? {}", STORAGE)

    def program(steps):
        page.locator("#key-func").focus()
        page.keyboard.down("Space")
        page.wait_for_timeout(1100)
        page.keyboard.up("Space")
        if "ASSIGN" not in page.locator("#dialog-title").inner_text():
            raise RuntimeError("native long FUNC failed to open existing assignment")
        for _ in range(steps):
            tap("#pad-down")
        tap("#key-enter")

    def selection(value):
        # This works on both the old plain text and new semantic rows. It
        # measures the actual selected glyphs WITHOUT scrolling the item.
        return page.locator("#dialog-content").evaluate(r"""(el,value) => {
          const port=el.getBoundingClientRect();
          const lcd=document.getElementById('lcd').getBoundingClientRect();
          const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
          const pattern=new RegExp('▶\\s*'+value+'(?=\\s|$)');
          let node;
          while((node=walker.nextNode())){
            const match=node.textContent.match(pattern);
            if(!match)continue;
            const range=document.createRange();
            range.setStart(node,match.index);
            range.setEnd(node,match.index+match[0].length);
            const r=range.getBoundingClientRect();
            return {found:true,visible:r.width>0 && r.height>0 &&
              r.top>=port.top-1 && r.bottom<=port.bottom+1 &&
              r.left>=port.left-1 && r.right<=port.right+1 &&
              r.top>=lcd.top && r.bottom<=lcd.bottom,
              value,top:r.top,bottom:r.bottom,portTop:port.top,
              portBottom:port.bottom,scrollTop:el.scrollTop};
          }
          return {found:false,visible:false,value};
        }""", value)

    def screenshot(label):
        page.locator("#lcd").scroll_into_view_if_needed()
        path = ROOT / f"docs/qa/screenshots/fcv588_func_{checkpoint.lower()}_{stage}_{width}x{height}_{label}.png"
        if path.exists():
            raise RuntimeError("refusing to overwrite screenshot: " + str(path))
        page.screenshot(path=str(path), full_page=False)
        result["screenshots"].append(path.relative_to(ROOT).as_posix())

    try:
        page.goto(URL, wait_until="networkidle")
        if page.evaluate("Object.keys(localStorage).length") != 0:
            raise RuntimeError("context inherited settings")
        tap("#btn-pause")
        tap("#key-power")
        for _ in range(4):
            tap("#btn-step")
        if "[DEMO]" not in page.locator("#screen-top").inner_text():
            raise RuntimeError("existing native POWER boot failed")
        tick = page.locator("#tick-count").inner_text()
        program(3)  # Pic. Advance -> Clutter, using existing 11-target order.
        check("NATIVE_LONG_FUNC_ASSIGNS_CLUTTER", saved().get("keySetup") == "Clutter", saved().get("keySetup"))
        tap("#key-func")
        before = saved()
        tap("#pad-up")  # existing wrap semantics: 0 -> 100
        selected = selection("100")
        check("CLUTTER_100_SELECTED_TEXT_INSIDE_LCD", selected["visible"], selected)
        check("DRAFT_DOES_NOT_WRITE_SETTINGS", saved() == before, saved())
        rows = page.locator("#dialog-content [role='listitem']").all_text_contents()
        check("FUNC_HAS_BOUNDED_SEMANTIC_CHOICES", 1 <= len(rows) <= 7 and
              page.locator("#dialog-content [aria-current='true']").count() == 1, rows)
        help_text = page.locator("#dialog-footer").inner_text()
        check("FUNC_COMMIT_CANCEL_HELP_VISIBLE", page.locator("#dialog-footer").is_visible()
              and "ENTER" in help_text and "MENU/ESC" in help_text and "lưu" in help_text, help_text)
        screenshot("clutter_100")
        tap("#pad-up")
        previous = selection("99")
        check("PREVIOUS_CHOICE_FOLLOWS_CURSOR", previous["visible"], previous)
        count_before = int(page.locator("#event-count").inner_text())
        tap("#key-func")
        check("SHORT_FUNC_ADVANCES_ONCE_WITHOUT_COMMIT", selection("100")["found"] and
              int(page.locator("#event-count").inner_text()) - count_before == 2 and saved() == before,
              {"selection": selection("100"), "eventDelta": int(page.locator("#event-count").inner_text()) - count_before})
        tap("#key-menu")
        check("MENU_CANCEL_PRESERVES_SETTINGS", saved() == before and page.locator("#lcd-overlay").is_hidden(), saved())
        tap("#key-func")
        tap("#pad-up")
        tap("#key-enter")
        check("ENTER_COMMITS_EXACT_CLUTTER_VALUE", saved().get("clutter") == "100" and
              page.locator("#lcd-overlay").is_hidden(), saved().get("clutter"))
        program(1)  # Clutter -> Color Erase
        tap("#key-func")
        tap("#pad-up")  # 0 -> 50
        selected = selection("50")
        check("COLOR_ERASE_50_SELECTED_TEXT_INSIDE_LCD", selected["visible"], selected)
        screenshot("color_erase_50")
        tap("#key-menu")
        program(1)  # Color Erase -> White Line, existing Off/On ONLY.
        tap("#key-func")
        tap("#pad-down")
        check("WHITE_LINE_EXISTING_ON_DRAFT_VISIBLE", selection("On")["visible"] and
              saved().get("whiteLine", "Off") == "Off", selection("On"))
        screenshot("white_line_on_draft")
        tap("#key-menu")
        tap("#key-func")
        check("WHITE_LINE_CANCEL_REOPENS_OFF", selection("Off")["found"], selection("Off"))
        tap("#pad-down")
        tap("#key-enter")
        check("WHITE_LINE_EXISTING_ON_COMMITS", saved().get("whiteLine") == "On", saved().get("whiteLine"))
        # Native focus loss must cancel held FUNC, not reopen/program or commit.
        page.locator("#key-func").focus()
        page.keyboard.down("Space")
        page.locator("#key-menu").focus()
        page.keyboard.up("Space")
        check("CANCELLED_FUNC_HOLD_DOES_NOT_OPEN_EDITOR", page.locator("#lcd-overlay").is_hidden()
              and "pressing" not in (page.locator("#key-func").get_attribute("class") or ""),
              page.locator("#lcd-overlay").is_hidden())
        tap("#btn-replay")
        check("FUNC_WORKFLOW_REPLAY_AND_WORLD_CLOCK", "REPLAY PASS" in page.locator("#validation-status").inner_text()
              and page.locator("#tick-count").inner_text() == tick, page.locator("#validation-status").inner_text())
        tap("#btn-reset")
        page.reload(wait_until="networkidle")
        check("RESET_RELOAD_PRESERVES_SETTINGS_NOT_EDITOR", saved().get("clutter") == "100"
              and saved().get("whiteLine") == "On" and saved().get("keySetup") == "White Line"
              and page.locator("#off-screen").is_visible() and page.locator("#lcd-overlay").is_hidden(), saved())
        tap("#btn-pause")
        tap("#key-power")
        for _ in range(4):
            tap("#btn-step")
        tap("#key-func")
        check("RELOADED_WHITE_LINE_FUNC_REOPENS_ON", selection("On")["visible"], selection("On"))
        viewport = page.evaluate("[innerWidth,innerHeight,document.documentElement.scrollWidth]")
        check("EXACT_VIEWPORT_WITHOUT_HORIZONTAL_OVERFLOW", viewport[:2] == [width, height] and viewport[2] <= width, viewport)
        result["browserLoadedSourceIdentity"] = verify_browser_loaded_source(
            bodies, source, URL, response_count=len(responses), body_errors=body_errors)
        check("NO_CONSOLE_OR_NETWORK_ERRORS", not errors and not failures, {"console": errors, "network": failures})
    except Exception as error:
        result["executionError"] = str(error)
        result["traceback"] = traceback.format_exc(limit=6)
    finally:
        context.close()
    result["status"] = "PASS" if (not result.get("executionError") and result["checks"]
        and all(item["passed"] for item in result["checks"])) else "FAIL"
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=("red", "green"), required=True)
    parser.add_argument("--checkpoint", choices=("V29", "V30"), default="V29")
    args = parser.parse_args()
    output = ROOT / f"docs/qa/FCV588_FUNC_{args.checkpoint}_{args.stage.upper()}_RECEIPT.json"
    if output.exists():
        raise SystemExit("refusing to overwrite receipt: " + str(output))
    paths = (Path(__file__).resolve(), ROOT / "tools/fcv588_chrome_viewport_acceptance.py")
    hashes = lambda: {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
    report = {"collectedAtUtc": datetime.now(timezone.utc).isoformat(), "stage": args.stage,
              "checkpoint": args.checkpoint, "scope": "FUNC_ORIGINAL_PRESENTATION_AND_EXISTING_BOOLEAN_WHITE_LINE",
              "numericWhiteLine": "SOURCE_GAP_NOT_IMPLEMENTED", "hardwareValidated": False,
              "releaseApproval": "HOLD", "harnessSha256": hashes(), "viewports": []}
    try:
        source = verify_served_source(URL)
        report["servedSourceIdentity"] = source
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=str(DEFAULT_CHROME), headless=True)
            report["chromeVersion"] = browser.version
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
    report["status"] = "PASS" if (not report.get("executionError") and report.get("sourceStable")
        and report.get("harnessStable") and len(report["viewports"]) == 4
        and all(v["status"] == "PASS" for v in report["viewports"])) else "FAIL"
    with output.open("x", encoding="utf-8") as stream:
        json.dump(report, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    print(json.dumps({"status": report["status"], "error": report.get("executionError"),
        "receipt": str(output), "viewports": [{"viewport": v["viewport"], "checks": len(v["checks"]),
        "failed": [c["name"] for c in v["checks"] if not c["passed"]],
        "executionError": v.get("executionError")} for v in report["viewports"]]}, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
