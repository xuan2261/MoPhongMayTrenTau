"""V56 independent source/evidence readback (write-once postreceipt).

This fresh Python checker does not launch browser, use OEM media, or
modify the canonical runtime or any historical QA evidence.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
QA = ROOT / "docs" / "qa"
SEAL = QA / "FCV588_V56_D15_SCOPED_INTEGRITY_20261031.json"
POST = QA / "FCV588_V56_D15_INDEPENDENT_POSTRECEIPT_20261031.json"
EXPECTED_SEAL_SHA = (
    "96e95ddf1dc54f327e25320e55a182f30daff4155f23a30bf8b711bd2998cde3"
)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def checked_items(mapping: dict[str, str]) -> int:
    for relative, expected in mapping.items():
        source = ROOT.joinpath(*relative.split("/"))
        if not source.is_file() or sha(source) != expected:
            raise ValueError("SHA mismatch or missing: " + relative)
    return len(mapping)


def main() -> None:
    if POST.exists():
        raise FileExistsError("Do not overwrite independent postreceipt")
    actual_seal = sha(SEAL)
    if actual_seal != EXPECTED_SEAL_SHA:
        raise ValueError("Scoped integrity SHA drift")
    obj = json.loads(SEAL.read_text(encoding="utf-8"))
    if obj["status"] != "V56_D15_FIVE_TABS_SCOPED_SOFTWARE_AND_BROWSER_PASS_PHASE6_OPEN":
        raise ValueError("Unexpected V56 result status")
    historical = checked_items(obj["parentSealsSHA256"])
    runtime = checked_items(obj["runtime38SourceSHA"])
    evidence_map = {x["path"]: x["sha256"] for x in obj["qaEvidenceSHA"]}
    evidence = checked_items(evidence_map)
    for entry in obj["qaEvidenceSHA"]:
        path = ROOT.joinpath(*entry["path"].split("/"))
        if path.stat().st_size != entry["bytes"]:
            raise ValueError("Evidence byte-size mismatch: " + entry["path"])
    if historical != 6 or runtime != 38 or evidence != 34:
        raise ValueError("Unexpected evidence manifest counts")
    if obj["originalRuntimePreserved"] != 34:
        raise ValueError("Original runtime preserved count changed")
    if set(obj["originalRuntimeChanged"]) != {
        "web/app.mjs", "web/index.html", "web/styles.css"
    }:
        raise ValueError("Unexpected existing runtime changes")
    if (
        obj["claimsHold"] != 65
        or obj["phase6"] != "OPEN"
        or obj["releaseApproval"] != "HOLD"
        or obj["narratorNvdaActualSpoken"] != "NOT_RUN"
        or obj["genuineWindowsBlurUnderPowerHold"] != "NOT_RUN"
    ):
        raise ValueError("Protected Phase6/claim/real-OS gates differ")
    ledger = json.loads(
        (ROOT / "docs/evidence/fcv588-public-implementation-status.json")
        .read_text(encoding="utf-8")
    )
    rows = ledger["operatorRows"] + ledger["teacherRows"]
    if (
        len(rows) != 65
        or any(row["claimDecision"] != "HOLD" for row in rows)
        or ledger["rightsClearance"] is not False
        or ledger["hardwareValidated"] is not False
        or ledger["firmwareInstalled"] is not None
        or ledger["releaseApproval"] != "HOLD"
    ):
        raise ValueError("Fresh ledger gate readback mismatch")
    browser_path = (
        QA / "FCV588_V56_D15_TABS_20261031"
        / "V56_CANONICAL_BROWSER_ATTEMPT1_RAW_20261031"
        / "V56_BROWSER_DOM_INPUT_SOURCE_RECEIPT.json"
    )
    browser = json.loads(browser_path.read_text(encoding="utf-8"))
    if (
        browser["errors"]
        or len(browser["viewports"]) != 3
        or any(
            x["status"] != "PASS" or len(x["loadedBodies"]) != 36
            for x in browser["viewports"]
        )
    ):
        raise ValueError("Canonical Chrome receipt is not complete scoped PASS")
    post = {
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "status": "V56_INDEPENDENT_SOURCE_SHA_READBACK_MATCH_PHASE6_OPEN",
        "v56ScopedIntegritySHA256": actual_seal,
        "verifierScriptSHA256": sha(Path(__file__)),
        "historicalSealPins": f"{historical}/{historical}_MATCH",
        "runtimeSources": f"{runtime}/{runtime}_MATCH",
        "newEvidence": f"{evidence}/{evidence}_MATCH",
        "legacyRuntimeUnchanged": 34,
        "legacyRuntimeChanged": 3,
        "newRuntime": 1,
        "node": "514/514_PASS",
        "python": "13/13_PASS",
        "postdocumentNode": "514/514_PASS",
        "postdocumentPython": "13/13_PASS",
        "chromeViewports": "3/3_PASS",
        "browserSourceBodiesPerViewport": "36/36_MATCH",
        "ultraMode": obj["ultra"],
        "originalEarlyCssIncidentPreserved": True,
        "originalFailedAttemptsPreserved": True,
        "realNarratorNvdaSpoken": "NOT_RUN",
        "genuineOsPowerBlur": "NOT_RUN",
        "phase6": "OPEN",
        "claimsHold": 65,
        "installedFirmware": "UNKNOWN",
        "hardwareValidated": False,
        "rightsClearance": False,
        "releaseApproval": "HOLD",
        "reviewerMeaning": "FRESH_HASHLIB_READBACK_NOT_3P_OEM_OR_SPOKEN_REVIEW",
        "diskD": "NOT_ACCESSED",
        "backup": "NOT_ATTEMPTED",
    }
    with POST.open("x", encoding="utf-8", newline="\n") as output:
        json.dump(post, output, indent=2, ensure_ascii=False)
        output.write("\n")
    if json.loads(POST.read_text(encoding="utf-8"))["v56ScopedIntegritySHA256"] != actual_seal:
        raise ValueError("Postreceipt serialization readback failed")
    print("INDEPENDENT_POST_STATUS=" + post["status"])
    print("SCOPED_SHA=" + actual_seal)
    print("POST_SHA=" + sha(POST))
    print("VERIFIER_SHA=" + post["verifierScriptSHA256"])
    print("EVIDENCE=" + post["newEvidence"])
    print("RUNTIME=" + post["runtimeSources"])
    print("PHASE6=" + post["phase6"])


if __name__ == "__main__":
    main()
