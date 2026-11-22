# FCV-588 — P09 photographic boundary class and geometry evidence (2026-11-16)

**Verdict:** `P09_RESTRICTED_TWO_APERTURE_ROI_QA_PASS_ACTIVE_LCD_AND_SIX_PRECISE_ROIS_HOLD`. Narrow restricted-reference QA-only; unchanged canonical simulator and P08 immutability. Not an OEM photo-metrology, firmware or hardware release.

## Evidence and source control

- P08 final integrity SHA `3d1a05419617807b3f3ef24042725bf414d53257d5e7157155ca0a6b787bf16a`, P08 post SHA `82706f90bf424515abc0383d9eb8b5a7895755bf2de1a040c7890a35f8610dd7`. Eight original 590×1280 JPEG rehashed 8/8 and never copied into served runtime.
- Predeclared [P09 annotation protocol](../../261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/p09-prime/P09_ROI_ACCEPTANCE_CONTRACT_20261116.md) SHA `4222eab91f57a60cd3c15bffaa5dd2cf70d4a1a50d862b2e959c5c3f910ee211` distinguishes **class A** visible active LCD content region from **class B** rounded internal aperture line intersections. No claim that prior raters were blind.
- Independent image worker-1 directly reviewed the eight photos, repeated local line/gradient edge fitting, separated active pixels from aperture and issued [P09 boundary report](../../261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/p09-boundary-protocol/P09_INDEPENDENT_BOUNDARY_PROTOCOL_20261116.json), SHA `81999e194f564f83cb7d6c15603e93efc29d8029288d104706292e60cba5b088`. **Restricted class-B virtual quads accepted for two images only:** `dual.jpg` (±16 px) and `zoom.jpg` (±18 px), for analyst-only/in-memory layout normalization. Remaining six class B **HOLD**, all eight class A active-content ROIs **HOLD**. These pixel uncertainty values are cautious image-space bounds, not physical confidence intervals.
- Independent geometry worker-7 [deterministic QA](../../261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/p09-geometry-qa/P09_DETERMINISTIC_HOMOGRAPHY_QA_20261116.json) SHA `7e41f688ba684df7aa9720745d665bec323f1f96c7d3a512901563d600571aab`: **16/16 base homographies + 256/256 bounded corner perturbations pass numerical nondegeneracy**; five P07 photo-space divider measurements mapped in-memory, no dividers invented for other 3 photos. Reproducible Python QA script AST PASS, SHA `37388c5a65c943930cbebbd727f048c1a41d0f29aee90c11d3d94f5b2c1afa57`.
- P08 rater discrepancy remains preserved: 5/8 image sets had >20px differences, max 34.93px. P09 did not alter, average, reinterpret or overwrite original P08 receipt.

## Sealed final integrity and restrictions

- `docs/qa/FCV588_P09_ROI_BOUNDARY_20261116/FCV588_P09_ROI_BOUNDARY_FINAL_INTEGRITY_20261116.json`, SHA-256 `759f146c349c2ad348fc5b98e21fbc79d1d857623253811f0a01d3b9408995b9`.
- `docs/qa/FCV588_P09_ROI_BOUNDARY_20261116/FCV588_P09_ROI_BOUNDARY_INDEPENDENT_POSTRECEIPT_20261116.json`, SHA-256 `cc3888a17c34271ba9163b86cfe4427442a1e6b5a847e4ac714661565657a26e`.
- After final was written, local postreceipt re-read six evidence assets, eight photo SHA and 39 canonical runtime source SHA, checked user-owned 4173 HTTP200 and test 4207 closed. Two independent topical workers contributed; postreceipt is a separate local byte readback, **not third independent human review**. No app runtime edits, Chrome/E2E rerun, OEM photo derivatives, OS accessibility/system changes or distribution.

## Open gates and next step

- This verifies computation and **two aperture image-space estimates**, not the source LCD 480×640 framebuffer, exact OEM pixel/glyph/color, camera intrinsics/lens distortion, physical mm or non-planar buttons/knobs.
- F1 Phase6 OPEN, all 65/65 feature claims HOLD, hardwareValidated=false, installed firmware UNKNOWN, rights/release HOLD. Actual Narrator/NVDA spoken output, native POWER hold OS blur/refocus and High Contrast remain NOT_RUN.
- Most useful next action: a *lawful, square-on, repeatable camera/reference capture* with a coplanar calibration target, or a fresh independent human selection of **class A active LCD content** on the originals with an agreed edge definition. Existing class B should only be used for bounded pane topology study; no CSS/Canvas app patch is justified by P09 evidence alone. Native Windows screen-reader/OS focus testing is a distinct next milestone once desktop interaction is authorized.
