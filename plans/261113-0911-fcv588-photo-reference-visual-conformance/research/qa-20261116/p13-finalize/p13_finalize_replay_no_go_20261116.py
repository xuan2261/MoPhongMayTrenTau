"""P13 bounded write-once integrity: full stage QA GO, profile21 replay APPLY NO_GO.

This is a final QA receipt; never changes product code, firmware, original photos,
existing receipts, installed Windows services or user port 4173.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import socket
import urllib.request
import psutil

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=Path("plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116")
STAGE=ROOT/"_p13_stage_20261116"
DEST=ROOT/"docs/qa/FCV588_P13_MENU_REPLAY_HOLD_20261116"
FINAL=DEST/"FCV588_P13_MENU_REPLAY_HOLD_FINAL_INTEGRITY_20261116.json"
POST=DEST/"FCV588_P13_MENU_REPLAY_HOLD_INDEPENDENT_POSTRECEIPT_20261116.json"
FILES={
  "parentP12Final":("docs/qa/FCV588_P12_MENU_SOURCE_20261116/FCV588_P12_MENU_SOURCE_FINAL_INTEGRITY_20261116.json","5afe2663a1d0d3dff6e213fc537fad3b7dfe5817d7aa776ee4a769e580780855"),
  "parentP12Post":("docs/qa/FCV588_P12_MENU_SOURCE_20261116/FCV588_P12_MENU_SOURCE_INDEPENDENT_POSTRECEIPT_20261116.json","538ff2a5e518ed663274958c3a2c9c69e7458a7caa5317f868ae67fe4e184792"),
  "p13FixtureRequirements":(str(QA/"p13-fixture/P13_FIXTURE_REQUIREMENTS_20261116.md"),"ef700d07816f4d4b74cdb726f3ecec3a71140b65bdfe157b7fe67d47891d5423"),
  "p13FixtureAndSourceFreeze":(str(QA/"p13-fixture/P13_FIXTURE_AND_SOURCE_FREEZE_20261116.json"),"3f3110bc0e4cfa4e55c09cc8beb1d1da0b80f1d3c5ad8af353132edce591d306"),
  "p13SemanticAudit":(str(QA/"p13-semantic/P13_SEMANTIC_REBASELINE_AUDIT_20261116.md"),"fbc3b8d9769613ab2d09d5cb73081788a1b0846f0e1c9002a0dc4cd527c8f0a8"),
  "p13SourceCandidateMenu":(str(QA/"p12-stage/worktree/src/devices/fcv588/menu-atlas.mjs"),"e2ba214cf81aa739452dc1ecd0ddfdcc7fad7814478a2d5e27e6925eda945aca"),
  "p13InitialFixtureFullRED":(str(QA/"p13-stage/P13_FULL_FIXTURE_INITIAL_RED_20261116.txt"),"d5c502134a80c5cbea046befc3866674c0da857461c74d40e999ee650d856137"),
  "p13FullNodeGREEN":(str(QA/"p13-stage/P13_FIXTURE_COMPLETE_NODE_GREEN_20261116.txt"),"bf85e4685e87607b89ff4c7c7612d0a1cad580d24172e9097dcd36c55b3d4873"),
  "p13FullPythonGREEN":(str(QA/"p13-stage/P13_FIXTURE_COMPLETE_PYTHON_20261116.txt"),"746832750e3d5891c799514347539900311238c22d5a669e8af9963267c3df00"),
  "p13ReplaySemanticDrift":(str(QA/"p13-semantic/P13_PROFILE21_REPLAY_SEMANTIC_DRIFT_20261116.json"),"479909adb7475c8d9b02dd195b6abb1943593a78f575c2857b6585a1d4336f8c"),
  "p13IndependentGateReview":(str(QA/"p13-review/P13_GATE_REVIEW_20261116.json"),"c1a99846aff873ccfa28db81670f5904f966426b957e87e4542cece8fb4ae1d4"),
  "p13ChromeEvidence":(str(QA/"p13-browser/P13_STAGING_REAL_CHROME_MENU_AP1_20261116.json"),"b6e9adfabcd7ed3d8104270df166346c5f2d50ce8101e87070a6a49097f38b08")
}
STAGE_TESTS={
 "test/fcv588-public-lcd-presentation.test.mjs":{
   "original":"53cf6b172020ca63170e03f94389d421c7155e1106c4ed6f2b00d5700e2e29be",
   "staging":"8ef4e1d40671e809d38ba117185ec5ca2f9dc1d21019707572b2c843b204f092"},
 "test/fcv588-v47-white-marker-firmware-boundary.test.mjs":{
   "original":"993afb020bd01f05f8cf6f2fb9803d484cab6f1861f5f8e440c3505cd3755773",
   "staging":"24a008dce2dc55c382c96a3a60853a3a44e9971738ac06e4da7933aba3e62ea8"},
 "test/fcv588-v49-a11y-boundary.test.mjs":{
   "original":"f5f068450d1a3826fd01f4a28873dcfe17329a7a18d5f2d6a45dadf3ddea41b2",
   "staging":"b649bad4164b09cda3ce44ac96b8275360a858d5592d3c11d24e70eba9ed9867"}
}

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def doc(path):return json.loads(path.read_text(encoding="utf-8-sig"))
def listening(port):
    with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as s:
        s.settimeout(0.4)
        return s.connect_ex(("127.0.0.1",port))==0
def write_once(path,content):
    path.parent.mkdir(parents=True,exist_ok=True)
    with path.open("x",encoding="utf-8",newline="\n") as file:
        json.dump(content,file,ensure_ascii=False,sort_keys=True,indent=2)
        file.write("\n")

def audit():
    assert not listening(4213)
    assert listening(4173)
    bindings={}
    for name,(filename,expected) in FILES.items():
        path=ROOT/filename
        assert sha(path)==expected,("evidence SHA drift",name)
        bindings[name]={"path":filename.replace("\\","/"),"sha256":expected}
    other=ROOT/QA/"p13-review/P13_BROWSER_EVIDENCE_INDEPENDENT_20261116.json"
    assert other.is_file(),"P13 independent browser review must finish first"
    review=doc(other)
    assert review and isinstance(review,dict)
    bindings["p13IndependentBrowserReview"]={
        "path":str(other.relative_to(ROOT)).replace("\\","/"),
        "sha256":sha(other)}
    gate=doc(ROOT/FILES["p13IndependentGateReview"][0])
    assert gate["decision"]["canonicalApply"]=="NO_GO"
    assert gate["decision"]["historicalReplayCompatibility"]=="NO_GO_PROFILE21_SEMANTIC_BREACH"
    replay=doc(ROOT/FILES["p13ReplaySemanticDrift"][0])
    assert replay["decision"]=="NO_GO_SAME_PROFILE_REVISION_MENU_REORDER"
    assert replay["sampleOriginalSourceEntryId"]=="sounder.whiteMarker"
    assert replay["sampleStagingSourceEntryId"]=="sounder.clutter"
    assert replay["originalSessionHash"]==replay["stagingSessionHash"]
    assert replay["historicalReplayAcceptedUnderChangedCode"] is True
    assert replay["sameFinalStateHashEvenThoughSelectedMenuItemDiffers"] is True
    assert replay["profileRevisionOld"]==replay["profileRevisionCandidate"]=="F1-public-reference-21"
    old=(ROOT/FILES["p13InitialFixtureFullRED"][0]).read_text(encoding="utf-8-sig")
    green=(ROOT/FILES["p13FullNodeGREEN"][0]).read_text(encoding="utf-8-sig")
    py=(ROOT/FILES["p13FullPythonGREEN"][0]).read_text(encoding="utf-8-sig")
    assert all(x in old for x in ("# tests 563","# pass 558","# fail 5"))
    assert all(x in green for x in ("# tests 563","# pass 563","# fail 0"))
    assert "Ran 13 tests" in py and "OK" in py
    fixture=doc(ROOT/FILES["p13FixtureAndSourceFreeze"][0])
    assert fixture["stage"]["sources"]["linkType"]=="Junction"
    assert fixture["runtime39"]["stage"]["status"]=="38_OF_39_P07_EXACT_PLUS_ONE_EXPECTED_MENU_ATLAS_CANDIDATE"
    assert fixture["semanticRebaseline"]["reviewVerdict"]=="PASS_SEMANTIC_ID_REBASELINE_NO_ASSERTION_WEAKENING"
    for filename,checks in STAGE_TESTS.items():
        assert sha(ROOT/filename)==checks["original"],("canonical test changed",filename)
        assert sha(STAGE/filename)==checks["staging"],("staged semantic regression test drift",filename)
    manifest=doc(ROOT/"docs/qa/FCV588_P07_BOUNDED_20261116/FCV588_P07_BOUNDED_FINAL_INTEGRITY_20261116.json")
    assert len(manifest["canonicalRuntimeSHA256"])==39
    stageDiff={}
    for filename,expect in manifest["canonicalRuntimeSHA256"].items():
        assert sha(ROOT/filename)==expect,("canonical runtime changed",filename)
        stageSha=sha(STAGE/filename)
        if stageSha!=expect:stageDiff[filename]={"canonicalSha256":expect,"stagingSha256":stageSha}
    assert stageDiff=={"src/devices/fcv588/menu-atlas.mjs":{
        "canonicalSha256":"992d7a6e1f3a645680ea73f87ce2863a9e9f38eb16428a4581ad5e7e71a58aed",
        "stagingSha256":"e2ba214cf81aa739452dc1ecd0ddfdcc7fad7814478a2d5e27e6925eda945aca"}}
    assert len(manifest["referenceOnlyOriginalPhotos"])==8
    for name,metadata in manifest["referenceOnlyOriginalPhotos"].items():
        assert sha(ROOT/"sources/FCV588_GiaoDienThucTeMay2016"/name)==metadata["sha256"]
    browser=doc(ROOT/FILES["p13ChromeEvidence"][0])
    assert browser["status"]=="PASS_BOUNDED_CHROME_AP1_ORDER_AND_ACTUAL_SOURCE_BYTES_NATIVE_REPLAY_HOLD"
    assert len(browser["states"])==2
    screenshots=[]
    totalBodies=0
    for state in browser["states"]:
        assert state["viewport"] in ([375,812],[1366,768])
        assert len(state["menuOrder"])==13
        assert len(state["loadedBodySHA256"])==36
        for name,digest in state["loadedBodySHA256"].items():
            assert sha(STAGE/name)==digest,("browser body vs stage source drift",name)
            totalBodies+=1
        for item in state["screenshots"]:
            path=ROOT/item["path"]
            assert sha(path)==item["sha256"] and path.stat().st_size==item["bytes"]
            screenshots.append({"path":item["path"],"sha256":item["sha256"],"bytes":item["bytes"]})
    assert totalBodies==72 and len(screenshots)==8
    assert not browser["externalRequests"] and not browser["consoleErrors"]
    assert not browser["requestFailures"]
    assert browser["cleanup"]["testPortClosed"] and browser["cleanup"]["user4173Alive"]
    assert browser["canonicalRuntime39Stable"] and browser["stageRuntime39Stable"]
    assert all(not listening(port) for port in (4207,4208,4209,4211,4212,4213,9225))
    with urllib.request.urlopen("http://127.0.0.1:4173/",timeout=4) as response:
        assert response.status==200
    listeners=[c for c in psutil.net_connections(kind="tcp") if
               c.status==psutil.CONN_LISTEN and c.laddr and
               c.laddr.ip=="127.0.0.1" and c.laddr.port==4173]
    assert len(listeners)==1 and listeners[0].pid==1204
    return bindings,stageDiff,screenshots

def main():
    assert not FINAL.exists() and not POST.exists()
    bindings,stageDiff,screenshots=audit()
    now=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat()
    final={
      "schema":"fcv588-p13-menu-order-replay-guard-final-integrity-v1",
      "createdAt":now,
      "status":"P13_FIXTURE_COMPLETE_NODE_PYTHON_CHROME_PASS_PROFILE21_LEGACY_REPLAY_APPLY_NO_GO",
      "scope":"F1_PUBLIC_REFERENCE_V2_SYNTHETIC_TRAINING_STAGE_ONLY_WINDOWS_OFFLINE",
      "canonicalRoot":str(ROOT),
      "stagingRoot":str(STAGE),
      "evidenceSHA256":bindings,
      "stagingCodeDiff39":stageDiff,
      "stagingSemanticTestDiff3":STAGE_TESTS,
      "browserScreenshotSHA256":screenshots,
      "verification":{
          "prechangeP13SourceRed":"558/563 PASS_5_SOURCE_ORDER_REBASELINE_FAIL",
          "stageFinalNode":"563/563 PASS",
          "stageFinalPython":"13/13 PASS",
          "stageChrome":"2 REAL VIEWPORTS_8 PNG_72 LOADED BODY EXACT SHA_PASS",
          "menuOrder":"13/13 EXACT 2025 MANUAL AP-1",
          "sourceReferences":"8/8 ORIGINAL JPG SHA_REFERENCE_ONLY",
          "canonicalRuntime":"39/39 EXACT P07 UNCHANGED",
          "stageRuntime":"38/39 P07 PLUS 1 EXPECTED MENU ORDER ONLY",
          "semanticTests":"3 TEST FILES STRICT_ASSERTIONS_NO_WEAKENING",
          "profile21HistoricalReplay":"FAILED_COMPATIBILITY_SAME_HASH_SILENT_MENU_SEMANTIC_DRIFT",
          "independentUnitGate":"GO",
          "independentBrowserEvidenceGate":"GO_EVIDENCE_ONLY",
          "canonicalApply":"NO_GO",
          "userServer":"127.0.0.1:4173 PID1204 HTTP200 UNTOUCHED",
          "testPorts":"4207_4208_4209_4211_4212_4213_9225_CLOSED"},
      "replayBlocker":{
          "profileRevision":"F1-public-reference-21",
          "sameOldEventLogAndSessionHash":True,
          "oldSelectedEntry":"sounder.whiteMarker",
          "newSelectedEntry":"sounder.clutter",
          "oldSelectionOnlyReplayAcceptedUnderNewCode":True,
          "guardedApply":"NO_GO_DO_NOT_SILENTLY_REINTERPRET_HISTORIC_SESSIONS",
          "nextRequired":"Version-bound menu ordering / new profile revision with backward-compatible legacy profile21 replay and migration policy; old session semantics preserved, then re-run full QA and independent GO."},
      "operations":{
          "canonicalProductRuntimeEdited":False,
          "canonicalTestFilesEdited":False,
          "stageCandidateCreated":True,
          "historicalRED_FAILOverwritten":False,
          "oemPhotoMediaCopiedIntoServedWeb":False,
          "installerOrDeployment":False,
          "preimageGuardedApplyAttempted":False,
          "userServerRestartedOrKilled":False},
      "holds":{
          "fullP07":"OPEN","F1Phase6":"OPEN","featureClaims":"65/65 HOLD",
          "hardwareValidated":False,"installedFirmware":"UNKNOWN",
          "fullVietnameseLocaleOracle":"SOURCE_GAP",
          "oemMediaRights":"REFERENCE_ONLY_HOLD",
          "nativePowerWindowBlur":"NOT_VERIFIED",
          "narratorNvdaSpeech":"NOT_RUN",
          "releaseApproval":"HOLD"}
    }
    write_once(FINAL,final)
    assert doc(FINAL)==final
    fh=sha(FINAL)
    evidence2,diff2,shots2=audit()
    assert evidence2==bindings and diff2==stageDiff and shots2==screenshots
    post={
      "schema":"fcv588-p13-menu-order-replay-guard-independent-postreceipt-v1",
      "createdAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),
      "status":"PASS_INDEPENDENT_EVIDENCE_AND_LOCAL_READBACK_CANONICAL_APPLY_NO_GO",
      "finalPath":str(FINAL.relative_to(ROOT)).replace("\\","/"),
      "finalSHA256":fh,
      "freshReadback":{"boundEvidence":len(bindings),"screenshots":len(screenshots),
                       "liveSourceBodyRehash":"72/72","canonicalRuntime":"39/39",
                       "originalReferencePhotos":"8/8","server4173":"HTTP200 PID1204"},
      "applyDecision":"NO_GO_PROFILE21_HISTORICAL_SEMANTIC_DRIFT",
      "note":"Independent gate and browser reviewers, plus fresh local byte readback. This is not a profile21 compatibility PASS, no deploy or OEM certification."
    }
    write_once(POST,post)
    assert doc(POST)==post
    print(json.dumps({"status":final["status"],"finalSHA256":fh,
      "postSHA256":sha(POST),"evidenceCount":len(bindings),
      "finalPath":str(FINAL),"postPath":str(POST)}))

if __name__=="__main__":main()
