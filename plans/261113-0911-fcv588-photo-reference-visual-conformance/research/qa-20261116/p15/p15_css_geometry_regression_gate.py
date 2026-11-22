"""P15 source-authored CSS geometry regression, real Chrome and only owned 4216 server.
Run as --root canonical BEFORE fix (RED), or --root isolated stage AFTER fix (GREEN).
"""
from pathlib import Path
import os,sys,argparse,json,hashlib,subprocess,traceback
from playwright.sync_api import sync_playwright
BASE=Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument('--root',required=True)
parser.add_argument('--label',required=True)
args=parser.parse_args()
ROOT=Path(args.root).resolve()
PORT=4216
OUT=BASE/(f"P15_GEOMETRY_{args.label}_20261116.json")
VIEWS=[(375,812),(700,900),(701,900),(900,900),(1240,900),(1241,900),(1366,768),(1920,1080)]
R={'schema':'P15_REAL_CHROME_CSS_GEOMETRY_V1','label':args.label,'root':str(ROOT),'views':[],'checks':[],'errors':[]}
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def check(ok,description):
 R['checks'].append({'name':description,'pass':bool(ok)})
 if not ok:R['errors'].append(description)
def run():
 env={**os.environ,'PORT':str(PORT)}
 process=subprocess.Popen([r'C:\nvm4w\nodejs\node.exe',str(ROOT/'tools/server.mjs')],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
 R['ownedServerPid']=process.pid
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(channel='chrome',headless=True)
   try:
    for w,h in VIEWS:
     context=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=1)
     page=context.new_page();page.goto('http://127.0.0.1:4216/',wait_until='networkidle',timeout=20000)
     page.locator('#key-power').click()
     for _ in range(4):page.locator('#btn-step').click()
     measurement=page.evaluate('''() => {const lcd=document.querySelector('#lcd'),canvas=document.querySelector('#echo-canvas'),head=document.querySelector('#screen-top'),depth=document.querySelector('#depth-display'),value=document.querySelector('.depth-indicator');const l=lcd.getBoundingClientRect(),c=canvas.getBoundingClientRect(),h=head.getBoundingClientRect(),d=depth.getBoundingClientRect();return {viewport:[innerWidth,innerHeight],lcd:{w:l.width,h:l.height},canvas:{w:c.width,h:c.height,intrinsicW:canvas.width,intrinsicH:canvas.height},headerFont:parseFloat(getComputedStyle(head).fontSize),depthFont:parseFloat(getComputedStyle(depth).fontSize),depthW:d.width,depthH:d.height,depthX:d.x,headerW:h.width,headerH:h.height,contentStatus:document.querySelector('#status-line').textContent}}''')
     ratio=measurement['canvas']['w']/measurement['canvas']['h'];diff=abs(ratio-.75)
     measurement['canvasAspect']=ratio;measurement['canvasRatioError']=diff
     R['views'].append(measurement)
     check(diff<=0.00075,f'{w}x{h} canvas preserves 480:640 intrinsic aspect <=0.00075')
     context.close()
    for a,b in [(1366,1920)]:
     x=next(v for v in R['views'] if v['viewport'][0]==a);y=next(v for v in R['views'] if v['viewport'][0]==b)
     sameSize=abs(x['lcd']['w']-y['lcd']['w'])<.25 and abs(x['lcd']['h']-y['lcd']['h'])<.25
     check(sameSize,'desktop1366/1920 LCD has fixed-size design witness')
     if sameSize:
      check(abs(x['headerFont']-y['headerFont'])<=.15,'G2 header font fixed for same LCD width')
      check(abs(x['depthFont']-y['depthFont'])<=.15,'G2 depth font fixed for same LCD width')
      check(abs(x['depthW']-y['depthW'])<=.15,'G2 depth glyph width fixed for same LCD width')
   finally:browser.close()
 except Exception as exc:R['errors'].append('EXCEPTION '+str(exc));R['traceback']=traceback.format_exc()
 finally:
  process.terminate()
  try:process.wait(timeout=8)
  except subprocess.TimeoutExpired:process.kill();process.wait()
  R['ownedServerExited']=process.poll() is not None
  check(R['ownedServerExited'],'owned server4216 exited')
  with OUT.open('x',encoding='utf8') as f:json.dump(R,f,indent=2,ensure_ascii=False);f.write('\n')
  print(json.dumps({'label':args.label,'passed':sum(c['pass'] for c in R['checks']),'total':len(R['checks']),'failures':R['errors'][:12],'receipt':str(OUT),'sha256':sha(OUT)},ensure_ascii=True))
 if R['errors']:sys.exit(1)
if __name__=='__main__':run()