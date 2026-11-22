#!/usr/bin/env python3
"""Source-bound V34 POST-INTEGRATION canonical browser acceptance.

Uses one owned loopback server on 4195 and one headless Chrome with separate
contexts; preserves prior evidence, checks actual browser response bytes,
and never contacts hardware or any remote system.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
import socket
import urllib.request
from urllib.parse import urlsplit
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = "http://127.0.0.1:4195"
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
VIEWPORTS = ((1366, 768), (1920, 1080), (360, 800), (390, 844), (320, 720))
OUTDIR = ROOT / "docs" / "qa" / "screenshots"
RECEIPT = ROOT / "docs" / "qa" / "FCV588_V34_CANONICAL_CHROME_20261018.json"
DENY = re.compile(
    r"SIMULATED|SYNTHETIC|TRAINING ONLY|INSTRUCTOR|FIXTURE|SOURCE_GAP|"
    r"\[HOLD\]|\[N/A\]|Hiện tại|Đang chọn|đồng hồ mô phỏng|"
    r"hủy|giá trị lớp học|mô phỏng", re.IGNORECASE
)

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def source_hashes():
    extensions={".mjs", ".js", ".css", ".html", ".svg"}
    return {
        p.relative_to(ROOT).as_posix(): sha(p)
        for d in ("web", "src")
        for p in sorted((ROOT / d).rglob("*"))
        if p.is_file() and p.suffix in extensions
    }

def expected_integrated_source():
    baseline=json.loads((ROOT/"docs/qa/FCV588_V31_EVIDENCE_SUMMARY.json")
        .read_text(encoding="utf-8"))
    stage=ROOT/"staging/fcv588-v34-a11y-source-holds"
    manifest=json.loads((stage/"evidence/STAGING_V34_PATCH_MANIFEST_A11Y_HOLD.json")
        .read_text(encoding="utf-8"))
    expected={x["path"]:x["sha256"] for x in baseline["liveSource"]["fileDigests"]}
    if len(expected)!=35 or len(manifest["files"])!=8:
        raise AssertionError("Unexpected original and staged source counts")
    for item in manifest["files"]:
        if sha(stage/item["path"])!=item["stagedSha256"]:
            raise AssertionError("Frozen V34 staged source drift: "+item["path"])
        if not item["isNew"] and expected.get(item["path"])!=item["originalSha256"]:
            raise AssertionError("Original source identity changed: "+item["path"])
        expected[item["path"]]=item["stagedSha256"]
    if len(expected)!=36 or source_hashes()!=expected:
        raise AssertionError("Current canonical V34 source hashes do not match patch")
    return expected

def qa_port_busy():
    with socket.socket() as sock:
        sock.settimeout(.2)
        return sock.connect_ex(("127.0.0.1",4195))==0

def run_viewport(browser, width, height, expected):
    context = browser.new_context(
        viewport={"width": width, "height": height},
        device_scale_factor=1, has_touch=True,
        is_mobile=width <= 700, locale="vi-VN"
    )
    context.add_init_script("""
      (()=>{
        const paint=CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText=function(text,...rest){
          (window.__stagingPaintText ||= []).push(String(text));
          return paint.call(this,text,...rest);
        };
      })();
    """)
    page = context.new_page()
    errors, requests, completed, source_errors = [], [], [], []
    page.on("pageerror", lambda err: errors.append(str(err)))
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    page.on("requestfailed", lambda req: errors.append("request: " + req.url))
    page.on("request", lambda req: requests.append(req.url))
    def on_finished(request):
        try:
            response=request.response()
            if response is None or response.status!=200:
                raise AssertionError("missing or unsuccessful browser response")
            parsed=urlsplit(request.url)
            path=("web/index.html" if parsed.path=="/"
                  else parsed.path.lstrip("/"))
            actual=hashlib.sha256(response.body()).hexdigest()
            if parsed.hostname!="127.0.0.1" or parsed.port!=4195 or (
                expected.get(path)!=actual
            ):
                raise AssertionError("runtime browser-loaded byte mismatch: "+path)
            completed.append({"path":path,"sha256":actual})
        except Exception as exc:
            source_errors.append(f"{request.url}: {exc}")
    page.on("requestfinished",on_finished)
    checks = []

    def check(name, condition, evidence=""):
        checks.append({"name": name, "passed": bool(condition), "evidence": evidence})
        if not condition:
            raise AssertionError(f"{width}x{height} {name}: {evidence}")

    def tap(selector):
        element = page.locator(selector)
        if width < 700:
            element.tap()
        else:
            element.click()

    def pad(direction, count=1):
        for _ in range(count):
            tap("#pad-" + direction)

    def exit_dialog():
        for _ in range(7):
            if page.locator("#lcd-overlay").is_hidden():
                return
            tap("#key-menu")
        raise AssertionError("MENU/ESC could not close dialog")

    def image(label):
        p = OUTDIR / f"fcv588-v34-canonical-20261018-{width}x{height}-{label}.png"
        if p.exists():
            raise RuntimeError("Refusing to overwrite screenshot " + str(p))
        page.screenshot(path=str(p), full_page=False)
        return {"path":p.relative_to(ROOT).as_posix(),"sha256":sha(p)}

    def element_image(label,selector):
        p=OUTDIR / f"fcv588-v34-canonical-20261018-{width}x{height}-{label}.png"
        if p.exists():
            raise RuntimeError("Refusing to overwrite screenshot " + str(p))
        page.locator(selector).screenshot(path=str(p))
        return {"path":p.relative_to(ROOT).as_posix(),"sha256":sha(p)}

    def visible_lcd():
        return page.locator("#lcd").inner_text()

    try:
        page.goto(BASE, wait_until="networkidle", timeout=20000)
        check("INITIAL_STORAGE_EMPTY",
              page.evaluate("Object.keys(localStorage).length") == 0)
        check("PUBLIC_WARNING_OUTSIDE_EQUIPMENT",
              page.locator(".public-reference-banner").is_visible())
        check("INSTRUCTOR_GUIDANCE_IS_OUTSIDE_FACE",
              page.locator("#operator-guidance").evaluate(
                  "el=>!el.closest('.device-frame') && !el.closest('.equipment')"))
        cue=page.locator("#source-cue")
        check("V34_A11Y_HOLD_HIDDEN_WHEN_POWER_OFF", cue.is_hidden())
        check("V34_LCD_NOT_PERMANENT_LIVE_REGION",
              page.locator("#lcd").get_attribute("aria-live") is None
              and page.locator("#lcd").get_attribute("role")=="group"
              and page.locator("#operator-guidance").get_attribute("aria-live")=="polite")
        spoken=page.locator("#operator-selection-status")
        check("V34_OPERATOR_SELECTION_IS_EXTERNAL_SCOPED_STATUS",
              spoken.get_attribute("role")=="status"
              and spoken.get_attribute("aria-live")=="polite"
              and spoken.get_attribute("aria-atomic")=="true"
              and spoken.evaluate("el=>!el.closest('.device-frame') && !el.closest('.equipment')"))
        check("V34_A11Y_HOLD_EXISTS_ONLY_OUTSIDE_DEVICE",
              cue.evaluate("""el=>{
                const face=document.querySelector('.device-frame');
                return !el.closest('.device-frame') && !el.closest('.equipment')
                  && Boolean(face.compareDocumentPosition(el)
                    & Node.DOCUMENT_POSITION_PRECEDING);
              }"""))
        if width <= 700:
            check("MOBILE_LAYOUT_DISCLAIMER_BEFORE_DEVICE",
                  page.locator(".workbench > .mobile-training-note").is_visible()
                  and page.locator(".workbench > .mobile-training-note").evaluate(
                      "el=>el.getBoundingClientRect().top < document.querySelector('.device-frame').getBoundingClientRect().top"))
        tap("#btn-pause")
        tap("#key-power")
        for _ in range(4):
            tap("#btn-step")
        check("V34_CURRENT_MODE_EXTERNAL_AFTER_BOOT",
              cue.is_visible() and "MODE hiện tại:" in page.locator(
                  "#source-cue-title").inner_text()
              and "Không kết nối đầu dò" in page.locator(
                  "#source-cue-detail").inner_text())
        demo = page.locator("#demo-indicator")
        screen = page.locator("#screen-top")
        check("DEMO_ON_SCREEN_BOTTOM_RIGHT", demo.is_visible()
              and demo.inner_text().strip() == "[DEMO]"
              and "[DEMO]" not in screen.inner_text())
        pos=page.evaluate("""()=>{
          const lcd=document.getElementById('lcd').getBoundingClientRect();
          const d=document.getElementById('demo-indicator').getBoundingClientRect();
          return {left:d.left-lcd.left,right:lcd.right-d.right,
            bottom:lcd.bottom-d.bottom,top:d.top-lcd.top};}""")
        check("DEMO_POSITION_INSIDE_BOTTOM_RIGHT",
              0 <= pos["right"] < 40 and 0 <= pos["bottom"] < 30, pos)

        tap("#key-range")
        pad("right")
        check("RANGE_OPERATOR_ROWS",
              page.locator("#lcd-overlay").get_attribute("data-layout")=="control"
              and page.locator('[data-control-value="manual"][aria-current="true"]').count()==1)
        check("RANGE_TEACHER_DETAILS_EXTERNAL",
              page.locator("#operator-guidance").is_visible()
              and "Đang chọn" in page.locator("#operator-guidance-current").inner_text()
              and page.locator("#lcd-control-summary").is_hidden())
        check("RANGE_HELP_NOT_ON_LCD", not DENY.search(visible_lcd()), visible_lcd()[:400])
        check("V34_RANGE_SELECTION_IS_SCREENREADER_PERCEIVABLE",
              "Manual" in spoken.text_content()
              and "Range" in spoken.text_content())
        # A teacher-driven world tick must not retrigger announcement for the
        # same selected row. Selection is semantic, not clock-based.
        page.evaluate("""()=>{
          window.__v34SelectionChanges=0;
          new MutationObserver(()=>window.__v34SelectionChanges++)
            .observe(document.getElementById('operator-selection-status'),
              {childList:true,characterData:true,subtree:true});
        }""")
        text_before_tick=spoken.text_content()
        tap("#btn-step")
        page.wait_for_timeout(25)
        check("V34_SAME_MENU_SELECTION_NO_TICK_ANNOUNCEMENT",
              spoken.text_content()==text_before_tick
              and page.evaluate("window.__v34SelectionChanges")==0)
        if width <= 700:
            quick=page.locator("#operator-quick-guide")
            bottom=page.locator("#operator-quick-guide-bottom")
            positions=page.evaluate("""()=>{
              const face=document.querySelector('.device-frame').getBoundingClientRect();
              const a=document.getElementById('operator-quick-guide').getBoundingClientRect();
              const b=document.getElementById('operator-quick-guide-bottom').getBoundingClientRect();
              return {upperEndsBeforeFace:a.bottom<=face.top+2,
                lowerStartsAfterFace:b.top>=face.bottom-2};
            }""")
            check("MOBILE_GUIDES_OUTSIDE_FACE_AND_NO_OVERLAP",
                  quick.is_visible() and bottom.is_visible()
                  and "Đang chọn" in quick.inner_text()
                  and "Đang chọn" in bottom.inner_text()
                  and positions["upperEndsBeforeFace"]
                  and positions["lowerStartsAfterFace"],positions)
        shots=[image("range")]
        shots.append(element_image("range-complete-device",".device-frame"))
        shots.append(element_image("range-instructor","#operator-guidance"))
        exit_dialog()
        # With focus on a teacher button, the device must not intercept r,
        # Escape or arrow scrolling. The same keyboard shortcuts remain
        # available when focus is on the hardware keys.
        page.locator("#btn-step").focus()
        before_keys=page.locator("#event-count").inner_text()
        for key in ("r","Escape","ArrowDown"):
            page.keyboard.press(key)
        check("V34_TEACHER_FOCUSED_KEYS_NEVER_DISPATCH_FCV",
              page.locator("#event-count").inner_text()==before_keys
              and page.locator("#lcd-overlay").is_hidden())
        page.locator("#key-range").focus()
        page.keyboard.press("r")
        check("V34_HARDWARE_FOCUSED_SHORTCUT_STILL_WORKS",
              page.locator("#lcd-overlay").is_visible()
              and page.locator("#lcd-overlay").get_attribute("data-layout")=="control")
        exit_dialog()

        tap("#key-power")
        check("BRILL_CHOICES_AND_GUIDE_EXTERNAL",
              page.locator("#lcd-overlay").get_attribute("data-layout")=="control"
              and "BRILL" in page.locator("#operator-guidance-title").inner_text().upper()
              and not DENY.search(visible_lcd()))
        if width <= 700:
            check("MOBILE_BRILL_TIME_GUIDE_OUTSIDE_FACE",
                  page.locator("#operator-quick-guide").is_visible()
                  and page.locator("#operator-quick-guide-bottom").is_visible()
                  and "Còn " in page.locator("#operator-quick-status").inner_text()
                  and "Còn " in page.locator("#operator-quick-status-bottom").inner_text())
        shots.append(image("brill"))
        exit_dialog()

        tap("#mode-plus")
        check("MODE_CHOICES_AND_GUIDE_EXTERNAL",
              page.locator("#lcd-overlay").get_attribute("data-layout")=="control"
              and "MODE" in page.locator("#operator-guidance-title").inner_text().upper()
              and not DENY.search(visible_lcd()))
        shots.append(image("mode"))
        exit_dialog()
        check("V34_MODE_CUE_PERSISTS_AFTER_EDITOR_CANCEL",
              cue.is_visible() and "MODE hiện tại:" in page.locator(
                  "#source-cue-title").inner_text())
        if width <= 700:
            check("V34_PHONE_MODE_CUE_OUTSIDE_HARDWARE",
                  cue.evaluate("""el=>{
                     const face=document.querySelector('.device-frame')
                       .getBoundingClientRect();
                     const a=el.getBoundingClientRect();
                     return !el.closest('.equipment') && a.bottom<=face.top+2;
                  }"""))
        cue.scroll_into_view_if_needed()
        shots.append(image("current-mode-external"))

        tap("#key-menu")
        pad("right",4)
        pad("down",3)
        selected=page.locator("#dialog-content .lcd-menu-row[aria-current='true']")
        check("D04_LANGUAGE_DISABLED_NO_HOLD_LABEL",
              selected.count()==1
              and "Language" in selected.inner_text()
              and selected.get_attribute("aria-disabled")=="true"
              and "[HOLD]" not in visible_lcd())
        check("D04_REASON_OUTSIDE_LCD",
              "D04: Chưa có quyền" in page.locator(
                  "#operator-guidance-source").inner_text())
        check("D04_REASON_NOT_RAW_INTERNAL_CODE",
              "RIGHTS_HOLD_" not in page.locator(
                  "#operator-guidance-source").inner_text())
        check("D04_DISABLED_SELECTION_VISUALLY_MUTED",
              selected.evaluate(
                  "el=>getComputedStyle(el).backgroundColor")=="rgb(209, 216, 220)")
        check("V34_D04_RIGHTS_HOLD_NEAR_DEVICE_EXTERNAL_CUE",
              cue.is_visible()
              and cue.get_attribute("data-source-state")=="SOURCE_HOLD_DISABLED_MENU_OPTION"
              and "Language" in page.locator("#source-cue-title").inner_text()
              and "D04: Chưa có quyền" in page.locator(
                  "#source-cue-detail").inner_text()
              and "RIGHTS_HOLD" not in page.locator(
                  "#source-cue-detail").inner_text())
        check("V34_D04_DISABLED_SELECTION_SPOKEN",
              "Language" in spoken.text_content()
              and "Mục không khả dụng" in spoken.text_content())
        previous_spoken=spoken.text_content()
        pad("down")
        check("V34_MENU_SELECTION_MOVEMENT_ANNOUNCED",
              "Units" in spoken.text_content()
              and spoken.text_content()!=previous_spoken)
        pad("up")
        check("V34_MENU_SELECTION_RETURN_ANNOUNCED",
              "Language" in spoken.text_content()
              and "Mục không khả dụng" in spoken.text_content())
        shots.append(image("language"))
        cue.scroll_into_view_if_needed()
        shots.append(image("language-source-near-face"))
        exit_dialog()

        tap("#key-menu")
        pad("right",4)
        rows=page.locator("#dialog-content .lcd-menu-row")
        ids=rows.evaluate_all("rs=>rs.map(x=>x.dataset.entryId)")
        index=ids.index("system.receiverStatus")
        check("D14_MENU_ENTRY_EXISTS",index>=0,ids)
        pad("down",index)
        selected=page.locator("#dialog-content .lcd-menu-row[aria-current='true']")
        check("D14_UNVERIFIED_MENU_PATH_DISCLOSED_EXTERNAL",
              selected.get_attribute("data-training-path")=="unverified"
              and "SOURCE_GAP" in page.locator(
                  "#operator-guidance-source").inner_text())
        check("V34_D14_MENU_SOURCE_PROVENANCE_IS_EXTERNAL",
              cue.is_visible()
              and cue.get_attribute("data-source-state")==
                  "SYNTHETIC_TRAINING_MENU_PATH_UNVERIFIED"
              and "menu chưa được xác minh" in page.locator(
                  "#source-cue-title").inner_text()
              and selected.evaluate("el=>getComputedStyle(el).borderLeftStyle")!="dashed")
        tap("#key-enter")
        check("D14_LIVE_NMEA_STAYS_DISCONNECTED",
              "NMEA: OFF" in page.locator("#dialog-content").inner_text()
              and "NO DATA" in page.locator("#dialog-content").inner_text()
              and "Transport: NONE" in page.locator("#operator-guidance-source").inner_text()
              and not DENY.search(visible_lcd()))
        check("V34_D14_NO_RECEIVER_EXPLAINED_OUTSIDE_LCD",
              cue.is_visible()
              and cue.get_attribute("data-source-state")=="NO_TRAINING_DATA"
              and "Không có mẫu" in page.locator(
                  "#source-cue-detail").inner_text())
        shots.append(image("receiver"))
        tap("#btn-nav-fixture")
        tap("#btn-step")
        fresh_lcd=page.locator("#dialog-content").inner_text()
        check("D14_FRESH_OWN_SAMPLE_SHOWN_WITH_SOURCE_CAUTION",
              "NMEA: OFF" in fresh_lcd
              and "OWN POSITION: NO DATA" not in fresh_lcd
              and "OWN SPEED: NO DATA" not in fresh_lcd
              and "Dữ liệu giả lập còn hiệu lực" in page.locator(
                  "#operator-guidance-current").inner_text()
              and not DENY.search(fresh_lcd),fresh_lcd)
        check("V34_D14_FRESH_TYPED_OWN_NOT_REAL_NMEA",
              cue.get_attribute("data-source-state")==
                  "SYNTHETIC_TRAINING_OBSERVATION"
              and "không phải GPS" in page.locator(
                  "#source-cue-detail").inner_text())
        shots.append(image("receiver-fresh"))
        tap("#btn-nav-fixture")
        check("D14_NO_FIXTURE_FAILS_CLOSED",
              "OWN POSITION: NO DATA" in page.locator("#dialog-content").inner_text()
              and "Chưa có dữ liệu giả lập" in page.locator(
                  "#operator-guidance-current").inner_text())
        check("V34_D14_FIXTURE_REVOKED_SHOWN_EXTERNALLY",
              cue.get_attribute("data-source-state")=="NO_TRAINING_DATA")
        exit_dialog()

        tap("#key-menu")
        pad("right",3)
        ids=page.locator("#dialog-content .lcd-menu-row").evaluate_all(
            "rs=>rs.map(x=>x.dataset.entryId)")
        index=ids.index("data.trip")
        check("C11_TRIP_MENU_ENTRY_EXISTS",index>=0,ids)
        pad("down",index)
        check("C11_UNVERIFIED_TRIP_PATH_MARKED",
              page.locator("#dialog-content .lcd-menu-row[aria-current='true']")
                  .get_attribute("data-training-path")=="unverified"
              and "SOURCE_GAP" in page.locator(
                  "#operator-guidance-source").inner_text())
        check("V34_C11_TRIP_PATH_WARNING_NOT_LCDBORDER",
              cue.get_attribute("data-source-state")==
                  "SYNTHETIC_TRAINING_MENU_PATH_UNVERIFIED"
              and "Trip" in page.locator("#source-cue-detail").inner_text()
              and page.locator("#dialog-content .lcd-menu-row[aria-current='true']")
                  .evaluate("el=>getComputedStyle(el).borderLeftStyle")!="dashed")
        tap("#key-enter")
        check("C11_TRIP_VALUES_AND_TRAINER_PROVENANCE",
              "TRIP" in page.locator("#dialog-content").inner_text()
              and "C11/C13" in page.locator("#operator-guidance-title").inner_text()
              and not DENY.search(visible_lcd()))
        shots.append(image("trip"))
        exit_dialog()

        # D11 color LCD Test: training safety notice stays outside the pixels.
        tap("#key-menu")
        pad("right",4)
        ids=page.locator("#dialog-content .lcd-menu-row").evaluate_all(
            "rs=>rs.map(x=>x.dataset.entryId)")
        idx=ids.index("system.lcdTest")
        check("LCD_TEST_ENTRY_EXISTS",idx>=0,ids)
        pad("down",idx)
        tap("#key-enter")
        black=page.locator("#echo-canvas").evaluate(
            "el=>Array.from(el.getContext('2d').getImageData(240,320,1,1).data)")
        check("LCD_TEST_BLACK_PIXELS_UNOBSTRUCTED",
              demo.is_hidden() and page.locator("#lcd-overlay").is_hidden()
              and black==[0,0,0,255]
              and page.locator("#lcd-test-status").is_visible(),black)
        check("V34_D11_A11Y_HOLD_NOT_PAINTED_ON_LCD",
              cue.is_visible()
              and cue.get_attribute("data-source-state")=="SYNTHETIC_LCD_TEST"
              and cue.evaluate("el=>!el.closest('.lcd') && !el.closest('.equipment')"))
        pad("right")
        white=page.locator("#echo-canvas").evaluate(
            "el=>Array.from(el.getContext('2d').getImageData(240,320,1,1).data)")
        check("LCD_TEST_WHITE_PIXELS_UNOBSTRUCTED",
              demo.is_hidden() and white==[255,255,255,255],white)
        tap("#key-menu")
        check("LCD_TEST_RETURN_RESTORES_DEMO_INDICATOR",
              demo.is_visible() and page.locator("#lcd-test-status").is_hidden())
        shots.append(image("lcd-test-return"))
        # MENU from LCD Test returns to System menu, not directly to sonar.
        # Close that existing menu before opening the next instructor journey.
        check("LCD_TEST_BACK_RETURNS_TO_SYSTEM_MENU",
              page.locator("#lcd-overlay").is_visible()
              and page.locator("#dialog-title").inner_text().strip()=="System")
        exit_dialog()

        # Stage-only D09 source/option display and explicit instructor branch.
        tap("#btn-tankenmaru-fixture")
        tap("#key-menu")
        pad("right",4)
        ids=page.locator("#dialog-content .lcd-menu-row").evaluate_all(
            "rs=>rs.map(x=>x.dataset.entryId)")
        index=ids.index("system.tankenmaru")
        check("D09_DECLARED_VIRTUAL_OPTION_MENU",index>=0,ids)
        pad("down",index)
        tap("#key-enter")
        pad("right")
        tap("#key-enter")
        exit_dialog()
        tap("#key-menu")
        pad("right",4)
        ids=page.locator("#dialog-content .lcd-menu-row").evaluate_all(
            "rs=>rs.map(x=>x.dataset.entryId)")
        check("D09_TANKENMARU_DISALLOWS_NMEA",
              "system.nmea" not in ids and
              "system.receiverStatus" not in ids and
              "system.tankenmaruDetails" in ids,ids)
        pad("down",ids.index("system.tankenmaruDetails"))
        tap("#key-enter")
        details=page.locator("#dialog-content").inner_text()
        check("D09_MANUAL_DEFAULTS_NO_RF_ON_LCD",
              all(x in details for x in
                  ("Output: Off","Pic. Sync: Yes","Sub Clutter: 4"))
              and "NO PHYSICAL" not in details
              and "KHÔNG phát RF" in page.locator(
                  "#operator-guidance-source").inner_text()
              and not DENY.search(visible_lcd()),details)
        check("V34_D09_NO_RF_AND_VIRTUAL_OPTION_OUTSIDE_LCD",
              cue.is_visible()
              and cue.get_attribute("data-source-state")=="VIRTUAL_OPTION_REFERENCE"
              and "phát RF" in page.locator("#source-cue-detail").inner_text())
        shots.append(image("tankenmaru"))
        tap("#btn-tankenmaru-fixture")
        check("D09_OPTION_REVOKE_CLEARS_DETAILS",
              "Output: Off" not in page.locator("#dialog-content").inner_text()
              or page.locator("#lcd-overlay").is_hidden(),
              page.locator("#dialog-content").inner_text()[:300])
        check("V34_D09_REVOKE_CUE_FAILS_CLOSED",
              cue.get_attribute("data-source-state")!="VIRTUAL_OPTION_REFERENCE")
        exit_dialog()

        # D04-style Header Info Off can hide the LCD's text header. Commit a
        # NAV mode using the actual timed MODE knob and ensure the external
        # instructor cue still identifies which mode is running on phones.
        tap("#key-menu")
        pad("right")
        ids=page.locator("#dialog-content .lcd-menu-row").evaluate_all(
            "rs=>rs.map(x=>x.dataset.entryId)")
        idx=ids.index("display.headerInfo")
        check("V34_HEADER_INFO_MENU_AVAILABLE",idx>=0,ids)
        pad("down",idx)
        tap("#key-enter")
        pad("right")
        tap("#key-enter")
        exit_dialog()
        check("V34_HEADER_OFF_HIDES_LCD_HEADER",screen.inner_text().strip()=="")
        for _ in range(4):
            tap("#mode-plus")
        check("V34_NAV2_PENDING_MODE_CAN_BE_SELECTED",
              page.locator("#mode-knob").get_attribute("data-selection")=="NAV2"
              and page.locator("#lcd-overlay").is_visible())
        # Canonical model commits MODE after 6000ms of UI-tick; the synthetic
        # world is paused but operator modal time still advances.
        page.wait_for_timeout(6300)
        check("V34_NAV2_TIMED_COMMIT_PERSISTS_WHEN_HEADER_OFF",
              page.locator("#mode-knob").get_attribute("data-selection")=="NAV2"
              and page.locator("#lcd-overlay").is_hidden()
              and screen.inner_text().strip()=="")
        check("V34_NAV_MODE_CUE_WHEN_HEADER_OFF",
              cue.is_visible()
              and "MODE NAV2" in page.locator("#source-cue-title").inner_text())
        if width<=700:
            check("V34_PHONE_NAV_CUE_ABOVE_EQUIPMENT",
                  cue.evaluate("""el=>{
                    const a=el.getBoundingClientRect();
                    const b=document.querySelector('.device-frame').getBoundingClientRect();
                    return a.bottom<=b.top+2 && !el.closest('.equipment');
                  }"""))
        cue.scroll_into_view_if_needed()
        shots.append(image("nav2-header-off-cue"))
        shots.append(element_image("nav2-header-off-device",".device-frame"))

        touch=page.evaluate("""()=>{
          const w=window.innerWidth,h=window.innerHeight;
          const d=document.documentElement;
          return {width:w,height:h,scrollWidth:d.scrollWidth,
            demoVisible:!document.getElementById('demo-indicator').hidden};}""")
        check("NO_HORIZONTAL_OVERFLOW",touch["scrollWidth"] <= touch["width"]+1,touch)
        check("NO_EXTERNAL_REQUESTS", all(
            urlsplit(url).hostname in ("127.0.0.1",)
            and urlsplit(url).port==4195 for url in requests),requests)
        canvas=page.evaluate("window.__stagingPaintText || []")
        leaked=[text for text in canvas if DENY.search(text)]
        check("NO_TRAINING_CANVAS_PAINT",len(leaked)==0,leaked[:12])
        check("NO_JS_NETWORK_ERRORS",not errors,errors)
        loaded={item["path"] for item in completed}
        check("V34_BROWSER_LOADED_RESPONSE_BYTES_MATCH_CANONICAL",
              not source_errors and len(completed)==len(requests)
              and {"web/index.html","web/app.mjs","src/core/session.mjs",
                   "src/devices/fcv588/profile-version.mjs"}.issubset(loaded),
              {"verified":len(completed),"requested":len(requests),
               "errors":source_errors,"paths":sorted(loaded)})

        return {"viewport":f"{width}x{height}","checks":checks,
                "screenshots":shots, "capturedCanvasCalls":len(canvas),
                "requestedPaths":sorted(set(urlsplit(x).path for x in requests)),
                "verifiedBrowserResponses":len(completed),
                "browserSourceBodyErrors":source_errors,
                "status":"PASS"}
    finally:
        context.close()

def main():
    OUTDIR.mkdir(parents=True, exist_ok=True)
    if RECEIPT.exists():
        raise RuntimeError("Refusing to overwrite canonical V34 acceptance receipt")
    if any(OUTDIR.glob("fcv588-v34-canonical-20261018-*.png")):
        raise RuntimeError("Refusing to overwrite canonical V34 screenshot evidence")
    if qa_port_busy():
        raise RuntimeError("Loopback port 4195 occupied; foreign server not authorized")
    before=expected_integrated_source()
    harness_before=sha(Path(__file__))
    env=os.environ.copy()
    env["PORT"]="4195"
    flags=getattr(subprocess,"CREATE_NO_WINDOW",0)
    server=subprocess.Popen(
        ["node",str(ROOT/"tools"/"server.mjs")],
        cwd=str(ROOT), env=env,stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,
        creationflags=flags
    )
    try:
        for _ in range(50):
            if server.poll() is not None:
                raise RuntimeError("Canonical localhost QA server exited")
            try:
                with urllib.request.urlopen(BASE,timeout=0.5) as resp:
                    if resp.status==200:break
            except OSError:
                time.sleep(0.1)
        else:
            raise RuntimeError("Canonical localhost QA server not ready")
        report={"collectedAtUtc":datetime.now(timezone.utc).isoformat(),
                "scope":"CANONICAL_V34_POSTINTEGRATION_BROWSER_SOURCE_BOUND_QA",
                "servedBase":BASE,"chrome":None,
                "viewports":[],"errors":[]}
        with sync_playwright() as playwright:
            browser=playwright.chromium.launch(
                executable_path=str(CHROME),headless=True)
            report["chrome"]=browser.version
            try:
                for w,h in VIEWPORTS:
                    report["viewports"].append(run_viewport(browser,w,h,before))
            finally:
                browser.close()
        after=source_hashes()
        if before!=after or sha(Path(__file__))!=harness_before:
            raise AssertionError("Canonical V34 source or QA harness drift during browser run")
        report["canonicalRuntimeFileCount"]=len(after)
        report["canonicalRuntimeSha256"]=hashlib.sha256(
            json.dumps(after,sort_keys=True).encode()).hexdigest()
        report["canonicalRuntimeStable"]=True
        report["browserHarnessSha256"]=harness_before
        report["result"]="CANONICAL_V34_POSTINTEGRATION_BROWSER_PASS"
        report["phase2Supervisor"]="USER_APPROVED_GPT6_SELF_REVIEW"
        report["hardwareValidated"]=False
        report["releaseApproval"]="HOLD"
        RECEIPT.write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",
                           encoding="utf-8")
        print(json.dumps({"result":report["result"],
            "checks":sum(len(v["checks"]) for v in report["viewports"]),
            "viewports":[v["viewport"] for v in report["viewports"]],
            "canonicalRuntimeFiles":len(after),
            "receipt":str(RECEIPT),
            "receiptSha256":sha(RECEIPT)},ensure_ascii=False))
    finally:
        server.terminate()
        try:
            server.wait(timeout=4)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=4)

if __name__=="__main__":
    main()


