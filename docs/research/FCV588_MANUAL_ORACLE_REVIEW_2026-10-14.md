# FCV-588 public-reference manual oracle review — 2026-10-14

**Class:** CURATED_MANUFACTURER_MANUAL, NOT HARDWARE_VERIFIED.  
**Source ID:** `PUB-FCV-001`.  
**Local original:** `sources/manuals/FCV-588/FURUNO_FCV628_FCV588_Operators_Manual_OME23890E_2025.pdf`.

The source is the rights-restricted OME-23890-E operator's manual,
88 pages in the local PDF, cited through the source ledger/hash manifest.
Pages and section headings below were **actually inspected** by reading the
local file, not reconstructed from unviewed video timestamps. This document
contains independently paraphrased behavior observations only. It does not
authorize copying OEM screenshots, layout pixels, fonts or source PDF bytes
into the browser runtime, publishing the reference archive, or declaring
an installed firmware revision.

| Manual oracle and location | Engineering correction/coverage | Source boundary |
| --- | --- | --- |
| §1.1, printed p.1; PDF p.9: nine physical controls and MARK unavailable with Tankenmaru | Separate face controls, guarded MARK, keyboard/pointer/hold and release/cancel | Real switch pressure, bezel/positions and firmware installed UNKNOWN |
| §1.4.2–1.4.3, printed pp.3–4; PDF pp.11–12: DUAL LF-left/HF-right; zoom-left with normal sonar-right | `display-layout.mjs`, original Canvas, screenshot at required viewport sizes | Pixel location and acoustic shape do not copy OEM assets |
| §1.4.4, printed p.4; PDF p.12: NAV boxes occupy left two-thirds, sonar right; NAV1 defaults STW/WIND, NAV2 defaults DEPTH/TEMP/TRIP/ODOMETER | `navigation.mjs` manual NAV projection + `display-layout.mjs` + user-configurable NAV1/NAV2 Box 1–4 in Data menu | No wind sensor, missing/stale data remains NO DATA; synthetic source must be enabled separately |
| §1.20–1.21, printed pp.18–22: waypoint max 20, name max eight characters, selectable/orderable NAV data | Waypoint reducer and `Data > NAV1/NAV2 Boxes` stage/commit/cancel/replay | Original operating UI paths and all environmental inputs still require reviewed GUI evidence |
| §1.21 public Data setting list: Bearing True/Mag, Wind Spd/Dir True/Apparent and Trip/Temp/Speed Source Own/NMEA | V14 separately staged five Data settings, default Own classroom fixture, negative NMEA NO DATA on NAV, supplemental Temp Graph/Speed and alarm sources, Trip accumulation only on eligible world ticks; fourth D15 exercise tests the Trip Source sequence | Curated public-operator submenu names are references only. No actual NMEA receiver, ship interface, heading/wind input, model-specific 4-second data-indication cycle or exact firmware branch validated; per-row PUBLIC_REFERENCE_CONFORMANT remains HOLD |
| §2.2, printed p.26; PDF p.34: eight ranges, reset to defaults when depth units change, Auto Range cannot exceed largest configured preset, separate Zoom/B/L ranges | D02 eight slots and actual manual/auto display constraints; Zoom/B/L affect only synthetic depth window | Training preset values are not the exact documented 7–4,000 ft parameter space; HOLD |
| §2.3, printed p.26; PDF p.34: FUNC assignment and key-beep setting | Physical FUNC short/hold + optional browser tone; audio and TrackPad repeat are approximate | No reproduced OEM beep/tactile behavior |
| §2.5, printed p.27; PDF p.35: six independently selectable units categories | Depth, Temp, Fish Size, Speed, Wind, Distance staged/bounded/persisted in nested Units menu, with synthetic display conversions | Depth HR/pb conversion not independently verified, remains SOURCE_GAP; raw world unchanged |
| §2.6, printed pp.27–28; PDF pp.35–36: Draft, LF/HF gain adjust, Temp, Speed, Fish Size, Water Type, Zero Line Rejector and related detection controls | D06 nested classroom calibration, immediate LCD synthetic projector, typed no-data and saved settings | Numeric ranges and transducer-specific adjustments are illustrative. Zero Line Area, Bottom Detect/Bottom Level OEM mapping still partial |
| §2.9, printed p.29: Tankenmaru optional submenu shows Output Off, Pic. Sync Yes, Sub Clutter 4 as depicted defaults. Output concerns a separate radio-connected partner display, Pic. Sync its displayed picture, and Sub Clutter filtering on the partner side | D09 is `SOURCE_GAP` unless an instructor expressly declares a nonpersistent virtual option; virtual On only affects simulated MARK/NMEA guards and no actual output is emitted | This continuation cross-checked an **indexed excerpt** of the [official manufacturer-hosted operator PDF](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf); direct online PDF fetch returned 403, so no new full-page, option-range or screenshot examination is claimed. Sub Clutter full range, OEM TX/video and optional installation remain NOT_IMPLEMENTED/HOLD; never introduce RF or real partner-video transport |
| §3.5–3.9: voltage alert, diagnostics, LCD test, restore/odometer procedures | D10 teacher fault injection, simulated diagnostics/restore and explicit no actual voltage/memory access | Real voltage/fault codes/diagnostics firmware screenshots unknown |
| §4.9–4.10: IEC data sentence support and installation-specific menus | Simulated-only receiver projection with NO_DATA/FRESH/STALE and Tankenmaru guard | No WebSerial/WebUSB, IEC electrical receive, ship network or device TX; deliberately HOLD |

The original front view is also visible on the manufacturer's public product
support page and in its official manual. The project uses its own DOM/CSS/Canvas
artwork and does **not** download, embed or redistribute that photograph.

The operational claims below remain independent and explicitly separated:

- **Software tests/Chrome PASS:** can establish the implementation's internal
  behavior, keyboard/pointer interactions, exact chosen browser viewport sizes,
  and deterministic replay, but not matching factory firmware.
- **PUBLIC_REFERENCE_CONFORMANT:** requires per-feature source-linked positive,
  cancel, negative, replay, browser, rights and independent lesson reviewer
  evidence. No operator feature automatically acquires this label.
- **HARDWARE_MATCHED_FIDELITY / OEM approval:** HOLD. The user does not have to
  supply real hardware or photos to continue public-reference development.

Next source checks: verify physical panel geometry against legally usable
reference measurements, exact option values for advanced calibration and
the firmware-dependent 8/16-color palette; inspect actual publicly viewable
video frames and timestamps only when the frame is observed and rights
decision is documented. Do not invent timestamps or silently choose an
installed FCV-588 firmware variant.
