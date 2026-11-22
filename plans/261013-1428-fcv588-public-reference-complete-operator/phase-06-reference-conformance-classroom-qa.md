---
title: "Phase 6: Reference Conformance, Claims and Classroom QA"
status: todo
---

# Phase 6: Reference Conformance, Claims and Classroom QA

## Overview

**Priority P0 for public-reference training release.** Verify that the student can perform *all applicable publicly documented FCV actions* without claiming actual classroom firmware or OEM-certified accuracy. A source HOLD cannot silently become a PASS; preserve a separate deferred hardware-matched review.

**Deep Pre-execution Scout Gate:** Inspect current public evidence ledger, menu atlas, 64+1 register, new reference profiles, all phase test suites, `docs/qa/scenario-matrix.md`, web HTML/CSS, `tools/server.mjs` and original [hardware-only acceptance protocol](../../docs/research/FCV588_FIDELITY_ACCEPTANCE_PROTOCOL.md). Identify any newly discovered manuals/screens and rights changes. User hardware is NOT a prerequisite for this public-reference level.

**TDD RED bootstrap:** All claim/browser tests must be runnable before implementing the desired passing behavior. If report/asset/feature is absent, verify the test exits nonzero due to a **specific assertion about expected content**, not ENOENT, an unresolved module import or a syntax error. This phase cannot promote a weak “source located” to “behavior observed”.

## Requirements

- [ ] Every one of **64 FCV operator rows** and any extra target reference-menu row has source ID, evidence grade/branch/right status, implementation state and claim decision. No E0/E4 alone suffices for a timing/behavior-accurate claim.
- [ ] Any advertised complete reference-profile sequence must be source-grounded, implemented, deterministic and tested including negative/cancel/reset cases. SOURCE_GAP/RIGHTS_HOLD/CONFLICT_HOLD is kept visible, never silently included as complete.
- [ ] D15 teacher-facing lesson/replay/scoring QA is separate from Furuno hardware comparisons; browser-origin replay fingerprint is not anti-cheat authentication.
- [ ] All modal/body/menu labels and layout coordinates on 480×640 tested at target Windows viewport; original art only. No pixel-identical benchmark against unlicensed photos/video or dynamic OEM sonar images.
- [ ] Banner, documentation and reports explicitly say **PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY**. No live navigation use; zero RF/NMEA/USB/serial interfaces or restricted manual binaries in deployment.
- [ ] Archive gaps for NS4000 3.x and J2000 remain separately accounted, without blocking this FCV-specific plan or being called downloaded.

## Implementation Steps

### Task 6.1 — Full public operator coverage and source/claims audit

- **Goal:** a release register with no mislabeled hardware certification or video-frame assertions.
- **Target:** create `docs/reports/FCV588_PUBLIC_REFERENCE_ACCEPTANCE.md` and **extend, never overwrite** the Phase1 `test/fcv588-public-claims.test.mjs`; consume Phase1 ledger/atlas and current research feature register.
- **Steps:** (1) Preserve all Phase1 negative claims/rights assertions and add RED assertions for missing public source IDs, false VERIFIED_IMPLEMENTED from public references, unverified timestamps, D15 counted as hardware. (2) Produce public-specific coverage report and visibly classify rows as implemented/reference-backed, approximation or source HOLD. (3) GREEN; REFACTOR review claim language across docs/UI without discarding Phase1 gates.
- **Success:** all 64 operator rows accounted, no false completion of unsupported/unknown branches, teacher row separate.
- **Verify:** RED `node --test test/fcv588-public-claims.test.mjs` nonzero named assertion (not ENOENT); GREEN 0; `node --test test/research-inventory.test.mjs` and `npm run check` 0.

### Task 6.2 — Browser, accessibility and static security quality gate

