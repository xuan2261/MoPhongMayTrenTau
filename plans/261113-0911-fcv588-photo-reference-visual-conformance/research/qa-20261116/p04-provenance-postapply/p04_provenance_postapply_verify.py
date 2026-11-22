"""Read-only post-apply verifier for P04 provenance v3.

This script never starts a server/browser, never invokes Node, and never writes
canonical/staging source. Its only optional write is the explicitly supplied
write-once QA receipt under p04-provenance-postapply.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT / r"staging\fcv588-p04-bottom-provenance-20261116"
QA_ROOT = ROOT / r"plans\261113-0911-fcv588-photo-reference-visual-conformance\research\qa-20261116"
OUT_ROOT = QA_ROOT / "p04-provenance-postapply"

P04_FINAL = ROOT / r"docs\qa\FCV588_VISUAL_P04_20261114\FCV588_VISUAL_P04_FINAL_INTEGRITY_20261114.json"
P04_POST = ROOT / r"docs\qa\FCV588_VISUAL_P04_20261114\FCV588_VISUAL_P04_INDEPENDENT_POSTRECEIPT_20261114.json"
P05P06_FINAL = ROOT / r"docs\qa\FCV588_VISUAL_P05_P06_20261116\FCV588_VISUAL_P05_P06_FINAL_INTEGRITY_20261116.json"
P05P06_POST = ROOT / r"docs\qa\FCV588_VISUAL_P05_P06_20261116\FCV588_VISUAL_P05_P06_INDEPENDENT_POSTRECEIPT_20261116.json"
OLD_RED = QA_ROOT / r"p04-extended\P04_NEAR_BOTTOM_FISH_ONLY_RED_RECEIPT_20261116.json"
OLD_RED_LOG = QA_ROOT / r"p04-extended\p04-near-bottom-fish-only-red-v1.txt"

SEALED = {
    P04_FINAL: "c3a292dc213e660fa855c453eaf324fd9014ddb163e4723cea141a4050a1382b",
    P04_POST: "569e4b99a8e8de49502d74db30c0215eb61b238edf3ddaa4d93f6d7ed6b4ec90",
    P05P06_FINAL: "ecdfb0bc680f35a6935bb11a4bbadd1f95e3441069b7074a0b68ab22506b4ee4",
    P05P06_POST: "9befe64829bf9c79fb7e0505fe1db83a5edf676ce1f4c22a7073ca3cd7a6160e",
    OLD_RED: "c4d7ba7bcc7998dd48fd270541e7e694ee6a930d27809a5bb44b5d4bf2677690",
    OLD_RED_LOG: "e336be0e97bfd856df008728eed711e2a593c619aaa4132783bbf3ca3ddbbf51",
}

EXACT_RUNTIME4 = {
    "src/core/scenario.mjs",
    "src/devices/fcv588/echo-projection.mjs",
    "web/app.mjs",
    "web/fcv588-echo-rasterizer.mjs",
}
EXACT_TEST4 = {
    "test/fcv588-photo-modes.test.mjs",
    "test/fcv588-p04-bottom-provenance.test.mjs",
    "test/fcv588-p04-bottom-provenance-v2.test.mjs",
    "test/fcv588-p04-bottom-provenance-v3.test.mjs",
}
EXACT8 = EXACT_RUNTIME4 | EXACT_TEST4
EXPECTED_CASES = {
    "BL-LF-Blue",
    "BL-HF-Blue",
    "BZ-LF-Blue",
    "MZ-LF-Blue",
    "STOP-BL-LF-Blue-BZ-Standard",
    "BL-LF-Blue-MOBILE-MENU-D15",
}
PHOTOS = {
    "giaoDien.jpg": "e7b78466fa582dc0cc50aec8e2fc264f8b3ee187d93a53cace1e88d1e156c99c",
    "lf.jpg": "c3ef46a27fc965c95d2df33981b0c66775b848ae96aa8efdcad932b91a50c3ef",
    "hf.jpg": "7f1a69504fd703988750729ee38b4964229480a4c55b20ae0f0bb4815f6ea2a9",
    "dual.jpg": "4d88fe11cda8a9107f97e44a392103cc68eb8ab8e685b7b5e7408a556a2bc37b",
    "zoom.jpg": "ecc7af35e30aafb8f0e9cfe9f05f94c8d529d6d410a2e523053286149d330b52",
    "zoom2.jpg": "41eaa80b42450b36c3b0f547b9276e26703ce1b74d2f85b1393255fda42bcd99",
    "nav1.jpg": "b90de3afeb18730e10e4ac897fb20bbde36155e25cc344abed259ba1de0d030e",
    "nav2.jpg": "9f225c6834efe86c76fd8a86bbfaa8f6d276f1e055a815efc91087a832397de6",
}
HOLDS = {
    "phase6": "OPEN",
    "featureClaims": "65/65 HOLD",
    "hardware": "HOLD",
    "firmware": "HOLD",
    "rights": "HOLD",
    "release": "HOLD",
}


def require(ok: bool, message: str) -> None:
    if not ok:
        raise RuntimeError(message)


def sha(path: Path) -> str:
    require(path.is_file(), "missing file: " + str(path))
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_once(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, "wb") as stream:
        stream.write(data)


def runtime_inventory(root: Path) -> dict[str, str]:
    rows: dict[str, str] = {}
    for folder in ("src", "web"):
        for path in (root / folder).rglob("*"):
            if path.is_file() and path.suffix.lower() in {".mjs", ".js", ".css", ".svg", ".html"}:
                rows[path.relative_to(root).as_posix()] = sha(path)
    return dict(sorted(rows.items()))


def sealed_evidence() -> dict:
    rows = []
    for path, expected in SEALED.items():
        actual = sha(path)
        require(actual == expected, "sealed evidence drift: " + str(path))
        rows.append({"path": str(path), "sha256": actual})
    return {"status": "PASS", "rows": rows}


def verify_jpg8() -> dict:
    source = ROOT / r"sources\FCV588_GiaoDienThucTeMay2016"
    rows = []
    for name, expected in sorted(PHOTOS.items()):
        path = source / name
        actual = sha(path)
        require(actual == expected, "reference photo SHA drift: " + name)
        rows.append({"name": name, "sha256": actual, "rights": "REFERENCE_ONLY"})
    runtime_copies = []
    for root_name, root in (("canonical", ROOT), ("stage", STAGE)):
        for folder in ("src", "web"):
            for path in (root / folder).rglob("*"):
                if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg"}:
                    runtime_copies.append({"root": root_name, "path": str(path.relative_to(root))})
    require(not runtime_copies, "reference JPEG copied into runtime: " + repr(runtime_copies))
    return {"status": "PASS", "count": 8, "photos": rows,
            "runtimeCopies": runtime_copies, "rightsClearance": "HOLD"}


def holds_from_stage(data: dict) -> dict:
    src = data.get("holds", {})
    normalized = {
        "phase6": src.get("phase6") or src.get("phase6F1"),
        "featureClaims": src.get("featureClaims"),
        "hardware": src.get("hardware"),
        "firmware": src.get("firmware"),
        "rights": src.get("rights"),
        "release": src.get("release"),
    }
    require(normalized == HOLDS, "stage HOLD contract drift: " + repr(normalized))
    return normalized


def verify_stage(stage_receipt_path: Path) -> dict:
    data = read_json(stage_receipt_path)
    status = str(data.get("status", ""))
    require("PASS" in status and "FAILED" not in status, "stage receipt is not PASS")
    require(Path(data.get("stageRoot", "")) == STAGE, "stage receipt root mismatch")
    allow = data.get("canonicalDiffAllowlist", {})
    require(allow.get("status") == "EXACT_8_PATHS",
            "stage receipt does not declare EXACT_8_PATHS")
    expected = allow.get("expected", {})
    actual_rows = allow.get("actual", [])
    require(set(expected) == EXACT8, "stage expected allowlist != exact 8 paths")
    require(len(actual_rows) == 8 and {row.get("path") for row in actual_rows} == EXACT8,
            "stage actual allowlist != exact 8 paths")
    source_sha = data.get("sourceSha256", {})
    require(set(source_sha) == EXACT8, "stage source SHA map != exact 8 paths")
    for rel in EXACT8:
        require(sha(STAGE / rel) == source_sha[rel], "live stage SHA drift: " + rel)
    parent = read_json(P05P06_FINAL)
    parent_runtime = dict(sorted(parent.get("runtimeSHA256", {}).items()))
    require(parent.get("runtimeCount") == 39 and len(parent_runtime) == 39,
            "P05/P06 sealed runtime39 missing")
    stage_runtime = runtime_inventory(STAGE)
    require(len(stage_runtime) == 39 and set(stage_runtime) == set(parent_runtime),
            "stage runtime inventory != sealed runtime39 path set")
    changed = {rel for rel in stage_runtime if stage_runtime[rel] != parent_runtime[rel]}
    require(changed == EXACT_RUNTIME4, "stage runtime delta != exact runtime4")
    return {
        "path": str(stage_receipt_path), "sha256": sha(stage_receipt_path),
        "schema": data.get("schema"), "status": status,
        "sourceSha256": source_sha, "runtimeSHA256": stage_runtime,
        "runtimeCount": 39, "holds": holds_from_stage(data),
    }


def verify_compat(path: Path) -> dict:
    data = read_json(path)
    require(data.get("status") == "PASS", "compatibility receipt not PASS")
    require(data.get("profileRevision") == "F1-public-reference-21", "profile revision drift")
    observation = data.get("observation", {})
    require(observation.get("existingFieldsIdentical") is True and
            observation.get("rawChannelsIdentical") is True,
            "compatibility raw/observation equivalence missing")
    return {"path": str(path), "sha256": sha(path), "status": "PASS",
            "profileRevision": data.get("profileRevision")}


def verify_reviewer(path: Path, stage_sha: str) -> dict:
    data = read_json(path)
    decision = str(data.get("decision") or data.get("verdict") or "").upper().strip()
    require(decision == "GO" or decision.startswith("GO_"), "reviewer receipt is not explicit GO")
    require(Path(data.get("stageRoot", "")) == STAGE, "reviewer GO stage root mismatch")
    require(stage_sha in json.dumps(data), "reviewer GO does not bind stage receipt SHA")
    return {"path": str(path), "sha256": sha(path), "decision": "GO"}


def verify_guard(path: Path, stage: dict) -> dict:
    data = read_json(path)
    status = str(data.get("status", ""))
    require("CANONICAL_APPLY_COMPLETE" in status and "PENDING" in status,
            "guard receipt does not prove completed apply with QA pending")
    require(data.get("copyPaths") and set(data["copyPaths"]) == EXACT8,
            "guard copyPaths != exact 8")
    require(data.get("stageReceiptSHA256") == stage["sha256"],
            "guard not bound to exact stage receipt")
    require(data.get("postapplyRuntimeSHA256") == stage["runtimeSHA256"],
            "guard postapply runtime map != reviewed stage39")
    require(data.get("featureClaims") == "65/65 HOLD" and data.get("phase6") == "OPEN" and
            data.get("firmwareConformance") == "HOLD" and data.get("hardwareValidated") is False and
            data.get("mediaRights") == "HOLD" and data.get("releaseApproval") == "HOLD",
            "guard HOLD contract drift")
    return {"path": str(path), "sha256": sha(path), "status": status,
            "copyPaths": data["copyPaths"]}


def parse_node_log(path: Path) -> dict:
    text = path.read_text(encoding="utf-8", errors="replace")
    tests = re.search(r"(?m)^# tests (\d+)\s*$", text)
    passed = re.search(r"(?m)^# pass (\d+)\s*$", text)
    failed = re.search(r"(?m)^# fail (\d+)\s*$", text)
    require(tests and passed and failed, "canonical Node summary missing")
    t, p, f = map(int, (tests.group(1), passed.group(1), failed.group(1)))
    require(t == p and f == 0 and t >= 562, "canonical Node suite not all-PASS")
    return {"path": str(path), "sha256": sha(path), "tests": t, "pass": p, "fail": f}


def parse_python_log(path: Path) -> dict:
    text = path.read_text(encoding="utf-8", errors="replace")
    match = re.search(r"Ran (\d+) tests?", text)
    require(match and int(match.group(1)) == 13 and re.search(r"(?m)^OK\s*$", text),
            "canonical Python suite is not 13/13 OK")
    return {"path": str(path), "sha256": sha(path), "tests": 13, "status": "OK"}


def manifest_map(path: Path) -> dict[str, str]:
    result = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        digest, name = line.split(" *", 1)
        result[name] = digest
    return result


def verify_browser(path: Path, expected_root: Path, expected_port: int) -> dict:
    receipt = read_json(path)
    require(Path(receipt.get("stageRoot", "")) == expected_root, "browser root mismatch")
    require(receipt.get("port") == expected_port, "browser port mismatch")
    require(receipt.get("overallStatus") == "PASS" and receipt.get("serverCleanup") == "PASS" and
            receipt.get("sourceTreeStable") is True, "browser receipt not stable PASS")
    require(receipt.get("sourceManifestBefore") == receipt.get("sourceManifestAfter"),
            "browser source manifest changed")
    cases = receipt.get("cases", [])
    require(len(cases) == 6 and {case.get("name") for case in cases} == EXPECTED_CASES,
            "browser case set != required 6 cases")
    for case in cases:
        require(case.get("status") == "PASS" and not case.get("objectiveFailures"),
                "browser case failed: " + str(case.get("name")))
        require(all(value == 0 for value in case.get("errorCounts", {}).values()),
                "browser error counts nonzero: " + str(case.get("name")))
    stop = next(case for case in cases if case.get("name") == "STOP-BL-LF-Blue-BZ-Standard")
    proof = stop.get("stopBottomZoneProof", {})
    require(proof.get("bottomZone") == "Standard" and proof.get("pictureAdvance") == "Stop" and
            proof.get("bottomZoneWitnessChanged") is True and proof.get("canvasStable") is True and
            proof.get("changedPixelCount") == 0 and proof.get("changedPixelBoundingBox") is None and
            int(proof.get("tickAfter", -1)) > int(proof.get("tickBefore", -1)),
            "Stop/Bottom Zone rendered-overlay proof missing or failed")
    photo = receipt.get("photoDeny", {})
    rows = photo.get("paths", [])
    require(photo.get("status") == "PASS" and len(rows) == 8 and
            {row.get("name") for row in rows} == set(PHOTOS) and
            all(row.get("statusCode") == 404 and row.get("status") == "PASS" for row in rows),
            "browser JPG8 HTTP404 gate failed")

    stem = path.stem
    events_path = path.with_name(stem + "-events.json")
    manifest_path = path.with_name(stem + "-sha256.txt")
    require(events_path.is_file() and manifest_path.is_file(), "browser events/manifest missing")
    manifest = manifest_map(manifest_path)
    require(manifest.get(path.name) == sha(path) and manifest.get(events_path.name) == sha(events_path),
            "browser manifest does not bind receipt/events")
    for key in ("backingBefore", "backingAfter"):
        backing = proof.get(key, {})
        backing_path = Path(backing.get("path", ""))
        backing_sha = backing.get("sha256")
        require(backing_path.is_file() and backing_sha and sha(backing_path) == backing_sha and
                manifest.get(backing_path.name) == backing_sha,
                "Stop backing PNG evidence/manifest mismatch: " + key)
    events = read_json(events_path)
    raw_cases = events.get("cases", [])
    require(len(raw_cases) == 6, "browser events case count mismatch")
    loaded_total = 0
    for raw in raw_cases:
        loaded = raw.get("loadedBodies", [])
        require(loaded, "browser loaded-body evidence empty")
        for row in loaded:
            rel = row.get("path")
            source = expected_root / rel
            actual = sha(source)
            require(row.get("matches") is True and
                    row.get("bodySha256") == row.get("sourceSha256") == actual,
                    "browser response/source SHA mismatch: " + str(rel))
        loaded_total += len(loaded)
    for case in cases:
        shot = Path(case.get("screenshot", {}).get("path", ""))
        expected = case.get("screenshot", {}).get("sha256")
        require(shot.is_file() and sha(shot) == expected and manifest.get(shot.name) == expected,
                "browser screenshot SHA mismatch: " + str(case.get("name")))
    return {"path": str(path), "sha256": sha(path), "eventsPath": str(events_path),
            "eventsSHA256": sha(events_path), "manifestPath": str(manifest_path),
            "manifestSHA256": sha(manifest_path), "status": "PASS", "caseCount": 6,
            "loadedBodyRows": loaded_total, "jpg8Http404": True,
            "stopBottomZoneProof": proof}


def verify_canonical_equals_stage(stage: dict) -> dict:
    canonical = runtime_inventory(ROOT)
    require(len(canonical) == 39, "canonical runtime count != 39")
    require(canonical == stage["runtimeSHA256"], "canonical source39 != frozen stage39")
    for rel in EXACT8:
        require((ROOT / rel).is_file(), "canonical exact8 path missing: " + rel)
        require(sha(ROOT / rel) == stage["sourceSha256"][rel],
                "canonical exact8 SHA != frozen stage: " + rel)
    return {"runtimeCount": 39, "runtimeSHA256": canonical,
            "exact8": sorted(EXACT8), "stageCanonicalMatch": True}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage-receipt", type=Path, required=True)
    parser.add_argument("--compat-receipt", type=Path, required=True)
    parser.add_argument("--reviewer-receipt", type=Path, required=True)
    parser.add_argument("--guard-receipt", type=Path, required=True)
    parser.add_argument("--stage-browser-receipt", type=Path, required=True)
    parser.add_argument("--canonical-browser-receipt", type=Path, required=True)
    parser.add_argument("--canonical-node-log", type=Path, required=True)
    parser.add_argument("--canonical-python-log", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    require(args.out.parent.resolve() == OUT_ROOT.resolve(), "--out must be directly under QA postapply folder")
    require(not args.out.exists(), "postapply verification receipt already exists")

    evidence = sealed_evidence()
    stage = verify_stage(args.stage_receipt)
    compat = verify_compat(args.compat_receipt)
    reviewer = verify_reviewer(args.reviewer_receipt, stage["sha256"])
    guard = verify_guard(args.guard_receipt, stage)
    canonical = verify_canonical_equals_stage(stage)
    node = parse_node_log(args.canonical_node_log)
    python = parse_python_log(args.canonical_python_log)
    stage_browser = verify_browser(args.stage_browser_receipt, STAGE, 4197)
    canonical_browser = verify_browser(args.canonical_browser_receipt, ROOT, 4198)
    jpg8 = verify_jpg8()

    payload = {
        "schema": "fcv588-p04-provenance-postapply-verification-v1",
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "status": "PASS_POSTAPPLY_READY_FOR_FINAL_INTEGRITY",
        "scope": "READ_ONLY_POSTAPPLY_P04_PROVENANCE_V3_SOFTWARE_QA",
        "stageRoot": str(STAGE), "canonicalRoot": str(ROOT),
        "sealedEvidence": evidence, "stage": stage, "compatibility": compat,
        "reviewer": reviewer, "guardedApply": guard, "canonical": canonical,
        "canonicalNode": node, "canonicalPython": python,
        "stageBrowser": stage_browser, "canonicalBrowser": canonical_browser,
        "jpg8": jpg8, "holds": HOLDS,
        "operations": {"canonicalWritesByThisScript": False, "serverStarted": False,
                       "browserStarted": False, "nodeExecuted": False,
                       "port4173Operation": "NONE"},
        "objectiveFailures": [],
    }
    write_once(args.out, (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print("POSTAPPLY_VERIFY_PASS")
    print("RECEIPT=" + str(args.out))
    print("RECEIPT_SHA256=" + sha(args.out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
