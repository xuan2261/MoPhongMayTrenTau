"""Independent evidence-checked P02 visual work package (not OEM or release).
Write only a NEW final receipt. Historical receipts are read-only.
"""
from __future__ import annotations
from pathlib import Path
import datetime as dt
import hashlib
import json
import zipfile

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=ROOT/"plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261114"
STAGE=ROOT/"staging/fcv588-photo-visual-20261114"
V57=ROOT/"docs/qa/FCV588_V57_HEADER_COMPACT_20261031"
FINAL_DIR=ROOT/"docs/qa/FCV588_VISUAL_P02_20261114"
FINAL=FINAL_DIR/"FCV588_VISUAL_P02_FINAL_INTEGRITY_20261114.json"
RECON=QA/"v57_reconciliation_20261114.json"
APPLY=QA/"visual_v2_canonical_apply_20261114.json"
LOG_NODE=QA/"canonical-full-node-v2.txt"
LOG_PY=QA/"canonical-full-python-v2.txt"
STAGE_LOG_NODE=QA/"stage-full-node-reviewfix-v2.txt"
STAGE_LOG_PY=QA/"stage-python-reviewfix-v2.txt"
HIST={"V57_HEADER_COMPACT_SCOPED_INTEGRITY_20261031.json":
      "aaa6c3b37b106e5828fac430bdfb94472a27ab8497f0828deacce305b4cf99dc",
      "V57_HEADER_COMPACT_INDEPENDENT_POSTRECEIPT_20261031.json":
      "8c533aa069fd5002af1413908c5aa0d18fec8e57a73c685684cea2ec40e22d42",
      "V57_HEADER_COMPACT_REPORT_20261031.md":
      "32f2bb56d329cc7bc2a594a4cac6761e68af4e16c8af89025b3ef67851b8aa45",
      "v57_independent_postreadback.py":
      "f63a7e8cc974b7c471b076b204401accd754baee7eeea6751a9caa7eee099b23"}
PHOTOS={
  "dual.jpg":"4d88fe11cda8a9107f97e44a392103cc68eb8ab8e685b7b5e7408a556a2bc37b",
  "giaoDien.jpg":"e7b78466fa582dc0cc50aec8e2fc264f8b3ee187d93a53cace1e88d1e156c99c",
  "hf.jpg":"7f1a69504fd703988750729ee38b4964229480a4c55b20ae0f0bb4815f6ea2a9",
  "lf.jpg":"c3ef46a27fc965c95d2df33981b0c66775b848ae96aa8efdcad932b91a50c3ef",
  "nav1.jpg":"b90de3afeb18730e10e4ac897fb20bbde36155e25cc344abed259ba1de0d030e",
  "nav2.jpg":"9f225c6834efe86c76fd8a86bbfaa8f6d276f1e055a815efc91087a832397de6",
  "zoom.jpg":"ecc7af35e30aafb8f0e9cfe9f05f94c8d529d6d410a2e523053286149d330b52",
  "zoom2.jpg":"41eaa80b42450b36c3b0f547b9276e26703ce1b74d2f85b1393255fda42bcd99"}
def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def file_sha(p:Path)->str:return sha(p.read_bytes())
def need(cond,msg:str)->None:
    if not cond:raise AssertionError(msg)
def sha_checked(p:Path,expected:str,label:str)->str:
    need(p.is_file(),"missing "+label+" "+str(p))
    got=file_sha(p)
    need(got.lower()==expected.lower(),label+" SHA mismatch "+str(p))
    return got
def verify_browser(p:Path,root:Path)->dict:
    d=json.loads(p.read_bytes())
    need(d["overallStatus"]=="PASS" and d["sourceTreeStable"] and d["fatalError"] is None,"browser status/source changed")
    need(Path(d["stageRoot"]).resolve()==root.resolve(),"browser source root")
    need(d["sourceManifestBefore"]==d["sourceManifestAfter"],"browser source tree drift")
    need(d["sourceManifestBefore"]["files"]==36,"browser source count")
    need(d["objectiveFailures"]==[],"browser objective failures")
    need(d["httpPhotoDeny"]["status"]=="PASS" and
         len(d["httpPhotoDeny"]["paths"])==8 and
         all(x["statusCode"]==404 for x in d["httpPhotoDeny"]["paths"]),"browser OEM-photo leak")
    need({(v["viewport"]["width"],v["viewport"]["height"]) for v in d["viewports"]}==
         {(1366,768),(375,812),(1920,1080)},"browser required viewports")
    screenshots=[]
    loaded_sources=[]
    for v in d["viewports"]:
        need(v["status"]=="PASS" and v["loadedBodiesAllMatchedExactSource"],"viewport/loaded body failure")
        need(len(v["loadedBodies"])==34,"viewport loaded bodies count")
        need(set(v["states"])=={"LF","HF","DUAL","NAV1","NAV2","MENU"},
             "viewport required modes")
        need(len(v["screenshots"])==6 and all(s["status"]=="PASS" for s in v["states"].values()),
             "viewport screenshots/state failures")
        for key in ("consoleErrors","pageErrors","requestFailures","externalRequests",
                    "bodyReadErrors","badHttpResponses","objectiveFailures"):
            need(v[key]==[], "viewport browser error: "+key)
        for shot in v["screenshots"]:
            im=Path(shot["path"])
            need(im.is_file(),"missing browser screenshot: "+str(im))
            need(im.stat().st_size==shot["bytes"],"screenshot byte mismatch")
            sha_checked(im,shot["sha256"],"screenshot")
            screenshots.append({"path":str(im),"sha256":shot["sha256"],"bytes":shot["bytes"]})
        loaded_sources.append(v["loadedBodiesAggregateSha256"])
    return {"receiptPath":str(p),"receiptSHA256":file_sha(p),
        "sourceManifestSHA256":d["sourceManifestBefore"]["sha256"],
        "browserVersion":d["browser"]["version"],
        "loadedBodyCountPerViewport":34,"viewports":3,"screenshots":screenshots,
        "loadedBodyAggregatePerViewport":loaded_sources,
        "httpPhotoDeny":"8/8_404","errors":0}

