"""P14 guarded preapply verification ONLY. Never modifies canonical."""
from pathlib import Path
from hashlib import sha256
from zipfile import ZipFile
import json,sys
ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=Path(__file__).resolve().parent
STAGE=ROOT/"_p14_stage_20261116"
EXPECTED_BACKUP_SHA="627010a98727c117ba7dd428e0b55f3c12a1dfdd3ab579fb263f758ba06df6f4"
EXPECTED_STAGE_SEAL_SHA="1e4a17e23689fa00e68c002c125eb46c066af092b8de4fd666131466ba4f3418"
EXPECTED_BROWSER_SHA="d63d2c81b6ca9472ad6911d6ca0c3842f8e027c21a1e354305dad2f571346498"
EXPECTED_NODE_SHA="2b78c30c88d05af4b3d664b1143e56a01e3579242074621cdc2874d421dcc028"
EXPECTED_PY_SHA="aa4790e0635f65d20cc91faae7e3e73ece76a1d1e89d75470e70b2bb69e576a8"
def digest(x):return sha256(x).hexdigest()
def readsha(path,expected):
 result=digest(path.read_bytes());assert result==expected,(str(path),result,expected)
 return result
manifest=json.loads((QA/"P14_GUARDED_APPLY_ALLOWLIST_20261116.json").read_text(encoding="utf8"))
assert len(manifest["paths"])==26
readsha(QA/"P14_GUARDED_PREIMAGE_BACKUP_20261116.zip",EXPECTED_BACKUP_SHA)
readsha(QA/"P14_STAGE_RUNTIME45_PREAPPLY_INTEGRITY_20261116.json",EXPECTED_STAGE_SEAL_SHA)
readsha(QA/"P14_STAGE_CHROME_ATTEMPT3_20261116.json",EXPECTED_BROWSER_SHA)
readsha(QA/"P14_STAGE_FULL_NODE_AFTER_REBASELINE_ATTEMPT1_20261116.txt",EXPECTED_NODE_SHA)
readsha(QA/"P14_STAGE_PYTHON_ATTEMPT1_20261116.txt",EXPECTED_PY_SHA)
with ZipFile(QA/"P14_GUARDED_PREIMAGE_BACKUP_20261116.zip") as backup:
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
print(json.dumps({"dryRun":"PASS","fileCount":len(manifest["paths"]),"modifyCount":16,"createCount":10,"preimageZipSha":EXPECTED_BACKUP_SHA,"stageSealSha":EXPECTED_STAGE_SEAL_SHA,"browserSha":EXPECTED_BROWSER_SHA,"userServer":connections[0],"applied":False},ensure_ascii=True))