"""Write-once P16 read-only browser compatibility/support boundary final.
No runtime/source editing, browser rerun, OS settings or OEM material copying.
"""
from pathlib import Path
from hashlib import sha256
from PIL import Image,ImageChops
from datetime import datetime,timezone
import subprocess,json
ROOT=Path(r"C:\Work\MoPhongMayTrenTau")
QA=Path(__file__).resolve().parent
RESEARCH=QA.parent
BROWSER=QA/"P16_CHROME_EDGE_CQW_BROWSER_GATE_20261117.json"
COMPAT=RESEARCH/"p16-compat"/"P16_CQW_SOURCE_COMPATIBILITY_REVIEW_20261117.md"
NATIVE=RESEARCH/"p16-native"/"P16_NATIVE_ACCESSIBILITY_FACT_GATE_20261117.md"
P15=ROOT/"docs"/"qa"/"FCV588_P15_LCD_GEOMETRY_20261116"
OLD_FINAL=P15/"FCV588_P15_LCD_GEOMETRY_FINAL_INTEGRITY_20261116.json"
OLD_POST=P15/"FCV588_P15_LCD_GEOMETRY_INDEPENDENT_POSTRECEIPT_20261116.json"
FINAL_DIR=ROOT/"docs"/"qa"/"FCV588_P16_BROWSER_BOUNDARY_20261117"
FINAL=FINAL_DIR/"FCV588_P16_BROWSER_BOUNDARY_FINAL_INTEGRITY_20261117.json"
REPORT=ROOT/"plans"/"261013-2359-fcv588-public-reference-deep-tdd-advice-v2"/"reports"/"continuation-2026-11-17-photo-p16-chrome-edge-cqw-browser-boundary.md"
EXPECTED={OLD_FINAL:"a6aa5038292e5d1d3da20170f9bbed1804ee5262e749cb9b4e5cf53207deafed",OLD_POST:"2ed3ad94a844142bfa401fbdf1a2003597ed01ab0393f5bfb9a9a57297539cfe",BROWSER:"049ee483023fe4caf04971d3a4349d8e8d633e5544a2367c94d806cfc8505ca2",COMPAT:"d178b8375445352c8eecd1fad1f80142f289266e4ba9f9a1f3284b10e692c05f"}
def sha(data):return sha256(data).hexdigest()
def h(file):return sha(file.read_bytes())
def must(ok,message):
 if not ok:raise RuntimeError(message)
for file,expected in EXPECTED.items():must(file.is_file() and h(file)==expected,"Authoritative P15/P16 evidence drift: "+str(file))
must(NATIVE.is_file(),"P16 independent native-readiness report not yet finished")
compatText=COMPAT.read_text(encoding="utf8")
nativeText=NATIVE.read_text(encoding="utf8")
must("SOURCE_GAP" in compatText and "GO" in compatText and "Correction now: NONE" in compatText,"Review source GO/SOURCE_GAP boundaries not observed")
must(any(s in nativeText for s in ("NOT_RUN","NOT_VERIFIED","BLOCKED")),"Native report acceptance boundary not confirmed")
finalPrev=json.loads(OLD_FINAL.read_text(encoding="utf8"))
postPrev=json.loads(OLD_POST.read_text(encoding="utf8"))
must(postPrev["decision"]=="PASS","P15 independent parent not PASS")
rt=finalPrev["runtime50"]
must(len(rt)==50,"P15 runtime map missing")
for path,expected in rt.items():
 f=ROOT/path
 must(f.is_file() and h(f)==expected,"P16 canonical runtime source changed: "+path)
photos=finalPrev["originalOEMReferenceOnly8SHA256"]
must(len(photos)==8,"P16 OEM reference original list incomplete")
for name,expected in photos.items():
 f=ROOT/"sources"/"FCV588_GiaoDienThucTeMay2016"/name
 must(f.is_file() and h(f)==expected,"P16 original OEM photo SHA drift: "+name)
gate=json.loads(BROWSER.read_text(encoding="utf8"))
must(gate["schema"]=="FCV588_P16_WINDOWS_CQW_REAL_BROWSER_V1" and not gate["errors"],"P16 browser receipt errors")
must(len(gate["checks"])==82 and all(x["pass"] for x in gate["checks"]),"P16 Chrome/Edge gate not all pass")
must(gate["browserVersions"]=={"chrome":"157.0.8103.79","msedge":"157.0.4341.60"},"Browser versions not as tested")
must(len(gate["views"])==6 and len(gate["loadedBodies"])==234,"Browser source/viewport inventory")
must(gate["ownedServerExited"] is True and not gate["pageErrors"] and not gate["externalRequests"],"Network/browser cleanup not PASS")
must(len(gate["referenceOnlyRouteStatus"])==8 and all(x["status"]==404 for x in gate["referenceOnlyRouteStatus"]),"OEM reference-only route access")
for row in gate["loadedBodies"]:
 path=row["path"]
 local=ROOT/"web"/"index.html" if path=="/" else ROOT/path.lstrip("/")
 must(row["match"] and local.is_file() and h(local)==row["bodySHA256"]==row["sourceSHA256"],"Browser http body SHA out of sync with source: "+path)
