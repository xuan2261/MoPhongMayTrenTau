# FCV-588 F1 v2 — User-approved supervision substitution, 2026-10-18

## User decision and scope

On 2026-10-18, the project owner explicitly instructed:

> "quy tắc giám sát dùng chính bạn gpt 6 extra high luôn. Hãy dùng tất cả skills phù hợp đã tải lên để thực hiện tiếp và thực hiện theo đề xuất trên của bạn và sau đó đề xuất bước tiếp theo cho tôi."

The accepted change is **GPT-6 self-supervision in this ChatGPT session in
place of the previously required Kongming advisor**, for the FCV-588
`PUBLIC_REFERENCE` F1 v2 development plan. The user asked for
"Extra High" reasoning. Model identity is GPT-6; the exact client-side
thinking-effort setting is **not independently observable through the
project tools and must not be represented as a separately verified runtime
configuration**.

This is a deliberate **user-approved amendment** to the supervisor identity,
not a fabricated Kongming invocation, an assistant's implied permission, or
retroactive clearance of the historical failed test.

## Effective procedure for failures

The original `## Failure Protocol` blocks in each phase file and their
historical STOP results are retained for audit. For work **after this
decision**, replace only the instruction to spawn Kongming and apply his
guidance with the following supervised GPT-6 review:

1. **STOP** the failing Verify step immediately and preserve its exact
   command, complete stdout/stderr, exit code, test/phase/task identity,
   expected success condition, source hash and timestamp.
2. GPT-6 examines the full failure record, traces the event/fixture/product
   contract and competing causes, records a **documented evidence-backed
   go/no-go decision** and the smallest permitted repair. Avoid blind retries,
   made-to-pass test rewrites or bypassing tests.
3. A `GO` authorizes only the diagnosed change within the already approved
   scope; run the same targeted Verify again into a **new** versioned log.
   If it fails again, stop, reassess the new evidence, and record the next
   decision before any repair. After three unsuccessful independent repair
   attempts, pause for an explicit human architecture decision.
4. Only after the targeted Verify passes, run the subsequently required
   regressions and review integrated source/harness/receipts. Never treat
   previous staging-only PASS results as canonical integration acceptance.
5. A `NO-GO` remains STOP/HOLD and must be reported. Nonadvisory
   checks, source/rights restrictions, and existing release gates still apply.

GPT-6 review is **self-review**, not an independent third-party review or an
external agent invocation. Independent reviewers may add evidence but do not
automatically become the supervisor; nor does self-review alone establish
product correctness.

## Immediate incident decision: V31-QA-01 / Phase 2 Task 2.3

Historical protected result from 2026-10-16:

- `node --test test/fcv588-public-control-presentation.test.mjs
  test/fcv588-public-v31-transactions.test.mjs
  test/fcv588-public-func-presentation.test.mjs
  test/fcv588-public-config-presentation.test.mjs
  test/fcv588-public-config-review.test.mjs`
- Result: **52 PASS, 1 FAIL**, exit 1, 53 subtests. Original log
  `docs/qa/FCV588_V31_CONTROL_UNIT_GREEN.log`, SHA-256
  `93cf5389a6f3fad2dc4c5f420ea2f0943f3e7d85e3831a39589a8a938064f4c9`.
- Root cause in `test/fcv588-public-control-presentation.test.mjs:31-35`:
  test opens RANGE with Auto, changes a cloned settings object to Feet /
  rangePreset4=200, then expects a Manual `656 ft` draft without
  dispatching the required TrackPad-right Auto→Manual event.
- Independent earlier diagnosis is recorded in
  `reports/v31-failure-counsel-packet.md`; actual control presentation
  `web/lcd-control-presentation.mjs` correctly reports Auto while in Auto.

**GPT-6 supervisor decision: GO (narrow, test-fixture-only).**
Stage Manual using `pad(key(boot(),"range"),"right")` in the test
precondition, assert `draftValue==="manual:3"`, then check the
200-meter configured preset displays approximately `656 ft`.
Do **not** modify the RANGE reducer/presentation to make a faulty test pass.
Preserve the full original failure log and new evidence separately.

The original STOP remains historically true. Operationally, its **supervisor
prerequisite is now satisfied by this explicit user substitution**, not by a
Kongming counsel receipt. Re-running the affected Verify is authorized
only after the test fixture correction. The **release and hardware/rights
HOLD remain in force** regardless of a new green software regression.

## Other unchanged boundaries

FCV-588 only. No attached ship equipment, NMEA, RF, GPS, WebSerial, WebUSB,
new OEM image/artwork redistribution, or sensor outputs. Do not claim
pixel-perfect OEM fidelity, 100% visual equivalence, installed firmware or
complete 64+D15 acceptance without independent source/QA evidence.
No automatic Git commit/push/merge/PR, release or deployment. Existing V32,
V33 and V34 staging artifacts/logs/screenshot bytes are immutable.

Integrate the verified V34 patch only after the fixed V31 targeted Verify and
appropriate original V31 regression are green, with integrity rechecks and
new post-integration tests. Continue C11/D09/D14 in an authorized, clearly
source-graded scope. D04 remains source/rights/reboot HOLD.
