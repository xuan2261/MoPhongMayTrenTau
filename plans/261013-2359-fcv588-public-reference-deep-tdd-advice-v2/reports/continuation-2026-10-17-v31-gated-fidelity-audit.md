# FCV-588 V31 — gated continuation and device-LCD fidelity audit

Date: 2026-10-17. Workspace: C:\Work\MoPhongMayTrenTau.

**Status: READ-ONLY AUDIT, NOT IMPLEMENTATION / NOT VERIFICATION PASS / NOT RELEASE.**
This report continues the existing seven-phase v2 PUBLIC_REFERENCE plan. It neither
changes an accepted specification nor authorizes overriding any Failure Protocol.

## 1. Evidence and authority

- Active plan: plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/plan.md.
- V31-QA-01: Phase 2 Task 2.3, existing Node Verify exits 1 with 52/53 passing;
  exact unchanged failure: docs/qa/FCV588_V31_CONTROL_UNIT_GREEN.log and
  reports/v31-failure-counsel-packet.md. The incorrect fixture is at
  test/fcv588-public-control-presentation.test.mjs:31-35.
- A new read-only digest comparison on 2026-10-17 matched all 35/35 V31 runtime
  files listed in docs/qa/FCV588_V31_EVIDENCE_SUMMARY.json and all 10/10
  documents in docs/qa/FCV588_V31_POST_DOCUMENT_READBACK.json.
- Previously executed: operator Chrome 284/284 on 1366x768, 1920x1080,
  360x800 and 390x844, with current V31 image files under docs/qa/screenshots.
  No browser test was rerun during this audit.
- Manufacturer-grounded references are curated in
  docs/research/FCV588_PUBLIC_UI_REFERENCE_MATRIX_2026-10-14.md and
  docs/research/FCV588_OFFICIAL_VISUAL_COMPARISON_V28.md. Restricted manual
  archive bytes were not extracted, copied, transformed or redistributed.
- Actual AgentKit CLI reported version 3.0.0-beta.31 on 2026-10-17;
  Kongming's name can be discovered via Codex runtime listing but no connected
  Kongming delegation tool was exposed. Its definition/model/invocation and
  counsel remain UNVERIFIED / NOT_EXECUTED. A normal CoS worker is not Kongming.

## 2. Design authority for next UI batch

Product register: classroom-operated FCV-588 device-face simulator with external
teacher tools. Direction: preserve the independently authored instrument silhouette
and canonical controls, then reduce NON-OEM annotations **inside** the device LCD.
Do not replace this with a generic dashboard redesign, OEM photo background or
copied manufacturer assets. Existing dark UI and learning panel stay outside the
device. Physical proportions, typography and photometry remain REFERENCE_ESTIMATE.

## 3. Source-evidenced findings (NOT repaired)

### FID-01 — Visible Vietnamese lesson text inside the device LCD [MAJOR]

Evidence: web/lcd-control-presentation.mjs:26,34-35,46-47,55-56,62-63;
web/app.mjs:690-695 and 718; saved V31 screenshots
fcv588_operator_v31_green_1366x768_mode_pending.png,
fcv588_operator_v31_green_360x800_range_pending.png and
fcv588_operator_v31_green_1920x1080_brill_pending.png.
Observed: 'Hiện tại', 'Đang chọn', 'Còn ... (đồng hồ mô phỏng)', and
Vietnamese key instructions and source-section notes are painted in LCD
modal chrome. These are classroom hints, not demonstrated OEM LCD wording.
Candidate (gated): retain canonical displayed values/selection in LCD; move
help, timed-training explanation and citations to an external instructor
region with appropriate accessible status/labels. Do not change Range/Gain/
BRILL/MODE reducer, recorded clock, or Enter/Menu commit/cancel behavior.

### FID-02 — Training/provenance markers are painted as sonar/UI content [MAJOR]

Evidence: web/app.mjs:198,226-227,238,256-258,266,282,299,311,
440,450-453,476,540-546;
web/lcd-config-presentation.mjs:36-46,54-55,69-76,119;
web/lcd-presentation.mjs:120-123,138-139; web/app.mjs:757-880.
Observed markers include SIMULATED, TRAINING ONLY, SIM, [HOLD],
source-gap explanations and faux training diagnostics inside the hardware
LCD. They serve source caution but are not manufacturer-verified screen text.
Candidate (gated): separate semantic device state from teacher-only provenance
and safety messaging. Never silently present fictitious physical battery,
ship data, diagnosis or RF as measured inputs. Keep the global student-visible
PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY banner intact.

### FID-03 — Configuration/menu content mixes operator choices and pedagogy [MAJOR]

Evidence: web/lcd-presentation.mjs:104,120,132-140;
web/lcd-config-presentation.mjs:19,35-82,123-129;
web/app.mjs:600-601,645-647,667-668.
Observed: nested choice windows project coherent data but append explanations,
source flags and Vietnamese commit prompts in the device dialog. Acceptance
should distinguish supported OEM wording from explicit CLASSROOM_ONLY labels.
Candidate (gated): two projections from the same canonical state:
  (a) strictly source-supported device-visible options,
  (b) complete training/help/source-status explanation outside equipment.
