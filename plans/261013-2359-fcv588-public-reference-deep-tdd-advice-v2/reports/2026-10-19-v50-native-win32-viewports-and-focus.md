# FCV-588 V50 — native Windows viewport and focus-loss QA

Date: 2026-10-19. Scope: training-only offline browser QA. This milestone has zero runtime modifications.

## Baseline

Canonical root: C:/Work/MoPhongMayTrenTau. V49 final SHA ee7bd271586245500d8629bc87ed3322c995146d5ed10e0d444327361efcb511; independent V49 postreceipt SHA e8c13f5e1ef472d23eadc00d71006cc00aabd784a7f9a90665f9f2aba5928429. All 37 runtime sources remain byte-identical in canonical and the isolated V50 staging clone. No reducer, sonar observations, LCD, D15, menu, settings schema or replay profile change.

## Real Windows acceptance work

One test-owned headed Chrome on secondary physical DISPLAY5 (1920×1080) used actual OS window sizing and fullscreen rather than Playwright viewport emulation. The stable Win32 HWND and owner PID, browser innerWidth/innerHeight, and PNG pixel dimensions were checked. Normal browser window content was 1366×768 (Win32 rectangle 1382×863); fullscreen native browser content was 1920×1080 (Win32 rectangle 1920×1080).

Independent staged and canonical V4 runs each passed 28/28 assertions, 70/70 actual browser-loaded HTTP-body SHA and 2/2 screenshot SHA. Stage receipt SHA c9f50de1b6a3bfa114d501fbed17fb3d2de461f1b82b4d92326e59e6b3eb8f28. Canonical receipt SHA bd585e97a259786002386ceb7824d80b7a50ba9d8ffc64bd3185635fe947a9ed. Original V1 harness ERROR and V3 title-race PARTIAL logs/receipts remain immutable; neither is counted as PASS. V2 verified native geometry; V4 added successful per-browser-loaded-body and stable HWND/PID checks.

Official Playwright guidance states that no_viewport permits native headed window resizing: https://playwright.dev/python/docs/api/class-browser . Chrome DevTools window bounds and fullscreen control are documented at https://chromedevtools.github.io/devtools-protocol/tot/Browser/ . These are software testing references, not new FURUNO hardware authority.

One additional genuine OS focus attempt observed a real Win32 foreground transition between two owned windows during POWER hold, but no window.blur was delivered; the first Chrome page continued to report focus. After mouse release the simulated POWER button was no longer pressed. The focus acceptance remains NOT_RUN. Receipt SHA 62c275b76fe1e74b061bfda259304bb7c7c6a9ec1176ea5f667cd50b7ea1ccd0, original exit 2.

## Software regression

Thirty-four historical V27/V28 independently authored training PNG fixtures were copied with SHA checks into staging for Python tests. No manufacturer PDF/photo/firmware/font was copied. Separate staged and canonical runs passed targeted Node 14/14, full Node 511/511, Python 13/13. Staged full Node log SHA b218ab5b6bca3e4ad757d0bb69b144d91610bad659b4d582a40320ac20fa4204; canonical full Node SHA e1ccd152b17aba55489408c59640485a637437cf14bd51c9a6f7537460ad565d. Test counts cannot estimate OEM likeness.

Read the detailed [V50 Windows QA](../../../docs/qa/FCV588_V50_WINDOWS_NATIVE_VIEWPORT_PARTIAL_20261019.md) for Win32 rectangle, original failures, OS blur limits and cleanup.

## Recommended V51

Use a dedicated approved Windows QA VM for genuine spoken Narrator/NVDA announcements and controlled focus-loss events, then complete exact CoS Desktop-attached 1366×768/1920×1080 checks if the Desktop tool supports those operations. Do not change the user's display settings or start their screen reader merely to claim PASS. Continue White Marker firmware fidelity only when installed-unit evidence and media rights are verified.

Phase 6 OPEN; 65/65 claims HOLD, checklist 14/50, named tasks accepted 6/22, installed firmware UNKNOWN, OEM rights HOLD, hardwareValidated=false and releaseApproval=HOLD.
