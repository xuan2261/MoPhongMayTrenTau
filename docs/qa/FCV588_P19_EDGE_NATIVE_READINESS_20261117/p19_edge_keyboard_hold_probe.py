"""P19 isolated Edge 157 browser-only D15 + POWER focus-loss keyboard probe.
No Windows native screen reader or actual browser window.blur is claimed.
One-owned loopback 4219; never touches user port4173/profile/Windows settings.
"""
from pathlib import Path
from hashlib import sha256
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
import socket, subprocess, os, json, traceback
ROOT=Path(r'C:\Work\MoPhongMayTrenTau')
QA=Path(__file__).resolve().parent
PORT=4219
OUT=QA/'P19_EDGE_D15_KEYBOARD_HOLD_GATE_20261117.json'
EXE=Path(r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe')
R={'schema':'FCV588_P19_EDGE_D15_KEYBOARD_HOLD_BROWSER_ONLY_V1', 'scope':'EDGE157_HEADLESS_1366x768_BROWSER_ONLY_NOT_NATIVE_UIA_SPEECH_HC_OR_GENUINE_WINDOW_BLUR', 'port':PORT,'checks':[],'errors':[],'responses':[],'externalRequests':[],'pageErrors':[]}
def sha(data):return sha256(data).hexdigest()
def check(name,actual,expected):
 ok=actual==expected
 R['checks'].append({'name':name,'pass':ok,'observed':actual,'expected':expected})
 if not ok:R['errors'].append(name)
def getcount(page):return int(page.locator('#event-count').inner_text())
def selected(page):return page.locator('[role=tab][aria-selected=true]').get_attribute('id')
def focused(page):return page.evaluate('document.activeElement?.id')
def run():
 if OUT.exists():raise FileExistsError('write-once receipt exists')
 with socket.socket() as sk:
  if sk.connect_ex(('127.0.0.1',PORT))==0:raise RuntimeError('QA port occupied; no ownership')
 if not EXE.is_file():raise FileNotFoundError(EXE)
 server=subprocess.Popen([r'C:\nvm4w\nodejs\node.exe',str(ROOT/'tools/server.mjs')],cwd=ROOT,env={**os.environ,'PORT':str(PORT)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 R['ownedServerPid']=server.pid
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path=str(EXE),headless=True)
   try:
    R['edgeVersion']=browser.version
    context=browser.new_context(viewport={'width':1366,'height':768},device_scale_factor=1)
    page=context.new_page()
    def finished(req):
     response=req.response()
     if response is None:return
     uri=urlparse(response.url)
     if uri.netloc!=f'127.0.0.1:{PORT}':
      R['externalRequests'].append(response.url);return
     if response.status!=200:return
     path=uri.path
     if path=='/':src=ROOT/'web/index.html'
     elif path.startswith('/src/') or path.startswith('/web/'):src=ROOT/path.lstrip('/')
     else:return
     try:
      raw=response.body();valid=src.is_file() and raw==src.read_bytes()
      R['responses'].append({'path':path,'sha256':sha(raw),'sourceSHA256':sha(src.read_bytes()) if src.is_file() else None,'match':valid})
     except Exception as exc:R['responses'].append({'path':path,'match':False,'error':str(exc)})
    page.on('requestfinished',finished)
    page.on('pageerror',lambda error:R['pageErrors'].append(str(error)))
    page.goto(f'http://127.0.0.1:{PORT}/',wait_until='networkidle',timeout=30000)
    page.locator('#btn-pause').click()  # instructor-only UI clock pause, avoids unrelated world ticks
    R['initialEventCount']=getcount(page)
    check('D15 enhancement bound',page.locator('.training-panel').get_attribute('data-d15-tabs-ready'),'true')
    check('five D15 ARIA tabs',page.locator('.d15-tablist [role="tab"]').count(),5)
    check('five D15 ARIA panels',page.locator('.d15-tabpanel[role="tabpanel"]').count(),5)
    check('D15 aria label',page.locator('.d15-tablist').get_attribute('aria-label'),'Nhóm công cụ giảng viên D15')
    check('initial D15 tab',selected(page),'d15-tab-session')
    for id,expected in [('session','Phiên'),('help','Trợ giúp'),('fixtures','Tình huống'),('lessons','Bài học'),('sources','Nguồn & QA')]:
     tab=page.locator('#d15-tab-'+id)
     check('D15 tab name '+id,tab.inner_text().strip(),expected)
     check('D15 tab link '+id,tab.get_attribute('aria-controls'),'d15-panel-'+id)
    start=getcount(page)
    page.locator('#d15-tab-session').focus()
    check('D15 focus initially session',focused(page),'d15-tab-session')
    page.keyboard.press('ArrowRight')
    check('Edge arrowRight moves help selection',selected(page),'d15-tab-help')
    check('Edge arrowRight focus help',focused(page),'d15-tab-help')
    check('Edge help panel visible',page.locator('#d15-panel-help').evaluate('e=>!e.hidden'),True)
    page.keyboard.press('End')
    check('Edge End selects sources',selected(page),'d15-tab-sources')
    page.keyboard.press('Home')
    check('Edge Home selects session',selected(page),'d15-tab-session')
    page.keyboard.press('ArrowLeft')
    check('Edge ArrowLeft wraps sources',selected(page),'d15-tab-sources')
    page.keyboard.press('Escape')
    page.keyboard.press('ArrowUp')
    check('Edge D15 Escape and ArrowUp do not dispatch machine event',getcount(page),start)
    page.keyboard.press('Home')
    page.keyboard.press('Tab')
    check('Edge Tab reaches selected instructor panel',focused(page),'d15-panel-session')
    check('Edge exactly one selected D15 tab',page.locator('[role="tab"][aria-selected="true"]').count(),1)
    check('Edge exactly one visible D15 tabpanel',page.evaluate("Array.from(document.querySelectorAll('.d15-tabpanel')).filter(e=>!e.hidden).length"),1)
    power=page.locator('#key-power');func=page.locator('#key-func')
    check('POWER has descriptive accessible name',power.get_attribute('aria-label'),'Nguồn và độ sáng; nhấn giữ hơn 3 giây mô phỏng để tắt')
    baseline=getcount(page)
    power.focus()
    page.keyboard.down('Space')
    check('Edge POWER physical-key down edge',getcount(page)-baseline,1)
    check('Edge POWER pressing active after keydown',power.evaluate('e=>e.classList.contains("pressing")'),True)
    func.focus()  # input focus loss without real browser window.blur; no synthetic DOM blur dispatch
    check('Edge keyboard focus-loss cancel edge',getcount(page)-baseline,2)
    check('Edge POWER pressing cleared on button blur',power.evaluate('e=>e.classList.contains("pressing")'),False)
    page.keyboard.up('Space')
    check('Edge post-cancel keyup does not duplicate input',getcount(page)-baseline,2)
    check('Edge no input validation error',page.locator('#validation-status').inner_text().startswith('Lỗi input đã chặn'),False)
    # Synchronous JS gate so periodic timers cannot enter between before/after reads.
    zero_delta=power.evaluate("e=>{const c=document.getElementById('event-count');const n=Number(c.textContent);e.click();return Number(c.textContent)-n;}")
    check('Edge zero-detail programmatic button activation emits exactly down/up',zero_delta,2)
    check('Edge zero-detail POWER leaves no pressing state',power.evaluate('e=>e.classList.contains("pressing")'),False)
    check('no JS page errors',len(R['pageErrors']),0)
    check('no external network request',len(R['externalRequests']),0)
    check('Edge loaded HTTP body exact SHA and unique paths',bool(len(R['responses'])>=30 and len(R['responses'])==len({x['path'] for x in R['responses']}) and all(x['match'] for x in R['responses'])),True)
    R['httpBodyCount']=len(R['responses'])
    context.close()
   finally:browser.close()
 except Exception as exc:
  R['errors'].append('EXCEPTION '+str(exc));R['traceback']=traceback.format_exc()
 finally:
  server.terminate()
  try:server.wait(timeout=8)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  check('only owned QA server exited',server.poll() is not None,True)
  R['status']='PASS_BROWSER_ONLY' if not R['errors'] else 'FAIL_OR_INCOMPLETE_BROWSER_ONLY'
  with OUT.open('x',encoding='utf8') as fp:json.dump(R,fp,ensure_ascii=False,indent=2);fp.write('\n')
  print(json.dumps({'status':R['status'],'passed':sum(x['pass'] for x in R['checks']),'checks':len(R['checks']),'httpBodies':R.get('httpBodyCount'), 'errors':R['errors'],'receiptSHA256':sha(OUT.read_bytes())},ensure_ascii=False))
if __name__=='__main__':run()