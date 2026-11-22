import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
const stage=path.resolve(import.meta.dirname,"..");
const root=path.resolve(stage,"..","..");
const qa=path.join(root,"docs","qa","FCV588_ELECTRON_P30_INSTALLER_20261121");
const artifacts=path.join(stage,"dist-p30-v2");
const hash=b=>crypto.createHash("sha256").update(b).digest("hex");
const sha=f=>hash(fs.readFileSync(f));
const expected={
  "P28_FINAL":["docs/qa/FCV588_P28_MODE_VISUAL_20261117/FCV588_P28_MODE_VISUAL_FINAL_INTEGRITY_20261117.json","313c323db96f706de07bd28cf3832d19cdcdb0ce7dc41baad0d726e09a27ca95"],
  "P28_POST":["docs/qa/FCV588_P28_MODE_VISUAL_20261117/FCV588_P28_MODE_VISUAL_INDEPENDENT_SHA_POSTRECEIPT_20261117.json","bb533ff8a36084c579fa33a24a18b914ae61930cf14d0634dc46e10523c24bed"],
  "P29_FINAL":["docs/qa/FCV588_ELECTRON_POC_20261121/FCV588_P29_ELECTRON_POC_FINAL_INTEGRITY_20261121.json","3af7f84251e8c838d8db188f521f9b7592eced42a3cd21090e8e878dfccf420c"],
  "P29_POST":["docs/qa/FCV588_ELECTRON_POC_20261121/FCV588_P29_ELECTRON_POC_INDEPENDENT_SHA_POSTRECEIPT_20261121.json","d63cb400bb7633ac42ee76156af8669c4b967dc8d812cb06769faff4de25e81e"]
};
const paths={
  installer:path.join(artifacts,"P30-FCV588-Synthetic-Training-POC-UNRELEASED-0.0.1-win-x64.exe"),
  executable:path.join(artifacts,"win-unpacked","FCV588-Synthetic-POC.exe"),
  appAsar:path.join(artifacts,"win-unpacked","resources","app.asar"),
  buildConfig:path.join(stage,"desktop","p30-builder-v2.config.cjs"),
  packageJson:path.join(stage,"package.json"),
  packageLock:path.join(stage,"package-lock.json"),
  buildSource:path.join(stage,"desktop","p30-builder.config.cjs"),
  auditSource:path.join(stage,"desktop","p30-audit.mjs"),
  profileSource:path.join(stage,"desktop","p30-upgrade-profile.mjs"),
  audit: path.join(qa,"P30_V2_ASAR_FUSES_SOURCE_AUDIT_ATTEMPT3_20261121.json"),
  settings: path.join(qa,"P30_SETTINGS_TRANSFER_UNIT_FINAL_20261121.txt"),
  replay: path.join(qa,"P30_FOCUSED_P28_NODE_ATTEMPT1_20261121.txt"),
  native: path.join(qa,"P30_V2_NATIVE_PROCESS_SMOKE_V3_20261121.json"),
  profile: path.join(qa,"P30_V2_NATIVE_P29_PROFILE_COMPAT_ATTEMPT1_20261121.json"),
  v1Failure: path.join(qa,"P30_NATIVE_STDERR_ATTEMPT1.txt"),
  v1Installer:path.join(stage,"dist-p30","P30-FCV588-Synthetic-Training-POC-UNRELEASED-0.0.1-win-x64.exe")
};
for(const [name,[rel,expectedSHA]] of Object.entries(expected))
  assert.equal(sha(path.join(root,rel)),expectedSHA,name);
