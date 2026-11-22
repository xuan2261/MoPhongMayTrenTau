"""Write-once P15 final canonical integrity; checks all source, browser, rollback, HOLD."""
from pathlib import Path
from zipfile import ZipFile
from hashlib import sha256
from datetime import datetime,timezone
from PIL import Image,ImageChops
import json,re,subprocess
ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
STAGE=ROOT/"_p15_stage_20261116"
QA=Path(__file__).resolve().parent
FINALDIR=ROOT/"docs"/"qa"/"FCV588_P15_LCD_GEOMETRY_20261116"
FINAL=FINALDIR/"FCV588_P15_LCD_GEOMETRY_FINAL_INTEGRITY_20261116.json"
P14=ROOT/"docs"/"qa"/"FCV588_P14_VERSIONED_REPLAY_20261116"
REPORT=ROOT/"plans"/"261013-2359-fcv588-public-reference-deep-tdd-advice-v2"/"reports"/"continuation-2026-11-16-photo-p15-uniform-lcd-css-postapply.md"
REVIEWROOT=QA.parent
PIN={
 'stageSourceSeal':('p15/P15_STAGE_CSS_SOURCE_INTEGRITY_20261116.json','7afd374b89f0ddce597ba9917dfca7d2af532932a205868cc410267f727326e3'),
 'guardAllowlist':('p15/P15_CSS_APPLY_ALLOWLIST_20261116.json','d18f8e7a19f6cb82b03eeaecf8acceb16af578842639374f1658adfebcc7e8ec'),
 'guardBackup':('p15/P15_CSS_PREIMAGE_BACKUP_20261116.zip','f73e84c94b73943bc26a4d18778f06de05684f183e1f209111610bf415d03e01'),
 'independentCodeGo':('p15-geometry/P15_G1G2_INDEPENDENT_PREAPPLY_GATE_20261116.md','f1b45077098086d562086dde316e7cf36e38239ceffa6cdc9f3c7388e45ad0db'),
 'independentVisualGo':('p15-photo/P15_VISUAL_G1G2_INDEPENDENT_BOUNDED_REVIEW_20261116.md','9f93a54f447181348bcdd93f82374203da8e2ae626c1a5c78afa45fbe11b7d08'),
 'canonicalApply':('p15/P15_CANONICAL_CSS_APPLY_RECEIPT_20261116.json','8d0eb84830c3cfb03d4b9b2a707688db2f26786c5c566c2de547a20a93e52337'),
 'stageNode':('p15/P15_STAGE_FULL_NODE_AFTER_G1G2_20261116.txt','1a044253128a8e582e274daba4b82b8e18c4f9ec95c11925be0273e228c8f2eb'),
 'stagePython':('p15/P15_STAGE_PYTHON_AFTER_G1G2_20261116.txt','befec37eb6ad716a4623e8efcdf33afe9d41c5df41111ce382c75879e5d1dba2'),
 'stageChrome':('p15/P15_STAGE_CHROME_MODE_GEOMETRY_V1_20261116.json','f1e7f1d3a80743c4037cf1bf66085527d436be23ea9b3b49fcb0169217d86441'),
 'stageMenu':('p15/P15_STAGE_CHROME_MENU_CSS_20261116.json','7f56c9955ef01503ebb7fe2a571cee2b0926ed06f902eb3b11d25a25ec6423bd'),
 'behaviorPreimageRed':('p15/P15_GEOMETRY_CANONICAL_PREIMAGE_RED_20261116.json','4cf7a7959eba4d44b88a5b56b74b6500cb9779b28a1f9ed758aabc3dc5fc1e7a'),
 'stageGeometryGreen':('p15/P15_GEOMETRY_STAGE_FIRST_GREEN_20261116.json','2bdec962b416299fec13ed4f37880a6314d200aeecefedef028b21253abbd1be'),
 'canonicalNode':('p15/P15_CANONICAL_NODE_POSTAPPLY_20261116.txt','633e47c92eaab79864a31ed30f96636ba80d65905de63885fd723eaa51eb8e3c'),
 'canonicalPython':('p15/P15_CANONICAL_PYTHON_POSTAPPLY_20261116.txt','83660e3d44610ac01f1cce70ef9c06b24a9c596419e80e7dbe10a7d3383ac315'),
 'canonicalGeometry':('p15/P15_GEOMETRY_CANONICAL_POSTAPPLY_GREEN_20261116.json','467454793e7f61728650c61a80aca8a3f733132f9fbe648dc3b2a8f091ec2691'),
 'canonicalChromeSealedV2':('p15/P15_CANONICAL_CHROME_MODE_GEOMETRY_SEALED_V2_20261116.json','c457bcad0816b3033f0569e3a55d59c53ee1c9b27631a2979d183604a9988c03'),
 'canonicalMenu':('p15/P15_CANONICAL_CHROME_MENU_CSS_20261116.json','98d3d5dbebdfac36e744fa3993b1fc273015371129beceb050b69a250c7ec314'),
 'stageCanonicalV2ImageReconciliation':('p15/P15_STAGE_CANONICAL_SEALED_V2_PIXEL_RECONCILIATION_20261116.json','4aad95bc9484666a3bcb39b6dbb3335b4feaa5e9c758b3b48681a8a1673ba912'),
 'originalV1InvalidEvidenceHold':('p15/P15_CANONICAL_CHROME_V1_SCREENSHOT_EVIDENCE_HOLD_20261116.json','ea0d2c1eaa2256be3db561722ae6ccc7c335ab3c9cd42e63b496106ad6481842'),
}
def must(condition,why):
 if not condition:raise RuntimeError(why)
