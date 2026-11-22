---
title: "Phase 1: Equipment Evidence, License and Firmware Profile"
status: todo
---

# Phase 1: Equipment Evidence, License and Firmware Profile

## Overview

**Priority P0. Status: BLOCKED by real classroom hardware and usage-rights evidence.** Establish exactly which FCV-588 is being taught, its operator-manual revision, firmware and transducer/options. This prevents months of implementation against a different menu layout.

**Sources:** [FCV-588 Evidence Pack](../../docs/evidence/FCV-588.md), [Manual archive manifest](../../sources/manuals/MANIFEST.json), [65-item inventory](../../docs/research/FCV588_FULL_FUNCTION_INVENTORY_2026-10-13.md), [FURUNO manual](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf). All source PDF/ZIP files are restricted references, not distributable app assets.

## Requirements

- [ ] Correct FCV-588 main unit and controller type; Starter/Booter/Main firmware from Diagnostics (§3.7 p32); configured language, power behavior and default saved state.
- [ ] Installed transducer(s), power/type, Tankenmaru configuration (§2.7–2.9), external navigation/temperature/STW/NMEA sources and unavailable option list.
- [ ] Actual settings: Range1..8, zoom/B-L range, Gain modes and offset, display modes, units, relevant alarms, waypoint data state; avoid copying student/vessel identifiers.
- [ ] Orthographic front photo and closeups of keys/knobs/trackpad, dimensions of bezel and screen, licensed screenshots/video for initial, LF/HF/DUAL, NAV/Zoom, menu, Alarm, Demo, Diagnostics.
- [ ] Written rights review distinguishing permission to retain PDF bytes, inspect/process with AI, use screenshots internally and redistribute any image/logo/screen in the future build; mark every asset with provenance and permissions independently.
- [ ] A manual archive coverage record for FCV-588, FAR-2127, MDC-2060, both AIS R5 candidate families, NS4000 versions and J2000 identity. Missing content stays explicitly `RIGHTS_OR_ACCESS_HOLD`, `IDENTITY_HOLD` or `VERSION_HOLD`.
- [ ] A signed numeric `FidelityToleranceProfile` (reference [acceptance protocol](../../docs/research/FCV588_FIDELITY_ACCEPTANCE_PROTOCOL.md)) covering screen/button geometry, gesture event errors, key-hold/timer windows, static screenshot masks, input latency and screen-state semantics.

## Implementation Steps

1. Ask for classroom-unit photos, model label and Diagnostics screenshots; preserve serial privately, not in published report. No access to real operational equipment is requested by this plan.
2. Pin exact manual PDF raw SHA-256 and source URI from `sources/manuals/MANIFEST.json`. Keep the original bytes unchanged, and do not read/copy KODEN material into generative AI workflows without permission.
3. Create versioned data-only `docs/evidence/fcv588-target-profile.json` with `manufacturer/model/firmwareStarter/Booter/Main/transducer/Tankenmaru/locale/units/rangePresets/manualSha256/referencePermissions`.
4. Compare manual OME-23890-E to firmware Software History and real unit; flag differences and disable those behaviors in the target profile rather than importing newer menus blindly.
5. For the 64 `FCV_OPERATOR` entries mark exactly `OPEN`, `SIMULATED_ONLY`, `VERIFIED_IMPLEMENTED` or `NOT_APPLICABLE_WITH_EVIDENCE`. Only the last two satisfy FCV hardware behavior acceptance. Track the extra D15 `INSTRUCTOR_PLATFORM` item via separate `platformQaStatus`, not a FURUNO hardware oracle. For disabled hardware, record proof rather than declaring the feature absent.
6. Reconcile `sources/manuals/ARCHIVE_COVERAGE.json` with manifest + rights-to-retain/process/distribute. J2000 identity and NS4000 v3 PDF remain acquisition gates, never fabricate substitutes.
7. Create photo/map of each distinct control ID with coordinates normalized to physical panel dimensions; do not paste manufacturer assets into `web/`.
8. Before implementation, agree and freeze the versioned operator-signed numeric acceptance criteria from the acceptance protocol, correcting unrealistic thresholds with real measurements rather than relaxing them after failed tests.

## Todo

- [ ] Receive actual-unit model/firmware/transducer evidence and record redacted identifiers.
- [ ] Rights decision recorded per source and intended classroom/deployment use.
- [ ] Stable target-profile checksum and safe local asset provenance register.
- [ ] Each unknown feature/option listed with reason and next evidence owner (owner may remain “unassigned”).
- [ ] Independent operator reviews the proposed baseline and approves or rejects it.
- [ ] Archive completeness is explicitly ACCOUNTED_WITH_HOLDS or fully verified; no missing model is claimed as downloaded.
- [ ] Internal numeric tolerances signed before Phase 2; approval record and date are not invented.

## Success Criteria

**PASS only when:** manufacturer/model/controller/firmware/transducer/locale/ranges are pinned, the Manual Archive Gate accounts honestly for every requested device, source retain/AI-processing/redistribution rights are differentiated, numerical tolerances frozen and operator-specific unknowns resolved or explicitly scoped with sign-off. A file downloaded from the Internet is **not** an approval for reproducing its screen/layout.

**Tests-before:** schema-reject blank firmware on a validated target, unsupported option types, wrong model and unknown manual hash. After profile approval, the supplied hardware screens act as the primary physical oracle.

**Failure protocol:** missing machine details/rights -> block phase 2 hardware-fidelity claims; do not infer settings from F0 or use a different model. No authority exists to connect to operational ship systems.