Preserve choice order, disabled conditions, typed settings and D15 grading.

### FID-04 — [DEMO] is a source-gated exception, not automatically a violation [REVIEW]

web/app.mjs:555-560 visibly prepends [DEMO] when Demo On.
Curated docs/research/FCV588_PUBLIC_UI_REFERENCE_MATRIX_2026-10-14.md:45
and docs/research/FCV588_FULL_FUNCTION_INVENTORY_2026-10-13.md:89
attribute [DEMO] to operator manual §2.8. Therefore **do not blanket-remove**
this indicator under the user's prohibition on simulator-invented DEMO labels.
Still verify exact placement/style/conditions against licensed source evidence;
unverified pixel placement stays SOURCE_GAP. Distinguish this potential OEM
indicator from explicit synthetic training-status copy introduced by the app.

### FID-05 — Responsive layout is training reflow, not bezel equivalence [KNOWN HOLD]

Observed 360x800/390x844 screenshots show an enlarged touch-control layout.
docs/research/FCV588_PANEL_LCD_ATLAS_V28.md:71-83 labels this TRAINING_REFLOW;
web/index.html:29-31 warns outside the equipment element. Preserve legible
controls and >=44px touch targets without claiming real handset/device geometry.
Do not remove the outside-face training warnings merely to improve screenshots.

## 4. Current blocked Verify and proposed minimal repair (NOT APPLIED)

- Contract: Range opens Auto; TrackPad-right stages Manual; only Manual uses
  configured rangePreset4 to display converted 200 m as 656 ft.
- The existing test first calls key(boot(),'range') then expects 656 ft, with
  no TrackPad-right event. The implementation correctly renders Auto.
- After verifiable Kongming counsel OR explicit user-authorized amendment to
  the plan's supervisor requirement, fix **only the fixture** by driving the
  existing pad(key(boot(),'range'),'right') path; assert draftValue manual:3
  and preserved 656 ft conversion. Keep original failure log and SHA.
- Then run the exact targeted Verify and full Node/Python/Chrome
  FUNC/config/LCD/desktop/mobile suites against the same final source;
  retain new test output, browser screenshots, source/body/harness SHA and
  failure traceability. Do not label prior V30 PASS as V31 verification.

## 5. Proposed acceptance matrix for a later authorized LCD change

1. Viewport screenshots: 1366x768, 1920x1080, 360x800, 390x844.
2. Confirm all source-unbacked Vietnamese guidance and training markers are
   absent from painted LCD/device face, including Canvas draw text; source-
   supported device indicators, measured values and selection remain.
3. Confirm instructor guidance remains complete and accessible in external
   training panel; preserved safety disclaimer is always visible to learners.
4. On Range/Gain/BRILL/MODE/menu/installation: actual pointer/rotary/key
   staging, save, cancel, timeout, POWER and reset behave as before.
5. Verify screen projection, stored preferences, typed world observations,
   replay hashes and profile19->20 committed-settings import are unchanged;
   update text-centric tests with equivalent or stronger semantic assertions.
6. Hardware/OEM pixel matching, rights clearance and per-feature lesson
   acceptance remain HOLD unless independently substantiated.

## 6. Decision needed and priority

**P0 BLOCKED:** Obtain authentic callable Kongming counsel or record an explicit
user-approved change to the existing supervisor requirement. Generic approval
to continue the project is not interpreted as selection of a replacement.
**P0 NEXT:** Minimal test-only Manual fixture correction, targeted/full Verify.
**P1 NEXT:** Implement separation of device LCD content vs instructor-facing
support, then source-grade UI fidelity and run all four-viewport tests.
**P2 LATER:** Close C11/D09/D14, research D04 only when rights/source allow,
review 64 FCV plus D15 claim matrix, never auto-promote any HOLD.

## 7. Independent read-only review and source reconciliation

A newly created CoS worker (not Kongming) independently inspected the
existing UI code, V31 Range/BRILL/MODE screenshots and V28 graded images.
Its evidence corroborated FID-01, FID-02 and FID-03 and added Canvas labels
at app.mjs:226-227,238,282,299,311,476. It also noted the mobile note and
device footer in index.html:30,90: they are outside .equipment but nested
inside .device-frame; do not mistake that wrapper for an OEM face measurement.

The worker proposed treating DEMO as a generic training-only token. That
subfinding is NOT automatically accepted: the project's source matrix
UI-13 and operator inventory D08 explicitly attribute [DEMO] to manual
section 2.8. First establish the authoritative real-device presentation;
only unsourced spelling/placement/conditions may be corrected. Never
delete a documented OEM marker merely to satisfy a lexical UI test.

The worker edited no files, ran no tests, created no children and did not
provide Kongming or release approval. Its observations are static review.

## 8. Execution boundary on 2026-10-17

Only read-only command/source/hash inspection and review of existing saved
images was completed. No application source/test file was edited. No
new tests, browser journeys, new server, Git operations, asset import,
permission change, installation, firmware I/O or release occurred. This
document is a report of observed evidence and a conditional work plan,
**not a Kongming receipt or a passing software QA result**.
