"""P04 bounded canonical apply gate.

Default invocation is DRY-RUN ONLY. This script can perform a guarded apply
only when an operator explicitly supplies --apply. It never grants hardware,
rights, release, or OEM-fidelity approval; post-apply Node/Python/Chrome QA
and an independent final postreceipt remain mandatory.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
import tempfile
import zipfile


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT / "staging/fcv588-photo-modes-20261114"
QA = ROOT / (
    "plans/261113-0911-fcv588-photo-reference-visual-conformance/"
    "research/qa-20261114"
)
P04_QA = QA / "p04-stage"
P03_APPLY = QA / "P03_CANONICAL_GUARDED_APPLY_20261114.json"
P03_FINAL = ROOT / "docs/qa/FCV588_VISUAL_P03_20261114/FCV588_VISUAL_P03_FINAL_INTEGRITY_20261114.json"
P03_INDEPENDENT_POST = ROOT / "docs/qa/FCV588_VISUAL_P03_20261114/FCV588_VISUAL_P03_INDEPENDENT_POSTRECEIPT_20261114.json"
P03_POST_BROWSER = QA / (
    "p03-canonical-browser-v2/"
    "fcv588-p03-canonical-browser-20261114T103738+0700-400d4eff.json"
)
P04_BASELINE = P04_QA / "P04_STAGE_BASELINE_RUNTIME39_20261114.json"
P04_STAGE_RECEIPT = P04_QA / "P04_STAGE_IMPLEMENTATION_RECEIPT_20261114.json"
P04_QA_MANIFEST = P04_QA / "P04_STAGE_QA_SHA256_20261114.txt"
P04_BROWSER = P04_QA / (
    "browser-attempt2/"
    "fcv588-p04-stage-browser-blflat-20261114T105809+0700-ac0a78e3.json"
)
P04_NODE = P04_QA / "p04-full-node-attempt5-final.txt"
P04_PYTHON = P04_QA / "p04-python-final-v4.txt"

BACKUP = QA / "P04_BEFORE_APPLY_20261114.zip"
JOURNAL = QA / "P04_CANONICAL_APPLY_JOURNAL_20261114.json"
RECEIPT = QA / "P04_CANONICAL_GUARDED_APPLY_20261114.json"

P03_APPLY_SHA = "80244905d3090a6c7891ec7b4de7f3d6583835ba3df9f8983ac063776543912f"
P03_FINAL_SHA = "1132a7d8eae167a9afa60e5271bfec282b53b848054f3637cb973467fcd67c6d"
P03_INDEPENDENT_POST_SHA = "48abc24fecae4df657e79d4ed7ba6d365fb4a97a086fbf99792b9b8535da362e"
P03_POST_BROWSER_SHA = "61aac8d09e48e5aa948b9622b44e2516e848d2604928a423c7b7bbfa3f6dbcae"
P04_BASELINE_SHA = "aaf7ec93fb7ad9051e64b11548b88dc88bf5144cec858081c247236a1d787817"
P04_STAGE_RECEIPT_SHA = "d66a2f24561662fd897223cc1a6a53edd97c2909890b8d3131334e0f97694bf6"
P04_QA_MANIFEST_SHA = "ac3d25842f4e997b70fa512881dfaf51813223a3c5aa7c4755ac51216466a31e"
P04_BROWSER_SHA = "63d916faea9087bd6cc7c201d49c252c9b73a41dec3d69ac75285759bbafaa7f"

RUNTIME_ALLOW = (
    "src/devices/fcv588/display-layout.mjs",
    "src/devices/fcv588/echo-projection.mjs",
    "web/app.mjs",
    "web/lcd-presentation.mjs",
    "web/styles.css",
)
TEST_ALLOW = (
    "test/fcv588-photo-display.test.mjs",
    "test/fcv588-photo-modes.test.mjs",
    "test/fcv588-public-display-widgets.test.mjs",
    "test/fcv588-public-display.test.mjs",
    "test/web-layout.test.mjs",
)
ALLOW = tuple(sorted(RUNTIME_ALLOW + TEST_ALLOW))


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def must(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json_exclusive(path: Path, value: dict) -> None:
    with path.open("x", encoding="utf-8", newline="\n") as handle:
        json.dump(value, handle, indent=2, ensure_ascii=False)
        handle.write("\n")


def all_stage_diffs() -> list[str]:
    rels: set[str] = set()
    for folder in ("src", "web", "test"):
        for path in (STAGE / folder).rglob("*"):
            if path.is_file():
                rels.add(path.relative_to(STAGE).as_posix())
    different = []
    for rel in sorted(rels):
        staged = STAGE / rel
        canonical = ROOT / rel
        if not canonical.is_file() or digest(canonical) != digest(staged):
            different.append(rel)
    return different


def verify_parent_p03() -> tuple[dict, dict]:
    must(digest(P03_FINAL) == P03_FINAL_SHA,
         "P03 final integrity seal drift")
    must(digest(P03_INDEPENDENT_POST) == P03_INDEPENDENT_POST_SHA,
         "P03 independent postreceipt seal drift")
    must(digest(P03_APPLY) == P03_APPLY_SHA, "P03 guarded apply receipt drift")
    must(digest(P03_POST_BROWSER) == P03_POST_BROWSER_SHA,
         "P03 independent canonical browser receipt drift")
    parent = load_json(P03_APPLY)
    post = load_json(P03_POST_BROWSER)
    must(parent.get("postAppliedRuntime") == "39/39_MATCH",
         "P03 parent does not prove canonical runtime39")
    must(len(parent.get("fullStageRuntimeSHA256", {})) == 39,
         "P03 runtime manifest count drift")
    must(post.get("overallStatus") == "PASS" and post.get("sourceTreeStable") is True,
         "P03 canonical post-browser receipt is not PASS/stable")
    must(post.get("serverCleanup") == "PASS",
         "P03 post-browser server cleanup not proved")
    return parent, post


def verify_p04_stage() -> dict:
    must(digest(P04_BASELINE) == P04_BASELINE_SHA, "P04 baseline receipt drift")
    baseline = load_json(P04_BASELINE)
    must(baseline.get("runtimeFiles") == 39 and baseline.get("matches") == 39
         and baseline.get("status") == "MATCH",
         "P04 staging did not start from sealed P03 runtime39")
    must(digest(P04_STAGE_RECEIPT) == P04_STAGE_RECEIPT_SHA,
         "P04 stage implementation receipt drift")
    must(digest(P04_QA_MANIFEST) == P04_QA_MANIFEST_SHA,
         "P04 stage QA manifest drift")
    receipt = load_json(P04_STAGE_RECEIPT)
    must(receipt.get("softwareQaStatus") == "PASS"
         and receipt.get("allowlist", {}).get("status") == "EXACT_10_PATHS"
         and receipt.get("allowlist", {}).get("runtimeCount") == 5
         and receipt.get("allowlist", {}).get("testCount") == 5
         and not receipt.get("objectiveFailures"),
         "P04 stage software QA/allowlist receipt not PASS")
    must(receipt.get("canonicalApplied") is False,
         "P04 stage receipt unexpectedly claims canonical apply")

    node = P04_NODE.read_text(encoding="utf-8", errors="replace")
    must("# tests 541" in node and "# pass 541" in node and "# fail 0" in node,
         "P04 final Node 541/541 not proved")
    py = P04_PYTHON.read_text(encoding="utf-8", errors="replace").replace("\r", "")
    must("Ran 13 tests" in py and "\nOK" in py,
         "P04 final Python 13/13 not proved")
    must(digest(P04_BROWSER) == P04_BROWSER_SHA, "P04 browser receipt drift")
    browser = load_json(P04_BROWSER)
    must(browser.get("overallStatus") == "PASS"
         and browser.get("sourceTreeStable") is True
         and browser.get("photoDeny", {}).get("status") == "PASS"
         and browser.get("serverCleanup") == "PASS"
         and len(browser.get("cases", [])) == 7
         and not browser.get("objectiveFailures"),
         "P04 browser selected acceptance not PASS")
    bl = [case for case in browser["cases"] if case.get("name") == "BL-LF-Blue"]
    must(len(bl) == 1, "P04 BL browser case missing/duplicated")
    flat = bl[0].get("bottomLockFlatProof") or {}
    must(flat.get("coverage", 0) >= 0.5 and flat.get("inLowerBand") is True,
         "P04 BL browser flat-bottom morphology not proved")
    return receipt


def verify_preimages(parent: dict, p04: dict) -> tuple[dict, dict]:
    parent_runtime = parent["fullStageRuntimeSHA256"]
    runtime_rows = {
        row["path"]: row for row in p04["allowlist"]["runtime"]
    }
    test_rows = {
        row["path"]: row for row in p04["allowlist"]["tests"]
    }
    must(set(runtime_rows) == set(RUNTIME_ALLOW), "P04 runtime allowlist mismatch")
    must(set(test_rows) == set(TEST_ALLOW), "P04 test allowlist mismatch")
    must(all_stage_diffs() == sorted(ALLOW),
         "P04 current staging diff is not exactly the ten allowlisted paths")

    # Canonical must still be the P03 sealed runtime before any P04 copy.
    for rel, expected in parent_runtime.items():
        canonical = ROOT / rel
        staged = STAGE / rel
        must(canonical.is_file() and staged.is_file(), "missing runtime: " + rel)
        must(digest(canonical) == expected, "canonical P03 preimage drift: " + rel)
        if rel in runtime_rows:
            must(runtime_rows[rel]["canonicalPreimageSha256"] == expected,
                 "receipt runtime preimage mismatch: " + rel)
            must(digest(staged) == runtime_rows[rel]["stagePostimageSha256"],
                 "stage runtime postimage mismatch: " + rel)
        else:
            must(digest(staged) == expected,
                 "non-allowlisted staged runtime drift: " + rel)

    for rel, row in test_rows.items():
        canonical = ROOT / rel
        staged = STAGE / rel
        must(staged.is_file() and digest(staged) == row["stagePostimageSha256"],
             "stage test postimage mismatch: " + rel)
        if row["kind"] == "NEW":
            must(row["canonicalPreimageSha256"] is None and not canonical.exists(),
                 "new test target unexpectedly exists: " + rel)
        else:
            must(canonical.is_file()
                 and digest(canonical) == row["canonicalPreimageSha256"],
                 "canonical test preimage drift: " + rel)
    return runtime_rows, test_rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true",
                        help="explicitly perform the ten-path guarded copy")
    args = parser.parse_args()

    parent, parent_post = verify_parent_p03()
    p04 = verify_p04_stage()
    runtime_rows, test_rows = verify_preimages(parent, p04)

    existing = tuple(rel for rel in ALLOW if (ROOT / rel).is_file())
    new = tuple(rel for rel in ALLOW if not (ROOT / rel).exists())
    must(new == ("test/fcv588-photo-modes.test.mjs",),
         "unexpected new-target set: " + repr(new))

    audit = {
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "scope": "P04_BOUNDED_TEN_PATH_GUARDED_APPLY",
        "stageRoot": str(STAGE),
        "canonicalRoot": str(ROOT),
        "parentP03ApplyReceipt": str(P03_APPLY),
        "parentP03ApplySHA256": digest(P03_APPLY),
        "parentP03FinalIntegrityReceipt": str(P03_FINAL),
        "parentP03FinalIntegritySHA256": digest(P03_FINAL),
        "parentP03IndependentPostreceipt": str(P03_INDEPENDENT_POST),
        "parentP03IndependentPostreceiptSHA256": digest(P03_INDEPENDENT_POST),
        "parentP03PostBrowserReceipt": str(P03_POST_BROWSER),
        "parentP03PostBrowserSHA256": digest(P03_POST_BROWSER),
        "stageBaseline39Receipt": str(P04_BASELINE),
        "stageBaseline39SHA256": digest(P04_BASELINE),
        "p04StageReceipt": str(P04_STAGE_RECEIPT),
        "p04StageReceiptSHA256": digest(P04_STAGE_RECEIPT),
        "p04BrowserReceipt": str(P04_BROWSER),
        "p04BrowserReceiptSHA256": digest(P04_BROWSER),
        "runtimeP03Files": 39,
        "runtimeP04Files": 39,
        "runtimeDeltas": list(RUNTIME_ALLOW),
        "testDeltas": list(TEST_ALLOW),
        "allowlistedCopyPaths": list(ALLOW),
        "canonicalPreimages": {
            rel: digest(ROOT / rel) for rel in existing
        },
        "stagePostimages": {
            rel: digest(STAGE / rel) for rel in ALLOW
        },
        "plannedBackup": str(BACKUP),
        "plannedJournal": str(JOURNAL),
        "plannedReceipt": str(RECEIPT),
        "softwareQa": {
            "node": "541/541 PASS",
            "python": "13/13 PASS",
            "browser": "7/7 selected source-bound PASS",
            "bottomLockFlatMorphologyCoverage": [
                case["bottomLockFlatProof"]["coverage"]
                for case in load_json(P04_BROWSER)["cases"]
                if case.get("name") == "BL-LF-Blue"
            ][0],
        },
        "rightsClearance": False,
        "hardwareValidated": False,
        "releaseApproval": "HOLD",
        "postApplyRequirements": [
            "fresh full Node suite on canonical",
            "fresh Python 13-test verifier on canonical",
            "fresh strict-server Chrome selected P04 matrix on canonical",
            "independent final postreceipt",
        ],
        "status": "DRY_RUN_PASS" if not args.apply
        else "GUARDED_COPY_PENDING_POST_QA",
    }

    if not args.apply:
        must(not BACKUP.exists() and not JOURNAL.exists() and not RECEIPT.exists(),
             "P04 apply artifacts already exist before dry-run")
        print("DRY_RUN_PASS P03_parent_39/39; P04_stage_39; "
              "runtime_delta_5; test_delta_5; Node_541; Python_13; Chrome_7")
        print("APPLY_DISABLED_THIS_INVOCATION; no canonical bytes written")
        print("PLANNED_PATHS=" + repr(list(ALLOW)))
        print("P04_STAGE_RECEIPT_SHA256=" + digest(P04_STAGE_RECEIPT))
        print("P04_BROWSER_SHA256=" + digest(P04_BROWSER))
        return

    # Explicit --apply path. The operator/prime owns the decision to execute it.
    must(not BACKUP.exists() and not JOURNAL.exists() and not RECEIPT.exists(),
         "write-once P04 apply artifact already exists")
    with zipfile.ZipFile(BACKUP, "x", compression=zipfile.ZIP_DEFLATED) as backup:
        for rel in existing:
            backup.write(ROOT / rel, arcname=rel)
    with zipfile.ZipFile(BACKUP, "r") as backup:
        must(sorted(backup.namelist()) == sorted(existing),
             "P04 backup entries mismatch")
        for rel in existing:
            must(hashlib.sha256(backup.read(rel)).hexdigest()
                 == audit["canonicalPreimages"][rel],
                 "P04 backup hash mismatch: " + rel)
    audit["backupSHA256"] = digest(BACKUP)

    copied: list[str] = []
    try:
        for rel in ALLOW:
            target = ROOT / rel
            staged = STAGE / rel
            row = runtime_rows.get(rel) or test_rows[rel]
            if row["kind"] == "NEW":
                must(not target.exists(), "new target appeared before copy: " + rel)
            else:
                must(digest(target) == row["canonicalPreimageSha256"],
                     "canonical preimage changed before copy: " + rel)
            fd, tmp = tempfile.mkstemp(
                prefix=".fcv588_p04_", suffix=".owned", dir=str(target.parent))
            try:
                with os.fdopen(fd, "wb") as out:
                    out.write(staged.read_bytes())
                    out.flush()
                    os.fsync(out.fileno())
                must(digest(Path(tmp)) == row["stagePostimageSha256"],
                     "temporary staged SHA mismatch: " + rel)
                os.replace(tmp, target)
            finally:
                if os.path.exists(tmp):
                    os.unlink(tmp)
            must(digest(target) == row["stagePostimageSha256"],
                 "post-copy SHA mismatch: " + rel)
            copied.append(rel)
    finally:
        write_json_exclusive(JOURNAL, {
            "performed": copied,
            "complete": copied == list(ALLOW),
            "timestampUtc": datetime.now(timezone.utc).isoformat(),
        })

    must(copied == list(ALLOW), "partial P04 apply")
    # Runtime inventory remains exactly 39; five existing runtime files changed.
    for rel in parent["fullStageRuntimeSHA256"]:
        must(digest(ROOT / rel) == digest(STAGE / rel),
             "canonical runtime differs from P04 stage after copy: " + rel)
    audit.update({
        "status": "P04_CANONICAL_SCOPED_COPY_COMPLETE_POST_QA_PENDING",
        "performed": copied,
        "postAppliedRuntime": "39/39_MATCH_STAGE",
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
    })
    write_json_exclusive(RECEIPT, audit)
    print("APPLIED=" + repr(copied))
    print("BACKUP_SHA256=" + digest(BACKUP))
    print("APPLY_RECEIPT_SHA256=" + digest(RECEIPT))
    print("CANONICAL_RUNTIME_39/39_MATCH_STAGE; FRESH POST-QA REQUIRED")


if __name__ == "__main__":
    main()
