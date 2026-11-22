import pathlib,hashlib,json,zipfile,datetime,subprocess
R=pathlib.Path(r'C:\Work\MoPhongMayTrenTau')
Q=R/'docs/qa/FCV588_P25_OFFLINE_ARCHIVE_UI_20261117'
Q24=R/'docs/qa/FCV588_P24_ZOOM_ARCHIVE_SIDECAR_20261117'
ST=R/'staging/fcv588-p25-offline-archive-ui-20261117'
REPORT=Q/'FCV588_P25_OFFLINE_ARCHIVE_UI_REPORT_20261117.md'
FINAL=Q/'FCV588_P25_OFFLINE_ARCHIVE_UI_FINAL_INTEGRITY_20261117.json'
MOD=['web/app.mjs','web/index.html','web/styles.css']
ADD=['web/fcv588-archive-import.mjs','test/fcv588-p25-archive-ui.test.mjs']
def h(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def j(p):return json.loads(p.read_text(encoding='utf8'))
def ok(c,n):
 if not c:raise RuntimeError('P25_FINAL_ABORT '+n)
ok(not REPORT.exists() and not FINAL.exists(),'writeonce files')
ok(h(Q24/'FCV588_P24_ARCHIVE_SIDECAR_FINAL_INTEGRITY_20261117.json')=='9763e8f2c834a3c1b9a3eca9fe9993debe0e7bf81e8ee9e2cbaad5ed20c77694','parent final')
ok(h(Q24/'FCV588_P24_ARCHIVE_SIDECAR_INDEPENDENT_SHA_POSTRECEIPT_20261117.json')=='77fe6cf4ae135ae59c6aa193b81aa2c57564cdcf716a24f8a4be519cdc07a410','parent post')
par=j(Q24/'FCV588_P24_ARCHIVE_SIDECAR_FINAL_INTEGRITY_20261117.json')
apply=j(Q/'P25_CANONICAL_GUARDED_APPLY_20261117.json')
ok(h(Q/'P25_CANONICAL_GUARDED_APPLY_20261117.json')=='23d59720302fd8e05f60d8bb4f895987d4b1c218a696541715c04877bb252058','apply receipt')
ok(h(Q/'P25_PREAPPLY_FINAL_GO_DRYRUN_V2_20261117.json')=='2053e06cee1e89be6e250fa6780d5418fa1f1d2bd33884256f379dfbabb2fc6f','dry V2')
ok(h(Q/'P25_PREIMAGE_3MODIFIED_20261117.zip')=='984ec99eb0f9314191c4da81629fe7a96c93fbe606b7b0af9f0dacae136425d0','backup zip')
ok(set(apply['allowedAppliedPathsSHA256'])==set(MOD+ADD),'scope')
for name,sha in apply['allowedAppliedPathsSHA256'].items():
 ok(h(R/name)==sha and h(ST/name)==sha,'source '+name)
for name,sha in par['P23CanonicalRuntime50SHA256'].items():
 if name not in MOD:ok(h(R/name)==sha,'old source '+name)
for name,sha in par['P24NewCanonicalFilesSHA256'].items():ok(h(R/name)==sha,'P24 '+name)
for name,sha in par['OEMReferenceOnly8SHA256'].items():
 ok(h(R/'sources/FCV588_GiaoDienThucTeMay2016'/name)==sha,'photo '+name)
with zipfile.ZipFile(Q/'P25_PREIMAGE_3MODIFIED_20261117.zip') as z:
 for name in MOD:ok(hashlib.sha256(z.read('preimage/'+name)).hexdigest()==apply['changedExistingPreimageSHA256'][name],'backup file')
status={
 'P25_STAGE_SOURCE_VALID_UI_RED_20261117.json':'EXPECTED_SOURCE_VALID_RED',
 'P25_STAGE_FOCUSED_GREEN_20261117.json':'PASS',
 'P25_STAGE_FULL_NODE_20261117.json':'PASS',
 'P25_STAGE_PYTHON_20261117.json':'FAILED',
 'P25_STAGE_PYTHON_V2_20261117.json':'PASS',
 'P25_STAGE_BROWSER_20261117.json':'FAILED',
 'P25_STAGE_BROWSER_V2_20261117.json':'PASS',
 'P25_STAGE_BROWSER_V3_20261117.json':'PASS',
 'P25_CANONICAL_POSTAPPLY_FOCUSED_20261117.json':'PASS',
 'P25_CANONICAL_POSTAPPLY_FULL_NODE_20261117.json':'PASS',
 'P25_CANONICAL_POSTAPPLY_PYTHON_20261117.json':'PASS',
 'P25_CANONICAL_BROWSER_20261117.json':'PASS'}
for name,want in status.items():ok(j(Q/name)['status']==want,'receipt '+name)
for label,rt,filename in [('staging',ST,'P25_STAGE_BROWSER_V3_20261117.json'),('canonical',R,'P25_CANONICAL_BROWSER_20261117.json')]:
 x=j(Q/filename)
 ok(len(x['cases'])==5 and x['errors']==[] and x['qaPortClosed'] and x['sourceBodiesCount']==50,label+' browser')
 ok(all(case['liveUnchanged'] for case in x['cases']),label+' live state')
 for route,sha in x['sourceBodies'].items():
  rel='web/index.html' if route=='/' else route.lstrip('/')
  ok(h(rt/rel)==sha,label+' HTTP '+route)
 for name,sha in x['screenshots'].items():ok(h(Q/name)==sha,label+' screenshot')
for name in ['P25_CANONICAL_POSTAPPLY_FOCUSED_20261117.json','P25_CANONICAL_POSTAPPLY_FULL_NODE_20261117.json','P25_CANONICAL_POSTAPPLY_PYTHON_20261117.json']:
 x=j(Q/name)
 for rel,sha in apply['allowedAppliedPathsSHA256'].items():ok(x['appliedSourceSHA256'][rel]==sha,'QA source binding')
ok('# pass 596' in j(Q/'P25_CANONICAL_POSTAPPLY_FULL_NODE_20261117.json')['summary'],'full node')
ok('OK' in j(Q/'P25_CANONICAL_POSTAPPLY_PYTHON_20261117.json')['summary'],'python')
z=subprocess.run(['powershell','-NoProfile','-Command',"$x=Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue|Where-Object {$_.LocalPort -in @(4173,4226,4227,4228)}|Select-Object LocalAddress,LocalPort,OwningProcess;$x|ConvertTo-Json -Compress"],capture_output=True,text=True,check=True)
ports=json.loads(z.stdout);ports=ports if isinstance(ports,list) else [ports]
ok(any(x['LocalPort']==4173 and x['LocalAddress']=='127.0.0.1' and x['OwningProcess']==1204 for x in ports),'server')
ok(not any(x['LocalPort'] in (4226,4227,4228) for x in ports),'qa closed')
runtime={name:h(R/name) for name in par['P23CanonicalRuntime50SHA256']}
runtime['src/devices/fcv588/archive-compat.mjs']=h(R/'src/devices/fcv588/archive-compat.mjs')
runtime['web/fcv588-archive-import.mjs']=h(R/'web/fcv588-archive-import.mjs')
ok(len(runtime)==52,'runtime52')
evidence={p.name:h(p) for p in Q.iterdir() if p.is_file() and p.name not in (REPORT.name,FINAL.name,'FCV588_P25_OFFLINE_ARCHIVE_UI_INDEPENDENT_POSTRECEIPT_20261117.json')}
report='''# FCV588 P25 — Báo cáo final / Offline archive D15
Ngày 17/11/2026. Kết quả: VERIFIED BOUNDED_CANONICAL_POSTAPPLY_PASS; release HOLD.

P25 đã thêm hai lựa chọn file JSON trong D15 để nạp replay envelope v7 và presentation sidecar v1 cục bộ. Replay thực qua API P24: kiểm đúng phiên bản profile, sự kiện, finalSessionHash và hợp đồng P04_HISTORIC/P23_LOWER_BOTTOM. D15 hiển thị hash, tick, event count, sơ đồ BZ synthetic; không ghi đè session, LCD, settings hay timer đang chạy. FNV fingerprint chỉ chống drift, không xác thực nguồn gốc lịch sử.

Bảo vệ tệp: giới hạn envelope 1 MiB, sidecar 8 KiB, tối đa 2000 sự kiện, 32 tầng/30000 nút cấu trúc; từ chối JSON sai, khóa không an toàn, sidecar mismatch, sự kiện sửa đổi, quá dung lượng, lỗi File.text và nội dung HTML độc hại. Không fetch, upload, localStorage hay kết nối tàu.

Đã guarded apply đúng 5 đường dẫn (3 file web sửa + 1 module web mới + 1 Node test mới). Preimage 3 file gốc giữ trong ZIP immutable; runtime hiện có 52 mục gồm 50 mục P23, module P24, module P25. 8 ảnh OEM REFERENCE_ONLY nguyên SHA. Hai reviewer worker35/worker36 BOUNDED_CANONICAL_APPLY_GO và BOUNDED_POSTAPPLY_GO.

Staging: focused Node 7/7, full Node 596/596, Python 13/13, Chrome 5/5 và 50/50 actual browser HTTP body SHA. Canonical: focused 7/7, full Node 596/596, Python 13/13, Chrome 5/5 và HTTP 50/50. Cổng QA 4226 đã đóng. Server user tại 127.0.0.1:4173 PID1204 không khởi động lại.

Bảo toàn các FAIL lịch sử: RED do thiếu UI; Python attempt đầu sai interpreter/Playwright, sửa bằng interpreter đúng; Chrome attempt đầu sai tên data-session-hash do harness, V2/V3 sau đó PASS. Các lỗi lịch sử không được gán PASS.

Không thực hiện: import archive lên LCD sống, dựng lại toàn bộ LCD lịch sử, event-by-event scrubber, export, kiểm chứng pixel OEM/hardware/firmware/rights. Phase 6 OPEN, 65/65 public claims HOLD, hardwareValidated=false, firmware UNKNOWN, releaseApproval=HOLD.

P26 đề xuất: ưu tiên đối chứng trực quan mode Bottom Zoom theo manual và ảnh tham chiếu trong một viewer riêng có nguồn, đặc biệt giới hạn pixel OEM chưa đo. Nếu ưu tiên bài học thao tác: bổ sung timeline xem lần lượt các sự kiện archive trong D15, không làm đổi session sống.
'''
with REPORT.open('x',encoding='utf8',newline='\n') as f:f.write(report)
final={'schema':'FCV588_P25_OFFLINE_ARCHIVE_UI_FINAL_INTEGRITY_V1',
 'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'status':'P25_BOUNDED_CANONICAL_POSTAPPLY_PASS_D15_ARCHIVE_UI',
 'scope':'F1_PUBLIC_REFERENCE_V2_LOCAL_FILE_PAIR_D15_ONLY',
 'parentP24FinalSHA256':h(Q24/'FCV588_P24_ARCHIVE_SIDECAR_FINAL_INTEGRITY_20261117.json'),
 'parentP24PostSHA256':h(Q24/'FCV588_P24_ARCHIVE_SIDECAR_INDEPENDENT_SHA_POSTRECEIPT_20261117.json'),
 'preimageBackupZIPSHA256':h(Q/'P25_PREIMAGE_3MODIFIED_20261117.zip'),
 'preapplyGoV2SHA256':h(Q/'P25_PREAPPLY_FINAL_GO_DRYRUN_V2_20261117.json'),
 'guardedApplySHA256':h(Q/'P25_CANONICAL_GUARDED_APPLY_20261117.json'),
 'P23OriginalRuntime50SHA256':par['P23CanonicalRuntime50SHA256'],
 'canonicalRuntime52SHA256':runtime,
 'P25AppliedSourceAndTestSHA256':apply['allowedAppliedPathsSHA256'],
 'P24NewFilesSHA256':par['P24NewCanonicalFilesSHA256'],
 'OEMReferenceOnly8SHA256':par['OEMReferenceOnly8SHA256'],
 'evidenceSHA256':evidence,'finalReportSHA256':h(REPORT),
 'independentReviews':{'worker35':'BOUNDED_POSTAPPLY_GO','worker36':'BOUNDED_POSTAPPLY_GO'},
 'stagingQA':{'focused':'7/7','node':'596/596','python':'13/13','browser':'5/5','http':'50/50'},
 'canonicalQA':{'focused':'7/7','node':'596/596','python':'13/13','browser':'5/5','http':'50/50'},
 'presentationContracts':['P04_HISTORIC','P23_LOWER_BOTTOM'],
 'sidecarVersion':1,'replayEnvelopeVersion':7,'fingerprintAuthentication':False,
 'historicalLCDReconstruction':False,'liveSessionImport':False,
 'historicalFailuresPreserved':True,'userServer':'127.0.0.1:4173 PID1204',
 'qaPort4226to4228Listeners':0,'hardwareValidated':False,'phase6':'OPEN','publicClaims':'65/65 HOLD','firmware':'UNKNOWN','releaseApproval':'HOLD'}
with FINAL.open('x',encoding='utf8',newline='\n') as f:json.dump(final,f,indent=2,ensure_ascii=False);f.write('\n')
ok(j(FINAL)['status']==final['status'],'final readback')
print(json.dumps({'status':final['status'],'evidence':len(evidence),'runtime':len(runtime),'reportSHA256':h(REPORT),'finalSHA256':h(FINAL)}))
