---
title: "Phase 5: Alarms, Synthetic Navigation, Waypoints, System Demo and Diagnostics"
status: todo
---

# Phase 5: FCV Alarms, NAV/Waypoints and Safe Diagnostics

## Overview

**Priority P1, depends on Phases3-4.** Build full remaining publicly documented student workflows with reversible input, synthetic observation, distinct alarm cause/acknowledge semantics, Demo (as actual System menu), diagnostics and restore. Instructor scenario play is not the FCV physical Demo switch.

**Deep Pre-execution Scout Gate:** Revisit curated manual §§1.18-1.22, §2.8-2.9 and §3.7-3.9, plus Ch4 IEC synthetic input conditions; read Phase1 public trace and named profile guards, Phase3 menu/setting contracts, Phase4 observation/render, src/core/session/scenario and test/core.test.mjs. Distinguish manual-required alarm conjunction from unrelated simultaneous alarms. Never invent diagnostic firmware values or use actual sensor/ship interfaces. Confirm option and language paths as source-backed before course approval.

## Dependencies / file inventory

Phase3 menu action -> FCV alarm/navigation state -> Phase4 display semantic probe. World fixture generates synthetic depth, speed and optional GPS only. No real NMEA serial, transponder output, USB, radio or depth device.

| Path or component | Action/size | Test impact |
| --- | --- | --- |
| src/devices/fcv588/alarms.mjs | New pure guard/cause/release module | test/fcv588-public-alarms.test.mjs |
| src/devices/fcv588/navigation.mjs | New local waypoint and synthetic NAV projection | test/fcv588-public-navigation.test.mjs |
| src/devices/fcv588/model.mjs, menu-atlas.mjs | Add FCV state and menu interactions | new diagnostics tests + existing device |
| src/core/scenario.mjs | Add bounded synthetic external data fixtures only | core observation/replay |
| web/app.mjs | Original alarm, waypoint, NAV1/NAV2, Demo/Diagnostic visuals | browser/Canvas QA |
| test/fcv588-public-diagnostics.test.mjs | New safe system-test assertions | server/static-root regression |

## Tests Before / scenario matrix

| Severity | Fixture | Expected |
| --- | --- | --- |
| Critical | ALARM1 with two enabled fish conditions, only one true | no alarm; AND within one profile |
| Critical | ALARM1 and ALARM2 independently true | both can be active; cross-profile simultaneous |
| Critical | Alarm acknowledged while cause still true | muted/acknowledged, cause not cleared |
| High | NAV1/NAV2 missing/stale synthetic GPS/speed/water temp | no invented real ownship values; documented no-data |
| High | Waypoint Add/Edit/Delete/Go-To/Cancel with limit | deterministic CRUD, no data leak, correct reject/undo |
| High | System -> Demo On, no physical transducer | [DEMO] indicator, synthetic echo, all physical controls still operative |
| High | Diagnostics/LCD test/restore | visibly SIMULATED result, no real firmware or serial reading |
| Medium | Reset, power cycle and replay with alarms/waypoints | documented persistence and exact replay identity |

## Requirements

- [ ] ALARM1-5 conditions have documented within-profile AND, cross-profile independent activation, mute vs cause-clear and persistent threshold settings.
- [ ] NAV1/NAV2/waypoints support missing or stale synthetic data, valid/invalid inputs and reversible modal workflows.
- [ ] System Demo is distinct from teacher-generated scenario; all controls operative while capability guards still apply.
- [ ] Diagnostics, LCD test and restore are clearly SIMULATED_ONLY without real software version, real ship data or hardware I/O.

## Implementation Steps

### Task 5.1 — Alarm conjunction, causes, acknowledge and simultaneous profiles

- **Goal:** alarm state machine behaves correctly in scripted conditions rather than as a decorative icon.
- **Target:** create src/devices/fcv588/alarms.mjs and test/fcv588-public-alarms.test.mjs; integrate model.mjs and web/app.mjs.
- **Steps:** (1) Create importable alarm stub before RED. (2) RED with ALARM1 bottom-type rock AND depth-in-range; only both true triggers, either alone false; separately two distinct profile causes simultaneously. (3) RED silence/acknowledge while source persists and later cause cleared, edit/cancel/restore thresholds. (4) GREEN pure alarm state/effects and visible accessible text; no unapproved siren/equipment output. (5) REFACTOR replay and disabled-profile rules.
- **Success:** AND/OR distinction, mute/cause-clear and profile options are source-backed and tested.
- **Verify:** RED node --test test/fcv588-public-alarms.test.mjs exits 1 with named conjunction assertion; GREEN same exits 0; REFACTOR node --test test/core.test.mjs and npm run check exit 0.

