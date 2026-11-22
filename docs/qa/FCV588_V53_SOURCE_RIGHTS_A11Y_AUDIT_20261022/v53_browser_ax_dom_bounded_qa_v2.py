"""V53 bounded Chrome accessibility-tree / D15 live DOM probe, not spoken screenreader QA."""
from __future__ import annotations
import hashlib,json,os,socket,subprocess,sys,time,traceback
from pathlib import Path
from datetime import datetime,timezone
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
ROOT=OUT.parents[2]
FINAL=ROOT/'docs/qa/FCV588_V52_FINAL_INTEGRITY_20261022.json'
POST=ROOT/'docs/qa/FCV588_V52_POSTRECEIPT_READBACK_20261022.json'
RESULT=OUT/'V53_AX_TREE_LIVE_DOM_BOUNDED_20261022.json'
ERROR=OUT/'V53_AX_TREE_LIVE_DOM_STOP_20261022.txt'
SERVER_LOG=OUT/'V53_AX_OWNED_SERVER_20261022.log'
IMAGE=OUT/'V53_CHROME_AX_BRILL_D15_1366x768_20261022.png'
PORT=4273
BASE=f'http://127.0.0.1:{PORT}/'
CHROME=Path(r'C:\Program Files\Google\Chrome\Application\chrome.exe')
FINALSHA='4650306d6c088fc19eaa09b66922faaf29712015ae9a2f8fdf5795d2e780107f'
POSTSHA='410966989a000ac7553f2085b13474dd6d5ac686a35df516f824a03a4ebb4608'

def sha(path):
    dig=hashlib.sha256()
    with path.open('rb') as f:
        for b in iter(lambda:f.read(65536),b''):dig.update(b)
    return dig.hexdigest()

def require(value,why):
    if not value:raise RuntimeError(why)

