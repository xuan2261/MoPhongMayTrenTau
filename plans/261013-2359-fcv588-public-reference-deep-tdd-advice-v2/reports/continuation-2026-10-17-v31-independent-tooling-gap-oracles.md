# V31 independent tools + future acceptance oracles — 2026-10-17

**Project:** MoPhongMayTrenTau / FCV-588 Public Reference F1 v2

**Disposition:** IMPLEMENTED AND EXECUTED **INDEPENDENT QA TOOLING ONLY**;
PHASE 2 V31-QA-01 STOP / PRODUCT RUNTIME UNMODIFIED / NO RELEASE.

## Authority and constraints

- Active seven-phase plan: `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/plan.md`.
- Recorded Verify failure: Phase2 Task2.3 `docs/qa/FCV588_V31_CONTROL_UNIT_GREEN.log`,
  52/53 passing, original SHA-256 `93cf5389a6f3fad2dc4c5f420ea2f0943f3e7d85e3831a39589a8a938064f4c9`.
- AgentKit CLI `3.0.0-beta.31`: `ak codex-agent-runtime serve --list-only --json --no-interactive`
  discovers Kongming **name** among 16 agents, but no connected callable Kongming
  route or verifiable counsel was available to this chat. `ak agents list` returned
  an empty installed-agent array. Neither installer, registration nor MCP bridge was run.
- The exact phase Failure Protocol still applies. We did **not** correct
  `test/fcv588-public-control-presentation.test.mjs:31-35`, rerun the failed Verify,
  change the supervisor contract, or make a new product runtime change.
- The 2026-10-17 gated fidelity audit remains at
  `reports/continuation-2026-10-17-v31-gated-fidelity-audit.md`.

## Implemented independent artifacts (not runtime modifications)

| Path (project-relative) | Purpose | SHA-256 |
| --- | --- | --- |
| `tools/fcv588_lcd_boundary_audit.mjs` | Deterministic offline source-anchor/phase/65-claim/runtime SHA scanner; never imports or invokes product reducer/Verify | `86f47f6db81b7b320274897989e755f34a21b156396a2a75066f95585c451e92` |
| `docs/research/FCV588_V31_LCD_BOUNDARY_ORACLE.json` | 53 tracked LCD/face/instructor source anchors + source-backed DEMO exception and post-gate acceptance contract | `4499a2a6d21283158ca40d748e0a00b7287a53fb2a777623a3e6b1bcd0166aeb` |
| `docs/research/FCV588_V31_C11_D09_D14_D04_ACCEPTANCE_VECTORS.json` | 22 future vectors: C11=6, D09=6, D14=6, D04=4; source, owners, limits and NOT_EXECUTED status | `a9719fadeec9316edb55a3860a220f1e920d553189ec6948c520af4bb4e6f71c` |
| `docs/qa/FCV588_V31_INDEPENDENT_BOUNDARY_BASELINE_2026-10-17.json` | New *once-only* static baseline, actual source anchors/lines/checkpoint digests and HOLD state | `13d2e5b6025a6a9ed19dceacf1ffc7f2b666385193dcdcd96738a6776db5282f` |
| `docs/qa/FCV588_V31_IMAGE_READBACK_2026-10-17.json` | Twelve previously saved PNGs checked for file bytes, PNG IHDR and viewport sizes; not a new browser run | `cdbeb5ba728eebf793166872a5c327bbc936c44fbe042cdca05ea2d79c2e5163` |

## Checks actually executed

| Check | Actual result | Meaning |
| --- | --- | --- |
| `node --check tools/fcv588_lcd_boundary_audit.mjs` | exit 0 | Syntax of new independent source-audit tool only |
| `node tools/fcv588_lcd_boundary_audit.mjs --self-test` | exit 0, six pure assertions | Test of new scanner helper, **not** Phase2 product Verify |
| `node tools/fcv588_lcd_boundary_audit.mjs` | exit 0; 53/53 anchors found, no source mismatches | Source lexical baseline, **not** UI pixels or DOM coverage |
| `node tools/fcv588_lcd_boundary_audit.mjs --write-baseline` | exit 0; writes a new QA receipt using `wx` (will not overwrite) | Proof of new independent QA artifact and source identity |
| Original V31 runtime 35-file manifest check | 35/35 SHA-256 MATCH | Protected application bytes unchanged |
| Saved V31 operator GREEN screenshot readback | 12/12 PNG signature/dimensions match on 1366x768,1920x1080,360x800,390x844 | Existing image integrity, **not** new Chrome screenshot/visual acceptance |
| V31 Node/Python/full Chrome/FUNC/config/LCD regression | **NOT_EXECUTED** | Forbidden to bypass unresolved Task2.3 Verify failure |

