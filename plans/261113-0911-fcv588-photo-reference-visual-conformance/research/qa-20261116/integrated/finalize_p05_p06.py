"""Post-apply canonical visual QA seal and independent reread, write-once.

Does not update old P02/P03/P04 seals or change application code.
"""
from __future__ import annotations
from datetime import datetime, timezone
import json
from pathlib import Path
import re

import p05_p06_guarded_apply as guard

OUT=guard.ROOT / "docs/qa/FCV588_VISUAL_P05_P06_20261116"
FINAL=OUT / "FCV588_VISUAL_P05_P06_FINAL_INTEGRITY_20261116.json"
POST=OUT / "FCV588_VISUAL_P05_P06_INDEPENDENT_POSTRECEIPT_20261116.json"
NODE=guard.QA / "p05-p06-canonical-node-v1.txt"
PY=guard.QA / "p05-p06-canonical-python-v1.txt"
CHROME_P05_DIR=guard.QA / "canonical-browser-p05-v1"
CHROME_P06_DIR=guard.QA / "canonical-browser-p06-v1"

def verify_tests():
    a=NODE.read_text(encoding="utf-8",errors="replace")
    b=PY.read_text(encoding="utf-8",errors="replace")
    guard.require(re.search(r"(?m)^# tests 551\s*$",a) and
                  re.search(r"(?m)^# pass 551\s*$",a) and
                  re.search(r"(?m)^# fail 0\s*$",a),"fresh canonical Node551 failed")
    guard.require("Ran 13 tests" in b and re.search(r"(?m)^OK\s*$",b),
                  "fresh canonical Python13 failed")
    return {str(p.relative_to(guard.ROOT)).replace("\\","/"):guard.sha(p)
            for p in (NODE,PY)}

def collect_canonical_browser():
    p05_paths=list(CHROME_P05_DIR.glob("*.json"))
    p06_paths=list(CHROME_P06_DIR.glob("*-receipt.json"))
    guard.require(len(p05_paths)==len(p06_paths)==1,
                  "expected exactly one fresh canonical P05/P06 Chrome receipt")
    p05path,p06path=p05_paths[0],p06_paths[0]
    p05=guard.read_json(p05path)
    p06=guard.read_json(p06path)
    guard.require(p05["overallStatus"]==p06["overallStatus"]=="PASS",
                  "canonical browser did not PASS")
    guard.require(Path(p05["stageRoot"])==Path(p06["stageRoot"])==guard.ROOT,
                  "canonical browser tested staging rather than Windows root")
    guard.require(p05["sourceTreeStable"] and p06["sourceStable"] and
                  p06["sourceManifestBefore"]==p06["sourceManifestAfter"],
                  "canonical source drift during browser run")
    guard.require(len(p05["cases"])==len(p06["cases"])==3,
                  "canonical browser selected cases not complete")
    guard.require(p05["serverCleanup"]==p06["serverCleanup"]=="PASS",
                  "test-owned Chrome server cleanup failed")
    guard.require(p05["photoDeny"]["status"]=="PASS" and
                  len(p05["photoDeny"]["paths"])==8 and
                  all(x["statusCode"]==404 for x in p05["photoDeny"]["paths"]) and
                  len(p06["photoDeny"])==8 and
                  all(x["statusCode"]==404 for x in p06["photoDeny"]),
                  "source photo URLs not denied")
    guard.require(not p05["objectiveFailures"] and not p06["errors"],
                  "canonical browser reported errors")
    pixels={}
    for case in p05["cases"]:
        guard.require(case["status"]=="PASS" and
                      case["loadedBodyCount"]==case["loadedBodyMatches"]==35 and
                      not any(case["errorCounts"].values()),
                      "canonical P05 browser body/status mismatch")
        shot=case["screenshot"]
        guard.require(guard.sha(Path(shot["path"]))==shot["sha256"],
                      "canonical P05 screenshot hash mismatch")
        pixels[shot["path"]]=shot["sha256"]
    for rel,expected in p06["sourceManifestBefore"].items():
        guard.require(guard.sha(guard.ROOT / rel)==expected,
                      "canonical loaded-source manifest mismatch: "+rel)
    for case in p06["cases"]:
        guard.require(case["status"]=="PASS" and case["d15Tabs"]==5 and
                      case["sourceBodies"]==len(case["loaded"])==35 and
                      not case["consoleOrNetworkErrors"],
                      "canonical P06 case/focus/body count failed")
        for entry in case["loaded"]:
            guard.require(entry["status"]==200 and
                    entry["bodySHA256"]==entry["sourceSHA256"]==
                    guard.sha(guard.ROOT/entry["path"]),
                    "canonical actual body SHA mismatch: "+entry["path"])
        shot=case["screenshot"]
        guard.require(guard.sha(Path(shot["path"]))==shot["sha256"],
                      "canonical P06 screenshot hash mismatch")
        pixels[shot["path"]]=shot["sha256"]
    guard.require(len(pixels)==6,"canonical six screenshots absent")
    return ({str(p.relative_to(guard.ROOT)).replace("\\","/"):guard.sha(p)
             for p in (p05path,p06path)},pixels)

