"""Separate postreceipt trust readback: independently compute actual SHA/paths and semantic invariants."""
from pathlib import Path
from hashlib import sha256
from zipfile import ZipFile
import subprocess,json
ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=Path(__file__).resolve().parent
FIN=QA/"P15_CANONICAL_CSS_FINAL_INTEGRITY_V3_20261116.json"
RECEIPT=QA/"P15_CANONICAL_CSS_INDEPENDENT_POSTRECEIPT_20261116.json"
def h(p):return sha256(p.read_bytes()).hexdigest()
def insist(val,msg):
 if not val:raise RuntimeError(msg)
fin=json.loads(FIN.read_text(encoding='utf8'))
insist(fin['schema']=='P15_CSS_CANONICAL_FINAL_INTEGRITY_V3' and fin['status']=='PASS_BOUNDED_CSS_G1G2','final schema/decision mismatch')
assert len(fin['runtime50PostSHA256'])==50
failed=[]
for rel,sha in fin['runtime50PostSHA256'].items():
 p=ROOT/rel
 if not p.is_file() or h(p)!=sha:failed.append('runtime: '+rel)
for rel,sha in fin['sourceOriginalOEM8SHA256'].items():
 p=ROOT/'sources'/'FCV588_GiaoDienThucTeMay2016'/rel
 if not p.is_file() or h(p)!=sha:failed.append('source: '+rel)
for rel,sha in fin['P15QAArtifactHashes'].items():
 p=QA/rel
 if not p.is_file():
  p=QA.parent/'p15-photo'/rel if 'VISUAL' in rel else QA.parent/'p15-geometry'/rel
 if not p.is_file() or h(p)!=sha:failed.append('artifact: '+rel)
chrome=QA/'P15_CANONICAL_CHROME_MODE_GEOMETRY_FINAL_V2_20261116.json'
x=json.loads(chrome.read_text(encoding='utf8'))
if len(x['checks'])!=103 or not all(t['pass'] for t in x['checks']):failed.append('mode checks')
if len(x['screenshots'])!=24 or len(x['httpBodies'])!=273:failed.append('screenshot/body counts')
if x['errors'] or x['pageErrors'] or x['networkExternal'] or not x['ownedServerExited']:failed.append('browser errors and owned server')
for s in x['screenshots']:
 p=Path(s['file'])
 if p.parent!=QA or not p.is_file() or h(p)!=s['sha256'] or p.stat().st_size!=s['bytes']:failed.append('capture: '+s['name'])
for body in x['httpBodies']:
 p=ROOT/'web'/'index.html' if body['path']=='/' else ROOT/body['path'].lstrip('/')
 if not p.is_file() or not body['match'] or h(p)!=body['hash']:failed.append('HTTP '+body['path'])
menu=json.loads((QA/'P15_CANONICAL_CHROME_MENU_CSS_20261116.json').read_text(encoding='utf8'))
if len(menu['checks'])!=10 or not all(c['pass'] for c in menu['checks']) or not menu['serverExited']:failed.append('menu')
node=(QA/'P15_CANONICAL_NODE_AFTER_G1G2_20261116.txt').read_text(errors='replace')
py=(QA/'P15_CANONICAL_PYTHON_AFTER_G1G2_20261116.txt').read_text(errors='replace')
if '# pass 579' not in node or '# fail 0' not in node:failed.append('node')
if 'Ran 13 tests' not in py or 'OK' not in py:failed.append('python')
P14=ROOT/'docs'/'qa'/'FCV588_P14_VERSIONED_REPLAY_20261116'
if h(P14/'FCV588_P14_VERSIONED_REPLAY_FINAL_INTEGRITY_20261116.json')!=fin['P14FinalSHA256']:failed.append('P14 final')
if h(P14/'FCV588_P14_VERSIONED_REPLAY_INDEPENDENT_POSTRECEIPT_20261116.json')!=fin['P14IndependentPostSHA256']:failed.append('P14 post')
ps=subprocess.run(['powershell','-NoProfile','-Command','$x=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object {$_.LocalPort -in 4173,4214,4215,4216}); $x|Select LocalAddress,LocalPort,OwningProcess|ConvertTo-Json -Compress'],capture_output=True,text=True,check=True)
sockets=json.loads(ps.stdout) if ps.stdout.strip() else []
if isinstance(sockets,dict):sockets=[sockets]
if len(sockets)!=1 or sockets[0].get('LocalPort')!=4173 or sockets[0].get('OwningProcess')!=1204 or sockets[0].get('LocalAddress')!='127.0.0.1':failed.append('protected server sockets')
if fin['rightsClearance'] is not False or fin['hardwareValidated'] is not False or fin['releaseApproval']!='HOLD' or fin['exactOEMPixel'] is not False:failed.append('authority hold')
post={'schema':'P15_INDEPENDENT_POSTRECEIPT_V1','status':'PASS' if not failed else 'FAILED','finalIntegrityFile':FIN.name,'finalIntegritySHA256':h(FIN),'runtimeSHA256Exact':50-len([v for v in failed if v.startswith('runtime: ')]),'originalOEMPhotoExact':8-len([v for v in failed if v.startswith('source: ')]),'qaArtifactsExact':len(fin['P15QAArtifactHashes'])-len([v for v in failed if v.startswith('artifact: ')]),'canonicalChromeScreenshotsExact':24-len([v for v in failed if v.startswith('capture: ')]),'httpLoadedBodyExact':273-len([v for v in failed if v.startswith('HTTP ')]),'nodePass':579,'pythonPass':13,'chromeModePass':103,'menuPass':10,'sockets':sockets,'pendingNative':['Narrator actual speech','NVDA','Windows High Contrast','native POWER window.blur cancellation'],'firmwareHardwareOEMRightsRelease':'HOLD','errors':failed}
with RECEIPT.open('x',encoding='utf8') as f:json.dump(post,f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps({'status':post['status'],'runtime50':post['runtimeSHA256Exact'],'originalJPEG8':post['originalOEMPhotoExact'],'screenshots24':post['canonicalChromeScreenshotsExact'],'http273':post['httpLoadedBodyExact'],'artefacts':post['qaArtifactsExact'],'errors':failed,'postreceiptSha':h(RECEIPT)},ensure_ascii=True))
if failed:raise SystemExit(1)