def verify_logs(path:Path,node:bool)->None:
    txt=path.read_text(encoding="utf-8")
    if node:
        need("# tests 526" in txt and "# pass 526" in txt and "# fail 0" in txt,
             "Node 526/526 result absent from "+str(path))
    else:
        need("Ran 13 tests" in txt and "\nOK" in txt.replace("\r",""),
             "Python 13 result absent from "+str(path))

def main()->None:
    need(not FINAL.exists(),"write-once final receipt exists: "+str(FINAL))
    need(FINAL_DIR.exists() is False or
         not any(FINAL_DIR.glob("*")),"FINAL_DIR not empty; no overwrite")
    for name,checksum in HIST.items():
        sha_checked(V57/name,checksum,"immutable V57 history")
    v57=json.loads((V57/"V57_HEADER_COMPACT_SCOPED_INTEGRITY_20261031.json").read_bytes())
    recon=json.loads(RECON.read_bytes());apply=json.loads(APPLY.read_bytes())
    need(recon["status"]=="RECONCILED_CURRENT_SOURCE_BASELINE","reconciliation missing")
    need(recon["currentV57SealSHA256"]==HIST["V57_HEADER_COMPACT_SCOPED_INTEGRITY_20261031.json"],
         "reconciliation mismatched")
    need(apply["status"]=="CANONICAL_SCOPED_COPY_COMPLETE_NOT_FINAL_QA","guarded apply absent")
    need(apply["newV57ReconciliationSHA256"]==file_sha(RECON),"recon sha not pinned")
    need(apply["parentV57CurrentSealSHA256"]==file_sha(V57/"V57_HEADER_COMPACT_SCOPED_INTEGRITY_20261031.json"),
         "parent V57 SHA drift")
    need(len(v57["runtime38SourceSHA"])==38,"runtime count changed")
    need(len(v57["qaEvidenceSHA"])==77,"V57 evidence count changed")
    for row in v57["qaEvidenceSHA"]:
        file=ROOT/row["path"]
        sha_checked(file,row["sha256"],"original V57 evidence")
        need(file.stat().st_size==row["bytes"],"V57 evidence byte count drift")
    for path,expected in v57["parentSealsSHA256"].items():
        sha_checked(ROOT/path,expected,"V56 parent")
    runtime_current={}
    runtime_v57_same=[]
    runtime_changed=[]
    for path,expected in v57["runtime38SourceSHA"].items():
        actual=file_sha(ROOT/path)
        runtime_current[path]=actual
        need(actual==file_sha(STAGE/path),"stage/canonical file differs "+path)
        (runtime_v57_same if actual==expected else runtime_changed).append(path)
    need(sorted(runtime_changed)==["web/app.mjs","web/lcd-presentation.mjs","web/styles.css"],
         "Unexpected runtime diff "+repr(runtime_changed))
    need(len(runtime_v57_same)==35,"unexpected invariant file count")
    need(sorted(apply["runtimeChangedExactly"])==sorted(runtime_changed),"guarded apply allowlist changed")
    need(apply["runtimeCanonicalPostimages"]=={p:runtime_current[p] for p in sorted(runtime_changed)},
         "postimage hashes mismatch")
    need(apply["copyPaths"]==apply["performed"] and len(apply["copyPaths"])==7,
         "partial scoped file apply")
    for p in apply["copyPaths"]:
        need(file_sha(ROOT/p)==file_sha(STAGE/p),"test/apply stage mismatch "+p)
    need(file_sha(QA/"visual_v2_before_apply_20261114.zip")==apply["backupSHA256"],
         "before backup zip SHA wrong")
    with zipfile.ZipFile(QA/"visual_v2_before_apply_20261114.zip") as archive:
        expected_names=sorted(x for x in apply["copyPaths"] if x!=apply["newTest"])
        need(sorted(archive.namelist())==expected_names,"backup archive entry set unexpected")
        for rel in expected_names:
            old=apply["runtimeCanonicalPreimages"].get(rel) or apply[
                "existingTestCanonicalPreimages"].get(rel)
            need(sha(archive.read(rel))==old,"old source backup entry mismatch "+rel)
    paths={
        "stage":next((QA/"stage-browser-v2").glob("*.json")),
        "canonical":next((QA/"canonical-browser-v2").glob("*.json"))}
    browser={k:verify_browser(p,STAGE if k=="stage" else ROOT)
             for k,p in paths.items()}
    need(browser["stage"]["sourceManifestSHA256"]==
         browser["canonical"]["sourceManifestSHA256"],"browser loaded source manifests differ")
    for path in (LOG_NODE,LOG_PY,STAGE_LOG_NODE,STAGE_LOG_PY):
        verify_logs(path,node="node" in path.name)
    photos={}
    for name,checksum in PHOTOS.items():
        photo=ROOT/"sources/FCV588_GiaoDienThucTeMay2016"/name
        sha_checked(photo,checksum,"photo reference")
        photos[name]={"sha256":checksum,"bytes":photo.stat().st_size,
                      "rights":"REFERENCE_ONLY_CLEARANCE_NOT_OBTAINED"}
    claims=json.loads((ROOT/"docs/evidence/fcv588-public-implementation-status.json").read_bytes())
    need(claims["hardwareValidated"] is False and claims["rightsClearance"] is False and
         claims["releaseApproval"]=="HOLD" and claims["firmwareInstalled"] is None,
         "source authority permissions changed")
    all_claims=claims["operatorRows"]+claims["teacherRows"]
    need(len(all_claims)==65 and all(x["claimDecision"]=="HOLD" for x in all_claims),
         "feature claim status changed")
    result={
      "schema":"fcv588-visual-p02-software-source-qa-v1",
      "timestampUtc":dt.datetime.now(dt.timezone.utc).isoformat(),
      "status":"P02_VISUAL_SOFTWARE_QA_PASS_PARTIAL_PHOTO_CONFORMANCE_HOLD",
      "scope":"P02 header/depth ticks/NAV display, not full P01-P07 nor OEM conformity",
      "v57HistoricalFileSHA256":HIST,
      "v57MetadataReconciliationSHA256":file_sha(RECON),
      "guardedApplyReceiptSHA256":file_sha(APPLY),
      "guardedBeforeBackupSHA256":file_sha(QA/"visual_v2_before_apply_20261114.zip"),
      "runtimeSourceCount":38,
      "runtimeSHA256":runtime_current,
      "unchangedFromV57":35,"changedFromV57":runtime_changed,
      "photoReferenceSHA256":photos,
      "browser":browser,
      "nodeCanonical":"526/526_PASS","pythonCanonical":"13/13_PASS",
      "nodeStage":"526/526_PASS","pythonStage":"13/13_PASS",
      "qaLogsSHA256":{str(p.relative_to(ROOT)).replace("\\","/"):file_sha(p)
                      for p in (LOG_NODE,LOG_PY,STAGE_LOG_NODE,STAGE_LOG_PY)},
      "failedLogsPreserved":True,
      "rightsClearance":False,"hardwareValidated":False,"firmwareInstalled":"UNKNOWN",
      "featureClaims":"65/65_HOLD","phase6":"OPEN","releaseApproval":"HOLD",
      "humanOEMReviewer":"NOT_OBTAINED",
      "remainingAcceptance":{
        "realPhotoSourceRGBFontsGeometry":"NOT_YET_VERIFIED",
        "pictureEightModesZoomAndMenus":"PARTIAL_6_SCREEN_BROWSER_CAPTURED",
        "acousticEchoOEMMatch":"NOT_YET_VERIFIED",
        "hardwareAndNMEAVoltage":"NOT_VALIDATED",
        "genuineWindowsNarratorNVDA":"NOT_RUN"
      }
    }
    FINAL_DIR.mkdir(parents=True,exist_ok=True)
    with FINAL.open("x",encoding="utf-8",newline="\n") as f:
        json.dump(result,f,ensure_ascii=False,indent=2);f.write("\n")
    print("P02_FINAL="+str(FINAL))
    print("FINAL_SHA256="+file_sha(FINAL))
    print("RUNTIME=38/38_MATCH_STAGE; OLD_V57_SOURCE_UNCHANGED=35/38")
    print("CHROME=3/3_STAGE_3/3_CANONICAL; SCREENSHOTS=18+18; LOADED=34_PER_VIEWPORT")
    print("NODE=526/526_CANONICAL; PYTHON=13/13_CANONICAL")
    print("PHASE6=OPEN; CLAIMS=65/65_HOLD; RELEASE=HOLD")
if __name__=="__main__":main()

