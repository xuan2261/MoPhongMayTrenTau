import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
const stage=path.resolve(import.meta.dirname,"..");
const root=path.resolve(stage,"..","..");
const qa=path.join(root,"docs","qa","FCV588_ELECTRON_P31_NATIVE_A11Y_20261121");
const parentQA=path.join(root,"docs","qa");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const hashFile=p=>sha(fs.readFileSync(p));
const references={
  P28_FINAL:["FCV588_P28_MODE_VISUAL_20261117/FCV588_P28_MODE_VISUAL_FINAL_INTEGRITY_20261117.json","313c323db96f706de07bd28cf3832d19cdcdb0ce7dc41baad0d726e09a27ca95"],
  P28_POST:["FCV588_P28_MODE_VISUAL_20261117/FCV588_P28_MODE_VISUAL_INDEPENDENT_SHA_POSTRECEIPT_20261117.json","bb533ff8a36084c579fa33a24a18b914ae61930cf14d0634dc46e10523c24bed"],
  P29_FINAL:["FCV588_ELECTRON_POC_20261121/FCV588_P29_ELECTRON_POC_FINAL_INTEGRITY_20261121.json","3af7f84251e8c838d8db188f521f9b7592eced42a3cd21090e8e878dfccf420c"],
  P29_POST:["FCV588_ELECTRON_POC_20261121/FCV588_P29_ELECTRON_POC_INDEPENDENT_SHA_POSTRECEIPT_20261121.json","d63cb400bb7633ac42ee76156af8669c4b967dc8d812cb06769faff4de25e81e"],
  P30_FINAL:["FCV588_ELECTRON_P30_INSTALLER_20261121/FCV588_P30_ELECTRON_INSTALLER_FINAL_INTEGRITY_20261121.json","d3c8d4a1f1be4bb6ee24aa4ad1021e5fa93163b34bfd1bac7c55d0098f694cd2"],
  P30_POST:["FCV588_ELECTRON_P30_INSTALLER_20261121/FCV588_P30_ELECTRON_INSTALLER_INDEPENDENT_SHA_POSTRECEIPT_20261121.json","bf1f7b322e795e6ddb83070048ebfc10f3356626a72d224a6026a92dcdeee4a5"]
};
for(const [key,[rel,h]] of Object.entries(references))assert.equal(hashFile(path.join(parentQA,...rel.split("/"))),h,key);
const receiptFiles={
  stageAudit:"P31_STAGE_FUSES_ASAR_SOURCE_AUDIT_V1_20261121.json",
  unpackedDefault:"P31_UNPACKED_NATIVE_DEFAULT_UIA_V1_20261121.json",
  upgrade:"P31_HOST_REAL_UPGRADE_FROM_P30_001_TO_003_V1_20261121.json",
  preSettings:"P31_HOST_PROFILE_VERIFY_pre-p31_20261121.json",
  postSettings:"P31_HOST_PROFILE_VERIFY_post-p31_20261121.json",
  win32PowerBlur:"P31_NATIVE_POWER_WIN32_FOCUS_BLUR_V1_20261121.json",
  tabVisual:"P31_NATIVE_TAB_FOCUS_VISUAL_V1_20261121.json",
  egress:"P31_NATIVE_APP_SCOPED_OFFLINE_FIREWALL_V1_20261121.json",
  settingsUnit:"P31_SETTINGS_UNIT_V1_20261121.txt",
  focusedReplay:"P31_P28_FOCUSED_V1_20261121.txt",
  modeScreenshot:"P31_NATIVE_MODE_FOCUS_V1_20261121.png",
  powerScreenshot:"P31_NATIVE_POWER_FOCUS_V1_20261121.png"
};
const receiptHashes={},data={};
for(const [key,name] of Object.entries(receiptFiles)){
  const target=path.join(qa,name);
  assert.ok(fs.existsSync(target),name);
  receiptHashes[key]={path:name,sha256:hashFile(target),bytes:fs.statSync(target).size};
  if(name.endsWith(".json"))data[key]=JSON.parse(fs.readFileSync(target,"utf8"));
}
assert.equal(data.stageAudit.status,"PASS");
assert.deepEqual(data.stageAudit.changedASARLeaves,["desktop/main.cjs","package.json"]);
assert.equal(data.stageAudit.asarLeaves,58);
assert.equal(data.stageAudit.fuseCount,9);
assert.equal(data.unpackedDefault.status,"PASS");
assert.equal(data.unpackedDefault.forcedAccessibilitySwitchUsed,false);
assert.equal(data.unpackedDefault.controls.length,3);
assert.equal(data.upgrade.status,"PASS");
assert.equal(data.upgrade.fromVersion,"0.0.1");
assert.equal(data.upgrade.toVersion,"0.0.3");
assert.equal(data.preSettings.status,"PASS");
assert.equal(data.postSettings.status,"PASS");
assert.equal(data.preSettings.actualSettingsSHA256,data.postSettings.actualSettingsSHA256);
assert.equal(data.postSettings.actualSettingsSHA256,"1a01885c751731670d802ce929db3c72f210abbf0112042648f9983b1c92b4ce");
assert.equal(data.win32PowerBlur.status,"PASS");
assert.equal(data.win32PowerBlur.sourceBoundEventCount,true);
assert.equal(data.win32PowerBlur.eventCountAfterSpaceDown,data.win32PowerBlur.eventCountBefore+1);
assert.equal(data.win32PowerBlur.eventCountAfterBlurAndKeyUp,data.win32PowerBlur.eventCountBefore+2);
assert.equal(data.win32PowerBlur.powerOffAfterBlur,true);
assert.equal(data.tabVisual.status,"PASS");
assert.equal(data.tabVisual.checks.length,3);
assert.equal(data.tabVisual.screenshots.MODE.sha256,receiptHashes.modeScreenshot.sha256);
assert.equal(data.tabVisual.screenshots.POWER.sha256,receiptHashes.powerScreenshot.sha256);
assert.equal(data.egress.status,"PASS");
assert.equal(data.egress.ruleRemoved,true);
assert.equal(data.egress.physicalAirgapValidated,false);
assert.match(fs.readFileSync(path.join(qa,receiptFiles.settingsUnit),"utf8"),/# pass 2/);
assert.match(fs.readFileSync(path.join(qa,receiptFiles.focusedReplay),"utf8"),/# pass 4/);
const installedExe=path.join(process.env.LOCALAPPDATA,"Programs","fcv588-synthetic-electron-poc","FCV588-Synthetic-POC.exe");
const installedAsar=path.join(process.env.LOCALAPPDATA,"Programs","fcv588-synthetic-electron-poc","resources","app.asar");
assert.equal(hashFile(installedExe),data.stageAudit.artifacts.executable.sha256);
assert.equal(hashFile(installedAsar),data.stageAudit.artifacts.asar.sha256);
const reportPath=path.join(qa,"FCV588_P31_NATIVE_ACCESSIBILITY_FINAL_REPORT_20261121.md");
const finalPath=path.join(qa,"FCV588_P31_NATIVE_ACCESSIBILITY_FINAL_INTEGRITY_20261121.json");
assert.ok(!fs.existsSync(reportPath)&&!fs.existsSync(finalPath),"FINAL_WRITE_ONCE_EXISTS");
const report=`# P31 — Native Windows accessibility hardening, 2026-11-21

## Decision
**P31_HOST_NATIVE_A11Y_BOUNDED_PASS.** Production/OEM/hardware/release remain HOLD.
User authorized actual host Windows testing. P30 original installer, final/postreceipt, P28/P29 canonical and OEM reference-only all remain sealed and unchanged.

## Installed result
- Real NSIS per-user upgrade **0.0.1 → 0.0.3** exit 0, same appId and default userData. Installed EXE SHA256 ${hashFile(installedExe)}, ASAR ${hashFile(installedAsar)}.
- Change is minimal: in Electron app.whenReady before window creation, call app.setAccessibilitySupportEnabled(true). Packaged ASAR 58 leaves, only desktop/main.cjs and package.json differ from P30. All nine hardened fuses unchanged; Electron 45.4.1.
- Windows default UIA, WITHOUT --force-renderer-accessibility flag: three visible focusable Button nodes GAIN/MODE/POWER, 90 descendants, PASS. P30 baseline default was PARTIAL with zero descendants for these controls. P30 forced mode 3/3 PASS is preserved separately.
- Native Tab order GAIN -> MODE -> POWER PASS (two actual Tab transitions), with real Windows screenshots of 3px visual focus ring on MODE and POWER (SHA receipts above).
- Real native Win32 foreground-switch POWER hold-cancel PASS: paused event count ${data.win32PowerBlur.eventCountBefore} -> ${data.win32PowerBlur.eventCountAfterSpaceDown} (SpaceDown) -> ${data.win32PowerBlur.eventCountAfterBlurAndKeyUp} (blur cancel), helper HWND truly foreground when releasing Space, POWER remains OFF. Not a synthetic DOM blur.
- P31 settings transfer unit 2/2, P28 focused replay 4/4 PASS; pre/post default settings SHA exact ${data.postSettings.actualSettingsSHA256}.
- P31 process-specific temporary Windows Firewall outbound deny enabled during native app launch, app survives, sampled non-loopback established TCP 0, rule removed. This is not a physical disconnected-network proof.

## Preserved limitations and findings
- Earlier P30 WinForms SendKeys V3 and V4 rotate assertions FAILED. Subsequent Windows Desktop direct controls demonstrated POWER ON, GAIN Offset 0→+1, MODE LF→DUAL selected. The P30 failures remain immutable and were not rewritten.
- Narrator/NVDA spoken audio and screenreader listening were not validated. Native AT Invoke long-hold is not the physical 3-second POWER contract; only actual SpaceDown→Win32 blur cancel was tested.
- Electron always-on accessibility can increase renderer CPU/memory/automation visibility on local Windows UIA clients; performance/resource impact on classroom hardware remains unmeasured.
- Installer/executable are unsigned. SmartScreen/EDR distribution and publisher rights were not accepted. Physical airgap not tested; no OEM or firmware/hardware validation. releaseApproval=HOLD, Phase6=OPEN.
- Temporary QA profiles/screenshots/logs remain under docs/qa. No P31 QA app process or firewall rule should remain after cleanup; independent postreceipt verifies exact final host state.
`;
fs.writeFileSync(reportPath,report,{flag:"wx"});
const integrity={
  schema:"FCV588_P31_NATIVE_ACCESSIBILITY_FINAL_INTEGRITY_V1",
  status:"P31_HOST_NATIVE_A11Y_BOUNDED_PASS",
  version:"0.0.3",
  host:"REAL_WINDOWS_NOT_VM",
  sourceChange:["desktop/main.cjs","package.json"],
  asarLeaves:58,
  fuseReadback:"9_OF_9_PASS",
  defaultUIA:"3_OF_3_BUTTONS_PASS_NO_FORCE_FLAG",
  realTabOrder:"GAIN_MODE_POWER_PASS",
  actualWin32BlurPower:"PASS_DOWN_PLUS_CANCEL",
  nativeFocusScreenshots:"2_WITH_SHA",
  settingsPersistence:"PASS_SHA_EXACT",
  hardwareValidated:false,
  physicalAirgapValidated:false,
  narratorSpeechValidated:false,
  releaseApproval:"HOLD",
  phase6:"OPEN",
  installed:{exeSHA256:hashFile(installedExe),asarSHA256:hashFile(installedAsar)},
  shaParents:Object.fromEntries(Object.entries(references).map(([name,v])=>[name,v[1]])),
  receipts:receiptHashes,
  reportSHA256:hashFile(reportPath)
};
fs.writeFileSync(finalPath,JSON.stringify(integrity,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({status:integrity.status,reportSHA256:hashFile(reportPath),finalSHA256:hashFile(finalPath),reportPath,finalPath}));
