"""P21 standalone native Chrome focus control, raw CDP not Playwright.
No user profile/server or OS accessibility changes. Browser and server owned.
"""
from pathlib import Path
from hashlib import sha256
from datetime import datetime, timezone
import os, json, subprocess, socket, time, urllib.request, traceback, shutil
import psutil, websocket, win32gui, win32process
ROOT=Path(r'C:\Work\MoPhongMayTrenTau')
QA=Path(__file__).resolve().parent
PORT=4221
DEBUG=9231
TOKEN='FCV588-P21-NATIVE-CHROME-FOCUS-20261117'
NODE=r'C:\nvm4w\nodejs\node.exe'
CHROME=r'C:\Program Files\Google\Chrome\Application\chrome.exe'
P20=ROOT/'docs/qa/FCV588_P20_NATIVE_DIRECT_WINDOWS_20261117/FCV588_P20_NATIVE_DIRECT_WINDOWS_FINAL_INTEGRITY_20261117.json'
P20POST=ROOT/'docs/qa/FCV588_P20_NATIVE_DIRECT_WINDOWS_20261117/FCV588_P20_NATIVE_DIRECT_WINDOWS_INDEPENDENT_SHA_POSTRECEIPT_20261117.json'
OUT=QA/'P21_STANDALONE_CHROME_NATIVE_BLUR_CONTROL_V2_20261117.json'
PROFILE=QA/'_p21_owned_profile_temp'
R={'schema':'FCV588_P21_STANDALONE_CHROME_WIN32_FOCUS_V2','createdAt':datetime.now(timezone.utc).isoformat(),'scope':'DIRECT_CHROME_SPAWNED_INDEPENDENT_OF_PLAYWRIGHT_CONTROL_WITH_CDP_DIAGNOSTICS_NOT_HUMAN_PHYSICAL_KEY','status':'IN_PROGRESS','port':PORT,'debugPort':DEBUG,'stages':{},'errors':[]}

def digest(p):return sha256(Path(p).read_bytes()).hexdigest()
def port_open(port):
 with socket.socket() as s:
  s.settimeout(.2)
  return s.connect_ex(('127.0.0.1',port))==0

def ident(hwnd):
 if not hwnd or not win32gui.IsWindow(hwnd):return None
 try:
  _,pid=win32process.GetWindowThreadProcessId(hwnd)
  try: exe=psutil.Process(pid).exe()
  except Exception: exe='UNREADABLE'
  return {'hwnd':int(hwnd),'pid':pid,'title':win32gui.GetWindowText(hwnd),'exe':exe,'foreground':win32gui.GetForegroundWindow()==hwnd}
 except Exception as e:return {'hwnd':int(hwnd),'error':repr(e)}

def windows_named(token):
 out=[]
 def cb(hwnd,unused):
  if win32gui.IsWindowVisible(hwnd) and token in win32gui.GetWindowText(hwnd):
   i=ident(hwnd)
   if i:out.append(i)
 win32gui.EnumWindows(cb,None)
 return out

def poll_foreground(hwnd,seconds=24):
 until=time.monotonic()+seconds
 while time.monotonic()<until:
  if win32gui.GetForegroundWindow()==hwnd:return True
  time.sleep(.06)
 return win32gui.GetForegroundWindow()==hwnd

class CDP:
 def __init__(self,url):
  self.ws=websocket.create_connection(url,timeout=12,origin=f'http://127.0.0.1:{DEBUG}')
  self.id=0
 def call(self,method,params=None):
  self.id+=1;n=self.id
  self.ws.send(json.dumps({'id':n,'method':method,'params':params or {}}))
  for _ in range(500):
   obj=json.loads(self.ws.recv())
   if obj.get('id')==n:
    if 'error' in obj:raise RuntimeError(f'CDP {method} {obj["error"]}')
    return obj.get('result',{})
  raise TimeoutError('CDP response not found '+method)
 def eval(self,expression):
  data=self.call('Runtime.evaluate',{'expression':expression,'returnByValue':True,'awaitPromise':False})
  if 'exceptionDetails' in data:raise RuntimeError('JS_EXCEPTION '+str(data['exceptionDetails']))
  return data.get('result',{}).get('value')
 def close(self):
  try:self.ws.close()
  except Exception:pass

