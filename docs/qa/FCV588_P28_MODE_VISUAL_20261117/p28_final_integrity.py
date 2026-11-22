"""Write-once P28 bounded visual/mode QA integrity, no runtime changes."""
import datetime
import hashlib
import json
from pathlib import Path
import re
import sys

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
STAGE=ROOT/"staging/fcv588-p28-mode-visual-20261117"
QA=ROOT/"docs/qa/FCV588_P28_MODE_VISUAL_20261117"
P27=ROOT/"docs/qa/FCV588_P27_EVENT_TIMELINE_20261117"
FINAL_PARENT=P27/"FCV588_P27_EVENT_TIMELINE_FINAL_INTEGRITY_20261117.json"
POST_PARENT=P27/"FCV588_P27_EVENT_TIMELINE_INDEPENDENT_SHA_POSTRECEIPT_20261117.json"
DRYRUN=QA/"P28_TEST_ONLY_DRYRUN_V2_20261117.json"
APPLY=QA/"P28_TEST_ONLY_GUARDED_APPLY_20261117.json"
REPORT=QA/"FCV588_P28_MODE_VISUAL_FINAL_REPORT_20261117.md"
FINAL=QA/"FCV588_P28_MODE_VISUAL_FINAL_INTEGRITY_20261117.json"
NEW="test/fcv588-p28-mode-replay-matrix.test.mjs"
P27_FINAL_SHA="97232cffc3ad6906beb08022c9c49bc39b6776fe7623bda193ec23605ab5ce3a"
P27_POST_SHA="2a8ece9b2a2dda1f0e60b4ed0f3a9d459b4661c79d275e3dfc3a74f343f4578a"
def sha(path):
 h=hashlib.sha256()
 with Path(path).open("rb") as f:
  for b in iter(lambda:f.read(1048576),b""):h.update(b)
 return h.hexdigest()
def j(path):return json.loads(Path(path).read_text(encoding="utf8"))
def need(condition,message):
 if not condition:raise RuntimeError("P28 FINAL NO_GO: "+message)
def testlog(path,expected,python=False):
 data=path.read_text(encoding="utf8")
 if python:
  need("Ran 13 tests" in data and re.search(r"(?m)^OK\s*$",data),
       "Python 13 failed: "+path.name)
 else:
  for key,count in [("tests",expected),("pass",expected),("fail",0)]:
   need(re.search(fr"(?m)^# {key} {count}\s*$",data),
        f"test {key} count failed: {path.name}")
 return sha(path)
def chrome(path,expected,source):
 b=j(path)
 need(b["status"]=="PASS" and len(b["cases"])==expected and
      not b["errors"] and b["qaPortClosed"] and b["ownedQAServerExited"],
      "browser status/cases/cleanup failed "+path.name)
 actual=b["sourceBodiesCount"] if "sourceBodiesCount" in b else b["loadedHTTPSourceCount"]
 need(actual==52 and len(b["httpBodies"])==52, "browser source count "+path.name)
 for route,digest in b["httpBodies"].items():
  source_path=source/("web/index.html" if route=="/" else route.lstrip("/"))
  need(sha(source_path)==digest,"browser HTTP SHA drift "+path.name+" "+route)
 for name,digest in b["screenshots"].items():
  need(sha(QA/name)==digest,"browser screenshot SHA drift "+name)
 need(b["userServer4173Interaction"]=="NONE_BY_DESIGN_NOT_PROBED",
      "user server isolation string drift")
 need(not b.get("oemPixelValidation",False) and
      not b.get("oemPixelComparison",False) and
      not b.get("historicalLCDReplay",False),
      "invalid OEM pixel acceptance claim")
 return {"receiptSHA256":sha(path),"cases":expected,
   "httpSourceBodiesSHA256Count":actual,"screenshotSHA256":b["screenshots"],
   "qaPortClosed":True,"oemPixelComparison":False}

