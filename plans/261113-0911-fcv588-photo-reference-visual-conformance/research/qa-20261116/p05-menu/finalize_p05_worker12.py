from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime
from pathlib import Path


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE = ROOT / "staging/fcv588-photo-p05menu-20261116"
QA = ROOT / "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/p05-menu"
SEAL = ROOT / "docs/qa/FCV588_VISUAL_P04_20261114/FCV588_VISUAL_P04_FINAL_INTEGRITY_20261114.json"
POST = ROOT / "docs/qa/FCV588_VISUAL_P04_20261114/FCV588_VISUAL_P04_INDEPENDENT_POSTRECEIPT_20261114.json"
EXPECTED_SEAL = "c3a292dc213e660fa855c453eaf324fd9014ddb163e4723cea141a4050a1382b"
EXPECTED_POST = "569e4b99a8e8de49502d74db30c0215eb61b238edf3ddaa4d93f6d7ed6b4ec90"
EXPECTED_DIFF = {
    "web/app.mjs": "MODIFIED",
    "web/lcd-presentation.mjs": "MODIFIED",
    "web/styles.css": "MODIFIED",
    "test/fcv588-photo-menu-layout.test.mjs": "NEW",
    "test/fcv588-photo-menu-actions.test.mjs": "NEW",
}
PROTECTED = [
    "src/core/session.mjs", "src/core/protocol.mjs", "src/core/scenario.mjs",
    "src/devices/fcv588/model.mjs", "src/devices/fcv588/menu-atlas.mjs",
]
PHOTO_DIR = ROOT / "sources/FCV588_GiaoDienThucTeMay2016"
PHOTOS = ["giaoDien.jpg", "lf.jpg", "hf.jpg", "dual.jpg", "zoom.jpg", "zoom2.jpg", "nav1.jpg", "nav2.jpg"]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_once(path: Path, data: bytes) -> None:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL)
    try:
        os.write(fd, data)
    finally:
        os.close(fd)


def file_map(root: Path) -> dict[str, Path]:
    found: dict[str, Path] = {}
    for folder in ("src", "web", "test", "tools"):
        base = root / folder
        for path in base.rglob("*"):
            if path.is_file():
                found[path.relative_to(root).as_posix()] = path
    for name in (".gitignore", "package.json", "README.md", "VietMoPhongChoTatCaCacMay.md"):
        path = root / name
        if path.is_file():
            found[name] = path
    return found


def diff_scan() -> list[dict]:
    canonical = file_map(ROOT)
    stage = file_map(STAGE)
    rows = []
    for rel in sorted(set(canonical) | set(stage)):
        cp, sp = canonical.get(rel), stage.get(rel)
        csha = sha(cp) if cp else None
        ssha = sha(sp) if sp else None
        if csha != ssha:
            rows.append({"path": rel, "kind": "NEW" if cp is None else "REMOVED" if sp is None else "MODIFIED",
                         "canonicalSha256": csha, "stageSha256": ssha})
    return rows


def log_check(name: str, markers: list[str]) -> dict:
    path = QA / name
    text = path.read_text(encoding="utf-8", errors="replace")
    missing = [marker for marker in markers if marker not in text]
    return {"path": str(path), "sha256": sha(path), "markers": markers,
            "status": "PASS" if not missing else "FAILED", "missing": missing}


