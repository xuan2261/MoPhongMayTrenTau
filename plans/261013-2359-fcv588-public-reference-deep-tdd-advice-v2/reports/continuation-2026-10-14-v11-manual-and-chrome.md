# FCV-588 V11 integration checkpoint — manual oracle, browser and replay

**Checkpoint date:** 2026-10-14, Windows workspace
`C:\Work\MoPhongMayTrenTau`.  
**Active plan:** `261013-2359-fcv588-public-reference-deep-tdd-advice-v2`.  
**Implementation:** `F1-public-reference-11` (scenario 7, core event schema 5,
local settings schema 10).  
**Decision:** Internally tested, training-only implementation progress;
individual source conformance, hardware equivalence, rights/public release and
independent reviewer signoff **HOLD**.

## Actual implementation work, not just new test counts

The team resumed and inspected the existing non-Git Windows worktree and
retained all history, manuals and prior reports. No `git init`, commit,
push, deploy, live vessel connection or unlicensed OEM asset import occurred.

**Phase 2 — physical interactions / operator:** Confirmed original Canvas/
CSS equipment artwork and logical LCD 480×640, separated TrackPad, ENTER,
FUNC, POWER/BRILL and rotary controls. Input repeat, pointer identity,
keyboard focus, ESC/cancel, UI-clock selector, 6000 ms MODE timeout while
world is paused and >3000ms POWER keyboard hold were exercised. The rendered
panel uses independent authored geometry; no equivalence to a specific
factory bezel or tactile response is claimed.

**Phase 3 — menus/settings/system:** Applied manual §2.2 rule for restoring
Range 1–8 when depth units change and limiting Auto Range by the maximum
bank. Added seven field-bound calibration choices and a six-category Units
menu (Depth, Temp, Fish Size, Speed, Wind, Distance) with independent
commit/cancel and display-only conversions. HR/pb depth conversions are
not guessed. D04 language remains `NOT_IMPLEMENTED` with rights/source hold.
Settings are validated and version-pinned; unsupported old schemas are
rejected instead of reinterpreted.

**Phase 4 — sonar displays/advanced:** Corrected DUAL LF-left/HF-right;
Zoom-left/normal-right (previously reversed); Bottom Lock/Zoom/Marker Zoom
window projections and configurable split width. Original Canvas B18
supplements now show typed synthetic Temp Graph, NAV Data, Battery NO DATA,
Zoom Marker, Header, White Line/Marker, original palettes (8/16 colors),
Clutter/TVG/Erase/Smoothing/A-Scope/RezBoost bounded projections. Protected
ACCU-FISH/BDS functions remain conditional on the declared named virtual
transducer and training fixture. No real sonar physics or OEM pixels claimed.

**Phase 5 — alarms/navigation/system:** Removed misleading no-op top-level
Fish/Bottom/Temperature Alarm toggles; ALARM1–5 nested conjunction remains
the operative training flow. C05 Arrival and C13 Trip use only instructor
synthetic ownship and world ticks; MARK disabled in Tankenmaru. C11 adds
four individually selected NAV1/NAV2 boxes; official defaults NAV1 STW/WIND
and NAV2 Depth/Temperature/Trip/Odometer, missing wind/source shows NO DATA.
D10 fault buttons project explicitly SIMULATED warning cues. D14 typed
training receiver status distinguishes missing/fresh/stale but never opens
WebSerial, WebUSB, IEC transport, radio or vessel output.

**Phase 6 — verification and release controls:** Claim approval helper now
rejects generic domain smoke and cross-feature boolean approvals; requires
specific positive/negative/cancel/replay test, browser and independent
reviewer proof tied to the same feature. Generator enumerates an explicit
reviewed synthetic feature allowlist rather than silently considering all
64 operator rows operational. Asset scan recursively checks browser-served
`web/` and `src/` and rejects inappropriate binary/media extensions. No
independent reviewer receipt or redistribution rights clearance exists.

**Phase 7 — shared world/read-only observer:** Inert second-device module
projects named, immutable synthetic world data, and observer events never
update FCV state. Core events and multi-device history deeply detach mutable
event inputs; replay refuses incompatible profile/scenario/device contracts.
No claimed implementation of AIS R5, KODEN, Radar or ECDIS.

**D15 — instructor lessons:** Teacher/learner UI separated in original
artwork. Training attempt scoring checks replay against authoritative
event input sequence, rejects unrelated physical inputs and permits retries
of required steps (e.g. MARK after a teacher fixture is enabled).
Result is deterministic educational feedback, not OEM certification.

## Primary-source review performed

Official local manual:
`sources/manuals/FCV-588/FURUNO_FCV628_FCV588_Operators_Manual_OME23890E_2025.pdf`
(88 pages), source ID `PUB-FCV-001`; actual extracted text was reviewed for
§1.4.2–1.4.4, §2.2–2.6 and maintenance/system context. Readable independent
source notes and specific PDF/printed page mapping are in
`docs/research/FCV588_MANUAL_ORACLE_REVIEW_2026-10-14.md`.
Firmware installed remains unknown. This is a permitted restricted-reference
PDF: no OEM screenshot/font/PDF asset was incorporated in the runtime.

## Verification actually observed

| Check | Actual result | Qualification |
| --- | --- | --- |
| `npm run check` on current V11 | **249/249 PASS, 0 failure**, exit 0 | Node syntax + unit/integration/state/replay/pointer-capture regression, not OEM fidelity |
| V11 targeted NAV config tests | 3/3 PASS | Box selection, cancellation, persistence, replay, NO DATA |
| V11 targeted Unit/Range/Trip tests | 17/17 PASS | Manual conversion/state without sensor mutation |
| Source archive verifier | **24 PDF, 2 ZIP, 197171462 bytes; zero integrity failures** | Three acquisition gaps; archive hashing confers no redistribution rights |
| Feature inventory | 64 FCV + separate D15; 65 unique IDs | Source trace remains authoritative for rights |
| Current implementation checkpoint | **61 synthetic subsets; 3 partial; 1 not implemented** | D15 in 61; all 65 `claimDecision=HOLD` |
| Browser 1366×768 | PASS at exact innerWidth/innerHeight | Isolated actual Google Chrome, headless, not physical monitor |
| Browser 1920×1080 | PASS at exact innerWidth/innerHeight | Same; no horizontal overflow |
| Browser LCD | Canvas attributes 480×640 on both | Artwork only, not certified panel geometry |
| Chrome actions | POWER boot/long hold, MODE timed selection, TrackPad repeat, Chromium native touchCancel/lostpointercapture, D10, D02, reset/reload; D15 at 1366, C11 NAV2 at 1920 | All actions controlled in clean browser contexts |
| Chrome diagnostics | 56 loopback requests per viewport, 28 after reload, **0 JS console errors, 0 request failures or non-local URLs** | Observed capture window only |
| Chrome persistence/replay | D02 Range 1 5→10 persisted; replay PASS; teacher reset and reload preserved settings | Local browser storage; profile/schema v10 only |

Browser runner: `tools/fcv588_chrome_viewport_acceptance.py`.
Saved receipt: `docs/qa/FCV588_CHROME_VIEWPORT_V11_RECEIPT.json`.
Saved screenshots:

- `docs/qa/screenshots/fcv588_public_v11_1366x768.png`
- `docs/qa/screenshots/fcv588_public_v11_1920x1080.png`
- `docs/qa/screenshots/fcv588_public_v11_1920x1080_nav2_configured.png`

All three files were actually produced on Windows by Google Chrome and the
NAV2-configured image was inspected visually. The captured source is the
original simulator, NOT a reference-manual/OEM screenshot or proof of exact
manufacturer pixels.

## Plan/checklist and remaining blocks

The active v2 plan still has 7 phases, 22 named `### Task` units and
50 CLI checklist entries. Last parsed state: **Phase1 10/10 checked,
Phases2–7 unchecked, 10/50 (20%)**. Later phases have real implementation
and focused tests, but there is no complete independent per-feature/source/
browser/reviewer/rights approval, nor a verified Kongming supervision report.
Accordingly no completed phase has been artificially checked in this pass.

- **D04 not implemented:** supported/licensed alternative language bundles,
  language-menu selection, reboot and confirmation need source/rights.
- **C11 partial:** STW/Temp/Depth/Trip/ODO and independent data boxes work;
  real wind/bearing/heading sensor semantics and exact setting matrix are held.
- **D09 partial:** Tankenmaru hides conflicting receiver settings and MARK,
  but full proprietary external display protocol/operator semantics absent.
- **D14 partial:** instructor receive-status simulation works, IEC electrical
  input/physical NMEA connection unavailable by project policy.
- **A/B/D source gaps:** precise control geometry, tactile repeat/audio,
  video timecoded menu variants, hardware-dependent acoustic/range/Calib
  behavior and exact palette/firmware remain SOURCE_GAP/HOLD.
- **Browser remaining:** Chrome native lostpointercapture and CDP
  touchStart/touchCancel now pass at both required viewport sizes with exact
  DOWN/CANCEL semantics; OS window blur during a held control and physical
  touchscreen hardware remain NOT_RUN. Source rights, physical fidelity and
  independent per-lesson signoff remain HOLD.
- **Phase7 historical migration:** only already-compatible single-envelope
  migration is validated. Old F0/earlier profile format is deliberately
  rejected, NOT an automatically upgraded trained session.

The user does **not** need to supply a device photograph, firmware dump or
Diagnostics screenshot to continue public-reference development. The
HARDWARE_TARGET plan remains separate for any future fully source-matched
unit acceptance. There was **no native invocation evidence of
`ak-cook --auto --tdd --advice` nor Kongming approval**: packaged skill
guidance was read and equivalent authorized steps executed using Windows,
Node, Python, current manual, and real Chrome. This is NOT a fabricated
supervision receipt.

## Recommended next verification gate

Prioritize legally reviewable frame-by-frame public reference geometry,
source-grade D04/D09/D14 and C11 remaining choices, missing exact calibration/
alarm option ranges, OS blur/physical-touch Chrome cases and feature-
specific independent lessons. Retest each affected module after actual source
changes, then re-evaluate individual public-reference lesson eligibility.
No blanket OEM certification, hardware release, deployment or Git write.
