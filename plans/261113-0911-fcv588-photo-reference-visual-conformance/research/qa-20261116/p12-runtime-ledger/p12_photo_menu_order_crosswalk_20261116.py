"""Bounded analyst crosswalk: photographed Vietnamese Sounder menu vs current atlas.

The matched English IDs are translation/semantic hypotheses, NOT a complete
verified Vietnamese installed-firmware or localization oracle.
"""
import datetime
import hashlib
import json
from pathlib import Path

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=ROOT/"plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116"
PHOTO=QA/"p12-photo-lexicon/P12_2016_PHOTO_LCD_LEXICON_20261116.json"
LEDGER=QA/"p12-runtime-ledger/P12_CURRENT_MENU_SOURCE_TRACEABILITY_20261116.json"
OUTPUT=QA/"p12-runtime-ledger/P12_PHOTO_2016_VI_MENU_ORDER_CROSSWALK_20261116.json"

PHOTO_SHA="9c8c7397a42610005a9fed7535a722f951ab708273068301c44f49faf81b2e83"
LEDGER_SHA="7c44ea82784a64c08fbf05ac81d59b79da46816e0283d99a49205ae45c56fc9c"
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

# A bounded semantic ordering hypothesis, recorded separately from literal
# source text. It makes no claim about OEM firmware/version or exact translation.
SEMANTIC_MAP=[
    "sounder.pictureAdvance",
    "sounder.zoomMode",
    "sounder.shift",
    "sounder.interference",
    "sounder.colorErase",
    "sounder.clutter",
    "sounder.whiteLine",
    "sounder.whiteMarker",
    "sounder.tvg",
    "sounder.smoothing",
    "sounder.bottomZone",
    "sounder.txPower",
    "sounder.txRate",
]

def main():
    assert sha(PHOTO)==PHOTO_SHA and sha(LEDGER)==LEDGER_SHA
    photos=json.loads(PHOTO.read_text(encoding="utf-8"))
    source=json.loads(LEDGER.read_text(encoding="utf-8"))
    assert source["canonicalRuntime"]=="39/39 SHA_MATCH_P07_SEALED"
    assert len(photos["photos"])==8
    pic=next(item for item in photos["photos"] if item["name"]=="giaoDien.jpg")
    assert pic["actualMenuOptionTextLegible"]
    rows=next(region["text"] for region in pic["regions"] if region["kind"]=="menu_option_rows")
    assert len(rows)==13 and len(SEMANTIC_MAP)==13 and len(set(SEMANTIC_MAP))==13
    current=[e for e in source["currentRuntimeMenuEntries"] if e["category"]=="Sounder"]
    current_ids=[e["id"] for e in current]
    assert len(current_ids)==13 and set(current_ids)==set(SEMANTIC_MAP)
    current_index={x:i for i,x in enumerate(current_ids)}
    crosswalk=[
        {"photoOrder":i+1,"photoLiteral":text,"analystSemanticSourceId":id,
         "runtimeEnglishLabel":next(x["label"] for x in current if x["id"]==id),
         "runtimeOrder":current_index[id]+1,"sameOrdinal":current_index[id]==i,
         "sourceClass":"PHOTOGRAPHIC_VI_LITERAL_AND_ANALYST_SEMANTIC_MAPPING_NOT_OEM_TRANSLATION_CERTIFICATION"}
        for i,(text,id) in enumerate(zip(rows,SEMANTIC_MAP))]
    inverted=[
        [i+1,j+1] for i in range(13) for j in range(i+1,13)
        if current_index[SEMANTIC_MAP[i]]>current_index[SEMANTIC_MAP[j]]
    ]
    assert any(not item["sameOrdinal"] for item in crosswalk)
    nonidentical=[x["photoOrder"] for x in crosswalk if not x["sameOrdinal"]]
    lexical_issues={
        "photoWhiteLineVisibleValue":"Biên",
        "atlasWhiteLineChoices":next(x["choices"] for x in current if x["id"]=="sounder.whiteLine"),
        "photoWhiteLineValueInAtlas":False,
        "interpretation":"Photo text/value vs current English training option set; firmware equivalence and semantics still unverified",
        "photoPercentAppearance":"Xóa màu : 0%; Nhiễu tạp : 60%",
        "atlasPercentageValues":"Current choice arrays are numeric strings without percent sign; LCD rendering localization still unverified",
    }
    assert "Biên" not in lexical_issues["atlasWhiteLineChoices"]
    output={
        "schema":"fcv588-p12-photo-literal-to-current-menu-order-crosswalk-v1",
        "createdAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),
        "status":"PASS_SOURCE_COMPARISON_PHOTO_SPECIFIC_MENU_ORDER_DIFFERENCE_DETECTED_NO_RUNTIME_CHANGE",
        "photoReceiptSha256":PHOTO_SHA,
        "runtimeLedgerSha256":LEDGER_SHA,
        "photo":"giaoDien.jpg",
        "comparisonClass":"ONE_UNCALIBRATED_REFERENCE_JPEG_IN_PROJECT_2016_COLLECTION",
        "photoVisibleMenuRows":13,
        "runtimeSounderMenuRows":13,
        "sameOrdinalCount":len(crosswalk)-len(nonidentical),
        "differentOrdinalRows1Based":nonidentical,
        "pairwiseOrderInversionCount":len(inverted),
        "invertedPhotoRowPairs1Based":inverted,
        "crosswalk":crosswalk,
        "lexicalValueDiscrepancyCandidates":lexical_issues,
        "acceptance":{
            "photoLiteralTranscription":"BOUNDED_SOURCE_DIRECT",
            "analystSemanticMapping":"PROVISIONAL_NOT_OEM_LANGUAGE_ORACLE",
            "photoSpecificMenuOrderDifference":"OBSERVED_AS_SEMANTIC_CROSSWALK",
            "installedFirmware":"UNKNOWN",
            "fullVietnameseLanguageDictionary":"HOLD",
            "samePhotoReferenceAndCanonicalFirmware":"NOT_ESTABLISHED",
            "runtimeApply":"HOLD_UNTIL_SOURCE_VALID_COMPLETE_SCOPE_AND_FROZEN_STAGING_QA",
            "rightsToRedistributePhotos":"HOLD"},
        "operations":{"noSourceEdited":True,"noOEMMediaDerivative":True,
                      "noExistingEvidenceOverwritten":True,"noBrowserRun":True}
    }
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    with OUTPUT.open("x",encoding="utf-8",newline="\n") as f:
        json.dump(output,f,ensure_ascii=False,sort_keys=True,indent=2)
        f.write("\n")
    assert json.loads(OUTPUT.read_text(encoding="utf-8"))==output
    print(json.dumps({"status":output["status"],"differentOrdinals":len(nonidentical),
                      "invertedPairs":len(inverted),"receiptSHA256":sha(OUTPUT)}))

if __name__=="__main__":
    main()
