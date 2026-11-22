"""Seals P15 canonical CSS-only apply after independent real Chrome & full test gates."""
import json,hashlib,re
from pathlib import Path
from zipfile import ZipFile
ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=Path(__file__).resolve().parent
P14=ROOT/"docs"/"qa"/"FCV588_P14_VERSIONED_REPLAY_20261116"
FILE=QA/"P15_CANONICAL_CSS_FINAL_INTEGRITY_20261116.json"
def h(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def take(name):p=QA/name;assert p.is_file(),name;return p,json.loads(p.read_text(encoding='utf8'))
pre,baseline=take('P15_STAGE_CSS_SOURCE_INTEGRITY_20261116.json')
app,apply=take('P15_CANONICAL_CSS_APPLY_RECEIPT_20261116.json')
post,chrome=take('P15_CANONICAL_CHROME_MODE_GEOMETRY_V1_20261116.json')
geo,geometry=take('P15_GEOMETRY_CANONICAL_POSTAPPLY_GREEN_20261116.json')
assert apply['status']=='APPLIED_CANONICAL_POSTQA_PENDING' and len(apply['appliedPaths'])==2
assert len(geometry['checks'])==13 and all(c['pass'] for c in geometry['checks']) and not geometry['errors']
assert len(chrome['checks'])==103 and all(x['pass'] for x in chrome['checks']) and not chrome['errors']
assert len(chrome['screenshots'])==24 and len(chrome['httpBodies'])==273 and all(x['match'] for x in chrome['httpBodies'])
assert len(chrome['views'])==3 and len(chrome['zoomCases'])==3
assert not chrome['pageErrors'] and not chrome['networkExternal']
assert len(chrome['jpegRoutes'])==8 and all(x['status']==404 for x in chrome['jpegRoutes'])
assert chrome['ownedServerExited']
for s in chrome['screenshots']:
 assert Path(s['file']).is_file() and h(Path(s['file']))==s['sha256']
for x in chrome['httpBodies']:
 path=ROOT/'web'/'index.html' if x['path']=='/' else ROOT/x['path'].lstrip('/')
 assert path.is_file() and h(path)==x['hash']
assert len(baseline['runtimePaths'])==50
for r in baseline['runtimePaths']:
 p=ROOT/r['path'];assert p.is_file() and h(p)==r['stageSHA256'],r['path']
for x in baseline['originalOEM8SHA256']:
 path=ROOT/'sources'/'FCV588_GiaoDienThucTeMay2016'/x;assert path.is_file() and h(path)==baseline['originalOEM8SHA256'][x]
pre_p14=P14/'FCV588_P14_VERSIONED_REPLAY_FINAL_INTEGRITY_20261116.json'
post_p14=P14/'FCV588_P14_VERSIONED_REPLAY_INDEPENDENT_POSTRECEIPT_20261116.json'
assert h(pre_p14)=='195d0737b602196bddb5971964500dabab41d19eaee08b5b620e97f26089e99e'
assert h(post_p14)=='2dfeb190a2160fb4e6f24988fa7d054b2dd0098f14c378901068cef6321b8754'
node=QA/'P15_CANONICAL_NODE_AFTER_G1G2_20261116.txt';py=QA/'P15_CANONICAL_PYTHON_AFTER_G1G2_20261116.txt'
assert node.is_file() and py.is_file()
assert '# pass 579' in node.read_text(errors='replace') and '# fail 0' in node.read_text(errors='replace')
assert 'Ran 13 tests' in py.read_text(errors='replace') and 'OK' in py.read_text(errors='replace')
menu=QA/'P15_CANONICAL_CHROME_MENU_CSS_20261116.json';assert menu.is_file()
men=json.loads(menu.read_text(encoding='utf8'))
assert men.get('pass')==10 and men.get('checks')==10 and not men.get('failed')
# P14 baseline manifests remain literally immutable, but the 1 CSS runtime path is intentionally newer.
artifacts={}
for p in [pre,app,post,geo,node,py,menu,QA/'P15_CSS_APPLY_ALLOWLIST_20261116.json',QA/'P15_CSS_PREIMAGE_BACKUP_20261116.zip',QA/'P15_STAGE_CHROME_MODE_GEOMETRY_V1_20261116.json',QA/'P15_GEOMETRY_CANONICAL_PREIMAGE_RED_20261116.json']:
 artifacts[p.name]=h(p)
independent=QA.parent/'p15-geometry'/'P15_G1G2_INDEPENDENT_PREAPPLY_GATE_20261116.md'
visual=QA.parent/'p15-photo'/'P15_VISUAL_G1G2_INDEPENDENT_BOUNDED_REVIEW_20261116.md'
assert h(independent)==apply['independentReviewSHA256'] and h(visual)==apply['independentVisualReviewSHA256']
artifacts[independent.name]=h(independent);artifacts[visual.name]=h(visual)
result={'schema':'P15_CSS_CANONICAL_FINAL_INTEGRITY_V1','status':'PASS_BOUNDED_CSS_G1G2','scope':'F1_PUBLIC_REFERENCE_V2','canonicalRuntime50Count':50,'unchangedFromP14':49,'intentionallyUpdatedRuntime':[{'path':a['path'],'sha256':a['sha256']} for a in apply['appliedPaths'] if a['operation']=='modify'],'newTests':[{'path':a['path'],'sha256':a['sha256']} for a in apply['appliedPaths'] if a['operation']=='create'],'runtime50PostSHA256':{r['path']:h(ROOT/r['path']) for r in baseline['runtimePaths']},'sourceOriginalOEM8SHA256':baseline['originalOEM8SHA256'],'P14FinalSHA256':h(pre_p14),'P14IndependentPostSHA256':h(post_p14),'P15QAArtifactHashes':artifacts,'G1G2RealChromeGREEN':{'passed':13,'total':13},'canonicalNodePassed':579,'canonicalPythonPassed':13,'canonicalChromeModeChecks':103,'canonicalChromeModeScreenshots':24,'canonicalBrowserLoadedBodies':273,'canonicalMenuChecks':10,'originalOEMBrowserRoutesDenied':8,'pageErrors':0,'externalRequests':0,'nativeWindowsAccessibility':'NOT_RUN_NARRATOR_NVDA_HIGH_CONTRAST_BLUR','sourcePhotoUse':'REFERENCE_ONLY_NOT_SERVED','exactOEMPixel':False,'hardwareValidated':False,'firmwareValidated':False,'rightsClearance':False,'releaseApproval':'HOLD'}
with FILE.open('x',encoding='utf8') as out:json.dump(result,out,ensure_ascii=False,indent=2);out.write('\n')
print(json.dumps({'status':result['status'],'sha256':h(FILE),'runtime50':50,'unchanged49':49,'newTest':1,'node':579,'python':13,'chrome':103,'screenshots':24,'HTTP_SHA':273,'menu':10,'OEM_reference_HOLD':True},ensure_ascii=True))