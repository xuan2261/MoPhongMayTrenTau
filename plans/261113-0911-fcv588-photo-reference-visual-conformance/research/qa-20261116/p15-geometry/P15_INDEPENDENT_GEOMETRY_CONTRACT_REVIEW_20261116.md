# P15 — Independent source geometry contract review

Date: 2026-11-16  
Reviewer: worker-21  
Mode: READ-ONLY source/evidence audit  
Canonical root: `C:\Work\MoPhongMayTrenTau`

## Scoped verdict

**Seven-mode logical topology / pane ownership: GO_BOUNDED.**  
**Photo-relative topology claim: GO_BOUNDED, qualitative/normalized only.**  
**Responsive DOM/LCD geometry contract: NO_GO.**  
**P15 geometry acceptance as a whole: NO_GO_BOUNDED pending two internal geometry defects below.**  
**OEM/physical/hardware/firmware/rights/release: HOLD.**

This review found no source basis for an OEM-percentage, physical-millimetre or calibrated camera-pixel claim. It found two concrete **source-authored internal geometry defects** that can be measured without treating the eight photographs as a calibrated framebuffer oracle:

1. the logical `480×640` canvas is non-uniformly scaled by the CSS LCD content box;
2. LCD DOM overlays derive font/position geometry partly from the external browser viewport (`vw` and fixed CSS px), so normalized overlay geometry changes even when the rendered LCD itself has the same size.

These are internal consistency defects, not claims that a particular OEM pixel coordinate is correct.

No source, test, browser, server, photograph or prior QA artifact was edited or run interactively by this reviewer. The eight original JPEGs were inspected read-only.

## 1. Source and evidence bindings

Canonical source inspected:

| Path | SHA-256 |
|---|---|
| `web/index.html` | `6918d1b5e587034c5253977dd42dec87e8e47ae604bd26388b7389846cc74847` |
| `web/styles.css` | `2925f129251caf72a71c846484d2f4facbb1d02d6480309b98d8399e800f4660` |
| `web/app.mjs` | `59f2b0bea8e53097ca8302622557b3e5c53c661c7bf95d9ead62e179f2c60bb1` |
| `web/lcd-presentation.mjs` | `7bb97c1bc7d2ad6e57f8b8fb04ded916d0e1f575da4918645aeb038f171b98c6` |
| `src/devices/fcv588/display-layout.mjs` | `92c4c5fb6bb0d1f31e1c501bd112cebc6ea5c73453a8b6c519c0dccdc7652aed` |
| `src/devices/fcv588/model.mjs` | `fdbf94e57e86928c6a6b68f6d012a37c50a62aac1ad1d4752340a0e28ea250a9` |

Geometry/reference evidence inspected:

| Artifact | SHA-256 |
|---|---|
| `phase-07-independent-visual-qa.md` | `3fdbdb360e25c2cabadcd4883bd3c51430563ac3943136c35cb16de344d2e454` |
| `p07-review/P07_INDEPENDENT_FINAL_REVIEW_WORKER1_GO_20261116.json` | `ed6238165799e3094f0c7fa211b296cc7431fd4be3b302262ff6fcfeff5d6933` |
| `p07-pure-layout/P07_PURE_DISPLAY_MATRIX_RECEIPT_20261116.json` | `fcda83a950c44f74e94082eca26ad7c784c47e9af705c20922801a45682fc9bf` |
| `p07-browser/fcv588-p07-browser-20261116T093801+0700-31a0b649.json` | `16a7c5261b3e50a03055059e21cd54c4512c5e5acc839548f585a386e73733d7` |
| `p07-photo-a11y/P07_VISUAL_REFERENCE_A11Y_ASSESSMENT_20261116.md` | `455dc75a18b96ffc27a070b9315ac27889c5a69aaba206f9eecb4dd4bae464c5` |
| `p09-geometry-qa/P09_DETERMINISTIC_HOMOGRAPHY_QA_20261116.json` | `7e41f688ba684df7aa9720745d665bec323f1f96c7d3a512901563d600571aab` |

P07's pure projector receipt is logically valuable but explicitly not real CSS viewport coverage: the same logical `480×640` projector was evaluated under external viewport labels. P07's real browser receipt is the relevant DOM/CSS geometry evidence.

