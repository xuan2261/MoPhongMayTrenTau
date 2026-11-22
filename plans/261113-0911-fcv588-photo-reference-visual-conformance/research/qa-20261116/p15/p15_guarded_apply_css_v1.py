"""Guarded P15 CSS-only canonical apply with exact independent GO and rollback.
Run without --execute to verify preimages, or with both signed reviewer SHA args.
Never restarts the user server. Release always HOLD.
"""
from pathlib import Path
from hashlib import sha256
from zipfile import ZipFile
import argparse,json,os,subprocess,sys
ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
STAGE=ROOT/"_p15_stage_20261116"
QA=Path(__file__).resolve().parent
REVROOT=QA.parent/"p15-geometry"
VISROOT=QA.parent/"p15-photo"
REVIEW=REVROOT/"P15_G1G2_INDEPENDENT_PREAPPLY_GATE_20261116.md"
VISREVIEW=VISROOT/"P15_VISUAL_G1G2_INDEPENDENT_BOUNDED_REVIEW_20261116.md"
MAN=QA/"P15_CSS_APPLY_ALLOWLIST_20261116.json"
ZIP=QA/"P15_CSS_PREIMAGE_BACKUP_20261116.zip"
SEAL=QA/"P15_STAGE_CSS_SOURCE_INTEGRITY_20261116.json"
INTENT=QA/"P15_CANONICAL_CSS_APPLY_INTENT_20261116.json"
RECEIPT=QA/"P15_CANONICAL_CSS_APPLY_RECEIPT_20261116.json"
FAILURE=QA/"P15_CANONICAL_CSS_APPLY_FAILED_20261116.json"
PIN={MAN:"d18f8e7a19f6cb82b03eeaecf8acceb16af578842639374f1658adfebcc7e8ec",ZIP:"f73e84c94b73943bc26a4d18778f06de05684f183e1f209111610bf415d03e01",SEAL:"7afd374b89f0ddce597ba9917dfca7d2af532932a205868cc410267f727326e3"}
def hashbytes(data):return sha256(data).hexdigest()
def h(path):return hashbytes(path.read_bytes())
def ensure(test,message):
 if not test:raise RuntimeError(message)
def write_once(path,data):
 with path.open("x",encoding="utf-8") as out:json.dump(data,out,ensure_ascii=False,indent=2);out.write("\n")
def atomic_replace(path,data):
 path.parent.mkdir(parents=True,exist_ok=True)
 temp=path.with_name(path.name+".p15transaction.tmp")
 with temp.open("xb") as f:f.write(data);f.flush();os.fsync(f.fileno())
 os.replace(temp,path)
def test_port_identity():
 powershell='$x=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue|Where-Object {$_.LocalPort -in 4173,4214,4215,4216});$x|Select LocalAddress,LocalPort,OwningProcess|ConvertTo-Json -Compress'
 ps=subprocess.run(["powershell","-NoProfile","-Command",powershell],capture_output=True,text=True,check=True)
 sockets=json.loads(ps.stdout) if ps.stdout.strip() else []
 if isinstance(sockets,dict):sockets=[sockets]
 ensure(len(sockets)==1 and sockets[0]["LocalPort"]==4173 and sockets[0]["OwningProcess"]==1204 and sockets[0]["LocalAddress"]=="127.0.0.1","user/test port ownership drift")
 return sockets[0]
def preflight():
 for f,pin in PIN.items():ensure(f.is_file() and h(f)==pin,"P15 evidence SHA drift: "+str(f))
 pre=ROOT/"docs"/"qa"/"FCV588_P14_VERSIONED_REPLAY_20261116"/"FCV588_P14_VERSIONED_REPLAY_FINAL_INTEGRITY_20261116.json"
 post=ROOT/"docs"/"qa"/"FCV588_P14_VERSIONED_REPLAY_20261116"/"FCV588_P14_VERSIONED_REPLAY_INDEPENDENT_POSTRECEIPT_20261116.json"
 ensure(h(pre)=="195d0737b602196bddb5971964500dabab41d19eaee08b5b620e97f26089e99e" and h(post)=="2dfeb190a2160fb4e6f24988fa7d054b2dd0098f14c378901068cef6321b8754","P14 authoritative final drift")
 seal=json.loads(SEAL.read_text(encoding="utf8"))
 ensure(len(seal["runtimePaths"])==50 and sum(x["action"]=="modify" for x in seal["runtimePaths"])==1,"runtime50 seal mismatch")
 for x in seal["runtimePaths"]:
  canon=ROOT/x["path"];stage=STAGE/x["path"]
  ensure(canon.is_file() and h(canon)==x["canonicalPreimageSHA256"],"P14 canonical preimage changed: "+x["path"])
  ensure(stage.is_file() and h(stage)==x["stageSHA256"],"staged runtime drift: "+x["path"])
 manifest=json.loads(MAN.read_text(encoding="utf8"));entries=manifest["paths"]
 ensure(manifest["status"]=="PREPARED_NOT_APPLIED" and len(entries)==2,"not exactly P15 2 paths")
 ensure(set((e["path"],e["operation"]) for e in entries)=={("web/styles.css","modify"),("test/fcv588-p15-uniform-lcd-css.test.mjs","create")},"unexpected allowlist")
 for e in entries:
  p=ROOT/e["path"];s=STAGE/e["path"]
  ensure(s.is_file() and h(s)==e["stageSHA256"],"staged path drift "+e["path"])
  if e["operation"]=="create":ensure(not p.exists() and e["canonicalPreimageSHA256"] is None,"new path collision")
  else:ensure(p.is_file() and h(p)==e["canonicalPreimageSHA256"],"preimage mismatch "+e["path"])
 with ZipFile(ZIP) as z:
  ensure(z.testzip() is None and z.read("P15_PREIMAGE_MANIFEST.json")==MAN.read_bytes(),"backup ZIP CRC/manifest mismatch")
  ensure(hashbytes(z.read("preimages/web/styles.css"))==entries[0]["canonicalPreimageSHA256"],"backed CSS preimage mismatch")
 photos=seal["originalOEM8SHA256"]
 ensure(len(photos)==8,"eight photo source seal missing")
 for name,sha in photos.items():
  orig=ROOT/"sources"/"FCV588_GiaoDienThucTeMay2016"/name
  ensure(orig.is_file() and h(orig)==sha,"OEM original photo drift "+name)
 return entries,test_port_identity()
