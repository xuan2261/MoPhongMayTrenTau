"""Independent read-only recheck of P04 bounded final integrity, write-once output.

P04 source code, original evidence, screenshots and final receipt are never edited.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT / "staging/fcv588-photo-modes-20261114"
OUT = ROOT / "docs/qa/FCV588_VISUAL_P04_20261114"
FINAL = OUT / "FCV588_VISUAL_P04_FINAL_INTEGRITY_20261114.json"
POST = OUT / "FCV588_VISUAL_P04_INDEPENDENT_POSTRECEIPT_20261114.json"
FINAL_SCRIPT = OUT / "p04_final_integrity.py"
PROCEDURE = OUT / "PROCEDURE.md"

EXPECTED_FINAL = "c3a292dc213e660fa855c453eaf324fd9014ddb163e4723cea141a4050a1382b"
EXPECTED_SCRIPT = "3d7e33eded448e8692af4318ff0350ec7f5b952bb58cab40681b612b78af9254"
EXPECTED_PROCEDURE = "49550e54208bad6e0e302d6070a3510a27dc9b4af25e9e160c897f73c1e9ab25"


def need(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def sha(path: Path) -> str:
    need(path.is_file(), "missing file: " + str(path))
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rooted(relative: str) -> Path:
    path = ROOT.joinpath(*relative.split("/"))
    need(path.resolve().is_relative_to(ROOT.resolve()), "path outside canonical workspace")
    return path


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main() -> None:
    need(not POST.exists(), "independent P04 postreceipt is write-once")
    need(sha(FINAL) == EXPECTED_FINAL, "P04 final receipt SHA differs from seal")
    need(sha(FINAL_SCRIPT) == EXPECTED_SCRIPT, "P04 final script changed")
    need(sha(PROCEDURE) == EXPECTED_PROCEDURE, "P04 procedure changed")
    f = load(FINAL)
    need(f.get("schema") == "fcv588-visual-p04-bounded-final-integrity-v1"
         and f.get("status") == "P04_BOUNDED_VISUAL_SOFTWARE_QA_PASS_RIGHTS_HARDWARE_RELEASE_HOLD",
         "P04 final schema/status changed")
    need(f.get("runtimeSourceCount") == 39 and f.get("runtimeStageCanonical") == "39/39_MATCH",
         "P04 runtime source count/status changed")
    need(f.get("nodeCanonical") == "541/541_PASS" and
         f.get("pythonCanonical") == "13/13_PASS" and
         f.get("nodeStage") == "541/541_PASS" and
         f.get("pythonStage") == "13/13_PASS",
         "P04 staged/canonical tests were not accepted")
    need(len(f["runtimeSHA256"]) == 39 and
         len(f["runtimeP03Changed"]) == 5 and
         f["runtimeP03Unchanged"] == "34/39",
         "P04 runtime change list/status differs")

    for rel, expected in f["runtimeSHA256"].items():
        canonical = rooted(rel)
        staged = STAGE.joinpath(*rel.split("/"))
        need(sha(canonical) == expected and sha(staged) == expected,
             "P04 source drift: " + rel)

    for label in ("parentP03", "parentP02"):
        p = f[label]
        need(sha(rooted(p["finalPath"])) == p["finalSHA256"],
             label + " final integrity drift")
        need(sha(rooted(p["postreceiptPath"])) == p["postreceiptSHA256"],
             label + " independent postreceipt drift")

    guard = f["guardedApply"]
    for key in ("backup", "receipt", "journal"):
        need(sha(rooted(guard[key + "Path"])) == guard[key + "SHA256"],
             "P04 guarded " + key + " changed")
    apply = load(rooted(guard["receiptPath"]))
    journal = load(rooted(guard["journalPath"]))
    need(apply.get("postAppliedRuntime") == "39/39_MATCH_STAGE"
         and journal.get("complete") is True
         and sorted(apply.get("performed", [])) == sorted(journal.get("performed", []))
         and len(journal["performed"]) == 10
         and sorted(guard["copyPaths"]) == sorted(journal["performed"]),
         "P04 apply/journal does not match ten approved copy paths")
    with zipfile.ZipFile(rooted(guard["backupPath"])) as zf:
        need(set(zf.namelist()) == set(apply["canonicalPreimages"]),
             "P04 zip backup list differs")
        for rel, old in apply["canonicalPreimages"].items():
            need(hashlib.sha256(zf.read(rel)).hexdigest() == old,
                 "P04 zip backup member changed: " + rel)
    for rel, expected in apply["stagePostimages"].items():
        need(sha(rooted(rel)) == expected and
             sha(STAGE.joinpath(*rel.split("/"))) == expected,
             "P04 copied postimage drift: " + rel)

    stage_receipt = f["stageReceipt"]
    need(sha(rooted(stage_receipt["path"])) == stage_receipt["sha256"],
         "P04 staging receipt drift")
    manifest = rooted(stage_receipt["qaManifestPath"])
    need(sha(manifest) == stage_receipt["qaManifestSHA256"],
         "P04 staging QA manifest drift")
    stage_qa_evidence = 0
    for line in manifest.read_text(encoding="utf-8").splitlines():
        expected, filename = line.split(" *", 1)
        need(sha(Path(filename)) == expected.lower(), "original stage QA log/source drift")
        stage_qa_evidence += 1
    need(stage_qa_evidence >= 25, "P04 original RED/FAIL and QA rows missing")

    for rel, expected in f["qaLogsSHA256"].items():
        need(sha(rooted(rel)) == expected, "canonical/stage QA log drift: " + rel)

    browser_cases = {}
    browser_receipts = {}
    screenshot_count = 0
    browser_files = 0
    screenshot_sets = []
    for name in ("stage", "canonical"):
        b = f["browser"][name]
        receipt = rooted(b["receiptPath"])
        need(sha(receipt) == b["receiptSHA256"],
             name + " P04 browser receipt drift")
        body = load(receipt)
        need(body.get("overallStatus") == "PASS" and
             body.get("sourceTreeStable") is True and
             body.get("sourceManifestBefore") == body.get("sourceManifestAfter") and
             body.get("serverCleanup") == "PASS",
             name + " browser pass/source/server cleanup changed")
        need(body["sourceManifestBefore"]["sha256"] == b["sourceManifestSHA256"],
             name + " browser source manifest changed")
        need(len(body.get("cases", [])) == 7 and
             all(x.get("status") == "PASS" and x.get("loadedBodyCount") == 35
                 and all(v == 0 for v in x.get("errorCounts", {}).values())
                 for x in body["cases"]),
             name + " selected cases/source-load/error checks changed")
        deny = body.get("photoDeny", {})
        need(deny.get("status") == "PASS" and
             len(deny.get("paths", [])) == 8 and
             all(x.get("statusCode") == 404 for x in deny["paths"]),
             name + " reference JPG HTTP deny changed")
        shas = []
        for row in b["screenshots"]:
            image = rooted(row["path"])
            need(image.stat().st_size == row["bytes"] and sha(image) == row["sha256"],
                 "P04 screenshot changed: " + str(image))
            shas.append(row["sha256"])
            screenshot_count += 1
        need(len(shas) == 7, name + " did not preserve seven screenshots")
        screenshot_sets.append(sorted(shas))
        for filename, metadata in b["directoryArtifacts"].items():
            path = receipt.parent / filename
            need(path.stat().st_size == metadata["bytes"] and
                 sha(path) == metadata["sha256"],
                 name + " browser artifact drift: " + filename)
            browser_files += 1
        browser_cases[name] = len(body["cases"])
        browser_receipts[name] = b["receiptSHA256"]
    need(screenshot_count == 14 and screenshot_sets[0] == screenshot_sets[1],
         "P04 staged/canonical screenshots no longer match")
    need(f["browser"]["stage"]["sourceManifestSHA256"] ==
         f["browser"]["canonical"]["sourceManifestSHA256"],
         "P04 staged/canonical source manifest no longer same")

    photos = f["photoReferenceSHA256"]
    need(len(photos) == 8, "P04 reference JPEG count changed")
    for name, meta in photos.items():
        photo = ROOT / "sources/FCV588_GiaoDienThucTeMay2016" / name
        need(sha(photo) == meta["sha256"] and
             photo.stat().st_size == meta["bytes"] and
             meta["rights"] == "REFERENCE_ONLY_CLEARANCE_NOT_OBTAINED",
             "reference photo SHA/size/rights drift: " + name)

    ledger = f["implementationStatusLedger"]
    ledger_path = rooted(ledger["path"])
    need(sha(ledger_path) == ledger["sha256"], "implementation ledger SHA drift")
    claims = load(ledger_path)
    rows = claims.get("operatorRows", []) + claims.get("teacherRows", [])
    need(len(rows) == 65 and all(x.get("claimDecision") == "HOLD" for x in rows)
         and claims.get("hardwareValidated") is False
         and claims.get("rightsClearance") is False
         and claims.get("firmwareInstalled") is None
         and claims.get("releaseApproval") == "HOLD"
         and f.get("hardwareValidated") is False
         and f.get("rightsClearance") is False
         and f.get("firmwareInstalled") == "UNKNOWN"
         and f.get("featureClaims") == "65/65_HOLD"
         and f.get("phase6") == "OPEN"
         and f.get("releaseApproval") == "HOLD"
         and f.get("oemConformity") == "NOT_CLAIMED",
         "65 claims/HW/rights/firmware/release/HOLD status drift")

    post = {
        "schema": "fcv588-visual-p04-bounded-independent-postreceipt-v1",
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "status": "P04_BOUNDED_INDEPENDENT_POSTRECEIPT_PASS_RIGHTS_HARDWARE_RELEASE_HOLD",
        "finalReceiptPath": FINAL.relative_to(ROOT).as_posix(),
        "finalReceiptSHA256": EXPECTED_FINAL,
        "finalIntegrityScriptSHA256": EXPECTED_SCRIPT,
        "procedureSHA256": EXPECTED_PROCEDURE,
        "recheckedRuntime": "39/39_STAGE_CANONICAL_MATCH",
        "recheckedCanonicalTests": {"node": "541/541_PASS", "python": "13/13_PASS"},
        "recheckedBrowserReceipts": browser_receipts,
        "recheckedBrowserCases": browser_cases,
        "recheckedScreenshotHashes": "14/14_MATCH_STAGE_CANONICAL",
        "recheckedBrowserArtifacts": browser_files,
        "recheckedStageQaManifestRows": stage_qa_evidence,
        "recheckedPhotoReferences": "8/8_ORIGINAL_SHA_MATCH_HTTP_DENY",
        "parentP03FinalSHA256": f["parentP03"]["finalSHA256"],
        "parentP03PostreceiptSHA256": f["parentP03"]["postreceiptSHA256"],
        "guardedBackupSHA256": guard["backupSHA256"],
        "guardedApplySHA256": guard["receiptSHA256"],
        "coreWorldSessionReplayChanged": False,
        "rightsClearance": False, "hardwareValidated": False,
        "firmwareInstalled": "UNKNOWN", "featureClaims": "65/65_HOLD",
        "phase6": "OPEN", "releaseApproval": "HOLD",
        "oemConformity": "NOT_CLAIMED",
        "scopeLimit": "P04 bounded BL/DUAL/NAV synthetic software, not full phase4 or OEM certification",
        "notes": "Independent post-seal filesystem reread; no runtime/old receipt/source photo modification.",
    }
    with POST.open("x", encoding="utf-8", newline="\n") as file:
        json.dump(post, file, ensure_ascii=False, indent=2)
        file.write("\n")
    need(load(POST)["finalReceiptSHA256"] == sha(FINAL), "P04 postreceipt self-recheck fail")
    print("P04_BOUNDED_POSTRECEIPT=" + str(POST))
    print("POSTRECEIPT_SHA256=" + sha(POST))
    print("FINAL_SHA256=" + sha(FINAL))
    print("RECHECKED=runtime39; Node541; Python13; Chrome7+7; PNG14; photos8; 65 HOLD")


if __name__ == "__main__":
    main()
