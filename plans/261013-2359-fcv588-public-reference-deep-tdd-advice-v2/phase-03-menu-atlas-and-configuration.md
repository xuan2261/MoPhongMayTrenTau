---
title: "Phase 3: Full Five-Menu Atlas, Setup/Installation and Persistence"
status: todo
---

# Phase 3: FCV Menu Atlas, System/Installation Profiles and Persistence

## Overview

**Priority P1, depends on Phases1-2.** Implement the named FURUNO five-menu tree as a source-graded FCV-specific state machine, not a generic finder skin. Include Appendix1, installation Ch4 §4.9-4.10, menu guards, persistent settings and synthetic IEC/NMEA receive-only data. No real serial port, UDP, vessel network or device TX.

**Deep Pre-execution Scout Gate:** Review the Phase1 public source/trace/profile and actual current F0 reducer/web overlay, the documented Sounder/Display/Alarm/Data/System menus and Appendix1 Menu Tree, System §2.1-2.9, §4.9 data sentences and §4.10 Adjustments after Installation from permitted curated notes. Re-check menu revisions under software history v1.05/v2.01 (8/16 Colors, White Marker, R&D Echo) without claiming installed version. Audit all existing tests and a real browser menu navigation only where rights/tooling permit. For unconfirmed menu choices set SOURCE_GAP, not a fabricated option.

## Dependencies / file inventory

Phase1 profile guards + Phase2 physical input and UI clock -> menu selectors -> device committed/draft settings -> Canvas/dialog. Installation setup is NOT forced on every run. Tankenmaru and NMEA selection are mutually guarded.

| Path or component | Action, rough size | Test impact |
| --- | --- | --- |
| src/devices/fcv588/menu-atlas.mjs | New, bounded FCV menu metadata/guards | New test/fcv588-public-menu.test.mjs |
| docs/evidence/fcv588-public-menu-atlas.json | New source-indexed Appendix1 atlas | Coverage/source tests |
| src/devices/fcv588/model.mjs, adapter.mjs | Extend reducer: cursor, modal draft, cancel, persist, option guard | device/public-menu tests |
| web/app.mjs, src/core/session.mjs | Reflect semantic menus and profile version | core/replay/browser |
| src/core/scenario.mjs | Synthetic IEC observation fields ONLY if required | core/no-real-output invariants |
| test/fcv588-public-system.test.mjs | New System/Installation/variant tests | server test regression |

## Tests Before / scenario matrix

| Severity | Input state | Expected |
| --- | --- | --- |
| Critical | MENU on powered device | Five documented main categories, stable IDs and valid navigation |
| Critical | Unknown software version | R&D Echo/changed palette branches held, never silently enabled |
| Critical | Generic Type=[600W] vs named capable virtual fixture | Advanced menu disabled/available exactly per documented guards |
| High | Change units/draft/Range preset, cancel/ENTER | No silent commit on cancel, persisted values only per documented semantics |
| High | Installation §4.10 start vs ordinary System menu | Separate initial/setup fixture; no forced startup loop |
| High | Tankenmaru On vs Off | NMEA menu/port unavailable in On fixture; no actual I/O ever |
| Medium | GPS/temp/NMEA absent, stale or invalid | Visible no-data display without invented live position |

## Requirements

- [ ] Versioned five-menu Sounder/Display/Alarm/Data/System atlas covers all source-documented Appendix1 nodes or marks gaps explicitly.
- [ ] Menu interaction has cursor, stage, commit/ESC, nested path and persistence only when documented.
- [ ] Installation-only setup and normal System paths are separate; Tankenmaru On disallows NMEA config/port in simulated status.
- [ ] Synthetic receive/missing/stale NMEA data (IEC 61162-1) never means actual input/output, ship network or navigating aid.

## Implementation Steps

### Task 3.1 — Versioned FCV menu atlas and reachability

