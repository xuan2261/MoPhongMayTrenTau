---
title: "Phase 7: Shared World, Regression Isolation and Future AIS R5"
status: todo
---

# Phase 7: Shared World, Regression Isolation and Future AIS R5

## Overview

**Priority P2; depends on stable FCV public-reference core.** Verify the future multi-device architecture without claiming an AIS R5 display already exists. A shared deterministic scenario/world is the common layer; each radar/AIS/ECDIS/sonar device retains its own menus, controls and versioned view.

**Deep Pre-execution Scout Gate:** Read `src/core/{session,scenario,protocol}.mjs`, `src/devices/fcv588/adapter.mjs`, selected public profile and current tests. Check registered variants in `docs/evidence/device-register.json`, `sources/manuals/ARCHIVE_COVERAGE.json`. Identify R5 SUPREME/SOLID only if a source explicitly says which product is target; otherwise retain identity HOLD.

**TDD RED bootstrap:** Any new `device-runtime.mjs` module starts as an importable stub with versioned empty effects; RED must fail on a named non-interference/replay assertion. Missing modules, wrong test paths and syntax errors are setup failures and require correction before beginning a legitimate RED run.

## Requirements

- [ ] Typed/versioned shared WorldState and separate FCV sonar observation. A second **inert synthetic** device consumes clock/observation without changing FCV raw data or menu settings.
- [ ] Replay envelope includes device instance/active profile set, source/scenario version, deterministic order; incompatible replay/variant fails closed.
- [ ] Distinct named PRNG streams; adding/removing idle or active stub cannot change FCV outputs for fixed source events.
- [ ] No fake AIS R5 menus/flags/transmission or confusion between SOLID and SUPREME; no live vessel connection.
- [ ] Future optional HARDWARE_MATCHED_FIDELITY migration introduces new hardware target/claim evidence without rewriting old public reference approvals.

## Implementation Steps

### Task 7.1 — World isolation and second subscriber stub

- **Goal:** prove FCV observation/state is independent of a second active or idle consumer.
- **Target:** `src/core/scenario.mjs`, `src/core/session.mjs`, create `src/core/device-runtime.mjs` and `test/fcv588-public-multidevice.test.mjs`.
- **Steps:** (1) RED compares FCV-alone vs FCV+synthetic stub hashes and deliberately catches any cross-device mutation. (2) Implement minimal typed subscription/order with no generic menu reducer. (3) GREEN; REFACTOR world/input-event sorting and compatibility.
- **Success:** FCV world/sensor/replay checkpoints identical for same FCV inputs; second device state isolated.
- **Verify:** RED `node --test test/fcv588-public-multidevice.test.mjs` nonzero relevant assertion; GREEN 0; `node --test test/core.test.mjs` and `npm run check` 0.

### Task 7.2 — Future model/version and source gating

- **Goal:** document a safe path to public-reference AIS R5 or radar without inventing their hardware or screens.
- **Target:** `docs/evidence/device-register.json`, `sources/manuals/ARCHIVE_COVERAGE.json`, `docs/decisions/ADR-0001.md`, extend mandatory `test/fcv588-public-multidevice.test.mjs` without overwriting Task7.1 checks.
- **Steps:** (1) RED asserts unknown R5 identity cannot produce a fake SUPREME/SOLID display instance. (2) Define future independent device profile/feature evidence gate and hardware-upgrade strategy; no runtime implementation of R5 UI. (3) GREEN; REFACTOR documentation and test.
- **Success:** no silent model upgrade, every future device declared as new explicit profile.
- **Verify:** RED `node --test test/fcv588-public-multidevice.test.mjs` exits nonzero on a named unknown-R5-profile assertion (not missing module/ENOENT/syntax); GREEN same exits 0; REFACTOR `node --test test/core.test.mjs` and `npm run check` exit 0.

## Todo

- [ ] Second stub does not alter FCV world/sensor/event log.
- [ ] Replay/version mismatches reject.
- [ ] AIS R5 target unknown explicitly held, no bogus simulation UI.
- [ ] Optional real-hardware upgrade path documented separately.

## Success Criteria

**PASS:** common world proven with an inert second subscriber, no real AIS/RF/output channels, existing FCV behavior remains stable. It does not claim R5 has been implemented.

## Failure Protocol

If any Verify step does not meet its stated pass condition, STOP this phase. Do not improvise a fix, retry blindly, or reason around the failure. Spawn the `kongming` subagent for next-step counsel and pass:
- the phase and task id,
- what you attempted (the steps you ran),
- the exact command and its full output,
- the pass condition it failed to meet.
Apply kongming's guidance, then re-run the Verify step. If `kongming` cannot be spawned in this environment, STOP and report the same failure evidence to the user. Never continue by self-reasoning.
