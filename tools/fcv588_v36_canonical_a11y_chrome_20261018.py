#!/usr/bin/env python3
"""V36 staged, source-bound accessibility and zoom/browser checks.

Offline only. No hardware, GPS, serial, RF, OEM pixels or external network.
ARIA snapshots are automated semantics, NOT NVDA/Narrator speech output.
"""
from __future__ import annotations

import hashlib, json, os, socket, subprocess, time
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
CHROME=Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
PORT=4213
BASE=f"http://127.0.0.1:{PORT}/"
RECEIPT=ROOT/"docs/qa/FCV588_V36_CANONICAL_A11Y_CHROME_20261018.json"
SHOTS=ROOT/"docs/qa/screenshots"
VIEWPORTS=((1440,900),(768,1024),(375,812),(320,720),
           (390,844),(1366,768),(1920,1080))
TEXT_SELECTORS=(
  "#instructor-source-matrix-title",
  "#instructor-source-matrix-description",
  ".source-matrix-item h4",
  ".source-matrix-state",
  ".source-matrix-item p:not(.source-matrix-details)",
  ".source-matrix-item .source-matrix-details"
)

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def source():
    return {p.relative_to(ROOT).as_posix():sha(p)
        for d in ("web","src") for p in sorted((ROOT/d).rglob("*"))
        if p.is_file() and p.suffix in {".mjs",".js",".css",".html",".svg"}}

def expected_canonical_v36():
    v35=json.loads((ROOT/"docs/qa/FCV588_V35_FINAL_INTEGRITY_20261018.json")
        .read_text(encoding="utf-8"))
    staged=ROOT/"staging/fcv588-v36-instructor-accessibility"
    patch=json.loads((staged/"evidence/V36_INSTRUCTOR_A11Y_PATCH_MANIFEST.json")
        .read_text(encoding="utf-8"))
    expected=dict(v35["runtimeSha256"])
    if len(expected)!=37 or len(patch["changedWebFiles"])!=4:
        raise AssertionError("V35 source or V36 patch manifest incomplete")
    for item in patch["changedWebFiles"]:
        name=item["path"]
        if expected.get(name)!=item["oldSha256"] or (
            sha(staged/name)!=item["stagedSha256"]
        ):
            raise AssertionError("Frozen V36 changed-source mismatch: "+name)
        expected[name]=item["stagedSha256"]
    if source()!=expected or len(expected)!=37:
        raise AssertionError("Canonical V36 differs from reviewed V35+V36 patch")
    return expected

def port_busy(port):
    with socket.socket() as s:
        s.settimeout(.25)
        return s.connect_ex(("127.0.0.1",port))==0

