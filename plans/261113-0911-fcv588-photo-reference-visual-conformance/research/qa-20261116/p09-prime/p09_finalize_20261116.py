"""P09 write-once bounded photo geometry QA seal, without changing simulator source."""
from __future__ import annotations
import ast
import datetime
import hashlib
import json
import pathlib
import socket
import urllib.request

ROOT = pathlib.Path(r"C:\Work\MoPhongMayTrenTau")
QA = pathlib.Path("plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116")
DEST = pathlib.Path("docs/qa/FCV588_P09_ROI_BOUNDARY_20261116")
INPUTS = {
 "p08Final": ("docs/qa/FCV588_P08_ROI_READINESS_20261116/FCV588_P08_ROI_READINESS_FINAL_INTEGRITY_20261116.json","3d1a05419617807b3f3ef24042725bf414d53257d5e7157155ca0a6b787bf16a"),
 "p08Post": ("docs/qa/FCV588_P08_ROI_READINESS_20261116/FCV588_P08_ROI_READINESS_INDEPENDENT_POSTRECEIPT_20261116.json","82706f90bf424515abc0383d9eb8b5a7895755bf2de1a040c7890a35f8610dd7"),
 "p09Contract": (str(QA/"p09-prime/P09_ROI_ACCEPTANCE_CONTRACT_20261116.md"),"4222eab91f57a60cd3c15bffaa5dd2cf70d4a1a50d862b2e959c5c3f910ee211"),
 "photoBoundaryReview": (str(QA/"p09-boundary-protocol/P09_INDEPENDENT_BOUNDARY_PROTOCOL_20261116.json"),"81999e194f564f83cb7d6c15603e93efc29d8029288d104706292e60cba5b088"),
 "geometryScript": (str(QA/"p09-geometry-qa/p09_deterministic_homography_qa.py"),"37388c5a65c943930cbebbd727f048c1a41d0f29aee90c11d3d94f5b2c1afa57"),
 "geometryReceipt": (str(QA/"p09-geometry-qa/P09_DETERMINISTIC_HOMOGRAPHY_QA_20261116.json"),"7e41f688ba684df7aa9720745d665bec323f1f96c7d3a512901563d600571aab"),
}

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def parsed(n):
    return json.loads((ROOT / INPUTS[n][0]).read_text(encoding="utf-8-sig"))

def gate():
    bindings={}
    for n,(p,expected) in INPUTS.items():
        actual=sha(ROOT/p)
        assert actual==expected,(n,actual,expected)
        bindings[n]={"path":p.replace("\\","/"),"sha256":actual}
    ast.parse((ROOT/INPUTS["geometryScript"][0]).read_text(encoding="utf-8"))
    p08=parsed("p08Final")
    review=parsed("photoBoundaryReview")
    math=parsed("geometryReceipt")
    assert review["decision"]=="GO_PROTOCOL_AND_TWO_APERTURE_QUADS_HOLD_ACTIVE_CONTENT_AND_OTHER_SIX_PRECISE_ROIS"
    assert math["result"]=="PASS_BOUNDED_DETERMINISTIC_GEOMETRY_QA"
    assert math["summary"]["baseHomographiesChecked"]==16
    assert math["summary"]["perturbedHomographiesChecked"]==256
    assert math["summary"]["allBaseHomographiesNumericallyPass"]
    assert math["summary"]["allDeterministicPerturbationsNumericallyValid"]
    assert math["disposition"]["roiCalibration"]=="HOLD"
    accepted={}
    for photo in review["photos"]:
        n=photo["name"]; a=photo["classA"]; b=photo["classB"]
        assert a["status"]=="HOLD_TRUE_ACTIVE_CONTENT_CORNERS_NOT_VISIBLE",n
        if b["status"]=="ACCEPT_RESTRICTED_CLASS_B_VIRTUAL_QUAD":
            accepted[n]={"cornersPxTL_TR_BR_BL":b["cornersPxTL_TR_BR_BL"],
                         "uncertaintyPx":b["uncertaintyPx"],
                         "status":"RESTRICTED_IN_MEMORY_APERTURE_NORMALIZATION_ONLY"}
        else:
            assert b["status"]=="HOLD_PRECISE_CLASS_B_POINTS"
    assert set(accepted)=={"dual.jpg","zoom.jpg"}
    assert len(review["photos"])==len(p08["originalPhotoSHA256"])==8
    for n,item in p08["originalPhotoSHA256"].items():
        assert sha(ROOT/"sources/FCV588_GiaoDienThucTeMay2016"/n)==item["sha256"]
        assert next(x for x in review["photos"] if x["name"]==n)["sha256"]==item["sha256"]
    p07=json.loads((ROOT/"docs/qa/FCV588_P07_BOUNDED_20261116/FCV588_P07_BOUNDED_FINAL_INTEGRITY_20261116.json").read_text(encoding="utf-8"))
    assert len(p07["canonicalRuntimeSHA256"])==39
    for n,digest in p07["canonicalRuntimeSHA256"].items():
        assert sha(ROOT/n)==digest,n
    with urllib.request.urlopen("http://127.0.0.1:4173/",timeout=4) as page:
        assert page.status==200
    with socket.socket() as sock:
        sock.settimeout(0.5)
        assert sock.connect_ex(("127.0.0.1",4207))!=0
    return bindings,accepted

