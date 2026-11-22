# FCV-588 PUBLIC_REFERENCE — V19 responsive classroom and real Chrome QA

**Observed on 2026-10-15:** Windows workspace `C:\Work\MoPhongMayTrenTau`,
`127.0.0.1:4173` existing server. **Scope GO:** local training UI, input,
source identity and exact four browser contexts. **Course/OEM/hardware/media
rights/public distribution: HOLD.** No Git repository, commit, deployment,
real marine hardware, NMEA transport or radio output was used.

## Active plan and source boundary

- Continues the **existing** v2 plan; no replan or project reconstruction.
  Seven phases / 22 named Tasks / 50 checkboxes, with 10/50 checked in
  Phase1 only. The unapproved full-source and per-lesson gates of later
  phases remain open even when meaningful synthetic behavior is implemented.
- Pinned runtime `F1-public-reference-14`, settings v13,
  core `f1-core-5`, event/replay schema5, scenario7, multi-runtime3.
  No runtime/replay behavior or persisted setting semantics were changed
  during V19: new work is browser CSS/layout, a training-only disclosure,
  and accessibility/response-integrity QA. Historical V18 profile/receipt
  remains the source-safe D09 dynamic menu milestone.
- Runtime artwork remains original DOM/CSS/Canvas. On **mobile**, the face
  is deliberately **reflowed into LCD-above-controls** so keys are usable by
  touch. The visible disclaimer states this stacked phone arrangement is
  *not* manufacturer hardware geometry.

## RED → GREEN → REFACTOR

**RED — real Google Chrome phone acceptance:** The new
`tools/fcv588_mobile_viewport_acceptance.py` launched isolated actual Chrome
with emulated touch contexts at precisely `360×800` and `390×844`.
The earlier responsive rules failed: at 360, the LCD was too narrow to be
legible; at 390, `#key-menu` measured approximately **94×25 CSS pixels**,
while individual TrackPad regions were also below the 44px training hit-area
gate. These are real DOM layout measurements, not only source-code regexes.

**GREEN — original training layout:** `web/styles.css` now stacks the
preserved portrait LCD and controls at `max-width:700px`, uses a 160×160
TrackPad with four nonoverlapping 44×44 direction keys, 44px or larger main
keys, >=64px illustrated GAIN/MODE knobs and a larger POWER key. The page
uses vertical document scrolling rather than clipping controls horizontally.
`web/index.html` adds an explicit *phone training adaptation* caption to
avoid claiming faceplate geometry equivalence.

**Second observed RED — nested instructor D15 form:** Reviewing the first
full-page Chrome screenshot showed the lesson picker and score controls
squeezed into phantom columns: a 360px viewport placed a lesson-start button
into a roughly **446px-tall** slot. A new browser geometry assertion caught
this fault at both phone widths. Root cause: the `@media (max-width:1240px)`
selector `.training-panel h3` applied `grid-column:span 2` to headings
*inside* child `.lesson-panel` grids. Restricting the selector to direct
children (`.training-panel > h3`) removes the unintended nested columns.
Phone `select` and lesson buttons now fill their cards with at least a 44px
height. Both browser contexts passed the resulting layout and screenshot QA.

The mobile QA runner first over-counted the generated System menu's help
footer as a selectable row, wrapping past its true last `Installation` entry.
The harness was corrected to locate the actual `Installation Settings`
label rather than count the footer. A premature harness failure was **not**
reported as product PASS.

## Observed V19 runtime acceptance

The desktop regression runner writes
`docs/qa/FCV588_CHROME_VIEWPORT_V19_RECEIPT.json`; the independent phone
runner writes `docs/qa/FCV588_CHROME_MOBILE_V19_RECEIPT.json`.

| Real isolated Google Chrome context | Result | Actual delivered source bodies | Distinct loaded paths | Browser errors |
| --- | --- | ---: | ---: | ---: |
| Desktop 1366×768 | PASS | 58/58 SHA-256 verified | 29 | 0 |
| Desktop 1920×1080 | PASS | 58/58 SHA-256 verified | 29 | 0 |
| Touch-emulated phone 360×800 | PASS | 29/29 SHA-256 verified | 29 | 0 |
| Touch-emulated phone 390×844 | PASS | 29/29 SHA-256 verified | 29 | 0 |