- **Goal:** exact documented paths and guarded availability for declared PUBLIC_REFERENCE fixture.
- **Target:** create src/devices/fcv588/menu-atlas.mjs, docs/evidence/fcv588-public-menu-atlas.json and test/fcv588-public-menu.test.mjs; extend src/devices/fcv588/model.mjs.
- **Steps:** (1) Create importable minimal menu-atlas export and schema-valid JSON empty entries before RED; record permissions for any missing manual node. (2) RED asserts five named roots, supported child paths with publicSourceId/manualSection/profile guard, and no unsupported factory choices. (3) GREEN populate curated atlas and implement reducer cursor/ESC/save choices; separate firmware variants without selecting classroom firmware. (4) REFACTOR reachability and disabled branches.
- **Success:** every claimed leaf has trace/source/oracle or SOURCE_GAP, and navigable path works in semantic reducer.
- **Verify:** RED node --test test/fcv588-public-menu.test.mjs exits 1 with menu assertion (not import/ENOENT/syntax); GREEN same exits 0; REFACTOR node --test test/device.test.mjs and npm run check exit 0.

### Task 3.2 — Settings transaction, units and power persistence

- **Goal:** edits match document-backed commit/cancel behavior and do not touch shared-world truth.
- **Target:** src/devices/fcv588/model.mjs state/settings reducer, src/core/session.mjs, web/app.mjs; extend test/fcv588-public-menu.test.mjs.
- **Steps:** (1) RED test stage-vs-commit, ESC cancel, saved settings across power on/off, reset vs restore and units conversion display-only. (2) GREEN persist versioned device-specific settings; failures reject incompatible profile migration instead of silently replaying. (3) REFACTOR validate invalid menu order, replay and raw observation identity.
- **Success:** no value changes on ESC when manual specifies cancel; no sensor/world mutation or phantom default.
- **Verify:** RED node --test test/fcv588-public-menu.test.mjs exits 1 with named draft/cancel/persistence assertion; GREEN same exits 0; REFACTOR node --test test/core.test.mjs test/device.test.mjs and npm run check exit 0.

### Task 3.3 — System, transducer and IEC installation-specific gates

- **Goal:** teach documented conditional menus without simulated physical external transmission.
- **Target:** src/devices/fcv588/menu-atlas.mjs, src/core/scenario.mjs, src/devices/fcv588/model.mjs, docs/evidence/fcv588-public-reference-profile.json, create test/fcv588-public-system.test.mjs.
- **Steps:** (1) Create importable stubs as needed; RED requires §4.10 installation-only Language/Type/Units/Demonstrate/Tankenmaru/NMEA choices and Tankenmaru/NMEA mutual exclusion in System, plus generic Type restrictions. (2) GREEN implement explicit setup fixture with fake receive-only data, transducer guard and no-data placeholders. (3) REFACTOR run server static-root/CSP and replay tests; no WebSerial/WebUSB/NMEA TX in browser.
- **Success:** Tankenmaru On hides NMEA configuration and disables simulated NMEA port; selecting Off restores documented menu without hardware calls.
- **Verify:** RED node --test test/fcv588-public-system.test.mjs exits 1 on named §4.10 or Tankenmaru/NMEA assertion; GREEN same exits 0; REFACTOR node --test test/server.test.mjs test/core.test.mjs and npm run check exit 0.

## Todo

- [ ] Five-menu atlas complete for claimed public revision, with explicit unsupported branches.
- [ ] Stage/commit/ESC/persistence and units tested.
- [ ] §4.10 installation and Tankenmaru/NMEA mutually exclusive guarded states tested.

## Success Criteria

All three tasks GREEN and independent server/replay regression passes. Menu art is independently authored, any source with inadequate rights remains an evidence link only, not a built-in screenshot.

## Refactor / Tests After

Do not build a universal generic menu DSL that can accidentally make AIS/Radar inherit FCV menu state. Source and firmware guards stay in a narrow pure FCV module. If documented v1.05/v2.01 options conflict with actual video descriptions, quarantine claim, do not pick a runtime firmware by intuition.

## Risk assessment

Risks: incomplete Appendix1 due rights, false installed-options mix, menu state changing WorldState, Tankenmaru data availability incorrectly exposed as real I/O, and save/restore mismatch. Stop the affected claimed lesson on SOURCE_GAP or RIGHTS_HOLD, not the entire offline simulator.

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

V31 fixes direct and POWER-suspended option-draft revocation in System/Installation, extends reconciliation to live capability loss, and validates stable Installation edit ownership. Profile20 rejects profile19 replay; a separate exact-profile19 settings importer retains schema18 and preserves original startup storage bytes. Targeted evidence is recorded; integrated acceptance/full regression remains HOLD. See [V31 evidence](./reports/continuation-2026-10-16-v31-transactions-controls.md) and [the unchanged Failure Protocol disposition](./reports/v31-failure-counsel-packet.md).
