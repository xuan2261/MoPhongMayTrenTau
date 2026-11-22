---
title: "Phase 2: Physical UI, Inputs, Boot, BRILL, MODE, RANGE, GAIN and VRM"
status: todo
---

# Phase 2: Physical UI, Inputs and Basic Operation Fidelity

## Overview

**Priority P0/P1, depends on Phase 1.** Replace illustrative F0 shortcuts/placeholder behavior with measured key/knob/TrackPad interaction. Scope covers inventory A01–A12 and the platform's replay/keyboard/touch reliability.

**Existing files:** `web/index.html`, `web/styles.css`, `web/hold-input.mjs`, `web/app.mjs`, `src/core/protocol.mjs`, `src/core/session.mjs`, `src/devices/fcv588/model.mjs`, `src/devices/fcv588/adapter.mjs`, tests. No real hardware driver.

**Numeric gate authority:** [FCV588_FIDELITY_ACCEPTANCE_PROTOCOL.md](../../docs/research/FCV588_FIDELITY_ACCEPTANCE_PROTOCOL.md). The internal target is button/layout error ≤2% of aligned panel dimensions; zero missed/duplicate/reversed events per 30 trials of each gesture/detent class, plus POWER boundary repetitions at 2.8/3.0/3.2 s. Freeze or replace thresholds in Phase 1 based on the physical unit **before** this phase is accepted.

## Requirements

- [ ] Proportional portrait 480×640 LCD, measured bezel and independent ENTER/TrackPad, panel image/layout with cleared rights. Mouse-only ± detents remain in a distinct instructor aid, never look like OEM hardware.
- [ ] Physical press, hold, release, cancel, TrackPad repeat and knob detents map to one canonical input with no phantom action. POWER >3s correct; FUNC long threshold measured, never assume existing 650ms heuristic.
- [ ] MODE: initial rotation opens approximately 6-second mode selector; selecting a position updates the matching LF/HF/DUAL/NAV/Zoom screen. Actual startup-to-mode shortcut verified.
- [ ] POWER shows correct boot/turn-off countdown; last saved settings restored unless lesson reset intentionally overrides them.
- [ ] BRILL cycles 0–9 and back per documented repeated-press behavior, auto-closes after about 6s, ENTER/MENU exits with hardware-correct commit rules.
- [ ] RANGE manual/auto, repeat-key selects range presets, correct header, restrictions in Bottom Discrimination; GAIN manual 0–10, Fishing/Cruising + Offset ±5; VRM moved by actual trackpad increments and readout next to marker (disabled in NAV).

## Implementation Steps

1. **RED:** parameterized tests for actual manual input sequences including first MODE click opening a selector; MODE action while booting; POWER shutdown countdown; BRILL repeat cycle/timeouts; RANGE repeated press; GAIN Offset; VRM exact label/step. Verify against measured unit, not the old F0 reducer assumptions.
2. Refactor physical input translation in `web/hold-input.mjs` as necessary to preserve press duration and detents under focus changes, multiple pointers, keyboard autorepeat and paused simulation time. Keep browser-only metadata out of the core log.
3. Implement per-FCV finite-state transitions and a deterministic UI inactivity clock, separate from sonar world time where the real panel requires it. Rendering frames must not advance state.
4. Replace hard-coded F0 defaults with a versioned target profile, preserving a separate reset-to-lesson operation.
5. Generate authorized visual checkpoints (off, startup, LF, HF, DUAL, NAV1/2, ZOOM selector, Range, Gain, Brill, VRM) at target Windows DPI and scale.
6. Run `npm run check`, browser E2E click/key/pointer/wheel paths, and at least **30 operator-witnessed input trials per gesture/detent class** with **0 missed/duplicate/wrong-direction events**; measure latency/hold/timers against the signed Phase 1 tolerance profile.

## Todo

- [ ] First MODE interaction opens selector and changes modes with correct timeout.
- [ ] BRILL repeat/cycle/timeout; POWER startup/hold visual countdown verified.
- [ ] RANGE+GAIN+VRM target firmware behavior tested, including invalid contexts.
- [ ] Keyboard, mouse, touch input edge tests cover focus, pointercancel and no repeat storms.
- [ ] Photos/screenshots licensed, geometry annotated and external trainer controls visibly segregated.

## Success Criteria

**PASS:** all A01–A12 applicable actions match the inspected FCV-588 for success/cancel/timeout/edge cases within the signed geometry/timing/event thresholds; independent operator signs off. No F0 mock placeholder is used in any approved basic lesson.

**Failure protocol:** discrepancies from physical machine -> document source, create targeted RED test, correct, rerun; if firmware or rights conflict return to Phase 1. Do not silently relax timing or visual tolerance.