shots={}
for view in gate["views"]:
 m=view["measurement"]
 must(m["cqw"] and m["containerType"] and m["containerComputed"]=="inline-size","Computed support not shown")
 must(abs(m["canvas"]["width"]/m["canvas"]["height"]-0.75)<0.00075,"P16 canvas ratio not accepted")
 shot=m.get("screenshot")
 if shot:
  file=Path(shot["path"])
  must(file.is_file() and file.parent==QA and h(file)==shot["sha256"],"PNG screenshot does not match receipt")
  shots[(view["browser"],tuple(view["viewport"]))]=file
must(len(shots)==4,"P16 screenshot count must equal four")
pairs=[]
for vp in ((375,812),(1366,768)):
 a=shots[("chrome",vp)];b=shots[("msedge",vp)]
 with Image.open(a) as x,Image.open(b) as y:
  ax=x.convert("RGBA");by=y.convert("RGBA")
  equal=ax.size==by.size and ImageChops.difference(ax,by).getbbox() is None
  must(equal,"Chrome/Edge rendered PNG pixels differ at "+str(vp))
  pairs.append({"viewport":list(vp),"rgbaPixelIdentical":True,"dimensions":list(ax.size),"chromePNG_SHA256":h(a),"edgePNG_SHA256":h(b)})
