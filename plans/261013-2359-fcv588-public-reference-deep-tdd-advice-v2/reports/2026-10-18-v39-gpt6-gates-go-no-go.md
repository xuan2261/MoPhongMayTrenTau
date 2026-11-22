# FCV-588 V39 — GPT-6 bounded GO/NO-GO

**Date:** 2026-10-18. **Canonical:** C:\Work\MoPhongMayTrenTau.
**Supervisor:** user-authorized GPT-6 self-review, not independent manufacturer review or a client Extra High attestation.

## P0 browser/assistive-technology gate: NO-GO (HOLD)

- Windows Narrator executable is present, but **Narrator is not running**; NVDA is not found in common install paths. No isolated user-observed speech, audio recording or accessibility tester report exists. Speech **NOT_RUN**, not ARIA PASS.
- Previous attempts to resize an attached CoS Desktop Chrome window were blocked before execution. The exact **1366×768/1920×1080 CoS Desktop attached-session gate remains NOT_RUN**. Separate V38 Playwright Chrome exact viewport tests remain historical evidence, not native Desktop resizing.
- A new *isolated headless Chrome* tab-switch focus-loss investigation actually ran and exited **1** with `headless Chrome tab transition did not emit window blur`. Its untouched script, console log and JSON receipt are frozen under
  `staging/fcv588-v39-options-navigation-import/evidence/`.
  The failing case never reached an assertion of the FCV held-key cancellation because the browser did not generate its required `window.blur` event. It is **tool/browser-environment inconclusive**, not an established FCV product regression and not a PASS for a live OS-window blur.
- Do **not** change the test expectation to a fabricated/synthetic blur, launch Narrator in the user's active working desktop, change global display settings, or retry focus tests blindly. A distinct controlled Windows test environment and verifiable real spoken-output capture are prerequisites.

## Staging copy tooling failure: recovered under narrow GO

The original V39 staging PowerShell command exited 1 after copying the 37 source files because `-replace` received an invalid bare-backslash regex. The actual partial filesystem state was read back (37/37 source SHA intact, one support test copied, three absent), and a separate scoped GO authorized only copying missing support files and using `.Replace` on literal strings. The final V39 stage baseline receipt was created **write-once** and has SHA-256
`0ef12ec905b6a2f9ee19d8217e02caa2314df2d90d1f8d3b22a08887ed948622`.
The original error is retained in the CoS execution result and
`staging/fcv588-v39-options-navigation-import/evidence/V39_STAGING_PREFLIGHT_STOP_GPT6_GO_20261018.md`.

## Optional mutation sensitivity check: NOT_EXECUTED

A staging-only proposal to inject a `nextWaypointNumber` regression was blocked by tool safety **before executing**; subsequent direct SHA readback established **37/37 stage source bytes unchanged** and the proposed mutant log absent. **No mutation-kill PASS is claimed in V39.**

## V39 test-only integration: narrow GO

- Frozen baseline is canonical V38 receipt SHA-256
  `ac195d29a0d656c0faf652be3c0e321df7eed483ba78d3544206b02eee27b294`.
- The new staged test `test/fcv588-v39-cross-session-negative.test.mjs` has SHA-256
  `b7f3c81ab44c8d27e72f5f2ea975f36dbadbc11776a9df2f7acf7aac2369dbcd`.
- Actual staging execution passed **7/7** new tests; cross-version targeted suite V37+V38+V39 passed **18/18**. Those tests execute the original session reducer, typed receiver, provenance projection, settings codec and replay. They cover Delete All/POWER/go-to/ID monotonicity, D14 editor cancellation, D09 NMEA exclusion and regrant, explicit profile19 settings import with lost virtual entitlement, rejecting archived replay, and the teacher/world clock boundary.
- **GO:** copy exactly this one pinned new test into canonical `test/` only if its target does not exist. Validate its SHA, run targeted/full Node, Python and runtime SHA checks. Keep immutable historical browser failures and source/rights HOLDs. No semantic product code changes are warranted by this staged PASS.
- **NO-GO** for changing `web/`, `src/`, profile/schema/replay, OEM artwork, physical NMEA/GPS/RF, installing tools, or commit/push/merge/release.

**Release standing:** Phase 6 OPEN, 65/65 public claims HOLD, checklist 14/50, tasks 6/22, `hardwareValidated=false`, `releaseApproval=HOLD`.
