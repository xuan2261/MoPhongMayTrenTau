---
title: "Phase 2: Source-Backed Physical Panel, UI Clock and Basic Controls"
status: todo
---

# Phase 2: FCV-588 Physical Controls and Deterministic Timers

## Overview

**Priority P1, depends on Phase1.** Replace demonstrably wrong F0 operator interactions, not the shared simulation architecture. Target the physical keys, MODE, POWER/BRILL, RANGE, GAIN/Auto offset and VRM, plus a replayable UI timer separate from world clock. Unknown tactile/detent/firmware details stay REFERENCE_ESTIMATE or SOURCE_GAP.

**Deep Pre-execution Scout Gate:** Read current src/devices/fcv588/model.mjs (especially MODE rotate and overlays), adapter.mjs (FUNC 650ms provisional), src/core/protocol.mjs, session.mjs, web/index.html, web/styles.css, web/app.mjs, web/hold-input.mjs, test/device.test.mjs, test/core.test.mjs, test/hold-input.test.mjs and Phase1 frozen profile/trace. Check manufacturer operator sections §1.1-1.7 and official panel photos from linked pages. Record which exact timing rules are in a permitted curated source; never promote F0 heuristics. Do not start code until Phase1 check and source rights are satisfied.

## Dependencies, file inventory and ownership

Phase1 profile -> UI independent time/event semantics -> input reducer -> Canvas/dialog projection. Only one canonical session/replay version upgrade. Local/teacher buttons cannot modify raw sensor state.

| Existing file / proposed target | Action and size | Test impact |
| --- | --- | --- |
| src/devices/fcv588/model.mjs | Modify ~155 LOC reducer for panel state | test/device.test.mjs migration, new test/fcv588-public-basic.test.mjs |
| src/devices/fcv588/adapter.mjs | Modify ~37 LOC metadata and semantic probes | revision/profile replay contract |
| src/core/protocol.mjs, src/core/session.mjs | Design review then minimal explicit UI-clock event; ~86/159 LOC existing | core replay/version/clock tests |
| web/index.html, web/styles.css, web/app.mjs | Redraw original ~480x640 panel and timed dialogs | test/web-layout.test.mjs, public browser smoke |
| web/hold-input.mjs | Reuse existing safe edges, change only if necessary | test/hold-input.test.mjs |
| test/fcv588-public-panel.test.mjs, test/fcv588-public-basic.test.mjs | Create importable, purposeful tests | precondition RED; entire npm suite after GREEN |

## Tests Before / scenario matrix

| Severity | Initial state and input | Expected transition |
| --- | --- | --- |
| Critical | F0 POWER OFF, teacher scenario clock advances | World advances; powered-off display stays off |
| Critical | F0 LF on; first MODE detent | Opens selector; effective mode remains LF until documented confirmation/timeout |
| Critical | Paused scenario with MODE/BRILL overlay | Recorded UI clock advances/overlay closes without advancing world tick; replay identical |
| Critical | Old F0 envelope replayed under changed operator profile | Explicit contract/profile rejection; no silent semantic migration |
| High | BRILL repeated press, ESC, 6-second inactivity | Documented brilliance level and dialog close; no unsourced values |
| High | POWER hold >3 s, release before threshold | Correct shutdown/countdown vs short press; boundary inputs tested |
| High | RANGE Manual repeated presses / Auto; Gain Auto offset; NAV VRM | Correct staged branch/cancel, bounded values and disabled contexts |
| Medium | wheel/pointer/Tab/blur/cancel, instructor +/- | No stranded hold; trainer affordance outside equipment |

## Requirements

- [x] Original panel artwork from independently drawn geometry, separate ENTER, TrackPad, POWER/BRILL and two rotary knobs, 480x640 logical LCD; instructor assists stay distinct.
- [ ] Explicit recorded UI time permits ~6-second MODE/BRILL timeout even when teacher pauses synthetic world; replay and profile versions updated consistently.
- [ ] Power/startup/hold-off behavior, MENU/ESC, RANGE, GAIN+offset and VRM obey manual-supported transitions; FUNC 650ms remains visibly provisional if no better evidence.
- [ ] F0 tests asserting known-wrong immediate MODE semantics are migrated with source citation and before/after rationale, not disabled.

