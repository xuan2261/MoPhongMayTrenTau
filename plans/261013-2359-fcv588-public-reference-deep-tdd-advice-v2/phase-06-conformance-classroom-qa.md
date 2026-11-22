---
title: "Phase 6: Public Reference Conformance, Browser and Classroom QA"
status: todo
---

# Phase 6: Reference QA, Accessibility, Browser Smoke and Lesson Release

## Overview

**V50 Win32 headed Chrome exact viewport partial milestone
(2026-10-19; not OS-focus, spoken-output or OEM acceptance):**
One owned headed Chrome browser on a secondary real Windows screen
was measured with no viewport emulation. Win32 HWND/PID and browser
innerSize/PNG pixels confirmed **1366×768** and **1920×1080**.
Staging and canonical independent V4 runs each **28/28 assertions,
70/70 browser-loaded HTTP response SHA, 2/2 screenshots SHA**.
All 37 runtime files are byte-identical to V49. Staging/canonical
targeted Node **14/14**, full Node **511/511**, Python **13/13** PASS.
No actual CoS Desktop-attached exact viewport acceptance was claimed.
An actual Win32 foreground switch during held POWER produced zero
Chrome window.blur events; genuine OS blur remains **NOT_RUN**.
Real Narrator/NVDA speech is **NOT_RUN**; installed FCV firmware,
optical OEM fidelity, media rights and hardware acceptance remain
UNKNOWN/HOLD. See [V50 integration](./reports/2026-10-19-v50-native-win32-viewports-and-focus.md)
and [native Windows QA](../../docs/qa/FCV588_V50_WINDOWS_NATIVE_VIEWPORT_PARTIAL_20261019.md).
**Phase6 OPEN, 65/65 claims HOLD, 14/50 checklist,
6/22 named tasks, hardwareValidated=false, releaseApproval=HOLD.**

**V49 scoped D15 live-announcement regression (2026-10-19;
not Narrator/NVDA or hardware acceptance):** A real Chrome DOM
probe observed ticking visual BRILL guidance inside a broad polite
ARIA status container. V49 isolates a new polite D15 announcement
to semantic heading transitions; the visible 250-ms countdown still
updates and the LCD/face remain unchanged. Two of 37 runtime source
files differ from V48; 35 are byte-identical. Staged source-valid
RED **2/4**, focused GREEN **29/29**, canonical targeted **29/29**,
staged/canonical full Node **511/511**, Python **13/13** PASS.
Stage and canonical Chrome each **69/69 assertions, 105/105 actual
browser-loaded HTTP response-body SHA and 6/6 PNG SHA** at 375×812,
1366×768, 1920×1080 isolated contexts. Canonical HTTP negative
routes **4/4 denied**. Native CoS attached Chrome at **1912×970**
had **35/35 localhost HTTP200** and no observed console error, but
that is not an exact attached target viewport acceptance.
Actual spoken Narrator/NVDA output, genuine OS-window blur during
POWER hold, exact native attached viewports and physical/OEM
rights/firmware review remain **NOT_RUN/UNKNOWN/HOLD**. See
[V49 integrated report](./reports/2026-10-19-v49-d15-live-region-integration.md)
and [CoS Desktop partial](../../docs/qa/FCV588_V49_DESKTOP_MANUAL_PARTIAL_20261019.md).
**Phase6 OPEN, 65/65 claims HOLD, checklist 14/50, 6/22 named
tasks accepted, hardwareValidated=false, releaseApproval=HOLD.**

**V48 claim-ledger integrity and genuine Windows blur prerequisite
(2026-10-19; QA ONLY, not Phase 6 acceptance):** Cross-checks across
feature draft register, trace matrix and implementation ledger now
protect exact 64 FCV + separate D15 feature identities, per-feature
rights/source references and all 65 claim HOLD states. One new
test-only file, 0/37 runtime changes; staged/canonical targeted
Node **16/16**, canonical full Node **507/507**, Python **13/13**
PASS. The separate two-window native Win32 foreground attempt
recorded distinct test-owned HWNDs, but no `window.blur` and no
loss of `document.hasFocus()` on A. Genuine POWER-hold OS blur
remains **NOT_RUN**, independent of passing Node tests. No V48
Chrome/PNG source-bound run, real screen-reader spoken output, exact
native attached viewport or OEM/hardware approval is asserted.
See [V48 report](./reports/2026-10-19-v48-phase6-claim-focus-audit.md).
**Phase 6 OPEN, 65/65 claims HOLD, 14/50 checklist, 6/22
tasks, rights/firmware/release HOLD/UNKNOWN,
hardwareValidated=false.**

