# V27 — LCD rendering and normalized reference atlas

## Scope before implementation

Continue the existing v2 plan, especially the display portion of Tasks 2.1,
2.3, 3.1 and 5.3. Do not create a replacement plan, new framework, hardware
interface or deployment. Preserve V26 and its receipts as historical evidence.

The V26 source was reread on Windows. Two display gaps are visible in code:
`web/app.mjs` computes LCD brightness from committed state only, although the
existing reducer exposes a staged Brill value; LCD Test changes `colorIndex`
and its text but never replaces the sonar Canvas with a color test field.
The menu renderer also turns instruction lines into apparent selectable rows,
and only the current category is visible. Existing unit tests cover the
reducer values, not these actual on-screen results.

The new Chrome probe will characterize these behaviors before implementation.
Expected RED is limited to the named display assertions; browser launch,
source identity, input reachability or replay failures are not expected RED.

## Design and source contract

Register: Product, existing offline classroom instrument.
Scene: Desktop physical-key practice with a separate teacher panel; phone
touch uses the existing explicitly non-OEM training reflow.
Direction: Preserve the V26 physical face. Improve LCD hierarchy with the five
existing named menu categories, distinct menu rows, selected choices, source
HOLD explanations and a visible diagnostic test field.
Color/type: Existing original LCD palette, system monospace text and readable
selected-row contrast; no proprietary font, image or copied layout pixels.
Signature: Every visible setting has an observable display result without
creating a second device state or simulation clock.

