"""Read-only P15 postapply runtime50/style/test/OEM/source/server integrity."""
import json,subprocess
from pathlib import Path
from hashlib import sha256
ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
STAGE=ROOT/"_p15_stage_20261116"
QA=Path(__file__).resolve().parent
BASE=ROOT/"docs"/"qa"/"FCV588_P14_VERSIONED_REPLAY_20261116"/"FCV588_P14_VERSIONED_REPLAY_FINAL_INTEGRITY_20261116.json"
SEAL=QA/"P15_STAGE_CSS_SOURCE_INTEGRITY_20261116.json"
MAN=QA/"P15_CSS_APPLY_ALLOWLIST_20261116.json"
BACKUP=QA/"P15_CSS_PREIMAGE_BACKUP_20261116.zip"
def h(path):return sha256(path.read_bytes()).hexdigest()
seal=json.loads(SEAL.read_text(encoding="utf8"));base=json.loads(BASE.read_text(encoding="utf8"))
assert len(seal['runtimePaths'])==50 and len(base['runtime50'])==50
fail=[]
for r in seal['runtimePaths']:
 path=r['path'];file=ROOT/path;stage=STAGE/path
 if not file.is_file() or h(file)!=r['stageSHA256'] or h(stage)!=r['stageSHA256']:fail.append('runtime '+path)
 if path!='web/styles.css' and base['runtime50'][path]!=r['stageSHA256']:fail.append('P14 invariant '+path)
manifest=json.loads(MAN.read_text(encoding='utf8'))
for e in manifest['paths']:
 p=ROOT/e['path']
 if not p.is_file() or h(p)!=e['stageSHA256']:fail.append('allowlist '+e['path'])
for photo,expected in seal['originalOEM8SHA256'].items():
 p=ROOT/'sources'/'FCV588_GiaoDienThucTeMay2016'/photo
 if not p.is_file() or h(p)!=expected:fail.append('OEM '+photo)
ps=subprocess.run(['powershell','-NoProfile','-Command','$a=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue|Where-Object {$_.LocalPort -in 4173,4214,4215,4216});$a|Select LocalAddress,LocalPort,OwningProcess|ConvertTo-Json -Compress'],capture_output=True,text=True,check=True)
port=json.loads(ps.stdout) if ps.stdout.strip() else []
if isinstance(port,dict):port=[port]
if len(port)!=1 or port[0]['LocalPort']!=4173 or port[0]['OwningProcess']!=1204 or port[0]['LocalAddress']!='127.0.0.1':fail.append('protected user server')
result={'status':'PASS' if not fail else 'FAILED','runtimeSHA':f"{50-len([x for x in fail if x.startswith('runtime ')])}/50",'changedRuntime':'web/styles.css','newTest':'test/fcv588-p15-uniform-lcd-css.test.mjs','pathsExact':len(manifest['paths'])-len([x for x in fail if x.startswith('allowlist ')]),'originalPhotos':8,'protectedServer':port,'errors':fail}
print(json.dumps(result,ensure_ascii=True))
if fail:raise SystemExit(1)