def h(path):return sha256(path.read_bytes()).hexdigest()
for k,(rel,expected) in PIN.items():
 p=REVIEWROOT/rel
 must(p.is_file() and h(p)==expected,'Evidence SHA drift: '+k)
reportHash=h(REPORT);must(reportHash=='47f435d41cd5add47ee3b870d941d134f1dfcae055e0042a01708c147ae56e2b','P15 report drift')
for name,expected in [('FCV588_P14_VERSIONED_REPLAY_FINAL_INTEGRITY_20261116.json','195d0737b602196bddb5971964500dabab41d19eaee08b5b620e97f26089e99e'),('FCV588_P14_VERSIONED_REPLAY_INDEPENDENT_POSTRECEIPT_20261116.json','2dfeb190a2160fb4e6f24988fa7d054b2dd0098f14c378901068cef6321b8754')]:must(h(P14/name)==expected,'P14 parent final or post SHA drift')
old=json.loads((P14/'FCV588_P14_VERSIONED_REPLAY_FINAL_INTEGRITY_20261116.json').read_text())
seal=json.loads((QA/PIN['stageSourceSeal'][0].split('/')[-1]).read_text())
rows=seal['runtimePaths'];must(len(rows)==50 and len(old['runtime50'])==50,'runtime50 missing')
runtime={};changed=[]
for row in rows:
 path=row['path'];sha=row['stageSHA256'];canon=ROOT/path;stage=STAGE/path
 must(canon.is_file() and h(canon)==sha and stage.is_file() and h(stage)==sha,'runtime drift '+path)
 if sha!=old['runtime50'][path]:changed.append(path)
 runtime[path]=sha
must(changed==['web/styles.css'],'unexpected changed runtime paths '+str(changed))
manifest=json.loads((QA/'P15_CSS_APPLY_ALLOWLIST_20261116.json').read_text())
apply=json.loads((QA/'P15_CANONICAL_CSS_APPLY_RECEIPT_20261116.json').read_text())
must(len(manifest['paths'])==2 and len(apply['appliedPaths'])==2 and apply['status']=='APPLIED_CANONICAL_POSTQA_PENDING','2-path allowlist or apply receipt')
for item in manifest['paths']:
 p=ROOT/item['path'];must(p.is_file() and h(p)==item['stageSHA256'],'applied CSS or new test mismatch '+item['path'])
with ZipFile(QA/'P15_CSS_PREIMAGE_BACKUP_20261116.zip') as z:
 must(z.testzip() is None and z.read('P15_PREIMAGE_MANIFEST.json')==(QA/'P15_CSS_APPLY_ALLOWLIST_20261116.json').read_bytes(),'backup manifest mismatch')
 must(sha256(z.read('preimages/web/styles.css')).hexdigest()==manifest['paths'][0]['canonicalPreimageSHA256'],'CSS preimage ZIP mismatch')
for label,key,passCount in [('stageNode','stageNode',579),('canonicalNode','canonicalNode',579)]:
 text=(REVIEWROOT/PIN[key][0]).read_text(errors='replace')
 must(f'# pass {passCount}' in text and '# fail 0' in text and '# skipped 0' in text,'Node FAIL '+label)
for key in ['stagePython','canonicalPython']:
 text=(REVIEWROOT/PIN[key][0]).read_text(errors='replace')
 must('Ran 13 tests' in text and 'OK' in text,'Python FAIL '+key)