**V47 White Marker OEM color-bar/source-grading QA (2026-10-19;
NOT Phase 6 hardware acceptance):** FURUNO §1.22 describes a
White Marker color-bar Up/Down selection plus ENTER and Off.
Current `Off/White/Gray` remains a training-only simplification
because OEM v2.01 change history does not establish installed-unit
firmware/menu enum. V47 changes only two of 37 runtime files:
source grade `TRAINING_WHITE_MARKER_PREVIEW_FIRMWARE_UNKNOWN` and
an outside-face D15 source warning; **no operator label/choice,
palette, reducer, replay/profile or hardware transport changes**.
Seven-case TDD progressed from source-valid RED **2/7** through
focused GREEN **7/7**, while stage/canonical targeted Node
**48/48**, full Node **504/504** and Python **13/13** passed.
Independent Chrome stage/canonical each **126/126** assertions,
**210/210 actual browser-loaded localhost body SHA** and 12
screenshots SHA in six isolated contexts. Canonical HTTP security
negative routes **4/4 denied**; Desktop actual Chrome attached
1912×970 partial check observed White Marker D15, replay PASS.
Original failed test harness attempts, initially mis-targeted A02
and B01 metadata, initial Chrome V1 matcher/encoding STOP and
preflight-only apply checker key errors were recorded separately,
not silently retried or used as PASS. See
[V47 research atlas](../../docs/research/FCV588_V47_WHITE_MARKER_FIRMWARE_SOURCE_ATLAS_20261019.md),
[V47 integrated QA](./reports/2026-10-19-v47-white-marker-integration.md),
[attached Chrome partial](../../docs/qa/FCV588_V47_DESKTOP_MANUAL_PARTIAL_20261019.md).
Firmware identity, lawful OEM visual references, Narrator/NVDA
actual speech, genuine OS-window blur and attached exact
1366×768/1920×1080 remain **UNKNOWN/NOT_RUN/HOLD**.
**Phase6 OPEN; 65/65 claims HOLD; checklist 14/50;
named tasks accepted 6/22; hardwareValidated=false and release HOLD.**

**V46 source-bounded Colors/D15 UI and Chrome regression (2026-10-19;
NOT Phase 6 acceptance):** Official FURUNO software history v2.01
calls the operator menu `Display > Colors`. Prior training LCD
added `· SIM` on the face; V46 replaces this with exact Colors
operator text and moves specific firmware-unknown 8/16 palette
information to D15 outside the machine. Two runtime files changed,
35/37 remain byte-identical to V45, and both settings/replay and
profile21 are unchanged. Valid independent staged focused RED
**2/6 PASS, 4/6 FAIL**, followed by **6/6 GREEN**; original first
test-harness failure and one old B19 test expecting SIM on LCD
were preserved and corrected without weakening provenance checks.
Both stage/canonical targeted Node **45/45**, full Node **497/497**,
Python **13/13** and source-bound Chrome each **126/126** across
six viewports, **210/210 actually loaded localhost body SHA** and
**12/12 distinct PNG SHA**. Canonical HTTP negative routes
**4/4 denied**. Attached CoS Desktop Chrome at 1912×970 confirmed
the active Colors row, D15 source-cue and its external placement,
but not genuine spoken screen-reader output. See [V46 source atlas](../../docs/research/FCV588_V46_COLORS_FIRMWARE_SOURCE_ATLAS_20261019.md),
[V46 integration](./reports/2026-10-19-v46-colors-d15-integration.md)
and [native partial audit](../../docs/qa/FCV588_V46_DESKTOP_MANUAL_PARTIAL_20261019.md).
Installed firmware, OEM pixel geometry/colors, media rights,
actual Narrator/NVDA speech, exact native CoS Desktop
1366×768/1920×1080 and genuine OS-window blur during hold remain
**UNKNOWN/NOT_RUN/HOLD**. **Phase 6 OPEN, 65/65 claims HOLD,
14/50 checklist, 6/22 named tasks, hardwareValidated=false,
releaseApproval=HOLD.**

**V45 real Chrome input and OS focus-source boundary (2026-10-19;
NOT Phase 6 acceptance):** A separate two-window Windows headed
Chrome prerequisite produced distinct real foreground HWNDs but
did not deliver `window.blur` to the first page, so genuine OS blur
cancellation remains **NOT_RUN**. A fresh isolated Chrome-native
input test, however, verified trusted keyboard Tab focus loss,
`lostpointercapture` and CDP `touchCancel` with no stranded
POWER hold, preserved Brill preview and replay PASS. Staging and
canonical Chrome each **96/96 assertions, 140/140 browser-loaded
HTTP body SHA and 8/8 new screenshot SHA** across 320×720, 375×812,
1366×768 and 1920×1080. Original stage harness event-count failure
(periodic UI ticks) and subsequently unavailable localhost server
were preserved separately, diagnosed before scoped V2 reruns.
Staged/canonical Node **491/491**, Python **13/13**, canonical HTTP
negative routes **4/4 denied**. **All 37 runtime source SHA stay
identical to V44**, without UI, reducer, replay/profile, firmware or
hardware changes. Official FURUNO software history v1.05/v2.01 does
not establish installed firmware. See [V45 source atlas](../../docs/research/FCV588_V45_FIRMWARE_NATIVE_FOCUS_SOURCE_ATLAS_20261019.md),
[Windows focus QA](../../docs/qa/FCV588_V45_WINDOWS_FOCUS_GATE_PARTIAL_20261019.md)
and [integration report](./reports/2026-10-19-v45-native-input-and-firmware-gates.md).
True Narrator/NVDA speech, attached native Desktop exact viewports,
OS-window blur during hold and firmware/rights/hardware remain
**NOT_RUN/HOLD**. **Phase 6 OPEN, all 65 claims HOLD, checklist
14/50, named tasks 6/22, hardwareValidated=false,
releaseApproval=HOLD.**

