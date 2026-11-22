"""Independent write-once re-read of the sealed P03 final integrity receipt.

This script never changes runtime, staging, historical evidence, or the final
receipt. It writes only a new postreceipt in the same docs/qa directory.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json

ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT / "staging/fcv588-photo-echo-20261114"
DIR = ROOT / "docs/qa/FCV588_VISUAL_P03_20261114"
FINAL = DIR / "FCV588_VISUAL_P03_FINAL_INTEGRITY_20261114.json"
POST = DIR / "FCV588_VISUAL_P03_INDEPENDENT_POSTRECEIPT_20261114.json"
FINAL_SCRIPT = DIR / "p03_final_integrity.py"
PROCEDURE = DIR / "PROCEDURE.md"

EXPECTED_FINAL = "1132a7d8eae167a9afa60e5271bfec282b53b848054f3637cb973467fcd67c6d"
EXPECTED_FINAL_SCRIPT = "faef5aff4ff881c2b42e4f486ed9fde4cb9f2d1105cfb9ea34aebce172f6261e"
EXPECTED_PROCEDURE = "86140468ddfac74aa9664b77565778442425ee96eb51a5fd7243b52f215fb480"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def need(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def rooted(rel: str) -> Path:
    path = ROOT.joinpath(*rel.split("/"))
    need(path.resolve().is_relative_to(ROOT.resolve()), f"path escaped root: {rel}")
    return path


def main() -> None:
    need(not POST.exists(), f"postreceipt must be write-once: {POST}")
    need(FINAL.is_file() and sha(FINAL) == EXPECTED_FINAL, "final receipt SHA changed")
    need(sha(FINAL_SCRIPT) == EXPECTED_FINAL_SCRIPT, "final-integrity script changed")
    need(sha(PROCEDURE) == EXPECTED_PROCEDURE, "procedure changed")
    final = json.loads(FINAL.read_text(encoding="utf-8"))
    need(final.get("status") == "P03_VISUAL_SOFTWARE_QA_PASS_RIGHTS_HARDWARE_RELEASE_HOLD",
         "final status/scope changed")
    need(final.get("runtimeSourceCount") == 39 and
         final.get("runtimeStageCanonical") == "39/39_MATCH",
         "runtime count/status changed")
    need(final.get("nodeCanonical") == "535/535_PASS" and
         final.get("pythonCanonical") == "13/13_PASS",
         "fresh canonical test status changed")

    for rel, expected in final["runtimeSHA256"].items():
        canonical = rooted(rel)
        staged = STAGE.joinpath(*rel.split("/"))
        need(canonical.is_file() and staged.is_file(), f"missing runtime source: {rel}")
        need(sha(canonical) == expected and sha(staged) == expected,
             f"runtime stage/canonical changed after final: {rel}")

    parent = final["parentP02"]
    need(sha(rooted(parent["finalPath"])) == parent["finalSHA256"], "P02 final changed")
    need(sha(rooted(parent["postreceiptPath"])) == parent["postreceiptSHA256"],
         "P02 independent postreceipt changed")
    guarded = final["guardedApply"]
    need(sha(rooted(guarded["backupPath"])) == guarded["backupSHA256"],
         "P03 guarded backup changed")
    need(sha(rooted(guarded["receiptPath"])) == guarded["receiptSHA256"],
         "P03 guarded apply receipt changed")

    for rel, expected in final["qaLogsSHA256"].items():
        need(sha(rooted(rel)) == expected, f"QA log changed: {rel}")

    screenshot_count = 0
    browser_receipts = {}
    browser_artifact_count = 0
    for env in ("stage", "canonical"):
        browser = final["browser"][env]
        receipt = Path(browser["receiptPath"])
        need(receipt.is_file() and sha(receipt) == browser["receiptSHA256"],
             f"{env} browser receipt changed")
        body = json.loads(receipt.read_text(encoding="utf-8"))
        need(body.get("overallStatus") == "PASS" and body.get("sourceTreeStable") is True,
             f"{env} browser PASS/source stability changed")
        need(body.get("sourceManifestBefore") == body.get("sourceManifestAfter"),
             f"{env} browser source manifest drift")
        deny = body.get("photoDeny", {})
        need(deny.get("status") == "PASS" and len(deny.get("paths", [])) == 8 and
             all(x.get("statusCode") == 404 for x in deny["paths"]),
             f"{env} browser photo deny changed")
        need(len(body.get("cases", [])) == 9 and all(x.get("status") == "PASS" for x in body["cases"]),
             f"{env} browser 9/9 case matrix changed")
        for row in browser["screenshots"]:
            image = Path(row["path"])
            need(image.is_file() and image.stat().st_size == row["bytes"] and
                 sha(image) == row["sha256"], f"screenshot changed: {image}")
            screenshot_count += 1
        for name, entry in browser["directoryArtifacts"].items():
            item = receipt.parent / name
            need(item.is_file() and item.stat().st_size == entry["bytes"] and
                 sha(item) == entry["sha256"], f"browser artifact changed: {item}")
            browser_artifact_count += 1
        browser_receipts[env] = browser["receiptSHA256"]
    need(screenshot_count == 18, "expected 18 stage+canonical screenshots")

    photo_count = 0
    for name, entry in final["photoReferenceSHA256"].items():
        photo = ROOT / "sources/FCV588_GiaoDienThucTeMay2016" / name
        need(photo.is_file() and photo.stat().st_size == entry["bytes"] and
             sha(photo) == entry["sha256"], f"original reference photo changed: {name}")
        need(entry["rights"] == "REFERENCE_ONLY_CLEARANCE_NOT_OBTAINED",
             f"photo rights status unexpectedly changed: {name}")
        photo_count += 1
    need(photo_count == 8, "reference photo set is not 8/8")

    ledger = final["implementationStatusLedger"]
    ledger_path = rooted(ledger["path"])
    need(sha(ledger_path) == ledger["sha256"], "implementation status ledger changed")
    claims = json.loads(ledger_path.read_text(encoding="utf-8"))
    rows = claims.get("operatorRows", []) + claims.get("teacherRows", [])
    need(claims.get("hardwareValidated") is False and
         claims.get("rightsClearance") is False and
         claims.get("releaseApproval") == "HOLD" and
         claims.get("firmwareInstalled") is None and
         len(rows) == 65 and all(x.get("claimDecision") == "HOLD" for x in rows),
         "rights/hardware/firmware/65HOLD ledger changed")
    need(final.get("rightsClearance") is False and final.get("hardwareValidated") is False and
         final.get("featureClaims") == "65/65_HOLD" and final.get("phase6") == "OPEN" and
         final.get("releaseApproval") == "HOLD" and final.get("oemConformity") == "NOT_CLAIMED",
         "final HOLD boundary changed")

    post = {
        "schema": "fcv588-visual-p03-independent-postreceipt-v1",
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "status": "P03_INDEPENDENT_POSTRECEIPT_PASS_RIGHTS_HARDWARE_RELEASE_HOLD",
        "finalReceiptPath": FINAL.relative_to(ROOT).as_posix(),
        "finalReceiptSHA256": EXPECTED_FINAL,
        "finalIntegrityScriptSHA256": EXPECTED_FINAL_SCRIPT,
        "procedureSHA256": EXPECTED_PROCEDURE,
        "recheckedRuntime": "39/39_STAGE_CANONICAL_MATCH",
        "recheckedCanonicalTests": {"node": "535/535_PASS", "python": "13/13_PASS"},
        "recheckedBrowserReceipts": browser_receipts,
        "recheckedBrowserCases": "9/9_STAGE_AND_9/9_CANONICAL_PASS",
        "recheckedScreenshots": "18/18_MATCH",
        "recheckedBrowserDirectoryArtifacts": browser_artifact_count,
        "recheckedPhotoReferences": "8/8_MATCH_REFERENCE_ONLY_AND_HTTP_DENIED",
        "parentP02FinalSHA256": parent["finalSHA256"],
        "parentP02PostreceiptSHA256": parent["postreceiptSHA256"],
        "guardedBackupSHA256": guarded["backupSHA256"],
        "guardedApplySHA256": guarded["receiptSHA256"],
        "coreSceneReplayChanged": False,
        "rightsClearance": False,
        "hardwareValidated": False,
        "firmwareInstalled": "UNKNOWN",
        "featureClaims": "65/65_HOLD",
        "phase6": "OPEN",
        "releaseApproval": "HOLD",
        "oemConformity": "NOT_CLAIMED",
        "notes": "Independent filesystem re-read after final seal; no runtime writes and no promotion of rights/hardware/OEM/release claims.",
    }
    with POST.open("x", encoding="utf-8", newline="\n") as handle:
        json.dump(post, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    reread = json.loads(POST.read_text(encoding="utf-8"))
    need(reread["finalReceiptSHA256"] == sha(FINAL), "postreceipt self-read final SHA mismatch")
    print("POSTRECEIPT=" + str(POST))
    print("POSTRECEIPT_SHA256=" + sha(POST))
    print("FINAL_SHA256=" + sha(FINAL))
    print("RUNTIME=39/39; BROWSER=9+9; SCREENSHOTS=18/18; PHOTOS=8/8")
    print("STILL_HOLD=RIGHTS; HARDWARE; FIRMWARE; FEATURE_CLAIMS_65; PHASE6; RELEASE; OEM_CONFORMITY")


if __name__ == "__main__":
    main()
