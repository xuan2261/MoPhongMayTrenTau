# FCV-588 V46 — Manufacturer Colors label and firmware-unknown D15 source boundary

**Date:** 2026-10-19. **Scope:** FCV-588 offline PUBLIC_REFERENCE training simulator. No claim of installed FCV-588 firmware equivalence, OEM pixel reproduction, physical luminous accuracy, license to redistribute manufacturer media, or approval for ship navigation.

## Direct manufacturer source

Official primary FURUNO [FCV588/628 Software History](https://www.furunousa.com/-/media/sites/furuno/software_library/software/software/fcv588-628_software_history.pdf), September 2016:

- v1.05 is the listed initial release.
- v2.01 added 8- and 16-color options to the **Colors** selection within the **Display** menu.
- White Marker settings were changed.
- An Echo menu was introduced under System for **research and development use only**.

This is a verifiable *software-history reference*, not proof of which firmware is installed on a particular FCV-588. No firmware package, graphic/font, OEM PDF page, video frame or photo was incorporated into the simulator runtime.

The [FURUNO FCV-628/FCV-588 operator manual, OME-23890-E](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf) provides contextual Display and System menu descriptions but cannot resolve actual target-unit firmware and pixel geometry.

## Grounded issue and bounded V46 correction

| Question | V45 original | V46 source-scoped decision |
| --- | --- | --- |
| OEM-facing menu text for v2.01-referenced 8/16 Colors | `Display > Colors · SIM` including a teacher suffix on LCD | Use **`Display > Colors`** without classroom suffix; keep menu category/id and 8/16 choices |
| Provenance of training 8/16 palette | `TRAINING_PALETTE_PREVIEW_FIRMWARE_UNKNOWN` in source metadata | Preserve exact source-status string; never call palette a verified OEM RGB table |
| Instructor warning near active Color selection | Generic simulated sonar notice, not specific to firmware/color entitlement | Place explicit `FIRMWARE_UNKNOWN` 8/16 preview cue in **D15 outside the device/LCD** |
| White Marker | Unverified physical firmware colorimetry and settings | Do not infer the installed unit's White Marker semantics or change runtime |
| System > Echo | FURUNO source history marks v2.01 addition as R&D-only | Do **not** invent/activate System Echo in the operator simulator |
| Settings/profile/replay | `F1-public-reference-21`, schema settings 18, event 5, replay envelope 7 | Keep byte-identical; display text and external metadata only |
| Actual OEM screen geometry and display colors | Unknown | HOLD |

The user's long-standing UI specification is to keep teacher warnings and all Vietnamese explanations **outside** the instrument face/LCD. The source-level mismatch is the **`Colors · SIM` literal** in `src/devices/fcv588/menu-atlas.mjs`, and separately in `docs/evidence/fcv588-public-menu-atlas.json`. The teacher source grade in the two records is preserved unchanged.

## Deterministic staged evidence

V45 final and independent postreceipt were checked SHA-identical, followed by staging preimage **37/37 runtime sources** and **16/16 original training screenshot fixture SHA**. No OEM PDF/media bytes were copied into runtime/staging.

TDD six new test cases:

1. Exact FURUNO `Display > Colors` literal, source grade, 8/16 choices.
2. Read-only LCD projector does not add training suffix or alter device state.
3. D15 firmware-unknown source cue displayed externally.
4. System R&D Echo is not exposed as an invented installed operator menu.
5. Palette stays independently authored; profile21 and simulator session hash remain unchanged.
6. Live source atlas metadata mirrors the operator label and source status.

Original first RED 1/6 (5 fail) included one new test incorrectly asserting `adapter.profile.firmwareInstalled` instead of the actual `adapter.profile.firmware`. This was documented as a test-harness mistake; original log retained. Corrected, independent valid RED was **2/6 PASS, 4/6 FAIL**, establishing the actual operator-label/provenance mismatch. Staged after two runtime presentation/source-cue edits and live-metadata sync **6/6 GREEN**.

One legacy B19 test still required `SIM` on the operator LCD; original staged full Node run failed **1/497**. GPT-6 scoped GO kept the original log and updated only that test to assert the **exact OEM operator literal** plus a stronger **external D15 source-grade/firmware unknown** assertion. New targeted suite **45/45 GREEN**, full Node **497/497 GREEN**, Python **13/13 GREEN**.

Staged independent Chrome across six isolated viewports **126/126 assertions**, **210/210 actual loaded localhost HTTP body SHA**, **12/12 PNG SHA**, with untouched 480×640 logical LCD and original MENU/ESC label. The Colors row and two-option editor were visually checked on 1366×768 desktop and 375×812 phone. Isolated responsive layouts do not certify physical OEM pixel accuracy or native attached CoS Desktop resizing.

## Remaining acceptance gates

No installation evidence proving v2.01 versus v1.05 on the target unit. Narrator/NVDA actual spoken output, genuine Windows OS-window blur during hold, and native attached CoS Desktop exact 1366×768/1920×1080 remain **NOT_RUN**. Phase 6 is OPEN, all 65 claims HOLD, checklist 14/50, named tasks 6/22, hardwareValidated=false and releaseApproval=HOLD.

Recommended follow-up: obtain authorized original FCV-588 hardware/installed software revision and lawful screen captures, then validate firmware-conditional Display/System labels, White Marker and practical optical color behavior. Keep all untested OS/speech gates NOT_RUN until a controlled environment supplies actual evidence.
