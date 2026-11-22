"""V54 real Chrome pointerdown/up separated from D15 250ms UI ticks.

Produces raw timestamped DOM event and MutationObserver evidence BEFORE any
behavior assertions. This is browser/ARIA verification, not actual NVDA/Narrator
speech, genuine Windows window.blur, or OEM device conformance.
"""
from __future__ import annotations
import hashlib, json, os, socket, subprocess, sys, time, traceback
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[2]
V53=ROOT/"docs/qa/FCV588_V53_PARTIAL_INTEGRITY_20261022.json"
V53_POST=ROOT/"docs/qa/FCV588_V53_PARTIAL_POSTRECEIPT_READBACK_20261022.json"
PARENT_SHA="428b1b7f5b249e9502ec947fc80a15b0deea903f5f30ad946378705929aed4ea"
POST_SHA="5e39b82211ee56f9e66664a6c6db9492fe79ad22af863f66aae08e892ab34f8d"
PORT=4284
BASE=f"http://127.0.0.1:{PORT}/"
CHROME=Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
RAW=OUT/"V54_POWER_PHASED_DOM_RAW_20261022.json"
ASSESS=OUT/"V54_POWER_PHASED_ARIA_ASSERTIONS_20261022.json"
FAIL=OUT/"V54_POWER_PHASED_FIRST_STOP_20261022.txt"
SERVER_LOG=OUT/"V54_OWNED_LOCAL_SERVER_20261022.log"
HOLD_PNG=OUT/"V54_1366x768_ACTUAL_POWER_HOLD_20261022.png"
BRILL_PNG=OUT/"V54_1366x768_BRILL_PREVIEW_20261022.png"

def digest(path:Path)->str:
    h=hashlib.sha256()
    with path.open("rb") as src:
        for chunk in iter(lambda:src.read(1048576),b""):h.update(chunk)
    return h.hexdigest()

def check(ok,msg):
    if not ok:raise RuntimeError(msg)

def create_bytes(path:Path,b:bytes):
    with path.open("xb") as f:f.write(b)

def create_json(path:Path,obj):
    create_bytes(path,(json.dumps(obj,ensure_ascii=False,indent=2)+"\n").encode("utf-8"))

def parent_preflight():
    check(digest(V53)==PARENT_SHA and digest(V53_POST)==POST_SHA,"STOP V53 SHA parent changed")
    check(CHROME.is_file(),"STOP Chrome executable absent")
    prior=json.loads(V53.read_text(encoding="utf-8-sig"))
    check(prior["phase6"]=="OPEN" and prior["publicClaimsHold"]==65
          and prior["releaseApproval"]=="HOLD","STOP V53 evidence claim drift")
    check(all(not p.exists() for p in (RAW,ASSESS,FAIL,SERVER_LOG,HOLD_PNG,BRILL_PNG)),
          "STOP attempt result already exists")
    pins=prior["runtimeSourceSHA"]
    check(len(pins)==37,"STOP 37 expected source pin")
    for rel,expected in pins.items():
        check(digest(ROOT/rel)==expected,"STOP source drift "+rel)
    with socket.socket() as s:
        s.settimeout(.35)
        check(s.connect_ex(("127.0.0.1",PORT))!=0,"STOP owned port occupied")
    return pins

def wait_local(proc):
    for _ in range(90):
        check(proc.poll() is None,"STOP owned server exited before ready")
        try:
            with urlopen(BASE,timeout=.5) as r:
                if r.status==200:return
        except OSError:time.sleep(.1)
    raise TimeoutError("owned localhost QA service not ready")