**V44 OEM BRILL/TrackPad bounded test-only QA (2026-10-19;
NOT Phase 6 acceptance):** OEM §1.3 expressly permits left/right
TrackPad in the Brill modal; the exact mixed repeated-key direction
and Up/Down meaning are unverified firmware-specific behavior.
V44 adds a separate seven-test scenario suite and source atlas,
**no runtime edit** (37/37 identical to V43); stage source restored
after an intentional timer mutant was killed by six tests. Stage and
canonical **491/491 Node, 13/13 Python**, independent isolated Chrome
**114/114 each**, **210/210 browser-loaded HTTP body SHA each** and
**12/12 screenshots each** passed. Canonical targeted **13/13** and
HTTP negative routes **4/4** denied. Native CoS Desktop 1912×970
manual interaction was partial; delayed ENTER after timeout did NOT
count, but a separate immediate ENTER commit was observed.
Read [V44 source atlas](../../docs/research/FCV588_V44_BRILL_PAD_SOURCE_ATLAS_20261019.md),
[integration](./reports/2026-10-19-v44-integrated-brill-pad-qa.md)
and [partial native Desktop QA](../../docs/qa/FCV588_V44_DESKTOP_MANUAL_PARTIAL_20261019.md).
Actual Narrator/NVDA speech, exact native 1366×768/1920×1080,
real OS-window blur, firmware, hardware and media rights remain
**NOT_RUN/HOLD**. **Phase 6 OPEN; 65/65 claims HOLD; checklist 14/50,
named tasks 6/22; hardwareValidated=false, releaseApproval=HOLD.**

**V43 source-bounded BRILL repeated-key TDD (2026-10-19;
NOT Phase 6 acceptance):** Under FURUNO OME-23890-E §1.3, repeated
short POWER/BRILL must reflect from level 9 to 8 instead of wrapping to 0.
V43 fixes the transient preview sequence and D15 instructor LEARN-07,
bumps the PUBLIC_REFERENCE profile to 21 and rejects old profile20
replay/settings without changing the event/replay/settings schemas.
The staged test-harness import STOP was kept separate from valid 0/6
OEM RED. A staged Node profile-metadata STOP (482/484) and invalid
manifest-format preflight STOP were both preserved and corrected
within narrow GPT-6 GO limits. Staged and canonical Node **484/484**,
Python **13/13**, Chrome isolated six-viewport **102/102** each,
**245/245 actually loaded HTTP response-body SHA** each and
**12/12 independent PNG SHA** per run passed. Canonical targeted
Node **66/66**, HTTP security **4/4 denied**, source SHA **37/37**.
Actual CoS Desktop native exact viewports, Narrator/NVDA speech,
genuine Windows OS blur, installed firmware, OEM pixels and rights
remain NOT_RUN/HOLD. Read [V43 source atlas](../../docs/research/FCV588_V43_OEM_BRILL_SOURCE_ATLAS_20261019.md)
and [V43 integrated report](./reports/2026-10-19-v43-integrated-brill-cycle.md).
**Phase 6 OPEN, 65/65 claims HOLD, checklist 14/50, named tasks 6/22,
hardwareValidated=false, releaseApproval=HOLD.**
**V42 source-bounded MODE dialog label and Chrome QA,
2026-10-19 (NOT Phase 6 acceptance):** Official FURUNO operator
manual OME-23890-E §1.4 labels the mode selector MODE. V41
software printed MODE SELECT; V42 corrected only this exact
read-only LCD title literal. Original targeted TDD RED
**2/3**, staged GREEN **3/3**, stage full Node **478/478**,
Python **13/13**. One initial Python test-environment Verify
failed because historical V27/V28 visual-atlas fixture PNGs
were not copied into the isolated stage; its log is preserved.
Exactly 16 historical original training images were copied with
16/16 SHA checks; no assertion or reducer changed. Staged and
canonical isolated Chrome each passed **120/120 assertions,
210/210 browser-loaded localhost response-body SHA and 12/12
new PNG SHA** at six viewport contexts. Canonical targeted
Node **16/16**, full Node **478/478**, Python **13/13**,
HTTP security negative routes **4/4** and runtime **37/37
SHA** passed. CoS Desktop Chrome at actual **1912×970**
observed MODE and seven choices, 35/35 local HTTP200,
zero console errors and focused native knob keyboard rotation.
A first delayed ESC happened after auto-commit and was NOT
counted as cancellation; in a new immediate draft, ESC
closed MODE while preserving committed state. See
[V42 source atlas](../../docs/research/FCV588_V42_MODE_RANGE_BRILL_DISPLAY_SYSTEM_SOURCE_ATLAS_20261019.md),
[V42 integration](./reports/2026-10-19-v42-integrated-mode-title.md)
and [Desktop audit](../../docs/qa/FCV588_V42_DESKTOP_MANUAL_PARTIAL_20261019.md).
Actual native CoS Desktop 1366×768/1920×1080, screen-reader
spoken output, OS-window blur, firmware, physical OEM pixel
calibration and OEM media rights remain **NOT_RUN/HOLD**.
**Phase 6 OPEN, 65/65 claims HOLD, checklist 14/50,
named tasks 6/22, hardwareValidated=false and
releaseApproval=HOLD.**
**V41 scope-bounded Sounder menu text and Chrome QA, 2026-10-18
(NOT Phase 6 acceptance):** Training UI now shows `Pic. Advance`
and `Interference` on the Sounder menu instead of classroom-expanded
versions, based on a photo-observed FCV-588 menu with firmware
UNKNOWN and OEM manual functional context. This is a two-literal
operator text adjustment, not OEM pixel or physical verification.
Only one of 37 runtime files changed, with stable menu IDs,
settings/choices, core clocks, session/replay, CSS, D15 and all
hardware guards preserved. Staged original focused RED was 2/4,
then 4/4 GREEN; stage full Node **475/475** after documented
fixture-copy environment repairs; Python **13/13**. Canonical
targeted Node **18/18**, full Node **475/475**, Python **13/13**,
isolated Chrome **90/90 assertions and 210/210 loaded source-body
SHA across six viewports**, plus 12/12 canonical and 12/12 staged
PNG SHA, HTTP 4/4 denied routes and 37/37 canonical runtime SHA.
Actual CoS Desktop attached Chrome at **1912×970** observed Enter
opening Sounder, both correct labels, Escape closing, 35/35 local
HTTP200 and zero console errors. A stale DOM ref blocked one initial
step click at tool level, then four true browser step clicks worked
after fresh snapshots. The user tab was preserved; the new QA tab
and owned server were closed. See
[V41 integration](./reports/2026-10-18-v41-integrated-sounder-labels.md),
[source atlas](../../docs/research/FCV588_V41_SOUNDER_MENU_SOURCE_ATLAS_20261018.md)
and [actual Desktop partial evidence](../../docs/qa/FCV588_V41_DESKTOP_MANUAL_PARTIAL_20261018.md).
Real Narrator/NVDA voice, OS-window blur, exact native 1366×768
and 1920×1080 Desktop viewports, firmware, OEM geometry and media
rights remain NOT_RUN/SOURCE_GAP/RIGHTS_HOLD. **Phase 6 OPEN;
65/65 claims HOLD, checklist 14/50, named tasks 6/22,
hardwareValidated=false, releaseApproval=HOLD.**

