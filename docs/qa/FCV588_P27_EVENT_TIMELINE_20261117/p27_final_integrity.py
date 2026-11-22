"""Write-once final P27 integrity after fresh independent canonical QA."""
import datetime
import hashlib
import json
from pathlib import Path
import re
import sys

ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT / "staging/fcv588-p27-event-timeline-20261117"
QA = ROOT / "docs/qa/FCV588_P27_EVENT_TIMELINE_20261117"
P26 = ROOT / "docs/qa/FCV588_P26_HISTORICAL_BZ_VIEWER_20261117"
P26_FINAL = P26 / "FCV588_P26_HISTORICAL_BZ_VIEWER_FINAL_INTEGRITY_20261117.json"
P26_POST = P26 / "FCV588_P26_HISTORICAL_BZ_VIEWER_INDEPENDENT_SHA_POSTRECEIPT_20261117.json"
DRYRUN = QA / "P27_FRESH_GUARDED_DRYRUN_20261117.json"
APPLY = QA / "P27_GUARDED_CANONICAL_APPLY_20261117.json"
BACKUP = QA / "P27_CANONICAL_PREIMAGE_FOUR_PATHS_20261117.zip"
FINAL = QA / "FCV588_P27_EVENT_TIMELINE_FINAL_INTEGRITY_20261117.json"
REPORT = QA / "FCV588_P27_EVENT_TIMELINE_FINAL_REPORT_20261117.md"


def ensure(cond, message):
    if not cond:
        raise RuntimeError("P27 FINAL NO_GO: " + message)


