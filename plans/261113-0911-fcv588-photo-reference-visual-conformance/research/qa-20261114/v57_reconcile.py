"""Read-only V57 source reconstruction; new write-once reconciliation only."""
from __future__ import annotations
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
QA = ROOT / "docs/qa/FCV588_V57_HEADER_COMPACT_20261031"
OUT = ROOT / "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261114"
SCOPED = QA / "V57_HEADER_COMPACT_SCOPED_INTEGRITY_20261031.json"
POST = QA / "V57_HEADER_COMPACT_INDEPENDENT_POSTRECEIPT_20261031.json"
REPORT = QA / "V57_HEADER_COMPACT_REPORT_20261031.md"
RECEIPT = OUT / "v57_reconciliation_20261114.json"

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def sha_file(path: Path) -> str:
    return sha(path.read_bytes())

def check_manifest(mapping: dict[str,str]) -> tuple[int, list[str]]:
    failed = []
    for rel, expected in mapping.items():
        path = ROOT.joinpath(*rel.split("/"))
        if not path.is_file() or sha_file(path) != expected:
            failed.append(rel)
    return len(mapping), failed

def main() -> None:
    if RECEIPT.exists():
        raise FileExistsError(f"WRITE_ONCE: {RECEIPT}")
    current_bytes = SCOPED.read_bytes()
    current = json.loads(current_bytes)
    original_post = json.loads(POST.read_bytes())
    report = REPORT.read_bytes()
    prefix_length = 8027
    original_prefix = report[:prefix_length]
    if sha(original_prefix) != original_post["reportSHA256"]:
        raise AssertionError("Original report prefix hash is not pinned")
    if len(report) != 9609 or len(report) - prefix_length != 1582:
        raise AssertionError("Unexpected append length")
    old = (b'"path": "docs/qa/FCV588_V57_HEADER_COMPACT_20261031/'
           b'V57_HEADER_COMPACT_REPORT_20261031.md",\r\n      "bytes": 9609,\r\n'
           b'      "sha256": "32f2bb56d329cc7bc2a594a4cac6761e68af4e16c8af89025b3ef67851b8aa45"')
    new = (b'"path": "docs/qa/FCV588_V57_HEADER_COMPACT_20261031/'
           b'V57_HEADER_COMPACT_REPORT_20261031.md",\r\n      "bytes": 8027,\r\n'
           b'      "sha256": "c03731c4bf2814fbccb26af0e1cb82514c3e323ef09f7580e2edb4ba50eea9af"')
    if current_bytes.count(old) != 1:
        raise AssertionError("Scoped manifest expected report entry absent or duplicated")
    reconstructed = current_bytes.replace(old,new)
    if sha(reconstructed) != original_post["v57ScopedIntegritySHA256"]:
        raise AssertionError("Two-field in-memory reconstruction did not match old seal")
    parent_n, parent_fail = check_manifest(current["parentSealsSHA256"])
    source_n, source_fail = check_manifest(current["runtime38SourceSHA"])
    qa_map = {x["path"]:x["sha256"] for x in current["qaEvidenceSHA"]}
    qa_n, qa_fail = check_manifest(qa_map)
    bad_sizes=[x["path"] for x in current["qaEvidenceSHA"]
               if not ROOT.joinpath(*x["path"].split("/")).is_file() or
               ROOT.joinpath(*x["path"].split("/")).stat().st_size!=x["bytes"]]
    if (parent_n,source_n,qa_n)!=(2,38,77) or parent_fail or source_fail or qa_fail or bad_sizes:
        raise AssertionError("Current manifest parent/runtime/QA verification failed")
    print("RECONSTRUCTED_SEAL_MATCH=True")
    print("CURRENT_RUNTIME=38/38; EVIDENCE=77/77; PARENTS=2/2")
    receipt={
        "timestampUtc":datetime.now(timezone.utc).isoformat(),
        "scope":"V57_METADATA_ONLY_RECONCILIATION_NOT_OEM_OR_RELEASE_APPROVAL",
        "status":"RECONCILED_CURRENT_SOURCE_BASELINE",
        "originalPostReceiptSHA256":sha_file(POST),
        "originalV57SealSHA256PinnedByPost":original_post["v57ScopedIntegritySHA256"],
        "reconstructedOriginalSealSHA256InMemory":sha(reconstructed),
        "currentV57SealSHA256":sha(current_bytes),
        "oldReportSHA256Pinned":original_post["reportSHA256"],
        "oldReportBytes":prefix_length,
        "currentReportSHA256":sha(report),
        "currentReportBytes":len(report),
        "appendedReportBytes":len(report)-prefix_length,
        "manifestOnlyChangedFields":["qaEvidenceSHA[path=V57_HEADER_COMPACT_REPORT_20261031.md].bytes",
                                     "qaEvidenceSHA[path=V57_HEADER_COMPACT_REPORT_20261031.md].sha256"],
        "parentSeals":f"{parent_n}/{parent_n}_MATCH",
        "runtimeSources":f"{source_n}/{source_n}_MATCH",
        "qaEvidence":f"{qa_n}/{qa_n}_MATCH",
        "qaEvidenceBytes":f"{qa_n}/{qa_n}_MATCH",
        "sourceRoot":str(ROOT),
        "sourceManifest":current["runtime38SourceSHA"],
        "interpretation":"Original seal exactly reconstructs in memory by reversing ONLY the report evidence bytes and SHA that were updated following the 1582-byte report append; original files remain untouched.",
        "releaseApproval":"HOLD",
        "rightsClearance":False,
        "installedFirmware":"UNKNOWN",
        "hardwareValidated":False,
        "phase6":"OPEN",
        "featureClaims":"65/65_HOLD",
        "canonicalSourceMutationAllowedByThisReceipt":False,
        "notes":"New source baseline can be pinned for isolated staging; any canonical source change needs a separate guarded QA apply."
    }
    OUT.mkdir(parents=True,exist_ok=True)
    with RECEIPT.open("x",encoding="utf-8",newline="\n") as stream:
        json.dump(receipt,stream,ensure_ascii=False,indent=2)
        stream.write("\n")
    print("RECEIPT="+str(RECEIPT))
    print("RECEIPT_SHA256="+sha_file(RECEIPT))

if __name__=="__main__":
    main()

