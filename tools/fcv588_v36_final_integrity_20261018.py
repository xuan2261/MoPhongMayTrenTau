#!/usr/bin/env python3
"""Read-only reconciliation of V36 integrated offline FCV-588 software QA.

Writes only a fresh receipt. Does not invoke tests, devices, Git or releases.
This is not a substitute for real NVDA speech or physical OEM validation.
"""
from __future__ import annotations
from pathlib import Path
from hashlib import sha256
from datetime import datetime,timezone
import json,re,socket

ROOT=Path(__file__).resolve().parents[1]
STAGE=ROOT/"staging/fcv588-v36-instructor-accessibility"
QA=ROOT/"docs/qa"
OUT=QA/"FCV588_V36_FINAL_INTEGRITY_20261018.json"
CHROME_SPECS=(
    ("a11y","FCV588_V36_CANONICAL_A11Y_CHROME_20261018.json",
      "result","CANONICAL_V36_D15_A11Y_BROWSER_PASS",7,189,21),
    ("compat","FCV588_V36_COMPAT_CHROME_20261018.json",
      "result","CANONICAL_V36_BACKWARD_COMPAT_BROWSER_PASS",5,330,75),
    ("legacyD15","FCV588_V36_LEGACY_D15_CHROME_20261018.json",
      "status","CANONICAL_V36_LEGACY_D15_BROWSER_PASS",5,120,25)
)

def sha(path):return sha256(path.read_bytes()).hexdigest()
def load(path):return json.loads(path.read_text(encoding="utf-8-sig"))
def check(condition,message):
    if not condition:raise AssertionError(message)
def runtime(path):
    return {p.relative_to(path).as_posix():sha(p)
        for folder in ("src","web") for p in (path/folder).rglob("*")
        if p.is_file() and p.suffix in {".mjs",".js",".html",".css",".svg"}}
def node_pass(path,count):
    text=path.read_text(encoding="utf-8-sig",errors="replace")
    for item in ("# tests "+str(count),"# pass "+str(count),"# fail 0"):
        check(bool(re.search(r"^"+re.escape(item)+r"\s*$",text,re.M)),
              "Node result mismatches "+item+": "+path.name)

