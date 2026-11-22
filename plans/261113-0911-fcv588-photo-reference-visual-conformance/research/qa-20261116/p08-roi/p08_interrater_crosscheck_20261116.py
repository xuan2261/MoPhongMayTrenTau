"""Audit two independently selected photo-space corner hypotheses without merging them."""
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
DIR = ROOT / "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116"
M = DIR / "p08-roi/P08_LCD_ROI_UNCALIBRATED_CANDIDATES_20261116.json"
I = DIR / "p08-independent-photo/P08_INDEPENDENT_ROI_AUDIT_20261116.json"
OUT = DIR / "p08-roi/P08_ROI_INTER_RATER_CROSSCHECK_20261116.json"

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    assert sha(M) == "b1ec545fb9ad19b4086baa1c303a2b7a7ada81a6991a28a83e75b64b9255cd3b"
    assert sha(I) == "e35441fe7de4723aad5d891311022a3935244aa21282e02dc0736d19682400a6"
    main = json.loads(M.read_text(encoding="utf-8"))
    independent = json.loads(I.read_text(encoding="utf-8"))
    assert len(main["candidateLCDROIs"]) == len(independent["photos"]) == 8
    rows, exceeds, max_error = {}, [], 0.0
    for photo in independent["photos"]:
        name = photo["name"]
        primary = main["candidateLCDROIs"][name]
        assert photo["sha256"] == primary["originalSHA256"]
        other = [photo["cornersPx"][k] for k in ("TL","TR","BR","BL")]
        values = primary["candidateQuadTL_TR_BR_BL_px"]
        d = [round(math.dist(a,b),2) for a,b in zip(values, other)]
        max_error = max(max_error, *d)
        if max(d) > primary["edgeAmbiguityPx"]:
            exceeds.append(name)
        rows[name] = {
            "primaryCorners":values, "independentCorners":other,
            "cornerEuclideanDifferencesPx":d,
            "maxDifferencePx":max(d),
            "primaryClaimedEdgeAmbiguityPx":primary["edgeAmbiguityPx"],
            "independentClaimedUncertaintyPx":photo["uncertaintyPx"],
            "withinPrimaryAmbiguityAllCorners":max(d) <= primary["edgeAmbiguityPx"],
            "interpretation":"Independent picks may refer to different visible glass/active-display/aperture edges; these are not calibrated residuals."
        }
    assert max_error > 20 and len(exceeds) > 0  # Fail closed against quietly accepting 20px precision
    receipt = {
        "schema":"fcv588-p08-two-rater-corner-crosscheck-v1",
        "scope":"TWO_UNCALIBRATED_IMAGE_SPACE_ESTIMATES_ONLY",
        "primaryReceiptSha256":sha(M),
        "independentReceiptSha256":sha(I),
        "photoCount":8,"cornerComparisons":32,
        "photosExceedingPrimary20pxEstimate":sorted(exceeds),
        "maxBetweenRaterCornerDistancePx":round(max_error,2),
        "result":"PASS_DISCREPANCY_DETECTED_HOLD_PRECISE_ROI",
        "decision":"DO_NOT_AVERAGE_OR_APPLY_ROI_TO_RUNTIME_OR_FIDELITY_SCORE",
        "nextOracle":"Agreed exact inner content-vs-aperture boundary definition, second repeatable blinded annotation, camera calibration/reference target if quantitative/physical claims are desired",
        "perPhoto":rows,
        "holds":{"roiCalibration":"HOLD","sourcePhotoRights":"REFERENCE_ONLY","fullP07":"OPEN","phase6":"OPEN","featureClaims":"65/65 HOLD","hardwareValidated":False,"installedFirmware":"UNKNOWN","releaseApproval":"HOLD"},
        "operations":{"originalPhotosEdited":False,"sourceRuntimeEdited":False,"derivedImagesWritten":False}
    }
    with OUT.open("x",encoding="utf-8",newline="\n") as f:
        json.dump(receipt,f,indent=2,ensure_ascii=False,sort_keys=True)
        f.write("\n")
    assert json.loads(OUT.read_text(encoding="utf-8")) == receipt
    print(json.dumps({"status":receipt["result"],"photosWithDifferencesOver20Px":len(exceeds),
                      "maxDiscrepancyPx":receipt["maxBetweenRaterCornerDistancePx"],
                      "sha256":sha(OUT)}))

if __name__ == "__main__":
    main()
