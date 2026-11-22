---
title: "FCV-588 Public Reference F1 — Deep Research, TDD and Advice-Ready Plan v2"
description: "Develop the complete offline FCV-588 operator-training simulator from graded public evidence, with deterministic TDD and failure-safe handover."
status: in-progress
priority: P1
effort: "Multi-phase; re-estimate after Phase 1 reference freeze"
tags: [fcv588, public-reference, deep, tdd, advice-handover, offline, training]
created: 2026-10-14
---

# FCV-588 PUBLIC_REFERENCE F1 — Deep / TDD / Advice-Ready Replan

## Overview

**16/11/2026 — P05/P06 source-bounded visual QA trên Windows canonical:** Menu 2 cột/draft/commit/cancel và mặt máy/focus D15 đã guarded apply đúng 8 paths (4 runtime modified, 4 new tests). Staging và canonical đều Node **551/551**, Python **13/13**, Chrome mỗi bên P05 **3/3** + P06 **3/3**; 39/39 runtime canonical=stage, 8 ảnh OEM vẫn HTTP 404. Final SHA `ecdfb0bc680f35a6935bb11a4bbadd1f95e3441069b7074a0b68ab22506b4ee4`, postreceipt SHA `9befe64829bf9c79fb7e0505fe1db83a5edf676ce1f4c22a7073ca3cd7a6160e`. RED thực chứng cho near-bottom fish-only false-BL-anchor vẫn `MEDIUM NOT_FIXED / HOLD` (không đưa heuristic không đủ provenance vào bản chính). [Báo cáo nguồn/bằng chứng P05+P06](./reports/continuation-2026-11-16-photo-p05-p06-bounded.md). **Phase 6 F1 gốc vẫn OPEN; 65 claims, firmware, hardware, media rights, release HOLD.**

**V50 independent native Windows viewport and focus QA
(2026-10-19; QA-only, Phase 6 OPEN):** Canonical V49 final/postreceipt
and 37/37 runtime SHA were pinned before the V50 staging copy.
No runtime source, reducer, LCD, settings or replay changes were made.
Using the secondary physical 1920×1080 Windows screen, a test-owned
headed Chrome window was resized without viewport emulation. Real
Win32 HWND/owner PID, page inner size and screenshot pixel dimensions
confirmed **1366×768** normal and **1920×1080** fullscreen browser
content. Independent staged/canonical V4 runs each passed **28/28
native-window checks, 70/70 actually loaded localhost response-body
SHA and 2/2 screenshot SHA**. Original V1 context-argument FAIL and
V3 HWND title-race PARTIAL were retained; V4 uses stable HWND/PID.
Both staged/canonical Node targeted **14/14**, full **511/511**,
Python **13/13** PASS. A real two-owned-window foreground change
during simulated POWER hold still failed to produce a Chrome
window.blur event; this remains **NOT_RUN**, not a product failure.
Actual CoS Desktop-attached exact viewports and Narrator/NVDA spoken
output also remain **NOT_RUN**. See [V50 integration](./reports/2026-10-19-v50-native-win32-viewports-and-focus.md)
and [Windows native QA](../../docs/qa/FCV588_V50_WINDOWS_NATIVE_VIEWPORT_PARTIAL_20261019.md).
**Phase6 OPEN, 65/65 claims HOLD, checklist 14/50, tasks 6/22,
firmware UNKNOWN, OEM rights/release HOLD, hardwareValidated=false.**

**V49 D15 accessibility source-bounded correction and Windows Chrome
QA (2026-10-19, Phase 6 OPEN):** A real Chrome DOM probe showed broad
live-region mutation churn during 250-ms BRILL preview updates in D15.
V49 changes only `web/index.html` and `web/app.mjs` among 37 runtime
sources, replacing the full-timer `role=status` guidance block with
a non-live visual group and one separate hidden semantic-title-only
polite announcer. The display countdown remains visible and interactive;
LCD, physical controls, sonar observations, reducer, palette, profile21
and session/replay are unchanged. Two test files (one revised, one new)
enforce the boundary. Independent TDD source-valid RED **2/4** became
focused GREEN **29/29**. An initial staged full Node **508/511**
failure came from exactly three omitted internal Markdown fixtures;
after verified text-only fixture restoration, staging/canonical full
Node **511/511** and Python **13/13** PASS. Independent staged/canonical
Chrome each **69/69 assertions, 105/105 actually loaded localhost
response-body SHA and 6/6 PNG SHA** across three isolated viewports.
Canonical targeted **29/29**, HTTP negative routes **4/4 denied**.
Native CoS attached Chrome at actual **1912×970** confirmed D15
separation, localhost **35/35 HTTP200** and zero console errors, but
neither exact attached 1366×768/1920×1080 nor real Narrator/NVDA speech
was established. Read the [V49 integration report](./reports/2026-10-19-v49-d15-live-region-integration.md)
and [attached Desktop partial](../../docs/qa/FCV588_V49_DESKTOP_MANUAL_PARTIAL_20261019.md).
**Phase 6 OPEN, 65/65 claims HOLD, checklist 14/50, named tasks 6/22,
firmware UNKNOWN, OEM rights/release HOLD, hardwareValidated=false.**

**V48 Phase 6 cross-ledger and genuine Windows focus audit
(2026-10-19; NOT full Phase 6 acceptance):** With canonical V47
final/postreceipt SHA read back and 37/37 runtime source SHA pinned,
V48 adds only one three-case test file enforcing 65 feature identities
across draft register, public trace and implementation ledger; 64 FCV
operator features stay separate from instructor D15. It also checks
full per-feature source/rights/scope correlation, B07 firmware/source
HOLD and no false course/hardware promotion. Original isolated-stage
test-harness/environment failures were preserved and diagnosed,
followed by stage targeted Node **16/16 PASS**. One read-only gated
canonical test-only apply produced targeted Node **16/16**, full Node
**507/507** and Python **13/13** PASS; **0/37 runtime files changed**.
A test-owned two-window Win32 diagnostic saw distinct HWNDs but
`window.blur` count stayed 0 and page A still had focus; the
prerequisite is **NOT_RUN**, not a simulator success or defect.
Original foreground was restored and owned browsers closed.
No new V48 Chrome UI run was claimed. See
[V48 integrated QA](./reports/2026-10-19-v48-phase6-claim-focus-audit.md).
**Phase 6 OPEN, 65/65 claims HOLD, 14/50 checklist, 6/22
tasks, firmware UNKNOWN, OEM rights/release HOLD,
hardwareValidated=false.**

**V47 FURUNO White Marker firmware/source D15 milestone
(2026-10-19, Phase 6 OPEN):** Operator manual OME-23890-E §1.22
defines choosing an echo color on the color bar, using Up/Down and
ENTER, and Off to disable. Manufacturer software history says
White Marker settings changed in v2.01, but does not identify the
installed FCV-588 firmware or confirm the classroom
`Off/White/Gray` menu enum. V47 therefore **does not change
reducer, choices, palette RGB, session/replay/schema or profile21**.
It flags `sounder.whiteMarker` with
`TRAINING_WHITE_MARKER_PREVIEW_FIRMWARE_UNKNOWN` and adds a
source-specific D15 instructor caveat **outside the LCD/face**.
Only **2/37 runtime files changed** from V46; **35/37** are
byte-identical. One new seven-case test, static metadata B07-only
note/grade, and V47 source atlas support the bounded correction.
Original source-valid RED **2/7 PASS, 5/7 FAIL**, focused GREEN
**7/7**, targeted stage/canonical **48/48**, full Node stage/canonical
**504/504** and Python **13/13**. Stage and canonical independent
Chrome each **126/126 assertions, 210/210 actually loaded localhost
response-body SHA and 12/12 screenshots SHA** over six viewports.
Original harness/metadata targeting mistakes, original failed
Chrome V1 matcher and early canonical apply preflight errors are
preserved as FAIL/STOP evidence, not counted as product defects or
PASS. Scoped canonical apply used a read-only preflight that
verified 37 runtime source preimages, six allowlisted files and B07
only; canonical 37/37 source SHA matched postcopy. Canonical HTTP
security negatives **4/4 denied**. A real CoS Desktop Chrome at
**1912×970** observed White Marker/D15 and replay but did not
certify actual OEM pixels, screen-reader spoken output or attached
exact target viewports. See [V47 integrated report](./reports/2026-10-19-v47-white-marker-integration.md),
[V47 source atlas](../../docs/research/FCV588_V47_WHITE_MARKER_FIRMWARE_SOURCE_ATLAS_20261019.md),
and [V47 partial Desktop QA](../../docs/qa/FCV588_V47_DESKTOP_MANUAL_PARTIAL_20261019.md).
**Phase6 OPEN, 65/65 claims HOLD, checklist 14/50,
6/22 named tasks accepted, hardwareValidated=false,
firmwareInstalled=UNKNOWN, OEM rights and releaseApproval=HOLD.**

