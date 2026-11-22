from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime
from pathlib import Path


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT / "staging/fcv588-photo-modes-20261114"
QA = ROOT / (
    "plans/261113-0911-fcv588-photo-reference-visual-conformance/"
    "research/qa-20261114/p04-stage"
)
SEAL = ROOT / (
    "plans/261113-0911-fcv588-photo-reference-visual-conformance/"
    "research/qa-20261114/P03_CANONICAL_GUARDED_APPLY_20261114.json"
)
BASELINE = QA / "P04_STAGE_BASELINE_RUNTIME39_20261114.json"
BROWSER = QA / (
    "browser-attempt2/"
    "fcv588-p04-stage-browser-blflat-20261114T105809+0700-ac0a78e3.json"
)
BROWSER_EVENTS = QA / (
    "browser-attempt2/"
    "fcv588-p04-stage-browser-blflat-20261114T105809+0700-ac0a78e3-events.json"
)
BROWSER_MANIFEST = QA / (
    "browser-attempt2/"
    "fcv588-p04-stage-browser-blflat-20261114T105809+0700-ac0a78e3-sha256.txt"
)
RECEIPT = QA / "P04_STAGE_IMPLEMENTATION_RECEIPT_20261114.json"
MANIFEST = QA / "P04_STAGE_QA_SHA256_20261114.txt"

RUNTIME_ALLOWLIST = (
    "src/devices/fcv588/display-layout.mjs",
    "src/devices/fcv588/echo-projection.mjs",
    "web/app.mjs",
    "web/lcd-presentation.mjs",
    "web/styles.css",
)
TEST_ALLOWLIST = (
    "test/fcv588-photo-display.test.mjs",
    "test/fcv588-photo-modes.test.mjs",
    "test/fcv588-public-display-widgets.test.mjs",
    "test/fcv588-public-display.test.mjs",
    "test/web-layout.test.mjs",
)
ALLOWLIST = frozenset(RUNTIME_ALLOWLIST + TEST_ALLOWLIST)
PROTECTED = (
    "src/core/session.mjs",
    "src/core/scenario.mjs",
    "src/core/protocol.mjs",
    "src/devices/fcv588/model.mjs",
    "src/devices/fcv588/navigation.mjs",
    "src/devices/fcv588/settings.mjs",
    "src/devices/fcv588/claim-gate.mjs",
    "web/fcv588-echo-rasterizer.mjs",
)
EVIDENCE = (
    "P04_STAGE_BASELINE_RUNTIME39_20261114.json",
    "p04-red-attempt1.txt",
    "p04-full-node-attempt1.txt",
    "p04-review-red-attempt2.txt",
    "p04-review-green-attempt2.txt",
    "p04-full-node-attempt3.txt",
    "p04-python-independent-v1.txt",
)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_once(path: Path, data: bytes) -> None:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL)
    try:
        os.write(fd, data)
    finally:
        os.close(fd)


def relative_files(base: Path) -> set[str]:
    result: set[str] = set()
    for folder in ("src", "web", "test"):
        for path in (base / folder).rglob("*"):
            if path.is_file():
                result.add(path.relative_to(base).as_posix())
    return result


def diff_rows() -> list[dict]:
    rows = []
    rels = sorted(relative_files(STAGE) | relative_files(ROOT))
    for rel in rels:
        if rel.startswith("staging/"):
            continue
        canonical = ROOT / rel
        staged = STAGE / rel
        if not staged.exists():
            continue
        canonical_sha = sha(canonical) if canonical.exists() else None
        stage_sha = sha(staged)
        if canonical_sha != stage_sha:
            rows.append({
                "path": rel,
                "kind": "MODIFIED" if canonical_sha else "NEW",
                "canonicalPreimageSha256": canonical_sha,
                "stagePostimageSha256": stage_sha,
            })
    return rows


def log_result(path: Path, required: tuple[str, ...]) -> dict:
    text = path.read_text(encoding="utf-8", errors="replace")
    ok = all(token in text for token in required)
    return {
        "path": str(path),
        "sha256": sha(path),
        "requiredMarkers": list(required),
        "status": "PASS" if ok else "FAILED",
    }


