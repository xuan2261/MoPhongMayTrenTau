"""Generate one write-once, source-verified P14 canonical final integrity receipt."""
from pathlib import Path
from hashlib import sha256
from zipfile import ZipFile
from datetime import datetime,timezone
import json,re,subprocess
ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
STAGE=ROOT/"_p14_stage_20261116"
QA=Path(__file__).resolve().parent
FINAL_DIR=ROOT/"docs"/"qa"/"FCV588_P14_VERSIONED_REPLAY_20261116"
FINAL=FINAL_DIR/"FCV588_P14_VERSIONED_REPLAY_FINAL_INTEGRITY_20261116.json"
review=ROOT/"plans"/"261113-0911-fcv588-photo-reference-visual-conformance"/"research"/"qa-20261116"/"p14-test-oracle"/"P14_FINAL_V2_ALL_HISTORICAL_SOURCE_GATE_20261116.md"
report=ROOT/"plans"/"261013-2359-fcv588-public-reference-deep-tdd-advice-v2"/"reports"/"continuation-2026-11-16-photo-p14-versioned-replay-profile22-postapply.md"
GATES={
 "stageRuntime50":("P14_STAGE_RUNTIME50_PREAPPLY_INTEGRITY_20261116.json","29890c775bac1ba8785dd87b8adfb7d67be9fdfdbcb973cff67fe77ed0c76dff"),
 "stageNode":("P14_STAGE_FULL_NODE_ALL_HISTORICAL_V3_20261116.txt","72bfeefc7647d4823850c7acc53d0e88003c96379f8aef0f091fa8c8cb429350"),
 "stagePython":("P14_STAGE_PYTHON_ALL_HISTORICAL_V2_20261116.txt","2f5a3f61ac2a5874edaedbf6516269de18c251e44faa5ff4124d8bdaa45579a0"),
 "stageChrome":("P14_STAGE_CHROME_ALL_HISTORICAL_V4_20261116.json","895420e2de501648719729807700fa75ecaddc9f1cb01af736091311875f95d0"),
 "preimageBackup":("P14_GUARDED_PREIMAGE_BACKUP_ALL_HISTORICAL_V2_20261116.zip","b2b2c8ecdd55f7dc96506ef988506420274d0f1b9ea4e7fde788ff029eb5b747"),
 "preimageAllowlist":("P14_GUARDED_APPLY_ALLOWLIST_ALL_HISTORICAL_V2_20261116.json","bb44084018ba8bd092edac97122a0bfb3d5d7b0204fd22a3288a6247d6433f6b"),
 "guardedApplyReceipt":("P14_CANONICAL_APPLY_RECEIPT_ALL_HISTORICAL_V2_20261116.json","82b93e74b055491a3d02dc081ce13fb78f40a1d42fdcfb0b5e1d95d196dd0159"),
 "canonicalNode":("P14_CANONICAL_FULL_NODE_POSTAPPLY_20261116.txt","25c8403864c6b2ada94dfd53deabeb9ffe82382bad547ae9161bb5b2dc1f1e16"),
 "canonicalPython":("P14_CANONICAL_PYTHON_POSTAPPLY_20261116.txt","93e80c9b1f98c2fe9518fa2167302cea29b2c29e95dee65db227ebad199c8034"),
 "canonicalChrome":("P14_CANONICAL_CHROME_ALL_HISTORICAL_V1_20261116.json","4265bb1ea3393064e95465366d020e2e1901ae153b891b1fca003a574fb378ac"),
}
def digest(data):return sha256(data).hexdigest()
def h(path):return digest(path.read_bytes())
def must(condition,why):
 if not condition:raise RuntimeError(why)
