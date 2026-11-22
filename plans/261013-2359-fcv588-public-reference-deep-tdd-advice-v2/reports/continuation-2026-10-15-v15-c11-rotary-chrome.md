# FCV-588 PUBLIC_REFERENCE — V15 continuation (2026-10-15)

**Decision: scoped software and observed-browser PASS; source conformance,
course/public distribution, FURUNO/hardware equivalence: HOLD.** This is
execution evidence for the existing v2 plan, **not a new plan** and not an
independently authorized hardware or rights release. There was no Kongming
supervision receipt or verified lesson reviewer approval.

## Live workspace and baseline

- Windows `C:\Work\MoPhongMayTrenTau`; `.git` absent; no Git
  initialization/commit/push/deploy, real marine I/O or network publisher.
- Existing localhost node service preserved at `127.0.0.1:4173`.
- V14 was inspected and retained, with 271/271 historically observed PASS.
  Its browser receipt is now **historical relative to V15 source**, not the
  current runtime hash. Old execution session `84473` was unavailable after
  compaction; no PASS was fabricated for that unpolled run.
- AgentKit `3.0.0-beta.24` still validates the **one active v2 plan**:
  7 phases, 22 named `### Task` units, 50 checklist entries. Only Phase1's
  original ten are checked (**10/50, 20%**). Existing v14 22-task review is
  retained in `continuation-2026-10-14-v14-operator-source-ui-course.md`.

## Meaningful source changes, test-first

| Item | Exact RED observation | GREEN change and invariant |
| --- | --- | --- |
| C11 Trip Source | `node --test test/fcv588-public-data-source.test.mjs` failed new assertion: `Trip Source=NMEA` NAV showed stale `0.039 nm (SIM)` rather than `NO DATA` | New `projectFcvTravelValues` masks unavailable NMEA Trip only in projection; retains historical synthetic Own distance and Odometer, returns values on choosing Own; `web/app.mjs` Trip status matches NAV; world ticks/replay unchanged |
| C11 NAV2 RANGE | `node --test test/fcv588-public-nav-box-config.test.mjs` failed new assertion: configured RANGE read `NO DATA` despite selected synthetic destination and fresh synthetic ownship, expected `0.04 nm (SIM)` | Reused `distanceNmBetween` for source-guarded selected waypoint range, supports NM and km conversion; missing/stale/invalid position or destination renders `NO DATA`, no world mutation, deterministic replay |
| Direct faceplate MODE/GAIN | New minimal valid `web/rotary-input.mjs` stub followed by `node --test test/fcv588-public-rotary-input.test.mjs` gave expected RED: no pointer capture/rotate and no suppression of a drag-induced push | New pointer-captured vertical classroom gesture to canonical `rotate` events, bounded signed detents, pointerId validation, native pointercancel/lostcapture/blur/reset; a short GAIN click still pushes, a drag never double-dispatches a push. This is **original UI input**, not measured OEM detent behavior |
| LCD menu/rights distinction | Extended `test/fcv588-public-browser.test.mjs` failed expected static gate: parent modal not bounded, `[HOLD]` absent | Bounded flex LCD overlay and shrinking scrollport; long cursor scroll retained; disabled rights/source gaps visibly `[HOLD]`, capability-dependent no-availability `[N/A]` with typed reasons and clear training wording |

Specific source/test files updated: `src/devices/fcv588/navigation.mjs`,
`web/{app.mjs,styles.css,index.html,rotary-input.mjs}`,
`test/{fcv588-public-data-source.test.mjs,fcv588-public-nav-box-config.test.mjs,fcv588-public-browser.test.mjs,fcv588-public-rotary-input.test.mjs}`.
No real USB, serial, NMEA, transducer, RF or OEM media path was added.

## Observed test/QA receipts

- Targeted C11 and Arrival tests: **14/14 PASS** after RED/GREEN, exit 0.
- Rotary/nav/static browser targeted tests: **21/21 PASS**, exit 0.
- Full **`npm run check`: 279/279 PASS, 0 FAIL, exit 0** after the runtime
  changes (V14 had 271). Test counts are assertions, **not 279 functions**.
- `python -m unittest discover -s test -p
  test_fcv588_chrome_response_integrity.py -v`: **4/4 PASS**, exit 0.
  The first attempted module-qualified command failed because `test` is
  not a Python package; discovery correctly found the four real tests.
- Trace generator `python tools/build_fcv588_public_trace.py --check`: PASS,
  exactly **64 FCV operator rows + distinct teacher D15**, claims HOLD.
