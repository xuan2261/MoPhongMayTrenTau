---
title: "Phase 5: Alarms, Navigation, Waypoints, Demo and Diagnostics"
status: todo
---

# Phase 5: Alarms, Navigation, Waypoints, Demo and Diagnostics

## Overview

**Priority P1.** Complete publicly documented FCV-588 student operations outside sounder controls. Reproduce state transitions, visible prompts and alarms using synthetic/fault-injected data. An offline simulated Demo and fake diagnostics **must not transmit to a real vessel interface**.

**Deep Pre-execution Scout Gate:** Read `src/core/scenario.mjs`, `src/core/session.mjs`, FCV reducer, Atlas, target tests and [public source register](../../docs/research/FCV588_PUBLIC_MEDIA_EVIDENCE_2026-10-13.md). Review curated section references §1.18–1.22, §2.8/2.9, §3.7–3.9 and Ch4 IEC/installation context. Confirm target profile transducer and external sensor flags; mark unsupported/unverifiable branches SOURCE_GAP rather than simulating a real installed device.

**TDD RED bootstrap:** Stub planned `alarms.mjs`/`navigation.mjs` exports before writing tests that import them; RED must fail with a named alarm/state/waypoint assertion, not a module-resolution exception or SyntaxError. Treat simulated missing-data conditions as inputs and preserve deterministic event sequence.

## Requirements

- [ ] Alarm profiles and causality: multiple enabled conditions **within one ALARM1–ALARM5 fish-alarm profile combine with AND**, not OR; one matching condition alone must not sound. Separately exercise simultaneous distinct profiles, mute vs cause clear, thresholds/edit/restore and transducer guards.
- [ ] NAV1/NAV2, missing/stale GPS/wind/temp/STW sources, unit conversion, blank placeholder after the documented timeout.
- [ ] MARK/waypoint add/edit/delete/choose destination; staging, persistence after power and deliberate lesson reset.
- [ ] System→Demo On/Off with authentic [DEMO] indicator and synthetic echoes; simulator's teacher-scenario status is separate from device Demo.
- [ ] Menu Tests/Diagnostics, LCD Test, factory restore, odometer, battery/low supply indicators as *simulated* states, not real firmware numbers or hardware damage tests.
- [ ] Tankenmaru menu/option conditions are visible only in an explicit public variant; never simulate transmission to radio.

## Implementation Steps

### Task 5.1 — Alarm causality and acknowledgement

- **Goal:** accurate source-backed alarm state transitions, not a decorative indicator.
- **Target:** create `src/devices/fcv588/alarms.mjs`, new `test/fcv588-public-alarms.test.mjs`; extend `src/devices/fcv588/model.mjs` and `web/app.mjs`.
- **Steps:** (1) RED asserts one fish-alarm profile with Bottom Type=Rock **AND** Bottom Depth=in-range sounds only when both are true, never when just one matches. Separately exercise simultaneous distinct ALARM1–ALARM5 profiles, mute with persistent cause, later clear and disabled option cases. (2) Implement pure alarm transition state independent of Canvas. (3) GREEN; REFACTOR including accessibility text and no unsafe network/audio assumptions.
- **Success:** sound mute is not treated as clear; no false temperature/speed alarm without synthetic sensor input; status reproducible.
- **Verify:** RED `node --test test/fcv588-public-alarms.test.mjs` nonzero assertion, not module missing; GREEN exits 0; `npm run check` exits 0.

### Task 5.2 — Synthetic NAV, data boxes and waypoint CRUD

- **Goal:** student can operate documented position/route/waypoint screens with missing-data and canceled-action behavior.
- **Target:** `src/core/scenario.mjs`, create `src/devices/fcv588/navigation.mjs`, new `test/fcv588-public-navigation.test.mjs`, update FCV reducer+Canvas.
- **Steps:** (1) RED Add/Edit/Delete/Go-To/Cancel, missing or expired GPS data, Waypoint limit, unit conversions. (2) Implement typed synthetic read-only ownship sources, local waypoint state, no NMEA TX. (3) GREEN; REFACTOR via core/replay tests.
- **Success:** safe no-data placeholders instead of invented live measurements; deterministic waypoint operations and persistence.
- **Verify:** RED `node --test test/fcv588-public-navigation.test.mjs` nonzero on named behavior assertion, GREEN 0; `node --test test/core.test.mjs` and `npm run check` 0.

### Task 5.3 — Demo, Diagnostics, LCD test, Restore

- **Goal:** device menu operations exist in isolated training state, never call hardware or masquerade as known firmware diagnostic results.
- **Target:** `src/devices/fcv588/menu-atlas.mjs`, `src/devices/fcv588/model.mjs`, `web/app.mjs`, new `test/fcv588-public-diagnostics.test.mjs` and `test/server.test.mjs`.
- **Steps:** (1) RED insists System→Demo status/indicator, power/reset/restore prompts, LCD colors and simulated version placeholders. (2) GREEN implement only documented view/control paths; no devices, real voltage, serial communications or firmware extraction. (3) REFACTOR note all readings as training-only, scan network/asset surface.
- **Success:** no real-equipment I/O, diagnostic placeholders never presented as a physical system result.
- **Verify:** RED `node --test test/fcv588-public-diagnostics.test.mjs` nonzero relevant assertion; GREEN 0; `node --test test/server.test.mjs` and `npm run check` 0.

## Todo

- [ ] Alarm profiles and mute/ack/cause-clear pass deterministic tests.
- [ ] Synthetic NAV data, missing/stale paths and waypoint editing covered.
- [ ] Demo status and safe Diagnostics/Restore tested without hardware.
- [ ] All source/option guard and no-output checks pass.

## Success Criteria

**PASS:** documented non-sounder screens and action sequences operate under appropriate source/option availability, with visibly synthetic inputs and source-graded claims. No sensor physics or real firmware test is implied.

## Failure Protocol

If any Verify step does not meet its stated pass condition, STOP this phase. Do not improvise a fix, retry blindly, or reason around the failure. Spawn the `kongming` subagent for next-step counsel and pass:
- the phase and task id,
- what you attempted (the steps you ran),
- the exact command and its full output,
- the pass condition it failed to meet.
Apply kongming's guidance, then re-run the Verify step. If `kongming` cannot be spawned in this environment, STOP and report the same failure evidence to the user. Never continue by self-reasoning.
