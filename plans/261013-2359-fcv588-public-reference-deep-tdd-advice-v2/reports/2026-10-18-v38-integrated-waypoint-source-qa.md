# FCV-588 V38 — waypoint/source negative vectors and exact Chrome QA

**Date:** 2026-10-18. **Software/test-only milestone: GO.**
**Phase 6 manual/speech/OEM/rights/release: HOLD.**
Canonical workspace `C:\Work\MoPhongMayTrenTau`.

## Integrated changes

Exactly **one new canonical test file**, and no product source edits:

```text
test/fcv588-v38-waypoint-source-edge.test.mjs
SHA-256: 4a49a44c667c951f9def14553fadb6ddaa9d2da629f5f25d42cf2a8d338dea4b
```

The test suite adds seven source-bounded offline vector groups:
C11 waypoint name cancel/save/replay, destination-protected deletion,
POWER cancellation/off of a staged name, 20-waypoint capacity and
reset, D09 virtual option revoke during POWER-suspended details,
D14 stale/future/untyped/invalid position and no NMEA receiver,
and replay consistency after rejected out-of-order POWER edges.
No GPS, NMEA, transducer, serial, RF or external receiver was introduced.

Canonical V37 receipt SHA
`e28f00a94840fecbd43a65967676638201a8729601910203362631efdb7139b1`
remains the checked baseline for this test-only extension; all
**37/37 runtime SHA and 23 `src` modules are unchanged**.
No profile, settings, event or replay version was bumped.

## Executed evidence

| Gate | Result | Write-once location |
| --- | --- | --- |
| Stage initial new cases | **7/7 PASS** | `staging/fcv588-v38-waypoints-source-browser/evidence/V38_WAYPOINT_SOURCE_FIRST_20261018.log` |
| Stage intentional protection mutation | **Expected RED** 6 PASS/1 FAIL, exit 1 | `staging/fcv588-v38-waypoints-source-browser/evidence/V38_DESTINATION_PROTECTION_MUTANT_RED_20261018.log` |
| Restored, exact-SHA stage | **7/7 PASS** | `staging/fcv588-v38-waypoints-source-browser/evidence/V38_WAYPOINT_SOURCE_RESTORED_20261018.log` |
| Canonical targeted Node | **7/7 PASS** | `docs/qa/FCV588_V38_CANONICAL_TARGETED_20261018.log` |
| Canonical full Node | **462/462 PASS** | `docs/qa/FCV588_V38_CANONICAL_FULL_NODE_20261018.log` |
| Canonical Python | **13/13 PASS** | `docs/qa/FCV588_V38_CANONICAL_PYTHON_20261018.log` |
| Exact isolated Chrome viewports | **34/34 assertions PASS**; 70/70 real response SHA; 37/37 pre/post runtime asset SHA; 6/6 screenshot SHA | `staging/fcv588-v38-waypoints-source-browser/evidence/V38_EXACT_VIEWPORT_CHROME_ATTEMPT2_20261018.json` |
| Current Desktop CoS Chrome | 1912×970 attachment, 35/35 local HTTP 200, zero JS console errors | `docs/qa/FCV588_V38_BROWSER_AND_A11Y_20261018.md` |

The first Chrome runner attempt failed due to its own MENU-before-POWER
sequence, **not due to a confirmed device defect**. Its failed
receipt, log, runner SHA and first screenshot are retained. GPT-6
issued a narrow harness-only GO before running the amended **new
attempt2 runner** with different receipt/screenshots. No old receipt
was rewritten and no product code was changed to satisfy the harness.

Playwright contexts measured exact 1366×768 and 1920×1080 in real
Chrome v155.0.8059.80 using an isolated browser. This is **not**
a passed CoS Desktop controlled native resize. OS blur under held
input and real Narrator/NVDA speech are **NOT_RUN**. The tool blocked
the attempted Desktop window resize before execution; it is not a
product fail or a successful resizing operation.

## Approval boundary and unresolved acceptance

User-approved GPT-6 self-supervision is documented in
[the narrow V38 GO record](./2026-10-18-v38-gpt6-test-only-go.md).
It is not an independent reviewer, hardware validation or attestation
of Extra High client settings. Published manual/firmware/rights
constraints remain as recorded in the V37 audit; no OEM photo, manual
PDF, video, font or restricted text was copied into runtime.

The original V36 **639/639 Chrome checks and 121/121 screenshot SHA**
are historical receipts, not additional V38 browser tests. V38's
separate new browser assertions are 34, not 34 OEM functions.

**Acceptance counters remain 14/50 checklist, 6/22 accepted tasks,
65/65 claim HOLD, releaseApproval=HOLD,
hardwareValidated=false, Phase 6 OPEN.**
No commit, push, merge, PR, deploy or release.

## Next milestone — V39

1. Arrange a dedicated, nonintrusive Windows accessibility test
   environment with actual Narrator/NVDA spoken-output review of D15
   names, changes, focus and anti-repeat behavior.
2. Exercise the **attached** Chrome/CoS Desktop viewport gate at
   1366×768 and 1920×1080 using an authorized environment/window
   size control, with attach-before-reload diagnostics; test OS blur
   during a held keyboard/pointer action without altering other
   user windows.
3. Expand source-backed operator vectors for C11 waypoint
   delete-all/go-to reset and future/invalid samples, D09 restore
   and option-bound editor state, and D14 persistence across
   supported schema/profile imports. Avoid any behavior change
   without a source-supported specification and focused replay
   migration review.
4. Obtain firmware/version-specific, rights-cleared OEM reference
   and complete independent per-claim review before promoting
   a single lesson to public-reference acceptance.
