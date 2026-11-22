import pathlib,json,hashlib,zipfile,datetime,subprocess
R=pathlib.Path(r'C:\Work\MoPhongMayTrenTau')
Q=R/'docs/qa/FCV588_P26_HISTORICAL_BZ_VIEWER_20261117'
P25=R/'docs/qa/FCV588_P25_OFFLINE_ARCHIVE_UI_20261117'
REPORT=Q/'FCV588_P26_HISTORICAL_BZ_VIEWER_REPORT_20261117.md'
FINAL=Q/'FCV588_P26_HISTORICAL_BZ_VIEWER_FINAL_INTEGRITY_20261117.json'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def j(p):return json.loads(p.read_text(encoding='utf8'))
def ok(c,label):
 if not c:raise RuntimeError('P26_FINAL_BUILDER_HOLD '+label)
ok(not REPORT.exists() and not FINAL.exists(),'write-once final files absent')
p25f=P25/'FCV588_P25_OFFLINE_ARCHIVE_UI_FINAL_INTEGRITY_20261117.json'
p25p=P25/'FCV588_P25_OFFLINE_ARCHIVE_UI_INDEPENDENT_POSTRECEIPT_20261117.json'
ok(sha(p25f)=='3fdac61ebd16a1728e47d0a4382eb15f07597d98f5e161e3084cb4cbab541dff','P25 final')
ok(sha(p25p)=='266b46ffe6f045d4be37a72de11ecb2b5721553d5d33237bb47e4eb131c08d5d','P25 post')
parent=j(p25f)
go=Q/'P26_GUARDED_APPLY_FINAL_GO_V3_20261117.json'
apply=Q/'P26_CANONICAL_GUARDED_APPLY_20261117.json'
ok(j(go)['status']=='BOUNDED_CANONICAL_APPLY_GO_EXACT_FIVE_PATHS','independent preapply GO')
ap=j(apply)
ok(ap['status']=='APPLIED_FIVE_PATHS_CANONICAL_POSTQA_PENDING','guarded apply actual')
ok(set(ap['appliedFivePathsSHA256'])=={
 'web/app.mjs','web/index.html','web/styles.css',
 'web/fcv588-archive-bz-viewer.mjs','test/fcv588-p26-archive-bz-viewer.test.mjs'},'exact five scope')
for n,w in ap['appliedFivePathsSHA256'].items():ok(sha(R/n)==w,'canonical P26 '+n)
for n,w in parent['canonicalRuntime52SHA256'].items():
 if n not in ap['appliedFivePathsSHA256']:ok(sha(R/n)==w,'untouched P25 runtime '+n)
for n,w in parent['OEMReferenceOnly8SHA256'].items():
 ok(sha(R/'sources/FCV588_GiaoDienThucTeMay2016'/n)==w,'OEM reference '+n)
with zipfile.ZipFile(Q/'P26_CANONICAL_PREIMAGE_3MODIFIED_20261117.zip') as z:
 for n,w in ap['modifiedPreimageSHA256'].items():
  ok(hashlib.sha256(z.read('preimage/'+n)).hexdigest()==w,'backup preimage '+n)
stageReceipts={'P26_STAGE_FOCUSED_V3_20261117.json':9,
 'P26_STAGE_FULL_NODE_V3_20261117.json':605,
 'P26_STAGE_PYTHON_V3_20261117.json':13}
canonReceipts={'P26_CANONICAL_POSTAPPLY_FOCUSED_20261117.json':9,
 'P26_CANONICAL_POSTAPPLY_FULL_NODE_20261117.json':605,
 'P26_CANONICAL_POSTAPPLY_PYTHON_20261117.json':13}
for n,c in {**stageReceipts,**canonReceipts}.items():
 d=j(Q/n)
 ok(d['status']=='PASS' and d['exitCode']==0,'QA receipt '+n)
 # Stage V3 sourceSHA256 / canonical appliedSourceSHA256
 src=d.get('appliedSourceSHA256',d.get('sourceSHA256',{}))
 for name,w in ap['appliedFivePathsSHA256'].items():ok(src[name]==w,'source bind '+n+' '+name)
 ok(any(str(c) in l for l in d['summary']),'summary count '+n)
sb=j(Q/'P26_STAGE_BROWSER_V4_20261117.json')
cb=j(Q/'P26_CANONICAL_BROWSER_20261117.json')
for label,b,root in [('stage',sb,R/'staging/fcv588-p26-historical-bz-viewer-20261117'),
                     ('canonical',cb,R)]:
 ok(b['status']=='PASS' and len(b['cases'])==9 and b['loadedSourceBodiesCount']==51 and b['errors']==[] and b['qaPortClosed'],
     label+' browser9/HTTP51')
 ok(all(item['liveModeTickEventAndLcdPixelsUnchanged'] for item in b['cases']),label+' live LCD unchanged')
 for route,w in b['httpBodies'].items():
  rel='web/index.html' if route=='/' else route.lstrip('/')
  ok(sha(root/rel)==w,label+' source response '+rel)
 for name,w in b['screenshots'].items():ok(sha(Q/name)==w,label+' screenshot '+name)