- Menu source `node tools/build_fcv588_public_menu.mjs --check`: PASS.
- Acceptance `node tools/build_fcv588_public_acceptance.mjs --check`:
  PASS for the existing conservative 65-row checkpoint. **60 FCV** + **D15**
  operable *synthetic subsets*, 3 partial C11/D09/D14, 1 unimplemented D04.
  Every source/rights claim remains HOLD.
- `ak plan validate` reports `valid:true`; `ak plan parse`: **10/50, 20%**.
- `python tools/verify_reference_manuals.py` was NOT repeated on this pass;
  V14's recorded archive verification remains historical, and archive
  contents were not modified. Restricted references were not redistributed
  or processed through new AI extraction.

## Actual isolated Google Chrome V15

Runner: `python tools/fcv588_chrome_viewport_acceptance.py` using the Windows
installed Google Chrome with exact viewport contexts; machine receipt:
`docs/qa/FCV588_CHROME_VIEWPORT_V15_RECEIPT.json`.

| Evidence | 1366×768 | 1920×1080 |
| --- | --- | --- |
| Actual viewport and document width | PASS / no horizontal overflow | PASS / no horizontal overflow |
| Canvas logical dimensions | 480×640 | 480×640 |
| Isolated pre-scenario browser storage | empty | empty |
| Native hold/repeat, pointer cancel and long POWER | PASS | PASS |
| Native faceplate GAIN drag vs short push; MODE drag | PASS | PASS |
| System Language `[HOLD]`; full LCD modal and cursor bounds | PASS | PASS |
| D02 save/replay/reset/reload; D10 instructor fault | PASS | PASS |
| D15 lessons / C11 choices | two scored lessons PASS | NAV2 edit + Trip Source commit PASS |
| Actual Chrome-delivered responses SHA-256-matched | 58/58 | 58/58 |
| Loaded unique runtime paths | 29 | 29 |
| JS console errors / network failures / foreign origin | 0 / 0 / 0 | 0 / 0 / 0 |

Preflight `SOURCE_TREE_IDENTITY_PASS`; postflight
`SOURCE_TREE_STABLE_PASS`; 31 permitted `web/src` files compared. Manifest:

`c77b20a1b08ec3dd2874bce7511c5bb11b8b0c09893eee2f30b06eb4393cb78d`

Actual browser-loaded response fingerprints:

- 1366×768:
  `e8ec9879f3ecf613e031625a82f6f69355621be4646007fed83c002a2c71e688`
- 1920×1080:
  `0da516c7e61e76a1c5d6dde906b53d6ae160c3c27d5554056843351654ab1dd4`

Three new full-page PNGs are under `docs/qa/screenshots/fcv588_public_v15_*`.
The browser first returned FAIL on new rotary **test-harness assumptions**:
three trusted pointer movements cross two detents (not one), and the GAIN
overlay title is `Auto Gain` (not uppercase `GAIN`). The verifier was amended
to assert both detents, no accidental GAIN push, separate real short click,
and case-insensitive actual title. The final full two-viewport run passed;
early FAIL was not relabeled or erased as a successful initial attempt.

## Independent/source limitations and next gates

1. D04 alternate languages and restart are still **NOT_IMPLEMENTED / rights
   and firmware SOURCE_GAP**. Never enable without cleared strings/semantics.
2. D09 Tankenmaru Output/Pic.Sync/Sub-Clutter and **installed optional
   capability** are unverified. Existing On/Off is only a training subset;
   no real RF/software interfaces are permitted. This conditional option
   entitlement merits a separate source-backed negative test before any GO.
3. D14 external IEC/NMEA semantics remain **MENU_ONLY_PARTIAL**, virtual
   fixture-only, `transport=NONE`; 10-tick stale threshold is classroom
   defined and not an OEM timeout. C11 bearing/wind multi-indication and
   firmware-specific 4-second cycling also remain a source gap.
4. B18/B19 advanced projection and hardware option values remain synthetic.
   The UI is original artwork, not a validated OEM photo or panel geometry.
   Small-phone (360–390px) hit-target audit, actual physical touchscreen,
   and OS window blur mid-hold are **NOT_RUN** in this V15 receipt.
5. Source/rights/firmware/manual exactness, individual complete per-feature
   positive/negative/cancel/replay/browser coverage, real Kongming advice and
   independent per-lesson reviewer approval are not closed. **No additional
   phase-wide checklist boxes were checked.**

Engineering next step: source-grade and constrain D09 optional capability,
then mobile/touch availability and the remaining source-backed C11/D14
subsets; rerun Node/Chrome on exact changed bytes before any stronger claims.
Keep **public lesson/course release, OEM/hardware equivalence and rights
approval HOLD** until all dedicated gates actually pass.
