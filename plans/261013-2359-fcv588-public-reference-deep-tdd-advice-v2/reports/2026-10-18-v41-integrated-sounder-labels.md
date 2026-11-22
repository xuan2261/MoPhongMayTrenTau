# FCV-588 V41 — scoped Sounder menu-label integration and QA

**Date:** 2026-10-18. **Implementation:** bounded GPT-6 self-reviewed GO. **Phase 6, rights, installed firmware, real hardware and release:** HOLD.

## What was integrated

The independent training LCD's Sounder menu now prints `Pic. Advance` rather than `Picture Advance` and `Interference` rather than `Interference Rejection`, based on bounded text observation of a FCV-588 menu image and the manual's descriptions of the two controls. These do not establish exact installed firmware, menu pixel layout or image-reuse rights. The source [V41 Sounder atlas](../../docs/research/FCV588_V41_SOUNDER_MENU_SOURCE_ATLAS_20261018.md) keeps source and rights limitations explicit.

Changed canonical paths are exactly:

1. `src/devices/fcv588/menu-atlas.mjs` — two source-backed operator label literals, SHA before `83928dbe14a446cab48f4652e27ef20ad8afb45e0bd31760975aa72b71380b5a`, SHA after `dce8c5394eca75fd160c6298ff567744dd9196add9b62e15339abfa8d2f6bc40`.
2. `docs/evidence/fcv588-public-menu-atlas.json` — only these two entries' `label`/`menuPath`, SHA after `c97ef9cedfee1f9aa32a450cb7f1908b489b00b27b48c71e2682720091277a22`.
3. `test/fcv588-v41-oem-sounder-labels.test.mjs` — four tests, SHA `ae58a2cba5f07e40e5c73aee73da57a083a9d99509d5f2fb6ffa14fee8dafcf7`.

Exactly **one of 37 runtime files changed**; the remaining **36 source assets** stayed byte-identical to V40. No change to `model.mjs`, `web/index.html`, LCD artwork or CSS, World, reducer, session/replay/event/settings schema, option guards, physical keys, D15, real sensors or RF. The existing FUNC target names were already in the desired abbreviated form and were not changed. All profile and schema revision numbers remain at V40.

## Source/rights gate

