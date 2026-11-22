import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
const root=path.resolve(import.meta.dirname,"..","..","..");
const qa=path.join(root,"docs","qa","FCV588_ELECTRON_P30_INSTALLER_20261121");
const sha=b=>crypto.createHash("sha256").update(b).digest("hex");
const hashFile=f=>sha(fs.readFileSync(f));
const files={
  first:"P30_HOST_INSTALL_V2_ATTEMPT1_20261121.json",
  seed:"P30_HOST_DEFAULT_PROFILE_SEED_ATTEMPT1_20261121.json",
  before:"P30_HOST_PROFILE_VERIFY_before-upgrade_20261121.json",
  afterUpgrade:"P30_HOST_PROFILE_VERIFY_after-upgrade_20261121.json",
  afterUninstall:"P30_HOST_PROFILE_VERIFY_after-uninstall_20261121.json",
  afterReinstall:"P30_HOST_PROFILE_VERIFY_after-reinstall_20261121.json",
  upgrade:"P30_HOST_INSTALL_UPGRADE_TO_002_ATTEMPT1_20261121.json",
  upgradeStatic:"P30_HOST_UPGRADE_002_STATIC_ATTEMPT2_20261121.json",
  uninstall:"P30_HOST_UNINSTALL_002_ATTEMPT1_20261121.json",
  reinstall:"P30_HOST_REINSTALL_V2_001_ATTEMPT1_20261121.json",
  native:"P30_HOST_INSTALLED_NATIVE_V1_20261121.json",
  uia:"P30_HOST_NATIVE_UIA_002_ATTEMPT1_20261121.json",
  offline:"P30_HOST_OUTBOUND_BLOCK_NATIVE_ATTEMPT1_20261121.json"
};
const data={}, receipts={};
for(const [key,file] of Object.entries(files)){
  const p=path.join(qa,file);
  data[key]=JSON.parse(fs.readFileSync(p,"utf8"));
  receipts[key]={name:file,sha256:hashFile(p)};
}
assert.equal(data.first.exitCode,0);
assert.equal(data.first.registryBeforeCount,0);
assert.equal(data.first.registryAfterCount,1);
assert.equal(data.seed.status,"PASS");
for(const key of ["before","afterUpgrade","afterUninstall","afterReinstall"]){
  assert.equal(data[key].status,"PASS",key);
  assert.equal(data[key].actualSettingsSHA256,data.seed.settingsSHA256,key+" fingerprint");
}
assert.equal(data.upgrade.status,"PASS");
assert.equal(data.upgrade.beforeVersion,"0.0.1");
assert.equal(data.upgrade.afterVersion,"0.0.2");
assert.equal(data.upgradeStatic.status,"PASS");
assert.equal(data.upgradeStatic.filesExact,58);
assert.deepEqual(data.upgradeStatic.changedLeaves,["package.json"]);
assert.equal(data.uninstall.status,"PASS");
assert.equal(data.uninstall.defaultUserDataPreserved,true);
assert.equal(data.reinstall.status,"PASS");
assert.equal(data.reinstall.registryDisplayVersion,"0.0.1");
assert.equal(data.native.mainAlive,true);
assert.equal(data.uia.status,"PARTIAL");
assert.equal(data.uia.windowMatched,true);
assert.equal(data.offline.status,"PASS");
assert.equal(data.offline.firewallRuleRemoved,true);
assert.equal(data.offline.physicalAirgapValidated,false);
const expectedParents={
  P28Final:"313c323db96f706de07bd28cf3832d19cdcdb0ce7dc41baad0d726e09a27ca95",
  P28Post:"bb533ff8a36084c579fa33a24a18b914ae61930cf14d0634dc46e10523c24bed",
  P29Final:"3af7f84251e8c838d8db188f521f9b7592eced42a3cd21090e8e878dfccf420c",
  P29Post:"d63cb400bb7633ac42ee76156af8669c4b967dc8d812cb06769faff4de25e81e",
  P30Final:"d3c8d4a1f1be4bb6ee24aa4ad1021e5fa93163b34bfd1bac7c55d0098f694cd2",
  P30Post:"bf1f7b322e795e6ddb83070048ebfc10f3356626a72d224a6026a92dcdeee4a5"
};
const parentNames={
  P28Final:"FCV588_P28_MODE_VISUAL_20261117/FCV588_P28_MODE_VISUAL_FINAL_INTEGRITY_20261117.json",
  P28Post:"FCV588_P28_MODE_VISUAL_20261117/FCV588_P28_MODE_VISUAL_INDEPENDENT_SHA_POSTRECEIPT_20261117.json",
  P29Final:"FCV588_ELECTRON_POC_20261121/FCV588_P29_ELECTRON_POC_FINAL_INTEGRITY_20261121.json",
  P29Post:"FCV588_ELECTRON_POC_20261121/FCV588_P29_ELECTRON_POC_INDEPENDENT_SHA_POSTRECEIPT_20261121.json",
  P30Final:"FCV588_ELECTRON_P30_INSTALLER_20261121/FCV588_P30_ELECTRON_INSTALLER_FINAL_INTEGRITY_20261121.json",
  P30Post:"FCV588_ELECTRON_P30_INSTALLER_20261121/FCV588_P30_ELECTRON_INSTALLER_INDEPENDENT_SHA_POSTRECEIPT_20261121.json"
};
for(const [key,rel] of Object.entries(parentNames)){
  const actual=hashFile(path.join(root,"docs","qa",...rel.split("/")));
  assert.equal(actual,expectedParents[key],key);
}
const app=path.join(process.env.LOCALAPPDATA,"Programs","fcv588-synthetic-electron-poc");
const installedExe=path.join(app,"FCV588-Synthetic-POC.exe");
const installedAsar=path.join(app,"resources","app.asar");
const installedEXESHA256=hashFile(installedExe);
const installedASARSHA256=hashFile(installedAsar);
assert.equal(installedEXESHA256,"8db6a2dbe8b6f419a9a21acc5e3fab281585257bde313b940f0a0afd6bacf6c9");
assert.equal(installedASARSHA256,"dbed2ac3ac0a1a4d5620c29cdf474d95e4dbd33b7040746dc3474010b00fccb0");
const reportFile=path.join(qa,"FCV588_P30_HOST_WINDOWS_FINAL_REPORT_20261121.md");
const finalFile=path.join(qa,"FCV588_P30_HOST_WINDOWS_FINAL_INTEGRITY_20261121.json");
assert.ok(!fs.existsSync(finalFile),"write-once final integrity already exists");
const report=`# P30 — Real Windows host NSIS lifecycle QA, 2026-11-21

## Verdict

**P30_HOST_INSTALL_LIFECYCLE_BOUNDED_PASS**, no VM; **releaseApproval=HOLD**. Installed selected P30 V2 version 0.0.1 remains on this actual Windows host, per-user. Full-machine air-gap, code-sign and native AT/screenreader/operator accessibility remain NOT_YET_VERIFIED.

## Actual install and upgrade

- First install selected NSIS 0.0.1: exit 0, HKCU uninstall entry created, installed executable and app.asar match stage hashes, user Start Menu shortcut present.
- Tested a separate upgrade-only NSIS 0.0.2 build (not a distribution candidate): 58 ASAR leaves unchanged except package.json version/QA description; strict 9/9 Electron fuses. Actual 0.0.1 -> 0.0.2 NSIS install exit 0, registry GUID same and DisplayVersion changed.
- Uninstall 0.0.2: exit 0; HKCU uninstall and installation identity removed, install directory and Start Menu shortcut removed, default userData preserved. Updater cache remains in LOCALAPPDATA; did not delete it.
- Reinstalled sealed P30 V2 0.0.1: exit 0, installed executable SHA256 ${installedEXESHA256}; app.asar SHA256 ${installedASARSHA256}; version 0.0.1 restored. Installed app is UNRELEASED and unsigned.
- Synthetic default settings seeded into a previously absent profile through sealed P29 Electron UI, and read back byte-exact at 4 lifecycle checkpoints: before upgrade, after upgrade, after uninstall, after reinstall. Settings SHA256: ${data.seed.settingsSHA256}; power OFF after P29 reopen. This proves storage persisted, but native P30 restore UI was not directly asserted through Playwright.

## Native/offline

- Installed P30 actual native process alive, four FCV588 process IDs observed; at snapshot no non-loopback established TCP connections. Actual Windows UIA found the app top-level window named 'MoPhongMayTrenTau | FCV-588 Public Reference', but no MODE/GAIN/POWER descendants: native controls UIA **PARTIAL** only; no Narrator/NVDA speech or real POWER blur claim.
- App-only temporary Windows Firewall outbound deny on the installed executable (all profiles) was active during native launch; process remained alive with zero nonloopback established TCP connections sampled. Rule was removed and cleanup verified. Windows network adapter stayed enabled. This is **NOT** a physical air-gap / machine-wide offline test.
- Host installer was launched from an elevated admin token as seen in read-only worker survey; ordinary standard-user integrity launch was not separately verified.

## Preservation and release gates

- Original P28, P29, and P30 six final/postreceipt SHA exact unchanged.
- Canonical, screenshots/OEM reference-only, P29 portable artifacts and 127.0.0.1:4173 remain out of install scope. Hardware/firmware/OEM fidelity not validated. No real transducer/vessel interfaces.
- NSIS appId vn.mophongmaytrentau.fcv588.synthetic.poc and origin app://fcv588 kept stable. App ID is **POC** identity and must not silently become a production app ID.
- Independent reviewer read-only lifecycle audit was requested separately; postreceipt captures its final verdict. No code signing, no SmartScreen/EDR distribution clearance, no full-machine disconnected network proof. releaseApproval=HOLD.
`;
// Attempt1 wrote the report, then failed on an undefined final JSON variable.
// Reuse it only if byte-identical; never overwrite an existing evidence file.
if(fs.existsSync(reportFile)){
  assert.equal(fs.readFileSync(reportFile,"utf8"),report,"preexisting report drift");
}else{
  fs.writeFileSync(reportFile,report,{flag:"wx"});
}
const final={
  schema:"FCV588_P30_HOST_WINDOWS_FINAL_INTEGRITY_V1",
  status:"P30_HOST_INSTALL_LIFECYCLE_BOUNDED_PASS",
  host:"REAL_WINDOWS_NOT_VM",
  selectedInstalledVersion:"0.0.1",
  installedExeSHA256:installedEXESHA256,installedASARSHA256,
  syntheticSettingsSHA256:data.seed.settingsSHA256,
  installUpgradeUninstallReinstall:"PASS",
  readbacksBeforeAfter:"4_OF_4_PASS",
  nativeProcess:"VERIFIED",
  nativeUIAControls:"PARTIAL",
  processScopedFirewallOffline:"PASS",
  strictPhysicalAirgap:false,
  signing:"NOT_SIGNED",
  releaseApproval:"HOLD",
  phase6:"OPEN",
  hardwareValidated:false,
  receipts,shaParents:expectedParents,
  reportSHA256:hashFile(reportFile)
};
fs.writeFileSync(finalFile,JSON.stringify(final,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({status:final.status,reportSHA256:hashFile(reportFile),integritySHA256:hashFile(finalFile),reportFile,finalFile}));
