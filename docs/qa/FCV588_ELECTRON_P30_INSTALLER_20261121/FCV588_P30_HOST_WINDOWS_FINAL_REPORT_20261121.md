# P30 — Real Windows host NSIS lifecycle QA, 2026-11-21

## Verdict

**P30_HOST_INSTALL_LIFECYCLE_BOUNDED_PASS**, no VM; **releaseApproval=HOLD**. Installed selected P30 V2 version 0.0.1 remains on this actual Windows host, per-user. Full-machine air-gap, code-sign and native AT/screenreader/operator accessibility remain NOT_YET_VERIFIED.

## Actual install and upgrade

- First install selected NSIS 0.0.1: exit 0, HKCU uninstall entry created, installed executable and app.asar match stage hashes, user Start Menu shortcut present.
- Tested a separate upgrade-only NSIS 0.0.2 build (not a distribution candidate): 58 ASAR leaves unchanged except package.json version/QA description; strict 9/9 Electron fuses. Actual 0.0.1 -> 0.0.2 NSIS install exit 0, registry GUID same and DisplayVersion changed.
- Uninstall 0.0.2: exit 0; HKCU uninstall and installation identity removed, install directory and Start Menu shortcut removed, default userData preserved. Updater cache remains in LOCALAPPDATA; did not delete it.
- Reinstalled sealed P30 V2 0.0.1: exit 0, installed executable SHA256 8db6a2dbe8b6f419a9a21acc5e3fab281585257bde313b940f0a0afd6bacf6c9; app.asar SHA256 dbed2ac3ac0a1a4d5620c29cdf474d95e4dbd33b7040746dc3474010b00fccb0; version 0.0.1 restored. Installed app is UNRELEASED and unsigned.
- Synthetic default settings seeded into a previously absent profile through sealed P29 Electron UI, and read back byte-exact at 4 lifecycle checkpoints: before upgrade, after upgrade, after uninstall, after reinstall. Settings SHA256: 1a01885c751731670d802ce929db3c72f210abbf0112042648f9983b1c92b4ce; power OFF after P29 reopen. This proves storage persisted, but native P30 restore UI was not directly asserted through Playwright.

## Native/offline

- Installed P30 actual native process alive, four FCV588 process IDs observed; at snapshot no non-loopback established TCP connections. Actual Windows UIA found the app top-level window named 'MoPhongMayTrenTau | FCV-588 Public Reference', but no MODE/GAIN/POWER descendants: native controls UIA **PARTIAL** only; no Narrator/NVDA speech or real POWER blur claim.
- App-only temporary Windows Firewall outbound deny on the installed executable (all profiles) was active during native launch; process remained alive with zero nonloopback established TCP connections sampled. Rule was removed and cleanup verified. Windows network adapter stayed enabled. This is **NOT** a physical air-gap / machine-wide offline test.
- Host installer was launched from an elevated admin token as seen in read-only worker survey; ordinary standard-user integrity launch was not separately verified.

## Preservation and release gates

- Original P28, P29, and P30 six final/postreceipt SHA exact unchanged.
- Canonical, screenshots/OEM reference-only, P29 portable artifacts and 127.0.0.1:4173 remain out of install scope. Hardware/firmware/OEM fidelity not validated. No real transducer/vessel interfaces.
- NSIS appId vn.mophongmaytrentau.fcv588.synthetic.poc and origin app://fcv588 kept stable. App ID is **POC** identity and must not silently become a production app ID.
- Independent reviewer read-only lifecycle audit was requested separately; postreceipt captures its final verdict. No code signing, no SmartScreen/EDR distribution clearance, no full-machine disconnected network proof. releaseApproval=HOLD.
