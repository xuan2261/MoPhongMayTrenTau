---
title: "Phase 2: Physical Panel, Inputs, Power, BRILL, MODE, RANGE, GAIN, VRM"
status: todo
---

# Phase 2: Physical Panel and Basic Controls

## Overview

**Priority P1; depends on Phase1.** Replace F0 behaviors that demonstrably diverge from the printed official operator sequences. The product is **manual/public-reference conformance**, not a claim of real knobs' tactile force or a photographed student unit.

**Deep Pre-execution Scout Gate:** Re-read `web/index.html`, `web/styles.css`, `web/app.mjs`, `web/hold-input.mjs`, `src/devices/fcv588/{model.mjs,adapter.mjs}`, `src/core/{session.mjs,protocol.mjs}`, current tests and Phase1 evidence ledger. Re-check official §1.1–1.7 and source/photo references; note if a video timestamp was actually reviewed. Unknown FUNC hold remains UNVERIFIED.

**TDD RED bootstrap and legacy-test migration:** Create an importable new test and verify a named behavioral assertion fails (never pass RED via ENOENT/syntax error). **Existing F0 tests can encode deliberately provisional behavior**: for instance, `test/device.test.mjs` currently expects MODE to change immediately. When the source-backed selector is implemented, update such assertions *with documented manual section and a before/after explanation*; do not preserve a known false teaching interaction merely to keep the old test green. Preserve old session fixtures separately when replay compatibility is intentionally broken by a profile revision.

## Requirements

- [ ] Distinct buttons MENU/ESC, TrackPad, ENTER, RANGE, MARK, FUNC, GAIN(push/rotate), MODE(rotate), POWER/BRILL; portrait LCD 480×640, originally drawn panel.
- [ ] MODE first rotation opens selector for nominal about 6s, next rotation chooses mode; startup MODE shortcut and indicated LF/HF/DUAL/NAV/Zoom title follow publicly documented behavior.
- [ ] BRILL repeated press cycles brightness and about-6s inactivity close; POWER long-press >3s with countdown; separate UI timer vs world clock where necessary.
- [ ] RANGE repeated press in manual selects presets; Gain Auto Fishing/Cruising with offset and manual limits; VRM text adjacent to line and NAV-mode prohibition.
- [ ] Keyboard, pointerId/focus/cancel, wheel and held-key replay remain deterministic and testable; no helper +/- on the painted real panel.

## Implementation Steps

### Task 2.1 — Original accurate-looking panel and normalized physical inputs

- **Goal:** consistent source-backed control geometry and keyboard/pointer mapping with no invented OEM bitmap reuse.
- **Target:** `web/index.html`, `web/styles.css`, `web/hold-input.mjs`, `test/web-layout.test.mjs`, `test/hold-input.test.mjs`, new `test/fcv588-public-panel.test.mjs`.
- **Steps:** (1) RED geometry/source-label and distinct control assertions; failure must name expected label/region. (2) Redraw independently from official front/side image references with perspective limitation; maintain instructor assist outside machine. (3) GREEN, then refactor CSS and retest keyboard/pointer.
- **Success:** correct control identities/order, scalable original artwork, no focus traps/stuck holds.
- **Verify:** RED `node --test test/fcv588-public-panel.test.mjs` non-zero assertion failure; GREEN exits 0; `node --test test/web-layout.test.mjs test/hold-input.test.mjs` exits 0; `npm run check` exits 0.

### Task 2.2 — MODE/POWER/BRILL state transitions and timers

- **Goal:** manual-backed timing and startup behavior, recorded in replay, independent of synthetic sonar clock.
- **Target:** `src/devices/fcv588/model.mjs`, `src/core/session.mjs`, `web/app.mjs`, new `test/fcv588-public-basic.test.mjs`.
- **Steps:** (1) RED meaningful assertion for MODE selector vs old immediate mode, BRILL repeat cycle/auto-close, MODE during boot, POWER countdown/off. (2) Implement FCV-only selector/timer state with explicit event clock. (3) Update old F0 assertions (such as immediate MODE wrap) that contradict the public source, documenting each superseded expectation; preserve unaffected tests. (4) Verify manual-specified >3s power; mark FUNC threshold provisional if no public source. (5) GREEN then REFACTOR/replay tests.
- **Success:** exact published transitions reproduced where explicit; unproven subsecond/hardware debounce not claimed.
- **Verify:** RED `node --test test/fcv588-public-basic.test.mjs` non-zero assertion failure. GREEN same exits 0; `node --test test/core.test.mjs test/device.test.mjs` and `npm run check` exit 0.

### Task 2.3 — RANGE/GAIN/VRM with variant guards

- **Goal:** staged/committed controls and visible VRM/range response matching official manual, without modifying WorldState.
- **Target:** `src/devices/fcv588/model.mjs`, `src/core/scenario.mjs`, `web/app.mjs`, `test/fcv588-public-basic.test.mjs` and `test/core.test.mjs`.
- **Steps:** (1) RED manual Range repeat/Auto/Manual, Gain Auto Offset and manual, VRM in sounder vs NAV. (2) Implement guarded reducer and separate display projection. (3) Use source-backed labels; defer missing physical detent sensitivity. (4) GREEN/REFACTOR with negative cases.
- **Success:** no world mutation, no false success for a disabled control, input/replay deterministic.
- **Verify:** RED `node --test test/fcv588-public-basic.test.mjs` exits non-zero on a named RANGE/GAIN/VRM behavior assertion (not import/ENOENT/syntax); GREEN same command exits 0; REFACTOR `node --test test/core.test.mjs test/device.test.mjs` and `npm run check` exit 0.

## Todo

- [ ] Panel labels and input mapping source-linked, original artwork only.
- [ ] Power, BRILL, MODE controls pass public-manual transitions and timed event tests.
- [ ] RANGE, GAIN, VRM and disabled contexts match stated reference branches.
- [ ] All existing F0 replay/pointer/HTTP tests remain green.

## Success Criteria

**PASS:** student can operate all supported basic controls without an unmarked placeholder. Success relies on manual behavior and repeatable browser states, not an unsupported screenshot-identical claim. Store source IDs per approved training lesson.

## Failure Protocol

If any Verify step does not meet its stated pass condition, STOP this phase. Do not improvise a fix, retry blindly, or reason around the failure. Spawn the `kongming` subagent for next-step counsel and pass:
- the phase and task id,
- what you attempted (the steps you ran),
- the exact command and its full output,
- the pass condition it failed to meet.
Apply kongming's guidance, then re-run the Verify step. If `kongming` cannot be spawned in this environment, STOP and report the same failure evidence to the user. Never continue by self-reasoning.
