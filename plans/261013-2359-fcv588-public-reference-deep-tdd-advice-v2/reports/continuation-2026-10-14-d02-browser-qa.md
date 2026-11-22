# FCV-588 F1 continuation — D02 range bank, browser QA, acceptance reconciliation

**Date:** 2026-10-14 (Windows local session UTC+07)  
**Workspace:** `C:\Work\MoPhongMayTrenTau` (`.git` absent)  
**Decision:** Software regression PASS in tested scope; source/operator conformance,
physical fidelity, rights, per-lesson independent reviewer and release all **HOLD**.

## Work verified from actual files and execution

- Resumed the already-modified workspace, including C05 synthetic Arrival,
  C13 Trip/Odometer, D10 instructor-only fault cues and A17 browser tone/TrackPad
  repeat. Did not rewrite either historical execution plan, create Git history,
  touch real sensor I/O or copy OEM media into the application.
- Prior new-work baseline: `npm run check` **199/199 PASS**, exit 0; generated
  64+D15 checkpoint classified 61 synthetic operator/platform subset rows and
  4 menu-only rows, all with claimDecision HOLD.
- **D02 implementation:** eight individually persisted classroom slots
  `rangePreset1` through `rangePreset8` under `System > Range Presets`;
  staged TrackPad edits, ESC cancels, ENTER commits, and physical Manual RANGE
  reads the selected slot through `effectiveRangeM` without changing world
  observations. Auto RANGE remains independent. Original LCD dialog shows
  the eight values and a SIMULATED/NOT OEM VERIFIED caveat.
- D02 version transition: profile revision `F1-public-reference-9`, local
  settings schema v8/key `...settings.v8` and updated device registration.
  Old schema/profile settings reject instead of silently reinterpreting values.
  Core event-envelope semantics did not change during D02 itself.
- TDD: the first exploratory RED harness incorrectly failed on a missing
  named export at module load; corrected the test to use an importable
  namespace and **named behavioral assertion** (bank length 0 versus required
  8), plus missing modal assertions. GREEN D02 suite: **5/5 PASS** including
  evidence HOLD, slot edits, cancel, replay/persistence and UI wiring.
- Related menu/acceptance/persistence test selection **22/22 PASS**.
  Full `npm run check` after the implementation **205/205 PASS, 0 failures,
  exit 0**. The acceptance/menu source JSON generators were refreshed.

## Actual Chrome UI evidence

Existing browser tab:
`fe511b70-a999-40a8-8baf-4d8396609596:1626495409`;
serving localhost port 4173 using the already-running Node process (PID 36768).
New page ID after the final reload:
`51fb6f13-a6f8-4476-8b5c-d4417d8ddaf8`.

| Observation or action | Verified result |
| --- | --- |
| Browser viewport | `innerWidth=1912`, `innerHeight=970`, `scrollWidth=1912`: no horizontal overflow |
| Logical device screen | Canvas `width=480`, `height=640` |
| Instructor panel | New D10 fault buttons present; separate from device face |
| D02 operator flow | MENU, System, Range Presets displayed eight slots; Range 1 from `5 m` to `10 m`, ENTER committed |
| Persistence | Browser storage schema v8 contained `rangePreset1: "10"`; after reload same value restored and unit initially POWER OFF |
| Replay | Actual button `Kiểm tra replay` returned `REPLAY PASS` with 56 events |
| Teacher reset | POWER OFF, event log reset with one restore event; stored settings unchanged |
| Network after reload | 24 requests to loopback only, all HTTP 200; no HTTP errors/failures |
| Console after reload | 0 captured JavaScript errors |
| Screenshot | Native screenshot ID `2d2f259c-6442-4932-ac71-e2de5051b728` (1600×812 scaled output), **not saved** as verified PNG |

Prior profile8 attached-browser observations additionally exercised D10
low-battery/system-error toggles, UI annunciation and 850-ms held TrackPad
with four logged pad events. These are not a separate profile9 certification.

## Evidence quality and remaining gates

The latest checkpoint classifies **62 `OPERABLE_SYNTHETIC_SUBSET` (D15
included), 3 `MENU_ONLY_PARTIAL` (D04 language/reboot, D06 calibration,
D14 operator-level IEC/NMEA), 0 `NOT_IMPLEMENTED`**. This is a conservative
inventory classification, **not 62 independently certified FCV workflows**.
Source rights and firmware conditions remain unchanged; all 65 rows are
`claimDecision=HOLD`. D02 values, physical repeat cadence, alarm radii, fault
injection, sonar and navigation are classroom approximations. No real
serial/network vessel interface may be added to make D14 appear complete.

Not observed on the latest Chrome profile: true 1366×768 and 1920×1080
viewports, physical POWER long hold, lostpointercapture/pointercancel while
held, full source/visual/manual parity and independent per-lesson signoff.
Screenshots returned an ID, not a saved PNG. No installed firmware or real
transducer was supplied or required. The browser smoke cannot approve a
physical implementation or remove source/rights constraints.

The active seven-phase v2 plan still has **22 `### Task` units and 50 CLI
checklist entries with 10 checked / 20%, Phase1 only**; later code exists,
but dependent phase acceptance is incomplete. A manual archive verification
in this session rechecked 24 PDFs and 2 ZIPs (197171462 bytes), with 3
acquisition gaps and zero validation failures. Generator trace, menu,
acceptance and `ak plan validate/parse` returned PASS for their stated scope.

Installed packaged workflow guidance actually read: `skills-router`,
`ak-cook`, `ak-test` and `ak-debug`; source edits and Node/Chrome testing
used existing Windows tools. **No native `/ak-cook --auto --tdd --advice`
dispatch or Kongming review/supervision was verified**; previous independent
review workers are not a substitute for that receipt.

## Next engineering acceptance targets

1. Phase2–3: prove browser hold/cancel and keyboard pointer equivalence at
   accepted viewports; source-map nested Range/Zoom/B/L and installation
   menu variants rather than present them as exact device controls.
2. Phase4–5: continue targeted negative tests for compatibility, alarm
   acknowledgement/cause, stale navigation, fault cues, and under-documented
   Display/Data variants; preserve explicit source gaps.
3. Phase6: save controlled Chrome screenshots with actual file paths and
   reviewer approval for specific lessons only, not the entire FCV hardware.
4. Phase7: regression shared-world isolation with inert second-device
   observers; leave undecided AIS/NS4000/KODEN variants untouched.

**Disposition:** Continue development toward public-source class exercises;
do not mark Phases 2–7 checked or claim 100% FCV-588/OEM equivalence.
