from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import datetime
from pathlib import Path


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT / "staging/fcv588-p04-bottom-provenance-20261116"
QA = ROOT / "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/p04-provenance"
V1_RECEIPT = QA / "P04_PROVENANCE_STAGE_RECEIPT_20261116.json"
V1_MANIFEST = QA / "P04_PROVENANCE_STAGE_QA_SHA256_20261116.txt"
V2_RECEIPT = QA / "P04_PROVENANCE_V2_STAGE_RECEIPT_20261116.json"
V2_MANIFEST = QA / "P04_PROVENANCE_V2_QA_SHA256_20261116.txt"
FINAL = ROOT / "docs/qa/FCV588_VISUAL_P05_P06_20261116/FCV588_VISUAL_P05_P06_FINAL_INTEGRITY_20261116.json"
POST = ROOT / "docs/qa/FCV588_VISUAL_P05_P06_20261116/FCV588_VISUAL_P05_P06_INDEPENDENT_POSTRECEIPT_20261116.json"
COMPAT = QA / "P04_PROVENANCE_COMPAT_PROBE_RESULT_V3_20261116.json"

EXPECTED = {
    "v1Receipt": "2e30a4ee7cf8a1baafa0ac9dc819c465edbe54b15f1bfc017642a38b56ea7132",
    "v1Manifest": "580fa764823b24ce3afc9cce2432631d5027c5d3d13a99c337d8b6c73f88a8f8",
    "v2Receipt": "55cc91d9d872def97bbb353f266b68365410aa71d193c116fe21dc47351bb206",
    "v2Manifest": "e52f7c4990419fbc7f2012944f0a04b66feaadd6f07f5d9ebed65e2b1b957e57",
    "final": "ecdfb0bc680f35a6935bb11a4bbadd1f95e3441069b7074a0b68ab22506b4ee4",
    "post": "9befe64829bf9c79fb7e0505fe1db83a5edf676ce1f4c22a7073ca3cd7a6160e",
}
EXPECTED_CANONICAL_DIFF = {
    "src/core/scenario.mjs": "MODIFIED",
    "src/devices/fcv588/echo-projection.mjs": "MODIFIED",
    "test/fcv588-p04-bottom-provenance-v2.test.mjs": "NEW",
    "test/fcv588-p04-bottom-provenance-v3.test.mjs": "NEW",
    "test/fcv588-p04-bottom-provenance.test.mjs": "NEW",
    "test/fcv588-photo-modes.test.mjs": "MODIFIED",
    "web/app.mjs": "MODIFIED",
    "web/fcv588-echo-rasterizer.mjs": "MODIFIED",
}
EXPECTED_V3_DELTA_FROM_V2 = {
    "test/fcv588-p04-bottom-provenance-v3.test.mjs",
    "web/app.mjs",
}
PROTECTED = [
    "src/core/session.mjs", "src/core/protocol.mjs",
    "src/devices/fcv588/profile-version.mjs", "src/devices/fcv588/model.mjs",
    "src/devices/fcv588/settings.mjs", "src/devices/fcv588/adapter.mjs",
]
GUARD_SHA = {
    "apply-guard-v1/P04_PROVENANCE_GUARDED_APPLY_DRYRUN_20261116T0823.json":
        "927016fe911628df1582f6f47f43bb315d8281ce4529deedb798b6ed51707cc6",
    "apply-guard-v1/p04_provenance_guarded_apply.py":
        "ee3623fd6e4222865360db61713c753364a4518865fb594dfc9e952e042ba05e",
    "apply-guard-v2/p04_provenance_guarded_apply_v2.py":
        "55157e9f136880a4a651ba6c8d0751d88d7dcf8f2a034728a5a4db5f97260765",
}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_once(path: Path, data: bytes) -> None:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL)
    try:
        os.write(fd, data)
    finally:
        os.close(fd)


def files(root: Path) -> dict[str, Path]:
    out: dict[str, Path] = {}
    for folder in ("src", "web", "test", "tools"):
        base = root / folder
        for path in base.rglob("*"):
            if path.is_file():
                out[path.relative_to(root).as_posix()] = path
    return out