def newfile(p,obj):
    p.parent.mkdir(parents=True,exist_ok=True)
    with p.open("x",encoding="utf-8",newline="\n") as f:
        json.dump(obj,f,indent=2,sort_keys=True,ensure_ascii=False)
        f.write("\n")

def main():
    bindings,accepted=gate()
    final={
      "schema":"fcv588-p09-roi-boundary-final-integrity-v1",
      "createdAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),
      "decision":"P09_RESTRICTED_TWO_APERTURE_ROI_QA_PASS_ACTIVE_LCD_AND_SIX_PRECISE_ROIS_HOLD",
      "scope":"P09_RESTRICTED_REFERENCE_METADATA_AND_BOUNDED_GEOMETRY_ONLY",
      "canonicalRoot":str(ROOT),
      "evidence":bindings,
      "acceptedRestrictedApertureQuads":accepted,
      "metrics":{
          "originalPhotosRehashed":8,
          "photoBoundaryClassesAssessed":2,
          "photoClassBRestrictedAccepted":len(accepted),
          "photoClassBStillHold":6,
          "activeContentFourCornerAccepted":0,
          "homographyBaseNumericalChecks":16,
          "homographyCornerPerturbations":256,
          "runtimeSourceSHA":"39/39_MATCH_P07",
          "server4173":"HTTP200_UNTOUCHED",
          "port4207":"CLOSED"
      },
      "limitations":[
          "Only image-space visible rounded aperture virtual quadrilaterals for dual.jpg and zoom.jpg are class B restricted GO; class A active-content ROI remains HOLD 8/8.",
          "Same source photographs and prior annotations were known to reviewers; no falsely claimed blinded independent two-rater acceptance.",
          "Numerically stable four-point homography and self-fit residuals are not evidence of camera calibration, correct physical corners, 480x640 OEM pixels, lens correction or source image rights.",
          "Photo JPEG originals and historical receipts unchanged. No image derivatives, runtime edits, browser, native Narrator/NVDA/POWER-hold or Windows settings tests were performed in P09."
      ],
      "holds":{
          "preciseActiveLCDROI":"HOLD","fullP07":"OPEN","phase6":"OPEN",
          "featureClaims":"65/65 HOLD","hardwareValidated":False,
          "installedFirmware":"UNKNOWN","oemPhotoRights":"HOLD","releaseApproval":"HOLD",
          "narratorNvdaNative":"NOT_RUN","trueOsBlur":"NOT_RUN","forcedColors":"NOT_RUN",
          "oemFidelityPercent":None
      },
      "operations":{"productRuntimeEdited":False,"originalPhotosEdited":False,
                    "photoDerivativesSaved":False,"browserLaunched":False,
                    "userServerRestarted":False,"existingReceiptsOverwritten":False}
    }
    output=ROOT/DEST/"FCV588_P09_ROI_BOUNDARY_FINAL_INTEGRITY_20261116.json"
    newfile(output,final)
    finalsha=sha(output)
    assert json.loads(output.read_text(encoding="utf-8"))==final
    binding2,accepted2=gate()
    assert (binding2,accepted2)==(bindings,accepted)
    post={
      "schema":"fcv588-p09-roi-boundary-independent-postreceipt-v1",
      "createdAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),
      "status":"PASS_BOUNDED_READBACK_PRECISE_ACTIVE_LCD_HOLD",
      "finalPath":str(output.relative_to(ROOT)).replace("\\","/"),
      "finalSHA256":finalsha,
      "freshRehash":{"evidenceFiles":len(bindings),"originalPhotos":"8/8","runtime":"39/39",
                     "restrictedAcceptedApertureQuads":2,"activeContentROIsAccepted":0,
                     "server4173":"HTTP200","port4207":"CLOSED"},
      "reviewers":{"sourcePhotoBoundary":"worker-1","geometry":"worker-7"},
      "boundary":"Local independently re-read evidence; this is not a third human reviewer, calibration or release GO."
    }
    postfile=ROOT/DEST/"FCV588_P09_ROI_BOUNDARY_INDEPENDENT_POSTRECEIPT_20261116.json"
    newfile(postfile,post)
    assert json.loads(postfile.read_text(encoding="utf-8"))==post
    print(json.dumps({"status":"PASS_BOUNDED_PRECISE_ROI_HOLD",
                      "finalPath":str(output),"finalSHA256":finalsha,
                      "postPath":str(postfile),"postSHA256":sha(postfile)}))

if __name__=="__main__":
    main()