**V46 manufacturer Colors literal and D15 source-cue milestone
(2026-10-19; Phase 6 OPEN):** FURUNO FCV588/628 Software History
v2.01 (September 2016) names **Display > Colors**, with 8/16 options.
V45 training LCD printed `Colors · SIM`; the appended teacher
suffix was not an OEM literal. V46 uses **Colors** on the operator
menu and discloses the independently authored training 8/16
palette and **firmwareInstalled=UNKNOWN** specifically in D15
outside the instrument face. Only **2 of 37 runtime sources**
changed, the other **35/37 retain exact V45 SHA**, no reducer,
settings, replay/schema, geometry or other operator menu change.
Stage independent source RED **2/6 PASS, 4/6 FAIL** (after preserving
an initial new test-harness error); GREEN **6/6**, then stage full
Node initially **496/497** because an old B19 test demanded `SIM`
on the LCD. That original failure was retained and the B19 test was
updated to enforce both exact OEM operator label and the separate
D15 provenance cue. Stage/canonical targeted Node **45/45**, full
Node **497/497**, Python **13/13**, independent Chrome six-viewport
**126/126 assertions and 210/210 actually loaded browser body
SHA each**, with **12/12 new screenshots each**. Canonical HTTP
security negative routes **4/4 denied**. An actual attached CoS
Desktop Chrome tab measured **1912×970** and observed `▶ Colors`
with source status/teacher warning outside the face; this does not
prove exact native resized 1366×768/1920×1080 or screen-reader
spoken output. Official software history still does not prove an
installed v2.01 firmware, authorize White Marker colorimetry or
an R&D System Echo operator menu. See [V46 integration](./reports/2026-10-19-v46-colors-d15-integration.md),
[V46 source atlas](../../docs/research/FCV588_V46_COLORS_FIRMWARE_SOURCE_ATLAS_20261019.md),
and [native Desktop partial QA](../../docs/qa/FCV588_V46_DESKTOP_MANUAL_PARTIAL_20261019.md).
**Phase 6 OPEN, 65/65 claims HOLD, checklist 14/50,
named tasks 6/22, hardwareValidated=false,
firmwareInstalled=UNKNOWN, releaseApproval=HOLD.**

**V45 Windows/native input and public firmware evidence checkpoint
(2026-10-19; Phase 6 OPEN):** The official FURUNO FCV588/628
software history identifies v1.05 initial and v2.01 (September 2016)
Display colors / White Marker / R&D Echo changes, but **does not**
identify installed firmware on any classroom or vessel unit. A
bounded two-window headed-Chrome Windows test observed a genuine
foreground HWND switch but **zero window.blur callbacks** and retained
`document.hasFocus() === true`; therefore the native OS-window-blur
gate remains **NOT_RUN**, not product PASS or FAIL. The original
failed prerequisite receipt is preserved. A separate real Chromium
keyboard/Tab, pointer capture release and CDP touch-cancel test
completed staging/canonical browser runs, **96/96 trusted input
assertions each**, **140/140 browser-loaded response-body SHA each**
and **8 independently SHA-checked training PNGs each** across four
isolated viewports. The initial staging harness event-count mismatch
(independent 250-ms UI ticks) and subsequent expired localhost QA
server were preserved as distinct STOP evidence; V2 reruns were
source-bound and named separately. Staging and canonical full Node
**491/491 PASS** and Python **13/13 PASS**; canonical HTTP negatives
**4/4 denied**. No runtime, profile, schema, LCD/face or sensor
interface was changed: **37/37 runtime files match V44 SHA**.
Read [V45 integration](./reports/2026-10-19-v45-native-input-and-firmware-gates.md),
[V45 OEM/source atlas](../../docs/research/FCV588_V45_FIRMWARE_NATIVE_FOCUS_SOURCE_ATLAS_20261019.md)
and [partial Windows focus report](../../docs/qa/FCV588_V45_WINDOWS_FOCUS_GATE_PARTIAL_20261019.md).
Actual Narrator/NVDA spoken output, native CoS Desktop exact
1366×768/1920×1080 and real window.blur while holding a key remain
**NOT_RUN**. **Phase 6 OPEN, all 65 claims HOLD, checklist 14/50,
named tasks 6/22, firmwareInstalled=UNKNOWN,
hardwareValidated=false, releaseApproval=HOLD.**

**V44 BRILL × TrackPad source-bound TEST-ONLY milestone (2026-10-19;
Phase 6 OPEN):** FURUNO OME-23890-E §1.3 supports left/right
TrackPad brightness adjustment but does not specify the repeated-BRILL
sweep direction after mixed TrackPad input or Up/Down meaning in the
Brill modal. **No reducer/profile/UI runtime change** was approved.
Exactly one new seven-test Node suite and one research atlas were
integrated; all **37/37 runtime source SHA remain byte-identical to
V43**, with profile21 unchanged. A controlled staging timer mutant
was detected as six focused test failures, and original source SHA
was restored before successful staged **491/491 Node and 13/13 Python**.
Separate staged and canonical Chrome each passed **114/114 assertions**,
**210/210 actually loaded HTTP response SHA** and **12 SHA-pinned
images** at six viewports. Canonical targeted Node **13/13**, full
Node **491/491**, Python **13/13**, HTTP security **4/4 denied**.
CoS Desktop at observed **1912×970** showed real mixed button/TrackPad
inputs and replay; delayed ENTER after timeout was NOT counted.
See [V44 integration](./reports/2026-10-19-v44-integrated-brill-pad-qa.md),
[V44 source atlas](../../docs/research/FCV588_V44_BRILL_PAD_SOURCE_ATLAS_20261019.md),
and [native Desktop partial QA](../../docs/qa/FCV588_V44_DESKTOP_MANUAL_PARTIAL_20261019.md).
Native exact 1366×768/1920×1080, real speech screen reader, OS-window
blur, installed firmware, OEM geometry and rights remain NOT_RUN/HOLD.
**Phase 6 OPEN; 65/65 claims HOLD, checklist 14/50 and 6/22 named
tasks unchanged, hardwareValidated=false, releaseApproval=HOLD.**

