#!/usr/bin/env python3
"""V30 configuration interaction/presentation regression; original runtime only."""
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
STORAGE = "mophongmaytrentau.fcv588.public-reference.settings.v18"
SIZES = ((1366, 768), (1920, 1080), (360, 800), (390, 844))


def run_context(browser, width, height, stage, source, attempt=1):
    context = browser.new_context(viewport={"width": width, "height": height},
                                  device_scale_factor=1, has_touch=True,
                                  is_mobile=width < 700, locale="vi-VN")
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
                raise RuntimeError("completed request without response")
            bodies.append({"url": response.url, "status": response.status,
                           "sha256": hashlib.sha256(response.body()).hexdigest()})
        except Exception as e:
            body_errors.append(str(e))
    page.on("requestfinished", finished)

    def check(name, ok, observed):
        result["checks"].append({"name": name, "passed": bool(ok), "observed": observed})

    def tap(selector):
        control = page.locator(selector)
        control.tap() if width < 700 else control.click()

    def pad(direction, count=1):
        for _ in range(count):
            tap("#pad-" + direction)

    def saved():
        return page.evaluate("key => JSON.parse(localStorage.getItem(key))?.settings ?? {}", STORAGE)

    def alarm_tokens():
        return [part.strip() for part in page.locator("#dialog-footer").inner_text().split("·")]

    def alarm_banner_pixels():
        # Samples of our own Canvas banner, NOT pixels from an OEM source.
        return page.locator("#echo-canvas").evaluate("""el=>{
          const ctx=el.getContext('2d');
          return [9,240,470].map(x=>Array.from(ctx.getImageData(x,81,1,1).data));
        }""")

    def open_entry(category, entry_id):
        for _ in range(5):
            if page.locator("#lcd-overlay").is_hidden():
                break
            tap("#key-menu")
        if page.locator("#lcd-overlay").is_visible():
            raise RuntimeError("existing MENU/ESC path did not return to sounder")
        tap("#key-menu")
        pad("right", ["Sounder", "Display", "Alarm", "Data", "System"].index(category))
        ids = page.locator("#dialog-content .lcd-menu-row").evaluate_all(
            "rows => rows.map(row => row.dataset.entryId)")
        if entry_id not in ids:
            raise RuntimeError("existing main-menu path missing: " + entry_id)
        pad("down", ids.index(entry_id))
        tap("#key-enter")

    def inspect(prefix, count, key=None, committed=None, draft=None):
        # Observe; never scroll a selected row for the application or inject state.
        d = page.evaluate("""() => {
          const rect=e=>e?.getBoundingClientRect();
          const lcd=rect(document.getElementById('lcd'));
          const inside=(e,p)=>{const r=rect(e),b=rect(p);return !!r&&!!b&&r.width>0&&r.height>0&&
            getComputedStyle(e).display!=='none'&&r.top>=b.top-1&&r.bottom<=b.bottom+1&&
            r.left>=b.left-1&&r.right<=b.right+1;};
          const content=document.getElementById('dialog-content');
          const options=document.getElementById('lcd-menu-options');
          const transaction=document.getElementById('lcd-config-transaction');
          const footer=document.getElementById('dialog-footer');
          const rows=[...content.querySelectorAll('.lcd-menu-row')];
          const selected=content.querySelector('[aria-current="true"]');
          const choice=options.querySelector('[role="listitem"][aria-current="true"]');
          return {layout:document.getElementById('lcd-overlay').dataset.layout,
            rows:rows.map(r=>({key:r.dataset.fieldKey,text:r.textContent})),
            selected:selected?.dataset.fieldKey,fieldVisible:inside(selected,content),
            choices:[...options.querySelectorAll('[role="listitem"]')].map(r=>r.dataset.choiceValue),
            choice:choice?.dataset.choiceValue,choiceVisible:inside(choice,options),
            transaction:transaction?{...transaction.dataset,text:transaction.textContent}:null,
            transactionVisible:inside(transaction,document.getElementById('lcd')),
            footer:footer.textContent,footerVisible:inside(footer,document.getElementById('lcd'))};
        }""")
        check(prefix + "_OPERATOR_ROWS_ONLY", len(d["rows"]) == count and
              all(row.get("key") for row in d["rows"]), d["rows"])
        check(prefix + "_FIELD_AND_HELP_VISIBLE", d["fieldVisible"] and d["footerVisible"]
              and "ENTER" in d["footer"] and "MENU/ESC" in d["footer"], d)
        if draft is not None:
            tx = d["transaction"] or {}
            check(prefix + "_STORED_AND_DRAFT_DISTINCT", d["transactionVisible"] and
                  tx.get("fieldKey") == key and tx.get("committedValue") == committed
                  and tx.get("draftValue") == draft, tx)
            check(prefix + "_BOUNDED_ACTIVE_CHOICE", 1 <= len(d["choices"]) <= 7 and
                  d.get("choice") == draft and d["choiceVisible"], d["choices"])
        return d

    def screenshot(label):
        page.locator("#lcd").scroll_into_view_if_needed()
        suffix = "" if attempt == 1 else f"_attempt{attempt}"
        path = ROOT / f"docs/qa/screenshots/fcv588_config_v30_{stage}{suffix}_{width}x{height}_{label}.png"
        if path.exists():
            raise RuntimeError("refusing to overwrite screenshot")
        page.screenshot(path=str(path), full_page=False)
        result["screenshots"].append(path.relative_to(ROOT).as_posix())

    try:
        page.goto(URL, wait_until="networkidle")
        if page.evaluate("Object.keys(localStorage).length") != 0:
            raise RuntimeError("isolated context inherited settings")
        tap("#btn-pause"); tap("#key-power")
        for _ in range(4): tap("#btn-step")
        if "[DEMO]" not in page.locator("#screen-top").inner_text():
            raise RuntimeError("existing native power sequence failed")
        tick = page.locator("#tick-count").inner_text()

        geometry = page.locator('section[aria-labelledby="lesson-panel-title"]').evaluate("""el=>{
          const p=el.getBoundingClientRect(),s=getComputedStyle(el);
          return [...el.querySelectorAll('select,button')].map(e=>{const r=e.getBoundingClientRect();
            return {id:e.id,inside:r.left>=p.left+parseFloat(s.paddingLeft)-1&&
              r.right<=p.right-parseFloat(s.paddingRight)+1,width:r.width};});}
        """)
        check("LESSON_CONTROLS_FIT_OWN_PANEL", all(x["inside"] for x in geometry), geometry)

        open_entry("System", "system.rangePresets")
        pad("up")  # current eight-slot wrap: Range 8
        tap("#key-enter"); pad("left")  # 300 -> 200, existing choices
        before = saved()
        inspect("RANGE8", 8, "rangePreset8", "300", "200")
        tap("#key-menu")
        check("RANGE_CANCEL_PRESERVES_PERSISTENCE", saved() == before, saved())
        tap("#key-enter"); pad("left"); tap("#key-enter")
        check("RANGE_COMMIT_EXACT_SLOT", saved().get("rangePreset8") == "200", saved().get("rangePreset8"))

        open_entry("System", "system.units")
        tap("#key-enter"); pad("right")
        before = saved()
        inspect("UNITS", 6, "units", "Metric", "Feet")
        screenshot("units_draft")
        check("UNITS_DRAFT_NOT_APPLIED_TO_LCD", page.locator("#depth-unit").inner_text() == "m", page.locator("#depth-unit").inner_text())
        tap("#key-menu")
        check("UNITS_CANCEL_UNCHANGED", saved() == before, saved().get("units"))
        tap("#key-menu"); tap("#key-menu"); tap("#key-range")
        cleanup = page.evaluate("""()=>({
          title:document.getElementById('dialog-title').textContent,
          transactionHidden:document.getElementById('lcd-config-transaction')?.hidden,
          transactionData:Object.keys(document.getElementById('lcd-config-transaction')?.dataset??{}),
          choicesHidden:document.getElementById('lcd-menu-options').hidden,
          layout:document.getElementById('lcd-overlay').dataset.layout,
          contentRole:document.getElementById('dialog-content').getAttribute('role'),
          contentLabel:document.getElementById('dialog-content').getAttribute('aria-label'),
          controlRows:[...document.querySelectorAll('#dialog-content [role="listitem"]')]
            .map(row=>row.dataset.controlValue)
        })""")
        check("CONFIGURATION_TO_RANGE_CLEARS_EDITOR_DOM", cleanup["title"] == "Range"
              and cleanup["transactionHidden"] and cleanup["transactionData"] == []
              and cleanup["choicesHidden"] and cleanup["layout"] == "control"
              and cleanup["contentRole"] == "list" and cleanup["contentLabel"] == "Range"
              and cleanup["controlRows"] == ["auto","manual"], cleanup)
        open_entry("System", "system.units")
        tap("#key-enter"); pad("right"); tap("#key-enter")
        check("UNITS_COMMIT_UPDATES_LCD_AND_RESETS_BANK", saved().get("units") == "Feet"
              and saved().get("rangePreset8") == "300" and page.locator("#depth-unit").inner_text() == "ft", saved())

        open_entry("System", "system.calibration")
        pad("down", 4); tap("#key-enter"); pad("left")
        before = saved()
        inspect("CALIBRATION", 7, "fishSizeAdjust", "0", "-1")
        screenshot("calibration_draft")
        tap("#key-menu")
        check("CALIBRATION_CANCEL_UNCHANGED", saved() == before, saved().get("fishSizeAdjust"))
        tap("#key-enter"); pad("right"); tap("#key-enter")
        check("CALIBRATION_COMMIT_EXACT_FIELD", saved().get("fishSizeAdjust") == "1", saved().get("fishSizeAdjust"))

        open_entry("Data", "data.nav1")
        pad("down", 2); tap("#key-enter"); pad("right")
        before = saved()
        inspect("NAV_BOX", 4, "nav1Box3", "Off", "DEPTH")
        screenshot("nav_box_draft")
        tap("#key-menu")
        check("NAV_CANCEL_UNCHANGED", saved() == before, saved().get("nav1Box3"))
        tap("#key-enter"); pad("right"); tap("#key-enter")
        check("NAV_COMMIT_WITHOUT_FAKE_SOURCE", saved().get("nav1Box3") == "DEPTH" and
              page.locator("#btn-nav-fixture").get_attribute("aria-pressed") == "false", saved().get("nav1Box3"))

        open_entry("Alarm", "alarm.alarm5")
        inspect("ALARM_PROFILE", 2)
        tap("#key-enter"); pad("down"); tap("#key-enter"); pad("right")
        before = saved()
        inspect("ALARM_THRESHOLDS", 13, "alarm5BottomFrom", "20", "21")
        screenshot("alarm_threshold_draft")
        tap("#key-menu")
        check("ALARM_THRESHOLD_CANCEL_UNCHANGED", saved() == before, saved().get("alarm5BottomFrom"))
        tap("#key-menu")  # return to ALARM5, Setting cursor
        pad("down"); tap("#key-enter"); pad("right")
        inspect("ALARM_ENABLE", 2, "alarm5", "Off", "On")
        tap("#key-enter")
        check("ALARM_ENABLE_NOT_THRESHOLD_MUTATION", saved().get("alarm5") == "On"
              and saved().get("alarm5BottomFrom") == "20", saved().get("alarm5"))
        check("CONFIGURATION_EDITS_PRESERVE_WORLD_TIME", page.locator("#tick-count").inner_text() == tick, page.locator("#tick-count").inner_text())
        tap("#btn-step")  # deliberately produce the existing synthetic ALARM5 cause
        active = alarm_tokens()
        check("ALARM_ACTIVE_CAUSE_VISIBLE", "ACTIVE" in active and "INACTIVE" not in active
              and "UNACKNOWLEDGED" in active and "ACK" not in active, active)
        banner = alarm_banner_pixels()
        check("ALARM_ACTIVE_BANNER_IS_ACTUALLY_PAINTED", all(pixel == [146,29,40,255] for pixel in banner), banner)
        pad("up")  # existing physical key acknowledges without clearing the cause
        acknowledged = alarm_tokens()
        check("ALARM_ACK_DOES_NOT_HIDE_CAUSE", "ACTIVE" in acknowledged and "INACTIVE" not in acknowledged
              and "ACK" in acknowledged and "UNACKNOWLEDGED" not in acknowledged, acknowledged)
        pad("down"); tap("#key-enter"); pad("left")  # stage Off, keep committed On
        pending = alarm_tokens()
        check("ALARM_PENDING_OFF_PRESERVES_EFFECTIVE_CAUSE", saved().get("alarm5") == "On"
              and "ACTIVE" in pending and "INACTIVE" not in pending, pending)
        tap("#key-enter")
        disabled = alarm_tokens()
        check("ALARM_COMMITTED_OFF_IS_NOT_CACHED_ACTIVE", saved().get("alarm5") == "Off"
              and "INACTIVE" in disabled and "ACTIVE" not in disabled and "ACK" not in disabled, disabled)
        cleared = alarm_banner_pixels()
        check("ALARM_OFF_REMOVES_CANVAS_BANNER_WITHOUT_WORLD_TICK",
              all(pixel != [146,29,40,255] for pixel in cleared)
              and int(page.locator("#tick-count").inner_text()) == int(tick)+1, cleared)
        screenshot("alarm_disabled")

        open_entry("System", "system.installation")
        d = inspect("INSTALLATION", 6)
        tap("#key-enter")  # Language stays held, not editable
        check("LANGUAGE_REMAINS_SOURCE_HELD", "RIGHTS_HOLD" in page.locator("#status-line").inner_text()
              and saved().get("language") is None, page.locator("#status-line").inner_text())
        tap("#btn-tankenmaru-fixture"); pad("down", 4)
        tap("#key-enter"); pad("right")
        inspect("OPTIONAL_INSTALLATION", 6, "tankenmaru", "Off", "On")
        tap("#key-enter")
        d = inspect("OPTION_NMEA_HIDDEN", 5)
        check("INSTALLATION_NO_NMEA_WHILE_OPTION_ON", "NMEA :" not in page.locator("#dialog-content").inner_text(), saved().get("tankenmaru"))
        tap("#btn-tankenmaru-fixture")
        d = inspect("OPTION_REVOKED", 6)
        check("OPTION_REVOKE_PRESERVES_SAFE_SETTINGS", saved().get("tankenmaru") == "Off" and saved().get("nmea") == "Off", saved().get("tankenmaru"))

        # Use real held FUNC; canceled assignment must preserve the V29 path.
        tap("#key-menu"); tap("#key-menu")
        page.locator("#key-func").focus(); page.keyboard.down("Space")
        page.wait_for_timeout(1100); page.keyboard.up("Space")
        if "ASSIGN" not in page.locator("#dialog-title").inner_text():
            raise RuntimeError("existing long FUNC assignment failed")
        pad("up")
        inspect("FUNC_ASSIGNMENT", 11)
        screenshot("func_assignment")
        tap("#key-menu")
        check("FUNC_ASSIGNMENT_CANCEL_PRESERVES_V29", saved().get("keySetup") == "Pic. Advance", saved().get("keySetup"))

        tap("#btn-replay")
        check("CONFIGURATION_CANONICAL_REPLAY", "REPLAY PASS" in page.locator("#validation-status").inner_text(), page.locator("#validation-status").inner_text())
        retained = saved()
        tap("#btn-reset"); page.reload(wait_until="networkidle")
        check("RESET_RELOAD_PRESERVES_COMMITTED_ONLY", saved() == retained and
              page.locator("#off-screen").is_visible() and page.locator("#lcd-overlay").is_hidden(), saved())
        viewport = page.evaluate("[innerWidth,innerHeight,document.documentElement.scrollWidth]")
        check("EXACT_VIEWPORT_NO_HORIZONTAL_OVERFLOW", viewport[:2] == [width, height] and viewport[2] <= width, viewport)
        result["browserLoadedSourceIdentity"] = verify_browser_loaded_source(
            bodies, source, URL, response_count=len(responses), body_errors=body_errors)
        check("NO_CONSOLE_OR_NETWORK_ERRORS", not errors and not failed, {"console": errors, "network": failed})
    except Exception as e:
        result["executionError"] = str(e)
        result["traceback"] = traceback.format_exc(limit=8)
    finally:
        context.close()
    result["status"] = "PASS" if not result.get("executionError") and result["checks"] and all(c["passed"] for c in result["checks"]) else "FAIL"
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=("red", "green", "review"), required=True)
    parser.add_argument("--attempt", type=int, choices=(1, 2), default=1)
    args = parser.parse_args()
    suffix = "" if args.attempt == 1 else f"_ATTEMPT{args.attempt}"
    output = ROOT / f"docs/qa/FCV588_CONFIGURATION_V30_{args.stage.upper()}{suffix}_RECEIPT.json"
    if output.exists():
        raise SystemExit("refusing to overwrite receipt: " + str(output))
    paths = (Path(__file__).resolve(), ROOT / "tools/fcv588_chrome_viewport_acceptance.py")
    hashes = lambda: {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
    report = {"collectedAtUtc": datetime.now(timezone.utc).isoformat(), "stage": args.stage,
              "checkpoint": "V30", "attempt": args.attempt,
              "scope": "ORIGINAL_CONFIGURATION_UI_EXISTING_REDUCER_CONTRACT",
              "hardwareValidated": False, "releaseApproval": "HOLD", "harnessSha256": hashes(), "viewports": []}
    try:
        source = verify_served_source(URL)
        report["servedSourceIdentity"] = source
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=str(DEFAULT_CHROME), headless=True)
            report["chromeVersion"] = browser.version
            try:
                for width, height in SIZES:
                    report["viewports"].append(run_context(browser, width, height, args.stage, source, args.attempt))
            finally:
                browser.close()
        report["sourceStable"] = verify_served_source(URL) == source
        report["harnessStable"] = hashes() == report["harnessSha256"]
    except Exception as e:
        report["executionError"] = str(e)
        report["traceback"] = traceback.format_exc(limit=8)
    report["status"] = "PASS" if not report.get("executionError") and report.get("sourceStable") and report.get("harnessStable") and len(report["viewports"]) == 4 and all(v["status"] == "PASS" for v in report["viewports"]) else "FAIL"
    with output.open("x", encoding="utf-8") as stream:
        json.dump(report, stream, ensure_ascii=False, indent=2); stream.write("\n")
    print(json.dumps({"status": report["status"], "error": report.get("executionError"), "receipt": str(output),
                     "viewports": [{"viewport": v["viewport"], "checks": len(v["checks"]), "failed": [c["name"] for c in v["checks"] if not c["passed"]], "executionError": v.get("executionError")} for v in report["viewports"]]}, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