const a=JSON.parse(fs.readFileSync(paths.audit));
const native=JSON.parse(fs.readFileSync(paths.native));
const profile=JSON.parse(fs.readFileSync(paths.profile));
assert.equal(a.status,"PASS");
assert.equal(a.files.length,58);
assert.equal(native.status,"PASS");
assert.equal(profile.status,"PASS");
assert.match(fs.readFileSync(paths.settings,"utf8"),/# pass 2/);
assert.match(fs.readFileSync(paths.replay,"utf8"),/# pass 4/);
assert.match(fs.readFileSync(paths.v1Failure,"utf8"),/Error loading V8 startup snapshot file/);
const script=JSON.parse(fs.readFileSync(paths.packageJson)).scripts["package:win"];
assert.ok(script.includes("p30-builder-v2.config.cjs") && script.includes("electron-builder"));
const hashes={};
for(const [name,p] of Object.entries(paths)){
  assert.ok(fs.existsSync(p),name);
  hashes[name]={relativePath:path.relative(root,p).replaceAll(path.sep,"/"),sha256:sha(p),bytes:fs.statSync(p).size};
}
assert.equal(hashes.installer.sha256,"a09c0dbdf33231ee005beb8960c9ef243ec45415c6f8d1a11514394c4c04c982");
assert.equal(hashes.executable.sha256,"8db6a2dbe8b6f419a9a21acc5e3fab281585257bde313b940f0a0afd6bacf6c9");
assert.equal(hashes.appAsar.sha256,"dbed2ac3ac0a1a4d5620c29cdf474d95e4dbd33b7040746dc3474010b00fccb0");
const reportFile=path.join(qa,"FCV588_P30_ELECTRON_INSTALLER_FINAL_REPORT_20261121.md");
const integrityFile=path.join(qa,"FCV588_P30_ELECTRON_INSTALLER_FINAL_INTEGRITY_20261121.json");
assert.ok(!fs.existsSync(reportFile) && !fs.existsSync(integrityFile),"write-once report exists");
const report=`# P30 FCV588 — Windows NSIS staging verification (2026-11-21)

## Verdict

**GO_BOUNDED for P30 V2 staging candidate only. NO_GO_RELEASE.**
Independent worker-48 review: GO_BOUNDED to proceed into authorized isolated clean-VM installer QA. Actual NSIS install/uninstall and real air-gapped clean VM remain BLOCKED/NOT_YET_VERIFIED. Phase6 OPEN, 65/65 claims HOLD, releaseApproval HOLD; synthetic-only, no OEM/hardware/firmware validation.

## Selected output

- Installer: ${paths.installer}, bytes ${hashes.installer.bytes}, SHA256 ${hashes.installer.sha256}; Authenticode NotSigned.
- Unpacked exe: ${paths.executable}, SHA256 ${hashes.executable.sha256}; Authenticode NotSigned.
- ASAR: ${paths.appAsar}, SHA256 ${hashes.appAsar.sha256}; 58/58 leaves exact source allowlist; 0 OEM JPEG/PDF/test/dev modules.
- P30 build command: \`npm run package:win\` at P30 stage; Electron 45.4.1, electron-builder 26.18.1, @electron/fuses 2.1.3; Windows x64; NSIS oneClick per-user configured. No auto-update.
- Origin app://fcv588, appId vn.mophongmaytrentau.fcv588.synthetic.poc, default userData %APPDATA%\\FCV588-Synthetic-POC-UNRELEASED preserved.

## Tests and security

- Strict nine fuses readback PASS: RunAsNode OFF; CookieEncryption ON; NODE_OPTIONS OFF; CLI inspect OFF; EmbeddedASARIntegrity ON; OnlyLoadAppFromAsar ON; browser-specific snapshot OFF; extra file privileges OFF; WasmTrapHandlers ON.
- Exact ASAR source audit 58/58 PASS; embedded header hash in PE independently observed by worker-48.
- P28 focused replay 4/4 PASS; settings transfer unit 2/2 PASS; P30 native smoke PASS (isolated profile; renderer UI not independently tested); P29→P30 native→P29 settings/profile continuity PASS, **not actual installer upgrade or P30 renderer restore**.
- npm audit --omit=dev: 0 runtime dependency vulnerabilities reported. Six moderate findings in the full npm install audit, plus deprecated builder development dependency paths; full online supply-chain audit still required before release.
- Original P30 V1 build and log preserved: native launch FAILED due startup V8 snapshot fuse. V2 switched snapshot fuse OFF and passed native launch. Playwright Electron launcher failed on hardened V2 with RunAsNode OFF; this is NOT a UI E2E PASS.
- Canonical P28 54/54 runtime and 8/8 OEM JPEG SHA exact when checked after build; final/post P28 and P29 four hashes exact. Server 127.0.0.1:4173 PID1204 observed unchanged; no active FCV588 processes after QA.

## Explicit blockers

Actual installer run, clean air-gapped Windows VM, real NSIS per-user location/shortcuts, installer-based upgrade/uninstall/reinstall preserving settings, native UI Automation/Narrator/Win32 POWER focus, negative ASAR tamper proof, code-sign/SmartScreen/EDR, and OEM/hardware acceptance have NOT been verified. Windows Sandbox and Hyper-V are disabled; no authorized clean VMware QA guest found. Never reclassify policy/proxy blocking as air-gap evidence.

## Next concrete action

Provision an explicitly authorized disposable Windows QA VM with network NIC disconnected; install selected V2 NSIS, check startup, userData and same-appId upgrade/uninstall/reinstall, ASAR tamper failure, native focus/a11y, then consider a separately signed release candidate only with rights and sign-off. Do not run installer in the user's primary OS/profile.
`;
fs.writeFileSync(reportFile,report,{flag:"wx"});
const integrity={
  schema:"FCV588_P30_ELECTRON_INSTALLER_FINAL_INTEGRITY_V1",
  status:"P30_STAGING_INSTALLER_BOUNDED_PASS",
  independentReview:"worker-48 GO_BOUNDED; NO_GO_RELEASE",
  releaseApproval:"HOLD",phase6:"OPEN",claims:"65/65 HOLD",
  syntheticOnly:true,hardwareValidated:false,firmware:"UNKNOWN",
  actualInstallerExecuted:false,cleanAirgappedVMValidated:false,
  installerUpgradeValidated:false,nativeAccessibilityValidated:false,
  p28Runtime54SHAExact:true,oemReference8SHAExact:true,
  shaParents:Object.fromEntries(Object.entries(expected).map(([k,v])=>[k,v[1]])),
  report:{relativePath:path.relative(root,reportFile).replaceAll(path.sep,"/"),sha256:sha(reportFile)},
  files:hashes
};
fs.writeFileSync(integrityFile,JSON.stringify(integrity,null,2)+"\n",{flag:"wx"});
console.log(JSON.stringify({status:integrity.status,reportSHA256:sha(reportFile),integritySHA256:sha(integrityFile),reportFile,integrityFile}));
