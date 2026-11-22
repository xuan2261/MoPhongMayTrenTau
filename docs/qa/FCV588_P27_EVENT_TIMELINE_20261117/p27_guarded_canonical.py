"""P27 guarded local-only canonical transaction; no web requests, no process control.

Modes: dryrun (read-only source + write-once preimage zip/receipt),
       apply (only six pinned source targets), audit (read-only post-apply).
Preserves old RED/FAILED evidence, P26 canonical evidence and OEM originals.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile
import zipfile

ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT / "staging/fcv588-p27-event-timeline-20261117"
QA = ROOT / "docs/qa/FCV588_P27_EVENT_TIMELINE_20261117"
P26 = ROOT / "docs/qa/FCV588_P26_HISTORICAL_BZ_VIEWER_20261117"
P26_FINAL = P26 / "FCV588_P26_HISTORICAL_BZ_VIEWER_FINAL_INTEGRITY_20261117.json"
P26_POST = P26 / "FCV588_P26_HISTORICAL_BZ_VIEWER_INDEPENDENT_SHA_POSTRECEIPT_20261117.json"
P26_FINAL_HASH = "ecf30f5545c626c6d95a6f3797ae577ad48e66af8ae7ca8f3c27a9ba118d5d5a"
P26_POST_HASH = "3797f82bb079e6c89cc4c3523a093e187458c5c6037d4c4e78700b9fabbd5ef6"
MODIFIED = (
    "web/app.mjs",
    "web/index.html",
    "web/styles.css",
    "web/fcv588-archive-bz-viewer.mjs",
)
ADDED = (
    "web/fcv588-archive-timeline.mjs",
    "test/fcv588-p27-archive-timeline.test.mjs",
)
SIX = MODIFIED + ADDED
ZIP_PATH = QA / "P27_CANONICAL_PREIMAGE_FOUR_PATHS_20261117.zip"
DRYRUN = QA / "P27_FRESH_GUARDED_DRYRUN_20261117.json"
APPLY = QA / "P27_GUARDED_CANONICAL_APPLY_20261117.json"
CHROME = QA / "P27_STAGE_BROWSER_V12_20261117.json"
NODE = QA / "P27_STAGE_FULL_NODE_FINAL_V12_20261117.txt"
FOCUSED = QA / "P27_STAGE_FOCUSED_FINAL_V12_20261117.txt"
PYTHON = QA / "P27_STAGE_PYTHON_FINAL_V12_20261117.txt"
ORIGINAL_REDS = (
    "P27_SOURCE_VALID_RED_20261117.txt",
    "P27_INDEPENDENT_PREFIX_PROVENANCE_RED_20261117.txt",
    "P27_HIDDEN_CANVAS_SOURCE_VALID_RED_20261117.txt",
    "P27_PARENT_HIDDEN_SOURCE_VALID_RED_20261117.txt",
    "P27_CANVAS_VISIBLE_AT_PAINT_SOURCE_VALID_RED_20261117.txt",
    "P27_CANVAS_NATIVE_TEXT_SOURCE_VALID_RED_20261117.txt",
)


def ensure(predicate, message):
    if not predicate:
        raise RuntimeError("P27 FAIL-CLOSED: " + message)


def sha(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as f:
        for b in iter(lambda: f.read(1024 * 1024), b""):
            h.update(b)
    return h.hexdigest()


def text(path):
    return Path(path).read_text(encoding="utf-8")


def read_json(path):
    return json.loads(text(path))


def write_new_json(path, data):
    with Path(path).open("x", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")


def source_files(root):
    files = {}
    for folder in ("src", "web", "test"):
        for f in (root / folder).rglob("*"):
            if not f.is_file() or "__pycache__" in f.parts or f.suffix == ".pyc":
                continue
            name = f.relative_to(root).as_posix()
            files[name] = sha(f)
    return files


def read_parent():
    ensure(sha(P26_FINAL) == P26_FINAL_HASH, "P26 final receipt SHA drift")
    ensure(sha(P26_POST) == P26_POST_HASH, "P26 independent postreceipt SHA drift")
    parent = read_json(P26_FINAL)
    runtime = parent["canonicalRuntime53SHA256"]
    photos = parent["OEMReferenceOnly8SHA256"]
    ensure(len(runtime) == 53, "P26 runtime path cardinality not 53")
    ensure(len(photos) == 8, "P26 OEM photo count not eight")
    for name, pinned in photos.items():
        path = ROOT / "sources/FCV588_GiaoDienThucTeMay2016" / name
        ensure(path.is_file() and sha(path) == pinned, f"OEM reference SHA drift: {name}")
    ensure(parent["releaseApproval"] == "HOLD", "P26 release approval drift")
    ensure(parent["hardwareValidated"] is False, "P26 hardware grade drift")
    ensure(parent["claims"] == "65/65 HOLD", "P26 source claims drift")
    ensure(parent["firmware"] == "UNKNOWN", "P26 firmware provenance drift")
    return parent, runtime, photos


def test_receipts():
    focused = text(FOCUSED)
    node = text(NODE)
    python = text(PYTHON)
    ensure(re.search(r"(?m)^# tests 8\s*$", focused) and
           re.search(r"(?m)^# pass 8\s*$", focused) and
           re.search(r"(?m)^# fail 0\s*$", focused), "focused 8/8 evidence")
    ensure(re.search(r"(?m)^# tests 613\s*$", node) and
           re.search(r"(?m)^# pass 613\s*$", node) and
           re.search(r"(?m)^# fail 0\s*$", node) and
           re.search(r"(?m)^# skipped 0\s*$", node), "Node 613/613 evidence")
    ensure("Ran 13 tests" in python and re.search(r"(?m)^OK\s*$", python) and
           "FAILED" not in python, "Python 13/13 evidence")
    chrome = read_json(CHROME)
    ensure(chrome["status"] == "PASS" and len(chrome["cases"]) == 10 and
           not chrome["errors"] and chrome["qaPortClosed"] is True and
           chrome["ownedServerExited"] is True and
           chrome["sourceBodiesCount"] == 52, "stage Chrome V12 10/10 evidence")
    ensure(chrome["userServer4173Interaction"] == "NONE_BY_DESIGN_NOT_PROBED",
           "stage Chrome 4173 isolation claim changed")
    for route, expected in chrome["httpBodies"].items():
        relative = "web/index.html" if route == "/" else route.lstrip("/")
        ensure(relative.startswith(("src/", "web/")) and
               sha(STAGE / relative) == expected, f"Chrome HTTP body/source mismatch {route}")
    for name, expected in chrome["screenshots"].items():
        ensure(sha(QA / name) == expected, f"Chrome screenshot hash drift {name}")
    for name, expected in chrome["sourceSHA256"].items():
        ensure(sha(STAGE / name) == expected, f"Chrome source receipt drift {name}")
    for name in ORIGINAL_REDS:
        ensure((QA / name).is_file(), f"missing original source-valid RED {name}")
    return {x.name: sha(x) for x in (FOCUSED, NODE, PYTHON, CHROME)}, chrome


def compare_preapply(runtime):
    for name, expected in runtime.items():
        ensure((ROOT / name).is_file() and sha(ROOT / name) == expected,
               f"canonical preimage drift: {name}")
    canonical = source_files(ROOT)
    staged = source_files(STAGE)
    changed = sorted(name for name in staged if
                     name in canonical and staged[name] != canonical[name])
    added = sorted(set(staged) - set(canonical))
    canonical_only = sorted(set(canonical) - set(staged))
    ensure(changed == sorted(MODIFIED), f"unexpected modified source paths {changed}")
    ensure(added == sorted(ADDED), f"unexpected new source paths {added}")
    ensure(not canonical_only, f"canonical source omitted from stage {canonical_only}")
    ensure(not any(STAGE.rglob("*.jpg")), "stage contains OEM/photo JPG")
    for name in ADDED:
        ensure(not (ROOT / name).exists(), f"new canonical target already exists: {name}")
    return {name: sha(STAGE / name) for name in SIX}, {
        name: sha(ROOT / name) for name in MODIFIED
    }


def check_backup(preimages, backup_hash=None):
    ensure(ZIP_PATH.is_file(), "preimage ZIP missing")
    if backup_hash is not None:
        ensure(sha(ZIP_PATH) == backup_hash, "preimage ZIP changed")
    with zipfile.ZipFile(ZIP_PATH) as z:
        ensure(sorted(z.namelist()) == sorted(MODIFIED), "backup path inventory differs")
        for name, expected in preimages.items():
            ensure(hashlib.sha256(z.read(name)).hexdigest() == expected,
                   f"backup did not preserve canonical preimage: {name}")


def dryrun():
    ensure(not DRYRUN.exists() and not ZIP_PATH.exists(), "dryrun/backup is write-once")
    parent, runtime, photos = read_parent()
    evidence, chrome = test_receipts()
    staged, preimages = compare_preapply(runtime)
    ensure(not APPLY.exists(), "apply receipt already exists")
    with zipfile.ZipFile(ZIP_PATH, "x", compression=zipfile.ZIP_DEFLATED) as z:
        for name in MODIFIED:
            z.write(ROOT / name, arcname=name)
    backup_hash = sha(ZIP_PATH)
    check_backup(preimages, backup_hash)
    write_new_json(DRYRUN, {
        "schema": "FCV588_P27_FRESH_GUARDED_DRYRUN_V1",
        "createdUTC": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "status": "P27_PREAPPLY_VERIFIED_NO_CANONICAL_MUTATION",
        "parentP26FinalSHA256": P26_FINAL_HASH,
        "parentP26PostSHA256": P26_POST_HASH,
        "canonicalRuntimePreimage53SHA256": runtime,
        "originalOEMReferenceOnly8SHA256": photos,
        "allowlistModified": list(MODIFIED),
        "allowlistNew": list(ADDED),
        "preimageModifiedSHA256": preimages,
        "stagedSixSHA256": staged,
        "preimageBackupZIPSHA256": backup_hash,
        "stageQAReceiptSHA256": evidence,
        "stageChromeCases": len(chrome["cases"]),
        "stageChromeHTTPBodySHA256Count": len(chrome["httpBodies"]),
        "stageChromeScreenshotSHA256": chrome["screenshots"],
        "originalSourceValidRedSHA256": {
            name: sha(QA / name) for name in ORIGINAL_REDS
        },
        "independentStageSourceReview": "worker-38 GO_BOUNDED read-only, chat report; not an OEM signature",
        "historicalAuthentication": False,
        "releaseApproval": "HOLD",
        "phase6": "OPEN",
        "claims": "65/65 HOLD",
    })
    print(json.dumps({"status": "DRYRUN_PASS", "sha": sha(DRYRUN),
                      "backupSHA": backup_hash, "modified": list(MODIFIED),
                      "new": list(ADDED)}))


def apply():
    ensure(DRYRUN.is_file() and not APPLY.exists(), "dryrun missing or apply already logged")
    pin = read_json(DRYRUN)
    ensure(pin["status"] == "P27_PREAPPLY_VERIFIED_NO_CANONICAL_MUTATION",
           "wrong dryrun verdict")
    parent, runtime, photos = read_parent()
    evidence, chrome = test_receipts()
    staged, preimages = compare_preapply(runtime)
    ensure(pin["canonicalRuntimePreimage53SHA256"] == runtime and
           pin["originalOEMReferenceOnly8SHA256"] == photos and
           pin["stageQAReceiptSHA256"] == evidence and
           pin["preimageModifiedSHA256"] == preimages and
           pin["stagedSixSHA256"] == staged and
           pin["allowlistModified"] == list(MODIFIED) and
           pin["allowlistNew"] == list(ADDED), "dryrun/source/QA SHA drift")
    check_backup(preimages, pin["preimageBackupZIPSHA256"])
    # All immutable source blobs are first staged into target folders under
    # unique temp names. Every target is checked again immediately before
    # mutation; a mid-transaction failure restores all committed paths from
    # the independently hash-verified preimage ZIP (or removes new paths).
    temporaries = []
    committed = []
    try:
        for name in SIX:
            target = ROOT / name
            ensure(target.parent.is_dir(), f"missing target parent {name}")
            with tempfile.NamedTemporaryFile(dir=target.parent, prefix=".p27-guard-",
                                             delete=False) as tmp:
                tmp.write((STAGE / name).read_bytes())
                temporary = Path(tmp.name)
            temporaries.append(temporary)
            ensure(sha(temporary) == staged[name], f"temp source SHA drift {name}")
        for name in MODIFIED:
            ensure(sha(ROOT / name) == preimages[name], f"late canonical SHA drift: {name}")
        for name in ADDED:
            ensure(not (ROOT / name).exists(), f"late new target appeared: {name}")
        try:
            for name, tmp in zip(SIX, temporaries):
                target = ROOT / name
                if name in MODIFIED:
                    ensure(target.is_file() and sha(target) == preimages[name],
                           f"per-target preimage drift: {name}")
                else:
                    ensure(not target.exists(), f"per-target new source conflict: {name}")
                os.replace(tmp, target)
                committed.append(name)
                ensure(sha(target) == staged[name],
                       f"per-target installed source SHA drift: {name}")
            for name in SIX:
                ensure(sha(ROOT / name) == staged[name],
                       f"post-apply SHA mismatch: {name}")
        except BaseException as original:
            rollback_errors = []
            # Restore in reverse transaction order. ZIP was verified above
            # and is not modified by the transaction.
            with zipfile.ZipFile(ZIP_PATH) as backup:
                for name in reversed(committed):
                    target = ROOT / name
                    try:
                        if name in MODIFIED:
                            with tempfile.NamedTemporaryFile(
                                dir=target.parent, prefix=".p27-rollback-",
                                delete=False,
                            ) as restore:
                                restore.write(backup.read(name))
                                restore_path = Path(restore.name)
                            try:
                                ensure(sha(restore_path) == preimages[name],
                                       f"rollback ZIP SHA drift: {name}")
                                os.replace(restore_path, target)
                            finally:
                                if restore_path.exists():
                                    restore_path.unlink()
                        elif target.exists():
                            target.unlink()
                    except BaseException as rollback_error:
                        rollback_errors.append(f"{name}: {rollback_error}")
            for name, expected in preimages.items():
                try:
                    ensure(sha(ROOT / name) == expected,
                           f"rollback readback SHA mismatch: {name}")
                except BaseException as rollback_error:
                    rollback_errors.append(str(rollback_error))
            for name in ADDED:
                if (ROOT / name).exists():
                    rollback_errors.append(f"rollback left new target: {name}")
            if rollback_errors:
                raise RuntimeError(
                    f"P27 partial canonical rollback needs manual intervention: "
                    f"original={original}; rollback={rollback_errors}"
                ) from original
            raise
    finally:
        for tmp in temporaries:
            if tmp.exists():
                tmp.unlink()
    runtime_after = {name: sha(ROOT / name) for name in sorted(set(runtime) | {ADDED[0]})}
    write_new_json(APPLY, {
        "schema": "FCV588_P27_GUARDED_CANONICAL_APPLY_V1",
        "createdUTC": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "status": "P27_GUARDED_APPLY_SIX_PATHS_COMPLETED",
        "committedPaths": committed,
        "modifiedPreimageSHA256": preimages,
        "stageSixSHA256": staged,
        "parentRuntime53SHA256": runtime,
        "canonicalRuntime54SHA256": runtime_after,
        "preimageZIPHash": pin["preimageBackupZIPSHA256"],
        "dryrunSHA256": sha(DRYRUN),
        "OEMReferenceOnly8SHA256": photos,
        "releaseApproval": "HOLD",
    })
    print(json.dumps({"status": "CANONICAL_APPLIED", "sha": sha(APPLY),
                      "committed": committed, "runtime": len(runtime_after)}))


def audit():
    ensure(APPLY.is_file(), "no guarded apply receipt")
    pin = read_json(APPLY)
    ensure(pin["status"] == "P27_GUARDED_APPLY_SIX_PATHS_COMPLETED", "apply status mismatch")
    ensure(pin["committedPaths"] == list(SIX), "apply path order mismatch")
    ensure(sha(DRYRUN) == pin["dryrunSHA256"], "dryrun changed after apply")
    read_parent()  # P26 receipt and OEM8 only; old runtime parent intentionally superseded.
    for name, expected in pin["canonicalRuntime54SHA256"].items():
        ensure(sha(ROOT / name) == expected, f"postapply runtime drift {name}")
    for name, expected in pin["stageSixSHA256"].items():
        ensure(sha(ROOT / name) == expected and sha(STAGE / name) == expected,
               f"postapply allowlist drift {name}")
    check_backup(pin["modifiedPreimageSHA256"], pin["preimageZIPHash"])
    print(json.dumps({"status": "POSTAPPLY_SOURCE_AUDIT_PASS",
                      "runtimeCount": len(pin["canonicalRuntime54SHA256"]),
                      "appliedSixSHA256": pin["stageSixSHA256"],
                      "applyReceiptSHA256": sha(APPLY)}))


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in {"dryrun", "apply", "audit"}:
        raise SystemExit("usage: python p27_guarded_canonical.py dryrun|apply|audit")
    try:
        {"dryrun": dryrun, "apply": apply, "audit": audit}[sys.argv[1]]()
    except Exception as exc:
        print("NO_GO " + str(exc), file=sys.stderr)
        raise
