"""P28 one-new-test-only canonical transaction; never mutates runtime/source GUI."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
STAGE=ROOT/"staging/fcv588-p28-mode-visual-20261117"
QA=ROOT/"docs/qa/FCV588_P28_MODE_VISUAL_20261117"
P27=ROOT/"docs/qa/FCV588_P27_EVENT_TIMELINE_20261117"
P27_FINAL=P27/"FCV588_P27_EVENT_TIMELINE_FINAL_INTEGRITY_20261117.json"
P27_POST=P27/"FCV588_P27_EVENT_TIMELINE_INDEPENDENT_SHA_POSTRECEIPT_20261117.json"
P27_FINAL_HASH="97232cffc3ad6906beb08022c9c49bc39b6776fe7623bda193ec23605ab5ce3a"
P27_POST_HASH="2a8ece9b2a2dda1f0e60b4ed0f3a9d459b4661c79d275e3dfc3a74f343f4578a"
NEW="test/fcv588-p28-mode-replay-matrix.test.mjs"
DRYRUN=QA/"P28_TEST_ONLY_DRYRUN_V2_20261117.json"
APPLY=QA/"P28_TEST_ONLY_GUARDED_APPLY_20261117.json"
FOCUSED=QA/"P28_STAGE_FOCUSED_V2_20261117.txt"
NODE=QA/"P28_STAGE_FULL_NODE_V1_20261117.txt"
PY=QA/"P28_STAGE_PYTHON_V1_20261117.txt"
CHROME=QA/"P28_STAGE_BROWSER_MODE_MATRIX_V2_20261117.json"
LIVE=QA/"P28_STAGE_LIVE_LCD_MODES_V3_20261117.json"
MANIFEST=QA/"P28_SYNTHETIC_FIXTURE_PROVENANCE_20261117.json"

def sha(p):
 h=hashlib.sha256()
 with Path(p).open("rb") as f:
  for b in iter(lambda:f.read(1048576),b""):h.update(b)
 return h.hexdigest()
def check(cond,message):
 if not cond:raise RuntimeError("P28 NO_GO "+message)
def data(p):return json.loads(Path(p).read_text(encoding="utf8"))
def write(path,content):
 with path.open("x",encoding="utf8",newline="\n") as f:
  json.dump(content,f,ensure_ascii=False,indent=2,sort_keys=True)
  f.write("\n")
def base():
 check(sha(P27_FINAL)==P27_FINAL_HASH and sha(P27_POST)==P27_POST_HASH,
       "P27 parent integrity SHA changed")
 final=data(P27_FINAL);runtime=final["canonicalRuntime54SHA256"]
 check(len(runtime)==54,"P27 runtime54 count")
 for name,expected in runtime.items():
  check((ROOT/name).is_file() and (STAGE/name).is_file() and
        sha(ROOT/name)==expected==sha(STAGE/name),"runtime preimage drift: "+name)
 photos=final["originalOEMReferenceOnly8SHA256"]
 check(len(photos)==8,"OEM8 count")
 for name,digest in photos.items():
  check(sha(ROOT/"sources/FCV588_GiaoDienThucTeMay2016"/name)==digest,
        "OEM reference drift "+name)
 check(final["releaseApproval"]=="HOLD" and final["claims"]=="65/65 HOLD" and
       final["hardwareValidated"] is False,"P27 release/safety drift")
 return final,runtime
def source_files(folder):
 out={}
 for dirname in ("src","web","test"):
  for p in (folder/dirname).rglob("*"):
   if p.is_file() and "__pycache__" not in p.parts and p.suffix!=".pyc":
    out[p.relative_to(folder).as_posix()]=sha(p)
 return out
def check_source():
 stage=source_files(STAGE);original=source_files(ROOT)
 check(not (ROOT/NEW).exists(),"new canonical test path exists before apply")
 check(sorted(set(stage)-set(original))==[NEW],"stage extra source not exact new test")
 check(not set(original)-set(stage),"canonical file missing from P28 staging")
 check(all(stage[k]==original[k] for k in original),
       "source other than new test changed")
 return stage[NEW]
def check_qa():
 log=FOCUSED.read_text(encoding="utf8")
 check(re.search(r"(?m)^# pass 4\s*$",log) and
       re.search(r"(?m)^# fail 0\s*$",log),"focused4 not green")
 log=NODE.read_text(encoding="utf8")
 check(re.search(r"(?m)^# tests 617\s*$",log) and
       re.search(r"(?m)^# pass 617\s*$",log) and
       re.search(r"(?m)^# fail 0\s*$",log) and
       re.search(r"(?m)^# skipped 0\s*$",log),"Node617 not green")
 check("Ran 13 tests" in PY.read_text(encoding="utf8") and
       re.search(r"(?m)^OK\s*$",PY.read_text(encoding="utf8")),
       "Python13 not green")
 browser=data(CHROME)
 check(browser["status"]=="PASS" and len(browser["cases"])==7 and
       browser["sourceBodiesCount"]==52 and not browser["errors"] and
       browser["qaPortClosed"] and browser["ownedQAServerExited"],
       "Chrome source/port/QA gate failed")
 for route,digest in browser["httpBodies"].items():
  target=STAGE/("web/index.html" if route=="/" else route.lstrip("/"))
  check(sha(target)==digest,"HTTP source SHA mismatch "+route)
 for filename,digest in browser["screenshots"].items():
  check(sha(QA/filename)==digest,"browser screenshot SHA mismatch "+filename)
 for filename,digest in browser["sourcePathsSHA256"].items():
  check(sha(STAGE/filename)==digest,"source fixture SHA mismatch "+filename)
 live=data(LIVE)
 check(live["status"]=="PASS" and len(live["cases"])==3 and
       live["loadedHTTPSourceCount"]==52 and not live["errors"] and
       live["qaPortClosed"] and live["ownedQAServerExited"] and
       live["oemPixelValidation"] is False and
       live["historicalLCDReplay"] is False,
       "isolated LF/DUAL/HF actual LCD browser gate failed")
 for route,digest in live["httpBodies"].items():
  target=STAGE/("web/index.html" if route=="/" else route.lstrip("/"))
  check(sha(target)==digest,"live LCD HTTP source SHA mismatch "+route)
 for name,digest in live["screenshots"].items():
  check(sha(QA/name)==digest,"live LCD screenshot SHA mismatch "+name)
 check([case["mode"] for case in live["cases"]]==["LF","DUAL","HF"],
       "wrong sequence of actual browser LCD mode cases")
 check(len({case["canvasRGBA_SHA256"] for case in live["cases"]})==3,
       "browser LCD LF/DUAL/HF pixel hashes not distinct")
 manifest=data(MANIFEST)
 check(len(manifest["entries"])==6 and manifest["historicalAuthentication"] is False,
       "synthetic test provenance gap")
 for entry in manifest["entries"]:
  check(sha(QA/entry["envelopeFile"])==entry["envelopeSHA256"] and
        sha(QA/entry["sidecarFile"])==entry["sidecarSHA256"],
        "fixture byte SHA mismatch "+entry["name"])
 return {p.name:sha(p) for p in [FOCUSED,NODE,PY,CHROME,LIVE,MANIFEST]}
def dryrun():
 check(not DRYRUN.exists() and not APPLY.exists(),"dryrun or apply exists (write-once)")
 _,runtime=base()
 digest=check_source();evidence=check_qa()
 write(DRYRUN,{
  "schema":"FCV588_P28_TEST_ONLY_DRYRUN_V2",
  "createdUTC":datetime.datetime.now(datetime.timezone.utc).isoformat(),
  "status":"P28_ONE_NEW_TEST_ONLY_PREAPPLY_GO",
  "parentP27FinalSHA256":P27_FINAL_HASH,
  "parentP27IndependentSHA256":P27_POST_HASH,
  "runtime54UntouchedSHA256":runtime,
  "newTestRelPath":NEW,"newTestStagingSHA256":digest,
  "canonicalNewPathAbsent":True,"modifiedRuntimePaths":[],
  "oldFileBackupRequired":False,
  "reason":"New test only; no existing canonical file replaced",
  "stageEvidenceSHA256":evidence,
  "guardScriptSHA256":sha(Path(__file__)),
  "supersededInitialDryrunSHA256":"bd2fcf29b3f04224f19deea743c1b5dc5727d491c9f5e2cdecc7a4df16633c34",
  "syntheticOnly":True,"hardwareValidated":False,
  "historicalAuthentication":False,"releaseApproval":"HOLD",
 })
 print(json.dumps({"status":"DRYRUN_PASS","sha":sha(DRYRUN),"testSHA":digest}))
def apply():
 check(DRYRUN.exists() and not APPLY.exists(),"dryrun missing or already applied")
 pin=data(DRYRUN);_,runtime=base()
 digest=check_source();evidence=check_qa()
 check(pin["status"]=="P28_ONE_NEW_TEST_ONLY_PREAPPLY_GO" and
       pin["newTestStagingSHA256"]==digest and
       pin["runtime54UntouchedSHA256"]==runtime and
       pin["stageEvidenceSHA256"]==evidence and
       pin["guardScriptSHA256"]==sha(Path(__file__)),
       "dryrun/source/QA/guard script SHA drift")
 target=ROOT/NEW
 temp=None
 installed=False
 try:
  with tempfile.NamedTemporaryFile(dir=target.parent,prefix=".p28-test-only-",
                                   delete=False) as f:
   f.write((STAGE/NEW).read_bytes())
   temp=Path(f.name)
  check(sha(temp)==digest,"staged temp SHA drift")
  # Late guard immediately before single mutation.
  check(not target.exists(),"canonical test target appeared")
  for name,expected in runtime.items():
   check(sha(ROOT/name)==expected,"late runtime canonical drift "+name)
  check(not target.exists(),"canonical test target appeared at commit")
  os.replace(temp,target);installed=True
  check(sha(target)==digest,"postcopy SHA drift")
  write(APPLY,{
   "schema":"FCV588_P28_TEST_ONLY_CANONICAL_APPLY_V1",
   "createdUTC":datetime.datetime.now(datetime.timezone.utc).isoformat(),
   "status":"P28_TEST_ONLY_CANONICAL_APPLIED",
   "newTestRelPath":NEW,"newTestCanonicalSHA256":digest,
   "runtime54SHA256":runtime,"dryrunSHA256":sha(DRYRUN),
   "parentP27FinalSHA256":P27_FINAL_HASH,
   "modifiedRuntimePaths":[],"oldFileBackupRequired":False,
   "releaseApproval":"HOLD",
  })
 except BaseException as original:
  if installed:
   try:
    # This transaction only creates one previously absent owned path.
    # Even unexpected post-copy hash failure must never leave a partial file.
    if target.exists():target.unlink()
    check(not target.exists(),"rollback retained P28 new canonical test")
   except BaseException as rollback:
    raise RuntimeError("P28 single-new-file rollback NO_GO: "+str(rollback)) from original
  raise
 finally:
  if temp and temp.exists():temp.unlink()
 print(json.dumps({"status":"CANONICAL_TEST_ONLY_APPLIED","sha":sha(APPLY),"testSHA":digest}))
def audit():
 check(APPLY.exists(),"apply receipt missing")
 applied=data(APPLY);base()
 check(applied["status"]=="P28_TEST_ONLY_CANONICAL_APPLIED" and
       sha(ROOT/NEW)==sha(STAGE/NEW)==applied["newTestCanonicalSHA256"],
       "postapply test SHA mismatch")
 check(sha(DRYRUN)==applied["dryrunSHA256"],"dryrun changed")
 print(json.dumps({"status":"POSTAPPLY_SOURCE_AUDIT_PASS",
                   "runtime":54,"newTestSHA256":sha(ROOT/NEW),"applySHA256":sha(APPLY)}))
if __name__=="__main__":
 check(len(sys.argv)==2 and sys.argv[1] in {"dryrun","apply","audit"},"mode")
 {"dryrun":dryrun,"apply":apply,"audit":audit}[sys.argv[1]]()
