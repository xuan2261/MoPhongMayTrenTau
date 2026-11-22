import pathlib,json,hashlib,zipfile,os,subprocess,datetime
R=pathlib.Path(r'C:\Work\MoPhongMayTrenTau')
S=R/'staging/fcv588-p26-historical-bz-viewer-20261117'
Q=R/'docs/qa/FCV588_P26_HISTORICAL_BZ_VIEWER_20261117'
P25=R/'docs/qa/FCV588_P25_OFFLINE_ARCHIVE_UI_20261117'
MOD=('web/app.mjs','web/index.html','web/styles.css')
ADD=('web/fcv588-archive-bz-viewer.mjs','test/fcv588-p26-archive-bz-viewer.test.mjs')
DRY=Q/'P26_GUARDED_APPLY_DRYRUN_V2_20261117.json'
GO=Q/'P26_GUARDED_APPLY_FINAL_GO_V3_20261117.json'
APPLY=Q/'P26_CANONICAL_GUARDED_APPLY_20261117.json'
ZIP=Q/'P26_CANONICAL_PREIMAGE_3MODIFIED_20261117.zip'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def need(t,m):
 if not t:raise RuntimeError('P26_CANONICAL_GUARD_ABORT '+m)
def j(p):return json.loads(p.read_text(encoding='utf8'))
def listen():
 script="$x=Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue|Where-Object {$_.LocalPort -in @(4173,4226,4227,4228)}|Select-Object LocalAddress,LocalPort,OwningProcess;$x|ConvertTo-Json -Compress"
 p=subprocess.run(['powershell','-NoProfile','-Command',script],capture_output=True,text=True,check=True)
 v=json.loads(p.stdout);v=v if isinstance(v,list) else [v]
 need(any(x['LocalPort']==4173 and x['LocalAddress']=='127.0.0.1' and x['OwningProcess']==1204 for x in v),
   'user server PID or binding drift')
 need(not any(x['LocalPort'] in (4226,4227,4228) for x in v),'QA port collision')
 return v
def atomic(path,data):
 tmp=path.with_name(path.name+'.p26tmp')
 need(not tmp.exists(),'tmp exists '+str(tmp))
 try:
  with tmp.open('xb') as f:f.write(data);f.flush();os.fsync(f.fileno())
  os.replace(tmp,path)
 finally:
  if tmp.exists():tmp.unlink()
need(not GO.exists() and not APPLY.exists(),'write-once apply receipts must be absent')
need(sha(DRY)=='b9e50cb6094c27ff9fa481486aba9bd2623c40956f813e92163cd8b8c27780e3',
  'fresh V2 dryrun SHA')
need(sha(ZIP)=='61ba402e32e07ef1a64c2d58b257ec3cec4aafca22b4e207ee5c802c87f9c96c',
  'preimage ZIP SHA')
d=j(DRY)
need(d['status']=='ALL_STAGE_QA_PASS_LATEST_SOURCE_REVIEW_PENDING' and d['staleDryrunV1NotUsed'],
  'dryrun V2 status')
need(set(d['modifiedCanonicalPreimagesSHA256'])==set(MOD) and
     set(d['newCanonicalTargetsAbsent'])==set(ADD) and
     set(d['stageDesiredSHA256'])==set(MOD+ADD),
 'strict exact 5 paths')
p25f=P25/'FCV588_P25_OFFLINE_ARCHIVE_UI_FINAL_INTEGRITY_20261117.json'
p25p=P25/'FCV588_P25_OFFLINE_ARCHIVE_UI_INDEPENDENT_POSTRECEIPT_20261117.json'
need(sha(p25f)==d['parentP25FinalSHA256']=='3fdac61ebd16a1728e47d0a4382eb15f07597d98f5e161e3084cb4cbab541dff',
 'parent P25 final')
need(sha(p25p)==d['parentP25PostSHA256']=='266b46ffe6f045d4be37a72de11ecb2b5721553d5d33237bb47e4eb131c08d5d',
 'parent P25 independent post')
for name,w in d['parentRuntime52SHA256'].items():need(sha(R/name)==w,'P25 runtime52 '+name)
for name,w in d['OEMReferenceOnly8SHA256'].items():
 need(sha(R/'sources/FCV588_GiaoDienThucTeMay2016'/name)==w,'OEM '+name)
for name in MOD:
 need(sha(R/name)==d['modifiedCanonicalPreimagesSHA256'][name],
      'modified target preimage changed '+name)
for name in ADD:need(not (R/name).exists(),'new target not absent '+name)
for name,w in d['stageDesiredSHA256'].items():
 need(sha(S/name)==w,'stage final SHA drift '+name)
need(sha(Q/'P26_STAGE_BROWSER_V4_20261117.json')==
  '37ed95cb8a5fb7312c9ccb5c739ba316c112a293fcd1f943b76cf750392b0c81',
 'browser V4 receipt')
browser=j(Q/'P26_STAGE_BROWSER_V4_20261117.json')
need(browser['status']=='PASS' and len(browser['cases'])==9 and
     browser['loadedSourceBodiesCount']==51 and browser['qaPortClosed'] and browser['errors']==[],
 'browser9/HTTP51')
