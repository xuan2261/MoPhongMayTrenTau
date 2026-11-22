"""Independent append-only proof for ZOOM cases after already sealed P02.
Original failing browser receipt is retained; do not rewrite P02 final/post.
"""
from pathlib import Path
import json,hashlib,datetime
ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=ROOT/"plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261114"
DIR=ROOT/"docs/qa/FCV588_VISUAL_P02_20261114"
FINAL=DIR/"FCV588_VISUAL_P02_FINAL_INTEGRITY_20261114.json"
POST=DIR/"FCV588_VISUAL_P02_INDEPENDENT_POSTRECEIPT_20261114.json"
ADD=DIR/"FCV588_VISUAL_P02_ZOOM_ADDENDUM_20261114.json"
FAILED=next((QA/"canonical-browser-zoom").glob("*.json"))
PASS=next((QA/"canonical-browser-zoom-attempt2").glob("*.json"))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def check(b,m):
    if not b:raise ValueError(m)
def main():
    check(not ADD.exists(),"write-once addendum exists")
    f=json.loads(FINAL.read_bytes());post=json.loads(POST.read_bytes())
    check(post["finalReceiptSHA256"]==sha(FINAL),"parent P02 final/post changed")
    d0=json.loads(FAILED.read_bytes())
    check(d0["overallStatus"]=="FAILED" and len(d0["cases"])==6 and
          len(d0["objectiveFailures"])==6,"original ZOOM failed run missing")
    check(all("header expected" in s for s in d0["objectiveFailures"]),"unexpected original zoom failure type")
    d=json.loads(PASS.read_bytes())
    check(d["overallStatus"]=="PASS" and d["sourceTreeStable"] and
          d["objectiveFailures"]==[] and
          d["sourceManifestBefore"]==d["sourceManifestAfter"],
          "new ZOOM Chrome receipt/source failed")
    check(d["sourceManifestBefore"]["sha256"]==f["browser"]["canonical"]["sourceManifestSHA256"],
          "ZOOM loaded source version not P02 final")
    check(len(d["cases"])==6,"not all zoom cases")
    observed={(x["mode"],x["zoomMode"]) for x in d["cases"]}
    expected={(a,b) for a in ("LF-ZOOM","HF-ZOOM")
              for b in ("Bottom Lock","Bottom Zoom","Marker Zoom")}
    check(observed==expected,"wrong zoom matrix")
    shots=[]
    for x in d["cases"]:
        check(x["status"]=="PASS" and x["loadedBodiesAllMatchedSource"] and
              len(x["loadedBodies"])==34,"one zoom case source failed")
        for k in ("consoleErrors","pageErrors","requestFailures","externalRequests",
                  "bodyErrors","objectiveFailures"):
            check(x[k]==[],"zoom case browser errors: "+str(x["label"])+" "+k)
        shot=x["screenshot"]
        p=Path(shot["path"])
        check(p.is_file() and sha(p)==shot["sha256"] and p.stat().st_size==shot["bytes"],
              "zoom screenshot mismatch "+str(p))
        shots.append(shot)
    result={
      "timestampUtc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
      "status":"P02_ZOOM_SUPPLEMENT_6_CASES_PASS_DESKTOP_ONLY",
      "parentFinalSHA256":sha(FINAL),"parentPostreceiptSHA256":sha(POST),
      "failedFirstZoomBrowserReceiptSHA256":sha(FAILED),
      "failedFirstStatus":"FAILED_6_HEADER_WHITESPACE_DOM_ASSERTIONS",
      "failureTriage":"Browser rendered innerText normalizes CSS white-space; original test required literal 3-space text. Retry used semantics-preserving whitespace-aware assertion, did not change product source.",
      "zoomBrowserReceiptSHA256":sha(PASS),
      "zoomBrowserSourceManifestSHA256":d["sourceManifestBefore"]["sha256"],
      "matrix":sorted([{"mode":x["mode"],"zoomMode":x["zoomMode"],
                         "status":x["status"]} for x in d["cases"]],
                        key=lambda x:(x["mode"],x["zoomMode"])),
      "screenshots":shots,
      "viewport":"1366x768_ONLY",
      "screenshotsVerified":"6/6_MATCH",
      "loadedBodiesVerified":"34/34_PER_CASE",
      "fullThreeViewportZoomMatrix":"NOT_RUN",
      "referencePhotoComparison":"QUALITATIVE_ONLY_NOT_OEM_CERTIFIED",
      "hardwareValidated":False,"rightsClearance":False,
      "featureClaims":"65/65_HOLD","phase6":"OPEN","releaseApproval":"HOLD"
    }
    with ADD.open("x",encoding="utf-8",newline="\n") as out:
        json.dump(result,out,ensure_ascii=False,indent=2);out.write("\n")
    again=json.loads(ADD.read_bytes())
    check(again["parentFinalSHA256"]==sha(FINAL),"addendum reread final mismatch")
    print("ZOOM_ADDENDUM="+str(ADD))
    print("ZOOM_SHA256="+sha(ADD))
    print("ZOOM=6/6_DESKTOP; SOURCES=34/34_PER_CASE; PHOTOS=6/6")
    print("ORIGINAL_FAILED_RECEIPT_PRESERVED="+sha(FAILED))
if __name__=="__main__":main()

