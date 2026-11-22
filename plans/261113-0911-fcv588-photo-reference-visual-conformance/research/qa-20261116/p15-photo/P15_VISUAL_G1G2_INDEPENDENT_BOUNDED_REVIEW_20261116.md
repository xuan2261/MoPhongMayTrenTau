# P15 — Independent bounded visual G1/G2 post-fix review

Date: 2026-11-16 (+07)  
Reviewer: worker-20  
Mode: READ-ONLY qualitative post-fix review  
Canonical project: `C:\Work\MoPhongMayTrenTau`  
Stage: `C:\Work\MoPhongMayTrenTau\_p15_stage_20261116`

## Verdict

**GO_BOUNDED** for the reviewed internal CSS-only G1/G2 geometry fix.

No concrete new visual regression was found in the reviewed baseline-vs-stage screenshots. The fix preserves internal simulator invariants across the inspected 375×812, 1366×768 and 1920×1080 captures:

- bezel and LCD aperture remain fully visible and readable;
- no new clipping of header, depth value, `[DEMO]`, pane dividers or right-side controls is visible;
- LF/HF single-pane, DUAL split-pane, NAV data/sonar and zoom split-pane identities remain recognizable;
- the three LF zoom cases Bottom Lock / Bottom Zoom / Marker Zoom remain visibly distinct;
- there is no evidence that source JPEG pixels were introduced into runtime output.

This is **not** OEM visual-conformance approval. Physical dimensions, calibrated LCD ROI, exact colors/fonts/pixels, firmware, hardware equivalence, media rights and release remain **HOLD / NOT_VERIFIED**, exactly as recorded by the prior P15 eight-photo source audit.

## Prior source boundary

This review reuses the already completed source audit:

`p15-photo/P15_EIGHT_OEM_PHOTO_SOURCE_AUDIT_20261116.md`  
SHA-256 `2f7f7354506604d7b8798bfb12ac9ae88e28051c0dbb411b9454b2775f983130`.

That report established that the eight originals are REFERENCE_ONLY photographs, not framebuffer dumps, and may ground only bounded qualitative relationships such as labels, pane order, divider presence, menu/NAV topology and general readout placement. P15 G1/G2 is therefore judged only against **internal UI invariants**, not photo-pixel similarity or OEM RMSE.

## Stage source/evidence identity

Fresh read-only inspection of `P15_STAGE_CSS_SOURCE_INTEGRITY_20261116.json` shows:

- runtime paths: 50 before / 50 after;
- changed existing runtime paths: **1**;
- the single runtime change is `web/styles.css`;
- canonical preimage CSS SHA-256: `2925f129251caf72a71c846484d2f4facbb1d02d6480309b98d8399e800f4660`;
- staged CSS SHA-256: `ce699bc88586fc0b883ba357661cda4ccb414069127d6ec23aa81a4300d6afeb`;
- `web/app.mjs`, display/model/replay/menu code and the other runtime paths remain byte-identical.

The CSS diff is narrowly scoped:

1. add `container-type: inline-size` to `.lcd`;
2. render the intrinsic 480×640 canvas with `width:100%; height:auto`, vertically centered, rather than stretching it to both CSS width and height;
3. tie LCD header/demo/depth typography to LCD container width using `cqw` rather than external viewport width.

No CSS image URL or JPEG import was added. The only literal `.jpg` reference in the changed CSS is an existing explanatory comment mentioning `dual.jpg`; it does not load an image.

## Browser receipt verification

Fresh parse of:

`p15/P15_STAGE_CHROME_MODE_GEOMETRY_V1_20261116.json`  
SHA-256 `f1e7f1d3a80743c4037cf1bf66085527d436be23ea9b3b49fcb0169217d86441`

shows:

- checks: **103/103 PASS**;
- captured screenshots: **24**;
- HTTP source bodies: **273/273 exact SHA match**;
- receipt errors: 0;
- page errors: 0;
- external network requests: 0;
- eight REFERENCE_ONLY OEM JPEG routes: **8/8 HTTP 404**;
- owned test server exited: true.