status=json.loads((ROOT/"docs"/"evidence"/"fcv588-public-implementation-status.json").read_text(encoding="utf8"))
must(status["profileClass"]=="PUBLIC_REFERENCE" and status["profileRevision"]=="F1-public-reference-22","F1 profile evidence changed")
must(status["hardwareValidated"] is False and status["firmwareInstalled"] is None and status["rightsClearance"] is False and status["releaseApproval"]=="HOLD","OEM release/HW flags drift")
ps=subprocess.run(["powershell","-NoProfile","-Command","$a=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue|Where-Object {$_.LocalPort -in 4173,4214,4215,4216,4217});$a|Select LocalAddress,LocalPort,OwningProcess|ConvertTo-Json -Compress"],capture_output=True,text=True,check=True)
sockets=json.loads(ps.stdout) if ps.stdout.strip() else []
if isinstance(sockets,dict):sockets=[sockets]
must(len(sockets)==1 and sockets[0]["LocalAddress"]=="127.0.0.1" and sockets[0]["LocalPort"]==4173 and sockets[0]["OwningProcess"]==1204,"protected user server/owned QA ports drift")
must(not REPORT.exists() and not FINAL.exists() and not FINAL_DIR.exists(),"P16 report/final already exists; refuse overwrite")
report=f"""# P16 — Chrome/Edge cqw and Windows native boundary (2026-11-17)

**Decision: CURRENT_BROWSER_GO / OLD_BROWSER_SOURCE_GAP / NATIVE_ACCESSIBILITY_NOT_ACCEPTED.**
No canonical runtime or test source changed; P15 final integrity and independent postreceipt retain their exact preimage SHA.

## Evidence and browser support

- Real installed Chrome **157.0.8103.79** and Microsoft Edge **157.0.4341.60** tested sequentially, headless through the existing Playwright 1.57 Windows runner, on a single test-owned local server port4217. **82/82 checks PASS** across 375x812, 1366x768 and 1920x1080, with working `CSS.supports('font-size','3cqw')`, `container-type:inline-size`, uniform 480/640 logical canvas scaling, fixed-size desktop LCD typography, AP-1 13-row Sounder menu, and no horizontal scroll or external requests.
- Exact body evidence **234/234 HTTP SHA** matched the canonical source files. Four screenshots match their receipt SHA and **2/2 Chrome-vs-Edge viewport pairs are identical decoded RGBA pixels**. Eight protected original-photo routes return 404; user server `127.0.0.1:4173` PID1204 untouched, test port4217 closed.
- Real-browser receipt: `plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261117/p16/P16_CHROME_EDGE_CQW_BROWSER_GATE_20261117.json` SHA `{h(BROWSER)}`.
- Independent source review: `plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261117/p16-compat/P16_CQW_SOURCE_COMPATIBILITY_REVIEW_20261117.md` SHA `{h(COMPAT)}`. It finds **no current source-valid runtime defect or reason to rebaseline P15**, but older Chromium/WebView without `cqw` and `container-type:inline-size` is **SOURCE_GAP**, not a tested PASS. Source compatibility references: https://caniuse.com/css-container-query-units ; https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries . Chrome/Edge feature support begins at version 105 (external compatibility table, not a locally tested 105 build).
- Unsupported older engines would ignore P15 G2 cqw typography declarations. **No CSS fallback is added** because the project does not yet declare a versioned old-browser support target, and no old browser binary is available for authoritative QA. If explicitly required, stage a source-valid fallback and test on that exact pinned older executable before any guarded canonical change.

## Native accessibility boundary

- Independent Windows readiness evidence: `plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261117/p16-native/P16_NATIVE_ACCESSIBILITY_FACT_GATE_20261117.md` SHA `{h(NATIVE)}`.
- Browser/ARIA contracts are not native Narrator speech, NVDA, high contrast or real POWER window.blur delivery. The independent native report's actual statuses take precedence; **none is upgraded to native PASS merely from browser emulation or executable presence**.

## Invariants, unknowns and next practical milestone

- P15 source **50/50 SHA** unchanged; 8 original OEM JPEG unchanged, reference-only and HTTP404. All protected P14/P15 receipts untouched. No Git claims, no release/install, no vessel connection, no OEM property copied into runtime.
- **65/65 claims HOLD**, F1 Phase6 OPEN, firmware installed UNKNOWN, rights and releaseApproval HOLD, hardwareValidated=false. OEM pixel/physical fidelity remains SOURCE_GAP. `2016` photos lack independent EXIF capture timestamp confirmation.
- **Next:** Only if an old Windows browser is a required deployment target, obtain and pin its exact binary/version SHA then test or add a bounded CSS fallback. In a separately authorized non-user QA Windows session, perform operator-observed Narrator/NVDA/native High Contrast and physical keyboard focus/POWER blur tests; never toggle user OS accessibility settings without approval.
"""
with REPORT.open("x",encoding="utf8") as f:f.write(report)
FINAL_DIR.mkdir(parents=True,exist_ok=False)
receipt={"schema":"FCV588_P16_BROWSER_BOUNDARY_FINAL_INTEGRITY_V1","createdAt":datetime.now(timezone.utc).isoformat(),"status":"P16_CURRENT_CHROME_EDGE_PASS_OLDER_BROWSER_SOURCE_GAP_NATIVE_NOT_ACCEPTED","scope":"F1_PUBLIC_REFERENCE_V2_OFFLINE_SYNTHETIC_ONLY","canonicalRuntimeChanged":False,"canonicalRuntimeCount":50,"canonicalRuntime50SHA256":rt,"parentP15FinalSHA256":h(OLD_FINAL),"parentP15IndependentPostSHA256":h(OLD_POST),"browserGateSHA256":h(BROWSER),"independentCqwReviewSHA256":h(COMPAT),"independentNativeReviewSHA256":h(NATIVE),"reportSHA256":h(REPORT),"checks":{"chromeEdge":82,"chromeEdgePassed":82,"browserViewports":6,"httpBodiesMatched":234,"screenshotsSHAverified":4,"chromeEdgeDecodedRGBAIdenticalPairs":2,"oemRoutesHTTP404":8,"externalRequests":0,"pageErrors":0,"testOwnedServerExited":True},"installedBrowserVersions":gate["browserVersions"],"screenshotsChromeEdgePixelEquality":pairs,"originalOEMReferenceOnly8SHA256":photos,"protectedUserServer":sockets[0],"deploymentBrowserVersionFloor":"NOT_DECLARED","olderBrowserCqw":"SOURCE_GAP_NOT_TESTED","unsupportedOldBrowserCSSG2":"NO_GO_IF_REQUIRED_TARGET","nativeWindowsAccessibility":"NOT_ACCEPTED_READ_ONLY_BOUNDARY","independentReviewStatus":"GO_CURRENT_BROWSER_SOURCE_GAP_OLD_BROWSER","releaseApproval":"HOLD","hardwareValidated":False,"firmwareInstalled":None,"rightsClearance":False,"oemCertified":False}
with FINAL.open("x",encoding="utf8") as f:json.dump(receipt,f,indent=2,ensure_ascii=False);f.write("\n")
print(json.dumps({"status":"PASS_CURRENT_CHROME_EDGE","scope":"NO_CANONICAL_SOURCE_CHANGE","browserChecks":"82/82","httpBodySHA":"234/234","screenshots":"4/4","decodedPixelPairs":"2/2","parentRuntimeSHA":"50/50","originalOEMPhotos":"8/8","native":"NOT_ACCEPTED","oldBrowser":"SOURCE_GAP","finalSHA256":h(FINAL),"reportSHA256":h(REPORT)},ensure_ascii=True))