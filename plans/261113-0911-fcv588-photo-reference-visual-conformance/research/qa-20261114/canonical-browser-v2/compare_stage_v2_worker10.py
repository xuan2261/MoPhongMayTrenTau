from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
STAGE_RECEIPT = ROOT / (
    "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/"
    "qa-20261114/stage-browser-v2/"
    "fcv588-stage-browser-v2-20261114T093925+0700-9dfb192e.json"
)
CANONICAL_RECEIPT = ROOT / (
    "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/"
    "qa-20261114/canonical-browser-v2/"
    "fcv588-canonical-browser-v2-20261114T094455+0700-10b495d5.json"
)
OUT = ROOT / (
    "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/"
    "qa-20261114/canonical-browser-v2/"
    "fcv588-canonical-vs-stage-v2-20261114T094455+0700-10b495d5.json"
)
STATES = ("LF", "MENU", "DUAL", "HF", "NAV2", "NAV1")


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def main() -> None:
    stage = load(STAGE_RECEIPT)
    canonical = load(CANONICAL_RECEIPT)
    failures: list[str] = []
    viewports = []

    if len(stage["viewports"]) != len(canonical["viewports"]):
        failures.append("viewport count differs")

    for stage_vp, canonical_vp in zip(
            stage["viewports"], canonical["viewports"], strict=False):
        viewport = canonical_vp["viewport"]
        tag = f"{viewport['width']}x{viewport['height']}"
        if viewport != stage_vp["viewport"]:
            failures.append(f"{tag}: viewport identity differs")

        stage_loaded = {
            row["path"]: row["bodySha256"] for row in stage_vp["loadedBodies"]
        }
        canonical_loaded = {
            row["path"]: row["bodySha256"]
            for row in canonical_vp["loadedBodies"]
        }
        source_match = stage_loaded == canonical_loaded
        if not source_match:
            failures.append(f"{tag}: loaded path->body SHA differs")

        screenshots = {}
        proofs = {}
        for state in STATES:
            stage_state = stage_vp["states"][state]
            canonical_state = canonical_vp["states"][state]
            stage_shot = stage_state["screenshot"]["sha256"]
            canonical_shot = canonical_state["screenshot"]["sha256"]
            screenshots[state] = {
                "stageSha256": stage_shot,
                "canonicalSha256": canonical_shot,
                "exactMatch": stage_shot == canonical_shot,
            }
            stage_proof = stage_state["proof"]
            canonical_proof = canonical_state["proof"]
            proofs[state] = {
                "stageHeader": stage_proof["headerActual"],
                "canonicalHeader": canonical_proof["headerActual"],
                "headerMatch":
                    stage_proof["headerActual"] == canonical_proof["headerActual"],
                "stageFailures": stage_proof["failures"],
                "canonicalFailures": canonical_proof["failures"],
            }

        all_shots_match = all(row["exactMatch"] for row in screenshots.values())
        if not all_shots_match:
            failures.append(f"{tag}: screenshot SHA differs")
        if not all(
            proof["headerMatch"] and not proof["canonicalFailures"]
            for proof in proofs.values()
        ):
            failures.append(f"{tag}: proof mismatch/failure")

        viewports.append({
            "viewport": viewport,
            "loadedSourcePathShaExactMatch": source_match,
            "loadedSourceCountStage": len(stage_loaded),
            "loadedSourceCountCanonical": len(canonical_loaded),
            "screenshots": screenshots,
            "allScreenshotShaExactMatch": all_shots_match,
            "proofs": proofs,
        })

    stage_manifest = stage["sourceManifestAfter"]["sha256"]
    canonical_manifest = canonical["sourceManifestAfter"]["sha256"]
    manifest_match = stage_manifest == canonical_manifest
    if not manifest_match:
        failures.append("source manifest SHA differs")

    result = {
        "schema": "fcv588-canonical-vs-stage-v2-compare-v1",
        "stageReceipt": str(STAGE_RECEIPT),
        "stageReceiptSha256": sha256_file(STAGE_RECEIPT),
        "canonicalReceipt": str(CANONICAL_RECEIPT),
        "canonicalReceiptSha256": sha256_file(CANONICAL_RECEIPT),
        "sourceManifestStageSha256": stage_manifest,
        "sourceManifestCanonicalSha256": canonical_manifest,
        "sourceManifestExactMatch": manifest_match,
        "viewports": viewports,
        "all18ScreenshotShaExactMatch":
            all(vp["allScreenshotShaExactMatch"] for vp in viewports),
        "objectiveFailures": failures,
        "status": "PASS" if not failures else "FAILED",
    }
    data = (json.dumps(result, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    fd = os.open(OUT, os.O_WRONLY | os.O_CREAT | os.O_EXCL)
    try:
        os.write(fd, data)
    finally:
        os.close(fd)
    print(OUT)
    print(hashlib.sha256(data).hexdigest())
    print(result["status"])
    print(json.dumps(result["objectiveFailures"], ensure_ascii=False))


if __name__ == "__main__":
    main()