Authority is the current source, accepted v2 tasks and curated manual oracle.
The [manufacturer product page](https://www.furuno.it/lang--en--art--FCV-588--FCV588.html)
was searched on 2026-10-15 and corroborates the 480x640 logical LCD. The
effective LCD and overall 233x270 reference envelope retain their existing
curated project source grade; they are not new hardware measurements.
The [FURUNO USA gallery page](https://www.furunousa.com/en/products/fcv588)
was read, but its linked full-size front image could not be fetched.
Searches did not retrieve an official indexed detailed menu/brilliance oracle.
Secondary search excerpts are discovery leads only, not implementation
authority. No new restricted PDF text or images were extracted. The separate
archive verification below checks existing hashes, page counts and ZIP integrity.

The sidebar/category and option-list geometry will be an ORIGINAL REFERENCE
ESTIMATE, not a claim of exact firmware navigation. The existing physical
left/right category and up/down item semantics remain unchanged. The five
diagnostic colors are the simulator's already-declared sequence, not a newly
asserted OEM test sequence. The brightness curve remains an original training
approximation, not measured luminance. Unsupported OEM dimensions, menu
semantics, fonts and colors remain SOURCE_GAP/HOLD.

## Planned evidence

Capture normalized CSS coordinates relative to the simulator head at all four
required viewports, not physical measurements. Record original Canvas pixel
samples, native inputs, source/harness hashes, replay/reset/reload, and actual
Chrome response-body hashes. Then run targeted/full Node and Python checks,
existing four-viewport acceptance, generators and plan/asset checks.

## Results

**Implemented and software-verified; overall project/phase acceptance remains
PARTIAL/HOLD.** V26 receipts and images remain untouched. No core/reducer,
settings, event protocol, scenario or replay semantics were changed. Retained
versions: profile19, settings18/key v18, core f1-core-7, event5, replay7,
scenario7 and inert multi-runtime4. New view-only source is identified by its
actual runtime manifest, not by pretending the unchanged profile is new.

### Root causes and changes

| Observed gap | Root cause | Implemented behavior |
| --- | --- | --- |
| Brilliance draft showed 8 while LCD stayed at level9 until commit | Renderer read only committed brightness, ignoring Brill overlay and POWER-hold priorOverlay | Read-only projection immediately previews the draft; hold cancellation and commit preserve its visible luminance |
| LCD Test changed its text but continued drawing sonar | colorIndex had no Canvas consumer | Five already-declared classroom colors now fill the entire Canvas; normal labels/menu are hidden, teacher instructions stay outside LCD, MENU/ESC restores System |
| Main menu mixed help with selectable rows and hid other groups | One text blob split into rows, including instructions | Five visible category labels, semantic data-entry-id rows, separate help/HOLD reasons and a bounded active-choice list |

`web/lcd-presentation.mjs` contains pure projections and immutable original
diagnostic patterns. `web/app.mjs` consumes them with safe textContent/DOM
nodes; the existing scroll-to-selected geometry helper was shared rather
than duplicated. Physical inputs still reach the same reducer. V26 head,
bracket, keys, rotary geometry and explicit phone training reflow are retained.

No exact OEM category-selection sequence is asserted. Left/right category
and up/down item actions are existing simulator semantics; the new category
rail and choice-window rectangles remain original reference estimates.

### Actual RED, GREEN and regression

The unchanged new LCD probe ran against V26 first. Each of four viewports
reported **13 expected display assertions failing and 4 baseline assertions
passing**, with no execution errors. After implementation, the same probe
passed **17/17 per viewport, 68/68 total**, exit0. This is three groups of
rendering changes, not 52 distinct defects or 68 manufacturer functions.

Probe source SHA-256 at both RED and GREEN:
`0df087350d611c430dbb4f5a5a77cf5f835d988ec5337dd5cf31f2919621bc78`.
The shared helper at RED was the V26 runner
`90b55544e9fbf3324e89aea3e246de8ae752f2371cbe7cbc3b945ca48a1408fe`.
Its V27 version is recorded below: output names and semantic main-menu
navigation were deliberately updated before GREEN; no claim of identical
shared-helper bytes across the two stages is made.

| Executed check | Result |
| --- | --- |
| New module and app syntax checks | PASS |
| Targeted LCD/basic/diagnostics/browser Node suite | 38/38 PASS |
| Full npm run check | 333/333 PASS, 0 FAIL, 0 SKIPPED, exit0 |
| Python Chrome source/body-integrity tests | 7/7 PASS |
| Receipt-derived visual-atlas positive/negative tests | 4/4 PASS |
| Python QA and atlas compilation | PASS |
| Feature register, implementation, menu and trace generators --check | PASS, no drift |
| Recursive public-runtime asset policy | PASS, 33 original source files |
| Existing reference archive | 24 PDFs, 2 ZIPs, 197171462 bytes; no validation failures; three prior acquisition gaps |
| ak plan validate/parse | Valid, seven phases, 14/50 entries checked, only Phase1 done |

The two pre-existing static expectations were moved to their real owners:
HOLD/N/A classification now resides in the presentation module, and the
browser checks the reason in the separate footer. Last-row navigation now
requires actual semantic entry IDs and Installation as the final item,
instead of depending on an accidental extra help row. No bound, source guard,
replay assertion or physical-input check was relaxed.

### Full actual Windows Chrome

| Viewport | Result | Actual response bodies / distinct paths | Completed body aggregate SHA-256 |
| --- | --- | --- | --- |
| 1366x768 | PASS | 63 / 31 | `74de75789581f27d4a77a5c829b9d5babcd08753c2e298725fea176b01af3a59` |
| 1920x1080 | PASS | 63 / 31 | `98ab78f8bae5ae1a2fefefe0eff9b6f54c91aa9e834e04f4b567ad4b7040efee` |
| 360x800 | PASS | 31 / 31 | `36ee815eda832598bf2c9844f4490886eabc6fe4c87a0f0486401e0feca76951` |
| 390x844 | PASS | 31 / 31 | `2a401d800df66fe321b3ec8db33374a32d62a27fb3f159867222e1be2aef4ca2` |

Both full receipts attest SOURCE_TREE_IDENTITY_PASS, SOURCE_TREE_STABLE_PASS
and harness PASS_UNCHANGED. All contexts report zero console/request failures.
The new module raises the runtime set from32 to33 and loaded paths from30
to31; no external asset is involved. The common runtime manifest is:

`2b9003590613d42aba72bf98aa33d4cb4f4d5a6ae173c9328f5329e4b38545ed`.

Executed harness identities:

- Desktop/shared: `c241b1c82ec76ec02a105360d069f5bba5e5c1e7974ff0413e1713280a04e532`
- Phone: `87e89cacb2cc3d04e60b19858f5f9477249f5e343e9f452dce769ef5745f8aec`

The eight GREEN targeted screenshots and nine full-suite V27 screenshots
were opened individually. Main menu groups/items and diagnostic color fields
are visible in the inspected target shots; desktop/phone White, NAV2 and
Tankenmaru screenshots preserve the previous workflows. This is the
implementer's visual review, not independent OEM pixel comparison. Viewport
shots can omit scrolled controls; full-page PNG height is not viewport height.

### Reproducible visual atlas

`tools/build_fcv588_visual_atlas.py` exports
`docs/evidence/fcv588-visual-atlas-v27.json` and
`docs/research/FCV588_PANEL_LCD_ATLAS_V27.md` from the three completed receipts.
It validates the four viewport identities, finite positive rectangles,
12 panel elements, 480x640 logical screen, screenshot references, the 17
visual checks, source equality and recorded acceptance results. Its --check
mode confirms deterministic output; four tests reject invalid geometry and
false hardware promotion. It does not execute a browser, reverify current
runtime bytes or retry the separately blocked historical V26 aggregate command.

At both desktop viewports the recorded head is680x680 CSS px, with LCD
376.11x502.45 CSS px and normalized rectangle approximately
x=.0712, y=.1392, width=.5531, height=.7389 relative to that head. These
are measurements of our drawing, not the real machine. Phone coordinates
are recorded separately as TRAINING_REFLOW. OEM coordinate targets and a
fidelity percentage remain null rather than inferred from test success.

### Canonical phase impact and acceptance

| Phase | V27 impact | Checklist retained | Whole-phase disposition |
| --- | --- | --- | --- |
| 1 | Add a traceable visual-evidence pointer, no rights promotion | 10/10 | Previously accepted |
| 2 | Observable BRILL preview; unchanged V26 face/input controls | 2/7 | Open; exact timing/geometry acceptance incomplete |
| 3 | Semantic menu rows, categories, choice preview and source explanations | 0/7 | Open; full OEM atlas/navigation acceptance incomplete |
| 4 | Display regression exercised; sonar model unchanged | 0/7 | Open; acoustic/advanced-view conformance not established |
| 5 | LCD Test now renders its declared patterns and exits correctly | 0/7 | Open; complete operator/per-profile review incomplete |
| 6 | New visual TDD, all target viewports and receipt-derived atlas | 0/7 | Open; independent course/release approval absent |
| 7 | Unchanged architecture passes the full regression | 2/5 | Open; no future-device implementation or release promotion |

This is a change-impact reconciliation, not a newly completed audit of every
OEM behavior. No checkbox was marked complete in V27. Totals remain6/22
accepted named Tasks and14/50 checklist entries (28%). The64 FCV rows still
have60 synthetic subsets, three partial C11/D09/D14 and unimplemented D04;
D15 is a separate synthetic platform with seven scored lessons. All65 claim
decisions and project/course release remain HOLD.

Installed guidance was applied through available Windows source/test/browser
tools. The observed ak binary remains3.0.0-beta.24. No install, update, Git,
deploy, hardware I/O, independent reviewer approval or literal native
ak-cook --auto --tdd --advice/Kongming execution is claimed. The previous
worker-startup problem was not bypassed by repeatedly opening replacement
worker chats.

### Finalization evidence

After the atlas, source-ledger and current-plan/acceptance narrative updates,
full npm run check was executed again:333/333 PASS,0 FAIL,0 SKIPPED,exit0.
The preserved output is `docs/qa/FCV588_V27_FINAL_NODE_CHECK.log`. A combined
Python discovery run then passed11/11 tests. Atlas --check, generated
implementation/menu/trace checks and canonical plan validate/parse also
passed after those documentation edits. No served runtime or Chrome harness
was changed after the completed browser runs.

The CLI created and returned the exact local journal path
`plans/journals/2026-10-15-fcv588-v27-lcd-rendering-and-visual-atlas.md`.
That file was reread. It records history only and does not replace this
canonical plan or grant release approval. No journal was published externally.

Next: obtain a verifiable public menu/face reference for the remaining
geometry and navigation differences, using this atlas as the measured
simulator baseline. Preserve source gaps instead of tuning a screenshot
or acceptance assertion to an unverified OEM assumption.