red=json.loads((QA/'P15_GEOMETRY_CANONICAL_PREIMAGE_RED_20261116.json').read_text())
must(len(red['checks'])==13 and len(red['errors'])==11,'source-valid RED original')
for key in ['stageGeometryGreen','canonicalGeometry']:
 b=json.loads((REVIEWROOT/PIN[key][0]).read_text())
 must(len(b['checks'])==13 and all(x['pass'] for x in b['checks']) and not b['errors'] and b['ownedServerExited'],'G1/G2 Chrome geometry '+key)
def mode_gate(key):
 c=json.loads((REVIEWROOT/PIN[key][0]).read_text())
 must(len(c['checks'])==103 and all(x['pass'] for x in c['checks']) and not c['errors'],'mode Chrome checks '+key)
 must(len(c['views'])==3 and len(c['screenshots'])==24 and len(c['zoomCases'])==3,'mode Chrome coverage '+key)
 must(len(c['httpBodies'])==273 and all(x['match'] for x in c['httpBodies']) and not c['pageErrors'] and not c['networkExternal'],'Chrome HTTP body/JS/network '+key)
 must(len(c['jpegRoutes'])==8 and all(x['status']==404 for x in c['jpegRoutes']) and c['ownedServerExited'],'Chrome OEM/owned server '+key)
 for screenshot in c['screenshots']:
  f=Path(screenshot['file'])
  must(f.is_file() and h(f)==screenshot['sha256'],'PNG screenshot no longer matches receipt '+f.name)
 return c
stage=mode_gate('stageChrome');canonical=mode_gate('canonicalChromeSealedV2')
def menu_gate(key):
 c=json.loads((REVIEWROOT/PIN[key][0]).read_text())
 must(len(c['checks'])==10 and all(x['pass'] for x in c['checks']) and not c['errors'],'Sounder menu checks '+key)
 must(len(c['loadedBodies'])==164 and all(x['match'] for x in c['loadedBodies']) and all(not x['pageErrors'] for x in c['views']),'Sounder menu HTTP/JS '+key)
 must(len(c['originalJpegStatus'])==8 and all(x['status']==404 for x in c['originalJpegStatus']) and c['serverExited'],'Sounder menu OEM/source '+key)
 for v in c['views']:
  f=Path(v['screenshot'])
  must(f.is_file() and h(f)==v['screenshotSha'],'Sounder menu screenshot changed '+f.name)
 return c
menus=menu_gate('stageMenu');menuc=menu_gate('canonicalMenu')
matched=0
for a,b in zip(stage['screenshots'],canonical['screenshots']):
 must(a['label']==b['label'] and a['viewport']==b['viewport'],'stage/canonical screenshot pairing')
 must(Path(a['file']).read_bytes()==Path(b['file']).read_bytes(),'stage/canonical screenshot bytes differ '+a['label'])
 ia=Image.open(a['file']).convert('RGBA');ib=Image.open(b['file']).convert('RGBA')
 must(ia.size==ib.size and ImageChops.difference(ia,ib).getbbox() is None,'stage/canonical decoded pixels differ '+a['label'])
 matched+=1
for a,b in zip(menus['views'],menuc['views']):
 must(a['viewport']==b['viewport'] and Path(a['screenshot']).read_bytes()==Path(b['screenshot']).read_bytes(),'menu screenshot raw diff')
 matched+=1
must(matched==26,'unexpected screenshot comparison count')
reconciled=json.loads((QA/'P15_STAGE_CANONICAL_SEALED_V2_PIXEL_RECONCILIATION_20261116.json').read_text())
must(reconciled['decodedPixelEqualCount']==26 and reconciled['pngByteEqualCount']==26 and reconciled['pngByteDifferentCount']==0,'V2 image reconciliation mismatch')
v1=json.loads((QA/'P15_CANONICAL_CHROME_V1_SCREENSHOT_EVIDENCE_HOLD_20261116.json').read_text())
must(v1['v1MismatchCount']==7 and 'EXCLUDE_FROM_FINAL' in v1['verdict'],'V1 screenshot issue suppressed')
photos={}
for name,expected in seal['originalOEM8SHA256'].items():
 f=ROOT/'sources'/'FCV588_GiaoDienThucTeMay2016'/name
 must(f.is_file() and h(f)==expected,'OEM image changed '+name)
 photos[name]=expected
