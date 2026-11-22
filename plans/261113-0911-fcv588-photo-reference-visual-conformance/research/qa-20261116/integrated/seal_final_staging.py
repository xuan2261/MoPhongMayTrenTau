"""Write a NEW final source/evidence seal after the P06 focus-cascade addendum.

Does not edit runtime or previous integration receipts, including stale P06 v1.
"""
from datetime import datetime, timezone
from pathlib import Path
import json

import p05_p06_guarded_apply as guard

DEST = guard.QA / "P05_P06_INTEGRATED_FINAL_STAGE_20261116.json"

def main():
    guard.require(not DEST.exists(), "final stage receipt exists; do not overwrite")
    data = guard.verify()
    p05 = guard.QA.parent / "p05-menu/P05_MENU_STAGE_RECEIPT_20261116.json"
    p06 = guard.QA.parent / "p06-face/P06_STAGE_IMPLEMENTATION_RECEIPT_20261116.json"
    focus_red = guard.QA.parent / "p06-face/p06-focus-css-cascade-RED-20261116.txt"
    p04_red = guard.QA.parent / "p04-extended/P04_NEAR_BOTTOM_FISH_ONLY_RED_RECEIPT_20261116.json"
    browser_fail_dirs = [guard.QA.parent / "p06-face" / ("browser-prime" + suffix)
                         for suffix in ("", "-v2", "-v3", "-v4")]
    failed = {str(path.relative_to(guard.ROOT)).replace("\\", "/"): guard.sha(path)
              for folder in browser_fail_dirs if folder.exists()
              for path in folder.glob("*-receipt.json")}
    guard.require(len(failed) == 4, "four original P06 Chrome FAILED receipts not preserved")
    guard.require(guard.sha(p05) and guard.sha(p06) and guard.sha(focus_red) and
                  guard.sha(p04_red), "original stage or RED evidence missing")
    receipt = {
        "schema": "fcv588-p05-p06-integrated-staging-final-v1",
        "timestampUtc": datetime.now(timezone.utc).isoformat(),
        "status": "STAGED_P05_P06_BOUNDED_SOFTWARE_QA_PASS_AUTHORITY_GATES_HOLD",
        "scope": "synthetic offline menu presentation and estimated faceplate only",
        "canonicalApplied": False,
        "parentP04FinalSHA256": guard.FINAL_SHA,
        "parentP04PostSHA256": guard.POST_SHA,
        "parentRuntimeCount": len(data["preimageRuntimeSHA256"]),
        "stagedRuntimeCount": len(data["stageRuntimeSHA256"]),
        "changedRuntimePaths": data["changedRuntime"],
        "newTestPaths": data["newTests"],
        "preimageRuntimeSHA256": data["preimageRuntimeSHA256"],
        "stageRuntimeSHA256": data["stageRuntimeSHA256"],
        "newTestSHA256": {rel: guard.sha(guard.STAGE / rel) for rel in guard.NEW},
        "stageQA": data["qaSHA256"],
        "browserScreenshotSHA256": data["screenshotsSHA256"],
        "P05StageReceiptSHA256": guard.sha(p05),
        "P06StageReceiptV1BeforeFocusFixSHA256": guard.sha(p06),
        "P06FocusCascadeRED_SHA256": guard.sha(focus_red),
        "P06OriginalFailedChromeReceiptsSHA256": failed,
        "P04NearBottomFishOnlyREDReceiptSHA256": guard.sha(p04_red),
        "P04NearBottomFishOnlyStatus": "MEDIUM_NOT_FIXED_SOURCE_PROVENANCE_GAP",
        "firmwareLocaleConformance": "HOLD",
        "mediaRights": "HOLD",
        "hardwareValidated": False,
        "releaseApproval": "HOLD",
        "publicFeatureClaims": "65/65 HOLD",
        "originalPhase6": "OPEN"
    }
    guard.write_exclusive(DEST, guard.serialized(receipt))
    print("P05_P06_STAGE_SEAL_SHA256=" + guard.sha(DEST))
    print("STAGE_RUNTIME=39 STAGE_TEST_NEW=4 SCREENSHOTS=6")

if __name__ == "__main__":
    main()
