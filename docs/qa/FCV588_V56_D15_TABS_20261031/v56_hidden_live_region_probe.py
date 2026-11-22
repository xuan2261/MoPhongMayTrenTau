"""V56 focused Chrome live-region preservation while D15 tabs are hidden.

Browser DOM/mutation checks only. Not Narrator/NVDA spoken-output QA.
"""
import hashlib
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:4173/"


def main(out_file: Path):
    if out_file.exists():
        raise FileExistsError("V56 write-once live-region evidence exists")
    result = {"scope": "REAL_CHROME_DOM_NOT_SPOKEN_OUTPUT"}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            headless=True,
        )
        context = browser.new_context(viewport={"width": 1366, "height": 768})
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        try:
            page.goto(URL, wait_until="load")
            page.wait_for_timeout(150)
            page.locator('#d15-tab-session').click()
            page.locator("#btn-pause").click()
            before = page.locator("#event-count").text_content()
            for tab_id in [
                "d15-tab-help", "d15-tab-fixtures", "d15-tab-lessons",
                "d15-tab-sources", "d15-tab-session", "d15-tab-sources",
            ]:
                page.locator("#" + tab_id).click()
            after = page.locator("#event-count").text_content()
            assert before == after, "Switching D15 tabs must not send simulator events"
            page.evaluate("""() => {
              window.__v56Live = [];
              const el=document.querySelector('#operator-guidance-announcement');
              new MutationObserver(() => {
                window.__v56Live.push(el.textContent)
              }).observe(el,{childList:true,characterData:true,subtree:true});
            }""")
            # Press POWER with real Playwright mouse; then tick the booting
            # simulator with its existing teacher step button.
            page.locator("#key-power").click()
            page.locator("#d15-tab-session").click()
            for _ in range(4):
                page.locator("#btn-step").click()
            page.locator("#d15-tab-sources").click()
            assert page.locator("#d15-panel-help").evaluate("el => el.hidden")
            page.locator("#key-menu").click()
            page.wait_for_timeout(50)
            first = page.evaluate("window.__v56Live")
            assert first, "Semantic live title must change while guidance tab hidden"
            page.locator("#key-menu").click()
            page.wait_for_timeout(50)
            second = page.evaluate("window.__v56Live")
            assert len(second) >= len(first)
            status = page.evaluate("""() => ({
              guidanceTitle:document.querySelector('#operator-guidance-title').textContent,
              liveText:document.querySelector('#operator-guidance-announcement').textContent,
              sourceLiveHiddenAncestor:!!document.querySelector('#source-matrix-announcement').closest('[hidden]'),
              guidanceLiveHiddenAncestor:!!document.querySelector('#operator-guidance-announcement').closest('[hidden]'),
              liveChanges:window.__v56Live,
              activeTab:document.querySelector('.d15-tab[aria-selected=true]')?.id
            })""")
            assert not status["sourceLiveHiddenAncestor"]
            assert not status["guidanceLiveHiddenAncestor"]
            assert status["activeTab"] == "d15-tab-sources"
            assert not errors, errors
            result.update({"status": "CHROME_DOM_LIVE_PRESERVED_PASS",
                           "noTabEventCountChange": before == after,
                           "semanticLive": status, "browserPageErrors": errors})
        finally:
            context.close()
            browser.close()
    out_file.write_text(json.dumps(result, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    print("STATUS=" + result["status"])
    print("LIVE_CHANGES=" + repr(result["semanticLive"]["liveChanges"]))
    print("SHA256=" + hashlib.sha256(out_file.read_bytes()).hexdigest())


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve())