**V40 source-bounded operator-label and browser QA, 2026-10-18
(NOT Phase 6 acceptance):** A single official OEM-manual
textual mismatch on the physical control `MENU/ESC` was
verified RED in staged software and fixed by one exact original
HTML markup change. No CSS, core, LCD or behavioral logic
was altered. Stage test **2/2** GREEN, canonical targeted Node
**28/28**, full Node **471/471**, Python **13/13** PASS.
New isolated Chrome passed **84/84 assertions, 210/210
source-bound HTTP response SHA and 12/12 PNG SHA** at
320×720, 375×812, 768×1024, 1366×768, 1440×900 and
1920×1080, both in staging and canonical. HTTP negative
routes 4/4 denied and canonical runtime remained 37/37
SHA pinned (one approved HTML file differs from V39).
The CoS Desktop native live viewport remained **1912×970**
with Tab focus and literal accessible `MENU/ESC` proven;
35/35 HTTP200 requests stayed local and console errors
were zero. Neither native exact-viewport CoS Desktop
testing nor real Narrator/NVDA speech occurred. OEM
pixel/menu/firmware and rights reuse remain `SOURCE_GAP`
or `RIGHTS_HOLD`. See
[OEM source atlas](../../docs/research/FCV588_V40_OEM_FRONT_PANEL_SOURCE_ATLAS_20261018.md),
[V40 report](./reports/2026-10-18-v40-integrated-oem-menu-esc.md)
and [native Desktop partial record](../../docs/qa/FCV588_V40_DESKTOP_MANUAL_PARTIAL_20261018.md).
**Phase 6 OPEN, 65 claims and release HOLD; no checklist or
task acceptance promotion.**

**V39 incremental regression and browser/tooling check, 2026-10-18:
NOT Phase 6 acceptance.** One new canonical test-only file adds
seven negative vectors for C11 Delete All WPT/POWER and ID monotonicity,
D09 option revoke while Own/NMEA choices remain stored, and D14
synthetic-source import/cancel/replay safety. Combined V37–V39 Node
targeted **18/18 PASS**, canonical Node **469/469 PASS**,
Python **13/13 PASS** (pre-final-doc checkpoint), with all
37 runtime source files and 23 core modules unchanged.
An optional mutation test was blocked before execution.
The actual headless Chrome tab-switch focus check stopped because
Chrome did not emit a `window.blur`, leaving the application
hold-cancel and OS-window test unobserved. Windows Narrator was
available but not activated without a dedicated speech-validation
environment; NVDA wasn't found. CoS Desktop actual exact viewports
remain NOT_RUN, while the historic V38 1366×768/1920×1080
Playwright evidence is still a distinct automated layer.
Fresh manufacturer product/support and Furuno USA Terms of Use
research retains all firmware/media rights HOLDs. See
[V39 browser/speech limits](../../docs/qa/FCV588_V39_PHASE6_BROWSER_SPEECH_20261018.md),
[official source/rights recheck](./reports/2026-10-18-v39-furuno-source-rights-recheck.md),
and [V39 test integration](./reports/2026-10-18-v39-integrated-cross-session-tdd.md).
**Phase 6 OPEN, 65 claims and release HOLD.**

**V38 partial exact Playwright Chrome and C11/D09/D14 regression
checkpoint (NOT Phase 6 acceptance):** One canonical test-only file
adds seven waypoint/source/entitlement/replay negative tests, targeted
7/7 PASS, integrated full Node **462/462 PASS**, Python **13/13 PASS**
without modifying any of the 37 runtime source files. A deliberate
staging-only deletion-guard mutation failed its named assertion and
was restored by SHA before integration. Separate Playwright Chrome
v155.0.8059.80 contexts measured **1366×768 and 1920×1080** with
34/34 assertions PASS, 70/70 actual loaded response bodies hashed
against pinned local source, 37/37 served assets pre/post and six
SHA-verified new screenshots. The first Chrome harness attempted
MENU before POWER and exited 1; its original receipt was kept and
GPT-6 approved test sequence repair only via a new runner/receipt.
The distinct CoS Desktop session was attached before reload at
1912×970, captured 35/35 HTTP200 localhost requests, 0 errors;
attempting viewport resize was blocked before execution. Therefore
the mandatory **native** target viewports, OS blur during holds and
actual Narrator/NVDA speech remain NOT_RUN/HOLD. See
[V38 browser scope/limitations](../../docs/qa/FCV588_V38_BROWSER_AND_A11Y_20261018.md)
and [integrated report](./reports/2026-10-18-v38-integrated-waypoint-source-qa.md).
**Phase 6 remains OPEN and releaseApproval=HOLD.**