P14 changed `web/app.mjs` only in settings-version import/startup migration paths; a read-only diff against the guarded P14 preimage shows no change in the `renderScreen()` geometry path. `display-layout.mjs` also retains the P07 hash. Therefore the existing P07 real-browser measurements remain applicable to the current P14 display geometry, while P14's revision-aware menu work does not cure or create the two defects identified here.

## 2. Eight original JPEGs — permitted conclusions only

All eight originals remain `REFERENCE_ONLY`, `590×1280`, with the following exact SHA-256 values:

| File | SHA-256 | Bounded visible relationship |
|---|---|---|
| `giaoDien.jpg` | `e7b78466fa582dc0cc50aec8e2fc264f8b3ee187d93a53cace1e88d1e156c99c` | Main menu occupies most LCD but leaves lower sonar/depth visible. |
| `lf.jpg` | `c3ef46a27fc965c95d2df33981b0c66775b848ae96aa8efdcad932b91a50c3ef` | Single LF sonar surface, large depth readout low/left. |
| `hf.jpg` | `7f1a69504fd703988750729ee38b4964229480a4c55b20ae0f0bb4815f6ea2a9` | Single HF sonar surface, same broad single-pane relationship. |
| `dual.jpg` | `4d88fe11cda8a9107f97e44a392103cc68eb8ab8e685b7b5e7408a556a2bc37b` | LF left / HF right, split near half; large depth value crosses the divider. |
| `zoom.jpg` | `ecc7af35e30aafb8f0e9cfe9f05f94c8d529d6d410a2e523053286149d330b52` | BL-LF left / normal LF right, near-half split. |
| `zoom2.jpg` | `41eaa80b42450b36c3b0f547b9276e26703ce1b74d2f85b1393255fda42bcd99` | BL-HF left / normal HF right, near-half split. |
| `nav1.jpg` | `b90de3afeb18730e10e4ac897fb20bbde36155e25cc344abed259ba1de0d030e` | Large data pane left / narrow sonar strip right. |
| `nav2.jpg` | `9f225c6834efe86c76fd8a86bbfaa8f6d276f1e055a815efc91087a832397de6` | Data boxes left / narrow sonar strip right. |

The P07 photo probe reported image-space divider fractions of approximately `0.474` for DUAL, `0.475` and `0.493` for the two BL photographs, `0.721` for NAV1, and `0.679` for NAV2. P09's tentative-ROI homography QA similarly supports near-half DUAL and roughly two-thirds/one-third NAV topology, but explicitly states that its corners are tentative metadata and not OEM constants.

Accordingly, this review uses those photographs only to support the **ordering and broad relative topology** of panes. It does **not** use them to derive OEM pixel tolerances, millimetres, exact physical control positions, framebuffer aspect, font sizes, RGB, or a fidelity percentage.

## 3. Source-valid seven-mode layout contract

`src/devices/fcv588/model.mjs:32` declares exactly seven display modes:

```text
NAV1, LF-ZOOM, LF, DUAL, HF, HF-ZOOM, NAV2
```

`src/devices/fcv588/display-layout.mjs:6-25` gives a small, measurable logical contract on the `480×640` training canvas:

- NAV1/NAV2: left data pane `2/3` width and right sonar pane `1/3` width (`:12-15`);
- `windowRatio` is parsed and bounded to `25%..75%` (`:17-19`);
- DUAL: LF left, HF right (`:20-21`);
- LF-ZOOM/HF-ZOOM: zoom left, normal sounder right (`:22-23`);
- LF/HF: one full-width normal pane (`:24`).

`web/app.mjs:434-546` consumes that projector rather than duplicating pane ratios:

- NAV uses `layout.panes.nav` and `layout.panes.sonar` (`:439-489`);
- DUAL paints LF then HF and a two-pixel logical divider (`:499-508`);
- zoom paints zoom left, normal right, then a divider (`:510-537`);
- normal single-frequency draws one full pane (`:538-541`).

The P07 pure matrix covered 7 modes × 3 zoom settings × 3 viewport labels = 63 cases / 447 logical checks with zero failures. The P07 real browser suite also exercised the distinct display states at 375×812, 1366×768 and 1920×1080 and found no horizontal overflow or canvas escape.

**Decision for this layer: GO_BOUNDED.** This proves the simulator's authored logical topology, not exact OEM geometry.

## 4. Measurable DOM/CSS invariants worth preserving

These are source-authored invariants suitable for regression tests without calibrating the photographs:

1. **Containment:** `#echo-canvas` must remain fully inside `.lcd` for every supported viewport and every display mode.
2. **Logical pane coverage:** panes returned by `planFcvScreenLayout()` must start at x=0, be contiguous, non-negative, and sum exactly to logical width 480.
3. **Mode ownership:** DUAL = LF-left/HF-right; ZOOM = zoom-left/normal-right; NAV = data-left/sonar-right; LF/HF = one full pane.
4. **DUAL readout relationship:** `planFcvDepthReadout()` anchors the large depth DOM at the DUAL divider (`display-layout.mjs:31-42`; `app.mjs:435-438`); for representative content and size classes its DOM bounding box should continue to straddle the mapped divider.
5. **NAV depth ownership:** `shouldShowFcvGlobalDepth()` returns false for NAV1/NAV2 (`lcd-presentation.mjs:107-113`); the global DOM depth overlay must stay hidden there rather than overlaying configured NAV data boxes.
6. **Menu containment:** main menu remains inside the LCD, keeps five category rows, has no horizontal overflow, and leaves a non-zero lower LCD region visible. Existing CSS source is `styles.css:158-178` and P07 observed an uncovered-bottom fraction near 0.215 at two viewports. That is a simulator/browser invariant, not an OEM pixel tolerance.
7. **Desktop face relationship:** LCD housing remains left of the narrow control column (`styles.css:102`, `:264`); this is qualitatively supported by the photos. Exact physical placement remains SOURCE_GAP.
8. **Mobile contract:** at `<=700px`, the face intentionally reflows into a training layout (`styles.css:378-413`). It must be tested as an explicit non-OEM responsive mode, not marked as a faceplate geometry failure.

## 5. Concrete defect G1 — canvas is anisotropically stretched

**Severity:** HIGH internal visual-geometry defect  
**Status:** VERIFIED_SOURCE + corroborated by existing browser measurements  
**OEM assertion:** none

### Causal path

- `web/index.html:45-46`: the LCD contains a canvas whose intrinsic bitmap is exactly `width="480" height="640"`, aspect `0.75`.
- `web/styles.css:20`: all elements use `box-sizing:border-box`.
- `web/styles.css:103`: `.lcd` has `aspect-ratio:128 / 171` and a `4px` border.
- `web/styles.css:104`: `.lcd canvas { width:100%; height:100%; }`.

The canvas bitmap is therefore resized to the LCD **content box**, while the declared `128/171` aspect applies to the LCD border box. The canvas content box does not preserve `480/640`.

Existing real-browser P07 measurements demonstrate the distortion:

| Browser viewport | canvas client size | client aspect | intrinsic aspect | non-uniform scale consequence |
|---|---:|---:|---:|---|
| 375×812 | `302 × 406.140625` | `0.743584811` | `0.75` | horizontal/vertical scaling differs by ~`0.86%` |
| 1366×768 | `369.296875 × 496.03125` | `0.744503245` | `0.75` | differs by ~`0.73%` |
| 1920×1080 | `369.296875 × 496.03125` | `0.744503245` | `0.75` | differs by ~`0.73%` |

The exact percentages above are internal CSS/canvas measurements, not photo-derived OEM errors.

### Why this matters

Every logical item painted in `renderScreen()`—pane dividers, sonar history, depth axes, NAV rows, zoom-window marker, echo legend—uses the `480×640` coordinate space. A non-uniform CSS scale subtly changes all rendered slopes, widths and normalized positions on screen. A logical projector test cannot detect it because the defect occurs after canvas painting, in CSS compositing.

### Required regression oracle

In isolated Playwright, for every viewport:

```text
abs((canvas.clientWidth / canvas.clientHeight) - (canvas.width / canvas.height))
```

must be within a deliberately authored small browser-rounding tolerance. The current source should RED this invariant. The eventual implementation may choose any explicit internal authority—logical 480×640, an independently justified effective-LCD ratio, or letterboxing—but it must not silently stretch x and y by different factors.

## 6. Concrete defect G2 — LCD DOM overlays depend on outer viewport geometry

**Severity:** HIGH responsive consistency/regression defect  
**Status:** VERIFIED_SOURCE + directly observable in existing P07 browser receipt  
**OEM assertion:** none

### Causal path

Canvas geometry is logical-LCD based (`app.mjs:359`, `:434-546`), but overlay geometry mixes unrelated external CSS units:

- `styles.css:105`: header font `clamp(9px, .9vw, 15px)` and fixed `top:5px; left/right:9px`;
- `styles.css:112`: depth position uses fixed `left:11px` and fixed/default bottom px;
- `styles.css:135-138`: depth font sizes use `vw` clamps, e.g. Medium `clamp(24px, 3.1vw, 43px)`;
- `styles.css:139-140`: unit/VRM dimensions are fixed CSS px;
- `app.mjs:366-369`: the DOM depth element is updated separately from the canvas;
- `app.mjs:435-438`: DUAL supplies only an anchor percentage from the logical divider; the depth glyph dimensions still come from viewport-dependent CSS.

### Existing measurable witness

P07 real Chrome reported the **same LCD/canvas size** at 1366×768 and 1920×1080:

```text
LCD    377.296875 × 504.03125
canvas 369.296875 × 496.03125
```

Yet the same LF depth DOM changed width:

```text
1366×768  depth width = 91.921875 px
1920×1080 depth width = 93.375 px
```

The cause is source-visible: the Medium depth font is driven by `3.1vw`, and the header uses `.9vw`. With the same LCD width, the header's computed middle term changes from about `12.3px` at 1366 to its `15px` cap at 1920. Thus outer-page width changes LCD typography even though the LCD itself does not grow.

The fixed 11px depth left offset also changes normalized placement with LCD size: the P07 LF witness is roughly `3.64%` of canvas width on the mobile LCD and `2.98%` on the desktop LCD.

### Why this matters

The canvas and the DOM overlay do not share one coordinate system. This can regress header fit, DUAL depth/divider overlap, depth-vs-axis alignment and VRM label placement at a viewport not present in the three existing screenshots. Existing P07 proves DUAL overlap for its tested value and three viewports; it does not establish scale invariance of the contract.

### Required regression oracle

For pairs of viewports that produce the same `.lcd` client size—1366×768 and 1920×1080 are an existing witness—record normalized DOM rectangles relative to the LCD/canvas:

```text
(x - lcd.left) / lcd.width
(y - lcd.top) / lcd.height
width / lcd.width
height / lcd.height
computed font-size / lcd.width
```

for `.screen-top`, `.depth-indicator`, depth value/unit and `#vrm-indicator` where visible. These values should not change merely because unrelated page width changed. If intentional responsive typography is desired, it should be explicitly keyed to the LCD/container contract rather than accidental `vw` coupling.

## 7. Findings that are NOT defects on current evidence

### NAV `2/3 : 1/3`

`display-layout.mjs:12-15` fixes NAV data/sonar at two-thirds/one-third. Photo-space/P09 observations vary around this relationship, as expected from uncalibrated perspective/corner picks. There is no lawful basis here for calling the exact `2/3` value an OEM error.

### DUAL and zoom default `50 : 50`

`display-layout.mjs:17-23` uses the operator `windowRatio`, default 50 and bounded 25..75. The supplied DUAL and BL photos qualitatively support a near-half split. No concrete source defect is established by their uncalibrated divider fractions.

### Desktop face percentages and control diameters

`styles.css:102` places the display housing at left `5.5%`, width `59%`; `:264` places controls at left `73%`, width `21%`; pad/knobs are `86px`/`59px` (`:271`, `:286`). These encode an original training drawing whose broad left-display/right-controls relationship is visible in the photos. P07/P09 explicitly forbid converting the photos into precise hardware coordinates, so this review does not call these percentages wrong.

### Mobile reflow

`styles.css:378-413` explicitly declares the `<=700px` version a reflowed training face and not physical geometry. It is an intentional responsive contract, not an OEM-conformance defect.

## 8. Likely visual-regression surfaces

Even after G1/G2 are fixed, the following deserve explicit DOM checks because they combine independent coordinate systems or breakpoints:

- **700/701px**: intentional face reflow boundary;
- **1240/1241px**: workbench/training-panel column boundary;
- **DUAL with Small/Medium/Large depth sizes**: depth glyph box versus logical divider;
- **DUAL/ZOOM with windowRatio 25, 50, 75**: canvas pane boundary, divider and echo legend containment;
- **NAV1/NAV2 with 1–4 configured boxes**: equal-height row layout, right sonar strip and absence of global depth DOM;
- **main menu and configuration overlays**: scrolling/ellipsis and uncovered lower-LCD region;
- **VRM near top/bottom clamping**: canvas line fraction versus DOM label top percentage;
- **375×812 captures**: target-scrolled screenshots must not be interpreted as whole-device/native-frame proof, consistent with P07's existing limitation.

