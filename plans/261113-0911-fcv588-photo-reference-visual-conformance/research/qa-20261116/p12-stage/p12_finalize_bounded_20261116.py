"""P12 provenance-bound final: source investigation PASS, guarded apply NO-GO.

Writes two new JSON seals with exclusive create, never edits simulator runtime.
"""
import datetime
import hashlib
import json
from pathlib import Path
import socket
import urllib.request

import psutil

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=Path("plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116")
DEST=Path("docs/qa/FCV588_P12_MENU_SOURCE_20261116")
STAGE=ROOT/QA/"p12-stage/worktree"
FILES={
 "p11Final":("docs/qa/FCV588_P11_NATIVE_FOCUS_BOUNDARIES_20261116/FCV588_P11_NATIVE_FOCUS_FINAL_INTEGRITY_20261116.json","845b4fe9cf9b184a74ddba91783362e9446c1219d38362c16166d4b3d6a44c87"),
 "p11Post":("docs/qa/FCV588_P11_NATIVE_FOCUS_BOUNDARIES_20261116/FCV588_P11_NATIVE_FOCUS_INDEPENDENT_POSTRECEIPT_20261116.json","392220f62ae29c2f1bf77b73c90d016b1a3a40e115a8c04612ce59a728b09f98"),
 "manufacturerManualSourceAudit":(str(QA/"p12-manual-source/P12_MANUAL_MENU_SOURCE_AUDIT_20261116.json"),"c28b618cceca8380fa0be4cfdf514a2b12801b08dbccbea1b45255be0bf1c5b5"),
 "manufacturerSounderOrderAP1Supplement":(str(QA/"p12-manual-source/P12_MANUAL_SOUND_ORDER_SUPPLEMENT_20261116.md"),"be84cf98525de66f4005550cf7c6bd381bf916b45c32d5e079c62a69c442b812"),
 "eightOriginalPhotoLexicon":(str(QA/"p12-photo-lexicon/P12_2016_PHOTO_LCD_LEXICON_20261116.json"),"9c8c7397a42610005a9fed7535a722f951ab708273068301c44f49faf81b2e83"),
 "canonicalMenuSourceLedger":(str(QA/"p12-runtime-ledger/P12_CURRENT_MENU_SOURCE_TRACEABILITY_20261116.json"),"7c44ea82784a64c08fbf05ac81d59b79da46816e0283d99a49205ae45c56fc9c"),
 "photoCurrentMenuCrosswalk":(str(QA/"p12-runtime-ledger/P12_PHOTO_2016_VI_MENU_ORDER_CROSSWALK_20261116.json"),"994290762fa2d19c0b491007af559a4c9a437701c4f7e4de71732e582fab2e9f"),
 "canonicalTargetedMenu25":(str(QA/"p12-runtime-ledger/P12_TARGETED_MENU_NODE_20261116.txt"),"30e79694fa8f83f4b21f2d2db1bda9f344849d28fdfb8cbbd2ebf51f4fd1ef43"),
 "manualOrderCanonicalRED":(str(QA/"p12-stage/P12_SOURCE_VALID_MANUAL_MENU_ORDER_RED_20261116.txt"),"c228a4ea0f5d8c4feceedf57f9ea740d5a86164034654466b8a97f2fc141163e"),
 "manualOrderStagingGREEN":(str(QA/"p12-stage/P12_STAGING_MANUAL_MENU_ORDER_GREEN_20261116.txt"),"ed1fcf5cdac606cfa3350a92d4742dfcfc7f1622c9ba140982cfe972bed406e6"),
 "stagingFullNodeFAIL":(str(QA/"p12-stage/P12_STAGING_FULL_NODE_20261116.txt"),"079419aa1dbca42a688f0e1644d487bcc276ed14fcf98dc220a26af45a581f85"),
 "stageOrderOnlyEquivalence":(str(QA/"p12-stage/P12_STAGE_ORDER_ONLY_EQUIVALENCE_20261116.txt"),"5996df27237b43f92044c602127c88394db7b01df3a28dbcabe9c0cc9cbbcfb6"),
 "stageNoGoIntegrity":(str(QA/"p12-stage/P12_SOUND_MENU_STAGING_NO_GO_20261116.json"),"eb51e3bf3c9e4bf2b60ab62f81e4f72136bf55458aee43b8ce0d9799ca91a0cc"),
}

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def load(name):return json.loads((ROOT/FILES[name][0]).read_text(encoding="utf-8-sig"))
def port_open(n):
    with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex(("127.0.0.1",n))==0
def review_file():
    d=ROOT/QA/"p12-review"
    files=sorted(d.glob("P12*.json")) if d.is_dir() else []
    assert len(files)==1,("P12 independent review missing or ambiguous",files)
    return files[0]