**V37 partial actual-browser and semantic vector evidence, 2026-10-18:
NOT Phase 6 acceptance.** CoS Desktop attached to a newly opened live
Chrome localhost tab **before** reload, then observed Tab focus, POWER,
MENU/ESC, teacher shortcut isolation, world pause/step, deterministic replay,
MODE UI timeout, synthetic Own source updates and Reset, with no browser
console errors and **35/35 loaded HTTP requests local/200**. This is a
measured 1912×970 viewport, not the required native 1366×768 or 1920×1080;
captured connector screenshot IDs are not saved PNG artifacts. The old
dormant tab failed to attach twice, and remains untouched. A separate
new four-test suite guards C11/D09/D14 transaction/transport/replay order;
canonical **455/455 Node, 13/13 Python** passed without modifying the
37-file runtime. A deliberate isolated test mutant produced the intended
failures, then its source was verified restored. Documentation:
[native browser record](../../docs/qa/FCV588_V37_MANUAL_BROWSER_20261018.md),
[test-only GO](./reports/2026-10-18-v37-gpt6-test-only-go.md),
[source and rights audit](./reports/2026-10-18-v37-c11-d09-d14-source-rights-review.md).
Screen-reader actual speech, pointercancel/blur in this live session, both
target viewports, licensed imagery and per-claim OEM behavior are still
NOT_RUN/HOLD. **Phase 6 remains OPEN, releaseApproval=HOLD.**

**V36 partial software evidence, 2026-10-18 (NOT Phase 6 acceptance):**
The separate D15 C11/D09/D14 instructor matrix now has 13–16px
scalable source text, labelled h4 articles and a discrete external
screen-reader status. Its integrated software tests passed
451/451 Node, 13/13 Python and 639/639 Chrome checks across
three source-bound runners; 121 screenshot hashes and 37 source
hashes were reconciled. This does not replace the required CoS
Desktop attach-before-reload browser/manual gate, actual NVDA/VoiceOver
speech output, rights review or individual 64+D15 source/claim audit.
The user approved GPT-6 review in place of Kongming on 2026-10-18;
the original Failure Protocol remains a historical record, and that
prospective supervisor substitution is documented in the central
plan amendment. Phase 6 remains OPEN with all release/claim HOLDs.
See [V36 test report](./reports/2026-10-18-v36-integrated-d15-accessibility.md).

**Priority P0 for a training distribution decision; depends on Phases1-5.** Public-reference conformance is a separate attainable test target, NOT an assertion of physical FCV-588 identity, installed software or OEM approval. Finish source/feature trace, browser keyboard/hold/viewport smoke, conditional lesson approval and restricted-media/security audit. Every source HOLD remains explicit.

**Deep Pre-execution Scout Gate:** Read all finished implementation and 64 FCV + D15 separate source trace, Phase1-5 tests and verified receipts, docs/qa/scenario-matrix.md, README, web/index.html/styles.css/app.mjs, tools/server.mjs and sources/manuals/ARCHIVE_COVERAGE.json. Check original artwork/no OEM bytes; check actual Chrome/CoS Desktop capabilities before claiming browser QA. If a source/video frame/rights are unresolved, do not use its behavior as an acceptance oracle. Never substitute '47 F0 tests PASS' or a count of files for operator conformance.

## Dependencies / file inventory

All prior phases green -> source/claim coverage -> Node semantic/regression suite -> real browser/console/network smoke -> per-lesson public GO; hardware-target stays HOLD.

| Path or component | Action/size | Test impact |
| --- | --- | --- |
| docs/evidence/fcv588-public-trace-matrix.json | Extend Phase1 rows with real verified implementation/course status | test/fcv588-public-trace.test.mjs, existing research register |
| docs/reports/FCV588_PUBLIC_REFERENCE_ACCEPTANCE.md | Create actual conditional release/audit report | New test/fcv588-public-course.test.mjs |
| test/fcv588-public-claims.test.mjs | **Extend** Phase1, preserve every earlier rights/hardware assertion | no overwrite or loss of false-claim coverage |
| web/index.html/styles.css/app.mjs, web/hold-input.mjs | Accessibility/security fixes within current model | New test/fcv588-public-browser.test.mjs |
| docs/qa/FCV588_PUBLIC_BROWSER_SMOKE.md | Create evidence log for real browser path | Cannot be replaced by static Node tests |
| tools/server.mjs | Do not widen static serving or CSP | test/server.test.mjs |

## Tests Before / classroom scenario matrix

