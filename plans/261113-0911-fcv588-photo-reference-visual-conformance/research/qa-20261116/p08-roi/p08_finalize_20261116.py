"""Write-once scoped P08 exploratory evidence seal and independent byte readback."""
import datetime
import hashlib
import json
import pathlib
import socket
import urllib.request

ROOT = pathlib.Path(r"C:\Work\MoPhongMayTrenTau")
QA = pathlib.Path("plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116")
DEST = pathlib.Path("docs/qa/FCV588_P08_ROI_READINESS_20261116")
FILES = {
    "parentP07": ("docs/qa/FCV588_P07_BOUNDED_20261116/FCV588_P07_BOUNDED_FINAL_INTEGRITY_20261116.json","024dd1d75c7879fe0df88f939739d854a40aa819a459b6e1fbebd186aca91726"),
    "parentP07Post": ("docs/qa/FCV588_P07_BOUNDED_20261116/FCV588_P07_BOUNDED_INDEPENDENT_POSTRECEIPT_20261116.json","22fc21b744ebedbd5ac4a5998411c3e01f665697fa7fbb2a3726998909775ea6"),
    "sourceAtlas": ("plans/261113-0911-fcv588-photo-reference-visual-conformance/research/2026-11-14-photo-mode-atlas.md","eb005af84b63e09450f2009dec809ab5e6098262f7645e7cd09f9ab75e1ef6c4"),
    "primaryROICandidate": (str(QA/"p08-roi/P08_LCD_ROI_UNCALIBRATED_CANDIDATES_20261116.json"),"b1ec545fb9ad19b4086baa1c303a2b7a7ada81a6991a28a83e75b64b9255cd3b"),
    "independentPhotoAudit": (str(QA/"p08-independent-photo/P08_INDEPENDENT_ROI_AUDIT_20261116.json"),"e35441fe7de4723aad5d891311022a3935244aa21282e02dc0736d19682400a6"),
    "twoRaterCrosscheck": (str(QA/"p08-roi/P08_ROI_INTER_RATER_CROSSCHECK_20261116.json"),"c6c075f55a18ec23ddeaadcfd5b3fe43949e0ca2d52da8c40c8a3345d62314d8"),
    "windowsReadiness": (str(QA/"p08-a11y-readiness/P08_NATIVE_A11Y_READINESS_20261116.json"),"e50f405cdbc2507afe58ba4fdf2bdd3e1676cfaeb4016710214918e56c8e720c"),
}

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def load(name):
    return json.loads((ROOT/FILES[name][0]).read_text(encoding="utf-8-sig"))

def check():
    bindings={}
    for name,(p,expected) in FILES.items():
        actual=sha(ROOT/p)
        assert actual==expected,(name,actual,expected)
        bindings[name]={"path":p.replace("\\","/"),"sha256":actual}
    p07=load("parentP07")
    candidate=load("primaryROICandidate")
    audit=load("independentPhotoAudit")
    cross=load("twoRaterCrosscheck")
    a11y=load("windowsReadiness")
    assert len(candidate["candidateLCDROIs"])==8 and candidate["registeredCorners"]==0
    assert audit["decision"]=="GO_BOUNDED_LCD_PLANE_NORMALIZATION_ONLY"
    assert cross["result"]=="PASS_DISCREPANCY_DETECTED_HOLD_PRECISE_ROI"
    assert cross["photoCount"]==8 and cross["cornerComparisons"]==32
    assert len(cross["photosExceedingPrimary20pxEstimate"])==5
    assert cross["maxBetweenRaterCornerDistancePx"]==34.93
    assert a11y["status"]=="READINESS_ASSESSED_ACTUAL_NATIVE_VERIFICATION_NOT_RUN"
    runtime=p07["canonicalRuntimeSHA256"]
    assert len(runtime)==39
    for file,h in runtime.items():
        assert sha(ROOT/file)==h,("runtime drift",file)
    pics=p07["referenceOnlyOriginalPhotos"]
    assert len(pics)==8
    for name,item in pics.items():
        assert sha(ROOT/"sources/FCV588_GiaoDienThucTeMay2016"/name)==item["sha256"]
    with urllib.request.urlopen("http://127.0.0.1:4173/",timeout=4) as r:
        assert r.status==200
    with socket.socket() as s:
        s.settimeout(0.7)
        assert s.connect_ex(("127.0.0.1",4207))!=0
    return bindings,pics