def verify():
    bindings={}
    for name,(path,expect) in FILES.items():
        actual=sha(ROOT/path)
        assert actual==expect,("evidence SHA drift",name,actual)
        bindings[name]={"path":path.replace("\\","/"),"sha256":actual}
    review=review_file()
    review_json=json.loads(review.read_text(encoding="utf-8-sig"))
    assert review_json and isinstance(review_json,dict)
    bindings["independentReview"]={"path":str(review.relative_to(ROOT)).replace("\\","/"),
                                  "sha256":sha(review)}
    no_go=load("stageNoGoIntegrity")
    assert no_go["apply"]["decision"]=="NO_GO"
    assert no_go["TDD"]["stagingFullNode"]=="499/526 PASS_27_FAIL_NOT_ACCEPTABLE"
    photo=load("eightOriginalPhotoLexicon")
    assert len(photo["photos"])==8 and photo["photos"][0]["actualMenuOptionTextLegible"]
    assert len(photo["menuLegibilitySummary"]["photosWithActualLegibleMenuOptionText"])==1
    manual=load("manufacturerManualSourceAudit")
    class_counts={}
    for row in manual["ui_status_matrix"]:
        class_counts[row["classification"]]=class_counts.get(row["classification"],0)+1
    assert class_counts=={"DIRECT_SOURCE":23,"EXTRAPOLATION":4,"SOURCE_GAP":8},class_counts
    assert manual["audit_conclusion"]["vietnamese_firmware_phrase_oracle"]=="SOURCE_GAP"
    stage_diff=no_go["stagingRuntimeSHA256Diff"]
    assert set(stage_diff)=={"src/devices/fcv588/menu-atlas.mjs"}
    p07=json.loads((ROOT/"docs/qa/FCV588_P07_BOUNDED_20261116/FCV588_P07_BOUNDED_FINAL_INTEGRITY_20261116.json").read_text(encoding="utf-8"))
    runtime=p07["canonicalRuntimeSHA256"]
    assert len(runtime)==39
    for name,expect in runtime.items():
        assert sha(ROOT/name)==expect,("canonical runtime drift",name)
    assert len(p07["referenceOnlyOriginalPhotos"])==8
    for name,metadata in p07["referenceOnlyOriginalPhotos"].items():
        assert sha(ROOT/"sources/FCV588_GiaoDienThucTeMay2016"/name)==metadata["sha256"],name
    for name,expect in [
      ("FURUNO_FCV628_FCV588_Operators_Manual_OME23890E_2025.pdf",
       "3003e23b9d1eda509ceb968130249fe02aa279c2efb3cf900dde54ab9d709cd3"),
      ("FURUNO_FCV588_FCV628_Software_History.pdf",
       "aa0d7b9e703d26d533a88cbaedff6a1d2e90ac3dbec923ca78d45fa2953dbbe4"),
      ("FURUNO_FCV628_FCV588_Operators_Guide_Multilingual.pdf",
       "46336e6562c7491a5406c06ed015bf5f3177143c90c4ddba3e8f6f4cedda77b4")
    ]:
        assert sha(ROOT/"sources/manuals/FCV-588"/name)==expect,name
    assert sha(STAGE/"src/devices/fcv588/menu-atlas.mjs")=="e2ba214cf81aa739452dc1ecd0ddfdcc7fad7814478a2d5e27e6925eda945aca"
    assert sha(ROOT/"src/devices/fcv588/menu-atlas.mjs")=="992d7a6e1f3a645680ea73f87ce2863a9e9f38eb16428a4581ad5e7e71a58aed"
    with urllib.request.urlopen("http://127.0.0.1:4173/",timeout=4) as response:
        assert response.status==200
    assert all(not port_open(p) for p in [4207,4208,4209,4211,4212,9225])
    listener=[c for c in psutil.net_connections(kind="tcp")
              if c.status==psutil.CONN_LISTEN and c.laddr
              and c.laddr.ip=="127.0.0.1" and c.laddr.port==4173]
    assert len(listener)==1 and listener[0].pid==1204
    return bindings,class_counts

