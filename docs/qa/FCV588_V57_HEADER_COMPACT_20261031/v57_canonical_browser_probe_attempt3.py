"""V56 local Chrome D15 tab QA. Does not test OEM hardware or spoken audio.

One browser process is reused across three isolated viewport contexts. The
served response bodies are hashed against the selected stage/canonical root.
No Windows reader, real OS blur, or ship interface is activated.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright


VIEWPORTS = [(1440, 900), (768, 1024), (375, 812), (320, 812)]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_body(root: Path, response, origin: str) -> dict:
    url = response.url
    parsed = urlsplit(url)
    if (parsed.scheme + "://" + parsed.netloc) != origin:
        raise AssertionError("External resource request: " + url)
    if response.status != 200:
        raise AssertionError("Non-200 resource: " + url + " " + str(response.status))
    relative = unquote(parsed.path)
    if relative == "/":
        relative = "/web/index.html"
    if not (relative.startswith("/web/") or relative.startswith("/src/")):
        raise AssertionError("Unexpected source route: " + relative)
    source = root / relative.lstrip("/")
    if not source.is_file():
        raise AssertionError("Missing expected local source: " + relative)
    content = response.body()
    digest = hashlib.sha256(content).hexdigest()
    if digest != sha(source):
        raise AssertionError("Browser loaded source mismatch: " + relative)
    return {"path": relative, "bytes": len(content), "sha256": digest}


def check_ui(page, width: int, height: int) -> dict:
    info = page.evaluate("""() => {
      const d=document.querySelector('.training-panel');
      const face=document.querySelector('.device-frame');
      const tabs=[...d.querySelectorAll('[role="tab"]')];
      const panels=[...d.querySelectorAll('[role="tabpanel"]')];
      const visible=panels.filter(p=>!p.hidden);
      const inactiveFocusables=panels.filter(p=>p.hidden)
        .flatMap(p=>[...p.querySelectorAll('button,select,input,[tabindex]')]
          .filter(el=>el.getClientRects().length!==0).map(el=>el.id));
      const live=['operator-guidance-announcement','source-matrix-announcement']
        .map(id=>{const el=document.getElementById(id);return {
          id,exists:!!el,hiddenAncestor:!!el?.closest('[hidden]'),
          outsideFace:!face.contains(el)
        }});
      return {
        header:(()=>{const n=document.querySelector(".public-reference-banner");return {noticeCount:document.querySelectorAll(".public-reference-banner").length,noticeText:n?.textContent.trim()||"",noticeRole:n?.getAttribute("role"),noticeInsideMasthead:!!n?.closest(".masthead"),brand:document.querySelector(".identity")?.innerText.trim()||"",h1:document.querySelector("h1")?.innerText.trim()||"",subtitle:document.querySelector(".subtitle")?.innerText.trim()||"",noStateChip:document.querySelectorAll(".state-chip").length===0,noLiveChip:document.querySelectorAll(".live-chip").length===0,noEyebrow:document.querySelectorAll(".heading .eyebrow").length===0,noBrandTagline:document.querySelectorAll(".identity small").length===0};})(),workbenchTop:document.querySelector(".workbench").getBoundingClientRect().top,viewport:[innerWidth,innerHeight],documentScrollWidth:document.documentElement.scrollWidth,
        documentScrollHeight:document.documentElement.scrollHeight,
        d15Height:d.getBoundingClientRect().height,
        d15Width:d.getBoundingClientRect().width,
        faceHeight:face.getBoundingClientRect().height,
        tabCount:tabs.length,panelCount:panels.length,
        selected:tabs.filter(t=>t.getAttribute('aria-selected')==='true').map(t=>t.id),
        visiblePanels:visible.map(p=>p.id),inactiveFocusables,live,
        tabSizes:tabs.map(t=>({id:t.id,width:t.getBoundingClientRect().width,
          height:t.getBoundingClientRect().height})),
        legacyIds:['btn-pause','btn-step','btn-reset','btn-replay',
          'gain-minus','gain-plus','mode-minus','mode-plus','btn-nav-fixture',
          'btn-mount-fixture','btn-tankenmaru-fixture','btn-battery-fixture',
          'btn-error-fixture','lesson-picker','btn-start-lesson','btn-score',
          'instructor-source-matrix','source-matrix-c11-title','source-matrix-d09-title',
          'source-matrix-d14-title','validation-status'].map(id=>({
          id,count:document.querySelectorAll('#'+id).length
        }))
      };
    }""")
    assert info["viewport"] == [width, height], "wrong CSS viewport"
    h=info["header"]
    assert h["noticeCount"]==1 and "PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY" in h["noticeText"]
    assert h["noticeRole"]=="note" and h["noticeInsideMasthead"]
    assert "MoPhongMayTrenTau" in h["brand"] and h["h1"]=="FCV-588 Training Console"
    assert h["subtitle"]=="Mô phỏng độc lập từ manual công khai."
    assert all(h[k] for k in ["noStateChip","noLiveChip","noEyebrow","noBrandTagline"])
    assert info["workbenchTop"]<220, "header/hero vertical savings missing"
    assert 4 <= info["tabCount"] <= 7, "expected compact tabs"
    assert info["tabCount"] == info["panelCount"]
    assert len(info["selected"]) == 1
    assert len(info["visiblePanels"]) == 1
    assert not info["inactiveFocusables"], "inactive panel contains rendered focus controls"
    assert info["documentScrollWidth"] <= width + 1, "horizontal overflow"
    assert all(v["count"] == 1 for v in info["legacyIds"]), "lost/duplicate capability"
    assert all(v["exists"] and not v["hiddenAncestor"] and v["outsideFace"]
               for v in info["live"]), "announcement hidden/inside OEM face"
    assert all(v["width"] >= 44 and v["height"] >= 44 for v in info["tabSizes"]), "tab target smaller than 44px"
    if width >= 1300:
        assert info["d15Height"] < 1050, "D15 should no longer be 3230px long"
        assert info["documentScrollHeight"] < 2100, "D15 still creates a long page tail"

    tabs = page.locator('.d15-tablist [role="tab"]')
    labels = tabs.all_text_contents()
    initially = info["selected"][0]
    for i in range(tabs.count()):
        tab = tabs.nth(i)
        tab.click()
        assert tab.get_attribute("aria-selected") == "true"
        panel_id = tab.get_attribute("aria-controls")
        assert page.locator("#" + panel_id).is_visible(), "selected panel hidden"
        assert page.locator('[role="tabpanel"]:visible').count() == 1
    tabs.nth(0).focus()
    page.keyboard.press("ArrowRight")
    assert tabs.nth(1).get_attribute("aria-selected") == "true"
    page.keyboard.press("Home")
    assert tabs.nth(0).get_attribute("aria-selected") == "true"
    page.keyboard.press("End")
    assert tabs.nth(tabs.count()-1).get_attribute("aria-selected") == "true"
    page.keyboard.press("ArrowRight")
    assert tabs.nth(0).get_attribute("aria-selected") == "true", "wrap failed"
    page.keyboard.press("ArrowLeft")
    assert tabs.nth(tabs.count()-1).get_attribute("aria-selected") == "true", "reverse wrap failed"

    # Use existing controls through their owning panel, no simulator shortcut.
    def activate_control(control_id: str):
        owner = page.locator("#"+control_id).evaluate(
            "el=>el.closest('[role=tabpanel]')?.id")
        assert owner, "control not assigned to a tab panel: " + control_id
        page.locator('[role="tab"][aria-controls="'+owner+'"]').click()
        assert page.locator("#"+control_id).is_visible()

    activate_control("btn-step")
    before = page.locator("#tick-count").text_content()
    page.locator("#btn-step").click()
    after = page.locator("#tick-count").text_content()
    assert before != after, "step button lost original behavior"
    activate_control("btn-nav-fixture")
    before_toggle = page.locator("#btn-nav-fixture").get_attribute("aria-pressed")
    page.locator("#btn-nav-fixture").click()
    after_toggle = page.locator("#btn-nav-fixture").get_attribute("aria-pressed")
    assert before_toggle != after_toggle, "fixture click lost behavior"
    activate_control("lesson-picker")
    assert page.locator("#lesson-picker option").count() == 7, "lost seven lessons"
    page.locator("#btn-start-lesson").click()
    assert page.locator("#lesson-result").count() == 1
    page.wait_for_timeout(300)
    assert page.locator('[role="tab"][aria-selected="true"]').count() == 1, "selection reset by repaint"
    activate_control("instructor-source-matrix")
    assert page.locator("#source-matrix-c11-title").is_visible()
    assert page.locator("#source-matrix-d09-title").is_visible()
    assert page.locator("#source-matrix-d14-title").is_visible()
    return {"baseline": info, "tabLabels": labels, "initialSelected": initially,
            "stepBefore": before, "stepAfter": after,
            "fixturePressedBefore": before_toggle, "fixturePressedAfter": after_toggle}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--url", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--chrome", default=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
    args = parser.parse_args()
    root = Path(args.root).resolve()
    out = Path(args.out).resolve()
    if out.exists():
        raise FileExistsError("Write-once output directory exists: " + str(out))
    out.mkdir(parents=True)
    split = urlsplit(args.url)
    origin = split.scheme + "://" + split.netloc
    result = {"scope": "V57_CHROME_HEADER_D15_DOM_POINTER_KEYBOARD_SOURCE_SHA_NOT_HARDWARE_OR_SPOKEN",
              "sourceRoot": str(root), "origin": origin, "viewports": [], "errors": []}
    exit_code = 0
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=args.chrome, headless=True)
        try:
            for width, height in VIEWPORTS:
                ctx = browser.new_context(viewport={"width": width, "height": height},
                    device_scale_factor=1, is_mobile=width < 700, has_touch=width < 700)
                page = ctx.new_page()
                responses = []
                page_errors = []
                page.on("response", lambda r: responses.append(r))
                page.on("pageerror", lambda e: page_errors.append(str(e)))
                page.on("console", lambda m: page_errors.append(m.text) if m.type == "error" else None)
                datum = {"viewport": [width, height]}
                try:
                    page.goto(args.url, wait_until="load")
                    page.wait_for_timeout(350)
                    datum["checks"] = check_ui(page, width, height)
                    datum["loadedBodies"] = [verify_body(root, r, origin) for r in responses]
                    assert len(datum["loadedBodies"]) >= 35
                    assert not page_errors, "page errors: " + repr(page_errors)
                    page.evaluate("window.scrollTo(0,0)")
                    screenshot = out / f"V57_{width}x{height}.png"
                    page.screenshot(path=str(screenshot), full_page=False)
                    datum["screenshot"] = {"path": str(screenshot), "sha256": sha(screenshot)}
                    datum["status"] = "PASS"
                except Exception as exc:
                    exit_code = 2
                    datum["status"] = "FAIL_PRESERVED"
                    datum["error"] = repr(exc)
                    result["errors"].append({"viewport": [width, height], "error": repr(exc)})
                finally:
                    datum["pageErrors"] = page_errors
                    result["viewports"].append(datum)
                    ctx.close()
            nojs = browser.new_context(java_script_enabled=False,
                viewport={"width": 1366, "height": 768})
            page = nojs.new_page()
            try:
                page.goto(args.url, wait_until="load")
                failopen = page.evaluate("""() => ({
                  tablistHidden:document.querySelector('.d15-tablist')?.hidden,
                  panels:[...document.querySelectorAll('.d15-tabpanel')].map(x=>x.hidden),
                  fixtures:!!document.querySelector('#btn-nav-fixture'),
                  lessons:!!document.querySelector('#lesson-picker')
                })""")
                result["noJavascript"] = failopen
                assert failopen["tablistHidden"] and all(v is False for v in failopen["panels"])
                assert failopen["fixtures"] and failopen["lessons"]
            except Exception as exc:
                result["errors"].append({"noJavascript": repr(exc)})
                exit_code = 2
            finally:
                nojs.close()
        finally:
            browser.close()
    receipt = out / "V57_BROWSER_DOM_INPUT_SOURCE_RECEIPT.json"
    receipt.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print("RECEIPT_SHA=" + sha(receipt))
    print("VIEWPORT_RESULTS=" + repr([x["status"] for x in result["viewports"]]))
    print("ERRORS=" + str(len(result["errors"])))
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