At 360px the phone LCD measured **310 CSS px wide** and the complete face
342px; at 390px the LCD measured **340px wide** and the face 372px, both
without horizontal document overflow. All 12 physical touch surfaces had
**at least 44×44 CSS px**, the four TrackPad hit regions did not overlap,
the last System menu item and its full dialog stayed inside the LCD, and a
genuine Chrome `locator.tap()` emitted exactly **one** canonical TrackPad
event. D15 lesson controls were measured large and stable. Physical phone
hardware itself was not tested; Chromium's `has_touch/is_mobile` flags are
emulated input, not device certification.

The desktop contexts retained all V18 regression scenarios including POWER
hold, real pointer capture cancellation, native MODE/GAIN gesture,
Tankenmaru option revoke while a downstream FUNC Key edit was staged,
separate D15 scoring, D02 settings reload and replay, and no external
network requests. Both exact desktop viewport widths and heights were
measured; Canvas remained 480×640 logical pixels and there were zero
JS console or HTTP/network errors.

**Source integrity:** both runners independently checked the same 31 allowed
`src/`/`web/` assets at preflight/postflight and hashed **the actual body
bytes Chrome received** for every completed HTTP response.

- Manifest SHA-256:
  `7e6538fd92f2f02fa0dc517b5b729fa75dd523be7bc71e5a00393bd5d7bdf590`.
- Desktop 1366 response digest:
  `6c9c341ad0780b9650aa80ad1bc6c7c7fb70c17394dd84c51bc4988d35f7483a`.
- Desktop 1920 response digest:
  `27ae170cb2a28291263e97449a823e6d1c195391b9c2e58999b570fbc7dae7e6`.
- Phone 360 response digest:
  `93846510b4d6f352e84696f8fcff2a49ae9257ac722e2cdb6ffe00f967db8422`.
- Phone 390 response digest:
  `d365a3eaa8463eddaed15ead0a497fcba3be42f9d2cc5909e84d033620efb217`.

Stored screenshots:

- `docs/qa/screenshots/fcv588_public_v19_1366x768.png`
- `docs/qa/screenshots/fcv588_public_v19_1920x1080.png`
- `docs/qa/screenshots/fcv588_public_v19_1920x1080_nav2_configured.png`
- `docs/qa/screenshots/fcv588_public_v19_mobile_360x800.png`
- `docs/qa/screenshots/fcv588_public_v19_mobile_390x844.png`

These are full-page captures, not OEM photos or fixed-height viewport-only
bitmaps. The 390px image was visually inspected: full-width portrait LCD,
separate visibly touchable keys, correctly stacked D15 lesson form and an
explicitly labeled non-OEM phone arrangement were observable.

**Latest full Node check:** `npm run check` **287/287 PASS, 0 FAIL, exit 0**.
The static browser test now checks that mobile reflow is disclosed, important
phone touch CSS contracts remain present and the phone runner actually uses
Chrome source-body verification rather than replacing it with static claims.

## Still HOLD / next admission gates

This is scoped classroom software accessibility evidence, not 64 complete
FCV functions or a hardware-equivalence claim. D04 licensed alternate
language/reboot remains not implemented; C11, D09 and D14 are partial; exact
firmware, Tankenmaru partner output and IEC/NMEA I/O remain unverified or
intentionally disabled. All per-feature `claimDecision` values remain HOLD.
There is no authorized redistribution of restricted manuals/photos/videos,
no independently approved course/lesson release, and no observed actual
physical switch or touchscreen. The faceplate and sonar physics are still
original **synthetic subsets**, not OEM-identical pixels or acoustic returns.

Until every phase-specific source/rights, individual positive/negative/
cancel/replay/browser evidence and reviewer gate passes, **keep later-phase
checklist boxes unchecked** and distribution/hardware validation HOLD.
