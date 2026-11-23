import pathlib,hashlib,json,subprocess
R=pathlib.Path(r'C:\Work\MoPhongMayTrenTau')
Q=R/'docs/qa/FCV588_P26_HISTORICAL_BZ_VIEWER_20261117'
P25=R/'docs/qa/FCV588_P25_OFFLINE_ARCHIVE_UI_20261117'
NODE=r'C:\nvm4w\nodejs\node.exe'
PY=r'<USER_PROFILE>\AppData\Roaming\pypoetry\venv\Scripts\python.exe'
APPLY=Q/'P26_CANONICAL_GUARDED_APPLY_20261117.json'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def j(p):return json.loads(p.read_text(encoding='utf8'))
assert APPLY.is_file() and j(APPLY)['status']=='APPLIED_FIVE_PATHS_CANONICAL_POSTQA_PENDING'
ap=j(APPLY)
parent=j(P25/'FCV588_P25_OFFLINE_ARCHIVE_UI_FINAL_INTEGRITY_20261117.json')
for name,h in ap['appliedFivePathsSHA256'].items():assert sha(R/name)==h,name
for name,h in parent['canonicalRuntime52SHA256'].items():
 if name not in ap['appliedFivePathsSHA256']:assert sha(R/name)==h,name
for name,h in parent['OEMReferenceOnly8SHA256'].items():
 assert sha(R/'sources/FCV588_GiaoDienThucTeMay2016'/name)==h,name
def one(label,command,checks):
 out=Q/f'P26_CANONICAL_POSTAPPLY_{label}_20261117.txt'
 receipt=Q/f'P26_CANONICAL_POSTAPPLY_{label}_20261117.json'
 assert not out.exists() and not receipt.exists()
 p=subprocess.run(command,cwd=R,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,encoding='utf8',errors='replace',text=True)
 with out.open('x',encoding='utf8',newline='\n') as f:f.write(p.stdout)
 lines=[x for x in p.stdout.splitlines() if x.startswith('# tests') or x.startswith('# pass') or x.startswith('# fail') or x.startswith('# skipped') or 'Ran 13 tests' in x or x=='OK']
 ok=p.returncode==0 and all(c in p.stdout for c in checks)
 d={'schema':f'FCV588_P26_CANONICAL_POSTAPPLY_{label}_V1',
    'status':'PASS' if ok else 'FAILED','exitCode':p.returncode,
    'command':command,'summary':lines,'logSHA256':sha(out),
    'appliedSourceSHA256':{name:sha(R/name) for name in ap['appliedFivePathsSHA256']},
    'canonicalRoot':str(R),'releaseApproval':'HOLD'}
 with receipt.open('x',encoding='utf8') as f:json.dump(d,f,indent=2);f.write('\n')
 print(json.dumps({'label':label,'status':d['status'],'summary':lines,'receiptSHA256':sha(receipt)}))
 if not ok:
  print(p.stdout[-2800:]);raise SystemExit(3)
one('FOCUSED',[NODE,'--test','test/fcv588-p26-archive-bz-viewer.test.mjs'],
 ['# tests 9','# pass 9','# fail 0'])
tests=['test/'+p.name for p in sorted((R/'test').glob('*.test.mjs'))]
one('FULL_NODE',[NODE,'--test','--test-concurrency=4',*tests],
 ['# tests 605','# pass 605','# fail 0','# skipped 0'])
one('PYTHON',[PY,'-m','unittest','discover','-s','test','-p','test_*.py','-v'],
 ['Ran 13 tests','OK'])
