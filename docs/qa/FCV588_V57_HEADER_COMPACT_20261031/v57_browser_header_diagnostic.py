import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
 for w,h in [(1440,900),(768,1024),(375,812),(320,812)]:
  page=b.new_page(viewport={"width":w,"height":h})
  page.goto("http://127.0.0.1:4173/",wait_until="load")
  page.wait_for_timeout(250)
  v=page.evaluate("""() => {
   const n=document.querySelector('.public-reference-banner');
   return {viewport:[innerWidth,innerHeight],noticeCount:document.querySelectorAll('.public-reference-banner').length,
   noticeText:n?.textContent.trim(),noticeRole:n?.getAttribute('role'),noticeInsideMasthead:!!n?.closest('.masthead'),
   brand:document.querySelector('.identity')?.innerText.trim(),h1:document.querySelector('h1')?.innerText.trim(),
   subtitle:document.querySelector('.subtitle')?.innerText.trim(),noStateChip:document.querySelectorAll('.state-chip').length===0,
   noLiveChip:document.querySelectorAll('.live-chip').length===0,noEyebrow:document.querySelectorAll('.eyebrow').length===0,
   noBrandTagline:document.querySelectorAll('.identity small').length===0,workbenchTop:document.querySelector('.workbench').getBoundingClientRect().top,
   d15Height:document.querySelector('.training-panel').getBoundingClientRect().height,docHeight:document.documentElement.scrollHeight,
   tabCount:document.querySelectorAll('.training-panel [role=tab]').length,docWidth:document.documentElement.scrollWidth};}""")
  out.append(v);page.close()
 b.close()
print(json.dumps(out,ensure_ascii=False,indent=2))