- **Goal:** a repeatable classroom program that never exposes restricted sources or incorrectly routes physical input.
- **Target:** `web/index.html`, `web/styles.css`, `web/app.mjs`, `web/hold-input.mjs`, `tools/server.mjs`, new `test/fcv588-public-browser.test.mjs` and `docs/qa/FCV588_PUBLIC_BROWSER_SMOKE.md` browser-run evidence.
- **Steps:** (1) RED keyboard/pointercancel/tab order/short-long hold/palette/header/responsive labels and network restrictions with meaningful assertions. (2) Fix observed UI/Canvas defects using original assets. (3) GREEN and REFACTOR with regression tests. (4) **Actual browser smoke**: start `npm start` (or inspect existing service without killing an unrelated process), verify loopback readiness at `http://127.0.0.1:4173`, then use Chat On Steroids Desktop `browser_tabs(list→attach)` **before** application load observation. Reset/capture `browser_console` and `browser_network` diagnostics, perform `browser_navigate(action=reload)` or fresh URL navigation of the attached tab, then `browser_snapshot` for the newly loaded page before input. Console/network capture only begins after attach: pre-attachment logs never count as proof. At each available classroom viewport (target 1366×768 and 1920×1080), record actual `innerWidth/innerHeight`, `browser_screenshot`, interact via real `browser_action` (not synthetic DOM events), test power/hold, MODE selector, keyboard Tab/focus/ESC, zoom/scroll without clipped controls, pause/reset/replay; review errors and requests captured **since the reload**. If service, attach, navigation, diagnostics, viewport or screenshot is unavailable, log exact blocker as **NOT_RUN**, not PASS. Never treat a static Node test as browser E2E proof.
- **Success:** student controls accessible, deterministic, no copied proprietary assets/console exceptions or external connections.
- **Verify:** RED `node --test test/fcv588-public-browser.test.mjs` exits nonzero named assertion; GREEN same exits 0; REFACTOR `node --test test/server.test.mjs test/hold-input.test.mjs` and `npm run check` exit 0. **Additional mandatory browser gate:** `docs/qa/FCV588_PUBLIC_BROWSER_SMOKE.md` records service readiness, attach-before-load and navigation/reload timestamps, captured console/network cursor range **covering the reload**, tab/actual viewport, controls/state probes, screenshots, zero uncaught console errors, localhost-only network, observed PASS/FAIL per case and any `NOT_RUN` blocker. Without post-attach reload diagnostics the browser E2E verdict stays HOLD. Screenshot comparison uses only original baseline/licensed references.

### Task 6.3 — Course outcome and honest release decision

- **Goal:** approved manual-based student exercises, not a silently OEM-verified product.
- **Target:** `docs/reports/FCV588_PUBLIC_REFERENCE_ACCEPTANCE.md`, `docs/evidence/fcv588-public-reference-profile.json`, new `test/fcv588-public-course.test.mjs`, course scripts generated in a separate teacher namespace; no existing hardware status mutation.
- **Steps:** (1) RED test that every released lesson has an approved manual source, synthetic initial state, replayable input sequence, negative/cancel branch and expected semantic probe, while currently missing lessons cause a named assertion failure. (2) Enumerate lessons and peer review every claimed public flow; document any remaining source HOLD and approximate sensor outputs. (3) GREEN and REFACTOR; deliver GO only for completed public-reference scoped lessons; unsupported/unknown remain visibly blocked or exclude that claim. (4) Verify no claim of actual-unit firmware/hardware.
- **Success:** independent reviewer accepts each released lesson's source chain and test oracle; failure/rights gaps remain documented, not invisible.
- **Verify:** RED `node --test test/fcv588-public-course.test.mjs` exits nonzero on a named lesson-source/probe assertion (not import/ENOENT/syntax); GREEN same exits 0; REFACTOR `node --test test/fcv588-public-claims.test.mjs test/research-inventory.test.mjs` and `npm run check` exit 0. The new course assertions also require the report to contain PUBLIC_REFERENCE_CONFORMANT, hardwareValidated=false, and no unsupported OEM-certification claim.

## Todo

- [ ] Coverage report for 64 FCV + separate D15 teacher QA, no invented source PASS.
- [ ] All public-reference released lessons tested under versioned scenarios.
- [ ] Accessibility/Windows/browser/no-media leakage checks accepted.
- [ ] Restrictive claim banner and residual SOURCE_GAP/RIGHTS_HOLD clear to instructor.

## Success Criteria

**PASS for public-reference release only:** source-backed applicable operator flows all checked and correct against the publicly documented baseline, with transparent approximations and no concealed non-implementation in published lessons. **Hardware exact-match remains HOLD** and does not block release of accurately labeled public-reference lessons.

## Failure Protocol

If any Verify step does not meet its stated pass condition, STOP this phase. Do not improvise a fix, retry blindly, or reason around the failure. Spawn the `kongming` subagent for next-step counsel and pass:
- the phase and task id,
- what you attempted (the steps you ran),
- the exact command and its full output,
- the pass condition it failed to meet.
Apply kongming's guidance, then re-run the Verify step. If `kongming` cannot be spawned in this environment, STOP and report the same failure evidence to the user. Never continue by self-reasoning.
