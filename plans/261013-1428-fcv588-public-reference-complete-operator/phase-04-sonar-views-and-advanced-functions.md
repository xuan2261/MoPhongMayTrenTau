---
title: "Phase 4: LF/HF/DUAL/Zoom, Echo Processing and Advanced Options"
status: todo
---

# Phase 4: LF/HF/DUAL/Zoom, Echo Processing and Advanced Options

## Overview

**Priority P1.** Reproduce screen layouts and observable reaction to controls from manufacturer documentation, using **synthetic deterministic echoes**. Do not claim pixel-identical OEM sonar return, actual measured fish size, bottom classification or analog transmitter physics.

**Deep Pre-execution Scout Gate:** Re-read source and tests for `src/core/scenario.mjs`, `src/devices/fcv588/model.mjs`, `web/app.mjs`; check reference profile, source rights and feature matrix B01–B20. Inspect FURUNO public brochure image descriptors and the official §1.4/§1.10–1.17/§1.22 notes; only use videos as behavioral tests when original frame observations/times have been independently logged. Never import screenshot pixels into shipped web asset.

**TDD RED bootstrap:** Create any newly named `echo-projection.mjs` export as an importable no-behavior stub before running tests; the RED result must be an assertion about the expected observation/rendered state. Missing import/file and syntax exceptions are setup failures. Preserve the raw sensor baseline for bitwise replay comparison after GREEN/REFACTOR.

## Requirements

- [ ] LF/HF 50/200 kHz, DUAL, NAV screens, Bottom Lock/Bottom Zoom/Marker Zoom layouts and labels are faithful to published views/guards.
- [ ] Picture Advance eight documented steps 4x/2x/1x/1/2/1/4/1/8/1/16/Stop affect the visible scroll without freezing scenario time.
- [ ] Gain, TVG, Clutter, Interference, Color Erase, White Line/White Marker, Smoothing, A-scope and palette changes produce deterministic **illustrative** effects with appropriate screen indicators.
- [ ] ACCU-FISH, Bottom Discrimination, RezBoost depend on **virtual Transducer menu Type, named transducer, firmware and operating conditions**, not merely whether a physical transducer is plugged in. Generic menu Type=[600W]/[1kW] excludes all three. BDS requires capable transom/thru-hull installation, aligned sensor, depth 5–100 m, Auto Range, draft entered and speed <=10 kn. Manual §2.8 says all controls remain operative in Demo; not every capability is enabled.
- [ ] Color bar/header/temperature/nav overlays, zoom marker, bottom zone, range/picture speed and no-data placeholders have source-backed semantic states.
- [ ] Use self-created Canvas/SVG assets and separately masked static screenshot/layout tests; avoid unverifiable dynamic echo pixel comparison to OEM screenshots.

## Implementation Steps

### Task 4.1 — Sonar observation ports and repeatable fixtures

- **Goal:** a deterministic sensor-to-display pipeline with reproducible fish/bottom/interference patterns and no unintended world mutation.
- **Target:** `src/core/scenario.mjs`, create `src/devices/fcv588/echo-projection.mjs`, `test/core.test.mjs`, new `test/fcv588-public-display.test.mjs`.
- **Steps:** (1) RED asserts identical raw observations despite Gain/Range/Zoom/Stop and differing display projections for source-documented controls. (2) Add typed channel observations and named RNG streams, scenario fixtures for flat/sloped/deep/bottom-near fish/noise. (3) GREEN and REFACTOR performance without changing event/state hashes.
- **Success:** synthetic observation does not depend on display control or extra future device presence; all fixture outputs replay exactly.
- **Verify:** RED `node --test test/fcv588-public-display.test.mjs` fails on named semantic assertion, not import error; GREEN exits 0; `node --test test/core.test.mjs` and `npm run check` exit 0.

### Task 4.2 — Mode/layout/projection and image processing

- **Goal:** 480×640 screen components for all public reference display modes and control feedback.
- **Target:** `web/app.mjs`, `web/styles.css`, `src/devices/fcv588/model.mjs`, `src/devices/fcv588/echo-projection.mjs`, extend `test/fcv588-public-display.test.mjs`.
- **Steps:** (1) RED semantic markers for LF/HF/DUAL/BL/BZ/MZ/A-scope/Stop/TVG/White Line. (2) Render original graphics with correct menu/status labeling and scope; follow public evidence hierarchy. (3) GREEN; REFACTOR performance/layout/keyboard tests.
- **Success:** no mode/header mismatch in cited public scenarios; no claim that synthetic echo intensity equals physical sonar response.
- **Verify:** RED `node --test test/fcv588-public-display.test.mjs` exits non-zero on a named LF/HF/DUAL/zoom/processing layout assertion (not import/ENOENT/syntax); GREEN same command exits 0; REFACTOR `node --test test/web-layout.test.mjs` and `npm run check` exit 0.

### Task 4.3 — Conditional ACCU-FISH, BDS, RezBoost behavior

- **Goal:** script teaching demonstrations for advanced features only under permissible named simulation profiles.
- **Target:** `docs/evidence/fcv588-public-reference-profile.json`, `src/devices/fcv588/model.mjs`, `src/devices/fcv588/echo-projection.mjs`, new `test/fcv588-public-advanced.test.mjs`.
- **Steps:** (1) RED tests Demo buttons/menu remain operative without a physical transducer, but virtual generic Type=[600W]/[1kW] disables **ACCU-FISH, RezBoost and BDS**. Named 525STID-PWD fixture tests BDS boundaries at 4.9/5/100/100.1 m, 10/10.1 kn, missing/present draft, transom/thru-hull/alignment and Auto Range. If selecting BDS automatically switches to Auto Range, test that state transition rather than permanently rejecting a Manual initial state; no actual seabed measurement. (2) Render clearly illustrated/approximate fish size, bottom type and target separation; never imply calibrated measurements. (3) GREEN; REFACTOR with wrong-option and reset/replay cases.
- **Success:** no impossible “all features enabled” profile, calibrated measurement claims or proprietary firmware implementation.
- **Verify:** RED `node --test test/fcv588-public-advanced.test.mjs` fails on expected guard assertion; GREEN exits 0; `npm run check` exits 0.

## Todo

- [ ] All claimed source-supported display modes have input/state/screenshot-region tests.
- [ ] Picture Advance Stop freezes the rendered history, not the shared world.
- [ ] Synthetic echo effects are deterministic, option-gated, clearly training-only.
- [ ] No unlicensed screenshot/image/media embedded in runtime source.

## Success Criteria

**PASS:** documented screen modes and associated controls are reachable, guarded and visually/semantically reviewed against permitted public references, while dynamic echo content remains a labeled synthetic approximation.

## Failure Protocol

If any Verify step does not meet its stated pass condition, STOP this phase. Do not improvise a fix, retry blindly, or reason around the failure. Spawn the `kongming` subagent for next-step counsel and pass:
- the phase and task id,
- what you attempted (the steps you ran),
- the exact command and its full output,
- the pass condition it failed to meet.
Apply kongming's guidance, then re-run the Verify step. If `kongming` cannot be spawned in this environment, STOP and report the same failure evidence to the user. Never continue by self-reasoning.
