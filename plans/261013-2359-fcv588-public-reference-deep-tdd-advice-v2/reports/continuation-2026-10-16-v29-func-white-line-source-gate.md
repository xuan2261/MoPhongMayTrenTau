# V29 — FUNC choice visibility and White Line source boundary

Date: 2026-10-16 (Windows local clock, +07:00).

**Disposition: IMPLEMENTED; OBSERVED AUTOMATED CHECKS PASS;
FINAL EVIDENCE RECONCILIATION INCOMPLETE; PROJECT/RELEASE HOLD.**
This is an iteration under the existing v2 plan, not a new plan, phase
completion, hardware-equivalence claim or independent approval.

## Recovery and scope decision

The actual Windows workspace was recovered at
`C:\Work\MoPhongMayTrenTau`. Node v22.22.0 and Python 3.11.5 were observed;
`.git` was absent. The 33 local runtime files exactly matched both V28 full
Chrome receipts and manifest
`79eb71132e233571b3f45454f55095c73292343ce7134405f38d4caa5ba65ab3`.
That recovery was LOCAL_SOURCE_ONLY, not a rerun of historical Chrome.

Port4173 had no listener and the loopback HTTP request was refused. The
existing `node tools/server.mjs` was started successfully (session51258);
no working server was killed/restarted, and no dependency was installed.

The manufacturer product-page search excerpt was available at
<https://www.furuno.com/en/products/fishfinder/fcv-588/index.html>.
It describes White Line as distinguishing the top of the bottom echo. This
does not establish a default, increment, Edge transition or firmware-specific
editor contract. A subsequent direct page fetch timed out. The V28 gallery
observation of 40% and 0–100%/Edge remains historical qualitative evidence;
the gallery was not newly observed in this iteration. Third-party manual
transcriptions returned by discovery were not adopted as a primary oracle.
No restricted local PDF was extracted and no manufacturer media was copied.

Consequently numeric White Line/Edge remains **SOURCE_GAP / NOT IMPLEMENTED**.
The existing boolean Off/On classroom setting is explicitly retained. The
continuation instead fixed a directly reproducible related FUNC workflow
defect in the current presentation layer; no unverified acoustic rule or
serialized setting meaning was invented.

## Confirmed defect and repair

`web/app.mjs` previously rendered the entire FUNC choice array as plain text.
Unlike main-menu choices, FUNC settings did not have semantic selected rows
or selected-value scrolling. Clutter100 and Color Erase50 were selected by
native inputs but outside the visible LCD scrollport. The mobile footer was
also hidden. Existing stage/cancel/commit behavior was not the defect.

The new read-only `projectFcvFuncSetting` consumes the canonical overlay and
shares an internal seven-choice window with `projectFcvMainMenu`. Values,
ordering, wrap and draft ownership remain in the existing reducer. The live
renderer uses safe DOM rows, a selected marker, item position/count and
separate ENTER/MENU instructions. The active value is kept inside the
scrollport; the FUNC help footer also remains visible on mobile.

Changed runtime files: `web/lcd-presentation.mjs`, `web/app.mjs`,
`web/styles.css`. No core, reducer, menu choices, profile, settings codec,
replay schema, instructor scoring or physical-control geometry was changed.
Profile19/settings18/core7/event5/replay7/scenario7/multi4 remain unchanged.

Selected pre-change files were preserved in
`reports/v29-selected-source-backup.zip` with SHA-256
`24f356f9eec73c9948e8775cff77806342a9f1edcee6c9f8970dc5ae84340f1c`.

## Actual TDD and regression evidence

New probe: `tools/fcv588_func_visual_regression.py`. It uses installed Google
Chrome in isolated contexts, native click/tap/keyboard holds and DOM Range
measurements of the selected glyphs. It never injects application state and
does not scroll the selected item on behalf of the implementation.

Before the fix, all four required viewports each produced19 checks with
5 expected failures and14 passing characterizations. Total: **20 failed
assertions /56 baseline passes**, no execution error. The five failed checks
were Clutter100 visibility, bounded semantic choices, visible commit/cancel
help, previous-choice visibility and Color Erase50 visibility. These are
five repeated assertion types, not20 independent OEM defects.

After the fix, the unchanged probe passed **76/76** checks. Existing White
Line Off/On staging, cancellation, commit and reloaded FUNC were characterized
as passing in both stages; no artificial RED is claimed for those behaviors.
The probe and shared verifier were unchanged between its RED and GREEN.
The full-suite output filenames were changed to V29 only afterward; their
new harness identity is separate from the targeted RED/GREEN identity.

