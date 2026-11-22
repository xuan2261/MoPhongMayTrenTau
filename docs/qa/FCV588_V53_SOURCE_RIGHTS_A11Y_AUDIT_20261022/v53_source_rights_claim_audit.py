"""V53 65-feature source/rights/acceptance-blocker audit. Metadata only, no OEM binary access.

Exact source bytes and evidence are verified against pinned canonical V52. This
audits static manifest coherence; no test-reference name is considered behavioral PASS.
"""
from __future__ import annotations
import hashlib
import json
from collections import Counter
from pathlib import Path
from datetime import datetime, timezone

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
RESULT = OUT / "V53_ALL_65_CLAIMS_SOURCE_RIGHTS_AUDIT_20261022.json"
FINAL = ROOT / "docs/qa/FCV588_V52_FINAL_INTEGRITY_20261022.json"
POST = ROOT / "docs/qa/FCV588_V52_POSTRECEIPT_READBACK_20261022.json"
SOURCE_MATRIX = ROOT / "docs/evidence/fcv588-public-trace-matrix.json"
IMPL = ROOT / "docs/evidence/fcv588-public-implementation-status.json"
LEDGER = ROOT / "docs/evidence/fcv588-public-evidence-ledger.json"
DRAFT = ROOT / "docs/research/FCV588_FEATURE_REGISTER_DRAFT.json"
POLICY = ROOT / "docs/research/FCV588_PUBLIC_CLAIM_POLICY.md"
EXPECTED_FINAL = "4650306d6c088fc19eaa09b66922faaf29712015ae9a2f8fdf5795d2e780107f"
EXPECTED_POST = "410966989a000ac7553f2085b13474dd6d5ac686a35df516f824a03a4ebb4608"


