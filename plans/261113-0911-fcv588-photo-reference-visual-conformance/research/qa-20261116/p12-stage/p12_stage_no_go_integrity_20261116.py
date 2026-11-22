"""P12 source-valid Sounder order RED/GREEN, held from canonical apply after full QA FAIL."""
import datetime
import hashlib
import json
from pathlib import Path

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=Path("plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116")
STAGE=ROOT/QA/"p12-stage/worktree"
OUTPUT=ROOT/QA/"p12-stage/P12_SOUND_MENU_STAGING_NO_GO_20261116.json"

FIXED={
 "parentP11":("docs/qa/FCV588_P11_NATIVE_FOCUS_BOUNDARIES_20261116/FCV588_P11_NATIVE_FOCUS_FINAL_INTEGRITY_20261116.json","845b4fe9cf9b184a74ddba91783362e9446c1219d38362c16166d4b3d6a44c87"),
 "parentP11Post":("docs/qa/FCV588_P11_NATIVE_FOCUS_BOUNDARIES_20261116/FCV588_P11_NATIVE_FOCUS_INDEPENDENT_POSTRECEIPT_20261116.json","392220f62ae29c2f1bf77b73c90d016b1a3a40e115a8c04612ce59a728b09f98"),
 "manualAudit":(str(QA/"p12-manual-source/P12_MANUAL_MENU_SOURCE_AUDIT_20261116.json"),"c28b618cceca8380fa0be4cfdf514a2b12801b08dbccbea1b45255be0bf1c5b5"),
 "manualOrderSupplement":(str(QA/"p12-manual-source/P12_MANUAL_SOUND_ORDER_SUPPLEMENT_20261116.md"),"be84cf98525de66f4005550cf7c6bd381bf916b45c32d5e079c62a69c442b812"),
 "photoLexicon":(str(QA/"p12-photo-lexicon/P12_2016_PHOTO_LCD_LEXICON_20261116.json"),"9c8c7397a42610005a9fed7535a722f951ab708273068301c44f49faf81b2e83"),
 "runtimeMenuLedger":(str(QA/"p12-runtime-ledger/P12_CURRENT_MENU_SOURCE_TRACEABILITY_20261116.json"),"7c44ea82784a64c08fbf05ac81d59b79da46816e0283d99a49205ae45c56fc9c"),
 "photoCrosswalk":(str(QA/"p12-runtime-ledger/P12_PHOTO_2016_VI_MENU_ORDER_CROSSWALK_20261116.json"),"994290762fa2d19c0b491007af559a4c9a437701c4f7e4de71732e582fab2e9f"),
 "targetedCanonicalMenu25":(str(QA/"p12-runtime-ledger/P12_TARGETED_MENU_NODE_20261116.txt"),"30e79694fa8f83f4b21f2d2db1bda9f344849d28fdfb8cbbd2ebf51f4fd1ef43"),
 "sourceValidRED":(str(QA/"p12-stage/P12_SOURCE_VALID_MANUAL_MENU_ORDER_RED_20261116.txt"),"c228a4ea0f5d8c4feceedf57f9ea740d5a86164034654466b8a97f2fc141163e"),
 "stageTargetedGREEN":(str(QA/"p12-stage/P12_STAGING_MANUAL_MENU_ORDER_GREEN_20261116.txt"),"ed1fcf5cdac606cfa3350a92d4742dfcfc7f1622c9ba140982cfe972bed406e6"),
 "stageFullNodeFAIL":(str(QA/"p12-stage/P12_STAGING_FULL_NODE_20261116.txt"),"079419aa1dbca42a688f0e1644d487bcc276ed14fcf98dc220a26af45a581f85"),
 "stageOrderOnlyEquivalence":(str(QA/"p12-stage/P12_STAGE_ORDER_ONLY_EQUIVALENCE_20261116.txt"),"5996df27237b43f92044c602127c88394db7b01df3a28dbcabe9c0cc9cbbcfb6"),
}
def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def log_result(n):
    return (ROOT/FIXED[n][0]).read_text(encoding="utf-8-sig",errors="replace")

