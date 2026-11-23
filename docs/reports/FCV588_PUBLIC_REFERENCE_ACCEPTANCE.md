# FCV-588 PUBLIC_REFERENCE — implementation and conditional acceptance

## Current scoped checkpoint — P36 / F1-public-reference-22+ (2026-11-22; NOT RELEASED)

**Decision: SCOPED SOFTWARE & LEDGER CHECKS PASS; WHOLE-PROJECT OEM, HARDWARE, RIGHTS, NARRATOR SPEECH, AND COURSE/PRODUCT RELEASE REMAIN HOLD (`NO_GO` FOR PUBLIC RELEASE).**

Since historical V31 (`2026-10-16`, `35` runtime files, `F1-public-reference-20`), the simulator progressed through two major tracked waves without promoting any `HOLD` claim:

1. **`V32`–`V57` (`2026-10-17` → `2026-10-31` — LCD/Trainer Boundary, OEM Labels, A11y & 5-Tab D15):** Separated operator LCD visuals from external D15 instructor provenance cues, added source-matrix disclosures for `C11`/`D09`/`D14` and firmware-unknown `Colors`/`White Marker` (`V46`–`V48`), enforced contrast/accessibility checks (`V36`, `V49`, `V53`–`V54`), and refactored the D15 instructor panel into five ARIA tabs (`V56`–`V57`).
2. **`P01`–`P36` + P0 Hygiene (`2026-11-13` → `2026-11-22` — AP-1 Sounder Menu, Offline Archive & Desktop POC):** Reordered the 13-item `Sounder` menu to Appendix 1 order (`F1-public-reference-22`+) while freezing `10` `*-profile21.mjs` modules for deterministic legacy replay (`P14`), added White background palette (`P23`), offline archive sidecar v1, historical Bottom Zoom viewer, and event timeline (`P24`–`P28`), evaluated hardened Windows Electron POC bundles (`P29`–`P34`, release gate **`NO_GO`** in `P32`), refined `POWER/BRILL` accessible naming (`P35`), verified live Chrome `LF-ZOOM`/`HF-ZOOM` across `54` public runtime assets (`P36`), and synchronized repository licenses, `.gitignore`/`.gitattributes`, PII redaction, and cross-OS CLI `--check` tooling.

Current invariant summary (see [fcv588-public-implementation-status.json](../evidence/fcv588-public-implementation-status.json), [fcv588-public-menu-atlas.json](../evidence/fcv588-public-menu-atlas.json), and [COMPREHENSIVE_PROJECT_REVIEW_AUDIT_EVAL_2026-11-22.md](./COMPREHENSIVE_PROJECT_REVIEW_AUDIT_EVAL_2026-11-22.md)):
- **Runtime scope:** `54` original runtime files under `src/` (`35`) and `web/` (`19`) with `0` third-party runtime npm packages and `0` OEM media assets (`verify_public_runtime_assets.mjs` PASS).
- **64 + D15 classification:** `60` FCV operator `OPERABLE_SYNTHETIC_SUBSET`, `3` `MENU_ONLY_PARTIAL` (`C11`, `D09`, `D14`), `1` `NOT_IMPLEMENTED` (`D04` language switching/reboot), plus `1` separate `INSTRUCTOR_PLATFORM` item (`D15` 7 scored lessons + offline archive review).
- **Release & conformance gates:** Plan acceptance remains `14/50` checklist items and `6/22` named Tasks (Phase 1 complete; Phases 2–7 open). **All `65/65` claims remain `HOLD`** (`hardwareValidated: false`, `firmwareInstalled: null`, `rightsClearance: false`, `releaseApproval: "HOLD"`).

---

## Historical checkpoint — V31, 2026-10-16 (superseded)

**Decision: IMPLEMENTED AND SCOPED-VERIFIED; ONE NODE FIXTURE FAILURE;
FULL REGRESSION, REQUIRED COUNSEL, OEM/HARDWARE/COURSE/RELEASE HOLD.**
V31 repairs V30-B/E and integrates capability-dependent draft cancellation,
POWER-suspended transaction ownership, BRILL inactivity, compact basic-control
LCD feedback and teacher-reset storage bookkeeping. No sonar algorithm,
setting vocabulary or White Line Off/On meaning was changed.

The deliberate profile20 boundary rejects profile19 replay. Settings schema18
and core7/event5/replay7/scenario7/multi4 are retained. A narrow explicit old-
profile settings decoder validates the original envelope, restores committed
values through a logged event and keeps original storage bytes until a later
committed preference change. It never restores a virtual-option grant.

Actual targeted state/compatibility RED20 failed/7 passed became42/42. The new
native operator Chrome journey moved56 failed/228 passing UI/storage assertions
to284/284 across four required viewports, with12 images opened and actual
pixel/response/harness checks. The current35-file runtime SHA is
`eed901f4d12c4f7e61ff1825b3898c412428cd8c4210c1f2d5b14050503dbe36`.

The latest targeted Node run is52/53, not PASS: its new Auto fixture never
stages Manual before expecting656 ft. Independent static review confirms the
fixture mismatch. The correction is not applied because required Kongming
counsel has not been verifiably executed. Full current Node/Python and the
existing full/FUNC/config/LCD Chrome suites were not run. Scoped Chrome success
does not override this failed Verify or grant whole-batch acceptance.

Read the [V31 implementation report](../../plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-16-v31-transactions-controls.md),
[all50/22 assessment](../../plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/v31-checklist-review.md),
[evidence summary](../qa/FCV588_V31_EVIDENCE_SUMMARY.json), and
[exact failure/counsel packet](../../plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/v31-failure-counsel-packet.md).
Canonical acceptance remains14/50 entries and6/22 Tasks; only Phase1 is accepted.
All65 claims are HOLD. D04 is unimplemented; C11/D09/D14 remain partial. V30's
missing ledger metadata and two links were completed by new authorized writes,
without changing the historical blocked operation into a success.

## Historical executed checkpoint — V30, 2026-10-16

**Decision: BOUNDED IMPLEMENTATION/REGRESSION PASS; KNOWN FINDINGS OPEN;
WHOLE-PROJECT OEM/HARDWARE/COURSE/RELEASE HOLD.** V30 integrates Range Bank,
Units, Calibration, NAV boxes, Alarm profile/thresholds, Installation and
FUNC assignment into a semantic LCD projection. Stored/draft values, choices
and help are distinct; desktop instructor controls fit their inner panel.
An effective alarm projection consistently suppresses a committed Off banner
without changing cached observations or replay. All src bytes remain unchanged.

Actual post-review Node370/370, configuration Chrome264/264, preserved FUNC76/76,
LCD68/68 and four full Chrome contexts passed. All53 current images were opened.
Five completed receipts match the current34-file source and runner/helper SHA:
`99097efbccc12d8538a041643f22b22d268dadb3e24d9ec9acbc6f718d4c1117`.
Read [the evidence summary](../qa/FCV588_V30_EVIDENCE_SUMMARY.json) and
[the V30 report](../../plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-16-v30-integrated-configuration.md).

