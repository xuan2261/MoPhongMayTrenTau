"""P22: Win32 keyboard input routing (injected, NOT physical human) with owned witness.
One standalone headed Chrome on isolated QA profile + 4222/9232, no Playwright.
No mutation of runtime/user browser/server or Windows accessibility configuration.
"""
from pathlib import Path
from datetime import datetime,timezone
from hashlib import sha256
import os,json,subprocess,time,socket,traceback,urllib.request,shutil,importlib.util
import win32gui,win32api,win32con,psutil
ROOT=Path(r'C:\Work\MoPhongMayTrenTau'); QA=Path(__file__).resolve().parent
MODPATH=ROOT/'docs/qa/FCV588_P21_FOCUS_ROOTCAUSE_20261117/p21_native_chrome_focus_control_v2.py'
spec=importlib.util.spec_from_file_location('p21_utils',MODPATH);p21=importlib.util.module_from_spec(spec);spec.loader.exec_module(p21)
PORT=4222;DEBUG=9232;p21.PORT=PORT;p21.DEBUG=DEBUG
CHROME=r'C:\Program Files\Google\Chrome\Application\chrome.exe';NODE=r'C:\nvm4w\nodejs\node.exe'
TITLE='FCV588-P22-OWNED-CHROME-OS-KEY-20261117'
WITNESS='FCV588-P22-OWNED-KEYBOARD-WITNESS-20261117'
PROFILE=QA/'_p22_chrome_profile_owned_temp'
WITNESS_SCRIPT=QA/'p22_owned_witness.py'
OUT=QA/'P22_WIN32_INJECTED_KEY_NATIVE_FOREGROUND_RECEIPT_20261117.json'
P21=ROOT/'docs/qa/FCV588_P21_FOCUS_ROOTCAUSE_20261117/FCV588_P21_STANDALONE_CHROME_FOCUS_FINAL_INTEGRITY_20261117.json'
P21POST=ROOT/'docs/qa/FCV588_P21_FOCUS_ROOTCAUSE_20261117/FCV588_P21_STANDALONE_CHROME_FOCUS_INDEPENDENT_SHA_POSTRECEIPT_20261117.json'
R={'schema':'FCV588_P22_NATIVE_OS_KEY_INJECTION_V1','dateUTC':datetime.now(timezone.utc).isoformat(),'scope':'WIN32_KEYBD_EVENT_INJECTED_KEY_NOT_PHYSICAL_OPERATOR','port':PORT,'debugPort':DEBUG,'status':'IN_PROGRESS','checks':{},'errors':[]}
def sha(f):return sha256(Path(f).read_bytes()).hexdigest()
def port(n):return p21.port_open(n)
def ident(h):return p21.ident(h)
def windows(t):return p21.windows_named(t)
def poll(h,seconds=1):return p21.poll_foreground(h,seconds)
def keydown():win32api.keybd_event(win32con.VK_SPACE,0x39,0,0)
def keyup():win32api.keybd_event(win32con.VK_SPACE,0x39,win32con.KEYEVENTF_KEYUP,0)
def snap(c):
 return c.eval('''(() => ({hasFocus:document.hasFocus(),visibility:document.visibilityState,active:document.activeElement?.id||'',pressing:!!document.getElementById('key-power')?.classList.contains('pressing'),count:Number(document.getElementById('event-count')?.textContent||0),status:document.getElementById('status-line')?.textContent?.trim(),events:window.__p22Events||[]}))()''')
def win_blur_count(v):return sum(e.get('type')=='blur' and e.get('target')=='window' for e in v['events'])
def attempt(h,stage):
 try:win32gui.SetForegroundWindow(h);R['checks'][stage+'SetForegroundError']=None
 except Exception as e:R['checks'][stage+'SetForegroundError']=repr(e)
 ok=poll(h,0.7)
 if not ok:
  print('P22_ACTIVATE_'+stage.upper()+' hwnd='+str(h),flush=True)
  ok=poll(h,28)
 R['checks'][stage+'Win32Foreground']=ok
 return ok

