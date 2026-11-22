"""Guarded, write-once P05+P06 synthetic GUI apply to Windows canonical.

Dry-run is read-only. --apply requires exact P04 preimage, eight allowlisted
paths, final integrated Node/Python/Chrome evidence and original photo holds.
Existing receipts/failure logs are never rewritten or deleted.
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
import tempfile
import zipfile

ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT / "staging/fcv588-photo-integrated-20261116"
QA = ROOT / "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/integrated"
P04_FINAL = ROOT / "docs/qa/FCV588_VISUAL_P04_20261114/FCV588_VISUAL_P04_FINAL_INTEGRITY_20261114.json"
P04_POST = ROOT / "docs/qa/FCV588_VISUAL_P04_20261114/FCV588_VISUAL_P04_INDEPENDENT_POSTRECEIPT_20261114.json"
FINAL_SHA = "c3a292dc213e660fa855c453eaf324fd9014ddb163e4723cea141a4050a1382b"
POST_SHA = "569e4b99a8e8de49502d74db30c0215eb61b238edf3ddaa4d93f6d7ed6b4ec90"
MOD = ("web/app.mjs", "web/lcd-presentation.mjs", "web/styles.css", "web/index.html")
NEW = ("test/fcv588-photo-menu-layout.test.mjs", "test/fcv588-photo-menu-actions.test.mjs",
       "test/fcv588-photo-face-geometry.test.mjs", "test/fcv588-device-focus.test.mjs")
ALL = (*MOD, *NEW)
NODE = QA / "p05-p06-integrated-node-v2.txt"
PY = QA / "p05-p06-integrated-python-v2.txt"
P05_BROWSER = QA / "browser-p05-v1/fcv588-p05-menu-browser-20261116T073418+0700-ba7d5815.json"
P06_BROWSER = QA / "browser-p06-v1/20261116T073351-e166c036-receipt.json"
ZIP = QA / "P05_P06_BEFORE_APPLY_20261116.zip"
INTENT = QA / "P05_P06_CANONICAL_APPLY_INTENT_20261116.json"
DONE = QA / "P05_P06_CANONICAL_GUARDED_APPLY_20261116.json"
FINAL_STAGE_SEAL = QA / "P05_P06_INTEGRATED_FINAL_STAGE_20261116.json"
FINAL_STAGE_SEAL_SHA = "96225310c3614d0d4b64af038fca70bfbe4a3c8cb25b3910ab2154a88d71095c"

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def sha(path: Path) -> str:
    require(path.is_file(), "file missing: " + str(path))
    return digest(path.read_bytes())

def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))

def write_exclusive(path: Path, blob: bytes) -> None:
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, "wb") as stream:
        stream.write(blob)

def serialized(data: object) -> bytes:
    return (json.dumps(data, indent=2, ensure_ascii=False) + "\n").encode("utf-8")

def runtime_inventory(root: Path) -> dict[str, str]:
    result = {}
    for folder in ("src", "web"):
        for path in (root / folder).rglob("*"):
            if path.is_file() and path.suffix.lower() in (".mjs", ".js", ".css", ".svg", ".html"):
                result[path.relative_to(root).as_posix()] = sha(path)
    return dict(sorted(result.items()))

def test_inventory(root: Path) -> dict[str, str]:
    return {p.relative_to(root).as_posix(): sha(p)
            for p in sorted((root / "test").rglob("*"))
            if p.is_file() and p.suffix.lower() in (".mjs", ".py", ".json")
            and "__pycache__" not in p.parts}

def verify_chrome():
    p05 = read_json(P05_BROWSER)
    p06 = read_json(P06_BROWSER)
    require(p05["overallStatus"] == "PASS" and p06["overallStatus"] == "PASS", "staged Chrome failed")
    require(Path(p05["stageRoot"]) == STAGE and Path(p06["stageRoot"]) == STAGE,
            "browser tested a different stage")
    require(p05["sourceTreeStable"] and p06["sourceStable"] and
            p06["sourceManifestBefore"] == p06["sourceManifestAfter"], "Chrome source mutated")
    require(len(p05["cases"]) == len(p06["cases"]) == 3, "Chrome selected viewport count")
    require({(x["viewport"]["width"], x["viewport"]["height"]) for x in p05["cases"]}
            == {(1366, 768), (375, 812)}, "P05 Chrome viewport coverage")
    require({x["viewport"]["w"] for x in p06["cases"]} == {375, 1366, 1920},
            "P06 Chrome viewport coverage")
    require(p05["photoDeny"]["status"] == "PASS" and
            len(p05["photoDeny"]["paths"]) == 8 and
            all(x["statusCode"] == 404 for x in p05["photoDeny"]["paths"]), "P05 exposed photos")
    require(len(p06["photoDeny"]) == 8 and
            all(x["statusCode"] == 404 for x in p06["photoDeny"]), "P06 exposed photos")
    require(p05["serverCleanup"] == p06["serverCleanup"] == "PASS", "Chrome QA server cleanup")
    require(not p05["objectiveFailures"] and not p06["errors"], "Chrome reported failures")
    screenshot_paths = {}
    for case in p05["cases"]:
        require(case["status"] == "PASS" and
                case["loadedBodyCount"] == case["loadedBodyMatches"] == 35 and
                not any(case["errorCounts"].values()), "P05 Chrome source/body/case mismatch")
        shot = case["screenshot"]
        require(sha(Path(shot["path"])) == shot["sha256"], "P05 screenshot SHA mismatch")
        screenshot_paths[shot["path"]] = shot["sha256"]
    manifest = p06["sourceManifestBefore"]
    for rel, expected in manifest.items():
        require(sha(STAGE / rel) == expected, "P06 browser stage source drift: " + rel)
    for case in p06["cases"]:
        require(case["status"] == "PASS" and case["d15Tabs"] == 5 and
                case["sourceBodies"] == len(case["loaded"]) and
                case["sourceBodies"] >= 35 and not case["consoleOrNetworkErrors"],
                "P06 case/accessibility/source failed")
        for loaded in case["loaded"]:
            rel = loaded["path"]
            require(loaded["status"] == 200 and
                    loaded["bodySHA256"] == loaded["sourceSHA256"] == sha(STAGE / rel),
                    "P06 actual response-body/source mismatch: " + rel)
        shot = case["screenshot"]
        require(sha(Path(shot["path"])) == shot["sha256"], "P06 screenshot SHA mismatch")
        screenshot_paths[shot["path"]] = shot["sha256"]
    return screenshot_paths

def verify():
    require(sha(P04_FINAL) == FINAL_SHA and sha(P04_POST) == POST_SHA,
            "sealed P04 final/post SHA mismatch")
    parent = read_json(P04_FINAL)
    require(parent["runtimeSourceCount"] == 39 and len(parent["runtimeSHA256"]) == 39,
            "P04 parent runtime count mismatch")
    require(parent["hardwareValidated"] is False and parent["releaseApproval"] == "HOLD"
            and parent["phase6"] == "OPEN", "parent authority gate drift")
    old = runtime_inventory(ROOT)
    staged = runtime_inventory(STAGE)
    require(set(old) == set(staged) == set(parent["runtimeSHA256"]),
            "runtime inventory has extra/missing paths")
    require(old == dict(sorted(parent["runtimeSHA256"].items())),
            "canonical P04 source preimage mismatch")
    diff_runtime = {rel for rel in staged if old[rel] != staged[rel]}
    require(diff_runtime == set(MOD), "unexpected modified runtime: " + str(sorted(diff_runtime)))
    tests_before = test_inventory(ROOT)
    tests_after = test_inventory(STAGE)
    require(set(tests_after) == set(tests_before) | set(NEW),
            "unexpected new/deleted test paths")
    require(all(tests_after[x] == tests_before[x] for x in tests_before),
            "existing test modified in integrated stage")
    require(all(x not in tests_before and x in tests_after for x in NEW),
            "new P05/P06 tests already exist/missing")
    photos = parent["photoReferenceSHA256"]
    require(len(photos) == 8, "expected eight original photos")
    for name, meta in photos.items():
        source = ROOT / "sources/FCV588_GiaoDienThucTeMay2016" / name
        require(sha(source) == meta["sha256"], "original photo mutated: " + name)
    css = (STAGE / "web/styles.css").read_text(encoding="utf-8")
    html = (STAGE / "web/index.html").read_text(encoding="utf-8")
    require(re.search(r"\.display-housing\s*\{[^}]*width:\s*59%;", css),
            "accepted P04 LCD aperture percentage missing")
    require(".workbench:has(#device-focus-toggle:checked) .training-panel:focus-within" in css,
            "P06 keyboard focus recovery missing")
    require(html.count('class="d15-tab" role="tab"') == 5 and
            'id="device-focus-toggle"' in html, "D15/toggle DOM contract broken")
    require("FCV588_GiaoDienThucTeMay2016" not in css and
            "FCV588_GiaoDienThucTeMay2016" not in html,
            "OEM photo embedded in runtime source")
    ntext = NODE.read_text(encoding="utf-8", errors="replace")
    ptext = PY.read_text(encoding="utf-8", errors="replace")
    require(re.search(r"(?m)^# tests 551\s*$", ntext) and
            re.search(r"(?m)^# pass 551\s*$", ntext) and
            re.search(r"(?m)^# fail 0\s*$", ntext), "integrated Node551 suite missing/failed")
    require("Ran 13 tests" in ptext and re.search(r"(?m)^OK\s*$", ptext),
            "integrated Python13 suite missing/failed")
    screenshots = verify_chrome()
    require(len(screenshots) == 6, "six selected Chrome screenshots expected")
    require(sha(FINAL_STAGE_SEAL) == FINAL_STAGE_SEAL_SHA,
            "current integrated source/evidence seal missing or altered")
    stage_seal = read_json(FINAL_STAGE_SEAL)
    require(stage_seal["status"] == "STAGED_P05_P06_BOUNDED_SOFTWARE_QA_PASS_AUTHORITY_GATES_HOLD" and
            stage_seal["canonicalApplied"] is False and
            stage_seal["parentP04FinalSHA256"] == FINAL_SHA and
            stage_seal["parentP04PostSHA256"] == POST_SHA,
            "current integrated seal status/parent incorrect")
    require(stage_seal["preimageRuntimeSHA256"] == old and
            stage_seal["stageRuntimeSHA256"] == staged and
            stage_seal["changedRuntimePaths"] == sorted(MOD) and
            stage_seal["newTestPaths"] == sorted(NEW) and
            all(stage_seal["newTestSHA256"][rel] == sha(STAGE / rel) for rel in NEW),
            "current staged seal postimages have drifted")
    require(stage_seal["browserScreenshotSHA256"] == screenshots and
            stage_seal["stageQA"] ==
            {str(p.relative_to(ROOT)).replace("\\", "/"): sha(p)
             for p in (NODE, PY, P05_BROWSER, P06_BROWSER)},
            "current staged seal QA evidence drifted")
    return {"preimageRuntimeSHA256": old, "stageRuntimeSHA256": staged,
            "existingTestCount": len(tests_before), "stageTestCount": len(tests_after),
            "changedRuntime": sorted(diff_runtime), "newTests": sorted(NEW),
            "screenshotsSHA256": screenshots,
            "qaSHA256": {str(p.relative_to(ROOT)).replace("\\", "/"): sha(p)
                         for p in (NODE, PY, P05_BROWSER, P06_BROWSER)}}

def apply(data):
    require(all(not p.exists() for p in (ZIP, INTENT, DONE)),
            "apply artifacts already exist: inspect journal; never rerun")
    original = {rel: (ROOT / rel).read_bytes() for rel in MOD}
    # Archive preimages with a manifest, and verify the stored bytes before any copy.
    archive_buffer = io.BytesIO()
    with zipfile.ZipFile(archive_buffer, "w", zipfile.ZIP_DEFLATED) as z:
        for rel, blob in original.items():
            require(digest(blob) == data["preimageRuntimeSHA256"][rel],
                    "preimage mutated during backup: " + rel)
            z.writestr(rel, blob)
        z.writestr("PREIMAGE_MANIFEST.json", serialized(
            {rel: digest(blob) for rel, blob in original.items()}))
    backup = archive_buffer.getvalue()
    with zipfile.ZipFile(io.BytesIO(backup)) as z:
        for rel, blob in original.items():
            require(z.read(rel) == blob, "ZIP preimage content mismatch: " + rel)
    write_exclusive(ZIP, backup)
    require(sha(ZIP) == digest(backup), "ZIP reread mismatch")
    now = datetime.now(timezone.utc).isoformat()
    intent = {"status": "APPLY_INTENT_CREATED_NOT_COMPLETION_PROOF",
              "timestampUtc": now, "parentFinalSHA256": FINAL_SHA,
              "parentPostreceiptSHA256": POST_SHA,
              "backupSHA256": sha(ZIP), "copyPaths": ALL,
              "preimageRuntimeSHA256": {r: data["preimageRuntimeSHA256"].get(r) for r in MOD},
              "expectedRuntimeSHA256": {r: data["stageRuntimeSHA256"].get(r) for r in MOD},
              "expectedTestSHA256": {r: sha(STAGE / r) for r in NEW}}
    write_exclusive(INTENT, serialized(intent))
    # Fail closed on partial copy. The INTENT and backup remain as recovery
    # evidence; never autoretry without inspecting actual canonical bytes.
    for rel in ALL:
        target, source = ROOT / rel, STAGE / rel
        if rel in MOD:
            require(sha(target) == data["preimageRuntimeSHA256"][rel],
                    "canonical changed during apply: " + rel)
        else:
            require(not target.exists(), "new test appeared during apply: " + rel)
        expected = sha(source)
        fd, tmp = tempfile.mkstemp(prefix=".p05p06_", suffix=".tmp", dir=target.parent)
        try:
            with os.fdopen(fd, "wb") as stream:
                stream.write(source.read_bytes())
            require(sha(Path(tmp)) == expected, "temporary copy mismatch: " + rel)
            os.replace(tmp, target)
        finally:
            if os.path.exists(tmp): os.unlink(tmp)
        require(sha(target) == expected, "canonical post-copy mismatch: " + rel)
    for rel, expected in data["stageRuntimeSHA256"].items():
        require(sha(ROOT / rel) == expected, "postapply runtime mismatch: " + rel)
    require(all(sha(ROOT / r) == sha(STAGE / r) for r in NEW),
            "postapply new test mismatch")
    receipt = {"status": "P05_P06_BOUNDED_CANONICAL_APPLY_COMPLETE_SOFTWARE_QA_PENDING",
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "parentP04FinalSHA256": FINAL_SHA, "parentP04PostSHA256": POST_SHA,
        "finalStageSealSHA256": FINAL_STAGE_SEAL_SHA,
        "backupPath": str(ZIP), "backupSHA256": sha(ZIP),
        "intentPath": str(INTENT), "intentSHA256": sha(INTENT),
        "stageRoot": str(STAGE), "copyPaths": ALL,
        "postapplyRuntimeSHA256": data["stageRuntimeSHA256"],
        "newTestSHA256": {r: sha(ROOT / r) for r in NEW},
        "stagingQASHA256": data["qaSHA256"],
        "stagingScreenshotsSHA256": data["screenshotsSHA256"],
        "firmwareConformance": "HOLD", "hardwareValidated": False,
        "mediaRights": "HOLD", "releaseApproval": "HOLD",
        "originalPhase6": "OPEN", "originalPublicFeatureClaims": "65/65 HOLD"}
    write_exclusive(DONE, serialized(receipt))
    print("APPLY_COMPLETE 8/8, canonical runtime 39/39 == integrated stage")
    print("BACKUP_SHA256=" + sha(ZIP))
    print("APPLY_RECEIPT_SHA256=" + sha(DONE))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    report = verify()
    print("DRY_RUN_PASS: P04 39/39; modified runtime4; new tests4; Node551; Python13; Chrome6/6; photos8/8; stage stable")
    print("EXACT_RUNTIME_DIFF=" + repr(report["changedRuntime"]))
    if args.apply:
        apply(report)
