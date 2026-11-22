from __future__ import annotations
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
OUT=ROOT/"docs/qa/FCV588_V57_HEADER_COMPACT_20261031"
URL="http://127.0.0.1:4173/"
VIEWPORTS=[("desktop",1440,900),("tablet",768,1024),("mobile",375,812)]
result={"url":URL,"viewports":[],"browserErrors":[]}
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
    for name,width,height in VIEWPORTS:
        page=browser.new_page(viewport={"width":width,"height":height},device_scale_factor=1)
        page_errors=[]
        page.on("pageerror",lambda err, sink=page_errors:sink.append(str(err)))
        response=page.goto(URL,wait_until="domcontentloaded",timeout=15000)
        page.wait_for_timeout(450)
        data=page.evaluate("""() => {
          const rect = (selector) => {
            const el=document.querySelector(selector);
            if(!el)return null;
            const r=el.getBoundingClientRect();
            return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,display:getComputedStyle(el).display};
          };
          return {
            title:document.title,
            viewport:{width:innerWidth,height:innerHeight},
            document:{scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,clientWidth:document.documentElement.clientWidth},
            masthead:rect('.masthead'), identity:rect('.identity'), stateChip:rect('.state-chip'),
            banner:rect('.public-reference-banner'), heading:rect('.heading'), eyebrow:rect('.eyebrow'),
            h1:rect('h1'), subtitle:rect('.subtitle'), liveChip:rect('.live-chip'),
            workbench:rect('.workbench'), sourceCue:rect('#source-cue'),
            deviceFrame:rect('.device-frame'), d15:rect('.instructor-panel'),
            headerText:document.querySelector('header')?.innerText||'',
            bannerText:document.querySelector('.public-reference-banner')?.innerText||'',
            heroText:document.querySelector('.heading')?.innerText||'',
            sourceCueText:document.querySelector('#source-cue')?.innerText||''
          };
        }""")
        screenshot=OUT/f"baseline-{name}-{width}x{height}.png"
        page.screenshot(path=str(screenshot),full_page=True)
        result["viewports"].append({"name":name,"status":response.status if response else None,"metrics":data,"pageErrors":page_errors,"screenshot":str(screenshot)})
        page.close()
    browser.close()
(OUT/"V57_BASELINE_VIEWPORTS_20261031.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("BASELINE_VIEWPORTS="+str(len(result["viewports"])))
for v in result["viewports"]:
    m=v["metrics"]
    print(f"{v['name']} {m['viewport']['width']}x{m['viewport']['height']} HTTP={v['status']} header={m['masthead']['height']:.1f}px banner={m['banner']['height'] if m['banner'] else None} hero={m['heading']['height']:.1f}px workbenchTop={m['workbench']['y']:.1f}px doc={m['document']['scrollWidth']}x{m['document']['scrollHeight']} errors={len(v['pageErrors'])}")