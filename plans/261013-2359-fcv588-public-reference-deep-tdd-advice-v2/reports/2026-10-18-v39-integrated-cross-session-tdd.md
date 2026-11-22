# FCV-588 V39 — integrated C11/D09/D14 and settings-import negative vectors

**Date:** 2026-10-18. **Software/test-only decision:** scoped GO.
**Phase 6 real speech/Windows browser, OEM rights, and public release:** HOLD.
Canonical workspace: `C:\Work\MoPhongMayTrenTau`.

## Canonical integration

Only **one new test** was copied into the canonical tree:

```text
test/fcv588-v39-cross-session-negative.test.mjs
SHA-256: b7f3c81ab44c8d27e72f5f2ea975f36dbadbc11776a9df2f7acf7aac2369dbcd
```

The candidate was copied **after** the explicit user-authorized GPT-6
GO/NO-GO analysis was saved:
[V39 decision](./2026-10-18-v39-gpt6-gates-go-no-go.md).
It did not alter the FCV device reducer, `src/`, `web/`, HTML/CSS/LCD,
the 37 runtime resources, `f1-core-7`, event schema 5, replay envelope 7,
settings schema 18 or `F1-public-reference-20`.

## New coverage and executed tests

Seven executable session-based vectors:

1. C11 Delete All WPT remains atomic and fails closed when a destination is
   selected, even through suspended POWER hold and cancel.
2. C11 default NO/MENU/POWER OFF do not delete pending waypoints; successful
   Delete All preserves monotonic waypoint IDs (next MARK becomes WP003).
3. D14 staged NMEA source choice does not commit during a cancelled POWER hold
   or after POWER OFF; only an explicit new edit can save the unavailable NMEA
   source, with receiver transport still `NONE`.
4. D09 virtual Tankenmaru On hides mutually exclusive NMEA rows, but revoking
   the virtual option does not rewrite independently saved NMEA source
   preferences; regrant cannot revive Tankenmaru On.
5. Explicit profile19 **settings** import validates a preexisting archived
   profile and preserves committed Own/NMEA values, but never grants a virtual
   Tankenmaru option or live receiver. Ordinary profile20 decode rejects
   old bytes; on-device restore while powered on is rejected.
6. Historical profile19 **replay** remains rejected even if a separate
   settings import succeeds; recomputing a fingerprint cannot make an
   unsupported option key valid.
7. A read-only instructor source transition does not mutate world time or
   invent hardware I/O, and replay reproduces the resulting matrix.

Actual staging: **7/7 Node PASS**; combined V37+V38+V39 staged:
**18/18 PASS**. Canonical after one-file integration:
**18/18 targeted PASS**, **469/469 full Node PASS** and
**13/13 Python PASS**. Logs:

```text
staging/fcv588-v39-options-navigation-import/evidence/V39_C11_D09_D14_FIRST_20261018.log
staging/fcv588-v39-options-navigation-import/evidence/V39_V37_V38_V39_TARGETED_20261018.log
docs/qa/FCV588_V39_CANONICAL_TARGETED_20261018.log
docs/qa/FCV588_V39_CANONICAL_FULL_NODE_20261018.log
docs/qa/FCV588_V39_CANONICAL_PYTHON_20261018.log
```

These are simulation-owned invariants, **not** model-by-model or
firmware-specific OEM acceptance. No success is claimed for hardware
transducers, GPS, NMEA0183 electrical interfaces or ship navigation.

## Preserve failed/blocked test evidence

- First V39 staging baseline-copy command failed from an invalid
  PowerShell backslash regular expression, exit 1. After actual filesystem
  readback confirmed 37/37 frozen source bytes and the three missing
  supporting files, GPT-6 issued a strictly scoped recovery GO. The final
  stage receipt was generated without overwriting previous data.
- Optional staging mutation that would reset the nextWaypointNumber was
  blocked **before execution** by the tool. No mutated test result,
  failure capture or mutation coverage claim exists. Source readback
  showed 37/37 original SHA still intact.
- Isolated Chrome focus investigation exited 1 because headless Chromium
  did not emit the prerequisite `window.blur` during a tab switch. The
  harness and failed receipt were kept unchanged. This is
  **inconclusive browser-environment evidence**, not FCV application FAIL
  and not OS-window blur PASS.
- Narrator exists on Windows but no voice output was observed; NVDA was
  absent from common paths. Exact two-viewport CoS Desktop attach/resize
  and true OS-window focus-loss still lack verification.

See the detailed [V39 Phase 6 limitations](../../docs/qa/FCV588_V39_PHASE6_BROWSER_SPEECH_20261018.md).
Historical V38 isolated Chrome remains **34/34 assertions and 70/70
actual response SHA on 1366×768 and 1920×1080**, with six images; it was
**not rerun or relabelled as a V39 browser PASS**, because product
source bytes did not change.

## Public source/rights recheck

The [fresh V39 FURUNO source/rights note](./2026-10-18-v39-furuno-source-rights-recheck.md)
confirms the manufacturer product and firmware-history references but
does not establish the installed firmware, mechanical/pixel equivalence,
or permission to redistribute OEM content. No OEM media was added.

## Remaining gates and next V40 milestone

**Phase 6 OPEN, 65/65 claims HOLD, 14/50 checklist, 6/22 accepted named
tasks, `hardwareValidated=false`, `releaseApproval=HOLD`.**
No commit, push, PR, merge, deployment, installation or release.

V40 should prioritize:

1. A dedicated nonintrusive Windows screen-reader environment with
   human-verifiable Narrator/NVDA speech and genuine OS-window blur input.
2. CoS Desktop **actual attached 1366×768/1920×1080** measurement,
   post-attach/reload console/network and saved viewport screenshots
   using authorized window-geometry control. A Playwright viewport
   test is a distinct evidence class, never a replacement.
3. A rights-cleared, firmware-specific visual/functional OEM atlas for
   exact front panel, menu paths and LCD states; assess each of
   64 FCV + D15 claims, not screenshot count or test-count fidelity.
4. Stop adding isolated negative tests merely to increase totals.
   Prioritize observed discrepancies and missing validated interactions,
   then apply TDD only where the source gives a defensible oracle.
