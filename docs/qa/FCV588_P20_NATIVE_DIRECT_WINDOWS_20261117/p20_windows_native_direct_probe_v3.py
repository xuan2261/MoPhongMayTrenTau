"""P20 Windows headed Chrome native UIA/POWER Win32 blur direct on current desktop.
User-authorized direct test; user port4173, browser profiles, Narrator and HC untouched.
Fail-closed HWND, foreground and browser blur evidence; QA port4220 test-owned.
"""
from pathlib import Path
from hashlib import sha256
from datetime import datetime,timezone
import json,os,time,socket,subprocess,traceback,base64,tkinter
import win32gui,win32process,win32con,psutil
from playwright.sync_api import sync_playwright
ROOT=Path(r'C:\Work\MoPhongMayTrenTau'); QA=Path(__file__).resolve().parent
NODE=r'C:\nvm4w\nodejs\node.exe';CHROME=r'C:\Program Files\Google\Chrome\Application\chrome.exe'
PORT=4220;TOKEN='FCV588-P20-DIRECT-WINDOWS-QA-20261117';OUT=QA/'P20_WINDOWS_NATIVE_DIRECT_V3_RECEIPT_20261117.json'
P19=ROOT/'docs/qa/FCV588_P19_EDGE_NATIVE_READINESS_20261117/FCV588_P19_EDGE_NATIVE_READINESS_FINAL_INTEGRITY_20261117.json'
P19POST=ROOT/'docs/qa/FCV588_P19_EDGE_NATIVE_READINESS_20261117/FCV588_P19_EDGE_NATIVE_READINESS_INDEPENDENT_POSTRECEIPT_20261117.json'
EXPECTED_P19='1fc1b43ced49b9c9d630218ee3c9211573b0e00474f207ba3aa5f0e864158f11'
EXPECTED_P19POST='1824e63e7b54c88801a002adf2758203ea1c4ce750fed2f48c822f2ab9a3a83b'
JS="""(() => {window.__p20Native=[]; ['focus','blur'].forEach(type=>window.addEventListener(type,e=>window.__p20Native.push({type,ms:performance.now(),trusted:e.isTrusted,hasFocus:document.hasFocus(),powerPressing:document.querySelector('#key-power')?.classList.contains('pressing'),eventCount:Number(document.querySelector('#event-count')?.textContent||0)}),true));})()"""
R={'schema':'FCV588_P20_NATIVE_WIN32_UIA_DIRECT_V3','createdAt':datetime.now(timezone.utc).isoformat(),'port':PORT,'status':'IN_PROGRESS','gates':{},'issues':[],'scope':'WINDOWS_HEADED_CHROME_NATIVE_FOREGROUND_UIA_AUTOMATED_KEYBOARD_NOT_HUMAN_PHYSICAL_SPEECH'}
def sha(p):return sha256(Path(p).read_bytes()).hexdigest()
def port_open(n):
 with socket.socket() as s:
  s.settimeout(.3);return s.connect_ex(('127.0.0.1',n))==0
def ident(hwnd):
 if not hwnd:return None
 try:
  _,pid=win32process.GetWindowThreadProcessId(hwnd)
  try:exe=psutil.Process(pid).exe()
  except Exception:exe='UNREADABLE'
  return {'hwnd':hwnd,'pid':pid,'exe':exe,'title':win32gui.GetWindowText(hwnd),'foreground':win32gui.GetForegroundWindow()==hwnd}
 except Exception as e:return {'hwnd':hwnd,'error':repr(e)}
def windows_named(token):
 out=[]
 def cb(hwnd,extra):
  try:
   if win32gui.IsWindowVisible(hwnd) and token in win32gui.GetWindowText(hwnd):out.append(ident(hwnd))
  except Exception:pass
 win32gui.EnumWindows(cb,None)
 return out
def snap(page):
 return page.evaluate("""() => ({hasFocus:document.hasFocus(),activeElement:document.activeElement?.id||'',pressing:document.querySelector('#key-power')?.classList.contains('pressing'),eventCount:Number(document.querySelector('#event-count')?.textContent||0),status:document.querySelector('#status-line')?.textContent?.trim(),powerOff:!document.querySelector('#off-screen')?.hidden,events:window.__p20Native||[]})""")
def sample_win32(page=None):
 fg=win32gui.GetForegroundWindow();return {'foreground':ident(fg),'page':snap(page) if page else None}