def main():
 if OUT.exists():raise FileExistsError('P22 receipt already exists')
 assert sha(P21)=='d28130041496e487f76048e3145f7fb97f475ed9b56d5787aa462ade976fa876'
 assert sha(P21POST)=='d2afcc24f0789bba2754f5fd87f60ede20b34e0f1618095ddf8e48256be4e140'
 p=json.loads(P21.read_text(encoding='utf8'))
 assert len(p['canonicalRuntime50SHA256'])==50
 assert all(sha(ROOT/k)==v for k,v in p['canonicalRuntime50SHA256'].items())
 assert not PROFILE.exists() and not port(PORT) and not port(DEBUG) and port(4173)
 R['parentSHA']={'P21Final':sha(P21),'P21Post':sha(P21POST)}
 original=ident(win32gui.GetForegroundWindow());R['originalForeground']=original
 if not original:raise RuntimeError('Original native foreground missing')
 server=witness=chrome=cdp=None;held=False
 try:
  server=subprocess.Popen([NODE,str(ROOT/'tools/server.mjs')],cwd=str(ROOT),env={**os.environ,'PORT':str(PORT)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
  for _ in range(70):
   if port(PORT):break
   if server.poll() is not None:raise RuntimeError('QA server exited')
   time.sleep(.1)
  if not port(PORT):raise RuntimeError('QA server not ready')
  witness=subprocess.Popen([os.sys.executable,str(WITNESS_SCRIPT)],cwd=str(QA),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
  wins=[]
  for _ in range(70):
   wins=[w for w in windows(WITNESS) if w.get('pid')==witness.pid]
   if wins:break
   if witness.poll() is not None:raise RuntimeError('QA witness exited')
   time.sleep(.1)
  R['witnessCandidates']=wins
  if len(wins)!=1:raise RuntimeError('QA witness top-level HWND not uniquely bound')
  wh=wins[0]['hwnd']
  PROFILE.mkdir()
  chrome=subprocess.Popen([CHROME,'--user-data-dir='+str(PROFILE),'--remote-debugging-port='+str(DEBUG),'--remote-debugging-address=127.0.0.1','--remote-allow-origins=http://127.0.0.1:'+str(DEBUG),'--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-default-apps','--disable-component-update','--window-size=1050,900','--window-position=90,70','--new-window',f'http://127.0.0.1:{PORT}/'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
  target=None
  for _ in range(85):
   if port(DEBUG):
    try:target=p21.chrome_target()
    except Exception:pass
    if target:break
   if chrome.poll() is not None:raise RuntimeError('QA Chrome exited')
   time.sleep(.1)
  if not target:raise RuntimeError('QA Chrome CDP target missing')
  R['debugTarget']=target.get('url')
  cdp=p21.CDP(target['webSocketDebuggerUrl']);cdp.call('Runtime.enable')
  ready=False
  for _ in range(80):
   ready=cdp.eval('!!document.getElementById("key-power")&&!!document.querySelector(".training-panel")&&document.readyState==="complete"')
   if ready:break
   time.sleep(.1)
  if not ready:raise RuntimeError('FCV588 DOM not loaded')
  cdp.eval('document.title='+json.dumps(TITLE))
  R['browserVersion']=cdp.eval('navigator.userAgent')
  cdp.eval('''(() => {window.__p22Events=[];for(const typ of ['focus','blur'])window.addEventListener(typ,e=>window.__p22Events.push({type:typ,target:e.target===window?'window':e.target?.id||e.target?.tagName||'other',trusted:e.isTrusted,ms:performance.now(),focus:document.hasFocus()}),true);document.addEventListener('visibilitychange',e=>window.__p22Events.push({type:'visibilitychange',visible:document.visibilityState,ms:performance.now()}),true);document.addEventListener('keydown',e=>window.__p22Events.push({type:'keydown',key:e.key,code:e.code,target:e.target?.id||'',trusted:e.isTrusted,ms:performance.now()}),true);document.addEventListener('keyup',e=>window.__p22Events.push({type:'keyup',key:e.key,code:e.code,target:e.target?.id||'',trusted:e.isTrusted,ms:performance.now()}),true);document.getElementById('btn-pause').click();return true})()''')
  cw=[]
  for _ in range(70):
   cw=[w for w in windows(TITLE) if w.get('exe','').lower()==CHROME.lower()]
   if cw:break
   time.sleep(.1)
  R['chromeCandidates']=cw
  if len(cw)!=1:raise RuntimeError('Chrome HWND ambiguous')
  ch=cw[0]['hwnd']
  if not attempt(ch,'chrome'):
   R['status']='HARNESS_BLOCKED_CHROME_FOREGROUND'
  else:
   cdp.eval('document.getElementById("key-power").focus()')
   focused=False
   for _ in range(40):
    v=snap(cdp)
    if v['hasFocus'] and v['visibility']=='visible' and v['active']=='key-power' and win32gui.GetForegroundWindow()==ch:focused=True;break
    time.sleep(.06)
   R['beforeKey']={'browser':snap(cdp),'win32':ident(win32gui.GetForegroundWindow())}
   if not focused:
    R['status']='HARNESS_BLOCKED_BROWSER_FOCUS_PRECONDITION'
   else:
    n=R['beforeKey']['browser']['count']
    keydown();held=True
    down=None
    for _ in range(24):
     down=snap(cdp)
     if down['count']==n+1 and down['pressing']:break
     time.sleep(.04)
    R['afterNativeKeyDown']={'browser':down,'win32':ident(win32gui.GetForegroundWindow())}
    downok=bool(down and down['count']==n+1 and down['pressing'] and any(e['type']=='keydown' and e.get('key')==' ' and e.get('trusted') for e in down['events']))
    R['checks']['osInjectedSpaceDownDelivered']=downok
    if not downok:
     R['status']='HARNESS_OR_BROWSER_OS_KEYDOWN_NOT_OBSERVED'
    else:
     if not attempt(wh,'witness'):
      R['status']='HARNESS_BLOCKED_WITNESS_FOREGROUND'
     else:
      after=None
      for _ in range(45):
       after=snap(cdp)
       if not after['hasFocus'] and after['count']==n+2 and not after['pressing']:break
       time.sleep(.04)
      R['afterNativeFocusSwitch']={'browser':after,'win32':ident(win32gui.GetForegroundWindow())}
      R['checks']['windowBlurStrict']=win_blur_count(after)>win_blur_count(down)
      R['checks']['hasFocusFalse']=after['hasFocus'] is False
      R['checks']['visibilityHidden']=after['visibility']=='hidden'
      R['checks']['cancelOnce']=after['count']==n+2 and not after['pressing']
      R['checks']['powerStatusUnchanged']=after['status']==R['beforeKey']['browser']['status']
      # KEYUP OS injected to the QA-owned witness, not a user window.
      keyup();held=False
      R['osKeyUpTargetWin32']=ident(win32gui.GetForegroundWindow())
      time.sleep(.12)
      up=snap(cdp);R['afterNativeKeyUp']={'browser':up,'win32':ident(win32gui.GetForegroundWindow())}
      R['checks']['noExtraBrowserUp']=up['count']==n+2 and not up['pressing']
      R['checks']['noBrowserKeyupDelivered']=not any(e['type']=='keyup' and e.get('key')==' ' and e['ms']>down['events'][-1].get('ms',0) for e in up['events'])
      if all(R['checks'].get(k,False) for k in ['windowBlurStrict','hasFocusFalse','visibilityHidden','cancelOnce','powerStatusUnchanged','noExtraBrowserUp']):
       R['status']='P22_PASS_WIN32_INJECTED_SPACE_AND_NATIVE_FOCUS_CANCEL_NOT_HUMAN_PHYSICAL'
      else:R['status']='P22_FAIL_OS_KEY_FOCUS_CANCEL_OR_HARNESS'
 except Exception as e:
  R['errors'].append(repr(e));R['traceback']=traceback.format_exc()[-3200:]
  if R['status']=='IN_PROGRESS':R['status']='HARNESS_EXCEPTION'
 finally:
  if held:
   try:keyup();R['emergencyKeyUp']=True
   except Exception as e:R['errors'].append('emergencykeyup '+repr(e))
  if cdp:
   try:cdp.close()
   except Exception:pass
  if chrome:
   try:
    if chrome.poll() is None:chrome.terminate();chrome.wait(timeout=5)
   except Exception:
    try:chrome.kill();chrome.wait(timeout=3)
    except Exception as e:R['errors'].append('Chrome cleanup '+repr(e))
   # Match full QA profile argument, never terminate non-owned Chrome user processes.
   ps=[]
   for proc in psutil.process_iter(['pid','exe','cmdline']):
    try:
     if (proc.info['exe'] or '').lower()==CHROME.lower() and str(PROFILE).lower() in ' '.join(proc.info['cmdline'] or []).lower():ps.append(proc)
    except (psutil.NoSuchProcess,psutil.AccessDenied):pass
   for proc in ps:
    try:proc.terminate()
    except Exception:pass
   psutil.wait_procs(ps,timeout=5)
  if witness:
   try:
    if witness.poll() is None:witness.terminate();witness.wait(timeout=4)
   except Exception:
    try:witness.kill();witness.wait(timeout=3)
    except Exception as e:R['errors'].append('witness cleanup '+repr(e))
  if server:
   try:server.terminate();server.wait(timeout=6)
   except Exception:
    try:server.kill();server.wait(timeout=3)
    except Exception as e:R['errors'].append('server cleanup '+repr(e))
  if original and win32gui.IsWindow(original['hwnd']) and win32gui.GetForegroundWindow()!=original['hwnd']:
   try:win32gui.SetForegroundWindow(original['hwnd'])
   except Exception as e:R['errors'].append('foreground restore '+repr(e))
   poll(original['hwnd'],1)
  R['originalForegroundRestored']=bool(original and win32gui.GetForegroundWindow()==original['hwnd'])
  R['foregroundAfterCleanup']=ident(win32gui.GetForegroundWindow())
  R['portsClosed']={'server4222':not port(PORT),'debug9232':not port(DEBUG),'user4173':port(4173)}
  R['canonicalSourceMatched']=sum(sha(ROOT/k)==v for k,v in p['canonicalRuntime50SHA256'].items())
  R['parentP21FinalUnchanged']=sha(P21)=='d28130041496e487f76048e3145f7fb97f475ed9b56d5787aa462ade976fa876'
  if PROFILE.exists() and R['portsClosed']['debug9232']:
   try:shutil.rmtree(PROFILE)
   except Exception as e:R['errors'].append('profile cleanup '+repr(e))
  R['ownedProfileRemoved']=not PROFILE.exists()
  if R['status']=='IN_PROGRESS':R['status']='HARNESS_INCOMPLETE'
  with OUT.open('x',encoding='utf8',newline='\n') as f:json.dump(R,f,ensure_ascii=False,indent=2);f.write('\n')
  print(json.dumps({'status':R['status'],'checks':R['checks'],'QAClosed':R['portsClosed'],'source':R['canonicalSourceMatched'],'foregroundRestored':R['originalForegroundRestored'],'profileRemoved':R['ownedProfileRemoved'],'receiptSHA256':sha(OUT)},ensure_ascii=True),flush=True)
if __name__=='__main__':main()