| Severity | Test | Mechanical gate |
| --- | --- | --- |
| Critical | 64 operator rows, other menu nodes and D15 separate | no missing/duplicate feature; HOLD is not PASS |
| Critical | Any real hardware/firmware/OEM/pixel certification text | explicit rejection and training-only banner |
| Critical | Static source/manuals/ZIP/video bytes requested over localhost | HTTP 404/403, no external connections |
| High | MODE/POWER/BRILL, menu save/cancel, BDS, alarms, Demo | deterministic source-backed scenarios, no unmarked placeholder |
| High | Tab/Enter/Escape/pointer cancel/wheel/keyboard hold | accessible focus, no stuck pressed key, correct result |
| High | 1366x768 and 1920x1080 Windows viewport requests | actual measured viewport and screenshot; if unavailable NOT_RUN |
| High | Browser console/network since post-attachment reload | zero uncaught JS errors, requests confined to localhost served roots |
| Medium | Instructor D15 reset/replay/lesson scoring | separate platform QA; replay fingerprint not authentication |

## Requirements

- [ ] All publicly claimed FCV behaviors have source/document section or actually audited video timestamps and per-profile success/cancel/negative tests; 64 FCV and D15 distinct.
- [ ] Public banner exact: PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY; no restricted source/media in runtime or packaging.
- [ ] Real Windows browser smoke checks page load, controls, keyboard, hold, focus and responsive layout with console/network captured AFTER attach and reload.
- [ ] Completed individual training lessons can receive PUBLIC_REFERENCE_CONFORMANT only after source/rights/replay/browser/reviewer evidence. Overall hardware equivalence remains HOLD.

## Implementation Steps

### Task 6.1 — Full trace, rights and source/claim audit

- **Goal:** audit each of 64 FCV operator features, separately D15, and issue no false public/real-hardware claim.
- **Target:** docs/evidence/fcv588-public-trace-matrix.json, docs/reports/FCV588_PUBLIC_REFERENCE_ACCEPTANCE.md, **extend existing** test/fcv588-public-claims.test.mjs and test/fcv588-public-trace.test.mjs.
- **Steps:** (1) Before RED create minimal report heading; preserve Phase1 test logic and add new assertions for unsupported public certification, video metadata claimed as frame observation, D15 counted in FCV and sample source HOLD silently marked conformant. (2) GREEN attach test oracle and implementation evidence to each source-graded trace row; mark SOURCE_GAP, RIGHTS_HOLD, CONFLICT_HOLD or SIMULATED_APPROXIMATION explicitly as necessary. (3) REFACTOR check all source IDs resolve and screenshots are independently authored.
- **Success:** every claim has documented provenance/guard and no hardware status was promoted.
- **Verify:** RED node --test test/fcv588-public-claims.test.mjs test/fcv588-public-trace.test.mjs exits 1 with named coverage/claim assertion; GREEN same exits 0; REFACTOR node --test test/research-inventory.test.mjs and npm run check exit 0.

### Task 6.2 — Static UI/security and actual browser operation

- **Goal:** student interface is safe/accessible and genuinely runs in a browser on observed Windows viewport(s), not merely parsable by Node.
- **Target:** web/index.html, web/styles.css, web/app.mjs, web/hold-input.mjs, test/fcv588-public-browser.test.mjs and docs/qa/FCV588_PUBLIC_BROWSER_SMOKE.md.
- **Steps:** (1) RED static source/keyboard/responsive assertions for missing controls and invalid focus/order; importable/browser test scaffolding must exist. (2) GREEN fix observed issues without protected assets or new external services. (3) REFACTOR existing server/hold/browser tests. (4) **Mandatory live browser gate, recorded in docs/qa/FCV588_PUBLIC_BROWSER_SMOKE.md:** verify localhost 127.0.0.1:4173 readiness; if an existing approved service occupies 4173 reuse it, otherwise run npm start, no killing unrelated process. Use CoS Desktop browser_tabs(list then attach) BEFORE data collection. Clear/start browser_console and browser_network capture; then browser_navigate(action=reload) or navigate attached tab to localhost. Obtain post-navigation browser_snapshot/pageId. Exercise actual browser_action keyboard/pointer controls (not DOM-synthesized fake input), browser_screenshot and inspect console/network **from after reload**. Record actual window innerWidth/innerHeight, controls, state probes, Tab/focus, ESC, long press/pointer cancel, MODE timer, pause/reset/replay, clipping at target 1366x768 and 1920x1080 when available. If resize/attach/navigate/screenshot/console/network cannot be performed, record NOT_RUN and keep browser-release gate HOLD.
- **Success:** fully exercised stated cases have screen/probe evidence, no JS errors or nonlocal network requests since attached reload, and no clipped inaccessible physical controls in tested viewport(s).
- **Verify:** RED node --test test/fcv588-public-browser.test.mjs exits 1 named UI/security assertion; GREEN same exits 0; REFACTOR node --test test/server.test.mjs test/hold-input.test.mjs and npm run check exit 0. Additional mandatory browser proof: docs/qa/FCV588_PUBLIC_BROWSER_SMOKE.md names service readiness, tabId, attach time, reload time, actual viewport, per-action PASS/FAIL, saved screenshots, console errors=0 and network origin localhost-only since reload. If not fully observed, release gate remains HOLD regardless of Node tests.

### Task 6.3 — Replayable course lessons and conditional acceptance

