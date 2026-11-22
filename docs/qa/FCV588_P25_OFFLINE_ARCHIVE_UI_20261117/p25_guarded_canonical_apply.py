import pathlib,json,hashlib,zipfile,os,subprocess,datetime,traceback
ROOT=pathlib.Path(r'C:\Work\MoPhongMayTrenTau')
STAGE=ROOT/'staging/fcv588-p25-offline-archive-ui-20261117'
QA=ROOT/'docs/qa/FCV588_P25_OFFLINE_ARCHIVE_UI_20261117'
Q24=ROOT/'docs/qa/FCV588_P24_ZOOM_ARCHIVE_SIDECAR_20261117'
MOD=['web/app.mjs','web/index.html','web/styles.css']
ADD=['web/fcv588-archive-import.mjs','test/fcv588-p25-archive-ui.test.mjs']
DRY=QA/'P25_PREAPPLY_PINNED_DRYRUN_20261117.json'
ZIP=QA/'P25_PREIMAGE_3MODIFIED_20261117.zip'
DRYV2=QA/'P25_PREAPPLY_FINAL_GO_DRYRUN_V2_20261117.json'
APPLY=QA/'P25_CANONICAL_GUARDED_APPLY_20261117.json'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def ensure(cond,msg):
 if not cond:raise RuntimeError('P25_GUARD_ABORT '+msg)
def socket_readonly():
 code="""$p=Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object {$_.LocalPort -in @(4173,4226,4227,4228)} | Select-Object LocalAddress,LocalPort,OwningProcess; $p | ConvertTo-Json -Compress"""
 output=subprocess.run(['powershell','-NoProfile','-Command',code],capture_output=True,encoding='utf8',errors='replace',check=True).stdout.strip()
 if not output:return []
 value=json.loads(output)
 return value if isinstance(value,list) else [value]
def port_guard():
 lines=socket_readonly()
 ensure(any(x['LocalAddress']=='127.0.0.1' and x['LocalPort']==4173 and x['OwningProcess']==1204 for x in lines),'user server 4173 identity')
 ensure(not any(x['LocalPort'] in (4226,4227,4228) for x in lines),'QA listener collision')
 return lines
def atomwrite(path,data):
 tmp=path.with_name(path.name+'.p25tmp')
 ensure(not tmp.exists(),'temp collision '+str(tmp))
 try:
  with tmp.open('xb') as f:f.write(data);f.flush();os.fsync(f.fileno())
  os.replace(tmp,path)
 finally:
  if tmp.exists():tmp.unlink()
ensure(not APPLY.exists() and not DRYV2.exists(),'new receipts must not exist')
ensure(sha(DRY)=='15572a5182176ff630bce1a0f93df7535459bc458bacae825cfdc428f9a3006b','pinned dry-run drift')
ensure(sha(ZIP)=='984ec99eb0f9314191c4da81629fe7a96c93fbe606b7b0af9f0dacae136425d0','backup ZIP drift')
d=json.loads(DRY.read_text(encoding='utf8'))
ensure(d['status']=='DRYRUN_SHA_PINNED_REVIEW_PENDING','dryrun identity')
ensure(set(d['modified'])==set(MOD) and set(d['newTargetsAbsent'])==set(ADD),'strict five path allowlist')
ensure(sha(Q24/'FCV588_P24_ARCHIVE_SIDECAR_FINAL_INTEGRITY_20261117.json')==d['parentP24FinalSHA256'],'P24 final drift')
ensure(sha(Q24/'FCV588_P24_ARCHIVE_SIDECAR_INDEPENDENT_SHA_POSTRECEIPT_20261117.json')==d['parentP24PostSHA256'],'P24 post drift')
parent=json.loads((Q24/'FCV588_P24_ARCHIVE_SIDECAR_FINAL_INTEGRITY_20261117.json').read_text(encoding='utf8'))
for name,want in parent['P23CanonicalRuntime50SHA256'].items():ensure(sha(ROOT/name)==want,'parent50 '+name)
for name,want in parent['P24NewCanonicalFilesSHA256'].items():ensure(sha(ROOT/name)==want,'parentP24 '+name)
for name,want in parent['OEMReferenceOnly8SHA256'].items():ensure(sha(ROOT/'sources/FCV588_GiaoDienThucTeMay2016'/name)==want,'OEM '+name)
for name in MOD:
 ensure(sha(ROOT/name)==d['modified'][name]['sha256'],'preimage drift '+name)
 ensure(sha(STAGE/name)==d['newDesiredSHA256'][name],'stage target drift '+name)
for name in ADD:
 ensure(not (ROOT/name).exists(),'new target exists '+name)
 ensure(sha(STAGE/name)==d['newDesiredSHA256'][name],'new stage drift '+name)
with zipfile.ZipFile(ZIP) as z:
 for name in MOD:
  ensure(hashlib.sha256(z.read('preimage/'+name)).hexdigest()==d['modified'][name]['sha256'],'ZIP preimage '+name)
for name in ['P25_STAGE_FOCUSED_GREEN_20261117.json','P25_STAGE_FULL_NODE_20261117.json','P25_STAGE_PYTHON_V2_20261117.json']:
 evidence=json.loads((QA/name).read_text(encoding='utf8'))
 ensure(evidence['status']=='PASS','QA stage '+name)