def main():
 need(not REPORT.exists() and not FINAL.exists(),"final receipt/report already exists")
 need(sha(FINAL_PARENT)==P27_FINAL_SHA and sha(POST_PARENT)==P27_POST_SHA,
      "P27 parent receipts changed")
 parent=j(FINAL_PARENT);dry=j(DRYRUN);applied=j(APPLY)
 need(applied["status"]=="P28_TEST_ONLY_CANONICAL_APPLIED" and
      applied["newTestRelPath"]==NEW and
      applied["modifiedRuntimePaths"]==[] and not applied["oldFileBackupRequired"],
      "not an exact test-only guarded transaction")
 need(sha(DRYRUN)==applied["dryrunSHA256"],"dryrun SHA changed")
 need(sha(ROOT/NEW)==sha(STAGE/NEW)==applied["newTestCanonicalSHA256"],
      "added P28 test SHA drift")
 runtime=parent["canonicalRuntime54SHA256"]
 need(len(runtime)==54,"P27 runtime54 count")
 for name,expected in runtime.items():
  need(sha(ROOT/name)==sha(STAGE/name)==expected,
       "P27 runtime unchanged source SHA drift "+name)
 oem=parent["originalOEMReferenceOnly8SHA256"]
 for name,expected in oem.items():
  need(sha(ROOT/"sources/FCV588_GiaoDienThucTeMay2016"/name)==expected,
       "OEM8 original photo changed "+name)
 manual=ROOT/"sources/manuals/FCV-588/FURUNO_FCV628_FCV588_Operators_Manual_OME23890E_2025.pdf"
 need(sha(manual)==parent["manualSHA256"],"manual SHA changed")
 logs={}
 for filename,count in [
  ("P28_STAGE_FOCUSED_V2_20261117.txt",4),
  ("P28_STAGE_FULL_NODE_V1_20261117.txt",617),
  ("P28_STAGE_PYTHON_V1_20261117.txt",13),
  ("P28_CANONICAL_FOCUSED_20261117.txt",4),
  ("P28_CANONICAL_FULL_NODE_20261117.txt",617),
  ("P28_CANONICAL_PYTHON_20261117.txt",13),
 ]:
  logs[filename]=testlog(QA/filename,count,python="PYTHON" in filename)
 browser={}
 for key,filename,count,source in [
  ("stageD15","P28_STAGE_BROWSER_MODE_MATRIX_V2_20261117.json",7,STAGE),
  ("stageLiveLCD","P28_STAGE_LIVE_LCD_MODES_V3_20261117.json",3,STAGE),
  ("canonicalD15","P28_CANONICAL_BROWSER_MODE_MATRIX_V1_20261117.json",7,ROOT),
  ("canonicalLiveLCD","P28_CANONICAL_LIVE_LCD_MODES_V1_20261117.json",3,ROOT),
 ]:
  browser[key]=chrome(QA/filename,count,source)
 fixture=QA/"P28_SYNTHETIC_FIXTURE_PROVENANCE_20261117.json"
 source=j(fixture)
 need(source["fullSyntheticSessionsOnly"] and
      source["historicalAuthentication"] is False and
      source["originalHardwarePixels"] is False and
      len(source["entries"])==6,"P28 synthetic fixture provenance drift")
 for ent in source["entries"]:
  need(sha(QA/ent["envelopeFile"])==ent["envelopeSHA256"] and
       sha(QA/ent["sidecarFile"])==ent["sidecarSHA256"],
       "synthetic QA fixture SHA mismatch: "+ent["name"])
 report="""# P28 — Mode replay and illustrative LCD visual QA (bounded)

Ngày: 2026-11-17. Canonical: C:\\Work\\MoPhongMayTrenTau.

## Nguồn oracle và phạm vi

- Đọc trực tiếp manual nguồn OME-23890-E PDF trang 10 (§1.4.1: LF50/HF200, chế độ đơn), 11 (§1.4.2: DUAL LF trái/HF phải), 12 (§1.4.3: Bottom Zoom trái + hình thường phải, đáy ở phần dưới).
- Manual không định lượng OEM pixel fraction .75. P23 .75 là classroom projection; P04 .5 chỉ là hợp đồng archive legacy.
- D15 timeline của LF/HF/DUAL chỉ chiếu trạng thái sự kiện và hash; cố ý không tạo hình LCD lịch sử cho chế độ thường. LF/HF-ZOOM được xem BZ synthetic khi active/POWER ON.
- 6 full synthetic QA envelope + sidecar, không mint prefix lịch sử, không sao chép OEM ảnh/PDF vào runtime.

## Kết quả QA

- Staging focused P28 4/4; full Node 617/617; Python 13/13.
- Staging Chrome D15 7/7, 52 source-body SHA; Chrome LCD live 3/3 LF/DUAL/HF, thêm 52 source-body SHA. Synthetic, không pixel OEM.
- Canonical focused P28 4/4; full Node 617/617; Python 13/13.
- Canonical Chrome D15 7/7, 52 source-body SHA; Chrome LCD live 3/3, 52 source-body SHA; QA ports đã đóng.
- Chỉ một test file mới được guarded applied; 0 runtime edit; P27 runtime54/54 và OEM 8/8 SHA không đổi.
- RED/FAILED harness V1 (disclaimer mismatch) và LCD V1/V2 (hidden UI/CSP) giữ nguyên, không nâng thành PASS.

## Giới hạn / HOLD

- Đây là kiểm chứng hành vi synthetic, layout định tính và replay deterministic, không phải chứng nhận OEM visual/pixel fidelity.
- Chưa có oracle exact OEM bezel, RGB/font/line/ticks/seabed, calibration BZ pixel .75, hoặc ảnh BZ thực (2 ảnh zoom.jpg/zoom2.jpg tham chiếu là BL).
- Full replay validation bảo đảm drift theo hash nội bộ, không xác thực nguồn gốc archive ngoài hệ thống.
- F1 PUBLIC_REFERENCE v2; Phase6 OPEN; 65/65 claims HOLD; firmware UNKNOWN; hardwareValidated=false; releaseApproval=HOLD.
- Server người dùng 127.0.0.1:4173 PID1204 được giữ nguyên; QA không gửi HTTP tới server này.

## P29 đề xuất

P29 ưu tiên xác minh tương tác native/hardware còn NOT_RUN bằng môi trường QA Windows tách biệt có phép,
hoặc đối chứng OEM bezel/font/RGB từ nguồn hợp pháp nếu có oracle. Không triển khai tự động và không nâng release.
"""
 with REPORT.open("x",encoding="utf8",newline="\n") as f:f.write(report)
 result={
  "schema":"FCV588_P28_MODE_VISUAL_FINAL_INTEGRITY_V1",
  "createdUTC":datetime.datetime.now(datetime.timezone.utc).isoformat(),
  "status":"P28_TEST_ONLY_CANONICAL_AND_SOURCE_BOUND_MODE_QA_PASS",
  "parentP27FinalSHA256":P27_FINAL_SHA,
  "parentP27IndependentPostSHA256":P27_POST_SHA,
  "preapplyDryrunSHA256":sha(DRYRUN),
  "guardedTestOnlyApplySHA256":sha(APPLY),
  "addedOneTestCanonicalSHA256":applied["newTestCanonicalSHA256"],
  "addedTestRelPath":NEW,"modifiedRuntimePaths":[],
  "P27Runtime54UnchangedSHA256":runtime,
  "OEMReferenceOnly8SHA256":oem,"manualSHA256":sha(manual),
  "stageCanonicalTestEvidenceSHA256":logs,
  "stageCanonicalChromeEvidence":browser,
  "fixtureProvenanceSHA256":sha(fixture),
  "fixtureCount":len(source["entries"]),
  "finalReportSHA256":sha(REPORT),
  "syntheticOnly":True,"OEMPixelOrHardwareValidated":False,
  "historicalLCDPixelsReconstructed":False,
  "fingerprintAuthenticated":False,
  "firmware":"UNKNOWN","hardwareValidated":False,
  "phase6":"OPEN","claims":"65/65 HOLD","releaseApproval":"HOLD",
  "independentReview":"worker37 qualitative source screenshot GO_BOUNDED and worker38 test-only source GO_BOUNDED",
  "userServer":"127.0.0.1:4173 PID1204 protected, no QA HTTP requests",
 }
 with FINAL.open("x",encoding="utf8",newline="\n") as f:
  json.dump(result,f,ensure_ascii=False,sort_keys=True,indent=2)
  f.write("\n")
 print(json.dumps({"status":result["status"],"finalSHA256":sha(FINAL),
  "reportSHA256":sha(REPORT),"runtime":len(runtime),"browserCases":20}))

if __name__=="__main__":
 try:main()
 except Exception as e:
  print(str(e),file=sys.stderr)
  raise
