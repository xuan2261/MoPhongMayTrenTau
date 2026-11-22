# P31 — Native Windows accessibility hardening, 2026-11-21

## Decision
**P31_HOST_NATIVE_A11Y_BOUNDED_PASS.** Production/OEM/hardware/release remain HOLD.
User authorized actual host Windows testing. P30 original installer, final/postreceipt, P28/P29 canonical and OEM reference-only all remain sealed and unchanged.

## Installed result
- Real NSIS per-user upgrade **0.0.1 → 0.0.3** exit 0, same appId and default userData. Installed EXE SHA256 79512e2b520a590e19cd1893c19b0a6fd1c79abb56efcd9c5e83e7613a4fa5fd, ASAR eb35c1a385fa468c6b2db27b51f8ec2c33032a03098ad51f8d6bb5e1edb99190.
- Change is minimal: in Electron app.whenReady before window creation, call app.setAccessibilitySupportEnabled(true). Packaged ASAR 58 leaves, only desktop/main.cjs and package.json differ from P30. All nine hardened fuses unchanged; Electron 45.4.1.
- Windows default UIA, WITHOUT --force-renderer-accessibility flag: three visible focusable Button nodes GAIN/MODE/POWER, 90 descendants, PASS. P30 baseline default was PARTIAL with zero descendants for these controls. P30 forced mode 3/3 PASS is preserved separately.
- Native Tab order GAIN -> MODE -> POWER PASS (two actual Tab transitions), with real Windows screenshots of 3px visual focus ring on MODE and POWER (SHA receipts above).
- Real native Win32 foreground-switch POWER hold-cancel PASS: paused event count 4 -> 5 (SpaceDown) -> 6 (blur cancel), helper HWND truly foreground when releasing Space, POWER remains OFF. Not a synthetic DOM blur.
- P31 settings transfer unit 2/2, P28 focused replay 4/4 PASS; pre/post default settings SHA exact 1a01885c751731670d802ce929db3c72f210abbf0112042648f9983b1c92b4ce.
- P31 process-specific temporary Windows Firewall outbound deny enabled during native app launch, app survives, sampled non-loopback established TCP 0, rule removed. This is not a physical disconnected-network proof.

## Preserved limitations and findings
- Earlier P30 WinForms SendKeys V3 and V4 rotate assertions FAILED. Subsequent Windows Desktop direct controls demonstrated POWER ON, GAIN Offset 0→+1, MODE LF→DUAL selected. The P30 failures remain immutable and were not rewritten.
- Narrator/NVDA spoken audio and screenreader listening were not validated. Native AT Invoke long-hold is not the physical 3-second POWER contract; only actual SpaceDown→Win32 blur cancel was tested.
- Electron always-on accessibility can increase renderer CPU/memory/automation visibility on local Windows UIA clients; performance/resource impact on classroom hardware remains unmeasured.
- Installer/executable are unsigned. SmartScreen/EDR distribution and publisher rights were not accepted. Physical airgap not tested; no OEM or firmware/hardware validation. releaseApproval=HOLD, Phase6=OPEN.
- Temporary QA profiles/screenshots/logs remain under docs/qa. No P31 QA app process or firewall rule should remain after cleanup; independent postreceipt verifies exact final host state.
