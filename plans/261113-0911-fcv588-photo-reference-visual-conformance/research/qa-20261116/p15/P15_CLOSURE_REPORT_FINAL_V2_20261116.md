<!-- Final P15 closeout. Previous summary retained unchanged; corrected PowerShell here-string backtick formatting only. -->
# P15 — FCV-588 source-grounded geometry / photo / Windows boundary closure (2026-11-16)

Status: **PASS_BOUNDED_CSS_G1G2 (canonical applied)**. This is NOT OEM/hardware/release acceptance.

## Outcome

- Photo-source audit: 8/8 original REFERENCE_ONLY JPEGs (590×1280), exact SHA; no reliable EXIF capture date, active LCD class-A ROI, calibrated perspective, native OEM framebuffer, installed firmware or redistribution grant. The 2016 folder label is not independently verified photograph date.
- Independent source audit found source-valid **G1** (the intrinsic 480×640 canvas was stretched anisotropically in the CSS LCD content box) and **G2** (LCD header/depth fonts depended on outer window width instead of actual LCD width).
- Real Chrome RED before changes: 11/13 geometry checks failed on 8 representative viewports including 700/701 and 1240/1241 breakpoints. Staged CSS: 13/13 GREEN; one file web/styles.css changed (preserves estimated aperture 128:171, uniform 480:640 canvas scale with tiny letterbox, LCD cqw typography); one strict new source test 	est/fcv588-p15-uniform-lcd-css.test.mjs added. No app/reducer/replay/sensor/module changes.
- Independent code gate: CANONICAL APPLY: GO at ../p15-geometry/P15_G1G2_INDEPENDENT_PREAPPLY_GATE_20261116.md, SHA 1b45077098086d562086dde316e7cf36e38239ceffa6cdc9f3c7388e45ad0db. Independent screenshot review: GO_BOUNDED at ../p15-photo/P15_VISUAL_G1G2_INDEPENDENT_BOUNDED_REVIEW_20261116.md, SHA 9f93a54f447181348bcdd93f82374203da8e2ae626c1a5c78afa45fbe11b7d08.
- Guarded canonical apply completed; the two exact allowlisted SHA values are web/styles.css = ce699bc88586fc0b883ba357661cda4ccb414069127d6ec23aa81a4300d6afeb and 	est/fcv588-p15-uniform-lcd-css.test.mjs = 2a750cb43e2ffd965eb1266046b45aad30da692312db1e172faa0acd73d162b0. Backed original CSS remains in P15_CSS_PREIMAGE_BACKUP_20261116.zip SHA 73e84c94b73943bc26a4d18778f06de05684f183e1f209111610bf415d03e01.

## Canonical QA after apply

| Check | Actual result | Status |
|---|---:|---|
| Runtime SHA against P15 post manifest | 50/50 (49 unchanged from P14) | PASS |
| Original OEM JPEG SHA | 8/8 | PASS (REFERENCE_ONLY) |
| CSS geometry real Chrome at 8 viewports | 13/13 | PASS |
| Canonical Node checks | 579/579 | PASS |
| Canonical Python tests | 13/13 | PASS |
| Canonical Chrome seven modes × three viewports + three zoom types | 103/103 assertions, 24 distinct captures rehashed | PASS |
| Loaded browser source HTTP response body SHA | 273/273 exact | PASS |
| Canonical menu (legacy21/AP-1) Chrome | 10/10 | PASS |
| Original JPEG /sources served URLs | 8/8 HTTP 404 | PASS |
| JavaScript page errors / outbound URLs | 0/0 | PASS |
| Source final/postreceipt readback | 13/13 referenced QA artifacts exact, 50 runtime, 8 JPEG, 24 images, 273 HTTP bodies | PASS |
| User loopback server | 127.0.0.1:4173 PID 1204 preserved, QA port4216 cleaned | PASS |

### QA harness correction retained as FAIL, not whitewashed

1. Initial captured Chrome matrix attempt1 stopped on hidden D15 MODE helper at mobile viewport. This was a harness selector issue; physical MODE knob keyboard controls were used in subsequent browser tests.
2. Captured Chrome matrix attempt2 had 3 false >=45 HTTP response-count assumptions, but Chrome actually loaded exactly **39** source paths per viewport. Strict reconciliation independently checked complete URL sets and actual HTTP body bytes; source manifest runtime50 is a different population from served browser imports.
3. Initial canonical Chrome V1 receipt had screenshot filenames reused by overlapping QA captures; **7/24 screenshot files no longer matched that earlier receipt**, so V1 is not valid postreceipt. A final independent-name V2 Chrome pass produced 24 fresh captures and 273/273 body matches. The final sealed authoritative browser evidence is **P15_CANONICAL_CHROME_MODE_GEOMETRY_FINAL_V2_20261116.json** with SHA 789da446c4fee75c09844b60cb07e103c3340fcf266305be0297b91fbf9b2a76; all 24 screenshot bytes were reread from that final V2 and exact-hashed. No unsuccessful logs were edited or reclassified as original PASS.
4. Early finalizer attempts hit the invalid V1 screenshot SHA and a mistaken menu JSON shape assertion; the corrected V3 final integrity passed and is the only authoritative final integrity for this P15 scope. None of these harness faults are established product defects.

## Sealed authoritative receipts

- Final: P15_CANONICAL_CSS_FINAL_INTEGRITY_V3_20261116.json; SHA-256 **f6286b9bdcae782ccf0aab1c129cff0e55ef6c8f63c66b58303a1429ed77259b**.
- Separate independent semantic/hash reread: P15_CANONICAL_CSS_INDEPENDENT_POSTRECEIPT_20261116.json; SHA-256 **3b4554f7c88b473eda9af9d638e2b8fe69de712782ce2cb6637c455317b7993a**.
- Both former P14 authoritative receipts are immutable and their original SHA-256 values match; they are historic P14 preimages, NOT P15 runtime hashes.
- Supporting P15 photo/a11y boundaries: ../p15-photo/P15_EIGHT_OEM_PHOTO_SOURCE_AUDIT_20261116.md and ../p15-native/P15_NATIVE_ACCESSIBILITY_BOUNDARY_20261116.md.

## Remaining restrictions and next priority

- P15 exact supported tested Chrome build uses CSS container units (cqw); older offline Chromium/WebView compatibility remains **NOT_YET_VERIFIED**. Do not claim support for unspecified older browser engines.
- Windows Narrator audible speech, NVDA speech/focus mode, native Windows High Contrast and POWER true browser window.blur cancellation remain **NOT_RUN / NOT_YET_VERIFIED**. P11 Win32 foreground experiments did NOT demonstrate browser blur, so do not alter POWER code based on that evidence alone. Next bounded native manual test is physical human Space-hold then ordinary OS window switch with passive browser blur/Win32 logs in authorized QA Windows session (no synthetic blur or SetForegroundWindow witness).
- 8 photographs remain REFERENCE_ONLY; ownership/licensing, calibrated native-LCD ROI, OEM palette/font/glyph, exact physical geometry, measured hardware/DSP/timing, installed firmware and full Vietnamese locale have SOURCE_GAP. **F1 Phase6 / all 65 feature claims / hardware acceptance / rights / releaseApproval stay HOLD.**

Next recommended work package: **P16, bounded browser-compatibility + native focus/a11y evidence**, only if an authorized isolated Windows desktop can supply real keyboard/Narrator/contrast observation. Do NOT spend time tuning raw photo RGB/pixel alignment without OEM-calibrated source and clearance.