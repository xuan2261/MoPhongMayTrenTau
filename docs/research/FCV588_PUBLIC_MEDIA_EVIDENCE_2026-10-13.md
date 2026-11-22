# FCV-588 — Public media evidence and confidence register

**Research date:** 2026-10-13. **Decision:** PUBLIC-REFERENCE training baseline; actual classroom firmware, transducer and installed options remain UNKNOWN. This file records public source links and independently written annotations, **not** third-party image/video copies.

## Why the baseline changed

The user cannot supply a photograph, control-panel measurements or Diagnostics screen of a classroom FCV-588. Requiring those inputs to begin development is therefore infeasible. Instead: base training behaviors on FURUNO's published manual, photos and publicly viewable videos. Keep optional real-hardware comparison as a separate future gate, never silently claim an exact unit/firmware match.

## Public reference register

| Evidence ID | Source URL | What it establishes | Evidence grade / limits |
| --- | --- | --- | --- |
| PUB-FCV-001 | [FURUNO FCV-628/588 Operator's Manual OME-23890-E (Aug 2025)](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf) | Operation Ch1, System Ch2, Maintenance/Tests Ch3, Installation Ch4 (including §4.9 IEC 61162-1 Data Sentences), Appendix 1 Menu Tree | **E1 primary manual**, 88-page PDF verified locally; does not establish installed classroom firmware |
| PUB-FCV-002 | [FURUNO FCV-588 official product/specifications](https://www.furuno.com/en/products/fishfinder/fcv-588/index.html) | 8.4-inch 480x640 portrait LCD, face size, transducer modes, fish-finder functions | **E1 primary manufacturer**; drawings/imagery are not automatically reusable |
| PUB-FCV-003 | [FURUNO USA official photo set](https://www.furunousa.com/en/products/fcv588) | Front reflection, right/side, rear, BottomDiscMode, WhitelineScreen source images | **E3 primary photo catalogue**; use original page as reference, do not redistribute media |
| PUB-FCV-004 | [FURUNO USA official FCV588 brochure (verified PDF)](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/brochures/brochures/fcv588_brochure.pdf) | Hardware image and sample ACCU-FISH, Bottom Discrimination, White Line illustrations | **E3 primary advertising**; publisher PDF archived under FCV-588 as nonmanual reference, 6 pages, SHA-256 `2f10fab1b47cfd9019ef2d1975e295a2edbcc5ecc4c4baeaa2eab76de7855498`. Old furuno.com/file brochure locators returned HTTP 404 |
| PUB-FCV-005 | [NauticExpo FCV-588 face-on photograph](https://www.nauticexpo.com/prod/furuno/product-21522-566726.html) | Secondary page may help compare control centers and bezel-to-screen proportions | **E4 access-limited**: live HEAD returned HTTP 403, so current page/photo was not verified by direct access; do not make it a required oracle |
| PUB-FCV-006 | [Actual FCV-588 Sounder menu photo in a 2019 resale discussion](https://www.lakeontariounited.com/fishing-hunting/topic/77152-furuno-fcv-588-fishfinder-for-sale-700ship/) | Publicly indexed embedded image depicts Sounder menu and physical control panel | **E3 indexed photo / HTTP-access-limited**: image search exposed the photograph but live HEAD returned 403; firmware and saved values unknown; never treat values as factory defaults |
| PUB-FCV-007 | [Smithy's Fishing, FCV-588 Menu Run Through and Instructions (YouTube)](https://www.youtube.com/watch?v=zf4ftbO29ls) | Indexed video published 2023-02-22, description covers FCV-588 and related FCV models with 600W/1kW; YouTube original watch player reports length 22:56 | **E4 video metadata only**: opening/player seek worked, screenshot capture timed out; no frame-level evidence. DO NOT invent timestamps or controls shown |
| PUB-FCV-008 | [Turkish-language FCV-588 usage video (candidate)](https://www.youtube.com/watch?v=z7HT26wmtyY) | Candidate additional menu/operator walkthrough | **E4 third-party-indexed video**, direct frames not verified; not an acceptance oracle |
| PUB-FCV-009 | [FURUNO USA support, software and transducer variants](https://www.furunousa.com/en/support/FCV588) | Manufacturer distinguishes **named compatible standard transducers** (including RezBoost but not Bottom Discrimination) from Bottom-Discrimination-capable transducers (incl. Enhanced RezBoost); lists 525STID-PWD in the second category. **This does NOT apply to generic Transducer menu Type=[600W]/[1kW]**, which excludes ACCU-FISH/RezBoost per OME §1.15.1/§1.17.1 | **E1 primary manufacturer**, exact advanced-feature guards still require matching FCV-588 manual/firmware; installed option remains unknown |
| PUB-FCV-010 | [FURUNO USA community: faulty depth/autorange on FCV-588](https://furunousaforum.com/threads/new-fcv-588-will-not-display-depth-or-autorange-properly.20448/) | Photos of one real fault case and staff responses emphasizing transducer/config settings | **E4 field fault report**, only for negative-case brainstorm, NOT baseline/default behavior |
| PUB-FCV-011 | [FURUNO FCV-588 software history](https://www.furunousa.com/-/media/sites/furuno/software_library/software/software/fcv588-628_software_history.pdf) | v1.05 initial; Sept 2016 v2.01 added 8/16 Colors and changed White Marker, R&D Echo menu | **E1 manufacturer release note**, 1-page PDF verified locally; no claim which version user owns |

## Source grades — separate documented fact from inference

**E1 PRIMARY_MANUAL:** exact model/family and public manual section provide a specific rule. Cite printed section/page, revision, starting state and guard conditions; no screen art copied.

**E2 AUDITED_VIDEO_FRAME:** someone watched an original video and logged a **verified** timestamp interval, visible model and input/output; include video URL, seconds, before/after control action and limitations. **None of the linked videos has been audited at frame level yet.**

**E3 PHOTO_LAYOUT:** a face/menus can be compared but do not prove timing, click behavior or factory defaults. Record photographer/source rights and optical perspective uncertainty.

**E4 UNVERIFIED_SECONDARY:** video description, resale post, automated summary or forum field issue; suggest a hypothesis or negative test, but never declare a behavior PASS.

**E0 UNKNOWN_OR_CONFLICT:** no evidence, sources disagree, actual firmware is missing; never invent a target version or successful hardware test.

## Public-reference configurations (sandbox only)

| Sandbox profile | Explicit assumption | Can demonstrate | Not claimed |
| --- | --- | --- | --- |
| FCV588_PUBLIC_DEMO_UNKNOWN_FW | **System → Demo On** with internally generated training echoes; physical transducer and installed firmware UNKNOWN; an *explicit virtual transducer selection* controls option guards | Default hardware-free baseline. Manual §2.8 says all **controls are operative** in Demo; present the [DEMO] indicator and simulate active keys/menu without real sensor | No real transducer connected, no claim that all advanced options are simultaneously available, and no real measured fish/bottom data |
| FCV588_PUBLIC_GENERIC600 | **Explicit Transducer menu Type=[600W]**, synthetic 50/200kHz observation, English UI by lesson choice | Fundamental LF/HF/DUAL, Range/Gain/VRM; ACCU-FISH, RezBoost and Bottom Discrimination **all inoperative** for generic Type=[600W] as documented in OME §1.15.1/§1.17.1 and §1.16 | Real attached transducer, actual student's firmware, or incorrectly inheriting capabilities of a *named* 600W-rated transducer |
| FCV588_PUBLIC_FEATURE_DEMO | Manufacturer-listed **525STID-PWD** candidate **virtual** transducer in a synthetic scenario; confirm each capability guard with manual before enabling | Scripted ACCU-FISH / Bottom Discrimination / RezBoost teaching examples **only** when individually documented operating guards are satisfied; BDS requires capable mount, 5–100 m depth, Auto Range, draft entered, <=10 kn speed and aligned installation | OEM acoustic algorithm, confirmed installed 525STID-PWD, actual seabed composition or fish size |

All profiles must declare manual revision OME-23890-E and firmwareInstalled=null. The DEMO profile is the **recommended default** because Furuno documents it as internally generating echoes without a connected transducer and leaving all controls operative. **Demo mode and capability gating are orthogonal:** controls remain operative, while unavailable feature options still honor the chosen virtual Type and documented rules. Never enable all advanced algorithms unconditionally. Guard by explicit virtual type, environmental conditions and source status; if unknown, retain SOURCE_GAP. Named compatible 600W-rated transducers must not be conflated with generic menu Type=[600W]. Record hashes, not real serial/GPS/ship data.

## To-do video frame ledger — no imaginary timestamps

| Video | Actual video-playback checks required | Current status |
| --- | --- | --- |
| PUB-FCV-007 | Confirm FCV-588 versus related models per segment, then inspect menu tree, MODE, RANGE, GAIN, BRILL, FUNC, transducer selection; log real timestamps and frame evidence | TO_REVIEW |
| PUB-FCV-008 | Confirm actual FCV-588 model and source language, inspect startup/menu, Display/Alarm/System and feature options as shown | TO_REVIEW |

Record observed timestamps only after real viewing. Neither videos nor screenshots may be bundled with the app without appropriate rights; the simulator UI must use independently created assets and documented source-derived functional facts.

## Two distinct completion targets

**PUBLIC_REFERENCE_TRAINING:** all applicable manual-documented operator flows are implemented and independently checked against the official manual and available audited media, with synthetic output and any unverified element labeled clearly. Enables public-reference training development despite no actual device, but does not prove a perfect reproduction of a particular installation.

**HARDWARE_MATCHED_FIDELITY:** optional higher gate requiring instrument-specific evidence, correct firmware and on-device comparison; remains HOLD. Keep it separate from public-reference lesson approval so the user is not blocked from making real progress.

Maintain existing canonical FCV operator status set (OPEN / SIMULATED_ONLY / VERIFIED_IMPLEMENTED / NOT_APPLICABLE_WITH_EVIDENCE). Add public-reference evaluation as a **separate field**; never mark hardware-verified solely because a PDF or online photograph exists. D15 instructor function is likewise a separate QA concern.