## Implementation Steps

### Task 2.1 — Panel geometry and input fidelity

- **Goal:** a usable source-backed physical interaction surface with original art.
- **Target:** web/index.html equipment markup, web/styles.css .equipment/.controls, web/hold-input.mjs, test/fcv588-public-panel.test.mjs.
- **Steps:** (1) Characterize existing separate ENTER/TrackPad, hold edge cancellation and trainer help. (2) Write RED test requiring correct control IDs/relative regions and accessible keyboard focus, no hidden instructor controls inside bezel. (3) GREEN independently draw panel using documented approximate 233x270 face and 480x640 LCD; never paste protected OEM art. (4) REFACTOR keyboard/wheel/pointer tests and source-based geometry tolerance labeled REFERENCE_ESTIMATE.
- **Success:** every named control is separately reachable and no key hold remains after blur or pointercancel.
- **Verify:** RED node --test test/fcv588-public-panel.test.mjs exits 1 with named control/geometry assertion, not ENOENT/syntax; GREEN same exits 0; REFACTOR node --test test/web-layout.test.mjs test/hold-input.test.mjs and npm run check exit 0.

### Task 2.2 — Replayable UI clock and MODE selection

- **Goal:** MODE window and ~6s idle behavior are correct even when training scenario time is paused.
- **Target:** src/core/protocol.mjs validateInput, src/core/session.mjs dispatch/replay, src/devices/fcv588/model.mjs reduceFcv588, src/devices/fcv588/adapter.mjs revision, web/app.mjs timer, test/fcv588-public-basic.test.mjs.
- **Steps:** (1) RED: from LF, first MODE +1 detent opens overlay kind=mode without immediately changing effective LF, and after recorded UI elapsed 6000ms overlay closes while worldState.simTick unchanged; replay matches. (2) RED: F0 envelope cannot silently replay under a new PUBLIC_REFERENCE reducer revision. (3) Design a normalized bounded UI-clock event kind=ui-tick with integer elapsedMs, no raw DOM timestamps in reducer; have session log and replay it without advanceWorld. Add explicit schema/profile revision and verify contracts before changing saved lessons. (4) GREEN MODE detent/selection/timeout/boot route from curated manual; browser timer must dispatch UI tick while world is paused. (5) Update test/device.test.mjs F0-immediate assertions only where source-backed behavior supersedes them; keep unaffected replay tests. (6) REFACTOR.
- **Success:** separate UI time and world time, no unlogged state transitions, correct preview/commit window semantics and old replay fails closed.
- **Verify:** RED node --test test/fcv588-public-basic.test.mjs exits 1 with named selector/ui-clock assertion; GREEN same exits 0; REFACTOR node --test test/core.test.mjs test/device.test.mjs and npm run check exit 0. If model source lacks precise timeout rule, retain source-grade tolerance and document test oracle rather than fake exactness.

### Task 2.3 — POWER, BRILL, RANGE, GAIN and VRM edge cases

- **Goal:** credible student sequences on powered, booting and disabled-context screens.
- **Target:** src/devices/fcv588/model.mjs, adapter.mjs, web/app.mjs, test/fcv588-public-basic.test.mjs, test/core.test.mjs.
- **Steps:** (1) RED separate tests for POWER short/long boundary (>3000ms), countdown, BRILL 0-9 cycle and ~6s dialog, RANGE repeat presets after Manual, Gain Fishing/Cruising/Off with -5..+5 Auto Gain Offset, bounded manual 0..10 and VRM unavailable in NAV. (2) GREEN implement FCV-specific state transitions in reducer; raw world/observation remains unchanged. (3) Label any exact VRM spacing / FUNC hold threshold not in public source PROVISIONAL. (4) REFACTOR bad-order, ESC and replay and update stale test expectations with manual section and revision note.
- **Success:** deterministic interactive controls with no false success or unearned hardware-equivalence claim.
- **Verify:** RED node --test test/fcv588-public-basic.test.mjs exits 1 on named feature assertion; GREEN same exits 0; REFACTOR node --test test/core.test.mjs test/device.test.mjs and npm run check exit 0.

## Todo

- [x] Task 2.1 independently drawn/accessible panel and input replay.
- [ ] Task 2.2 MODE selection and UI clock independently recorded/replayed.
- [ ] Task 2.3 power/BRILL/Range/Gain/VRM reference paths and negative states.

