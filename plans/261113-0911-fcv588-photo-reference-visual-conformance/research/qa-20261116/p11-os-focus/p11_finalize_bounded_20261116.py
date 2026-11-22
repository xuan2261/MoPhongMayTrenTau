"""P11 write-once seal: foreground identity verified, genuine Chrome blur NOT verified.

Evidence integrity PASS does not imply native accessibility or product acceptance.
"""
import datetime
import hashlib
import json
from pathlib import Path
import socket
import urllib.request

import psutil

ROOT = Path(r"C:\Work\MoPhongMayTrenTau")
QA = Path("plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116")
DEST = Path("docs/qa/FCV588_P11_NATIVE_FOCUS_BOUNDARIES_20261116")
FILES = {
    "parentP10Final": (
        "docs/qa/FCV588_P10_A11Y_BOUNDARIES_20261116/FCV588_P10_A11Y_BOUNDARIES_FINAL_INTEGRITY_20261116.json",
        "414c0151053bec55271032170e0fba2139fd1627e5fee7524cdf6c1bcf490655"),
    "parentP10Post": (
        "docs/qa/FCV588_P10_A11Y_BOUNDARIES_20261116/FCV588_P10_A11Y_BOUNDARIES_INDEPENDENT_POSTRECEIPT_20261116.json",
        "df2cb60996da7f3f557642f329d794198aea9a85ac8fe5084429bee1931c12dc"),
    "independentMethod": (
        str(QA/"p11-method/P11_WIN32_FOREGROUND_BLUR_METHOD_20261116.json"),
        "b9d3586df5bbb1459ee68a478ce70652cd1a99e618edb5bc14c73161f4ef73b9"),
    "independentBaseline": (
        str(QA/"p11-baseline/P11_INDEPENDENT_BASELINE_20261116.json"),
        "2474185023238fa8f707896f75783a0c11d2e8b1f92f0e36761f59f98e0a00d6"),
    "nativeV1Failure": (
        str(QA/"p11-os-focus/P11_GENUINE_WIN32_FOREGROUND_POWER_20261116.json"),
        "278ce6ea6ee9cbb08019b06d7c298a7e274502ec92a57934feada2acbf676f68"),
    "nativeV2Failure": (
        str(QA/"p11-os-focus/P11_GENUINE_WIN32_FOREGROUND_POWER_V2_20261116.json"),
        "6da4ac654775d18f4baff20a76c4dd6bedfee8ed67924c1d3c0a6d08e7f59c2c"),
    "nativeV3Failure": (
        str(QA/"p11-os-focus/P11_GENUINE_WIN32_FOREGROUND_POWER_V3_20261116.json"),
        "11e6cebec18c12ff63b34eee1644d30a6bdbeebe53034b2b0204d2073e0f2669"),
    "nativeV4Failure": (
        str(QA/"p11-os-focus/P11_GENUINE_WIN32_FOREGROUND_POWER_V4_20261116.json"),
        "908948ccc7dc5d48b5c4025dfc79571cb3e238ac49ddf09a120febcbde3832d2"),
}

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def load(name):
    return json.loads((ROOT/FILES[name][0]).read_text(encoding="utf-8-sig"))

def is_listening(port):
    with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1",port))==0

