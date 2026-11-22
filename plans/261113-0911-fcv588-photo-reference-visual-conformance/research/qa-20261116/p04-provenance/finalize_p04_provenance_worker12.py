from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime
from pathlib import Path


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT / "staging/fcv588-p04-bottom-provenance-20261116"
QA = ROOT / "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/p04-provenance"
FINAL = ROOT / "docs/qa/FCV588_VISUAL_P05_P06_20261116/FCV588_VISUAL_P05_P06_FINAL_INTEGRITY_20261116.json"
POST = ROOT / "docs/qa/FCV588_VISUAL_P05_P06_20261116/FCV588_VISUAL_P05_P06_INDEPENDENT_POSTRECEIPT_20261116.json"
OLD_RED = ROOT / "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/p04-extended/P04_NEAR_BOTTOM_FISH_ONLY_RED_RECEIPT_20261116.json"

EXPECTED_FINAL_SHA = "ecdfb0bc680f35a6935bb11a4bbadd1f95e3441069b7074a0b68ab22506b4ee4"
EXPECTED_POST_SHA = "9befe64829bf9c79fb7e0505fe1db83a5edf676ce1f4c22a7073ca3cd7a6160e"
EXPECTED_DIFF = {
    "src/core/scenario.mjs": "MODIFIED",
    "src/devices/fcv588/echo-projection.mjs": "MODIFIED",
    "web/app.mjs": "MODIFIED",
    "web/fcv588-echo-rasterizer.mjs": "MODIFIED",
    "test/fcv588-p04-bottom-provenance.test.mjs": "NEW",
    "test/fcv588-photo-modes.test.mjs": "MODIFIED",
}
PROTECTED = [
    "src/core/session.mjs",
    "src/core/protocol.mjs",
    "src/devices/fcv588/profile-version.mjs",
    "src/devices/fcv588/model.mjs",
    "src/devices/fcv588/settings.mjs",
    "src/devices/fcv588/adapter.mjs",
]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_once(path: Path, data: bytes) -> None:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL)
    try:
        os.write(fd, data)
    finally:
        os.close(fd)


def file_map(root: Path) -> dict[str, Path]:
    found: dict[str, Path] = {}
    for folder in ("src", "web", "test", "tools"):
        base = root / folder
        for path in base.rglob("*"):
            if path.is_file():
                found[path.relative_to(root).as_posix()] = path
    for name in (".gitignore", "package.json", "README.md", "VietMoPhongChoTatCaCacMay.md"):
        path = root / name
        if path.is_file():
            found[name] = path
    return found


def diff_scan() -> list[dict]:
    canonical = file_map(ROOT)
    stage = file_map(STAGE)
    rows = []
    for rel in sorted(set(canonical) | set(stage)):
        cp, sp = canonical.get(rel), stage.get(rel)
        csha = sha(cp) if cp else None
        ssha = sha(sp) if sp else None
        if csha != ssha:
            rows.append({
                "path": rel,
                "kind": "NEW" if cp is None else "REMOVED" if sp is None else "MODIFIED",
                "canonicalSha256": csha,
                "stageSha256": ssha,
            })
    return rows


def log_check(name: str, markers: list[str]) -> dict:
    path = QA / name
    text = path.read_text(encoding="utf-8", errors="replace")
    missing = [marker for marker in markers if marker not in text]
    return {"path": str(path), "sha256": sha(path), "markers": markers,
            "missing": missing, "status": "PASS" if not missing else "FAILED"}


