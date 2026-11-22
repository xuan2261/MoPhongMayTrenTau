# FCV-588 PUBLIC_REFERENCE — V20 source/Chrome and phase gates

Date: 2026-10-15. The existing Windows workspace
C:\Work\MoPhongMayTrenTau has no Git repository. The localhost service
127.0.0.1:4173 (observed PID 36768) was preserved. The only active plan
is plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/plan.md.
Historical v1 and hardware-target plans remain preserved.

**Scoped result: Chrome V20 layout, interactions and source integrity PASS.
Complete OEM/manual conformance, course distribution, lesson reviewer
approval, hardware equivalence, restricted assets and release HOLD.**

## Pinned contract and exact runtime identity

| Contract | Observed value |
| --- | --- |
| FCV public profile | F1-public-reference-14 |
| Settings | schema13, storage key mophongmaytrentau.fcv588.public-reference.settings.v13 |
| Core/event/replay | f1-core-5 / schema5 / envelope5 |
| Scenario / world tick | version7 / 1000ms |
| Multi runtime | v3, typed inert training-observer-world-v1 |
| 31-file public source manifest SHA-256 | 5951b875cb2aca16e4d0b057964ae4a7bcba4db644c2f570823bfe03765c76bb |
| Release | HOLD |

The V19 manifest 7e6538fd... is historical. This continuation compared the
current SHA-256 of all 31 web/src assets independently with **both** V20
receipt inventories: 31/31 matched each; **zero mismatches**. Consequently
the previously captured browser evidence remains valid for unchanged bytes.

## Google Chrome V20 observed results

- Desktop receipt: docs/qa/FCV588_CHROME_VIEWPORT_V20_RECEIPT.json
- Mobile receipt: docs/qa/FCV588_CHROME_MOBILE_V20_RECEIPT.json

| Chrome viewport | Status | Response bodies attested | Loaded paths | Aggregate SHA-256 of browser bodies |
| --- | --- | ---: | ---: | --- |
| 1366×768 | PASS | 58/58 | 29 | 56f14466be3de126d94803386bcb4869b73d2b727cbfa6420c22c8a82f2e1c8a |
| 1920×1080 | PASS | 58/58 | 29 | e9518108f5bbb009d6a61a013665e06f1b8528dc3eb0c7b527e52afae23c527f |
| Mobile 360×800 | PASS (refreshed QA harness) | 29/29 | 29 | ae5969a3bb3b47853371caa76d4ac2bfe7617c77dfa615fda0d48e928b989a73 |
| Mobile 390×844 | PASS (refreshed QA harness) | 29/29 | 29 | 7f7b467973fbfa6a00b4d959ddebbf61bc02148e94cdd85e02e52c59148f9f0d |

Both runners: preflight SOURCE_TREE_IDENTITY_PASS; postflight
SOURCE_TREE_STABLE_PASS. No JavaScript console errors, HTTP/network failures
or external requests were recorded in either context. Each actual Chrome
requestfinished body was SHA-256 checked, not inferred from a server PID.

Desktop scenarios include boot, POWER hold, TrackPad keyboard repeat, native
pointer cancellation, GAIN/MODE rotary detents, paused-world UI clock,
D02 persist/reload/replay, D09 Tankenmaru fixture revoke amid FUNC edit,
C11 Data source/NAV2, bounded long menus, source HOLD states, D10 synthetic
faults and a D15 lesson. Phone scenarios include native touch single-event
TrackPad input, last selected System row inside LCD, all 12 physical and
16 D15 instructor hit targets (at least 44px) and response integrity.

All five V20 screenshots under docs/qa/screenshots/ were opened for visual
inspection: desktop 1366, desktop 1920, 1920 NAV2 configured, phone 360,
phone 390. They are full-page original simulator screenshots, not OEM
imagery. Mobile deliberately stacks the 480×640 logical LCD and controls
for student touch access and states that the layout is not real bezel shape.

## Verification performed and reused

- Earlier completed V20 npm run check: **289 PASS / 0 FAIL**, exit 0.
  Source bytes are unchanged. This was reused, not falsely claimed as a new
  full-suite run within the resumed continuation.
- Independent read-only review found a *QA-harness provenance gap*: the
  initial mobile V20 receipt preceded a final edit to the imported shared
  response-verification helper. No public runtime digest had drifted, but
  the mobile run needed a newer receipt with explicit harness evidence.
- **TDD RED -> GREEN:** two new Python cases first failed on missing
  mobile-runner/helper source fingerprints. The mobile QA tool now verifies
  its exact shared helper path, records both script SHA-256 values before
  browser actions, then rechecks those same bytes before PASS. After
  implementing this fail-closed guard, **6/6 Python source identity/response
  tests** and **14/14 Node browser contract tests** PASS.
