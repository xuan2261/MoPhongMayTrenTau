"""Independent, read-only SHA/readback verifier for V55-B scoped software QA.

Only writes its own new postreceipt. No OS focus, screen reader, VM,
backup, product source, or historical receipt is modified.
"""
from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
QA = ROOT / "docs" / "qa"
SCOPED = QA / "FCV588_V55B_SCOPED_INTEGRITY_20261022.json"
V54 = QA / "FCV588_V54_SCOPED_QA_INTEGRITY_20261022.json"
POST = QA / "FCV588_V55B_INDEPENDENT_POSTRECEIPT_20261022.json"
EXPECTED_SCOPED_SHA = (
    "10398720014c01b3c3d10b8bdb3e1f31542144d59a876f362639186bd8f76db1"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def matched(paths: dict[str, str]) -> int:
    for relative, expected in paths.items():
        real = ROOT / Path(relative)
        if not real.is_file() or sha256(real) != expected:
            raise ValueError(f"SHA mismatch or missing: {relative}")
    return len(paths)


def verify_log(path: Path, count: int) -> None:
    text = path.read_text(encoding="utf-8")
    for field, expected in (("tests", count), ("pass", count), ("fail", 0)):
        if not re.search(rf"(?m)^# {field} {expected}\s*$", text):
            raise ValueError(f"node log assertion {field}={expected}: {path.name}")


def main() -> None:
    if POST.exists():
        raise FileExistsError(f"Write-once postreceipt exists: {POST}")
    actual_scoped_sha = sha256(SCOPED)
    if actual_scoped_sha != EXPECTED_SCOPED_SHA:
        raise ValueError("V55-B scoped integrity hash mismatch")
    scoped = read_json(SCOPED)
    parent = read_json(V54)
    if scoped["canonicalRuntimeSHA"] != "37/37_MATCH":
        raise ValueError("Runtime status in scoped record is not MATCH")
    if scoped["realWindowsBlurDuringPowerHold"] != "NOT_RUN":
        raise ValueError("Real OS focus should not be claimed in this attempt")
    if scoped["realNarratorNvdaUtterance"] != "NOT_RUN":
        raise ValueError("Spoken output should not be claimed in this attempt")
    if scoped["phase6"] != "OPEN" or scoped["claimsHold"] != 65:
        raise ValueError("Phase 6 feature HOLD gate drift")

    pinned_count = matched(scoped["pinnedReceipts"])
    parent_count = matched(parent["parentPinnedSHA"])
    runtime_count = matched(parent["runtimeSourceSHA"])
    v54_evidence = {
        entry["path"]: entry["sha256"] for entry in parent["qaEvidenceSHA"]
    }
    v54_count = matched(v54_evidence)
    new_evidence = {
        entry["path"]: entry["sha256"] for entry in scoped["newQaFiles"]
    }
    new_count = matched(new_evidence)
    for entry in scoped["newQaFiles"]:
        path = ROOT / Path(entry["path"])
        if path.stat().st_size != entry["bytes"]:
            raise ValueError(f"Evidence size mismatch: {entry['path']}")
    if (pinned_count, parent_count, runtime_count, v54_count, new_count) != (
        6, 9, 37, 25, 8
    ):
        raise ValueError("Unexpected source/evidence manifest counts")

    ev = QA / "FCV588_V55B_SOURCE_UNIT_20261022"
    for filename, expected in (
        ("V55B_HOLD_BRIDGE_ATTEMPT1_NODE_20261022.log", 5),
        ("V55B_EXISTING_TARGETED_NODE_20261022.log", 21),
        ("V55B_FULL_NODE_20261022.log", 511),
        ("V55B_POSTDOCUMENT_NODE_20261022.log", 511),
    ):
        verify_log(ev / filename, expected)
    for filename in ("V55B_PYTHON_20261022.log",
                     "V55B_POSTDOCUMENT_PYTHON_20261022.log"):
        text = (ev / filename).read_text(encoding="utf-8")
        if "Ran 13 tests" not in text or not re.search(r"(?m)^OK\s*$", text):
            raise ValueError(f"Python log count/status mismatch: {filename}")
    ledger = read_json(ROOT / "docs" / "evidence" /
                       "fcv588-public-implementation-status.json")
    claims = ledger["operatorRows"] + ledger["teacherRows"]
    if len(claims) != 65 or any(x["claimDecision"] != "HOLD" for x in claims):
        raise ValueError("65 feature claims are no longer all HOLD")
    if (ledger["hardwareValidated"] or ledger["rightsClearance"] or
            ledger["firmwareInstalled"] is not None or
            ledger["releaseApproval"] != "HOLD"):
        raise ValueError("Hardware/rights/firmware/release gate drift")

    payload = {
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "status": "V55B_INDEPENDENT_SHA_READBACK_MATCH_PHASE6_HOLD",
        "scopedIntegritySHA256": actual_scoped_sha,
        "verifierScriptSHA256": sha256(Path(__file__)),
        "pinnedReceipts": f"{pinned_count}/{pinned_count}_MATCH",
        "v54ParentFiles": f"{parent_count}/{parent_count}_MATCH",
        "canonicalRuntime": f"{runtime_count}/{runtime_count}_MATCH",
        "v54Evidence": f"{v54_count}/{v54_count}_MATCH",
        "v55bEvidence": f"{new_count}/{new_count}_MATCH",
        "newBridgeTests": "5/5_PASS_UNIT_SYNTHETIC_ONLY",
        "existingTargeted": "21/21_PASS",
        "fullNode": "511/511_PASS",
        "python": "13/13_PASS",
        "postdocumentNode": "511/511_PASS",
        "postdocumentPython": "13/13_PASS",
        "narratorNvdaActualSpeech": "NOT_RUN",
        "genuineOsBlurUnderPowerHold": "NOT_RUN",
        "realOsBlurCancellationReplay": "NOT_RUN",
        "phase6": "OPEN",
        "claimsHold": 65,
        "rightsClearance": False,
        "installedFirmware": "UNKNOWN",
        "hardwareValidated": False,
        "releaseApproval": "HOLD",
        "independenceMeaning": "FRESH_PYTHON_HASHLIB_READBACK_NOT_3P_OEM_REVIEW",
        "productCodeChanges": 0,
        "diskD": "NOT_ACCESSED",
        "backup": "NOT_ATTEMPTED",
    }
    with POST.open("x", encoding="utf-8", newline="\n") as stream:
        json.dump(payload, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    reread = read_json(POST)
    if reread["scopedIntegritySHA256"] != actual_scoped_sha:
        raise ValueError("Postreceipt readback mismatch")
    print("POSTRECEIPT_STATUS=" + reread["status"])
    print("SCOPED_SHA=" + actual_scoped_sha)
    print("VERIFIER_SHA=" + payload["verifierScriptSHA256"])
    print("POSTRECEIPT_SHA=" + sha256(POST))
    print("RUNTIME=" + reread["canonicalRuntime"])
    print("V55B_EVIDENCE=" + reread["v55bEvidence"])
    print("REAL_SPEECH=" + reread["narratorNvdaActualSpeech"])
    print("GENUINE_BLUR=" + reread["genuineOsBlurUnderPowerHold"])


if __name__ == "__main__":
    main()