def sha(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as f:
        for chunk in iter(lambda: f.read(1048576), b""):
            h.update(chunk)
    return h.hexdigest()


def obj(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def verify_log(path, total):
    content = path.read_text(encoding="utf-8", errors="replace")
    if "PYTHON" in path.name:
        ensure(f"Ran {total} tests" in content and re.search(r"(?m)^OK\s*$", content),
               f"Python count failed: {path}")
    else:
        for key, num in [("tests", total), ("pass", total), ("fail", 0)]:
            ensure(re.search(fr"(?m)^# {key} {num}\s*$", content),
                   f"Node count failed: {path} {key}")
        ensure(re.search(r"(?m)^# skipped 0\s*$", content), f"Node skips: {path}")
    return sha(path)


def verify_chrome(path, expected_source):
    j = obj(path)
    ensure(j["status"] == "PASS" and len(j["cases"]) == 10,
           f"Chrome cases/status failed: {path}")
    ensure(len(j["httpBodies"]) == 52 and j["sourceBodiesCount"] == 52,
           f"Chrome actual HTTP source count differs: {path}")
    ensure(not j["errors"] and j["qaPortClosed"] is True and
           j["ownedServerExited"] is True, f"Chrome browser errors/port: {path}")
    ensure(j["userServer4173Interaction"] == "NONE_BY_DESIGN_NOT_PROBED",
           "Chrome user server policy changed")
    for route, digest in j["httpBodies"].items():
        name = "web/index.html" if route == "/" else route.lstrip("/")
        ensure(name.startswith(("src/", "web/")) and sha(expected_source / name) == digest,
               f"Chrome source response mismatch {route}")
    for name, digest in j["screenshots"].items():
        ensure(sha(QA / name) == digest, f"Screenshot SHA drift {name}")
    for name, digest in j["sourceSHA256"].items():
        ensure(sha(expected_source / name) == digest, f"Chrome file SHA drift {name}")
    return {
        "receiptSHA256": sha(path),
        "cases": len(j["cases"]),
        "actualHTTPBodySHA256Count": len(j["httpBodies"]),
        "screenshots": j["screenshots"],
        "liveLCDOriginalSHA256": j.get("liveLCDOriginalSHA256"),
        "qaPortClosed": j["qaPortClosed"],
    }


def main():
    ensure(not FINAL.exists() and not REPORT.exists(), "final/summary already exists")
    p26_sha = "ecf30f5545c626c6d95a6f3797ae577ad48e66af8ae7ca8f3c27a9ba118d5d5a"
    p26_post = "3797f82bb079e6c89cc4c3523a093e187458c5c6037d4c4e78700b9fabbd5ef6"
    ensure(sha(P26_FINAL) == p26_sha and sha(P26_POST) == p26_post,
           "P26 parent receipts drift")
    parent = obj(P26_FINAL)
    dryrun = obj(DRYRUN)
    applied = obj(APPLY)
    runtime = applied["canonicalRuntime54SHA256"]
    ensure(len(runtime) == 54 and len(applied["committedPaths"]) == 6,
           "runtime/apply path cardinality")
    ensure(sha(DRYRUN) == applied["dryrunSHA256"],
           "dryrun receipt SHA mismatch")
    ensure(sha(BACKUP) == applied["preimageZIPHash"],
           "preimage ZIP SHA mismatch")
    for name, expected in runtime.items():
        ensure(sha(ROOT / name) == expected, f"runtime54 source drift {name}")
    for name, expected in applied["stageSixSHA256"].items():
        ensure(sha(ROOT / name) == expected == sha(STAGE / name),
               f"allowlisted stage/canonical mismatch {name}")
    ensure(applied["modifiedPreimageSHA256"] == dryrun["preimageModifiedSHA256"],
           "preimage SHA mismatch")
    ensure(parent["releaseApproval"] == "HOLD" and parent["claims"] == "65/65 HOLD" and
           parent["hardwareValidated"] is False, "release/rights grade drift")
    photos = parent["OEMReferenceOnly8SHA256"]
    ensure(len(photos) == 8, "OEM8 count")
    for name, expected in photos.items():
        ensure(sha(ROOT / "sources/FCV588_GiaoDienThucTeMay2016" / name) == expected,
               f"OEM JPEG changed {name}")
    manual = ROOT / "sources/manuals/FCV-588/FURUNO_FCV628_FCV588_Operators_Manual_OME23890E_2025.pdf"
    ensure(sha(manual) == parent["manualSHA256"], "OEM manual SHA changed")
    logs = {}
    for name, total in [
        ("P27_STAGE_FOCUSED_FINAL_V12_20261117.txt", 8),
        ("P27_STAGE_FULL_NODE_FINAL_V12_20261117.txt", 613),
        ("P27_STAGE_PYTHON_FINAL_V12_20261117.txt", 13),
        ("P27_CANONICAL_FOCUSED_20261117.txt", 8),
        ("P27_CANONICAL_FULL_NODE_20261117.txt", 613),
        ("P27_CANONICAL_PYTHON_20261117.txt", 13),
    ]:
        logs[name] = verify_log(QA / name, total)
    stage_chrome = verify_chrome(QA / "P27_STAGE_BROWSER_V12_20261117.json", STAGE)
    canonical_chrome = verify_chrome(QA / "P27_CANONICAL_BROWSER_V1_20261117.json", ROOT)
    reds = {p.name: sha(p) for p in sorted(QA.glob("*SOURCE_VALID_RED_20261117.txt"))}
    ensure(len(reds) >= 3, "lost source-valid RED receipts")
    red_extra = {}
    for name in (
        "P27_PARENT_HIDDEN_SOURCE_VALID_RED_20261117.txt",
        "P27_CANVAS_VISIBLE_AT_PAINT_SOURCE_VALID_RED_20261117.txt",
        "P27_CANVAS_NATIVE_TEXT_SOURCE_VALID_RED_20261117.txt",
    ):
        red_extra[name] = sha(QA / name)
    report_lines = [
        "# P27 — D15 archive event timeline: final bounded integration",
        "",
        "Ngày: 2026-11-17. Canonical: C:\\Work\\MoPhongMayTrenTau.",
        "",
        "## Phạm vi",
        "",
        "- Xác thực toàn bộ envelope v7 + sidecar v1 trước khi replay từng prefix 0..N.",
        "- D15 Previous/Next/slider, deterministic session hash; synthetic BZ chỉ khi POWER ON và LF/HF-ZOOM Bottom Zoom.",
        "- Không tạo derived prefix archive/sidecar hoặc ảnh LCD OEM lịch sử; không thay live session/LCD/timer/storage.",
        "- P26 renderer giữ chữ mặc định; P27 dùng raster-only để bảo đảm pixel RGBA deterministic, chú giải/provenance nằm trong D15.",
        "",
        "## Kết quả kiểm thực hiện",
        "",
        "- Staged focused 8/8, Node 613/613, Python 13/13.",
        "- Staged Chrome V12 10/10, 52 actual HTTP body SHA matched, pixel RGBA first/revisit identical, invalid canvas reset.",
        "- Guarded dryrun/backup four preimages; exact 4 modified + 2 new paths.",
        "- Canonical focused 8/8, Node 613/613, Python 13/13.",
        "- Canonical Chrome V1 10/10, 52 actual HTTP body SHA matched, pixel RGBA repeat and invalid reset.",
        "- Canonical runtime 54/54 source SHA, P26 parent receipts unchanged; OEM photos 8/8 and manual SHA unchanged.",
        "",
        "## Quyết định/giới hạn",
        "",
        "- Worker-38 source/security và guarded preapply GO_BOUNDED là code/transaction reviews; không là OEM reviewer.",
        "- Fingerprints xác định drift nội bộ, KHÔNG xác thực nguồn gốc ngoài hệ thống.",
        "- Synthetic F1 PUBLIC_REFERENCE v2; firmware UNKNOWN, hardwareValidated=false.",
        "- Phase 6 OPEN, 65/65 claims HOLD, releaseApproval=HOLD.",
        "- Giữ toàn bộ RED/FAILED logs, browser diagnostics, parent ZIP/receipts; không xóa hoặc ghi đè.",
        "- Không sử dụng/call HTTP tới user server 4173; QA port chạy cô lập rồi đóng.",
        "",
        "## Đề xuất P28",
        "",
        "Đối chứng trực quan replay timeline LF/HF/DUAL bằng manual/nguồn hợp pháp;",
        "nếu stress 2000 sự kiện đo được trễ đáng kể thì chọn nhánh tối ưu tốc độ seek có test nguồn.",
        "Không tự mở khóa OEM/hardware hoặc triển khai P28 từ đợt này.",
        "",
    ]
    with REPORT.open("x", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(report_lines))
    data = {
        "schema": "FCV588_P27_EVENT_TIMELINE_FINAL_INTEGRITY_V1",
        "createdUTC": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "status": "P27_CANONICAL_BOUNDED_PASS_D15_EVENT_TIMELINE",
        "scope": "F1_PUBLIC_REFERENCE_V2_D15_OFFLINE_SYNTHETIC_ONLY",
        "parentP26FinalSHA256": p26_sha,
        "parentP26IndependentPostreceiptSHA256": p26_post,
        "dryrunSHA256": sha(DRYRUN),
        "guardedApplySHA256": sha(APPLY),
        "preimageBackupZIPSHA256": sha(BACKUP),
        "canonicalRuntime54SHA256": runtime,
        "P27AppliedSixPathsSHA256": applied["stageSixSHA256"],
        "originalOEMReferenceOnly8SHA256": photos,
        "manualSHA256": sha(manual),
        "stageAndCanonicalTestSHA256": logs,
        "stageChrome": stage_chrome,
        "canonicalChrome": canonical_chrome,
        "historicalSourceValidREDsSHA256": {**reds, **red_extra},
        "finalReportSHA256": sha(REPORT),
        "independentReviews": {
            "stageSourceAndSecurity": "worker-38 GO_BOUNDED read-only",
            "preapplyTransaction": "worker-38 read-only gated GO, see chat report",
            "OEMHardware": "NOT_RUN",
        },
        "userServer": "127.0.0.1:4173 PID1204 protected; no QA requests",
        "sourceClass": "SYNTHETIC_TRAINING_ONLY",
        "historicalOEMPixels": False,
        "fingerprintCryptographicAuthentication": False,
        "firmware": "UNKNOWN",
        "hardwareValidated": False,
        "phase6": "OPEN",
        "claims": "65/65 HOLD",
        "releaseApproval": "HOLD",
    }
    with FINAL.open("x", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, sort_keys=True, indent=2, ensure_ascii=False)
        f.write("\n")
    print(json.dumps({"status": data["status"], "finalSHA256": sha(FINAL),
                      "reportSHA256": sha(REPORT), "runtime": len(runtime)}))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise
