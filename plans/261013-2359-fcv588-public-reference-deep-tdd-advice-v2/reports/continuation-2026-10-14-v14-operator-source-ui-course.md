# FCV-588 V14 — §1.21 Data source, display, D15 course and original face

**Date:** 2026-10-14. **Workspace:** `C:\Work\MoPhongMayTrenTau`.
**Active execution authority:** `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/plan.md` — NOT a new plan.
**Scope:** `PUBLIC_REFERENCE`, offline, original art, synthetic training fixtures.
**Disposition:** observable software/browser implementation improved and tested;
phase-wide public/OEM/rights/course release remains **HOLD**.

## Original state and source policy

At start, the non-Git workspace had `F1-public-reference-11`, settings schema
v10, scenario v7, core `f1-core-5`, 259/259 software tests and V13 actual
Google Chrome evidence: both 1366×768/1920×1080, 56/56 actual response body
hashes per viewport, 28 loaded source paths and 30 source manifest files.
The existing service at `127.0.0.1:4173` was retained; no vessel transport,
Git init, commit, deployment, OEM art import or physical hardware operation.

Official manual OME-23890-E and curated/publicly indexed §1.21 Data entries
provided source authority for the English-labelled Bearing, Wind Spd/Dir and
Trip/Temp/Speed Source selectors; the product support page describes the
233×270 mm face and LCD 480×640. Exact firmware, installed language files,
headings/wind instruments, real IEC receiver and manufacturer pixels were NOT
inferred. Rights-restricted PDFs/video files were not served as UI assets.

## Implemented RED → GREEN corrections

### 1. Real Data source workflows — C11, C13, D14, C01 and D04 HOLD

- Added five documented `Data` menu selectors: Bearing True/Mag, Wind Spd/Dir
  True/Apparent, Trip Source Own/NMEA, Temp Source Own/NMEA and Speed Source
  Own/NMEA. All are staged with ENTER commit, MENU/ESC cancel and versioned
  settings/replay. NAV supports a larger public-choice vocabulary (SOG, range,
  bearing, heading, barometric pressure, time-to-go, XTE). Missing sources
  explicitly display `NO DATA`, not fabricated marine measurements.
- C13 synthetic Trip/Odometer accumulate once per canonical **world tick**
  only with declared Own classroom navigation fixture. Switching Trip Source
  to unconnected NMEA freezes both counters; switching back to Own resumes
  accumulation; `ui-tick` never advances world or distance. Negative tests
  verify no unintended live transport, and canonical replay reproduces it.
- C11 speed/temp selections similarly prevent Own-classroom measurements from
  leaking into NAV data boxes. C01 synthetic temperature/speed alarm branches
  now mask readings when those sources are unconnected NMEA. A further TDD
  regression found that **B18 supplemental Temp Graph and NAV speed widgets**
  still leaked Own data after NMEA selection; updated
  `src/devices/fcv588/display-widgets.mjs` to display NO DATA while retaining
  independently typed Own position. This was demonstrated RED then GREEN.
- D14 `RECEIVER STATUS` remains **offline** and reports source selections and
  `NO_EXTERNAL_RECEIVER`/`SYNTHETIC_OWN`/`NO_TRAINING_DATA`. There is no
  WebSerial/WebUSB, UDP/RF or vessel interface. D04 Installation Language was
  hardened to reject unsupported firmware-specific change attempts with
  `LANGUAGE · RIGHTS_HOLD / REBOOT SOURCE_GAP`; English remains the only
  licensed/implemented device language. No fake locale/reboot was introduced.

**Code and tests:** `src/devices/fcv588/{menu-atlas,model,navigation,receiver-status,display-widgets,settings,profile-version}.mjs`, `web/app.mjs`,
`test/fcv588-public-data-source.test.mjs` (6 new positive/negative tests),
`test/fcv588-public-display-widgets.test.mjs` (new source-isolation test),
existing persistence, trip, alarms and receiver tests. Deliberate named REDs
were resolved without deleting or weakening functional assertions.

**Version:** behavior-breaking training profile updated to
`F1-public-reference-12`, browser settings storage `settings.v11` with schema
11; older schema v10/profile11 settings are **rejected**, not silently
reinterpreted. Canonical `f1-core-5`/event schema5/replay envelope5 and
scenario7 unchanged. `docs/evidence/device-register.json` and generated
menu/acceptance documents updated.

### 2. Independent FCV face and LCD menu artwork — A01/A02/A13/A17/B18

