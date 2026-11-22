# V28 — observed official front/LCD references and original rendering corrections

## Scope and source observation

Continue the sole v2 plan from V27. The Windows source and V27 report were
reread; Node is v22.22.0, Python 3.11.5, .git remains absent, and the existing
127.0.0.1:4173 listener is PID 24060. No server restart or installation occurred.
Six selected pre-change source/harness files were copied into this report
folder's `v28-source-before/` directory before runtime edits.

The FURUNO USA product gallery was actually viewed in the connected browser
on 2026-10-15, rather than inferred from image names or secondary summaries:

- Page: https://www.furunousa.com/en/products/fcv588
- Front image: https://www.furunousa.com/-/media/sites/furuno/pim/sharepoint_images/main_images/fcv588-front-reflection.png
- Bottom Disc image: https://www.furunousa.com/-/media/sites/furuno/pim/sharepoint_images/secondary_images/fcv588-bottomdiscmode.png
- White Line image: https://www.furunousa.com/-/media/sites/furuno/pim/sharepoint_images/secondary_images/fcv588-whitelinescreen.png

The live image elements reported natural dimensions 1000x1000. Native visual
inspection showed the front's central pedestal and small brand text in the
dark display surround. The two LCD examples show the depth reading at lower
left above the bottom-classification strip; the Bottom Disc example shows a
vertical left-edge echo color bar and a picture-speed token in the header.
These are qualitative observations, NOT physical measurements or pixel assets.
Exact colors, font outlines, dimensions, firmware, default Depth Size and all
other mounting options remain unverified. A front perspective is not a
dimensioned drawing. Keep the established 233x270 overall reference envelope
and 128x171 LCD estimate without upgrading bare-head dimensions to known.

Direct web image fetches failed, but the ordinary product gallery loaded in
the connected browser. One thumbnail click was intercepted by its open
lightbox; a fresh modal snapshot resolved the correct gallery controls.
This was reference-site navigation, not a failed simulator verification.
Reference screenshots stayed in the browser tool's reference cache, not in
web/src or distributable QA artwork. No OEM pixels, proprietary font, firmware
or image bytes may be copied into the runtime.

## Fixed design brief before implementation

Register: Product, existing offline training instrument.
Scene: Student physical-key practice on desktop; separate instructor controls;
phone retains explicitly non-OEM, enlarged-input training reflow.
Direction: Correct visible discrepancies against the observed manufacturer
gallery while preserving the existing app and behavioral contracts.
Color/type: Existing original gunmetal CSS and synthetic echo palette; system
Arial and monospace text. No RGB or font-outline extraction from the source.
Signature: Compact pedestal/display surround, lower-left sonar depth and one
vertical echo legend; status reflects the committed picture-advance setting.
Dials: variance1/10, motion1/10, density7/10. No decorative animation.

## TDD and acceptance contract

The new owned Chrome probe first runs against unchanged V27. Expected RED is
limited to the newly specified qualitative placement/header/legend assertions.
Boot, source identity, menu navigation, optional fixture guards, replay, reset,
reload and no-console checks are existing behavior and must remain operational.
No injected application state or external traffic is used by the probe.

The actual classification pane's existing reserved region must not be hidden
by moving the depth label. Its algorithms, palette values, advanced capability
guards and duplicated per-pane illustration are not being certified as OEM.
Settings, core, input/replay contracts and world clock remain unchanged.

## Results

### Implemented changes

Runtime edits are confined to `web/index.html`, `web/styles.css`,
`web/app.mjs` and the existing pure `web/lcd-presentation.mjs` module.
The central pedestal and narrow dark display-surround label now replace the
unsupported U-frame and large gray-face print. The model name remains in the
application heading. The 480x640 logical LCD, existing aperture ratios,
physical-input identities and explicitly non-OEM phone reflow are preserved.

Sonar depth is now lower-left; NAV retains the existing right-side placement
because the observed source images do not establish NAV geometry. The depth
label rises above the existing bottom-classification panel only when an
eligible frame actually paints that panel, not merely when a saved setting
requests it. Revoking the virtual mounting fixture restores the lower position.

`projectFcvEchoLegend` generates one vertical, strong-to-weak legend using
the original 8/16-color palette, including existing Palette/White Marker
changes. Power-off, LCD Test, Color Bar Off and unavailable sonar suppress
the legend. It is rendered once per screen, not independently in each DUAL
channel. NAV gives it a deliberate offset into the existing sonar pane.

`formatFcvPictureAdvance` displays the committed picture rate, including STOP;
uncommitted menu drafts cannot leak into the status header. No data source,
history rate or reducer behavior was changed. An additional visual review
found the original y=22 top depth-scale label overlapping the status region;
the actual `drawChannel` painter now places it below the frequency label.

### Actual RED, GREEN and final regression

The first reference probe completed every context with **no execution error**.
It reported 9 expected visual assertion failures at each desktop and 8 at
each phone: **34 failures and 20 passing baseline assertions**. The first
implementation passed the same 54 assertions. Its GREEN receipt is retained
as an intermediate checkpoint, not relabeled after the later label correction.

The range-label follow-up has a separate meaningful RED: the recording Canvas
test executed the actual `drawChannel` body and observed frequency y=43 but
top scale y=22. Its assertion failed on label ordering, not a missing file,
import or syntax error. The same test passed after changing the top scale
to y=62 and checks full-width, two half-width and NAV-sized pane bounds.

After that correction, the reference probe was run again under the distinct
FINAL output name. Only the CLI's accepted stage names changed; visual
assertions and inputs were not weakened. Existing V27 LCD regression also
ran against V28, using a new checkpoint option so historical outputs remain
untouched. Full desktop and phone suites wrote new V28 receipts.

