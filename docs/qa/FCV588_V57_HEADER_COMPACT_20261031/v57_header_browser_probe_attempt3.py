from __future__ import annotations
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
OUT=ROOT/"docs/qa/FCV588_V57_HEADER_COMPACT_20261031"
URL="http://127.0.0.1:4287/"
VIEWPORTS=[("desktop",1440,900),("tablet",768,1024),("mobile",375,812),("small-mobile",320,812)]
result={"url":URL,"viewports":[],"noJs":{}}
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
    for name,width,height in VIEWPORTS:
        context=browser.new_context(viewport={"width":width,"height":height},device_scale_factor=1)
        page=context.new_page()
        errors=[]
        failed=[]
        external=[]
        page.on("pageerror",lambda err,sink=errors:sink.append(str(err)))
        page.on("console",lambda msg,sink=errors:sink.append(msg.text) if msg.type=="error" else None)
        page.on("requestfailed",lambda req,sink=failed:sink.append({"url":req.url,"failure":req.failure}))
        page.on("request",lambda req,sink=external:sink.append(req.url) if not req.url.startswith("http://127.0.0.1:4287/") else None)
        response=page.goto(URL,wait_until="domcontentloaded",timeout=15000)
        page.wait_for_timeout(350)
        initial=page.evaluate("""() => {
          const r=s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom,display:getComputedStyle(e).display};};
          return {
            viewport:{width:innerWidth,height:innerHeight},
            document:{scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,clientWidth:document.documentElement.clientWidth},
            masthead:r('.masthead'),identity:r('.identity'),notice:r('.public-reference-banner'),
            heading:r('.heading'),h1:r('h1'),subtitle:r('.subtitle'),workbench:r('.workbench'),
            deviceFrame:r('.device-frame'),sourceCue:r('#source-cue'),
            headingText:document.querySelector('.heading')?.innerText||'',
            mastheadText:document.querySelector('.masthead')?.innerText||''
          };
        }""")
        tabs=page.locator('.d15-tablist [role="tab"]')
        tab_count=tabs.count()
        if tab_count != 5: raise AssertionError(f"{name}: expected 5 D15 tabs, got {tab_count}")
        tabs.nth(1).click()
        help_selected=tabs.nth(1).get_attribute("aria-selected")
        help_hidden=page.locator("#d15-panel-help").evaluate("(e)=>e.hidden")
        tabs.nth(0).click()
        session_selected=tabs.nth(0).get_attribute("aria-selected")
        after=page.evaluate("() => ({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth})")
        viewport_shot=OUT/f"attempt3-after-{name}-{width}x{height}-viewport.png"
        full_shot=OUT/f"attempt3-after-{name}-{width}x{height}-full.png"
        page.screenshot(path=str(viewport_shot),full_page=False)
        page.screenshot(path=str(full_shot),full_page=True)
        item={
          "name":name,"httpStatus":response.status if response else None,
          "initial":initial,"tabCount":tab_count,"helpSelected":help_selected,
          "helpPanelHiddenAfterSelect":help_hidden,"sessionSelectedAfterReturn":session_selected,
          "after":after,"pageErrors":errors,"failedRequests":failed,"externalRequests":external,
          "viewportScreenshot":str(viewport_shot),"fullScreenshot":str(full_shot)
        }
        if item["httpStatus"]!=200 or errors or failed or external or after["scrollWidth"]!=after["clientWidth"]:
            raise AssertionError(json.dumps(item,ensure_ascii=False))
        if help_selected!="true" or help_hidden is not False or session_selected!="true":
            raise AssertionError("D15 tab interaction regression: "+json.dumps(item,ensure_ascii=False))
        result["viewports"].append(item)
        context.close()
    nojs=browser.new_context(viewport={"width":375,"height":812},java_script_enabled=False)
    page=nojs.new_page()
    response=page.goto(URL,wait_until="domcontentloaded",timeout=15000)
    page.wait_for_timeout(100)
    fallback=page.evaluate("""() => ({
      notice:document.querySelector('.public-reference-banner')?.textContent,
      tablistHidden:document.querySelector('.d15-tablist')?.hidden,
      panelHidden:["session","help","fixtures","lessons","sources"].map(k=>document.querySelector('#d15-panel-'+k)?.hidden),
      scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth
    })""")
    nojs_shot=OUT/"attempt3-after-mobile-375x812-nojs.png"
    page.screenshot(path=str(nojs_shot),full_page=False)
    result["noJs"]={"httpStatus":response.status if response else None,"fallback":fallback,"screenshot":str(nojs_shot)}
    if result["noJs"]["httpStatus"]!=200 or not fallback["tablistHidden"] or any(fallback["panelHidden"]) or fallback["scrollWidth"]!=fallback["clientWidth"]:
        raise AssertionError("No-JS fallback regression: "+json.dumps(result["noJs"],ensure_ascii=False))
    nojs.close()
    browser.close()
(OUT/"V57_STAGE_BROWSER_ATTEMPT3_20261031.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("STAGE_BROWSER_VIEWPORTS="+str(len(result["viewports"]))+"/3 PASS")
for x in result["viewports"]:
    m=x["initial"]
    print(f"{x['name']} {m['viewport']['width']}x{m['viewport']['height']} HTTP={x['httpStatus']} masthead={m['masthead']['height']:.1f}px heading={m['heading']['height']:.1f}px workbenchY={m['workbench']['y']:.1f}px doc={m['document']['scrollWidth']}x{m['document']['scrollHeight']} tabs={x['tabCount']} errors={len(x['pageErrors'])}")
print("NO_JS_FALLBACK=PASS")