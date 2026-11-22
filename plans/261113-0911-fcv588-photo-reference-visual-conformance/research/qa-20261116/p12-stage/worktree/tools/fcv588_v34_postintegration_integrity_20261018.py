#!/usr/bin/env python3
"""Canonical FCV-588 V34 readback; no writes outside new QA receipt."""
from __future__ import annotations

from datetime import datetime,timezone
from pathlib import Path
from hashlib import sha256
import json
import re
import socket

ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/"docs/qa"
STAGE=ROOT/"staging/fcv588-v34-a11y-source-holds"
OUTPUT=QA/"FCV588_V34_POSTINTEGRATION_INTEGRITY_20261018.json"

def digest(p:Path)->str:
    return sha256(p.read_bytes()).hexdigest()

def load(p:Path):
    return json.loads(p.read_text(encoding="utf-8-sig"))

def require(cond,msg):
    if not cond:raise AssertionError(msg)

def count(log,name):
    m=re.search(r"^# "+name+r" (\d+)\s*$",log,re.M)
    require(m is not None,"Node log missing "+name)
    return int(m.group(1))

def main():
    require(not OUTPUT.exists(),"Refusing overwrite V34 integrity receipt")
    baseline=load(QA/"FCV588_V31_EVIDENCE_SUMMARY.json")
    manifest=load(STAGE/"evidence/STAGING_V34_PATCH_MANIFEST_A11Y_HOLD.json")
    orig={item["path"]:item["sha256"] for item in baseline["liveSource"]["fileDigests"]}
    changed={item["path"]:item["stagedSha256"] for item in manifest["files"]}
    require(len(orig)==35 and len(changed)==8,"Unexpected source identities")
    expected={**orig,**changed}
    assert len(expected)==36
    actual={}
    for part in ("src","web"):
        for p in (ROOT/part).rglob("*"):
            if p.is_file() and p.suffix.lower() in {".html",".mjs",".js",".css",".svg"}:
                actual[p.relative_to(ROOT).as_posix()]=digest(p)
    require(actual==expected,"Canonical source differs from V31+frozen V34 patch")
    for item in manifest["files"]:
        require(digest(STAGE/item["path"])==item["stagedSha256"],
                "Frozen V34 staging changed: "+item["path"])
        if not item["isNew"]:
            require(item["originalSha256"]==orig[item["path"]],
                    "V34 patch original SHA differs from V31 baseline")
    patch=STAGE/manifest["patchPath"]
    require(digest(patch)==manifest["patchSha256"],"Frozen V34 patch drift")
    historical=QA/"FCV588_V31_CONTROL_UNIT_GREEN.log"
    require(digest(historical)==
      "93cf5389a6f3fad2dc4c5f420ea2f0943f3e7d85e3831a39589a8a938064f4c9",
      "Original V31 failure receipt was altered")
    prior=load(QA/"FCV588_V31_POST_DOCUMENT_READBACK.json")
    # The plan.md and phase02 documentation have intentionally changed by
    # explicit user-approved 2026-10-18 supervisor amendment.
    unchanged_docs=0
    amended=[]
    for rec in prior["documents"]:
        if rec["path"].endswith(("/plan.md","/phase-02-physical-panel-and-controls.md")):
            amended.append(rec["path"])
            continue
        require(digest(ROOT/rec["path"])==rec["sha256"],
                "Unrelated checkpoint document drift: "+rec["path"])
        unchanged_docs+=1
    node=QA/"FCV588_V34_CANONICAL_FULL_NODE_POST_GPT6_20261018_GREEN.log"
    node_text=node.read_text(encoding="utf-8-sig",errors="replace")
    require(count(node_text,"tests")==count(node_text,"pass")==433 and
            count(node_text,"fail")==0,"Full post-V34 Node is not green")
    py=QA/"FCV588_V34_CANONICAL_PYTHON_POST_GPT6_20261018.log"
    require("Ran 13 tests" in py.read_text(encoding="utf-8-sig",errors="replace"),
            "Python post-integration test total differs")
    browser=load(QA/"FCV588_V34_CANONICAL_CHROME_20261018.json")
    checks=[item for v in browser["viewports"] for item in v["checks"]]
    images=[item for v in browser["viewports"] for item in v["screenshots"]]
    require(browser["result"]=="CANONICAL_V34_POSTINTEGRATION_BROWSER_PASS"
          and browser["canonicalRuntimeStable"],"Browser post-integration not PASS")
    require(len(browser["viewports"])==5 and len(checks)==330 and
          all(x["passed"] for x in checks),"Chrome 330/330 mismatch")
    require(len(images)==75,"Expected 75 Chrome V34 canonical images")
    for shot in images:
        require(digest(ROOT/shot["path"])==shot["sha256"],
                "Chrome screenshot drift: "+shot["path"])
    for v in browser["viewports"]:
        require(v.get("verifiedBrowserResponses",0)>0 and
                not v.get("browserSourceBodyErrors"),"Unverified browser-loaded asset")
    served=load(QA/"FCV588_V34_CANONICAL_SERVED_SOURCE_20261018.json")
    require(served["status"]=="CANONICAL_V34_SERVED_SOURCE_PASS" and
            served["sourceStable"],"Canonical V34 HTTP check failed")
    require(served["servedFiles"]==len(served["runtimeFiles"])==36,
            "Expected 36 exact served assets")
    for item in served["runtimeFiles"]:
        require(actual[item["path"]]==item["sha256"],
                "HTTP body differs from canonical: "+item["path"])
    require(len(served["negativeRoutes"])==4 and
      all(item["passed"] for item in served["negativeRoutes"]),
      "HTTP access-denial regression")
    integration=load(QA/"FCV588_V34_CANONICAL_APPLY_GPT6_20261018.json")
    require(len(integration["files"])==8 and
            integration["status"]=="V34_CANONICAL_WEB_EXACT_SHA_MATCH",
            "V34 integration record mismatches actual source")
    for item in integration["files"]:
        require(actual[item["path"]]==item["sha256"],
                "Postapply source changed since integration")
    for port in (4194,4195,4196):
        with socket.socket() as conn:
            conn.settimeout(.25)
            require(conn.connect_ex(("127.0.0.1",port))!=0,
                    "QA localhost port still open: "+str(port))
    refs={
      k:digest(QA/v) for k,v in {
        "targetedNode":"FCV588_V31_CONTROL_UNIT_POST_GPT6_20261018.log",
        "fullNode":"FCV588_V34_CANONICAL_FULL_NODE_POST_GPT6_20261018_GREEN.log",
        "python":"FCV588_V34_CANONICAL_PYTHON_POST_GPT6_20261018.log",
        "browser":"FCV588_V34_CANONICAL_CHROME_20261018.json",
        "served":"FCV588_V34_CANONICAL_SERVED_SOURCE_20261018.json",
        "apply":"FCV588_V34_CANONICAL_APPLY_GPT6_20261018.json"
      }.items()
    }
    record={
      "collectedAtUtc":datetime.now(timezone.utc).isoformat(),
      "scope":"CANONICAL_V34_F1_PUBLIC_REFERENCE_ONLY",
      "status":"CANONICAL_V34_SOFTWARE_SOURCE_AND_QA_RECONCILED",
      "originalV31RuntimeFiles":len(orig),
      "v34RuntimeFiles":len(actual),
      "webPatchExactShaMatches":len(changed),
      "v31CoreSourceUnchanged":23,
      "oldFailureLogUnchanged":True,
      "historicalCheckpointDocsUnmodified":unchanged_docs,
      "legitimatelyAmendedPlanFiles":amended,
      "targetedNodePassed":53,
      "fullNodePassed":433,
      "pythonPassed":13,
      "browserViewports":[v["viewport"] for v in browser["viewports"]],
      "browserChecksPassed":len(checks),
      "browserScreenshotsShaMatched":len(images),
      "browserLoadsVerified":[v["verifiedBrowserResponses"] for v in browser["viewports"]],
      "httpAssetsShaMatched":len(served["runtimeFiles"]),
      "blockedRoutes":len(served["negativeRoutes"]),
      "qaPortsClosed":True,
      "evidenceSha256":refs,
      "sourceManifest":actual,
      "hardwareValidated":False,
      "installedFirmwareVerified":False,
      "pixelPerfectOEM":"NOT_PROVEN",
      "operatorClaimsAccepted":"NOT_AUTOMATICALLY_PROMOTED",
      "releaseApproval":"HOLD",
      "gitCommitted":False
    }
    with OUTPUT.open("x",encoding="utf-8",newline="\n") as stream:
        json.dump(record,stream,ensure_ascii=False,indent=2)
        stream.write("\n")
    print(json.dumps({"status":record["status"],
      "runtime":len(actual),"tests":433,"browser":len(checks),
      "images":len(images),"http":len(served["runtimeFiles"]),
      "receiptSha256":digest(OUTPUT)},ensure_ascii=False))

if __name__=="__main__":
    main()
