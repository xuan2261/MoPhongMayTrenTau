#!/usr/bin/env python3
"""V31 native operator journeys and explicitly isolated legacy-storage fixture.

No application-state injection, OEM media, real device interface or user profile.
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
    ROOT, DEFAULT_CHROME, verify_served_source, verify_browser_loaded_source,
)

URL = "http://127.0.0.1:4173/"
STORAGE = "mophongmaytrentau.fcv588.public-reference.settings.v18"
SIZES = ((1366, 768), (1920, 1080), (360, 800), (390, 844))


def run_context(browser, width, height, stage, source, legacy):
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
        for _ in range(count): tap("#pad-" + direction)

    def saved():
        return page.evaluate("key => JSON.parse(localStorage.getItem(key))?.settings ?? {}", STORAGE)

    def raw_storage():
        return page.evaluate("key => localStorage.getItem(key)", STORAGE)

    def close():
        for _ in range(6):
            if page.locator("#lcd-overlay").is_hidden(): return
            tap("#key-menu")
        if page.locator("#lcd-overlay").is_visible():
            raise RuntimeError("MENU/ESC could not return to sounder")

    def boot():
        tap("#key-power")
        for _ in range(4): tap("#btn-step")
        if "[DEMO]" not in page.locator("#screen-top").inner_text():
            raise RuntimeError("native POWER boot failed")

    def open_entry(category, entry_id):
        close(); tap("#key-menu")
        pad("right", ["Sounder", "Display", "Alarm", "Data", "System"].index(category))
        ids = page.locator("#dialog-content .lcd-menu-row").evaluate_all(
            "rows=>rows.map(r=>r.dataset.entryId)")
        if entry_id not in ids: raise RuntimeError("missing operator entry " + entry_id)
        pad("down", ids.index(entry_id)); tap("#key-enter")

    def screen():
        return page.locator("#screen-top").inner_text()

    def banner():
        return page.locator("#echo-canvas").evaluate("""el=>[9,240,470].map(x=>
          Array.from(el.getContext('2d').getImageData(x,81,1,1).data))""")

    def brightness():
        return page.locator("#lcd").evaluate(
            "el=>Number(getComputedStyle(el).filter.match(/brightness\\(([^)]+)/)?.[1])")

    def control(prefix, current, draft, count):
        d = page.evaluate("""()=>{
          const lcd=document.getElementById('lcd');
          const content=document.getElementById('dialog-content');
          const footer=document.getElementById('dialog-footer');
          const summary=document.getElementById('lcd-control-summary');
          const inside=(a,b)=>{if(!a||!b)return false;const r=a.getBoundingClientRect(),p=b.getBoundingClientRect();
            return r.width>0&&r.height>0&&r.top>=p.top-1&&r.bottom<=p.bottom+1&&r.left>=p.left-1&&r.right<=p.right+1;};
          const rows=[...content.querySelectorAll('[data-control-value]')];
          const selected=rows.filter(r=>r.getAttribute('aria-current')==='true');
          return {layout:document.getElementById('lcd-overlay').dataset.layout,
            values:rows.map(r=>r.dataset.controlValue),selected:selected.map(r=>r.dataset.controlValue),
            selectedVisible:selected.length===1&&inside(selected[0],content),
            summary:summary?{...summary.dataset,text:summary.textContent}:null,
            summaryVisible:inside(summary,lcd),help:footer.textContent,helpVisible:inside(footer,lcd),
            configHidden:document.getElementById('lcd-config-transaction').hidden,
            configData:Object.keys(document.getElementById('lcd-config-transaction').dataset)};
        }""")
        check(prefix + "_SEMANTIC_CHOICE_VISIBLE", d["layout"] == "control" and
              len(d["values"]) == count and len(d["selected"]) == 1 and d["selectedVisible"], d)
        tx = d["summary"] or {}
        check(prefix + "_CURRENT_AND_PENDING_VISIBLE", d["summaryVisible"] and
              tx.get("currentValue") == current and tx.get("draftValue") == draft and
              "Hiện tại" in tx.get("text", "") and "Đang chọn" in tx.get("text", ""), tx)
        check(prefix + "_HELP_VISIBLE_WITHOUT_OLD_CONFIG_DATA", d["helpVisible"] and
              "MENU/ESC" in d["help"] and d["configHidden"] and not d["configData"], d)
        return d

    def screenshot(label):
        page.locator("#lcd").scroll_into_view_if_needed()
        path = ROOT / f"docs/qa/screenshots/fcv588_operator_v31_{stage}_{width}x{height}_{label}.png"
        if path.exists(): raise RuntimeError("refusing to overwrite screenshot")
        page.screenshot(path=str(path), full_page=False)
        result["screenshots"].append(path.relative_to(ROOT).as_posix())

    try:
        page.goto(URL, wait_until="networkidle")
        if page.evaluate("Object.keys(localStorage).length") != 0:
            raise RuntimeError("context inherited browser settings")
        tap("#btn-pause"); boot()

        for route in ("SYSTEM", "INSTALLATION"):
            tap("#btn-tankenmaru-fixture")
            open_entry("System", "system.tankenmaru" if route == "SYSTEM" else "system.installation")
            if route == "INSTALLATION": pad("down", 4); tap("#key-enter")
            pad("right")
            check(route + "_ON_IS_ONLY_A_DRAFT", saved().get("tankenmaru", "Off") == "Off"
                  and page.locator("#lcd-menu-options").is_visible(), saved().get("tankenmaru"))
            tap("#btn-tankenmaru-fixture")
            check(route + "_REVOKE_CANCELS_EDITOR", page.locator("#lcd-menu-options").is_hidden()
                  and page.locator("#lcd-config-transaction").is_hidden()
                  and "/ EDIT" not in page.locator("#dialog-title").inner_text(), page.locator("#dialog-title").inner_text())
            tap("#btn-tankenmaru-fixture")
            check(route + "_REGRANT_DOES_NOT_RESURRECT_DRAFT", page.locator("#lcd-menu-options").is_hidden()
                  and saved().get("tankenmaru", "Off") == "Off", page.locator("#dialog-content").inner_text())
            tap("#key-enter")
            check(route + "_ENTER_STARTS_FRESH_OFF", saved().get("tankenmaru", "Off") == "Off"
                  and page.locator('#lcd-menu-options [aria-current="true"]').inner_text().strip() == "Off", saved().get("tankenmaru"))
            pad("right"); tap("#key-menu")
            check(route + "_NEW_DRAFT_CANCEL_RETAINS_OFF", saved().get("tankenmaru", "Off") == "Off", saved().get("tankenmaru"))
            tap("#key-enter"); pad("right"); tap("#key-enter")
            check(route + "_EXPLICIT_NEW_COMMIT_ON", saved().get("tankenmaru") == "On"
                  and saved().get("nmea") == "Off", saved().get("tankenmaru"))
            if route == "INSTALLATION":
                check("INSTALLATION_NMEA_REMOVED_ON_COMMIT", "NMEA :" not in page.locator("#dialog-content").inner_text(),
                      page.locator("#dialog-content").inner_text())
            tap("#key-enter"); pad("right")  # committed On / pending Off
            page.locator("#key-power").focus(); page.keyboard.down("Space")
            page.locator("#key-menu").focus(); page.keyboard.up("Space")
            check(route + "_CANCELLED_POWER_RETAINS_UNCOMMITTED_EDITOR", saved().get("tankenmaru") == "On"
                  and page.locator("#lcd-menu-options").is_visible(), saved().get("tankenmaru"))
            page.locator("#key-power").focus(); page.keyboard.down("Space")
            page.wait_for_timeout(3250); page.keyboard.up("Space")
            check(route + "_POWER_OFF_DROPS_DRAFT_NOT_SETTING", page.locator("#off-screen").is_visible()
                  and page.locator("#lcd-overlay").is_hidden() and saved().get("tankenmaru") == "On", saved().get("tankenmaru"))
            boot()
            check(route + "_POWER_CYCLE_RETAINS_SESSION_OPTION", page.locator("#btn-tankenmaru-fixture").get_attribute("aria-pressed") == "true"
                  and saved().get("tankenmaru") == "On", saved().get("tankenmaru"))
            stored_before_reset = raw_storage()
            tap("#btn-reset"); tap("#key-menu")  # powered-off, non-setting input
            check(route + "_RESET_NOOP_INPUT_PRESERVES_STORED_PREFERENCES", raw_storage() == stored_before_reset,
                  {"beforeSha256": hashlib.sha256(stored_before_reset.encode()).hexdigest(),
                   "afterSha256": hashlib.sha256(raw_storage().encode()).hexdigest()})
            page.reload(wait_until="networkidle")
            check(route + "_RESET_RELOAD_HAS_NO_DRAFT_OR_GRANT", page.locator("#off-screen").is_visible()
                  and page.locator("#lcd-overlay").is_hidden()
                  and page.locator("#btn-tankenmaru-fixture").get_attribute("aria-pressed") == "false", page.locator("#screen-top").text_content())
            tap("#btn-pause"); boot()
            open_entry("System", "system.installation"); pad("down", 4)
            text = page.locator("#dialog-content").inner_text()
            check(route + "_RELOAD_SAVED_ON_NEVER_GRANTS_OPTION", "Tankenmaru System [HOLD] : Off" in text
                  and "NMEA :" in text, text)
            close()
            # A real committed display preference change checkpoints the new
            # session's safe Off value; do not counterfeit it with a disk write.
            open_entry("Sounder", "sounder.pictureAdvance"); pad("right"); tap("#key-enter")
            open_entry("Sounder", "sounder.pictureAdvance"); pad("left"); tap("#key-enter"); close()

        open_entry("System", "system.transducer"); pad("right", 2); tap("#key-enter")
        open_entry("System", "system.draft")
        # open_entry already starts the scalar draft at the existing first value 0.
        pad("right", 5); tap("#key-enter")
        tap("#btn-mount-fixture")
        for entry_id in ("display.accuFish", "display.rezBoost", "display.bottomDiscrimination"):
            open_entry("Display", entry_id); pad("right")
            check(entry_id + "_EDITOR_OPEN_BEFORE_REVOKE", page.locator("#lcd-menu-options").is_visible(), saved().get(entry_id.split(".")[1]))
            before = saved(); tap("#btn-mount-fixture")
            check(entry_id + "_CAPABILITY_LOSS_CANCELS_DRAFT", page.locator("#lcd-menu-options").is_hidden()
                  and "/ EDIT" not in page.locator("#dialog-title").inner_text() and saved() == before,
                  page.locator("#dialog-footer").inner_text())
            tap("#btn-mount-fixture")
            check(entry_id + "_REGRANT_NEEDS_NEW_EDIT", page.locator("#lcd-menu-options").is_hidden() and saved() == before,
                  page.locator("#dialog-title").inner_text())
        open_entry("System", "system.transducer"); pad("right"); tap("#key-enter")
        tap("#btn-mount-fixture")

        open_entry("Alarm", "alarm.alarm5"); pad("down"); tap("#key-enter"); pad("right"); tap("#key-enter")
        check("ALARM_NOTICE_NAMES_ENABLE_FIELD", page.locator("#status-line").inner_text() == "ALARM5 / Alarm = On"
              and saved().get("alarm5BottomFrom") == "20", page.locator("#status-line").inner_text())
        tap("#btn-step"); painted = banner()
        check("ALARM_CANVAS_BANNER_ACTUALLY_PAINTED", all(p == [146, 29, 40, 255] for p in painted), painted)
        tap("#key-enter"); pad("right"); tap("#key-enter"); cleared = banner()
        check("ALARM_OFF_NOTICE_AND_PIXELS_AGREE", page.locator("#status-line").inner_text() == "ALARM5 / Alarm = Off"
              and all(p != [146, 29, 40, 255] for p in cleared), {"notice": page.locator("#status-line").inner_text(), "pixels": cleared})
        close(); tick = page.locator("#tick-count").inner_text()

        tap("#key-range"); pad("right")
        control("RANGE", "auto:3", "manual:3", 2); screenshot("range_pending")
        check("RANGE_DRAFT_NOT_HEADER_COMMIT", "AUTO_R" in screen(), screen())
        tap("#key-menu"); check("RANGE_CANCEL_RETAINS_AUTO", "AUTO_R" in screen(), screen())
        tap("#key-range"); pad("right"); tap("#key-enter")
        check("RANGE_ENTER_COMMITS_MANUAL", "MAN_R" in screen(), screen())

        tap("#gain-knob"); pad("down"); pad("right")
        control("GAIN", "fishing:0", "cruising:1", 3)
        check("GAIN_DRAFT_NOT_HEADER_COMMIT", "G:AF" in screen(), screen())
        tap("#key-menu"); check("GAIN_CANCEL_RETAINS_CURRENT", "G:AF" in screen(), screen())
        tap("#gain-knob"); pad("down"); pad("right"); tap("#key-enter")
        check("GAIN_ENTER_COMMITS_MODE_AND_OFFSET", "G:AC+1" in screen(), screen())

        tap("#key-power"); pad("left"); page.wait_for_timeout(5000)
        pad("left"); page.wait_for_timeout(1500)
        check("BRILL_INTERACTION_RESTARTS_INACTIVITY", page.locator("#lcd-overlay").is_visible()
              and page.locator("#dialog-title").inner_text() == "Brill", page.locator("#dialog-title").inner_text())
        d = control("BRILL", "9", "7", 7); screenshot("brill_pending")
        check("BRILL_HELP_STATES_MENU_COMMIT_NOT_CANCEL", "MENU/ESC lưu" in d["help"] and "hủy" not in d["help"], d["help"])
        check("BRILL_LCD_PREVIEW_LUMINANCE", abs(brightness() - 0.833) < 0.002, brightness())
        tap("#key-menu")
        check("BRILL_MENU_COMMITS_VISIBLE_PREVIEW", page.locator("#lcd-overlay").is_hidden()
              and abs(brightness() - 0.833) < 0.002, brightness())
        tap("#key-power"); pad("right", 2); tap("#key-enter")

        page.locator("#mode-knob").focus(); page.keyboard.press("ArrowRight")
        d = control("MODE", "LF", "DUAL", 7); screenshot("mode_pending")
        check("MODE_HELP_DOES_NOT_ADVERTISE_INERT_ENTER", "ENTER" not in d["help"] and "tự" in d["help"].lower(), d["help"])
        tap("#key-enter"); check("MODE_ENTER_DOES_NOT_COMMIT", page.locator("#mode-state").inner_text() == "LF", screen())
        tap("#key-menu"); check("MODE_CANCEL_RETAINS_LF", page.locator("#mode-state").inner_text() == "LF", screen())
        page.locator("#mode-knob").focus(); page.keyboard.press("ArrowRight"); page.wait_for_timeout(6400)
        seam = page.locator("#echo-canvas").evaluate("el=>Array.from(el.getContext('2d').getImageData(239,250,1,1).data)")
        check("MODE_TIMEOUT_UPDATES_DUAL_AND_CANVAS_SEAM", page.locator("#mode-state").inner_text() == "DUAL"
              and seam == [245, 249, 251, 255], {"mode": screen(), "seam": seam})
        check("CONTROL_JOURNEYS_KEEP_WORLD_PAUSED", page.locator("#tick-count").inner_text() == tick, page.locator("#tick-count").inner_text())
        tap("#btn-replay")
        check("NEW_OPERATOR_JOURNEY_REPLAYS", "REPLAY PASS" in page.locator("#validation-status").inner_text(), page.locator("#validation-status").inner_text())

        # Explicit test-fixture preparation, NOT a physical operator action or
        # direct state injection: reload vetted old committed storage only.
        result["migrationSetup"] = "EXPLICIT_ISOLATED_PROFILE19_STORAGE_FIXTURE"
        page.evaluate("([key,raw])=>localStorage.setItem(key,raw)", [STORAGE, legacy])
        page.reload(wait_until="networkidle"); tap("#btn-pause")
        check("LEGACY_RELOAD_PRESERVES_EXACT_ORIGINAL_BYTES", raw_storage() == legacy, hashlib.sha256(raw_storage().encode()).hexdigest())
        check("LEGACY_RESTORE_IS_LOGGED_POWER_OFF_NO_OPTION_GRANT", int(page.locator("#event-count").inner_text()) == 1
              and page.locator("#off-screen").is_visible() and page.locator("#lcd-overlay").is_hidden()
              and page.locator("#btn-tankenmaru-fixture").get_attribute("aria-pressed") == "false"
              and "profile19" in page.locator("#validation-status").inner_text(), page.locator("#validation-status").inner_text())
        boot(); tap("#key-func"); pad("down"); tap("#key-enter")
        payload = json.loads(raw_storage())
        check("FIRST_COMMITTED_SETTING_WRITES_PROFILE20_NOT_LEGACY_REPLAY", payload["profileRevision"] == "F1-public-reference-20"
              and payload["schemaVersion"] == 18 and payload["settings"]["whiteLine"] == "Off"
              and payload["settings"]["clutter"] == "67" and payload["settings"]["tankenmaru"] == "Off", payload)
        tap("#btn-replay")
        check("MIGRATED_SETTINGS_NEW_SESSION_REPLAYS", "REPLAY PASS" in page.locator("#validation-status").inner_text(), page.locator("#validation-status").inner_text())
        viewport = page.evaluate("[innerWidth,innerHeight,document.documentElement.scrollWidth]")
        check("EXACT_VIEWPORT_NO_HORIZONTAL_OVERFLOW", viewport[:2] == [width,height] and viewport[2] <= width, viewport)
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
    parser=argparse.ArgumentParser()
    parser.add_argument("--stage",choices=("red","green","review"),required=True)
    args=parser.parse_args()
    output=ROOT/f"docs/qa/FCV588_OPERATOR_V31_{args.stage.upper()}_RECEIPT.json"
    if output.exists(): raise SystemExit("refusing to overwrite receipt")
    fixture=ROOT/"test/fixtures/fcv588-v30-profile19-settings.json"
    if hashlib.sha256(fixture.read_bytes()).hexdigest() != "f14235c481a35c5e2af2118729dcfd51c3eb2039bdec739047ba9e5b7e00f111":
        raise SystemExit("legacy fixture provenance mismatch")
    paths=(Path(__file__).resolve(),ROOT/"tools/fcv588_chrome_viewport_acceptance.py",fixture)
    hashes=lambda:{p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
    report={"collectedAtUtc":datetime.now(timezone.utc).isoformat(),"checkpoint":"V31","stage":args.stage,
            "scope":"NATIVE_TRANSACTIONS_BASIC_LCD_AND_EXPLICIT_LEGACY_STORAGE","hardwareValidated":False,
            "releaseApproval":"HOLD","harnessSha256":hashes(),"viewports":[]}
    try:
        source=verify_served_source(URL);report["servedSourceIdentity"]=source
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=str(DEFAULT_CHROME),headless=True)
            report["chromeVersion"]=browser.version
            try:
                for w,h in SIZES:report["viewports"].append(run_context(browser,w,h,args.stage,source,fixture.read_text(encoding="utf-8")))
            finally:browser.close()
        report["sourceStable"]=verify_served_source(URL)==source
        report["harnessStable"]=hashes()==report["harnessSha256"]
    except Exception as e:
        report["executionError"]=str(e);report["traceback"]=traceback.format_exc(limit=8)
    report["status"]="PASS" if not report.get("executionError") and report.get("sourceStable") and report.get("harnessStable") and len(report["viewports"])==4 and all(v["status"]=="PASS" for v in report["viewports"]) else "FAIL"
    with output.open("x",encoding="utf-8") as f:json.dump(report,f,ensure_ascii=False,indent=2);f.write("\n")
    print(json.dumps({"status":report["status"],"error":report.get("executionError"),"receipt":str(output),
      "viewports":[{"viewport":v["viewport"],"checks":len(v["checks"]),"failed":[c["name"] for c in v["checks"] if not c["passed"]],"executionError":v.get("executionError")} for v in report["viewports"]]},indent=2))
    return 0 if report["status"]=="PASS" else 1


if __name__=="__main__":raise SystemExit(main())
