# FCV-588 V47 — White Marker firmware source grading and external D15

**Date:** 2026-10-19. **Purpose:** a narrowly bounded PUBLIC_REFERENCE training interface source-provenance milestone. This report does not certify OEM pixels, actual installed firmware, sonar hardware behavior, marine navigation fitness or redistribution permission for manufacturer artwork.

## Source oracle and scope decision

Official [FURUNO FCV-628/588 Operator's Manual, OME-23890-E §1.22](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf) describes White Marker using the echo color bar, Up/Down selection, ENTER and Off. The [FCV588/628 Software History](https://www.furunousa.com/-/media/sites/furuno/software_library/software/software/fcv588-628_software_history.pdf) says White Marker settings changed in v2.01 (September 2016), but does not provide a verified installed-unit configuration or an OEM `White/Gray` selection enum. Current simulator `Off / White / Gray` is therefore retained solely as a classroom visualization to avoid changing existing event-sourced replay/settings contracts.

The V47 source atlas is at `docs/research/FCV588_V47_WHITE_MARKER_FIRMWARE_SOURCE_ATLAS_20261019.md`.

Exactly **two of 37 runtime files** differ from canonical V46:

- `src/devices/fcv588/menu-atlas.mjs` grades `sounder.whiteMarker` as `TRAINING_WHITE_MARKER_PREVIEW_FIRMWARE_UNKNOWN` while leaving the operator label `White Marker`, existing training options, item order, menu position and behavior unaltered.
- `web/lcd-instructor-meta.mjs` shows the specific White Marker source caveat **only in D15 outside the instrument face**, not on its LCD.

Static `docs/evidence/fcv588-public-menu-atlas.json` matches this grade. In `docs/evidence/fcv588-public-implementation-status.json`, a byte-scoped metadata correction changed **B07.note only**, retaining every claim decision HOLD. One new seven-case Node test and one source atlas complete the six-file canonical source/test/metadata apply. No reducer, real-world sensors, CSS, palette values, physical I/O, firmware, schema, replay, persistence or profile revision was changed. `F1-public-reference-21` remains the training profile, **not** installed manufacturer firmware.

## Evidence chronology, diagnosed failures and TDD

1. V46 final receipt SHA-256 **b8080291f753a56aa428bf038de8e98f4f84f13686b415d941f7074fe66f809d** and independent postreceipt SHA-256 **7f8a00fb1be746655a6decffb5551c9019fa777a722c2301879512bcd01cb84c** matched preflight. Staging copied **37/37 runtime SHA** and **16 original training PNG** fixtures with SHA match; no manufacturer images, PDFs, videos, fonts or firmware bytes entered runtime.
2. Original new-test RED included harness errors (wrong scenario alias, TypedArray fingerprint, then nonexistent sensor channel key `12` versus existing frequency `50`). Original failed stdout/logs and root-cause GO decisions were retained. Once the harness correctly measured the application contract, focused **source-valid RED 2/7 PASS, 5/7 FAIL**, original log SHA **14cf6b85653470b11efb76c8e2fb673b27902cbc97b88227ea7b431f959207e1**.
3. The initial text-based claim update erroneously touched A02, then B01, because generic notes were repeated. Structured metadata by-featureId checks detected both and stopped staged verification. The final byte-scoped repair rebuilt from canonical V46 metadata and changed **only B07.note**, with all **65/65 claims HOLD**; helper log SHA **4e1a1ed1cf8c127acdd2879ddedee7dedef4f083512f110c2ecfa80441cded2f**.
4. Staging focused **7/7 PASS**, targeted **48/48 PASS**, full Node **504/504 PASS**, Python **13/13 PASS**.
5. Original stage browser V1 failed before completing any viewport because of case-sensitive `firmware` matching (the D15 sentence wrote `Firmware`). Its Windows console logging also hit cp1252 encoding when printing the Unicode exception. **Original failed V1 JSON and stdout were preserved**, not counted PASS. V2 only fixed matcher case and ASCII-safe diagnostic printing, using fresh receipt/PNG names.
6. Stage Chrome V2 passed **126/126 assertions**, **210/210 actually loaded localhost source-body SHA** and **12/12 PNG SHA** across six independent viewport contexts: 320×720, 375×812, 768×1024, 1366×768, 1440×900 and 1920×1080. Desktop/mobile screenshots were inspected. Stage Chrome receipt SHA **4b0afa9a99e5bc37500b4af78d2ee6160c6e72321f456c212adfd602d82221d4**.
7. Staging patch manifest SHA **c96ae28ad0f5035f180af47f4d00ae4faf203bc039af01c638faed209bcd89e4** and GPT-6 scoped canonical GO SHA **8d86d05c5096492ffca3fb0579d15798cae0c938cc1d20bafff49565b6044b1e** were checked. The original canonical apply PowerShell preflight expected the wrong `runtimeChanged` field, although the manifest uses `changedRuntime`. Two Python checkers then prematurely exited on hard-coded QA status and absent optional profile keys. All such failures occurred **before any copy**, with original logs preserved. Rather than repeating speculative checker patches, a single schema-observant read-only gate independently passed 37 source preimage SHA, exactly six allowlisted file targets, B07-only claim differences and 65 claims HOLD.
8. The same proven gate rechecked preconditions in apply mode. **Exactly six files were copied and postcopy SHA-verified**, with canonical apply receipt SHA **8812e1a165e19c8de68ba0fb465a82125c53394fdf6d8eca025248b97756a8ce**. Only two runtime source files changed; the other **35/37 kept V46 SHA**. No source schema or replay change.
9. Canonical independent targeted Node **48/48 PASS**, full Node **504/504 PASS**, Python **13/13 PASS**. Canonical Chrome V2 separate run **126/126**, **210/210 actually loaded body SHA**, **12/12 PNG SHA**, receipt SHA **12e4c4605abd208009bc8b97f5ed74171a50fb12f0a13c28558991e0bb45c251**.
10. Canonical HTTP server returned HTTP200 with `connect-src 'none'` CSP and `nosniff`; four negative URLs denied **404,404,403,405**. HTTP receipt SHA **a2b1ccdd77fbf6e6ca1390be6f857a9f499d59ea7788dcec15bcdf3c27d37313**. Test-owned 4233 and 4234 servers were stopped.

## Actual attached Windows browser partial evidence

An independent CoS Desktop Chrome tab at observed **1912×970** received actual POWER, training clock, MENU/ESC, TrackPad, ENTER, cancel and replay interactions. It showed `▶ White Marker`, `TRAINING_WHITE_MARKER_PREVIEW_FIRMWARE_UNKNOWN`, a specific D15 notice outside the face and **REPLAY PASS**. Console errors captured after attachment: zero; the connector's late network capture was not used as source-body SHA evidence. A connector screenshot ID existed but **no canonical PNG or invented SHA** was assigned. See `docs/qa/FCV588_V47_DESKTOP_MANUAL_PARTIAL_20261019.md`. The tab was closed.

## Acceptance hold and V48 recommendation

**Phase 6 OPEN, 65/65 claims HOLD, checklist 14/50, named tasks 6/22, hardwareValidated=false, releaseApproval=HOLD, installed firmware UNKNOWN and OEM rights HOLD.** These Node/Chrome counts are tests/assertions, not a percentage of physical FCV-588 similarity.

For V48, prioritize lawful target-unit firmware/software version evidence and a properly rights-cleared recording of the White Marker color-bar selection workflow. This would permit distinguishing the simplified training `Off/White/Gray` selector from the actual OEM operator sequence without silently rewriting historical replay. Separately, real Narrator/NVDA spoken output, exact native attached 1366×768/1920×1080 and genuine OS-window blur remain NOT_RUN until a controlled Windows testing facility exists. Do not deploy, connect ship sensors, reuse protected OEM assets or promote release/claim counters without separate evidence and authorization.