# Canonical and staging must have same synthetic raster pixel SHA under fixed source.
for i in [2,3]:
 for key in ['zoomPaneSHA256','normalPaneSHA256','viewerSHA256']:
  ok(sb['cases'][i][key]==cb['cases'][i][key],'canvas parity '+key+' '+str(i))
ok(sb['cases'][2]['zoomPaneSHA256']!=sb['cases'][3]['zoomPaneSHA256'],'P04 P23 zoom differing')
ok(sb['cases'][2]['normalPaneSHA256']==sb['cases'][3]['normalPaneSHA256'],'normal invariant')
for n in ['P26_SOURCE_VALID_RED_20261117.json',
 'P26_MODE_GATE_SOURCE_VALID_RED_20261117.json',
 'P26_POWER_OFF_SOURCE_VALID_RED_20261117.json']:
 ok(j(Q/n)['status'].startswith(('EXPECTED_','SOURCE_VALID_')),'source valid RED '+n)
ok(j(Q/'P26_STAGE_BROWSER_20261117.json')['status']=='FAILED','old harness failure preserved')
ok(j(Q/'P26_GUARDED_APPLY_DRYRUN_V2_20261117.json')['staleDryrunV1NotUsed'],'V1 dryrun excluded')
testonly=j(Q/'P26_SYNTHETIC_ACTIVE_BZ_FIXTURE_PROVENANCE_20261117.json')
ok(testonly['status']=='SYNTHETIC_TEST_ONLY_NOT_HISTORICAL_OEM','synthetic P04 disclaimer')
off=j(Q/'P26_SYNTHETIC_POWERED_OFF_PROVENANCE_20261117.json')
ok(off['power']=='off' and off['status']=='SYNTHETIC_NOT_HISTORIC_OEM','off fixture disclaimer')
# Avoid any HTTP interaction with 4173; listener snapshot only (no connect).
ps=subprocess.run(['powershell','-NoProfile','-Command',"$x=Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue|Where-Object {$_.LocalPort -in @(4173,4226,4227,4228)}|Select-Object LocalAddress,LocalPort,OwningProcess;$x|ConvertTo-Json -Compress"],capture_output=True,text=True,check=True)
ports=json.loads(ps.stdout);ports=ports if isinstance(ports,list) else [ports]
ok(any(p['LocalAddress']=='127.0.0.1' and p['LocalPort']==4173 and p['OwningProcess']==1204 for p in ports),'user listener')
ok(not any(p['LocalPort'] in (4226,4227,4228) for p in ports),'QA ports closed')
runtime={n:sha(R/n) for n in parent['canonicalRuntime52SHA256']}
runtime['web/fcv588-archive-bz-viewer.mjs']=sha(R/'web/fcv588-archive-bz-viewer.mjs')
ok(len(runtime)==53,'runtime53')
evidence={p.name:sha(p) for p in Q.iterdir() if p.is_file() and p.name not in (
 REPORT.name,FINAL.name,'FCV588_P26_HISTORICAL_BZ_VIEWER_INDEPENDENT_SHA_POSTRECEIPT_20261117.json')}
