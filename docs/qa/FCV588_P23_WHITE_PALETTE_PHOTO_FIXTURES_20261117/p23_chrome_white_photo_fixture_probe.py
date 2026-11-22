from pathlib import Path
from urllib.parse import urlparse
from hashlib import sha256
from playwright.sync_api import sync_playwright
from PIL import Image
import json,subprocess,os,socket,traceback
ROOT=Path(r'C:\Work\MoPhongMayTrenTau'); QA=Path(__file__).resolve().parent
PORT=4223; URL=f'http://127.0.0.1:{PORT}/'; CHROME=r'C:\Program Files\Google\Chrome\Application\chrome.exe'
OUT=QA/'P23_CHROME_WHITE_PHOTO_8_SCENES_20261117.json'
MODES=['NAV1','LF-ZOOM','LF','DUAL','HF','HF-ZOOM','NAV2']
CASES=[('LF','LF','lf.jpg'),('HF','HF','hf.jpg'),('DUAL','DUAL','dual.jpg'),('BL_LF','LF-ZOOM','zoom.jpg'),('BL_HF','HF-ZOOM','zoom2.jpg'),('NAV1','NAV1','nav1.jpg'),('NAV2','NAV2','nav2.jpg'),('MENU','HF','giaoDien.jpg')]
R={'schema':'P23_WHITE_PALETTE_8_PHOTO_SCENES_V1','scope':'ORIGINAL_SIMULATOR_LCD_ONLY_NO_OEM_PIXEL_COMPARISON','port':PORT,'checks':[],'scenes':[],'httpBodies':[],'errors':[],'pageErrors':[],'external':[],'oemRoutes':[]}
def sha(b):return sha256(b).hexdigest()
def check(n,ok,observed=None):
 R['checks'].append({'name':n,'pass':bool(ok),'observed':observed})
 if not ok:R['errors'].append(n)
def openport(n):
 with socket.socket() as s:s.settimeout(.3);return s.connect_ex(('127.0.0.1',n))==0
def mode(page,target):
 cur=page.locator('#mode-state').inner_text().strip()
 if cur!=target:
  i,j=MODES.index(cur),MODES.index(target)
  f=(j-i)%7;b=(i-j)%7
  page.locator('#mode-knob').focus()
  for _ in range(min(f,b)):page.keyboard.press('ArrowRight' if f<=b else 'ArrowLeft')
  page.clock.run_for(6500)
 return page.locator('#mode-state').inner_text().strip()