def gate(review):
    evidence={}
    for name,(p,expected) in FILES.items():
        actual=sha(ROOT/p)
        assert actual==expected,("SHA drift",name,actual)
        evidence[name]={"path":p.replace("\\","/"),"sha256":actual}
    assert review.is_file(),"independent review required before seal"
    evidence["independentP11Review"]={
        "path":str(review.relative_to(ROOT)).replace("\\","/"),
        "sha256":sha(review)}
    assert json.loads(review.read_text(encoding="utf-8-sig"))
    method=load("independentMethod")
    assert method and isinstance(method,dict)
    trials=[load(f"nativeV{i}Failure") for i in range(1,5)]
    assert all(t["status"]=="FAILED_OR_BLOCKED_NO_NATIVE_ACCEPTANCE" for t in trials)
    for t in trials:
        assert t["cleanup"]["ownedPortClosed"] and t["cleanup"]["userPort4173Alive"]
        assert t["runtime39Unchanged"] and t["parentP10Unchanged"]
    first,second,third,fourth=trials
    assert first["failureStage"]=="verify Chrome top-level HWND foreground"
    assert second["failureStage"]=="true Win32 foreground transfer to test-owned witness"
    for trial in (third,fourth):
        assert trial["activation"]["activated"]
        before=trial["activation"]["beforeKeyDownForeground"]
        assert before["hwnd"]==trial["activation"]["ChromeOwnedHwnd"]
        assert before["processName"].lower()=="chrome.exe"
        assert before["executablePath"].lower()==r"c:\program files\google\chrome\application\chrome.exe"
        witness=trial["witnessHwnd"]
        after=trial["afterNativeForegroundTransfer"]
        assert witness["hwnd"]==after["hwnd"]
        assert witness["pid"]==after["pid"]
        held=trial["powerHeld"]
        assert held["powerPressing"] and held["eventCount"]==trial["beforePowerDown"]["eventCount"]+1
        actual=trial["afterNativeBlur"]
        assert actual["hasFocus"] and actual["powerPressing"]
        assert not [e for e in actual["osEvents"] if e["type"]=="blur" and e["isTrusted"]]
        assert trial["failureStage"]=="true Win32 foreground transfer to test-owned witness"
        assert trial["failure"]=="RuntimeError('Document still focused despite valid native foreground transfer')"
    assert fourth["browserDriver"]=="STANDALONE_CHROME_ISOLATED_PROFILE_WITH_READ_ONLY_CDP_INSPECTION"
    assert fourth["ownedProfileCleaned"] and fourth["cleanup"]["cdpPortClosed"]
    p07=json.loads((ROOT/"docs/qa/FCV588_P07_BOUNDED_20261116/FCV588_P07_BOUNDED_FINAL_INTEGRITY_20261116.json").read_text(encoding="utf-8"))
    assert len(p07["canonicalRuntimeSHA256"])==39
    for name,expect in p07["canonicalRuntimeSHA256"].items():
        assert sha(ROOT/name)==expect,("runtime drift",name)
    assert len(p07["referenceOnlyOriginalPhotos"])==8
    for name,item in p07["referenceOnlyOriginalPhotos"].items():
        assert sha(ROOT/"sources/FCV588_GiaoDienThucTeMay2016"/name)==item["sha256"],name
    with urllib.request.urlopen("http://127.0.0.1:4173/",timeout=4) as response:
        assert response.status==200
    closed=[4207,4208,4209,4211,4212,9225]
    assert all(not is_listening(port) for port in closed)
    # Observation only: confirm the user-owned listener PID without killing it.
    listeners=[]
    for connection in psutil.net_connections(kind="tcp"):
        if connection.status==psutil.CONN_LISTEN and connection.laddr and connection.laddr.port==4173:
            listeners.append({"pid":connection.pid,"address":connection.laddr.ip,"port":4173})
    assert len(listeners)==1 and listeners[0]["address"]=="127.0.0.1"
    return evidence,listeners[0]