def collect():
    guard.require(guard.sha(guard.P04_FINAL)==guard.FINAL_SHA and
                  guard.sha(guard.P04_POST)==guard.POST_SHA,"P04 parent seal changed")
    guard.require(guard.sha(guard.FINAL_STAGE_SEAL)==guard.FINAL_STAGE_SEAL_SHA,
                  "P05+P06 staging seal changed")
    data=guard.read_json(guard.DONE)
    guard.require(data["status"]=="P05_P06_BOUNDED_CANONICAL_APPLY_COMPLETE_SOFTWARE_QA_PENDING",
                  "guarded apply was not complete")
    guard.require(data["finalStageSealSHA256"]==guard.FINAL_STAGE_SEAL_SHA and
                  data["copyPaths"]==list(guard.ALL),"guarded apply allowlist mismatch")
    guard.require(guard.sha(guard.ZIP)==data["backupSHA256"] and
                  guard.sha(guard.INTENT)==data["intentSHA256"],
                  "write-once backup/journal integrity mismatch")
    parent=guard.read_json(guard.P04_FINAL)
    canon=guard.runtime_inventory(guard.ROOT)
    stage=guard.runtime_inventory(guard.STAGE)
    guard.require(len(canon)==len(stage)==39 and canon==stage==data["postapplyRuntimeSHA256"],
                  "canonical runtime39 != sealed integrated staging")
    guard.require({k for k in canon if canon[k]!=parent["runtimeSHA256"][k]}==set(guard.MOD),
                  "unexpected canonical runtime diff from P04")
    guard.require(all(guard.sha(guard.ROOT/r)==data["newTestSHA256"][r]
                      for r in guard.NEW),"canonical new test drift")
    for name,meta in parent["photoReferenceSHA256"].items():
        guard.require(guard.sha(guard.ROOT / "sources/FCV588_GiaoDienThucTeMay2016" / name)
                      ==meta["sha256"],"original source photo changed: "+name)
    logs=verify_tests()
    receipts,shots=collect_canonical_browser()
    return {"schema":"fcv588-p05-p06-visual-final-integrity-v1",
        "timestampUtc":datetime.now(timezone.utc).isoformat(),
        "status":"P05_P06_BOUNDED_SOFTWARE_QA_PASS_RIGHTS_HARDWARE_RELEASE_HOLD",
        "scope":"P05 two-column menu and P06 estimated faceplate/focus UI; not full photo/OEM accuracy",
        "parentP04":{"finalSHA256":guard.FINAL_SHA,"postSHA256":guard.POST_SHA},
        "integratedStageSealSHA256":guard.FINAL_STAGE_SEAL_SHA,
        "guardedApply":{"receiptSHA256":guard.sha(guard.DONE),
                        "intentSHA256":guard.sha(guard.INTENT),
                        "backupSHA256":guard.sha(guard.ZIP)},
        "runtimeSHA256":canon,"runtimeCount":39,
        "changedRuntimePaths":sorted(guard.MOD),
        "newTestSHA256":{r:guard.sha(guard.ROOT/r) for r in guard.NEW},
        "canonicalQA":logs,"canonicalChromeReceipts":receipts,
        "canonicalScreenshotSHA256":shots,
        "stageQA":guard.read_json(guard.FINAL_STAGE_SEAL)["stageQA"],
        "stageScreenshotSHA256":guard.read_json(guard.FINAL_STAGE_SEAL)["browserScreenshotSHA256"],
        "photoReferenceSHA256":parent["photoReferenceSHA256"],
        "p04NearBottomFishOnly":"MEDIUM_NOT_FIXED_SEPARATE_RED_HOLD",
        "firmwareLocale":"HOLD","rightsClearance":"HOLD",
        "hardwareValidated":False,"featureClaims":"65/65 HOLD",
        "phase6":"OPEN","releaseApproval":"HOLD","oemVisualPercent":None}

def seal():
    guard.require(not FINAL.exists(),"final integrity exists; write-once")
    data=collect()
    OUT.mkdir(exist_ok=True,parents=True)
    guard.write_exclusive(FINAL,guard.serialized(data))
    print("P05_P06_FINAL_STATUS="+data["status"])
    print("P05_P06_FINAL_SHA256="+guard.sha(FINAL))

def independent_postreceipt():
    guard.require(FINAL.is_file() and not POST.exists(),
                  "final missing or postreceipt exists")
    original=guard.read_json(FINAL)
    reread=collect()
    for key in ("parentP04","integratedStageSealSHA256","guardedApply",
                "runtimeSHA256","newTestSHA256","canonicalQA",
                "canonicalChromeReceipts","canonicalScreenshotSHA256",
                "stageQA","stageScreenshotSHA256","photoReferenceSHA256"):
        guard.require(original[key]==reread[key],"independent reread differs: "+key)
    guard.require(original["status"]=="P05_P06_BOUNDED_SOFTWARE_QA_PASS_RIGHTS_HARDWARE_RELEASE_HOLD",
                  "final status altered")
    receipt={"schema":"fcv588-p05-p06-independent-postreceipt-v1",
        "timestampUtc":datetime.now(timezone.utc).isoformat(),
        "status":"PASS_BOUNDED_VISUAL_SOFTWARE_INTEGRITY_ONLY",
        "finalIntegritySHA256":guard.sha(FINAL),
        "independentlyRereadRuntime":39,
        "independentlyRereadStageCanonicalScreenshots":12,
        "independentlyRereadOriginalPhotos":8,
        "independentlyRereadNewTests":4,
        "canonicalNode":551,"canonicalPython":13,
        "canonicalChromeCases":6,"stageChromeCases":6,
        "P04NearBottomRisk":"MEDIUM_NOT_FIXED_HOLD",
        "rightsHardwareRelease":"HOLD"}
    guard.write_exclusive(POST,guard.serialized(receipt))
    print("P05_P06_INDEPENDENT_POSTRECEIPT_SHA256="+guard.sha(POST))

if __name__=="__main__":
    import argparse
    a=argparse.ArgumentParser()
    a.add_argument("--postreceipt",action="store_true")
    options=a.parse_args()
    if options.postreceipt:independent_postreceipt()
    else:seal()
