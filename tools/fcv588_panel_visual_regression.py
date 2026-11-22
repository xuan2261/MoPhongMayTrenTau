#!/usr/bin/env python3
"""Owned, isolated Chrome checks for original FCV training-panel presentation.

This checks the simulator's DOM and observable input/state projection, not OEM
pixels or measured switch angles. It reads no manufacturer media or hardware.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

from fcv588_chrome_viewport_acceptance import (
    DEFAULT_CHROME, ROOT, verify_served_source, verify_browser_loaded_source,
)

URL = "http://127.0.0.1:4173/"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=("red", "green"), required=True)
    args = parser.parse_args()
    output = ROOT / f"docs/qa/FCV588_PANEL_V26_{args.stage.upper()}_RECEIPT.json"
    if output.exists():
        raise SystemExit(f"Refusing to overwrite recorded evidence: {output}")
    files = (Path(__file__), ROOT / "tools/fcv588_chrome_viewport_acceptance.py")
    harness = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    source = verify_served_source(URL)
    report = {"collectedAtUtc": datetime.now(timezone.utc).isoformat(),
              "stage": args.stage, "viewport": "1920x1080",
              "scope": "ORIGINAL_TRAINING_PANEL_NOT_OEM_CONFORMANCE",
              "releaseApproval": "HOLD", "servedSourceIdentity": source,
              "harnessSha256": harness, "checks": []}
    errors, failed, responses, bodies, body_errors = [], [], [], [], []

    def check(name, passed, observed):
        report["checks"].append({"name": name, "passed": bool(passed),
                                 "observed": observed})

    def dial(page, name):
        return page.locator(f"#{name}-knob").evaluate("""el => ({
          angle: getComputedStyle(el).getPropertyValue('--dial-angle').trim(),
          pointer: getComputedStyle(el, '::before').transform,
          selected: el.dataset.selection || '',
          label: el.getAttribute('aria-label'),
          pending: el.dataset.pending || 'false'
        })""")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=str(DEFAULT_CHROME),
                                              headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080},
                                      device_scale_factor=1, locale="vi-VN")
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("console", lambda message: errors.append(message.text)
                if message.type == "error" else None)
        page.on("requestfailed", lambda request: failed.append(request.url))
        page.on("response", lambda response: responses.append(response.url))

        def finished(request):
            try:
                response = request.response()
                bodies.append({"url": response.url, "status": response.status,
                               "sha256": hashlib.sha256(response.body()).hexdigest()})
            except Exception as error:
                body_errors.append(str(error))

        page.on("requestfinished", finished)
        try:
            page.goto(URL, wait_until="networkidle")
            off_text = page.locator("#off-screen").inner_text().strip()
            check("UNPOWERED_LCD_HAS_NO_TRAINER_PROMPT", off_text == "", off_text)
            bezel = page.locator(".bezel-header").inner_text()
            func = page.locator("#key-func").inner_text()
            check("TRAINING_INSTRUCTIONS_OUTSIDE_HARDWARE_LABELS",
                  "TRAINING" not in bezel and "nhấn/giữ" not in func,
                  {"bezel": bezel, "func": func})
            keys = {name: page.locator("#key-" + name).bounding_box()
                    for name in ("range", "mark", "func")}
            check("RANGE_MARK_FUNC_DISTINCT_VERTICAL_ORDER",
                  keys["range"]["y"] + keys["range"]["height"] <= keys["mark"]["y"]
                  and keys["mark"]["y"] + keys["mark"]["height"] <= keys["func"]["y"], keys)

            page.locator("#btn-pause").click()
            page.locator("#key-power").click()
            for _ in range(4):
                page.locator("#btn-step").click()
            initial_tick = page.locator("#tick-count").inner_text()
            initial = dial(page, "mode")
            page.locator("#mode-knob").focus()
            page.keyboard.press("ArrowRight")
            pending = dial(page, "mode")
            active = page.locator("#mode-state").inner_text()
            check("MODE_NEEDLE_TRACKS_PENDING_WITHOUT_EARLY_COMMIT",
                  initial["selected"] == "LF" and pending["selected"] == "DUAL"
                  and pending["pending"] == "true" and active == "LF"
                  and initial["pointer"] != pending["pointer"],
                  {"initial": initial, "pending": pending, "effective": active})
            page.locator("#key-menu").click()
            cancelled = dial(page, "mode")
            check("MODE_CANCEL_RESTORES_EFFECTIVE_NEEDLE",
                  cancelled["selected"] == "LF" and cancelled["pending"] == "false"
                  and cancelled["pointer"] == initial["pointer"], cancelled)
            page.locator("#mode-knob").focus()
            page.keyboard.press("ArrowRight")
            page.wait_for_timeout(6300)
            committed = dial(page, "mode")
            check("MODE_TIMER_COMMITS_WITH_WORLD_PAUSED",
                  committed["selected"] == "DUAL" and committed["pending"] == "false"
                  and page.locator("#mode-state").inner_text() == "DUAL"
                  and page.locator("#tick-count").inner_text() == initial_tick, committed)

            gain_before = dial(page, "gain")
            page.locator("#gain-knob").focus()
            page.keyboard.press("ArrowUp")
            gain_after = dial(page, "gain")
            check("GAIN_NEEDLE_AND_ACCESSIBLE_VALUE_FOLLOW_STATE",
                  gain_before["pointer"] != gain_after["pointer"]
                  and gain_before["label"] != gain_after["label"]
                  and "Offset" in gain_after["label"],
                  {"before": gain_before, "after": gain_after})
            page.locator("#btn-replay").click()
            replay = page.locator("#validation-status").inner_text()
            check("VISUAL_PROJECTION_PRESERVES_CANONICAL_REPLAY", "REPLAY PASS" in replay, replay)
            page.locator("#btn-reset").click()
            reset = dial(page, "mode")
            check("RESET_REPROJECTS_INITIAL_MODE_WITHOUT_STALE_DIAL",
                  reset["selected"] == "LF" and reset["pointer"] == initial["pointer"], reset)
            page.evaluate("window.scrollTo(0, 0)")
            shot = ROOT / f"docs/qa/screenshots/fcv588_panel_v26_{args.stage}.png"
            page.screenshot(path=str(shot), full_page=False)
            report["screenshot"] = shot.relative_to(ROOT).as_posix()
            report["browserLoadedSourceIdentity"] = verify_browser_loaded_source(
                bodies, source, URL, response_count=len(responses), body_errors=body_errors)
        finally:
            context.close()
            browser.close()
    after = verify_served_source(URL)
    check("RUNTIME_SOURCE_STABLE", after == source, after["sourceManifestSha256"])
    current_harness = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    check("HARNESS_SOURCE_STABLE", harness == current_harness, current_harness)
    check("NO_CONSOLE_OR_NETWORK_FAILURES", not errors and not failed,
          {"console": errors, "network": failed})
    report["status"] = "PASS" if all(c["passed"] for c in report["checks"]) else "FAIL"
    with output.open("x", encoding="utf-8") as stream:
        json.dump(report, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    print(json.dumps({"status": report["status"], "checks": report["checks"],
                      "receipt": str(output)}, ensure_ascii=True, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
