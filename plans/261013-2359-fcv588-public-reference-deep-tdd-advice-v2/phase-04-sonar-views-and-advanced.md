---
title: "Phase 4: Sonar Views, Projection and Capability-Gated Advanced Functions"
status: todo
---

# Phase 4: FCV Sounder Display and Conditional Advanced Features

## Overview

**Priority P1, depends on Phases 2-3.** Provide the visibly correct modes and source-documented echo processing with deterministic synthetic inputs, original pixels and no false acoustic-equivalence claim. Treat raw observation, screen projection and device settings as distinct layers.

**Deep Pre-execution Scout Gate:** Review src/core/scenario.mjs and session.mjs source/test baseline, src/devices/fcv588/model.mjs, Phase1 profile/trace and Phase3 menu atlas, web/app.mjs Canvas render, curated manual §1.4, §1.9-1.17, §1.22, official product/brochure and restrictions. Check whether public videos have *actually viewed* model-specific frames; there are no verified frames at plan creation. Do not process restricted PDF bytes anew. Run discovery for each option guard, categorize documented/provisional/unknown. If 525STID-PWD availability conflicts with a firmware branch, mark SOURCE_GAP and keep the unclaimed lesson blocked.

## Dependencies / file inventory

Shared world -> synthetic sensor observation -> device-specific pure view projection -> original Canvas DOM. Gain, Range, TVG, BDS presentation cannot mutate raw sensor samples. Stop freezes *rendered picture advance*, never world ticking.

| Path or component | Action / rough size | Test impact |
| --- | --- | --- |
| src/core/scenario.mjs | Inspect existing 140 LOC, add scenario fixtures only if needed | test/core.test.mjs observation identity |
| src/devices/fcv588/echo-projection.mjs | Create pure renderer-projection module | test/fcv588-public-display.test.mjs |
| src/devices/fcv588/model.mjs, menu-atlas.mjs | Guard modes/option state | test/fcv588-public-advanced.test.mjs |
| web/app.mjs, web/styles.css | Original mode-specific Canvas/labels | web-layout/browser smoke |
| docs/evidence/fcv588-public-reference-profile.json | Extend virtual option-guard metadata, not hardware data | profile/advanced tests |

## Tests Before / scenario matrix

| Severity | Input | Required oracle |
| --- | --- | --- |
| Critical | Same scenario under LF/HF, Gain/Range changes | raw observations bit-identical; projected pixels differ |
| Critical | Generic menu Type=[600W]/[1kW] asks for ACCU-FISH, RezBoost, BDS | all excluded despite Demo controls operative |
| Critical | BDS virtual 525STID-PWD with depth outside 5-100m or speed >10kn | BDS invalid/hidden per documented behavior; negative test |
| High | BDS missing draft or incorrect mount/alignment / Manual Range | proper guard and source-backed Auto Range activation when selected |
| High | LF/HF/DUAL/BL/BZ/MZ/NAV modes | correct divided display, titles, scale, region; NAV missing data marked |
| High | Picture Advance x4/x2/x1/1/2/1/4/1/8/1/16/Stop | exact eight choices, simulated history scroll only |
| Medium | Interference/Clutter/TVG/A-scope/White Line/Marker/Color Erase | deterministic illustrative change, visible label |

## Requirements

- [ ] LF/HF/DUAL and BL/BZ/MZ zoom mode display/header/scale transitions match published descriptions while sensor content remains synthetic.
- [ ] Picture Advance all 8 steps, Stop and processing controls operate only in documented contexts; world and session time remain independent.
- [ ] ACCU-FISH/RezBoost/BDS never enabled merely by Demo mode or generic 600W power rating; guard named transducer + operating parameters.
- [ ] Original Canvas/SVG graphics are independent art; no manufacturer screenshot, video frame or proprietary acoustic algorithm shipped.

## Implementation Steps

### Task 4.1 — Stable raw sonar ports and deterministic scenario fixtures

- **Goal:** preserve existing LF/HF raw observation truth while adding representative training fixtures.
- **Target:** src/core/scenario.mjs observeSounder/streamSeed, create src/devices/fcv588/echo-projection.mjs and test/fcv588-public-display.test.mjs; extend test/core.test.mjs.
- **Steps:** (1) Before RED create importable echo-projection stub returning a clearly unimplemented view result. (2) RED tests require raw observation hashes identical across Gain, Range, Pause, feature toggle and addition of idle device, while display projection changes where documented. (3) GREEN define typed synthetic flat/sloped/deep/fish/noise fixtures and a pure projection, seeded named stream. (4) REFACTOR avoid reordering world tick/replay and bound Canvas resource cost.
- **Success:** deterministic raw LF/HF observations survive device/view changes and replay.
- **Verify:** RED node --test test/fcv588-public-display.test.mjs exits 1 on named raw/view assertion (not import error); GREEN same exits 0; REFACTOR node --test test/core.test.mjs and npm run check exit 0.