def chrome_target():
 with urllib.request.urlopen(f'http://127.0.0.1:{DEBUG}/json/list',timeout=2) as r:ls=json.load(r)
 return next((x for x in ls if x.get('type')=='page' and x.get('url','').startswith(f'http://127.0.0.1:{PORT}/')),None)

def snap(cdp):
 return cdp.eval('''(() => ({hasFocus:document.hasFocus(),visibility:document.visibilityState,activeElement:document.activeElement?.id||'',powerPressing:document.querySelector('#key-power')?.classList.contains('pressing'),eventCount:Number(document.querySelector('#event-count')?.textContent||0),status:document.querySelector('#status-line')?.textContent?.trim(),events:window.__p21Events||[]}))()''')

def activate(hwnd,label):
 try:win32gui.SetForegroundWindow(hwnd);R['stages'][label+'SetForegroundError']=None
 except Exception as e:R['stages'][label+'SetForegroundError']=repr(e)
 ok=poll_foreground(hwnd,1.0)
 if not ok:
  print('P21_ACTIVATE_'+label.upper()+' hwnd='+str(hwnd),flush=True)
  ok=poll_foreground(hwnd,24.0)
 R['stages'][label+'Foreground']=ident(win32gui.GetForegroundWindow())
 return ok

def no_new_browser_blur(before,after):
 prior=sum(x['type']=='blur' for x in before['events'])
 return sum(x['type']=='blur' for x in after['events'])<=prior