def main():
    check(not OUT.exists(),"Refuse overwrite V36 final integrity")
    v35=load(QA/"FCV588_V35_FINAL_INTEGRITY_20261018.json")
    manifest=load(STAGE/"evidence/V36_INSTRUCTOR_A11Y_PATCH_MANIFEST.json")
    pre=load(QA/"FCV588_V36_PREAPPLY_GPT6_20261018.json")
    apply=load(QA/"FCV588_V36_CANONICAL_APPLY_GPT6_20261018.json")
    baseline=v35["runtimeSha256"]
    check(v35["status"]=="CANONICAL_V35_SOFTWARE_SOURCE_AND_QA_RECONCILED"
          and len(baseline)==37,"Previous canonical V35 baseline invalid")
    check(len(manifest["changedWebFiles"])==4 and
          pre["status"]=="V36_FOUR_WEB_FILES_READY_FOR_GPT6_SUPERVISED_INTEGRATION"
          and apply["status"]=="V36_CANONICAL_4_WEB_FILES_APPLIED_37_RUNTIME_SHA_MATCH",
          "V36 source/authorization preflight failed")
    expected=dict(baseline)
    for item in manifest["changedWebFiles"]:
        name=item["path"]
        check(expected[name]==item["oldSha256"] and
              sha(STAGE/name)==item["stagedSha256"],
              "V36 immutable stage/baseline conflict: "+name)
        expected[name]=item["stagedSha256"]
    actual=runtime(ROOT)
    check(len(actual)==len(expected)==37 and actual==expected,
          "Canonical V36 runtime differs from expected SHA set")
    staged=runtime(STAGE)
    check(staged==expected and len(staged)==37,
          "V36 staged source files drifted after patch")
    core=[name for name in actual if name.startswith("src/")]
    check(len(core)==23 and all(actual[name]==baseline[name] for name in core),
          "Unexpected reducer/core source modification")
    check(sha(STAGE/manifest["patchPath"])==manifest["patchSha256"]
          and manifest["patchSha256"]==apply["patchSHA256"],
          "V36 patch SHA drift")
    original=QA/"FCV588_V31_CONTROL_UNIT_GREEN.log"
    check(sha(original)=="93cf5389a6f3fad2dc4c5f420ea2f0943f3e7d85e3831a39589a8a938064f4c9",
          "Historical failed Verify log changed")

    targeted=QA/"FCV588_V36_CANONICAL_NODE_TARGETED_20261018.log"
    full=QA/"FCV588_V36_CANONICAL_FULL_NODE_20261018.log"
    py=QA/"FCV588_V36_CANONICAL_PYTHON_20261018.log"
    node_pass(targeted,46)
    node_pass(full,451)
    pytext=py.read_text(encoding="utf-8-sig",errors="replace")
    check("Ran 13 tests" in pytext and
          bool(re.search(r"^OK\s*$",pytext,re.M)),
          "Python post-V36 QA not 13/13 PASS")

    chromeEvidence={}
    chromeChecks=0
    screenshots=0
    totalResponses=0
    for label,name,key,expectedStatus,viewports,count,images in CHROME_SPECS:
        record=load(QA/name)
        checks=[c for v in record["viewports"] for c in v["checks"]]
        shots=[p for v in record["viewports"] for p in v["screenshots"]]
        check(record[key]==expectedStatus and
              len(record["viewports"])==viewports and
              len(checks)==count and all(c["passed"] for c in checks)
              and len(shots)==images,
              "Canonical Chrome acceptance mismatches: "+label)
        for shot in shots:
            check(sha(ROOT/shot["path"])==shot["sha256"],
                  "V36 Chrome screenshot SHA changed: "+shot["path"])
        loaded=[v.get("verifiedBrowserResponses",0)
                for v in record["viewports"]]
        check(all(x>0 for x in loaded),"Unverified Chrome response bodies: "+label)
        if label=="a11y":
            check(record["sourceManifest"]==actual and
                  record["sourceFileCount"]==37,
                  "V36 accessibility Chrome source drift")
        elif label=="compat":
            check(record["canonicalRuntimeStable"] and
                  record["canonicalRuntimeFileCount"]==37 and
                  all(not v.get("browserSourceBodyErrors")
                      for v in record["viewports"]),
                  "V36 V34-compat Chrome bytes/source unstable")
        else:
            check(record["sourceStable"] and
                  record["servedRuntimeFiles"]==37,
                  "V36 V35 legacy D15 Chrome source unstable")
        chromeEvidence[label]=sha(QA/name)
        chromeChecks+=count
        screenshots+=images
        totalResponses+=sum(loaded)
    check(chromeChecks==639 and screenshots==121,
          "Expected 639 Chrome assertions and 121 current PNG")

    stageChrome=load(STAGE/"evidence/V36_D15_A11Y_CHROME_20261018.json")
    stageChecks=[c for v in stageChrome["viewports"] for c in v["checks"]]
    stagePhotos=[p for v in stageChrome["viewports"] for p in v["screenshots"]]
    check(len(stageChecks)==189 and all(c["passed"] for c in stageChecks)
          and len(stagePhotos)==21 and all(
              sha(STAGE/p["path"])==p["sha256"] for p in stagePhotos),
          "Staging evidence no longer matches")
    beforePhotos=load(STAGE/"evidence/V36_D15_BASELINE_20261018.json")
    check(len(beforePhotos["viewports"])==4 and all(
         sha(STAGE/v["screenshot"]["path"])==v["screenshot"]["sha256"]
         for v in beforePhotos["viewports"]),
         "V36 before images corrupted")
    stageNode=STAGE/"evidence/V36_D15_NODE_TARGETED_20261018.log"
    node_pass(stageNode,46)

    http=QA/"FCV588_V36_CANONICAL_SERVED_SOURCE_20261018.json"
    served=load(http)
    check(served["status"]=="V36_CANONICAL_SERVED_BYTES_AND_DENIALS_PASS"
          and served["sourceStable"] and served["servedFiles"]==37
          and len(served["runtimeFiles"])==37
          and len(served["negativeRoutes"])==4
          and all(c["passed"] for c in served["negativeRoutes"]),
          "Canonical HTTP source or negative routes unverified")
    check(all(actual[x["path"]]==x["sha256"] for x in served["runtimeFiles"]),
          "Runtime/HTTP byte SHA mismatch")
    for port in (4210,4211,4212,4213,4214,4215,4216):
        with socket.socket() as s:
            s.settimeout(.2)
            check(s.connect_ex(("127.0.0.1",port))!=0,
                  "QA owned port still active "+str(port))
    evidence={
        "nodeTargeted":sha(targeted),"nodeFull":sha(full),
        "python":sha(py),"http":sha(http),
        "preapply":sha(QA/"FCV588_V36_PREAPPLY_GPT6_20261018.json"),
        "apply":sha(QA/"FCV588_V36_CANONICAL_APPLY_GPT6_20261018.json"),
        "stageManifest":sha(STAGE/"evidence/V36_INSTRUCTOR_A11Y_PATCH_MANIFEST.json"),
        **{"chrome_"+label:value for label,value in chromeEvidence.items()}
    }
    payload={
      "collectedAtUtc":datetime.now(timezone.utc).isoformat(),
      "scope":"FCV588_F1_PUBLIC_REFERENCE_V36_D15_A11Y",
      "status":"CANONICAL_V36_SOFTWARE_AND_ACCESSIBILITY_DOM_QA_RECONCILED",
      "supervisor":"USER_APPROVED_GPT6_SELF_REVIEW",
      "previousV35RuntimeFiles":37,
      "canonicalV36SourceShaMatches":len(actual),
      "srcModulesUntouched":len(core),
      "webPatchFilesShaMatches":len(manifest["changedWebFiles"]),
      "targetedNodePass":46,
      "fullNodePass":451,
      "pythonPass":13,
      "canonicalChromeAssertionsPassed":chromeChecks,
      "canonicalChromeScreenshotsShaMatches":screenshots,
      "canonicalBrowserResponsesShaVerified":totalResponses,
      "canonicalHttpAssetsShaMatches":served["servedFiles"],
      "canonicalHttpDeniedRoutesPass":len(served["negativeRoutes"]),
      "baselinePhotosShaMatched":4,
      "stageAfterPhotosShaMatched":21,
      "qaPortsClosed":True,
      "evidenceSha256":evidence,
      "runtimeSha256":actual,
      "originalFailedV31VerifyLogUntouched":True,
      "nvdaSpeechTest":"NOT_PERFORMED",
      "narratorSpeechTest":"NOT_PERFORMED",
      "realHardwareValidated":False,
      "oemPixelAccuracy":"NOT_MEASURED",
      "operatorClaims":"65_OF_65_HOLD_NOT_AUTOMATICALLY_ACCEPTED",
      "acceptanceChecklist":"UNCHANGED_PENDING_INDEPENDENT_RECONCILIATION",
      "releaseApproval":"HOLD",
      "gitCommitted":False
    }
    with OUT.open("x",encoding="utf-8",newline="\n") as out:
        json.dump(payload,out,ensure_ascii=False,indent=2)
        out.write("\n")
    print(json.dumps({"status":payload["status"],
        "node":451,"python":13,"chrome":chromeChecks,
        "screenshots":screenshots,"source":len(actual),
        "receiptSha256":sha(OUT)},ensure_ascii=False))

if __name__=="__main__":main()