def write(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    with path.open("x",encoding="utf-8",newline="\n") as f:
        json.dump(obj,f,ensure_ascii=False,sort_keys=True,indent=2)
        f.write("\n")

def main():
    bindings,photos=check()
    final={
        "schema":"fcv588-p08-roi-readiness-final-integrity-v1",
        "createdAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),
        "status":"P08_BOUNDED_IMAGE_SPACE_ROI_CANDIDATES_AND_A11Y_READINESS_PASS_PRECISION_AND_NATIVE_QA_HOLD",
        "scope":"QA_ONLY_F1_PUBLIC_REFERENCE_V2_NO_RUNTIME_CHANGE",
        "evidence":bindings,"originalPhotoSHA256":photos,
        "findings":{
            "originalPhotosRehashed":"8/8",
            "visualROICandidates":"8/8_UNCALIBRATED",
            "calibratedROIsAccepted":0,
            "betweenRaterCornerComparisons":32,
            "photosWithOver20PxDifference":5,
            "maximumBetweenRaterDifferencePx":34.93,
            "independentPhotoReview":"GO_NORMALIZED_LCD_PLANE_ONLY",
            "screenReaderNarrator":"EXISTS_NATIVE_SPEECH_NOT_RUN",
            "screenReaderNVDA":"NOT_DISCOVERED_INSTALL_NOT_AUTHORIZED",
            "osWindowBlur":"NOT_RUN",
            "forcedColors":"NOT_RUN",
            "runtime":"39/39_UNCHANGED",
            "userServer4173":"HTTP200_UNTOUCHED",
            "testPort4207":"CLOSED"},
        "limitations":[
            "The two ROI estimates are not the same boundary/oracle: 5 photos exceed the primary +/-20px hypothesis. Neither is licensed to set OEM CSS coordinates.",
            "Homography from approximate four corners may support qualitative intra-LCD layout comparison only; it cannot prove 480x640 OEM pixel, physical mm, lens correction, control geometry, RGB or fonts.",
            "No native Narrator/NVDA spoken-output, real OS blur/refocus or forced colors was exercised; no user Windows accessibility settings were changed.",
            "Original OEM photos remain REFERENCE_ONLY and no source photo derivative or redistribution asset was created."],
        "holds":{"preciseROICalibration":"HOLD","fullP07":"OPEN","F1Phase6":"OPEN",
                 "featureClaims":"65/65 HOLD","hardwareValidated":False,"installedFirmware":"UNKNOWN",
                 "rights":"HOLD","releaseApproval":"HOLD","fidelityPercent":None},
        "operations":{"runtimeEdited":False,"originalPhotosEdited":False,"photoDerivativesSaved":False,
                      "userServerRestarted":False,"browserStarted":False,"screenReaderStarted":False,
                      "systemSettingsModified":False,"priorEvidenceOverwritten":False}
    }
    path=ROOT/DEST/"FCV588_P08_ROI_READINESS_FINAL_INTEGRITY_20261116.json"
    write(path,final)
    finalsha=sha(path)
    assert json.loads(path.read_text(encoding="utf-8"))==final
    # Re-read all original evidence and current source after the final is durably written.
    bindings2,photos2=check()
    assert (bindings2,photos2)==(bindings,photos)
    post={
        "schema":"fcv588-p08-roi-readiness-postreceipt-v1",
        "status":"PASS_INDEPENDENT_READBACK_WITH_PRECISION_HOLD",
        "createdAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),
        "finalPath":str(path.relative_to(ROOT)).replace("\\","/"),"finalSHA256":finalsha,
        "freshRehash":{"boundEvidence":len(bindings2),"runtime":"39/39",
                       "referencePhotos":"8/8","server4173":"HTTP200","testPort4207":"CLOSED"},
        "independentSourcePhotoReviewer":"worker-1",
        "nativeReadinessReviewer":"worker-7",
        "note":"Postreceipt is a distinct local readback, not another independent human review; ROI calibration/native audio still HOLD."
    }
    postpath=ROOT/DEST/"FCV588_P08_ROI_READINESS_INDEPENDENT_POSTRECEIPT_20261116.json"
    write(postpath,post)
    assert json.loads(postpath.read_text(encoding="utf-8"))==post
    print(json.dumps({"status":"PASS_BOUNDED_WITH_HOLD","finalSHA256":finalsha,
                      "postSHA256":sha(postpath),"finalPath":str(path),"postPath":str(postpath)}))

if __name__=="__main__":
    main()
