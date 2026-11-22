# FCV-588 — 2026-11-14 photo-reference LCD P02 guarded implementation

**Result:** `P02_VISUAL_SOFTWARE_QA_PASS_PARTIAL_PHOTO_CONFORMANCE_HOLD`. A scoped operator-display improvement is now in canonical `C:\Work\MoPhongMayTrenTau`; this does **not** close authority Phase 6, measure OEM resemblance, approve media rights, or authorize release/hardware integration.

## Scope / observed source

The 8 supplied files `sources/FCV588_GiaoDienThucTeMay2016/{giaoDien,lf,hf,dual,zoom,zoom2,nav1,nav2}.jpg` passed original SHA256 readback. Source photo atlas: `plans/261113-0911-fcv588-photo-reference-visual-conformance/research/2026-11-14-photo-mode-atlas.md`. Photos show portrait white LCD, MAN.R / G:10 / LF-HF/BL status, multiple depth ticks, depth at left, DUAL two panes, NAV data left, menus. Photos are camera JPEGs, not OEM framebuffer or licensed runtime textures; exact RGB/font/firmware/hardware rights remain unverified.

## V57 reconciliation (document-only)

Previous V57 independent postreceipt SHA `8efde8cf...` differs from current final manifest `aaa6c3b3...`. Proven cause: report `V57_HEADER_COMPACT_REPORT_20261031.md` had 1,582 bytes appended **after** postreceipt with Ultra/advice compliance note. In-memory reconstitution of just report entry `bytes=8027` and its original `sha256=c03731c4...` produces the exact former seal `8efde8cf...`; no other manifest bytes differ. Current manifest's 77/77 QA evidence SHA/size, 2/2 parent seals and 38/38 preimage source hashes all check. Write-once new receipt `research/qa-20261114/v57_reconciliation_20261114.json`; SHA `657eec86ce11...`. **V57 original seal, postreceipt and report were not edited.**

## Implemented presentation-only changes

A new staging clone `staging/fcv588-photo-visual-20261114` was created using V57 38/38 source preimages. RED tests first, followed by projector changes and real-Chrome tests. Only these runtime files changed:
- `web/lcd-presentation.mjs`: typed read-only photo-informed `MAN.R`/gain/mode/zoom tokens; Battery=On replaces picture-rate without synthetic numeric voltage, NAV-specific empty global header; pure density/units depth-axis ticks.
- `web/app.mjs`: five depth-axis marks per 20m instead of three coarse marks; remove unsupported per-pane “50 kHz / 200 kHz” body strings; mode-aware NAV big depth on left and no duplicate depth over right sonar.
- `web/styles.css`: NAV depth position left and labeled on default NAV1; D15 layer unchanged.

Three existing tests changed because they inspect actual source/painter expectations, one new `test/fcv588-photo-display.test.mjs` added. **No change** to `src/core/session.mjs`, `scenario.mjs`, `src/devices/fcv588/model.mjs`, `echo-projection.mjs`, firmware profile, settings schema or replay contract.

Actual guarded apply copied exactly 7 files after preimage matching and preserving old six existing files in `research/qa-20261114/visual_v2_before_apply_20261114.zip`, SHA `1a39f54e9e1b...`. Guarded receipt `visual_v2_canonical_apply_20261114.json`, SHA `ec12518cad57...`. Independent review verified exactly 35/38 old runtime files unchanged, 3/38 approved staged files applied and 38/38 canonical/staging byte-identical.

## TDD and regression evidence

- Original canonical baseline: Node `520/520 PASS`, Python `13/13 PASS`; initial Windows `npm` PATH error preserved as separate failed log, Node22 via existing NVM was used.
- Stage RED attempt had missing exports, 0/1 import failure; first stage full Node `517/520` (two source-string assertions and stage .gitignore fixture); review RED `4/6 PASS` (missing NAV header and invented in-pane label); all original logs retained, never overwritten.
- Postfix stage: Node `526/526 PASS`; Python `13/13 PASS`. Post-apply canonical: Node `526/526 PASS`, Python `13/13 PASS`.
- Chrome 157 real browser stage **and** canonical: 1366×768 / 375×812 / 1920×1080 each 3/3 PASS. Each viewport captured LF, HF, DUAL, NAV1, NAV2, MENU (18 images per environment, 36/36 screenshots SHA readback), all **34/34 actual loaded JS/CSS bodies** match source per viewport; no page/console/network/body errors. Eight OEM photo URLs 404. Canonical response manifest SHA equals stage.
- Supplemental ZOOM Chrome 1366×768 six cases (LF-ZOOM and HF-ZOOM for Bottom Lock/Bottom Zoom/Marker Zoom): **6/6 PASS**, 6 screenshot SHA and 34 loaded bodies each. Initial attempt **FAILED** exclusively because the harness expected literal triple-space header from `innerText` (whitespace was collapsed by DOM); failure preserved, semantic assertion corrected in new harness attempt2, no product edits. Browser viewport matrix for zoom outside desktop remains **NOT_RUN**.
- Independent reviewer reran V57/guarded source hashes + restored backup zip and reviewed original diff: no remaining HIGH/CRITICAL code issue in changed scope, not an independent OEM signoff.

## Immutable receipts / next phase

Final P02 receipt `docs/qa/FCV588_VISUAL_P02_20261114/FCV588_VISUAL_P02_FINAL_INTEGRITY_20261114.json`, SHA `15ff0baab0b8bbe213c52857b630341a426305a7cf64eae9c07d1ac55f447d53`.

Independent postreceipt `docs/qa/FCV588_VISUAL_P02_20261114/FCV588_VISUAL_P02_INDEPENDENT_POSTRECEIPT_20261114.json`, SHA `ce4a103a52940d41f453e0a67c5cc2f7ef43a3ce16ee149461140b5bb68bd405`.

Additive ZOOM readback (does not mutate sealed P02 receipt) `docs/qa/FCV588_VISUAL_P02_20261114/FCV588_VISUAL_P02_ZOOM_ADDENDUM_20261114.json`, SHA `2b01a800e57eb11a584b6b9b0ef10ee75ec61f141f0bca5efeb8eed3a4ecbde8`.

Work-package plan `plans/261113-0911-fcv588-photo-reference-visual-conformance/plan.md` is `in-progress`; no phase declared `completed`. Remaining: finish photo ROI/coordinate and rights-source ledger; P03 visually shape LF/HF echo texture without changing sonar observations; P04 full photo zoom/NAV panes; P05 measured menu phrase atlas; P06 faceplate/focus; P07 full independent source/Chrome/OS acceptance, including mobile zoom and human reviewer. **Before each source edit, pin the new P02 canonical preimage and create a new stage**; never treat old V57 manifest as current target.

Persistent gates: Phase 6 `OPEN`, 65/65 public feature claims `HOLD`, `hardwareValidated=false`, installed firmware `UNKNOWN`, asset/media rights `HOLD`, reviewer signoff not obtained, releaseApproval `HOLD`. No OEM percent or real navigation claim.