### Task 5.2 — Synthetic NAV, data boxes and waypoint CRUD

- **Goal:** operate source-documented NAV1/NAV2 and waypoint menus without real position.
- **Target:** create src/devices/fcv588/navigation.mjs and test/fcv588-public-navigation.test.mjs; modify src/core/scenario.mjs, src/devices/fcv588/model.mjs, web/app.mjs.
- **Steps:** (1) Create importable navigation stub before RED; tests require Add/Edit/Delete/Go-To/Cancel, source-backed capacity/bounds and stale/missing data. (2) GREEN typed synthetic ownship data and waypoint state; blanks replace missing real receiver. (3) REFACTOR deterministic replay, units/persistence and no NMEA TX.
- **Success:** all claimed waypoint flows have semantic probes, unavailable data never becomes a fake vessel location.
- **Verify:** RED node --test test/fcv588-public-navigation.test.mjs exits 1 with named waypoint/no-data assertion; GREEN same exits 0; REFACTOR node --test test/core.test.mjs and npm run check exit 0.

### Task 5.3 — System Demo, diagnostics and safe restore

- **Goal:** expose documented maintenance/demo UI as training-only, not actual diagnostics.
- **Target:** create test/fcv588-public-diagnostics.test.mjs; modify src/devices/fcv588/menu-atlas.mjs, model.mjs, web/app.mjs; extend test/server.test.mjs only as needed.
- **Steps:** (1) RED System -> Demo On/Off, [DEMO] marker, no-transducer controls operative, LCD/diagnostic display and Restore confirmation/cancel. (2) GREEN renderer/reducer with synthetic readouts, unknown firmware left null, never emit real serial/UDP/NMEA/USB/ship controls. (3) REFACTOR reset semantics, rights banner, server restriction and replay.
- **Success:** student can practice demonstrable interactions and see diagnostic placeholders labeled simulated; nobody can mistake a diagnostic value for measured hardware.
- **Verify:** RED node --test test/fcv588-public-diagnostics.test.mjs exits 1 on named Demo/diagnostics assertion; GREEN same exits 0; REFACTOR node --test test/server.test.mjs test/core.test.mjs and npm run check exit 0.

## Todo

- [ ] Alarm profiles reproduce AND cause logic, acknowledge and clear.
- [ ] NAV/waypoint operations and missing/stale data tested.
- [ ] Demo/Diagnostics/Restore fully synthetic and safe.

## Success Criteria

All targeted tests and full npm suite pass. Do not imply a proprietary diagnostic software version or real operator certification. Retain source gaps for variant-dependent NAV/waypoint fields.

## Refactor / Tests After

Keep separate device-state ownership for alarms, NAV and waypoint lists, but avoid adding a global generic 'maritime devices' menu class. Performance tests should use reproducible alarms and 120x301 synthetic sonar fixture without external I/O. D15 instructor replay/scoring remains in its own namespace.

## Risk assessment

False alarm conjunction, presenting simulated GPS as real, or forgetting Demo capability separation are high-stakes teaching errors. A guard without a documented initial state must be SOURCE_GAP, not auto-accepted. Physical interfaces must remain unreachable through the browser.

## Failure Protocol

If any Verify step does not meet its stated pass condition, STOP this phase. Do not improvise a fix, retry blindly, or reason around the failure. Spawn the kongming subagent for next-step counsel and pass:
- the phase and task id,
- what you attempted (the steps you ran),
- the exact command and its full output,
- the pass condition it failed to meet.
Apply kongming's guidance, then re-run the Verify step. If kongming cannot be spawned in this environment, STOP and report the same failure evidence to the user. Never continue by self-reasoning.


## V30 evidence checkpoint — 2026-10-16, not phase completion

The integrated configuration/LCD batch has current Node370, configuration Chrome264, FUNC76, LCD68 and four full Chrome context regression evidence. All53 current screenshots were opened. See [the executed V30 report](./reports/continuation-2026-10-16-v30-integrated-configuration.md) and [the full50/22 review](./reports/v30-checklist-review.md). Existing checkbox states and this phase's Failure Protocol are unchanged. Source-option draft resurrection (V30-B) and canonical alarm notice labeling (V30-E) remain open; no hardware, rights or lesson approval is implied.


## V31 checkpoint — 2026-10-16 (not phase completion)

V31 corrects ALARM1-5 profile versus threshold notice labels and retains the existing alarm cause/ACK algorithm. Native Alarm5 on/off pixels and reset/reload storage behavior are checked. Full diagnostics/alarm/NAV acceptance is not promoted. See [V31 evidence](./reports/continuation-2026-10-16-v31-transactions-controls.md) and [the unchanged Failure Protocol disposition](./reports/v31-failure-counsel-packet.md).