**V43 source-bounded OEM BRILL behavior checkpoint (2026-10-19; Phase 6 OPEN):**
FURUNO OME-23890-E §1.3 describes a BRILL sequence that reverses at 9 and 0.
V42 training modulo logic incorrectly staged 9→0; V43 now stages 9→8
and continues downward before rising, while preserving the UI timer,
MENU/ESC, ENTER, POWER hold cancellation and world clock separation.
Profile advances from F1-public-reference-20 to 21 to prevent historical
event replay/settings being silently reinterpreted. D15 LEARN-07 instructor
notes now grade 9→8, always outside the OEM face. Only **4 of 37 runtime
sources changed** from V42; original verified logs, source hashes and
canonical V42 receipts remain preserved. After diagnosed and documented
harness-import, metadata and manifest-format STOP events, staged and canonical
Node **484/484**, Python **13/13**, isolated Chrome **102/102 per run**,
actual loaded browser body SHA **245/245 per run** and 12 screenshots
per run passed. Canonical targeted Node **66/66** and HTTP negative
routes **4/4 denied**. See [V43 integrated report](./reports/2026-10-19-v43-integrated-brill-cycle.md)
and [V43 OEM source atlas](../../docs/research/FCV588_V43_OEM_BRILL_SOURCE_ATLAS_20261019.md).
Actual OS-window blur, native CoS Desktop exact viewport gates,
Narrator/NVDA spoken output, OEM geometry/font, installed firmware and media
rights remain NOT_RUN/HOLD. **Phase 6 OPEN, 65/65 claims HOLD, 14/50
checklist and 6/22 tasks unchanged, hardwareValidated=false,
releaseApproval=HOLD.** These are training software results only.
**V42 source-bounded MODE title checkpoint (2026-10-19; Phase 6
still OPEN):** FURUNO OME-23890-E §1.4 shows a MODE selection-window
heading MODE, while V41 independently projected MODE SELECT. After
preserving the original focused RED (2 PASS / 1 FAIL), V42 corrected
**one literal** in the read-only web/lcd-control-presentation.mjs;
all other 36 runtime files were unchanged from V41 (37/37 source SHA).
Stage focused tests **3/3 GREEN**, full Node **478/478**, Python
**13/13** after source-verified staging-only restoration of exactly
16 historical V27/V28 original training PNG fixtures. The initial
Python fixture failure log and GPT-6 narrow GO remain immutable.
Stage and canonical isolated Chrome each achieved **120/120
assertions**, **210/210 loaded HTTP response body SHA** and **12/12
PNG SHA** at 320×720, 375×812, 768×1024, 1366×768, 1440×900
and 1920×1080. Canonical targeted Node **16/16**, full Node
**478/478**, Python **13/13** and HTTP denial checks **4/4**
passed before postdocument final readback. A CoS Desktop attached
Chrome tab measured **1912×970** and observed MODE with seven
options, 35 local HTTP200 requests, zero console errors and actual
keyboard MODE/ESC actions; a delayed Escape after timeout was **not**
credited as cancellation. A separate immediate HF draft was
canceled with Escape, preserving committed DUAL. Read
[V42 integration](./reports/2026-10-19-v42-integrated-mode-title.md),
[V42 source atlas](../../docs/research/FCV588_V42_MODE_RANGE_BRILL_DISPLAY_SYSTEM_SOURCE_ATLAS_20261019.md)
and [actual Desktop partial audit](../../docs/qa/FCV588_V42_DESKTOP_MANUAL_PARTIAL_20261019.md).
Native exact 1366×768/1920×1080 CoS Desktop, actual
Narrator/NVDA speech, genuine OS-window blur, target firmware
identity, OEM pixels and media reuse rights are **NOT_RUN/HOLD**.
**Phase 6 OPEN, 65/65 claims HOLD, 14/50 checklist and 6/22
named tasks unchanged, hardwareValidated=false,
releaseApproval=HOLD.** Browser test count is not OEM similarity.
**V41 Sounder menu text-fidelity checkpoint (2026-10-18; Phase 6 OPEN):**
A previously observed FCV-588 Sounder menu photograph shows two
short operator literals, `Pic. Advance` and `Interference`, whereas
V40 used the expanded `Picture Advance` and `Interference Rejection`.
These two strings were verified RED (2/4 focused assertions failed),
then corrected in exactly one runtime source file,
`src/devices/fcv588/menu-atlas.mjs`. Only two matching atlas JSON
records and one new four-test file accompany that code change.
The staged full Node suite initially failed twice at document links
omitted from the isolated staging copy, not at product behavior;
both original failure logs are preserved. With read-only fixture
dependencies restored, staged **475/475 Node and 13/13 Python PASS**.
Stage and canonical isolated Chrome each passed **90/90 assertions,
210/210 HTTP response-body SHA and 12/12 new PNG SHA** on six
viewports. Canonical targeted **18/18**, full **475/475 Node**,
Python **13/13**, HTTP negative routes **4/4 denied** and runtime
**37/37 SHA** (36 unchanged versus V40) have passed before the
postdocument final gate. Actual CoS Desktop Chrome observed the
new Sounder rows and keyboard Enter/Escape at **1912×970**, with
35 local HTTP 200 requests and no console errors; required native
1366×768 and 1920×1080 windows, spoken Narrator/NVDA and genuine
OS-window blur remain NOT_RUN. See
[V41 source atlas](../../docs/research/FCV588_V41_SOUNDER_MENU_SOURCE_ATLAS_20261018.md),
[integration report](./reports/2026-10-18-v41-integrated-sounder-labels.md),
[GPT-6 narrow GO](./reports/2026-10-18-v41-gpt6-sounder-labels-go.md)
and [Desktop partial evidence](../../docs/qa/FCV588_V41_DESKTOP_MANUAL_PARTIAL_20261018.md).
**Source media reuse rights, exact firmware and pixel geometry remain
HOLD; 65/65 claims HOLD, checklist 14/50 and named tasks 6/22
unchanged, `hardwareValidated=false` and `releaseApproval=HOLD`.**
Test counts are not an OEM likeness percentage.

**V40 OEM-sourced operator label checkpoint (2026-10-18; Phase 6
still OPEN):** The manual OME-23890-E §1.1 calls control 1
`MENU/ESC`; V39 independently drawn face printed `MENUESC`.
An initial test-matcher error was preserved as STOP; the repaired test
then verified the actual `MENUESC` versus `MENU/ESC` RED.
GPT-6 approved precisely **one `web/index.html` label correction
plus one new test**, with no CSS/LCD/reducer changes. Canonical
Node **471/471**, targeted **28/28**, Python **13/13** passed;
staged and canonical isolated Chrome each passed **84/84 assertions
across 6 viewport contexts**, **210/210 actually loaded browser
response SHA** and **12/12 independent PNG SHA**. Canonical
HTTP 4/4 denied routes and 37/37 runtime SHA match the V40
manifest (36 unchanged assets, one HTML edit). The actual
CoS Desktop session attached before reload at **1912×970**
recorded the new accessible control name, 35 local HTTP 200
requests and zero errors; exact attached Desktop viewports and
spoken Narrator/NVDA remain NOT_RUN. The separate, independently
written [V40 OEM source atlas](../../docs/research/FCV588_V40_OEM_FRONT_PANEL_SOURCE_ATLAS_20261018.md)
holds physical geometry, fonts, menu pixels, installed firmware
and copyrighted OEM media reuse unverified. Read
[V40 integrated report](./reports/2026-10-18-v40-integrated-oem-menu-esc.md),
[GPT-6 bounded GO](./reports/2026-10-18-v40-gpt6-oem-menu-esc-go.md),
and [actual Desktop partial audit](../../docs/qa/FCV588_V40_DESKTOP_MANUAL_PARTIAL_20261018.md).
**65/65 claims HOLD; 14/50 checklist and 6/22 named tasks remain
at checkpoint; `releaseApproval=HOLD`.** Test counts are not an
OEM likeness score.

**V39 scoped C11/D09/D14 test-only milestone (2026-10-18; Phase 6 OPEN):**
Seven new cross-session regression vectors extend the canonical
Delete All WPT/active-destination/power-suspended confirmation,
monotonic waypoint ID, Own/NMEA draft cancellation, virtual
Tankenmaru revoke/regrant, and explicit profile19 settings import
without replay migration, hardware grant or external receiver.
Exactly **one new test file** was integrated; all **37/37 runtime
source SHA remain the V38/V36 baseline**, and 23 `src` modules
are unchanged. Isolated staging **7/7**, combined V37–V39 **18/18**,
canonical **469/469 Node and 13/13 Python PASS** before final
documentation/postcheck. A proposed staging mutation was tool-blocked
before executing and is NOT_RUN, not a mutation PASS.
A separate headless Chrome tab-switch experiment failed at the
browser prerequisite `window.blur`, so no application blur
assertion or actual Windows OS-window focus-loss PASS exists;
Narrator/NVDA speech and exact attached CoS Desktop viewport gates
remain NOT_RUN. Fresh official [FURUNO source and terms recheck](./reports/2026-10-18-v39-furuno-source-rights-recheck.md)
does not supply installed firmware or rights to copy OEM artwork.
See [V39 integrated report](./reports/2026-10-18-v39-integrated-cross-session-tdd.md),
[GPT-6 GO/NO-GO](./reports/2026-10-18-v39-gpt6-gates-go-no-go.md)
and [Phase 6 browser/speech audit](../../docs/qa/FCV588_V39_PHASE6_BROWSER_SPEECH_20261018.md).
**65/65 claims HOLD; checklist 14/50, named tasks 6/22 and
`releaseApproval=HOLD` unchanged.**

**V38 integrated test-only checkpoint (2026-10-18; Phase 6 remains OPEN):**
Seven additional C11/D09/D14 waypoint, source and option negative
vectors were introduced in exactly one new canonical test file, after
source-pinned staging 7/7 PASS, one intentional destination-deletion
guard mutation RED (6 PASS/1 expected FAIL), exact stage byte
restoration and 7/7 PASS again. Canonical Node **462/462** and Python
**13/13** passed; all **37 runtime assets** remain byte-identical to
V37/V36. One new Playwright Chrome runner verified **1366×768 and
1920×1080** with **34/34** assertions, **70/70 actual browser response
SHA** and six PNG screenshot hashes, but these two exact dimensions
belong to isolated Chrome contexts, **not** the live CoS Desktop
resize/attachment requirement. The original Chrome harness RED (MENU
before POWER) and its distinct GPT-6 GO/second-run evidence are
preserved. The attached Desktop browser stayed **1912×970** and a
resize attempt was tool-blocked before execution. Real Narrator/NVDA
speech and OS blur remain NOT_RUN. Read the
[integrated V38 report](./reports/2026-10-18-v38-integrated-waypoint-source-qa.md),
[narrow GPT-6 decision](./reports/2026-10-18-v38-gpt6-test-only-go.md) and
[V38 split browser evidence](../../docs/qa/FCV588_V38_BROWSER_AND_A11Y_20261018.md).
**65/65 claims and release HOLD, 14/50 checklist, 6/22 tasks unchanged.**