def main() -> None:
    diffs = diff_rows()
    diff_paths = {row["path"] for row in diffs}
    failures = []
    if diff_paths != ALLOWLIST:
        failures.append({
            "kind": "ALLOWLIST_MISMATCH",
            "expected": sorted(ALLOWLIST),
            "actual": sorted(diff_paths),
        })

    protected = []
    for rel in PROTECTED:
        canonical = ROOT / rel
        staged = STAGE / rel
        row = {
            "path": rel,
            "canonicalSha256": sha(canonical),
            "stageSha256": sha(staged),
        }
        row["match"] = row["canonicalSha256"] == row["stageSha256"]
        if not row["match"]:
            failures.append({"kind": "PROTECTED_DRIFT", "path": rel})
        protected.append(row)

    seal_sha = sha(SEAL)
    baseline = json.loads(BASELINE.read_text(encoding="utf-8-sig"))
    if baseline.get("status") != "MATCH" or baseline.get("matches") != 39:
        failures.append({"kind": "BAD_BASELINE", "baseline": baseline})

    node_final = log_result(
        QA / "p04-full-node-attempt5-final.txt",
        ("# tests 541", "# pass 541", "# fail 0"),
    )
    python_final = log_result(
        QA / "p04-python-final-v4.txt",
        ("Ran 13 tests", "OK"),
    )
    red_initial = log_result(
        QA / "p04-red-attempt1.txt",
        ("ERR_TEST_FAILURE", "planFcvDepthReadout"),
    )
    red_review = log_result(
        QA / "p04-review-red-attempt2.txt",
        ("# fail 2", "Bottom Lock window must terminate"),
    )
    green_review = log_result(
        QA / "p04-review-green-attempt2.txt",
        ("# tests 21", "# pass 21", "# fail 0"),
    )
    bl_flat_red = log_result(
        QA / "p04-bl-flat-red-attempt3.txt",
        ("# fail 1", "each historical bottom core must land in the same lower band"),
    )
    bl_flat_green = log_result(
        QA / "p04-bl-flat-green-attempt3.txt",
        ("# tests 22", "# pass 22", "# fail 0"),
    )
    zoom_compat = log_result(
        QA / "p04-zoom-compat-green-attempt4.txt",
        ("# tests 6", "# pass 6", "# fail 0"),
    )
    for evidence in (
        node_final, python_final, red_initial, red_review, green_review,
        bl_flat_red, bl_flat_green, zoom_compat,
    ):
        if evidence["status"] != "PASS":
            failures.append({"kind": "EVIDENCE_MARKER_FAILED",
                             "path": evidence["path"]})

    browser = json.loads(BROWSER.read_text(encoding="utf-8"))
    if browser.get("overallStatus") != "PASS" or browser.get("objectiveFailures"):
        failures.append({"kind": "BROWSER_FAILED",
                         "status": browser.get("overallStatus"),
                         "failures": browser.get("objectiveFailures")})
    if len(browser.get("cases", [])) != 7:
        failures.append({"kind": "BROWSER_CASE_COUNT",
                         "count": len(browser.get("cases", []))})
    bl_cases = [
        case for case in browser.get("cases", [])
        if case.get("name") == "BL-LF-Blue"
    ]
    if len(bl_cases) != 1:
        failures.append({"kind": "BL_BROWSER_CASE_COUNT",
                         "count": len(bl_cases)})
    else:
        flat = bl_cases[0].get("bottomLockFlatProof") or {}
        if flat.get("coverage", 0) < 0.5 or flat.get("inLowerBand") is not True:
            failures.append({"kind": "BL_FLAT_MORPHOLOGY_FAILED",
                             "proof": flat})

    runtime_rows = [row for row in diffs if row["path"] in RUNTIME_ALLOWLIST]
    test_rows = [row for row in diffs if row["path"] in TEST_ALLOWLIST]
    receipt = {
        "schema": "fcv588-p04-isolated-stage-implementation-v1",
        "createdAt": datetime.now().astimezone().isoformat(),
        "scope": "P04_ISOLATED_STAGING_ONLY_NO_CANONICAL_APPLY",
        "canonicalRoot": str(ROOT),
        "stageRoot": str(STAGE),
        "canonicalP03Seal": {
            "path": str(SEAL),
            "sha256": seal_sha,
            "runtimeBaseline": "39/39 MATCH",
        },
        "stageBaselineReceipt": {
            "path": str(BASELINE),
            "sha256": sha(BASELINE),
            "runtimeFiles": baseline.get("runtimeFiles"),
            "matches": baseline.get("matches"),
            "status": baseline.get("status"),
        },
        "allowlist": {
            "status": "EXACT_10_PATHS" if diff_paths == ALLOWLIST else "MISMATCH",
            "runtimeCount": len(runtime_rows),
            "testCount": len(test_rows),
            "runtime": runtime_rows,
            "tests": test_rows,
        },
        "protectedCanonicalEquivalence": protected,
        "implementation": {
            "bottomLock": {
                "status": "IMPLEMENTED",
                "scope": [
                    "relative display axis 5→0 (or selected B/L range→0)",
                    "Bottom Lock projection window terminates at typed bottomDepthM",
                    "coherent per-column synthetic bottom cores are remapped to the lower band",
                    "candidate anchors are bounded around typed bottomDepthM and require majority coherence",
                    "unreliable/missing anchors fail closed to the absolute display slice",
                    "normal/BZ/MZ axis semantics remain absolute",
                    "invented bottom ZOOM legend removed",
                ],
                "compatibility": (
                    "projectFcvZoom remains a deterministic display projection; "
                    "raw observation deep-equality is asserted; Bottom Zoom and "
                    "Marker Zoom retain their centered absolute-window contract; "
                    "no reducer, world, settings schema, model, or replay event "
                    "contract changed."
                ),
            },
            "dual": {
                "status": "IMPLEMENTED",
                "scope": (
                    "large global depth readout is centered on the existing "
                    "windowRatio divider through presentation geometry/CSS"
                ),
            },
            "nav": {
                "status": "IMPLEMENTED",
                "scope": [
                    "presentation row geometry/separators/value hierarchy",
                    "POSITION visual line split only; typed value remains unchanged",
                    "NAV1/NAV2 global depth fallback hidden; DEPTH appears only when selected",
                    "NAV defaults/projector values remain unchanged",
                ],
            },
        },
        "validation": {
            "redInitial": red_initial,
            "redIndependentReview": red_review,
            "greenAfterReview": green_review,
            "bottomLockFlatRed": bl_flat_red,
            "bottomLockFlatGreen": bl_flat_green,
            "bottomZoomMarkerZoomCompatibility": zoom_compat,
            "nodeFull": node_final,
            "pythonIndependent": python_final,
            "browser": {
                "path": str(BROWSER),
                "sha256": sha(BROWSER),
                "eventsPath": str(BROWSER_EVENTS),
                "eventsSha256": sha(BROWSER_EVENTS),
                "browserManifestPath": str(BROWSER_MANIFEST),
                "browserManifestSha256": sha(BROWSER_MANIFEST),
                "status": browser.get("overallStatus"),
                "cases": len(browser.get("cases", [])),
                "sourceManifestSha256": browser.get("sourceManifestAfter", {}).get("sha256"),
                "photoDeny": browser.get("photoDeny", {}).get("status"),
                "serverCleanup": browser.get("serverCleanup"),
                "bottomLockFlatProof": (
                    bl_cases[0].get("bottomLockFlatProof") if bl_cases else None
                ),
            },
        },
        "coverageBoundary": {
            "node": "541/541 full suite",
            "python": "13/13 independent verifier",
            "browser": (
                "7 selected source-bound cases: 1366 LF/DUAL/BL/NAV1/NAV2, "
                "375 DUAL, 1920 NAV2"
            ),
            "notYetBrowserExhaustive": (
                "full Phase04 browser matrix for all 7 modes plus BL/BZ/MZ "
                "configurations has not been executed in this staging pass"
            ),
        },
        "independentReview": {
            "status": "PENDING_REREVIEW_AFTER_BL_FLAT_FIX",
            "priorVerdict": "NO_GO_BL_NOT_FLAT",
            "canonicalReadiness": "NOT_YET_VERIFIED",
        },
        "objectiveFailures": failures,
        "softwareQaStatus": "PASS" if not failures else "FAILED",
        "status": (
            "P04_STAGE_SOFTWARE_QA_PASS_REVIEW_PENDING"
            if not failures else "P04_STAGE_SOFTWARE_QA_FAILED"
        ),
        "canonicalReadiness": "NOT_YET_VERIFIED",
        "canonicalGo": False,
        "canonicalApplied": False,
    }
    data = (json.dumps(receipt, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    write_once(RECEIPT, data)

    manifest_targets = [
        RECEIPT,
        BASELINE,
        QA / "p04-red-attempt1.txt",
        QA / "p04-full-node-attempt1.txt",
        QA / "p04-review-red-attempt2.txt",
        QA / "p04-review-green-attempt2.txt",
        QA / "p04-bl-flat-red-attempt3.txt",
        QA / "p04-bl-flat-green-attempt3.txt",
        QA / "p04-zoom-compat-green-attempt4.txt",
        QA / "p04-full-node-attempt5-final.txt",
        QA / "p04-python-current-blflat-v2.txt",
        QA / "p04-python-final-v4.txt",
        BROWSER,
        BROWSER_EVENTS,
        BROWSER_MANIFEST,
        QA / "p04_browser_qa_worker10.py",
        QA / "finalize_p04_stage_worker10.py",
    ]
    for row in runtime_rows + test_rows:
        manifest_targets.append(STAGE / row["path"])
    lines = [f"{sha(path)} *{path}" for path in manifest_targets]
    write_once(MANIFEST, ("\n".join(lines) + "\n").encode("utf-8"))

    print(json.dumps({
        "status": receipt["status"],
        "softwareQaStatus": receipt["softwareQaStatus"],
        "canonicalReadiness": receipt["canonicalReadiness"],
        "objectiveFailures": failures,
        "receipt": str(RECEIPT),
        "receiptSha256": sha(RECEIPT),
        "manifest": str(MANIFEST),
        "manifestSha256": sha(MANIFEST),
        "runtimeDeltas": len(runtime_rows),
        "testDeltas": len(test_rows),
        "node": node_final["status"],
        "python": python_final["status"],
        "browser": browser.get("overallStatus"),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
    bl_cases = [
        case for case in browser.get("cases", [])
        if case.get("name") == "BL-LF-Blue"
    ]
    if len(bl_cases) != 1:
        failures.append({"kind": "BL_BROWSER_CASE_COUNT", "count": len(bl_cases)})
    else:
        flat = bl_cases[0].get("bottomLockFlatProof") or {}
        if flat.get("coverage", 0) < 0.5 or flat.get("inLowerBand") is not True:
            failures.append({"kind": "BL_FLAT_MORPHOLOGY_FAILED", "proof": flat})

