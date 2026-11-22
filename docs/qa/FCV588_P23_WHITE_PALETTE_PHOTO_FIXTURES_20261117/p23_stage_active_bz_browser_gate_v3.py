"""P23 stage-only Chrome BZ LF/HF visual oracle. Not OEM pixel/color calibration."""
from pathlib import Path
from hashlib import sha256
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
import socket,subprocess,os,json,traceback
ROOT=Path(r'C:\Work\MoPhongMayTrenTau');STAGE=ROOT/'staging/fcv588-p23-bz-lower-20261117';QA=Path(__file__).resolve().parent
PORT=4224;BASE=f'http://127.0.0.1:{PORT}';OUT=QA/'P23_STAGE_ACTIVE_BZ_CHROME_VISUAL_GATE_V3_20261117.json'
R={'schema':'FCV588_P23_STAGE_ACTIVE_BZ_CHROME_V3','scope':'STAGING_ONLY_BZ_SEMANTICS_VISUAL_NOT_OEM_PIXELS','port':PORT,'checks':[],'errors':[],'screenshots':[],'httpBodies':[],'faviconBodyUnavailable':[],'pageErrors':[],'externalRequests':[],'oemRoutes':[]}
def sha(b):return sha256(b).hexdigest()
def port(n):
 with socket.socket() as s:return s.connect_ex(('127.0.0.1',n))==0
def check(name,ok,obs=None):
 ok=bool(ok);R['checks'].append({'name':name,'pass':ok,'observed':obs})
 if not ok:R['errors'].append(name)