**V37 scoped test-only checkpoint (2026-10-18; Phase 6 remains OPEN):**
Canonical V36 remains the frozen runtime baseline at **37/37 source SHA**;
one new `test/fcv588-v37-negative-vectors.test.mjs` file adds four
source-bounded C11/D09/D14 negative integration tests, no reducer or
product edits. Their staged 4/4 PASS was challenged with an intentional
receiver transport mutant, which caused two expected failures, then the
original stage source was restored byte-identically and 4/4 returned to PASS.
GPT-6 authorized only the test-file integration in
[V37 test-only GO decision](./reports/2026-10-18-v37-gpt6-test-only-go.md).
Canonical targeted Node 4/4, full Node **455/455**, and Python **13/13**
passed. The independent
[actual CoS Desktop V37 browser session](../../docs/qa/FCV588_V37_MANUAL_BROWSER_20261018.md)
was attached before reload and verified scoped real keyboard/teacher
interactions at **1912×970**, 35 local HTTP 200 requests and zero
JavaScript errors. This is distinct from **37** pinned runtime assets;
the browser didn't exercise mandatory exact 1366×768/1920×1080
attached-session viewports or actual screen-reader speech.
Manufacturer [V37 per-claim source/rights review](./reports/2026-10-18-v37-c11-d09-d14-source-rights-review.md)
preserves firmware/OEM rights uncertainties. V36 historical 639/639 Chrome
assertions and 121 SHA-matched images are historical, **not new V37 reruns**.
No 65-claim, 14/50 checklist or 6/22 task-status promotion,
no hardware validation and **no release**.

**Latest executed technical checkpoint — canonical V36 (2026-10-18):**
The user-authorized GPT-6 supervision flow continued the V35 D15
source matrix with accessibility/readability improvements **only
outside the FCV-588 face**. Instructor copy now measures 13–16px in
six roles, scales at 200% root font size without horizontal overflow
at 320px, and has three named accessible h4 articles plus a discrete
polite live status. Contrast measured at least 8.4:1; no extra
training prose was painted onto the LCD. A four-web-file patch
preserves all 23/23 core modules.
Canonical QA completed **451/451 Node, 13/13 Python, 189/189 new
V36 Chrome, 330/330 prior-V34 compatibility Chrome and 120/120
V35 D15 journey Chrome** on seven or five viewports per runner;
**121/121 screenshot SHA, 37/37 source/HTTP SHA and 4/4 denied routes**.
This proves scoped offline software and accessibility DOM contracts,
**not NVDA/VoiceOver spoken output, Phase 6 manual attach gate, OEM
hardware identity, rights clearance or release**. Checklist 14/50,
named tasks 6/22 and all 65 public claims HOLD have not been
automatically promoted. See [executed V36 QA report](./reports/2026-10-18-v36-integrated-d15-accessibility.md)
and [GPT-6 pre-integration decision](./reports/2026-10-18-v36-gpt6-a11y-integration-go.md).

**Latest executed technical checkpoint — canonical V35 (2026-10-18):**
Following the explicit user-approved GPT-6 supervision substitution,
the original V31-QA-01 Auto/Manual fixture was repaired test-only and
targeted Verify reached 53/53 PASS. V34's external instructor/LCD
presentation was integrated; V35 added a pure read-only C11/D09/D14
source/waypoint/virtual-option matrix only in D15.
Canonical V35 software verification: **442/442 Node, 13/13 Python,
120/120 dedicated Chrome and 330/330 backward-compatible Chrome**
across five viewports, **100/100 screenshot SHA, 37/37 source/HTTP SHA,
4/4 denied routes**. The actual applied V35 patch changed four web
files; all 23 core modules remain unchanged. Original failed logs
and historical V31/V32/V33/V34 evidence remain preserved.
This is software QA, **not** manufacturer firmware/device validation;
the public-reference claim ceiling, all 65 claim HOLDs, asset rights
and no-release/no-hardware restrictions remain. The 14/50 checklist
and 6/22 named-task acceptance totals are not automatically promoted.
See [V35 integration and QA checkpoint](./reports/2026-10-18-v35-integrated-c11-d09-d14-source-matrix.md).

**Effective supervision amendment (2026-10-18):** The user explicitly
approved GPT-6 self-supervision, requesting Extra High reasoning, in place
of the previously required Kongming advisor for this FCV-588 F1 v2 plan.
The historically failed `V31-QA-01` Verify and original Failure Protocol
remain preserved; from this date follow the evidence-backed STOP / GPT-6
go-no-go / targeted re-Verify procedure documented in
[the user-approved supervision amendment](./reports/2026-10-18-gpt6-supervision-amendment.md).
This authorizes diagnosis and a minimal test-fixture correction, **not**
implicit hardware certification, release, Git publication, or an assertion
that the original Kongming invocation happened.

**Latest implementation — V31 (2026-10-16), scoped evidence and Verify HOLD:**
Canonical System/Installation and POWER-suspended option transactions now cancel
invalid drafts; live Display capability loss uses the same reconciliation. Alarm
profile notices identify the right field. BRILL adjustment resets its recorded
inactivity timer; Range/Gain/BRILL/MODE have compact current/pending LCD feedback.
Teacher reset preserves stored preferences across the tested non-setting key.
Profile20 is explicit: settings18/core7/event5/replay7/scenario7/multi4 retained;
old profile19 replay rejects and validated committed settings have a separate
import path that does not rewrite startup storage. White Line stays Off/On.
Actual state RED20 fails/7 passes became targeted42/42. Native operator Chrome
RED56 fails/228 passes became284/284, with12 opened current images and35-file
runtime SHA `eed901f4d12c4f7e61ff1825b3898c412428cd8c4210c1f2d5b14050503dbe36`.
The latest targeted Node check is52/53: a new Auto fixture incorrectly expects
a Manual preset conversion. That fixture is unchanged under the Failure
Protocol; Kongming was discovered by name but not verifiably invoked. Full
Node/Python/previous full Chrome V31 regressions are NOT_EXECUTED, not PASS.
The V30 ledger/link omissions are now written and read back; their original
blocked operation remains NOT_EXECUTED. Acceptance remains14/50 and6/22,
all65 claims/release HOLD. Read [V31 implementation](./reports/continuation-2026-10-16-v31-transactions-controls.md),
[all50/22 assessment](./reports/v31-checklist-review.md) and
[the open Verify/counsel packet](./reports/v31-failure-counsel-packet.md).

**Historical executed checkpoint — V30 (2026-10-16), known findings and release HOLD:**
V29's nine pending images and receipt/source reconciliation are completed in
a separate new authorized record; its historical blocked command remains
NOT_EXECUTED. V30 integrates eight nested configuration families, separates
stored/draft/choice/help, fixes desktop lesson overflow and effective alarm
Off/ACK presentation without modifying any src bytes or data contracts.
Post-review Node370/370, configuration Chrome264/264, FUNC76/76, LCD68/68
and all four full Chrome contexts passed. All53 current images were opened;
five receipts and current loopback bytes share34-file SHA
`99097efbccc12d8538a041643f22b22d268dadb3e24d9ec9acbc6f718d4c1117`.
Independent static review A/C/D is closed; canonical option-draft revoke/regrant
finding B and alarm notice-label finding E remain OPEN. No phase/claim/rights
promotion:14/50 checked,6/22 accepted, only Phase1 accepted, all65 claims HOLD.
White Line remains Off/On. See [V30 implementation](./reports/continuation-2026-10-16-v30-integrated-configuration.md)
and [review of all50 checklist entries and22 Tasks](./reports/v30-checklist-review.md).

**Historical V29 implementation record (2026-10-16; reconciliation later completed in V30):**
FUNC high-value choices now remain visible through a seven-choice projection
shared with the main menu; help stays separate and visible on mobile. Actual
Chrome RED20 failed assertions/56 baseline passes became76/76 GREEN.
Node347/347, Python13/13, LCD68/68 and both full Chrome runners passed.
Twenty targeted GREEN screenshots were opened; nine full-suite shots remain
unreviewed. A supplemental receipt/SHA aggregation was tool-blocked before
execution and not retried. No final reconciliation or phase/claim promotion.
White Line numeric/Edge remains SOURCE_GAP; boolean meaning and all behavioral
versions are unchanged. Acceptance stays14/50 and6/22, all65 claims/release HOLD.
See [V29 evidence and stop boundary](./reports/continuation-2026-10-16-v29-func-white-line-source-gate.md).

**Historical reconciled checkpoint — V28 (2026-10-15), not phase completion:**
Three actual manufacturer gallery observations now underpin qualitative
pedestal/display-surround, depth-position, vertical-legend and picture-rate
corrections. The top depth-scale label also has a separate painter-level
RED→GREEN correction. Node342/342, Python13/13, reference FINAL54/54,
LCD regression68/68 and four full Chrome viewports passed. New source/body/
harness-bound receipts and25 opened final screenshots are distinct from
V27 and the intermediate V28 GREEN. Geometry remains a measured simulator
baseline, not hardware coordinates. No acceptance or behavior-version
promotion:14/50 checkboxes,6/22 named Tasks, Phase1 alone complete, all65
claims/release HOLD. See [V28 evidence](./reports/continuation-2026-10-15-v28-official-visual-reference.md).

**Historical executed checkpoint — V27 (2026-10-15), not phase completion:**
BRILL previews its staged value on the LCD; LCD Test renders actual original
test-color pixels; main-menu categories, semantic rows, active choices and
help/source explanations are separate. Actual Chrome TDD moved13 expected
display failures per viewport to17/17 per viewport (68/68). Full Node333/333,
Python browser-integrity7/7, atlas QA4/4 and all four full Chrome viewports
passed with source/body/harness identity. A normalized geometry atlas records
simulator measurements, not physical-device coordinates. No core/replay
semantics or acceptance checklist changed:14/50 checked,6/22 named Tasks,
only Phase1 fully done; all65 claims/release remain HOLD. See the
[V27 evidence report](./reports/continuation-2026-10-15-v27-lcd-menu.md).