def main() -> int:
    diffs = diff_scan()
    actual = {row["path"]: row["kind"] for row in diffs}
    exact_allowlist = actual == EXPECTED_DIFF
    protected = []
    for rel in PROTECTED:
        c, s = ROOT / rel, STAGE / rel
        row = {"path": rel, "canonicalSha256": sha(c), "stageSha256": sha(s)}
        row["match"] = row["canonicalSha256"] == row["stageSha256"]
        protected.append(row)

    red = log_check("p05-red.txt", ["# tests 4", "# fail 3", "undefined !== '1x'", "- 'HOLD'"])
    green = log_check("p05-green-targeted-final2.txt", ["# tests 4", "# pass 4", "# fail 0"])
    node = log_check("p05-full-node-final2.txt", ["# tests 545", "# pass 545", "# fail 0"])
    python = log_check("p05-python-final2.txt", ["Ran 13 tests", "OK"])
    browser_run = QA / "p05-browser-run-final2.txt"
    browser_summary = json.loads(browser_run.read_text(encoding="utf-8"))
    browser_receipt_path = Path(browser_summary["receipt"])
    browser_receipt = json.loads(browser_receipt_path.read_text(encoding="utf-8"))
    browser_ok = (
        browser_summary.get("status") == "PASS"
        and browser_summary.get("port") != 4173
        and browser_receipt.get("overallStatus") == "PASS"
        and browser_receipt.get("photoDeny", {}).get("status") == "PASS"
        and len(browser_receipt.get("cases", [])) == 3
        and all(case.get("status") == "PASS" for case in browser_receipt["cases"])
        and all(case.get("loadedBodyCount", 0) == case.get("loadedBodyMatches", -1) and case.get("loadedBodyCount", 0) > 0
                for case in browser_receipt["cases"])
        and browser_receipt.get("sourceTreeStable") is True
        and browser_receipt.get("serverCleanup") == "PASS"
    )
    seals = {"p04Final": {"path": str(SEAL), "sha256": sha(SEAL), "expected": EXPECTED_SEAL},
             "p04IndependentPost": {"path": str(POST), "sha256": sha(POST), "expected": EXPECTED_POST}}
    seals_ok = seals["p04Final"]["sha256"] == EXPECTED_SEAL and seals["p04IndependentPost"]["sha256"] == EXPECTED_POST
    projection_text = (STAGE / "web/lcd-presentation.mjs").read_text(encoding="utf-8")
    locale_hold = 'localeConformance:"HOLD"' in projection_text
    photos = [{"name": name, "sha256": sha(PHOTO_DIR / name)} for name in PHOTOS]

    checks_ok = (exact_allowlist and all(row["match"] for row in protected) and seals_ok and locale_hold
                 and all(item["status"] == "PASS" for item in (red, green, node, python)) and browser_ok)
    receipt = {
        "schema": "fcv588-p05-menu-isolated-stage-v1",
        "createdAt": datetime.now().astimezone().isoformat(),
        "scope": "P05_MENU_ISOLATED_STAGING_ONLY_NO_CANONICAL_APPLY",
        "canonicalRoot": str(ROOT), "stageRoot": str(STAGE), "qaRoot": str(QA),
        "canonicalSeals": seals,
        "referenceOnlyPhotos": photos,
        "menuLocaleConformance": "HOLD",
        "allowlist": {"status": "EXACT_5_PATHS" if exact_allowlist else "FAILED",
                      "expected": EXPECTED_DIFF, "actualDiff": diffs},
        "protectedCanonicalEquivalence": protected,
        "implementation": {
            "projectionOwner": "web/lcd-presentation.mjs::projectFcvMainMenu",
            "domOwner": "web/app.mjs::renderMainMenuChrome",
            "cssSelectorsEdited": [
                '.lcd-overlay[data-layout="main-menu"]',
                '.lcd-overlay[data-layout="main-menu"] .lcd-overlay-title',
                '.lcd-overlay[data-layout="main-menu"] .lcd-menu-body',
                '.lcd-overlay[data-layout="main-menu"] .lcd-menu-main',
                '.lcd-overlay[data-layout="main-menu"] .lcd-overlay-content',
                '.lcd-overlay[data-layout="main-menu"] .lcd-menu-row',
                '.lcd-overlay[data-layout="main-menu"] .lcd-menu-label',
                '.lcd-overlay[data-layout="main-menu"] .lcd-menu-value',
                '.lcd-overlay[data-layout="main-menu"] .lcd-menu-options',
            ],
            "behavior": ["two-column label/value rows", "five-group left sidebar", "bounded overlay leaves sonar/depth visible",
                         "operator-key footer only", "choice editor overlays right pane", "MENU/ESC cancel and ENTER commit preserved",
                         "keyboard left/right/Escape preserved", "375px no horizontal overflow"],
        },
        "validation": {"red": red, "greenTargeted": green, "nodeFull": node, "python": python,
                       "browser": {"runPath": str(browser_run), "runSha256": sha(browser_run),
                                   "receiptPath": str(browser_receipt_path), "receiptSha256": sha(browser_receipt_path),
                                   "manifestPath": browser_summary["manifest"], "manifestSha256": browser_summary["manifestSha256"],
                                   "status": "PASS" if browser_ok else "FAILED", "port": browser_summary["port"],
                                   "photoDeny": browser_receipt["photoDeny"],
                                   "cases": [{"name": c["name"], "loadedBodyCount": c["loadedBodyCount"],
                                              "loadedBodyMatches": c["loadedBodyMatches"],
                                              "screenshotSha256": c["screenshot"]["sha256"],
                                              "uncoveredBottomFraction": c["geometryProof"]["uncoveredBottomFraction"]}
                                             for c in browser_receipt["cases"]]}},
        "operations": {"canonicalApplied": False, "commitCreated": False,
                       "userOwnedPort4173Operation": "NONE", "networkHardwareIo": "NONE"},
        "status": "PASS" if checks_ok else "FAILED",
        "canonicalReadiness": "NOT_REQUESTED_NO_APPLY",
        "objectiveFailures": [] if checks_ok else [
            *( [] if exact_allowlist else ["allowlist mismatch"] ),
            *( [] if all(row["match"] for row in protected) else ["protected source drift"] ),
            *( [] if seals_ok else ["P04 seal drift"] ),
            *( [] if locale_hold else ["MENU_LOCALE_CONFORMANCE HOLD missing"] ),
            *( [] if browser_ok else ["browser QA failed"] ),
        ],
    }
    receipt_path = QA / "P05_MENU_STAGE_RECEIPT_20261116.json"
    write_once(receipt_path, (json.dumps(receipt, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    manifest_path = QA / "P05_MENU_STAGE_QA_SHA256_20261116.txt"
    artifacts = sorted(path for path in QA.rglob("*") if path.is_file() and path != manifest_path)
    write_once(manifest_path, ("\n".join(f"{sha(path)} *{path.relative_to(QA).as_posix()}" for path in artifacts) + "\n").encode("utf-8"))
    print(json.dumps({"status": receipt["status"], "receipt": str(receipt_path), "receiptSha256": sha(receipt_path),
                      "manifest": str(manifest_path), "manifestSha256": sha(manifest_path),
                      "allowlist": diffs, "protected": protected, "browserReceiptSha256": sha(browser_receipt_path)},
                     ensure_ascii=True, indent=2))
    return 0 if checks_ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