- Used original CSS gradients/geometry for metal-like screws, the circular
  TrackPad surround with **inert center** (ENTER remains a distinct key),
  directional controls and rotary index marks. Source 233×270 silhouette and
  portrait LCD **480×640** retained; no OEM photographic/pixel asset copied.
- Long Sounder/Display/Alarm/Data/System menu selections now use safe DOM
  nodes with visible row highlight and `aria-current`; the selected row is
  scrolled into the LCD overlay viewport instead of remaining clipped.
- Real Chrome initially **FAIL** at both target viewports: last System menu
  row was outside the scrollport. Root cause was mixing `offsetTop` coordinate
  spaces. Corrected scroll using selected/port `getBoundingClientRect()`.
  Re-ran the **same** browser assertion to PASS on both viewports, including
  the long System/Installation cursor. No artificial loosening of geometry
  assertions or runtime visibility requirements.

**Code/tests:** `web/styles.css`, `web/app.mjs`,
`test/fcv588-public-panel.test.mjs`,
`test/fcv588-public-browser.test.mjs`, and actual Chrome V14 screenshots.

### 3. Four deterministic instructor lessons — D15

Added `FCV588-LEARN-04` to `src/core/lessons.mjs`. After pressing physical
MENU, TrackPad must reach `Data > Trip Source`, choose NMEA, ENTER commit.
The teacher scorer uses startSeq + startSessionHash, event sequence and final
`tripSource:NMEA` probe with replay verification, and refuses cancellation,
missing steps, old-session credit or false device/hardware certificates.
Existing RANGE, MODE and synthetic MARK lessons remain intact. New positive
and MENU/ESC cancel negative tests are in
`test/fcv588-public-course.test.mjs`. The 1366×768 V14 real browser context
completed both RANGE and the new Trip Source lesson in one session.

This is a fourth **training-only** pedagogical exercise, NOT four OEM-signed
courses or an anti-cheat system. Independent lesson reviewer/public rights
approval is **HOLD**.

## Current 22 named task-unit review — not automatic phase completion

| Phase/task | Executed implementation checkpoint | Unaccepted source/approval boundary |
| --- | --- | --- |
| 1.0 | Previous plan-text regression repaired; Phase1 checked | none within Phase1 |
| 1.1 | Versioned archive/ledger, source rights classified | ongoing acquisition gaps documented |
| 1.2 | 64 operator + separate D15 trace and conservative claims | no OEM/pixel certification |
| 1.3 | Demo and transducer profile fixtures with negative capability guards | physical transducer unverified |
| 1.4 | Original assets, product disclaimer and strict served roots | no redistribution license inferred |
| 2.1 | New original panel art, safe pointer/cancel, keyboard and Chrome | tactile, OS-window blur and exact OEM face remain unverified |
| 2.2 | UI-only clock and 6000-ms MODE selector replay; Chrome PASS | physical rotary/detents not measured |
| 2.3 | POWER >3000ms, BRILL, GAIN, RANGE and VRM synthetic tests | actual switch pressure/timing not validated |
| 3.1 | Five menu roots, staged values, §1.21 C11 additions, long menu cursor | full firmware/Appendix1 menu atlas remains source-graded |
| 3.2 | Settings schema11 codec, cancel, persist/reload and replay | old schemas deliberately not migrated |
| 3.3 | Installation/Tankenmaru/NMEA guards, virtual transducer conditions | D04 locale/reboot and real IEC receive HOLD |
| 4.1 | Stable shared-world seeded LF/HF synthetic observations | not measured acoustic calibration |
| 4.2 | LF/HF/DUAL/Zoom, A-Scope, picture cadence, visible B18/B19 palette | OEM pixels, color counts by installed firmware unknown |
| 4.3 | ACCU-FISH, RezBoost, BDS conditional synthetic fixtures | real transducer conditions/physical curves HOLD |
| 5.1 | ALARM1–5 AND profiles, ack/causality, speed/temp source masks | exact OEM thresholds and physical beeps HOLD |
| 5.2 | NAV boxes, waypoints, synthetic ownship, Arrival, Trip Source | remaining bearing/wind/IEC and 4s indications SOURCE_GAP |
| 5.3 | Demo, LCD test, diagnostic/fault cues, safe restore | D04 language/reboot, real error codes SOURCE_GAP |
| 6.1 | Register/trace/release-claim guards, 65 rows classified | rights and per-feature external reviewer absent |
| 6.2 | Current actual Google Chrome V14, security/response bytes and UI input | real physical touchscreen/OS blur unverified |
| 6.3 | Four D15 lessons with source, event sequence, replay/negative cases | course approval/HARDWARE_MATCHED remains HOLD |
| 7.1 | Single world clock, named inert observer, v3 multi replay identity | legacy incompatible hardware fixture migration not claimed |
| 7.2 | AIS R5, J2000, NS4000 and radar IDs remain distinct holds | no invented second live device or radio/NMEA interface |