report='''# FCV588 P26 — Bounded historical-contract Bottom Zoom viewer
Date: 2026-11-17. Scope: F1 PUBLIC_REFERENCE v2, Windows offline classroom D15 only.
VERIFIED: P26_BOUNDED_CANONICAL_POSTAPPLY_PASS_D15_SYNTHETIC_BZ_VIEWER. Production release HOLD.

## Source and behavior
Official OME23890E §1.4.3 PDF p12 / printed p4 confirms Bottom Zoom expands bottom/fish in the LEFT half and tracks bottom in LOWER part. Manual does NOT specify 0.75 OEM pixels or exact font/RGB. zoom.jpg/zoom2.jpg show BL-LF/BL-HF Bottom Lock, NOT BZ; all 8 REFERENCE_ONLY photos unchanged and never served.
P26 browser D15 archive pair import uses unchanged P24 strict v7 sidecar replay and P25 bounded JSON decoder. Generates independent synthetic BZ-left/normal-right canvas from the validated current state; no archival pixel bytes, image data URLs, hardware input or OEM assets. P04_HISTORIC selects legacy centered fraction 0.5; P23_LOWER_BOTTOM selects 0.75 classroom positioning. Fingerprints only drift checks, not provenance authentication.
Must be POWER ON, actual active LF-ZOOM/HF-ZOOM, and Bottom Zoom setting. Genuine frozen pre-P23 LF archive or LF with BZ preference or POWER OFF with LF-ZOOM: VALID REPLAY, NO fabricated historical BZ canvas. No mutation of live session, LCD framebuffer, timers or localStorage. No change to old P24/P25 APIs, replay envelope v7 or active P23 LCD route.

## Evidence
Source-valid RED: missing viewer module; LF with saved BZ preference incorrectly rendered; POWER OFF with retained LF-ZOOM incorrectly rendered. Both model defects fixed and RED preserved. Stage final focused 9/9, full Node 605/605, Python13/13 and isolated Chrome 9/9 with 51/51 actual HTTP source SHA, errors zero, QA port 4227 closed, full live LCD raw RGBA SHA unchanged. Canonical postapply same counts and exact canvas pane hashes. Same current synthetic active-LF-ZOOM replay bytes with TEST-ONLY P04 sidecar vs P23 sidecar yields different BZ-left pixels, identical normal-right pixels. The P04 test-only sidecar is NOT historic provenance.
Guarded apply exactly 3 modified +2 new paths: web/app.mjs, web/index.html, web/styles.css, NEW web/fcv588-archive-bz-viewer.mjs, NEW test/fcv588-p26-archive-bz-viewer.test.mjs. Three preimages in write-once backup ZIP; stale dryrun V1 preserved but NOT used, fresh V2 used. P25 runtime52 preserved except three guarded modifications, new module yields runtime53; OEM JPEG8 unchanged. Independent preapply GO and postapply GO recorded separately.
Original first Chrome attempt FAILED due harness clock tick, fixed harness V2 (not a product defect); V2/V3 and V4 PASS but V2/V3 superseded by latest stricter source gates. Other historical failures and evidence preserved. Neither Chrome QA nor source collection contacts or restarts user server 127.0.0.1:4173 PID1204.

## HOLD / NOT ACCEPTED
No full historical OEM LCD screenshot restoration, arbitrary archival pixel authenticity, hardware/firmware color/geometry validation, pixel-calibrated BZ 75%, OEM rights clearance, production release. Phase6 OPEN, 65/65 public claims HOLD, hardwareValidated=false, firmware UNKNOWN.
Proposed P27: D15-only event-by-event archive timeline with state/contract-bound synthetic frames and bounded navigation; another alternative is manual-backed LF/HF/DUAL visual conformance. Require historical OEM source oracle before claiming exact pixel fidelity.
'''
with REPORT.open('x',encoding='utf8',newline='\n') as f:f.write(report)
final={
 'schema':'FCV588_P26_HISTORICAL_BZ_VIEWER_FINAL_INTEGRITY_V1',
 'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'status':'P26_BOUNDED_CANONICAL_POSTAPPLY_PASS_D15_SYNTHETIC_BZ_VIEWER',
 'scope':'F1_PUBLIC_REFERENCE_V2_D15_ONLY_SYNTHETIC_BZ_WINDOW',
 'parentP25FinalSHA256':sha(p25f),'parentP25PostSHA256':sha(p25p),
 'preimageBackupZIPSHA256':sha(Q/'P26_CANONICAL_PREIMAGE_3MODIFIED_20261117.zip'),
 'freshDryrunV2SHA256':sha(Q/'P26_GUARDED_APPLY_DRYRUN_V2_20261117.json'),
 'preapplyFinalGoSHA256':sha(go),'guardedCanonicalApplySHA256':sha(apply),
 'originalP25Runtime52SHA256':parent['canonicalRuntime52SHA256'],
 'canonicalRuntime53SHA256':runtime,
 'P26AppliedFivePathsSHA256':ap['appliedFivePathsSHA256'],
 'OEMReferenceOnly8SHA256':parent['OEMReferenceOnly8SHA256'],
 'manualSHA256':'3003e23b9d1eda509ceb968130249fe02aa279c2efb3cf900dde54ab9d709cd3',
 'evidenceSHA256':evidence,'finalReportSHA256':sha(REPORT),
 'reviewers':{'worker36':'BOUNDED_POSTAPPLY_GO','worker38':'BOUNDED_POSTAPPLY_GO'},
 'stagedQA':{'focused':'9/9','Node':'605/605','Python':'13/13','browser':'9/9','HTTP':'51/51'},
 'canonicalQA':{'focused':'9/9','Node':'605/605','Python':'13/13','browser':'9/9','HTTP':'51/51'},
 'syntheticOnly':True,'historicalOEMPixelsReconstructed':False,
 'sidecarP04TestFixtureIsAuthenticHistory':False,'powerOnAndActiveZoomGate':True,
 'replayEnvelopeV7Unchanged':True,'fingerprintAuthentication':False,
 'releaseApproval':'HOLD','firmware':'UNKNOWN','hardwareValidated':False,
 'phase6':'OPEN','claims':'65/65 HOLD',
 'protectedServer':'127.0.0.1:4173 PID1204',
 'qaPorts4226to4228Listeners':0,'historicalFailuresPreserved':True}
with FINAL.open('x',encoding='utf8',newline='\n') as f:json.dump(final,f,indent=2,ensure_ascii=False);f.write('\n')
ok(j(FINAL)['status']==final['status'],'final readback')
print(json.dumps({'status':final['status'],'runtime':len(runtime),'evidence':len(evidence),'reportSHA256':sha(REPORT),'finalSHA256':sha(FINAL)}))