- **Goal:** issue a defensible public training decision for complete exercises with clear omissions.
- **Target:** create test/fcv588-public-course.test.mjs, docs/reports/FCV588_PUBLIC_REFERENCE_ACCEPTANCE.md; consume Phase1 profile, Phase2-5 semantic probes and Phase6 browser evidence.
- **Steps:** (1) Create minimal valid course test/fixture first; RED requires every released lesson has fixture/profile ID, source/manual section, initial state, exact input event sequence, expected semantic probe, negative/cancel test and replay hash; does not accept sources that are E4 metadata-only. (2) GREEN enumerate completed workflows and separate incomplete/rights-held lessons, label all synthetic outputs. (3) Peer review claims and browser evidence before accepting public reference; maintain hardwareValidated=false and firmwareInstalled=null. (4) REFACTOR recheck D15 platform QA and course artifact rights.
- **Success:** only implemented/documented verified workflows receive per-lesson PUBLIC_REFERENCE_CONFORMANT; no blanket release of 64 unfinished rows.
- **Verify:** RED node --test test/fcv588-public-course.test.mjs exits 1 on missing lesson/source/probe assertion; GREEN same exits 0; REFACTOR node --test test/fcv588-public-claims.test.mjs test/fcv588-public-trace.test.mjs test/research-inventory.test.mjs and npm run check exit 0; reviewer and live-browser gates separately MUST be PASS before public course GO.

## Todo

- [ ] 64 FCV + D15 source/claim audit and independent rights review.
- [ ] Node static coverage and real browser smoke with attach-before-reload diagnostics.
- [ ] Reviewed conditional lessons and honest report; unknowns visible, hardware HOLD.

## Success Criteria

Only accepted source-backed lesson flows are released, with real observed browser evidence. If the host cannot attach/reload browser, no course GO can be declared. Synthetic simulator never certified for real navigation.

## Refactor / Tests After

No test can make a PHOTO_LAYOUT, forum description or video summary into a timing oracle. Keep claims tied to public trace, not scraped image pixels. Record source revisions and exact environment; browser network and console diagnostics must capture initial-load requests after debugger attachment. No work on AIS R5 UI in this phase.

## Risk assessment

Primary failures are silent rights leakage, test-name count being mistaken for fidelity, browser pre-attachment capture false PASS, accessibility gaps, and a released lesson without a source oracle. Any inconclusive browser or media claim is NOT_RUN or HOLD, not a PASS achieved by weakening criteria.

## Failure Protocol

If any Verify step does not meet its stated pass condition, STOP this phase. Do not improvise a fix, retry blindly, or reason around the failure. Spawn the kongming subagent for next-step counsel and pass:
- the phase and task id,
- what you attempted (the steps you ran),
- the exact command and its full output,
- the pass condition it failed to meet.
Apply kongming's guidance, then re-run the Verify step. If kongming cannot be spawned in this environment, STOP and report the same failure evidence to the user. Never continue by self-reasoning.


## V30 evidence checkpoint — 2026-10-16, not phase completion

The integrated configuration/LCD batch has current Node370, configuration Chrome264, FUNC76, LCD68 and four full Chrome context regression evidence. All53 current screenshots were opened. See [the executed V30 report](./reports/continuation-2026-10-16-v30-integrated-configuration.md) and [the full50/22 review](./reports/v30-checklist-review.md). Existing checkbox states and this phase's Failure Protocol are unchanged. Source-option draft resurrection (V30-B) and canonical alarm notice labeling (V30-E) remain open; no hardware, rights or lesson approval is implied.


## V31 checkpoint — 2026-10-16 (not phase completion)

V31 has source/response/harness-bound operator Chrome284/284 and12 opened current screenshots. The latest targeted Node52/53 is not GREEN; the incorrect fixture and required counsel gate remain open. Full Node/Python/previous Chrome suites were not rerun on V31. All65 public claims/release stay HOLD. See [V31 evidence](./reports/continuation-2026-10-16-v31-transactions-controls.md) and [the unchanged Failure Protocol disposition](./reports/v31-failure-counsel-packet.md).

## P07 bounded canonical QA observation — 2026-11-16 (not Phase6 acceptance)

Latest P07 read-only software QA against sealed P04 provenance v3: logical63/447 PASS, Chrome39/39 states and 108/108 actual loaded source-body SHA across 3 viewport sizes, screenshot39/39 SHA, security12/12 boundaries and 47/47 HTTP negatives, 8 original photo SHA, deterministic profile21 replay, Node563/563, Python13/13; independent reviewer GO only for bounded evidence. Final SHA `024dd1d75c7879fe0df88f939739d854a40aa819a459b6e1fbebd186aca91726`, post SHA `22fc21b744ebedbd5ac4a5998411c3e01f665697fa7fbb2a3726998909775ea6`. [P07 report](./reports/continuation-2026-11-16-photo-p07-bounded-independent-qa.md). Full Phase6 remains OPEN; 65/65 public claims HOLD. Genuine Narrator/NVDA output, OS window.blur, forced colors, physical photo ROI, firmware/version/rights and independent hardware/classroom acceptance are still NOT_RUN/SOURCE_GAP/HOLD; this evidence does not replace their gates.

## P08 bounded research only — 2026-11-16 (Phase6 remains OPEN)

Eight source-photo four-corner estimates and independent review exist, but 5/8 photo sets have disagreements greater than 20px (maximum 34.93px), so calibrated LCD ROI is HOLD. Native Windows readiness: Narrator executable present only, NVDA unavailable in checked paths, actual spoken screenreader/real OS blur/high contrast NOT_RUN. [P08 report](./reports/continuation-2026-11-16-photo-p08-roi-readiness.md), final SHA `3d1a05419617807b3f3ef24042725bf414d53257d5e7157155ca0a6b787bf16a` and post SHA `82706f90bf424515abc0383d9eb8b5a7895755bf2de1a040c7890a35f8610dd7`. 65/65 claims, rights, firmware, hardware, release HOLD.

