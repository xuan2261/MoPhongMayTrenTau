from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime
from pathlib import Path


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT / "staging/fcv588-p04-bottom-provenance-20261116"
QA = ROOT / "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/p04-provenance"
V1_RECEIPT = QA / "P04_PROVENANCE_STAGE_RECEIPT_20261116.json"
V1_MANIFEST = QA / "P04_PROVENANCE_STAGE_QA_SHA256_20261116.txt"
FINAL = ROOT / "docs/qa/FCV588_VISUAL_P05_P06_20261116/FCV588_VISUAL_P05_P06_FINAL_INTEGRITY_20261116.json"
POST = ROOT / "docs/qa/FCV588_VISUAL_P05_P06_20261116/FCV588_VISUAL_P05_P06_INDEPENDENT_POSTRECEIPT_20261116.json"

EXPECTED_V1_RECEIPT_SHA = "2e30a4ee7cf8a1baafa0ac9dc819c465edbe54b15f1bfc017642a38b56ea7132"
EXPECTED_V1_MANIFEST_SHA = "580fa764823b24ce3afc9cce2432631d5027c5d3d13a99c337d8b6c73f88a8f8"
EXPECTED_FINAL_SHA = "ecdfb0bc680f35a6935bb11a4bbadd1f95e3441069b7074a0b68ab22506b4ee4"
EXPECTED_POST_SHA = "9befe64829bf9c79fb7e0505fe1db83a5edf676ce1f4c22a7073ca3cd7a6160e"

EXPECTED_CANONICAL_DIFF = {
    "src/core/scenario.mjs": "MODIFIED",
    "src/devices/fcv588/echo-projection.mjs": "MODIFIED",
    "test/fcv588-p04-bottom-provenance-v2.test.mjs": "NEW",
    "test/fcv588-p04-bottom-provenance.test.mjs": "NEW",
    "test/fcv588-photo-modes.test.mjs": "MODIFIED",
    "web/app.mjs": "MODIFIED",
    "web/fcv588-echo-rasterizer.mjs": "MODIFIED",
}
EXPECTED_V2_DELTA_FROM_V1 = {
    "src/core/scenario.mjs",
    "src/devices/fcv588/echo-projection.mjs",
    "test/fcv588-p04-bottom-provenance-v2.test.mjs",
    "test/fcv588-p04-bottom-provenance.test.mjs",
    "test/fcv588-photo-modes.test.mjs",
    "web/app.mjs",
}
PROTECTED = [
    "src/core/session.mjs", "src/core/protocol.mjs",
    "src/devices/fcv588/profile-version.mjs", "src/devices/fcv588/model.mjs",
    "src/devices/fcv588/settings.mjs", "src/devices/fcv588/adapter.mjs",
]


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


def log_check(name: str, markers: list[str]) -> dict:
    path = QA / name
    text = path.read_text(encoding="utf-8", errors="replace")
    missing = [m for m in markers if m not in text]
    return {"path": str(path), "sha256": sha(path), "markers": markers,
            "missing": missing, "status": "PASS" if not missing else "FAILED"}