def main():
 if OUT.exists():raise FileExistsError('write-once P21 receipt already exists')
 assert digest(P20)=='32e27b4e7f0d2b961ce35b0b176abe78385f663790563dd75f7a1ccdc7bc2759'
 assert digest(P20POST)=='0fd9e5ffba3d941c23962810b3c75ffdee20a4068776779152cba09b8d461171'
 p20=json.loads(P20.read_text(encoding='utf8'))
 assert sum(digest(ROOT/k)==v for k,v in p20['canonicalRuntime50SHA256'].items())==50
 assert not PROFILE.exists() and not port_open(PORT) and not port_open(DEBUG) and port_open(4173)
 R['p20FinalSHA256']=digest(P20);R['p20PostSHA256']=digest(P20POST)
 orig=ident(win32gui.GetForegroundWindow());R['originalForeground']=orig
 if not orig:raise RuntimeError('original foreground unavailable')
 server=chrome=None;cdp=None; keydown=False
 try:
  server=subprocess.Popen([NODE,str(ROOT/'tools/server.mjs')],cwd=str(ROOT),env={**os.environ,'PORT':str(PORT)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
  for _ in range(60):
   if port_open(PORT):break
   if server.poll() is not None:raise RuntimeError('QA server exited')
   time.sleep(.1)
  if not port_open(PORT):raise RuntimeError('QA web server not ready')
  PROFILE.mkdir()
  chrome=subprocess.Popen([CHROME,'--user-data-dir='+str(PROFILE),'--remote-debugging-port='+str(DEBUG),'--remote-debugging-address=127.0.0.1','--remote-allow-origins=http://127.0.0.1:'+str(DEBUG),'--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-default-apps','--disable-component-update','--window-size=1050,900','--window-position=90,70','--new-window',f'http://127.0.0.1:{PORT}/'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
  target=None
  for _ in range(75):
   if port_open(DEBUG):
    try:target=chrome_target()
    except Exception:pass
    if target:break
   if chrome.poll() is not None:raise RuntimeError('standalone Chrome process exited')
   time.sleep(.12)
  if not target:raise RuntimeError('Chrome CDP target unavailable')
  R['cdpEndpointLocalhostOnly']=target['webSocketDebuggerUrl'].startswith('ws://127.0.0.1:') or target['webSocketDebuggerUrl'].startswith('ws://localhost:')
  cdp=CDP(target['webSocketDebuggerUrl']);cdp.call('Runtime.enable')
  for _ in range(50):
   if cdp.eval('document.readyState')=='complete':break
   time.sleep(.1)
  R['pageReady']=False
  R['pageProbeInitial']=cdp.eval('''({url:location.href,title:document.title,readyState:document.readyState,bodyCount:document.body?.children?.length,power:!!document.querySelector('#key-power'),training:!!document.querySelector('.training-panel'),head:document.documentElement?.outerHTML?.slice(0,240)})''')
  for _ in range(50):
   R['pageReady']=cdp.eval('document.querySelector("#key-power")!==null && document.querySelector(".training-panel")!==null')
   if R['pageReady']:break
   time.sleep(.1)
  R['pageProbeFinal']=cdp.eval('''({url:location.href,title:document.title,readyState:document.readyState,bodyCount:document.body?.children?.length,power:!!document.querySelector('#key-power'),training:!!document.querySelector('.training-panel'),head:document.documentElement?.outerHTML?.slice(0,240)})''')
  assert R['pageReady'],'FCV588 page missing; see pageProbeInitial/pageProbeFinal'
  cdp.eval('document.title='+json.dumps(TOKEN))
  cdp.eval('''(() => {window.__p21Events=[];for(const type of ['blur','focus'])window.addEventListener(type,e=>window.__p21Events.push({type,stamp:performance.now(),isTrusted:e.isTrusted,documentHasFocus:document.hasFocus()}),true);document.addEventListener('visibilitychange',e=>window.__p21Events.push({type:'visibilitychange',stamp:performance.now(),visibility:document.visibilityState}),true);document.getElementById('btn-pause').click();return true})()''')
  matches=[]
  for _ in range(50):
   matches=[x for x in windows_named(TOKEN) if x.get('exe','').lower()==CHROME.lower()]
   if matches:break
   time.sleep(.12)
  R['targetCandidates']=matches
  if len(matches)!=1:
   R['status']='HARNESS_BLOCKED_STANDALONE_CHROME_HWND'
  else:
   hwnd=matches[0]['hwnd'];R['targetWin32']=matches[0]
   if not activate(hwnd,'chromeControl'):
    R['status']='HARNESS_BLOCKED_STANDALONE_CHROME_FOREGROUND'
   else:
    b=snap(cdp);R['controlBefore']={'fg':ident(win32gui.GetForegroundWindow()),'browser':b}
    if not b['hasFocus']:
     R['status']='HARNESS_BLOCKED_BROWSER_NEVER_HAD_FOCUS'
    else:
     if not activate(orig['hwnd'],'witnessControl'):
      R['status']='HARNESS_BLOCKED_NATIVE_FOREGROUND_SWITCH'
     else:
      time.sleep(.25)
      c=snap(cdp);R['controlAfter']={'fg':ident(win32gui.GetForegroundWindow()),'browser':c}
      blur_control=(not c['hasFocus'] and not no_new_browser_blur(b,c))
      R['controlWin32ForegroundMoved']=win32gui.GetForegroundWindow()==orig['hwnd']
      R['controlBrowserBlurObserved']=blur_control
      if not blur_control:
       R['status']='BROWSER_FOCUS_CONTROL_NOT_OBSERVED_WITHOUT_POWER'
      else:
       if not activate(hwnd,'chromePower'):
        R['status']='HARNESS_BLOCKED_CHROME_POWER_FOREGROUND'
       else:
        cdp.eval('document.getElementById("key-power").focus()')
        bef=snap(cdp);R['powerBefore']=bef
        cdp.call('Input.dispatchKeyEvent',{'type':'rawKeyDown','windowsVirtualKeyCode':32,'nativeVirtualKeyCode':32,'code':'Space','key':' '})
        keydown=True
        down=snap(cdp);R['powerDown']=down
        if not (down['powerPressing'] and down['eventCount']==bef['eventCount']+1):
         R['status']='HARNESS_OR_INPUT_DOWN_GATE_FAILED'
        elif not activate(orig['hwnd'],'witnessPower'):
         R['status']='HARNESS_BLOCKED_POWER_FOREGROUND_TRANSFER'
        else:
         time.sleep(.25)
         aft=snap(cdp);R['powerAfterSwitch']=aft
         blur=(not aft['hasFocus'] and not no_new_browser_blur(down,aft))
         cancel=aft['eventCount']==bef['eventCount']+2 and not aft['powerPressing']
         R['powerWindowBlur']=blur;R['powerCancelOnce']=cancel
         if not blur:R['status']='FAIL_BROWSER_BLUR_AFTER_CONTROL_PASS'
         elif not cancel:R['status']='SOURCE_CANDIDATE_CANCEL_MISSING_AFTER_REAL_BLUR'
         else:R['status']='PASS_NATIVE_WIN32_BLUR_POWER_CANCEL_CDP_INPUT_NOT_HUMAN'
        cdp.call('Input.dispatchKeyEvent',{'type':'keyUp','windowsVirtualKeyCode':32,'nativeVirtualKeyCode':32,'code':'Space','key':' '});keydown=False
        R['powerAfterKeyup']=snap(cdp)
        if R['status'].startswith('PASS_') and R['powerAfterKeyup']['eventCount']!=R['powerAfterSwitch']['eventCount']:
         R['status']='FAIL_STRAY_UP_AFTER_CANCEL'
 except Exception as e:
  R['errors'].append(repr(e));R['traceback']=traceback.format_exc()[-3500:]
  if R['status']=='IN_PROGRESS':R['status']='HARNESS_ERROR'
 finally:
  if cdp:
   if keydown:
    try:cdp.call('Input.dispatchKeyEvent',{'type':'keyUp','windowsVirtualKeyCode':32,'nativeVirtualKeyCode':32,'code':'Space','key':' '})
    except Exception:pass
   cdp.close()
  if chrome:
   try:
    if chrome.poll() is None:chrome.terminate();chrome.wait(timeout=5)
   except Exception:
    try:chrome.kill();chrome.wait(timeout=4)
    except Exception as e:R['errors'].append('chrome cleanup '+repr(e))
   # Close only the uniquely tagged QA profile family, not any user Chrome processes.
   try:
    targets=[]
    for p in psutil.process_iter(['pid','exe','cmdline']):
     try:
      args=p.info['cmdline'] or []
      if p.info['exe'] and p.info['exe'].lower()==CHROME.lower() and str(PROFILE).lower() in ' '.join(args).lower():targets.append(p)
     except (psutil.NoSuchProcess,psutil.AccessDenied):pass
    for p in targets:p.terminate()
    psutil.wait_procs(targets,timeout=5)
   except Exception as e:R['errors'].append('profile process cleanup '+repr(e))
  if server:
   try:server.terminate();server.wait(timeout=5)
   except Exception:
    try:server.kill();server.wait(timeout=3)
    except Exception as e:R['errors'].append('web cleanup '+repr(e))
  if orig and win32gui.IsWindow(orig['hwnd']) and win32gui.GetForegroundWindow()!=orig['hwnd']:
   try:win32gui.SetForegroundWindow(orig['hwnd'])
   except Exception as e:R['errors'].append('restore foreground '+repr(e))
   poll_foreground(orig['hwnd'],.8)
  R['originalForegroundRestored']=orig and win32gui.GetForegroundWindow()==orig['hwnd']
  R['foregroundAfterCleanup']=ident(win32gui.GetForegroundWindow())
  R['qaWebClosed']=not port_open(PORT);R['debugPortClosed']=not port_open(DEBUG);R['protected4173Listening']=port_open(4173)
  R['sourcePostimageMatched']=sum(digest(ROOT/k)==v for k,v in p20['canonicalRuntime50SHA256'].items())
  R['p20FinalUnchanged']=digest(P20)=='32e27b4e7f0d2b961ce35b0b176abe78385f663790563dd75f7a1ccdc7bc2759'
  if PROFILE.exists() and R['debugPortClosed']:
   try:shutil.rmtree(PROFILE)
   except Exception as e:R['errors'].append('owned profile cleanup '+repr(e))
  R['profileRemoved']=not PROFILE.exists()
  if R['status']=='IN_PROGRESS':R['status']='HARNESS_INCOMPLETE'
  with OUT.open('x',encoding='utf-8',newline='\n') as f:json.dump(R,f,ensure_ascii=False,indent=2);f.write('\n')
  print(json.dumps({'status':R['status'],'controlBlur':R.get('controlBrowserBlurObserved'),'powerBlur':R.get('powerWindowBlur'),'qaClosed':R['qaWebClosed'],'debugClosed':R['debugPortClosed'],'server4173':R['protected4173Listening'],'runtimeMatched':R['sourcePostimageMatched'],'foregroundRestored':R['originalForegroundRestored'],'receiptSHA256':digest(OUT)},ensure_ascii=True),flush=True)
if __name__=='__main__':main()