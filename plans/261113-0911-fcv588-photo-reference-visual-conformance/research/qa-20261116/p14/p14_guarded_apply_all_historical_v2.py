"""Guarded P14 all-historical canonical apply. Never apply without explicit independent GO.
No git, no server stop. Fresh preflight, SHA-pinned allowlist, byte preimage ZIP, rollback.
"""
import argparse,hashlib,json,os,subprocess,sys
from pathlib import Path
from zipfile import ZipFile
ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
STAGE=ROOT/"_p14_stage_20261116"
QA=Path(__file__).resolve().parent
BACKUP=QA/"P14_GUARDED_PREIMAGE_BACKUP_ALL_HISTORICAL_V2_20261116.zip"
MANIFEST=QA/"P14_GUARDED_APPLY_ALLOWLIST_ALL_HISTORICAL_V2_20261116.json"
INTENT=QA/"P14_CANONICAL_APPLY_INTENT_ALL_HISTORICAL_V2_20261116.json"
RECEIPT=QA/"P14_CANONICAL_APPLY_RECEIPT_ALL_HISTORICAL_V2_20261116.json"
BACKUP_SHA="b2b2c8ecdd55f7dc96506ef988506420274d0f1b9ea4e7fde788ff029eb5b747"
MANIFEST_SHA="bb44084018ba8bd092edac97122a0bfb3d5d7b0204fd22a3288a6247d6433f6b"
def sha(b):return hashlib.sha256(b).hexdigest()
def newfile(path,obj):
 with path.open("x",encoding="utf8") as f:json.dump(obj,f,indent=2,ensure_ascii=True);f.write("\n")
def atomically_write(path,data):
 path.parent.mkdir(parents=True,exist_ok=True)
 tmp=path.with_name(path.name+".p14-transaction-tmp")
 with tmp.open("xb") as f:f.write(data);f.flush();os.fsync(f.fileno())
 os.replace(tmp,path)
def check():
 proc=subprocess.run([sys.executable,str(QA/"p14_guarded_apply_dryrun_all_historical_v2.py")],capture_output=True,text=True)
 if proc.returncode:raise RuntimeError("preflight failed: "+proc.stdout+proc.stderr)
 assert sha(BACKUP.read_bytes())==BACKUP_SHA and sha(MANIFEST.read_bytes())==MANIFEST_SHA
 manifest=json.loads(MANIFEST.read_text(encoding="utf8"));assert len(manifest["paths"])==38
 return manifest

def run():
 a=argparse.ArgumentParser();a.add_argument("--execute",action="store_true");a.add_argument("--review-file");a.add_argument("--review-sha");args=a.parse_args()
 manifest=check()
 if not args.execute:
  print(json.dumps({"dryrun":"PASS","allowedPaths":38,"executed":False}));return
 if not args.review_file or not args.review_sha:raise RuntimeError("independent review SHA required")
 review=Path(args.review_file).resolve()
 allowedReviewRoot=(QA.parent/"p14-test-oracle").resolve()
 if review.parent!=allowedReviewRoot or not review.is_file():raise RuntimeError("review file path not permitted")
 if sha(review.read_bytes())!=args.review_sha:raise RuntimeError("independent review SHA mismatch")
 words=review.read_text(encoding="utf8").upper()
 if "CANONICAL APPLY: GO" not in words or "CANONICAL APPLY: NO_GO" in words:
  raise RuntimeError("independent review does not explicitly authorize canonical apply GO")
 if INTENT.exists() or RECEIPT.exists():raise RuntimeError("transaction receipt already exists")
 intent={"schema":"FCV588_P14_APPLY_INTENT","status":"READY_TO_APPLY","reviewSHA256":args.review_sha,"backupSHA256":BACKUP_SHA,"manifestSHA256":MANIFEST_SHA,"paths":manifest["paths"]}
 newfile(INTENT,intent)
 applied=[]
 try:
  with ZipFile(BACKUP) as z:
   if z.testzip():raise RuntimeError("ZIP CRC failed")
   for entry in manifest["paths"]:
    path=ROOT/entry["path"]
    expected=entry["canonicalPreimageSHA256"]
    if expected is None:
     if path.exists():raise RuntimeError("new path collision during commit: "+str(path))
    elif not path.is_file() or sha(path.read_bytes())!=expected:
     raise RuntimeError("preimage drift during commit: "+str(path))
    data=(STAGE/entry["path"]).read_bytes()
    if sha(data)!=entry["stageSHA256"]:raise RuntimeError("stage mutated during commit: "+str(path))
    atomically_write(path,data)
    applied.append(entry)
   for entry in manifest["paths"]:
    if sha((ROOT/entry["path"]).read_bytes())!=entry["stageSHA256"]:raise RuntimeError("postapply mismatch: "+entry["path"])
 except Exception as exc:
  failures=[]
  with ZipFile(BACKUP) as z:
   for entry in reversed(applied):
    f=ROOT/entry["path"]
    try:
     if sha(f.read_bytes())!=entry["stageSHA256"]:raise RuntimeError("external drift; refusing rollback")
     if entry["operation"]=="modify":atomically_write(f,z.read("preimages/"+entry["path"]))
     else:f.unlink()
    except Exception as rollbackException:failures.append({"path":entry["path"],"error":str(rollbackException)})
  failure=QA/"P14_CANONICAL_APPLY_FAILED_ALL_HISTORICAL_V2_20261116.json"
  newfile(failure,{"status":"FAILED","error":str(exc),"rollbackErrors":failures,"appliedPaths":len(applied)})
  raise
 newfile(RECEIPT,{"schema":"FCV588_P14_APPLY_RECEIPT","status":"APPLIED_PRE_POST_QA_PENDING","reviewSHA256":args.review_sha,"backupSHA256":BACKUP_SHA,"manifestSHA256":MANIFEST_SHA,"appliedPathCount":len(applied),"postapplyPaths":[{"path":x["path"],"sha256":sha((ROOT/x["path"]).read_bytes())} for x in manifest["paths"]],"releaseApproval":"HOLD","hardwareValidated":False})
 print(json.dumps({"applied":True,"count":len(applied),"receiptSha":sha(RECEIPT.read_bytes())}))
if __name__=="__main__":run()