CLI progress remains **Phase1 10/10, total 10/50 (20%)**. Each phase file has
its own acceptance gate for source/oracle, negative/cancel/replay, rights and
independent review. `ak plan check <phase-file>` changes *all* checkboxes in
that phase; it was **not used** to manufacture 100% completion based on Node
or browser tests. This table distinguishes implementation progress from final
source/release approval.

## V14 actual Google Chrome, final source identity and tests

`python tools/fcv588_chrome_viewport_acceptance.py` was run after the final
served-code changes. The saved **PASS** receipt is
`docs/qa/FCV588_CHROME_VIEWPORT_V14_RECEIPT.json`:

- Both measured browser viewports **1366×768 and 1920×1080 PASS**; 480×640
  logical LCD, no horizontal overflow. Fresh isolated storage empty at start,
  then intentional D02 settings persistence after teacher reset/reload.
- At **each** viewport, **56/56 actual Chrome response bodies** (28 distinct
  runtime paths) SHA-256 matched the pinned preflight source manifest, with
  **30 eligible public source files** also byte-matched preflight/postflight.
  Final source manifest hash:
  `3ab342b9b116c49c580f840859915200449000fc84d31584e663b1351bd779f9`.
  No JS console errors, HTTP failures, external URLs or escaped requests.
- Both exercised real POWER startup/long keyboard hold, MODE 6000 ms timeout
  with frozen world time, keyboard TrackPad hold/repeat, Chromium native
  `lostpointercapture` and CDP touchCancel, D10 instructor fault, D02 Range
  and replay, menu last-row visibility, Reset, reload/persistence. At 1366:
  both D15 RANGE and **new Data source scored course**. At 1920: actual NAV2
  box editor and §1.21 Trip Source menu commit/persistence.
- Saved actual Chrome PNG screenshots:
  `docs/qa/screenshots/fcv588_public_v14_1366x768.png`,
  `docs/qa/screenshots/fcv588_public_v14_1920x1080.png` and
  `docs/qa/screenshots/fcv588_public_v14_1920x1080_nav2_configured.png`.
  Full-page images can be taller than the actual viewport. Visually inspected
  1366 image: upgraded authored face is a **training mock**, NOT certified
  pixel-identical hardware.

Full Node test and archive/plan/generator summaries are in the top-level
`docs/reports/FCV588_PUBLIC_REFERENCE_ACCEPTANCE.md` and shell receipts of
this run. Verification does not transform 270+ software test names into
270+ device features.

## Remaining objective release blockers

1. **D04**: OEM/third-party language packs, exact menu and reboot behavior
   lack rights-cleared operational oracle. Reject with RIGHTS_HOLD/SOURCE_GAP;
   no invented firmware-localized strings.
2. **D09**: Tankenmaru MARK and NMEA mutual exclusion are simulated. Actual
   proprietary output, picture sync and sub-clutter behavior unavailable.
3. **D14**: Simulated typed receiver/source status has no IEC/NMEA physical
   transport by explicit project policy; cannot equate this to real receive.
4. **C11**: Selected menus/typed Own data, Trip and NAV boxes work, but exact
   multiple-indication switching, bearing/wind/heading source profiles and
   installed firmware variant need observable source frames. Missing values
   stay NO DATA. A17 audio/repeat, B18/B19 pixel geometry/palettes and D10
   fault values are intentionally synthetic/source-estimated.
5. No genuine `kongming` agent was available in local `ak agents list`;
   the installed `ak-cook`/TDD/advice instructions were read and native tools
   were executed without fabricating Kongming counsel. A read-only CoS worker
   revival was attempted but the host returned a compaction/worker ownership
   blocker, so **fresh independent V14 review remains UNVERIFIED**, not GO.
6. No individual rights-approved OEM assets, real hardware proof, firmware
   identity or independent classroom/OEM reviewer acceptance. Final status
   `PUBLIC_REFERENCE_PARTIAL` / `releaseApproval=HOLD`, not 100% or FURUNO
   certification. Other device variants remain unselected/identity HOLD.
