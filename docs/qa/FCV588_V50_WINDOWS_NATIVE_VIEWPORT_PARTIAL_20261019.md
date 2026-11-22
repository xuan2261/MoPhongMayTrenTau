# FCV-588 V50 — Windows headed Chrome native viewport QA

Date: 2026-10-19. Scope: offline training simulator, not OEM hardware or navigational validation.

## Verified native Windows sizes

Windows had two 1920×1080 monitors. A single disposable Chrome 155 window was used on secondary monitor DISPLAY5 with Playwright no_viewport enabled and native CDP window bounds. The actual browser content size was checked independently of the outer Win32 HWND rectangle and PNG pixel dimensions. No page viewport emulation, OS resolution changes or OEM device interfaces were used.

| Gate | Staging | Canonical |
| --- | --- | --- |
| Native 1366×768 | Inner 1366×768; decorated HWND 1382×863 at (1990,60) | Same result, independent run |
| Native 1920×1080 | Inner 1920×1080; fullscreen HWND 1920×1080 at (1920,0) | Same result, independent run |
| Assertions | 28/28 PASS | 28/28 PASS |
| Browser-loaded localhost response bodies SHA | 70/70 PASS | 70/70 PASS |
| Screenshot PNG pixel size and SHA | 2/2 PASS | 2/2 PASS |
| Test-owned window/process/port cleanup | PASS | PASS |

Staging V4 receipt: staging/fcv588-v50-native-window-qa/evidence/V50_STAGE_NATIVE_WINDOW_V4_20261019.json; SHA-256 c9f50de1b6a3bfa114d501fbed17fb3d2de461f1b82b4d92326e59e6b3eb8f28.

Canonical V4 receipt: staging/fcv588-v50-native-window-qa/evidence/V50_CANONICAL_NATIVE_WINDOW_V4_20261019.json; SHA-256 bd585e97a259786002386ceb7824d80b7a50ba9d8ffc64bd3185635fe947a9ed.

Two separate image files were captured per run; matching stage/canonical images have identical SHA because the page was in the same initial state. Four file paths and their actual SHA were checked, not a claimed single four-image run. The viewport does not prove OEM bezel geometry or exact attached CoS Desktop browser dimensions.

## Original STOPs and bounded repairs

The original V1 runner stopped before browser testing with an unsupported Playwright combination: no_viewport plus device_scale_factor. The failed V1 receipt and log remain immutable. V2 corrected only that harness option and achieved both real native sizes.

The source-bound V3 captured 35/35 actual browser-loaded HTTP bodies in each viewport and correct screenshots, but immediate post-reload re-discovery by Chrome window title missed the asynchronously updated native title. Its original PARTIAL receipt remains preserved. V4 instead pins the previously verified real HWND and checks its original Win32 owning PID after reload; this guards real window identity and does not change the simulator product.

## Genuine OS-window blur prerequisite not met

One separate test used two owned Chrome Win32 windows on the secondary screen. Foreground really switched from HWND 17895404 to HWND 41157290 during a held simulated POWER press, but the first document retained focus and emitted zero window.blur events. Upon pointer release, the pressed indicator cleared and the simulated device remained on. This is NOT_RUN for the real OS blur cancellation gate, not a software PASS or a proven reducer defect.

Original focus receipt: staging/fcv588-v50-native-window-qa/evidence/V50_GENUINE_OS_BLUR_PROBE_20261019.json, SHA-256 62c275b76fe1e74b061bfda259304bb7c7c6a9ec1176ea5f667cd50b7ea1ccd0, exit code 2.

All test-owned Chrome windows and localhost processes were closed; original user foreground HWND 198108 restored. No Narrator/NVDA was activated. Genuine spoken output, exact CoS Desktop-attached 1366×768 / 1920×1080, installed FCV-588 firmware, OEM media rights, independent hardware review and release remain NOT_RUN/UNKNOWN/HOLD.

Phase 6 OPEN. All 65 claims HOLD, checklist 14/50, 6/22 named tasks, hardwareValidated=false, releaseApproval=HOLD.