The [operator manual](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf) OME-23890-E §§1.10–1.11 describes Picture Advance and Interference Rejection. The [third-party FCV-588 photo listing](https://www.lakeontariounited.com/fishing-hunting/topic/77152-furuno-fcv-588-fishfinder-for-sale-700ship/) supplied the previous scout's visible shortened menu labels. An automated URL fetch later returned HTTP 403, so there was no fresh independent image retrieval in that attempt. Neither the manual nor image listing grants an OEM artwork license; no manufacturer or third-party photo bytes were copied into runtime or report. Installed firmware remains **UNKNOWN**.

## TDD lineage and stopped verification

- Staging was byte-cloned from V40 and independently checked against **37/37 baseline SHA**; stage baseline receipt SHA `153e44585bcca2c6ce72db0e48db3ff0866dda4a15b218e696a4c6248f19c415`.
- Original focused RED: **2 PASS/2 FAIL**, actual `Picture Advance`/`Interference Rejection` versus expected `Pic. Advance`/`Interference`. Original TAP log retained, SHA `53b61b8db02d05a3d34fcc99c809e8d9ddc9b77bb5e49e4a60d3899620dc3a89`.
- After two staged source string changes and matching atlas JSON, focused **4/4 GREEN**. Source IDs/choices and menu/help separation tests passed.
- First stage full Node **472 PASS/3 FAIL** then second **473 PASS/2 FAIL**. Both failures were caused by staged plan-relative documents not copied into the isolated test tree. GPT-6 STOP and narrow dependency-copy GO decisions, original logs and SHA remain in stage evidence. Only missing text/QA fixtures were copied byte-identically, **not** tests or source behavior. Documentation-link targets then **13/13 PASS**; fresh stage full Node **475/475 PASS**.
- Stage Python **13/13 PASS**. Stage Chrome **90/90 assertions, 210/210 actual response bodies SHA**, 12/12 screenshot files SHA across **320×720, 375×812, 768×1024, 1366×768, 1440×900 and 1920×1080**. Two stage screenshots (1366 menu open and 375 menu open) were directly viewed for clipping and label fit.
- Stage preapply manifest [V41 staged patch](../../staging/fcv588-v41-oem-sounder-labels/evidence/V41_STAGE_PATCH_MANIFEST_20261018.json) SHA `191e70052d0bd3fa71f5450ee61708e9f1f49b0bcf6f2340d8414f4dda28a82d`: proves exactly one changed runtime source by byte-transform, one evidence JSON by four exact substitutions and historical V40 receipts unchanged.

## Canonical application and regressions

After [GPT-6 integration GO](./2026-10-18-v41-gpt6-sounder-labels-go.md), canonical source preimages were checked before copying. A separate [apply receipt](../../docs/qa/FCV588_V41_CANONICAL_APPLY_20261018.json) with SHA `d1d5a6f1b43fa031918cdabd279dd7735a3079bd26b0d1329124c2af3e3fef7b` read back all 37 runtime source hashes and the new test/evidence JSON hashes.

| Gate | Canonical result |
| --- | --- |
| Targeted Node (new V41 + V40 + menu/FUNC) | **18/18 PASS** |
| Full Node, fresh on canonical | **475/475 PASS** |
| Python unittest | **13/13 PASS** |
| Isolated Chrome, 6 viewport contexts | **90/90 assertions PASS** |
| Actual Chrome response body hashes | **210/210 SHA** |
| Canonical new Chrome PNG | **12/12 SHA** |
| HTTP negative routes | **4/4 denied**, root 200, CSP `connect-src 'none'`, `nosniff` |
| Runtime source manifest | **37/37 SHA**, exactly 1 source changed from V40 |

The canonical Chrome receipt SHA is `a08e865ecbedc2760b83ef5df07e39d953b910906dc805069d4846e02ba9de93`. Canonical HTTP denial receipt SHA is `d4d055384f3966ee83db55e1aff8f7ec7c52ba5e315cabba29f2c6629136ad32`. Browser counts are test assertions and web assets, **not 90 OEM functions** or a likeness score. Historical V36/V38/V40 artifacts remain separate from V41's own 24 new screenshots.

An [actual CoS Desktop Chrome observation](../../docs/qa/FCV588_V41_DESKTOP_MANUAL_PARTIAL_20261018.md) at **1912×970** confirmed `Pic. Advance : 1x`, `Interference : Auto`, native keyboard Enter/ESC, logical LCD 480×640, 35 local HTTP 200 requests and zero console errors. The connector screenshot ID was recorded but was not assigned a fabricated filesystem SHA. Temporary tab and dedicated Desktop QA server were closed after use. This is **not** native viewport 1366×768 or 1920×1080 acceptance.

## Outstanding and subsequent steps

**No operator claims advanced:** 65/65 claims HOLD, checklist **14/50**, named task acceptance **6/22**, Phase 6 **OPEN**, hardwareValidated=false and releaseApproval=HOLD. Original V40 receipt/checkpoint remains preserved. Actual Narrator/NVDA speech, real OS-window blur, OEM firmware/software identity, permissioned physical front panel and LCD pixel comparisons and independent reviewer signoff all remain NOT_RUN/HOLD.

A separate final-integrity receipt should be produced after roadmap updates and postdocumentation Node verification, using write-once V41 names and SHA readback. Do not relabel this software QA as maritime hardware validation, licensed OEM art, independent review or released product.

**Proposed next milestone V42:** source-first MODE/RANGE/BRILL/System/Display/menu-screen atlas against authorized reference captures and actual target firmware; pursue Phase 6 genuine accessibility/environment gates in a controlled Windows test setup. Only implement a newly evidenced mismatch with scoped RED→GREEN and keep all unrelated contracts immutable.
