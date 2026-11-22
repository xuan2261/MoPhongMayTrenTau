"""P15 source-valid one-CSS-file staging seal and immutable preimage backup."""
from pathlib import Path
from hashlib import sha256
from zipfile import ZipFile,ZIP_DEFLATED
import json
ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
STAGE=ROOT/"_p15_stage_20261116"
QA=Path(__file__).resolve().parent
P14=ROOT/"docs"/"qa"/"FCV588_P14_VERSIONED_REPLAY_20261116"
FINAL=json.loads((P14/"FCV588_P14_VERSIONED_REPLAY_FINAL_INTEGRITY_20261116.json").read_text(encoding="utf8"))
assert len(FINAL["runtime50"])==50
def sha(data):return sha256(data).hexdigest()
def h(path):return sha(path.read_bytes())
def must(ok,message):
 if not ok:raise RuntimeError(message)
CSS="web/styles.css";TEST="test/fcv588-p15-uniform-lcd-css.test.mjs"
original=ROOT/CSS;target=STAGE/CSS;newtest=STAGE/TEST
must(original.is_file() and target.is_file() and newtest.is_file(),"one CSS plus one test must exist")
must(h(original)==FINAL["runtime50"][CSS],"canonical CSS preimage drift")
must(h(original)!=h(target),"no CSS geometry change")
must(not (ROOT/TEST).exists(),"new test collision")
rows=[]
for path,canonicalSha in sorted(FINAL["runtime50"].items()):
 canon=ROOT/path;stag=STAGE/path
 must(canon.is_file() and stag.is_file(),"runtime missing "+path)
 must(h(canon)==canonicalSha,"canonical P14 changed "+path)
 stagedSha=h(stag)
 must(stagedSha==canonicalSha or path==CSS,"unexpected stage runtime modification "+path)
 rows.append({"path":path,"canonicalPreimageSHA256":canonicalSha,"stageSHA256":stagedSha,"action":"modify" if path==CSS else "unchanged"})
must(sum(r["action"]=="modify" for r in rows)==1,"only stylesheet may change")
for rootName in ("src","web","test","tools"):
 canon=set(f.relative_to(ROOT).as_posix() for f in (ROOT/rootName).rglob('*') if f.is_file())
 stage=set(f.relative_to(STAGE).as_posix() for f in (STAGE/rootName).rglob('*') if f.is_file())
 must(stage-canon==({TEST} if rootName=="test" else set()) and canon-stage==set(),"stage file inventory changed for "+rootName)
for part in ("src","web","test","tools"):
 for f in (ROOT/part).rglob('*'):
  if not f.is_file() or f.relative_to(ROOT).as_posix()==CSS:continue
  copy=STAGE/f.relative_to(ROOT)
  must(h(f)==h(copy),"stage source/test diff "+str(f))
manifest={"schema":"FCV588_P15_CSS_GUARDED_ALLOWLIST_V1","status":"PREPARED_NOT_APPLIED","paths":[{"path":CSS,"operation":"modify","canonicalPreimageSHA256":h(original),"stageSHA256":h(target)},{"path":TEST,"operation":"create","canonicalPreimageSHA256":None,"stageSHA256":h(newtest)}]}
MAN=QA/"P15_CSS_APPLY_ALLOWLIST_20261116.json"
bytesMan=(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n").encode("utf8")
with MAN.open("xb") as f:f.write(bytesMan)
ZIP=QA/"P15_CSS_PREIMAGE_BACKUP_20261116.zip"
with ZipFile(ZIP,"x",compression=ZIP_DEFLATED) as z:
 z.writestr("P15_PREIMAGE_MANIFEST.json",bytesMan)
 z.writestr("preimages/"+CSS,original.read_bytes())
with ZipFile(ZIP) as z:
 must(z.testzip() is None and z.read("P15_PREIMAGE_MANIFEST.json")==bytesMan and sha(z.read("preimages/"+CSS))==h(original),"backed up css corrupted")
gates={}
for label,name in [
 ("canonicalPhotoAndModesCapture","P15_CHROME_MODE_GEOMETRY_ATTEMPT2_20261116.json"),
 ("canonicalBrowserReconciliation","P15_CHROME_MODE_GEOMETRY_RECONCILED_20261116.json"),
 ("preimageSourceValidRED","P15_GEOMETRY_CANONICAL_PREIMAGE_RED_20261116.json"),
 ("stagingBehaviorGREEN","P15_GEOMETRY_STAGE_FIRST_GREEN_20261116.json"),
 ("stageFullNode","P15_STAGE_FULL_NODE_AFTER_G1G2_20261116.txt"),
 ("stagePython","P15_STAGE_PYTHON_AFTER_G1G2_20261116.txt"),
 ("stageChrome","P15_STAGE_CHROME_MODE_GEOMETRY_V1_20261116.json"),
]:
 p=QA/name;must(p.is_file(),"missing gate "+name);gates[label]={"file":name,"sha256":h(p)}
chrome=json.loads((QA/gates["stageChrome"]["file"]).read_text())
must(len(chrome["checks"])==103 and not chrome["errors"] and len(chrome["screenshots"])==24 and len(chrome["httpBodies"])==273 and all(row["match"] for row in chrome["httpBodies"]),"stage Chrome gate failed")
red=json.loads((QA/gates["preimageSourceValidRED"]["file"]).read_text());green=json.loads((QA/gates["stagingBehaviorGREEN"]["file"]).read_text())
must(len(red["errors"])==11 and len(green["checks"])==13 and not green["errors"],"actual RED/GREEN counts")
node=(QA/gates["stageFullNode"]["file"]).read_text(errors="replace")
python=(QA/gates["stagePython"]["file"]).read_text(errors="replace")
must('# pass 579' in node and '# fail 0' in node and 'Ran 13 tests' in python and 'OK' in python,"stage software full QA")
photos={}
for img in (ROOT/"sources"/"FCV588_GiaoDienThucTeMay2016").glob('*.jpg'):photos[img.name]=h(img)
must(len(photos)==8 and photos==FINAL["originalOEMReferenceOnly8SHA256"],"8 OEM photos original SHA change")
SEAL=QA/"P15_STAGE_CSS_SOURCE_INTEGRITY_20261116.json"
obj={"schema":"FCV588_P15_STAGE_CSS_SOURCE_INTEGRITY_V1","status":"STAGE_QA_GREEN_INDEPENDENT_REVIEW_PENDING","scope":"F1_PUBLIC_REFERENCE_V2_NO_OEM_PIXEL_FIDELITY_CLAIM","canonicalRoot":str(ROOT),"stageRoot":str(STAGE),"preimageRuntimeCount":50,"stageRuntimeCount":50,"changedExistingRuntimeCount":1,"newTestsCount":1,"runtimePaths":rows,"qaGatesSHA256":gates,"allowlistSHA256":h(MAN),"backupSHA256":h(ZIP),"originalOEM8SHA256":photos,"canonicalApply":"NOT_APPLIED","releaseApproval":"HOLD","hardwareValidated":False,"firmwareInstalled":None,"rightsClearance":False}
with SEAL.open("x",encoding="utf8") as f:json.dump(obj,f,indent=2,ensure_ascii=False);f.write("\n")
print(json.dumps({"status":"PASS","runtime50":50,"stageChanged":"web/styles.css","newTest":TEST,"qaChromeChecks":103,"screenshots":24,"httpBodies":273,"preimageRedFailures":11,"stageGreenChecks":13,"stageNode":579,"stagePython":13,"sourceSealSHA256":h(SEAL),"allowlistSHA256":h(MAN),"backupSHA256":h(ZIP)},ensure_ascii=True))