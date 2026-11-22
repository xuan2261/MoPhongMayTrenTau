# FCV-588 V35 canonical software checkpoint — C11/D09/D14 + D15

**Date:** 2026-10-18.
**Project:** C:\Work\MoPhongMayTrenTau.
**Profile:** F1-public-reference-20, PUBLIC_REFERENCE, offline classroom only.
**Result:** CANONICAL_V35_SOFTWARE_SOURCE_AND_QA_RECONCILED.
**Release approval:** HOLD.

## Implemented

The user expressly approved GPT-6 in this session as the supervision
replacement for Kongming; the current host's Extra High setting itself is
not separately attested by tools. The original failed V31-QA-01 log is
preserved. Its Range Auto/Manual test-fixture correction was verified
53/53 PASS; the original core remains unchanged.

V34 was integrated first after the corrected V31 405/405 Node,
13/13 Python, seven original Chrome runners and separate V34
source/visual tests passed. V34 moved teacher-provenance messages
outside the simulated FCV face, retained operator-only LCD wording,
and improved selected-menu accessibility.

V35 subsequently integrated exactly four web files against the frozen
V34 baseline:

- web/fcv588-training-source-matrix.mjs — new pure instructor projection
  of existing C11 NAV/waypoint, D09 virtual Tankenmaru option and
  D14 typed synthetic Own/NMEA receive states.
- web/app.mjs — read-only publishing of three instructor rows.
- web/index.html — a dedicated D15-only panel outside device-frame.
- web/styles.css — panel styling and responsive reflow.

The user-facing matrix uses readable labels, while precise internal
source/status codes remain as inert test metadata. No new operator LCD
strings, menu/firmware assumptions or connection to ship systems were
introduced. All 23 device/core source modules are byte-identical to V34.
Replay/profile/settings schema and event serialization were not modified.

Source control/approval review and write-once preapply receipt:

- Supervisor decision:
  reports/2026-10-18-v35-gpt6-supervision-integration.md
- Frozen V35 staging:
  staging/fcv588-v35-c11-d09-d14-instructor
- V35 review patch SHA-256:
  66a98472daeee684479670da40e04f075c3af2dbc6421c63d8c76ace17d9d832
- Preapply:
  docs/qa/FCV588_V35_PREAPPLY_GPT6_20261018.json
- Integration:
  docs/qa/FCV588_V35_CANONICAL_APPLY_GPT6_20261018.json

## Executed QA evidence

| Layer | Observed result | Evidence |
| --- | --- | --- |
| V35 staging Node | 37/37 PASS | staging V35 evidence/V35_C11_D09_D14_NODE_V2_20261018.log |
| V35 staging Chrome | 115/115 PASS, 5 viewports, 25 PNG SHA | staging V35 evidence/V35_D15_C11_D09_D14_CHROME_V2_20261018.json |
| V35 staging HTTP | 37/37 source assets, 4/4 denied routes | staging V35 evidence/V35_STAGE_SERVED_SOURCE_20261018.json |
| V35 canonical targeted Node | 37/37 PASS | docs/qa/FCV588_V35_CANONICAL_NODE_TARGETED_20261018.log |
| V35 canonical full Node | **442/442 PASS, 0 FAIL** | docs/qa/FCV588_V35_CANONICAL_FULL_NODE_20261018.log |
| V35 canonical Python | **13/13 PASS** | docs/qa/FCV588_V35_CANONICAL_PYTHON_20261018.log |
| V35 canonical dedicated Chrome | **120/120 PASS**, 5 viewports, 25 new PNG | docs/qa/FCV588_V35_CANONICAL_CHROME_20261018.json |
| V35 canonical V34-compat Chrome | **330/330 PASS**, 5 viewports, 75 new PNG | docs/qa/FCV588_V35_COMPAT_CHROME_20261018.json |
| V35 canonical HTTP | **37/37 exact source bytes** and **4/4 denied routes** | docs/qa/FCV588_V35_CANONICAL_SERVED_SOURCE_20261018.json |
| V35 canonical final integrity | 37/37 runtime SHA and 100/100 PNG SHA | docs/qa/FCV588_V35_FINAL_INTEGRITY_20261018.json |

Chrome viewports: 1366×768, 1920×1080, 360×800, 390×844,
320×720. Both sets verify actual loaded HTTP response bytes, absence
of external requests, module/source stability, keyboard operator flows,
LCD/provenance separation, and browser DOM/Canvas checks.
Actual NVDA, JAWS and VoiceOver spoken announcements have not been
validated; a Chrome role/live-region check is not a screen-reader test.

Latest final SHA-256 receipt:

    d1fe1a1ccfe686bf77432e41edf857c19e4bceac530ef2eb372721119dc06b9d

The first compound-shell Chrome invocation was blocked before tool
execution and correctly recorded in an earlier partial QA receipt.
A single direct, bounded invocation with the same runner subsequently
executed and passed. That partial receipt remains historical and was
not silently overwritten. The first final checksum aggregation also
failed on a Path API typo in its checker (not in runtime); the source
was reviewed, fixed narrowly and the checker was successfully rerun.
Review: reports/2026-10-18-v35-final-integrity-checker-counsel.md.

## What these checks do not prove

- Nothing above demonstrates installed FURUNO firmware, pixel-equivalent
  graphics, real control force/detents, real sonar physics, working
  NMEA/GPS/RF/serial/USB interfaces, or OEM technical certification.
- The 64 operator function claims and D15 are **not automatically accepted**.
  The previous F1 v2 acceptance checkpoint remains **14/50 checklist
  items** and **6/22 named tasks** pending separate source/rights review;
  **65/65 public claims are HOLD** pending individual acceptance.
- HardwareValidated=false, realSensorOutputs=[], assetLicenseClearance=false,
  releaseApproval=HOLD. No commit, push, PR, deployment or release.

## Proposed next authorized development

1. **V36 readability/accessibility** on the separate D15 matrix: raise
   very small source-status typography, test contrast, NVDA/VoiceOver
   and low-width scroll/focus; keep all teaching prose off the OEM-like LCD.
2. Add source-graded negative/replay tests for the remaining C11/D09/D14
   acceptance vectors, especially NAV selected Own vs absent NMEA,
   reset/POWER invalid order, option revoke/regrant while an editor is
   active and waypoint persistence without false ETA.
3. Independently compare the real FCV-588 operator manual/approved media
   and firmware revision metadata for exact menu paths, fields, geometry
   and rights before promoting any per-feature claim. Do not copy OEM
   assets or wire up actual maritime hardware in this offline profile.

The next integration needs its own review/QA receipt; do not reuse V35
results as V36 acceptance or as physical equipment validation.
