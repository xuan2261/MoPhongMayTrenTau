"""Write-once final integrity + independent postreceipt for P04 provenance.

Run only after guarded canonical apply and post-apply Node/Python/Chrome QA have
already completed and p04_provenance_postapply_verify.py produced a PASS receipt.
This script never edits canonical/stage source and never starts Node/browser/server.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT / r"staging\fcv588-p04-bottom-provenance-20261116"
DOCS = ROOT / r"docs\qa\FCV588_P04_PROVENANCE_20261116"

P04_FINAL = ROOT / r"docs\qa\FCV588_VISUAL_P04_20261114\FCV588_VISUAL_P04_FINAL_INTEGRITY_20261114.json"
P04_POST = ROOT / r"docs\qa\FCV588_VISUAL_P04_20261114\FCV588_VISUAL_P04_INDEPENDENT_POSTRECEIPT_20261114.json"
P05P06_FINAL = ROOT / r"docs\qa\FCV588_VISUAL_P05_P06_20261116\FCV588_VISUAL_P05_P06_FINAL_INTEGRITY_20261116.json"
P05P06_POST = ROOT / r"docs\qa\FCV588_VISUAL_P05_P06_20261116\FCV588_VISUAL_P05_P06_INDEPENDENT_POSTRECEIPT_20261116.json"
OLD_RED = ROOT / r"plans\261113-0911-fcv588-photo-reference-visual-conformance\research\qa-20261116\p04-extended\P04_NEAR_BOTTOM_FISH_ONLY_RED_RECEIPT_20261116.json"
OLD_RED_LOG = ROOT / r"plans\261113-0911-fcv588-photo-reference-visual-conformance\research\qa-20261116\p04-extended\p04-near-bottom-fish-only-red-v1.txt"

SEALED = {
    P04_FINAL: "c3a292dc213e660fa855c453eaf324fd9014ddb163e4723cea141a4050a1382b",
    P04_POST: "569e4b99a8e8de49502d74db30c0215eb61b238edf3ddaa4d93f6d7ed6b4ec90",
    P05P06_FINAL: "ecdfb0bc680f35a6935bb11a4bbadd1f95e3441069b7074a0b68ab22506b4ee4",
    P05P06_POST: "9befe64829bf9c79fb7e0505fe1db83a5edf676ce1f4c22a7073ca3cd7a6160e",
    OLD_RED: "c4d7ba7bcc7998dd48fd270541e7e694ee6a930d27809a5bb44b5d4bf2677690",
    OLD_RED_LOG: "e336be0e97bfd856df008728eed711e2a593c619aaa4132783bbf3ca3ddbbf51",
}
HOLDS = {
    "phase6": "OPEN", "featureClaims": "65/65 HOLD",
    "hardware": "HOLD", "firmware": "HOLD",
    "rights": "HOLD", "release": "HOLD",
}
EXACT8 = {
    "src/core/scenario.mjs",
    "src/devices/fcv588/echo-projection.mjs",
    "web/app.mjs",
    "web/fcv588-echo-rasterizer.mjs",
    "test/fcv588-photo-modes.test.mjs",
    "test/fcv588-p04-bottom-provenance.test.mjs",
    "test/fcv588-p04-bottom-provenance-v2.test.mjs",
    "test/fcv588-p04-bottom-provenance-v3.test.mjs",
}


def require(ok: bool, message: str) -> None:
    if not ok:
        raise RuntimeError(message)


def sha(path: Path) -> str:
    require(path.is_file(), "missing file: " + str(path))
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_once(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    blob = (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, "wb") as stream:
        stream.write(blob)


def runtime_inventory(root: Path) -> dict[str, str]:
    rows: dict[str, str] = {}
    for folder in ("src", "web"):
        for path in (root / folder).rglob("*"):
            if path.is_file() and path.suffix.lower() in {".mjs", ".js", ".css", ".svg", ".html"}:
                rows[path.relative_to(root).as_posix()] = sha(path)
    return dict(sorted(rows.items()))


def verify_seals() -> dict:
    rows = []
    for path, expected in SEALED.items():
        actual = sha(path)
        require(actual == expected, "historical seal/evidence drift: " + str(path))
        rows.append({"path": str(path), "sha256": actual})
    return {"status": "PASS", "rows": rows}


def verify_evidence_rows(receipt: dict) -> list[dict]:
    paths = []
    for key in ("stage", "compatibility", "reviewer", "guardedApply",
                "canonicalNode", "canonicalPython", "stageBrowser", "canonicalBrowser"):
        entry = receipt.get(key, {})
        path = Path(entry.get("path", ""))
        expected = entry.get("sha256")
        require(path.is_file() and expected and sha(path) == expected,
                "verification evidence drift: " + key)
        paths.append({"name": key, "path": str(path), "sha256": expected})
        for sub_key, sha_key in (("eventsPath", "eventsSHA256"), ("manifestPath", "manifestSHA256")):
            if entry.get(sub_key):
                sub = Path(entry[sub_key])
                exp = entry.get(sha_key)
                require(sub.is_file() and exp and sha(sub) == exp,
                        "verification browser evidence drift: " + key + "/" + sub_key)
                paths.append({"name": key + "/" + sub_key,
                              "path": str(sub), "sha256": exp})
    return paths


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--verification-receipt", type=Path, required=True)
    parser.add_argument("--final-integrity", type=Path,
                        default=DOCS / "FCV588_P04_PROVENANCE_FINAL_INTEGRITY_20261116.json")
    parser.add_argument("--postreceipt", type=Path,
                        default=DOCS / "FCV588_P04_PROVENANCE_INDEPENDENT_POSTRECEIPT_20261116.json")
    args = parser.parse_args()
    require(args.final_integrity.parent.resolve() == DOCS.resolve(),
            "final integrity must be directly under dedicated docs/qa folder")
    require(args.postreceipt.parent.resolve() == DOCS.resolve(),
            "postreceipt must be directly under dedicated docs/qa folder")
    require(not args.final_integrity.exists() and not args.postreceipt.exists(),
            "write-once final integrity/postreceipt already exists")

    verify = read_json(args.verification_receipt)
    require(verify.get("status") == "PASS_POSTAPPLY_READY_FOR_FINAL_INTEGRITY" and
            not verify.get("objectiveFailures"), "postapply verification is not finalizer-ready PASS")
    require(verify.get("stageRoot") == str(STAGE) and verify.get("canonicalRoot") == str(ROOT),
            "postapply verification root mismatch")
    require(verify.get("holds") == HOLDS, "postapply HOLD contract drift")
    require(verify.get("canonical", {}).get("runtimeCount") == 39 and
            verify.get("canonical", {}).get("stageCanonicalMatch") is True and
            set(verify.get("canonical", {}).get("exact8", [])) == EXACT8,
            "postapply canonical/runtime/exact8 gate missing")
    require(verify.get("reviewer", {}).get("decision") == "GO",
            "postapply verification lacks reviewer GO")
    require(verify.get("stageBrowser", {}).get("caseCount") == 6 and
            verify.get("canonicalBrowser", {}).get("caseCount") == 6,
            "stage/canonical six-case browser evidence missing")
    require(verify.get("stageBrowser", {}).get("stopBottomZoneProof", {}).get("canvasStable") is True and
            verify.get("canonicalBrowser", {}).get("stopBottomZoneProof", {}).get("canvasStable") is True,
            "Stop/Bottom Zone proof is not PASS in both browser receipts")

    seals = verify_seals()
    evidence = verify_evidence_rows(verify)
    verify_sha = sha(args.verification_receipt)
    canonical = runtime_inventory(ROOT)
    stage = runtime_inventory(STAGE)
    require(len(canonical) == 39 and canonical == stage,
            "independent reread canonical source39 != stage39")
    require(canonical == verify.get("canonical", {}).get("runtimeSHA256"),
            "independent canonical runtime map != verification receipt")
    for rel in EXACT8:
        require((ROOT / rel).is_file() and (STAGE / rel).is_file() and
                sha(ROOT / rel) == sha(STAGE / rel), "independent exact8 mismatch: " + rel)

    final = {
        "schema": "fcv588-p04-provenance-final-integrity-v1",
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "status": "P04_PROVENANCE_BOUNDED_SOFTWARE_QA_PASS_PHASE6_RIGHTS_HARDWARE_FIRMWARE_RELEASE_HOLD",
        "scope": "offline synthetic P04 Bottom Lock source provenance and Stop/Bottom Zone display consistency; no hardware/OEM/release certification",
        "verificationReceipt": {"path": str(args.verification_receipt), "sha256": verify_sha},
        "historicalSeals": seals,
        "evidence": evidence,
        "stageReceipt": verify["stage"],
        "compatibility": verify["compatibility"],
        "independentReviewer": verify["reviewer"],
        "guardedApply": verify["guardedApply"],
        "runtimeCount": 39,
        "runtimeSHA256": canonical,
        "exactAppliedPaths": sorted(EXACT8),
        "canonicalNode": verify["canonicalNode"],
        "canonicalPython": verify["canonicalPython"],
        "stageBrowser": verify["stageBrowser"],
        "canonicalBrowser": verify["canonicalBrowser"],
        "referencePhotos": verify["jpg8"],
        "holds": HOLDS,
        "claims": {"oemVisualPercent": None, "realMaritimeIo": False,
                   "hardwareValidated": False, "firmwareConformance": "HOLD",
                   "rightsClearance": "HOLD", "releaseApproval": "HOLD"},
        "operations": {"canonicalWritesByFinalizer": False, "serverStarted": False,
                       "browserStarted": False, "nodeExecuted": False,
                       "port4173Operation": "NONE"},
    }
    write_once(args.final_integrity, final)
    final_sha = sha(args.final_integrity)
    reread = read_json(args.final_integrity)
    require(reread.get("runtimeSHA256") == canonical and reread.get("holds") == HOLDS,
            "final integrity reread mismatch")

    post = {
        "schema": "fcv588-p04-provenance-independent-postreceipt-v1",
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "status": "PASS_BOUNDED_P04_PROVENANCE_SOFTWARE_INTEGRITY_ONLY",
        "finalIntegrityPath": str(args.final_integrity),
        "finalIntegritySHA256": final_sha,
        "verificationReceiptSHA256": verify_sha,
        "independentlyRereadRuntime": len(runtime_inventory(ROOT)),
        "stageCanonicalRuntimeMatch": runtime_inventory(ROOT) == runtime_inventory(STAGE),
        "independentlyRereadExact8": all(sha(ROOT / rel) == sha(STAGE / rel) for rel in EXACT8),
        "independentlyRereadHistoricalSeals": len(verify_seals()["rows"]),
        "stageChromeCases": verify["stageBrowser"]["caseCount"],
        "canonicalChromeCases": verify["canonicalBrowser"]["caseCount"],
        "stopBottomZoneStageStable": verify["stageBrowser"]["stopBottomZoneProof"]["canvasStable"],
        "stopBottomZoneCanonicalStable": verify["canonicalBrowser"]["stopBottomZoneProof"]["canvasStable"],
        "canonicalNode": verify["canonicalNode"]["tests"],
        "canonicalPython": verify["canonicalPython"]["tests"],
        "jpg8ReferenceOnly": verify["jpg8"]["count"] == 8 and not verify["jpg8"]["runtimeCopies"],
        "holds": HOLDS,
        "phase6F1": "OPEN",
        "featureClaims": "65/65 HOLD",
        "firmwareRightsHardwareRelease": "HOLD",
    }
    require(post["independentlyRereadRuntime"] == 39 and
            post["stageCanonicalRuntimeMatch"] and post["independentlyRereadExact8"] and
            post["stopBottomZoneStageStable"] and post["stopBottomZoneCanonicalStable"],
            "independent postreceipt reread gate failed")
    write_once(args.postreceipt, post)
    print("FINAL_INTEGRITY=" + str(args.final_integrity))
    print("FINAL_INTEGRITY_SHA256=" + sha(args.final_integrity))
    print("POSTRECEIPT=" + str(args.postreceipt))
    print("POSTRECEIPT_SHA256=" + sha(args.postreceipt))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
