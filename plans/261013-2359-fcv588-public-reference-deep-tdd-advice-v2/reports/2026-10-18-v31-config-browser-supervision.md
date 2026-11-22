# V31 configuration Chrome runner — GPT-6 decision after failed Verify

Date: 2026-10-18. Task: F1 v2 Phase2 verification, **not release**.

## Exact stopped observation

The byte-matched canonical V31 regression in isolated
`staging/fcv588-v31-gpt6-regression-recheck-20261018` completed the
desktop Chrome and mobile Chrome runners with PASS on four viewports.
The subsequent configuration runner
`python tools/fcv588_configuration_visual_regression.py --stage green`
exited 1, status FAIL, and stopped the orchestrator before FUNC/LCD/reference.
Receipt:
`docs/qa/FCV588_CONFIGURATION_V30_GREEN_RECEIPT.json` inside that
isolated stage; SHA-256
`86ca9f7afa19f815afbdef6fdb8bf12aae05`.
Complete runner stdout is `evidence/configuration.log`, SHA-256
`0defea6eb00c2b7feddfff0c87469d8c18a5ed423a3e7768548a0b730c9a3c83`.

All four responsive contexts (1366x768, 1920x1080, 360x800 and
390x844) recorded a single failing assertion out of 66:
`CONFIGURATION_TO_RANGE_CLEARS_EDITOR_DOM`.
Observed `cleanup` was identical in each context:

```json
{
  "title":"Range",
  "transactionHidden":true,
  "transactionData":[],
  "choicesHidden":true,
  "contentRole":"list"
}
```

## Root-cause review and GO/NO-GO

The original V30 regression harness expected
`cleanup["contentRole"] is None` (`tools/fcv588_configuration_visual_regression.py:175-177`).
In canonical V31 `web/app.mjs:671-683`,
`renderControlChrome` intentionally makes RANGE a semantic
`role=list`, `aria-label=Range`, with two `role=listitem`
entries (`auto`, `manual`). That is not stale configuration metadata;
it is the control's current accessible representation.
The transaction was hidden, its old dataset cleared, and configuration
editor choices were hidden in all four observed results.

**GPT-6 review: GO — test-harness assertion correction only.** Assert
that old configuration transaction/choice data is cleared **and** the active
RANGE control exposes the expected new `control` layout,
`role=list`, `aria-label=Range`, and exactly `auto/manual` rows.
This strengthens compatibility/accessibility coverage, rather than
deleting the check to achieve green. No FCV reducer or web product change
is authorized by this decision.

The harness change is applied to the canonical test tool only, not to
the original failed receipt or the isolated first/second run copies.
Rerun only in a **new isolated QA stage** with a unique evidence path and
exactly 35/35 matching V31 source bytes. A new failed assertion triggers
another STOP/review, not a blind retry.

## Safety and status

The pre-existing `V31-QA-01` 52/53 failure is separately preserved.
Its corrected targeted Verify was **53/53 PASS** in
`docs/qa/FCV588_V31_CONTROL_UNIT_POST_GPT6_20261018.log`.
Canonical `npm run check` **405/405 PASS**; Python unittest **13/13 PASS**.
The desktop/mobile PASS is valid only for the isolated stage and its
recorded source/harness hashes. Configuration and remaining runners still
require a fresh PASS before integration. Release, hardware, source/rights
and 64+D15 acceptance HOLDs remain.
