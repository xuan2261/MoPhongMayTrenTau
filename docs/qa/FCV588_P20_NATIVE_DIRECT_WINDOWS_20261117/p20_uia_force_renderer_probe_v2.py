"""P20 Windows native UIAutomation target-app read with Chrome force-renderer-accessibility; no OS setting or screen reader."""
from pathlib import Path
from hashlib import sha256
from datetime import datetime,timezone
from playwright.sync_api import sync_playwright
import importlib.util,json,socket,subprocess,os,time,traceback
ROOT=Path(r'C:\Work\MoPhongMayTrenTau');QA=Path(__file__).resolve().parent
source=QA/'p20_windows_native_direct_probe_v4.py'
spec=importlib.util.spec_from_file_location('p20_native_utils',source)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
OUT=QA/'P20_WINDOWS_NATIVE_UIA_FORCE_RENDERER_V2_20261117.json'
P19=ROOT/'docs/qa/FCV588_P19_EDGE_NATIVE_READINESS_20261117/FCV588_P19_EDGE_NATIVE_READINESS_FINAL_INTEGRITY_20261117.json'
PORT=4220;CHROME=r'C:\Program Files\Google\Chrome\Application\chrome.exe';TITLE='FCV588-P20-NATIVE-UIA-20261117'
def sha(p):return sha256(Path(p).read_bytes()).hexdigest()
R={'schema':'FCV588_P20_WINDOWS_NATIVE_UIA_FORCE_RENDERER_V2','createdAt':datetime.now(timezone.utc).isoformat(),'scope':'WINDOWS_UIAUTOMATION_FROM_REAL_CHROME_HWND_NOT_NARRATOR_SPEECH','status':'IN_PROGRESS','port':PORT,'forceRendererAccessibility':True,'errors':[]}
if OUT.exists():raise FileExistsError('P20 UIA evidence exists')
assert sha(P19)=='1fc1b43ced49b9c9d630218ee3c9211573b0e00474f207ba3aa5f0e864158f11'
p19=json.loads(P19.read_text(encoding='utf8'))
assert len(p19['canonicalRuntime50SHA256'])==50
assert all(sha(ROOT/k)==v for k,v in p19['canonicalRuntime50SHA256'].items())
assert mod.port_open(4173) and not mod.port_open(PORT)
original=mod.ident(__import__('win32gui').GetForegroundWindow());R['originalForeground']=original
server=None;browser=None
try:
 server=subprocess.Popen([r'C:\nvm4w\nodejs\node.exe',str(ROOT/'tools/server.mjs')],cwd=ROOT,env={**os.environ,'PORT':str(PORT)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 for _ in range(60):
  if mod.port_open(PORT):break
  if server.poll() is not None:raise RuntimeError('owned server exited early')
  time.sleep(.1)
 if not mod.port_open(PORT):raise RuntimeError('owned QA server did not open')
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=CHROME,headless=False,args=['--force-renderer-accessibility','--no-first-run','--no-default-browser-check','--window-size=1050,900','--window-position=90,70'])
  R['browserVersion']=browser.version
  ctx=browser.new_context(viewport={'width':980,'height':730})
  page=ctx.new_page();page.goto(f'http://127.0.0.1:{PORT}/',wait_until='networkidle',timeout=30000)
  page.evaluate('(t)=>document.title=t',TITLE)
  R['dom']={'enhanced':page.locator('.training-panel').get_attribute('data-d15-tabs-ready'),'tabNames':page.locator('.d15-tablist [role=tab]').all_inner_texts(),'powerLabel':page.locator('#key-power').get_attribute('aria-label'),'funcLabel':page.locator('#key-func').get_attribute('aria-label')}
  matches=[]
  for _ in range(40):
   matches=mod.windows_named(TITLE)
   if matches:break
   time.sleep(.15)
  R['windowCandidates']=matches
  ch=[w for w in matches if w.get('exe','').lower()==CHROME.lower()]
  if len(ch)!=1:R['status']='BLOCKED_NATIVE_UIA_TARGET_HWND'
  else:
   R['targetWindow']=ch[0]
   # Native PowerShell UIA JSON may include UTF-8 names not representable in
   # the shell's cp1252 default decoder. Preserve the exact observation and
   # avoid harness reader-thread decode failures; not a product correction.
   original_run=mod.subprocess.run
   def utf8_run(*args,**kwargs):
    kwargs.setdefault('encoding','utf-8');kwargs.setdefault('errors','replace')
    return original_run(*args,**kwargs)
   mod.subprocess.run=utf8_run
   try:R['nativeUIAutomation']=mod.read_uia(ch[0]['hwnd'])
   finally:mod.subprocess.run=original_run
   R['status']='NATIVE_UIA_OBSERVED' if R['nativeUIAutomation']['status']=='OBSERVED' else 'BLOCKED_NATIVE_UIA_BRIDGE'
  ctx.close();browser.close();browser=None
except Exception as e:
 R['status']='HARNESS_ERROR';R['errors'].append(repr(e));R['traceback']=traceback.format_exc()[-1800:]
finally:
 if browser is not None:
  try:browser.close()
  except Exception:pass
 if server is not None:
  try:server.terminate();server.wait(timeout=7)
  except Exception:
   try:server.kill();server.wait(timeout=5)
   except Exception as e:R['errors'].append('QA server cleanup '+repr(e))
 R['qaPortClosed']=not mod.port_open(PORT);R['protected4173StillListening']=mod.port_open(4173)
 R['sourcePostSHAcount']=sum(sha(ROOT/k)==v for k,v in p19['canonicalRuntime50SHA256'].items())
 R['originalForegroundUnchanged']=__import__('win32gui').GetForegroundWindow()==original['hwnd']
 with OUT.open('x',encoding='utf8',newline='\n') as f:json.dump(R,f,indent=2,ensure_ascii=False);f.write('\n')
 print(json.dumps({'status':R['status'],'windowBound':len(R.get('windowCandidates',[])),'uiaStatus':R.get('nativeUIAutomation',{}).get('status'),'uiaMatches':R.get('nativeUIAutomation',{}).get('data',{}).get('matches',[]),'uiaDescendants':R.get('nativeUIAutomation',{}).get('data',{}).get('descendants'),'cleanup':R['qaPortClosed'],'runtimeSHA':R['sourcePostSHAcount'],'receiptSHA256':sha(OUT)},ensure_ascii=False))