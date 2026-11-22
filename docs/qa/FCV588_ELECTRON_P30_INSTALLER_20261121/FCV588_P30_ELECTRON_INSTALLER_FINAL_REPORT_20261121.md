# P30 FCV588 — Windows NSIS staging verification (2026-11-21)

## Verdict

**GO_BOUNDED for P30 V2 staging candidate only. NO_GO_RELEASE.**
Independent worker-48 review: GO_BOUNDED to proceed into authorized isolated clean-VM installer QA. Actual NSIS install/uninstall and real air-gapped clean VM remain BLOCKED/NOT_YET_VERIFIED. Phase6 OPEN, 65/65 claims HOLD, releaseApproval HOLD; synthetic-only, no OEM/hardware/firmware validation.

## Selected output

- Installer: C:\Work\MoPhongMayTrenTau\staging\fcv588-electron-installer-p30-20261121\dist-p30-v2\P30-FCV588-Synthetic-Training-POC-UNRELEASED-0.0.1-win-x64.exe, bytes 121310396, SHA256 a09c0dbdf33231ee005beb8960c9ef243ec45415c6f8d1a11514394c4c04c982; Authenticode NotSigned.
- Unpacked exe: C:\Work\MoPhongMayTrenTau\staging\fcv588-electron-installer-p30-20261121\dist-p30-v2\win-unpacked\FCV588-Synthetic-POC.exe, SHA256 8db6a2dbe8b6f419a9a21acc5e3fab281585257bde313b940f0a0afd6bacf6c9; Authenticode NotSigned.
- ASAR: C:\Work\MoPhongMayTrenTau\staging\fcv588-electron-installer-p30-20261121\dist-p30-v2\win-unpacked\resources\app.asar, SHA256 dbed2ac3ac0a1a4d5620c29cdf474d95e4dbd33b7040746dc3474010b00fccb0; 58/58 leaves exact source allowlist; 0 OEM JPEG/PDF/test/dev modules.
- P30 build command: `npm run package:win` at P30 stage; Electron 45.4.1, electron-builder 26.18.1, @electron/fuses 2.1.3; Windows x64; NSIS oneClick per-user configured. No auto-update.
- Origin app://fcv588, appId vn.mophongmaytrentau.fcv588.synthetic.poc, default userData %APPDATA%\FCV588-Synthetic-POC-UNRELEASED preserved.

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
