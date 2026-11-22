from __future__ import annotations
import hashlib, json
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=ROOT/"docs/qa/FCV588_V57_HEADER_COMPACT_20261031"
SEAL=QA/"V57_HEADER_COMPACT_SCOPED_INTEGRITY_20261031.json"
POST=QA/"V57_HEADER_COMPACT_INDEPENDENT_POSTRECEIPT_20261031.json"
EXPECTED_SEAL_SHA="8efde8cf84a8761544fb399a26672f1a8d9dfca9d14e2e0bb9504b5c68a5d35c"

def sha(path: Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def checked(mapping: dict[str,str])->int:
    for rel,expected in mapping.items():
        path=ROOT.joinpath(*rel.split("/"))
        if not path.is_file() or sha(path)!=expected:
            raise ValueError("SHA mismatch or missing: "+rel)
    return len(mapping)

def main()->None:
    if POST.exists():
        raise FileExistsError("Independent postreceipt is write-once")
    seal_sha=sha(SEAL)
    if seal_sha!=EXPECTED_SEAL_SHA:
        raise ValueError("V57 scoped integrity SHA mismatch")
    data=json.loads(SEAL.read_text(encoding="utf-8"))
    if data["status"]!="V57_COMPACT_HEADER_SOFTWARE_BROWSER_QA_PASS_PHASE6_OPEN":
        raise ValueError("Unexpected V57 status")
    parents=checked(data["parentSealsSHA256"])
    runtime=checked(data["runtime38SourceSHA"])
    evidence_map={x["path"]:x["sha256"] for x in data["qaEvidenceSHA"]}
    evidence=checked(evidence_map)
    for entry in data["qaEvidenceSHA"]:
        path=ROOT.joinpath(*entry["path"].split("/"))
        if path.stat().st_size!=entry["bytes"]:
            raise ValueError("Evidence byte size mismatch: "+entry["path"])
    if parents!=2 or runtime!=38 or evidence!=77:
        raise ValueError("Unexpected independent manifest counts")
    if data["unchangedFromV56"]!=35 or set(data["changedFromV56"])!={"web/index.html","web/styles.css","web/lcd-instructor-meta.mjs"}:
        raise ValueError("V57 source change scope differs")
    browser_path=QA/"canonical-browser-attempt3"/"V57_BROWSER_DOM_INPUT_SOURCE_RECEIPT.json"
    browser=json.loads(browser_path.read_text(encoding="utf-8"))
    if browser["errors"] or len(browser["viewports"])!=4:
        raise ValueError("Chrome browser receipt not complete PASS")
    for item in browser["viewports"]:
        if item["status"]!="PASS" or len(item["loadedBodies"])!=36 or item["pageErrors"]:
            raise ValueError("Chrome viewport/source-body assertion failed")
        shot=Path(item["screenshot"]["path"])
        if sha(shot)!=item["screenshot"]["sha256"]:
            raise ValueError("Screenshot SHA mismatch: "+str(shot))
    default=json.loads((QA/"canonical-default-state"/"V57_DEFAULT_STATE_CAPTURE_20261031.json").read_text(encoding="utf-8"))
    if len(default["screenshots"])!=4 or not default["noJs"]["tablistHidden"] or any(default["noJs"]["panels"]):
        raise ValueError("Default/no-JS capture contract failed")
    for item in default["screenshots"]:
        for key in ("full","viewport"):
            if not Path(item[key]).is_file():
                raise ValueError("Missing default-state screenshot: "+item[key])
    ledger=json.loads((ROOT/"docs/evidence/fcv588-public-implementation-status.json").read_text(encoding="utf-8"))
    rows=ledger["operatorRows"]+ledger["teacherRows"]
    if len(rows)!=65 or any(x["claimDecision"]!="HOLD" for x in rows):
        raise ValueError("Feature claim gate changed")
    if ledger["rightsClearance"] is not False or ledger["hardwareValidated"] is not False or ledger["firmwareInstalled"] is not None or ledger["releaseApproval"]!="HOLD":
        raise ValueError("Hardware/rights/release gate changed")
    node=(QA/"V57_POSTDOCUMENT_NODE_20261031.log").read_text(encoding="utf-8")
    if "# tests 520" not in node or "# pass 520" not in node or "# fail 0" not in node:
        raise ValueError("Postdocument Node result is not 520/520")
    py=(QA/"V57_POSTDOCUMENT_PYTHON_20261031.log").read_text(encoding="utf-8")
    if "Ran 13 tests" not in py or "\nOK\n" not in py:
        raise ValueError("Postdocument Python result is not 13/13")
    report=QA/"V57_HEADER_COMPACT_REPORT_20261031.md"
    post={
      "timestampUtc":datetime.now(timezone.utc).isoformat(),
      "status":"V57_INDEPENDENT_SHA_READBACK_MATCH_PHASE6_OPEN",
      "v57ScopedIntegritySHA256":seal_sha,
      "verifierScriptSHA256":sha(Path(__file__)),
      "parentSeals":f"{parents}/{parents}_MATCH",
      "runtimeSources":f"{runtime}/{runtime}_MATCH",
      "qaEvidence":f"{evidence}/{evidence}_MATCH",
      "unchangedFromV56":35,
      "changedFromV56":3,
      "node":"520/520_PASS",
      "python":"13/13_PASS",
      "focusedCompatibility":"19/19_PASS",
      "chromeViewports":"4/4_PASS",
      "browserLoadedSourceBodiesPerViewport":"36/36_MATCH",
      "defaultStateScreenshots":"4/4_VIEWPORTS",
      "noJavascriptFallback":"PASS",
      "pageErrors":0,
      "externalRequests":0,
      "featureClaims":"65/65_HOLD",
      "phase6":"OPEN",
      "hardwareValidated":False,
      "installedFirmware":"UNKNOWN",
      "rightsClearance":False,
      "reviewerSignoff":"NOT_OBTAINED",
      "releaseApproval":"HOLD",
      "realNarratorNvdaSpoken":"NOT_RUN",
      "genuineWindowsChromeBlurWhilePowerHeld":"NOT_RUN",
      "parallelDesignWave":"5 launched; incomplete final worker reports; no consensus claim",
      "reportSHA256":sha(report),
      "diskD":"NOT_ACCESSED",
      "backup":"NOT_ATTEMPTED"
    }
    with POST.open("x",encoding="utf-8",newline="\n") as f:
        json.dump(post,f,ensure_ascii=False,indent=2)
        f.write("\n")
    readback=json.loads(POST.read_text(encoding="utf-8"))
    if readback["v57ScopedIntegritySHA256"]!=seal_sha:
        raise ValueError("Postreceipt readback failed")
    print("INDEPENDENT_STATUS="+post["status"])
    print("SCOPED_SHA="+seal_sha)
    print("POST_SHA="+sha(POST))
    print("VERIFIER_SHA="+post["verifierScriptSHA256"])
    print("PARENTS="+post["parentSeals"])
    print("RUNTIME="+post["runtimeSources"])
    print("EVIDENCE="+post["qaEvidence"])
    print("PHASE6="+post["phase6"]+" CLAIMS="+post["featureClaims"]+" RELEASE="+post["releaseApproval"])

if __name__=="__main__":
    main()