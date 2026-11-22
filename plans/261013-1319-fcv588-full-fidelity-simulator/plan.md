---
title: "FCV-588 Full-Fidelity Operator Training Simulator"
description: "Build and validate all applicable FCV-588 controls, screens, menus and workflows against one real firmware/transducer configuration, preserving the shared multi-device core."
status: pending
priority: P1
effort: "20-41 developer-weeks after evidence and rights are secured (preliminary)"
tags: [research, fidelity, frontend, simulation, test]
created: 2026-10-13
---

# FCV-588 Full-Fidelity Operator Training Simulator

## Overview

**Scope:** all functions applicable to the actual FCV-588 classroom unit, including the option-disabled behaviors; no promise of reproducing the OEM hydroacoustic algorithms. Work only in `C:\Work\MoPhongMayTrenTau`, preserve the existing F0. **No F1 implementation has been approved/released by this plan.**

Research inputs: [65-item feature inventory](../../docs/research/FCV588_FULL_FUNCTION_INVENTORY_2026-10-13.md), [machine-readable 65-item baseline](../../docs/research/FCV588_FEATURE_REGISTER_DRAFT.json), [deep technical brainstorm](../../docs/research/FCV588_HIGH_FIDELITY_BRAINSTORM_ADVICE_2026-10-13.md), [canonical acceptance and numeric thresholds](../../docs/research/FCV588_FIDELITY_ACCEPTANCE_PROTOCOL.md), [F0 audit](../../docs/F0-AUDIT.md), [restricted documentation archive](../../sources/manuals/README.md), [manual archive completeness gate](../../sources/manuals/ARCHIVE_COVERAGE.json), [official FURUNO manual](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf).

**Outcome:** the student uses a proportional FCV-588 panel and runs verified key/knob/menu/display/alarm/waypoint/diagnostic workflows. Teacher interface/shortcuts are separated from the real-looking panel. Every screen/gesture is tied to the *actual* model+software+transducer; every supported inventory requirement has tests and operator sign-off.

**Boundaries:** training-only, synthetic sensors, offline localhost, no real electronics connection or navigation use. No copying manufacturer PDFs, screenshots, trademarks or GPL radar source into the distributable app without recorded rights. The new archive is restricted evidence only.

**Hard stop:** Phase 1 evidence and rights approval is missing; later phases can be planned or test-designed but no claim of hardware fidelity is allowed until a right-cleared photo/video, firmware and option baseline is fixed.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Validated full operator-interface behavior of the specific FCV-588 profile | P1 |
| 2 | Correct menu, mode, control gesture, error and persistence handling | P1 |
| 3 | Deterministic LF/HF simulation, advanced display modes and teaching scenarios | P1 |
| 4 | Capability guards for transducer, firmware, NAV sources and Tankenmaru | P1 |
| 5 | Proven shared-world compatibility for later AIS R5/radar without cross-device regressions | P2 |
| 6 | Each user-requested manual/model accounted for with source, file integrity, rights and explicit unavailable/identity/version HOLD | P1 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Evidence, rights and profile lock](./phase-01-start.md) | BLOCKED: actual equipment/rights missing |
| 2 | [Physical panel, input and basic operations](./phase-02-panel-input-power.md) | Pending phase 1 |
| 3 | [Menu tree, settings and persistence](./phase-03-menus-configuration.md) | Pending phase 1-2 |
| 4 | [Sonar images and advanced modes](./phase-04-echo-renderer-advanced.md) | Pending phase 1-3 |
| 5 | [Alarms, navigation, waypoint and diagnostics](./phase-05-alarms-waypoints-nav-diagnostics.md) | Pending phase 1-4 |
| 6 | [Full classroom QA and independent acceptance](./phase-06-classroom-qa-acceptance.md) | Pending phases 2-5 |
| 7 | [Second-device shared-world isolation](./phase-07-multi-device-isolation.md) | Pending stable core; no real AIS R5 UI |

## Success Criteria

- [ ] Fix actual hardware profile (Starter/Booter/Main firmware versions, transducer, locale, 8 ranges, external sensors/options); right-cleared reference panel/menu images; source revision/hash and rights recorded.
- [ ] **Manual Archive Gate:** all six requested device families (including both R5 variants) accounted for in `sources/manuals/ARCHIVE_COVERAGE.json`. Every obtained file has source tier/date/SHA-256/rights status; `RIGHTS_OR_ACCESS_HOLD`, `VERSION_HOLD`, `IDENTITY_HOLD` remain visible and do not count as “downloaded”. The archive is **not yet literally complete** for J2000 or NS4000 3.x.
- [ ] Of the 65 research rows, **64 `FCV_OPERATOR` rows** and additional target-firmware menu items use the four-state enum `OPEN`, `SIMULATED_ONLY`, `VERIFIED_IMPLEMENTED`, `NOT_APPLICABLE_WITH_EVIDENCE`. FCV release permits only the last two. **D15 belongs to `INSTRUCTOR_PLATFORM`**, has separate `platformQaStatus` and must be teacher-QA verified before releasing the training application; it is not compared to FURUNO hardware.
- [ ] Every applicable workflow has accepted key sequences, timeout, success/error/cancel, power/reset/persistence and two-source evidence (manual + measured unit).
- [ ] 100% approved lessons pass unit + integration + Chrome interaction checks on target Windows size/scaling, and operator compares legally sourced screenshots with actual hardware.
- [ ] All replay/version and no-live-equipment tests pass; new scenario/second stub does not perturb FCV output; licenses approved for all distributed assets.
- [ ] Operator signs `FidelityToleranceProfile` **before Phase 2**: initial engineering acceptance targets include geometry error ±2%, zero wrong/missed/duplicate events per 30 measured trials of each input gesture, power/selector timer checks, UI p95 response ≤200 ms, and a masked static-screenshot difference threshold ≤3%. These are **proposed internal targets, not OEM specifications**; changes require evidence and review.

## Blocking decisions, risks and dependencies

**Needs from user:** photo(s) of the exact machine, Diagnostics (§3.7) firmware version, transducer model/options, configuration, distribution rights and the authorized operator who can validate. Record those privately rather than putting serial numbers in reports. Identify the actual AIS R5 as SUPREME or SOLID only when reaching phase 7.

**Data risk:** 65 inventory rows contain 64 FCV-device requirements and one separate teacher/platform function (D15), none hardware-approved. For firmware-dependent or transducer-disabled items, test the actual disabled path and retain the reason. Avoid inventing a proprietary algorithm or marking an unimplemented view as a pass.

**Security/licensing:** treat PDF ZIP archives as rights-restricted evidence; `.gitignore` excludes binaries. A locally computed noncryptographic replay checksum is only drift detection, never anti-cheat provenance. Future multiuser scoring will need a separately scoped trusted boundary.

**Status and tolerance authority:** [FCV588_FIDELITY_ACCEPTANCE_PROTOCOL.md](../../docs/research/FCV588_FIDELITY_ACCEPTANCE_PROTOCOL.md) is the canonical source. No `SIMULATED_ONLY` feature may be relabeled as verified merely because unit tests pass. Actual synthetic sonar data remains training-only even when operator-interface behavior is `VERIFIED_IMPLEMENTED`.

## Verification and handover

Before implementing a phase, confirm its evidence gate and write its RED tests. Run `npm run check` after each change and perform targeted browser/operator walkthrough. For plan structure run `ak plan validate <plan-dir>` and `ak plan parse <plan-dir> --json`. The accepted implementation workflow can then pick the current pending phase; do not bypass phase 1 because research appears complete.

<!-- slug: fcv588-full-fidelity-simulator -->
