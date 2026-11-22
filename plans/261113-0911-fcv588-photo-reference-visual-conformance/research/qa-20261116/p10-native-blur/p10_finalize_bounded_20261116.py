"""Write-once P10 limited QA seal, retaining failed native-focus attempts."""
import datetime
import hashlib
import json
from pathlib import Path
import socket
import urllib.request

ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=Path("plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116")
DEST=Path("docs/qa/FCV588_P10_A11Y_BOUNDARIES_20261116")
FILES={
  "parentP09":("docs/qa/FCV588_P09_ROI_BOUNDARY_20261116/FCV588_P09_ROI_BOUNDARY_FINAL_INTEGRITY_20261116.json","759f146c349c2ad348fc5b98e21fbc79d1d857623253811f0a01d3b9408995b9"),
  "parentP09Post":("docs/qa/FCV588_P09_ROI_BOUNDARY_20261116/FCV588_P09_ROI_BOUNDARY_INDEPENDENT_POSTRECEIPT_20261116.json","cc3888a17c34271ba9163b86cfe4427442a1e6b5a847e4ac714661565657a26e"),
  "narratorFeasibility":(str(QA/"p10-narrator-feasibility/P10_NARRATOR_FEASIBILITY_20261116.json"),"6313be94b65c4c3d658ce92b566592511acf69707205d445f7c68c82b86e3544"),
  "nativeBlurFirstFailure":(str(QA/"p10-native-blur/P10_GENUINE_WINDOWS_POWER_BLUR_RECEIPT_20261116.json"),"61252852a5ec83870264f48a64d41b01c56e07b111f2cbfdfa8f32e11c14c114"),
  "nativeBlurSecondFailure":(str(QA/"p10-native-blur/P10_GENUINE_WINDOWS_POWER_BLUR_V2_RECEIPT_20261116.json"),"ce6963391c930130a817eeffe8f6f83c33ccc429020c4825ae0963f0d5826687"),
  "emulatedForcedColors":(str(QA/"p10-forced-colors/P10_CHROME_EMULATED_FORCED_COLORS_20261116.json"),"410ef2b20c936b5e292cd2d15c69ad322badb05904044e7cb96796ab2a08e97d"),
  "emulatedPNG":(str(QA/"p10-forced-colors/P10_CHROME_EMULATED_FORCED_COLORS_1366x768_20261116.png"),"a1e86d366f71c82f84f07b3c7de2de51fde5eb54570ee4adcc25efa83282a991"),
  "targetedNode17":(str(QA/"p10-native-blur/p10-targeted-input-regression-20261116.txt"),"b560330ec543e94c31f3a5ac58de7802eab87c4bd9d019e34369e5f3d7f3e249"),
}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(n):return json.loads((ROOT/FILES[n][0]).read_text(encoding="utf-8-sig"))
def present(port):
    with socket.socket() as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1",port))==0

def verify(review_path=None):
    evidence={}
    for n,(p,expected) in FILES.items():
        assert sha(ROOT/p)==expected,("evidenceSHA",n)
        evidence[n]={"path":p.replace("\\","/"),"sha256":expected}
    n=load("narratorFeasibility")
    e=load("emulatedForcedColors")
    for k in ["nativeBlurFirstFailure","nativeBlurSecondFailure"]:
        x=load(k)
        assert x["status"]=="FAILED_OR_BLOCKED"
        assert x["cleanup"]["qaPortClosed"] and x["cleanup"]["userPort4173Open"]
    assert e["status"]=="PASS_EMULATED_FORCED_COLORS_BOUNDED_DOM_CHECKS"
    assert e["nativeNarratorSpeech"]=="NOT_RUN" and e["realWindowsForcedColors"]=="NOT_RUN"
    assert e["realOSWindowBlur"]=="NOT_VERIFIED"
    assert e["screenshot"]["sha256"]==FILES["emulatedPNG"][1]
    assert e["cleanup"]["testPortClosed"] and e["runtime39Unchanged"]
    assert n["decision"]=="BLOCKED_RELIABLE_AUTOMATIC_NARRATOR_TRANSCRIPT_WITHOUT_INTERACTIVE_AUDIO_SESSION"
    s=(ROOT/FILES["targetedNode17"][0]).read_text(encoding="utf-8")
    assert "# tests 17" in s and "# pass 17" in s and "# fail 0" in s
    p07=json.loads((ROOT/"docs/qa/FCV588_P07_BOUNDED_20261116/FCV588_P07_BOUNDED_FINAL_INTEGRITY_20261116.json").read_text(encoding="utf-8"))
    assert len(p07["canonicalRuntimeSHA256"])==39
    for p,digest in p07["canonicalRuntimeSHA256"].items():
        assert sha(ROOT/p)==digest,p
    assert len(p07["referenceOnlyOriginalPhotos"])==8
    for filename,item in p07["referenceOnlyOriginalPhotos"].items():
        assert sha(ROOT/"sources/FCV588_GiaoDienThucTeMay2016"/filename)==item["sha256"],filename
    with urllib.request.urlopen("http://127.0.0.1:4173/",timeout=4) as resp:
        assert resp.status==200
    assert not present(4208) and not present(4207)
    if review_path:
        assert review_path.is_file()
        review=json.loads(review_path.read_text(encoding="utf-8-sig"))
        evidence["independentEvidenceReview"]={"path":str(review_path.relative_to(ROOT)).replace("\\","/"),"sha256":sha(review_path)}
        # Own verification remains decisive, not reviewer status labels.
        assert review and isinstance(review,dict)
    return evidence

