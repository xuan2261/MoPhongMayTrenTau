# FCV-588 V46 — OEM Display Colors literal + external D15 firmware warning

**Date:** 2026-10-19. **Scope:** manufacturer-text-bounded correction of PUBLIC_REFERENCE training interface, not installed firmware or physical hardware conformance. GPT-6 is the user-authorized scoped GO/NO-GO supervisor, not an independent OEM reviewer.

## Manufacturer evidence and decision

The official [FURUNO FCV588/628 Software History](https://www.furunousa.com/-/media/sites/furuno/software_library/software/software/fcv588-628_software_history.pdf) lists **v2.01 (September 2016)** adding 8- and 16-color choices under the **Colors** item within the **Display** menu. Manufacturer text does not call the menu item `Colors · SIM`; this classroom suffix was printed on the LCD in V45. The user's requirement is that teaching/provenance explanations must remain outside the instrument face.

**V46 operator LCD label is exactly `Colors`**, while the independently authored 8/16-color renderer and its firmware-unknown training grade remain unchanged. The active Display > Colors source caveat is presented in the external D15 panel, explaining the v2.01 historical reference and unknown installed firmware. Other v2.01 updates, including White Marker and an R&D-only System Echo menu, remain source gaps; no speculative menu/item behavior is added.

See [V46 research atlas](../../../docs/research/FCV588_V46_COLORS_FIRMWARE_SOURCE_ATLAS_20261019.md). The software's profile `F1-public-reference-21` remains the event/replay/settings training contract, not OEM firmware v2.01.

## Exact code and metadata changes

Starting from verified immutable V45 final SHA `ac7bacb04eff3baaf9455bb9ff97d89bb5fa79ad4c331264b8acb9b970a48861` and postreceipt SHA `13af7c3798397f9ba6aaa6bf293f5e58bcde0b22a6a19f489d6af052b31e7543`, staged exact clone verified 37/37 runtime SHA and copied 16/16 SHA-matching **original training PNG** fixtures. No OEM PDF/photograph/firmware was imported.

Only **2 of 37 runtime files** changed compared with V45:

1. `src/devices/fcv588/menu-atlas.mjs`: one literal `Colors · SIM` → `Colors`. Existing `display.colors` ID, category/order/choices 8/16, `TRAINING_PALETTE_PREVIEW_FIRMWARE_UNKNOWN` grade, reducer and persistence unaffected.
2. `web/lcd-instructor-meta.mjs`: one instructor-only source-cue branch showing the firmware-unknown warning when Colors is selected in Display. No writing on the LCD/machine shell.

Also updated the static `docs/evidence/fcv588-public-menu-atlas.json` label/path, and reconciled one historical explanatory note in `docs/evidence/fcv588-public-implementation-status.json` while keeping all 65 claims HOLD. One new six-case TDD file `test/fcv588-v46-colors-oem-firmware-boundary.test.mjs` and a stronger existing B19 test distinguish operator label from D15 metadata. Added research, QA and plan records.

**35/37 runtime sources remain V45 SHA-identical.** No world/sensor data, event/session/replay, settings schema, version, physical IO, CSS/geometry, other menu labels, optional hardware or media rights changed.

## Original failures preserved and repaired by root cause

- The initial six-test RED (1 PASS, 5 FAIL) included an incorrect *new test* property `adapter.profile.firmwareInstalled` where `adapter.profile.firmware` is the actual source contract. Original failed log SHA `681a964f30b2c85884ee5ccebce8531619327c378ec85b8ad164bae47455d4b0` was preserved. Correcting only that harness field yielded independent source-fidelity RED **2 PASS, 4 FAIL**, SHA `1e8c65c9375251fc35b57bfb7235cb51def384d7a9f1e2d59bb4f2c5a835d23c`.
- After the minimal staging patch, focused tests **6/6 GREEN**. The first staging full Node Verify found **496 PASS, 1 FAIL** because the old B19 regression demanded `SIM` on the operator LCD; original failing log SHA `85892921cb00fa0e027525a1d92a32371b6169de32b0702bf92c09437393a245` was preserved. GPT-6 authorized exactly one B19 test adjustment to check *both* the OEM literal and explicit external D15 warning, rather than deleting or weakening a source gate.
- New staged targeted Node **45/45 PASS**, full Node **497/497 PASS**, Python **13/13 PASS**.

Staging patch manifest SHA `25b680418cac304f8cdfc042c3af70c2d448f181692c5cde423ae9fb73dd6cfa`, GPT-6 scoped canonical GO SHA `5695d96c694a1318c44c78d35c71b0937ae137308186e8a3ceef07a8668867a0`. Controlled canonical apply receipt SHA `816d46a2b0dd56460024309cae3b3757279944d3e82e3e2981e7405495b27868` confirms exactly seven approved files copied with 37/37 runtime SHA after copy.

## Stage and canonical QA

| Verification | Stage | Canonical |
| --- | ---: | ---: |
| Targeted Node | 45/45 PASS | 45/45 PASS |
| Full Node | 497/497 PASS | 497/497 PASS |
| Python | 13/13 PASS | 13/13 PASS |
| Chrome six viewport assertions | 126/126 PASS | 126/126 PASS |
| Actual loaded localhost browser source-body SHA | 210/210 | 210/210 |
| Independent PNG SHA | 12/12 | 12/12 |

Chrome viewports: **320×720, 375×812, 768×1024, 1366×768, 1440×900 and 1920×1080**. Both Chrome runs independently exercised power, menu selection, Display → Colors, D15 source-grade cue **outside** the face, 8/16 draft, MENU/ESC cancel and replay. Source-body integrity checked bytes actually received by Chrome. Desktop/mobile staged PNGs were inspected visually and showed an undistorted `Colors` operator label with no `SIM` suffix.

Independent browser receipts: stage SHA `15b67a977900caaf974047659ce3d597d5cf76fc05e64791d2b1576e08587282`; canonical SHA `3e78078460510b7932854b694df189f9005b3f82e2f6bc6f8bbcefa740ceb489`. They are two runs, not combined into one synthetic 24-image browser run.

Canonical targeted Node **45/45**, full **497/497**, Python **13/13**. HTTP security negative routes **4/4 denied** (404,404,403,405), root HTTP200 with CSP `connect-src 'none'` and `nosniff`; receipt SHA `ec2e3f360d7a00784a69b59dfa6a0ceee237b33c6339d5a4ae3ebd81de489167`.

Attached CoS Desktop actual Chrome at **1912×970** independently observed real button clicks selecting `▶ Colors`, current `aria-current=true`, source grade `TRAINING_PALETTE_PREVIEW_FIRMWARE_UNKNOWN` and visible D15 warning outside the face, with zero observed console errors since attachment. The connector screenshot ID was not saved as a canonical PNG and has **no SHA**. See [partial native Desktop report](../../../docs/qa/FCV588_V46_DESKTOP_MANUAL_PARTIAL_20261019.md).

## Continued acceptance HOLD and V47 proposal

**Phase 6 OPEN; 65/65 claims HOLD; checklist 14/50, named tasks 6/22; hardwareValidated=false; installedFirmware=UNKNOWN; OEM media rights HOLD; releaseApproval=HOLD.** Synthetic headless Chrome viewports do not satisfy exact attached Desktop native resizing, nor do DOM/ARIA snapshots prove Narrator/NVDA spoken output. Genuine OS-window blur-under-hold, hardware and independent reviewer remain NOT_RUN/HOLD.

Proposed V47: obtain *legally usable target-unit firmware identity and manufacturer/hardware operator menu screenshots* to adjudicate White Marker and other firmware-conditional Display/System differences, or conduct a controlled Windows accessibility test recording actual spoken Narrator/NVDA output and real focus-loss while held. Avoid any firmware/media reuse, physical instrument connection or automated OS settings change without explicit, separate authorization.
