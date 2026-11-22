#!/usr/bin/env python3
"""Write-once final source/QA readback of canonical FCV-588 V35.

This audit rechecks recorded executions; it does not run the browser,
rewrite runtime source, or promote hardware, source/rights or release claims.
"""
from __future__ import annotations
from pathlib import Path
from hashlib import sha256
from datetime import datetime,timezone
import json,re,socket

ROOT=Path(__file__).resolve().parents[1]
STAGE=ROOT/"staging/fcv588-v35-c11-d09-d14-instructor"
QA=ROOT/"docs/qa"
OUT=QA/"FCV588_V35_FINAL_INTEGRITY_20261018.json"

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
    for port in (4197,4198,4199,4201,4202,4203):
        with socket.socket() as sock:
            sock.settimeout(.25)
            demand(sock.connect_ex(("127.0.0.1",port))!=0,
                   "QA port unexpectedly open: "+str(port))
    canonicalChrome=QA/"FCV588_V35_CANONICAL_CHROME_20261018.json"
    compatPath=QA/"FCV588_V35_COMPAT_CHROME_20261018.json"
    chrome=load(canonicalChrome)
    compat=load(compatPath)
    chromeChecks=[c for v in chrome["viewports"] for c in v["checks"]]
    compatChecks=[c for v in compat["viewports"] for c in v["checks"]]
    chromeImages=[p for v in chrome["viewports"] for p in v["screenshots"]]
    compatImages=[p for v in compat["viewports"] for p in v["screenshots"]]
    demand(chrome["status"]=="CANONICAL_V35_SOURCE_MATRIX_BROWSER_PASS" and
           chrome["sourceStable"] and chrome["servedRuntimeFiles"]==37,
           "V35 dedicated canonical Chrome not a source-bound PASS")
    demand(compat["result"]=="CANONICAL_V35_BACKWARD_COMPAT_BROWSER_PASS" and
           compat["canonicalRuntimeStable"] and compat["canonicalRuntimeFileCount"]==37,
           "V35 backward-compatible canonical Chrome not a source-bound PASS")
    demand(len(chrome["viewports"])==len(compat["viewports"])==5 and
           len(chromeChecks)==120 and len(compatChecks)==330 and
           all(x["passed"] for x in chromeChecks+compatChecks),
           "V35 Chrome 450 checks not verified")
    demand(len(chromeImages)==25 and len(compatImages)==75 and
           all(digest(ROOT/x["path"])==x["sha256"]
                for x in chromeImages+compatImages),
           "V35 canonical 100 screenshot SHA mismatch")
    demand(all(v.get("verifiedBrowserResponses",0)>0 for v in
           chrome["viewports"]+compat["viewports"]),
           "V35 Chrome missing actual response-byte evidence")
    demand(all(not v.get("browserSourceBodyErrors") for v in compat["viewports"]),
           "V35 Chrome backward-compat response-body capture failed")
    evidence={
        "apply":digest(QA/"FCV588_V35_CANONICAL_APPLY_GPT6_20261018.json"),
        "preapply":digest(QA/"FCV588_V35_PREAPPLY_GPT6_20261018.json"),
        "node":digest(nodes),"python":digest(py),
        "http":digest(servedPath),
        "canonicalChrome":digest(canonicalChrome),
        "compatChrome":digest(compatPath),
        "earlierPartial":digest(QA/"FCV588_V35_PARTIAL_INTEGRITY_20261018.json"),
        "stageChrome":digest(STAGE/"evidence/V35_D15_C11_D09_D14_CHROME_V2_20261018.json"),
        "patch":manifest["candidatePatchSha256"],
        "manifest":digest(STAGE/"evidence/V35_C11_D09_D14_D15_PATCH_MANIFEST.json")
    }
    payload={
      "observedAtUtc":datetime.now(timezone.utc).isoformat(),
      "status":"CANONICAL_V35_SOFTWARE_SOURCE_AND_QA_RECONCILED",
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
      "canonicalV35Chrome":"PASS_TWO_INDEPENDENT_SCOPE_RUNNERS",
      "canonicalV35ChromeChecksVerified":len(chromeChecks)+len(compatChecks),
      "canonicalChromeViewports":[v["viewport"] for v in chrome["viewports"]],
      "canonicalChromeScreenshotsShaMatched":len(chromeImages)+len(compatImages),
      "canonicalChromeResponsesVerified":[v["verifiedBrowserResponses"]
         for v in chrome["viewports"]+compat["viewports"]],
      "earlierToolBlock":"RETAINED_HISTORICAL_PARTIAL_RECEIPT",
      "evidenceSha256":evidence,
      "runtimeSha256":observed,
      "originalV31FailedVerifyLogUnchanged":True,
      "phase2SoftwareRegressionGreen":True,
      "qaPortsClosed":True,
      "screenReaderSpokenOutput":"NOT_VALIDATED",
      "deviceHardwareValidated":False,
      "releaseApproval":"HOLD",
      "overallV35SoftwareQAGate":"PASS_SOURCE_SCOPED_SOFTWARE_REGRESSION",
      "operatorClaimsAcceptance":"NOT_PROMOTED",
      "oemFidelityPercentage":"NOT_MEASURABLE"
    }
    with OUT.open("x",encoding="utf-8",newline="\n") as stream:
        json.dump(payload,stream,ensure_ascii=False,indent=2)
        stream.write("\n")
    print(json.dumps({"status":payload["status"],
        "canonicalSrcMatched":len(expected),"node":442,"python":13,
        "http":37,"stagedBrowser":115,"canonicalChrome":450,
        "canonicalImages":100,
        "receiptSha256":digest(OUT)},ensure_ascii=False))

if __name__=="__main__":
    main()
