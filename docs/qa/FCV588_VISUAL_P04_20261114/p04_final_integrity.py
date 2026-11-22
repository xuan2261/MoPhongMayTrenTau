"""Fail-closed, write-once P04 bounded visual software QA final integrity.

Source trees, evidence, original photos and all parent receipts are read-only.
The only created output is a NEW final JSON in this owned QA directory.
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT / "staging/fcv588-photo-modes-20261114"
QA = ROOT / "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261114"
OUT = ROOT / "docs/qa/FCV588_VISUAL_P04_20261114"
FINAL = OUT / "FCV588_VISUAL_P04_FINAL_INTEGRITY_20261114.json"
P03_FINAL = ROOT / "docs/qa/FCV588_VISUAL_P03_20261114/FCV588_VISUAL_P03_FINAL_INTEGRITY_20261114.json"
P03_POST = ROOT / "docs/qa/FCV588_VISUAL_P03_20261114/FCV588_VISUAL_P03_INDEPENDENT_POSTRECEIPT_20261114.json"
P04_BACKUP = QA / "P04_BEFORE_APPLY_20261114.zip"
P04_APPLY = QA / "P04_CANONICAL_GUARDED_APPLY_20261114.json"
P04_JOURNAL = QA / "P04_CANONICAL_APPLY_JOURNAL_20261114.json"
STAGE_BASELINE = QA / "p04-stage/P04_STAGE_BASELINE_RUNTIME39_20261114.json"
STAGE_RECEIPT = QA / "p04-stage/P04_STAGE_IMPLEMENTATION_RECEIPT_20261114.json"
STAGE_MANIFEST = QA / "p04-stage/P04_STAGE_QA_SHA256_20261114.txt"
NODE_STAGE = QA / "p04-stage/p04-full-node-attempt5-final.txt"
PY_STAGE = QA / "p04-stage/p04-python-final-v4.txt"
NODE_CANON = QA / "p04-canonical-node-postapply-v1.txt"
PY_CANON = QA / "p04-canonical-python-postapply-v1.txt"
STAGE_BROWSER = QA / "p04-stage/browser-attempt2/fcv588-p04-stage-browser-blflat-20261114T105809+0700-ac0a78e3.json"
CANON_BROWSER = QA / "p04-canonical-browser-v1/fcv588-p04-canonical-browser-blflat-20261114T110924+0700-7546a89c.json"
CLAIMS = ROOT / "docs/evidence/fcv588-public-implementation-status.json"

EXPECTED_SHA = {
    "p03_final": "1132a7d8eae167a9afa60e5271bfec282b53b848054f3637cb973467fcd67c6d",
    "p03_post": "48abc24fecae4df657e79d4ed7ba6d365fb4a97a086fbf99792b9b8535da362e",
    "backup": "bd0bfb24e720faf852c741a747330e74c7b3699c9f77f2320324014ede866d11",
    "apply": "8e8a222f1d1adaa851a026b4a1390ff11d853e6093699302f1fb382bf531d864",
    "baseline": "aaf7ec93fb7ad9051e64b11548b88dc88bf5144cec858081c247236a1d787817",
    "stage_receipt": "d66a2f24561662fd897223cc1a6a53edd97c2909890b8d3131334e0f97694bf6",
    "stage_manifest": "ac3d25842f4e997b70fa512881dfaf51813223a3c5aa7c4755ac51216466a31e",
    "node_stage": "a2b003b002593c06360a199d7433a5630253a892f76217ce73d5222421da5bae",
    "py_stage": "5858e592f691a5af3c51a78d8e9a950ce0223d77cc4f8cd67dfba1f735e93948",
    "node_canon": "31bd204d5fc3959ed516b7334e0044897e60df5edee864be7e4bcfe3e5e7825f",
    "py_canon": "70e856698a8074a2794898e7dddadb61bbec3eddd4b5776068a6ec8202d440cd",
    "browser_stage": "63d916faea9087bd6cc7c201d49c252c9b73a41dec3d69ac75285759bbafaa7f",
    "browser_canon": "8818e641a8a03317ab2057451fb65b52263df6dcc04c4d8d5885d99d99a93a56",
    "claims": "e2104b0ff01fecfb64e4e9ce1cc248538f9562e06d07a2306391fe47fcad103d",
}

RUNTIME_CHANGES = {
    "src/devices/fcv588/display-layout.mjs",
    "src/devices/fcv588/echo-projection.mjs",
    "web/app.mjs",
    "web/lcd-presentation.mjs",
    "web/styles.css",
}
TEST_CHANGES = {
    "test/fcv588-photo-display.test.mjs",
    "test/fcv588-photo-modes.test.mjs",
    "test/fcv588-public-display-widgets.test.mjs",
    "test/fcv588-public-display.test.mjs",
    "test/web-layout.test.mjs",
}
EXPECTED_CASES = {
    "1366x768:LF-Blue", "1366x768:DUAL-Blue",
    "1366x768:BL-LF-Blue", "1366x768:NAV1-Blue",
    "1366x768:NAV2-Blue", "375x812:DUAL-Blue",
    "1920x1080:NAV2-Blue",
}


def need(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def sha(path: Path) -> str:
    need(path.is_file(), f"missing evidence/source file: {path}")
    return hashlib.sha256(path.read_bytes()).hexdigest()


def checked(path: Path, key: str) -> None:
    need(sha(path) == EXPECTED_SHA[key], f"sealed SHA drift: {key}: {path}")


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def check_node(path: Path, count: int) -> None:
    text = path.read_text(encoding="utf-8", errors="replace")
    need(f"# tests {count}" in text and f"# pass {count}" in text
         and "# fail 0" in text, f"Node {count} PASS not present: {path}")


def check_python(path: Path) -> None:
    text = path.read_text(encoding="utf-8", errors="replace").replace("\r", "")
    need("Ran 13 tests" in text and "\nOK" in text, "Python 13 PASS absent: " + str(path))


def browser_evidence(path: Path, expected_root: Path, expected_schema: str) -> dict:
    body = load(path)
    need(body.get("schema") == expected_schema, "browser schema drift")
    root = body.get("stageRoot") if expected_root == STAGE else body.get("canonicalRoot")
    need(root and Path(root).resolve() == expected_root.resolve(), "browser root drift")
    need(body.get("overallStatus") == "PASS" and body.get("sourceTreeStable") is True,
         "browser PASS/stable not verified")
    need(body.get("sourceManifestBefore") == body.get("sourceManifestAfter"),
         "browser source changed in run")
    need(body["sourceManifestBefore"]["files"] == 37, "browser source count changed")
    need(body.get("serverCleanup") == "PASS", "browser test-owned server not cleaned")
    need(body.get("objectiveFailures") == [], "browser objective failures")
    server = body.get("server", {})
    need(server.get("sha256") == sha(ROOT / "tools/server.mjs")
         and server.get("node", "").lower().endswith("node.exe"),
         "browser strict-server source/Node mismatch")
    photo_deny = body.get("photoDeny", {})
    need(photo_deny.get("status") == "PASS" and len(photo_deny.get("paths", [])) == 8,
         "browser OEM URL deny not complete")
    need(all(x.get("statusCode") == 404 for x in photo_deny["paths"]),
         "browser served an original reference photo")
    cases = body.get("cases", [])
    need(len(cases) == 7, "expected exactly seven selected P04 cases")
    ids, screenshots, loaded_shas = [], [], []
    for case in cases:
        vp = case["viewport"]
        cid = f"{vp['width']}x{vp['height']}:{case['name']}"
        ids.append(cid)
        need(case.get("status") == "PASS" and case.get("objectiveFailures") == [],
             "failed browser case " + cid)
        need(case.get("loadedBodyCount") == 35 and
             len(case.get("loadedBodyAggregateSha256", "")) == 64,
             "actual-loaded body source check missing: " + cid)
        loaded_shas.append(case["loadedBodyAggregateSha256"])
        need(all(case.get("errorCounts", {}).get(k) == 0 for k in
                 ("console", "page", "requestFailed", "external", "body")),
             "browser/HTTP errors for " + cid)
        img = case.get("screenshot", {})
        shot = Path(img.get("path", ""))
        need(shot.is_file() and shot.stat().st_size == img.get("bytes") and
             sha(shot) == img.get("sha256"), "screenshot SHA drift: " + cid)
        screenshots.append({"path": rel(shot), "sha256": img["sha256"],
                            "bytes": img["bytes"], "case": cid})
        proof = case.get("geometryProof", {})
        if case["name"] == "DUAL-Blue":
            need(proof.get("depthIntersectsDivider") is True,
                 "DUAL depth does not overlap its divider")
        if case["name"] in {"NAV1-Blue", "NAV2-Blue"}:
            need(proof.get("depthHidden") is True,
                 "NAV global depth incorrectly visible")
        if case["name"] == "BL-LF-Blue":
            flat = case.get("bottomLockFlatProof", {})
            need(flat.get("inLowerBand") is True and flat.get("coverage", 0) >= 0.5,
                 "Bottom Lock lower-band flat synthetic fixture check failed")
    need(set(ids) == EXPECTED_CASES and len(set(ids)) == 7,
         "browser selected P04 matrix differs")
    directory_files = {}
    for f in sorted(path.parent.iterdir(), key=lambda p: p.name.lower()):
        if f.is_file():
            directory_files[f.name] = {"sha256": sha(f), "bytes": f.stat().st_size}
    return {
        "receiptPath": rel(path), "receiptSHA256": sha(path),
        "root": str(expected_root),
        "sourceManifestSHA256": body["sourceManifestBefore"]["sha256"],
        "sourceManifestFiles": body["sourceManifestBefore"]["files"],
        "cases": sorted(ids), "screenshots": screenshots,
        "loadedBodiesTotal": 7 * 35, "loadedBodyAggregateSha256": loaded_shas,
        "photoDeny": "8/8_HTTP_404", "serverCleanup": "PASS",
        "directoryArtifacts": directory_files,
    }


def main() -> None:
    need(OUT.is_dir() and not FINAL.exists(), "P04 final receipt output must be write-once")
    sealed = [
        (P03_FINAL, "p03_final"), (P03_POST, "p03_post"),
        (P04_BACKUP, "backup"), (P04_APPLY, "apply"),
        (STAGE_BASELINE, "baseline"), (STAGE_RECEIPT, "stage_receipt"),
        (STAGE_MANIFEST, "stage_manifest"), (NODE_STAGE, "node_stage"),
        (PY_STAGE, "py_stage"), (NODE_CANON, "node_canon"),
        (PY_CANON, "py_canon"), (STAGE_BROWSER, "browser_stage"),
        (CANON_BROWSER, "browser_canon"), (CLAIMS, "claims"),
    ]
    for path, key in sealed:
        checked(path, key)
    check_node(NODE_STAGE, 541)
    check_node(NODE_CANON, 541)
    check_python(PY_STAGE)
    check_python(PY_CANON)

    # Preserve all indexed stage QA source, RED and actual FAILURE logs.
    manifest_lines = STAGE_MANIFEST.read_text(encoding="utf-8").splitlines()
    need(len(manifest_lines) >= 25, "P04 original QA manifest shortened")
    for line in manifest_lines:
        value, filename = line.split(" *", 1)
        need(sha(Path(filename)) == value.lower(), "stage QA evidence drift: " + filename)

    p03 = load(P03_FINAL)
    need(p03.get("runtimeSourceCount") == 39 and len(p03["runtimeSHA256"]) == 39,
         "P03 final source inventory changed")
    need(sha(ROOT / p03["parentP02"]["finalPath"]) == p03["parentP02"]["finalSHA256"],
         "P02 parent final changed")
    need(sha(ROOT / p03["parentP02"]["postreceiptPath"]) == p03["parentP02"]["postreceiptSHA256"],
         "P02 parent independent postreceipt changed")
    apply = load(P04_APPLY)
    stage_receipt = load(STAGE_RECEIPT)
    journal = load(P04_JOURNAL)
    need(apply.get("status") == "P04_CANONICAL_SCOPED_COPY_COMPLETE_POST_QA_PENDING"
         and apply.get("postAppliedRuntime") == "39/39_MATCH_STAGE",
         "P04 apply not in completed scoped-copy state")
    need(apply.get("parentP03FinalIntegritySHA256") == EXPECTED_SHA["p03_final"]
         and apply.get("parentP03IndependentPostreceiptSHA256") == EXPECTED_SHA["p03_post"],
         "P04 apply parent P03 seal mismatch")
    need(apply.get("backupSHA256") == EXPECTED_SHA["backup"]
         and apply.get("p04StageReceiptSHA256") == EXPECTED_SHA["stage_receipt"]
         and apply.get("p04BrowserReceiptSHA256") == EXPECTED_SHA["browser_stage"],
         "P04 apply evidence pin mismatch")
    allowed = RUNTIME_CHANGES | TEST_CHANGES
    need(set(apply.get("runtimeDeltas", [])) == RUNTIME_CHANGES and
         set(apply.get("testDeltas", [])) == TEST_CHANGES and
         set(apply.get("allowlistedCopyPaths", [])) == allowed and
         set(apply.get("performed", [])) == allowed,
         "P04 apply changed unexpected paths")
    need(journal.get("complete") is True and set(journal.get("performed", [])) == allowed,
         "P04 guarded journal incomplete")
    need(stage_receipt.get("softwareQaStatus") == "PASS" and
         stage_receipt.get("canonicalApplied") is False and
         stage_receipt.get("allowlist", {}).get("status") == "EXACT_10_PATHS",
         "original P04 stage receipt status/allowlist changed")

    with zipfile.ZipFile(P04_BACKUP, "r") as backup:
        need(set(backup.namelist()) == set(apply["canonicalPreimages"]),
             "P04 backup member list differs")
        for p, expected in apply["canonicalPreimages"].items():
            need(hashlib.sha256(backup.read(p)).hexdigest() == expected,
                 "P04 backed-up preimage differs: " + p)

    for p, expected in apply["stagePostimages"].items():
        need(sha(ROOT / p) == expected and sha(STAGE / p) == expected,
             "P04 applied path differs staging: " + p)

    runtime_sha = {}
    unchanged, changed = [], []
    for p, old in sorted(p03["runtimeSHA256"].items()):
        current = sha(ROOT / p)
        need(current == sha(STAGE / p), "P04 runtime stage/canonical divergence: " + p)
        runtime_sha[p] = current
        (changed if current != old else unchanged).append(p)
    need(set(changed) == RUNTIME_CHANGES and len(unchanged) == 34,
         "P04 runtime deltas vs P03 parent not exactly five")

    stage_browser = browser_evidence(STAGE_BROWSER, STAGE, "fcv588-p04-stage-browser-blflat-v2")
    canonical_browser = browser_evidence(CANON_BROWSER, ROOT, "fcv588-p04-canonical-browser-blflat-v2")
    need(stage_browser["sourceManifestSHA256"] == canonical_browser["sourceManifestSHA256"],
         "staging/canonical browser source manifest SHA differs")
    need(stage_browser["cases"] == canonical_browser["cases"],
         "stage/canonical P04 browser cases differ")
    need(Counter(row["sha256"] for row in stage_browser["screenshots"]) ==
         Counter(row["sha256"] for row in canonical_browser["screenshots"]),
         "stage/canonical P04 screenshots differ")

    photos = {}
    need(len(p03["photoReferenceSHA256"]) == 8, "P03 original photo index changed")
    for name, p03entry in p03["photoReferenceSHA256"].items():
        file = ROOT / "sources/FCV588_GiaoDienThucTeMay2016" / name
        need(sha(file) == p03entry["sha256"] and
             file.stat().st_size == p03entry["bytes"],
             "original reference photo SHA/size changed: " + name)
        photos[name] = p03entry

    claims = load(CLAIMS)
    claim_rows = claims.get("operatorRows", []) + claims.get("teacherRows", [])
    need(len(claim_rows) == 65 and all(x.get("claimDecision") == "HOLD" for x in claim_rows)
         and claims.get("hardwareValidated") is False
         and claims.get("rightsClearance") is False
         and claims.get("releaseApproval") == "HOLD"
         and claims.get("firmwareInstalled") is None,
         "original 65-claim/firmware/rights/hardware/release ledger drift")

    result = {
        "schema": "fcv588-visual-p04-bounded-final-integrity-v1",
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "status": "P04_BOUNDED_VISUAL_SOFTWARE_QA_PASS_RIGHTS_HARDWARE_RELEASE_HOLD",
        "scope": "selected BL-LF, DUAL and NAV mode presentation fixes using synthetic offline data only; NOT full Phase4 or OEM visual acceptance",
        "parentP03": {"finalPath": rel(P03_FINAL), "finalSHA256": EXPECTED_SHA["p03_final"],
                       "postreceiptPath": rel(P03_POST), "postreceiptSHA256": EXPECTED_SHA["p03_post"]},
        "parentP02": p03["parentP02"],
        "guardedApply": {"backupPath": rel(P04_BACKUP), "backupSHA256": EXPECTED_SHA["backup"],
                         "receiptPath": rel(P04_APPLY), "receiptSHA256": EXPECTED_SHA["apply"],
                         "journalPath": rel(P04_JOURNAL), "journalSHA256": sha(P04_JOURNAL),
                         "copyPaths": sorted(allowed)},
        "stageReceipt": {"path": rel(STAGE_RECEIPT), "sha256": EXPECTED_SHA["stage_receipt"],
                         "qaManifestPath": rel(STAGE_MANIFEST),
                         "qaManifestSHA256": EXPECTED_SHA["stage_manifest"]},
        "runtimeSourceCount": 39, "runtimeStageCanonical": "39/39_MATCH",
        "runtimeSHA256": runtime_sha,
        "runtimeP03Unchanged": "34/39", "runtimeP03Changed": sorted(changed),
        "nodeCanonical": "541/541_PASS", "pythonCanonical": "13/13_PASS",
        "nodeStage": "541/541_PASS", "pythonStage": "13/13_PASS",
        "qaLogsSHA256": {rel(NODE_CANON): sha(NODE_CANON), rel(PY_CANON): sha(PY_CANON),
                         rel(NODE_STAGE): sha(NODE_STAGE), rel(PY_STAGE): sha(PY_STAGE)},
        "browser": {"stage": stage_browser, "canonical": canonical_browser},
        "photoReferenceSHA256": photos,
        "implementationStatusLedger": {"path": rel(CLAIMS), "sha256": EXPECTED_SHA["claims"]},
        "rightsClearance": False, "hardwareValidated": False,
        "firmwareInstalled": "UNKNOWN", "featureClaims": "65/65_HOLD",
        "phase6": "OPEN", "releaseApproval": "HOLD", "oemConformity": "NOT_CLAIMED",
        "unverified": ["full seven-mode and three-zoom x three-viewport matrix",
                       "OEM RGB/font/firmware, real device and OS Narrator/NVDA focus",
                       "future near-bottom broad fish-only synthetic BL anchor negative fixture"],
        "notes": ["Stage browser selected seven cases; full phase-04 acceptance remains OPEN.",
                  "Independent read-only source reviewer GO applies only to bounded P04 stage/current training scenario.",
                  "Previous failed browser/test/RED receipts preserved; no OEM assets copied to runtime."],
    }
    with FINAL.open("x", encoding="utf-8", newline="\n") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("P04_BOUNDED_FINAL=" + str(FINAL))
    print("FINAL_SHA256=" + sha(FINAL))
    print("RUNTIME39/39 NODE541 PYTHON13 CHROME7+7 PHOTOS8 RIGHTS/HW/RELEASE_HOLD")


if __name__ == "__main__":
    main()
