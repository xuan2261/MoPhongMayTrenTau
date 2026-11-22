# FCV-588 V42 — MODE/RANGE/BRILL/Display/System source atlas

**Date:** 2026-10-19. **Model:** FCV-588 offline public-reference training simulator. **Scope:** one confirmed MODE title mismatch, other controls classified for follow-up. **Not** an OEM firmware, pixel or hardware equivalence statement.

## Trace matrix

| Area | Public manufacturer oracle | V41 observed implementation | V42 decision / remaining gap |
| --- | --- | --- | --- |
| MODE selection window | [FURUNO operator manual OME-23890-E, §1.4](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf) shows the window title MODE and seven choices: NAV1, LF-ZOOM, LF, DUAL, HF, HF-ZOOM, NAV2 | Read-only LCD projector titled window MODE SELECT; seven choices already matched | **Verified literal mismatch fixed:** MODE SELECT becomes MODE only. Timeout, selection, cancel and history unchanged. OEM window coordinates/fonts/HW revision still HOLD |
| RANGE | Same manual §1.5 shows Range, Auto/Manual, eight preset positions and conditional BDS unavailability | Projector title Range, Auto/Manual choice, D15 separate teacher notes | Title already aligned; precise unit presets, OEM font/geometry and transducer guards require per-config evidence; no V42 behavior changes |
| BRILL | Manual §1.3 shows title Brill, levels 0–9, six-second inactivity and an increasing/decreasing repeated-key cycle | Projector title Brill; 0–9 training levels, independent UI timer. Reducer source indicates short BRILL during dialog currently increments using modulo 10 | Title already aligned. **Potential V43 behavior discrepancy** for 9→0 versus manufacturer-described 9→8 after repeated presses. No V42 change: reducer/replay/schema/profile risks need dedicated TDD and revision/migration decision |
| Display | Manual §1.22 and software history document menu functions and revision-dependent colors/marker choices | Independent training projection includes source-graded and synthetic paths; some contents are not firmware-certified | SOURCE_GAP/FIRMWARE_HOLD; do not invent the complete menu order or promote image-derived pixels |
| System / installation | Manual Ch2/§4.10 documents setup paths, language and transducer dependencies | Training-only System and separate Installation fixtures; language rights HOLD, NMEA/Tankenmaru virtual and sandboxed | SOURCE_GAP/RIGHTS_HOLD; no declaration of installed firmware, real sensor, RF or language entitlement |

## Preserved architectural boundary

The V42 product change is exactly one textual literal in web/lcd-control-presentation.mjs within a read-only projection. Source SHA changed from 0881d0567d7921a98085a7914ebc2628e9b2f6d2c23d9a5894e7f97f3bba808f to a03cd467b8809ac2f67bc4eed6146c9eb113c1dbbbe1d73493d68e8491c73675. All 36 other runtime assets remain V41 byte-identical. Core model/reducer/typed observation, UI/world clocks, replay/session and settings schemas, CSS/LCD artwork, keyboard/rotary adapters, D15 external instructor panel, and hardware transceiver limits have not changed.

The seven MODE choices remain under the instrument LCD only, with teacher guidance and data provenance shown separately in D15, never printed on face. Responsive mobile face remains original training adaptation, not OEM geometry. The [DEMO] indicator retains the prior manual-backed context with pixel/font placement provisional.

## Evidence and rights

- Primary manufacturer indexed manual: https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf (OME-23890-E §§1.3–1.5; §1.22; Ch2, §4.10).
- Manufacturer product page: https://www.furuno.com/en/products/fishfinder/fcv-588/index.html (FCV-588, 480×640 screen, 8.4-inch diagonal).
- FURUNO software history: https://www.furunousa.com/-/media/sites/furuno/software_library/software/software/fcv588-628_software_history.pdf (software revisions; target firmware still UNKNOWN).
- Rights: https://www.furunousa.com/en/terms_of_use and existing sources/manuals/MANIFEST.json. Reference text and links are used as evidence only. No PDF, OEM photograph, screen frame, artwork, font or firmware bytes were imported into staging, code, reports or runtime.

## Software-only QA

Stage: 3 focused tests with original RED 2/3; after one literal correction, 3/3 GREEN, 478/478 full Node, 13/13 Python after exact 16 historical ORIGINAL TRAINING screenshot fixture copies and preserved original Python setup failure. Browser staged six isolated Chrome viewport contexts 120/120 assertions, 210/210 actual loaded local HTTP body SHA, 12 original training screenshot hashes. Canonical carries a separate browser run and screenshot set.

In an attached CoS Desktop Chrome tab the actual viewport was 1912×970: physical MODE knob ArrowRight opened MODE and selected DUAL while current LF, with 35 local HTTP200 requests and 0 console errors. The first delayed Escape occurred after six-second auto application (it opened Sounder rather than cancel); a second immediate MODE draft of HF from DUAL was canceled with Escape, leaving committed DUAL intact. Desktop screenshot has connector ID, not filesystem image SHA. Native exact 1366×768/1920×1080, Narrator/NVDA spoken output, genuine OS-window blur remain NOT_RUN.

## Acceptance / next

**65/65 claims HOLD; 14/50 checklist, 6/22 named tasks, Phase6 OPEN; hardwareValidated=false; firmwareInstalled=UNKNOWN; releaseApproval=HOLD.** These software assertions are not OEM function counts or percent likeness.

Proposed V43: with the same official §1.3 oracle, isolate BRILL short-key sequence 9→8 (instead of present training 9→0) using independent event/replay checks, plan any required device profile/event compatibility boundary, and do not touch installed firmware or hardware. Parallel Phase 6 native accessibility/manual gates require controlled Windows and permissioned target-unit references.