**Historical executed checkpoint — V26 (2026-10-15), not phase completion:**
the original face now has a separate estimated head/support outline,
vertical RANGE/MARK/FUNC, a blank unpowered LCD, and canonical-state-derived
MODE/GAIN needles. Browser TDD observed 8 visual assertion failures before
the fix and 12/12 passing afterward. Full Node 326/326, Python integrity 7/7
and all four required Chrome viewports passed, with source/body/harness
identity recorded in the actual V26 receipts. A separate final aggregate
SHA command was blocked before execution and is not an extra PASS.
No source/rights/reviewer claim was promoted: 6/22 named Tasks, 14/50
checkboxes (28%), Phase1 alone fully done, all 65 claims/release HOLD.
The phase-table narratives and validation logs below retain their historical
checkpoints; see the [V26 evidence report](./reports/continuation-2026-10-15-v26-panel-projection.md)
for current scope, exact hashes and remaining acceptance limitations.

**Scope mode: HOLD SCOPE.** This is a replacement execution plan for the FCV-588 operator-training portion of MoPhongMayTrenTau. It uses the existing F0 code, manual and evidence archive. It does not demand classroom hardware, front photos, Diagnostics, installed firmware, or a transducer as development prerequisites. Do not implement an AIS R5 UI before SOLID/SUPREME identity is known.

**Previous plan preserved for audit:** [Public-reference v1](../261013-1428-fcv588-public-reference-complete-operator/plan.md). The older [hardware-target plan](../261013-1319-fcv588-full-fidelity-simulator/plan.md) remains separately deferred. Neither is erased or declared completed. This v2 plan is the proposed next execution authority; 0 implementation tasks in this v2 are completed at creation.

**Intended product:** Offline Windows / localhost browser with an independently authored FCV-588-shaped control face, native portrait 480 x 640 display, correct control sequences and menu paths, simulated sounder/display, alarms, navigation, waypoints, System Demo, diagnostics and instructor lesson/replay. Future devices each get independent model-specific reducers and observations from a shared world.

**Source authority:** [Public source notes](../../docs/research/FCV588_PUBLIC_MEDIA_EVIDENCE_2026-10-13.md), [14-area UI matrix](../../docs/research/FCV588_PUBLIC_UI_REFERENCE_MATRIX_2026-10-14.md), [11-source machine-readable ledger](../../docs/evidence/fcv588-public-evidence-ledger.json), [65-row inventory](../../docs/research/FCV588_FULL_FUNCTION_INVENTORY_2026-10-13.md), [feature register](../../docs/research/FCV588_FEATURE_REGISTER_DRAFT.json), [manual manifest](../../sources/manuals/MANIFEST.json), [F0 architecture decision](../../docs/decisions/ADR-0001.md), [Phase 1 code/evidence scout](./reports/phase-01-scout.md).

Official source links: [FURUNO FCV-588 product/spec](https://www.furuno.com/en/products/fishfinder/fcv-588/index.html), [FURUNO USA transducer support](https://www.furunousa.com/en/support/FCV588), [operator manual OME-23890-E](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf), [software history](https://www.furunousa.com/-/media/sites/furuno/software_library/software/software/fcv588-628_software_history.pdf). Manual belongs to reference archive, NOT simulator assets; do not run new extraction/AI processing of restricted bytes without rights clearance.

**Evidence and release ceiling:** profileClass=PUBLIC_REFERENCE, claimCeiling=PUBLIC_REFERENCE_CONFORMANT, hardwareValidated=false, firmwareInstalled=null, realSensorOutputs=[], assetLicenseClearance=false. Training flows are graded against public documentation plus independently observed video frames only when documented; no OEM/pixel-identical, tactile, firmware, sonar-physics or individual-unit equivalence claim. Every unsupported feature/guard carries SOURCE_GAP, CONFLICT_HOLD or RIGHTS_HOLD, not a guessed PASS.

**Important source distinctions:** System -> Demo On supplies synthetic echoes and leaves controls operative, but capability choices remain separately guarded. Generic Transducer menu Type=[600W]/[1kW] is NOT a named compatible 600W transducer: ACCU-FISH, RezBoost and Bottom Discrimination are inoperative under those generic types. The optional virtual 525STID-PWD fixture needs BDS depth 5-100 m, speed <=10 kn, Auto Range, entered draft and compatible aligned mount. Eight Picture Advance settings are 4x,2x,1x,1/2,1/4,1/8,1/16,Stop. Within an ALARM1-5 fish alarm, multiple enabled conditions combine with AND. Installation §4.10 is separate from ordinary System menu; Tankenmaru On suppresses NMEA availability (simulation only). All 64 FCV operator rows and D15 teacher row remain separate.

## Execution Provenance — precise meaning of /ak-plan --deep --tdd --advice

- Installed ak-plan skill v2.2.2 and deep/advice references were actually read, and this plan follows their artifact contracts. This host does NOT expose the native /ak-plan slash dispatcher or a targetable kongming subagent. Therefore **do not claim literal native /ak-plan --deep --tdd --advice was executed or Kongming-supervised**.
- Native Windows AgentKit CLI ak 3.0.0-beta.17 WAS executed to create this new directory and append six phases. The CLI only scaffolds/validates; ak plan create --help offers NO deep/tdd/advice workflow flags.
- Deep adaptation: code/source scout before detailed Phase1, a new scout gate before each future phase, per-phase file inventory, dependency mapping, risks and scenario/test matrices.
- TDD adaptation: characterization first, RED assertion (never missing file, import or syntax error) for missing behavior, then GREEN and REFACTOR/regression; each task names exact commands and expected exits. Already-GREEN characterization tests are reused, not made artificially RED.
- Advice adaptation: per-task Goal/Target/Steps/Success/Verify plus a literal Failure Protocol in all seven phase files. If any unexpected Verify gate fails and Kongming is unavailable, STOP and report it; do not silently continue.
- Independent CoS reviewers are helpful red-team substitutes, **not** Kongming or a native invocation receipt. No task completion, deployment, Git init, push or release is authorized by the act of planning.

## Architecture and boundaries

Teacher/course controls -> browser gesture adapter -> FCV-specific state machine -> event-sourced session/replay -> shared world clock -> typed synthetic sonar observation -> device-only display projection -> original Canvas/DOM artwork. Device Gain/Range do not mutate raw world/sensor truth. TrackPad, separate ENTER and rotary/hold edges are distinct physical gestures; teacher helper +/- stays outside painted hardware. Other devices use separate reducers.

No serial, WebUSB, WebSerial, RF, GPS feeds, real NMEA transmitters, external vessel I/O or copied manufacturer interface binaries. Server serves only /web and /src on 127.0.0.1 with CSP connect-src none. Hash-based replay is for deterministic drift checking, NOT authentication.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Source and rights register, versioned Demo and virtual transducer profiles | P1 |
| 2 | Exact panel inputs, POWER/BRILL/MODE/RANGE/GAIN/VRM transitions | P1 |
| 3 | Versioned Sounder/Display/Alarm/Data/System menu atlas | P1 |
| 4 | LF/HF/DUAL/Zoom projections and guarded sonar functions | P1 |
| 5 | Alarm causality, NAV, waypoints, Demo and diagnostics | P1 |
| 6 | 64 FCV + D15 QA, browser/accessibility and release/rights audit | P1 |
| 7 | Future-model shared-world isolation and variant HOLD | P2 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Public evidence, rights, traceability and profiles](./phase-01-start.md) | **CLI checked: 10/10** |
| 2 | [Physical panel and controls](./phase-02-physical-panel-and-controls.md) | Key Beep and TrackPad training repeat now tested; physical fidelity and browser acceptance HOLD |
| 3 | [Menu atlas and configuration](./phase-03-menu-atlas-and-configuration.md) | D02 nested eight-slot training range bank and persistence tested; exact OEM atlas/fixture acceptance HOLD |
| 4 | [Sonar views and advanced options](./phase-04-sonar-views-and-advanced.md) | Synthetic features implemented in part; OEM matching/rights HOLD |
| 5 | [Alarms, NAV, Demo and diagnostics](./phase-05-alarms-nav-demo-diagnostics.md) | C05 Arrival, C13 Trip and D10 fault cues have targeted synthetic tests; complete operator/per-profile acceptance HOLD |
| 6 | [Reference conformance and classroom QA](./phase-06-conformance-classroom-qa.md) | 64+D15 checkpoint and partial Chrome smoke; required viewports/reviewer HOLD |
| 7 | [Shared world and future devices](./phase-07-shared-world-and-future-devices.md) | Multi-device inert subscriber/replay tests present; release gate HOLD |

## Dependency map and phase release gates

