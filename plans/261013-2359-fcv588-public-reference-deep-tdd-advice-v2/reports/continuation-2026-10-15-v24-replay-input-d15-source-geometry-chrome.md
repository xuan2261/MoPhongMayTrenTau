# FCV-588 V24 — replay input contract, source guards, D15 and LCD geometry

**Observed date:** 2026-10-15. **Workspace:** `C:\Work\MoPhongMayTrenTau`.
**Sole execution authority:** `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/plan.md`.
No Git was initialized; no commit, deployment, real ship I/O, OEM media copying,
or release was performed. `ak-cook --auto --tdd --advice` was adapted through
available native Windows operations and packaged guidance; a literal native
slash invocation and Kongming counsel were **not** observed. Ordinary scoped
CoS reviewer outputs are not Kongming or rights approval.

## Checkpoint identity and conservative verdict

- Public-training profile `F1-public-reference-18`, settings schema **17**,
  storage key `mophongmaytrentau.fcv588.public-reference.settings.v17`.
- Core contract `f1-core-6`, event schema **5**, replay envelope schema **6**,
  PRNG `counter-mix32-v1`, simulation tick **1000ms**, scenario **7**.
- Test-only multi-device runtime **3** with inert observer stream
  `training-observer-world-v1` (schema1); no radar/AIS/NMEA device implementation.
- 32-file public web/src runtime manifest SHA-256:
  `2c9e68e77186f617e59bbfdc92a2981408fa2557b8591ba580bba0a0e7dea54c`.
- All **65 source/rights/public-acceptance decisions remain HOLD**.
  **No** installed firmware, manufacturer or independent course approval,
  hardware fidelity, proprietary pixel, real acoustic measurement or vessel I/O
  has been inferred.

The old V23 source `F1-public-reference-17`, settings16, core5/replay5 and
299/305 counts remain history. An older accepted replay is not silently
reinterpreted with the V24 hold/gesture contract; its prior separate receipt
and screenshots have not been edited or renamed.

## Recovered source state and actual TDD

Before V24 edits, Windows source had profile17/settings16, no `.git`; all
32 current V23 runtime asset SHA-256 matched the saved desktop/mobile
receipts. The earlier failure 304/305 under a profile17 bump was a derived
implementation-status file still identifying profile16; a prior regeneration
had already fixed that drift without changing the test assertion. The current
targeted acceptance test and generators were observed GREEN before new work.

An independent V23 read-only worker audit identified new demonstrable gaps.
Tests were written against actual current behavior; targeted RED failures
showed wrong source data, weaker input/replay metadata and lesson scoring.
The corresponding implementation and nearby integration tests then became
GREEN. No missing import, synthetic error, skipped test or lowered assertion
was used as the primary RED evidence.

| Phase / feature | Original observed gap | Implemented V24 behavior and acceptance test |
| --- | --- | --- |
| Phase7 replay safety | `profileHash` omitted adapter `controls`, `gestures` and `holdThresholdMs`, allowing same-revision replay of FUNC 800ms LONG at threshold650 as SHORT at threshold1000 | `session.mjs` now hashes actual adapter input contract; same-revision drift rejects at replay/dispatch before applying events. `test/core.test.mjs` rejects changed threshold/gesture/control. Core/replay version raised without forging historical migration |
| Phase2 accessibility | Native assistive `click(detail=0)` on hold-capable POWER/FUNC without pointer/keydown produced no input | `web/hold-input.mjs` emits exactly one short down/up pair; native pointer clicks and post-keyup clicks are suppressed, canceled holds do not strand an input. `test/hold-input.test.mjs` and actual Chrome assistive activation |
| Phase4 B18 | Supplemental NAV speed stayed `7.0 kn` when operator selected km/h or mph | `projectNavData` uses existing mathematical speed format and passed setting; shows `13.0 km/h` for 7kn and `8.1 mph` when selected; raw world and replay unchanged. `test/fcv588-public-display-widgets.test.mjs` |
| Phase5 C04 alarms | Negative synthetic speed could trigger an Outside alarm, contradicting D14/NAV source validity | Shared nonnegative finite speed predicate, enforced at model alarm input and alarm evaluator. Invalid negative/NaN/Infinity never trigger Inside/Outside; valid zero remains Outside. `test/fcv588-public-alarms.test.mjs` |
| Phase5 C11 extra NAV fields | Unbounded 721° course, 361° bearing, negative heading and bare numeric SOG/pressure/XTE could be shown as synthetic receiver data | Course/heading/bearing angular bounds and **independent fieldSources** tag needed for heading/bearing/SOG/barometer/XTE. Untyped/external data stays `NO DATA`; the original typed course remains visible. `test/fcv588-public-data-source.test.mjs` |
| Phase6 D15-05 | Teacher enabled then disabled synthetic NAV within lesson attempt, and the final `NO_TRAINING_DATA` incorrectly earned a receiver-absence score | `requiredFixtureState` checked against replay prefix and the full scored event substream, not final state alone; transient fixture activation rejects `WRONG_TRAINING_CONTEXT`. `test/fcv588-public-course.test.mjs` |
| Phase6 D15-06/07 | No scored §2.3 Key Beep or §1.3 BRILL exercises | Two new instructor-only semantic lessons (now **7 total**): 06 verifies exact System menu staging/commit and cancel/old-credit; 07 verifies two short POWER/BRILL holds, staging brightness9→0, ENTER, negative/cancel/replay. Tests and Chrome real physical controls PASS; no OEM certification |
| Phase2 faceplate | Independently drawn bezel used only 233×270mm ratio without source-grounded 128×171mm LCD aperture relative to face | Added `--reference-lcd-width-mm:128`, `--reference-lcd-height-mm:171`, 128:171 aperture CSS and desktop padded equipment layout, while keeping native Canvas 480×640 and distinct mobile training reflow. Static test and real Chrome geometry fractions PASS, original CSS/artwork only |

Implementation and QA remain limited by the published oracle. The modeled
128×171mm effective LCD and 233×270mm casing are manufacturer-published
approximate dimensions, not a scanned faceplate or actual-unit measurement.
UI key spacing, fonts, detent torque, acoustic/colorimetry/timing cannot be
certified without source and physical-unit evidence.

## Final verification commands and observed receipts

- `npm run check`: **314/314 PASS, 0 FAIL, 0 skipped, exit0** on the final
  V24 runtime source. Targeted RED→GREEN suites covered core, NAV/D15,
  alarms, physical CSS, keyboard/pointer hold, and display widgets.
- `python -m py_compile tools/fcv588_chrome_viewport_acceptance.py
  tools/fcv588_mobile_viewport_acceptance.py`: PASS.
- `python -m unittest discover -s test -p test_fcv588_chrome*.py -v`:
  **7/7 PASS**, including fail-closed swapped/missing response body and
  QA-runner/helper source change negatives.
- `python tools/verify_reference_manuals.py`:
  `PASS_AVAILABLE_ASSETS_WITH_GAPS`, **24 PDFs + 2 ZIPs**, 197171462 bytes,
  zero digest validation failures; **3 known acquisition gaps**.
- `node tools/verify_public_runtime_assets.mjs`:
  **32 recursive original runtime source files PASS**, no protected media
  or symlinks; `/sources/manuals` not publicly served.
- `python tools/build_fcv588_public_trace.py --check`:
  **64 operator IDs + D15 instructor separately, every claim HOLD**.
- `node tools/build_fcv588_public_menu.mjs --check`: **67 menu entries PASS**.
- `node tools/build_fcv588_public_acceptance.mjs --check`: conservative
  60 FCV operator subsets + one D15 subset; three menu partial and one
  not implemented, all claims HOLD.
- `ak plan validate` `valid=true`, `ak plan parse`:
  **7 phases, 22 named Task headings, 50 tracked checkboxes, 14 checked**.

### Google Chrome V24, current Windows source and QA harness verified

The existing loopback server `127.0.0.1:4173` served exactly the current
workspace. The **actual completed browser HTTP response bodies**, including
reloads, were SHA-256 compared against preflight `web/src` file digests.
Both runners record `SOURCE_TREE_IDENTITY_PASS`, `SOURCE_TREE_STABLE_PASS`,
`qaHarnessSourceIdentity=PASS_UNCHANGED` and verified current manifest above.

| Context | Final result | Loaded response bodies | Distinct loaded paths | Browser body aggregate SHA-256 |
| --- | --- | ---: | ---: | --- |
| Desktop 1366×768 | PASS | 61/61 | 30 | `7498cdc2b8f8af6efe662818f3c054f78d56b480ec0a9ad7aab6117f78346b7c` |
| Desktop 1920×1080 | PASS | 61/61 | 30 | `4c8bf757dc7c99e7cfbc6ea1c28996aa806ed1c4b288430ecf40b0f469ff50d2` |
| Mobile 360×800 | PASS | 30/30 | 30 | `b65771f9fcaadef35938403e136f76f3830a5d45d94baa73715dd4ad657d28d8` |
| Mobile 390×844 | PASS | 30/30 | 30 | `83d9c2865318f52815a0b205f77e528119df6ac874a0e701104ce75b00dbc883` |

