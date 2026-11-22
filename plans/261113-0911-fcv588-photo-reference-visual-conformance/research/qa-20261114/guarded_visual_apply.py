"""Guarded, scoped apply of the FCV588 photo-visual presentation work package.
This script runs ONLY after stage browser + unit QA; never modifies historical QA.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import tempfile
import zipfile
from datetime import datetime, timezone

ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT / "staging/fcv588-photo-visual-20261114"
QA = ROOT / "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261114"
V57 = ROOT / "docs/qa/FCV588_V57_HEADER_COMPACT_20261031"
PREVIOUS = V57 / "V57_HEADER_COMPACT_SCOPED_INTEGRITY_20261031.json"
RECON = QA / "v57_reconciliation_20261114.json"
RUNTIME_CHANGE = frozenset(("web/app.mjs","web/lcd-presentation.mjs","web/styles.css"))
EXISTING_TEST_CHANGE = frozenset((
    "test/fcv588-public-channel-labels.test.mjs",
    "test/fcv588-public-display.test.mjs",
    "test/fcv588-public-reference-visual.test.mjs",
))
NEW_TEST = "test/fcv588-photo-display.test.mjs"
COPY_PATHS = tuple(sorted(RUNTIME_CHANGE | EXISTING_TEST_CHANGE | {NEW_TEST}))

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def digest(path: Path) -> str:
    return sha(path.read_bytes())

def assert_browser(path: Path) -> dict:
    b = json.loads(path.read_bytes())
    if b["overallStatus"]!="PASS" or not b["sourceTreeStable"] or b["fatalError"]:
        raise RuntimeError("stage browser overall/source stability FAILED")
    if Path(b["stageRoot"]).resolve()!=STAGE.resolve():
        raise RuntimeError("wrong browser stage root")
    if b["server"]["host"]!="127.0.0.1" or b["httpPhotoDeny"]["status"]!="PASS":
        raise RuntimeError("photo endpoint or loopback security FAILED")
    if len(b["httpPhotoDeny"]["paths"])!=8 or any(x["statusCode"]!=404 for x in b["httpPhotoDeny"]["paths"]):
        raise RuntimeError("missing photo URL deny test")
    vps={(x["viewport"]["width"],x["viewport"]["height"]) for x in b["viewports"]}
    if vps!={(1366,768),(375,812),(1920,1080)}:
        raise RuntimeError("required viewport set missing")
    if b["sourceManifestBefore"]!=b["sourceManifestAfter"]:
        raise RuntimeError("loaded source changed during browser test")
    for v in b["viewports"]:
        if (v["status"]!="PASS" or
                not v["loadedBodiesAllMatchedExactSource"] or
                len(v["loadedBodies"])!=34):
            raise RuntimeError("one viewport/loaded source failed")
        if (v["consoleErrors"] or v["pageErrors"] or v["requestFailures"] or
            v["externalRequests"] or v["bodyReadErrors"] or v["badHttpResponses"] or
            v["objectiveFailures"]):
            raise RuntimeError("browser error or external request")
        if set(v["states"])!={"LF","HF","DUAL","NAV1","NAV2","MENU"} or any(
            state["status"]!="PASS" for state in v["states"].values()
        ):
            raise RuntimeError("missing or failing viewport screen")
        for shot in v["screenshots"]:
            img=Path(shot["path"])
            if not img.is_file() or digest(img)!=shot["sha256"]:
                raise RuntimeError("screen-shot missing or SHA mismatch: "+str(img))
    return b

def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument("browser_receipt",type=Path,help="V2 stage Chrome QA receipt JSON")
    parser.add_argument("--apply",action="store_true",help="actually copy guarded source/test paths")
    args=parser.parse_args()
    evidence=json.loads(PREVIOUS.read_bytes())
    recon=json.loads(RECON.read_bytes())
    if recon["status"]!="RECONCILED_CURRENT_SOURCE_BASELINE":
        raise RuntimeError("V57 metadata reconciliation is missing")
    if digest(PREVIOUS)!=recon["currentV57SealSHA256"]:
        raise RuntimeError("V57 current seal changed")
    browser=assert_browser(args.browser_receipt.resolve())
    node_log=QA/"stage-full-node-reviewfix-v2.txt"
    python_log=QA/"stage-python-reviewfix-v2.txt"
    node=node_log.read_text(encoding="utf-8")
    py=python_log.read_text(encoding="utf-8")
    if not all(x in node for x in ("# tests 526","# pass 526","# fail 0")):
        raise RuntimeError("staged 526/526 full node QA not proved")
    if "Ran 13 tests" not in py or "\nOK" not in py.replace("\r",""):
        raise RuntimeError("stage 13/13 python QA not proved")
    expected=dict(evidence["runtime38SourceSHA"])
    changes=[]
    current_hashes={}
    stage_hashes={}
    for rel, before_hash in expected.items():
        canon=ROOT/rel
        staged=STAGE/rel
        if not canon.is_file() or not staged.is_file():
            raise RuntimeError("runtime path missing: "+rel)
        actual=digest(canon)
        after=digest(staged)
        current_hashes[rel]=actual
        stage_hashes[rel]=after
        if actual!=before_hash:
            raise RuntimeError("canonical V57 preimage drift: "+rel)
        if after!=before_hash:
            changes.append(rel)
    if frozenset(changes)!=RUNTIME_CHANGE or len(expected)!=38:
        raise RuntimeError("wrong runtime allowlist: "+repr(changes))
    if (ROOT/NEW_TEST).exists():
        raise RuntimeError("new test already exists in canonical")
    old_test_hash={}
    for name in EXISTING_TEST_CHANGE:
        old_test_hash[name]=digest(ROOT/name)
        if old_test_hash[name]==digest(STAGE/name):
            raise RuntimeError("expected test source diff is absent: "+name)
    if digest(STAGE/NEW_TEST)=="":
        raise RuntimeError("missing new test source")
    report={
      "timestampUtc":datetime.now(timezone.utc).isoformat(),
      "status":"PREIMAGE_GUARD_AND_STAGE_QA_MATCH",
      "canonicalRoot":str(ROOT),"stageRoot":str(STAGE),
      "parentV57CurrentSealSHA256":digest(PREVIOUS),
      "newV57ReconciliationSHA256":digest(RECON),
      "stageBrowserReceiptPath":str(args.browser_receipt.resolve()),
      "stageBrowserReceiptSHA256":digest(args.browser_receipt.resolve()),
      "stageFullNodeLogSHA256":digest(node_log),
      "stagePythonLogSHA256":digest(python_log),
      "runtimeChangedExactly":sorted(changes),
      "runtimeCanonicalPreimages":{rel:current_hashes[rel] for rel in sorted(changes)},
      "runtimeStagePostimages":{rel:stage_hashes[rel] for rel in sorted(changes)},
      "existingTestCanonicalPreimages":old_test_hash,
      "newTest":NEW_TEST,
      "copyPaths":list(COPY_PATHS),
      "mode":"GUARDED_APPLY" if args.apply else "DRY_RUN",
      "sourceAndCoreUnchangedOutsideAllowlist":True,
      "hardwareValidated":False,"releaseApproval":"HOLD","featureClaims":"65/65_HOLD",
    }
    if not args.apply:
        print("DRY_RUN_PASS staging browser + preimages + source bounds")
        print(json.dumps({"changed":changes,"browser":str(args.browser_receipt),"files":len(COPY_PATHS)}))
        return
    # First create a write-once backup of every source/test being replaced.
    zip_path=QA/"visual_v2_before_apply_20261114.zip"
    pre_path=QA/"visual_v2_guarded_preimage_20261114.json"
    apply_path=QA/"visual_v2_canonical_apply_20261114.json"
    if any(p.exists() for p in (zip_path,pre_path,apply_path)):
        raise FileExistsError("write-once guarded apply artifacts already exist")
    with zipfile.ZipFile(zip_path,"x",compression=zipfile.ZIP_DEFLATED) as package:
        for rel in sorted(RUNTIME_CHANGE|EXISTING_TEST_CHANGE):
            package.write(ROOT/rel,arcname=rel)
    # Verify all zip members correspond to original bytes.
    with zipfile.ZipFile(zip_path,"r") as package:
        for rel in sorted(RUNTIME_CHANGE|EXISTING_TEST_CHANGE):
            if sha(package.read(rel))!=digest(ROOT/rel):
                raise RuntimeError("backup bytes failed hash check: "+rel)
    report["beforeBackupSHA256"]=digest(zip_path)
    with pre_path.open("x",encoding="utf-8",newline="\n") as file:
        json.dump(report,file,indent=2,ensure_ascii=False);file.write("\n")
    performed=[]
    try:
        for rel in COPY_PATHS:
            canonical=ROOT/rel
            staged=STAGE/rel
            if rel in RUNTIME_CHANGE and digest(canonical)!=expected[rel]:
                raise RuntimeError("preimage drift immediately before copy: "+rel)
            if rel in EXISTING_TEST_CHANGE and digest(canonical)!=old_test_hash[rel]:
                raise RuntimeError("existing test preimage drift before copy: "+rel)
            if rel==NEW_TEST and canonical.exists():
                raise RuntimeError("new test unexpectedly appeared: "+rel)
            new_bytes=staged.read_bytes()
            descriptor,tmp=tempfile.mkstemp(dir=str(canonical.parent),prefix=".fcv588_visual_",
                                         suffix=".owned_tmp")
            try:
                with os.fdopen(descriptor,"wb") as out:
                    out.write(new_bytes);out.flush();os.fsync(out.fileno())
                if digest(Path(tmp))!=sha(new_bytes):
                    raise RuntimeError("temp source bytes mismatch")
                os.replace(tmp,canonical)
            finally:
                if os.path.exists(tmp):os.unlink(tmp)
            if digest(canonical)!=sha(new_bytes):
                raise RuntimeError("postcopy mismatch for "+rel)
            performed.append(rel)
    finally:
        # Partial apply can occur if I/O fails, so preserve a separate owned journal.
        audit=QA/"visual_v2_guarded_apply_journal_20261114.json"
        with audit.open("x",encoding="utf-8",newline="\n") as file:
            json.dump({"performed":performed,"targetFiles":list(COPY_PATHS),
                       "complete":len(performed)==len(COPY_PATHS),
                       "timestampUtc":datetime.now(timezone.utc).isoformat()},file,indent=2)
            file.write("\n")
    for rel in expected:
        if digest(ROOT/rel)!=stage_hashes[rel]:
            raise RuntimeError("canonical source mismatch after apply: "+rel)
    report.update({"status":"CANONICAL_SCOPED_COPY_COMPLETE_NOT_FINAL_QA",
                   "performed":performed,"timestampUtc":datetime.now(timezone.utc).isoformat(),
                   "runtimeCanonicalPostimages":{x:digest(ROOT/x) for x in sorted(changes)},
                   "backupSHA256":digest(zip_path)})
    with apply_path.open("x",encoding="utf-8",newline="\n") as file:
        json.dump(report,file,indent=2,ensure_ascii=False);file.write("\n")
    print("APPLIED="+repr(performed))
    print("BACKUP_SHA256="+digest(zip_path))
    print("APPLY_RECEIPT_SHA256="+digest(apply_path))
    print("NEW_FINAL_SOURCE_QA_STILL_REQUIRED")

if __name__=="__main__":
    main()