for kind,(file,expected) in GATES.items():must(h(QA/file)==expected,f"QA gate tamper: {kind}")
must(h(review)=="45ae1cc5418e416ce868ee415eb4fec501f535e9fcaf71e8064df60a1b8937ad","independent GO review changed")
must("CANONICAL APPLY: GO" in review.read_text(encoding="utf8"),"review no GO")
must(h(report)=="6557202909e62471e3980d0a01bcd6b71f2a149d011aff8c23436b0449237a42","report drift")
base=ROOT/"docs"/"qa"/"FCV588_P07_BOUNDED_20261116"/"FCV588_P07_BOUNDED_FINAL_INTEGRITY_20261116.json"
old=json.loads(base.read_text(encoding="utf8"))
must(len(old["canonicalRuntimeSHA256"])==39,"P07 preimage count")
seal=json.loads((QA/GATES["stageRuntime50"][0]).read_text(encoding="utf8"))
rows=seal["runtimePaths"]
must(len(rows)==50 and len(set(r["path"] for r in rows))==50,"runtime50 inventory")
canonicalRows={}
for row in rows:
 path=row["path"];p=ROOT/path
 must(p.is_file() and h(p)==row["sha256"],f"canonical mismatch {path}")
 must(h(STAGE/path)==row["sha256"],f"stage baseline changed {path}")
 canonicalRows[path]=row["sha256"]
for path,oldHash in old["canonicalRuntimeSHA256"].items():
 must(path in canonicalRows,"old runtime path dropped "+path)
must(sum(r["action"]=="new" for r in rows)==11 and sum(r["action"]=="modified" for r in rows)==6,"runtime delta unexpected")
allow=json.loads((QA/GATES["preimageAllowlist"][0]).read_text(encoding="utf8"))
paths=allow["paths"]
must(len(paths)==38 and sum(e["operation"]=="modify" for e in paths)==17 and sum(e["operation"]=="create" for e in paths)==21,"allowlist count")
with ZipFile(QA/GATES["preimageBackup"][0]) as z:
 must(z.testzip() is None,"backup corrupted")
 for item in paths:
  path=item["path"];p=ROOT/path;stage=STAGE/path
  must(p.is_file() and stage.is_file() and h(p)==item["stageSHA256"]==h(stage),f"applied byte diff {path}")
  if item["operation"]=="modify":
   must(digest(z.read("preimages/"+path))==item["canonicalPreimageSHA256"],f"preimage backup mismatch {path}")
  else:must(item["canonicalPreimageSHA256"] is None,f"create preimage invalid {path}")
apply=json.loads((QA/GATES["guardedApplyReceipt"][0]).read_text(encoding="utf8"))
must(apply["appliedPathCount"]==38 and apply["status"]=="APPLIED_PRE_POST_QA_PENDING","apply receipt mismatch")
for testlog,pattern in [("canonicalNode",r"# pass 577"),("canonicalPython",r"Ran 13 tests.*OK")]:
 data=(QA/GATES[testlog][0]).read_text(encoding="utf8",errors="replace")
 must(bool(re.search(pattern,data,re.S)),f"canonical test summary {testlog}")
def check_chrome(key):
 c=json.loads((QA/GATES[key][0]).read_text(encoding="utf8"))
 must(len(c["checks"])==10 and all(x["pass"] for x in c["checks"]) and not c["errors"],f"Chrome check {key}")
 must(len(c["loadedBodies"])==164 and all(x["match"] for x in c["loadedBodies"]),f"Chrome body {key}")
 must(len(c["views"])==2 and all(not v["pageErrors"] and v["sourceCount"]==82 for v in c["views"]),f"Chrome viewport {key}")
 must(len(c["originalJpegStatus"])==8 and all(r["status"]==404 for r in c["originalJpegStatus"]),f"OEM access {key}")
 must(c["serverExited"] is True,f"Chrome test server retained {key}")
 return [{"viewport":v["viewport"],"screenshotSHA256":v["screenshotSha"],"sourceBodies":v["sourceCount"]} for v in c["views"]]
stageViews=check_chrome("stageChrome");canonicalViews=check_chrome("canonicalChrome")
must(all(a["screenshotSHA256"]==b["screenshotSHA256"] for a,b in zip(stageViews,canonicalViews)),"canonical screenshot drift")
fixtures={}
for name,expected in seal["frozenProfile21FixtureSHA256"].items():
 p=ROOT/"test"/"fixtures"/name
 must(p.is_file() and h(p)==expected and h(STAGE/"test"/"fixtures"/name)==expected,"historical fixture drift "+name)
 fixtures[name]=expected