## P09 restricted boundary QA — 2026-11-16 (not Phase6 acceptance)

Separate active LCD content from rounded inner aperture. Independent P09 image review supports restricted class-B virtual quads on two reference photos (`dual.jpg`, `zoom.jpg`) only; six class-B images and all eight class-A active-display ROI precision claims still HOLD. Mathematical QA: 16 base and 256 deterministic perturbation homographies PASS numerical validity only; no camera calibration or pixel/physical truth. Final SHA `759f146c349c2ad348fc5b98e21fbc79d1d857623253811f0a01d3b9408995b9`, post SHA `cc3888a17c34271ba9163b86cfe4427442a1e6b5a847e4ac714661565657a26e`; [P09 continuation](./reports/continuation-2026-11-16-photo-p09-boundary-geometry.md). Phase6 remains OPEN, all 65 feature claims HOLD, firmware/hardware/rights/release HOLD.

## P10 native a11y investigation — 2026-11-16 (not Phase6 acceptance)

Scoped Node17/17 and Chrome **emulated** forced-colors D15/POWER focus PASS. Actual Windows Narrator utterances BLOCKED, NVDA not found, native High Contrast NOT_RUN, and true OS focus-loss POWER test **NOT_VERIFIED** after two preserved FAIL/HARNESS_BLOCKED attempts because test Chrome never became real Win32 foreground. Independent evidence review SHA `dc7a8d07f9002bb61a28c7528d2b29c0bd9bf194ed208dec8a50fd66d07dffee`; final `414c0151053bec55271032170e0fba2139fd1627e5fee7524cdf6c1bcf490655`; post `df2cb60996da7f3f557642f329d794198aea9a85ac8fe5084429bee1931c12dc`. [P10 report](./reports/continuation-2026-11-16-photo-p10-native-a11y-boundaries.md). F1 Phase6 OPEN, all65 claims and rights/hardware/firmware/release HOLD.

## P11 native Win32 foreground proof — 2026-11-16 (not Phase6 acceptance)

P11 source-frozen QA establishes exactly scoped real Chrome foreground and subsequent test-owned Python witness foreground for two cases (Playwright Chrome and standalone Chrome with Win32 injected keyboard). Both cases show Chrome still `document.hasFocus=true`, no trusted post-transfer browser `window.blur`, and no POWER cancel; no app defect is established because the handler did not receive a verified native blur. Four FAIL/NOT_VERIFIED test receipts preserved, independent reviewer SHA `33df2e66e63ee173a5fca9293da7f2d26e0ed7a96a8ae6280c857b5291658667`. P11 final SHA `845b4fe9cf9b184a74ddba91783362e9446c1219d38362c16166d4b3d6a44c87`, post SHA `392220f62ae29c2f1bf77b73c90d016b1a3a40e115a8c04612ce59a728b09f98`, [P11 report](./reports/continuation-2026-11-16-photo-p11-native-foreground-boundaries.md). F1 Phase6 OPEN, all65 claims, native speech, firmware/hardware/rights/release HOLD.

## P12 public source menu-order research and NO_GO — 2026-11-16

The 2025 manufacturer manual Appendix 1 (PDF59 printed AP-1) and a single 2016-collection Vietnamese menu photo both evidence the 13-item Sounder order. Current atlas order differs. P12 source valid RED2/3 → staging GREEN3/3 with only menu order changed; full *incomplete* stage Node 499/526 (27 FAIL, five index-sensitive behavior assertions) does not authorize guarded apply. Independent review evidence GO, canonical apply NO_GO SHA `26bbcef289bf1b3663ac7a79766b87ff6431684632f07414aca4537d3bd29c6d`; final SHA `5afe2663a1d0d3dff6e213fc537fad3b7dfe5817d7aa776ee4a769e580780855`, post SHA `538ff2a5e518ed663274958c3a2c9c69e7458a7caa5317f868ae67fe4e184792`. [P12 report](./reports/continuation-2026-11-16-photo-p12-menu-source-order.md). No canonical source edit. All65 claims, F1 Phase6, firmware installed/locale, hardware, OEM rights/release HOLD.

## P13 staging acceptance but legacy replay STOP — 2026-11-16 (not Phase6 acceptance)

Complete isolated staging fixed the P12 incomplete-fixture problem: source-valid menu-order Node initially RED558/563, strict semantic-ID test rebaseline GREEN563/563 and Python13/13; real Chrome 2 viewports, 8 PNG and 72/72 loaded-source hashes PASS. **However old profile21 replay has the same event log/session hash while selected Sounder item shifts White Marker → Clutter under the source candidate**. Reviewers SHA `c1a99846aff873ccfa28db81670f5904f966426b957e87e4542cece8fb4ae1d4` and `41a9a0e07c41b33d0d71dcd99ba6b7bb331f6539ddafd1de12bda857299b9ea0` grant evidence GO, **canonical apply NO_GO**. P13 final SHA `5677a5db225e96e1412df4ea2776232081b050c3685b41b68bb2af89466b84db`, post SHA `803f190098a38d8eb8607e22651f288c42ed2701b853bd3791256dbb41af5862`. [P13 report](./reports/continuation-2026-11-16-photo-p13-fixture-profile21-replay-gate.md). Nothing applied to canonical and no profile21 release claim; F1 Phase6 OPEN, all65, firmware, hardware, rights and release HOLD.
 