def run():
 if OUT.exists():raise FileExistsError('Write-once P23 receipt exists')
 p22=ROOT/'docs/qa/FCV588_P22_WIN32_KEY_INPUT_20261117/FCV588_P22_WIN32_SENDINPUT_POWER_FOCUS_FINAL_INTEGRITY_20261117.json'
 R['p22ParentSHA256']=sha(p22.read_bytes())
 assert R['p22ParentSHA256']=='3f0af32087e021eba9b360d7591b8909df2c0515c59b435e9a531829ba6655a3'
 parent=json.loads(p22.read_text(encoding='utf8'))
 assert all(sha((ROOT/k).read_bytes())==v for k,v in parent['canonicalRuntime50SHA256'].items())
 assert not openport(PORT) and openport(4173)
 server=subprocess.Popen([r'C:\nvm4w\nodejs\node.exe',str(ROOT/'tools/server.mjs')],cwd=ROOT,env={**os.environ,'PORT':str(PORT)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 R['ownedServerPid']=server.pid
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path=CHROME,headless=True)
   try:
    R['browserVersion']=browser.version
    ctx=browser.new_context(viewport={'width':1366,'height':768},device_scale_factor=1)
    page=ctx.new_page();page.clock.install()
    def finished(req):
     resp=req.response()
     if not resp:return
     u=urlparse(resp.url)
     if u.netloc!=f'127.0.0.1:{PORT}':R['external'].append(resp.url);return
     if resp.status!=200:return
     if u.path=='/':src=ROOT/'web/index.html'
     elif u.path.startswith('/web/') or u.path.startswith('/src/'):src=ROOT/u.path.lstrip('/')
     else:return
     try:
      data=resp.body();R['httpBodies'].append({'path':u.path,'sourceMatch':src.is_file() and src.read_bytes()==data,'sha256':sha(data)})
     except Exception as e:R['httpBodies'].append({'path':u.path,'sourceMatch':False,'error':str(e)})
    page.on('requestfinished',finished);page.on('pageerror',lambda x:R['pageErrors'].append(str(x)))
    page.goto(URL,wait_until='networkidle',timeout=30000)
    # Source-supported signed persisted preference, isolated QA origin only.
    R['settings']=page.evaluate('''async()=>{const m=await import('/src/devices/fcv588/model.mjs');const s=await import('/src/devices/fcv588/settings.mjs');let settings={...m.initialFcv588State().settings,palette:'White',zoomMode:'Bottom Lock'};let raw=s.encodeFcvSettings(settings);localStorage.clear();localStorage.setItem(s.FCV_SETTINGS_STORAGE_KEY,raw);return {key:s.FCV_SETTINGS_STORAGE_KEY,palette:settings.palette,zoom:settings.zoomMode}}''')
    page.reload(wait_until='networkidle',timeout=30000)
    effective=page.evaluate('''async()=>{const s=await import('/src/devices/fcv588/settings.mjs');const p=await import('/src/devices/fcv588/display-palette.mjs');return {palette:JSON.parse(localStorage.getItem(s.FCV_SETTINGS_STORAGE_KEY)).settings.palette,background:p.getFcvDisplayPalette({palette:'White'})[0]}}''')
    R['effectiveSettings']=effective
    check('signed White settings active',effective['palette']=='White' and effective['background']==[241,245,240],effective)
    page.locator('#key-power').click()
    for _ in range(4):page.locator('#btn-step').click()
    page.locator('#btn-pause').click()
    check('device powered on','POWER OFF' not in page.locator('#status-line').inner_text(),page.locator('#status-line').inner_text()[:80])
    for label,target,photo in CASES:
     current=mode(page,target);check('mode '+label,current==target,current)
     if label=='MENU':page.locator('#key-menu').click()
     path=QA/f'P23_WHITE_LCD_{label}_1366x768_20261117.png'
     if path.exists():raise FileExistsError(path.name)
     page.locator('#lcd').screenshot(path=str(path),timeout=15000)
     with Image.open(path) as src:
      pix=src.convert('RGB');light=sum(1 for a,b,c in pix.getdata() if a>=190 and b>=190 and c>=185)
      ratio=round(light/(pix.width*pix.height),4);dimensions=[pix.width,pix.height]
     item={'scenario':label,'mode':current,'referenceOnlyPhoto':photo,'screenshot':path.name,'sha256':sha(path.read_bytes()),'dimensions':dimensions,'illustrativeBrightPixelFraction':ratio,'header':page.locator('#screen-top').inner_text()[:180]}
     if label in ('DUAL','BL_LF','BL_HF','NAV1','NAV2'):
      item['layout']=page.evaluate('''async m=>{let x=await import('/src/devices/fcv588/display-layout.mjs');return x.planFcvScreenLayout({mode:m,settings:{windowRatio:'50'}},{width:480,height:640});}''',target)
     R['scenes'].append(item)
     if label=='MENU':page.locator('#key-menu').click()
    check('eight distinct original simulator captures',len(R['scenes'])==8 and len({x['sha256'] for x in R['scenes']})==8,[x['scenario'] for x in R['scenes']])
    for photo in sorted(set(c[2] for c in CASES)):
     resp=page.request.get(f'http://127.0.0.1:{PORT}/sources/FCV588_GiaoDienThucTeMay2016/{photo}')
     R['oemRoutes'].append({'photo':photo,'status':resp.status})
    check('8 photo HTTP routes 404',len(R['oemRoutes'])==8 and all(z['status']==404 for z in R['oemRoutes']))
    check('loaded source SHA verified',len(R['httpBodies'])>=39 and all(z['sourceMatch'] for z in R['httpBodies']),len(R['httpBodies']))
    check('zero external/page errors',not R['external'] and not R['pageErrors'])
    ctx.close()
   finally:browser.close()
 except Exception as e:
  R['errors'].append('EXCEPTION '+repr(e));R['traceback']=traceback.format_exc()[-3200:]
 finally:
  server.terminate()
  try:server.wait(timeout=8)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  R['ownedPortClosed']=not openport(PORT);R['user4173StillListening']=openport(4173)
  R['status']='PASS_SIMULATOR_ONLY_8_WHITE_SCENES' if not R['errors'] else 'FAIL_OR_INCOMPLETE'
  with OUT.open('x',encoding='utf8',newline='\n') as f:json.dump(R,f,ensure_ascii=False,indent=2);f.write('\n')
  print(json.dumps({'status':R['status'],'checks':len(R['checks']),'passed':sum(x['pass'] for x in R['checks']),'sceneCount':len(R['scenes']),'httpBodies':len(R['httpBodies']),'errors':R['errors'][:8],'portClosed':R['ownedPortClosed'],'user4173':R['user4173StillListening'],'receiptSHA256':sha(OUT.read_bytes())},ensure_ascii=False))
if __name__=='__main__':run()