must(len(fixtures)==6,"expected six legacy fixture hashes")
photos={}
for name,expected in seal["referenceOnlyOriginal8SHA256"].items():
 p=ROOT/"sources"/"FCV588_GiaoDienThucTeMay2016"/name
 must(p.is_file() and h(p)==expected,"reference-only OEM photo drift "+name)
 photos[name]=expected
must(len(photos)==8,"8 OEM sources")
status=json.loads((ROOT/"docs"/"evidence"/"fcv588-public-implementation-status.json").read_text(encoding="utf8"))
register=json.loads((ROOT/"docs"/"evidence"/"device-register.json").read_text(encoding="utf8"))
must(status["profileClass"]=="PUBLIC_REFERENCE" and status["profileRevision"]=="F1-public-reference-22","profile evidence")
must(status["hardwareValidated"] is False and status["firmwareInstalled"] is None and status["rightsClearance"] is False and status["releaseApproval"]=="HOLD","hardware/firmware/rights changed")
must(any(x.get("profileId")=="furuno.fcv588.cv588e" and x.get("profileRevision")=="F1-public-reference-22" and x.get("releaseApproval")=="HOLD" for x in register.get("devices",[])),"device register mismatch")
ps=subprocess.run(["powershell","-NoProfile","-Command","$x=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue|Where-Object {$_.LocalPort -in 4173,4214,4215});$x|Select LocalAddress,LocalPort,OwningProcess|ConvertTo-Json -Compress"],capture_output=True,text=True,check=True)
sockets=json.loads(ps.stdout) if ps.stdout.strip() else []
if isinstance(sockets,dict):sockets=[sockets]
must(len(sockets)==1 and sockets[0]["LocalAddress"]=="127.0.0.1" and sockets[0]["LocalPort"]==4173 and sockets[0]["OwningProcess"]==1204,"protected server drift")
with open(FINAL,"x",encoding="utf8") as f:
 payload={"schema":"FCV588_P14_FINAL_INTEGRITY_V1","createdAt":datetime.now(timezone.utc).isoformat(),"status":"CANONICAL_APPLIED_NODE_PYTHON_CHROME_PASS_INDEPENDENT_POSTRECEIPT_PENDING","scope":"F1_PUBLIC_REFERENCE_V2_OFFLINE_SYNTHETIC","canonicalRoot":str(ROOT),"canonicalApply":"APPLIED_GUARDED","independentApplyReviewSHA256":h(review),"guardedApplyReceiptSHA256":GATES["guardedApplyReceipt"][1],"runtime50":canonicalRows,"runtime50Count":50,"runtimePreimageCount":39,"changedPathsCount":38,"modifiedPreimages":17,"createdPaths":21,"historicalProfile21FixtureSHA256":fixtures,"originalOEMReferenceOnly8SHA256":photos,"chromeStageViews":stageViews,"chromeCanonicalViews":canonicalViews,"postapplyGates":{"node":"577/577 PASS","python":"13/13 OK","chrome":"10/10 PASS; 164/164 body SHA; 8/8 OEM 404"},"p14EvidenceSHA256":{key:value for key,(_,value) in GATES.items()},"reportSHA256":h(report),"protectedUserServer":sockets[0],"holds":{"phase6":"OPEN","claims":"65/65 HOLD","hardwareValidated":False,"firmwareInstalled":None,"rightsClearance":False,"releaseApproval":"HOLD","OEMCertified":False},"limitations":["No physical/hardware/OEM certification","Historical device LCD main-menu semantically version-aware, but no historical instructor panel or user-import viewer","Native screenreader speech, Windows High Contrast, precise installed firmware/original photo homography not accepted"]}
 json.dump(payload,f,ensure_ascii=False,indent=2);f.write("\n")
print(json.dumps({"status":"PASS","final":str(FINAL),"SHA256":h(FINAL),"runtimeCount":50,"changedPaths":38,"sixHistoricalFixtures":len(fixtures),"photos":len(photos),"postNode":577,"postPython":13,"postChrome":10,"sourceBodies":164,"server":sockets[0]},ensure_ascii=True))