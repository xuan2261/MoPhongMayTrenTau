# FCV-588 — P03 LF/HF synthetic echo, canonical integration (2026-11-14)

**Result:** `P03_VISUAL_SOFTWARE_QA_PASS_RIGHTS_HARDWARE_RELEASE_HOLD`. This is a bounded presentation-only software gate, not OEM fidelity certification, hardware validation or permission to redistribute the eight reference photos. P03 was applied to canonical `C:\Work\MoPhongMayTrenTau` after controlled staging tests and read-only independent review.

## Change scope

- New deterministic `web/fcv588-echo-rasterizer.mjs` consumes existing synthetic projection and independent training palette; outputs display-only 2×4 RGBA raster, not acoustic measurements.
- `web/app.mjs` uses that raster and carries typed `observation.bottomDepthM` for visual seabed anchoring, with Stop provenance frozen along with image pixels.
- New `test/fcv588-photo-echo-render.test.mjs` and updated `test/fcv588-public-channel-labels.test.mjs` check actual painter dependency and false-bottom risks. These four paths alone were applied to canonical.
- No edits to `src/core/scenario.mjs`, `src/core/session.mjs`, `src/devices/fcv588/model.mjs`, `src/devices/fcv588/echo-projection.mjs`, profile/settings/replay contracts or original OEM JPEGs.

## Evidence and failure history

- Original expected missing-module RED, initial stage 533/533 and Chrome harness expected-title FAILED preserved; independent reviewer found real wide-midwater false-bottom bug, triggered new RED 6/9, repaired by bounded search near typed bottom, targeted GREEN 10/10, final stage Node 535/535 and Python 13/13.
- Stage Chrome V2 9/9 at 375×812, 1366×768, 1920×1080, 35/35 actual-loaded JS/CSS per case, 8/8 original photo paths denied (HTTP 404), zero reported browser errors.
- Corrected guarded dry-run returned 0, `canon_source_38/38`, staged runtime39 and four approved copy paths; independent worker-8 review GO. Guarded apply copied exactly four files, backed up original two existing files to `research/qa-20261114/P03_BEFORE_APPLY_20261114.zip` SHA `13091e895bd670a54a5ca7d04d36c56f76f3311fa8b9971ac7a43ba731092bba` and wrote guarded receipt SHA `80244905d3090a6c7891ec7b4de7f3d6583835ba3df9f8983ac063776543912f`.
- Fresh canonical Node 535/535, Python 13/13. Independent canonical Chrome 9/9, with rasterizer actual loaded SHA `a3becfa9a14f194869e7917438cdd51a82dbd7904feaed55357d3f4fff0c0d4c`; 35/35 loaded bodies exact-match canonical in each case, source stable, all error counts zero, test-owned server 4185 closed, user service 4173 preserved.
- Both stage and canonical captured nine PNG; independent postreceipt re-read verified screenshots 18/18 and eight reference photo hashes 8/8. `39/39` runtime source hashes canonical match stage; prior P02 receipts remain immutable.

## Final immutable P03 records

- `docs/qa/FCV588_VISUAL_P03_20261114/FCV588_VISUAL_P03_FINAL_INTEGRITY_20261114.json` SHA-256 `1132a7d8eae167a9afa60e5271bfec282b53b848054f3637cb973467fcd67c6d`.
- `docs/qa/FCV588_VISUAL_P03_20261114/FCV588_VISUAL_P03_INDEPENDENT_POSTRECEIPT_20261114.json` SHA-256 `48abc24fecae4df657e79d4ed7ba6d365fb4a97a086fbf99792b9b8535da362e`.
- Stage Chrome receipt SHA `0ad1664795693a4d5d8977b68adc1b81906e4d6d893439172710f870a06798bf`; canonical Chrome receipt SHA `61aac8d09e48e5aa948b9622b44e2516e848d2604928a423c7b7bbfa3f6dbcae`. Original RED/FAILED evidence and P02/V57 historical records were not overwritten.

## Remaining boundaries

The software now has distinct synthetic LF/HF artwork and a guarded typed seabed anchor; no OEM visual similarity percentage was measured. Current demo world bottom is not the ~19–20m white-palette source photo state, and no world/scenario truth was altered for cosmetic matching. P04 still needs photo-grounded Bottom Lock relative depth scale, DUAL depth readout alignment and NAV hierarchy. P05 localization source, P06 faceplate and P07 full visual/physical/accessibility acceptance remain open.

Authority Phase 6 stays `OPEN`, 65/65 feature claims `HOLD`, firmware `UNKNOWN`, `hardwareValidated=false`, OEM media rights `HOLD`, and `releaseApproval=HOLD`; eight source JPEGs remain reference-only and outside served roots.