def execute():
    require(sha(FINAL)==FINALSHA and sha(POST)==POSTSHA,'STOP V52 pins')
    require(CHROME.is_file(),'STOP Chrome unavailable')
    require(all(not f.exists() for f in (RESULT,ERROR,SERVER_LOG,IMAGE)),'STOP existing output')
    parent=json.loads(FINAL.read_text(encoding='utf-8-sig'))
    for rel,pin in parent['runtimeSourceSHA'].items():
        require(sha(ROOT/rel)==pin,'STOP source drift: '+rel)
    with socket.socket() as s:
        require(s.connect_ex(('127.0.0.1',PORT))!=0,'STOP port owned by someone else')
    with SERVER_LOG.open('xb') as log:
        server=subprocess.Popen(['node','tools/server.mjs'],cwd=str(ROOT),
            env={**os.environ,'PORT':str(PORT)},stdout=log,stderr=subprocess.STDOUT,
            creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
    try:
        for _ in range(50):
            require(server.poll() is None,'STOP owned server ended')
            try:
                with urlopen(BASE,timeout=.5) as response:
                    if response.status==200:break
            except OSError:time.sleep(.1)
        else:raise TimeoutError('owned server not ready')
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=str(CHROME),headless=True,
                args=['--no-first-run','--disable-background-networking'])
            try:
                ctx=browser.new_context(viewport={'width':1366,'height':768},
                    device_scale_factor=1,locale='vi-VN',reduced_motion='reduce',
                    service_workers='block')
                page=ctx.new_page()
                errors=[];requests=[]
                page.on('requestfailed',lambda req: errors.append('REQUEST_FAILED '+req.url))
                page.on('pageerror',lambda err: errors.append('PAGE_ERROR '+str(err)))
                page.on('console',lambda msg:errors.append('CONSOLE_ERROR '+msg.text)
                    if msg.type=='error' else None)
                page.on('response',lambda res:requests.append({'url':res.url,'status':res.status}))
                page.goto(BASE,wait_until='networkidle',timeout=25000)
                cdp=ctx.new_cdp_session(page)
                cdp.send('Accessibility.enable')
                before=cdp.send('Accessibility.getFullAXTree')['nodes']
                static=page.evaluate('''() => {
                  let d=document, live=d.querySelector('#operator-guidance-announcement'),
                  guide=d.querySelector('#operator-guidance'),lcd=d.querySelector('#lcd');
                  return {lang:d.documentElement.lang,liveRole:live.getAttribute('role'),
                  livePolite:live.getAttribute('aria-live')==='polite',
                  liveAtomic:live.getAttribute('aria-atomic')==='true',
                  guidanceRole:guide.getAttribute('role'),
                  guidanceIsLive:guide.hasAttribute('aria-live'),
                  outsideLcd:!lcd.contains(live),
                  notice:d.body.textContent.includes('PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY')};}''')
                require(static['liveRole']=='status' and static['livePolite'] and
                    static['liveAtomic'] and not static['guidanceIsLive'] and
                    static['outsideLcd'] and static['notice'],'D15 DOM source boundary failed')
                page.locator('#key-power').click()
                page.wait_for_function("getComputedStyle(document.querySelector('#off-screen')).display === 'none'",timeout=8000)
                page.evaluate('''() => {
                  window.__q53={live:[],help:[],title:[]};
                  for(let [kind,id] of Object.entries({live:'operator-guidance-announcement',
                      help:'operator-guidance-help',title:'operator-guidance-title'})){
                    const el=document.getElementById(id),obs=new MutationObserver(()=>{
                       window.__q53[kind].push(el.textContent.trim());
                    });obs.observe(el,{childList:true,subtree:true,characterData:true});
                  }}''')
                page.locator('#key-power').click()
                page.wait_for_timeout(1700)
                live=page.evaluate('''() => {
                   const x=window.__q53;
                   return {liveWrites:x.live.length,liveUnique:[...new Set(x.live)],
                     visualHelpWrites:x.help.length,visualHelpUnique:[...new Set(x.help)].length,
                     titleWrites:x.title.length,
                     title:document.querySelector('#operator-guidance-title')?.textContent.trim(),
                     announcement:document.querySelector('#operator-guidance-announcement')?.textContent.trim(),
                     help:document.querySelector('#operator-guidance-help')?.textContent.trim(),
                     viewport:[innerWidth,innerHeight],dpr:devicePixelRatio};}''')
                require(live['liveWrites']<=1,'D15 live ARIA region churn on UI timer')
                after=cdp.send('Accessibility.getFullAXTree')['nodes']
                def ax_min(nodes):
                    res=[]
                    for n in nodes:
                        role=n.get('role',{}).get('value')
                        name=n.get('name',{}).get('value','')
                        if role=='status' or role=='button' and (
                            'MENU/ESC' in name or 'TrackPad' in name or 'Nguồn' in name):
                            res.append({'role':role,'name':name,'ignored':n.get('ignored')})
                    return res
                ax_pre=ax_min(before);ax_post=ax_min(after)
                require(any(n['role']=='button' and 'MENU/ESC' in n['name'] for n in ax_pre),
                    'AX tree lacks MENU/ESC')
                require(any(n['role']=='status' for n in ax_post),
                    'AX tree lacks status region')
                page.locator('#key-menu').focus()
                page.keyboard.press('Tab')
                next_focus=page.evaluate('document.activeElement?.id')
                page.keyboard.press('Shift+Tab')
                back_focus=page.evaluate('document.activeElement?.id')
                require(next_focus=='pad-up' and back_focus=='key-menu','keyboard focus sequence')
                require(all(r['url'].startswith(BASE) and r['status']==200 for r in requests),
                    'unscoped browser response')
                require(not errors,'browser runtime errors '+str(errors))
                screenshot=page.screenshot(path=str(IMAGE),full_page=False)
                record={'status':'CHROME_AX_DOM_BOUNDED_PASS_NOT_SPEECH',
                  'timestampUtc':datetime.now(timezone.utc).isoformat(),
                  'sourceRoot':str(ROOT),'v52FinalSha256':FINALSHA,
                  'v52PostSha256':POSTSHA,'runtimeSha':'37_OF_37_MATCH_PRE',
                  'scope':'HEADLESS_CHROME_ACCESSIBILITY_TREE_DOM_ONLY',
                  'chromeVersion':browser.version,'staticDom':static,
                  'initialAxFiltered':ax_pre,'afterBrillAxFiltered':ax_post,
                  'brillMutationObservation':live,'focusTab':next_focus,
                  'focusShiftTab':back_focus,'http200Localhost':len(requests),
                  'browserErrors':errors,'image':{'name':IMAGE.name,
                     'bytes':len(screenshot),
                     'sha256':hashlib.sha256(screenshot).hexdigest()},
                  'actualNarratorNvdaUtterance':'NOT_RUN',
                  'genuineOsWindowBlurDuringPowerHold':'NOT_RUN',
                  'phase6':'OPEN','claimsHold':65,'releaseApproval':'HOLD'}
                with RESULT.open('xb') as f:
                    f.write((json.dumps(record,ensure_ascii=False,indent=2)+'\n').encode())
                cdp.detach();ctx.close()
            finally:browser.close()
    finally:
        if server.poll() is None:
            server.terminate()
            try:server.wait(timeout=6)
            except subprocess.TimeoutExpired:
                server.kill();server.wait(timeout=6)
    for rel,pin in parent['runtimeSourceSHA'].items():
        require(sha(ROOT/rel)==pin,'STOP post-run source drift: '+rel)
    require(sha(FINAL)==FINALSHA and sha(POST)==POSTSHA,'STOP pinned receipts drift')
    print('AX_DOM',record['status'],'AX',len(ax_pre),len(ax_post))
    print('LIVE_WRITES',live['liveWrites'],'HELP_WRITES',live['visualHelpWrites'])
    print('FOCUS',next_focus,back_focus,'RESPONSES',len(requests))
    print('RESULT_SHA256',sha(RESULT),'IMAGE_SHA256',sha(IMAGE))
    return 0

if __name__=='__main__':
    try:sys.exit(execute())
    except Exception:
        error=traceback.format_exc()
        if not ERROR.exists():
            with ERROR.open('xb') as f:f.write(error.encode('utf-8'))
        sys.stderr.write(error);sys.exit(2)