An actual independent read-only code review found and rechecked the alarm
display/assertion/DOM corrections; it is not Kongming or instructor approval.
V30-B (P1), stale Tankenmaru draft surviving revoke/regrant in both main and
Installation menus, is directly reproduced and OPEN. V30-E (P2), an incorrect
canonical Alarm enable notice label, is also OPEN. No all-functions acceptance
is implied by scoped passing tests.

All50 criteria and22 Task headings were reviewed in
[the detailed checklist assessment](../../plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/v30-checklist-review.md).
Canonical acceptance remains14/50 entries and6/22 Tasks, Phase1 alone accepted.
All65 claims remain HOLD; profile19/settings18/core7/event5/replay7/scenario7/
multi4 and White Line Off/On are retained. No source/rights/OEM promotion.
The nine previously missing V29 images and SHA reconciliation were completed
before V30 edits; its historical blocked command remains NOT_EXECUTED.

## Historical implementation — V29, 2026-10-16

This section preserves the original interrupted state. Its pending evidence
review was subsequently completed by V30; the source/hardware limits remain.

**Decision: IMPLEMENTATION PARTIAL; OBSERVED AUTOMATED QA PASS;
FINAL EVIDENCE RECONCILIATION AND RELEASE HOLD.** A reproduced FUNC rendering
defect hid high-valued Clutter/Color Erase choices. V29 shares the existing
bounded menu-choice window with FUNC and keeps commit/cancel help separate
and visible. No behavioral schema, acoustic algorithm or face geometry changed.

Actual results: Node347/347, Python13/13, targeted FUNC Chrome76/76,
LCD regression68/68; full desktop/mobile Chrome exit0. The extra consolidated
receipt/SHA read was tool-blocked before execution, without a retry. Twenty
targeted GREEN screenshots were opened; nine full-suite screenshots remain
pending review. This is not a final evidence-reconciled checkpoint or approval.

White Line percentage/Edge remains SOURCE_GAP, not a completed OEM editor.
No independent reviewer/Kongming or hardware/course approval was obtained.
Keep14/50 checked entries,6/22 accepted named Tasks and all65 claims HOLD.
See the [V29 report](../../plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-16-v29-func-white-line-source-gate.md).

## Historical reconciled checkpoint — V28, 2026-10-15

**Decision: SOFTWARE CHECKPOINT PASS; IMPLEMENTATION PARTIAL;
HARDWARE EQUIVALENCE AND COURSE/PRODUCT RELEASE HOLD.** This pass actually
viewed three manufacturer gallery images and corrected their evidenced
qualitative placement differences: central pedestal, small label in the dark
LCD surround, lower-left sonar depth, one vertical strong-to-weak legend and
picture-rate header. An actual-painter regression also prevents the top range
label from occupying the status/frequency region.

Full Node342/342 and Python13/13 passed. The reference FINAL probe passed
54/54 checks, existing LCD regression68/68, and all four full Chrome
viewports passed. Each desktop verified63 actual response bodies, each phone
31. All25 final-state screenshots were opened. Completed source/harness
stability receipts share the33-file manifest:
`79eb71132e233571b3f45454f55095c73292343ce7134405f38d4caa5ba65ab3`.

The [V28 atlas](../research/FCV588_PANEL_LCD_ATLAS_V28.md) measures only the
simulator. The [three-image comparison](../research/FCV588_OFFICIAL_VISUAL_COMPARISON_V28.md)
records direct observations separately from original dimensions/fonts/colors
and missing firmware/menu evidence. No OEM pixels or protected font entered
the runtime. The initial GREEN receipt predates the range-label fix; the
FINAL and full-suite receipts, not that intermediate record, bind final code.

No core/reducer/settings/replay version changed: profile19/settings18/
core7/event5/replay7/scenario7/multi4. Canonical acceptance remains14/50
checklist entries,6/22 named Tasks, Phase1 alone complete. All65 claim
decisions, independent reviewer/Kongming approval and release remain HOLD.
See the [V28 implementation report](../../plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-15-v28-official-visual-reference.md).

## Historical checkpoint — V27, 2026-10-15

**Decision: SOFTWARE CHECKPOINT PASS; IMPLEMENTATION PARTIAL;
HARDWARE EQUIVALENCE AND COURSE/PRODUCT RELEASE HOLD.** V27 repairs immediate
BRILL draft rendering, an LCD Test that previously continued painting sonar,
and instruction text masquerading as selectable main-menu rows. The five
category rail and bounded selected-choice panel are original UI estimates;
the existing reducer navigation is retained, not declared OEM-correct.

Actual results:333/333 full Node tests,7/7 Python Chrome-integrity tests,
4/4 atlas tests,68/68 targeted LCD assertions and four full Chrome viewports
PASS. Desktop contexts hashed63 actual response bodies each; phone-emulated
contexts31 each. All31 loaded paths belong to the33-source original runtime.
The common manifest is
`2b9003590613d42aba72bf98aa33d4cb4f4d5a6ae173c9328f5329e4b38545ed`.
All eight targeted GREEN and nine full-suite screenshots were opened.

No behavioral schema changed: profile19, settings18, core7/event5/replay7,
scenario7, multi-runtime4. No source asset was copied from FURUNO. Geometry
measured in [the V27 visual atlas](../research/FCV588_PANEL_LCD_ATLAS_V27.md)
describes the simulator, not the physical instrument; fidelity percentage and
hardware coordinate targets remain unset. Exact fonts/colors, head geometry,
menu navigation and installed firmware still lack complete acceptance.

Canonical acceptance stays14/50 checklist entries (28%) and6/22 named Tasks,
with only Phase1 complete. All65 claim decisions remain HOLD. Independent
reviewer/Kongming and course-release approval were not obtained. Read the
[V27 implementation report](../../plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-15-v27-lcd-menu.md)
and [current Chrome evidence record](../qa/FCV588_PUBLIC_BROWSER_SMOKE.md).

## Historical checkpoint — V26, 2026-10-15

**Decision: IMPLEMENTATION PARTIAL; EXECUTED SOFTWARE CHECKS PASS;
COURSE RELEASE AND HARDWARE-EQUIVALENCE HOLD.** The actual Windows
continuation improved the original head/support silhouette, vertical key
placement, blank unpowered LCD and state-derived MODE/GAIN indicators.
No OEM image, font or firmware was imported. Exact bare-head dimensions,
key contours, switch angles, colors and pixel fonts remain unverified.
The overall 233x270 reference envelope must not be called a measured
bare faceplate; no 233x233 head measurement is accepted here.

Retained behavioral contracts are profile `F1-public-reference-19`, settings
schema18/key v18, core `f1-core-7`, event5, replay envelope7, scenario7 and
multi-runtime4. V26 changes only the HTML/CSS and read-only state projection,
plus regression tests/harnesses. Its new source identity is not inferred from
the unchanged profile number.