def diff_scan() -> list[dict]:
    canonical, stage = files(ROOT), files(STAGE)
    rows = []
    for rel in sorted(set(canonical) | set(stage)):
        cp, sp = canonical.get(rel), stage.get(rel)
        csha, ssha = (sha(cp) if cp else None), (sha(sp) if sp else None)
        if csha != ssha:
            rows.append({"path": rel,
                         "kind": "NEW" if cp is None else "REMOVED" if sp is None else "MODIFIED",
                         "canonicalSha256": csha, "stageSha256": ssha})
    return rows


def validation_rows(receipt: dict, generation: str) -> list[dict]:
    rows = []
    for name, entry in receipt.get("validation", {}).items():
        if not isinstance(entry, dict) or not entry.get("path") or not entry.get("sha256"):
            continue
        path = Path(entry["path"])
        actual = sha(path)
        rows.append({"generation": generation, "name": name, "path": str(path),
                     "expected": entry["sha256"], "actual": actual,
                     "match": actual == entry["sha256"]})
    return rows


def log_check(name: str, markers: list[str]) -> dict:
    path = QA / name
    text = path.read_text(encoding="utf-8", errors="replace")
    missing = [m for m in markers if m not in text]
    return {"path": str(path), "sha256": sha(path), "markers": markers,
            "missing": missing, "status": "PASS" if not missing else "FAILED"}


