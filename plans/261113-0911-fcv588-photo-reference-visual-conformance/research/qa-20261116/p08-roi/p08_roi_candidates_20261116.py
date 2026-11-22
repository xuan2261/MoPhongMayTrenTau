"""Source-pinned, uncalibrated LCD corner hypotheses; JSON only, no OEM image derivatives."""
import datetime
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
SOURCE = ROOT / "sources/FCV588_GiaoDienThucTeMay2016"
PARENT = ROOT / "docs/qa/FCV588_P07_BOUNDED_20261116/FCV588_P07_BOUNDED_FINAL_INTEGRITY_20261116.json"
OUTPUT = ROOT / "plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/p08-roi/P08_LCD_ROI_UNCALIBRATED_CANDIDATES_20261116.json"

# Order = top-left, top-right, bottom-right, bottom-left in original 590x1280 image.
# Manually identified approximate inside-LCD outer bounds; NOT independently certified
# four-corner content-active ROI. More uncertainty near curved bezel/glare.
CORNERS = {
    "dual.jpg":     [[76,380],[449,376],[448,920],[66,923]],
    "giaoDien.jpg": [[103,425],[438,422],[432,908],[95,901]],
    "hf.jpg":       [[94,375],[499,374],[497,973],[77,972]],
    "lf.jpg":       [[106,351],[483,349],[488,907],[92,905]],
    "nav1.jpg":     [[66,426],[439,424],[445,963],[62,964]],
    "nav2.jpg":     [[97,363],[433,362],[434,847],[94,849]],
    "zoom.jpg":     [[56,287],[466,284],[464,876],[51,877]],
    "zoom2.jpg":    [[85,383],[479,380],[489,968],[76,970]],
}
# P07 independently recorded photo-space landmarks, not camera calibration
LANDMARKS = {
    "dual.jpg": [75,256,457],
    "zoom.jpg": [58,253,469],
    "zoom2.jpg": [68,277,492],
    "nav1.jpg": [53,334,443],
    "nav2.jpg": [96,327,436],
}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def polygon_area(points):
    return 0.5 * sum(
        x * points[(i + 1) % 4][1] - points[(i + 1) % 4][0] * y
        for i,(x,y) in enumerate(points))

def cross(a,b,c):
    return (b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])

def run():
    parent_hash = sha(PARENT)
    assert parent_hash == "024dd1d75c7879fe0df88f939739d854a40aa819a459b6e1fbebd186aca91726"
    parent = json.loads(PARENT.read_text(encoding="utf-8"))
    assert len(parent["referenceOnlyOriginalPhotos"]) == len(CORNERS) == 8
    results = {}
    for name, pts in CORNERS.items():
        path = SOURCE / name
        assert sha(path) == parent["referenceOnlyOriginalPhotos"][name]["sha256"], name
        with Image.open(path) as im:
            assert im.size == (590,1280) and im.mode == "RGB", name
        assert len(pts) == 4 and all(0 <= x < 590 and 0 <= y < 1280 for x,y in pts)
        assert polygon_area(pts) > 100000
        assert all(cross(pts[i],pts[(i+1)%4],pts[(i+2)%4]) > 0 for i in range(4))
        result = {
            "originalSHA256": sha(path), "originalImagePixels": [590,1280],
            "candidateQuadTL_TR_BR_BL_px": pts,
            "coordinateClass": "HUMAN_VISUAL_ESTIMATE_ONLY_UNCALIBRATED",
            "edgeAmbiguityPx": 20,
            "notValidated": [
                "not repeatably picked by two independent raters",
                "inner active LCD content plane versus glass/bezel boundary unknown",
                "no lens-distortion/intrinsic or coplanar scale calibration",
                "no controlled-frame photography or robust corner residuals",
            ],
            "photoAreaPx2": round(polygon_area(pts),1),
        }
        if name in LANDMARKS:
            left, div, right = LANDMARKS[name]
            frac = (div-left)/(right-left)
            result["independentP07PhotoSpaceSplit"] = {
                "leftX":left,"dividerX":div,"rightX":right,
                "fraction":round(frac,4),
                "relationship":"approximately half" if name.startswith(("dual","zoom")) else "left data approximately two-thirds",
                "class":"PHOTO_SPACE_ONLY_WITH_UNCALIBRATED_PERSPECTIVE"
            }
        results[name] = result
    receipt = {
        "schema":"fcv588-p08-photo-roi-hypotheses-v1",
        "createdAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),
        "decision":"CANDIDATE_ONLY_NOT_CALIBRATED_NO_RUNTIME_APPLY",
        "source":"Eight immutable 2016 local photographs; direct visual inspection, P07 photo-space landmarks",
        "p07FinalIntegritySHA256":parent_hash,
        "cameraCalibration":"SOURCE_GAP",
        "physicalSizeInference":"PROHIBITED_FROM_UNCALIBRATED_PHOTOS",
        "lcdHomography":"MATHEMATICALLY_POSSIBLE_FROM_FOUR_APPROVED_COPLANAR_CORNERS_BUT_NOT_YET_VALIDATED",
        "registeredCorners":0,
        "uncalibratedCandidates":len(results),
        "rights":"REFERENCE_ONLY; no copied photo pixels or derivatives written",
        "candidateLCDROIs":results,
        "holds":["No OEM mm/detents/font/RGB/timing claim","No percentile OEM fidelity claim",
                 "No copy into runtime/distribution","No CSS or LCD runtime geometry edit from hypotheses"],
        "operations":{"originalPhotosEdited":False,"runtimeEdited":False,"browserLaunched":False,
                      "photoDerivativeWritten":False}
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("x",encoding="utf-8",newline="\n") as f:
        json.dump(receipt,f,ensure_ascii=False,indent=2,sort_keys=True)
        f.write("\n")
    assert json.loads(OUTPUT.read_text(encoding="utf-8")) == receipt
    print(json.dumps({"status":"PASS_CANDIDATE_ONLY","photoCount":len(results),
                     "approvedCalibratedROIs":0,"file":str(OUTPUT),"sha256":sha(OUTPUT)}))

if __name__ == "__main__":
    run()