def write_once(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    with path.open("x",encoding="utf-8",newline="\n") as f:
        json.dump(data,f,indent=2,sort_keys=True,ensure_ascii=False)
        f.write("\n")

def main():
    evidence,class_counts=verify()
    final={
      "schema":"fcv588-p12-source-menu-audit-final-integrity-v1",
      "createdAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),
      "status":"P12_MENU_SOURCE_ORACLE_BOUNDED_PASS_STAGED_ORDER_RED_GREEN_FULL_QA_FAIL_CANONICAL_APPLY_NO_GO",
      "scope":"F1_PUBLIC_REFERENCE_V2_SYNTHETIC_OFFLINE_WINDOWS_RESTRICTED_SOURCE_QA",
      "canonicalRoot":str(ROOT),"evidenceSHA256":evidence,
      "checks":{
        "originalReferenceJpegs":"8/8 SHA MATCH",
        "photoMenuOptionText":"13 legible rows in 1 of 8 photos",
        "menuSourcePdf":"OME23890E 2025 page 59 printed AP-1",
        "manualSourceAuditedRows":sum(class_counts.values()),
        "manualSourceClasses":class_counts,
        "implementedMenuCategories":5,
        "implementedMenuItems":67,
        "photoOrderDifferences":"12/13 ordinal differences, 21 inversion pairs",
        "canonicalMenuRegressionBeforeApply":"25/25 PASS",
        "sourceValidRED":"2/3 PASS,1 FAIL",
        "stageTargetedGREEN":"3/3 PASS",
        "stageFullNode":"499/526 PASS,27 FAIL",
        "stagingRuntimeFileDiff":"1/39 menu-atlas.mjs only; other metadata and order-unrelated entries unchanged",
        "canonicalRuntime":"39/39 SHA MATCH, no product edit",
        "userServer4173":"HTTP200 PID1204 UNTOUCHED",
        "qaPorts":"4207,4208,4209,4211,4212,9225 CLOSED"
      },
      "releaseDecision":{
        "canonicalGuardedApply":"NO_GO",
        "independentReview":"SOURCE_AND_FAIL_RECEIPT_INTEGRITY_GO, STAGING_RELEASE_NO_GO",
        "reason":"Full stage QA FAIL; 5 existing selection-specific tests break from order change and stage lacks some docs/plans fixtures; must not overwrite canonical or retrofit tests merely to claim GREEN.",
        "noRuntimePatch":True,
        "nextRequired":"Rebuild complete staging fixture (without copying OEM reference assets into served runtime), preserve old tests, update only source-authored position assumptions with stronger semantic oracles, rerun full 563/Python/Chrome and independent GO, guarded preimage ZIP/apply."
      },
      "sourceLimits":{
        "vietnameseMenuPhrases":"PHOTO_SPECIFIC_2016_COLLECTION_ONE_JPEG_NOT_FULL_FIRMWARE_LANGUAGE_ORACLE",
        "installedFirmware":"UNKNOWN",
        "manualEdition":"OME-23890-E 2025; not proof of photographed firmware",
        "photoCollectionCaptureDate":"NOT_INDEPENDENTLY_VERIFIED",
        "whiteLineValueEnum":"PHOTO_AND_MANUAL_DIFFER_FROM_CURRENT_TRAINING_BOOLEAN; NOT_PATCHED",
        "OEMFontsAndRights":"HOLD",
        "nativeNarrator":"BLOCKED_NOT_RUN","nativePOWERBlur":"NOT_VERIFIED"
      },
      "operations":{
        "canonicalRuntimeEdited":False,"stagingCandidateCreated":True,
        "historicalREDOrFAILOverwritten":False,"testAssertionsWeakened":False,
        "OEMPhotoOrPDFServed":False,"serverRestarted":False,
        "releaseOrHardwareAction":False
      },
      "holds":{
        "fullP07":"OPEN","F1Phase6":"OPEN","featureClaims":"65/65 HOLD",
        "hardwareValidated":False,"installedFirmware":"UNKNOWN",
        "photoRights":"HOLD","releaseApproval":"HOLD"
      }
    }
    f=ROOT/DEST/"FCV588_P12_MENU_SOURCE_FINAL_INTEGRITY_20261116.json"
    write_once(f,final)
    finalsha=sha(f)
    assert json.loads(f.read_text(encoding="utf-8"))==final
    rebound,counts=verify()
    assert rebound==evidence and counts==class_counts
    post={
      "schema":"fcv588-p12-menu-source-independent-postreceipt-v1",
      "createdAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),
      "status":"PASS_EVIDENCE_READBACK_STAGING_CANONICAL_APPLY_NO_GO",
      "finalPath":str(f.relative_to(ROOT)).replace("\\","/"),
      "finalSHA256":finalsha,
      "freshReadback":{
        "boundEvidenceCount":len(evidence),"canonicalRuntime":"39/39",
        "originalJPG":"8/8","referenceManuals":"3/3",
        "server4173":"HTTP200 PID1204",
        "qaPorts":"CLOSED"},
      "releaseDecision":"NO_GO",
      "note":"Independent reviewer and local byte readback support exact source/gap classification, not firmware/original-image licensing nor a canonical patch."
    }
    postpath=ROOT/DEST/"FCV588_P12_MENU_SOURCE_INDEPENDENT_POSTRECEIPT_20261116.json"
    write_once(postpath,post)
    assert json.loads(postpath.read_text(encoding="utf-8"))==post
    print(json.dumps({"status":final["status"],"finalSHA256":finalsha,
                      "postSHA256":sha(postpath),
                      "finalPath":str(f),"postPath":str(postpath)}))
if __name__=="__main__":
    main()
