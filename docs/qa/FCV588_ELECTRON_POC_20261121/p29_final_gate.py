"""P29 Windows portable POC final source/ZIP/replay check. Write-once receipts."""
import datetime
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
STAGE=ROOT/"staging/fcv588-electron-poc-20261121"
QA=ROOT/"docs/qa/FCV588_ELECTRON_POC_20261121"
P28=ROOT/"docs/qa/FCV588_P28_MODE_VISUAL_20261117"
FINAL=QA/"FCV588_P29_ELECTRON_POC_FINAL_INTEGRITY_20261121.json"
REPORT=QA/"FCV588_P29_ELECTRON_POC_FINAL_REPORT_20261121.md"
EXE=STAGE/"dist/FCV588-Synthetic-POC-win32-x64/FCV588-Synthetic-POC.exe"
ASAR=STAGE/"dist/FCV588-Synthetic-POC-win32-x64/resources/app.asar"
ZIP=QA/"P29_FCV588_ELECTRON_PORTABLE_WIN_X64_20261121.zip"
P28_FINAL="313c323db96f706de07bd28cf3832d19cdcdb0ce7dc41baad0d726e09a27ca95"
P28_POST="bb533ff8a36084c579fa33a24a18b914ae61930cf14d0634dc46e10523c24bed"

def sha(path):
 h=hashlib.sha256()
 with Path(path).open("rb") as f:
  for b in iter(lambda:f.read(1024*1024),b""):
   h.update(b)
 return h.hexdigest()
def j(path):return json.loads(Path(path).read_text(encoding="utf8"))
def need(ok,message):
 if not ok:raise AssertionError("P29 FINAL NO_GO "+message)
def check_test(path,passed):
 raw=path.read_text(encoding="utf8")
 for key,n in [("tests",passed),("pass",passed),("fail",0)]:
  need(bool(re.search(fr"(?m)^# {key} {n}\s*$",raw)),path.name+" "+key)
 return sha(path)