| Executed verification | Observed result |
| --- | --- |
| Targeted Node FUNC/LCD tests | 15/15 PASS |
| `npm run check` | 347/347 PASS, zero fail/skip |
| Python Chrome-integrity tests | 7/7 PASS |
| Python visual-atlas tests | 6/6 PASS |
| Python compilation of four affected QA scripts | exit0 |
| FUNC Chrome probe, four viewports | 19/19 each, 76/76 PASS |
| LCD/BRILL/menu Chrome regression, four viewports | 17/17 each, 68/68 PASS |
| Full desktop Chrome suite | exit0 |
| Full mobile Chrome suite | exit0 |

Viewports:1366x768,1920x1080,360x800,390x844. Phone runs are Chrome touch
emulation with the training reflow, not physical-phone or OEM geometry QA.
The completed runners gate success on source pre/post identity, actual
browser response-body matching and stable runner/shared-helper identity.
New full receipt contents and exact aggregate hashes have **not** been
individually reconciled/transcribed in this report; see the interruption below.

Five new Node tests cover all101 Clutter choices, identical main-menu/FUNC
windows, White Line stage/cancel/commit with raw-world immutability and
codec/replay, invalid presentation inputs, and live-renderer consumption.
Those supplementary unit tests passed when first executed; the actual
pre-fix RED evidence is the browser probe, not an invented unit-test history.

## Evidence locations and visual review

All paths below are relative to the actual Windows workspace:

- `docs/qa/FCV588_FUNC_V29_RED_RECEIPT.json`
- `docs/qa/FCV588_FUNC_V29_GREEN_RECEIPT.json`
- `docs/qa/FCV588_LCD_V29_GREEN_RECEIPT.json`
- `docs/qa/FCV588_CHROME_VIEWPORT_V29_RECEIPT.json`
- `docs/qa/FCV588_CHROME_MOBILE_V29_RECEIPT.json`
- `docs/qa/FCV588_V29_NODE_CHECK.log`
- `docs/qa/FCV588_V29_DESKTOP_CHROME.log`
- `docs/qa/FCV588_V29_MOBILE_CHROME.log`

Actually opened: two RED Clutter screenshots (1366 and360), all12 FUNC
GREEN screenshots (Clutter100, Color Erase50, White Line On draft at all
four viewports), and all8 LCD regression screenshots. The selected FUNC
values and separate help are visible in the inspected GREEN images.

The nine full-suite V29 screenshots were generated by the successful runners
but were **not opened in this iteration**. Their final visual review remains
pending. V28 screenshots/receipts were preserved; the historical V28 atlas
was not relabeled as a V29 source attestation.

## Interruption and remaining acceptance

After both full Chrome suites exited0, an additional PowerShell/Python
command was submitted to read the five V29 JSON receipts and print status,
receipt SHA, runtime SHA, Chrome version, harness and per-viewport body
identity/screenshot fields. The tool returned:

> This tool call was blocked by OpenAI because we couldn't determine the safety status of the request.

The command did not execute. Status: **NOT_EXECUTED**, not a failed product
assertion and not an additional PASS. It was not retried through another
command or tool. No runtime/harness edits followed. This iteration stops
short of final evidence reconciliation; no Kongming counsel, independent
review, final source-summary approval or phase completion is claimed.

An earlier output-name patch was rejected on a context mismatch before any
write. Current lines were reread and the corrected patch succeeded before
the completed regression run; that edit-tool precondition was not TDD RED.

No new generator, archive-verifier, plan CLI or journal CLI execution is
claimed in this iteration. Report/ledger/plan narrative updates after the
interruption are documentary only and were not followed by another test run.
Canonical acceptance stays14/50 checked and6/22 named Tasks; only Phase1 is
accepted. All65 feature claims and product/course release remain HOLD.

Next bounded step: complete the pending full-suite screenshot review and
V29 evidence reconciliation under the existing failure/advice boundary,
without replaying successful implementation or overwriting receipts. Numeric
White Line still requires an authoritative, version-qualified and usable
operator contract before a deliberate settings/replay compatibility decision.

## Later V30 recovery — historical interruption preserved

On 2026-10-16 the next explicitly authorized continuation opened all nine
pending full-suite V29 screenshots and successfully reconciled actual local
source/receipt/harness hashes before any V30 runtime edit. Record:
`docs/qa/FCV588_V29_RECONCILIATION_2026-10-16.json`. The original blocked
command above remains NOT_EXECUTED; this was a new authorized operation,
not a fabricated success or a rerun of historical Chrome. V29 source was
`b9c769e9023cd3746dd5303f3e15796464e06ad6405f0e388bef0cea1e4a0590`.
This closes V29's pending evidence reconciliation only, not project release
or OEM equivalence. Subsequent changes belong to the separate V30 report.