def viewport(browser,w,h,expected):
    context=browser.new_context(viewport={"width":w,"height":h},
        device_scale_factor=1,has_touch=True,is_mobile=w<=700,
        locale="vi-VN",reduced_motion="reduce")
    page=context.new_page()
    errors,requests,loaded,bodyErrors=[],[],[],[]
    page.on("pageerror",lambda err:errors.append(str(err)))
    page.on("console",lambda msg:errors.append(msg.text)
        if msg.type=="error" else None)
    page.on("request",lambda req:requests.append(req.url))
    page.on("requestfailed",lambda req:errors.append("NETWORK "+req.url))
    def finished(request):
        try:
            resp=request.response()
            target=urlsplit(request.url)
            path=("web/index.html" if target.path=="/"
                  else target.path.lstrip("/"))
            digest=hashlib.sha256(resp.body()).hexdigest() if resp else None
            if (resp is None or resp.status!=200 or
                target.hostname!="127.0.0.1" or target.port!=PORT or
                expected.get(path)!=digest):
                raise AssertionError("Unexpected runtime response: "+path)
            loaded.append({"path":path,"sha256":digest})
        except Exception as exc:
            bodyErrors.append(str(exc))
    page.on("requestfinished",finished)
    checks,photos=[],[]

    def check(name,result,detail=None):
        checks.append({"name":name,"passed":bool(result),"observed":detail})
        if not result:
            raise AssertionError(f"{w}x{h} {name}: {detail}")

    def picture(label):
        path=SHOTS/f"fcv588-v36-canonical-20261018-{w}x{h}-{label}.png"
        if path.exists():raise RuntimeError("Refuse overwrite screenshot "+str(path))
        page.locator("#instructor-source-matrix").screenshot(path=str(path))
        photos.append({"path":path.relative_to(ROOT).as_posix(),"sha256":sha(path)})

    def metrics():
        return page.locator("#instructor-source-matrix").evaluate(
            """(matrix,sels)=>{
             const rgb=x=>(x.match(/\d+(?:\.\d+)?/g)||[]).slice(0,3).map(Number);
             const lum=x=>rgb(x).reduce((sum,v,i)=>{
               const n=v/255,c=n<=.04045?n/12.92:((n+.055)/1.055)**2.4;
               return sum+c*[.2126,.7152,.0722][i];
             },0);
             const contrast=(a,b)=>{
               const x=lum(a),y=lum(b);
               return +((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2);
             };
             const texts={};
             for(const selector of sels){
               const e=matrix.querySelector(selector);
               const st=getComputedStyle(e);
               const bg=getComputedStyle(e.closest('.source-matrix-item')||matrix)
                 .backgroundColor;
               texts[selector]={fontPx:parseFloat(st.fontSize),
                 lineHeightPx:parseFloat(st.lineHeight),
                 contrast:contrast(st.color,bg),color:st.color,background:bg};
             }
             const sections=[...matrix.querySelectorAll('.source-matrix-item')];
             const area=matrix.getBoundingClientRect();
             const body=document.documentElement;
             return {texts,area:{left:area.left,right:area.right,width:area.width},
               viewportWidth:innerWidth,scrollWidth:body.scrollWidth,
               rootFontPx:parseFloat(getComputedStyle(body).fontSize),
               matrixOverflow:matrix.scrollWidth>matrix.clientWidth+1,
               cardOverflow:sections.some(e=>e.scrollWidth>e.clientWidth+1),
               documentOverflow:body.scrollWidth>innerWidth+1,
               headings:sections.map(e=>e.querySelector('h4')?.textContent),
               articlesNamed:sections.every(e=>{
                 const title=document.getElementById(e.getAttribute('aria-labelledby'));
                 return title && title.tagName==='H4' && title.textContent.trim().length>0;
               }),
               matrixFocusable:matrix.querySelectorAll(
                 'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])').length,
               offFace:!matrix.closest('.device-frame') &&
                 !matrix.closest('.equipment'),
               offFaceLive:!document.getElementById('source-matrix-announcement')
                  .closest('.equipment'),
             };
           }""", list(TEXT_SELECTORS))

    try:
        page.goto(BASE,wait_until="networkidle",timeout=25000)
        info=metrics()
        check("V36_D15_EXTERNAL_ONLY",info["offFace"] and info["offFaceLive"])
        check("V36_THREE_NAMED_ARTICLES",info["articlesNamed"] and
              len(info["headings"])==3,info["headings"])
        check("V36_MATRIX_HAS_NO_FAKE_CONTROLS",
              info["matrixFocusable"]==0,info["matrixFocusable"])
        check("V36_LIVE_STATUS_ATOMIC_AND_POLITE",
              page.locator("#source-matrix-announcement").get_attribute("role")=="status" and
              page.locator("#source-matrix-announcement").get_attribute("aria-live")=="polite" and
              page.locator("#source-matrix-announcement").get_attribute("aria-atomic")=="true")
        check("V36_FIRST_RENDER_DOES_NOT_ANNOUNCE",
              page.locator("#source-matrix-announcement").text_content()=="")
        check("V36_ALL_COPY_AT_LEAST_13PX",
              all(t["fontPx"]>=13 for t in info["texts"].values()),
              info["texts"])
        check("V36_SECTION_HEADING_AT_LEAST_16PX",
              info["texts"]["#instructor-source-matrix-title"]["fontPx"]>=16)
        check("V36_TEXT_CONTRAST_AT_LEAST_4_5",
              all(t["contrast"]>=4.5 for t in info["texts"].values()),
              info["texts"])
        check("V36_NO_MATRIX_OR_PAGE_HORIZONTAL_OVERFLOW",
              not info["matrixOverflow"] and not info["cardOverflow"] and
              not info["documentOverflow"],info)
        snap=page.locator("#instructor-source-matrix").aria_snapshot()
        for name in ("C11 · NAV / Waypoint","D09 · Tankenmaru",
                     "D14 · Nguồn dữ liệu nhận"):
            check("V36_ARIA_ARTICLE_"+name[:3],
                  ('article "'+name+'"') in snap and
                  ('heading "'+name+'" [level=4]') in snap,snap[:2400])
        picture("initial")

        # Observe only this dedicated status region (not all page mutations).
        page.evaluate("""()=>{
           window.__v36LiveMutations=0;
           new MutationObserver(()=>window.__v36LiveMutations++)
             .observe(document.getElementById('source-matrix-announcement'),
               {subtree:true,childList:true,characterData:true});
        }""")
        page.locator("#btn-pause").click()
        page.locator("#key-power").click()
        for _ in range(4):page.locator("#btn-step").click()
        check("V36_BOOT_HAS_DISCRETE_SOURCE_ANNOUNCEMENT",
              "D14:" in page.locator("#source-matrix-announcement").text_content())
        page.locator("#btn-nav-fixture").click()
        page.locator("#btn-step").click()
        check("V36_FRESH_NAV_STATE_ANNOUNCED",
              page.locator('[data-matrix-id="D14"]').get_attribute("data-source-state")==
                "SYNTHETIC_TRAINING_OBSERVATION" and
              "D14:" in page.locator("#source-matrix-announcement").text_content())
        stable=page.locator("#source-matrix-announcement").text_content()
        edits=page.evaluate("window.__v36LiveMutations")
        for _ in range(3):page.locator("#btn-step").click()
        page.wait_for_timeout(30)
        check("V36_TICKS_DO_NOT_REPEAT_LIVE_ANNOUNCEMENT",
              page.evaluate("window.__v36LiveMutations")==edits and
              page.locator("#source-matrix-announcement").text_content()==stable,
              {"observedEdits":page.evaluate("window.__v36LiveMutations"),
               "before":edits})
        picture("fresh-source")

        page.locator("#btn-nav-fixture").focus()
        beforeCount=page.locator("#event-count").text_content()
        for key in ("ArrowDown","r","Escape"):page.keyboard.press(key)
        check("V36_INSTRUCTOR_KEYBOARD_CANNOT_DISPATCH_FCV_KEYS",
              page.locator("#event-count").text_content()==beforeCount)
        page.locator("#btn-nav-fixture").focus()
        page.keyboard.press("Tab")
        focus=page.evaluate("document.activeElement?.id")
        outline=page.locator("#btn-mount-fixture").evaluate(
            "e=>({width:parseFloat(getComputedStyle(e).outlineWidth),style:getComputedStyle(e).outlineStyle})")
        check("V36_TAB_ORDER_NEXT_INSTRUCTOR_BUTTON",
              focus=="btn-mount-fixture",focus)
        check("V36_VISIBLE_KEYBOARD_FOCUS",
              outline["width"]>=2 and outline["style"]=="solid",outline)
        check("V36_FOCUS_KEPT_AFTER_SOURCE_TRANSITION",
              page.evaluate("document.activeElement?.id")=="btn-mount-fixture")

        # CSS rem scales with the host's text-size setting; no forced zoom,
        # hardware measurement, keyboard trapping or page-size mutation.
        page.evaluate("document.documentElement.style.fontSize='32px'")
        enlarged=metrics()
        check("V36_D15_COPY_SCALES_WITH_ROOT_TEXT_SIZE_200PCT",
              enlarged["rootFontPx"]==32 and
              all(abs(enlarged["texts"][k]["fontPx"]-2*v["fontPx"])<=.5
                  for k,v in info["texts"].items()),
              enlarged["texts"])
        check("V36_TEXT_ZOOM_NO_MATRIX_OVERFLOW",
              not enlarged["matrixOverflow"] and not enlarged["cardOverflow"] and
              not enlarged["documentOverflow"],enlarged)
        check("V36_TEXT_ZOOM_DOES_NOT_MOVE_FOCUS",
              page.evaluate("document.activeElement?.id")=="btn-mount-fixture")
        picture("text-zoom-200")
        page.evaluate("document.documentElement.style.fontSize=''")

        page.locator("#btn-nav-fixture").click()
        check("V36_REENABLE_NAV_NOTIFICATION_ONCE",
              page.locator("#source-matrix-announcement").text_content()!=stable)
        check("V36_SOURCE_MATRIX_NEVER_BECOMES_LCD_TEXT",
              not page.evaluate("""()=>
                document.querySelector('.device-frame').contains(
                  document.querySelector('#source-matrix-announcement'))
              """))
        check("V36_NO_PAGE_ERRORS",not errors,errors)
        check("V36_NO_FOREIGN_REQUESTS",
              all(urlsplit(u).hostname=="127.0.0.1" and
                  urlsplit(u).port==PORT for u in requests),requests)
        check("V36_ALL_BROWSER_RESPONSE_BYTES_PINNED",
              not bodyErrors and len(requests)==len(loaded) and
              {"web/index.html","web/app.mjs",
               "web/fcv588-training-source-matrix.mjs"}.issubset(
                  {p["path"] for p in loaded}),
              {"requested":len(requests),"loaded":len(loaded),"errors":bodyErrors})
        return {"viewport":f"{w}x{h}","checks":checks,
                "screenshots":photos,"initial":info,"zoom200":enlarged,
                "accessibilitySnapshot":snap,
                "verifiedBrowserResponses":len(loaded),"consoleErrors":errors,
                "status":"PASS"}
    finally:
        context.close()