def write(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    with path.open("x",encoding="utf-8",newline="\n") as f:
        json.dump(obj,f,ensure_ascii=False,sort_keys=True,indent=2)
        f.write("\n")

def main():
    folder=ROOT/QA/"p10-review"
    files=sorted(folder.glob("P10*.json")) if folder.exists() else []
    assert len(files)==1,("independent P10 review not ready or ambiguous",files)
    review_path=files[0]
    evidence=verify(review_path)
    final={
      "schema":"fcv588-p10-bounded-a11y-boundaries-final-integrity-v1",
      "createdAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),
      "status":"P10_TARGETED_SOFTWARE_AND_EMULATED_FORCED_COLORS_PASS_NATIVE_SPEECH_AND_OS_BLUR_BLOCKED",
      "canonicalRoot":str(ROOT),
      "scope":"F1_PUBLIC_REFERENCE_V2_OFFLINE_WINDOWS_QA_ONLY_NO_PRODUCT_EDIT",
      "evidence":evidence,
      "checks":{"targetedInputUnitTests":"17/17 PASS",
                "chromeForcedColors":"EMULATION_ONLY_BOUNDED_PASS_ONE_VIEWPORT",
                "simulatorScreenshot":"1 PNG SHA MATCH",
                "nativeNarratorSpeech":"BLOCKED_NOT_RUN",
                "NVDA":"BLOCKED_NOT_INSTALLED",
                "realOSPowerHoldBlur":"NOT_VERIFIED_TWO_FAILURES_PRESERVED",
                "realWindowsHighContrast":"NOT_RUN",
                "runtime":"39/39 SHA MATCH","sourceReferencePhotos":"8/8 SHA MATCH",
                "server4173":"HTTP200_UNTOUCHED","testPorts4207_4208":"CLOSED"},
      "failureInterpretation":{
        "initialTrial":"Chrome document reported focused but real Win32 foreground did not switch away successfully; not a valid native blur acceptance.",
        "secondTrial":"Win32 foreground remained Helium; test browser never owned Win32 foreground as required; harness/environment blocker, not source-valid app bug.",
        "doNotUpgrade":"Javascript event dispatch, DOM focus, and Chrome forced-colors emulation do not establish actual Narrator speech, OS blur or Windows High Contrast."},
      "operations":{"sourceRuntimeEdited":False,"userServerRestarted":False,"photoOriginalEdited":False,
                    "windowsAccessibilitySettingChanged":False,"nativeScreenReaderLaunched":False,
                    "historicalFailureReceiptOverwritten":False,"testServerOwnedAndCleaned":True},
      "holds":{"fullP07":"OPEN","F1Phase6":"OPEN","featureClaims":"65/65 HOLD","hardwareValidated":False,
               "installedFirmware":"UNKNOWN","rights":"HOLD","releaseApproval":"HOLD"}
    }
    f=ROOT/DEST/"FCV588_P10_A11Y_BOUNDARIES_FINAL_INTEGRITY_20261116.json"
    write(f,final)
    h=sha(f)
    assert json.loads(f.read_text(encoding="utf-8"))==final
    assert verify(review_path)==evidence
    post={"schema":"fcv588-p10-bounded-a11y-independent-postreceipt-v1",
          "status":"PASS_EVIDENCE_READBACK_NATIVE_QA_HOLD",
          "createdAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),
          "finalPath":str(f.relative_to(ROOT)).replace("\\","/"),
          "finalSHA256":h,
          "freshReadback":{"boundEvidence":len(evidence),"runtime":"39/39","referencePhotos":"8/8",
                           "server4173":"HTTP200","ports4207_4208":"CLOSED"},
          "note":"Independent worker reviewed evidence; local postreceipt is a separate SHA readback, not a spoken-output or real OS focus certificate."}
    postpath=ROOT/DEST/"FCV588_P10_A11Y_BOUNDARIES_INDEPENDENT_POSTRECEIPT_20261116.json"
    write(postpath,post)
    assert json.loads(postpath.read_text(encoding="utf-8"))==post
    print(json.dumps({"status":final["status"],"finalSHA256":h,"postSHA256":sha(postpath),
                     "finalPath":str(f),"postPath":str(postpath)}))
if __name__=="__main__":main()
