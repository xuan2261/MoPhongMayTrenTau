---
title: "Phase 3: Full Menu Tree, Configuration and Persistence"
status: todo
---

# Phase 3: Full Menu Tree, Configuration and Persistence

## Overview

**Priority P1, depends on Phases 1–2.** Implement every menu item exposed by the target firmware, including interactions, disabled-by-option cases, saved settings and independent lesson reset. Mainly inventory A13–A17, B06–B13/B18–B19, C11/C13 and D01–D09.

Manual focus: §1.8 main menus, §1.22 Sounder/Display/Alarm/Data, Chapter 2 System, Range/Key/Language/Units/Calibration/Transducer/Demo/Tankenmaru. Menu contents are **version-specific** and should not be made into a giant cross-device JSON reducer.

## Requirements

- [ ] Data-backed menu atlas records `path/menuCategory/item/controlType/options/guard/sourceSection` for every visible entry on the actual unit; menu opens and state transitions are implemented by FCV-specific code.
- [ ] Separate draft value, committed value and persisted setting; MENU/ESC vs ENTER semantics, nested Back, timeout, disabled item and reset behavior match device.
- [ ] Correct Sounder, Display, Alarm, Data and System navigation, plus submenus and key programming on selected firmware.
- [ ] Units conversions affect displayed value, not simulated water depth; calibration parameters affect a typed sensor-display processing layer, not shared-world state.
- [ ] Advanced transducer/capability guard returns unavailable status visibly and predictably, never offering a nonexistent function as working.
- [ ] Demo entered through System menu, with correct [DEMO] indicator and state isolation from teacher's synthetic scenario fixture.

## Implementation Steps

1. Build verified menu atlas from rights-cleared manual notes and screenshot captures of the actual unit. Assign source/manual section and evidence ID to each node; version the map.
2. **RED:** path reachability, 5 main menus, cursor movement, nested menu, staged value, ENTER save, MENU/ESC cancel/return, disallowed mode and power persistence; run across all target-unit options.
3. Implement an FCV-specific menu-state stack with type-safe actions, keeping the core's generic InputEvent unchanged. Avoid remote/eval-based menu payloads and cross-model menu DSL.
4. Separate lesson-initial settings, last-used device settings, profile factory defaults and clear memory/restore prompts.
5. Add Settings/Calibration/Units/Transducer/Demo/Tankenmaru variants guarded by actual hardware/options; no real sonar/RF/electronics calls.
6. Capture menu tree coverage: discovered/reachable/verified nodes, flag disabled but expected features with photo/source; E2E keyboard/TrackPad tests.

## Todo

- [ ] All target firmware menu nodes enumerated and accessible or intentionally disabled with evidence.
- [ ] All menu paths tested for commit, cancel, persistence, invalid setting and restart.
- [ ] Units/calibration/option settings do not mutate shared-world truth.
- [ ] DEMO and reset behavior match manual and actual unit.

## Success Criteria

**PASS:** 100% menu-node coverage for this equipment profile, zero unsupported active menu elements, and full test trace from screen capture to reducer state. External data “missing” paths use authentic placeholders.

**Failure protocol:** unconfirmed menu nodes remain `OPEN`, with the evidence gap recorded separately, and block F1 feature acceptance; no guesswork from another firmware/manual revision.