def main():
    if RECEIPT.exists() or any(SHOTS.glob("fcv588-v36-canonical-20261018-*.png")):
        raise RuntimeError("Refuse overwrite V36 browser receipt/screenshots")
    if port_busy(PORT):raise RuntimeError("Foreign loopback QA port in use")
    SHOTS.mkdir(exist_ok=True,parents=True)
    before=expected_canonical_v36()
    scriptHash=sha(Path(__file__))
    env=os.environ.copy();env["PORT"]=str(PORT)
    flags=getattr(subprocess,"CREATE_NO_WINDOW",0)
    server=subprocess.Popen(["node",str(ROOT/"tools/server.mjs")],cwd=ROOT,
        env=env,stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,creationflags=flags)
    try:
        for _ in range(70):
            if server.poll() is not None:raise RuntimeError("Server died")
            try:
                with urlopen(BASE,timeout=.5) as resp:
                    if resp.status==200:break
            except OSError:time.sleep(.1)
        else:raise RuntimeError("QA server not ready")
        report={"collectedAtUtc":datetime.now(timezone.utc).isoformat(),
                "scope":"FCV588_CANONICAL_V36_D15_A11Y_SOURCE_BOUND",
                "viewports":[],"releaseApproval":"HOLD",
                "hardwareValidated":False,"realScreenReaderSpeech":"NOT_VERIFIED"}
        with sync_playwright() as playwright:
            browser=playwright.chromium.launch(
                executable_path=str(CHROME),headless=True)
            report["chromeVersion"]=browser.version
            try:
                for w,h in VIEWPORTS:
                    report["viewports"].append(viewport(browser,w,h,before))
            finally:browser.close()
        if before!=source() or scriptHash!=sha(Path(__file__)):
            raise AssertionError("Canonical V36 source or QA harness drift")
        report["sourceFileCount"]=len(before)
        report["sourceManifest"]=before
        report["runnerSha256"]=scriptHash
        report["result"]="CANONICAL_V36_D15_A11Y_BROWSER_PASS"
        with RECEIPT.open("x",encoding="utf-8",newline="\n") as out:
            json.dump(report,out,indent=2,ensure_ascii=False);out.write("\n")
        print(json.dumps({"status":report["result"],
            "viewports":[v["viewport"] for v in report["viewports"]],
            "checks":sum(len(v["checks"]) for v in report["viewports"]),
            "screenshots":sum(len(v["screenshots"]) for v in report["viewports"]),
            "sources":len(before),"receiptSha256":sha(RECEIPT)},
            ensure_ascii=False))
    finally:
        server.terminate()
        try:server.wait(timeout=4)
        except subprocess.TimeoutExpired:server.kill();server.wait(timeout=4)

if __name__=="__main__":
    main()
