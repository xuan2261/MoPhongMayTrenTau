# FCV-588 V41 — public-reference Sounder menu text atlas

**Audit date:** 2026-10-18. **Evidence class:** bounded visible text observation, not a firmware dump, pixel-match test, OEM media license or hardware validation.

## Design constraint and target

The independent FCV-588 classroom interface retains its established face and LCD appearance, original color/typography and five menu categories. The goal in V41 is to align **only two operator-visible Sounder labels** with a previously observed FCV-588 Sounder menu reference, without inventing typography, menu rows, firmware-specific contents or numeric measurements.

| Stable operator entry ID | V40 menu literal | V41 menu literal | Unchanged selection behavior |
| --- | --- | --- | --- |
| `sounder.pictureAdvance` | Picture Advance | **Pic. Advance** | 4x, 2x, 1x, 1/2, 1/4, 1/8, 1/16, Stop; same setting key |
| `sounder.interference` | Interference Rejection | **Interference** | Auto, High, Medium, Low, Off; same setting key |

The FUNC programming target list already used `Pic. Advance` and `Interference` and was not edited. The five menu categories remain Sounder, Display, Alarm, Data and System. The new source-grade assertion checks text, IDs, choices, selected rows and actual Chrome menu display; it does not assert factory menu pixel coordinates.

## References, credibility and rights

- **PUB-FCV-001:** [FURUNO FCV-628/FCV-588 Operator's Manual, OME-23890-E](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf), §§1.10–1.11, documents the picture-advance and interference-rejection functions. The manual reference alone is **not evidence of the installed firmware's exact glyph/layout**.
- **OBS-V41-SOUNDER:** [Third-party FCV-588 equipment photo listing](https://www.lakeontariounited.com/fishing-hunting/topic/77152-furuno-fcv-588-fishfinder-for-sale-700ship/), used as a **reference-only** visible menu image in the V41 scout; the two strings are `Pic. Advance` and `Interference`. The image's embedded firmware identification, geometric calibration and reuse rights have not been established. A subsequent automated URL fetch returned HTTP 403; no additional image evidence was authenticated from that attempt.
- **FIRMWARE-HOLD:** manufacturer software history documents multiple software revisions, but no classroom unit firmware identity is known. Do not infer which one this reference image or target unit is running.
- **RIGHTS-HOLD:** none of the OEM/manual/gallery/third-party photo, video, font or firmware bytes is copied into runtime, exported screenshots or these reports. Publicly discoverable media is not a distribution license.

## Provenance and acceptance boundary

TDD RED on the original V40 source was exactly `Picture Advance` versus `Pic. Advance` and `Interference Rejection` versus `Interference` (2 PASS/2 FAIL). Staging changed only two string literals in `src/devices/fcv588/menu-atlas.mjs` plus the matching `label` and `menuPath` fields in `docs/evidence/fcv588-public-menu-atlas.json`, with four additional tests. The new runtime source SHA is `dce8c5394eca75fd160c6298ff567744dd9196add9b62e15339abfa8d2f6bc40`, and the evidence JSON SHA is `c97ef9cedfee1f9aa32a450cb7f1908b489b00b27b48c71e2682720091277a22`.

Chrome stage and canonical isolated contexts separately exercised six viewports with **90/90 checks and 210/210 loaded HTTP response-body SHA per run**, yielding two **separate sets of 12 SHA-verified screenshots**. Actual attached Windows Chrome additionally observed the two strings at **1912×970**, not the target native 1366×768/1920×1080. Neither result measures an OEM likeness percentage.

**Review state:** textual display mismatch corrected within public-reference training scope; **65/65 claims HOLD**, installed firmware UNKNOWN, exact menu geometry **SOURCE_GAP**, native screen-reader speech/OS blur **NOT_RUN**, media reuse **RIGHTS_HOLD**, hardwareValidated=false, Phase 6 OPEN, releaseApproval=HOLD.

## Next source investigations

Collect authorized target-unit screenshots with firmware identity and exact operator sequences for MODE, RANGE, BRILL, Sounder/Display/System, NAV and LCD headers. Compare one source-backed difference at a time. Preserve D15 teacher guidance outside the device face and do not introduce hardware claims from additional tests.