## 9. Isolated Playwright acceptance design

Do not use the protected `127.0.0.1:4173` process. Use a test-owned loopback server/port and one isolated browser session. Capture response-body SHA and DOM measurements in the same run.

Recommended external viewports:

```text
375×812
700×900
701×900
900×900
1240×900
1241×900
1366×768
1920×1080
```

For every relevant state, collect `getBoundingClientRect()` plus computed styles for:

```text
.device-frame
.equipment
.display-housing
.lcd
#echo-canvas
.controls
.pad
#gain-knob
#mode-knob
.screen-top
.depth-indicator
#vrm-indicator
.lcd-overlay
```

Minimum source-valid checks:

1. `scrollWidth <= viewportWidth` where the responsive contract claims no horizontal overflow.
2. Canvas rectangle is contained inside LCD content area.
3. **G1 RED/GREEN:** canvas client aspect matches intrinsic canvas aspect within explicit browser-rounding tolerance.
4. **G2 RED/GREEN:** for equal-size LCDs across different outer viewports, normalized overlay rectangles/computed font sizes are stable.
5. LF/HF: one full logical pane.
6. DUAL: LF/HF panes are contiguous; mapped divider equals logical layout divider; depth DOM straddles divider for representative depth values and each size class.
7. LF-ZOOM/HF-ZOOM: zoom pane remains left, normal pane right; test `windowRatio` 25/50/75 and marker/divider containment.
8. NAV1/NAV2: data/sonar boundary equals the source-authored logical projector; global depth DOM hidden; 1–4 NAV rows remain within data pane.
9. Main menu: five categories, selected row visible, options popup within LCD, no horizontal overflow, non-zero lower LCD region remains uncovered.
10. Mobile `<=700`: assert intentional reflow markers—controls are static/grid, enlarged hit targets, mode-scale hidden, mobile warning visible—rather than comparing it to desktop face geometry.

Screenshots should be supplemental evidence only. Do not establish PASS using JPEG RMSE/SSIM or raw screenshot-to-photo registration. If P08/P09 normalized tentative ROI metadata is used, use it only as a broad relationship check with its recorded uncertainty and never convert it into physical/OEM tolerance.

## 10. Gate table

| Gate | Decision |
|---|---|
| Seven declared modes / logical pane topology | **GO_BOUNDED** |
| DUAL LF-left/HF-right | **GO_BOUNDED** |
| ZOOM-left / normal-right | **GO_BOUNDED** |
| NAV data-left / sonar-right | **GO_BOUNDED** |
| Photo-relative topology support | **GO_BOUNDED / uncalibrated** |
| Existing P07 logical projector matrix | **PASS, but not CSS viewport proof** |
| Existing P07 real browser containment/overflow | **PASS_BOUNDED for tested states/viewports** |
| Canvas intrinsic-to-CSS aspect consistency | **NO_GO — G1** |
| DOM overlay normalized viewport stability | **NO_GO — G2** |
| Mobile physical-face equivalence | **NOT_A_CLAIM; intentional training reflow** |
| Exact OEM pixels/mm/RGB/glyph/detents | **NOT_VERIFIED / HOLD** |
| Hardware / installed firmware / rights / release | **HOLD** |
| P15 responsive geometry contract | **NO_GO_BOUNDED** |

## Final conclusion

The current P14 canonical source has a coherent and source-valid **seven-mode logical display topology**, and the eight photographs support its broad DUAL/ZOOM/NAV relationships without supplying a calibrated pixel oracle. That layer is suitable for continued bounded development.

P15 should **not** declare the current responsive geometry contract complete. The source presently stretches the logical canvas non-uniformly and uses external viewport units/fixed CSS pixels for DOM elements that visually share the LCD with logical-canvas content. Both defects are objectively measurable from the authored source and existing browser receipts, without any OEM assumption.

The smallest next gate is an isolated Playwright RED/GREEN geometry suite for G1 and G2, followed by the seven-mode/breakpoint matrix above. Exact OEM geometry remains outside this gate and must stay HOLD unless a lawful calibrated measurement protocol is separately established.
