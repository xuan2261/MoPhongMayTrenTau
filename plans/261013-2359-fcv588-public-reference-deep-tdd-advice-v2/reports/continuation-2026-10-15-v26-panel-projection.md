# V26 — original physical-panel and live dial projection

## Scope and design brief

This continuation implements the existing Phase 2 panel task; it is not a new
project plan. The user has emphasized maximum visual similarity to the FCV-588.
The work remains an independently drawn, offline PUBLIC_REFERENCE simulator.

Register: Product, an existing classroom simulator.
Scene: A student operates the device panel on a desktop; a teacher owns the
separate scenario controls. Phone layout remains an explicitly labeled reflow.
Direction: A compact dark instrument head, portrait LCD, separate right-hand
physical keys and two rotary controls, rather than a generic application card.
Color: Restrained original gunmetal surfaces, light labels and a blue power key;
the existing original LCD palettes are retained.
Type: System Arial for physical labels and the existing system monospace LCD;
no proprietary font, photograph, screenshot, firmware or logo asset is imported.
Signature: The seven-position MODE indicator visibly follows the recorded
candidate, cancel, commit and reset paths; the GAIN indicator follows state.
Dials: Visual variance 1/10, motion 1/10, density 7/10. No decorative animation.

## Authority and geometry limits

The curated manual oracle, section 1.1, requires separate MENU/ESC, four-way
TrackPad, ENTER, RANGE, MARK, FUNC, GAIN, MODE and POWER/BRILL inputs.
Section 1.4 and the existing source-backed reducer define seven display modes
and a separately recorded selection timeout. The simulator owns its display
projection: a fixed needle that ignores these changes is an observable defect.

The manufacturer's specification supports a 128 x 171 mm effective LCD and
480 x 640 logical pixels. The previously accepted 233 x 270 layout envelope
is retained, but must not be represented as an independently measured bare
front-panel outline. A near-square head and separate mounting silhouette are
original photo-informed estimates. The actual manufacturer dimensional drawing
was not obtained in this continuation; neither a 233 x 233 mm bare-head claim
nor a measured mounting-bracket dimension is accepted here.

The new key contours, materials, label positions and dial angles are original
training geometry, not OEM artwork or calibrated switch positions. Public
availability is not redistribution permission. All hardware-equivalence,
firmware, rights-dependent and release claims remain HOLD.

## Recovery evidence

The existing Windows workspace has no .git directory. The existing loopback
server was retained. Before edits, all 32 original runtime assets matched both
V25 receipts and the HTTP-served source manifest:

`340d306cf40b47b69266a7a26dd7a0e0c4687269736e0397ffee35813bf9783b`.

The profile is F1-public-reference-19; settings schema is 18. The previous
324-test and four-viewport PASS records are historical, not new executions.

## Targeted contract and verification

The project-native Chrome probe `tools/fcv588_panel_visual_regression.py`
checks actual computed dial transforms, accessible values, key bounding boxes,
an unpowered LCD without a trainer prompt, and normal replay/reset behavior.
The browser does not inject application state. It uses the physical-key DOM
and the existing teacher buttons in an isolated context. It hashes actual
browser response bodies and checks source/harness stability.

The pre-change run is recorded separately as V26 RED; it is an expected TDD
characterization of known missing visual behavior, not a release verification.
GREEN and the full four-viewport evidence below were recorded after actual
execution. No V25 receipt or screenshot was renamed to represent changed bytes.

## Review boundary

An independent read-only worker was invited but failed to start. It provided no
review. No Kongming supervision, independent acceptance or completed phase is
claimed. The missing external review remains an acceptance limitation.

## Results

### Implemented scope

The runtime changes are limited to `web/index.html`, `web/styles.css` and
`web/app.mjs`. The face now has separate original head/support contours,
vertical RANGE/MARK/FUNC keys, separate ENTER below the four-way TrackPad,
original rotary rings and seven printed MODE labels. The unpowered LCD is
blank; startup and long-press help live in the instructor region. Generic
system-font FURUNO/FCV-588 text is not a copied manufacturer logo asset.

`renderPhysicalDialState(state)` projects pending/committed MODE and manual
GAIN/automatic Offset into needle transforms and accessible values. It has
no dispatch, second state counter or timer. Cancel restores the effective
needle; timeout and reset reproject canonical state. The instructor live
readout changes only when its text changes, not on every world tick.

No core, reducer, input protocol, settings or replay schema changed in V26.
Retained versions: profile19, settings18, core f1-core-7, event5, replay7,
scenario7 and inert multi-runtime4. Visual identity is bound by the new
runtime manifest, not falsely inferred from the unchanged profile number.

### Actual TDD and regression

The isolated Chrome probe first returned exit 1 with **8 failed visual
behavior assertions and 4 passing baseline/integrity assertions**. Failures
included fixed needles despite real state changes, side-by-side RANGE/MARK,
and trainer text on an unpowered LCD. After the implementation, the same
probe returned **12/12 PASS, exit 0**. These are not import/syntax failures.

The probe SHA at RED and GREEN was
`94fb81d4725bfee8bca22d65d77844b1fbf480b4148fb8bfffa80a9e4140ef4c`.
Both used the then-current shared helper
`4b5f330bf00d5a964a46087d7d69438c3d0f5493f6ae279fcef8b561d3d1ade4`.
The helper was subsequently extended for full V26 browser coverage; its new
identity is recorded separately below, not retroactively assigned to TDD.

