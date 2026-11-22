#!/usr/bin/env python3
"""Derive a research-only 65-item FCV-588 feature register from our own notes.

Does not open publisher PDFs, infer hardware features, or claim a valid release.
Use --check to verify the committed JSON is still in sync with research notes.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "docs" / "research" / "FCV588_FULL_FUNCTION_INVENTORY_2026-10-13.md"
DST = ROOT / "docs" / "research" / "FCV588_FEATURE_REGISTER_DRAFT.json"
SECTIONS = {
    "A": "panel_controls_basic",
    "B": "sonar_display",
    "C": "alarms_navigation",
    "D": "system_diagnostics",
}


def build_register() -> dict:
    features: list[dict] = []
    for line in SRC.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|"):
            continue
        columns = [value.strip() for value in line.strip().strip("|").split("|")]
        if len(columns) != 5:
            continue
        code, requirement, manual_section, options, f0_marker_raw = columns
        if len(code) != 3 or code[0] not in SECTIONS or not code[1:].isdigit():
            continue
        f0_marker = f0_marker_raw[:1]
        if f0_marker not in ("P", "H", "N"):
            raise ValueError(f"unknown F0 research marker {f0_marker_raw!r} for {code}")
        scope = "INSTRUCTOR_PLATFORM" if "TEACHER" in options else "FCV_OPERATOR"
        features.append({
            "id": code,
            "domain": SECTIONS[code[0]],
            "scope": scope,
            "requirementDraft": requirement,
            "manualReferenceDraft": manual_section,
            "dependencyDraft": options,
            "f0ResearchMarker": f0_marker,
            "f0ResearchNote": f0_marker_raw if f0_marker_raw != f0_marker else None,
            "operatorFidelityStatus": (
                ("SIMULATED_ONLY" if f0_marker == "P" else "OPEN")
                if scope == "FCV_OPERATOR" else None
            ),
            "platformQaStatus": (
                ("SIMULATED_ONLY" if f0_marker == "P" else "OPEN")
                if scope == "INSTRUCTOR_PLATFORM" else None
            ),
            "targetHardwareEvidenceIds": [],
            "operatorApproval": None,
            "validatedProfileRevision": None,
        })
    ids = [x["id"] for x in features]
    if len(features) != 65 or len(set(ids)) != 65:
        raise ValueError(f"inventory must contain 65 unique features: got {len(features)}")
    if Counter(x["id"][0] for x in features) != {"A": 17, "B": 20, "C": 13, "D": 15}:
        raise ValueError("category count drift")
    if sum(x["scope"] == "FCV_OPERATOR" for x in features) != 64 or sum(
        x["scope"] == "INSTRUCTOR_PLATFORM" for x in features
    ) != 1:
        raise ValueError("hardware/operator versus instructor/platform scope drift")
    return {
        "schemaVersion": 1,
        "purpose": "Planning and traceability only, NOT a manufacturer-verified feature register",
        "sourceResearchDocument": str(SRC.relative_to(ROOT)).replace(chr(92), "/"),
        "targetEquipmentProfile": None,
        "releaseApproval": "HOLD",
        "allowedOperatorFidelityStatus": [
            "OPEN", "SIMULATED_ONLY",
            "VERIFIED_IMPLEMENTED", "NOT_APPLICABLE_WITH_EVIDENCE",
        ],
        "releaseRule": "64 FCV_OPERATOR items require device fidelity acceptance; D15 INSTRUCTOR_PLATFORM is a separate course/scoring QA gate",
        "features": features,
    }


def main() -> None:
    cli = argparse.ArgumentParser()
    cli.add_argument("--check", action="store_true")
    args = cli.parse_args()
    expected = build_register()
    if args.check:
        actual = json.loads(DST.read_text(encoding="utf-8"))
        if actual != expected:
            raise SystemExit("FAIL: feature register differs from research inventory")
        print("PASS: 65-feature research register matches current inventory")
    else:
        DST.write_text(
            json.dumps(expected, indent=2, ensure_ascii=False) + "\n", encoding="utf-8",
        )
        statuses = Counter(f["operatorFidelityStatus"] for f in expected["features"]
                           if f["scope"] == "FCV_OPERATOR")
        platform = Counter(f["platformQaStatus"] for f in expected["features"]
                           if f["scope"] == "INSTRUCTOR_PLATFORM")
        print("UPDATED: " + str(DST) + " | device=" + str(dict(statuses)) +
              " | platform=" + str(dict(platform)))


if __name__ == "__main__":
    main()