def poll_foreground(hwnd,timeout=.8):
 deadline=time.monotonic()+timeout
 while time.monotonic()<deadline:
  if win32gui.GetForegroundWindow()==hwnd:return True
  time.sleep(.04)
 return win32gui.GetForegroundWindow()==hwnd
def read_uia(hwnd):
 # Windows UI Automation native inspection, NOT CDP tree or Narrator speech.
 ps=r'''Add-Type -AssemblyName UIAutomationClient; Add-Type -AssemblyName UIAutomationTypes
$h=[IntPtr]::new(__HWND__);$root=[System.Windows.Automation.AutomationElement]::FromHandle($h);
if($null -eq $root){throw 'UIAutomation.FromHandle returned null'}
$all=$root.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition);
$items=New-Object System.Collections.ArrayList;
for($i=0;$i -lt $all.Count -and $i -lt 1800;$i++){
 try{$e=$all.Item($i);$name=[string]$e.Current.Name;$typ=$e.Current.ControlType.ProgrammaticName;$id=[string]$e.Current.AutomationId;
 if(($name -match 'Nguồn và độ sáng|FUNC|Phiên|Trợ giúp|Tình huống|Bài học|Nguồn & QA|Nhóm công cụ giảng viên|MODE|GAIN') -or ($typ -eq 'ControlType.TabItem')){
 [void]$items.Add([pscustomobject]@{name=$name;controlType=$typ;automationId=$id;isEnabled=$e.Current.IsEnabled})}
 }catch{}
}
[pscustomobject]@{rootName=$root.Current.Name;rootControlType=$root.Current.ControlType.ProgrammaticName;descendants=$all.Count;scanned=[Math]::Min(1800,$all.Count);matches=@($items)}|ConvertTo-Json -Compress -Depth 7'''
 ps=ps.replace('__HWND__',str(hwnd))
 encoded=base64.b64encode(ps.encode('utf-16le')).decode('ascii')
 p=subprocess.run(['powershell.exe','-NoProfile','-NonInteractive','-EncodedCommand',encoded],capture_output=True,text=True,timeout=28,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 if p.returncode: return {'status':'ERROR','code':p.returncode,'stderr':p.stderr[-1200:],'stdout':p.stdout[-1200:]}
 try:return {'status':'OBSERVED','data':json.loads(p.stdout)}
 except Exception as e:return {'status':'PARSE_ERROR','stdout':p.stdout[-1400:],'error':repr(e)}
def main():
 if OUT.exists():raise FileExistsError('P20 receipt already exists')
 if sha(P19)!=EXPECTED_P19 or sha(P19POST)!=EXPECTED_P19POST:raise RuntimeError('P19 sealed parent drift')
 parent=json.loads(P19.read_text(encoding='utf8'))
 drift=[rel for rel,expected in parent['canonicalRuntime50SHA256'].items() if sha(ROOT/rel)!=expected]
 if drift:raise RuntimeError('canonical SHA drift '+repr(drift))
 if port_open(PORT) or not port_open(4173):raise RuntimeError('QA port owned or protected server unavailable')
 R['parentSHA256']={'p19Final':sha(P19),'p19Post':sha(P19POST)}
 R['sourcePreimage']='50/50';R['originalForeground']=ident(win32gui.GetForegroundWindow())
 browser=None;server=None;tk=None;page=None;held=False;owned_chrome=None
 try:
  server=subprocess.Popen([NODE,str(ROOT/'tools/server.mjs')],cwd=ROOT,env={**os.environ,'PORT':str(PORT)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
  for _ in range(60):
   if port_open(PORT):break
   if server.poll() is not None:raise RuntimeError('owned QA server terminated')
   time.sleep(.1)
  if not port_open(PORT):raise RuntimeError('QA server startup failed')
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path=CHROME,headless=False,args=['--no-first-run','--no-default-browser-check','--window-size=1050,900','--window-position=90,70'])
   ctx=browser.new_context(viewport={'width':980,'height':730},device_scale_factor=1)
   ctx.add_init_script(JS)
   page=ctx.new_page();page.goto('http://127.0.0.1:'+str(PORT)+'/',wait_until='networkidle',timeout=30000)
   page.evaluate('(t)=>{document.title=t}',TOKEN)
   page.locator('#btn-pause').click() # no synthetic World tick during POWER-down, no lasting user changes
   R['browserVersion']=browser.version
   matches=windows_named(TOKEN)
   if not matches:
    page.bring_to_front()
    for _ in range(45):
     time.sleep(.12)
     matches=windows_named(TOKEN)
     if matches:break
   R['chromeWindowCandidates']=matches
   if not matches:
    R['chromeWindowDiagnostics']=[w for w in windows_named('Google Chrome') if w]
   print('P20_V3_WINDOW_QUERY matches='+str(len(matches)),flush=True)
   chrome_candidates=[w for w in matches if w and w.get('exe','').lower()==CHROME.lower()]
   R['gates']['uniqueChromeHwnd']=len(chrome_candidates)==1
   if len(chrome_candidates)!=1:
    R['status']='HARNESS_BLOCKED_CHROME_HWND_NOT_BOUND'
   else:
    owned_chrome=chrome_candidates[0]['hwnd'];R['chromeWindow']=chrome_candidates[0]
    # UIA native check while window is live; this reads the app via HWND.
    try:R['uia']=read_uia(owned_chrome)
    except Exception as e:R['uia']={'status':'ERROR','error':repr(e)}
    R['gates']['uiaInspected']=R['uia'].get('status')=='OBSERVED'
    # Create an owned witness but keep hidden until after POWER hold starts.
    tk=tkinter.Tk();tk.withdraw();tk.title('FCV588-P20-OWNED-FOCUS-WITNESS');tk.geometry('360x130+55+65');tkinter.Label(tk,text='P20 direct Win32 focus witness (QA-owned)').pack();tk.update()
    helper=ident(tk.winfo_id());R['witnessWindow']=helper
    print('P20_V3_CHROME_WINDOW_BOUND hwnd='+str(owned_chrome),flush=True)
    R['gates']['uniqueWitnessHwnd']=helper and helper.get('pid')==os.getpid()
    try:
     win32gui.ShowWindow(owned_chrome,win32con.SW_RESTORE)
     win32gui.SetForegroundWindow(owned_chrome)
     fgerr=None
    except Exception as e:fgerr=repr(e)
    R['chromeForegroundAttemptError']=fgerr
    chrome_fg=poll_foreground(owned_chrome,.9)
    if not chrome_fg:
     print('P20_V3_CHROME_ACTIVATION_REQUIRED hwnd='+str(owned_chrome),flush=True)
     chrome_fg=poll_foreground(owned_chrome,45)
    page.locator('#key-power').focus()
    before=snap(page);R['preHold']={'win32':sample_win32(),'browser':before}
    R['gates']['chromeForegroundBeforeDown']=chrome_fg and win32gui.GetForegroundWindow()==owned_chrome and before['hasFocus'] and before['activeElement']=='key-power'
    if not R['gates']['chromeForegroundBeforeDown']:
     R['status']='HARNESS_BLOCKED_CHROME_NOT_FOREGROUND'
    elif not R['gates']['uniqueWitnessHwnd']:
     R['status']='HARNESS_BLOCKED_WITNESS_IDENTITY'
    else:
     page.keyboard.down('Space');held=True
     down=snap(page);R['afterDown']={'win32':sample_win32(),'browser':down}
     R['gates']['downEdge']=down['pressing'] is True and down['eventCount']==before['eventCount']+1 and win32gui.GetForegroundWindow()==owned_chrome
     if not R['gates']['downEdge']:
      R['status']='FAIL_INPUT_PRECONDITION'
     else:
      # A real Win32 transfer attempt; no mouse cursor warping, no user-window clicks.
      tk.deiconify();tk.update()
      try:win32gui.SetForegroundWindow(tk.winfo_id());R['witnessForegroundAttemptError']=None
      except Exception as e:R['witnessForegroundAttemptError']=repr(e)
      switched=poll_foreground(tk.winfo_id(),.9)
      if not switched:
       print('P20_V3_WITNESS_ACTIVATION_REQUIRED hwnd='+str(tk.winfo_id()),flush=True)
       switched=poll_foreground(tk.winfo_id(),45)
      R['foregroundAfterSwitch']=sample_win32()
      R['gates']['witnessOwnsForeground']=switched and win32gui.GetForegroundWindow()==tk.winfo_id()
      if not R['gates']['witnessOwnsForeground']:
       R['status']='HARNESS_BLOCKED_NATIVE_FOREGROUND_SWITCH'
      else:
       # Poll true browser blur, never synthesize Event('blur').
       for _ in range(12):
        now=snap(page)
        if now['hasFocus'] is False and any(e['type']=='blur' for e in now['events']):break
        time.sleep(.09)
       blurred=snap(page);R['afterOSForegroundChange']={'win32':sample_win32(),'browser':blurred}
       has_blur=(not blurred['hasFocus']) and any(e['type']=='blur' and e['ms']>=0 for e in blurred['events'])
       R['gates']['actualWindowBlur']=has_blur
       R['gates']['cancelOnce']=blurred['eventCount']==before['eventCount']+2 and blurred['pressing'] is False
       R['gates']['powerStatusUnchanged']=blurred['status']==before['status'] and blurred['powerOff']==before['powerOff']
       if not has_blur:R['status']='FAIL_BROWSER_BLUR_NOT_OBSERVED_AFTER_REAL_WIN32_SWITCH'
       elif not R['gates']['cancelOnce']:R['status']='FAIL_CANCEL_EDGE_AFTER_NATIVE_BLUR'
       elif not R['gates']['powerStatusUnchanged']:R['status']='FAIL_POWER_STATE_OR_STATUS_CHANGED'
       else:R['status']='P20_NATIVE_WIN32_BLUR_CANCEL_PASS_AUTOMATED_KEY_INPUT'
      # Release while helper is foreground; avoid returning to Chrome before keyup.
      page.keyboard.up('Space');held=False
      after=snap(page);R['afterKeyup']={'win32':sample_win32(),'browser':after}
      R['gates']['noStrayKeyup']=after['eventCount']==(R.get('afterOSForegroundChange',{}).get('browser',{}).get('eventCount',-1)) if 'afterOSForegroundChange' in R else None
      if R['status'].startswith('P20_NATIVE_') and R['gates']['noStrayKeyup'] is not True:R['status']='FAIL_STRAY_KEYUP_AFTER_CANCEL'
   ctx.close();page=None
   browser.close();browser=None
 except Exception as e:
  R['status']='HARNESS_EXCEPTION' if R['status']=='IN_PROGRESS' else R['status'];R['issues'].append(repr(e));R['traceback']=traceback.format_exc()[-3000:]
 finally:
  if page is not None and held:
   try:page.keyboard.up('Space')
   except Exception:pass
  if tk is not None:
   try:tk.destroy()
   except Exception as e:R['issues'].append('Witness cleanup '+repr(e))
  if browser is not None:
   try:browser.close()
   except Exception as e:R['issues'].append('Chrome cleanup '+repr(e))
  if server is not None:
   try:server.terminate();server.wait(timeout=8)
   except Exception:
    try:server.kill();server.wait(timeout=5)
    except Exception as e:R['issues'].append('Server cleanup '+repr(e))
  original=R['originalForeground'];R['originalForegroundRestoreAttempt']=None
  if original and win32gui.IsWindow(original['hwnd']):
   if win32gui.GetForegroundWindow()!=original['hwnd']:
    try:win32gui.SetForegroundWindow(original['hwnd'])
    except Exception as e:R['originalForegroundRestoreAttempt']=repr(e)
    poll_foreground(original['hwnd'],.8)
  R['originalForegroundRestored']=(original is not None and win32gui.GetForegroundWindow()==original['hwnd'])
  R['foregroundAtEnd']=ident(win32gui.GetForegroundWindow())
  R['ownedPortClosed']=not port_open(PORT);R['protectedUserServerStillListening']=port_open(4173)
  R['canonicalRuntimeAfter']=sum(sha(ROOT/n)==h for n,h in parent['canonicalRuntime50SHA256'].items())
  R['parentP19Unchanged']=sha(P19)==EXPECTED_P19
  if R['status']=='IN_PROGRESS':R['status']='HARNESS_INCOMPLETE'
  if R['status'].startswith('P20_NATIVE_') and not R['originalForegroundRestored']:
   R['status']='PASS_FUNCTIONAL_BUT_FOREGROUND_RESTORE_BLOCKED'
  with OUT.open('x',encoding='utf8',newline='\n') as f:json.dump(R,f,indent=2,ensure_ascii=False);f.write('\n')
  print(json.dumps({'status':R['status'],'gates':R['gates'],'uiaStatus':R.get('uia',{}).get('status'),'uiaMatches':len(R.get('uia',{}).get('data',{}).get('matches',[])),'qaPortClosed':R['ownedPortClosed'],'user4173':R['protectedUserServerStillListening'],'sourceMatched':R['canonicalRuntimeAfter'],'originalForegroundRestored':R['originalForegroundRestored'],'receiptSHA256':sha(OUT)},ensure_ascii=False))
if __name__=='__main__':main()