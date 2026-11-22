# FCV-588 V37 — test-only negative vectors and partial native-browser closure

**Date:** 2026-10-18. **Software decision: GO (scoped test-only).**
**Phase 6 manual/rights/release decision: NO-GO / HOLD.**
**Workspace:** `C:\Work\MoPhongMayTrenTau`.

## Version and changes

- Canonical V36 runtime baseline verified from
  `docs/qa/FCV588_V36_FINAL_INTEGRITY_20261018.json` (receipt SHA
  `d7d7c3eba806317d6690f2d4cb91cc15eed6c705b16ab1519ed4621f168ebafe`).
- **One new canonical file only:**
  `test/fcv588-v37-negative-vectors.test.mjs`, exact SHA
  `dd9bdfec132f84c67b88ec1f1a159b2248eec80526af09c58478f611a1f2b7eb`.
- Source, reducer, browser UI, schema and hardware transport:
  **no modifications**. The 37 runtime assets and 23 `src` device/core
  files remain byte-identical to V36. No version bump is required
  for a test-only integration.
- Stage frozen at `staging/fcv588-v37-negative-vectors` and kept
  separately, including the four-test first pass, deliberately faulted
  transport mutation RED, restored-source test pass and original SHA.

## Executed test evidence

| Gate | Observed result | Artifact |
| --- | --- | --- |
| V37 stage first run | 4/4 PASS | `staging/fcv588-v37-negative-vectors/evidence/V37_TARGETED_FIRST_20261018.log` |
| Stage transport mutation | **Expected 2/4 FAIL**, exit 1, exposed incorrect NMEA transport; no canonical product modification | `staging/fcv588-v37-negative-vectors/evidence/V37_MUTANT_TRANSPORT_RED_20261018.log` |
| Stage byte-restored run | 4/4 PASS; original source SHA restored 37/37 | `staging/fcv588-v37-negative-vectors/evidence/V37_TARGETED_RESTORED_20261018.log` |
| Canonical targeted Node | **4/4 PASS** | `docs/qa/FCV588_V37_CANONICAL_TARGETED_20261018.log` |
| Canonical full Node | **455/455 PASS** | `docs/qa/FCV588_V37_CANONICAL_FULL_NODE_20261018.log` |
| Canonical Python | **13/13 PASS** | `docs/qa/FCV588_V37_CANONICAL_PYTHON_20261018.log` |
| Postdocument full Node | **455/455 PASS** | `docs/qa/FCV588_V37_POSTDOCUMENT_FULL_NODE_20261018.log` |
| CoS Desktop actual Chrome, 1912×970 | Partial scoped PASS: 35 localhost HTTP200, 0 errors; Tab, POWER, MENU, ESC, teacher pause/step/reset/replay, source, MODE UI clock | `docs/qa/FCV588_V37_MANUAL_BROWSER_20261018.md` |
| V36 historical source-bound Chrome | 639/639 assertions and 121/121 screenshots were already verified at V36; **not rerun as V37** | V36 original immutable receipts |
| Exact required attached viewports, pointercancel/blur in this V37 session, spoken Narrator, OEM firmware/rights | **NOT_RUN / HOLD** | V37 manual/browser and source audit |

The tests exercise actual reducer/event-log/projection code through
public interfaces and replay, not in-memory mocks of outcomes.
Passing these four tests means the named **synthetic contracts** were
preserved; it does not measure simulator/OEM fidelity.

## Supervisor disposition

The explicit user-authorized GPT-6 decision was documented *before*
canonical test integration:
[V37 narrow test-only GO](./2026-10-18-v37-gpt6-test-only-go.md).
There was **no** independent reviewer success, Kongming invocation,
NVDA/Narrator speech recording, hardware or transducer verification.
The controlled mutant was intentional and restored; historical errors
and their logs were neither modified nor reclassified.

Manufacturer sources and copyright/firmware limitations:
[V37 C11/D09/D14 audit](./2026-10-18-v37-c11-d09-d14-source-rights-review.md).
Actual Desktop probe and limitations:
[manual browser receipt](../../docs/qa/FCV588_V37_MANUAL_BROWSER_20261018.md).

## Prioritized next V38 work

1. Finish native Phase 6 **1366×768** and **1920×1080** attach-before-reload
   viewports, power long hold and cancellation/lost pointer capture/blur
   with corresponding screenshot and console/network capture.
2. Run a controlled Windows Narrator or NVDA speech verification of D15
   headings/status, announcements and keyboard focus without disturbing
   the primary workstation's ongoing use; report NOT_RUN unless actual
   spoken output can be checked.
3. Extend negative vectors for C11 waypoint edit/delete/save/cancel,
   stale/malformed and out-of-order observations, and for D09/D14
   reset/power/cross-source edge cases. Keep TDD fail-closed, add
   behavior changes only when a source-backed defect is demonstrated.
4. Conduct per-claim OEM manual/firmware/rights review with permitted
   photo/video frame evidence. Do not embed restricted OEM artwork.

## Acceptance/status

`65/65` claims HOLD; `14/50` checklist and `6/22` named tasks
unchanged; `hardwareValidated=false`,
`releaseApproval=HOLD`; Phase 6 OPEN. No Git commit, push, PR,
merge, release, deployment, additional installation, external
receiver or maritime hardware connection was undertaken.
