# FCV-588 — Public-source research and revised deep/TDD/advice handover

**Research completed (current pass):** 2026-10-13 · **Workspace:** C:\Work\MoPhongMayTrenTau
**Plan:** [FCV-588 PUBLIC_REFERENCE plan](../../plans/261013-1428-fcv588-public-reference-complete-operator/plan.md)
**Status:** PLAN/RESEARCH reviewed by primary author, independent worker feedback requested; no new FCV application features implemented during this planning pass.

## Outcome

The user's actual classroom FCV-588 cannot be photographed and its Diagnostics firmware cannot be supplied. The former [hardware-target plan](../../plans/261013-1319-fcv588-full-fidelity-simulator/plan.md) therefore remains **deferred**, because it required precise real-unit evidence before any phase could proceed. The revised seven-phase plan uses a defensible **public-reference-only** baseline from official FURUNO manual/product/support sources plus clearly graded real-world photos and operator-video candidates. This permits real development and test coverage **without claiming that the finished software is OEM-certified or identical to a particular device**.

## Independent public sources and what they prove

| Source | Verification | Practical value |
| --- | --- | --- |
| [FURUNO OME-23890-E 2025 Operator's Manual](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf) | Manufacturer manual; archive source hash/page count locally validated | Control names, five menu groups, mode/RANGE/GAIN/VRM/BRILL and full operator sequence; Ch4 IEC 61162-1 reference and Appendix1 Menu Tree |
| [FURUNO FCV-588 product page](https://www.furuno.com/en/products/fishfinder/fcv-588/index.html) | Official specification | LCD 480×640 portrait, 50/200 kHz, feature names, model geometry and documented optional features |
| [FURUNO USA official images](https://www.furunousa.com/en/products/fcv588) | Official image index | Front/back/right/side body, BottomDiscrimination/WhiteLine sample screens; photographs remain publisher assets |
| [FURUNO USA FCV588 brochure PDF](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/brochures/brochures/fcv588_brochure.pdf) | Publisher PDF verified HTTP 200; older furuno.com brochure URL tested HTTP 404 and removed | Panel geometry and feature examples, not exact timing/firmware oracle |
| [NauticExpo FCV-588 listing](https://www.nauticexpo.com/prod/furuno/product-21522-566726.html) | Third-party page currently returns HTTP 403 to direct request | Discovery only unless separately viewed with permission; not required evidence |
| [2019 FCV-588 Sounder menu photo](https://www.lakeontariounited.com/fishing-hunting/topic/77152-furuno-fcv-588-fishfinder-for-sale-700ship/) | Indexed photo depicts identifiable unit; direct request HTTP 403 | Secondary menu-image hypothesis; firmware and saved values unknown |
| [Smithy's Fishing FCV-588 instructional video](https://www.youtube.com/watch?v=zf4ftbO29ls) | Actual YouTube watch page reached via user's browser; duration observed **22:56**, original uploaded 2023; frame capture timed out | Good future reference for demonstrations and real control gestures; **no verified frame timestamp yet** |
| [Candidate Turkish FCV-588 video](https://www.youtube.com/watch?v=z7HT26wmtyY) | Indexed via secondary AI summary; original frames not verified | Discovery candidate only; not a test oracle until manually reviewed |
| [FURUNO software history](https://www.furunousa.com/-/media/sites/furuno/software_library/software/software/fcv588-628_software_history.pdf) | Manufacturer single-page PDF locally verified | v1.05 first release; v2.01 changed Colors/White Marker and introduced development Echo menu; cannot infer actual unit version |

Full source IDs, grades and rights cautions: [public evidence register](../research/FCV588_PUBLIC_MEDIA_EVIDENCE_2026-10-13.md) and [14-category screen/control atlas](../research/FCV588_PUBLIC_UI_REFERENCE_MATRIX_2026-10-14.md). The video was opened and time was seeked in browser, but the attempted screenshot returned BROWSER_CDP_TIMEOUT. Consequently **no specific visible control action was authenticated from that frame**.

## Public baseline and source guards

**Recommended reference:** FCV588_PUBLIC_DEMO_UNKNOWN_FW — FCV-588, OME23890E, English UI as a study choice, synthetic System→Demo On, no claimed physical transducer or onboard GPS, firmwareInstalled=null. Additional *separate* synthetic profiles let learners explore manufacturer-documented transducer option behavior (generic600 or a named 525STID-PWD fixture), without claiming those parts are installed anywhere.

**Source grades:** primary manufacturer manual/spec (highest), official brochure/photo (visual only), visually reviewed original video with real timestamp (not yet available), third-party actual photo, field report/discovery. A video title or automated summary alone cannot satisfy an operator-sequence test.

**Copyright:** source links and independently written observations may be used as planning evidence. Do not redistribute manufacturer/manual/seller photos or video frames, do not automatically process rights-restricted publisher content beyond permitted scope, and draw simulator art independently.

**Claims:** hardware-specific operatorFidelityStatus continues to be unverified. The new public-reference review uses separate sourceStatus, implementationStatus and courseStatus. In particular a source-backed student exercise is not a certified replacement for a real FCV-588.

## Skill execution and adaptation evidence

| Capability | Actual evidence | Status |
| --- | --- | --- |
| Installed ak-plan 2.2.2 | The packaged SKILL.md and workflow-modes/research/advice-handover references were read | **Guidance loaded** |
| Requested --deep | Phase1 codebase/source scout performed, later phases require a fresh targeted scout before cook | **Method applied to the plan** |
| Requested --tdd | Every phase describes RED assertion failure, GREEN and REFACTOR with exact test command/output contract | **Test-first delivery designed, not implemented** |
| Requested --advice | Literal per-phase Failure Protocol and lower-inference handover task structure applied | **Advisory artifact adapted; Kongming supervision NOT EXECUTED** |
| Actual ak CLI | Windows ak 3.0.0-beta.17 plan create/add-phase/validate/parse; CLI does not accept workflow mode flags itself | **CLI scaffolding and validation executed** |
| Independent review | Two read-only CoS workers requested to examine source/legal and TDD/plan readiness | **Await confirmed report at report creation; not Kongming** |
| Automated checks | Initial plan check was 4/4 targeted and 45/45 full; latest [14 Oct closure](FCV588_PUBLIC_REFERENCE_QA_2026-10-14.md) is **6/6 targeted, 47/47 full**, archive verification PASS and ak plan validate=true | **Observed PASS** |

**Reason for incomplete exact --advice:** this runtime exposes no targetable subagent-type Kongming. A generic CoS worker cannot be relabeled to certify the intended supervised workflow. The phase failure contract explicitly stops and informs the user if Kongming is unavailable.

## Plan contents / handoff

| Phase | Purpose | Default verification |
| --- | --- | --- |
| 1 | Source/reference/rights ledger and Demo/variant profiles | Test public evidence/profile/claims, then full regression |
| 2 | Physical panel, MODE/POWER/BRILL/RANGE/GAIN/VRM and timing corrections | New basic and panel tests, hold-input and regression |
| 3 | Complete Sounder/Display/Alarm/Data/System menu atlas, persist/save/cancel and synthetic IEC receive settings | Menu and system source-backed tests |
| 4 | LF/HF/DUAL, BL/BZ/MZ, post-processing and guarded advanced sonar displays | Deterministic sensor, display and options tests |
| 5 | Alarms, NAV/missing data, Waypoints, Demo and safe Diagnostics | Device-state and no-hardware-output tests |
| 6 | Public-reference course conformance, original-art/rights, keyboard/browser and claim audit | Per-feature source coverage and E2E gates |
| 7 | Shared-world compatibility with one synthetic second device stub; no real AIS R5 UI | World/replay non-interference tests |

**Default executable handoff:** start Phase1 without asking again for classroom images. Use permitted public manufacturer facts and independently written source notes; every higher-fidelity source/timer requires a real citation or explicit approximation. Follow per-task RED→GREEN→REFACTOR. If a Verify result disagrees with the specified exit/output, stop rather than guessing, and report the failure if no advisory supervisor is targetable.

## Remaining factual unknowns

- Real installed firmware, transducer, Tankenmaru configuration and calibration; no public source can prove the user's specific unit.
- Fine tactile detents, exact recorded FUNC hold threshold, sound/brightness curve, pixel-precise font and colors, proprietary sonar calculations.
- Video-frame timestamps/input-output observations: video title and duration confirmed, specific frames not yet confirmed.
- Rights to copy any vendor/publisher photo/screenshot to a distributable simulator; no license has been granted by public availability.
- Whether the user eventually wants a reference-only offline classroom build or an externally distributable product. This affects rights review, not the ability to start the public-reference technical plan.

**Recommended next action:** execute Phase1 public evidence ledger + separate Demo/variant profiles and source/claims tests, then Phase2 source-backed control corrections. Do not try to “finish pixels first” while MODE/BRILL/POWER/RANGE state flows are demonstrably incomplete. Continue keeping real equipment and future AIS R5 outside the F0 public baseline.

## Evidence correction recorded on 2026-10-14

- The former brochure URLs under furuno.com/files/Brochure/317/upload returned HTTP 404. Replaced by the [official FURUNO USA FCV588 brochure PDF](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/brochures/brochures/fcv588_brochure.pdf), verified HTTP 200 and archived privately as a **6-page nonmanual reference** (SHA-256 2f10fab1b47cfd9019ef2d1975e295a2edbcc5ecc4c4baeaa2eab76de7855498).
- NauticExpo and the 2019 resale discussion returned HTTP 403 when checked directly; secondary photo remains index-visible, but neither is a mandatory acceptance oracle.
- The restricted archive now has **24 PDF (including the brochure) + 2 ZIP** verified, 197,171,462 total bytes counting duplicate ZIP-extracted PDFs. Rights or provenance HOLDs remain explicit.
- Manufacturer support confirms standard transducers may provide normal RezBoost but not Bottom Discrimination, whereas the Bottom Discrimination transducer group includes model 525STID-PWD. **Demo ON without physical transducer does not mean disabled control keys:** §2.8 states controls are operative, while advanced feature guards must use an explicitly selected virtual transducer and source evidence.
- This pass improved the plan's TDD handover instructions: create importable placeholder modules before RED, so a failure must come from a named assertion rather than missing module/syntax; Phase2 also documents migration of provisional F0 tests, especially MODE immediate-switch expectations.
