"""Read-only postapply runtime50 and OEM reference checks; no canonical write."""
from pathlib import Path
import hashlib,json,subprocess
ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=Path(__file__).resolve().parent
manifest=json.loads((QA/"P14_STAGE_RUNTIME50_PREAPPLY_INTEGRITY_20261116.json").read_text())
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
errors=[]
for entry in manifest["runtimePaths"]:
 p=ROOT/entry["path"]
 if not p.is_file() or sha(p)!=entry["sha256"]:errors.append(entry["path"])
for filename,expected in manifest["referenceOnlyOriginal8SHA256"].items():
 p=ROOT/"sources"/"FCV588_GiaoDienThucTeMay2016"/filename
 if not p.is_file() or sha(p)!=expected:errors.append("OEM original "+filename)
ps=subprocess.run(["powershell","-NoProfile","-Command","$x=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue|Where-Object {$_.LocalPort -in 4173,4214,4215});$x|Select LocalAddress,LocalPort,OwningProcess|ConvertTo-Json -Compress"],capture_output=True,text=True,check=True)
sockets=json.loads(ps.stdout) if ps.stdout.strip() else []
if isinstance(sockets,dict):sockets=[sockets]
if len(sockets)!=1 or sockets[0].get("LocalPort")!=4173 or sockets[0].get("OwningProcess")!=1204:errors.append("server identity")
print(json.dumps({"status":"PASS" if not errors else "FAIL","runtimeMatch":50-len([e for e in errors if not e.startswith('OEM') and e!='server identity']),"runtimeTotal":50,"originalOemCount":8,"userServer":sockets,"errors":errors},ensure_ascii=True))
if errors:raise SystemExit(1)