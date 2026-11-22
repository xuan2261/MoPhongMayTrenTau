"""Additional read-only integrity pass: actually reread ALL twelve PNG files.

The original P05/P06 final/postreceipt remains immutable. This addendum
strengthens its staged-screenshot reread evidence instead of rewriting it.
"""
from __future__ import annotations
from datetime import datetime,timezone
import zipfile

import p05_p06_guarded_apply as guard

OUT=guard.ROOT/"docs/qa/FCV588_VISUAL_P05_P06_20261116/FCV588_VISUAL_P05_P06_INDEPENDENT_SCREENSHOT_ADDENDUM_20261116.json"
DOC=guard.ROOT/"docs/qa/FCV588_VISUAL_P05_P06_20261116"
FINAL=DOC/"FCV588_VISUAL_P05_P06_FINAL_INTEGRITY_20261116.json"
POST=DOC/"FCV588_VISUAL_P05_P06_INDEPENDENT_POSTRECEIPT_20261116.json"
FINAL_SHA="ecdfb0bc680f35a6935bb11a4bbadd1f95e3441069b7074a0b68ab22506b4ee4"
POST_SHA="9befe64829bf9c79fb7e0505fe1db83a5edf676ce1f4c22a7073ca3cd7a6160e"

def main():
    guard.require(not OUT.exists(),"write-once screenshot addendum already exists")
    guard.require(guard.sha(FINAL)==FINAL_SHA and guard.sha(POST)==POST_SHA,
                  "P05/P06 final/post receipt changed")
    guard.require(guard.sha(guard.P04_FINAL)==guard.FINAL_SHA and
                  guard.sha(guard.P04_POST)==guard.POST_SHA,"P04 parent seal changed")
    final=guard.read_json(FINAL)
    stage=guard.read_json(guard.FINAL_STAGE_SEAL)
    guard.require(guard.sha(guard.FINAL_STAGE_SEAL)==guard.FINAL_STAGE_SEAL_SHA,
                  "P05/P06 staging seal changed")
    photos=guard.read_json(guard.P04_FINAL)["photoReferenceSHA256"]
    for name,detail in photos.items():
        guard.require(guard.sha(guard.ROOT/"sources/FCV588_GiaoDienThucTeMay2016"/name)==
                      detail["sha256"],"original JPEG drift: "+name)
    guard.require(guard.runtime_inventory(guard.ROOT)==
                  guard.runtime_inventory(guard.STAGE)==final["runtimeSHA256"],
                  "canonical/stage runtime SHA mismatch")
    guard.require(all(guard.sha(guard.ROOT/r)==s for r,s in final["newTestSHA256"].items()),
                  "new tests changed")
    # Genuine rehash from file bodies, not simply comparing signed JSON maps.
    images={}
    for source,items in (("stage",stage["browserScreenshotSHA256"]),
                         ("canonical",final["canonicalScreenshotSHA256"])):
        guard.require(len(items)==6,"six screenshot paths expected: "+source)
        images[source]={}
        for path,expected in items.items():
            observed=guard.sha(guard.Path(path))
            guard.require(observed==expected,"PNG bytes drift: "+path)
            images[source][path]=observed
    guard.require(all(guard.sha(guard.ROOT/path)==expected
                      for path,expected in final["canonicalQA"].items()),
                  "canonical QA log bytes drift")
    guard.require(all(guard.sha(guard.ROOT/path)==expected
                      for path,expected in final["canonicalChromeReceipts"].items()),
                  "canonical browser receipt bytes drift")
    with zipfile.ZipFile(guard.ZIP,"r") as archive:
        before=guard.read_json(guard.P04_FINAL)["runtimeSHA256"]
        for rel in guard.MOD:
            guard.require(guard.digest(archive.read(rel))==before[rel],
                          "ZIP does not contain P04 preimage: "+rel)
    # P06 Chrome stores every loaded response-body SHA, validate again using
    # current canonical bytes. P05 stores only 35/35 per-case matches.
    p06path=next((guard.QA/"canonical-browser-p06-v1").glob("*-receipt.json"))
    p06=guard.read_json(p06path)
    body_count=0
    for case in p06["cases"]:
        for item in case["loaded"]:
            guard.require(item["bodySHA256"]==item["sourceSHA256"]==
                          guard.sha(guard.ROOT/item["path"]),
                          "actual loaded canonical response SHA mismatch")
            body_count+=1
    guard.require(body_count==105,"expected 3 x 35 actually loaded bodies")
    record={"schema":"fcv588-p05-p06-independent-screenshot-addendum-v1",
        "timestampUtc":datetime.now(timezone.utc).isoformat(),
        "status":"PASS_12_OF_12_ACTUAL_PNG_BYTES_REREAD_AND_RUNTIME39_CONFIRMED",
        "finalIntegritySHA256":FINAL_SHA,"originalPostreceiptSHA256":POST_SHA,
        "stagedSixScreenshotSHA256":images["stage"],
        "canonicalSixScreenshotSHA256":images["canonical"],
        "originalPhotoCount":len(photos),"runtimeSourceCount":39,
        "canonicalP06ActuallyLoadedResponsesRehashed":body_count,
        "canonicalP05ActuallyLoadedResponses":"35/35 matches per case (body rows not persisted)",
        "guardedBackupSHA256":guard.sha(guard.ZIP),
        "P04FishOnlyRisk":"MEDIUM_NOT_FIXED_HOLD",
        "hardwareFirmwareRightsRelease":"HOLD"}
    guard.write_exclusive(OUT,guard.serialized(record))
    print("P05_P06_SCREENSHOT_ADDENDUM="+record["status"])
    print("P05_P06_SCREENSHOT_ADDENDUM_SHA256="+guard.sha(OUT))

if __name__=="__main__":main()