The receipt also confirms the logical LCD canvas remains 480×640 and the three zoom cases produce distinct captures.

The staged full Node suite is **579/579 PASS** and staged Python QA is **13/13 OK**.

## G1 geometry result

The source-valid preimage geometry gate recorded canvas stretching at all measured viewports. Example reproducible internal measurements:

| Viewport | Preimage rendered canvas aspect | Stage rendered canvas aspect | Intrinsic target |
|---|---:|---:|---:|
| 375×812 | 0.7438313 | 0.7500185 | 0.75 |
| 1366×768 | 0.7445032 | 0.7500079 | 0.75 |
| 1920×1080 | 0.7445032 | 0.7500079 | 0.75 |

These values come from the project’s own DOM geometry receipts, not from OEM photographs. The stage therefore removes the internal anisotropic canvas stretch while keeping the canvas centered inside the existing 128:171 LCD housing. This is an internal renderer/layout correction only; the remaining small bezel/letterbox relationship is not an OEM physical measurement.

## G2 typography result

The preimage tied header/depth text size partly to external page viewport width even when the physical LCD element stopped growing. The stage instead ties those values to the LCD inline container.

At the identical 377.296875 px LCD width used by desktop captures:

- preimage 1366×768: header 12.294 px, depth 42.346 px;
- preimage 1920×1080: header 15 px, depth 43 px;
- stage 1366×768: header 12.2976 px, depth 42.2845 px;
- stage 1920×1080: header 12.2976 px, depth 42.2845 px.

Thus the stage removes page-viewport-driven typography growth while the LCD itself is unchanged. At 375×812, text becomes larger than the old minimum-clamped baseline but remains within the LCD and visually legible in the inspected screenshots.

## Native-vision baseline vs stage review

All comparisons below were made from the existing real screenshots using Core native image inspection. No browser was opened or controlled by this reviewer, no screenshot was regenerated, and no image-generation or photo-RMSE method was used.

### LF

Reviewed:

- `P15_V2_MODE_LF_375x812_20261116.png` — SHA `248038467c655261e891bf7117ab9aacee51bf2d0be72f2bbb2dfdb05a21a411`;
- `P15_STAGE_MODE_LF_375x812_20261116.png` — SHA `840e045b21617ca0747109e6f2cce86466429ae88639e3d15cff3c4ea97b3f55`;
- the corresponding 1366×768 and 1920×1080 baseline/stage pairs.

Finding: the single sonar pane, right tick labels, header, lower-left depth and lower-right demo marker remain readable. At 375 the stage depth/header are visibly larger than baseline but remain inside the LCD without collision or clipping. At 1366/1920 the stage is visually stable relative to LCD size.

**Regression:** none observed.

### DUAL

Reviewed:

- `P15_V2_MODE_DUAL_1366x768_20261116.png` — SHA `538ec5ea877735df992f38f307aa242e6f76df2e8d75b23e39e705fa1ae99a76`;
- `P15_STAGE_MODE_DUAL_1366x768_20261116.png` — SHA `fac9cf0b8d5bfba55f5f30d66f555c5f47f453f7dd9b0d2ca0a582c0718bf138`;
- 375×812 and 1920×1080 baseline/stage pairs.

Finding: both panes remain visible, the vertical divider remains continuous and readable, per-pane scale labels remain inside their respective halves, and the dominant depth value still spans the lower split area without being cut off. The stage’s mobile depth value is larger, but it remains fully within the aperture and does not obscure the demo marker.

**Regression:** none observed.

### NAV

Reviewed NAV1 at 1366×768 and NAV2 at 375×812 / 1920×1080. Pinned NAV2 example:

- `P15_V2_MODE_NAV2_1920x1080_20261116.png` — SHA `15665ce355f55b9817a6e7c99f4e2b9a67192398639320104006b7403b215d24`;
- `P15_STAGE_MODE_NAV2_1920x1080_20261116.png` — SHA `26ca9e5fa3facc08dbf455b286e5167391918c67aa114b82ac09921101d46a57`.

Finding: left data region and right sonar strip remain separated by a clear vertical boundary. NAV labels and `NO DATA` states remain readable. No data box, divider, demo marker or sonar strip is newly clipped at the inspected mobile or desktop widths.

**Regression:** none observed.

### LF zoom / BL family

Reviewed:

- `P15_V2_MODE_LF_ZOOM_375x812_20261116.png` — SHA `1c1f348523393728c0afa4963ebc0da1a2b078c3b83bea30ecf9855b09fab911`;
- `P15_STAGE_MODE_LF_ZOOM_375x812_20261116.png` — SHA `a718991e284551f86491f4f1da4a749633b158773a52bc8aeb4e2341120262a7`;
- LF-ZOOM baseline/stage at 1366×768 and 1920×1080.

Finding: left zoom pane, right normal sonar pane, divider and scale labels remain readable. The stage preserves the pane distinction and does not introduce clipping at 375, 1366 or 1920.

**Regression:** none observed.

## Three zoom cases remain distinct

Native vision inspection of the three staged 1366×768 zoom captures confirms distinct visible content and headers:

| Stage screenshot | SHA-256 | Visible distinction |
|---|---|---|
| `P15_STAGE_ZOOM_BOTTOM_LOCK_1366x768_20261116.png` | `149d30891eb26c6b6339836b6c4454896144246305ff906ad3eb9666f1f571e6` | `BL-LF`; left relative 5→0 bottom-lock presentation |
| `P15_STAGE_ZOOM_BOTTOM_ZOOM_1366x768_20261116.png` | `923cae90ffe48cd5f6769e5ac9e72a3c2536051313631fe422e97f66292c434e` | `BZ-LF`; magnified absolute-depth/bottom shape on left |
| `P15_STAGE_ZOOM_MARKER_ZOOM_1366x768_20261116.png` | `80b9678fba94fc5945f0ab12e87c80dfaed68d6ab2635ac3935da8705d9b0d41` | `MZ-LF`; marker-centered absolute-depth presentation |

The corresponding V2 captures were also inspected and the stage does not collapse these into a common presentation.

## No copied OEM-photo pixels

This review does not attempt to prove a negative through pixel similarity. The stronger source/runtime evidence is:

1. stage runtime integrity reports only one changed runtime file: `web/styles.css`;
2. that CSS change contains no image load/import;
3. all eight original JPEG routes are rejected with HTTP 404 by the test-owned stage browser receipt;
4. all 273 served source bodies match their expected stage SHA;
5. no external network requests occurred.

Therefore there is no source path in this G1/G2 change that introduces or serves the REFERENCE_ONLY photo pixels.

## Final gate

| Gate | Decision |
|---|---|
| single-runtime CSS scope | **PASS** |
| 50-runtime inventory preserved | **PASS** |
| stage browser checks | **103/103 PASS** |
| stage captures | **24 present** |
| served HTTP body SHA | **273/273 match** |
| LF clipping/readability | **PASS, no new regression observed** |
| DUAL divider/panes/depth | **PASS, no new regression observed** |
| NAV layout/readability | **PASS, no new regression observed** |
| LF/HF zoom pane integrity | **PASS, no new regression observed** |
| BL/BZ/MZ distinctness | **PASS** |
| OEM JPEG served/copied by fix | **NO — routes 8/8 404; CSS-only source path** |
| exact OEM pixel/physical/color/firmware claim | **HOLD / OUT OF SCOPE** |
| rights clearance | **HOLD** |
| hardware validation / release | **HOLD** |

**Final verdict: GO_BOUNDED** for the internal CSS G1/G2 fix as reviewed. No concrete visual blocker was found in the specified baseline/stage evidence.