**Partial acceptance evidence, 2026-10-15:** the two checked entries are
supported by the original independently authored panel in web/index.html
and web/styles.css, the named 233x270/480x640 geometry and control
separation tests in test/fcv588-public-panel.test.mjs, DOM keyboard and
pointer/blur/cancel regressions, and direct Google Chrome desktop/mobile
response-bound V22 receipts recorded in
reports/continuation-2026-10-15-v22-receiver-palette-lesson-browser.md.
The V22 desktop-centering regression had an actual named RED failure before
the original CSS adjustment; targeted and full Node suites finished GREEN.
These checks prove classroom source-backed accessible *approximation*,
not measured OEM bezel/switch geometry. Other phase requirements and
tasks remain unchecked until their full source/timing and acceptance
clauses are independently reconciled; Phase 2 is still OPEN.

## Success Criteria

All 3 tasks verified with new RED→GREEN and F0 behavior migration evidence; project and browser inputs remain offline. Human hardware-equivalence signoff is not part of this PUBLIC_REFERENCE phase.

## Refactor / Tests After

Keep core world invariant, avoid multiple UI timers, bump public device revision for any semantic breaking change and include profile IDs in replay metadata. Run syntax checks explicitly for any new module not covered by current npm check script. Physical response time/tactile detents remain UNKNOWN until instrument-based future acceptance.

## Risk assessment

The strongest risk is cross-clock coupling or replay drift. If UI timing makes world tick advance or depends on an unlogged Date.now/timeout, STOP the phase and re-design. Real-mode control order may differ by revision: SOURCE_GAP for unverified firmware paths. Do not tune tests only to match F0 output.

## Failure Protocol

**User-approved prospective supervisor exception, 2026-10-18:** For
Phase 2 Task 2.3 and subsequent work, refer to
[`reports/2026-10-18-gpt6-supervision-amendment.md`](./reports/2026-10-18-gpt6-supervision-amendment.md).
GPT-6 in this conversation is the authorized review/go-no-go supervisor
instead of Kongming. Preserve exact errors, STOP on newly failed Verify,
review evidence before fixes, and never invent independent counsel.
The historic V31-QA-01 failure, its unchanged log, and release HOLD remain
valid historical facts.

If any Verify step does not meet its stated pass condition, STOP this phase. Do not improvise a fix, retry blindly, or reason around the failure. Spawn the kongming subagent for next-step counsel and pass:
- the phase and task id,
- what you attempted (the steps you ran),
- the exact command and its full output,
- the pass condition it failed to meet.
Apply kongming's guidance, then re-run the Verify step. If kongming cannot be spawned in this environment, STOP and report the same failure evidence to the user. Never continue by self-reasoning.


## V31 checkpoint — 2026-10-16 (not phase completion)

The V31 control/transaction batch is implemented, with recorded BRILL idle correction and compact Range/Gain/BRILL/MODE LCD feedback. New operator Chrome284/284 passes, but the latest targeted Node52/53 contains an incorrect Auto fixture expecting a Manual conversion. V31-QA-01 remains OPEN; no test correction or full regression followed the required counsel stop. No criterion is promoted. See [V31 evidence](./reports/continuation-2026-10-16-v31-transactions-controls.md) and [the unchanged Failure Protocol disposition](./reports/v31-failure-counsel-packet.md).

## Later supervised technical checkpoint — 2026-10-18

The preceding 2026-10-16 STOP remains accurate historical evidence.
On 2026-10-18 the user explicitly approved GPT-6 as supervisor instead of
Kongming; the original failure log remained unchanged. The bad test
fixture was corrected using the actual RANGE Auto→Manual TrackPad-right
transition and the targeted Verify passed 53/53. Subsequent V34/V35
canonical software QA passed full Node 442/442, Python 13/13, and
two source-bound Chrome runners totalling 450/450 checks.
No separate manual/firmware/physical-geometry conformance or complete
per-requirement review was performed by this success, so outstanding
Phase 2 checkboxes and acceptance status are not silently promoted.
See the [V35 technical checkpoint](./reports/2026-10-18-v35-integrated-c11-d09-d14-source-matrix.md).