Source-boundary baseline: 53 anchors = **46 relocation candidates**,
**4 require source/semantics review**, **1 manual-backed [DEMO] exception**,
**2 known external/latent explanatory paths**. Counts are lexically tracked source
locations, not 46 demonstrated distinct UI bugs. A clean future LCD requires actual
Canvas/DOM and per-viewport verification after authorization; absence of anchors
alone is not sufficient for OEM fidelity.

## Four scoped gaps — non-fictional starting point

- **C11:** NAV1/NAV2 source-selected boxes, commit/cancel, typed synthetic
  bearing/course/waypoint-range/time-to-go are partial; missing/stale/untyped
  input must fail closed to NO DATA. No real NMEA position/speed is inferred.
- **D09:** optional virtual Tankenmaru gate controls On/Off and NMEA mutual
  exclusion. Manual-default read-only Output Off/Pic Sync Yes/Sub Clutter 4
  is not a real partner display or editable RF engine. Revocation must cancel
  pending drafts and cannot imply a hardware grant.
- **D14:** NMEA selection/status is receive-only synthetic status with
  transport NONE, not serial/UDP/WebSerial/WebUSB or vessel I/O. Missing,
  invalid, future-tick, stale and option-suppressed data must not leak.
- **D04:** Language appears in both menu paths, English-only and disabled
  with rights/source gap. The official product page advertises a multilingual
  Operator's Guide but that neither supplies licensed UI strings nor proves
  exact installed firmware language choices or restart behavior. Keep D04
  NOT_IMPLEMENTED until rights and per-revision reference are established.

## Source corroboration and limits

- Official FURUNO FCV-588 product page, checked 2026-10-17:
  https://www.furuno.com/en/products/fishfinder/fcv-588/index.html
  (VGA 480x640, display modes and conditional support for advanced sonar).
- FURUNO USA support page, checked 2026-10-17:
  https://www.furunousa.com/en/support/FCV588
  (FCV-588 product supports NMEA0183; this does not authorize or provide a
  live real equipment transport in the training app).
- Model-specific behavior references remain `PUB-FCV-001`/`PUB-FCV-009`/
  `PUB-FCV-011` as graded in the local source register; do not import UI
  descriptions from FCV-38, FCV-600/800 or FCV-1900 as FCV-588 facts.
- Manual §2.8 was already curated by the project as supporting a conditional
  operator `[DEMO]` indicator. Do NOT automatically remove it; exact OEM
  placement/typography still lacks measurement. Publisher PDFs/image bytes
  were not extracted or redistributed in this work.

## Acceptance and next trigger

- **Actual plan state unchanged:** 14/50 checked criteria, 6/22 accepted named
  tasks, Phase1 alone accepted; all 65 claims and release HOLD. Hardware
  fidelity percentage is unmeasured; 100% remains a long-term target.
- **P0 decision required:** verifiable native Kongming counsel for the
  retained V31-QA-01 evidence OR explicit user approval to amend the
  Phase2 supervisor requirement. A general instruction to continue is
  not authorization to substitute a different worker for Kongming.
- **After the gate:** change only incorrect Auto/Manual test fixture with
  TrackPad-right Manual staging, preserve original failed log, run targeted
  + full Node/Python/Chrome V31 regression and source/body/harness SHA receipts.
- **Largest next integrated product batch:** split operator LCD display from
  external instructor metadata; move 46 tracked training copy candidates
  without deleting safety warnings, preserve source-backed [DEMO], then
  source-grade C11/D09/D14/D04 UI and execute all four-viewport journeys.
- No hardware connected, Git initialized/commit, install, release, publish,
  source manual reprocessing or work on future HOLD devices in this batch.
