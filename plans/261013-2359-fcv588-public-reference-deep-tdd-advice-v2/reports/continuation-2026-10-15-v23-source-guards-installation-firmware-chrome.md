# FCV-588 V23 — typed source guards, Installation NMEA, firmware-unknown preview

**Date:** 2026-10-15. **Workspace:** `C:\Work\MoPhongMayTrenTau`.
**Only execution plan:** `plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/plan.md`.
The workspace has no Git repository. No Git init, commit, push, release,
deployment, real NMEA/IEC connection or physical transducer was used.

**Verdict:** The bounded V23 public-reference implementation and all finally
completed Node, Python and real Google Chrome checks are **PASS**. The project,
all 65 individual feature claims, release, legal reuse of OEM media, installed
firmware and hardware equivalence remain **HOLD**. This is not a FURUNO
conformance, course approval or independent-final-review certificate.

## Version and source identity

| Boundary | Verified V23 value |
| --- | --- |
| FCV synthetic profile | `F1-public-reference-17`, not installed firmware |
| Settings codec/storage | schema `16`, `mophongmaytrentau.fcv588.public-reference.settings.v16` |
| Core/event/replay | `f1-core-5` / `5` / `5` (unchanged) |
| Scenario/multi-device | scenario `7`, multi-runtime `3` (unchanged) |
| Chrome desktop/mobile common 32-file `web/src` manifest SHA-256 | `104c6cebd9b20792be376565d9e93c3a0cd3f4226e0abc1718ab75fbf39feba0` |
| Release/source rights | HOLD / not cleared |

Older `profile16/settings15` session and local settings are deliberately not
accepted as the new profile: behavioral meaning of the display/source guards
changed. Historical V22 receipts and PNGs are preserved, not relabeled.

## Observed behavioral TDD RED → GREEN

| Domain | Actual RED behavior | Source fix and targeted GREEN evidence |
| --- | --- | --- |
| Phase 4, B18 | Malformed fixture latitude 91 or longitude -181 was accepted by the Temp Graph path as `SYNTHETIC_DATA`, contradicting the NAV and D14 in-range position validation | `display-widgets.mjs` now uses the already-defined `isValidSyntheticPosition` predicate. Invalid/external/stale position -> `NO_DATA`; valid typed Own sample still drives synthetic Temp Graph; replay unchanged. `test/fcv588-public-display-widgets.test.mjs` |
| Phase 5, C11/B18/D14 | C11 displayed `-4.0 kn (SIM)` for negative STW, B18 supplementary NAV displayed `-9.0 kn (SIM)`, and D14 exposed negative own speed although its source status was `NO_TRAINING_DATA` | Shared nonnegative finite speed predicate in navigation; calibrated speed invalid -> null; D14 `speedKn` also masks NMEA-selected Own sample. Zero is valid, NMEA remains disconnected, position/temperature independent, typed replay unchanged. `test/fcv588-public-data-source.test.mjs`, `test/fcv588-public-display-widgets.test.mjs`, `test/fcv588-public-receiver-status.test.mjs` |
| Phase 3, D09 | System hid NMEA when virtual Tankenmaru was On but §4.10 Installation still listed NMEA, contradicting the training conditional menu oracle | Installation now hides its NMEA row while virtual Tankenmaru is On and restores it on Off. Actual reducer sequence and deterministic replay tested by `test/fcv588-public-system.test.mjs`; this remains a virtual instructor-granted option, not hardware-installed proof. |
| Phase 4, B19 | `Display > Colors` offered 8/16 with no operator-visible caveat that the installed firmware version is unknown | Row explicitly reads `Colors · SIM`, sourceStatus=`TRAINING_PALETTE_PREVIEW_FIRMWARE_UNKNOWN`; 8/16 ORIGINAL training palette remains operable, without asserting firmware v2.01 entitlement or OEM RGB. `test/fcv588-public-display.test.mjs` |

The tests were first run against the actual prior behavior and observed
assertion failures, then made GREEN by code changes; RED was not simulated
by a missing import or weakened expected result. Existing good source guards,
MENU semantic selection, installed-option source HOLD and event ownership were
not reimplemented. Independent read-only worker-8 identified the D09 and
B19 concerns; worker-9 was not revived, so no independent final GO is claimed.

## Full integrated verification

- `npm run check`: **305/305 PASS, 0 FAIL, 0 skipped, exit 0** (V22: 299).
- `python -m py_compile` for desktop and mobile Python Chrome runners: PASS.
- `python -m unittest discover -s test -p test_fcv588_chrome*.py -v`:
  **7/7 PASS** (response-body integrity, swapped-byte rejection, missing
  response and exact runner/helper source identity).
- `node tools/verify_public_runtime_assets.mjs`:
  **32 recursively scanned original public assets PASS**; no restricted vendor
  media or symlinks in exposed trees.
- Public trace generator `--check`: **64 operator + one D15**, claims HOLD.
- Menu generator `--check`: **67 entries**, match runtime source.
- Implementation-status generator `--check`: PASS, 65 decisions HOLD.
- `ak plan validate ... --json --no-interactive`: `valid=true`.

