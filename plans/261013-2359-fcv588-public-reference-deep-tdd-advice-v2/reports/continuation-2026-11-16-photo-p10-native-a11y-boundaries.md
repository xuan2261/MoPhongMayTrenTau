# FCV-588 — P10 Windows a11y/focus evidence boundaries (2026-11-16)

**Disposition:** `P10_TARGETED_SOFTWARE_AND_EMULATED_FORCED_COLORS_PASS_NATIVE_SPEECH_AND_OS_BLUR_BLOCKED`. Canonical root `C:\Work\MoPhongMayTrenTau`; P09 sealed parent SHA `759f146c349c2ad348fc5b98e21fbc79d1d857623253811f0a01d3b9408995b9`. No simulator runtime changes, OEM image derivatives, Windows accessibility settings changes, or user-server restarts.

## Tested

- Current-source targeted Node **17/17 PASS** for POWER hold, TrackPad-repeat and rotary blur/reset/short-click behavior; log SHA `b560330ec543e94c31f3a5ac58de7802eab87c4bd9d019e34369e5f3d7f3e249`. Synthetic unit-event tests alone do not verify actual OS focus switching.
- One test-owned Chrome at 1366×768 with `forced-colors: active` **media emulation** passed bounded DOM/focus assertions: POWER focused with solid 3px outline; five named D15 tabs/five panels, no browser page errors, no horizontal overflow; PNG simulator screenshot SHA `a1e86d366f71c82f84f07b3c7de2de51fde5eb54570ee4adcc25efa83282a991`; receipt SHA `410ef2b20c936b5e292cd2d15c69ad322badb05904044e7cb96796ab2a08e97d`. **NOT** native Windows High Contrast acceptance.
- Windows Narrator signed executable, UIAutomation interfaces and browser ARIA keyboard readiness are available, but no auditable actual spoken-out transcript exists; automatic audio-capture chain was absent. NVDA not found. Independent feasibility receipt SHA `6313be94b65c4c3d658ce92b566592511acf69707205d445f7c68c82b86e3544`, conclusion `BLOCKED_RELIABLE_AUTOMATIC_NARRATOR_TRANSCRIPT_WITHOUT_INTERACTIVE_AUDIO_SESSION`.

## Failed native focus attempts retained

- Initial Chrome/Win32 foreground-switch attempt FAIL/HARNESS_BLOCKED SHA `61252852a5ec83870264f48a64d41b01c56e07b111f2cbfdfa8f32e11c14c114`: `AssertionError('Chrome remained document-focused')`.
- Second, more explicit mouse/Win32 foreground attempt FAIL/HARNESS_BLOCKED SHA `ce6963391c930130a817eeffe8f6f83c33ccc429020c4825ae0963f0d5826687`: `AssertionError('foreground HWND unchanged')`. The Win32 foreground before/after was **Helium HWND 5769834**, not the test Chrome. The harness note suggesting real Win32 foreground provenance is invalidated by its own observation. There is **no native `window.blur` acceptance** and no source-valid simulator defect proven. Both attempts cleaned test port4208; user port4173 preserved.

## Review and immutable receipts

- Independent worker-1 evidence reviewer SHA `dc7a8d07f9002bb61a28c7528d2b29c0bd9bf194ed208dec8a50fd66d07dffee` verified the above exact byte hashes/error reasons and preserved native `NOT_VERIFIED`.
- `docs/qa/FCV588_P10_A11Y_BOUNDARIES_20261116/FCV588_P10_A11Y_BOUNDARIES_FINAL_INTEGRITY_20261116.json` SHA `414c0151053bec55271032170e0fba2139fd1627e5fee7524cdf6c1bcf490655`.
- `docs/qa/FCV588_P10_A11Y_BOUNDARIES_20261116/FCV588_P10_A11Y_BOUNDARIES_INDEPENDENT_POSTRECEIPT_20261116.json` SHA `df2cb60996da7f3f557642f329d794198aea9a85ac8fe5084429bee1931c12dc`. Postreceipt is a fresh local SHA/readback after final, not another independently captured speech session.
- Fresh source/runtime 39/39, reference originals 8/8 SHA, evidence receipts, `127.0.0.1:4173` HTTP200 PID1204 and QA ports4207/4208 closed reverified. No P10 app code, session/replay/profile21 changes.

## Next viable acceptance task

Perform a **single controlled interactive Windows desktop session where test Chrome is demonstrably the actual Win32 foreground window before POWER-down** (native HWND/title + foreground event logs). Then change foreground to a dedicated test-owned window while SPACE/POWER is physically held, record browser `isTrusted` blur, cancelled hold event, no subsequent spurious POWER up and no strand on refocus; restore previous focus and close owned windows. Do not retry unattended browser runs while focus ownership is unproven.

Capture Narrator's **actual render-audio speech** with synchronized focus/UIAutomation log and independently human-verified transcript if an approved audio loopback path is available. NVDA needs approved installation/portable path. Real Windows High Contrast remains separate NOT_RUN. F1 Phase6 OPEN; all 65 claims, hardware, firmware, OEM rights, release HOLD. No OEM similarity percentage.
