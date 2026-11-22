# FCV-588 Phase 1 Deep Scout — Public Reference Baseline

Date: 2026-10-14. Source: live Windows workspace C:\Work\MoPhongMayTrenTau, independently written existing project notes, read-only CoS reviewers and public FURUNO product/support pages. Scope: planning and file reconnaissance, not PDF content extraction or hardware testing.

## Actual machine state (scouted)

| File/location and source lines | What is established | Planning decision |
| --- | --- | --- |
| package.json:7-12 | Native Node >=22 ES modules, npm run check syntax-checks a limited set and runs all test/*.test.mjs | New modules need imported targeted tests or explicit node --check; no package install |
| src/core/protocol.mjs:41-85 | Only tick, press, rotate, push, down/up/cancel, pad inputs supported; no independent ui-tick | Phase2 must design recorded UI clock if timeout should run when scenario paused |
| src/core/session.mjs:40-95,101-147 | Canonical event sequence and hold tracking; world advances on tick; replay pins profile/scenario/event envelope | New reducer semantics require explicit revision/replay migration; untrusted replay digest is not authentication |
| src/core/scenario.mjs:85-140 | observeSounder raw data independent of Gain/Range; makeEchoFrame projects display | Keep raw world/sensor and view changes separate |
| src/devices/fcv588/model.mjs:74-77 | F0 immediate MODE change on rotate | Phase2 RED requires selector, not retaining provisional wrong behavior |
| src/devices/fcv588/adapter.mjs:9-11 | FUNC 650ms hold provisional; POWER >3s documented | Never claim measured real FUNC threshold |
| web/app.mjs:84-105,133-156,243-245 | NAV/Zoom F0 placeholders; hardcoded dialogs; instructor pause suppresses simulated tick | New modal/UI timer must not depend on world tick or unlogged DOM timeout |
| web/hold-input.mjs and test/hold-input.test.mjs | Existing pointerId, blur/global keyup and durationMs capture tested | Reuse before changing input normalization |
| docs/evidence/fcv588-public-evidence-ledger.json:1-241 | Existing 11 PUB-FCV-001..011 sources, explicit rights fields, zero audited E2 video frames | Audit/extend ledger, do not create it from empty in v2 |
| test/fcv588-public-evidence.test.mjs:1-59 | Four targeted tests passed previously; currently assumes IDs exactly 11 | Characterize then adapt count test to extensible source list without dropping baseline IDs |
| docs/evidence/fcv588-public-reference-profile.json | Missing at plan time | Create Phase1 source-guarded synthetic profiles |
| docs/research/FCV588_PUBLIC_CLAIM_POLICY.md | Missing at plan time | Create Phase1 rights/claim policy and visible student banner |
| docs/research/FCV588_FEATURE_REGISTER_DRAFT.json | 65 rows including D15; fields currently hardware-specific | New separate PUBLIC trace matrix keyed by A01..D14 + D15; do not populate hardware-only statuses |
| sources/manuals/MANIFEST.json:24-107 | Manufacturer manual OME-23890-E, history, guide and brochure bytes/hash in restricted archive | No redownload or new AI processing of restricted PDFs by default |
| sources/manuals/ARCHIVE_COVERAGE.json | J2000 identity, AIS R5 variant, NS4000 version remain HOLD | No silent substitution into new FCV plan |
| test/public-reference-plan.test.mjs:87-96 | Old plan text assertion matches the word blanket-disable | Previous npm run check recorded 50 PASS/1 FAIL; Phase1 Task1.0 semantic repair is pending, not complete |

## Public source hierarchy and licensing

Manufacturer FCV-588 product page:
https://www.furuno.com/en/products/fishfinder/fcv-588/index.html

Manufacturer FCV-588 documentation and named transducer catalog:
https://www.furunousa.com/en/support/FCV588

OME-23890-E manufacturer manual locator:
https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf

FURUNO USA Terms:
https://www.furunousa.com/en/terms_of_use

Web fact checks: 8.4-inch portrait 480x640, case 270(H)x233(W)x158(D) mm, 50/200kHz; manufacturer's support distinguishes named standard transducers from Bottom Discrimination-capable transducers and lists 525STID-PWD. Current support states No Longer Available; the catalog is a time-dependent source, not installed hardware identity.

IMPORTANT evidence taxonomy mismatch: docs/research/FCV588_PUBLIC_MEDIA_EVIDENCE_2026-10-13.md:27 calls E1 PRIMARY_MANUAL, but E1 in the existing JSON ledger also classifies manufacturer product/support web pages; E3 includes official gallery and resale photo. New schema must have **authorityTier** (manufacturer-manual, manufacturer-web, secondary/community), **evidenceMode** (documented rule, photo layout, audited video frames, metadata-only, unknown), independent **rightsState**, and sourceRevision/accessStatus/lastCheckedAt. The legacy E0-E4 grade can remain for compatibility, but never stand alone as a behavioral acceptance oracle.

FURUNO Terms regulate copying/reproducing and public/business distribution of site content. Existing archive metadata conservatively says permission before AI processing. Do NOT attribute an explicit 'AI processing forbidden' sentence to FURUNO Terms; classify AI_PROCESS_HOLD as this project's rights policy until permission is proven. No raw OEM image, copyrighted screenshot, manual PDF or video frame may ship as app artwork.

Keep 11 source IDs as an initial baseline, not a hard maximum. The archive also contains the official Operator Guide and the live support offers a Specifications PDF and transducer information. Source access may be transient; timed-out site access is not proof a previously verified manual fact ceased to exist. Existing Guide model identification limited probe is inconclusive; no new operator fact is accepted solely on that file's existence.

## Load-bearing reference and operator conditions

1. Default PUBLIC_DEMO_UNKNOWN_FW: Demo On synthetic, firmwareInstalled=null, hardwareValidated=false, physicalTransducerPresent=false and no real input/output. Manual describes controls operative in Demo; feature entitlement depends on **virtual** transducer type and operating guards.
2. Generic Transducer menu Type=[600W]/[1kW]: ACCU-FISH, RezBoost and Bottom Discrimination inoperative. Do not mistake a *named 600W-rated compatible* transducer for this generic menu Type.
3. Virtual named 525STID-PWD: candidate Bottom Discrimination reference only where documented depth 5-100m, speed <=10kn, Auto Range, entered draft and compatible mount/alignment conditions hold. Synthetic fish size/bottom depiction cannot be sold as a measured algorithm.
4. Software history distinguishes v1.05 and September 2016 v2.01 option changes; both are public branches, NOT actual installed classroom firmware.
5. Eight Picture Advance options: 4x, 2x, 1x, 1/2, 1/4, 1/8, 1/16, Stop. System installation §4.10 and Tankenmaru/NMEA menu mutual exclusion are distinct from normal everyday System flow.
6. In one ALARM1-5 profile, multiple enabled fish-alarm criteria form AND; alarms from distinct profiles can coexist.
7. 64 operator requirements versus D15 INSTRUCTOR_PLATFORM: never include D15 in manufacturer fidelity; public sourceStatus/claimDecision independent of hardware status. Operator rows with no trusted source stay SOURCE_GAP.

## Source coverage matrix

| Domain | Feature rows | Best current public evidence / potential gap |
| --- | --- | --- |
| Face/buttons/startup/basic controls | A01-A17 | OME §1.1-1.10 and public manufacturer front photo; exact tactile hold/firmware timing UNKNOWN |
| Sounder processing/modes | B01-B20 | OME §1.11-1.17, §1.22, manufacturer product/spec/transducer list; proprietary physics synthetic |
| Alarms, NAV and waypoints | C01-C13 | OME §1.18-1.21, data contexts; real GPS and connected devices absent |
| System/Calibration/Demo/Diagnostics | D01-D14 | OME Ch2-4, Appendix1, support/software history; actual diagnostic version UNKNOWN |
| Instructor-only platform workflow | D15 | Local teacher workflow tests, no FCV manufacturer source required |

## Architecture comparison

Chosen: reuse single deterministic core and per-device FCV reducer, original Canvas UI, separate teacher shell. Reject copying OEM screenshot + hotspots (timers/menus/rights explosion), generic fishfinder state machine reused for radar/AIS (model-specific behavior wrong), ROM/firmware reverse engineering (rights), and giant 3D/microservice framework (unrequested complexity). A new recorded ui-tick event may be necessary to decouple physical UI time from instructor scenario pause; add only after RED tests and explicit contract version.

## Phase 1 execution handoff

Tests Before: first obtain a new baseline command output (old whole-suite failure is historical), then fix only the semantically brittle text matcher with behavior-preserving assertion. Audit the existing 11-source ledger, add authority/evidence/rights axes and extensibility. Use schema-valid placeholder JSON for new 65-row trace/profile and a minimal policy Markdown heading before RED. Every missing behavior must fail on a named assertion rather than file/import/syntax setup. Implement GREEN and REFACTOR separately for each task.

No photos or hardware Diagnostics are required. Any failure of a phase Verify step requires STOP and a Kongming request if targetable; it is not targetable in this runtime, so STOP and report exact phase/task/command/output to user. Planning here did NOT implement the 65 operator requirements or advance physical-fidelity status.