def execute():
 ap=argparse.ArgumentParser();ap.add_argument("--execute",action="store_true");ap.add_argument("--review-sha");ap.add_argument("--visual-sha");args=ap.parse_args()
 entries,server=preflight()
 if not args.execute:
  print(json.dumps({"preflight":"PASS","changedRuntime":1,"newTest":1,"server":server,"applied":False}));return
 ensure(args.review_sha and args.visual_sha,"two independent review SHA values are required")
 ensure(REVIEW.is_file() and VISREVIEW.is_file() and h(REVIEW)==args.review_sha and h(VISREVIEW)==args.visual_sha,"independent review/visual review SHA mismatch")
 text=REVIEW.read_text(encoding="utf8").upper()
 visual=VISREVIEW.read_text(encoding="utf8").upper()
 ensure("CANONICAL APPLY: GO" in text,"review does not explicitly approve canonical GO")
 ensure("NO_GO" not in text.split("## FINAL VERDICT")[-1][:350] if "## FINAL VERDICT" in text else "CANONICAL APPLY: NO_GO" not in text,"review NO_GO")
 ensure("GO_BOUNDED" in visual and not "VERDICT: NO_GO" in visual,"independent visual GO_BOUNDED missing")
 ensure(not INTENT.exists() and not RECEIPT.exists() and not FAILURE.exists(),"transaction already attempted")
 write_once(INTENT,{"schema":"P15_APPLY_INTENT_V1","status":"READY_GUARDED","preimageBackupSHA256":h(ZIP),"stageSealSHA256":h(SEAL),"independentReviewSHA256":args.review_sha,"independentVisualReviewSHA256":args.visual_sha,"paths":entries})
 applied=[]
 try:
  for e in entries:
   path=ROOT/e["path"]
   if e["operation"]=="modify":ensure(path.is_file() and h(path)==e["canonicalPreimageSHA256"],"preimage modified during transaction")
   else:ensure(not path.exists(),"create path collision during transaction")
   data=(STAGE/e["path"]).read_bytes()
   ensure(hashbytes(data)==e["stageSHA256"],"staged bytes mutated during apply")
   atomic_replace(path,data);applied.append(e)
  for e in entries:ensure(h(ROOT/e["path"])==e["stageSHA256"],"applied post SHA wrong")
 except Exception as ex:
  rollback=[]
  with ZipFile(ZIP) as z:
   for e in reversed(applied):
    path=ROOT/e["path"]
    try:
     ensure(path.is_file() and h(path)==e["stageSHA256"],"external changes; rollback refused")
     if e["operation"]=="create":path.unlink()
     else:atomic_replace(path,z.read("preimages/"+e["path"]))
    except Exception as e2:rollback.append({"path":e["path"],"error":str(e2)})
  write_once(FAILURE,{"status":"FAILED","error":str(ex),"rollbackErrors":rollback,"appliedCountBeforeRollback":len(applied)})
  raise
 write_once(RECEIPT,{"schema":"P15_CSS_GUARDED_APPLY_RECEIPT_V1","status":"APPLIED_CANONICAL_POSTQA_PENDING","source":"F1_PUBLIC_REFERENCE_V2_SYNTHETIC","appliedPaths":[{"path":e["path"],"sha256":h(ROOT/e["path"]),"operation":e["operation"]} for e in entries],"sourceSealSHA256":h(SEAL),"preimageZIP_SHA256":h(ZIP),"independentReviewSHA256":args.review_sha,"independentVisualReviewSHA256":args.visual_sha,"protectedServer":server,"releaseApproval":"HOLD","hardwareValidated":False,"rightsClearance":False})
 print(json.dumps({"applied":True,"paths":len(entries),"receiptSHA256":h(RECEIPT),"server":server},ensure_ascii=True))
if __name__=="__main__":execute()