Phase 1 rights/profile -> Phase 2 corrected physical inputs -> Phase 3 complete menu state/installation options -> Phase 4 sounder image and option guards -> Phase 5 remaining operator flows -> Phase 6 claims/browser/course acceptance. Phase 7 is a regression-only architectural extension; it MUST NOT implement an unconfirmed AIS R5 display. Each phase STOPs on its own verification failure; require a successful preceding phase gate before starting the next.

## TDD / baseline debt

**Historical debt and verified resolution:** At plan creation the F0 reducer selected MODE immediately; Phase2 code now records a staged MODE selector and its UI-clock timeout, with regression tests. The previously recorded v1 documentation-regex failure at `test/public-reference-plan.test.mjs:95` and the later v2 plan-lifecycle assertion `pending` versus `in-progress` were corrected semantically, not bypassed. The historical full regression was **181/181 PASS**; the new observed `npm run check` reached **205/205 PASS, exit 0** on 2026-10-14 after C05/C13/D10/A17 and D02 eight-slot bank. These results establish software regression only, not manufacturer conformance. The tests and reports retain RED/GREEN provenance; later phases remain unaccepted.

## Success Criteria

- [ ] All 64 FCV operator rows plus added Appendix1/§4.10 nodes have source ID/section/rights/branch/guard/implementation and public-claim decision; D15 platform QA is separate and no hardware VERIFIED_IMPLEMENTED is forged.
- [ ] Manual-backed workflows and correct cancel/invalid-order/power/option branches pass deterministic tests against a frozen public reference profile. Generic types never enable incompatible advanced options.
- [ ] Original artwork, 480x640 logical screen, real keyboard/pointer/rotary/hold UI, timed dialogs, accessibility and browser smoke pass on observed Windows viewport(s). No video frame timestamps unless actually audited.
- [ ] F0 core/replay isolation and static server restriction remain effective; no real ship output. No protected source PDFs, ZIPs, image/video bytes enter the browser or distributable artifacts.
- [ ] Every RED/GREEN/REFACTOR and phase STOP gate has actual command output; explicit source HOLDs exclude only unsupported claims and do not block unrelated lessons.
- [ ] A public-reference course can be conditionally approved per completed lesson; HARDWARE_MATCHED_FIDELITY and OEM certification remain HOLD.

## Risks / open decisions

The real firmware/transducer and exact photo geometry remain UNKNOWN by user constraint; the public reference profile is an explicit pedagogical approximation. Rights for automated parsing and redistribution are not presumed from a public URL. Any browser screenshot/viewport tool unavailable is recorded NOT_RUN rather than promoted to PASS. Any conflict between official manual revision and observed video requires a source conflict hold. Future AIS R5 variant, J2000 identity and NS4000 software version are separate HOLDs.

## Validation Log

**Observed results (2026-10-14 continuation checkpoint):** `ak plan validate` returns `valid:true`; `ak plan parse` reports 7 phases, **50 checklist entries / 10 checked (20%)**, all Phase1, and 22 detailed `### Task` units. No later phase was artificially checked. `npm run check` reached **205/205 PASS, exit 0**, after profile `F1-public-reference-9`, settings schema v8, and D02 editable eight-slot Range bank; the pre-existing 56-test blocker remains resolved. Archive verifier: 24 PDFs + 2 ZIPs / 197171462 bytes, `validation_failures=[]`, three acquisition gaps. Trace, menu atlas and 64+D15 implementation generators all pass their `--check` gates, with **all release claims HOLD**. The coarse implementation rows are now **62 OPERABLE_SYNTHETIC_SUBSET (includes D15), 3 MENU_ONLY_PARTIAL, 0 NOT_IMPLEMENTED**, not per-feature manual conformance. Real attached Chrome smoke on profile9 at 1912×970 verified D02 edit, replay, reset and storage reload; 0 JS console errors, 24 localhost-only HTTP 200 requests. Required 1366×768 and 1920×1080 acceptance remain NOT_RUN. See [current evidence report](../../docs/reports/FCV588_PUBLIC_REFERENCE_ACCEPTANCE.md), [browser receipt](../../docs/qa/FCV588_PUBLIC_BROWSER_SMOKE.md) and [detailed continuation QA](./reports/continuation-2026-10-14-d02-browser-qa.md).

### New source-linked integration checkpoint — 2026-10-14 (V11)

The prior 205/205 checkpoint above is retained as historical evidence.
The current source revision **`F1-public-reference-11`** (scenario v7,
settings schema v10) completed a further bounded PUBLIC_REFERENCE pass:
`npm run check` **249/249 PASS**, plus source-manual layout and §2.5 Units
tests, C11 NAV box edit/cancel/replay, D15 score strictness, replay payload
immutability, feature-scoped public claim gates and a source-grade acceptance
generator. See [the V11 integration and QA evidence report](./reports/continuation-2026-10-14-v11-manual-and-chrome.md).

The local 88-page official manual OME-23890-E was consulted at actual PDF
pages 11–12 (§1.4), 34 (§2.2) and 35 (§2.5–2.6); rights-restricted
curated details are recorded in
[the V11 manual oracle review](../../docs/research/FCV588_MANUAL_ORACLE_REVIEW_2026-10-14.md).
The physical LCD still uses original Canvas/DOM/CSS artwork; no proprietary
pixels or assets entered the served runtime. Automated isolated Chrome QA
now observes **both target viewport sizes 1366×768 and 1920×1080 with
PASS** for bounded input/replay/persistence/MODE/POWER/D10/D15/C11
workflows, native Chromium touchCancel/lostpointercapture and localhost-only
requests; actual screenshots and receipt are
saved under `docs/qa/screenshots/` and
`docs/qa/FCV588_CHROME_VIEWPORT_V11_RECEIPT.json`.

The conservative 64+D15 status checkpoint is currently **61 synthetic
subsets (D15 included), 3 menu-only partial, 1 not implemented**;
every public acceptance claim remains **HOLD**. The plan still has only
Phase1's 10/50 CLI checklist entries checked because Phases2–7 require
remaining rights/source-grade/per-feature reviewer gates. Do not interpret
the absence of test failures as full manual or hardware equivalence.

### V12 replay, D15 and served-source QA checkpoint — 2026-10-14

Continuation preserved the existing project/profile and did not re-plan:
the current `npm run check` is **255/255 PASS**. New TDD regression tests
reject arbitrary/mutable inert observer inputs, D15 cross-session lesson
boundaries and POWER-off credit, and altered observer stream replay contracts.
The test-only multi-device envelope explicitly advanced from v2 to **v3**
to bind the inert observer's named data schema; FCV single-device replay,
profile `F1-public-reference-11`, scenario v7 and settings schema v10 are
unchanged. An overly strict grading change was rejected by an existing test
and corrected without weakening that test.

Fresh actual Google Chrome **1366×768 and 1920×1080** runs PASS, with
initially empty storage, UI input/replay/reset/reload, native Chromium
pointer cancellation, 0 console/network failures, and **30 runtime source
files verified byte-for-byte from localhost before and after** the browser
workflows. The V12 receipt is
`docs/qa/FCV588_CHROME_VIEWPORT_V12_RECEIPT.json` and screenshots remain
under `docs/qa/screenshots/`. See the
[V12 TDD and QA evidence report](./reports/continuation-2026-10-14-v12-replay-course-browser-integrity.md).

`ak plan validate` and `ak plan parse` still PASS with **7 phases, 22
named task units, 50 checklist entries / 10 checked (20%)**. Incomplete
source/rights/reviewer/Kongming gates keep **Phases2–7 and all 65 release
claims HOLD**. The tool environment exposed no `kongming` agent or
verified native `ak-cook --auto --tdd --advice` run. No checklist was
checked based only on synthetic test counts.

### V13 independent audit remediation and Chrome response integrity — 2026-10-14

The independent V12 review identified **3 Important** issues. Actual TDD
RED→GREEN remedied each without recreating existing work: D15 now demands an
exact start-session hash for every nonzero lesson attempt boundary; inert
observer rejects spoofed array-style inspect inputs and canonical fingerprint
rejects non-index/sparse arrays; actual Chrome-loaded network response bytes
are matched against the source SHA-256 manifest, not merely verified before
and after the run. A separate Python negative test simulates temporary source
swaps, missing body capture and foreign runtime paths.

Final `npm run check` **259/259 PASS** and Python QA **4/4 PASS**. Actual
Google Chrome **1366×768 and 1920×1080 PASS**, each with 56/56 request body
digests verified, no JS/network failures, originally empty storage, original
Canvas 480×640 and realistic input/replay workflows. Before/after manifest
verifies 30 served runtime files. Full receipt:
`docs/qa/FCV588_CHROME_VIEWPORT_V13_RECEIPT.json`; inspect the preserved
[V13 engineering report](./reports/continuation-2026-10-14-v13-boundary-and-loaded-response-integrity.md)
for exact tests and limitations.

