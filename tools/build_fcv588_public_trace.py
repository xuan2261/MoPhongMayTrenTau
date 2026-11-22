#!/usr/bin/env python3
"""Build an explicitly UNAPPROVED public-reference index from curated project notes.

Never opens the publisher's restricted PDF/media archive. Do not promote this
register to real hardware fidelity or operator conformance.
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/research/FCV588_FEATURE_REGISTER_DRAFT.json"
DEST = ROOT / "docs/evidence/fcv588-public-trace-matrix.json"


def build():
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    rows = []
    for feature in data["features"]:
        instructor = feature["scope"] == "INSTRUCTOR_PLATFORM"
        fid = feature["id"]
        ids = [] if instructor else ["PUB-FCV-001"]
        if fid in {"A01", "A02", "A06", "A07"}:
            ids += ["PUB-FCV-002", "PUB-FCV-003"]
        if fid in {"B14", "B15", "B16", "B17", "B18", "D09"}:
            ids.append("PUB-FCV-009")
        if fid in {"B07", "D04"}:
            ids.append("PUB-FCV-011")
        refs = [] if instructor else [feature["manualReferenceDraft"]]
        partial = feature["operatorFidelityStatus"] == "SIMULATED_ONLY"
        rows.append({
            "featureId": fid,
            "scope": feature["scope"],
            "domain": feature["domain"],
            "manualRefs": refs,
            "publicSourceIds": list(dict.fromkeys(ids)),
            "authorityTier": "INTERNAL_TRAINING" if instructor else "MANUFACTURER_MANUAL",
            "evidenceMode": "INDEPENDENT_PLATFORM_TEST" if instructor else "CURATED_MANUAL_NOTES",
            "rightsDecision": "ORIGINAL_PLATFORM_CODE" if instructor else "CURATED_NOTES_ONLY",
            "profileIds": [] if instructor else ["FCV588_PUBLIC_DEMO_UNKNOWN_FW"],
            "guardExpression": "TEACHER_ONLY" if instructor else
                               "DRAFT_" + str(feature["dependencyDraft"]).replace("/", "_"),
            "sourceStatus": "PLATFORM_ONLY" if instructor else "CURATED_REFERENCE_NOT_BEHAVIOR_VERIFIED",
            "unknowns": [] if instructor else [
                "installed firmware and hardware options unknown",
                "exact operator interaction and visible result require public-source check",
            ],
            "implementationStatus": "SIMULATED_APPROXIMATION" if (instructor or partial) else "OPEN",
            "courseReviewStatus": "NOT_REVIEWED",
            "claimDecision": "HOLD_UNTIL_IMPLEMENTED_AND_REVIEWED",
            **({"platformQaStatus": "SIMULATED_ONLY"} if instructor else {}),
        })
    return {
        "schemaVersion": 1,
        "profileClass": "PUBLIC_REFERENCE",
        "hardwareValidated": False,
        "firmwareInstalled": None,
        "claimCeiling": "PUBLIC_REFERENCE_CONFORMANT",
        "sourceResearchDocument": "docs/research/FCV588_FEATURE_REGISTER_DRAFT.json",
        "sourcePolicy": "Existing independently-authored curated research notes only; no newly extracted OEM media.",
        "rows": rows,
        "additionalMenuCoverage": [
            {"menuArea": name, "sourceId": "PUB-FCV-001", "sourceStatus": "SOURCE_GAP",
             "courseReviewStatus": "NOT_REVIEWED"} for name in [
                "APPENDIX_1_MENU_TREE", "INSTALLATION_4_9_IEC",
                "INSTALLATION_4_10_SETUP", "SYSTEM_TANKENMARU_NMEA_BRANCH",
            ]
        ],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    wanted = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not DEST.exists() or DEST.read_text(encoding="utf-8") != wanted:
            raise SystemExit("FAIL: FCV public trace differs from curated 65-row register")
        print("PASS: 64 FCV operator rows + D15 isolated, public claims still HOLD")
    else:
        DEST.write_text(wanted, encoding="utf-8")
        print("WROTE: 65 unapproved public trace rows")


if __name__ == "__main__":
    main()