JS_INSTALL=r"""() => {
  const ids={live:'operator-guidance-announcement',
    title:'operator-guidance-title',current:'operator-guidance-current',
    help:'operator-guidance-help'};
  const now=()=>Math.round(performance.now()*10)/10;
  const el=id=>document.getElementById(id);
  const state=()=>{
    const live=el(ids.live),title=el(ids.title),current=el(ids.current),help=el(ids.help);
    return {live:live?.textContent?.trim()??null,
      title:title?.textContent?.trim()??null,
      current:current?.textContent?.trim()??null,
      help:help?.textContent?.trim()??null,
      screenTop:el('screen-top')?.textContent?.trim()??null,
      focused:document.hasFocus(),powerPressing:el('key-power')?.classList.contains('pressing')};
  };
  const q={phase:'idle',startPerf:now(),events:[],mutations:[],snapshots:[],
    observers:[],blurEvents:[],isNativeInputObserved:false};
  const push=(kind,obj={})=>q.snapshots.push({kind,phase:q.phase,t:now(),...state(),...obj});
  const power=el('key-power');
  for(const type of ['pointerdown','pointerup','pointercancel','click']){
    power.addEventListener(type,e=>{
      if(type==='pointerdown')q.phase='power-held';
      else if(type==='pointerup')q.phase='power-released';
      q.events.push({type,phase:q.phase,t:now(),isTrusted:e.isTrusted,
        pointerType:e.pointerType??null,button:e.button??null,detail:e.detail});
      if(e.isTrusted&&(type==='pointerdown'||type==='pointerup'))q.isNativeInputObserved=true;
      queueMicrotask(()=>push('after-'+type));
    },true);
  }
  window.addEventListener('blur',()=>q.blurEvents.push({phase:q.phase,t:now(),trusted:true}),true);
  for(const [name,id] of Object.entries(ids)){
    const target=el(id);
    const obs=new MutationObserver(list=>{
      q.mutations.push({field:name,phase:q.phase,t:now(),text:target.textContent.trim(),
        count:list.length});
    });
    obs.observe(target,{childList:true,characterData:true,subtree:true});
    q.observers.push(obs);
  }
  push('instrumented-before-hold');
  window.__v54=q;window.__v54_snapshot=push;window.__v54_state=state;
  return {installed:true,aria: {
    role:el(ids.live).getAttribute('role'),
    live:el(ids.live).getAttribute('aria-live'),
    atomic:el(ids.live).getAttribute('aria-atomic'),
    guideRole:el('operator-guidance').getAttribute('role'),
    guideLive:el('operator-guidance').hasAttribute('aria-live'),
    outsideLcd:!el('lcd').contains(el(ids.live))
  }, initial:state()};
}"""

JS_EXPORT=r"""() => {
 const q=window.__v54;
 q.observers.forEach(o=>o.disconnect());
 const s=window.__v54_state();
 const out={phase:q.phase,events:q.events,mutations:q.mutations,
   snapshots:q.snapshots,blurEvents:q.blurEvents,
   isNativeInputObserved:q.isNativeInputObserved,final:s,
   scrollY,innerWidth,innerHeight,dpr:devicePixelRatio};
 delete window.__v54;delete window.__v54_snapshot;delete window.__v54_state;
 return out;
}"""