- Refreshed actual Chrome mobile V20 runs at **360×800 and 390×844** PASS
  with 29/29 source bytes, no JS/request errors and common runtime manifest.
  The resulting receipt reports
  qaHarnessSourceIdentity.status=PASS_UNCHANGED, matching actual scripts:
  mobileRunner=910f46bec54cb2b1e1d5b024228157bbded5fb946d11472794475ec30f2c12a4;
  sharedChromeVerifier=db3009f0aa21ef007598b3e8eb011f9fa81e28f6ccf93dcdf53fd7d8725b4439.
- Fresh read-only source-file digest check: **31/31 PASS against each V20
  receipt**.
- Fresh node tools/verify_public_runtime_assets.mjs: **PASS** for 31
  recursive original web/src assets (no forbidden extensions or symlinks).
- Fresh node tools/build_fcv588_public_acceptance.mjs --check:
  **PASS**, 64+D15 register has no drift and claims remain HOLD.
- Fresh ak plan validate: valid=true; ak plan parse: 7 phases,
  50 checklist entries, 10 checked, 20%, one phase completed.
- Unchanged V20 desktop Chrome was not unnecessarily rerun. The **mobile**
  QA case was rerun to close shared-harness provenance on the same runtime.

No restricted manual, firmware dump, OEM photo, video or real marine
transducer data was copied into runtime. Packaging hygiene is not a
redistribution license.

## Operator and classroom scope — no false promotion

| Checkpoint status | FCV operator | Instructor D15 | Scope |
| --- | ---: | ---: | --- |
| OPERABLE_SYNTHETIC_SUBSET | 60 | 1 | Limited original state/display behavior, not full OEM fidelity |
| MENU_ONLY_PARTIAL | 3 | 0 | C11, D09, D14 |
| NOT_IMPLEMENTED | 1 | 0 | D04 |
| Total | 64 | 1 | 65 claim decisions HOLD |

Partial C11 includes synthetic NAV/data/source selectors but not the full
OEM data-box/source oracle. D09 Tankenmaru is default SOURCE_GAP/HOLD;
the D15 virtual option fixture never represents installed hardware,
an RF interface or genuine picture output. D14 IEC/NMEA remains a sandbox
status/typed-input projection, not a connected marine receiver. D04
alternate language/reboot requires missing permitted source/rights evidence.
Independent per-row positive/negative/cancel/replay/browser/source review is
not established by a category-level smoke pass.

## Active seven-phase acceptance reconciliation

| Phase | Status | Checklist | Why not advanced |
| --- | --- | ---: | --- |
| 1 Reference/profile/rights | DONE | 10/10 | Public reference inventory frozen |
| 2 Physical panel/controls | OPEN | 0/7 | Task-level oracle and complete phase acceptance not documented |
| 3 Five menus/configuration | OPEN | 0/7 | Complete per-entry staged/cancel/source matrix not approved |
| 4 Sonar/advanced functions | OPEN | 0/7 | Hardware/firmware/signal conformance source gaps |
| 5 Alarm/NAV/System | OPEN | 0/7 | C11/D09/D14 partial and D04 rights HOLD |
| 6 Course/conformance | OPEN | 0/7 | Every feature/lesson needs receipts and reviewer/rights approval |
| 7 Shared world/future devices | OPEN | 0/5 | Other device models/variants are unresolved |

The plan has **7 phases, 22 named Task units and 50 checklist entries**.
10/50 checked (20%) is the correct evidence-limited file-owned state.
Substantial implementations exist beyond Phase1; they are not a substitute
for the full phase criteria, and no boxes were blindly checked.

No targetable dedicated Kongming capability was established in this host;
its approval must not be invented or replaced by a normal code reviewer.
The Failure Protocol remains authoritative on any future unexpected
failed Verify. The two harness-test failures were **intentional RED**
preimplementation observations; no unexpected final Verify failure occurred.

## Next feasible acceptance work

1. Resolve only *current-source reproduced* high-severity behavior gaps
   with focused TDD RED -> GREEN -> REFACTOR, then revalidate affected
   Chrome contexts and SHA if runtime changes.
2. Attach per-feature acceptance receipts, source provenance and reviewer
   decisions before upgrading any claim status or phase gate.
3. Resolve the missing C11/D09/D14 and D04 source/right/capability decisions
   without inventing firmware, real IEC/NMEA or optional physical devices.
4. Preserve release HOLD until independent lesson, rights and source-review
   approval is evidenced. Synthetic QA is never hardware equivalence.

No Git, PR, deployment, new plan or real instrument interaction was used.
