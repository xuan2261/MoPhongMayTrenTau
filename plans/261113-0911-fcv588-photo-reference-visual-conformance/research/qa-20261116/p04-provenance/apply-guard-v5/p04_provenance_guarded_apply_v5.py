"""P04 provenance guarded canonical apply helper v5.

V5 preserves the frozen worker12 v3 stage/compat/source gates but moves the
independent-review authority from terminal worker-13 to reviewerId worker-16.
The browser gate is now six cases and requires a non-vacuous Picture Advance
Stop/Bottom Zone witness, plus source-bound events/screenshots.
- exactly five requested stage cases (four 1366x768 + one 375x812), no 1920 claim;
- loaded HTTP body attestations are read from the write-once *-events.json;
- the events JSON SHA is bound by the worker7 *-sha256.txt manifest;
- every loaded body SHA must equal its exact stage source SHA;
- every screenshot SHA and all eight reference-photo HTTP 404 checks are verified.

The stage receipt and compatibility probe are pinned exactly. The source delta
is exactly eight paths: four runtime files, one modified existing test and
three new provenance tests (v1/v2/v3). The forthcoming Chrome v3 receipt/events
are verified dynamically against this frozen stage. Reviewer-13 must explicitly
say GO and bind the exact stage/compat/Chrome receipt SHAs.

Dry-run never mutates canonical runtime/tests. --apply is implemented for a
future explicit prime GO only; this worker must not invoke it.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import zipfile


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT / r"staging\fcv588-p04-bottom-provenance-20261116"
QA = ROOT / r"plans\261113-0911-fcv588-photo-reference-visual-conformance\research\qa-20261116\p04-provenance"
SELF_QA = QA / "apply-guard-v5"

PARENT_FINAL = ROOT / r"docs\qa\FCV588_VISUAL_P05_P06_20261116\FCV588_VISUAL_P05_P06_FINAL_INTEGRITY_20261116.json"
PARENT_POST = ROOT / r"docs\qa\FCV588_VISUAL_P05_P06_20261116\FCV588_VISUAL_P05_P06_INDEPENDENT_POSTRECEIPT_20261116.json"
PARENT_FINAL_SHA = "ecdfb0bc680f35a6935bb11a4bbadd1f95e3441069b7074a0b68ab22506b4ee4"
PARENT_POST_SHA = "9befe64829bf9c79fb7e0505fe1db83a5edf676ce1f4c22a7073ca3cd7a6160e"
EXPECTED_STAGE_RECEIPT_SHA = "7599509a0bb6332b147df47226a8b2640c44b577d0e65ae4981fcceace1f9129"
EXPECTED_COMPAT_RECEIPT_SHA = "a4bc2f6f55b171dd38f54f503103607eacf3e34a7fb6c46d9a3874dd0fc99cd6"
LEGACY_WORKER13_V3_NOGO_SHA = "1a92cc99aaff9039e1d1f0f1a40a568f10a5a174b6a6c881422491a0423718a7"

ORIGINAL_RED = QA.parent / "p04-extended" / "P04_NEAR_BOTTOM_FISH_ONLY_RED_RECEIPT_20261116.json"
ORIGINAL_RED_SHA = "c4d7ba7bcc7998dd48fd270541e7e694ee6a930d27809a5bb44b5d4bf2677690"

NODE_EXE = Path(r"C:\nvm4w\nodejs\node.exe")
EXPECTED_NODE = "v22.22.0"
EXPECTED_PROFILE = "F1-public-reference-21"

RUNTIME_PATHS = (
    "src/core/scenario.mjs",
    "src/devices/fcv588/echo-projection.mjs",
    "web/app.mjs",
    "web/fcv588-echo-rasterizer.mjs",
)
EXACT_TEST_PATHS = {
    "test/fcv588-photo-modes.test.mjs",
    "test/fcv588-p04-bottom-provenance.test.mjs",
    "test/fcv588-p04-bottom-provenance-v2.test.mjs",
    "test/fcv588-p04-bottom-provenance-v3.test.mjs",
}
EXACT_COPY_PATHS = {*RUNTIME_PATHS, *EXACT_TEST_PATHS}

EXPECTED_POSTIMAGE_SHA256 = {
    "src/core/scenario.mjs": "986c0331fda7f2ee08d773241c929ec8b894645f515639a9bbd547e44117c63a",
    "src/devices/fcv588/echo-projection.mjs": "0d1eee3ffaf48d94657f7bc127d83bc506ced721149988cf516550ddf6c9098b",
    "web/app.mjs": "272f422019d2d075fe907705973c2d99d8db0f5cd96597011586c15684d265ee",
    "web/fcv588-echo-rasterizer.mjs": "61a7be90bdc963586d405905b803d6abfcf08352a7ee7875b31166fce1bda699",
    "test/fcv588-photo-modes.test.mjs": "b07516afc7b410a4dec6783eef4c729b565e842a15b5c32a0ea5f62a953be955",
    "test/fcv588-p04-bottom-provenance.test.mjs": "897cb8380a356cc23fd165e33b39ea47800c47ddb28dcfccd4a0716d7063accd",
    "test/fcv588-p04-bottom-provenance-v2.test.mjs": "c8487c0faf07fd60d8672ba35c7ec57466b025e3ceafdc23604017e38d9b7212",
    "test/fcv588-p04-bottom-provenance-v3.test.mjs": "69b33a2f4646e97535ecd33e5a182e3318cbf757d0baddfef0a4c5e7a440bfa1",
}

EXPECTED_CASES = {
    "BL-LF-Blue": (1366, 768),
    "BL-HF-Blue": (1366, 768),
    "BZ-LF-Blue": (1366, 768),
    "MZ-LF-Blue": (1366, 768),
    "STOP-BL-LF-Blue-BZ-Standard": (1366, 768),
    "BL-LF-Blue-MOBILE-MENU-D15": (375, 812),
}
EXPECTED_PHOTOS = {
    "giaoDien.jpg", "lf.jpg", "hf.jpg", "dual.jpg",
    "zoom.jpg", "zoom2.jpg", "nav1.jpg", "nav2.jpg",
}

BACKUP = SELF_QA / "P04_PROVENANCE_V5_BEFORE_APPLY_20261116.zip"
INTENT = SELF_QA / "P04_PROVENANCE_V5_CANONICAL_APPLY_INTENT_20261116.json"
JOURNAL = SELF_QA / "P04_PROVENANCE_V5_CANONICAL_APPLY_JOURNAL_20261116.json"
DONE = SELF_QA / "P04_PROVENANCE_V5_CANONICAL_APPLY_RECEIPT_20261116.json"
PRIME_GO_TOKEN = "P04_PROVENANCE_CANONICAL_APPLY_GO"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha(path: Path) -> str:
    require(path.is_file(), "missing file: " + str(path))
    return digest(path.read_bytes())


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def serialized(data: object) -> bytes:
    return (json.dumps(data, indent=2, ensure_ascii=False) + "\n").encode("utf-8")


def write_exclusive(path: Path, blob: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, "wb") as stream:
        stream.write(blob)


def runtime_inventory(root: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for folder in ("src", "web"):
        for file in (root / folder).rglob("*"):
            if file.is_file() and file.suffix.lower() in (".mjs", ".js", ".css", ".svg", ".html"):
                result[file.relative_to(root).as_posix()] = sha(file)
    return dict(sorted(result.items()))


def test_inventory(root: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for file in (root / "test").rglob("*"):
        if file.is_file() and file.suffix.lower() in (".mjs", ".py", ".json") and "__pycache__" not in file.parts:
            result[file.relative_to(root).as_posix()] = sha(file)
    return dict(sorted(result.items()))


def flatten_strings(value: object) -> list[str]:
    out: list[str] = []
    if isinstance(value, str):
        out.append(value)
    elif isinstance(value, dict):
        for key, item in value.items():
            out.append(str(key))
            out.extend(flatten_strings(item))
    elif isinstance(value, list):
        for item in value:
            out.extend(flatten_strings(item))
    return out


def decision_values(value: object) -> list[str]:
    out: list[str] = []
    if isinstance(value, dict):
        for key, item in value.items():
            if key.lower() in ("decision", "verdict", "recommendation") and isinstance(item, str):
                out.append(item)
            out.extend(decision_values(item))
    elif isinstance(value, list):
        for item in value:
            out.extend(decision_values(item))
    return out


def verify_toolchain() -> dict:
    require(sys.version_info[:2] == (3, 11), f"Python 3.11 required, got {sys.version.split()[0]}")
    require(NODE_EXE.is_file(), "Node22 absolute path missing")
    node = subprocess.check_output([str(NODE_EXE), "--version"], text=True).strip()
    require(node == EXPECTED_NODE, f"Node version drift: {node}")
    return {"python": sys.version.split()[0], "node": node, "nodePath": str(NODE_EXE)}


def verify_validation_entry(stage_receipt: dict, key: str, required_markers: tuple[str, ...]) -> dict:
    item = stage_receipt.get("validation", {}).get(key)
    require(isinstance(item, dict) and item.get("status") == "PASS", f"stage validation {key} not PASS")
    path = Path(item.get("path", ""))
    require(path.is_file(), f"stage validation {key} file missing")
    require(sha(path) == item.get("sha256"), f"stage validation {key} SHA drift")
    text = path.read_text(encoding="utf-8", errors="replace")
    for marker in required_markers:
        require(marker in text, f"stage validation {key} missing marker: {marker}")
    return {"path": str(path), "sha256": item["sha256"], "markers": list(required_markers)}


def verify_node_validation(stage_receipt: dict) -> dict:
    item = stage_receipt.get("validation", {}).get("fullNode")
    require(isinstance(item, dict) and item.get("status") == "PASS", "stage validation fullNode not PASS")
    path = Path(item.get("path", ""))
    require(path.is_file() and sha(path) == item.get("sha256"), "stage Node full log SHA drift")
    text = path.read_text(encoding="utf-8", errors="replace")
    tests = re.search(r"(?m)^# tests (\d+)\s*$", text)
    passed = re.search(r"(?m)^# pass (\d+)\s*$", text)
    failed = re.search(r"(?m)^# fail (\d+)\s*$", text)
    require(tests and passed and failed, "stage Node full summary missing")
    test_count, pass_count, fail_count = map(int, (tests.group(1), passed.group(1), failed.group(1)))
    require(test_count == pass_count and fail_count == 0 and test_count >= 559,
            "stage Node full suite is not all-PASS or regressed below established 559 tests")
    return {"path": str(path), "sha256": item["sha256"], "tests": test_count,
            "pass": pass_count, "fail": fail_count}


def verify_parent_and_stage(stage_receipt_path: Path) -> dict:
    require(sha(PARENT_FINAL) == PARENT_FINAL_SHA, "P05/P06 final seal SHA mismatch")
    require(sha(PARENT_POST) == PARENT_POST_SHA, "P05/P06 independent post SHA mismatch")
    parent = read_json(PARENT_FINAL)
    parent_runtime = dict(sorted(parent.get("runtimeSHA256", {}).items()))
    require(parent.get("runtimeCount") == 39 and len(parent_runtime) == 39,
            "sealed parent source39 contract missing")
    require(parent.get("hardwareValidated") is False and parent.get("rightsClearance") == "HOLD" and
            parent.get("releaseApproval") == "HOLD" and parent.get("phase6") == "OPEN" and
            parent.get("featureClaims") == "65/65 HOLD", "sealed parent HOLD gates drifted")

    canonical_runtime = runtime_inventory(ROOT)
    require(canonical_runtime == parent_runtime, "canonical source39 no longer equals sealed P05/P06 parent")

    receipt_sha = sha(stage_receipt_path)
    require(receipt_sha == EXPECTED_STAGE_RECEIPT_SHA, "stage receipt SHA is not the frozen worker12 v3 receipt")
    stage_receipt = read_json(stage_receipt_path)
    require(Path(stage_receipt.get("stageRoot", "")) == STAGE, "stage receipt root mismatch")
    require(stage_receipt.get("schema") == "fcv588-p04-bottom-provenance-v3-isolated-stage-v1",
            "unexpected frozen worker12 v3 stage receipt schema")
    require(stage_receipt.get("status") == "P04_PROVENANCE_V3_STAGE_QA_PASS_INDEPENDENT_REVIEW_PENDING",
            "stage receipt status is not frozen worker12 v3 PASS/review-pending")
    seals = stage_receipt.get("canonicalSeals", {})
    require(seals.get("final", {}).get("sha256") == PARENT_FINAL_SHA and
            seals.get("final", {}).get("expected") == PARENT_FINAL_SHA and
            seals.get("post", {}).get("sha256") == PARENT_POST_SHA and
            seals.get("post", {}).get("expected") == PARENT_POST_SHA,
            "stage receipt is not bound to exact P05/P06 parent seals")
    runtime39 = seals.get("runtime39", {})
    require(runtime39.get("matches") == 39 and runtime39.get("total") == 39,
            "stage receipt parent source39 mismatch")
    runtime_rows = runtime39.get("rows", [])
    require(len(runtime_rows) == 39 and
            all(row.get("match") is True and row.get("expected") == row.get("actual") == parent_runtime.get(row.get("path"))
                for row in runtime_rows),
            "stage receipt runtime39 rows do not match sealed parent source39")
    require(stage_receipt.get("operations", {}).get("canonicalApplied") is False,
            "stage receipt claims canonical apply")

    allowlist = stage_receipt.get("canonicalDiffAllowlist", {})
    require(allowlist.get("status") == "EXACT_8_PATHS", "stage receipt does not declare EXACT_8_PATHS")
    expected_kinds = allowlist.get("expected", {})
    require(set(expected_kinds) == EXACT_COPY_PATHS, "stage receipt expected allowlist != exact 8 paths")
    require(expected_kinds == {
        "src/core/scenario.mjs": "MODIFIED",
        "src/devices/fcv588/echo-projection.mjs": "MODIFIED",
        "test/fcv588-p04-bottom-provenance-v2.test.mjs": "NEW",
        "test/fcv588-p04-bottom-provenance-v3.test.mjs": "NEW",
        "test/fcv588-p04-bottom-provenance.test.mjs": "NEW",
        "test/fcv588-photo-modes.test.mjs": "MODIFIED",
        "web/app.mjs": "MODIFIED",
        "web/fcv588-echo-rasterizer.mjs": "MODIFIED",
    }, "stage receipt exact 8-path kinds drift")
    actual_rows = allowlist.get("actual", [])
    require(isinstance(actual_rows, list) and len(actual_rows) == 8, "stage receipt actual allowlist must have exactly 8 rows")
    actual = {row.get("path"): row for row in actual_rows}
    runtime_rows = {path for path in actual if path in RUNTIME_PATHS}
    test_rows = set(actual) - runtime_rows
    require(runtime_rows == set(RUNTIME_PATHS), "stage receipt runtime allowlist != exact runtime4")
    require(test_rows == EXACT_TEST_PATHS, "stage receipt test allowlist != exact 4 test paths")
    require(set(actual) == EXACT_COPY_PATHS, "stage receipt actual allowlist != exact 8 paths")
    for rel in RUNTIME_PATHS:
        require(actual[rel].get("kind") == "MODIFIED", "runtime allowlist kind mismatch: " + rel)
        require(actual[rel].get("canonicalSha256") == parent_runtime[rel],
                "runtime canonical preimage mismatch in stage receipt: " + rel)
        require(actual[rel].get("stageSha256") == EXPECTED_POSTIMAGE_SHA256[rel],
                "runtime frozen postimage SHA mismatch in stage receipt: " + rel)
    source_sha = stage_receipt.get("sourceSha256", {})
    require(source_sha == EXPECTED_POSTIMAGE_SHA256,
            "stage receipt sourceSha256 map != exact frozen 7 postimages")

    stage_runtime = runtime_inventory(STAGE)
    require(set(stage_runtime) == set(parent_runtime), "stage source inventory added/deleted runtime paths")
    changed_runtime = {rel for rel in stage_runtime if stage_runtime[rel] != canonical_runtime[rel]}
    require(changed_runtime == set(RUNTIME_PATHS), "stage runtime diff != exact 4-path scope")
    for rel in RUNTIME_PATHS:
        require(stage_runtime[rel] == actual[rel].get("stageSha256"),
                "stage runtime postimage != receipt: " + rel)

    canonical_tests = test_inventory(ROOT)
    stage_tests = test_inventory(STAGE)
    require(not (set(canonical_tests) - set(stage_tests)), "stage deleted canonical tests")
    changed_tests = {rel for rel in canonical_tests if stage_tests[rel] != canonical_tests[rel]}
    new_tests = set(stage_tests) - set(canonical_tests)
    receipt_modified = {rel for rel in test_rows if actual[rel].get("kind") == "MODIFIED"}
    receipt_new = {rel for rel in test_rows if actual[rel].get("kind") == "NEW"}
    require(changed_tests == receipt_modified, "stage modified-test set != receipt")
    require(new_tests == receipt_new, "stage new-test set != receipt")
    for rel in receipt_modified:
        require(actual[rel].get("canonicalSha256") == canonical_tests[rel] and
                actual[rel].get("stageSha256") == stage_tests[rel],
                "modified test pre/postimage mismatch: " + rel)
    for rel in receipt_new:
        require(actual[rel].get("canonicalSha256") is None and
                actual[rel].get("stageSha256") == stage_tests[rel],
                "new test postimage mismatch: " + rel)
    require(receipt_modified == {"test/fcv588-photo-modes.test.mjs"},
            "frozen v3 modified test set drift")
    require(receipt_new == {
        "test/fcv588-p04-bottom-provenance.test.mjs",
        "test/fcv588-p04-bottom-provenance-v2.test.mjs",
        "test/fcv588-p04-bottom-provenance-v3.test.mjs",
    }, "frozen v3 new test set drift")
    require(all(stage_tests[rel] == EXPECTED_POSTIMAGE_SHA256[rel] for rel in EXACT_TEST_PATHS),
            "live test SHA does not match frozen v3 postimage")

    node = verify_node_validation(stage_receipt)
    require(node["tests"] == 563 and node["pass"] == 563 and node["fail"] == 0,
            "frozen v3 Node expected exactly 563/563")
    py = verify_validation_entry(stage_receipt, "python", ("Ran 13 tests", "OK"))
    require(stage_receipt.get("validation", {}).get("nodeVersion") == EXPECTED_NODE,
            "stage receipt Node version mismatch")
    require(str(stage_receipt.get("validation", {}).get("pythonVersion", "")).startswith("3.11"),
            "stage receipt Python version mismatch")
    compat_item = stage_receipt.get("validation", {}).get("compat", {})
    require(compat_item.get("status") == "PASS" and
            compat_item.get("sha256") == EXPECTED_COMPAT_RECEIPT_SHA,
            "stage receipt compatibility binding is not exact PASS SHA")
    compat_bound_path = Path(compat_item.get("path", ""))
    require(compat_bound_path.is_file() and sha(compat_bound_path) == EXPECTED_COMPAT_RECEIPT_SHA,
            "stage receipt compatibility file path/SHA drift")

    require(sha(ORIGINAL_RED) == ORIGINAL_RED_SHA, "historical P04 fish-only RED receipt mutated")
    absent_new_tests = sorted(receipt_new)
    require(all(not (ROOT / rel).exists() for rel in absent_new_tests),
            "canonical unexpectedly contains a new provenance test during v5 preflight")
    return {
        "stageReceiptPath": str(stage_receipt_path),
        "stageReceiptSHA256": receipt_sha,
        "parentRuntimeCount": 39,
        "canonicalRuntimeSHA256": canonical_runtime,
        "stageRuntimeSHA256": stage_runtime,
        "preimageSHA256": {
            **{rel: canonical_runtime[rel] for rel in RUNTIME_PATHS},
            **{rel: canonical_tests[rel] for rel in receipt_modified},
        },
        "postimageSHA256": {rel: actual[rel]["stageSha256"] for rel in (*RUNTIME_PATHS, *sorted(test_rows))},
        "copyPaths": [*RUNTIME_PATHS, *sorted(test_rows)],
        "changedRuntimePaths": sorted(changed_runtime),
        "changedExistingTestPaths": sorted(changed_tests),
        "newTestPaths": sorted(new_tests),
        "absentNewTestPathsVerified": absent_new_tests,
        "node563": node,
        "python13": py,
        "compatibilityBoundByStageReceiptSHA256": EXPECTED_COMPAT_RECEIPT_SHA,
    }


def verify_jpg8_and_holds() -> dict:
    parent = read_json(PARENT_FINAL)
    photos = parent.get("photoReferenceSHA256", {})
    require(set(photos) == EXPECTED_PHOTOS, "parent must pin exact original JPG8 names")
    rows = []
    for name, meta in sorted(photos.items()):
        require(meta.get("rights") == "REFERENCE_ONLY_CLEARANCE_NOT_OBTAINED",
                "photo rights unexpectedly changed: " + name)
        source = ROOT / "sources/FCV588_GiaoDienThucTeMay2016" / name
        require(sha(source) == meta.get("sha256"), "reference JPG mutated: " + name)
        rows.append({"name": name, "sha256": meta["sha256"], "rights": meta["rights"]})
    for runtime_root in (STAGE / "src", STAGE / "web"):
        for file in runtime_root.rglob("*"):
            if file.is_file() and file.suffix.lower() in (".jpg", ".jpeg"):
                raise RuntimeError("reference JPG copied into stage runtime: " + str(file))
    return {"count": 8, "photos": rows, "rightsClearance": "HOLD"}


def verify_compatibility(compat_path: Path) -> dict:
    compat_sha = sha(compat_path)
    require(compat_sha == EXPECTED_COMPAT_RECEIPT_SHA,
            "compatibility receipt SHA is not the frozen PASS receipt bound by v3 stage")
    data = read_json(compat_path)
    require(data.get("status") == "PASS", "compatibility probe is not PASS")
    require(Path(data.get("canonicalRoot", "")) == ROOT and Path(data.get("stageRoot", "")) == STAGE,
            "compatibility probe roots mismatch")
    require(data.get("profileRevision") == EXPECTED_PROFILE,
            "compatibility probe did not remain profile21")
    obs = data.get("observation", {})
    require(obs.get("existingFieldsIdentical") is True and obs.get("rawChannelsIdentical") is True,
            "compatibility probe observation/raw channel contract failed")
    require(obs.get("additiveStageKeys", []) == [],
            "observeSounder keyset changed; companion provenance must stay outside observation schema")
    sessions = data.get("sessions", [])
    require(isinstance(sessions, list) and len(sessions) >= 2 and
            all(row.get("sessionHash") and row.get("finalSessionHash") for row in sessions),
            "compatibility probe missing deterministic session/replay proofs")
    sources = data.get("sourceSha256", {})
    require(isinstance(sources, dict) and sources, "compatibility source SHA binding missing")
    for rel, pair in sources.items():
        require(pair.get("canonical") == sha(ROOT / rel), "compat canonical source SHA drift: " + rel)
        require(pair.get("stage") == sha(STAGE / rel), "compat stage source SHA drift: " + rel)
    return {"path": str(compat_path), "sha256": compat_sha, "profileRevision": EXPECTED_PROFILE,
            "sessions": len(sessions), "rawChannelsIdentical": True,
            "observationExistingKeysIdentical": True}


def parse_sha_manifest(path: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for raw in path.read_text(encoding="ascii").splitlines():
        match = re.fullmatch(r"([0-9a-f]{64}) \*(.+)", raw.strip())
        require(match is not None, "malformed Chrome SHA manifest line: " + raw)
        result[match.group(2)] = match.group(1)
    return result


def loaded_aggregate(rows: list[dict]) -> str:
    blob = json.dumps(rows, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return digest(blob)


def verify_chrome(receipt_path: Path) -> dict:
    receipt_sha = sha(receipt_path)
    prefix = receipt_path.stem
    events_path = receipt_path.with_name(prefix + "-events.json")
    manifest_path = receipt_path.with_name(prefix + "-sha256.txt")
    events_sha = sha(events_path)
    manifest_sha = sha(manifest_path)
    manifest = parse_sha_manifest(manifest_path)
    require(manifest.get(receipt_path.name) == receipt_sha, "Chrome manifest receipt SHA mismatch")
    require(manifest.get(events_path.name) == events_sha, "Chrome events file exact SHA mismatch")

    receipt = read_json(receipt_path)
    events = read_json(events_path)
    require(receipt.get("overallStatus") == "PASS", "Chrome staging receipt is not PASS")
    require(Path(receipt.get("stageRoot", "")) == STAGE, "Chrome receipt tested a different stage")
    require(receipt.get("sourceTreeStable") is True and
            receipt.get("sourceManifestBefore") == receipt.get("sourceManifestAfter"),
            "Chrome source manifest changed during run")
    require(receipt.get("sourceManifestBefore", {}).get("files") == 38,
            "Chrome source manifest expected 38 served/hashable source files")
    require(receipt.get("serverCleanup") == "PASS" and not receipt.get("objectiveFailures", []),
            "Chrome objective/cleanup failure")

    cases = receipt.get("cases", [])
    raw_cases = events.get("cases", [])
    require(len(cases) == len(raw_cases) == 6, "Chrome v5 must have exactly requested 6 cases including Stop")
    require({case.get("name") for case in cases} == set(EXPECTED_CASES),
            "Chrome receipt case names differ from required 6-case scope")
    require({case.get("name") for case in raw_cases} == set(EXPECTED_CASES),
            "Chrome events case names differ from required 6-case scope")
    raw_by_name = {case["name"]: case for case in raw_cases}

    screenshots: dict[str, str] = {}
    loaded_counts: dict[str, int] = {}
    for case in cases:
        name = case["name"]
        expected_view = EXPECTED_CASES[name]
        viewport = case.get("viewport", {})
        require((viewport.get("width"), viewport.get("height")) == expected_view,
                "unexpected Chrome viewport for " + name)
        require(case.get("status") == "PASS" and not case.get("objectiveFailures", []),
                "Chrome case failed: " + name)
        counts = case.get("errorCounts", {})
        require(isinstance(counts, dict) and counts and not any(counts.values()),
                "Chrome case error counts nonzero: " + name)

        raw_case = raw_by_name[name]
        require(raw_case.get("viewport") == viewport, "events/receipt viewport mismatch: " + name)
        for key in ("consoleErrors", "pageErrors", "requestFailures", "externalRequests", "bodyErrors"):
            require(raw_case.get(key) == [], f"Chrome events {key} nonempty: {name}")
        loaded = raw_case.get("loadedBodies")
        require(isinstance(loaded, list) and loaded and len(loaded) == case.get("loadedBodyCount"),
                "Chrome loaded body count mismatch: " + name)
        require(len(loaded) > 0, "Chrome case has no loaded body attestations: " + name)
        require(loaded_aggregate(loaded) == case.get("loadedBodyAggregateSha256"),
                "Chrome loaded body aggregate SHA mismatch: " + name)
        paths = [row.get("path") for row in loaded]
        require(len(paths) == len(set(paths)), "duplicate loaded body paths: " + name)
        for row in loaded:
            rel = row.get("path")
            require(isinstance(rel, str) and rel, "loaded body path missing: " + name)
            source = STAGE / rel
            source_sha = sha(source)
            require(row.get("matches") is True and
                    row.get("bodySha256") == row.get("sourceSha256") == source_sha,
                    "loaded HTTP response/source SHA mismatch: " + name + " " + rel)
        loaded_counts[name] = len(loaded)

        shot = case.get("screenshot", {})
        shot_path = Path(shot.get("path", ""))
        require(shot_path.is_file() and sha(shot_path) == shot.get("sha256"),
                "Chrome screenshot SHA mismatch: " + name)
        require(manifest.get(shot_path.name) == shot.get("sha256"),
                "Chrome manifest screenshot SHA mismatch: " + name)
        screenshots[str(shot_path)] = shot["sha256"]

    stop = next(case for case in cases if case.get("name") == "STOP-BL-LF-Blue-BZ-Standard")
    proof = stop.get("stopBottomZoneProof")
    require(isinstance(proof, dict), "Stop case lacks stopBottomZoneProof")
    require(isinstance(proof.get("tickBefore"), int) and isinstance(proof.get("tickAfter"), int) and
            proof["tickAfter"] > proof["tickBefore"],
            "Stop witness is vacuous: synthetic world did not advance")
    require("STOP" in str(proof.get("headerBefore", "")) and
            "STOP" in str(proof.get("headerAfter", "")),
            "Stop witness is vacuous: STOP not visible before/after")
    require(proof.get("bottomZoneWitnessChanged") is True and
            isinstance(proof.get("bottomZoneNarrowWitnessSha256"), str) and
            isinstance(proof.get("bottomZoneStandardWitnessSha256"), str) and
            proof.get("bottomZoneNarrowWitnessSha256") != proof.get("bottomZoneStandardWitnessSha256"),
            "Stop witness is vacuous: Narrow/Standard Bottom Zone did not render differently")
    require(proof.get("canvasStable") is True and proof.get("changedPixelCount") == 0 and
            proof.get("changedPixelBoundingBox") is None and
            proof.get("canvasBeforeSha256") == proof.get("canvasAfterSha256"),
            "Stop witness failed: backing canvas changed while world advanced")
    require(proof.get("bottomZone") == "Standard" and proof.get("pictureAdvance") == "Stop",
            "Stop witness settings are not Standard Bottom Zone + Picture Advance Stop")
    backing_artifacts = {}
    for key in ("backingBefore", "backingAfter"):
        row = proof.get(key)
        require(isinstance(row, dict) and row.get("path") and row.get("sha256"),
                "Stop witness backing artifact missing: " + key)
        artifact_path = Path(row["path"])
        require(artifact_path.is_file() and sha(artifact_path) == row["sha256"],
                "Stop witness backing artifact SHA mismatch: " + key)
        require(manifest.get(artifact_path.name) == row["sha256"],
                "Chrome manifest does not bind Stop backing artifact: " + key)
        backing_artifacts[str(artifact_path)] = row["sha256"]

    photo_deny = receipt.get("photoDeny", {})
    photo_rows = photo_deny.get("paths", []) if isinstance(photo_deny, dict) else []
    require(photo_deny.get("status") == "PASS" and len(photo_rows) == 8,
            "Chrome JPG8 HTTP deny evidence missing")
    require({row.get("name") for row in photo_rows} == EXPECTED_PHOTOS and
            all(row.get("status") == "PASS" and row.get("statusCode") == 404 for row in photo_rows),
            "Chrome JPG8 HTTP404 evidence mismatch")

    tested = sorted({f"{w}x{h}" for w, h in EXPECTED_CASES.values()})
    require(tested == ["1366x768", "375x812"], "internal 6-case viewport contract drift")
    return {
        "path": str(receipt_path), "sha256": receipt_sha,
        "eventsPath": str(events_path), "eventsSHA256": events_sha,
        "manifestPath": str(manifest_path), "manifestSHA256": manifest_sha,
        "caseCount": 6, "caseNames": list(EXPECTED_CASES),
        "testedViewports": tested,
        "notTested": ["1920 viewport"],
        "scopeStatement": "GROUNDED_REQUIRED_6_CASE_STAGE_SCOPE_WITH_NONVACUOUS_STOP_NO_1920_CLAIM",
        "loadedBodyCounts": loaded_counts,
        "screenshotsSHA256": screenshots,
        "stopWitness": {
            "tickBefore": proof["tickBefore"], "tickAfter": proof["tickAfter"],
            "bottomZoneWitnessChanged": True, "canvasStable": True,
            "changedPixelCount": 0, "backingArtifactsSHA256": backing_artifacts,
        },
        "jpg8Http404": True,
    }


def verify_reviewer(path: Path, stage_sha: str, compat_sha: str, chrome_sha: str) -> dict:
    reviewer_sha = sha(path)
    require(reviewer_sha != LEGACY_WORKER13_V3_NOGO_SHA,
            "legacy worker-13 v3 NO-GO receipt cannot be reused as reviewer evidence")
    data = read_json(path)
    require(data.get("reviewerId") == "worker-16", "reviewer GO must have reviewerId exactly worker-16")
    decisions = [value.upper().strip() for value in decision_values(data)]
    require(decisions, "reviewer receipt lacks explicit decision/verdict/recommendation")
    require(not any("NO-GO" in value or "NO_GO" in value or value in ("FAIL", "REJECT", "REJECTED")
                    for value in decisions), "reviewer receipt contains NO-GO/reject decision")
    require(any(value == "GO" or value.startswith("GO_") for value in decisions),
            "independent reviewer did not record explicit GO")
    require(Path(data.get("stageRoot", "")) == STAGE, "reviewer GO bound to a different stage")
    strings = flatten_strings(data)
    require(stage_sha in strings, "reviewer GO does not bind exact stage receipt SHA")
    require(compat_sha in strings, "reviewer GO does not bind exact compatibility receipt SHA")
    require(chrome_sha in strings, "reviewer GO does not bind exact Chrome receipt SHA")
    return {"path": str(path), "sha256": reviewer_sha, "decision": "GO",
            "reviewerId": "worker-16",
            "boundStageReceiptSHA256": stage_sha,
            "boundCompatibilityReceiptSHA256": compat_sha,
            "boundChromeReceiptSHA256": chrome_sha}


def verify_all(args: argparse.Namespace) -> tuple[dict, list[str]]:
    report = {
        "toolchain": verify_toolchain(),
        "source": verify_parent_and_stage(args.stage_receipt),
        "jpg8": verify_jpg8_and_holds(),
        "compatibility": verify_compatibility(args.compat_receipt),
    }
    blockers: list[str] = []
    if args.chrome_receipt is None:
        blockers.append("MISSING_CHROME_STAGE_PASS_RECEIPT")
    else:
        report["chrome"] = verify_chrome(args.chrome_receipt)
    if args.reviewer_receipt is None:
        blockers.append("MISSING_INDEPENDENT_REVIEWER_GO_RECEIPT")
    elif args.chrome_receipt is None:
        blockers.append("REVIEWER_GO_CANNOT_BIND_WITHOUT_CHROME_RECEIPT")
    else:
        report["reviewer"] = verify_reviewer(
            args.reviewer_receipt,
            report["source"]["stageReceiptSHA256"],
            report["compatibility"]["sha256"],
            report["chrome"]["sha256"],
        )
    return report, blockers


def dry_run(args: argparse.Namespace) -> int:
    canonical_before = runtime_inventory(ROOT)
    try:
        report, blockers = verify_all(args)
    except Exception as error:
        canonical_after = runtime_inventory(ROOT)
        require(canonical_after == canonical_before, "canonical source changed during failed dry-run")
        payload = {
            "schema": "fcv588-p04-provenance-guarded-apply-dry-run-v5",
            "timestampUtc": datetime.now(timezone.utc).isoformat(),
            "status": "DRY_RUN_BLOCKED_VERIFICATION_FAILED",
            "canonicalApplied": False,
            "verificationError": str(error),
            "stageReceipt": str(args.stage_receipt),
            "stageReceiptSHA256": sha(args.stage_receipt) if args.stage_receipt.is_file() else None,
            "compatibilityReceipt": str(args.compat_receipt),
            "compatibilityReceiptSHA256": sha(args.compat_receipt) if args.compat_receipt.is_file() else None,
            "chromeReceipt": str(args.chrome_receipt) if args.chrome_receipt else None,
            "chromeReceiptSHA256": sha(args.chrome_receipt) if args.chrome_receipt and args.chrome_receipt.is_file() else None,
            "reviewerReceipt": str(args.reviewer_receipt) if args.reviewer_receipt else None,
            "reviewerReceiptSHA256": sha(args.reviewer_receipt) if args.reviewer_receipt and args.reviewer_receipt.is_file() else None,
            "applyArtifactsPreexisting": {
                "backup": BACKUP.exists(), "intent": INTENT.exists(),
                "journal": JOURNAL.exists(), "receipt": DONE.exists(),
            },
            "primeGoRequired": True,
            "primeGoTokenNotConsumed": True,
            "holds": {"rights": "HOLD", "hardware": "HOLD", "firmware": "HOLD",
                      "release": "HOLD", "featureClaims": "65/65 HOLD", "phase6": "OPEN"},
        }
        require(not any(payload["applyArtifactsPreexisting"].values()),
                "v5 apply artifacts already exist; inspect, never overwrite")
        write_exclusive(args.dry_run_receipt, serialized(payload))
        print(payload["status"])
        print("DRY_RUN_RECEIPT=" + str(args.dry_run_receipt))
        print("DRY_RUN_RECEIPT_SHA256=" + sha(args.dry_run_receipt))
        print("VERIFICATION_ERROR=" + str(error))
        return 2
    canonical_after = runtime_inventory(ROOT)
    require(canonical_after == canonical_before == report["source"]["canonicalRuntimeSHA256"],
            "canonical source39 changed during dry-run")
    payload = {
        "schema": "fcv588-p04-provenance-guarded-apply-dry-run-v5",
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "status": "DRY_RUN_READY_AWAITING_EXPLICIT_PRIME_GO" if not blockers
                  else "DRY_RUN_BLOCKED_PENDING_EXTERNAL_GATES",
        "canonicalApplied": False,
        "parentFinalSHA256": PARENT_FINAL_SHA,
        "parentPostSHA256": PARENT_POST_SHA,
        "stageReceiptSHA256": report["source"]["stageReceiptSHA256"],
        "compatibilityReceiptSHA256": report["compatibility"]["sha256"],
        "chromeReceiptSHA256": report.get("chrome", {}).get("sha256"),
        "reviewerReceiptSHA256": report.get("reviewer", {}).get("sha256"),
        "copyPaths": report["source"]["copyPaths"],
        "copyPathCount": len(report["source"]["copyPaths"]),
        "report": report,
        "blockers": blockers,
        "applyArtifactsPreexisting": {
            "backup": BACKUP.exists(), "intent": INTENT.exists(),
            "journal": JOURNAL.exists(), "receipt": DONE.exists(),
        },
        "primeGoRequired": True,
        "primeGoTokenNotConsumed": True,
        "holds": {"rights": "HOLD", "hardware": "HOLD", "firmware": "HOLD",
                  "release": "HOLD", "featureClaims": "65/65 HOLD", "phase6": "OPEN"},
    }
    require(not any(payload["applyArtifactsPreexisting"].values()),
            "v5 apply artifacts already exist; inspect, never overwrite")
    write_exclusive(args.dry_run_receipt, serialized(payload))
    print(payload["status"])
    print("DRY_RUN_RECEIPT=" + str(args.dry_run_receipt))
    print("DRY_RUN_RECEIPT_SHA256=" + sha(args.dry_run_receipt))
    print("CHROME_SCOPE=6 cases: 1366x768 x5 incl STOP + 375x812 x1; 1920 NOT TESTED/NOT CLAIMED")
    if blockers:
        print("BLOCKERS=" + ",".join(blockers))
        return 2
    return 0


def verify_ready_dry_run(path: Path, report: dict) -> dict:
    data = read_json(path)
    require(data.get("status") == "DRY_RUN_READY_AWAITING_EXPLICIT_PRIME_GO" and
            data.get("canonicalApplied") is False and not data.get("blockers"),
            "approved v5 dry-run is not READY")
    require(data.get("parentFinalSHA256") == PARENT_FINAL_SHA and
            data.get("parentPostSHA256") == PARENT_POST_SHA and
            data.get("stageReceiptSHA256") == report["source"]["stageReceiptSHA256"] and
            data.get("compatibilityReceiptSHA256") == report["compatibility"]["sha256"] and
            data.get("chromeReceiptSHA256") == report["chrome"]["sha256"] and
            data.get("reviewerReceiptSHA256") == report["reviewer"]["sha256"],
            "approved v5 dry-run evidence binding mismatch")
    return data


def build_backup(preimage: dict[str, bytes]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for rel, blob in preimage.items():
            archive.writestr(rel, blob)
        archive.writestr("PREIMAGE_MANIFEST.json", serialized({rel: digest(blob) for rel, blob in preimage.items()}))
    blob = buffer.getvalue()
    with zipfile.ZipFile(io.BytesIO(blob), "r") as archive:
        for rel, original in preimage.items():
            require(archive.read(rel) == original, "backup ZIP byte mismatch: " + rel)
    return blob


def apply(args: argparse.Namespace) -> int:
    require(args.prime_go == PRIME_GO_TOKEN, "explicit prime GO token required")
    require(args.reviewer_receipt is not None and args.chrome_receipt is not None,
            "apply requires exact Chrome PASS + reviewer GO")
    require(args.approved_dry_run_receipt is not None, "apply requires prior READY v5 dry-run receipt")
    require(all(not path.exists() for path in (BACKUP, INTENT, JOURNAL, DONE)),
            "v5 write-once apply artifacts already exist; never overwrite")

    report, blockers = verify_all(args)
    require(not blockers, "apply evidence blockers: " + repr(blockers))
    ready = verify_ready_dry_run(args.approved_dry_run_receipt, report)

    copy_paths = report["source"]["copyPaths"]
    existing_paths = [rel for rel in copy_paths if rel in report["source"]["preimageSHA256"]]
    new_paths = [rel for rel in copy_paths if rel not in report["source"]["preimageSHA256"]]
    require(len(copy_paths) == 8 and set(copy_paths) == EXACT_COPY_PATHS,
            "reviewed v5 copy path count/scope drift")
    require(set(new_paths) == {
        "test/fcv588-p04-bottom-provenance.test.mjs",
        "test/fcv588-p04-bottom-provenance-v2.test.mjs",
        "test/fcv588-p04-bottom-provenance-v3.test.mjs",
    }, "v5 new-test set drift before backup")
    preimage = {rel: (ROOT / rel).read_bytes() for rel in existing_paths}
    for rel, blob in preimage.items():
        require(digest(blob) == report["source"]["preimageSHA256"][rel],
                "canonical changed after READY dry-run: " + rel)
    require(all(not (ROOT / rel).exists() for rel in new_paths),
            "new provenance test appeared after READY dry-run")

    backup_blob = build_backup(preimage)
    write_exclusive(BACKUP, backup_blob)
    require(sha(BACKUP) == digest(backup_blob), "backup ZIP reread SHA mismatch")
    # Second absence guard after backup creation but before intent/journal or any
    # canonical copy. All three new tests must still be absent.
    require(all(not (ROOT / rel).exists() for rel in new_paths),
            "new provenance test appeared between backup and apply intent")

    intent = {
        "status": "APPLY_INTENT_CREATED_NOT_COMPLETION_PROOF",
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "parentFinalSHA256": PARENT_FINAL_SHA,
        "parentPostSHA256": PARENT_POST_SHA,
        "stageReceiptSHA256": report["source"]["stageReceiptSHA256"],
        "compatibilityReceiptSHA256": report["compatibility"]["sha256"],
        "chromeReceiptSHA256": report["chrome"]["sha256"],
        "chromeEventsSHA256": report["chrome"]["eventsSHA256"],
        "reviewerReceiptSHA256": report["reviewer"]["sha256"],
        "approvedDryRunReceiptSHA256": sha(args.approved_dry_run_receipt),
        "backupSHA256": sha(BACKUP),
        "copyPaths": copy_paths,
        "copyPathCount": len(copy_paths),
        "backupExistingPathCount": len(existing_paths),
        "absentNewTestPaths": new_paths,
        "strictPreimageSHA256": report["source"]["preimageSHA256"],
        "expectedPostimageSHA256": report["source"]["postimageSHA256"],
        "holds": ready["holds"],
    }
    write_exclusive(INTENT, serialized(intent))
    journal = {
        "status": "PLANNED_COPY_JOURNAL_PRE_MUTATION_NOT_COMPLETION_PROOF",
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "backupSHA256": sha(BACKUP), "intentSHA256": sha(INTENT),
        "operations": [
            {"ordinal": index + 1, "path": rel,
             "preimageSha256": report["source"]["preimageSHA256"].get(rel),
             "expectedPostimageSha256": report["source"]["postimageSHA256"][rel]}
            for index, rel in enumerate(copy_paths)
        ],
        "operationCount": len(copy_paths),
        "failurePolicy": "FAIL_CLOSED_KEEP_ZIP_INTENT_JOURNAL_NO_AUTORETRY",
    }
    write_exclusive(JOURNAL, serialized(journal))

    for rel in copy_paths:
        target, source = ROOT / rel, STAGE / rel
        expected_before = report["source"]["preimageSHA256"].get(rel)
        expected_after = report["source"]["postimageSHA256"][rel]
        if expected_before is None:
            require(not target.exists(), "new test appeared during apply: " + rel)
        else:
            require(sha(target) == expected_before, "canonical preimage changed during apply: " + rel)
        require(sha(source) == expected_after, "stage postimage changed during apply: " + rel)
        fd, temp_name = tempfile.mkstemp(prefix=".p04prov_v5_", suffix=".tmp", dir=target.parent)
        try:
            with os.fdopen(fd, "wb") as stream:
                stream.write(source.read_bytes())
            require(sha(Path(temp_name)) == expected_after, "temporary copy SHA mismatch: " + rel)
            os.replace(temp_name, target)
        finally:
            if os.path.exists(temp_name):
                os.unlink(temp_name)
        require(sha(target) == expected_after, "canonical post-copy SHA mismatch: " + rel)

    require(runtime_inventory(ROOT) == report["source"]["stageRuntimeSHA256"],
            "post-apply source39 != reviewed stage")
    for rel in [path for path in copy_paths if path.startswith("test/")]:
        require(sha(ROOT / rel) == report["source"]["postimageSHA256"][rel],
                "post-apply test SHA mismatch: " + rel)

    receipt = {
        "status": "P04_PROVENANCE_V5_CANONICAL_APPLY_COMPLETE_POSTAPPLY_QA_PENDING",
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "parentFinalSHA256": PARENT_FINAL_SHA,
        "parentPostSHA256": PARENT_POST_SHA,
        "stageReceiptSHA256": report["source"]["stageReceiptSHA256"],
        "compatibilityReceiptSHA256": report["compatibility"]["sha256"],
        "chromeReceiptSHA256": report["chrome"]["sha256"],
        "chromeEventsSHA256": report["chrome"]["eventsSHA256"],
        "reviewerReceiptSHA256": report["reviewer"]["sha256"],
        "backupPath": str(BACKUP), "backupSHA256": sha(BACKUP),
        "intentPath": str(INTENT), "intentSHA256": sha(INTENT),
        "journalPath": str(JOURNAL), "journalSHA256": sha(JOURNAL),
        "copyPaths": copy_paths,
        "copyPathCount": len(copy_paths),
        "postapplyRuntimeSHA256": report["source"]["stageRuntimeSHA256"],
        "testPostimageSHA256": {
            rel: report["source"]["postimageSHA256"][rel]
            for rel in copy_paths if rel.startswith("test/")
        },
        "chromeScope": report["chrome"]["scopeStatement"],
        "firmwareConformance": "HOLD", "hardwareValidated": False,
        "mediaRights": "HOLD", "releaseApproval": "HOLD",
        "phase6": "OPEN", "featureClaims": "65/65 HOLD",
        "postApplyNodePythonChrome": "REQUIRED_NOT_RUN_BY_APPLY_SCRIPT",
    }
    write_exclusive(DONE, serialized(receipt))
    print(f"APPLY_COMPLETE {len(copy_paths)}/{len(copy_paths)}; post-apply QA still required")
    print("BACKUP_SHA256=" + sha(BACKUP))
    print("APPLY_RECEIPT_SHA256=" + sha(DONE))
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.add_argument("--stage-receipt", type=Path, required=True)
    parser.add_argument("--compat-receipt", type=Path, required=True)
    parser.add_argument("--chrome-receipt", type=Path)
    parser.add_argument("--reviewer-receipt", type=Path)
    parser.add_argument("--dry-run-receipt", type=Path)
    parser.add_argument("--approved-dry-run-receipt", type=Path)
    parser.add_argument("--prime-go")
    args = parser.parse_args()
    if args.dry_run:
        require(args.dry_run_receipt is not None, "--dry-run requires --dry-run-receipt")
        raise SystemExit(dry_run(args))
    raise SystemExit(apply(args))