| Executed verification | Observed result |
| --- | --- |
| Initial targeted panel/presentation/browser Node suite | 41/41 PASS |
| Additional actual-painter label regression | RED exit1, then GREEN exit0 |
| Full `npm run check` | 342/342 PASS; 0 FAIL, 0 SKIPPED; exit0 |
| Python integrity and atlas tests | 13/13 PASS; exit0 |
| Reference placement FINAL Chrome assertions | 54/54 PASS across four viewports |
| Existing LCD/BRILL/menu regression on V28 | 68/68 PASS across four viewports |
| Full Chrome desktop and mobile suites | All four viewports PASS; both commands exit0 |
| 64+D15 implementation, menu, trace and feature generators | All --check PASS; no conformance promotion |
| Recursive public-runtime asset policy | 33 source assets PASS |
| Archive verification | 24 PDFs, 2 ZIPs, 197171462 bytes; 0 validation failures; 3 pre-existing acquisition gaps |
| V27 historical atlas --check, V28 export and V28 --check | PASS; separate files, no historical overwrite |
| Canonical plan validate/parse | Valid, 7 phases, 50 entries, 14 checked (28%), 1 phase done |

Node output: `docs/qa/FCV588_V28_NODE_CHECK.log`.
After the source ledger, comparison, atlas and current acceptance/plan
narratives were updated, full `npm run check` ran again: **342/342 PASS,
0 FAIL, 0 SKIPPED, exit0**, preserved in
`docs/qa/FCV588_V28_FINAL_NODE_CHECK.log`. Python13/13, V28 atlas --check,
implementation/menu/trace --check and plan validation also passed again.
These post-document checks did not rerun or reinterpret the unchanged Chrome
contexts; no runtime or browser-harness edit followed their completed runs.
Browser logs: `docs/qa/FCV588_V28_DESKTOP_CHROME.log` and
`docs/qa/FCV588_V28_MOBILE_CHROME.log`.

### Source-bound browser evidence

| Completed context | Actual response bodies verified | Distinct paths | Body aggregate SHA-256 |
| --- | ---: | ---: | --- |
| 1366x768 | 63 | 31 | `4daec82735171e3cba02be3e6a0bb424fa8b111420089975519a50cbd23ce180` |
| 1920x1080 | 63 | 31 | `c0a1647d0647888936e22dceacf7efc87d0cc9a94d69dc348cbc7e333dee0ab8` |
| 360x800 touch emulation | 31 | 31 | `6f8d04681fb0f68f677f57a4b959449dec17e418835219e74b895b316f1c5a8a` |
| 390x844 touch emulation | 31 | 31 | `b6092da2f58e7ffd70627e556b37608028af6e9704d16ec63d4f329b6cd71908` |

The FINAL reference, V28 LCD, desktop and mobile receipts share the 33-file
runtime manifest
`79eb71132e233571b3f45454f55095c73292343ce7134405f38d4caa5ba65ab3`.
The completed browser suites attest source pre/post stability and unchanged
harnesses; they do not rely only on a PID, HEAD request or a historical PASS.

Recorded final harness SHA-256:

- Reference probe: `9b42ba94e87bd869faccd5c417dc709105b2b13a5b2bb77ee2941e1722eb4739`
- Desktop/shared verifier: `c2fc4b842d65d947b84a7c17ad9fc707887ea0e7921db4bc856e9176cd86dd70`
- Mobile runner: `0aae2ecd913f200323eebeb22206af3ae6d92002432405e38daec05fb62d68a5`

All **25 final-state screenshots** were opened: eight reference FINAL,
eight LCD regression and nine full-suite screenshots. The lower-left depth,
vertical legend, unobstructed diagnostic field, menu, NAV and White palette
were visually inspected. No completed simulator context reported console or
network failures. Source-site console messages belong to the external FURUNO
page and were not confused with simulator diagnostics. Touch contexts remain
Chrome emulation, not physical touchscreen or instrument measurements.

### Durable artifacts and remaining gates

The original V27 atlas is preserved; V28 has a separate JSON/Markdown atlas
exported from the completed V28 LCD/full-suite receipts. Its coordinates
remain explicitly simulator-only, with the qualitative three-image review
linked separately. See:

- `docs/research/FCV588_OFFICIAL_VISUAL_COMPARISON_V28.md`
- `docs/research/FCV588_PANEL_LCD_ATLAS_V28.md`
- `docs/evidence/fcv588-visual-atlas-v28.json`

Profile19, settings18, core7/event5/replay7, scenario7 and multi-runtime4
are unchanged. The actual ak binary remains 3.0.0-beta.24; auto-update was
disabled for the read-only CLI checks, and no install/update was performed.
No Git, server restart, hardware I/O, distribution or release occurred.

Only executed software/qualitative-placement checks pass. Canonical acceptance
still has 14/50 checklist entries and 6/22 named Tasks accepted; Phase1 alone
is complete. All 65 feature claims, independent reviewer/Kongming approval,
manufacturer rights, hardware equivalence and course/product release remain
HOLD. No failed-worker retry or independent approval was fabricated.

The remaining source priority is the White Line adjustment window and full
menu workflow: the current binary teaching option must not be treated as
the complete manufacturer adjustment solely because an echo line is drawn.
Verify the complete source/firmware context before expanding values or key
semantics. Exact key centers, fonts, colorimetry, head dimensions and sonar
physics remain unmeasured; public pictures do not establish 100% equivalence.