A follow-up independent **strict READ-ONLY scoped review** found no introduced
Critical/Important issue in the three V13 remediations; this is **not**
manufacturer, Kongming, public-release or rights approval. All FCV operator
release decisions remain HOLD. `ak plan validate` still PASS, and `parse`
still returns **7 phases / 22 named Task units / 50 checklist entries / 10
checked** (20%, Phase1 only). Phase2–7 gates remain unaccepted because their
per-feature source, rights, real-hardware and reviewer evidence is incomplete.

### V14 source-dependent Data/Display and independently drawn FCV face — 2026-10-14

The active v2 execution continued without re-planning: §1.21 Bearing,
Wind Spd/Dir and Trip/Temp/Speed Source choices now stage/cancel/commit and
persist in Data. A selected but unconnected NMEA receiver never receives
invented Own readings; Trip/Odometer advance only on eligible world ticks;
NAV, B18 Temp Graph/supplemental speed and C01 alarm projections fail closed
on unavailable sources. D04 remains unavailable because exact OEM language
resources/reboot are rights/source-gated; D09 and D14 remain partial.

Original CSS 233×270 reference-face artwork now includes a circular inert
center TrackPad with ENTER separate, rotary detents/fasteners, high-contrast
LCD menu rows and source-long Data/System menu auto-scroll. Actual Chrome
initially found a clipped last System row at both viewports: root cause mixed
`offsetTop` coordinate spaces. It was corrected with DOM rectangle geometry
and rerun against the original assertion to PASS on both sizes.

The fourth D15 lesson teaches `Data > Trip Source`, NMEA selection without
a receiver, correct physical input sequence and replayable start-session
grading; positive and MENU/ESC-cancel negative tests and live Chrome scoring
PASS. Source/protocol changes incremented the public training profile to
`F1-public-reference-12`, settings schema11; core/replay schema5 and scenario7
remain pinned. Old local storage is rejected rather than silently migrated.

**Final `npm run check`: 271/271 PASS, Python response-negative tests 4/4
PASS.** Source/menu/feature generators and manual archive check PASS with
three known acquisition gaps. V14 receipt records actual Google Chrome
**1366×768 and 1920×1080 PASS**, each with **56/56 actual browser response
body hashes matched**, 28 loaded runtime paths, 30 pre/post source assets and
zero console/network failures; source manifest
`3ab342b9b116c49c580f840859915200449000fc84d31584e663b1351bd779f9`.
See the [V14 22-task-by-task evidence and blocker matrix](./reports/continuation-2026-10-14-v14-operator-source-ui-course.md)
and `docs/qa/FCV588_CHROME_VIEWPORT_V14_RECEIPT.json`.

**Acceptance remains conditional:** Phase1 checked; all Phase2–7 checkboxes
still pending because per-phase rights/source/independent reviewer/Kongming
gates are not complete. No claimDecision was promoted from HOLD, no real
maritime ports or OEM assets, no Git/commit/push/deploy. New independent
CoS review was attempted but worker revival was blocked by session transfer,
not independently certified GO. Do not infer hardware equivalence from 271
software regression tests or from the appearance of the original training
console.

## Red Team Review

Four-lens **prime desk review**, covering security/rights, failure/flow, assumptions and scope/contract, is documented with source file-line evidence in [plan-validation-2026-10-14.md](./reports/plan-validation-2026-10-14.md). A whole-plan consistency sweep fixed source-ledger reuse, profile/status boundaries, phase headings and the Phase7 multi-device hash oracle. Two previous read-only scouts contributed source and code evidence. Attempts to obtain independent final v2 reviewer reports did not complete due to worker-startup failures; therefore **independent final review remains unverified**, not a GO.

**Planning structure PASS; operational development PARTIAL.** Independent per-feature public reference conformance is still HOLD: incomplete operator workflows, missing required viewport/reviewer/media rights evidence, and genuine Kongming-supervised `--advice` unavailable. The previous Node blocker has been fixed and a limited live browser smoke has occurred; neither justifies a blanket GO or checking the unaccepted later phases.

## Handoff

Phase1 evidence is already CLI checked. Continue by checking the [current acceptance and incomplete-feature report](../../docs/reports/FCV588_PUBLIC_REFERENCE_ACCEPTANCE.md), re-reading the actual working source/tests, and closing remaining Phase2–7 gates without overwriting their partial implementation. Use the ak-cook-equivalent authorized workflow and the documented STOP/Failure Protocol; Kongming has not actually supervised this checkpoint. Never mark checkboxes complete based merely on passing unit tests or plan creation. No new Git repo, commit, push, publication or real hardware connection.

<!-- slug: fcv588-public-reference-deep-tdd-advice-v2 -->

## F1 continuation P07 bounded evidence — 2026-11-16
- [x] Independent bounded P07 Chrome/source/security/replay/photo QA completed against unchanged sealed P04 provenance v3 runtime39. Pure geometry63/447, Chrome39/39 and loaded bodies108/108, PNG39/39, security12/47, 8 reference JPEG SHA, full Node563/Python13; worker-1 independently GO.
- [x] New final integrity SHA `024dd1d75c7879fe0df88f939739d854a40aa819a459b6e1fbebd186aca91726`, independent postreceipt SHA `22fc21b744ebedbd5ac4a5998411c3e01f665697fa7fbb2a3726998909775ea6` under `docs/qa/FCV588_P07_BOUNDED_20261116/`. Details: [P07 report](./reports/continuation-2026-11-16-photo-p07-bounded-independent-qa.md).
- [ ] **Phase6 OPEN and all 65 claims HOLD unchanged**; no native narrator/NVDA speech, actual OS blur or firmware/physical LCD calibrated acceptance. `hardwareValidated=false`, firmware UNKNOWN, photo rights and release HOLD. This appendix is not phase acceptance or release authorization.

## F1 continuation P08 ROI/readiness research — 2026-11-16
- [x] Independent P08 restricted-reference photo study creates 8/8 uncalibrated four-corner ROI metadata and separate image-space independent picks, crosschecking all 32 corners. Five images exceed ±20px between-rater tolerance (max 34.93px), so **no calibrated ROI is accepted**. Independent GO applies only to qualitative LCD normalization, never physical geometry or OEM equivalence.
- [x] Windows accessibility readiness assessed: Narrator present, NVDA not located, true OS blur/native speech/forced colors NOT_RUN. No system changes. Final SHA `3d1a05419617807b3f3ef24042725bf414d53257d5e7157155ca0a6b787bf16a`, post SHA `82706f90bf424515abc0383d9eb8b5a7895755bf2de1a040c7890a35f8610dd7`. [P08 report](./reports/continuation-2026-11-16-photo-p08-roi-readiness.md).
- [ ] F1 Phase6 OPEN, 65/65 HOLD, installed firmware UNKNOWN, hardware=false, photo rights/release HOLD unchanged. P08 artifacts are restricted QA evidence, not runtime or distribution assets.

## F1 continuation P09 restricted ROI boundary QA — 2026-11-16
- [x] P09 predeclared active-content vs rounded-aperture boundary classes. Independent reviewer holds 8/8 active-display corner calibration, accepts only 2/8 rounded-aperture virtual quads (`dual.jpg`, `zoom.jpg`) for **restricted image-space use**, and holds the other six. Numerical QA checks 16 base homographies and 256 deterministic perturbed cases valid; not OEM physical/pixel accuracy.
- [x] P09 write-once final SHA `759f146c349c2ad348fc5b98e21fbc79d1d857623253811f0a01d3b9408995b9`; independent postreceipt SHA `cc3888a17c34271ba9163b86cfe4427442a1e6b5a847e4ac714661565657a26e`. [P09 report](./reports/continuation-2026-11-16-photo-p09-boundary-geometry.md).
- [ ] F1 Phase6, 65/65, rights, hardware, firmware, release remain OPEN/HOLD; narrator/NVDA/true OS blur NOT_RUN; no CSS/Canvas/runtime source edits.

## F1 P10 scoped Windows native a11y evidence — 2026-11-16
- [x] Input unit regression17/17 and Chrome **emulated** forced-colors focus/D15 bounded PASS. Actual Narrator spoken record BLOCKED, NVDA not installed, genuine Windows focus blur test two FAIL/HARNESS_BLOCKED receipts: test Chrome not proven foreground. No inference from fake `blur` or from media emulation.
- [x] Independent reviewer evidence SHA `dc7a8d07f9002bb61a28c7528d2b29c0bd9bf194ed208dec8a50fd66d07dffee`. P10 final SHA `414c0151053bec55271032170e0fba2139fd1627e5fee7524cdf6c1bcf490655`; post SHA `df2cb60996da7f3f557642f329d794198aea9a85ac8fe5084429bee1931c12dc`. [P10 report](./reports/continuation-2026-11-16-photo-p10-native-a11y-boundaries.md).
- [ ] Full Phase6, 65 claims, hardware, firmware, rights, release still HOLD/OPEN. Actual spoken Narrator/NVDA, true foreground loss under POWER, and native High Contrast remain NOT_RUN/BLOCKED; no app patch or deploy.

