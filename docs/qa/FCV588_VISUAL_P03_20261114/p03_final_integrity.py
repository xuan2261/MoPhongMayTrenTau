"""Write-once P03 final integrity receipt for the FCV-588 visual echo change.

Reads canonical/stage/source/browser evidence only. The only write is a NEW JSON
receipt inside docs/qa/FCV588_VISUAL_P03_20261114.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
QA = ROOT / "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261114"
STAGE = ROOT / "staging/fcv588-photo-echo-20261114"
OUT_DIR = ROOT / "docs/qa/FCV588_VISUAL_P03_20261114"
FINAL = OUT_DIR / "FCV588_VISUAL_P03_FINAL_INTEGRITY_20261114.json"

P02_FINAL = ROOT / "docs/qa/FCV588_VISUAL_P02_20261114/FCV588_VISUAL_P02_FINAL_INTEGRITY_20261114.json"
P02_POST = ROOT / "docs/qa/FCV588_VISUAL_P02_20261114/FCV588_VISUAL_P02_INDEPENDENT_POSTRECEIPT_20261114.json"
BACKUP = QA / "P03_BEFORE_APPLY_20261114.zip"
APPLY = QA / "P03_CANONICAL_GUARDED_APPLY_20261114.json"
NODE_CANON = QA / "p03-canonical-node-postapply-v1.txt"
PY_CANON = QA / "p03-canonical-python-postapply-v1.txt"
NODE_STAGE = QA / "p03-stage-full-node-v2.txt"
PY_STAGE = QA / "p03-stage-python-v2.txt"
STAGE_BROWSER = QA / "p03-stage-browser-v2/fcv588-p03-stage-browser-20261114T102515+0700-bedd8e54.json"
CANON_BROWSER = QA / "p03-canonical-browser-v2/fcv588-p03-canonical-browser-20261114T103738+0700-400d4eff.json"
CLAIMS = ROOT / "docs/evidence/fcv588-public-implementation-status.json"

EXPECTED = {
    "p02_final": "15ff0baab0b8bbe213c52857b630341a426305a7cf64eae9c07d1ac55f447d53",
    "p02_post": "ce4a103a52940d41f453e0a67c5cc2f7ef43a3ce16ee149461140b5bb68bd405",
    "backup": "13091e895bd670a54a5ca7d04d36c56f76f3311fa8b9971ac7a43ba731092bba",
    "apply": "80244905d3090a6c7891ec7b4de7f3d6583835ba3df9f8983ac063776543912f",
    "node_canon": "a54cdd0852e99c0f1f752939ed497f187cc1aadfdec68ff3ab75041d9019cba0",
    "py_canon": "c513350313a245c387826b3114b80fe950327a98589537b4747894c599bd30cf",
    "stage_browser": "0ad1664795693a4d5d8977b68adc1b81906e4d6d893439172710f870a06798bf",
    "canon_browser": "61aac8d09e48e5aa948b9622b44e2516e848d2604928a423c7b7bbfa3f6dbcae",
    "claims": "e2104b0ff01fecfb64e4e9ce1cc248538f9562e06d07a2306391fe47fcad103d",
}

PHOTOS = {
    "dual.jpg": "4d88fe11cda8a9107f97e44a392103cc68eb8ab8e685b7b5e7408a556a2bc37b",
    "giaoDien.jpg": "e7b78466fa582dc0cc50aec8e2fc264f8b3ee187d93a53cace1e88d1e156c99c",
    "hf.jpg": "7f1a69504fd703988750729ee38b4964229480a4c55b20ae0f0bb4815f6ea2a9",
    "lf.jpg": "c3ef46a27fc965c95d2df33981b0c66775b848ae96aa8efdcad932b91a50c3ef",
    "nav1.jpg": "b90de3afeb18730e10e4ac897fb20bbde36155e25cc344abed259ba1de0d030e",
    "nav2.jpg": "9f225c6834efe86c76fd8a86bbfaa8f6d276f1e055a815efc91087a832397de6",
    "zoom.jpg": "ecc7af35e30aafb8f0e9cfe9f05f94c8d529d6d410a2e523053286149d330b52",
    "zoom2.jpg": "41eaa80b42450b36c3b0f547b9276e26703ce1b74d2f85b1393255fda42bcd99",
}


def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha_file(path: Path) -> str:
    return sha_bytes(path.read_bytes())


def need(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def checked(path: Path, expected: str, label: str) -> str:
    need(path.is_file(), f"missing {label}: {path}")
    got = sha_file(path)
    need(got == expected.lower(), f"{label} SHA mismatch: {path}: {got}")
    return got


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def json_read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def verify_node(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    need("# tests 535" in text and "# pass 535" in text and "# fail 0" in text,
         f"Node 535/535 PASS not present: {path}")


def verify_python(path: Path) -> None:
    text = path.read_text(encoding="utf-8").replace("\r", "")
    need("Ran 13 tests" in text and "\nOK" in text,
         f"Python 13/13 PASS not present: {path}")


def browser_artifacts(receipt_path: Path, expected_root: Path, expected_schema: str) -> dict:
    body = json_read(receipt_path)
    need(body.get("schema") == expected_schema, "browser schema mismatch")
    need(body.get("overallStatus") == "PASS", "browser not PASS")
    need(body.get("sourceTreeStable") is True, "browser source tree not stable")
    need(body.get("sourceManifestBefore") == body.get("sourceManifestAfter"),
         "browser source manifest changed during run")
    need(body["sourceManifestBefore"]["files"] == 37, "browser source file count must be 37")
    need(body.get("objectiveFailures") == [], "browser objective failures present")
    need(body.get("serverCleanup") == "PASS", "browser server cleanup not PASS")
    root_value = body.get("stageRoot") if "stageRoot" in body else body.get("canonicalRoot")
    need(root_value is not None and Path(root_value).resolve() == expected_root.resolve(),
         "browser root mismatch")
    deny = body.get("photoDeny") or {}
    need(deny.get("status") == "PASS" and len(deny.get("paths", [])) == 8,
         "browser photo deny incomplete")
    expected_photo_names = set(PHOTOS)
    need({row.get("name") for row in deny["paths"]} == expected_photo_names,
         "browser photo deny names differ")
    need(all(row.get("statusCode") == 404 and row.get("status") == "PASS"
             for row in deny["paths"]), "browser photo deny is not 8/8 404")
    need(len(body.get("cases", [])) == 9, "browser expected 9 cases")
    screenshots = []
    case_ids = []
    aggregate = []
    raster_sha = None
    for case in body["cases"]:
        need(case.get("status") == "PASS", "browser case not PASS")
        need(case.get("loadedJsCssAllMatchedStage") is True,
             "browser actual-loaded JS/CSS did not match source")
        need(case.get("rasterizerLoaded") is True, "rasterizer not loaded")
        current_raster = case.get("rasterizerBodySha256")
        raster_sha = raster_sha or current_raster
        need(current_raster == raster_sha, "rasterizer body SHA differs by case")
        need(case.get("loadedJsCssCount") == 35, "loaded JS/CSS count must be 35")
        aggregate.append(case.get("loadedJsCssAggregateSha256"))
        counts = case.get("errorCounts", {})
        need(all(counts.get(k) == 0 for k in
                 ("console", "page", "requestFailed", "external", "bodyRead")),
             "browser case has runtime/network/body errors")
        shot = case.get("screenshot") or {}
        image = Path(shot.get("path", ""))
        need(image.is_file(), f"missing browser screenshot: {image}")
        need(image.stat().st_size == shot.get("bytes"), "screenshot size mismatch")
        checked(image, shot.get("sha256", ""), "browser screenshot")
        screenshots.append({"path": str(image), "sha256": shot["sha256"],
                            "bytes": shot["bytes"]})
        vp = case["viewport"]
        case_ids.append(f"{vp['width']}x{vp['height']}:{case['name']}")
    expected_cases = {
        "1366x768:LF-Blue", "1366x768:DUAL-Blue", "1366x768:HF-Blue",
        "1366x768:LF-ZOOM-Bottom-Lock-Blue", "1366x768:LF-White",
        "375x812:LF-Blue", "375x812:HF-Blue",
        "1920x1080:LF-Blue", "1920x1080:HF-Blue",
    }
    need(set(case_ids) == expected_cases, "browser case matrix differs")
    raster_path = ROOT / "web/fcv588-echo-rasterizer.mjs" if expected_root == ROOT else STAGE / "web/fcv588-echo-rasterizer.mjs"
    need(raster_sha == sha_file(raster_path), "actual-loaded rasterizer SHA differs from source")
    directory = receipt_path.parent
    extra = {}
    for item in sorted(directory.iterdir(), key=lambda p: p.name.lower()):
        if item.is_file():
            extra[item.name] = {"sha256": sha_file(item), "bytes": item.stat().st_size}
    return {
        "receiptPath": str(receipt_path),
        "receiptSHA256": sha_file(receipt_path),
        "sourceManifestSHA256": body["sourceManifestBefore"]["sha256"],
        "sourceManifestFiles": body["sourceManifestBefore"]["files"],
        "browserVersion": body["browser"]["version"],
        "cases": sorted(case_ids),
        "screenshots": screenshots,
        "photoDeny": "8/8_404_PASS",
        "actualLoadedRasterizerSHA256": raster_sha,
        "loadedJsCssAggregateSHA256": aggregate,
        "errorCounts": 0,
        "serverCleanup": "PASS",
        "directoryArtifacts": extra,
    }


def main() -> None:
    need(not FINAL.exists(), f"write-once final receipt already exists: {FINAL}")
    need(OUT_DIR.is_dir(), "output directory missing")

    checked(P02_FINAL, EXPECTED["p02_final"], "P02 parent final")
    checked(P02_POST, EXPECTED["p02_post"], "P02 parent postreceipt")
    checked(BACKUP, EXPECTED["backup"], "P03 guarded backup ZIP")
    checked(APPLY, EXPECTED["apply"], "P03 guarded apply receipt")
    checked(NODE_CANON, EXPECTED["node_canon"], "canonical Node log")
    checked(PY_CANON, EXPECTED["py_canon"], "canonical Python log")
    checked(STAGE_BROWSER, EXPECTED["stage_browser"], "stage browser V2 receipt")
    checked(CANON_BROWSER, EXPECTED["canon_browser"], "canonical browser receipt")
    checked(CLAIMS, EXPECTED["claims"], "implementation status ledger")

    verify_node(NODE_CANON)
    verify_python(PY_CANON)
    verify_node(NODE_STAGE)
    verify_python(PY_STAGE)

    p02 = json_read(P02_FINAL)
    need(p02.get("runtimeSourceCount") == 38, "P02 runtime count changed")
    apply = json_read(APPLY)
    need(apply.get("status") == "P03_CANONICAL_SCOPED_COPY_COMPLETE_POST_QA_PENDING",
         "guarded apply status unexpected")
    need(apply.get("parentP02SHA256") == EXPECTED["p02_final"], "apply parent P02 drift")
    need(apply.get("parentP02PostSHA256") == EXPECTED["p02_post"], "apply parent P02 post drift")
    need(apply.get("backupSHA256") == EXPECTED["backup"], "apply backup SHA field mismatch")
    need(apply.get("stageBrowserReceiptSHA256") == EXPECTED["stage_browser"],
         "apply stage browser SHA field mismatch")
    need(apply.get("runtimeP02Files") == 38 and apply.get("runtimeP03Files") == 39,
         "runtime count transition is not 38->39")
    need(apply.get("postAppliedRuntime") == "39/39_MATCH", "guarded apply runtime result missing")
    allowed = sorted([
        "test/fcv588-photo-echo-render.test.mjs",
        "test/fcv588-public-channel-labels.test.mjs",
        "web/app.mjs",
        "web/fcv588-echo-rasterizer.mjs",
    ])
    need(sorted(apply.get("allowlistedCopyPaths", [])) == allowed, "guarded copy allowlist differs")
    need(sorted(apply.get("performed", [])) == allowed, "guarded apply performed set differs")

    expected_runtime = apply["fullStageRuntimeSHA256"]
    need(len(expected_runtime) == 39, "guarded apply runtime manifest must contain 39 paths")
    need(set(expected_runtime) == set(p02["runtimeSHA256"]) | {"web/fcv588-echo-rasterizer.mjs"},
         "P03 runtime path set is not P02 + rasterizer")
    runtime = {}
    unchanged_from_p02 = []
    changed_from_p02 = []
    for path, expected in sorted(expected_runtime.items()):
        canonical = ROOT / path
        staged = STAGE / path
        need(canonical.is_file() and staged.is_file(), f"missing runtime path: {path}")
        canon_sha = sha_file(canonical)
        stage_sha = sha_file(staged)
        need(canon_sha == expected and stage_sha == expected,
             f"runtime 39/39 stage/canonical mismatch: {path}")
        runtime[path] = canon_sha
        if path in p02["runtimeSHA256"]:
            if canon_sha == p02["runtimeSHA256"][path]:
                unchanged_from_p02.append(path)
            else:
                changed_from_p02.append(path)
    need(changed_from_p02 == ["web/app.mjs"],
         f"unexpected P02 common-runtime delta: {changed_from_p02}")
    need(len(unchanged_from_p02) == 37, "P02 unchanged runtime count must be 37")

    for path, expected in apply["stagePostimages"].items():
        need(sha_file(ROOT / path) == expected == sha_file(STAGE / path),
             f"applied path does not equal staged postimage: {path}")
    with zipfile.ZipFile(BACKUP) as zf:
        need(sorted(zf.namelist()) == sorted(apply["canonicalPreimages"]),
             "guarded backup member set differs from existing preimages")
        for path, old_sha in apply["canonicalPreimages"].items():
            need(sha_bytes(zf.read(path)) == old_sha, f"backup preimage mismatch: {path}")

    stage_browser = browser_artifacts(
        STAGE_BROWSER, STAGE, "fcv588-p03-stage-browser-qa-v1")
    canonical_browser = browser_artifacts(
        CANON_BROWSER, ROOT, "fcv588-p03-canonical-browser-qa-v1")
    need(stage_browser["sourceManifestSHA256"] == canonical_browser["sourceManifestSHA256"],
         "stage/canonical browser source manifest differs")
    need(stage_browser["actualLoadedRasterizerSHA256"] == canonical_browser["actualLoadedRasterizerSHA256"],
         "stage/canonical loaded rasterizer differs")
    need(stage_browser["cases"] == canonical_browser["cases"], "browser case matrix differs stage/canonical")
    stage_shots = {Path(x["path"]).name.split("-20261114T", 1)[-1].split("-", 1)[-1]: x["sha256"]
                   for x in stage_browser["screenshots"]}
    canon_shots = {Path(x["path"]).name.split("-20261114T", 1)[-1].split("-", 1)[-1]: x["sha256"]
                   for x in canonical_browser["screenshots"]}
    need(sorted(stage_shots.values()) == sorted(canon_shots.values()),
         "stage/canonical screenshot hashes differ")

    photos = {}
    photo_dir = ROOT / "sources/FCV588_GiaoDienThucTeMay2016"
    for name, expected in PHOTOS.items():
        image = photo_dir / name
        checked(image, expected, "original reference JPG")
        photos[name] = {"sha256": expected, "bytes": image.stat().st_size,
                        "rights": "REFERENCE_ONLY_CLEARANCE_NOT_OBTAINED"}

    claims = json_read(CLAIMS)
    need(claims.get("hardwareValidated") is False, "hardware validation unexpectedly changed")
    need(claims.get("rightsClearance") is False, "rights clearance unexpectedly changed")
    need(claims.get("releaseApproval") == "HOLD", "release approval not HOLD")
    need(claims.get("firmwareInstalled") is None, "installed firmware unexpectedly asserted")
    rows = claims.get("operatorRows", []) + claims.get("teacherRows", [])
    need(len(rows) == 65 and all(x.get("claimDecision") == "HOLD" for x in rows),
         "65/65 feature HOLD invariant changed")

    result = {
        "schema": "fcv588-visual-p03-final-integrity-v1",
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "status": "P03_VISUAL_SOFTWARE_QA_PASS_RIGHTS_HARDWARE_RELEASE_HOLD",
        "scope": "P03 view-only synthetic echo rasterization and canonical integration; not OEM fidelity, hardware, firmware or release approval",
        "parentP02": {
            "finalPath": rel(P02_FINAL), "finalSHA256": EXPECTED["p02_final"],
            "postreceiptPath": rel(P02_POST), "postreceiptSHA256": EXPECTED["p02_post"],
        },
        "guardedApply": {
            "backupPath": rel(BACKUP), "backupSHA256": EXPECTED["backup"],
            "receiptPath": rel(APPLY), "receiptSHA256": EXPECTED["apply"],
            "copyPaths": allowed,
        },
        "runtimeSourceCount": 39,
        "runtimeStageCanonical": "39/39_MATCH",
        "runtimeSHA256": runtime,
        "p02CommonRuntimeUnchanged": "37/38",
        "p02CommonRuntimeChanged": changed_from_p02,
        "p03NewRuntime": ["web/fcv588-echo-rasterizer.mjs"],
        "nodeCanonical": "535/535_PASS",
        "pythonCanonical": "13/13_PASS",
        "nodeStage": "535/535_PASS",
        "pythonStage": "13/13_PASS",
        "qaLogsSHA256": {
            rel(NODE_CANON): sha_file(NODE_CANON), rel(PY_CANON): sha_file(PY_CANON),
            rel(NODE_STAGE): sha_file(NODE_STAGE), rel(PY_STAGE): sha_file(PY_STAGE),
        },
        "browser": {"stage": stage_browser, "canonical": canonical_browser},
        "photoReferenceSHA256": photos,
        "implementationStatusLedger": {"path": rel(CLAIMS), "sha256": EXPECTED["claims"]},
        "rightsClearance": False,
        "hardwareValidated": False,
        "firmwareInstalled": "UNKNOWN",
        "featureClaims": "65/65_HOLD",
        "phase6": "OPEN",
        "releaseApproval": "HOLD",
        "oemConformity": "NOT_CLAIMED",
        "notes": [
            "Original JPGs are reference-only and are denied by the runtime HTTP server.",
            "Browser PASS proves actual loaded bytes/source/screenshot checks for the synthetic UI only.",
            "This receipt does not grant rights clearance or promote any of the 65 HOLD claims.",
        ],
    }
    with FINAL.open("x", encoding="utf-8", newline="\n") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print("FINAL=" + str(FINAL))
    print("FINAL_SHA256=" + sha_file(FINAL))
    print("RUNTIME=39/39_STAGE_CANONICAL_MATCH")
    print("NODE=535/535; PYTHON=13/13; BROWSER=9/9_STAGE+9/9_CANONICAL")
    print("PHOTOS=8/8_MATCH_DENIED; RIGHTS=HOLD; FEATURE_CLAIMS=65/65_HOLD; RELEASE=HOLD")


if __name__ == "__main__":
    main()