The first full Node Verify after profile bump had exactly one detected drift:
the derived implementation-status JSON still named `profile16`. This was
remedied by running the existing source-derived status generator, not by
changing or suppressing its assert. A subsequent full check passed 305/305.
The archive/manufacturer files were not changed or re-fetched. Prior verified
manual SHA-256 is now correctly referenced in `docs/evidence/FCV-588.md`,
without converting archive integrity into distribution rights.

## Real Google Chrome Windows V23

The real `C:\Program Files\Google\Chrome\Application\chrome.exe` was driven
by isolated Python Playwright contexts against the current local-only
`http://127.0.0.1:4173/` static server. On handoff resumption the previous
server was no longer reachable; a fresh local server was started, without
terminating an existing process. Every original `web/src` file was compared
with the **HTTP response body bytes actually loaded by Chrome** and with
pre/postflight source SHA-256, not inferred from HEAD/PID alone.

| Exact viewport | Result | Chrome response bodies verified | Distinct loaded paths | Body aggregate SHA-256 |
| --- | --- | ---: | ---: | --- |
| Desktop 1366×768 | PASS | 60/60 | 30 | `67d9271ef5ec303b75a05b1bf93925650b4927aa5cd7ab714e513586f2e1085e` |
| Desktop 1920×1080 | PASS | 60/60 | 30 | `ed8438ca116baee73c883e724be25cd769b9d8173887cf31895b777dbfbe49af` |
| Mobile 360×800 | PASS | 30/30 | 30 | `8db366bce65b3f1b968bfa72920eb8f8321d8bf66da55028eb5aa286791e4133` |
| Mobile 390×844 | PASS | 30/30 | 30 | `6d2ec72af9caed60f0c160cc58d862cda1af293f3b7a622aa82630f108b69471` |

Both receipts have `SOURCE_TREE_IDENTITY_PASS`, `SOURCE_TREE_STABLE_PASS`,
`qaHarnessSourceIdentity.status=PASS_UNCHANGED`, zero console errors, zero
network failures and zero unexpected external origins. The same manifest
`104c6ceb...39feba0` was attested on both contexts.

- Desktop: `docs/qa/FCV588_CHROME_VIEWPORT_V23_RECEIPT.json`.
- Mobile: `docs/qa/FCV588_CHROME_MOBILE_V23_RECEIPT.json`.
- Actual desktop/shared Python runner SHA-256:
  `c55837e359713e1ef848ee7478a912ba4a296ed816cc2d5c4d3491c681099f6f`.
- Actual mobile runner SHA-256:
  `21e83849f52d8e2c33aeb79fa113ccc58e27513665c6a0b7eea0d2c34205c454`.
- Nine new V23 full-page PNGs are present under `docs/qa/screenshots`;
  desktop 1920 White, mobile 390 White and mobile 390 Blue were actually
  opened for visual inspection. The phone's responsive stacked panel remains
  training-only, not an OEM geometry measurement.

**Chronology caveat:** One initial desktop browser invocation returned
`FAIL_QA` despite passing source pre/postflight because Playwright's Chrome
headless launch exited immediately (`Target page, context or browser has been
closed`, browser exited code 0, no viewport executed). This was an observed
browser-launch failure, *not* a PASS and not attributed to app behavior. No
source edits were made to work around that launch. The mobile Chrome invocation
then passed, and a subsequent desktop invocation with the same script/source
completed both exact viewport runs and replaced that V23 output with the final
successful receipt. This chronology is documented rather than claiming the
first browser attempt passed.

## Actual plan gate reconciliation and remaining dependencies

Plan v2 validation remains `valid=true`, with **7 phases, 22 named Task
headings, 50 checklist entries, 14 checked (28%)**. Phase 1 alone is fully
accepted (10/10). Phase 2: 2/7; Phase 7: 2/5; Phases 3–6 remain 0/7 each.
Six of 22 named Task headings are accepted from the existing source-linked
reconciliation; these new verified fixes are *subtask progress*, not proof of
the remaining whole-phase acceptance gates. No checklist was checked on
the strength of passing tests alone.

- Phase 2: provisional OEM timing, VRM behavior, measured front-panel
  positions/ratios, exact menu label/color geometry and lawful source
  comparison still need stronger evidence.
- Phase 3: full Appendix 1 menu semantics and option/firmware branches remain
  unverified; the D09 Installation discrepancy fixed here is only one gap.
- Phase 4: hardware firmware v1.05/v2.01 and acoustic/option calibration are
  unknown. The 8/16 preview is now prominently labeled synthetic.
- Phase 5: complete source-dependent C11, D09, D14 and D04 behaviors remain
  partial/unimplemented as the feature matrix explicitly records.
- Phase 6: D15 five lessons remain training-only and lack independent
  instructor/course approval and authenticated anti-cheat guarantees.
- Phase 7: no physical device interfaces or future-device variant inference;
  historical multi-device replay migration and source-rights/target-controller
  identification remain open.

**Feature breakdown stays:** 60/64 operator `OPERABLE_SYNTHETIC_SUBSET`,
three `MENU_ONLY_PARTIAL` (C11, D09, D14), one `NOT_IMPLEMENTED` (D04);
D15 instructor synthetic subset. All 65 claim decisions **HOLD**. There is
no authoritatively obtained independent final reviewer GO or Kongming
supervision. Future implementation must continue against this sole plan,
rerun relevant RED→GREEN, and advance acceptance only with evidence rather
than treating this V23 checkpoint as project completion.