def main() -> int:
    v1 = json.loads(V1_RECEIPT.read_text(encoding="utf-8"))
    final_doc = json.loads(FINAL.read_text(encoding="utf-8"))

    old_validation = []
    for name, entry in v1["validation"].items():
        if isinstance(entry, dict) and entry.get("path") and entry.get("sha256"):
            path = Path(entry["path"])
            actual = sha(path)
            old_validation.append({"name": name, "path": str(path),
                                   "expected": entry["sha256"], "actual": actual,
                                   "match": actual == entry["sha256"]})

    canonical_runtime = []
    for rel, expected in final_doc["runtimeSHA256"].items():
        actual = sha(ROOT / rel)
        canonical_runtime.append({"path": rel, "expected": expected,
                                  "actual": actual, "match": actual == expected})

    diffs = diff_scan()
    diff_map = {row["path"]: row["kind"] for row in diffs}
    canonical_diff_ok = diff_map == EXPECTED_CANONICAL_DIFF

    v1_stage = {row["path"]: row["stageSha256"] for row in v1["allowlist"]["actual"]}
    current_stage = {rel: sha(path) for rel, path in files(STAGE).items()}
    v2_delta = set()
    for rel, old_sha in v1_stage.items():
        if current_stage.get(rel) != old_sha:
            v2_delta.add(rel)
    if "test/fcv588-p04-bottom-provenance-v2.test.mjs" in current_stage:
        v2_delta.add("test/fcv588-p04-bottom-provenance-v2.test.mjs")
    v2_delta_ok = v2_delta == EXPECTED_V2_DELTA_FROM_V1
    raster_v1_sha = v1_stage["web/fcv588-echo-rasterizer.mjs"]
    raster_unchanged_from_v1 = current_stage["web/fcv588-echo-rasterizer.mjs"] == raster_v1_sha

    protected = []
    for rel in PROTECTED:
        csha, ssha = sha(ROOT / rel), sha(STAGE / rel)
        protected.append({"path": rel, "canonicalSha256": csha,
                          "stageSha256": ssha, "match": csha == ssha})

    red = log_check("p04-provenance-v2-red.txt", [
        "# tests 3", "# fail 3",
        "foreign scenario provenance must fail closed",
        "missed 41",
        "frozen pixels must keep the depth window that produced them",
    ])
    targeted = log_check("p04-provenance-v2-targeted-final.txt", [
        "# tests 26", "# pass 26", "# fail 0",
        "P04 provenance v2 rejects cross-scenario metadata and inconsistent world bottom",
        "P04 provenance v2 tick231 maps authored raw bottom through makeEchoFrame sampling",
        "P04 provenance v2 Stop freezes BL depth-window metadata with frozen pixels",
    ])
    node = log_check("p04-provenance-v2-full-node-final.txt", [
        "# tests 562", "# pass 562", "# fail 0",
    ])
    python = log_check("p04-provenance-v2-python-final.txt", ["Ran 13 tests", "OK"])

    stage_runtime_jpegs = [str(path.relative_to(STAGE))
                           for folder in ("src", "web")
                           for path in (STAGE / folder).rglob("*")
                           if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg"}]

    old_receipt_ok = sha(V1_RECEIPT) == EXPECTED_V1_RECEIPT_SHA
    old_manifest_ok = sha(V1_MANIFEST) == EXPECTED_V1_MANIFEST_SHA
    seals_ok = sha(FINAL) == EXPECTED_FINAL_SHA and sha(POST) == EXPECTED_POST_SHA
    validation_ok = all(x["status"] == "PASS" for x in (red, targeted, node, python))
    status_ok = all([
        old_receipt_ok, old_manifest_ok, all(x["match"] for x in old_validation),
        all(x["match"] for x in canonical_runtime), canonical_diff_ok, v2_delta_ok,
        raster_unchanged_from_v1, all(x["match"] for x in protected), seals_ok,
        validation_ok, not stage_runtime_jpegs,
    ])

    receipt = {
        "schema": "fcv588-p04-bottom-provenance-v2-isolated-stage-v1",
        "createdAt": datetime.now().astimezone().isoformat(),
        "scope": "P04_BL_SOURCE_IDENTITY_RAW_DISPLAY_MAPPING_AND_STOP_METADATA_STAGE_ONLY",
        "stageRoot": str(STAGE), "qaRoot": str(QA),
        "supersedesForReviewOnly": {
            "v1Receipt": str(V1_RECEIPT), "v1ReceiptSha256": sha(V1_RECEIPT),
            "v1Manifest": str(V1_MANIFEST), "v1ManifestSha256": sha(V1_MANIFEST),
            "v1FilesWereModified": False,
            "v1ValidationLogsAllMatchReceipt": all(x["match"] for x in old_validation),
            "validationRows": old_validation,
        },
        "reviewer13NoGoInputs": [
            "HIGH cross-scenario authored provenance accepted without scenarioId/version binding",
            "HIGH direct authored-depth ceil quantization diverged from makeEchoFrame raw->display sampling; tick231 missed 41/160 columns",
            "secondary Stop froze pixels while startDepthM metadata drifted",
        ],
        "implementation": {
            "authoritativeBinding": "separate non-serialized source identity from scenario/world; binds scenarioId, scenarioVersion, scenarioFingerprint, model, simTick, world bottom, columns",
            "worldConsistency": "identity/provenance producer rejects worldState.bottomDepthM inconsistent with bottomDepthAt(scenario, simTick)",
            "observationShape": "UNCHANGED; no scenario identity added to observeSounder/session/replay public data",
            "rawDisplayMapping": "Bottom Lock maps authored depth to first raw source row at/under bottom, then finds the first display row sampled by the same sounderSourceRowForDepth contract used by makeEchoFrame; no intensity scan",
            "stopMetadata": "Picture Advance Stop preserves previous display snapshot metadata and pixels while sourceTick advances",
            "rasterizer": "unchanged from frozen v1; Bottom Lock continues to bypass coherentBottom decorative inference",
        },
        "canonicalSeals": {
            "final": {"path": str(FINAL), "sha256": sha(FINAL), "expected": EXPECTED_FINAL_SHA},
            "post": {"path": str(POST), "sha256": sha(POST), "expected": EXPECTED_POST_SHA},
            "runtime39": {"matches": sum(x["match"] for x in canonical_runtime),
                          "total": len(canonical_runtime), "rows": canonical_runtime},
        },
        "canonicalDiffAllowlist": {"status": "EXACT_7_PATHS" if canonical_diff_ok else "FAILED",
                                   "expected": EXPECTED_CANONICAL_DIFF, "actual": diffs},
        "deltaFromFrozenV1": {"status": "EXACT_6_PATHS" if v2_delta_ok else "FAILED",
                              "expected": sorted(EXPECTED_V2_DELTA_FROM_V1),
                              "actual": sorted(v2_delta),
                              "v1RasterizerUnchanged": raster_unchanged_from_v1},
        "protectedCanonicalEquivalence": protected,
        "validation": {"red": red, "targetedFinal": targeted,
                       "fullNodeFinal": node, "pythonFinal": python,
                       "nodeVersion": "v22.22.0", "pythonVersion": "3.11.5",
                       "tick231LowerBandStrong": "160/160",
                       "bzMzByteEquivalence": "covered by retained P04 provenance targeted/full assertions",
                       "sessionReplayProfile21": "covered by retained provenance tests; protected files byte-identical"},
        "sourceSha256": {rel: current_stage[rel] for rel in sorted(EXPECTED_CANONICAL_DIFF)},
        "referenceOnlyPhotos": {"runtimeCopiesInStageSrcWeb": stage_runtime_jpegs,
                                "status": "UNCHANGED_REFERENCE_ONLY"},
        "review": {"ownerCodeReview": "Pre-Landing Review: No issues found.",
                   "independentReviewer13ReReview": "PENDING_AFTER_V2_FREEZE"},
        "operations": {"canonicalApplied": False, "commitCreated": False,
                       "browserRun": False, "port4173Operation": "NONE",
                       "guardScriptsEdited": False, "networkHardwareIo": "NONE"},
        "holds": {"phase6F1": "OPEN", "featureClaims": "65/65 HOLD",
                  "hardware": "HOLD", "firmware": "HOLD", "rights": "HOLD",
                  "release": "HOLD", "oemPercentClaim": None},
        "status": "P04_PROVENANCE_V2_STAGE_QA_PASS_INDEPENDENT_REVIEW_PENDING" if status_ok else "FAILED",
        "canonicalReadiness": "NOT_REQUESTED_NO_APPLY",
        "objectiveFailures": [] if status_ok else [
            *( [] if old_receipt_ok else ["v1 receipt drift"] ),
            *( [] if old_manifest_ok else ["v1 manifest drift"] ),
            *( [] if all(x["match"] for x in old_validation) else ["v1 validation evidence drift"] ),
            *( [] if all(x["match"] for x in canonical_runtime) else ["canonical runtime39 drift"] ),
            *( [] if canonical_diff_ok else ["canonical diff allowlist mismatch"] ),
            *( [] if v2_delta_ok else ["v2 delta from v1 mismatch"] ),
            *( [] if raster_unchanged_from_v1 else ["v1 rasterizer drift"] ),
            *( [] if all(x["match"] for x in protected) else ["protected contract drift"] ),
            *( [] if seals_ok else ["canonical seal drift"] ),
            *( [] if validation_ok else ["v2 validation failure"] ),
            *( [] if not stage_runtime_jpegs else ["reference JPEG copied into stage runtime"] ),
        ],
    }

    receipt_path = QA / "P04_PROVENANCE_V2_STAGE_RECEIPT_20261116.json"
    write_once(receipt_path, (json.dumps(receipt, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    manifest_path = QA / "P04_PROVENANCE_V2_QA_SHA256_20261116.txt"
    selected = [
        QA / "finalize_p04_provenance_worker12_v2.py",
        QA / "p04-provenance-v2-red.txt",
        QA / "p04-provenance-v2-targeted-final.txt",
        QA / "p04-provenance-v2-full-node-final.txt",
        QA / "p04-provenance-v2-python-final.txt",
        receipt_path,
    ]
    write_once(manifest_path, ("\n".join(
        f"{sha(path)} *{path.relative_to(QA).as_posix()}" for path in selected) + "\n").encode("utf-8"))
    print(json.dumps({
        "status": receipt["status"], "receipt": str(receipt_path),
        "receiptSha256": sha(receipt_path), "manifest": str(manifest_path),
        "manifestSha256": sha(manifest_path), "canonicalDiff": diffs,
        "v2DeltaFromV1": sorted(v2_delta),
        "canonicalRuntime": f"{sum(x['match'] for x in canonical_runtime)}/{len(canonical_runtime)}",
        "v1ReceiptUnchanged": old_receipt_ok, "v1ManifestUnchanged": old_manifest_ok,
    }, ensure_ascii=True, indent=2))
    return 0 if status_ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
