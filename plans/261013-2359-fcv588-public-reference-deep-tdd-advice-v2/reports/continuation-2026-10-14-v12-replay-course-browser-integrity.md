# FCV-588 V12 — replay, D15 course and browser source-identity checkpoint

**Observed on 2026-10-14** in the existing Windows workspace
`C:\Work\MoPhongMayTrenTau`. The canonical implementation is still
`F1-public-reference-11`, scenario v7, `f1-core-5`, event/replay schema v5,
and FCV settings schema v10. The **test-only multi-device replay** contract
advances independently from v2 to **v3**. No earlier V11 receipts or plan
directories were deleted or reinterpreted.

**Disposition:** scoped integration verification PASS; Phase2–7 source-grade
acceptance and individual course/public distribution approval **HOLD**.
There is no `HARDWARE_VALIDATED`, OEM endorsement, installed firmware identity,
real transducer, live NMEA, or rights-clearance evidence here.

## Implementation and real RED/GREEN provenance

1. **Inert observer event ownership (Phase7).** Two new regression assertions
   exposed (8 pass/2 expected RED) a shallow-copied observer events array and
   acceptance of arbitrary extra `inspect` fields. The secondary event now
   uses one bounded, deeply snapped, frozen canonical input in both the
   observer and portable history; only exactly `kind` and `label` are
   accepted. The focused tests became 10/10 GREEN, with replay equality.
2. **D15 attempt causality.** Two tests exposed historical-state credit from
   a different session with the same event count, and false credit when
   required RANGE inputs occurred while POWER was off (10 pass/2 expected
   RED). The teacher UI now captures a `startSessionHash` at lesson start.
   Scoring reconstructs the prefix replay, validates that fingerprint and
   waypoint baseline, and checks POWER before crediting each required action.
   An initial overly restrictive rule also rejected *legitimate repeated
   practice*; the existing regression test identified this (21/22), and the
   incorrect rule was removed rather than weakening that existing test.
   Final focused course + observer tests: 22/22 GREEN at this checkpoint.
3. **Observer stream contract v3.** An additional RED test exposed that the
   multi-envelope fingerprint bound only observer ID/revision, not the named
   stream. The canonical `INERT_OBSERVER_STREAM_CONTRACT` now binds
   `training-observer-world-v1`, schema 1, and field names `simTick`,
   `bottomDepthM`, `sourceClass` to `observerConfigFingerprint`. Multi replay
   version increased to **3**, explicitly rejecting old multi-v2 envelopes;
   compatible *single-device* replay migration remains opt-in. Combined
   core/multi/event-ownership tests: 26/26 GREEN.
4. **Browser served-tree verification (Phase6).** Static contract tests first
   failed (7/8) before the new mandatory preflight and again before the
   postflight source-stability/failure-receipt guard. The runner compares SHA-256
   of **every eligible runtime asset** under `src/` and `web/` with the
   corresponding localhost response, rather than trusting a port/process
   name. The helper's intentional stale-byte negative assertion raises an
   error. A preflight failure writes a `FAIL_QA` receipt instead of leaving an
   earlier `PASS` current; a drifted/failed postflight also denies PASS.
   Fresh Playwright contexts must start with **zero localStorage keys**.

Actual final `npm run check`: **255 tests / 255 pass / 0 fail, exit 0**.
This includes Node syntax, state, replay, input, source security, browser
runner contracts and unit/integration regressions. The count does not mean
255 operator functions or manufacturer acceptance checks.

## Real Google Chrome V12 receipt

Runner: `python tools/fcv588_chrome_viewport_acceptance.py` against the
already-running server on `127.0.0.1:4173`; it used real isolated headless
Google Chrome and did not manipulate the user's ordinary Chrome tabs.
Receipt: `docs/qa/FCV588_CHROME_VIEWPORT_V12_RECEIPT.json`.

- Both source preflight and postflight: `PASS`, **30 served original runtime
  files byte-matched**. Manifest SHA-256:
  `5d4edb397d94c11110e892f1736fe387e875d5f237cff5478fb69895f3147ac1`.
  The profile file itself returned `F1-public-reference-11`.
- Viewport **1366×768 PASS**; viewport **1920×1080 PASS**, measured by actual
  browser `innerWidth`/`innerHeight`. No horizontal document overflow; Canvas
  logical resolution is 480×640. In both fresh contexts,
  `preScenarioStorageKeys=[]`.
- Physical control tests PASS: POWER start/long hold, keyboard TrackPad repeat,
  real Chromium pointer `lostpointercapture` and CDP native `touchCancel`,
  MODE 6-second UI selector while world time paused, D10 instructor fault
  toggles, D02 range-bank commit and deterministic replay, teacher reset and
  versioned-settings reload. At 1366×768, D15 RANGE lesson passed; at
  1920×1080, NAV2 Box1 became `SPEED (STW)` and showed the correct no-source
  state. **56 captured localhost requests per viewport, 28 after reload;
  zero JS console errors, request failures or escaped/nonlocal URLs**.
- Verified saved PNG files:
  `docs/qa/screenshots/fcv588_public_v12_1366x768.png`,
  `docs/qa/screenshots/fcv588_public_v12_1920x1080.png` and
  `docs/qa/screenshots/fcv588_public_v12_1920x1080_nav2_configured.png`.
  Captures use `full_page=True`, so PNG height may exceed viewport height.
  Original Canvas/DOM/CSS mock artwork was visually inspected for the smaller
  layout: it is **not** a factory faceplate or pixel-equivalent OEM LCD.

## Other final verification

- Reference archive: `PASS_AVAILABLE_ASSETS_WITH_GAPS`, 24 PDF, 2 ZIP,
  197171462 bytes, `validation_failures=[]`, **three documented acquisition
  gaps**; no redistribution rights inferred from these hashes.
- `python tools/build_fcv588_public_trace.py --check`: PASS for 64 operator
  features plus separate D15; feature register `--check`: PASS for 65 rows.
- `node tools/build_fcv588_public_menu.mjs --check`: PASS; public acceptance
  generator `--check`: PASS. Current coarse distribution is **61 operable
  synthetic subsets, 3 menu-only partial (C11/D09/D14), 1 not implemented
  (D04)**. All 65 feature claims remain **HOLD**.
- `ak plan validate ... --json --no-interactive`: `valid:true`;
  `ak plan parse ... --json --no-interactive`: 7 phases, 50 checklist entries,
  **only Phase1's 10 checked**, 20%. The 22 detailed `### Task` units remain
  distinct from that count. No Phase2–7 checkbox was manufactured.

## Advice protocol, boundaries and remaining acceptance gaps

The installed `ak-cook`/`ak-test` guidance and advisory reference were read,
then equivalent source/test operations were carried out with actual Windows,
Node, Python and Chrome tools. CLI `ak 3.0.0-beta.24` listed **zero agents**;
no addressable `kongming` or native `/ak-cook --auto --tdd --advice`
dispatch was available. The unexpected D15 re-practice regression was
reported and corrected narrowly, but **no Kongming counsel or supervised
phase-gate approval is claimed**. A read-only CoS reviewer finding is not a
substitute for that supervision or for independent OEM/rights review.

Remaining primary blockers: D04 language/reboot source and distribution
rights; D09 proprietary Tankenmaru behavior; D14 IEC/NMEA receive contract
(no permitted real ship I/O); remaining C11 wind/bearing/heading oracle;
hardware-specific menu/sonar/option geometry, OS-window blur under held input,
true touchscreen/rotary hardware, reviewed source video timestamps, per-row
positive/cancel/negative/replay/lesson evidence, and independent reviewer
acceptance. Future AIS R5, J2000, NS4000 and other device variants remain
separate model-identity HOLDs. No Git repository was created, no commit/push,
no deployment, no copied proprietary OEM media and no real vessel connection.

**Next verification:** source-review specific legal/public oracle gaps and
complete per-feature conformance/rights/reviewer receipts before checking
Phase2–7 or changing any `PUBLIC_REFERENCE_CONFORMANT` release decision.
