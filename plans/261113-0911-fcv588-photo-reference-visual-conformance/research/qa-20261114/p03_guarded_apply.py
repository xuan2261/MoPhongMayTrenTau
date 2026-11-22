"""P03 source-bound apply: source preimages, tests, Chrome, backup, write-once.
Run dry-run first. Neither this script nor its receipts grant OEM/release status.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import tempfile
import zipfile
from datetime import datetime,timezone

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
STAGE=ROOT/"staging/fcv588-photo-echo-20261114"
QA=ROOT/"plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261114"
OLD=ROOT/"docs/qa/FCV588_VISUAL_P02_20261114"
PARENT=OLD/"FCV588_VISUAL_P02_FINAL_INTEGRITY_20261114.json"
PARENT_POST=OLD/"FCV588_VISUAL_P02_INDEPENDENT_POSTRECEIPT_20261114.json"
ALLOW_EXISTING=("web/app.mjs","test/fcv588-public-channel-labels.test.mjs")
ALLOW_NEW=("web/fcv588-echo-rasterizer.mjs","test/fcv588-photo-echo-render.test.mjs")
ALLOW=tuple(sorted(ALLOW_EXISTING+ALLOW_NEW))
BACKUP=QA/"P03_BEFORE_APPLY_20261114.zip"
RECEIPT=QA/"P03_CANONICAL_GUARDED_APPLY_20261114.json"
JOURNAL=QA/"P03_CANONICAL_APPLY_JOURNAL_20261114.json"

def digest(path:Path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def must(condition,msg):
    if not condition:raise RuntimeError(msg)
def verify_browser(path:Path):
    b=json.loads(path.read_bytes())
    must(b["overallStatus"]=="PASS" and b["sourceTreeStable"],"browser failed or changed source")
    must(Path(b["stageRoot"]).resolve()==STAGE.resolve(),"browser used different stage")
    must(b["server"]["strictServerRequired"] and b["server"]["sha256"]==digest(ROOT/"tools/server.mjs"),
         "browser did not run strict authorized server")
    must(b["sourceManifestBefore"]==b["sourceManifestAfter"] and
         b["sourceManifestBefore"]["files"]==37,"browser source manifest changed")
    must(b["photoDeny"]["status"]=="PASS" and len(b["photoDeny"]["paths"])==8 and
         all(x["statusCode"]==404 for x in b["photoDeny"]["paths"]),
         "photo reference leaked by localhost")
    must(b["serverCleanup"]=="PASS","test-owned server not confirmed cleaned")
    must(len(b["cases"])==9 and not b["objectiveFailures"],"browser matrix absent/failing")
    # LF/HF labels legitimately repeat at different viewports: never
    # deduplicate a case by label when checking independent viewport coverage.
    viewport_set={(x["viewport"]["width"],x["viewport"]["height"])
                  for x in b["cases"]}
    must(viewport_set=={(1366,768),(375,812),(1920,1080)},
         "browser viewport coverage insufficient")
    for c in b["cases"]:
        must(c["status"]=="PASS" and not c["objectiveFailures"] and not c["failure"] and
             c["loadedJsCssAllMatchedStage"] and c["loadedJsCssCount"]==35 and
             c["rasterizerLoaded"] and
             c["rasterizerBodySha256"]==digest(STAGE/"web/fcv588-echo-rasterizer.mjs"),
             "browser case/source failed: "+c["name"])
        must(all(v==0 for v in c["errorCounts"].values()),"browser errors: "+c["name"])
        shot=c["screenshot"]
        path=Path(shot["path"])
        must(path.is_file() and path.stat().st_size==shot["bytes"] and
             digest(path)==shot["sha256"],"browser screenshot hash mismatched")
    must(any(c["name"]=="LF-White" for c in b["cases"]),
         "white photo-reference fixture not checked")
    return b

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("browser",type=Path)
    parser.add_argument("--apply",action="store_true")
    args=parser.parse_args()
    must(digest(PARENT)=="15ff0baab0b8bbe213c52857b630341a426305a7cf64eae9c07d1ac55f447d53",
         "P02 final seal drift")
    must(digest(PARENT_POST)=="ce4a103a52940d41f453e0a67c5cc2f7ef43a3ce16ee149461140b5bb68bd405",
         "P02 independent postreceipt drift")
    b=verify_browser(args.browser.resolve())
    node_log=QA/"p03-stage-full-node-v2.txt"
    py_log=QA/"p03-stage-python-v2.txt"
    text=node_log.read_text(encoding="utf-8")
    must("# tests 535" in text and "# pass 535" in text and "# fail 0" in text,
         "Node P03 stage 535/535 not proved")
    text=py_log.read_text(encoding="utf-8").replace("\r","")
    must("Ran 13 tests" in text and "\nOK" in text,
         "Python P03 stage 13/13 not proved")
    baseline=json.loads(PARENT.read_bytes())
    must(len(baseline["runtimeSHA256"])==38,"P02 source index count drift")
    curr={}
    stage={}
    different=[]
    for rel,expected in baseline["runtimeSHA256"].items():
        original=ROOT/rel
        staged=STAGE/rel
        must(original.is_file() and staged.is_file(),"missing runtime: "+rel)
        own=digest(original)
        after=digest(staged)
        must(own==expected,"canonical preimage differs from P02: "+rel)
        curr[rel]=own;stage[rel]=after
        if after!=expected:different.append(rel)
    must(different==["web/app.mjs"],"P03 changed unexpected runtime paths: "+repr(different))
    for rel in ALLOW_NEW:
        must(not (ROOT/rel).exists() and (STAGE/rel).is_file(),
             "new source already exists/missing: "+rel)
        if rel.startswith("web/"):
            stage[rel]=digest(STAGE/rel)
    tests_old=list((ROOT/"test").glob("*.test.mjs"))
    tests_stage=list((STAGE/"test").glob("*.test.mjs"))
    must(len(tests_stage)==len(tests_old)+1 and
         set(x.name for x in tests_stage)-set(x.name for x in tests_old)=={
             Path(ALLOW_NEW[1]).name},"unexpected test inventory diff")
    for prior in tests_old:
        name="test/"+prior.name
        if name not in ALLOW_EXISTING:
            must(digest(prior)==digest(STAGE/name),"other test modified: "+name)
    for rel in ALLOW_EXISTING:
        must(digest(ROOT/rel)!=digest(STAGE/rel),"expected source diff absent: "+rel)
    expected_stage_manifest={}
    for rel in sorted(stage):
        expected_stage_manifest[rel]=stage[rel]
    must(len(stage)==39,"expected exactly 39 runtime files")
    audit={"timestampUtc":datetime.now(timezone.utc).isoformat(),
           "stageRoot":str(STAGE),"canonicalRoot":str(ROOT),
           "parentP02SHA256":digest(PARENT),"parentP02PostSHA256":digest(PARENT_POST),
           "stageBrowserReceiptSHA256":digest(args.browser.resolve()),
           "stageBrowserReceiptPath":str(args.browser.resolve()),
           "stageNodeLogSHA256":digest(node_log),"stagePythonLogSHA256":digest(py_log),
           "runtimeP02Files":38,"runtimeP03Files":39,
           "approvedRuntimeDeltas":["web/app.mjs","web/fcv588-echo-rasterizer.mjs"],
           "allowlistedCopyPaths":list(ALLOW),
           "canonicalPreimages":{name:digest(ROOT/name) for name in ALLOW_EXISTING},
           "stagePostimages":{name:digest(STAGE/name) for name in ALLOW},
           "fullStageRuntimeSHA256":expected_stage_manifest,
           "status":"DRY_RUN_PASS" if not args.apply else "GUARDED_COPY_PENDING",
           "rightsClearance":False,"hardwareValidated":False,
           "featureClaims":"65/65_HOLD","phase6":"OPEN","releaseApproval":"HOLD"}
    if not args.apply:
        print("DRY_RUN_PASS canon_source_38/38, staged_39, browser_9/9, Node_535, Python_13, 4_allowlisted_paths")
        print("RUNTIME_DIFF="+repr(different+["web/fcv588-echo-rasterizer.mjs"]))
        return
    must(not BACKUP.exists() and not RECEIPT.exists() and not JOURNAL.exists(),
         "write-once receipt/backup exists")
    with zipfile.ZipFile(BACKUP,"x",compression=zipfile.ZIP_DEFLATED) as backup:
        for rel in ALLOW_EXISTING:backup.write(ROOT/rel,arcname=rel)
    with zipfile.ZipFile(BACKUP,"r") as backup:
        must(sorted(backup.namelist())==sorted(ALLOW_EXISTING),"backup wrong entries")
        for rel in ALLOW_EXISTING:
            must(hashlib.sha256(backup.read(rel)).hexdigest()==audit["canonicalPreimages"][rel],
                 "backup hash incorrect "+rel)
    audit["backupSHA256"]=digest(BACKUP)
    copied=[]
    try:
        for rel in ALLOW:
            orig=ROOT/rel
            new=STAGE/rel
            if rel in ALLOW_NEW:
                must(not orig.exists(),"new target appeared: "+rel)
            else:
                must(digest(orig)==audit["canonicalPreimages"][rel],
                     "source drift before apply: "+rel)
            fd,tmp=tempfile.mkstemp(prefix=".fcv588_p03_",suffix=".owned",dir=str(orig.parent))
            try:
                with os.fdopen(fd,"wb") as out:
                    out.write(new.read_bytes());out.flush();os.fsync(out.fileno())
                must(digest(Path(tmp))==audit["stagePostimages"][rel],"temp source checksum differs")
                os.replace(tmp,orig)
            finally:
                if os.path.exists(tmp):os.unlink(tmp)
            must(digest(orig)==audit["stagePostimages"][rel],"postcopy SHA mismatch: "+rel)
            copied.append(rel)
    finally:
        with JOURNAL.open("x",encoding="utf-8",newline="\n") as journal:
            json.dump({"performed":copied,"complete":len(copied)==len(ALLOW),
                       "timestampUtc":datetime.now(timezone.utc).isoformat()},
                      journal,indent=2);journal.write("\n")
    must(copied==list(ALLOW),"partial apply")
    for rel,sha in expected_stage_manifest.items():
        must(digest(ROOT/rel)==sha,"canonical runtime differs stage: "+rel)
    audit.update({"status":"P03_CANONICAL_SCOPED_COPY_COMPLETE_POST_QA_PENDING",
                  "performed":copied,"timestampUtc":datetime.now(timezone.utc).isoformat(),
                  "postAppliedRuntime":"39/39_MATCH"})
    with RECEIPT.open("x",encoding="utf-8",newline="\n") as file:
        json.dump(audit,file,indent=2,ensure_ascii=False);file.write("\n")
    print("APPLIED="+repr(copied))
    print("BACKUP_SHA256="+digest(BACKUP))
    print("APPLY_RECEIPT_SHA256="+digest(RECEIPT))
    print("CANONICAL_RUNTIME_39/39_MATCH; REQUIRES_INDEPENDENT_FINAL_QA")

if __name__=="__main__":main()

