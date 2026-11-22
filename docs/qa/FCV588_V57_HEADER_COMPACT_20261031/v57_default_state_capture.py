import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
OUT=ROOT/"docs/qa/FCV588_V57_HEADER_COMPACT_20261031/canonical-default-state"
URL="http://127.0.0.1:4173/"
viewports=[("desktop",1440,900),("tablet",768,1024),("mobile",375,812),("small-mobile",320,812)]
result={"url":URL,"screenshots":[]}
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
 for name,w,h in viewports:
  page=b.new_page(viewport={"width":w,"height":h},device_scale_factor=1)
  errors=[]
  page.on("pageerror",lambda e,s=errors:s.append(str(e)))
  response=page.goto(URL,wait_until="load")
  page.wait_for_timeout(300)
  metrics=page.evaluate("""()=>({viewport:[innerWidth,innerHeight],documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,workbenchTop:document.querySelector('.workbench').getBoundingClientRect().top,selected:document.querySelector('.d15-tab[aria-selected=true]')?.id,notice:document.querySelector('.public-reference-banner')?.textContent.trim(),h1:document.querySelector('h1')?.innerText.trim()})""")
  assert response and response.status==200
  assert metrics["documentWidth"]<=w+1 and metrics["selected"]=="d15-tab-session"
  assert not errors
  full=OUT/f"default-{name}-{w}x{h}-full.png"
  viewport=OUT/f"default-{name}-{w}x{h}-viewport.png"
  page.screenshot(path=str(full),full_page=True)
  page.screenshot(path=str(viewport),full_page=False)
  result["screenshots"].append({"name":name,"http":response.status,"metrics":metrics,"pageErrors":errors,"full":str(full),"viewport":str(viewport)})
  page.close()
 # no-JS default disclosure and progressive enhancement
 ctx=b.new_context(viewport={"width":375,"height":812},java_script_enabled=False)
 page=ctx.new_page();resp=page.goto(URL,wait_until="load")
 nojs=page.evaluate("""()=>({notice:document.querySelector('.public-reference-banner')?.textContent.trim(),role:document.querySelector('.public-reference-banner')?.getAttribute('role'),tablistHidden:document.querySelector('.d15-tablist')?.hidden,panels:[...document.querySelectorAll('.d15-tabpanel')].map(x=>x.hidden)})""")
 assert resp and resp.status==200 and nojs["tablistHidden"] and not any(nojs["panels"])
 assert "PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY" in nojs["notice"]
 page.screenshot(path=str(OUT/"default-mobile-375x812-nojs.png"),full_page=False)
 result["noJs"]=nojs
 ctx.close();b.close()
(OUT/"V57_DEFAULT_STATE_CAPTURE_20261031.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("DEFAULT_STATE_VIEWPORTS="+str(len(result["screenshots"]))+"/4")
for x in result["screenshots"]:
 m=x["metrics"];print(f"{x['name']} {m['viewport']} workbenchTop={m['workbenchTop']:.1f} document={m['documentWidth']}x{m['documentHeight']} selected={m['selected']}")
print("NO_JS=PASS")