Desktop runner and mobile-imported helper SHA-256:
`772389413490d16054610720e86f5fd3a251d4ca74bd6eccc0ce03dcbddfb0b6`.
Mobile runner SHA-256:
`d8945102466b77038a390c522e75a90e4cbbe203deacb72e4c6e5208fe0ef4e1`.

- `docs/qa/FCV588_CHROME_VIEWPORT_V24_RECEIPT.json`.
- `docs/qa/FCV588_CHROME_MOBILE_V24_RECEIPT.json`.
- **9 V24 PNGs** under `docs/qa/screenshots`, V23 originals untouched.
- Actual desktop 1920 White and mobile 390 White full-page screenshots
  were opened and visually inspected; face ratio, original light-on-dark and
  dark-on-light LCD colors and training-only phone reflow remain coherent.
- No JavaScript console errors, failed HTTP requests or external network
  origins occurred in the four completed acceptance contexts.
- Desktop performs real MODE/GAIN drag, pointer hold/cancel, D02 settings,
  C11 NAV, D09 option, D15 scores, LCD palette, persistence/reload/replay,
  POWER >3s keyboard hold, assistive POWER activation, D15-06 and D15-07
  real clicks. Both desktop contexts check 128/233 and 171/270 effective
  aperture/face fractions with labeled training-geometry tolerance.
- Mobile touch contexts verify all physical/D15 teacher targets >=44 CSS px,
  no overlap/overflow, source-disabled menus, real touch/replay and portrait
  effective LCD aperture ratio. Chrome touch emulation is not physical
  touchscreen acceptance.

## Existing seven-phase acceptance truth after V24

| Phase | Task headings | Checked plan boxes | Current consequence |
| --- | ---: | ---: | --- |
| 1 Sources, profile and rights | 5 | 10/10, fully done | Public-reference source archive frozen; rights not thereby granted |
| 2 Physical controls and faceplate | 3 | 2/7, partial | Improved LCD dimensions, assistive POWER, typed UI clock; tactile/timing/source reviewer still open |
| 3 Five-menu System/Installation | 3 | 0/7, partial | 67-source-menu atlas and cancellation/replay, D09 conditions; exact option/firmware oracle still held |
| 4 Sonar/advanced views | 3 | 0/7, partial | LF/HF/DUAL/Zoom synthetic, B18 unit-aware; acoustic/firmware/rights still held |
| 5 Alarms/NAV/System | 3 | 0/7, partial | C04 negative speed and C11 independent source fields now fail closed; D04/D09/D14 partial/HOLD |
| 6 Classroom/source QA | 3 | 0/7, partial | Seven D15 exercises and semantic attempt safeguards, browser four viewports, no independent course release approval |
| 7 Shared world/future devices | 2 | 2/5, partial | Replay adapter contract hardened; prior multi-v2 migration and unknown future model identities remain HOLD |

**Totals:** Phase1 only complete; **6/22** named Tasks accepted, **14/50**
checklist (28%) accepted. A verified software improvement does not by itself
satisfy a Task's complete manual/rights/source/independent-review gate.
No boxes were checked indiscriminately in this batch.

**64 FCV operator classifications:** 60 `OPERABLE_SYNTHETIC_SUBSET`, 3
`MENU_ONLY_PARTIAL` (`C11`, `D09`, `D14`), 1 `NOT_IMPLEMENTED` (`D04`).
**D15:** one separate `OPERABLE_SYNTHETIC_SUBSET` instructor platform with
seven lessons; no authenticated role or OEM anti-cheat trust boundary.

The bounded future-device/manual/repository comparison is still maintained in
`docs/research/MARITIME_DEVICE_SIMULATOR_LANDSCAPE_2026-10-15.md`:
FAR-2127 controller choice, MDC-2060 revision, NS4000 version/license and
KODEN J2000 exact identity remain unresolved. OpenCPN/radar_pi/Bridge Command
are conceptual reference sources, not model-specific OEM simulators.

**Not provided and not fabricated:** independent final lesson reviewer GO,
actual Kongming advice, OEM release approval, asset redistribution license,
confirmed installed firmware/transducer, tactile/colorimetric/acoustic
measurements or physical output. True hardware-equivalent 100% fidelity is
objectively not established in PUBLIC_REFERENCE mode. Continue the sole plan
for source-graded negative/positive/cancel/replay per-feature coverage; keep
unsupported branches disabled or clearly labeled synthetic.