v3=QA/'P25_STAGE_BROWSER_V3_20261117.json'
ensure(sha(v3)=='360328dfbf078a403e2e43360e335a1af5b7f0db901029348fee8b467d5b7194','V3 browser SHA drift')
browser=json.loads(v3.read_text(encoding='utf8'))
ensure(browser['status']=='PASS' and len(browser['cases'])==5 and browser['sourceBodiesCount']==50 and browser['errors']==[] and browser['qaPortClosed'],'browser V3 PASS')
for name in MOD+['web/fcv588-archive-import.mjs']:
 ensure(browser['sourceSHA256'][name]==d['newDesiredSHA256'][name],'browser stage SHA '+name)
port_before=port_guard()
# Independent read-only reviewer verdicts worker-35 and worker-36 are
# recorded in parent invocation; both BOUNDED_CANONICAL_APPLY_GO.
receipt={
 'schema':'FCV588_P25_PREAPPLY_GO_V2','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'status':'GO_PINNED_FIVE_PATHS_ONLY',
 'dryrunV1SHA256':sha(DRY),'preimageBackupZIPSHA256':sha(ZIP),
 'sourceBeforeSHA256':{n:sha(ROOT/n) for n in MOD},
 'sourceAfterExpectedSHA256':d['newDesiredSHA256'],
 'newPathsAbsent':ADD,'stageBrowserV3SHA256':sha(v3),
 'reviewers':['worker-35 BOUNDED_CANONICAL_APPLY_GO','worker-36 BOUNDED_CANONICAL_APPLY_GO'],
 'P23runtime50Before':True,'P24ModuleUnchanged':True,'OEM8Before':True,'protectedListenerBefore':port_before,
 'releaseApproval':'HOLD',
}
with DRYV2.open('x',encoding='utf8') as f:json.dump(receipt,f,indent=2);f.write('\n')
print('P25_FRESH_PREAPPLY_GO_SHA '+sha(DRYV2))
done=[]
try:
 # re-pin under same process directly before any write
 for name in MOD:ensure(sha(ROOT/name)==d['modified'][name]['sha256'],'late preimage '+name)
 for name in ADD:ensure(not (ROOT/name).exists(),'late path collision '+name)
 for name in MOD+ADD:
  data=(STAGE/name).read_bytes()
  ensure(hashlib.sha256(data).hexdigest()==d['newDesiredSHA256'][name],'late desired sha '+name)
  atomwrite(ROOT/name,data)
  done.append(name)
  ensure(sha(ROOT/name)==d['newDesiredSHA256'][name],'postimage '+name)
 for name in parent['P23CanonicalRuntime50SHA256']:
  if name not in MOD:ensure(sha(ROOT/name)==parent['P23CanonicalRuntime50SHA256'][name],'untouched source '+name)
 for name,want in parent['P24NewCanonicalFilesSHA256'].items():ensure(sha(ROOT/name)==want,'P24 unchanged '+name)
 for name,want in parent['OEMReferenceOnly8SHA256'].items():ensure(sha(ROOT/'sources/FCV588_GiaoDienThucTeMay2016'/name)==want,'OEM unchanged '+name)
 port_after=port_guard()
except Exception:
 # Rollback exactly owned transaction from trusted pinned preimage, no old
 # QA or other canonical paths may be modified.
 with zipfile.ZipFile(ZIP) as z:
  for name in reversed(done):
   path=ROOT/name
   if name in ADD:
    if path.exists() and sha(path)==d['newDesiredSHA256'][name]:path.unlink()
   else:
    atomwrite(path,z.read('preimage/'+name))
 raise
applied={
 'schema':'FCV588_P25_GUARDED_CANONICAL_APPLY_V1',
 'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'status':'APPLIED_FIVE_PATHS_CANONICAL_POSTQA_PENDING',
 'scope':'D15_ONLY_OFFLINE_PAIR_IMPORT_REPLAY_NO_LIVE_LCD_OR_SESSION_MUTATION',
 'freshPreapplyGoSHA256':sha(DRYV2),'preimageBackupZIPSHA256':sha(ZIP),
 'changedExistingPreimageSHA256':{n:d['modified'][n]['sha256'] for n in MOD},
 'allowedAppliedPathsSHA256':{n:sha(ROOT/n) for n in MOD+ADD},
 'unchangedP23Runtime47Of50':True,'unchangedP24ArchiveModule':True,'unchangedOEM8':True,
 'serverBefore':port_before,'serverAfter':port_after,
 'review':'worker35_and_worker36_BOUNDED_CANONICAL_APPLY_GO',
 'stageTests':'focused7_fullNode596_Python13_browserV3_5cases_HTTP50',
 'archiveFullLCDReconstruction':'NOT_IMPLEMENTED','releaseApproval':'HOLD'
}
with APPLY.open('x',encoding='utf8') as f:json.dump(applied,f,indent=2);f.write('\n')
print(json.dumps({'status':applied['status'],'applyReceiptSHA256':sha(APPLY),'paths':list(applied['allowedAppliedPathsSHA256']),'userServerUnchanged':True}))