must(len(photos)==8,'OEM image inventory')
ps=subprocess.run(['powershell','-NoProfile','-Command','$a=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue|Where-Object {$_.LocalPort -in 4173,4214,4215,4216});$a|Select LocalAddress,LocalPort,OwningProcess|ConvertTo-Json -Compress'],capture_output=True,text=True,check=True)
sockets=json.loads(ps.stdout) if ps.stdout.strip() else []
if isinstance(sockets,dict):sockets=[sockets]
must(len(sockets)==1 and sockets[0]['LocalAddress']=='127.0.0.1' and sockets[0]['LocalPort']==4173 and sockets[0]['OwningProcess']==1204,'user server/QA port identity drift')
code=REVIEWROOT/PIN['independentCodeGo'][0]
visual=REVIEWROOT/PIN['independentVisualGo'][0]
must('CANONICAL APPLY: GO' in code.read_text().upper() and 'GO_BOUNDED' in visual.read_text().upper(),'independent approvals not found')
release=json.loads((ROOT/'docs/evidence/fcv588-public-implementation-status.json').read_text())
must(release['profileClass']=='PUBLIC_REFERENCE' and release['profileRevision']=='F1-public-reference-22' and release['hardwareValidated'] is False and release['firmwareInstalled'] is None and release['rightsClearance'] is False and release['releaseApproval']=='HOLD','public reference release boundary')
if FINALDIR.exists():raise RuntimeError('P15 final directory already exists; do not overwrite')
FINALDIR.mkdir(parents=True,exist_ok=False)
payload={'schema':'FCV588_P15_LCD_GEOMETRY_FINAL_INTEGRITY_V1','createdAt':datetime.now(timezone.utc).isoformat(),'status':'CANONICAL_G1G2_APPLIED_NODE_PYTHON_CHROME_PASS_INDEPENDENT_POSTRECEIPT_PENDING','scope':'F1_PUBLIC_REFERENCE_V2_ORIGINAL_SYNTHETIC_ARTWORK','canonicalRoot':str(ROOT),'canonicalApply':'APPLIED_GUARDED_TWO_PATHS','independentCodeGoSHA256':PIN['independentCodeGo'][1],'independentVisualGoSHA256':PIN['independentVisualGo'][1],'applyReceiptSHA256':PIN['canonicalApply'][1],'preimageBackupSHA256':PIN['guardBackup'][1],'runtime50':runtime,'runtime50Count':50,'runtimeChangesFromP14':changed,'newTestPath':'test/fcv588-p15-uniform-lcd-css.test.mjs','originalOEMReferenceOnly8SHA256':photos,'postapplyQa':{'node':'579/579 PASS','python':'13/13 OK','geometryChrome':'13/13 PASS eight viewport widths','modeChrome':'103/103 PASS; 7 modes x 3 viewport + 3 zoom; 273/273 HTTP bodies','menuChrome':'10/10 PASS 13 AP1 rows; 164/164 HTTP bodies','screenshots':'26/26 stage/canonical exact PNG SHA and decoded RGBA pixels','olderBrowserCqw':'NOT_YET_VERIFIED'},'invalidEvidencePreserved':{'v1ScreenshotReceipt':'EXCLUDED FROM FINAL','v1MismatchedPNG':7,'v1HoldEvidenceSHA256':PIN['originalV1InvalidEvidenceHold'][1]},'evidenceSHA256':{k:v[1] for k,v in PIN.items()},'reportSHA256':reportHash,'sourceLimitations':['2016 photo capture time EXIF missing','No calibrated active LCD ROI or OEM framebuffer/pixel oracle','Windows native Narrator/NVDA/High Contrast and true POWER window.blur not accepted','Old offline Chromium/WebView cqw compatibility NOT_YET_VERIFIED'],'holds':{'phase6':'OPEN','claims':'65/65 HOLD','hardwareValidated':False,'firmwareInstalled':None,'rightsClearance':False,'releaseApproval':'HOLD','oemCertified':False},'protectedUserServer':sockets[0]}
with FINAL.open('x',encoding='utf8') as f:json.dump(payload,f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps({'status':'PASS','final':str(FINAL),'sha256':h(FINAL),'runtimeCount':len(runtime),'changedRuntime':changed,'node':579,'python':13,'modeChrome':103,'geometryChrome':13,'menuChrome':10,'stageCanonicalPngBytesEqual':matched,'httpBodiesMode':273,'httpBodiesMenu':164,'OEMOriginalCount':8,'userServer':sockets[0]},ensure_ascii=True))