def execute():
    pins=parent_preflight()
    with SERVER_LOG.open("xb") as server_out:
        proc=subprocess.Popen(["node","tools/server.mjs"],cwd=str(ROOT),
            env={**os.environ,"PORT":str(PORT)},stdout=server_out,
            stderr=subprocess.STDOUT,creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
    browser=None
    trace=None
    try:
        wait_local(proc)
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=str(CHROME),headless=True,
                args=["--disable-background-networking","--no-first-run"])
            context=browser.new_context(viewport={"width":1366,"height":768},
                locale="vi-VN",device_scale_factor=1,reduced_motion="reduce",
                service_workers="block")
            page=context.new_page()
            requests=[];errors=[]
            page.on("response",lambda r:requests.append({"url":r.url,"status":r.status}))
            page.on("requestfailed",lambda r:errors.append({"requestFailed":r.url}))
            page.on("pageerror",lambda e:errors.append({"pageError":str(e)}))
            page.on("console",lambda m:errors.append({"consoleError":m.text}) if m.type=="error" else None)
            resp=page.goto(BASE,wait_until="networkidle",timeout=30000)
            check(resp and resp.status==200,"STOP main page HTTP")
            page.locator("#key-power").click()
            page.locator("#screen-top").filter(has_text="AUTO_R").wait_for(state="visible",timeout=15000)
            page.locator("#key-power").scroll_into_view_if_needed()
            box=page.locator("#key-power").bounding_box()
            check(box and box["width"]>0 and box["height"]>0,"STOP power key geometry")
            pos={"x":box["x"]+box["width"]/2,"y":box["y"]+box["height"]/2}
            installed=page.evaluate(JS_INSTALL)
            check(installed["installed"],"STOP instrumentation setup")
            page.mouse.move(pos["x"],pos["y"])
            page.mouse.down()
            page.wait_for_timeout(1350)
            held=page.evaluate("() => { window.__v54_snapshot('before-pointerup'); return window.__v54_state(); }")
            hold_png=page.screenshot(path=str(HOLD_PNG),full_page=False)
            page.mouse.up()
            page.wait_for_timeout(1350)
            released=page.evaluate("() => {window.__v54_snapshot('after-release-ticks');return window.__v54_state();}")
            brill_png=page.screenshot(path=str(BRILL_PNG),full_page=False)
            browser_info={"version":browser.version,"loadCount":len(requests),
                "network":requests,"errors":errors,"attachedBeforeEvents":True}
            phase_data=page.evaluate(JS_EXPORT)
            trace={"scope":"V54_CHROME_NATIVE_POINTER_PHASED_ARIA_DOM_NOT_SPOKEN_OR_OS_BLUR",
                "capturedUtc":datetime.now(timezone.utc).isoformat(),
                "sourceRoot":str(ROOT),"canonicalV53PartialSHA256":PARENT_SHA,
                "canonicalV53PartialPostSHA256":POST_SHA,"runtimePreSHA":"37/37_MATCH",
                "scriptSha256":digest(Path(__file__).resolve()),
                "browser":browser_info,"liveRegion":installed["aria"],
                "instrumentedInitial":installed["initial"],
                "heldState":held,"releasedState":released,
                "eventTimeline":phase_data,
                "screenshots":[
                   {"file":HOLD_PNG.name,"sha256":hashlib.sha256(hold_png).hexdigest(),
                    "bytes":len(hold_png),"width":1366,"height":768,"scope":"after physical down while held"},
                   {"file":BRILL_PNG.name,"sha256":hashlib.sha256(brill_png).hexdigest(),
                    "bytes":len(brill_png),"width":1366,"height":768,"scope":"after physical up, Brill timeout"}
                ],"actualSpokenNVDA_Narrator":"NOT_RUN",
                "genuineWindowsOSBlurDuringHold":"NOT_RUN",
                "phase6":"OPEN","claimsHold":65,"releaseApproval":"HOLD"}
            create_json(RAW,trace) # Evidence is saved BEFORE interpreting assertions.
            context.close()
            browser.close()
            browser=None
    finally:
        if browser:browser.close()
        if proc.poll() is None:
            proc.terminate()
            try:proc.wait(timeout=7)
            except subprocess.TimeoutExpired:
                proc.kill();proc.wait(timeout=7)
    check(trace is not None and RAW.exists(),"STOP no raw event capture")
    for rel,hashval in pins.items():
        check(digest(ROOT/rel)==hashval,"STOP postflight runtime drift "+rel)
    check(digest(V53)==PARENT_SHA and digest(V53_POST)==POST_SHA,"STOP pinned parent changed")
    check(proc.poll() is not None,"STOP QA service cleanup")
    q=trace["eventTimeline"]; events=q["events"]; mutations=q["mutations"]
    live_hold=[x for x in mutations if x["field"]=="live" and x["phase"]=="power-held"]
    live_release=[x for x in mutations if x["field"]=="live" and x["phase"]=="power-released"]
    curr_hold=[x for x in mutations if x["field"]=="current" and x["phase"]=="power-held"]
    help_release=[x for x in mutations if x["field"]=="help" and x["phase"]=="power-released"]
    hold_values=[x["text"] for x in curr_hold]
    release_values=[x["text"] for x in help_release]
    hold_numbers=[]
    import re
    for val in hold_values:
        match=re.search(r"Còn ([0-9]+(?:\.[0-9]+)?) s",val)
        if match:hold_numbers.append(float(match.group(1)))
    checkpoints={
      "sourceBound37":True,
      "realTrustedPointerEdges":len([x for x in events if x["type"]=="pointerdown" and x["isTrusted"]])==1
                             and len([x for x in events if x["type"]=="pointerup" and x["isTrusted"]])==1,
      "ariaStructure":trace["liveRegion"]=={
        "role":"status","live":"polite","atomic":"true","guideRole":"group",
        "guideLive":False,"outsideLcd":True},
      "oneHoldTitleTransition":len(live_hold)==1 and live_hold[0]["text"]=="Giữ POWER/BRILL",
      "oneReleaseTitleTransition":len(live_release)==1 and ("Brill" in live_release[0]["text"]),
      "holdCountdownObserved":len(set(hold_numbers))>=3 and
          all(a>b for a,b in zip(hold_numbers,hold_numbers[1:])),
      "brillVisualTimerObserved":len(set(release_values))>=3 and
          any("Còn " in v for v in release_values),
      "noRepeatedHoldSpokenTextOnUITicks":len(live_hold)==1,
      "noRepeatedReleaseSpokenTextOnUITicks":len(live_release)==1,
      "noExternalRequests":all(r["url"].startswith(BASE) and r["status"]==200
                                for r in trace["browser"]["network"]),
      "noBrowserExceptions":not trace["browser"]["errors"],
      "noUnintendedShutdown":trace["releasedState"]["screenTop"].startswith("AUTO_R"),
      "noWindowBlurObserved":len(q["blurEvents"])==0
    }
    verdict="PASS_PHASE_SCOPED_DOM_ARIA_NOT_SPEECH" if all(checkpoints.values()) else "FAIL_PHASE_SCOPED_DOM_ARIA"
    result={"status":verdict,"timeUtc":datetime.now(timezone.utc).isoformat(),
        "parentV53PartialSHA256":PARENT_SHA,"rawTraceSha256":digest(RAW),
        "heldLiveMutations":live_hold,"releaseLiveMutations":live_release,
        "heldCurrentMutations":curr_hold,"brillHelpMutations":help_release,
        "holdCountdownSequence":hold_numbers,
        "releaseTimerUnique":len(set(release_values)),
        "assertions":checkpoints,"allPassed":all(checkpoints.values()),
        "realSpeech":"NOT_RUN","genuineOSBlur":"NOT_RUN",
        "phase6":"OPEN","claimsHold":65,"releaseApproval":"HOLD"}
    create_json(ASSESS,result)
    print("V54_PHASED_DOM",verdict)
    print("MUTATIONS live_hold",live_hold,"live_release",live_release)
    print("HOLD_COUNTDOWN",hold_numbers,"BRILL_HELP_UNIQUE",len(set(release_values)))
    print("ASSERTIONS",json.dumps(checkpoints,ensure_ascii=False))
    print("RAW_SHA256",digest(RAW),"ASSESS_SHA256",digest(ASSESS))
    return 0 if all(checkpoints.values()) else 2

if __name__=="__main__":
    try:sys.exit(execute())
    except Exception:
        err=traceback.format_exc()
        if not FAIL.exists():create_bytes(FAIL,err.encode("utf-8"))
        print(err,file=sys.stderr)
        sys.exit(2)
