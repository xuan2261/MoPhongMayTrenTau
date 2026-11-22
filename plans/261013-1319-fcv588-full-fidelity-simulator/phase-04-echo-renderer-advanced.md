---
title: "Phase 4: LF/HF Echo Display and Advanced Transducer Modes"
status: todo
---

# Phase 4: LF/HF Echo Display and Advanced Transducer Modes

## Overview

**Priority P1; depends on Phases 1–3.** Implement the visual and behavioral model of the FCV-588 display without claiming to reproduce proprietary sonar physics. Scope includes inventoried B01–B20 and the parts of A06–A10 driven by the sounder. Training sensor data stays synthetic, deterministic and independent of the view controls.

**Existing source:** `src/core/scenario.mjs` raw observation, `src/devices/fcv588/model.mjs` pure reducer, `web/app.mjs` display projection and Canvas. Do not feed post-processed pixels back into shared-world truth.

**Fidelity criteria:** use the Phase 1 signed tolerance profile. Initial internal target: all applicable static menu/header/marker semantic states exact; ≤3% mismatched pixels in registered, declared *static-only* screenshot regions with approved mask/antialias allowances. Dynamic echogram fidelity is judged via deterministic mode/layout/controls, **not** raw pixel identity to proprietary sonar data.

## Requirements

- [ ] Accurate LF 50 kHz, HF 200 kHz and DUAL panel layout by firmware; Bottom Lock/Bottom Zoom/Marker Zoom modes, correct zoom ranges, position/markers, NAV placeholders for missing inputs.
- [ ] Picture Advance 4×/2×/1×/1/2..1/16 and Stop affect the displayed scroll window while scenario time and future AIS remain unaffected.
- [ ] Gain, Auto Gain Offset, Range, Shift, TVG, Clutter, Interference, Color Erase, White Line/White Marker, Smoothing, A-Scope and palette changes visibly affect the synthetic display as documented.
- [ ] Transducer-dependent ACCU-FISH, Bottom Discrimination and RezBoost obey all verified capability guards; unsupported options are disabled, not faked.
- [ ] Display options: color bar, header, legends, bottom zone, temperature graph, zoom marker, depth label and sounder status as applicable to actual unit.
- [ ] Every display response is deterministic given scenario/profile/clock/inputs, and screenshots use only original drawings or assets with recorded license.

## Implementation Steps

1. Capture legally sourced reference screenshots/video for all target firmware display modes and sounder configuration combinations. Freeze baseline fixture IDs and screen dimensions 480×640.
2. **RED:** pixel-independent semantic tests for each control and shader/postprocess response: Gain/TVG/Clutter/Interference/Range/Color/Zoom/A-Scope, including min/max and invalid configuration. Regression: none modifies shared-world state.
3. Evolve synthetic sensor observations to typed LF/HF echo frames and named noise streams with versioned algorithm. Use scenario cases: level bottom, slope, school, bottom-near fish, interference, missing/stale sensor.
4. Implement postprocessing/rendering in original Canvas/SVG layers, including modal/menu/marker/alarm layers and update cadence; record dimensions and scaling policy.
5. Introduce features as independent, guarded FCV modules/selectors; do not claim manufacturer measurement accuracy for size/bottom classification.
6. Implement test snapshots with right-cleared reference images; use a separate semantic oracle for functionality rather than screenshot-only success.

## Todo

- [ ] LF/HF/DUAL/BL/BZ/MZ/Zoom/NAV visually and behaviorally matched for target unit.
- [ ] Picture Advance/Stop scenario and replay tests show frozen frame without frozen world clock.
- [ ] Echo-processing options tested under at least three deterministic noisy/water-depth scenarios.
- [ ] ACCU-FISH/Bottom Discrimination/RezBoost ON/OFF capability and cross-feature restriction tests verified.
- [ ] All alternative modes have error/missing-data/default and reset paths.

## Success Criteria

**PASS:** every applicable B01–B20 capability reproduces the observed controls and display mode response within signed measurable thresholds, with 100% expected semantic states on declared test scenarios. User-visible synthetic outcomes are flagged as training approximations where no physical sonogram equivalence is possible. A physical-unit reviewer validates layouts and interaction order.

**Safety:** no sonar emission, hardware I/O, device calibration command or navigational guidance. If copyright permission to reproduce a specific screen/graphic is missing, create original measured geometry or block that screen's fidelity acceptance.