## F1 P11 bounded native Windows foreground study — 2026-11-16
- [x] Four source-frozen, immutable P11 QA trials. V3 and V4 prove actual Chrome-to-test-witness Win32 foreground transfer after POWER down (exact HWND/PID/executable). Chrome continued reporting `document.hasFocus=true` without trusted browser `window.blur`; the required POWER cancel event was not observed. **Native blur NOT_VERIFIED**, no source-valid product bug or runtime patch justified. V1/V2 FAIL harness and V3/V4 non-acceptance receipts preserved.
- [x] Independent reviewer SHA `33df2e66e63ee173a5fca9293da7f2d26e0ed7a96a8ae6280c857b5291658667`, P11 final SHA `845b4fe9cf9b184a74ddba91783362e9446c1219d38362c16166d4b3d6a44c87`, post SHA `392220f62ae29c2f1bf77b73c90d016b1a3a40e115a8c04612ce59a728b09f98`. [P11 report](./reports/continuation-2026-11-16-photo-p11-native-foreground-boundaries.md).
- [ ] Further native test requires a materially different, evidence-backed method, not repeating foreground activation attempts. Narrator/NVDA actual speech and real High Contrast NOT_RUN, F1 Phase6 OPEN, 65 claims/HW/firmware/rights/release HOLD.

## F1 continuation P12 source-authored menu conformance — 2026-11-16
- [x] FURUNO OME23890E PDF p59 printed AP-1 and one original Vietnamese-reference photo independently corroborate 13 Sounder menu item order. Current atlas 67 entries, photo semantic order crosswalk finds 12/13 different ordinals and 21 inversions; one photo shows menu Vietnamese, not full installed firmware/locale proof.
- [x] Canonical targeted Node25/25, manual order RED2/3; staged only reorders existing 13 Sounder IDs and reaches GREEN3/3. Full staging Node **499/526 with 27 FAIL** (22 incomplete fixtures/cascade, five index-sensitive menu contract failures). Preserve old receipts; **canonical apply NO_GO**, no runtime edits.
- [x] Independent review SHA `26bbcef289bf1b3663ac7a79766b87ff6431684632f07414aca4537d3bd29c6d`. New P12 final SHA `5afe2663a1d0d3dff6e213fc537fad3b7dfe5817d7aa776ee4a769e580780855`; post SHA `538ff2a5e518ed663274958c3a2c9c69e7458a7caa5317f868ae67fe4e184792`. [P12 report](./reports/continuation-2026-11-16-photo-p12-menu-source-order.md).
- [ ] Full Stage QA, semantic menu test rebaseline, independent GO and guarded apply remain future P13 conditions; Phase6 OPEN, claims65/65, hardware, firmware, OEM rights and release HOLD.

## P04 fish-only provenance v3 — canonical bounded PASS (2026-11-16)
- [x] Historical near-bottom fish-only false BL anchor corrected using authenticated-to-scenario synthetic display companion and raw-to-LCD row sampling (no pixel-intensity classification); BL raster art never invents phantom seabed. Stop Bottom Zone overlay uses frozen history-qualified frame metadata. TDD RED/NO-GO preserved; targeted52/52, stage/canonical Node563/563 and Python13/13, compatibility PASS.
- [x] Independent reviewer GO bound to frozen source; guarded canonical 8/8 paths with ZIP preimage/receipt, runtime39/39 exact, Chrome 6/6 per stage/canonical including Stop backing-bitmap diff 0, 216 actual source-body SHA each, 8 OEM JPG HTTP404. Final integrity SHA `94d9bf997408d8fb51140b723319ea59faefb8122f66233839ad5a8f39b243d2`; independent postreceipt SHA `132facb60daba96a7e7c0cfa38b3e8d8b414e3b852a98e79b14b390620303a9d`.
- [ ] Bounded fix is NOT full P04/P07 conformance: 7-mode x 3 zoom x 3 viewport, physical/photo ROI, firmware language, Narrator/NVDA and OEM/hardware/rights gates remain OPEN/HOLD. See `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-11-16-photo-p04-provenance-postapply.md`.

## F1 P13 fixture-complete order and profile21 replay compatibility — 2026-11-16
- [x] Staging source AP-1 Sounder order only; full fixtures restored, strict ID-based tests rebaselined without weakening. Node RED 558/563, GREEN **563/563** and Python **13/13 PASS**; Chrome 2 viewports, 8 PNG, 72 actual HTTP body SHA PASS, independent review.
- [x] P13 historical profile21 event-log/replay guard verified *silent semantic reinterpretation* after menu reorder with identical session hash and 9 events (old White Marker -> staged Clutter), so staged QA GO is **not release/apply GO**. Explicit new menu-order revision with backward-compatible legacy profile21 replay required. User server/runtime untouched; staging preserved.
- [x] Independent gate SHA `c1a99846aff873ccfa28db81670f5904f966426b957e87e4542cece8fb4ae1d4`; browser reviewer SHA `41a9a0e07c41b33d0d71dcd99ba6b7bb331f6539ddafd1de12bda857299b9ea0`; final SHA `5677a5db225e96e1412df4ea2776232081b050c3685b41b68bb2af89466b84db`, post SHA `803f190098a38d8eb8607e22651f288c42ed2701b853bd3791256dbb41af5862`. [P13 report](./reports/continuation-2026-11-16-photo-p13-fixture-profile21-replay-gate.md).
- [x] P14 versioned legacy/current replay gate, six frozen historical fixtures, preimage ZIP and independent GO completed; guarded canonical applied with Node577/Python13/Chrome10 PASS. F1 Phase6 OPEN, 65/65 claims, firmware, hardware, rights and release remain HOLD.

## P14 all-historical profile21 + AP-1 profile22 — canonical integrated 2026-11-16
- [x] Archived historical profile21 reducer/transitive device semantics and six byte-pinned original replay fixtures; active profile22 13-row Sounder AP-1 menu and ordered-ID replay hash; version-aware historical device-LCD menu and strict settings21/19 import.
- [x] Stage Node577/577, Python13/13, Chrome10/10 and 164/164 HTTP source SHA. Independent canonical apply GO SHA `45ae1cc5418e416ce868ee415eb4fec501f535e9fcaf71e8064df60a1b8937ad`; guarded 38-path apply receipt SHA `82b93e74b055491a3d02dc081ce13fb78f40a1d42fdcfb0b5e1d95d196dd0159`. Canonical runtime50/50, Node577/577, Python13/13, Chrome10/10 and 164/164 body SHA, server4173/PID1204 preserved.
- [ ] This P14 integration is bounded software evidence only: F1 Phase6 OPEN, 65/65 claims, installed firmware, OEM pixel geometry/rights/hardware validation, native speech/focus/high-contrast and release remain HOLD/NOT_VERIFIED. See F1 [P14 report](./reports/continuation-2026-11-16-photo-p14-versioned-replay-profile22-postapply.md).
- [x] P14 FINAL integrity $finalsha; independent postreceipt PASS $postsha. Canonical 50/50 SHA, 577/577 Node, 13/13 Python, Chrome10/10 (164/164 HTTP), legacy21 six frozen fixtures, OEM JPEG8/8 preserved and not served; user server4173 PID1204 preserved. **RELEASE HOLD**; see docs/qa/FCV588_P14_VERSIONED_REPLAY_20261116/.

## P16 current Chrome/Edge CQW and native readiness (2026-11-17)
- [x] Windows current browser QA: installed Chrome 157.0.8103.79 and Edge 157.0.4341.60, real Playwright 82/82 checks; 6 viewport observations, 234/234 source HTTP body SHA, four screenshot SHA, Chrome/Edge 2/2 RGBA-pixel-identical screenshot pairs, 8 OEM JPEG HTTP404, zero external/JS errors. QA port4217 cleaned; user server4173/PID1204 retained.
- [x] Independent source/compatibility audit GO for current browsers and SOURCE_GAP for untested old Chromium/WebView (<105 lacks cqw); no browser minimum declared by project, so NO runtime fallback invented. Canonical50/50 runtime and OEM original8/8 unchanged vs P15; no staged or guarded apply required in P16.
- [ ] Windows native Narrator speech, NVDA, native High Contrast, target-window UIA semantics and actual POWER window.blur: NOT_RUN/BLOCKED/NOT_VERIFIED. Native inventory only. F1 Phase6 OPEN, 65/65 claims HOLD, firmware installed UNKNOWN, hardwareValidated=false and OEM rights/releaseApproval HOLD.
- [x] Final QA-only integrity: `docs/qa/FCV588_P16_BROWSER_BOUNDARY_20261117/FCV588_P16_BROWSER_BOUNDARY_FINAL_INTEGRITY_20261117.json` SHA `d40287d951c887581ce3a1d1776ed7707add77c7393c86362fc13ef03000ab90`; read source-based report SHA `3c37377e48b5c0f64e55e6cc9d678ee21e3d79ddce4be97e574cae822654f178`.