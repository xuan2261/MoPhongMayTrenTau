from pathlib import Path
from hashlib import sha256
from zipfile import ZipFile,ZIP_DEFLATED
import json
ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
STAGE=ROOT/"_p14_stage_20261116"
QA=Path(__file__).resolve().parent
OUT=QA/"P14_GUARDED_PREIMAGE_BACKUP_20261116.zip"
MAN=QA/"P14_GUARDED_APPLY_ALLOWLIST_20261116.json"
FOLDERS=("src","web","test","docs/evidence")
def h(x):return sha256(x).hexdigest()
changed=[]
for folder in FOLDERS:
 for f in sorted((STAGE/folder).rglob("*")):
  if not f.is_file():continue
  rel=f.relative_to(STAGE).as_posix();orig=ROOT/rel
  new=f.read_bytes();old=orig.read_bytes() if orig.is_file() else None
  if old==new:continue
  changed.append({"path":rel,"operation":"modify" if old is not None else "create","stageSHA256":h(new),"stageBytes":len(new),"canonicalPreimageSHA256":h(old) if old is not None else None,"canonicalPreimageBytes":len(old) if old is not None else None})
if len(changed)!=26 or sum(a["operation"]=="modify" for a in changed)!=16 or sum(a["operation"]=="create" for a in changed)!=10:
 raise SystemExit(f"unexpected allowlist counts {len(changed)} {sum(a['operation']=='modify' for a in changed)}")
manifest={"schema":"P14_GUARDED_PREIMAGE_V1","canonicalRoot":str(ROOT),"stageRoot":str(STAGE),"status":"PREPARED_NOT_APPLIED","paths":changed}
manifestBytes=(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n").encode("utf8")
with ZipFile(OUT,"x",compression=ZIP_DEFLATED) as z:
 z.writestr("P14_PREIMAGE_MANIFEST.json",manifestBytes)
 for e in changed:
  if e["operation"]=="modify":z.write(ROOT/e["path"],"preimages/"+e["path"])
with ZipFile(OUT) as z:
 assert z.read("P14_PREIMAGE_MANIFEST.json")==manifestBytes
 for e in changed:
  if e["operation"]=="modify":assert h(z.read("preimages/"+e["path"]))==e["canonicalPreimageSHA256"]
with MAN.open("xb") as f:f.write(manifestBytes)
print(json.dumps({"backup":str(OUT),"backupSHA256":h(OUT.read_bytes()),"manifest":str(MAN),"manifestSHA256":h(MAN.read_bytes()),"modifiedPreimages":16,"createdStagePaths":10,"canonicalModified":False},ensure_ascii=True))