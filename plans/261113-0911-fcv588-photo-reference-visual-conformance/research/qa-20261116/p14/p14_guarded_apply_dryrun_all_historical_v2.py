"""P14 guarded preapply verification ONLY. Never modifies canonical."""
from pathlib import Path
from hashlib import sha256
from zipfile import ZipFile
import json,sys
ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=Path(__file__).resolve().parent
STAGE=ROOT/"_p14_stage_20261116"
EXPECTED_BACKUP_SHA="b2b2c8ecdd55f7dc96506ef988506420274d0f1b9ea4e7fde788ff029eb5b747"
EXPECTED_STAGE_SEAL_SHA="29890c775bac1ba8785dd87b8adfb7d67be9fdfdbcb973cff67fe77ed0c76dff"
EXPECTED_BROWSER_SHA="895420e2de501648719729807700fa75ecaddc9f1cb01af736091311875f95d0"
EXPECTED_NODE_SHA="72bfeefc7647d4823850c7acc53d0e88003c96379f8aef0f091fa8c8cb429350"
EXPECTED_PY_SHA="2f5a3f61ac2a5874edaedbf6516269de18c251e44faa5ff4124d8bdaa45579a0"
def digest(x):return sha256(x).hexdigest()
def readsha(path,expected):
 result=digest(path.read_bytes());assert result==expected,(str(path),result,expected)
 return result
manifest=json.loads((QA/"P14_GUARDED_APPLY_ALLOWLIST_ALL_HISTORICAL_V2_20261116.json").read_text(encoding="utf8"))
assert len(manifest["paths"])==38
readsha(QA/"P14_GUARDED_PREIMAGE_BACKUP_ALL_HISTORICAL_V2_20261116.zip",EXPECTED_BACKUP_SHA)
readsha(QA/"P14_STAGE_RUNTIME50_PREAPPLY_INTEGRITY_20261116.json",EXPECTED_STAGE_SEAL_SHA)
readsha(QA/"P14_STAGE_CHROME_ALL_HISTORICAL_V4_20261116.json",EXPECTED_BROWSER_SHA)
readsha(QA/"P14_STAGE_FULL_NODE_ALL_HISTORICAL_V3_20261116.txt",EXPECTED_NODE_SHA)
readsha(QA/"P14_STAGE_PYTHON_ALL_HISTORICAL_V2_20261116.txt",EXPECTED_PY_SHA)
with ZipFile(QA/"P14_GUARDED_PREIMAGE_BACKUP_ALL_HISTORICAL_V2_20261116.zip") as backup:
 assert backup.testzip() is None
 for entry in manifest["paths"]:
  rel=Path(entry["path"]);original=ROOT/rel;new=STAGE/rel
  assert new.is_file() and digest(new.read_bytes())==entry["stageSHA256"]
  if entry["operation"]=="create":assert not original.exists(),("unexpected new-path collision",str(original))
  else:
   assert original.is_file() and digest(original.read_bytes())==entry["canonicalPreimageSHA256"]
   assert digest(backup.read("preimages/"+rel.as_posix()))==entry["canonicalPreimageSHA256"]
# Protect server ownership without sending any network requests or stopping any process.
import subprocess
ps=subprocess.run(["powershell","-NoProfile","-Command","$a=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue|Where-Object {$_.LocalPort -in 4173,4214,4215});$a|Select LocalAddress,LocalPort,OwningProcess|ConvertTo-Json -Compress"],capture_output=True,text=True,check=True)
raw=ps.stdout.strip();connections=json.loads(raw) if raw else []
if isinstance(connections,dict):connections=[connections]
assert len(connections)==1 and connections[0]["LocalPort"]==4173 and connections[0]["OwningProcess"]==1204 and connections[0]["LocalAddress"]=="127.0.0.1",connections
assert all((ROOT/x).is_file() for x in ["sources/FCV588_GiaoDienThucTeMay2016/dual.jpg","sources/FCV588_GiaoDienThucTeMay2016/giaoDien.jpg","sources/FCV588_GiaoDienThucTeMay2016/hf.jpg","sources/FCV588_GiaoDienThucTeMay2016/lf.jpg","sources/FCV588_GiaoDienThucTeMay2016/nav1.jpg","sources/FCV588_GiaoDienThucTeMay2016/nav2.jpg","sources/FCV588_GiaoDienThucTeMay2016/zoom.jpg","sources/FCV588_GiaoDienThucTeMay2016/zoom2.jpg"])
print(json.dumps({"dryRun":"PASS","fileCount":len(manifest["paths"]),"modifyCount":17,"createCount":21,"preimageZipSha":EXPECTED_BACKUP_SHA,"stageSealSha":EXPECTED_STAGE_SEAL_SHA,"browserSha":EXPECTED_BROWSER_SHA,"userServer":connections[0],"applied":False},ensure_ascii=True))