Actual full `npm run check`: **326/326 PASS**, Python integrity **7/7 PASS**.
The panel Chrome probe moved from 8 failed visual assertions to **12/12 PASS**.
Full Windows Google Chrome passed **4/4 target viewports**; each desktop
hashed 61 completed response bodies and each phone-emulated context 30.
The 32-file manifest recorded by both completed receipts is:

`8efc7a9a01ff81f489388b14cdb567aa2ee186529f3d3779e0f590e42c56dadb`.

All seven mode positions, staging/cancel, Auto/Manual Gain, canonical replay,
paused-world isolation, existing input/menu/persistence/D15 flows and mobile
44px targets were exercised by the respective browser suites. All nine V26
screenshots were inspected. A separate final aggregate SHA command was
tool-blocked before execution; it was not counted as PASS. No runtime or
harness changes followed the completed Chrome runs.

The sole plan remains **7 phases / 22 named Tasks / 50 checklist entries**,
with **6 accepted named Tasks and 14/50 checked (28%)**. Only Phase1 is fully
accepted. The operator register remains 60 synthetic subsets, C11/D09/D14
partial and D04 unimplemented; D15 remains a separate synthetic platform
with seven lessons. **All 65 claim decisions and product/course release
remain HOLD.** No independent final reviewer or Kongming approval was obtained.

Read the [V26 implementation and verification report](../../plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-15-v26-panel-projection.md),
[current browser record](../qa/FCV588_PUBLIC_BROWSER_SMOKE.md), and
[recovered historical V25 checkpoint](../../plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-15-v25-recovery-evidence.md).

## Historical checkpoints — preserved evidence

Version numbers, "current" labels and next-step notes below belong to their
original checkpoints; the V27 section above is the latest disposition.

**Historical checkpoint: V24, 2026-10-15. Decision: IMPLEMENTATION PARTIAL, COURSE RELEASE HOLD,
HARDWARE-EQUIVALENCE HOLD.** The code is a deterministic, training-only
offline simulator. Nothing here claims FURUNO approval, a confirmed installed
firmware/transducer, acoustic accuracy, or precise OEM pixels.

**Historical V24 implementation:** `F1-public-reference-18`, settings schema17
(`settings.v17`), core `f1-core-6` and replay envelope6. Current
source-bound full `npm run check`: **314/314 PASS**, Python **7/7 PASS**, real
Google Chrome Windows **4/4 target viewports PASS**, 61/61 response bodies
per desktop viewport and 30/30 per mobile viewport, shared 32-file manifest:

`2c9e68e77186f617e59bbfdc92a2981408fa2557b8591ba580bba0a0e7dea54c`.

V24 replay now rejects a same-revision adapter with altered HOLD thresholds,
gestures or controls; C04 alarm and C11 NAV projector fail closed on invalid,
untagged sources; B18 supplementary NAV respects configured speed units;
POWER/FUNC accepts single native assistive activation without duplicate input.
D15 expanded from five to **seven** synthetic scored lessons with stronger
per-attempt fixture boundaries, Key Beep and BRILL procedures. Original
reference-estimate LCD geometry now follows public ~128×171mm aperture within
233×270mm panel, still a 480×640 Canvas, not OEM pixel art or measured hardware.