def write_once(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    with path.open("x",encoding="utf-8",newline="\n") as f:
        json.dump(obj,f,ensure_ascii=False,sort_keys=True,indent=2)
        f.write("\n")

def main():
    directory=ROOT/QA/"p11-review"
    files=sorted(directory.glob("P11*.json")) if directory.is_dir() else []
    assert len(files)==1,("independent P11 reviewer receipt not yet ready or ambiguous",files)
    evidence,listener=gate(files[0])
    final={
        "schema":"fcv588-p11-native-focus-boundaries-final-integrity-v1",
        "createdAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),
        "status":"P11_WIN32_FOREGROUND_TRANSFER_PROVEN_BROWSER_BLUR_NOT_VERIFIED_RELEASE_HOLD",
        "scope":"F1_PUBLIC_REFERENCE_V2_SYNTHETIC_OFFLINE_WINDOWS_RESTRICTED_QA_NO_PRODUCT_EDIT",
        "evidence":evidence,
        "checks":{
            "win32ChromeForegroundBeforePower":"VERIFIED_ON_V3_AND_V4",
            "powerSpaceKeyDown":"VERIFIED_IN_CHROME_ON_V3_AND_V4",
            "win32SwitchToOwnedWitness":"VERIFIED_ON_V3_AND_V4",
            "windowBlurAfterWin32Switch":"NOT_OBSERVED_ON_V3_AND_V4",
            "powerHoldCancelOnWindowBlur":"NOT_VERIFIED",
            "nativeNarratorNvdaSpeech":"NOT_RUN_BLOCKED",
            "nativeHighContrast":"NOT_RUN",
            "realPhysicalHardwarePowerButton":"NOT_USED",
            "historicalP10AndP11Failures":"ALL_PRESERVED",
            "runtimeP07Manifest":"39/39",
            "originalReferencePhotos":"8/8",
            "userServer4173":"HTTP200_LOOPBACK",
            "testPorts4207_4208_4209_4211_4212_9225":"CLOSED"},
        "userOwnedServer":listener,
        "failureInterpretation":[
            "V1 Chrome HWND identified but Windows refused foreground; V2 desktop activation succeeded but witness did not foreground.",
            "V3 Playwright-controlled Chrome and V4 standalone Chrome with Win32 keyboard injection each obtained true native Chrome foreground, then native witness foreground, yet page reported hasFocus true and no trusted blur; POWER remained pressing.",
            "These results do not establish whether this is browser/remote desktop/automation focus handling or a product bug. No synthetic blur injection used to force acceptance.",
            "Application bindHoldControl has an existing blur cancellation listener and synthetic unit tests; full native acceptance requires an actual trusted browser blur event with a deterministic cancel observation."
        ],
        "limitations":{
            "noNativeBlurPass":True,
            "noHumanPhysicalKeyboardOrRealInstrument":True,
            "noSpeechCapture":True,
            "noPhotoCalibrationOrOEMPercentage":True},
        "operations":{
            "productSourceEdited":False,"originalOEMPhotoEdited":False,
            "historicalFailReceiptsOverwritten":False,"userPort4173Restarted":False,
            "ownedChromeAndServersCleaned":True,"windowsSettingsChanged":False,
            "runtimeDeploymentOrRelease":False},
        "holds":{
            "fullP07":"OPEN","F1Phase6":"OPEN","featureClaims":"65/65 HOLD",
            "hardwareValidated":False,"installedFirmware":"UNKNOWN",
            "oemRights":"HOLD","releaseApproval":"HOLD",
            "narratorSpeech":"BLOCKED_NOT_RUN","nativePowerBlur":"NOT_VERIFIED"}
    }
    final_path=ROOT/DEST/"FCV588_P11_NATIVE_FOCUS_FINAL_INTEGRITY_20261116.json"
    write_once(final_path,final)
    assert json.loads(final_path.read_text(encoding="utf-8"))==final
    fhash=sha(final_path)
    rebound,new_listener=gate(files[0])
    assert rebound==evidence and new_listener==listener
    post={
        "schema":"fcv588-p11-native-focus-independent-postreceipt-v1",
        "createdAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),
        "status":"PASS_INTEGRITY_READBACK_P11_NATIVE_BLUR_NOT_VERIFIED",
        "finalPath":str(final_path.relative_to(ROOT)).replace("\\","/"),
        "finalSHA256":fhash,
        "freshReadback":{"evidenceFiles":len(evidence),"runtime":"39/39",
                         "originalPhotos":"8/8","server4173":"HTTP200",
                         "qaPorts":"4207_4208_4209_4211_4212_9225_CLOSED"},
        "note":"Independent reviewer plus fresh local byte rehash; never a native browser blur or Narrator certification."
    }
    post_path=ROOT/DEST/"FCV588_P11_NATIVE_FOCUS_INDEPENDENT_POSTRECEIPT_20261116.json"
    write_once(post_path,post)
    assert json.loads(post_path.read_text(encoding="utf-8"))==post
    print(json.dumps({"status":final["status"],"finalSHA256":fhash,
                      "postSHA256":sha(post_path),
                      "finalPath":str(final_path),"postPath":str(post_path)}))

if __name__=="__main__":
    main()
