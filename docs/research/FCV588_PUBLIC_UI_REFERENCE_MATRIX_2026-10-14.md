# FCV-588 public interface reference matrix

**Created 2026-10-14; status: PUBLIC-REFERENCE OBSERVATION MATRIX / not hardware acceptance.** This is an independently authored inventory of what online sources support about the student UI. No copyrighted photographs, screenshots, video frames, or PDF pages are embedded.

## 1. Physical geometry and control surface

Primary sources: [FURUNO FCV-588 specification](https://www.furuno.com/en/products/fishfinder/fcv-588/index.html), [FURUNO USA gallery](https://www.furunousa.com/en/products/fcv588), [FURUNO brochure PDF](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/brochures/brochures/fcv588_brochure.pdf) and OME-23890-E manual §1.1.

| Element | Publicly grounded reference | Allowed for planning | Still unknown |
| --- | --- | --- | --- |
| Case / overall envelope | Public overall size approximately 233 mm wide × 270 mm high × 158 mm deep; do not equate the 270 mm overall height with a measured bare faceplate | Independently drawn overall layout envelope and right-hand controls; separate original head/support contours | Bare-head dimensions, exact mounting geometry, bezel relief and perspective remain unverified in this continuation |
| LCD | Portrait 480 × 640 pixels, effective display about 128 × 171 mm; 8.4-inch diagonal | Canvas and layout coordinate system | Real colorimetry, physical brightness behavior, fonts |
| Keys | OME §1.1 lists MENU/ESC, four-way TrackPad, **separate ENTER**, RANGE, MARK, FUNC, GAIN push/rotate, MODE rotary, POWER/BRILL | Separate semantic hardware inputs and correct relative placement | Real detent force, key travel, debounce, some hold timing |
| Photographic views | Manufacturer gallery indexes front, back, right, side, Bottom Discrimination and White Line screen images | Check independently drawn geometry and mode examples | Pixel-perfect reproduction and reuse permissions |
| Firmware | Official Software History distinguishes initial v1.05 and changes in v2.01 | Declare installed firmware unknown, branch changed options | Actual version in any classroom unit |

Initial geometry values from the public images should be labeled `REFERENCE_ESTIMATE`. Do not apply old hardware-target ±2% physical-unit tolerances without a measured machine.

**V26 clarification (2026-10-15):** the primary [FCV-588 specification,
E2389S01A, section 2.1](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv588_specifications.pdf)
states an effective LCD of 128 × 171 mm and 480 × 640 dots. This does not
establish the head-only height, bracket shape, key contours or rotary angles.
The V26 near-square head/support silhouette is an original photo-informed
estimate; **233 × 233 mm is not a verified bare-head dimension here**.
MODE/GAIN indicator angles are state illustrations, not hardware measurements.
Generic system Arial labels do not establish OEM font or logo equivalence.
The specification's N2.5 enclosure designation is not a calibrated screen RGB.

## 2. Screen and dialog atlas

| ID | UI/behavior | Best public reference | Test that can be written without a physical machine |
| --- | --- | --- | --- |
| UI-01 | Power, startup, shutdown countdown | OME §1.2 | Time-controlled power-on/hold, countdown and replay |
| UI-02 | Brilliance dialog | OME §1.3 | Repeat-key cycle, cursor, six-second inactivity |
| UI-03 | MODE selection window | OME §1.4 | First rotation opens, further detents change mode, timeout |
| UI-04 | LF/HF and DUAL | OME §1.4.1–1.4.2, brochure | Display labels, frequencies, divider/range/headers |
| UI-05 | Bottom Lock, Bottom Zoom, Marker Zoom | OME §1.4.3, Sounder menu | Proper zoom/marker region and modal/cancel semantics |
| UI-06 | NAV1/NAV2 | OME §1.4.4 and §1.21 | Synthetic data boxes plus correct missing-input indicators |
| UI-07 | RANGE/GAIN/VRM | OME §1.5–1.7 | Repeat RANGE in Manual, Auto Gain offset, VRM depth next to marker |
| UI-08 | Five-menu shell and Sounder contents | OME §1.8, §1.22, Appendix1; 2019 indexed real-unit photo for context | Category order, active cursor, ENTER save, MENU/ESC back |
| UI-09 | Display, Data and Alarm menus | OME §1.18, §1.21–1.22, Appendix1 | Save/cancel, firmware guard, alarm profile editing |
| UI-10 | A-Scope, White Line/Marker, BDS, ACCU-FISH, RezBoost | OME §1.14–1.17, manufacturer gallery/brochure | Functional guards including generic Type=[600W]/[1kW] exclusions and BDS operating conditions; original illustrative rendering |
| UI-11 | Alarm, waypoint and NAV workflows | OME §1.18–1.21 | Cause/mute/clear, waypoint CRUD, missing/stale data |
| UI-12 | System, Calibration and Transducer settings | OME Ch2, §4.10 installation adjustments + Appendix1; FURUNO support transducer list | Variant-specific paths, units, persistence, separate installation-only setup fixture, Tankenmaru/NMEA conditional substitution |
| UI-13 | Demo and Diagnostics | OME §2.8, §3.7–3.9 | System→Demo, [DEMO], internally generated echoes, all controls operative |
| UI-14 | IEC 61162-1 data configuration | OME Ch4 §4.9–4.10 | Receive-only synthetic input and missing-data tests; zero real I/O |

## 3. Video reference status

[Smithy's Fishing FCV-588 Menu Run Through](https://www.youtube.com/watch?v=zf4ftbO29ls): the original watch page was opened and the video player reported a **22:56** duration. Seeking was possible but screenshot capture failed with BROWSER_CDP_TIMEOUT. Thus **zero control-action frames have been authenticated** and no timestamp belongs in an acceptance fixture yet. The [Turkish-language video candidate](https://www.youtube.com/watch?v=z7HT26wmtyY) likewise remains `TO_REVIEW`. Do not treat third-party AI-provided timestamps as direct observation.

## 4. Transducer option and Demo distinctions

The [manufacturer's FCV588 transducer list](https://www.furunousa.com/en/support/FCV588) distinguishes **named compatible** standard transducers (including regular RezBoost, **not** Bottom Discrimination) from Bottom Discrimination-compatible types (including Enhanced RezBoost); **525STID-PWD** is among the latter. OME §1.15.1 and §1.17.1 make ACCU-FISH and RezBoost inoperative under **generic menu Type=[600W]/[1kW]**, even though a separately named 600W-rated transducer may support them. BDS also requires depth 5–100 m, Auto Range, entered draft, <=10 kn speed and compatible transducer installation.

The official manual §2.8 says Demo provides internally generated echoes **without a physically connected transducer** and leaves **all controls operative**. Therefore Demo On must not blanket-disable advanced keys merely because no physical transducer is attached. Instead, capability branches are governed by an **explicit virtual transducer setting**, firmware guards and documented conditions. If a branch is not source-backed, mark `SOURCE_GAP` rather than enabling/disabling by guess.

## 5. Quality/rights boundary

Public-reference fidelity can establish relative geometry, labels, menu sequence and synthetic screen response; it **cannot** establish true tactile feel, installed firmware, exact pixel fonts/colors, or proprietary acoustic classification. Use independently drawn UI art. Manufacturer/gallery/video images and pages remain external links or restricted-reference bytes. For source grades and rights see [Public media evidence](FCV588_PUBLIC_MEDIA_EVIDENCE_2026-10-13.md); the sole active implementation plan is [FCV public-reference v2](../../plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/plan.md).
