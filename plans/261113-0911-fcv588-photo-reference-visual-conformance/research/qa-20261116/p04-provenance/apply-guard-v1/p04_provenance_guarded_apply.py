"""Guarded P04 bottom-provenance canonical apply helper.

Dry-run is read-only with respect to canonical runtime/tests. It validates the
sealed P05/P06 parent, exact worker12 stage postimages, Node/Python/compat QA,
eight reference-only JPGs and optional Chrome/reviewer evidence. --apply is
intentionally gated by an explicit prime token plus a prior READY dry-run
receipt. Existing receipts and historical RED evidence are never overwritten.
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
SELF_QA = QA / "apply-guard-v1"

PARENT_FINAL = ROOT / r"docs\qa\FCV588_VISUAL_P05_P06_20261116\FCV588_VISUAL_P05_P06_FINAL_INTEGRITY_20261116.json"
PARENT_POST = ROOT / r"docs\qa\FCV588_VISUAL_P05_P06_20261116\FCV588_VISUAL_P05_P06_INDEPENDENT_POSTRECEIPT_20261116.json"
PARENT_FINAL_SHA = "ecdfb0bc680f35a6935bb11a4bbadd1f95e3441069b7074a0b68ab22506b4ee4"
PARENT_POST_SHA = "9befe64829bf9c79fb7e0505fe1db83a5edf676ce1f4c22a7073ca3cd7a6160e"

STAGE_RECEIPT = QA / "P04_PROVENANCE_STAGE_RECEIPT_20261116.json"
STAGE_RECEIPT_SHA = "2e30a4ee7cf8a1baafa0ac9dc819c465edbe54b15f1bfc017642a38b56ea7132"
COMPAT_RECEIPT = QA / "P04_PROVENANCE_COMPAT_PROBE_RESULT_20261116.json"
COMPAT_RECEIPT_SHA = "3866e1bee1c1275326fce2e22b3f666ac995100e2756917b6827eaeac6a744a3"
NODE_LOG = QA / "p04-provenance-full-node.txt"
NODE_LOG_SHA = "4b99aa1234e8f491258ab705ba15bd1eef4759103aa9e318891726d4e0f6773f"
PY_LOG = QA / "p04-provenance-python.txt"
PY_LOG_SHA = "5ae2c2229785a9d52bba70f6b56fe6f56e203bb547b7cafc4a39c43e4896210a"
ORIGINAL_RED = QA.parent / "p04-extended" / "P04_NEAR_BOTTOM_FISH_ONLY_RED_RECEIPT_20261116.json"
ORIGINAL_RED_SHA = "c4d7ba7bcc7998dd48fd270541e7e694ee6a930d27809a5bb44b5d4bf2677690"

NODE_EXE = Path(r"C:\nvm4w\nodejs\node.exe")
EXPECTED_NODE = "v22.22.0"
EXPECTED_PROFILE = "F1-public-reference-21"

MOD_RUNTIME = {
    "src/core/scenario.mjs": (
        "9608428d5c530991f87d103f04186a7445899b551ee2e9571fdf40cce44c6be4",
        "149d5157c1bbb86fa7f0a68bd8b653c328095588633cec2998277210303b0778",
    ),
    "src/devices/fcv588/echo-projection.mjs": (
        "fffe1525832ba7776140d9e9a547789085d53848f5051d81b91561347b70e23a",
        "b38d5761da3b545ff2fde4017cae1e7f5c797de4dffc5210fc6c7cca012461ef",
    ),
    "web/app.mjs": (
        "7a995c2089b9eed90158c67ed1fed751dc2ded37e8130d5dbd727767175c62c7",
        "4bd5844222eadfc6e86f051f93cd07177490b08c4b1270b063c29e057de9604b",
    ),
    "web/fcv588-echo-rasterizer.mjs": (
        "a3becfa9a14f194869e7917438cdd51a82dbd7904feaed55357d3f4fff0c0d4c",
        "61a7be90bdc963586d405905b803d6abfcf08352a7ee7875b31166fce1bda699",
    ),
}

MOD_TEST = {
    "test/fcv588-photo-modes.test.mjs": (
        "85f201ba3697b6ae408f0bf64c6fcbdf81aed44553f3dfa47862eb4ca4fe2f7c",
        "a2b3c2787debd32684cefd747ca258c0b31e8b333c78057a3e47206cbf4bd124",
    ),
}

NEW_TEST = {
    "test/fcv588-p04-bottom-provenance.test.mjs":
        "15b6b41d3d6eb4df39b5d038752aeb9de353497aaa39ffc3470ad3a41e4f66d5",
}

ALL_COPY = tuple((*MOD_RUNTIME.keys(), *MOD_TEST.keys(), *NEW_TEST.keys()))
BACKUP_EXISTING = tuple((*MOD_RUNTIME.keys(), *MOD_TEST.keys()))

BACKUP = SELF_QA / "P04_PROVENANCE_BEFORE_APPLY_20261116.zip"
INTENT = SELF_QA / "P04_PROVENANCE_CANONICAL_APPLY_INTENT_20261116.json"
JOURNAL = SELF_QA / "P04_PROVENANCE_CANONICAL_APPLY_JOURNAL_20261116.json"
DONE = SELF_QA / "P04_PROVENANCE_CANONICAL_APPLY_RECEIPT_20261116.json"
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


def verify_toolchain() -> dict:
    require(sys.version_info[:2] == (3, 11), f"Python 3.11 required, got {sys.version.split()[0]}")
    require(NODE_EXE.is_file(), "Node22 absolute path missing")
    node = subprocess.check_output([str(NODE_EXE), "--version"], text=True).strip()
    require(node == EXPECTED_NODE, f"Node version drift: {node}")
    return {"python": sys.version.split()[0], "node": node, "nodePath": str(NODE_EXE)}


def verify_parent_and_stage() -> dict:
    require(sha(PARENT_FINAL) == PARENT_FINAL_SHA, "P05/P06 final seal SHA mismatch")
    require(sha(PARENT_POST) == PARENT_POST_SHA, "P05/P06 independent post SHA mismatch")
    parent = read_json(PARENT_FINAL)
    require(parent.get("runtimeCount") == 39 and len(parent.get("runtimeSHA256", {})) == 39,
            "parent runtime39 contract missing")
    require(parent.get("hardwareValidated") is False and parent.get("rightsClearance") == "HOLD" and
            parent.get("releaseApproval") == "HOLD" and parent.get("phase6") == "OPEN" and
            parent.get("featureClaims") == "65/65 HOLD", "parent HOLD gates drifted")

    require(sha(STAGE_RECEIPT) == STAGE_RECEIPT_SHA, "worker12 stage receipt SHA drift")
    stage_receipt = read_json(STAGE_RECEIPT)
    require(stage_receipt.get("status") == "P04_PROVENANCE_STAGE_QA_PASS_INDEPENDENT_REVIEW_PENDING",
            "unexpected worker12 stage receipt status")
    require(stage_receipt.get("canonicalSeals", {}).get("runtime39", {}).get("matches") == 39 and
            stage_receipt.get("canonicalSeals", {}).get("runtime39", {}).get("total") == 39,
            "worker12 parent runtime39 mismatch")
    require(stage_receipt.get("contractPreservation", {}).get("profileRevision") == EXPECTED_PROFILE and
            stage_receipt.get("contractPreservation", {}).get("companionSerializedIntoReplay") is False,
            "profile/replay preservation contract drift")

    canonical_runtime = runtime_inventory(ROOT)
    stage_runtime = runtime_inventory(STAGE)
    require(canonical_runtime == dict(sorted(parent["runtimeSHA256"].items())),
            "canonical runtime39 preimage no longer equals sealed P05/P06 parent")
    require(set(stage_runtime) == set(canonical_runtime), "stage runtime inventory added/deleted paths")
    changed = {path for path in stage_runtime if stage_runtime[path] != canonical_runtime[path]}
    require(changed == set(MOD_RUNTIME), "stage runtime diff is not exact 4-path allowlist")
    for rel, (before, after) in MOD_RUNTIME.items():
        require(canonical_runtime[rel] == before, "canonical strict preimage mismatch: " + rel)
        require(stage_runtime[rel] == after, "stage frozen postimage mismatch: " + rel)

    canonical_tests = test_inventory(ROOT)
    stage_tests = test_inventory(STAGE)
    require(set(stage_tests) == set(canonical_tests) | set(NEW_TEST),
            "stage test inventory added/deleted unexpected paths")
    changed_tests = {p for p in canonical_tests if stage_tests[p] != canonical_tests[p]}
    require(changed_tests == set(MOD_TEST), "stage modified unexpected existing tests")
    for rel, (before, after) in MOD_TEST.items():
        require(canonical_tests[rel] == before, "canonical modified-test preimage mismatch: " + rel)
        require(stage_tests[rel] == after, "stage modified-test postimage mismatch: " + rel)
    for rel, after in NEW_TEST.items():
        require(rel not in canonical_tests, "new provenance test already exists in canonical")
        require(stage_tests[rel] == after, "stage new-test postimage mismatch: " + rel)

    expected_allowlist = {
        **{p: ("MODIFIED", before, after) for p, (before, after) in MOD_RUNTIME.items()},
        **{p: ("MODIFIED", before, after) for p, (before, after) in MOD_TEST.items()},
        **{p: ("NEW", None, after) for p, after in NEW_TEST.items()},
    }
    actual_rows = stage_receipt.get("allowlist", {}).get("actual", [])
    actual = {row["path"]: (row["kind"], row.get("canonicalSha256"), row["stageSha256"])
              for row in actual_rows}
    require(actual == expected_allowlist, "stage receipt allowlist/postimages do not match frozen 4+2 set")

    return {
        "canonicalRuntimeSHA256": canonical_runtime,
        "stageRuntimeSHA256": stage_runtime,
        "canonicalTestCount": len(canonical_tests),
        "stageTestCount": len(stage_tests),
        "changedRuntimePaths": sorted(changed),
        "changedExistingTestPaths": sorted(changed_tests),
        "newTestPaths": sorted(NEW_TEST),
    }


def verify_jpg8_and_holds() -> dict:
    parent = read_json(PARENT_FINAL)
    photos = parent.get("photoReferenceSHA256", {})
    require(len(photos) == 8, "parent must pin exactly 8 original JPG references")
    rows = []
    for name, meta in sorted(photos.items()):
        require(meta.get("rights") == "REFERENCE_ONLY_CLEARANCE_NOT_OBTAINED",
                "photo rights unexpectedly changed: " + name)
        source = ROOT / "sources/FCV588_GiaoDienThucTeMay2016" / name
        require(sha(source) == meta["sha256"], "reference JPG mutated: " + name)
        rows.append({"name": name, "sha256": meta["sha256"], "rights": meta["rights"]})
    # No original JPG may have been copied into served runtime roots.
    for root in (STAGE / "src", STAGE / "web"):
        for file in root.rglob("*"):
            if file.is_file() and file.suffix.lower() in (".jpg", ".jpeg"):
                raise RuntimeError("JPG copied into stage runtime: " + str(file))
    return {"count": len(rows), "photos": rows, "rightsClearance": "HOLD"}


def verify_static_qa() -> dict:
    require(sha(ORIGINAL_RED) == ORIGINAL_RED_SHA, "historical P04 RED receipt mutated")
    require(sha(NODE_LOG) == NODE_LOG_SHA, "Node559 log SHA drift")
    require(sha(PY_LOG) == PY_LOG_SHA, "Python13 log SHA drift")
    require(sha(COMPAT_RECEIPT) == COMPAT_RECEIPT_SHA, "compatibility PASS receipt SHA drift")

    node_text = NODE_LOG.read_text(encoding="utf-8", errors="replace")
    py_text = PY_LOG.read_text(encoding="utf-8", errors="replace")
    compat = read_json(COMPAT_RECEIPT)
    require(re.search(r"(?m)^# tests 559\s*$", node_text) and
            re.search(r"(?m)^# pass 559\s*$", node_text) and
            re.search(r"(?m)^# fail 0\s*$", node_text), "Node559 evidence missing/failing")
    require("Ran 13 tests" in py_text and re.search(r"(?m)^OK\s*$", py_text),
            "Python13 evidence missing/failing")
    require(compat.get("status") == "PASS" and compat.get("profileRevision") == EXPECTED_PROFILE and
            compat.get("observation", {}).get("existingFieldsIdentical") is True and
            compat.get("observation", {}).get("rawChannelsIdentical") is True,
            "compatibility probe did not prove profile21/session/raw compatibility")
    return {
        "node559": NODE_LOG_SHA,
        "python13": PY_LOG_SHA,
        "compatibilityPass": COMPAT_RECEIPT_SHA,
        "historicalRed": ORIGINAL_RED_SHA,
    }


def viewport_width(case: dict) -> int | None:
    viewport = case.get("viewport", {}) if isinstance(case, dict) else {}
    value = viewport.get("width", viewport.get("w")) if isinstance(viewport, dict) else None
    if value is None and isinstance(case, dict):
        value = case.get("width", case.get("w"))
    return int(value) if isinstance(value, (int, float)) else None


def verify_chrome(path: Path) -> dict:
    data = read_json(path)
    status = str(data.get("overallStatus", data.get("status", ""))).upper()
    require(status == "PASS", "Chrome stage receipt is not PASS")
    require(Path(data.get("stageRoot", "")) == STAGE, "Chrome receipt tested a different stage")

    stable = data.get("sourceTreeStable") is True or data.get("sourceStable") is True
    before = data.get("sourceManifestBefore")
    after = data.get("sourceManifestAfter")
    if before is not None and after is not None:
        stable = stable or before == after
    require(stable, "Chrome receipt does not prove source stability")

    cases = data.get("cases")
    require(isinstance(cases, list) and len(cases) >= 3, "Chrome receipt needs >=3 cases")
    require(all(str(case.get("status", "")).upper() == "PASS" for case in cases),
            "Chrome case failure")
    widths = {viewport_width(case) for case in cases}
    require({375, 1366, 1920}.issubset(widths), "Chrome must cover 375/1366/1920")

    photo_deny = data.get("photoDeny")
    if isinstance(photo_deny, dict):
        require(str(photo_deny.get("status", "")).upper() == "PASS", "Chrome photoDeny failed")
        photo_rows = photo_deny.get("paths", [])
    else:
        photo_rows = photo_deny if isinstance(photo_deny, list) else []
    require(len(photo_rows) == 8 and all(row.get("statusCode") == 404 for row in photo_rows),
            "Chrome must prove all 8 OEM/reference photo URLs return 404")

    require(data.get("serverCleanup") == "PASS", "Chrome QA server cleanup missing/failed")
    require(not data.get("objectiveFailures", []), "Chrome objective failures present")
    require(not data.get("errors", []), "Chrome errors present")

    body_attested = False
    screenshots = {}
    for case in cases:
        counts = case.get("errorCounts")
        if isinstance(counts, dict):
            require(not any(counts.values()), "Chrome case error counts nonzero")
        require(not case.get("consoleOrNetworkErrors", []), "Chrome console/network error")
        loaded = case.get("loadedBodies", case.get("loaded"))
        if isinstance(loaded, list) and loaded:
            for row in loaded:
                if "matches" in row:
                    require(row["matches"] is True, "Chrome loaded body/source mismatch")
                    body_attested = True
                elif "bodySHA256" in row and "sourceSHA256" in row:
                    require(row["bodySHA256"] == row["sourceSHA256"], "Chrome response/source SHA mismatch")
                    body_attested = True
        count = case.get("loadedBodyCount")
        matches = case.get("loadedBodyMatches")
        if isinstance(count, int) and isinstance(matches, int):
            require(count > 0 and count == matches, "Chrome loadedBodyCount mismatch")
            body_attested = True
        shot = case.get("screenshot")
        if isinstance(shot, dict) and shot.get("path") and shot.get("sha256"):
            shot_path = Path(shot["path"])
            require(sha(shot_path) == shot["sha256"], "Chrome screenshot SHA mismatch")
            screenshots[str(shot_path)] = shot["sha256"]
    require(body_attested, "Chrome receipt lacks actual response-body/source attestation")
    require(len(screenshots) >= 3, "Chrome receipt needs >=3 bound screenshots")
    return {"path": str(path), "sha256": sha(path), "viewWidths": sorted(w for w in widths if w),
            "screenshots": screenshots}


def reviewer_decision(data: dict) -> str:
    for key in ("decision", "verdict", "recommendation", "status"):
        value = data.get(key)
        if isinstance(value, str):
            upper = value.upper().strip()
            if upper in ("GO", "PASS", "APPROVE", "APPROVED") or upper.startswith("GO_"):
                return "GO"
            if "NO-GO" in upper or "NO_GO" in upper or upper in ("FAIL", "REJECT", "REJECTED"):
                return "NO-GO"
    return "UNKNOWN"


def verify_reviewer(path: Path, chrome_sha: str) -> dict:
    data = read_json(path)
    require(reviewer_decision(data) == "GO", "independent reviewer did not record GO")
    require(Path(data.get("stageRoot", "")) == STAGE, "reviewer GO bound to a different stage")
    strings = flatten_strings(data)
    require(STAGE_RECEIPT_SHA in strings, "reviewer GO does not bind worker12 stage receipt SHA")
    require(COMPAT_RECEIPT_SHA in strings, "reviewer GO does not bind compatibility receipt SHA")
    require(chrome_sha in strings, "reviewer GO does not bind Chrome stage receipt SHA")
    return {"path": str(path), "sha256": sha(path), "decision": "GO"}


def verify_all(chrome_receipt: Path | None, reviewer_receipt: Path | None) -> tuple[dict, list[str]]:
    report = {
        "toolchain": verify_toolchain(),
        "source": verify_parent_and_stage(),
        "jpg8": verify_jpg8_and_holds(),
        "qa": verify_static_qa(),
    }
    blockers: list[str] = []
    if chrome_receipt is None:
        blockers.append("MISSING_CHROME_STAGE_PASS_RECEIPT")
    else:
        report["chrome"] = verify_chrome(chrome_receipt)
    if reviewer_receipt is None:
        blockers.append("MISSING_INDEPENDENT_REVIEWER_GO_RECEIPT")
    elif chrome_receipt is None:
        blockers.append("REVIEWER_GO_CANNOT_BE_BOUND_WITHOUT_CHROME_RECEIPT")
    else:
        report["reviewer"] = verify_reviewer(reviewer_receipt, report["chrome"]["sha256"])
    return report, blockers


def dry_run(args: argparse.Namespace) -> int:
    report, blockers = verify_all(args.chrome_receipt, args.reviewer_receipt)
    canonical_after = runtime_inventory(ROOT)
    require(canonical_after == report["source"]["canonicalRuntimeSHA256"],
            "canonical runtime changed during dry-run")
    payload = {
        "schema": "fcv588-p04-provenance-guarded-apply-dry-run-v1",
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "status": "DRY_RUN_READY_AWAITING_EXPLICIT_PRIME_GO" if not blockers
                  else "DRY_RUN_BLOCKED_PENDING_EXTERNAL_GATES",
        "canonicalApplied": False,
        "copyPaths": list(ALL_COPY),
        "parentFinalSHA256": PARENT_FINAL_SHA,
        "parentPostSHA256": PARENT_POST_SHA,
        "stageReceiptSHA256": STAGE_RECEIPT_SHA,
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
            "apply artifacts already exist; inspect them, never overwrite/re-run blindly")
    write_exclusive(args.dry_run_receipt, serialized(payload))
    print(payload["status"])
    print("DRY_RUN_RECEIPT=" + str(args.dry_run_receipt))
    print("DRY_RUN_RECEIPT_SHA256=" + sha(args.dry_run_receipt))
    if blockers:
        print("BLOCKERS=" + ",".join(blockers))
        return 2
    print("EXACT_COPY_PATHS=" + repr(list(ALL_COPY)))
    return 0


def verify_ready_dry_run(path: Path, chrome_sha: str, reviewer_sha: str) -> dict:
    data = read_json(path)
    require(data.get("status") == "DRY_RUN_READY_AWAITING_EXPLICIT_PRIME_GO",
            "approved dry-run receipt is not READY")
    require(data.get("canonicalApplied") is False and not data.get("blockers"),
            "approved dry-run has mutation/blockers")
    require(data.get("parentFinalSHA256") == PARENT_FINAL_SHA and
            data.get("parentPostSHA256") == PARENT_POST_SHA and
            data.get("stageReceiptSHA256") == STAGE_RECEIPT_SHA,
            "approved dry-run parent/stage binding mismatch")
    require(data.get("report", {}).get("chrome", {}).get("sha256") == chrome_sha and
            data.get("report", {}).get("reviewer", {}).get("sha256") == reviewer_sha,
            "approved dry-run external evidence binding mismatch")
    return data


def build_backup(preimage: dict[str, bytes]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as archive:
        for rel, blob in preimage.items():
            archive.writestr(rel, blob)
        archive.writestr("PREIMAGE_MANIFEST.json", serialized({rel: digest(blob) for rel, blob in preimage.items()}))
    blob = buf.getvalue()
    with zipfile.ZipFile(io.BytesIO(blob), "r") as archive:
        for rel, original in preimage.items():
            require(archive.read(rel) == original, "backup ZIP byte mismatch: " + rel)
    return blob


def apply(args: argparse.Namespace) -> int:
    require(args.prime_go == PRIME_GO_TOKEN, "explicit prime GO token required")
    require(args.chrome_receipt is not None and args.reviewer_receipt is not None,
            "apply requires Chrome PASS and reviewer GO receipts")
    require(args.approved_dry_run_receipt is not None, "apply requires a prior READY dry-run receipt")
    require(all(not p.exists() for p in (BACKUP, INTENT, JOURNAL, DONE)),
            "write-once apply artifacts already exist; never overwrite")

    report, blockers = verify_all(args.chrome_receipt, args.reviewer_receipt)
    require(not blockers, "apply external evidence blockers: " + repr(blockers))
    chrome_sha = report["chrome"]["sha256"]
    reviewer_sha = report["reviewer"]["sha256"]
    ready = verify_ready_dry_run(args.approved_dry_run_receipt, chrome_sha, reviewer_sha)

    preimage = {rel: (ROOT / rel).read_bytes() for rel in BACKUP_EXISTING}
    for rel, blob in preimage.items():
        expected = MOD_RUNTIME.get(rel, MOD_TEST.get(rel))[0]
        require(digest(blob) == expected, "canonical changed after READY dry-run: " + rel)
    require(all(not (ROOT / rel).exists() for rel in NEW_TEST), "new test appeared after READY dry-run")

    backup_blob = build_backup(preimage)
    write_exclusive(BACKUP, backup_blob)
    require(sha(BACKUP) == digest(backup_blob), "backup ZIP reread SHA mismatch")
    now = datetime.now(timezone.utc).isoformat()
    intent = {
        "status": "APPLY_INTENT_CREATED_NOT_COMPLETION_PROOF",
        "timestampUtc": now,
        "parentFinalSHA256": PARENT_FINAL_SHA,
        "parentPostSHA256": PARENT_POST_SHA,
        "stageReceiptSHA256": STAGE_RECEIPT_SHA,
        "approvedDryRunReceipt": str(args.approved_dry_run_receipt),
        "approvedDryRunReceiptSHA256": sha(args.approved_dry_run_receipt),
        "chromeReceiptSHA256": chrome_sha,
        "reviewerReceiptSHA256": reviewer_sha,
        "backupSHA256": sha(BACKUP),
        "copyPaths": list(ALL_COPY),
        "strictPreimageSHA256": {rel: digest(blob) for rel, blob in preimage.items()},
        "expectedPostimageSHA256": {
            **{rel: after for rel, (_, after) in MOD_RUNTIME.items()},
            **{rel: after for rel, (_, after) in MOD_TEST.items()},
            **NEW_TEST,
        },
        "holds": ready["holds"],
    }
    write_exclusive(INTENT, serialized(intent))
    journal = {
        "status": "PLANNED_COPY_JOURNAL_PRE_MUTATION_NOT_COMPLETION_PROOF",
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "backupSHA256": sha(BACKUP), "intentSHA256": sha(INTENT),
        "operations": [
            {"ordinal": index + 1, "path": rel,
             "preimageSha256": intent["strictPreimageSHA256"].get(rel),
             "expectedPostimageSha256": intent["expectedPostimageSHA256"][rel]}
            for index, rel in enumerate(ALL_COPY)
        ],
        "failurePolicy": "FAIL_CLOSED_KEEP_ZIP_INTENT_JOURNAL_NO_AUTORETRY",
    }
    write_exclusive(JOURNAL, serialized(journal))

    # Atomic per-file replace. A partial failure intentionally leaves backup,
    # intent and journal for manual recovery; this script never auto-retries.
    for rel in ALL_COPY:
        target = ROOT / rel
        source = STAGE / rel
        if rel in MOD_RUNTIME:
            require(sha(target) == MOD_RUNTIME[rel][0], "runtime preimage changed during apply: " + rel)
            expected = MOD_RUNTIME[rel][1]
        elif rel in MOD_TEST:
            require(sha(target) == MOD_TEST[rel][0], "test preimage changed during apply: " + rel)
            expected = MOD_TEST[rel][1]
        else:
            require(not target.exists(), "new test appeared during apply: " + rel)
            expected = NEW_TEST[rel]
        require(sha(source) == expected, "stage source drift during apply: " + rel)
        fd, temp_name = tempfile.mkstemp(prefix=".p04prov_", suffix=".tmp", dir=target.parent)
        try:
            with os.fdopen(fd, "wb") as stream:
                stream.write(source.read_bytes())
            temp = Path(temp_name)
            require(sha(temp) == expected, "temporary copy SHA mismatch: " + rel)
            os.replace(temp_name, target)
        finally:
            if os.path.exists(temp_name):
                os.unlink(temp_name)
        require(sha(target) == expected, "canonical post-copy SHA mismatch: " + rel)

    expected_runtime = report["source"]["stageRuntimeSHA256"]
    require(runtime_inventory(ROOT) == expected_runtime, "post-apply runtime39 != frozen stage")
    for rel, (_, after) in MOD_TEST.items():
        require(sha(ROOT / rel) == after, "post-apply modified test mismatch: " + rel)
    for rel, after in NEW_TEST.items():
        require(sha(ROOT / rel) == after, "post-apply new test mismatch: " + rel)

    receipt = {
        "status": "P04_PROVENANCE_CANONICAL_APPLY_COMPLETE_POSTAPPLY_QA_PENDING",
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "parentFinalSHA256": PARENT_FINAL_SHA,
        "parentPostSHA256": PARENT_POST_SHA,
        "stageReceiptSHA256": STAGE_RECEIPT_SHA,
        "backupPath": str(BACKUP), "backupSHA256": sha(BACKUP),
        "intentPath": str(INTENT), "intentSHA256": sha(INTENT),
        "journalPath": str(JOURNAL), "journalSHA256": sha(JOURNAL),
        "approvedDryRunReceiptSHA256": sha(args.approved_dry_run_receipt),
        "chromeReceiptSHA256": chrome_sha,
        "reviewerReceiptSHA256": reviewer_sha,
        "copyPaths": list(ALL_COPY),
        "postapplyRuntimeSHA256": expected_runtime,
        "testPostimageSHA256": {**{rel: after for rel, (_, after) in MOD_TEST.items()}, **NEW_TEST},
        "firmwareConformance": "HOLD", "hardwareValidated": False,
        "mediaRights": "HOLD", "releaseApproval": "HOLD",
        "phase6": "OPEN", "featureClaims": "65/65 HOLD",
        "postApplyNodePythonChrome": "REQUIRED_NOT_RUN_BY_APPLY_SCRIPT",
    }
    write_exclusive(DONE, serialized(receipt))
    print("APPLY_COMPLETE 6/6; post-apply QA still required")
    print("BACKUP_SHA256=" + sha(BACKUP))
    print("APPLY_RECEIPT_SHA256=" + sha(DONE))
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.add_argument("--dry-run-receipt", type=Path,
                        help="new write-once dry-run JSON receipt path")
    parser.add_argument("--chrome-receipt", type=Path)
    parser.add_argument("--reviewer-receipt", type=Path)
    parser.add_argument("--approved-dry-run-receipt", type=Path)
    parser.add_argument("--prime-go")
    args = parser.parse_args()
    if args.dry_run:
        require(args.dry_run_receipt is not None, "--dry-run requires --dry-run-receipt")
        raise SystemExit(dry_run(args))
    raise SystemExit(apply(args))