def main():
 need(not FINAL.exists() and not REPORT.exists(),"final files already exist")
 need(sha(P28/"FCV588_P28_MODE_VISUAL_FINAL_INTEGRITY_20261117.json")==P28_FINAL,
      "P28 final changed")
 need(sha(P28/"FCV588_P28_MODE_VISUAL_INDEPENDENT_SHA_POSTRECEIPT_20261117.json")==P28_POST,
      "P28 independent SHA changed")
 parent=j(P28/"FCV588_P28_MODE_VISUAL_FINAL_INTEGRITY_20261117.json")
 need(len(parent["P27Runtime54UnchangedSHA256"])==54,"parent runtime54")
 for rel,expected in parent["P27Runtime54UnchangedSHA256"].items():
  need(sha(ROOT/rel)==expected,"canonical P28 runtime SHA drift "+rel)
 for name,expected in parent["OEMReferenceOnly8SHA256"].items():
  need(sha(ROOT/"sources/FCV588_GiaoDienThucTeMay2016"/name)==expected,
       "OEM reference SHA drift "+name)
 need(sha(ROOT/"sources/manuals/FCV-588/FURUNO_FCV628_FCV588_Operators_Manual_OME23890E_2025.pdf")
      ==parent["manualSHA256"],"manual SHA drift")
 audit_path=QA/"P29_ASAR_SOURCE_AUDIT_V3_20261121.json"
 audit=j(audit_path)
 need(audit["status"]=="P29_BOUNDED_PACKAGED_SOURCE_PASS_NOT_RELEASE","ASAR audit status")
 need(audit["asarPackagedFiles"]==58 and audit["approvedWebSrcFiles"]==56 and
      audit["forbiddenOEMReferenceFiles"]==0 and
      audit["foreignNodePackagesOrTests"]==0 and
      audit["runtime54CanonicalUnchanged"]==54 and
      audit["runtime53InheritedStageExact"]==53,"ASAR file/source count")
 need(sha(EXE)==audit["packagedExeSHA256"] and sha(ASAR)==audit["asarSHA256"],
      "packaged exe/asar byte drift")
 e2e_path=QA/"P29_PACKAGED_E2E_V5_20261121.json"
 e2e=j(e2e_path)
 need(e2e["status"]=="PASS" and len(e2e["cases"])==25 and not e2e["errors"],
      "Windows packaged E2E not PASS25")
 need(e2e["exeSHA256"]==sha(EXE) and
      e2e["launchOrigin"]=="app://fcv588/" and
      e2e["externalBrowserUsed"] is False and
      e2e["userServer4173HTTPRequests"]==0 and
      e2e["airgappedVMInstallValidated"] is False,"offline/origin scope mismatch")
 need(all(x.startswith("app://fcv588/") for x in e2e["reloadedTransportURLs"])
      and len(e2e["reloadedTransportURLs"])>=50,"non-app network asset")
 need(e2e["settingsExportSHA256"]==
      sha(QA/"P29_SETTINGS_EXPORTED_V5_20261121.json"),"import/export bytes")
 for name,digest in e2e["screenshots"].items():
  need(sha(QA/name)==digest,"QA screenshot changed "+name)
 logs={
  "P29_SETTINGS_UNIT_FINAL_20261121.txt":check_test(
    QA/"P29_SETTINGS_UNIT_FINAL_20261121.txt",2),
  "P29_STAGE_P28_FOCUSED_20261121.txt":check_test(
    QA/"P29_STAGE_P28_FOCUSED_20261121.txt",4),
 }
 need(sha(STAGE/"test/fcv588-p28-mode-replay-matrix.test.mjs")==
      parent["addedOneTestCanonicalSHA256"],"P28 copied focused test SHA")
 zip_entries=[]
 with zipfile.ZipFile(ZIP,"r") as archive:
  need(archive.testzip() is None,"ZIP CRC corruption")
  zip_entries=archive.namelist()
  need(len(zip_entries)>=60,"portable Electron ZIP unexpectedly small")
  need(any(n.endswith("/FCV588-Synthetic-POC.exe") for n in zip_entries),
       "portable executable missing")
  need(any(n.endswith("/resources/app.asar") for n in zip_entries),
       "ASAR missing")
  need(not any(re.search(r"(?i)(sources/manuals|docs/qa|\.jpe?g$|\.pdf$|node_modules/)",n)
       for n in zip_entries),"forbidden asset in portable ZIP")
  need(all(name.startswith("FCV588-Synthetic-POC-win32-x64/")
       for name in zip_entries),"ZIP contains foreign roots")
 failed_logs={}
 for name in [
  "P29_NPM_INSTALL_ATTEMPT1_20261121.txt",
  "P29_NPM_INSTALL_ATTEMPT2_20261121.txt",
  "P29_PACKAGED_E2E_V1_20261121.json",
  "P29_PACKAGED_E2E_V2_20261121.json",
  "P29_PACKAGED_E2E_V3_20261121.json",
  "P29_PACKAGED_E2E_V4_20261121.json",
  "P29_ASAR_AUDIT_EXEC_V1_20261121.txt",
  "P29_ASAR_AUDIT_EXEC_V2_20261121.txt",
 ]:
  failed_logs[name]=sha(QA/name)
 readme=QA/"README_P29_ELECTRON_POC_20261121.md"
 helper=QA/"P29_LEGACY_BROWSER_SETTINGS_EXPORT_20261121.js"
 report="""# P29 — Electron Windows POC (STAGING BOUNDED PASS, NOT RELEASE)

Ngày: 2026-11-21. Canonical C:\\Work\\MoPhongMayTrenTau không bị thay đổi.

## Kết quả thực hiện

- Đóng gói Electron 45.4.1 Windows x64 thành thư mục portable có file FCV588-Synthetic-POC.exe và app.asar; ZIP portable được thử CRC.
- app://fcv588/ với custom standard secure origin, CSP chỉ self; no nodeIntegration/preload/IPC; sandbox + contextIsolation; deny network/navigation/permission; server người dùng 4173 không tham gia POC.
- App được khởi chạy bằng **exe sau đóng gói** trong QA profile riêng với proxy chết. Playwright Electron V5 PASS 25 trường hợp: module/resources local, chặn network, Canvas LF/DUAL/HF khác nhau, replay profile22 DUAL, nhập/xuất JSON có kiểm fingerprint và nội dung byte, cấu hình tồn tại sau đóng/mở lại, không thay đổi LCD khi nhập archive.
- Source/binary audit: app.asar 58/58 file đúng allowlist (56 web/src, main.cjs và package.json); không có Node development modules, file test, OEM JPEG hoặc PDF manual trong gói.
- Staged P28 replay focused 4/4 PASS và transfer unit tests 2/2 PASS; P28 canonical runtime54/54, OEM8/8 và manual SHA bất biến.
- Log FAILED đầu tiên được lưu nguyên để truy vết; không thay thế bằng nhãn PASS.

## Giới hạn chặn release

- **Chưa thử khởi chạy trên một Windows VM sạch thật sự ngắt mạng**; QA chỉ chặn URL và dùng proxy không hoạt động, không được coi tương đương air-gap.
- Chưa làm MSI/NSIS installer, chưa thử SmartScreen/EDR/Win10 LTSC/ARM64 hoặc quản trị nâng cấp. Portable ZIP bắt buộc giải nén nguyên thư mục.
- Chưa ký mã, chưa harden Electron fuses (RunAsNode/NODE_OPTIONS/inspect, ASAR integrity), chưa kiểm lời thoại Narrator/NVDA, âm thanh nghe thực và Win32 focus blur. Không cấp quyền truy cập thiết bị thật.
- Chuyển cấu hình từ Chrome/Edge cũ đòi hỏi người dùng chủ động chạy snippet trong trang trình duyệt cũ; chỉ fixture nhập và cấu hình tồn tại trên POC đã test. Không tự đọc browser profile.
- POC không chứng nhận pixel/OEM, firmware/hardware; Phase6 OPEN, 65/65 claims HOLD, releaseApproval HOLD.

## Bước tiếp theo

P30: chạy Portable ZIP trong máy Windows sạch offline hoàn toàn; bảo đảm first-launch không cần Node/browser, audit giao diện/âm thanh/input/đọc file, lưu dữ liệu sau nâng cấp, kiểm thử Win32 focus và UIA; harden Electron fuses + code-sign + installer riêng trước khi xem xét phát hành.
"""
 with REPORT.open("x",encoding="utf8",newline="\n") as f:f.write(report)
 result={
  "schema":"FCV588_P29_ELECTRON_POC_FINAL_V1",
  "createdUTC":datetime.datetime.now(datetime.timezone.utc).isoformat(),
  "status":"P29_STAGING_PORTABLE_POC_BOUNDED_PASS_NOT_RELEASE",
  "parentP28FinalSHA256":P28_FINAL,
  "parentP28IndependentPostSHA256":P28_POST,
  "canonicalRuntime54UnchangedCount":54,
  "originalOEMReference8UnchangedCount":8,
  "portableWindowsPlatform":"win32-x64",
  "electronVersion":"45.4.1",
  "packagedExeRelativePath":str(EXE.relative_to(ROOT)),
  "packagedExeSHA256":sha(EXE),
  "packagedAsarSHA256":sha(ASAR),
  "portableZIPPath":str(ZIP),
  "portableZIPBytes":ZIP.stat().st_size,
  "portableZIPSHA256":sha(ZIP),
  "zipEntryCount":len(zip_entries),
  "ASARSourceAuditSHA256":sha(audit_path),
  "ASARFileCount":58,
  "packagedE2EReceiptSHA256":sha(e2e_path),
  "packagedE2EPassCount":25,
  "packagedE2ELocalResourceCount":len(e2e["reloadedTransportURLs"]),
  "savedSettingsTransferSHA256":e2e["settingsExportSHA256"],
  "stagedRegressionTestsSHA256":logs,
  "readmeSHA256":sha(readme),
  "legacyBrowserSettingsExportHelperSHA256":sha(helper),
  "failedAttemptsPreservedSHA256":failed_logs,
  "finalReportSHA256":sha(REPORT),
  "networkLocalOnlyVerified":True,
  "airgappedFirstInstallValidated":False,
  "installerBuilt":False,
  "unsigned":True,
  "electronFusesHardened":False,
  "syntheticTrainingOnly":True,
  "hardwareValidated":False,
  "firmware":"UNKNOWN",
  "phase6":"OPEN",
  "claims":"65/65 HOLD",
  "releaseApproval":"HOLD",
  "userServer4173Interaction":"NONE_BY_DESIGN_AND_TEST_SCOPE",
 }
 with FINAL.open("x",encoding="utf8",newline="\n") as f:
  json.dump(result,f,ensure_ascii=False,sort_keys=True,indent=2)
  f.write("\n")
 print(json.dumps({
  "status":result["status"],
  "portableZIPBytes":result["portableZIPBytes"],
  "portableZIPSHA256":result["portableZIPSHA256"],
  "appExeSHA256":result["packagedExeSHA256"],
  "ASARFiles":result["ASARFileCount"],
  "E2ECases":result["packagedE2EPassCount"],
  "finalIntegritySHA256":sha(FINAL),
  "finalReportSHA256":sha(REPORT),
 },ensure_ascii=False))

if __name__=="__main__":
 main()