def main() -> int:
    final_doc = json.loads(FINAL.read_text(encoding="utf-8"))
    runtime_rows = []
    for rel, expected in final_doc["runtimeSHA256"].items():
        path = ROOT / rel
        actual = sha(path)
        runtime_rows.append({"path": rel, "expected": expected, "actual": actual,
                             "match": actual == expected})

    photo_rows = []
    photo_root = ROOT / "sources/FCV588_GiaoDienThucTeMay2016"
    for name, expected in final_doc["photoReferenceSHA256"].items():
        path = photo_root / name
        actual = sha(path)
        photo_rows.append({"name": name, "expected": expected["sha256"], "actual": actual,
                           "match": actual == expected["sha256"], "rights": expected["rights"]})

    diffs = diff_scan()
    actual_diff = {row["path"]: row["kind"] for row in diffs}
    allowlist_ok = actual_diff == EXPECTED_DIFF

    protected = []
    for rel in PROTECTED:
        cpath, spath = ROOT / rel, STAGE / rel
        row = {"path": rel, "canonicalSha256": sha(cpath), "stageSha256": sha(spath)}
        row["match"] = row["canonicalSha256"] == row["stageSha256"]
        protected.append(row)

    red1 = log_check("p04-provenance-red.txt", ["# tests 6", "# fail 4", "source companion producer is required"])
    red2 = log_check("p04-provenance-red2.txt", ["# tests 6", "# fail 5",
        "BL raster art must not infer bottom from fish pixels plus a single global depth"])
    targeted = log_check("p04-provenance-targeted-final.txt", ["# tests 23", "# pass 23", "# fail 0"])
    node = log_check("p04-provenance-full-node.txt", ["# tests 559", "# pass 559", "# fail 0"])
    python = log_check("p04-provenance-python.txt", ["Ran 13 tests", "OK"])

    stage_runtime_jpegs = [str(path.relative_to(STAGE)) for folder in ("src", "web")
                           for path in (STAGE / folder).rglob("*")
                           if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg"}]
    scenario_text = (STAGE / "src/core/scenario.mjs").read_text(encoding="utf-8")
    profile_text = (STAGE / "src/devices/fcv588/profile-version.mjs").read_text(encoding="utf-8")
    contracts_ok = (
        'SENSOR_MODEL_VERSION = "fcv588-sonar-illustrative-v1"' in scenario_text
        and 'FCV588_PUBLIC_PROFILE_REVISION="F1-public-reference-21"' in profile_text
    )
    seals_ok = sha(FINAL) == EXPECTED_FINAL_SHA and sha(POST) == EXPECTED_POST_SHA
    old_red_doc = json.loads(OLD_RED.read_text(encoding="utf-8"))
    old_red_log = ROOT / old_red_doc["red"]["logPath"]
    old_red_ok = sha(old_red_log) == old_red_doc["red"]["logSha256"]

    validation_ok = all(item["status"] == "PASS" for item in
                        (red1, red2, targeted, node, python))
    status_ok = (allowlist_ok and all(row["match"] for row in protected)
                 and all(row["match"] for row in runtime_rows) and all(row["match"] for row in photo_rows)
                 and not stage_runtime_jpegs and contracts_ok and seals_ok and old_red_ok and validation_ok)

    receipt = {
        "schema": "fcv588-p04-bottom-provenance-isolated-stage-v1",
        "createdAt": datetime.now().astimezone().isoformat(),
        "scope": "P04_BL_SAFE_SYNTHETIC_DISPLAY_TRAINING_STAGE_ONLY",
        "canonicalRoot": str(ROOT), "stageRoot": str(STAGE), "qaRoot": str(QA),
        "decision": "CONDITIONAL_GO_PRESENTATION_COMPANION_NO_SENSOR_SCHEMA_BUMP",
        "canonicalSeals": {
            "p05P06Final": {"path": str(FINAL), "sha256": sha(FINAL), "expected": EXPECTED_FINAL_SHA},
            "independentPost": {"path": str(POST), "sha256": sha(POST), "expected": EXPECTED_POST_SHA},
            "runtime39": {"matches": sum(row["match"] for row in runtime_rows), "total": len(runtime_rows),
                          "rows": runtime_rows},
        },
        "originalP04FishOnlyRed": {"path": str(OLD_RED), "sha256": sha(OLD_RED),
                                   "declaredLogSha256": old_red_doc["red"]["logSha256"],
                                   "actualLogSha256": sha(old_red_log), "unchanged": old_red_ok},
        "allowlist": {"status": "EXACT_6_PATHS" if allowlist_ok else "FAILED",
                      "expected": EXPECTED_DIFF, "actual": diffs},
        "protectedCanonicalEquivalence": protected,
        "contractPreservation": {
            "observationSchema": "UNCHANGED_BY_TESTED_KEYSET",
            "sensorModelVersion": "fcv588-sonar-illustrative-v1",
            "profileRevision": "F1-public-reference-21",
            "sessionReplay": "UNCHANGED_FILES_AND_REPLAY_HASH_TEST_PASS",
            "companionSerializedIntoReplay": False,
            "bzMzCanonicalPixelSha": {
                "Bottom Zoom": "efe712c15b072f07da63487ad630ef8d5bf060ebc04db0491b925c07623132e3",
                "Marker Zoom": "3959bbf444817583042348fe3f26275c342e47c18bc3babedadb3c2394597f2a",
            },
        },
        "implementation": {
            "sourceCompanion": "scenario-authored per-column bottom present/depth/sample-time metadata beside observeSounder",
            "sourceIdentityGuards": ["sourceClass", "simTick", "sensorModelVersion",
                                     "latestWorldBottomDepthM", "columns", "sampleTime", "finite in-frame depth"],
            "bottomLock": "uses per-column authored depths only; missing/absent/spoofed provenance falls back to absolute slice",
            "rasterizer": "Bottom Lock bypasses legacy coherentBottom decorative core/tail inference; normal/BZ/MZ unchanged",
            "history": "flattening occurs before existing picture history; no companion metadata is shifted or serialized",
        },
        "validation": {"redInitial": red1, "redRasterCorrection": red2,
                       "targetedFinal": targeted, "nodeFull": node, "python": python,
                       "nodeVersion": "v22.22.0", "pythonVersion": "3.11.5"},
        "referenceOnlyPhotos": {"status": "UNCHANGED_REFERENCE_ONLY",
                                "runtimeCopiesInStageSrcWeb": stage_runtime_jpegs, "rows": photo_rows},
        "review": {"baseChecklist": "Pre-Landing Review: No issues found.",
                   "independentReview": "PENDING_PRIME_ASSIGNED_REVIEWERS"},
        "operations": {"canonicalApplied": False, "commitCreated": False, "browserRun": False,
                       "port4173Operation": "NONE", "networkHardwareIo": "NONE"},
        "holds": {"phase6F1": "OPEN", "featureClaims": "65/65 HOLD", "hardware": "HOLD",
                  "firmware": "HOLD", "rights": "HOLD", "release": "HOLD", "oemPercentClaim": None},
        "status": "P04_PROVENANCE_STAGE_QA_PASS_INDEPENDENT_REVIEW_PENDING" if status_ok else "FAILED",
        "canonicalReadiness": "NOT_REQUESTED_NO_APPLY",
        "objectiveFailures": [] if status_ok else [
            *( [] if allowlist_ok else ["allowlist mismatch"] ),
            *( [] if all(row["match"] for row in protected) else ["protected contract drift"] ),
            *( [] if all(row["match"] for row in runtime_rows) else ["canonical runtime39 drift"] ),
            *( [] if seals_ok else ["canonical seal drift"] ),
            *( [] if old_red_ok else ["original P04 RED log drift"] ),
            *( [] if not stage_runtime_jpegs else ["reference JPEG copied into stage runtime"] ),
            *( [] if contracts_ok else ["sensor/profile version drift"] ),
            *( [] if validation_ok else ["validation marker failure"] ),
        ],
    }

    receipt_path = QA / "P04_PROVENANCE_STAGE_RECEIPT_20261116.json"
    write_once(receipt_path, (json.dumps(receipt, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    manifest_path = QA / "P04_PROVENANCE_STAGE_QA_SHA256_20261116.txt"
    artifacts = sorted(path for path in QA.rglob("*") if path.is_file() and path != manifest_path)
    write_once(manifest_path, ("\n".join(f"{sha(path)} *{path.relative_to(QA).as_posix()}" for path in artifacts) + "\n").encode("utf-8"))
    print(json.dumps({"status": receipt["status"], "receipt": str(receipt_path),
                      "receiptSha256": sha(receipt_path), "manifest": str(manifest_path),
                      "manifestSha256": sha(manifest_path), "allowlist": diffs,
                      "canonicalRuntime": f"{sum(row['match'] for row in runtime_rows)}/{len(runtime_rows)}",
                      "oldRedUnchanged": old_red_ok}, ensure_ascii=True, indent=2))
    return 0 if status_ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
