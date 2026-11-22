"""Write-once independent readback: recheck sealed P02 result against disk.
Never rewrite final receipt, old V57 evidence or running product.
"""
from __future__ import annotations
import hashlib,json
from pathlib import Path
from datetime import datetime, timezone
ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
REPORT_DIR=ROOT/"docs/qa/FCV588_VISUAL_P02_20261114"
FINAL=REPORT_DIR/"FCV588_VISUAL_P02_FINAL_INTEGRITY_20261114.json"
POST=REPORT_DIR/"FCV588_VISUAL_P02_INDEPENDENT_POSTRECEIPT_20261114.json"
EXPECTED_FINAL="15ff0baab0b8bbe213c52857b630341a426305a7cf64eae9c07d1ac55f447d53"
def sha(path:Path)->str:return hashlib.sha256(path.read_bytes()).hexdigest()
def need(check:bool,msg:str)->None:
    if not check:raise ValueError(msg)
def main()->None:
    need(not POST.exists(),"postreceipt must be write-once")
    need(sha(FINAL)==EXPECTED_FINAL,"final seal changed before independent verification")
    f=json.loads(FINAL.read_bytes())
    need(f["status"]=="P02_VISUAL_SOFTWARE_QA_PASS_PARTIAL_PHOTO_CONFORMANCE_HOLD",
         "wrong scope/status")
    need(len(f["runtimeSHA256"])==38,"runtime manifest changed")
    for rel,expected in f["runtimeSHA256"].items():
        p=ROOT.joinpath(*rel.split("/"))
        need(p.is_file() and sha(p)==expected,"runtime hash mismatch: "+rel)
    for name,expected in f["v57HistoricalFileSHA256"].items():
        p=ROOT/"docs/qa/FCV588_V57_HEADER_COMPACT_20261031"/name
        need(p.is_file() and sha(p)==expected,"historical V57 altered: "+name)
    for name,entry in f["photoReferenceSHA256"].items():
        p=ROOT/"sources/FCV588_GiaoDienThucTeMay2016"/name
        need(p.is_file() and sha(p)==entry["sha256"] and p.stat().st_size==entry["bytes"],
             "photo changed: "+name)
    screenshot_count=0
    for env in ("stage","canonical"):
        b=f["browser"][env]
        browser=Path(b["receiptPath"])
        need(browser.is_file() and sha(browser)==b["receiptSHA256"],
             "browser original receipt mismatch: "+env)
        body=json.loads(browser.read_bytes())
        need(body["overallStatus"]=="PASS" and body["sourceTreeStable"] and
             body["sourceManifestBefore"]["sha256"]==b["sourceManifestSHA256"],
             "original browser evidence status mismatch: "+env)
        for row in b["screenshots"]:
            image=Path(row["path"])
            need(image.is_file() and sha(image)==row["sha256"] and
                 image.stat().st_size==row["bytes"],
                 "screen image mismatch: "+str(image))
            screenshot_count+=1
    need(screenshot_count==36,"wrong screenshot count")
    for rel,expected in f["qaLogsSHA256"].items():
        log=ROOT.joinpath(*rel.split("/"))
        need(log.is_file() and sha(log)==expected,"QA log altered: "+rel)
    qa=ROOT/"plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261114"
    need(sha(qa/"v57_reconciliation_20261114.json")==f["v57MetadataReconciliationSHA256"],
         "reconciliation changed")
    need(sha(qa/"visual_v2_canonical_apply_20261114.json")==f["guardedApplyReceiptSHA256"],
         "guarded apply receipt changed")
    need(sha(qa/"visual_v2_before_apply_20261114.zip")==f["guardedBeforeBackupSHA256"],
         "guarded backup changed")
    failing={}
    for name in ("stage-photo-display-RED.txt","stage-full-node-attempt1.txt",
                 "stage-failing-targeted-attempt2.txt","stage-photo-RED-reviewfix.txt"):
        p=qa/name
        need(p.is_file(),"historical staging FAIL/RED log missing "+name)
        failing[name]=sha(p)
    need(f["hardwareValidated"] is False and f["rightsClearance"] is False and
         f["featureClaims"]=="65/65_HOLD" and f["releaseApproval"]=="HOLD" and
         f["phase6"]=="OPEN","hardware/feature/release hold changed")
    post={
      "timestampUtc":datetime.now(timezone.utc).isoformat(),
      "status":"P02_INDEPENDENT_READBACK_SHA_MATCH_PARTIAL_VISUAL_WORK",
      "finalReceiptSHA256":EXPECTED_FINAL,
      "recheckedRuntime":"38/38_MATCH",
      "originalV57HistoricalReceipts":f["v57HistoricalFileSHA256"],
      "recheckedPhotoReferences":"8/8_MATCH_REFERENCE_ONLY",
      "recheckedChromeReceipts":"2/2_MATCH",
      "recheckedScreenshots":"36/36_MATCH",
      "recheckedQALogs":"4/4_MATCH",
      "preservedRedFailureLogsSHA256":failing,
      "coreSessionScenarioReplayChanged":False,
      "sourceRights":"HOLD",
      "hardwareValidated":False,
      "firmwareInstalled":"UNKNOWN",
      "featureClaims":"65/65_HOLD",
      "phase6":"OPEN",
      "releaseApproval":"HOLD",
      "notes":"Pure independent filesystem readback; not separate OEM operator physical acceptance or full 7-phase implementation"
    }
    with POST.open("x",encoding="utf-8",newline="\n") as file:
        json.dump(post,file,ensure_ascii=False,indent=2);file.write("\n")
    reread=json.loads(POST.read_bytes())
    need(reread["finalReceiptSHA256"]==sha(FINAL),"postreceipt readback mismatch")
    print("POSTRECEIPT="+str(POST))
    print("POSTRECEIPT_SHA256="+sha(POST))
    print("FINAL_SHA256="+sha(FINAL))
    print("RUNTIME=38/38; PHOTOS=8/8; SCREENSHOTS=36/36; QA_LOGS=4/4")
    print("STILL_HOLD=FEATURE_CLAIMS_65; OEM; RIGHTS; HARDWARE; RELEASE")
if __name__=="__main__":main()

