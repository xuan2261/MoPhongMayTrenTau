"""Merge independent P05 and P06 presentation edits in an isolated staging tree.

No canonical edits. Git's three-way merge must be conflict-free; do not weaken
existing P04 public-reference geometry tests to force this merge.
"""
from pathlib import Path
import hashlib
import json
import os
import subprocess
import tempfile

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
BASE=ROOT/"web/styles.css"
P05=ROOT/"staging/fcv588-photo-p05menu-20261116"
P06=ROOT/"staging/fcv588-photo-p06face-20261116"
DEST=ROOT/"staging/fcv588-photo-integrated-20261116"
QA=ROOT/"plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/integrated"
RECEIPT=QA/"INTEGRATION_P06_20261116.json"
FILES=("web/index.html","test/fcv588-device-focus.test.mjs",
       "test/fcv588-photo-face-geometry.test.mjs")

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def need(ok,msg):
    if not ok: raise RuntimeError(msg)

def main():
    need(not RECEIPT.exists(), "merge receipt exists; do not overwrite")
    need(sha(ROOT/"docs/qa/FCV588_VISUAL_P04_20261114/FCV588_VISUAL_P04_FINAL_INTEGRITY_20261114.json") ==
         "c3a292dc213e660fa855c453eaf324fd9014ddb163e4723cea141a4050a1382b",
         "P04 sealed parent drift")
    need(sha(P05/"web/styles.css")==sha(DEST/"web/styles.css"),
         "integrated CSS is not exact P05 preimage")
    need(sha(BASE)!=sha(P05/"web/styles.css") and sha(BASE)!=sha(P06/"web/styles.css"),
         "P05/P06 CSS changes unexpectedly absent")
    need(sha(ROOT/"web/index.html")==sha(DEST/"web/index.html"),
         "integrated index preimage is not canonical")
    for rel in FILES:
        need((P06/rel).is_file(), "P06 input missing "+rel)
        if rel.startswith("test/"):
            need(not (ROOT/rel).exists() and not (DEST/rel).exists(),
                 "new test already exists "+rel)
    proc=subprocess.run(["git","merge-file","-p","--",
          str(P05/"web/styles.css"),str(BASE),str(P06/"web/styles.css")],
          stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False)
    need(proc.returncode==0,
         "P05/P06 CSS three-way merge conflict: "+proc.stderr.decode(errors="replace"))
    need(b"<<<<<<<" not in proc.stdout and b">>>>>>>" not in proc.stdout,
         "CSS merge conflict marker")
    need(b".lcd-menu-value" in proc.stdout and b".device-focus-control" in proc.stdout,
         "expected menu+focus selectors absent after merge")
    need(b"width: 59%" in proc.stdout, "P04 legacy LCD aperture allocation drift")
    fd,temp=tempfile.mkstemp(prefix=".p06_merge_",suffix=".tmp",dir=DEST/"web")
    try:
        with os.fdopen(fd,"wb") as f: f.write(proc.stdout)
        os.replace(temp,DEST/"web/styles.css")
    finally:
        if os.path.exists(temp): os.unlink(temp)
    results={"web/styles.css":sha(DEST/"web/styles.css")}
    for rel in FILES:
        (DEST/rel).write_bytes((P06/rel).read_bytes())
        need(sha(DEST/rel)==sha(P06/rel), "P06 integration SHA mismatch "+rel)
        results[rel]=sha(DEST/rel)
    receipt={"status":"P05_P06_COMBINED_IN_ISOLATED_STAGE_ONLY",
             "canonicalApplied":False,
             "parentP04Final":"c3a292dc213e660fa855c453eaf324fd9014ddb163e4723cea141a4050a1382b",
             "p05StageStylesSHA256":sha(P05/"web/styles.css"),
             "p06StageStylesSHA256":sha(P06/"web/styles.css"),
             "mergedStageArtifactsSHA256":results}
    with RECEIPT.open("x",encoding="utf-8",newline="\n") as f:
        json.dump(receipt,f,ensure_ascii=False,indent=2)
        f.write("\n")
    print("P06_ISOLATED_STAGE_MERGE_SUCCESS")
    print("P06_MERGE_RECEIPT_SHA256="+sha(RECEIPT))
    print("P06_MERGED_STYLES_SHA256="+results["web/styles.css"])

if __name__=="__main__": main()
