#!/usr/bin/env python3
"""Write-once readback of current FCV-588 canonical V35 evidence.

Canonical Chrome V35 remains UNVERIFIED when its host execution was blocked.
This audit does not call Chrome, rewrite source, or promote release claims.
"""
from __future__ import annotations
from pathlib import Path
from hashlib import sha256
from datetime import datetime,timezone
import json,re,socket

ROOT=Path(__file__).resolve().parents[1]
STAGE=ROOT/"staging/fcv588-v35-c11-d09-d14-instructor"
QA=ROOT/"docs/qa"
OUT=QA/"FCV588_V35_PARTIAL_INTEGRITY_20261018.json"

def digest(path):
    return sha256(path.read_bytes()).hexdigest()

def load(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))

def demand(ok,msg):
    if not ok:raise AssertionError(msg)

def main():
    demand(not OUT.exists(),"Refuse overwrite V35 partial QA receipt")
    prior=load(QA/"FCV588_V34_POSTINTEGRATION_INTEGRITY_20261018.json")
    manifest=load(STAGE/"evidence/V35_C11_D09_D14_D15_PATCH_MANIFEST.json")
    integration=load(QA/"FCV588_V35_CANONICAL_APPLY_GPT6_20261018.json")
    expected={**prior["sourceManifest"],**{
        item["path"]:item["stagedSha256"] for item in manifest["changedFiles"]}}
    observed={
        f.relative_to(ROOT).as_posix():digest(f)
        for folder in ("src","web") for f in (ROOT/folder).rglob("*")
        if f.is_file() and f.suffix in (".mjs",".js",".css",".html",".svg")}
    demand(len(prior["sourceManifest"])==36 and len(expected)==len(observed)==37,
           "Expected 36 V34 and 37 V35 canonical runtime assets")
    demand(expected==observed,"Canonical V35 content differs from frozen patch")
    demand(integration["status"]=="V35_4_FILES_APPLIED_37_RUNTIME_SHA_MATCH" and
           len(integration["changedFiles"])==4,"V35 apply gate unverified")
    for item in manifest["changedFiles"]:
        name=item["path"]
        demand(digest(STAGE/name)==item["stagedSha256"],"V35 stage drift: "+name)
        demand(item["baselineSha256"]==prior["sourceManifest"].get(name),
               "V35 patch baseline drift: "+name)
    demand(digest(STAGE/manifest["candidatePatch"])==
           manifest["candidatePatchSha256"],"V35 patch altered")
    oldFailure=QA/"FCV588_V31_CONTROL_UNIT_GREEN.log"
    demand(digest(oldFailure)==
           "93cf5389a6f3fad2dc4c5f420ea2f0943f3e7d85e3831a39589a8a938064f4c9",
           "Historical V31 failure evidence altered")
    nodes=QA/"FCV588_V35_CANONICAL_FULL_NODE_20261018.log"
    text=nodes.read_text(encoding="utf-8-sig",errors="replace")
    for item in ("# tests 442","# pass 442","# fail 0"):
        demand(re.search("^"+re.escape(item)+r"\s*$",text,re.M),
               "V35 full Node incomplete: "+item)
    py=QA/"FCV588_V35_CANONICAL_PYTHON_20261018.log"
    demand("Ran 13 tests" in py.read_text(encoding="utf-8-sig",errors="replace"),
           "V35 Python 13 not reported")
    stagedBrowser=load(STAGE/"evidence/V35_D15_C11_D09_D14_CHROME_V2_20261018.json")
    checks=[check for v in stagedBrowser["viewports"] for check in v["checks"]]
    images=[image for v in stagedBrowser["viewports"] for image in v["screenshots"]]
    demand(len(checks)==115 and all(x["passed"] for x in checks),
           "V35 staging Chrome 115 checks changed")
    demand(len(images)==25 and all(digest(STAGE/x["path"])==x["sha256"]
            for x in images),"V35 staging screenshots changed")
    servedPath=QA/"FCV588_V35_CANONICAL_SERVED_SOURCE_20261018.json"
    served=load(servedPath)
    demand(served["status"]=="V35_CANONICAL_SERVED_BYTES_AND_DENIALS_PASS"
           and served["sourceStable"] and served["servedFiles"]==37
           and len(served["negativeRoutes"])==4
           and all(x["passed"] for x in served["negativeRoutes"]),
           "V35 canonical served-source report incomplete")
    demand(all(observed[x["path"]]==x["sha256"] for x in served["runtimeFiles"]),
           "V35 served/canonical bytes mismatch")
    for port in (4197,4198,4199,4201,4203):
        with socket.socket() as sock:
            sock.settimeout(.25)
            demand(sock.connect_ex(("127.0.0.1",port))!=0,
                   "QA port unexpectedly open: "+str(port))
    canonicalChrome=QA/"FCV588_V35_CANONICAL_CHROME_20261018.json"
    demand(not canonicalChrome.exists(),
           "Canonical Chrome result now exists: require a different full auditor")
    evidence={
        "apply":digest(QA/"FCV588_V35_CANONICAL_APPLY_GPT6_20261018.json"),
        "preapply":digest(QA/"FCV588_V35_PREAPPLY_GPT6_20261018.json"),
        "node":digest(nodes),"python":digest(py),
        "http":digest(servedPath),
        "stageChrome":digest(STAGE/"evidence/V35_D15_C11_D09_D14_CHROME_V2_20261018.json"),
        "patch":manifest["candidatePatchSha256"],
        "manifest":digest(STAGE/"evidence/V35_C11_D09_D14_D15_PATCH_MANIFEST.json")
    }
    payload={
      "observedAtUtc":datetime.now(timezone.utc).isoformat(),
      "status":"V35_CANONICAL_PARTIAL_QA_CHROME_NOT_VERIFIED",
      "scope":"FCV588_F1_PUBLIC_REFERENCE_CANONICAL_V35",
      "supervisor":"USER_APPROVED_GPT6_SELF_REVIEW",
      "v34HistoricalSourceCount":36,
      "canonicalV35SourceShaMatches":len(expected),
      "v35CoreUnchanged":23,
      "v35WebPatchFiles":4,
      "fullNodePassed":442,
      "pythonPassed":13,
      "stagingNodePassed":37,
      "stagingChromeChecksPassed":len(checks),
      "stagingScreenshotsShaMatches":len(images),
      "canonicalHttpFilesShaMatches":served["servedFiles"],
      "canonicalDeniedRoutes":len(served["negativeRoutes"]),
      "canonicalV35Chrome":"NOT_EXECUTED_HOST_TOOL_BLOCKED",
      "canonicalV35ChromeChecksVerified":0,
      "canonicalChromeRunAttempt":"BLOCKED_BEFORE_EXECUTION",
      "evidenceSha256":evidence,
      "runtimeSha256":observed,
      "originalV31FailedVerifyLogUnchanged":True,
      "phase2SoftwareRegressionGreen":True,
      "deviceHardwareValidated":False,
      "releaseApproval":"HOLD",
      "overallV35SoftwareQAGate":"HOLD_FOR_FRESH_CANONICAL_BROWSER_CHECK",
      "operatorClaimsAcceptance":"NOT_PROMOTED",
      "oemFidelityPercentage":"NOT_MEASURABLE"
    }
    with OUT.open("x",encoding="utf-8",newline="\n") as stream:
        json.dump(payload,stream,ensure_ascii=False,indent=2)
        stream.write("\n")
    print(json.dumps({"status":payload["status"],
        "canonicalSrcMatched":len(expected),"node":442,"python":13,
        "http":37,"stagedBrowser":115,"canonicalChrome":"NOT_EXECUTED",
        "receiptSha256":digest(OUT)},ensure_ascii=False))

if __name__=="__main__":
    main()