def h(path: Path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for b in iter(lambda: stream.read(65536), b""):
            digest.update(b)
    return digest.hexdigest()


def check(cond, desc):
    if not cond:
        raise ValueError(desc)


def read_json(p):
    return json.loads(p.read_text(encoding="utf-8-sig"))


def count(values, key):
    return dict(sorted(Counter(x.get(key, "MISSING") for x in values).items()))


def execute():
    check(not RESULT.exists(), "Write-once audit receipt already exists")
    check(h(FINAL) == EXPECTED_FINAL and h(POST) == EXPECTED_POST, "STOP V52 checkpoint SHA drift")
    latest = read_json(FINAL)
    for rel, digest in latest["runtimeSourceSHA"].items():
        check(h(ROOT / rel) == digest, "STOP canonical runtime SHA drift: " + rel)
    trace = read_json(SOURCE_MATRIX)
    implementation = read_json(IMPL)
    evidence = read_json(LEDGER)
    drafts = read_json(DRAFT)
    policy = POLICY.read_text(encoding="utf-8")
    check("NOT HARDWARE VALIDATED" in policy and "AI_PROCESS_HOLD" in policy, "Policy gate missing")
    src = {e["id"]: e for e in evidence["sources"]}
    check(len(src) == len(evidence["sources"]) == 11, "Eleven source identities required")
    check(evidence["frameAuditedVideoCount"] == 0, "Video frames unexpectedly audited")
    check(all(e.get("simulatorAsset") is False for e in src.values()), "Publisher assets imported")
    check(all(len(e.get("verifiedTimestamps", [])) == 0 for e in src.values()), "Unverified video claims")
    trace_rows = trace["rows"]
    impl_rows = implementation["operatorRows"] + implementation["teacherRows"]
    draft_rows = drafts["features"]
    tids = [x["featureId"] for x in trace_rows]
    iids = [x["featureId"] for x in impl_rows]
    dids = [x["id"] for x in draft_rows]
    check(len(trace_rows) == len(impl_rows) == len(draft_rows) == 65, "65 row manifest required")
    check(len(set(tids)) == len(set(iids)) == len(set(dids)) == 65, "Duplicate feature IDs")
    check(set(tids) == set(iids) == set(dids), "Feature ID sets differ")
    check(sum(x["scope"] == "FCV_OPERATOR" for x in trace_rows) == 64, "FCV operator count")
    check(sum(x["scope"] == "INSTRUCTOR_PLATFORM" for x in trace_rows) == 1, "D15 count")
    check(all(x["claimDecision"] == "HOLD" for x in impl_rows), "STOP claim promoted")
    check(all(x["claimDecision"] == "HOLD_UNTIL_IMPLEMENTED_AND_REVIEWED" for x in trace_rows),
          "STOP trace claims promoted")
    check(all(x["courseReviewStatus"] == "NOT_REVIEWED" for x in trace_rows),
          "STOP unreviewed course status unexpectedly elevated")
    check(implementation["releaseApproval"] == "HOLD" and not implementation["hardwareValidated"]
          and not implementation["rightsClearance"] and implementation["firmwareInstalled"] is None,
          "STOP implementation approval or firmware drift")
    check(implementation["reviewerSignoff"] == "NOT_OBTAINED", "STOP reviewer status drift")
    i_by_id = {x["featureId"]: x for x in impl_rows}
    d_by_id = {x["id"]: x for x in draft_rows}
    checks = []
    drift = []
    missing_tests = []
    reference_count = 0
    for t in trace_rows:
        fid = t["featureId"]
        i = i_by_id[fid]
        d = d_by_id[fid]
        check(t["scope"] == i["scope"] == d["scope"], fid + ": scope drift")
        check(t["domain"] == i["domain"], fid + ": domain drift")
        for key in ("sourceStatus", "rightsDecision"):
            if t[key] != i[key]:
                drift.append({"featureId": fid, "field": key,
                              "trace": t[key], "implementation": i[key]})
        for k in ("manualRefs", "publicSourceIds"):
            if t[k] != i[k]:
                drift.append({"featureId": fid, "field": k,
                              "trace": t[k], "implementation": i[k]})
        for ref in t["publicSourceIds"]:
            check(ref in src, fid + ": unresolved source " + ref)
        for ref in i["testReferences"]:
            refpath = Path(ref)
            if refpath.is_absolute() or ".." in refpath.parts or not ref.startswith("test/"):
                missing_tests.append({"featureId": fid, "file": ref, "reason": "invalid reference path"})
            elif not (ROOT / refpath).is_file():
                missing_tests.append({"featureId": fid, "file": ref, "reason": "not found"})
            reference_count += 1
        if fid == "D15":
            check(t["scope"] == "INSTRUCTOR_PLATFORM" and not t["publicSourceIds"]
                  and not t["manualRefs"] and i["rightsDecision"] == "ORIGINAL_PLATFORM_CODE",
                  "D15 not segregated")
        else:
            check(len(t["manualRefs"]) >= 1, fid + ": no manual location")
            check(t["rightsDecision"] == "CURATED_NOTES_ONLY", fid + ": unexpected OEM rights clearance")
            check(t["sourceStatus"] == "CURATED_REFERENCE_NOT_BEHAVIOR_VERIFIED",
                  fid + ": source grade cannot certify physical behavior")
        sources_not_behavioral = [ref for ref in t["publicSourceIds"]
                                 if src[ref]["evidenceMode"] in
                                 ("PHOTO_LAYOUT", "VIDEO_METADATA_ONLY", "DOCUMENT_METADATA_ONLY", "SECONDARY_REPORT")]
        checks.append({
            "featureId": fid,
            "scope": t["scope"],
            "domain": t["domain"],
            "manualRefs": t["manualRefs"],
            "publicSourceIds": t["publicSourceIds"],
            "nonBehavioralSourceIds": sources_not_behavioral,
            "sourceStatusTrace": t["sourceStatus"],
            "sourceStatusImplementation": i["sourceStatus"],
            "rightsDecision": i["rightsDecision"],
            "draftGuard": t["guardExpression"],
            "draftImplementationStatus": t["implementationStatus"],
            "observedImplementationCheckpoint": i["checkpointStatus"],
            "testEvidenceMeaning": i["testEvidenceMeaning"],
            "testReferenceCount": len(i["testReferences"]),
            "testReferences": i["testReferences"],
            "sourceAndRightsReview": t["courseReviewStatus"],
            "claimDecision": i["claimDecision"],
            "publicConformance": "NOT_ESTABLISHED",
            "operatorHardwareConformance": "NOT_ESTABLISHED",
            "releaseReady": False,
        })
    check(not missing_tests, "Test references invalid or missing: " + str(missing_tests))
    # Divergence is a provenance finding, not a grant. Do not mutate any original record to reconcile it.
    actual_gaps = [x["featureId"] for x in checks
                   if x["observedImplementationCheckpoint"] in ("NOT_IMPLEMENTED", "MENU_ONLY_PARTIAL")]
    group = {
        "sourceStatusTrace": count(trace_rows, "sourceStatus"),
        "authorityTierTrace": count(trace_rows, "authorityTier"),
        "rightsDecisionTrace": count(trace_rows, "rightsDecision"),
        "draftImplementationStatus": count(trace_rows, "implementationStatus"),
        "implementationCheckpoint": count(impl_rows, "checkpointStatus"),
        "testEvidenceMeaning": count(impl_rows, "testEvidenceMeaning"),
        "sourceModes": dict(sorted(Counter(e["evidenceMode"] for e in src.values()).items())),
        "guardsWithFirmwareDependency": sum("FW" in x["guardExpression"] for x in trace_rows),
    }
    report = {
        "scope": "65_FEATURE_METADATA_CROSS_LEDGER_AND_RIGHTS_GATES_ONLY",
        "status": "CONSISTENT_SOURCE_METADATA_NOT_OPERATOR_OEM_CONFORMANCE" if not drift else
                  "CROSS_LEDGER_DIVERGENCE_REVIEW_NEEDED",
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "sourceRoot": str(ROOT),
        "authoritativeCheckpointSha256": EXPECTED_FINAL,
        "parentV52IndependentPostSha256": EXPECTED_POST,
        "sourceHashesSha256": {
            "trace": h(SOURCE_MATRIX), "implementation": h(IMPL),
            "sourceLedger": h(LEDGER), "featureDraft": h(DRAFT),
            "rightsPolicy": h(POLICY),
        },
        "sourceCatalogCount": len(src),
        "frameAuditedVideos": evidence["frameAuditedVideoCount"],
        "totalFeatureRows": len(checks),
        "operatorRows": 64,
        "teacherRows": 1,
        "unapprovedClaimCount": sum(x["claimDecision"] == "HOLD" for x in checks),
        "testReferencesChecked": reference_count,
        "missingTestReferences": missing_tests,
        "crossLedgerDifferences": drift,
        "observedCheckpointGaps": actual_gaps,
        "additionalMenuSourceGaps": trace["additionalMenuCoverage"],
        "summary": group,
        "rows": checks,
        "rightsReviewObservation": "Only source metadata and user-authored notes; not a legal license or permission to copy OEM media.",
        "actualInstalledFirmware": "UNKNOWN",
        "physicalHardwareVerified": False,
        "independentReviewer": "NOT_OBTAINED",
        "actualSpokenNarratorNvda": "NOT_RUN",
        "genuineOsBlurWhileHoldingPower": "NOT_RUN",
        "phase6": "OPEN",
        "claimsHold": 65,
        "releaseApproval": "HOLD",
    }
    with RESULT.open("xb") as output:
        output.write((json.dumps(report, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print("STATUS", report["status"])
    print("LEDGER_ROWS", len(checks), "SOURCE_IDS", len(src), "TEST_REFS", reference_count,
          "CROSS_LEDGER_DIFFS", len(drift))
    print("GAPS", actual_gaps, "ADDITIONAL_MENU_GAPS", len(trace["additionalMenuCoverage"]))
    print("SUMMARY", json.dumps(group, ensure_ascii=False))
    print("RESULT_SHA256", h(RESULT))
    return 0 if not drift else 2


if __name__ == "__main__":
    import sys
    sys.exit(execute())