def main() -> int:
    v1 = json.loads(V1_RECEIPT.read_text(encoding="utf-8"))
    v2 = json.loads(V2_RECEIPT.read_text(encoding="utf-8"))
    final_doc = json.loads(FINAL.read_text(encoding="utf-8"))
    compat = json.loads(COMPAT.read_text(encoding="utf-8"))

    prior_evidence = validation_rows(v1, "v1") + validation_rows(v2, "v2")
    prior_files = {
        "v1Receipt": sha(V1_RECEIPT), "v1Manifest": sha(V1_MANIFEST),
        "v2Receipt": sha(V2_RECEIPT), "v2Manifest": sha(V2_MANIFEST),
    }
    prior_ok = all(prior_files[k] == EXPECTED[k] for k in prior_files) and \
        all(row["match"] for row in prior_evidence)

    runtime = []
    for rel, expected in final_doc["runtimeSHA256"].items():
        actual = sha(ROOT / rel)
        runtime.append({"path": rel, "expected": expected, "actual": actual,
                        "match": actual == expected})

    diffs = diff_scan()
    diff_map = {row["path"]: row["kind"] for row in diffs}
    canonical_diff_ok = diff_map == EXPECTED_CANONICAL_DIFF

    current = {rel: sha(path) for rel, path in files(STAGE).items()}
    v2_source = v2["sourceSha256"]
    v3_delta = set()
    for rel, expected_sha in v2_source.items():
        if current.get(rel) != expected_sha:
            v3_delta.add(rel)
    if "test/fcv588-p04-bottom-provenance-v3.test.mjs" in current:
        v3_delta.add("test/fcv588-p04-bottom-provenance-v3.test.mjs")
    v3_delta_ok = v3_delta == EXPECTED_V3_DELTA_FROM_V2

    protected = []
    for rel in PROTECTED:
        csha, ssha = sha(ROOT / rel), sha(STAGE / rel)
        protected.append({"path": rel, "canonicalSha256": csha,
                          "stageSha256": ssha, "match": csha == ssha})

    red = log_check("p04-provenance-v3-red.txt", [
        "# tests 1", "# fail 1",
        "drawOverlays must use each history-qualified frame.bottomDepthM",
        "drawOverlays(zoom,layout.panes.zoom.x",
    ])
    targeted = log_check("p04-provenance-v3-targeted-final.txt", [
        "# tests 52", "# pass 52", "# fail 0",
        "P04 provenance v3 Stop bottom-zone overlay follows frozen frame bottom metadata",
        "P04 provenance v2 rejects cross-scenario metadata and inconsistent world bottom",
        "P04 provenance v2 tick231 maps authored raw bottom through makeEchoFrame sampling",
    ])
    node = log_check("p04-provenance-v3-full-node.txt", [
        "# tests 563", "# pass 563", "# fail 0",
    ])
    python = log_check("p04-provenance-v3-python.txt", ["Ran 13 tests", "OK"])

    app_text = (STAGE / "web/app.mjs").read_text(encoding="utf-8")
    render = app_text[app_text.index("function renderScreen()"):app_text.index("function renderMainMenuChrome(")]
    stale_overlay_calls = re.findall(r"drawOverlays\([^;]*o\.bottomDepthM\s*\)", render, re.S)
    overlay_source_ok = not stale_overlay_calls and all(token in render for token in (
        "height,normal.bottomDepthM)", "height,lf.bottomDepthM)", "height,hf.bottomDepthM)",
        "zoom.bottomDepthM)",
    ))

    compat_ok = (
        compat.get("status") == "PASS"
        and compat.get("profileRevision") == "F1-public-reference-21"
        and compat.get("observation", {}).get("existingFieldsIdentical") is True
        and compat.get("observation", {}).get("rawChannelsIdentical") is True
    )
    guard_rows = []
    for rel, expected in GUARD_SHA.items():
        path = QA / rel
        actual = sha(path)
        guard_rows.append({"path": str(path), "expected": expected,
                           "actual": actual, "match": actual == expected})

    stage_runtime_jpegs = [str(path.relative_to(STAGE))
                           for folder in ("src", "web")
                           for path in (STAGE / folder).rglob("*")
                           if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg"}]
    seals_ok = sha(FINAL) == EXPECTED["final"] and sha(POST) == EXPECTED["post"]
    validation_ok = all(item["status"] == "PASS" for item in (red, targeted, node, python))
    status_ok = all([
        prior_ok, all(x["match"] for x in runtime), canonical_diff_ok, v3_delta_ok,
        all(x["match"] for x in protected), overlay_source_ok, compat_ok,
        all(x["match"] for x in guard_rows), seals_ok, validation_ok,
        not stage_runtime_jpegs,
    ])

    receipt = {
        "schema": "fcv588-p04-bottom-provenance-v3-isolated-stage-v1",
        "createdAt": datetime.now().astimezone().isoformat(),
        "scope": "P04_BL_STOP_FROZEN_OVERLAY_METADATA_STAGE_ONLY",
        "stageRoot": str(STAGE), "qaRoot": str(QA),
        "priorEvidenceImmutable": {
            "status": "PASS" if prior_ok else "FAILED",
            "files": prior_files, "expected": {k: EXPECTED[k] for k in prior_files},
            "validationRows": prior_evidence,
        },
        "reviewer13V2Blocker": {
            "issue": "Stop froze pixels/frame metadata but renderer passed current observation bottom depth to frame overlays",
            "sourceValidFixture": {
                "scenario": "TRAINING_SCENARIO", "frozenTick": 231, "currentTick": 241,
                "frozenBottomDepthM": 43.425751760434835,
                "currentBottomDepthM": 46.508297394017724,
                "bottomZone": "Standard",
                "zoneUsingFrozenDepth": {"widthM": 10, "topFraction": 0, "bottomFraction": 1,
                                         "sourceClass": "SYNTHETIC_DISPLAY_ONLY"},
                "zoneUsingCurrentDepth": None,
            },
        },
        "implementation": {
            "runtimeChangeV3": "web/app.mjs only",
            "fix": "each drawOverlays call now receives the history-qualified frame.bottomDepthM for that exact frame",
            "currentWorldDataUnaffected": "NAV/typed world values still use current observation/session where designed",
            "v2HighFixes": "unchanged scenario identity/raw-display provenance code and retained tests",
        },
        "canonicalSeals": {
            "final": {"sha256": sha(FINAL), "expected": EXPECTED["final"]},
            "post": {"sha256": sha(POST), "expected": EXPECTED["post"]},
            "runtime39": {"matches": sum(x["match"] for x in runtime),
                          "total": len(runtime), "rows": runtime},
        },
        "canonicalDiffAllowlist": {"status": "EXACT_8_PATHS" if canonical_diff_ok else "FAILED",
                                   "expected": EXPECTED_CANONICAL_DIFF, "actual": diffs},
        "deltaFromFrozenV2": {"status": "EXACT_2_PATHS" if v3_delta_ok else "FAILED",
                              "expected": sorted(EXPECTED_V3_DELTA_FROM_V2),
                              "actual": sorted(v3_delta)},
        "protectedCanonicalEquivalence": protected,
        "rendererOverlaySource": {"status": "PASS" if overlay_source_ok else "FAILED",
                                  "staleCurrentObservationCalls": stale_overlay_calls},
        "validation": {
            "red": red, "targetedFinal": targeted, "fullNode": node, "python": python,
            "compat": {"path": str(COMPAT), "sha256": sha(COMPAT),
                       "status": "PASS" if compat_ok else "FAILED", "receipt": compat},
            "nodeVersion": "v22.22.0", "pythonVersion": "3.11.5",
        },
        "sourceSha256": {rel: current[rel] for rel in sorted(EXPECTED_CANONICAL_DIFF)},
        "guardEvidenceUnchanged": guard_rows,
        "referenceOnlyPhotos": {"runtimeCopiesInStageSrcWeb": stage_runtime_jpegs,
                                "status": "UNCHANGED_REFERENCE_ONLY"},
        "operations": {"canonicalApplied": False, "commitCreated": False,
                       "browserRun": False, "port4173Operation": "NONE",
                       "guardScriptsEdited": False, "networkHardwareIo": "NONE"},
        "holds": {"phase6F1": "OPEN", "featureClaims": "65/65 HOLD",
                  "hardware": "HOLD", "firmware": "HOLD", "rights": "HOLD",
                  "release": "HOLD", "oemPercentClaim": None},
        "review": {"independentReviewer13V3ReReview": "PENDING_AFTER_V3_FREEZE"},
        "status": "P04_PROVENANCE_V3_STAGE_QA_PASS_INDEPENDENT_REVIEW_PENDING" if status_ok else "FAILED",
        "canonicalReadiness": "NOT_REQUESTED_NO_APPLY",
        "objectiveFailures": [] if status_ok else [
            *( [] if prior_ok else ["v1/v2 evidence drift"] ),
            *( [] if all(x["match"] for x in runtime) else ["canonical runtime39 drift"] ),
            *( [] if canonical_diff_ok else ["canonical diff mismatch"] ),
            *( [] if v3_delta_ok else ["v3 delta from v2 mismatch"] ),
            *( [] if all(x["match"] for x in protected) else ["protected source drift"] ),
            *( [] if overlay_source_ok else ["renderer still uses current observation bottom for overlays"] ),
            *( [] if compat_ok else ["compat probe failed"] ),
            *( [] if all(x["match"] for x in guard_rows) else ["guard evidence drift"] ),
            *( [] if seals_ok else ["canonical seal drift"] ),
            *( [] if validation_ok else ["v3 validation failed"] ),
            *( [] if not stage_runtime_jpegs else ["reference JPEG copied into runtime"] ),
        ],
    }

    receipt_path = QA / "P04_PROVENANCE_V3_STAGE_RECEIPT_20261116.json"
    write_once(receipt_path, (json.dumps(receipt, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    manifest_path = QA / "P04_PROVENANCE_V3_QA_SHA256_20261116.txt"
    selected = [
        QA / "finalize_p04_provenance_worker12_v3.py",
        QA / "p04-provenance-v3-red.txt",
        QA / "p04-provenance-v3-targeted-final.txt",
        QA / "p04-provenance-v3-full-node.txt",
        QA / "p04-provenance-v3-python.txt",
        COMPAT, receipt_path,
    ]
    write_once(manifest_path, ("\n".join(
        f"{sha(path)} *{path.relative_to(QA).as_posix()}" for path in selected) + "\n").encode("utf-8"))
    print(json.dumps({
        "status": receipt["status"], "receipt": str(receipt_path),
        "receiptSha256": sha(receipt_path), "manifest": str(manifest_path),
        "manifestSha256": sha(manifest_path),
        "canonicalRuntime": f"{sum(x['match'] for x in runtime)}/{len(runtime)}",
        "v3DeltaFromV2": sorted(v3_delta), "compatSha256": sha(COMPAT),
        "appSha256": current["web/app.mjs"],
        "v3TestSha256": current["test/fcv588-p04-bottom-provenance-v3.test.mjs"],
    }, ensure_ascii=True, indent=2))
    return 0 if status_ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
