# V34 canonical post-integration Node failure — GPT-6 supervisor GO/NO-GO

## Exact failure and stop

Date: 2026-10-18. After a SHA-matched eight-file web-only V34 integration,
28/28 V34-specific Node assertions passed. The full command `npm run check`
then exited 1: **433 tests / 424 PASS / 9 FAIL / 0 skipped**.
The intact full output is `docs/qa/FCV588_V34_CANONICAL_FULL_NODE_20261018.log`,
SHA-256 `245da2bd7ddb118b211251134cf371608ec9fcd9785d41bf4781befbbc08c05b`.
The process STOPPED before Python/Chrome, as required by the user-approved
GPT-6 supervision amendment. The pre-integration V31 log, V34 staging
evidence, source manifest and unsuccessful run remain preserved.

## Root cause for each failed contract

The following former V29–V31 **presentation tests** still required
training/provenance terms to be painted on a physical/OEM-looking LCD.
The V34 change intentionally preserves those warnings in the separate
instructor UI instead. All other tests, including the new 28 source-bound
V34 checks, passed. There was **no new failing reducer, session, hardware,
persistence or replay assertion**.

| Failed test location | Old hard-coded expectation | Actual V34 contract and retained proof |
| --- | --- | --- |
| `fcv588-public-browser.test.mjs:127` | LCD projector literal `[HOLD]`, `[N/A]` | OEM-looking rows have no invented teaching badges; `disabledReason`, `aria-disabled`, `sourceStatus`, and external teacher warning remain |
| `fcv588-public-config-presentation.test.mjs:153` | Installation Language `[HOLD]` on LCD | Language remains disabled, rights reason retained in `note` and explained off-face |
| `fcv588-public-config-presentation.test.mjs:184` | Vietnamese `Chưa có giá trị lưu` on LCD | Missing stored value represented as bounded `--` while `committedValue` remains null |
| `fcv588-public-display.test.mjs:65` | Pale-on-White protection for legacy training NAV footer pixels | Footer removed entirely from LCD; NAV heading and values still use `contrast.navHeading`, `contrast.navValue` |
| `fcv588-public-func-presentation.test.mjs:100` | FUNC help rendered through LCD `dialog-footer` | FUNC choice row remains, help/source now in `publishInstructorGuidance` outside device |
| `fcv588-public-lcd-presentation.test.mjs:109` | LCD `Language [HOLD]`, `Shift [N/A]` | No invented badges; row `disabled`, source `reason`, and dynamic option filtering retained |
| `fcv588-public-range-bank.test.mjs:141` | LCD `RANGE TRAINING` badge | Settings projector retains source-specific §2.2 explanation; teacher panel displays it |
| `fcv588-public-receiver-status.test.mjs:165` | `NO REAL RECEIVER` painted on device | LCD gives `NMEA: OFF` and typed Own values or NO DATA; instructor explicitly says physical OFF / Transport NONE |
| `web-layout.test.mjs:33` | `SYNTHETIC · NO LIVE RECEIVER` and `ZOOM: · SIM` painted in Canvas | Typed source/status projection and external explanation remain; zoom display remains source-labeled outside LCD |

**No evidence suggests that reverting V34 LCD separation to satisfy these
tests would be correct.** That would violate the explicit user contract to
keep non-OEM teaching text outside the physical face, and would regress the
successful V34 staging/visual and independent review findings.

## Supervisor decision — GO, test-contract migration only

Update the above nine legacy assertions to verify:
1. The specific **same safety/source/capability meaning remains observable
   off-face**, and the internal typed source/disabled contracts stay intact.
2. The **LCD does not acquire** `[HOLD]`, `[N/A]`, `TRAINING`,
   `SYNTHETIC · NO LIVE RECEIVER` or similar software-origin markings.
3. NAV contrast palette, bounded menu selection, provenance/missing-value
   fail-closed and no real transport claims remain covered by stronger
   assertions rather than deleting the original tests.

Only change the **nine test assertions in eight named test files**; no product,
reducer, CSS, state schema, session, data-source or hardware change is
authorized by this GO. Run the eight affected test files in a fresh targeted
log, then `npm run check` into a second fresh post-integration log. If any
test fails, STOP and issue a new evidence-backed disposition before trying
another repair. This is the first repair attempt for this failure.

V34 canonical integration is **not accepted or released** until the full
post-integration Node, Python and source-bound Chrome checks all succeed.