The plan remains 7 phases / 22 named Tasks / 50 checklist entries,
**14/50 checked (28%, six named Task headings accepted)** because whole-phase
source/rights/reviewer gates are not complete. **All 65 feature claim decisions,
hardware equivalence, redistribution rights, independent lesson approval and
course/product release remain HOLD.** Read the
[source-bound V24 TDD/Chrome/evidence report](../../plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-15-v24-replay-input-d15-source-geometry-chrome.md)
and [V24 Chrome receipt log](../qa/FCV588_PUBLIC_BROWSER_SMOKE.md#v24--2026-10-15--input-contract-d15-lessons-and-manufacturer-published-lcd-fractions).

### Historical V23 — preserved former baseline

V23 used `F1-public-reference-17`, settings schema16,
storage key `mophongmaytrentau.fcv588.public-reference.settings.v16`.
This V23 batch added behavior-level RED→GREEN guards for impossible/foreign
synthetic position (B18) and negative or unselected ownship speed (C11/B18/D14),
removed contradictory Installation NMEA setup while virtual Tankenmaru On
(D09), and labeled the unknown-firmware 8/16-color choice `Colors · SIM` (B19).
Full `npm run check` **305/305 PASS**, Python integrity **7/7 PASS**, and
four real Chrome viewport checks **PASS** (60/60 desktop and 30/30 phone
actual response-body hashes per viewport) on the same 32-file manifest
`104c6cebd9b20792be376565d9e93c3a0cd3f4226e0abc1718ab75fbf39feba0`.
The 7-phase / 22-Task / 50-checklist plan remains **14/50 (28%)**;
independent final review, manufacturer rights, installed firmware, physical
equivalence and release are **HOLD**. Read the
[detailed source-bound V23 report](../../plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-15-v23-source-guards-installation-firmware-chrome.md)
and [V23 Chrome smoke](../qa/FCV588_PUBLIC_BROWSER_SMOKE.md#v23--2026-10-15--profile17-source-guards-and-four-real-chrome-viewport-checks).

## Workspace and execution evidence

- Existing Windows workspace `C:\Work\MoPhongMayTrenTau`. No `.git` directory
  was present; no Git repository created, no commit, push, deployment, real
  serial port, network vessel output, radio, USB or hardware control performed.
- Current approved execution *plan*:
  `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/plan.md`.
  Seven phases and 22 named Task units, tracked by AgentKit as 50 Markdown
  checklist entries; Phase1 has 10/10 checked, plus two separately evidenced
  entries each in Phase2 and Phase7, **14/50 total**.
  Phases 2–7 contain implementation work but lack all their acceptance gates:
  **do not check whole phases based on test count**.
- Historical V11 `npm run check`: **249 tests / 249 pass / 0 fail**, exit 0 on
  `F1-public-reference-11`, after source-backed Zoom/NAV pane corrections,
  six independent unit categories and editable NAV1/NAV2 data boxes; plus
  pointer-capture denial and native-browser touch/capture QA regressions.
  The earlier **205/205 PASS** remains in the historical checkpoint.
- Historical V12 `npm run check`: **255 tests / 255 pass / 0 fail**, exit 0,
  including additional observer-event ownership/unknown-field rejection,
  D15 lesson-start session fingerprint and powered-off action guards,
  schema-bound multi-observer replay and two-sided browser source verification.
- Historical V13 `npm run check`: **259 tests / 259 pass / 0 fail**, exit 0.
  Four extra Node regressions plus a separate four-case Python QA suite verify
  mandatory nonzero D15 start fingerprints, array-spoof rejection and the
  SHA-256 of the **actual** responses delivered to Chrome, not just independent
  HTTP pre/post probes. The Python unittest passes **4/4**.
- Historical V14 `npm run check`: **271 tests / 271 pass / 0 fail**, exit 0,
  after §1.21 Data Source Own/NMEA and bearing/wind choices, explicit receiver
  and alarm/source no-data guards, B18 Temp Graph leakage correction, original
  circular TrackPad/bezel CSS, long LCD menu cursor visibility, and a fourth
  instructor D15 lesson. New RED tests became GREEN without suppressing
  existing suite assertions. Separate Python response-integrity QA still
  **4/4 PASS**.
- `python tools/verify_reference_manuals.py`: **PASS_AVAILABLE_ASSETS_WITH_GAPS**,
  24 verified PDFs, 2 verified ZIPs, 197171462 bytes,
  `validation_failures=[]`; 3 known acquisition gaps remain. A public URL
  or an archive hash does not grant redistribution or AI-processing rights.
- `python tools/build_fcv588_public_trace.py --check`: PASS, exactly 64 FCV
  operator rows plus separate D15. Public claims HOLD.
- `node tools/build_fcv588_public_menu.mjs --check`: source-graded five-root
  menu atlas regenerated for D02 Range, D05 Units, D06 Calibration,
  C11 NAV1/NAV2 box editor and ALARM1–5; validation rechecked in final QA.
- `node tools/build_fcv588_public_acceptance.mjs --check`: PASS, conservative
  64+D15 implementation checkpoint consistent with the Phase1 trace.
- `ak plan validate ... --json --no-interactive`: `valid:true`.
- Chrome smoke and limitations: [FCV588_PUBLIC_BROWSER_SMOKE.md](../qa/FCV588_PUBLIC_BROWSER_SMOKE.md).
  New isolated **Google Chrome/Playwright** smoke observed exact 1366×768
  and 1920×1080 viewports, logical LCD 480×640, no horizontal overflow;
  both viewports PASS real input and persistence/replay/teacher reset tests,
  each with **0 JS console errors and 0 network failures/non-local requests**.
  It also covers D15 Range lesson scoring and C11 NAV2 box editing. Screenshots
  and JSON receipts are saved under `docs/qa/`. Historical 1912×970 attached
  smoke and its 24 HTTP 200 requests are retained separately.
- Historical V12 browser receipt:
  `docs/qa/FCV588_CHROME_VIEWPORT_V12_RECEIPT.json`, with **30 runtime assets
  SHA-256-matched before and after actual Chrome testing**, 1366×768 and
  1920×1080 PASS, empty initial localStorage for both new contexts, and zero
  console/request/network failures. Prior V11 receipts and screenshots remain
  retained; the source identity is verified, not guessed from the port number.
- Historical V13 browser receipt:
  `docs/qa/FCV588_CHROME_VIEWPORT_V13_RECEIPT.json`. Both original Chrome
  contexts **1366×768 and 1920×1080 PASS**. Each loaded 56 HTTP response
  bodies whose SHA-256 matched the preflight manifest (**28 unique runtime
  paths**). Source pre/post comparison also passed across 30 public runtime
  assets; manifest digest:
  `4ad93c45b717efebb23500b24bd596eb61f29b74bd6a2aa1122f861c2fc5b7fa`.
  No JavaScript or network errors; each started with empty localStorage.
  Screenshots saved under `docs/qa/screenshots/fcv588_public_v13_*`.
- Historical V14 Chrome receipt:
  `docs/qa/FCV588_CHROME_VIEWPORT_V14_RECEIPT.json`, `PASS_OBSERVED_VIEWPORTS`
  on **1366×768 and 1920×1080**, with **56/56 actual Chrome response bytes
  SHA-256-matched per viewport**, 28 loaded source paths and 30 permitted
  runtime files matched before/after. Historical source manifest:
  `3ab342b9b116c49c580f840859915200449000fc84d31584e663b1351bd779f9`.
  Both viewports passed hardware-key hold/cancel, replay/reset/reload and an
  actual long System menu row visibility check. The 1366 viewport passed D15
  RANGE **and new §1.21 Trip Source course scoring** in one session; 1920
  passed NAV2 box config and actual Trip Source Own→NMEA operator commit.
  Zero JS console errors, network errors or nonlocalhost request failures.
  Source version `F1-public-reference-12`, local settings schema11,
  core/event/replay schema5 and scenario7.
- **Historical V15 `npm run check`: 279 tests / 279 pass / 0 fail**, exit 0,
  adding C11 trip/NMEA no-data and waypoint RANGE projections, unit conversion,
  LCD source-HOLD/scroll bounds and four new rotary gesture/capture/keyboard-
  accessibility regressions. RED failed on the actual stale-trip and dormant
  RANGE behavior before the software corrections; negative/replay paths GREEN.
  Python response-integrity unittest **4/4 PASS** with discovery mode.
- **Historical V15 Chrome** `docs/qa/FCV588_CHROME_VIEWPORT_V15_RECEIPT.json`:
  both exact viewports PASS; **58/58 actual delivered bodies** match SHA-256
  per viewport (29 unique requested paths, 31 registered public files). New
  native MODE/GAIN pointer drag, separate GAIN short push, source `[HOLD]`
  versus `[N/A]`, entire LCD modal bounds and prior D15/hold/replay/reset/
  persistence remain accepted for those two browser contexts. `0` console/
  network errors. Manifest digest:
  `c77b20a1b08ec3dd2874bce7511c5bb11b8b0c09893eee2f30b06eb4393cb78d`.
  V14 historical receipt and images were not overwritten.
- **Historical V16 `npm run check`: 281 tests / 281 pass / 0 fail**, exit 0;
  reviewer found two P1 input/data edge cases which were actually reproduced
  RED then corrected: moved GAIN rotary lostpointercapture must not dispatch a
  subsequent push, and NAV POSITION displays `S/W` for negative coordinates.
  Independent strict read-only re-review returned scoped code GO. Both actual
  Chrome viewports passed V16 with **58/58 actual response bodies**.
- **Historical V17 `npm run check`: 285 tests / 285 pass / 0 fail**, exit 0,
  and Python browser response-integrity unittest **4/4 PASS**. D09 optional
  Tankenmaru `On` now requires an explicit, transient, teacher-only virtual
  fixture; default System and Installation rows are `SOURCE_GAP [HOLD]`.
  Revoking the fixture turns `On` off, restores NMEA and MARK, prevents a
  pending edit from committing, and preserves deterministic session replay.
  Local settings moved deliberately to profile `F1-public-reference-13`,
  schema v12 and storage `settings.v12` (no silent v11 migration); restored
  `On` is coerced Off without the current D15 option declaration.
  Core/event/replay schema5 and scenario7 remain pinned.
- **Historical V17 Chrome**
  `docs/qa/FCV588_CHROME_VIEWPORT_V17_RECEIPT.json`:
  `PASS_OBSERVED_VIEWPORTS` at **1366×768 and 1920×1080**; 58/58 actual
  Chromium-delivered response bodies matched SHA-256 per viewport, 29 loaded
  paths and 31 runtime source files identity-checked before/after. It exercised
  the **LCD D09 HOLD→D15 virtual option ON→operator On→D15 revoke→HOLD**
  and verified NMEA suppression/restoration, native GAIN lostcapture and
  prior D15/replay/power checks. Zero JS/network/non-local request errors.
  Manifest:
  `2e98bd08b0467117177b998b22cae5e8e1193dfa68a7837aa17ccf5fc363c528`.
  V11–V16 receipts and screenshots remain historical, not rewritten.
- **Historical V18 `npm run check`: 286 tests / 286 pass / 0 fail**, exit 0.
  Independent D09 reviewer found a reproducible P1: toggling the optional
  Tankenmaru fixture could reinsert two System menu rows while a later
  `FUNC Key` or `Key Beep` setting was being edited, cross-committing the
  staged draft to the wrong setting. TDD RED exposed this, then GREEN bound
  edits to stable entry IDs, validated the choices at commit and canceled/
  semantically reselected the current row on menu cardinality changes.
  Both shifted-row regressions preserve settings codec and deterministic
  replay. Independent STRICT READ-ONLY re-review gave **scoped code GO**.
  Profile was deliberately advanced to `F1-public-reference-14` and settings
  schema/storage v13, with old v12/profile13 rejected. Core/event/replay
  schema5, scenario7 and multi-runtime3 remain unchanged.
- **Historical V18 Chrome** `docs/qa/FCV588_CHROME_VIEWPORT_V18_RECEIPT.json`:
  `PASS_OBSERVED_VIEWPORTS` at **1366×768 and 1920×1080** with **58/58 actual
  Chromium-delivered response bodies SHA-256 matched per viewport**, 29 unique
  runtime request paths and 31 source assets matched before/after.
  Both real-browser contexts passed the new D09 `FUNC Key` mid-edit revoke/
  reindex safety case plus prior V17 D09, GAIN pointer and D15/POWER/replay
  scenarios. There were zero JS console, failed network or non-local requests.
  Source manifest SHA-256:
  `e1dca7711d87b449bbeefd8948034973bc9b8d84ce57089cde38e895ff37fe81`.
  Earlier V11–V17 receipts remain historical; no OEM/source approval follows
  from a browser PASS.
- **Historical V19 `npm run check`: 287 tests / 287 pass / 0 fail**, exit 0,
  after a browser-first mobile accessibility RED→GREEN campaign. At 360px
  the old LCD was too narrow; at 390px MENU measured 94×25 CSS pixels. A
  deliberately reflowed **non-OEM training face** now displays the full LCD
  above enlarged keys/TrackPad and exposes 44×44px-or-larger touch targets.
  A second actual screenshot/geometry RED revealed a 446px-tall D15 lesson
  button due to a broad descendant grid selector; direct-child CSS targeting
  fixed the nested lesson form. No device event, core replay or setting schema
  changes occurred, so profile14/schema13 remain pinned.
- **Historical V19 desktop Chrome**
  `docs/qa/FCV588_CHROME_VIEWPORT_V19_RECEIPT.json`: exact 1366×768 and
  1920×1080 both PASS, 58/58 actual loaded response-body SHA-256 matches
  and 29 unique paths per viewport, zero console/network errors. All D09
  shifted-row/GAIN/hold/D15/persistence/replay cases from V18 still PASS.
- **Historical V19 phone Chrome**
  `docs/qa/FCV588_CHROME_MOBILE_V19_RECEIPT.json`: exact 360×800 and
  390×844 PASS in clean isolated Chromium touch-emulated contexts, 29/29
  actual delivered response bodies per viewport. The four TrackPad hit
  regions do not overlap, pointer taps emit one canonical event, full System
  menu stays within LCD, and D15 lesson controls are readable/touchable.
  At 360px LCD measured 310px wide; at 390px it measured 340px. These are
  **browser-simulated touch sessions, not tested physical phone hardware**.
  Both desktop and phone runs matched the same **31-file** served-source
  manifest SHA-256:
  `7e6538fd92f2f02fa0dc517b5b729fa75dd523be7bc71e5a00393bd5d7bdf590`.
  Five original full-page PNGs and both machine receipts are retained under
  `docs/qa/`; old V11–V18 source hashes remain historical.

### Historical V20 verified browser and source checkpoint

**Latest completed full Node check: 289/289 PASS**, no failures, exit 0.
No runtime web/src source changed during this later QA-only continuation.
Two new Python QA tests first failed RED on absent runner/helper hashes;
they now PASS GREEN along with the original four response-integrity tests
(**6/6 Python**), and the **14/14 focused Node browser contract** tests PASS.
These are separate checks, not another execution of the 289-test suite.

- Desktop receipt: docs/qa/FCV588_CHROME_VIEWPORT_V20_RECEIPT.json.
  Google Chrome 1366×768 and 1920×1080 both PASS, **58/58 actual Chrome
  response bodies** per viewport, 29 loaded paths, no console/network errors.
  Its D09 dynamic FUNC menu revoke, C11/D15 Data source, POWER hold,
  pointercancel, rotary, D02 persistence/replay and bounded LCD cases PASS.
- Refreshed phone receipt: docs/qa/FCV588_CHROME_MOBILE_V20_RECEIPT.json.
  Google Chrome at 360×800 and 390×844, touch emulation, both PASS;
  **29/29 actual response bodies** per viewport, 29 paths, no errors.
  Phone cases cover nonduplicated native TrackPad touch, last System menu
  selection and all **12 simulated physical controls plus 16 D15 buttons**
  at least 44×44 CSS px. Mobile reflow is visibly labeled NOT OEM geometry.

An independent review caught a genuine *QA provenance* gap: the first V20
phone receipt predated the final shared Python response-verification helper.
The mobile runner was updated and **Chrome mobile was rerun** with the
final verifier. Its receipt records QA harness preflight/postflight identity
PASS_UNCHANGED for both exact script SHA-256 fingerprints:

- mobileRunner: 910f46bec54cb2b1e1d5b024228157bbded5fb946d11472794475ec30f2c12a4
- sharedChromeVerifier: db3009f0aa21ef007598b3e8eb011f9fa81e28f6ccf93dcdf53fd7d8725b4439

Refreshed phone body aggregate hashes are:
360px ae5969a3bb3b47853371caa76d4ac2bfe7617c77dfa615fda0d48e928b989a73
and 390px 7f7b467973fbfa6a00b4d959ddebbf61bc02148e94cdd85e02e52c59148f9f0d.
Desktop evidence remains valid for the same unmodified runtime source.
Both V20 Chrome receipts share **31-file** original public runtime manifest:

    5951b875cb2aca16e4d0b057964ae4a7bcba4db644c2f570823bfe03765c76bb

The 31 V20-runtime asset SHA-256 values were compared against both receipts,
with zero mismatches. Recursive restricted-runtime-asset policy PASS, and
64+D15 implementation-checkpoint no-drift PASS. All five V20 full-page
PNG screenshots exist and were visually examined; refreshed phone captures
supersede earlier same-named phone PNGs.

**All 65 public feature claim decisions, source/rights and course release
remain HOLD.** Browser source integrity is not hardware, OEM,
redistribution or classroom-review approval. The active plan still has
7 phases, 22 Task units (5 in completed Phase1, 17 not formally
accepted in Phases2–7), 50 entries, 10 checked (20%).

### Historical V21 substantive TDD and four-viewport acceptance

**V21 historical verified source:** profile F1-public-reference-15; settings
schema14/key settings.v14; canonical core f1-core-5, event/replay schema5,
scenario7, multi-runtime3. The profile/storage revision advanced explicitly
because TIME TO GO and the optional D09 System UI change observable replay
behavior. Older profile14/schema13 stored data are rejected without a
silent coercion of optional hardware. Firmware remains UNKNOWN and
hardwareValidated=false.

This run implemented and tested behavior, **not merely receipt maintenance**:

- **C11 (§1.21 synthetic NAV):** previously inert TIME TO GO display now
  projects a visibly labeled HH:MM (SIM EST) from an explicitly selected
  synthetic destination, fresh typed Own position and positive synthetic
  speed. Missing/stale/invalid position, missing destination, zero speed and
  unavailable NMEA source produce NO DATA; replay/world state remain stable.
  This is not a measured or OEM arrival-time algorithm.
- **D14 (sandbox receiver):** normalizes southern/western hemispheres using
  the same validated synthetic coordinate formatter as NAV; rejects
  out-of-range latitude/longitude and fake external NMEA fixes, preserving
  NO REAL INTERFACE.
- **D09 (§2.9 optional Tankenmaru):** by default held for unknown hardware.
  With D15 virtual option explicitly declared **and** System On, displays an
  additional read-only manual-defaults modal (Output Off, Pic.Sync Yes,
  Sub Clutter 4); does NOT edit/publish/output any real partner signal.
  Normal hardware MENU/ESC now correctly returns from this modal to System.
  Dynamic menu insert/revoke preserves setting ownership and cancels edits.

TDD preserved the actual RED failures (inert TIME TO GO, bad position
hemispheres, missing details, schema-revision mismatch, and optional modal
ESC dispatch). The initial desktop V21 Chrome run reproduced the modal
exit P1: both viewports FAIL_QA with "FUNC Key lost after read-only D09
panel"; its unmodified failure receipt was preserved separately as
docs/qa/FCV588_CHROME_VIEWPORT_V21_PRE_FIX_FAIL_RECEIPT.json. After fixing
the reducer and adding an explicit regression, **293/293 Node tests PASS,
0 FAIL, exit 0**; Python Chrome harness identity/response-integrity
tests **7/7 PASS**.

Final V21 receipts for the corrected current source:

| Actual isolated Chrome viewport | Status | Verified browser response bodies | Unique paths | Console/network errors |
| --- | --- | ---: | ---: | ---: |
| Desktop 1366x768 | PASS | 60/60 | 30 | 0 |
| Desktop 1920x1080 | PASS | 60/60 | 30 | 0 |
| Mobile 360x800 (touch emulated) | PASS | 30/30 | 30 | 0 |
| Mobile 390x844 (touch emulated) | PASS | 30/30 | 30 | 0 |

- docs/qa/FCV588_CHROME_VIEWPORT_V21_RECEIPT.json
- docs/qa/FCV588_CHROME_MOBILE_V21_RECEIPT.json
- Common manifest: 14772f98e1aa03ac9a11ed2da96d225f4a976c0d0160f11bf2968ba1b9955ed2.
- All **32/32** public web/src runtime asset digests match *both* receipts
  and the local Windows source tree. Real Google Chrome response bodies,
  including reloads, were independently checked against that manifest.
- Both receipts attest qaHarnessSourceIdentity.status=PASS_UNCHANGED.
  Actual desktop/shared Python helper SHA-256:
  2e1fe07a15884f906577aa54d520c7d07749ae16b01dc5956fb5402464dac3c7;
  actual mobile runner SHA-256:
  1ca1f640abbd59136241115a4de98f106a03aef9f0738df6b4a4ca3ff1ed206a.
- Desktop 1366/1920 aggregate loaded-response SHA-256 respectively:
  f69e9acb4d7a4a55c8ab214ff86f9841455a149f787ff3bb967b4a8d30381ffd
  and 1194eb7204b48ed361ba4c3ad343d7a4ec0508bf173ef2dae89a89d7b6162c4d.
- Mobile 360/390 aggregate loaded-response SHA-256 respectively:
  99cc85c932f316b7101fa6d9d8ee52894dae04c9fffaa6ec93c15309be8a7650
  and 39525230d1b3544fa31e61e8ca016e8bd117f322edf1cc9117e66fa049ffea50.

Actual Chrome desktop covers sustained physical POWER input, MODE/Gain
rotary and capture cancellation, source-dependent Data/D15 lessons,
D09 optional entry/detail/ESC/revoke/FUNC edit, long LCD menus,
D02 persistence/reset/replay. Phone Chrome additionally drives the
D09 modal lifecycle by real touch and measures all 12 device and 16
instructor controls at >=44 CSS px. Six saved V21 original full-page
screenshots, including an opened Tankenmaru defaults modal and configured
NAV2, were visually inspected. This is a 480x640 logical LCD with
source-graded original bezel artwork, not OEM-pixel certification or
physical touchscreen testing.

All three status groups remain conservative: **60 FCV operator synthetic
subsets plus D15 teacher subset**, **C11/D09/D14 MENU_ONLY_PARTIAL**,
**D04 NOT_IMPLEMENTED**. All 65 public claim decisions and lesson/release
sign-off remain HOLD. Archive verifier PASS_AVAILABLE_ASSETS_WITH_GAPS
(24 PDFs, 2 ZIPs); no manufacturer redistribution or installed hardware
verification was inferred. Manual comparison for the other requested
models was updated read-only in
docs/research/MARITIME_DEVICE_SIMULATOR_LANDSCAPE_2026-10-15.md.

## Per-feature evidence status (not an equipment certification)

The machine-readable 65-row checkpoint is
`docs/evidence/fcv588-public-implementation-status.json`. Its statuses are:

| Status | Rows | Exact meaning |
| --- | ---: | --- |
| OPERABLE_SYNTHETIC_SUBSET | 61 (includes D15) | Some training-only code path/visual or scenario test exists, not necessarily the complete named function |
| MENU_ONLY_PARTIAL | 3 | C11, D09 and D14 have partial menus/behavior, but full operator semantics are missing |
| NOT_IMPLEMENTED | 1 | D04 alternative-language switching/reboot has no cleared resources and no usable implementation |
| **PUBLIC_REFERENCE_CONFORMANT** | **0** | No feature was promoted without per-row source, cancellation/negative tests, browser evidence, rights and reviewer sign-off |

The older Phase1 trace remains authoritative for source authority and rights;
the new checkpoint deliberately does not rewrite its provenance or claim
permissions. Every claim decision is HOLD. Tests referenced at domain level
are smoke evidence, **not 65 independent per-feature acceptance receipts**.
The generator now uses an **explicit reviewed feature subset allowlist**;
unknown rows fail closed as `NOT_IMPLEMENTED` instead of being automatically
considered operable. **61/65 is not a manual-conformance score.** A17, B18,
C05, C10, C11, C13, D02, D05, D06 and D10 have targeted synthetic tests,
but every claim still has `claimDecision=HOLD`.

### Current V22 — source-valid Receiver, B19 LCD ink and fifth scored D15 lesson

V21 293/293 testing and Chrome receipts remain historical for profile15.
The actual current simulator now pins **F1-public-reference-16** with
settings schema15/storage key v15, rejecting incompatible older replay
and local preference envelopes. The new behavior is not only a report:

- **D14:** stale/missing/untyped synthetic fixes no longer appear as live
  Own Trip/Speed/Temp in Receiver Status; the virtual Tankenmaru mode
  masks those Own channels, while NMEA selection continues to report
  NO_EXTERNAL_RECEIVER, and no physical transport is opened.
- **B19:** original independently designed White/Blue/Black/Mono/Night
  palettes retain readable depth, frequency, header and NAV values.
  Color-theme unit tests assert >=4.5:1 computed text contrast; Chrome
  physically operates Palette White→Blue and checks actual CSS ink and
  captures screenshots, without claiming proprietary OEM RGB accuracy.
- **D15:** a fifth graded lesson (manual §4.9) requires student
  MENU/TrackPad/ENTER to open the no-receiver status. Scoring checks
  exact new-attempt/session-hash boundary, replay, source-disabled truth
  and rejects an active synthetic NAV fixture or historical credit.
- **Desktop face:** original 233:270 reference-estimated panel is centered
  in its independent workbench column, leaving the D15 trainer separate;
  actual browser measures its size, center, ratio and 480x640 LCD.

Full integrated **npm run check 299/299 PASS** and Python source/harness
**7/7 PASS**. Trace/status 64+D15, 67-entry menu atlas, restricted runtime
asset scan (32 original web/src assets), plan validate and source archive
checks PASS. Both real Google Chrome V22 receipts independently attest
their unchanged QA Python script SHA, matching 32/32 source file digests
and successful verification of **actual Chrome HTTP response bodies**
at desktop 1366x768 (60/60), 1920x1080 (60/60), phone 360x800 (30/30)
and 390x844 (30/30). All 4 scenarios have zero console/network errors.

Common current runtime manifest:

    56cffc8a30c09349b1d7ffa14410b2802d7463133bc0ecd7a3a48df7fc907aec

Current desktop/shared QA helper SHA:
aa0534eaf7cdb1cda075b61dd64117fb409f33671ade5212a63a70852ab8f85d.
Current mobile QA runner SHA:
4814db2c171a36eeede437b5cae386f191492e5368cbb33e7451dab55fd20e4c.

The active plan remains **7 phases, 22 Task headings, 50 checklist,
14/50 checked (28%)** after four individually supported Phase2/Phase7
items were checked against actual current-source, TDD and browser
evidence. Phase1 alone is fully accepted (10/10); Phase2 is 2/7,
Phase7 is 2/5, and Phases3–6 remain 0/7. Six of the 22 named
Task headings have been accepted (five Phase1 plus Task2.1); the
remaining sixteen are still open. Later phases are not
accepted merely because they contain working synthetic code.
**64 FCV operator entries and D15**
remain classified as 60 operator plus D15 synthetic subsets, C11/D09/D14
partial, D04 not implemented. All 65 claim decisions and public
course/release approval remain **HOLD**.

The detailed current-source TDD, provenance, screenshots, per-phase
blockers and equipment equivalence conditions are recorded in
plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-15-v22-receiver-palette-lesson-browser.md.

### Operational training subsets exercised

Original face artwork, portrait LCD and separate TrackPad/ENTER/POWER/BRILL,
RANGE, MARK, FUNC, GAIN and MODE inputs; deterministic physical hold/cancel,
MODE selector and replayable UI timeout distinct from world ticks; configurable
Gain/Range/VRM and five main menus. Operator FUNC has 11 illustrated
programming targets with short/hold, commit/cancel and persistent assignment.
A17 provides Key Beep On/Off and optional short browser training tone plus
replay-logged pointer/keyboard TrackPad auto-repeat. Its 450/150 ms cadence
and timbre are approximations, **not OEM-confirmed**.

Original deterministic LF/HF/DUAL/Zoom sonar visualizations, real-time
training-clock picture-history rates and Stop; white line/marker, A-Scope
Normal/Peak, bottom zone, palettes 8/16, color bar, brightness and depth size,
illustrative Clutter, Color Erase, TVG, smoothing and simulated TX Power/Rate.
Manual §1.4 corrections now position DUAL LF-left/HF-right, Zoom-left with
normal sonar at right and NAV data left two-thirds with sonar right-third.
B18 has active synthetic Temp Graph, Navigation Data, Zoom Marker, Window Size,
Battery `NO DATA`, Color Bar and Header Info; exact OEM geometry is unverified.
ACCU-FISH/RezBoost/Bottom Discrimination do **not** become available merely
from a generic 600W/1kW selection; a named 525STID-PWD virtual fixture,
explicit instructor mounting and applicable conditions are required. Fish
sizes and seabed probabilities are **authored synthetic fixture data**.

ALARM1–5 have nested Setting/Alarm workflow, staged numeric teaching thresholds
and separate per-profile AND conditions; multiple profiles may coexist.
Physical keys silence an audible cause flag without discarding its visual
cause. The UI does not operate a physical beeper. NAV1/NAV2 require an explicit
instructor-owned synthetic position fixture and show missing/stale-data
states; MARK and waypoint list support selection, edit/erase confirmation,
go-to and protection of active destination, with source-graded capacity limits.
C11 `Data > NAV1/NAV2 Boxes` allows staged/cancelable/replayable individual
box choices. Source defaults are NAV1 STW/WIND and NAV2 DEPTH/TEMPERATURE/
TRIP/ODOMETER; absent environmental/receiver information remains `NO DATA`.
C05 Arrival activates from typed moving synthetic ownship plus active destination
using an unverified classroom radius. C13 Trip/Odometer integrates instructor
speed over world seconds; resetting Trip requires confirmation and preserves
Odometer. D10 has instructor-only low-battery/system-error cues, both labeled
SIMULATED and never represented as physical voltage or observed hardware codes.
Demo and Diagnostics/LCD Test/Restore are sandboxed; installed firmware stays
`null`.

Settings persist through browser reload via checked, versioned localStorage
codec and a canonical replay event; trainer reset clears session/world yet
retains device choices. D15 trainer lessons use a new-attempt event boundary
and a waypoint-count baseline so an old or failed MARK cannot earn a new score.
V12 binds each browser-initiated attempt to its **starting session hash**;
assessment reconstructs that replay prefix, rejects stale boundaries and
ignores required actions attempted while the panel was powered off, while
still allowing legitimate repeated practice.
Multi-device replay binds primary profile/scenario and inert observer identities
and versions, rejecting incompatible envelopes without inventing an AIS UI.
The test-only multi-replay schema is now **v3** and binds the named observer
stream's field/schema contract; old multi-v2 envelopes are not silently
reinterpreted. The FCV profile and canonical single-replay versions stay pinned.
D02 has a nested eight-slot training Range bank with independent
edit/cancel/commit; manual RANGE consumes the selected slot while Auto Range
remains independent. Exact OEM menu geometry and allowed values are unverified.
Historical profile11 used settings schema v10, V14–V16 used profile12/schema11,
V17 used profile13/schema12, V18–V20 used profile14/schema13, and
V21 used profile15/schema14. **Current V22 uses
F1-public-reference-16, settings schema v15**. Previous storage is
deliberately rejected, not automatically migrated, because stored
source/receiver availability, new conditional menu transactions, LCD
palette annotation display and lesson scoring cannot silently acquire
different replay semantics.
No installed firmware is inferred.
D05 now provides six distinct units categories with independent mathematical
display conversion; depth HR/pb remains `SOURCE_GAP`. D06 has bounded
instructor/training-only calibration controls (no actual transducer adjustment).
Phase7's inert observer consumes a named immutable synthetic world stream;
core replay event payloads are deeply snapshotted/frozen. D15 teacher scoring
now checks replay and rejects unrelated physical actions without inventing a
FURUNO endorsement.

### Explicit open and partial items

- **NOT_IMPLEMENTED:** D04 alternate-language resources and associated reboot
  behavior. The English-only Language item is intentionally disabled with a
  `RIGHTS_HOLD/SOURCE_GAP` explanation.
- **MENU_ONLY_PARTIAL:** C11 still lacks complete wind/bearing/heading
  variants, but selected `NMEA` Trip hides unavailable old `Own` values,
  synthetic destination projects source-marked `RANGE` and source-gated
  `TIME TO GO (SIM EST)`. D09 full Tankenmaru hardware behavior,
  partner Output/Pic Sync/Sub Clutter editing and real optional RF/video
  remain unavailable; the D15-gated **read-only** documented defaults are
  not an interface emulator. D14 external IEC/NMEA receive is unavailable;
  its synthetic fixture status now rejects invalid coordinates and
  distinguishes missing/fresh/stale with correct S/W hemispheres.
- **SYNTHETIC SUBSET ONLY:** A17, C05, C13, D02 and D10 now have bounded
  teaching workflows and targeted tests, but audio/repeat timing, Arrival
  radius/placement, true sensor distance, complete Zoom/B/L preset bank and
  diagnostic code/voltage remain SOURCE_GAP/SIMULATED_ONLY.
- **SUBSET, NOT COMPLETE:** B18 now projects Temp Graph, pane Window Size,
  Battery `NO DATA`, Header and Zoom Marker but the true OEM pixel geometry
  is unverified; advanced transducer results, Calib Zero Line Area,
  Bottom Detect/Level and the exact ALARM1–5 numeric values remain illustrative.
- Exact OEM menu ordering, hardware geometry, acoustic responses and source
  video frame timing still need stronger evidence. The two target viewports
  and POWER long-hold have Chrome test receipts. Real Chromium mouse
  `lostpointercapture` and CDP native touchCancel after active FUNC hold are
  also **PASS** at both viewport sizes; OS-window blur and physical hardware
  switches/touchscreens remain **NOT_RUN**.

## Authority, rights and safe-release policy

The 11-source ledger and primary official manual OME-23890-E underpin curated
written claims; YouTube entries remain metadata-only until actual timestamps
are audited. Proprietary PDF/video/photos/fonts are for restricted reference,
not copied into the runtime or published as simulated OEM assets. The classroom
profile is PUBLIC_REFERENCE, installed firmware UNKNOWN, hardwareValidated
false, assetLicenseClearance false. Both hardware matching and platform
distribution approval remain HOLD.

In this host, installed skill guidance (skills-router, ak-cook, ak-test and
ak-debug) was read and tasks were adapted using native Windows tools,
deterministic RED/GREEN tests, source inspection and actual Chrome input.
There is **no verified native `/ak-cook --auto --tdd --advice` run or
Kongming supervision receipt**. Unavailable Kongming/reviewer sign-off is
not simulated. The CLI `ak plan` provided actual parse/validate and Phase1
check results; noncompleted phases were not indiscriminately marked PASS.

## Next authorized engineering gates

The V12 implementation, exact RED/GREEN evidence, browser source manifest,
and schema compatibility decisions are recorded in
[the V12 engineering and QA report](../../plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-14-v12-replay-course-browser-integrity.md).
The available AgentKit CLI did not expose a `kongming` agent; there was no
native `--advice` supervision/phase GO, even though scoped verification passed.

The further V13 hardening and signed-off **scoped read-only technical review**
are in [the V13 TDD and Chrome integrity report](../../plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-14-v13-boundary-and-loaded-response-integrity.md).
That reviewer found no introduced Critical/Important problem in the V13
remediations, **not** a public course/release authorization or Kongming counsel.

Historical V14 source-backed development, **all 22 named plan task-unit statuses**,
exact TDD/Chrome outcomes and remaining rights gates are documented in
[the V14 engineering and 7-phase acceptance matrix](../../plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-14-v14-operator-source-ui-course.md).
There was **no separately verified new independent V14 reviewer or Kongming
approval**; the runtime refused to revive the sleeping CoS worker during
session transfer. Engineering evidence cannot remove those source/reviewer
gates, and 287 software tests do not mean 287 FCV functions.

The [V15 continuation and implementation receipt](../../plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-15-v15-c11-rotary-chrome.md)
records live RED/GREEN commands, Chrome source digest and remaining limitations.
It is a technical result, **not Kongming supervision or course/release GO**.
The [V18 D09 menu-reindex safety continuation](../../plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-15-v18-d09-menu-admission-safety.md)
records that original P1 correction, while the [V19 phone and desktop
Chrome acceptance report](../../plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/reports/continuation-2026-10-15-v19-phone-accessibility-browser.md)
holds the latest *current-state* metrics. Neither is a Kongming, OEM,
rights, reviewer-approved course or product-distribution release.

1. Expand per-feature negative/cancel/replay/source acceptance for D04/D09/D14,
   C11 heading/wind, Calib advanced submenus, exact Zoom/B/L ranges and
   alternate firmware branches without inventing installation identities.
2. Exercise OS-window blur mid-press and physical touchscreen control
   acceptance, then review panel geometry against lawfully viewable references.
   Chromium lostpointercapture/touchCancel now PASS in isolated browser QA;
   saved 1366×768 and 1920×1080 screenshots are reproducible.
3. Review and reconcile Appendix 1 and actual public video frames within
   rights policy, obtain independent reviewer approval of individual lessons;
   only then promote selected PUBLIC_REFERENCE_CONFORMANT rows.
4. Preserve the separate HARDWARE_TARGET plan for any future authorized
   physical-unit acceptance. No automatic upgrade to 100% or OEM status.