### Task 4.2 — LF/HF/DUAL/Zoom layouts, processing and Picture Advance

- **Goal:** correct displayed modes, processing controls and eight picture speed states.
- **Target:** src/devices/fcv588/model.mjs, echo-projection.mjs, web/app.mjs, web/styles.css; extend test/fcv588-public-display.test.mjs.
- **Steps:** (1) RED semantic probe tests for LF/HF/DUAL, Bottom Lock/Bottom Zoom/Marker Zoom, A-scope, White Line/Marker, color bar, TVG and all 8 picture speeds plus Stop. (2) GREEN implement source-backed regions/labels using original artwork; mode layout must follow new Phase2 MODE selector, no phantom zoom labels. (3) REFACTOR fixed synthetic scenario screenshot regions while masking dynamic echo pixels, test world unchanged on display Stop.
- **Success:** exact documented mode labels and visible control effects; no claim measured fish acoustic pattern is physically equivalent.
- **Verify:** RED node --test test/fcv588-public-display.test.mjs exits 1 on named mode/speed/state assertion; GREEN same exits 0; REFACTOR node --test test/web-layout.test.mjs test/core.test.mjs and npm run check exit 0.

### Task 4.3 — ACCU-FISH, Bottom Discrimination and RezBoost guarded states

- **Goal:** teach when an advanced option exists and what a simulated illustration means, without an impossible all-options profile.
- **Target:** src/devices/fcv588/model.mjs, echo-projection.mjs, docs/evidence/fcv588-public-reference-profile.json, create test/fcv588-public-advanced.test.mjs.
- **Steps:** (1) RED generic Type=[600W] and Type=[1kW] prohibit all three functions, and Demo controls still respond. (2) RED named 525STID-PWD virtual fixture BDS boundaries depth 4.9/5/100/100.1m, speed 10/10.1kn, mount/alignment false/true, draft unknown/set, Auto vs Manual starting range; test any source-backed automatic Auto Range switch when activating BDS. (3) GREEN implement per-feature pure guards plus original illustrative fish-size/bottom probabilities explicitly labeled synthetic. (4) REFACTOR replay, missing data, reset and unknown firmware source grade checks.
- **Success:** no false physical measurements or unconditional entitlement; unavailable options show correct disabled reason.
- **Verify:** RED node --test test/fcv588-public-advanced.test.mjs exits 1 with named capability guard assertion; GREEN same exits 0; REFACTOR node --test test/fcv588-public-profile.test.mjs test/core.test.mjs and npm run check exit 0.

## Todo

- [ ] Raw world/sensor invariant proven over projection changes.
- [ ] All claimed display modes and eight Picture Advance states tested.
- [ ] Advanced options validated per named virtual transducer, depth/speed/installation and firmware source guard.

## Success Criteria

All three tasks and full regression pass; screenshots/Canvas use self-made artwork. Any source-unconfirmed feature remains withheld from public-reference-conformant course claims.

## Refactor / Tests After

Check performance at native 480x640 and common Windows browser viewport(s) without introducing a 3D or WebGL renderer. Retain original deterministic sensor seed version; bump profile revision if rendering semantics are pinned into replay. Compare semantic probes, not unverifiable OEM pixels.

## Risk assessment

Capability 'all features on' leakage and mutable brochure-only claims are high risk. Keep separate source/guard statuses. If BDS automatic Auto Range behavior conflicts across manual versions, isolate the profile branch and stop the affected feature's approval pending evidence, not the whole course.

## Failure Protocol

If any Verify step does not meet its stated pass condition, STOP this phase. Do not improvise a fix, retry blindly, or reason around the failure. Spawn the kongming subagent for next-step counsel and pass:
- the phase and task id,
- what you attempted (the steps you ran),
- the exact command and its full output,
- the pass condition it failed to meet.
Apply kongming's guidance, then re-run the Verify step. If kongming cannot be spawned in this environment, STOP and report the same failure evidence to the user. Never continue by self-reasoning.


## V31 checkpoint — 2026-10-16 (not phase completion)

V31 preserves core/sonar/capability algorithms and adds canonical cancellation of open Display drafts when live eligibility is lost. Direct and wrapped virtual-mount cases have scoped tests; MODE transition has a Canvas seam pixel check. No acoustic/OEM/firmware or complete display-regression approval. See [V31 evidence](./reports/continuation-2026-10-16-v31-transactions-controls.md) and [the unchanged Failure Protocol disposition](./reports/v31-failure-counsel-packet.md).