def main():
    assert not OUTPUT.exists(),"P12 staging NO-GO already written"
    bindings={}
    for n,(p,expected) in FIXED.items():
        actual=sha(ROOT/p)
        assert actual==expected,(n,actual,expected)
        bindings[n]={"path":p.replace("\\","/"),"sha256":actual}
    red=log_result("sourceValidRED")
    green=log_result("stageTargetedGREEN")
    full=log_result("stageFullNodeFAIL")
    targeted=log_result("targetedCanonicalMenu25")
    assert all(x in red for x in ["# tests 3","# pass 2","# fail 1"])
    assert all(x in green for x in ["# tests 3","# pass 3","# fail 0"])
    assert all(x in targeted for x in ["# tests 25","# pass 25","# fail 0"])
    assert all(x in full for x in ["# tests 526","# pass 499","# fail 27"])
    assert "ENOENT" in full and "docs" in full and "evidence" in full
    for fail in ["large option lists are bounded", "source HOLD, capability N/A",
                 "V47 firmware-dependent White Marker D15 cue",
                 "V47 LCD menu projector remains OEM-label",
                 "V47 White Marker notice is selection-scoped"]:
        assert "not ok" in full and fail in full,fail
    p07=json.loads((ROOT/"docs/qa/FCV588_P07_BOUNDED_20261116/FCV588_P07_BOUNDED_FINAL_INTEGRITY_20261116.json").read_text(encoding="utf-8"))
    canonical=p07["canonicalRuntimeSHA256"]
    assert len(canonical)==39
    stageDiff={}
    for name,expected in canonical.items():
        current=sha(ROOT/name)
        assert current==expected,("canonical drift",name)
        candidate=sha(STAGE/name)
        if candidate!=expected:
            stageDiff[name]={"originalSHA256":expected,"candidateSHA256":candidate}
    assert set(stageDiff)=={"src/devices/fcv588/menu-atlas.mjs"}
    assert stageDiff["src/devices/fcv588/menu-atlas.mjs"]=={
        "originalSHA256":"992d7a6e1f3a645680ea73f87ce2863a9e9f38eb16428a4581ad5e7e71a58aed",
        "candidateSHA256":"e2ba214cf81aa739452dc1ecd0ddfdcc7fad7814478a2d5e27e6925eda945aca",
    }
    originals=p07["referenceOnlyOriginalPhotos"]
    assert len(originals)==8
    for name,data in originals.items():
        assert sha(ROOT/"sources/FCV588_GiaoDienThucTeMay2016"/name)==data["sha256"]
    photo=json.loads((ROOT/FIXED["photoCrosswalk"][0]).read_text(encoding="utf-8"))
    assert photo["photoVisibleMenuRows"]==13
    assert len(photo["differentOrdinalRows1Based"])==12
    assert photo["pairwiseOrderInversionCount"]==21
    receipt={
        "schema":"fcv588-p12-source-valid-menu-order-staging-no-go-v1",
        "createdAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),
        "decision":"SOURCE_VALID_AP1_SOUND_MENU_ORDER_RED_GREEN_STAGE_NO_GO_CANONICAL_APPLY_HOLD",
        "scope":"F1_PUBLIC_REFERENCE_V2_MENU_ORDER_STAGING_ONLY",
        "evidenceSHA256":bindings,
        "confirmedSourceOrder":{
            "officialManual":"OME-23890-E 2025 PDF page 59 printed AP-1",
            "photographicWitness":"giaoDien.jpg project-2016-collection, date/installed firmware unknown",
            "sounderEntries":13,"differentMenuOrdinalRows":12,"orderInversions":21},
        "TDD":{
            "canonicalRED":"2/3 PASS_1_MANUAL_ORDER_FAIL",
            "stagingGREEN":"3/3 PASS",
            "canonicalTargetedRegressionBeforeChange":"25/25 PASS",
            "stagingFullNode":"499/526 PASS_27_FAIL_NOT_ACCEPTABLE",
            "sourceRelatedStageFailuresAtLeast":5,
            "environmentFixtureGaps":"Staging snapshot intentionally lacks canonical docs/evidence and plan files; many suite tests fail ENOENT. Full QA cannot be claimed on this staging worktree.",
            "indexSensitiveBehaviorRegressions":"At least 5 LCD projection, selected menu row and White Marker D15 tests assumed prior Sounder item indexes. Their assertions remain unchanged; do not relax to force GREEN."},
        "stagingRuntimeSHA256Diff":stageDiff,
        "canonicalRuntime":"39/39_EXACT_P07_UNCHANGED",
        "referencePhotos":"8/8_SHA_MATCH_REFERENCE_ONLY",
        "sourceLocalization":{
            "vietnamesePhotoMenu":"DIRECT_BOUNDED_ONE_JPEG",
            "fullVietnameseFirmwareOracle":"SOURCE_GAP",
            "firmwareInstalled":"UNKNOWN",
            "whiteLineExactChoiceAndPercentage":"SOURCE_VALID_DIFFERENCE_DETECTED_NOT_IN_THIS_PATCH"},
        "apply":{
            "decision":"NO_GO",
            "reason":"Full stage QA FAIL and historical index-sensitive contracts require explicit, reviewed versioned rebaseline; no approved guard apply or canonical edits.",
            "requires":"source-valid RED, full staging source/fixture-complete QA, independent GO, protected preimage backup and guarded apply before canonical runtime edit"},
        "operations":{
            "canonicalRuntimeEdited":False,
            "stagingSourceEdited":True,
            "historicalFailuresOverwritten":False,
            "testAssertionsModifiedToForceGreen":False,
            "oemImagesCopiedToRuntime":False,
            "releaseOrHardwareAction":False}
    }
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    with OUTPUT.open("x",encoding="utf-8",newline="\n") as f:
        json.dump(receipt,f,ensure_ascii=False,sort_keys=True,indent=2)
        f.write("\n")
    assert json.loads(OUTPUT.read_text(encoding="utf-8"))==receipt
    print(json.dumps({"decision":receipt["decision"],"runtimeDiffCount":len(stageDiff),
                      "fullStagingStatus":receipt["TDD"]["stagingFullNode"],
                      "sha256":sha(OUTPUT)}))
if __name__=="__main__":
    main()