| Executed check | Observed result |
| --- | --- |
| Targeted panel/layout/browser Node tests | 30/30 PASS |
| Full `npm run check` | 326/326 PASS, 0 FAIL, 0 SKIPPED, exit 0 |
| Python Chrome-integrity unit tests | 7/7 PASS, exit 0 |
| Python compilation of the three QA scripts | PASS |
| Implementation/menu/trace generators `--check` | PASS, no generated evidence drift |
| Recursive public-runtime asset policy | PASS, 32 original source assets |
| Reference archive integrity | 24 PDFs / 2 ZIPs, 197171462 bytes, no validation failures; 3 existing acquisition gaps |
| Canonical plan validate/parse | Valid; 7 phases, 50 entries, 14 checked, 28%, 1 phase done |

Full Node output is preserved in `docs/qa/FCV588_V26_NODE_CHECK.log`.
After the evidence-ledger, reference-matrix, browser record, acceptance
summary and canonical-plan narrative edits, full `npm run check` ran again:
**326/326 PASS, 0 FAIL, 0 SKIPPED, exit 0**, with independent preserved output
`docs/qa/FCV588_V26_FINAL_NODE_CHECK.log`. This rerun includes the plan,
relative-link, evidence and runtime regression tests; it is not a rerun of
the blocked aggregate SHA command or of unchanged Chrome contexts.
The former 24px CSS padding proxy was replaced with an explicit aperture
allocation test; actual Chrome LCD/overall-envelope numeric tolerances were
not relaxed. Two new Node regressions cover physical labels/blank LCD and
read-only state-derived dial projection.

### Actual Windows Google Chrome V26

| Observed viewport | Result | Verified response bodies / distinct paths | Actual body aggregate SHA-256 |
| --- | --- | --- | --- |
| Desktop 1366 x 768 | PASS | 61 / 30 | `ab1f459a0bc7d5af6c4612700173271375bda555899270b41ef0fab78bdada6f` |
| Desktop 1920 x 1080 | PASS | 61 / 30 | `f2f83fb71498f4e11462a4fad469c01ed7903649c7a343867117abbd23af63dd` |
| Mobile emulation 360 x 800 | PASS | 30 / 30 | `ec9ad635ad7684d6f2a87f594e99350a70a826aede8a5d03d3e204f985359c66` |
| Mobile emulation 390 x 844 | PASS | 30 / 30 | `707a366d1cadeeb7a4ce81972584cc2caef1a7ec48040b3fe06a5bcf298fe247` |

Both completed receipts report source identity/stability PASS and harness
PASS_UNCHANGED, with common 32-file runtime manifest:

`8efc7a9a01ff81f489388b14cdb567aa2ee186529f3d3779e0f590e42c56dadb`.

Recorded full-run harness hashes:

- Desktop/shared verifier: `90b55544e9fbf3324e89aea3e246de8ae752f2371cbe7cbc3b945ca48a1408fe`
- Mobile runner: `6cfd9883b9527d17cf4e52e8dbf7f17327b301adfd69c83e9a339570fe1487bd`

Each desktop context exercised all seven MODE positions, staging without
early commit, cancel, Auto/Manual GAIN, world-clock isolation and replay.
Existing input/hold/cancel, menu/source guards, D15 lessons, persistence,
reset/reload and White-palette checks also passed. All four contexts report
no console or request failures. Phone contexts measured 12 physical and
16 instructor targets with a 44 CSS-pixel minimum, zero horizontal overflow,
and explicit non-OEM reflow. This is Chrome touch emulation, not a physical
phone or physical instrument test.

All nine V26 full-page browser screenshots and the targeted GREEN
power-off screenshot were individually opened. No obvious overlapping
controls were seen. Full-page image height is not the viewport height.
Visual inspection is the implementing agent's review, not an independent
pixel comparison or manufacturer approval.

### Evidence boundary and remaining acceptance

After these successful runs, a separate aggregate current-SHA verification
command was blocked by the tool before execution. It was not retried through
another command, and no extra PASS receipt was created. Source/harness PASS
above refers specifically to the completed Chrome runs. Later work changed
documentation only, not the tested runtime or browser harnesses.

The observed AgentKit executable reports **3.0.0-beta.24**, unlike the older
beta.17 historical entry. No install/update was performed. Packaged skill
guidance was adapted to available Windows tools; literal native
`ak-cook --auto --tdd --advice` execution and Kongming approval are unverified.

The sole plan still has **6/22 accepted named Tasks and 14/50 checkboxes**;
Phase1 alone is complete. The operator register remains 60 synthetic subsets,
three partial rows C11/D09/D14 and one unimplemented source/rights-dependent
D04. D15 is a separate synthetic platform row with seven scored lessons.
**All 65 claim decisions, full geometry/firmware equivalence, independent
course approval and release remain HOLD.** No checkbox was promoted in V26.

The final worker-status query confirmed the invited panel reviewer is
`failed`, `revivable=false`, with no review result: its page did not pick up
the task. No independent GO or review approval was inferred from the invite.

Next engineering priority is a source-graded normalized geometry/LCD-menu
comparison atlas: distinguish observed placement from original estimates,
then correct the highest-evidence remaining rendering differences without
claiming unmeasured dimensions or importing OEM media.