for name in ['P26_STAGE_FOCUSED_V3_20261117.json','P26_STAGE_FULL_NODE_V3_20261117.json','P26_STAGE_PYTHON_V3_20261117.json']:
 a=j(Q/name)
 need(a['status']=='PASS' and a['exitCode']==0,'stage QA '+name)
 for path,w in d['stageDesiredSHA256'].items():need(a['sourceSHA256'][path]==w,'QA source '+path)
with zipfile.ZipFile(ZIP) as z:
 for name in MOD:need(hashlib.sha256(z.read('preimage/'+name)).hexdigest()==d['modifiedCanonicalPreimagesSHA256'][name],
  'ZIP preimage '+name)
before=listen()
# Current independent reviewers: worker36 BOUNDED_CANONICAL_APPLY_GO on V2,
# worker38 independently validates the same V2 following stale-V1 NO_GO.
# Invoke only AFTER the prime has actually collected worker38 GO.
go={'schema':'FCV588_P26_PREAPPLY_FINAL_GO_V3','status':'BOUNDED_CANONICAL_APPLY_GO_EXACT_FIVE_PATHS',
 'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'freshPinnedDryrunV2SHA256':sha(DRY),'preimageBackupZIPSHA256':sha(ZIP),
 'parentP25FinalSHA256':sha(p25f),'parentP25PostSHA256':sha(p25p),
 'reviewers':['worker36 BOUNDED_CANONICAL_APPLY_GO','worker38 BOUNDED_CANONICAL_APPLY_GO'],
 'appliedSourceSHA256Expected':d['stageDesiredSHA256'],
 'P25Runtime52UnchangedBefore':True,'OEM8UnchangedBefore':True,
 'stageQA':'Focused9_Node605_Python13_Chrome9_HTTP51',
 'browserV4SHA256':sha(Q/'P26_STAGE_BROWSER_V4_20261117.json'),
 'listenerBefore':before,'releaseApproval':'HOLD'}
with GO.open('x',encoding='utf8') as f:json.dump(go,f,indent=2);f.write('\n')
done=[]
try:
 # Re-check exact preimage immediately before each mutation; no other paths.
 for name in MOD:need(sha(R/name)==d['modifiedCanonicalPreimagesSHA256'][name],'late preimage '+name)
 for name in ADD:need(not (R/name).exists(),'late absent '+name)
 for name in MOD+ADD:
  content=(S/name).read_bytes()
  need(hashlib.sha256(content).hexdigest()==d['stageDesiredSHA256'][name],
       'late staged content '+name)
  atomic(R/name,content)
  done.append(name)
  need(sha(R/name)==d['stageDesiredSHA256'][name],'immediate write SHA '+name)
 for name,w in d['parentRuntime52SHA256'].items():
  if name not in MOD:need(sha(R/name)==w,'untouched runtime '+name)
 for name,w in d['OEMReferenceOnly8SHA256'].items():
  need(sha(R/'sources/FCV588_GiaoDienThucTeMay2016'/name)==w,'untouched OEM '+name)
 after=listen()
except Exception:
 # Restore only paths touched by P26 from verified original preimage ZIP.
 with zipfile.ZipFile(ZIP) as z:
  for name in reversed(done):
   path=R/name
   if name in ADD:
    if path.exists() and sha(path)==d['stageDesiredSHA256'][name]:path.unlink()
   else:
    atomic(path,z.read('preimage/'+name))
 raise
applied={'schema':'FCV588_P26_GUARDED_CANONICAL_APPLY_V1',
 'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'status':'APPLIED_FIVE_PATHS_CANONICAL_POSTQA_PENDING',
 'scope':'P26_D15_SYNTHETIC_HISTORIC_CONTRACT_BZ_CANVAS_ONLY',
 'freshFinalGoSHA256':sha(GO),'preimageBackupZIPSHA256':sha(ZIP),
 'modifiedPreimageSHA256':d['modifiedCanonicalPreimagesSHA256'],
 'appliedFivePathsSHA256':{name:sha(R/name) for name in MOD+ADD},
 'unmodifiedP25Runtime49Of52SHA':True,'P25ArchiveImporterAndP24CoreUntouched':True,
 'OEMReferenceOnly8SHA':True,
 'userListenerBefore':before,'userListenerAfter':after,
 'stageQA':'Focused9_Node605_Python13_Chrome9_HTTP51',
 'review':'worker36_and_worker38_BOUNDED_CANONICAL_APPLY_GO',
 'historicalFullLCDPixelsReconstructed':False,
 'releaseApproval':'HOLD'}
with APPLY.open('x',encoding='utf8') as f:json.dump(applied,f,indent=2);f.write('\n')
print(json.dumps({'status':applied['status'],
 'applySHA256':sha(APPLY),'finalGoSHA256':sha(GO),
 'changedPaths':applied['appliedFivePathsSHA256'],
 'userServer4173':'PID1204_LISTEN_UNTOUCHED'}))
