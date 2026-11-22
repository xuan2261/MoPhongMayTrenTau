from pathlib import Path
from hashlib import sha256
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
import subprocess, socket, os, json, traceback
ROOT=Path(r'C:\Work\MoPhongMayTrenTau')
QA=Path(__file__).resolve().parent
PORT=4218
URL=f'http://127.0.0.1:{PORT}/'
CHROME=r'C:\Program Files\Google\Chrome\Application\chrome.exe'
OUT=QA/'P18_D15_CHROME_KEYBOARD_GATE_V2_20261117.json'
R={'schema':'FCV588_P18_D15_REAL_CHROME_KEYBOARD_QA_V1','scope':'ISOLATED_HEADLESS_CHROME_BROWSER_ONLY_NOT_NATIVE_UIA_OR_SPEECH','port':PORT,'checks':[],'errors':[],'requests':[],'pageErrors':[],'externalRequests':[]}
def digest(b):return sha256(b).hexdigest()
def check(name,actual,expect):
    ok=(actual==expect)
    R['checks'].append({'name':name,'pass':ok,'observed':actual,'expected':expect})
    if not ok:R['errors'].append(name)
def count(page):return int(page.locator('#event-count').inner_text())
def selected(page):return page.locator('[role=tab][aria-selected=true]').get_attribute('id')
def focused(page):return page.evaluate('document.activeElement?.id')
def run():
    if OUT.exists():raise FileExistsError('write-once result exists')
    with socket.socket() as s:
        if s.connect_ex(('127.0.0.1',PORT))==0:raise RuntimeError('port occupied; do not touch')
    server=subprocess.Popen([r'C:\nvm4w\nodejs\node.exe',str(ROOT/'tools/server.mjs')],cwd=ROOT,env={**os.environ,'PORT':str(PORT)},creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    R['ownedServerPid']=server.pid
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=CHROME,headless=True)
            try:
                R['browserVersion']=browser.version
                ctx=browser.new_context(viewport={'width':1366,'height':768},device_scale_factor=1)
                page=ctx.new_page()
                def finished(req):
                    resp=req.response()
                    if resp is None:return
                    u=urlparse(resp.url)
                    if u.netloc!=f'127.0.0.1:{PORT}':
                        R['externalRequests'].append(resp.url);return
                    if resp.status!=200:return
                    src=ROOT/'web/index.html' if u.path=='/' else (ROOT/u.path.lstrip('/'))
                    if not (u.path=='/' or u.path.startswith('/web/') or u.path.startswith('/src/')):return
                    try:
                        b=resp.body(); match=src.is_file() and b==src.read_bytes()
                        R['requests'].append({'path':u.path,'match':match,'sha256':digest(b)})
                    except Exception as exc:R['requests'].append({'path':u.path,'match':False,'error':str(exc)})
                page.on('requestfinished',finished)
                page.on('pageerror',lambda e:R['pageErrors'].append(str(e)))
                page.goto(URL,wait_until='networkidle',timeout=30000)
                check('D15 ready',page.locator('.training-panel').get_attribute('data-d15-tabs-ready'),'true')
                check('five D15 tabs',page.locator('.d15-tablist [role=tab]').count(),5)
                check('initial selection',selected(page),'d15-tab-session')
                start=count(page)
                page.locator('#d15-tab-session').focus()
                check('session focused',focused(page),'d15-tab-session')
                page.keyboard.press('ArrowRight')
                check('ArrowRight selected help',selected(page),'d15-tab-help')
                check('ArrowRight focus help',focused(page),'d15-tab-help')
                page.keyboard.press('End')
                check('End selected sources',selected(page),'d15-tab-sources')
                check('End focus sources',focused(page),'d15-tab-sources')
                page.keyboard.press('Home')
                check('Home selected session',selected(page),'d15-tab-session')
                check('Home focus session',focused(page),'d15-tab-session')
                page.keyboard.press('ArrowLeft')
                check('ArrowLeft wraps to sources',selected(page),'d15-tab-sources')
                page.keyboard.press('ArrowUp')
                check('D15 ArrowUp not operator event',count(page),start)
                page.keyboard.press('Escape')
                check('D15 Escape not operator event',count(page),start)
                page.keyboard.press('Home')
                page.keyboard.press('Tab')
                check('Tab reaches selected D15 tabpanel',focused(page),'d15-panel-session')
                check('D15 navigation no simulator events',count(page),start)
                check('one selected tab',page.locator('[role=tab][aria-selected=true]').count(),1)
                check('one displayed tabpanel',page.evaluate("Array.from(document.querySelectorAll('.d15-tabpanel')).filter(e=>!e.hidden).length"),1)
                # POWER is not activated during D15 tests; test native zero-detail activation separately in owned browser.
                power=page.locator('#key-power')
                # Keep the before/click/after count in one browser JS turn.
                # Separate Playwright calls could admit the app's periodic world tick,
                # which P18 V1 observed as +3. Preserve the original V1 failure.
                pair_delta=power.evaluate("e => {const counter=document.querySelector('#event-count');const before=Number(counter.textContent);e.click();return Number(counter.textContent)-before;}")
                check('single zero-detail click synchronous physical pair',pair_delta,2)
                check('native click pressing clear',power.evaluate("e=>e.classList.contains('pressing')"),False)
                check('zero external requests',len(R['externalRequests']),0)
                check('zero browser page errors',len(R['pageErrors']),0)
                check('loaded bodies exact SHA',all(r['match'] for r in R['requests']) and len(R['requests'])>=30,True)
                R['loadedBodyCount']=len(R['requests'])
                ctx.close()
            finally:browser.close()
    except Exception as exc:
        R['errors'].append('EXCEPTION '+str(exc));R['traceback']=traceback.format_exc()
    finally:
        server.terminate()
        try:server.wait(timeout=8)
        except subprocess.TimeoutExpired:server.kill();server.wait()
        check('owned QA server cleaned up',server.poll() is not None,True)
        R['status']='PASS_BROWSER_ONLY' if not R['errors'] else 'FAIL_OR_INCOMPLETE_BROWSER_ONLY'
        with OUT.open('x',encoding='utf8') as f:json.dump(R,f,ensure_ascii=False,indent=2);f.write('\n')
        print(json.dumps({'status':R['status'],'passed':sum(x['pass'] for x in R['checks']),'total':len(R['checks']),'errors':R['errors'],'loadedBodyCount':R.get('loadedBodyCount'),'ownedServerExited':server.poll() is not None,'receiptSHA256':digest(OUT.read_bytes())},ensure_ascii=False))
if __name__=='__main__':run()