def run():
 if OUT.exists():raise FileExistsError('P23 BZ stage receipt already exists')
 if port(PORT) or not port(4173):raise RuntimeError('QA port taken or user server absent')
 server=subprocess.Popen([r'C:\nvm4w\nodejs\node.exe',str(STAGE/'tools/server.mjs')],cwd=STAGE,env={**os.environ,'PORT':str(PORT)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 R['ownedServerPid']=server.pid
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
   try:
    R['browserVersion']=browser.version
    ctx=browser.new_context(viewport={'width':1366,'height':768},device_scale_factor=1)
    page=ctx.new_page();page.clock.install()
    def finished(req):
     response=req.response()
     if response is None:return
     u=urlparse(response.url)
     if u.netloc!=f'127.0.0.1:{PORT}':R['externalRequests'].append(response.url);return
     if response.status!=200:return
     p=STAGE/'web/index.html' if u.path=='/' else STAGE/u.path.lstrip('/')
     if u.path!='/' and not (u.path.startswith('/web/') or u.path.startswith('/src/')):return
     try:
      b=response.body();R['httpBodies'].append({'path':u.path,'sha256':sha(b),'sourceMatch':p.is_file() and b==p.read_bytes()})
     except Exception as e:
      if u.path=='/web/favicon.svg':R['faviconBodyUnavailable'].append({'path':u.path,'status':resp.status,'error':repr(e)})
      else:R['httpBodies'].append({'path':u.path,'sourceMatch':False,'error':repr(e)})
    page.on('requestfinished',finished);page.on('pageerror',lambda e:R['pageErrors'].append(str(e)))
    page.goto(BASE+'/',wait_until='networkidle',timeout=30000)
    R['setup']=page.evaluate('''async()=>{const {initialFcv588State}=await import('/src/devices/fcv588/model.mjs');const {encodeFcvSettings,FCV_SETTINGS_STORAGE_KEY}=await import('/src/devices/fcv588/settings.mjs');const settings={...initialFcv588State().settings,palette:'White',zoomMode:'Bottom Zoom',zoomRange:'10'};localStorage.clear();localStorage.setItem(FCV_SETTINGS_STORAGE_KEY,encodeFcvSettings(settings));return {zoomMode:settings.zoomMode,palette:settings.palette,range:settings.zoomRange};}''')
    page.reload(wait_until='networkidle')
    page.locator('#key-power').click()
    for _ in range(4):page.locator('#btn-step').click()
    page.locator('#btn-pause').click()
    modes=['NAV1','LF-ZOOM','LF','DUAL','HF','HF-ZOOM','NAV2']
    for target,prefix in [('LF-ZOOM','BZ-LF'),('HF-ZOOM','BZ-HF')]:
     current=page.locator('#mode-state').inner_text().strip()
     if current!=target:
      i,j=modes.index(current),modes.index(target);left=(i-j)%7;right=(j-i)%7
      page.locator('#mode-knob').focus()
      for _ in range(min(left,right)):page.keyboard.press('ArrowRight' if right<=left else 'ArrowLeft')
      page.clock.run_for(6500)
     selected=page.locator('#mode-state').inner_text().strip();header=page.locator('#screen-top').inner_text()
     check('MODE '+target,selected==target,selected)
     check('header '+prefix,prefix in header,header[:120])
     path=QA/('P23_STAGE_ACTIVE_'+prefix.replace('-','_')+'_WHITE_V3_1366x768_20261117.png')
     if path.exists():raise FileExistsError('write-once screenshot '+path.name)
     page.locator('#lcd').screenshot(path=str(path),timeout=15000)
     R['screenshots'].append({'mode':target,'name':path.name,'sha256':sha(path.read_bytes()),'bytes':path.stat().st_size,'header':header[:120]})
    R['semanticProjections']=page.evaluate('''async()=>{const {projectFcvZoom}=await import('/src/devices/fcv588/echo-projection.mjs');const {initialFcv588State}=await import('/src/devices/fcv588/model.mjs');const pix=new Uint8Array(162);const observation={modelVersion:'P23_BZ_BROWSER_ORACLE',simTick:0,bottomDepthM:50,recommendedAutoRangeM:80,maxDepthM:80,syntheticTargets:[],columns:2,rows:81,channels:{50:pix,200:Uint8Array.from(pix)}};let settings={...initialFcv588State().settings,zoomMode:'Bottom Zoom',zoomRange:'10',smoothing:'Off'};let state={...initialFcv588State(),settings};let calc=c=>{const p=projectFcvZoom(observation,state,{frequencyKhz:50,rows:81,displayContract:c});return {start:p.startDepthM,range:p.windowDepthM,fraction:(50-p.startDepthM)/p.windowDepthM}};return {active:calc('P23_LOWER_BOTTOM'),historical:calc('P04_HISTORIC')}}''')
    check('active BZ lower half',.5<R['semanticProjections']['active']['fraction']<=1,R['semanticProjections'])
    check('historical BZ center unchanged',R['semanticProjections']['historical']['fraction']==.5,R['semanticProjections'])
    check('LF/HF screenshots differ',len({x['sha256'] for x in R['screenshots']})==2)
    for file in ['zoom.jpg','zoom2.jpg']:
     res=page.request.get(BASE+'/sources/FCV588_GiaoDienThucTeMay2016/'+file);R['oemRoutes'].append({'file':file,'httpStatus':res.status})
    check('OEM images unserved',all(x['httpStatus']==404 for x in R['oemRoutes']))
    check('actual served HTML JS CSS body SHA exact',len(R['httpBodies'])>=38 and all(x['sourceMatch'] for x in R['httpBodies']),len(R['httpBodies']))
    check('zero network external and JS errors',len(R['externalRequests'])==0 and len(R['pageErrors'])==0)
    ctx.close()
   finally:browser.close()
 except Exception as e:R['errors'].append('EXCEPTION '+repr(e));R['traceback']=traceback.format_exc()[-3500:]
 finally:
  server.terminate()
  try:server.wait(timeout=8)
  except subprocess.TimeoutExpired:server.kill();server.wait()
  R['qaPortClosed']=not port(PORT);R['userServer4173Listening']=port(4173)
  R['status']='PASS_STAGE_BZ_BROWSER_ONLY' if not R['errors'] else 'FAIL_STAGE_BROWSER'
  with OUT.open('x',encoding='utf8',newline='\n') as f:json.dump(R,f,ensure_ascii=False,indent=2);f.write('\n')
  print(json.dumps({'status':R['status'],'checks':len(R['checks']),'pass':sum(x['pass'] for x in R['checks']),'screenshots':len(R['screenshots']),'httpBodies':len(R['httpBodies']),'errors':R['errors'],'portClosed':R['qaPortClosed'],'user4173':R['userServer4173Listening'],'receiptSHA256':sha(OUT.read_bytes())},ensure_ascii=False))
if __name__=='__main__':run()