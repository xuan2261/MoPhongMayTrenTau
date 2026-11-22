# FCV-588 — P08 photo-ROI and Windows native readiness (2026-11-16)

**Status:** `P08_BOUNDED_IMAGE_SPACE_ROI_CANDIDATES_AND_A11Y_READINESS_PASS_PRECISION_AND_NATIVE_QA_HOLD`. Restricted QA-only follow-up to sealed P07; **no product runtime/test edit**, no browser rerun, no Windows setting change or OEM photo derivative. This does not create a new F1 phase or certify the real machine.

## Actual executed source and image work

- Parent P07 final `024dd1d75c7879fe0df88f939739d854a40aa819a459b6e1fbebd186aca91726` and post `22fc21b744ebedbd5ac4a5998411c3e01f665697fa7fbb2a3726998909775ea6` SHA validated again. Canonical runtime 39/39 matches parent, untouched.
- Eight original 2016 590×1280 RGB photos were viewed and hashed. A write-once metadata-only candidate receipt lists 8 rough manually estimated TL/TR/BR/BL image-space visible LCD bounds; **none is approved as a repeatable calibrated ROI**. Receipt SHA `b1ec545fb9ad19b4086baa1c303a2b7a7ada81a6991a28a83e75b64b9255cd3b`.
- Independent source-photo reviewer `worker-1` separately inspected all 8 photos and line/edge features; four visible LCD-aperture corners could be tentatively identified per image. Independent report `GO_BOUNDED_LCD_PLANE_NORMALIZATION_ONLY`, SHA `e35441fe7de4723aad5d891311022a3935244aa21282e02dc0736d19682400a6`. A per-image homography is defensible **in memory for qualitative within-LCD topology** only, not for physical millimetres, device buttons/knobs, calibrated OEM framebuffer or lens-distortion correction.
- Explicit two-rater crosscheck of **32 corner pairs**: 5 of the 8 photos contain corner-pick differences **above primary 20px uncertainty**, largest **34.93px** (`zoom2.jpg`). This is not a machine geometry regression; different plausible aperture/active-plane edges and camera ambiguity remain. Source discrepancy receipt `PASS_DISCREPANCY_DETECTED_HOLD_PRECISE_ROI` SHA `c6c075f55a18ec23ddeaadcfd5b3fe43949e0ca2d52da8c40c8a3345d62314d8`. Do not average, erase or apply these corners to CSS/runtime.
- No JPEG copies/crops/warps or OEM media derivatives were written to served `src/web` or evidence. `REFERENCE_ONLY`, `rightsOwner=UNKNOWN`, `licenseOrGrant=NOT_PROVIDED`, distribution rights HOLD.

## Independent Windows readiness — NOT native acceptance

`worker-7` read-only QA receipt SHA `e50f405cdbc2507afe58ba4fdf2bdd3e1676cfaeb4016710214918e56c8e720c`: Windows 10 Pro for Workstations 18363, Narrator present `C:\Windows\System32\Narrator.exe`, actual Narrator utterance/order **NOT_RUN**; NVDA not found on checked paths/registry (**BLOCKED** pending authorized executable/installation). Code contains focus/blur cancellation handlers and synthetic blur unit fixtures; a genuine OS `window.blur` while POWER held remains **NOT_RUN**. High Contrast current OFF, forced-colors native output **NOT_RUN**. No screen reader, browser, user focus switch or system setting was activated/modified in this task.

## Sealed evidence and limits

- `docs/qa/FCV588_P08_ROI_READINESS_20261116/FCV588_P08_ROI_READINESS_FINAL_INTEGRITY_20261116.json` SHA-256 `3d1a05419617807b3f3ef24042725bf414d53257d5e7157155ca0a6b787bf16a`.
- `docs/qa/FCV588_P08_ROI_READINESS_20261116/FCV588_P08_ROI_READINESS_INDEPENDENT_POSTRECEIPT_20261116.json` SHA-256 `82706f90bf424515abc0383d9eb8b5a7895755bf2de1a040c7890a35f8610dd7`.
- Finalizer rechecked 7 evidence files, all 8 original photo SHAs, 39 canonical runtime SHAs, `127.0.0.1:4173` HTTP200, test port4207 closed. Postreceipt independently re-read evidence after final seal; two independent topical workers were involved, but postreceipt is a separate **local byte re-read**, not a third human reviewer.

## Decision and next bounded action

**Completed:** photo-space ROI hypotheses + independent disagreement detection and native Windows prerequisite inventory. **Not completed:** calibrated active LCD ROI, physical photo correspondence, exact OEM font/color/detent, native speech/blur/forced-colors acceptance. F1 Phase6 **OPEN**, P07 full visual OPEN, 65/65 claims HOLD, firmware UNKNOWN, `hardwareValidated=false`, OEM rights/release HOLD.

For the next useful milestone, first agree a single repeatable **active display boundary vs rounded aperture edge** definition and have two independent blind annotations of the same eight originals, with explicit per-corner uncertainty and in-memory normalized pane landmarks; do not treat four-point self-fit as an independent residual test. For truly metric acceptance, obtain a lawful camera calibration/known coplanar scale image. Separately use an authorized interactive Windows QA session to capture Narrator speech and genuine POWER hold + OS blur, and only perform NVDA after the portable/installed binary is available.
