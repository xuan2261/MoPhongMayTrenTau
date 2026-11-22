---
title: "Phase 3: Five-Menu Atlas, System Configuration and Persistence"
status: todo
---

# Phase 3: Five-Menu Atlas, System Configuration and Persistence

## Overview

**Priority P1.** Implement the complete publicly documented FCV-588 menu tree, not a generic “fish finder menu” skinned to look like FURUNO. Distinguish base menu capabilities, firmware-conditional entries, transducer guards and input-data settings; do not pretend the public menu revision proves student-unit firmware.

**Deep Pre-execution Scout Gate:** Re-read Phase1 evidence ledger, [public source register](../../docs/research/FCV588_PUBLIC_MEDIA_EVIDENCE_2026-10-13.md), [64 FCV feature register](../../docs/research/FCV588_FEATURE_REGISTER_DRAFT.json), `src/devices/fcv588/model.mjs`, `web/app.mjs`, current tests, curated manual references for §1.8/§1.22/§2.1–2.9, Appendix1 Menu Tree, §4.9 IEC data sentences **and §4.10 adjustments-after-installation**. Check the rights-to-AI-process status before new automated PDF parsing; if unclear, use permitted curated notes and mark the branch RIGHTS_HOLD.

**TDD RED bootstrap:** The future `menu-atlas.mjs` module must have a minimal importable stub before RED tests refer to it. A named assertion on menu contents/reachability must fail; an unresolved module, syntax error or missing test file is a **test setup failure**, not a valid RED.

## Requirements

- [ ] All five main menus Sounder, Display, Alarm, Data and System; correct ordering and nested structure for **declared public reference variant**.
- [ ] Cursor, ENTER vs MENU/ESC, controls disabled under mode/option guard, staging vs committed values, category switching, feedback and persistence when manual states it.
- [ ] System menus: Range1–8, Zoom/B-L ranges, Key/FUNC, Language, Units, Calibration, Transducer, Demo, Tests/Restore; model §4.10 *installation-only* initial adjustments separately (Language, Type, Units, Demonstrate, Tankenmaru System, NMEA). Tankenmaru On substitutes Tankenmaru for NMEA in normal System menu and disables the NMEA port (simulation status only); test both directions without real I/O.
- [ ] Viewer/sensor units convert observations for display but never mutate world truth. No actual IEC 61162-1 transmission, ship control or generic network.
- [ ] v1.05/v2.01 differences (Colors, White Marker and research-only Echo) stay **separate known branches**; do not auto-add R&D Echo to all profiles.
- [ ] Every claimed menu path has E1 manual source and sourceStatus; missing public detail is SOURCE_GAP, not guessed.

## Implementation Steps

### Task 3.1 — Versioned menu atlas and reachable paths

- **Goal:** every publicly documented menu/submenu item has a source-linked, guarded semantic path.
- **Target:** create `src/devices/fcv588/menu-atlas.mjs`, `docs/evidence/fcv588-public-menu-atlas.json` and `test/fcv588-public-menu.test.mjs`; update `src/devices/fcv588/model.mjs`.
- **Steps:** (1) RED creates assertions for five main categories and 100% curated public menu identifiers; expected assertion failure from the old placeholder, not missing import. (2) Build FCV-only menu selectors/reducer using authoritative source annotations, guard invalid option paths. (3) GREEN and REFACTOR, checking cross-version branches separately.
- **Success:** every atlas item has menuPath, sourceId+printedSection, guard and public sourceStatus, and a reachable test or justified disabled state.
- **Verify:** RED `node --test test/fcv588-public-menu.test.mjs` nonzero with named missing menu assertion; GREEN same exits 0; REFACTOR `npm run check` exits 0.

### Task 3.2 — Edit, save, cancel, persistence and units

- **Goal:** menu edits and power cycling behave predictably with independent lesson reset/factory restore scopes.
- **Target:** `src/devices/fcv588/model.mjs`, `src/devices/fcv588/adapter.mjs`, `src/core/session.mjs`, `web/app.mjs`, extend `test/fcv588-public-menu.test.mjs`.
- **Steps:** (1) RED tests draft-vs-committed, Cancel/Back, saved-vs-factory, power restart and unit conversion. (2) Add per-device persistent settings keyed to public profile version; state mutation confined to device/view, not world. (3) GREEN; REFACTOR with profile migration rejection/replay.
- **Success:** no value change without documented confirm, no cross-scenario bleed, user can safely reset teaching session without issuing hardware command.
- **Verify:** RED `node --test test/fcv588-public-menu.test.mjs` exits non-zero on a named draft/commit or persistence assertion (not import/ENOENT/syntax); GREEN same command exits 0; REFACTOR `node --test test/core.test.mjs` and `npm run check` exit 0.

### Task 3.3 — Transducer capabilities, calibration, Demo, NMEA input indicators

- **Goal:** correctly guarded System variants and visible no-data simulation without real serial/NMEA interface.
- **Target:** `docs/evidence/fcv588-public-reference-profile.json`, `src/devices/fcv588/menu-atlas.mjs`, `src/core/scenario.mjs`, `tools/server.mjs`, new `test/fcv588-public-system.test.mjs`.
- **Steps:** (1) RED check generic Type=[600W] ACCU-FISH/RezBoost/BDS exclusions, Demo controls, named 525STID-PWD conditionals, §4.10 installation-only menu and Tankenmaru/NMEA mutual exclusion; no hardware I/O. (2) Implement synthetic NMEA receive/missing/stale fields, System→Demo and safe simulated adjustments while NMEA is unavailable in a Tankenmaru On fixture. (3) GREEN; REFACTOR/reset and no-network regression.
- **Success:** capability and data-source guard explicitly shown; no physical TX, serial/UDP or real vessel data.
- **Verify:** RED `node --test test/fcv588-public-system.test.mjs` nonzero assertion; GREEN 0; `node --test test/server.test.mjs` and `npm run check` exit 0.

## Todo

- [ ] Menu atlas source/guards cover five main categories, System and Appendix1 items.
- [ ] Save/back/cancel/persistence and units have RED/GREEN tests.
- [ ] Version-specific items and named transducer options never contaminate other variants.
- [ ] No live NMEA, physical calibration or unauthorized PDF copying.

## Success Criteria

**PASS:** all documented menus applicable to the selected public variant are reachable and source-linked, exceptions are visibly unavailable with evidence, and unsupported/unobserved behavior is explicitly SOURCE_GAP rather than a “completed” lesson.

## Failure Protocol

If any Verify step does not meet its stated pass condition, STOP this phase. Do not improvise a fix, retry blindly, or reason around the failure. Spawn the `kongming` subagent for next-step counsel and pass:
- the phase and task id,
- what you attempted (the steps you ran),
- the exact command and its full output,
- the pass condition it failed to meet.
Apply kongming's guidance, then re-run the Verify step. If `kongming` cannot be spawned in this environment, STOP and report the same failure evidence to the user. Never continue by self-reasoning.
