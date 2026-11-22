# P15 — Eight OEM-reference photo source audit

Date: 2026-11-16 (+07)  
Reviewer: worker-20  
Mode: READ-ONLY photo-grounded audit; one write-once evidence file only  
Canonical root: `C:\Work\MoPhongMayTrenTau`

## Verdict

**PASS_BOUNDED_PHOTO_SOURCE_AUDIT_WITH_SOURCE_GAPS.**

The eight original JPEGs support bounded qualitative comparison of visible mode labels, major pane boundaries, menu/data-panel topology, depth-scale ordering, placement of large depth readout, and visible physical control labels. They do **not** establish calibrated active-LCD ROI, physical scale, exact OEM framebuffer pixels, exact RGB/font/glyph metrics, acoustic/DSP behavior, timing, installed firmware, full Vietnamese locale, or redistribution rights.

P14 canonical software/replay evidence is already PASS, but its own independent gate keeps OEM/hardware/release claims on HOLD. This P15 audit does not change that status and does not modify canonical `src/`, `web/`, `test/`, server state, browser state, or any source image.

## Source identity, provenance and rights

All eight originals are standalone JPEG files under:

`sources/FCV588_GiaoDienThucTeMay2016`

Fresh read-only inspection used Core native image reading on every original. Fresh file-property inspection found all eight are exactly **590×1280 pixels**. No `DateTimeOriginal` or fallback EXIF date was present in any of the eight files. Therefore:

- `2016` is a project/folder collection label and historical reference label only; it is **not** independently proven as capture date, manufacture year, or installed-firmware year.
- No originating public/web source page is recorded for these eight standalone JPEGs in the checked P12/P07/P08/P09 evidence.
- Rights remain: `REFERENCE_ONLY`; `rightsOwner=UNKNOWN`; `licenseOrGrant=NOT_PROVIDED`; derivative redistribution `HOLD`; served runtime use `DENIED_UNTIL_CLEARANCE`.
- The photographs include case, glass/aperture, camera perspective, lighting/moiré and surrounding equipment. They are not source-native 480×640 LCD dumps.

Fresh SHA-256 identities:

| Original | Size | SHA-256 |
|---|---:|---|
| `dual.jpg` | 590×1280 | `4d88fe11cda8a9107f97e44a392103cc68eb8ab8e685b7b5e7408a556a2bc37b` |
| `giaoDien.jpg` | 590×1280 | `e7b78466fa582dc0cc50aec8e2fc264f8b3ee187d93a53cace1e88d1e156c99c` |
| `hf.jpg` | 590×1280 | `7f1a69504fd703988750729ee38b4964229480a4c55b20ae0f0bb4815f6ea2a9` |
| `lf.jpg` | 590×1280 | `c3ef46a27fc965c95d2df33981b0c66775b848ae96aa8efdcad932b91a50c3ef` |
| `nav1.jpg` | 590×1280 | `b90de3afeb18730e10e4ac897fb20bbde36155e25cc344abed259ba1de0d030e` |
| `nav2.jpg` | 590×1280 | `9f225c6834efe86c76fd8a86bbfaa8f6d276f1e055a815efc91087a832397de6` |
| `zoom.jpg` | 590×1280 | `ecc7af35e30aafb8f0e9cfe9f05f94c8d529d6d410a2e523053286149d330b52` |
| `zoom2.jpg` | 590×1280 | `41eaa80b42450b36c3b0f547b9276e26703ce1b74d2f85b1393255fda42bcd99` |

## P12 and visual-plan source crosswalk

The old P12 photo lexicon remains the literal-text crosswalk for these exact bytes:

`plans/261113-0911-fcv588-photo-reference-visual-conformance/research/qa-20261116/p12-photo-lexicon/P12_2016_PHOTO_LCD_LEXICON_20261116.json`  
SHA-256 `9c8c7397a42610005a9fed7535a722f951ab708273068301c44f49faf81b2e83`.

P12 explicitly records `installedFirmwareVersion=UNKNOWN`, Vietnamese locale conformance HOLD beyond observed strings, active-display class-A ROI HOLD on all eight, and no physical-mm or exact OEM font/RGB/pixel claim. P15 preserves those boundaries.

The source/visual planning references used here are:

- `research/2026-11-13-photo-source-and-code-audit.md` — SHA-256 `0c79c3c2f54ce3ca722f6962ebe47260ccbf81f94585a60d19d71a02549341c1`.
- `research/2026-11-14-photo-mode-atlas.md` — SHA-256 `eb005af84b63e09450f2009dec809ab5e6098262f7645e7cd09f9ab75e1ef6c4`.
- `phase-04-dual-zoom-nav-visuals.md` — SHA-256 `753151773a965d3dc925d27a36e4e4ad1dab379ba07a2c79367e363a6a58913d`.
- `phase-05-menu-dialog-fidelity.md` — SHA-256 `39b2635b226ab8ca1dddd7845648dbf8326df3a9ee6675e7e20d964fc12d5689`.
- P14 independent final source gate — SHA-256 `45ae1cc5418e416ce868ee415eb4fec501f535e9fcaf71e8064df60a1b8937ad`; it explicitly keeps release/OEM/hardware claims HOLD.

## Bounded photo-to-mode comparison

The comparison unit is a **relationship or visible landmark**, not raw pixel equality. A simulator screenshot may be compared for mode/pane order, divider existence, header label family, scale ordering, panel hierarchy and large-readout placement. Echo texture, exact line coordinates, exact colors, anti-aliasing, font raster, glare/moiré and photo perspective cannot be treated as an OEM pixel oracle.

| Photo | Bounded mode/source observation from original | What may be compared to simulator screenshot | What remains a source gap |
|---|---|---|---|
| `lf.jpg` | Single LF sonar pane. Header visibly includes `MAN.R`, `G: 10`, `LF`, `13.6V`; right-side depth scale is ordered top-to-bottom; large depth readout `19.4 m` is visible near lower-left. Strong near-surface returns and a bottom band are visible in this one captured scene. | Presence/order of header regions; single-pane geometry; right depth-scale placement/order; lower-left large depth placement; bottom trace being below water-column content. | Do not claim that LF must always have this clutter density, this exact bottom shape, this voltage, these pixel colors, or these exact coordinates. |
| `hf.jpg` | Single HF sonar pane. Header visibly includes `MAN.R`, `G: 10`, `HF`, `13.7V`; right depth scale; large `19.7 m` near lower-left. Mid-water returns are sparse in this captured scene. | Same structural checks as LF, with HF label. | This one photo does not prove a general LF/HF noise law, exact transducer/DSP behavior, color values or timing. |
| `dual.jpg` | Header `LF/HF`; clear vertical two-pane split; LF content is left and HF content right; separate scale markings appear in each pane; large `20.0 m` readout overlaps the lower region. | Existence and order of the two panes; vertical divider; LF-left/HF-right relationship; independent per-pane scale presentation; large depth remains visually separate from pane labels. | Divider pixel coordinate, exact pane percentage, exact echo correspondence, exact depth-overlay coordinates and optical colors are uncalibrated. |
| `zoom.jpg` | Header `BL-LF`; two vertical panes; Bottom-Lock/relative view is left and normal LF sonar is right. Left scale visibly descends through `5,4,3,2,1,0`; right uses normal depth labels including `2.0,5,10,15,20`; depth readout `19.8 m`. | Zoom-left/normal-right topology; divider; relative-scale ordering on left versus absolute-depth scale on right; `BL-LF` header identity. | Exact zoom ratio, bottom-lock flattening pixel morphology, divider coordinate, physical scale, target/fish pixels and timing remain unverified from the photo alone. |
| `zoom2.jpg` | Header `BL-HF`; same left Bottom-Lock / right normal-HF topology. Left relative scale and right normal depth scale are visible; depth readout `19.7 m`. Several fish-symbol callouts are present. | `BL-HF` label; pane order/divider; distinct scale classes left vs right; large depth placement. | Individual fish-callout digits are not a reliable oracle; exact fish icons, target positions, bottom pixels, zoom ratio and colors remain HOLD. |
| `nav1.jpg` | Data region on left, narrow sonar strip on right. Visible Vietnamese field labels include `Vị trí` and `Độ sâu`; position fields show missing-value dashes; large depth `19.9 m`; header voltage `13.7V`. | Dominant-left-data / narrow-right-sonar topology; clear vertical boundary; large depth belongs to left data region; missing data is represented as placeholders rather than fabricated coordinates. | Exact NAV box selection/order is configurable and the P07 sample screenshot uses different fields. Do not claim the photo fields as universal NAV1 defaults, exact width percentage, GPS behavior or voltage behavior. |
| `nav2.jpg` | Left data boxes and right sonar strip. Visible labels include `Tốc độ (STW)`, `Tốc độ (SOG)`, `Vị trí`, `Độ sâu`; `0.0 kn` is visible for STW, other receiver-dependent fields include dash placeholders, and large depth `19.7 m` is shown. | Left-data/right-sonar topology; stacked data boxes; missing-data placeholder semantics; large depth in left data region; right sonar remains a separate narrow pane. | Values are one captured state, not OEM defaults. Exact field ordering, receiver validity behavior, pane ratio and timing need independent source/runtime contracts. |
| `giaoDien.jpg` | Main menu is visibly open over sonar. Header includes `MAN.R`, `G: 10`, `HF`, `13.5V`. A left category column, right Sounder/`Đo sâu` option list, selection highlight, help/footer rows and remaining sonar/depth below the menu are all visible. P12 directly transcribed 13 Vietnamese option rows. | Two-column menu hierarchy; category-vs-option relationship; row order/count where semantically cross-mapped; selection/highlight geometry; footer/help region; menu does not consume the entire LCD and sonar remains visible below. | The P14 current screenshot is English while the photo is Vietnamese. P12 does not establish a complete firmware translation oracle. Exact glyphs, row pixel heights, panel coordinates, firmware revision and menu timing are not photo-provable. |

## Existing screenshot comparison anchors

No browser was started for P15. Existing sealed simulator screenshots can be used only as **comparison samples**:

| Photo/mode | Existing sample screenshot | SHA-256 | Safe comparison |
|---|---|---|---|
| LF | `p07-browser/fcv588-p07-browser-20261116T093801+0700-31a0b649-14-1366x768-LF.png` | `8c0f6bff1788731f09ed5653cb2f485e5d34c90c29a03ea3c7b00df544d65107` | single pane, header family, scale/readout topology |
| HF | `p07-browser/fcv588-p07-browser-20261116T093801+0700-31a0b649-23-1366x768-HF.png` | `7bd3fd4143bfbdc9753d4b8ed848dc91a3731c1d137ce8e1746ffec76b762bcc` | single pane, HF identity, scale/readout topology |
| DUAL | `p07-browser/fcv588-p07-browser-20261116T093801+0700-31a0b649-24-1366x768-DUAL.png` | `01e9900ef33bccf5343097c597f7f21a5ccd21d92382cabdf730f59305c7481a` | LF-left/HF-right, divider, independent pane presentation |
| BL-LF | `p07-browser/fcv588-p07-browser-20261116T093801+0700-31a0b649-15-1366x768-LF-ZOOM-BL.png` | `925809c39f78a6c9c30518c79d942fa464d12e1fc2d0dcc9c9183b4f280283f6` | zoom-left/normal-right, relative-vs-absolute scale class |
| BL-HF | `p07-browser/fcv588-p07-browser-20261116T093801+0700-31a0b649-20-1366x768-HF-ZOOM-BL.png` | `4e9dc587d933f9ebf427af140f4d3833aa9657f925e10cb8033a757422b548fc` | same topology with HF identity |
| NAV1 | `p07-browser/fcv588-p07-browser-20261116T093801+0700-31a0b649-18-1366x768-NAV1.png` | `40d7f12b64715f218454f5b8d2795f8d296e39ed95fc10d83aea5d0c9659a092` | left data/right sonar; missing-data semantics; **not** exact field identity |
| NAV2 | `p07-browser/fcv588-p07-browser-20261116T093801+0700-31a0b649-19-1366x768-NAV2.png` | `ffc0c15e41412fa3f0bad353c9c9ca054fd13a0aae3eba811a5723a59bec6bed` | left data/right sonar; stacked data layout |
| Main menu | `p14/P14_CANONICAL_CHROME_V1_1366x768_20261116.png` | `d1456f1a22a2d5ce68ffc64a2747fb7fd2c2bd5299f728b36fdcbfbfdd80a8cd` | two-column menu hierarchy, row layout, selection/footer, remaining sonar; current screenshot language is English |

The corresponding P14 mobile screenshot `P14_CANONICAL_CHROME_V1_375x812_20261116.png` has SHA-256 `b290a70bec8ecf055eb1ae271482b9229d6638bb8da2867cbed61d7b962eeef9`. It can be used for responsive software layout only; it is not a physical-machine geometry witness.

## Geometry and pixel limits

The following are **not available** as accepted source truth from these originals:

1. **Active-display ROI:** P12/P08 rough image-space coordinates are annotation hypotheses. P09 keeps the true active-display class-A ROI on HOLD for all eight.
2. **Aperture geometry:** P09 allows only restricted in-memory rounded-aperture class-B normalization for `dual.jpg` and `zoom.jpg`; that is not an active LCD rectangle and cannot become CSS/OEM geometry.
3. **Perspective/camera calibration:** no camera intrinsics, lens-distortion model, coplanar calibration target or physical scale is present.
4. **Physical dimensions:** no millimetre inference is justified from these photographs.
5. **Exact pixels:** camera exposure, moiré, reflections, glass/bezel fringe, oblique perspective and JPEG encoding prevent treating a photographed pixel as an OEM framebuffer pixel.
6. **Exact RGB/font/glyph:** no calibrated optical pipeline or source-native font/framebuffer is available.
7. **Echo/DSP truth:** the visible sonar patterns are captured scenes only. They cannot define OEM noise statistics, fish detection, transducer physics, bottom classification or timing.
8. **Firmware/timing:** labels and one menu state do not identify installed firmware or prove menu/input/refresh timing.
9. **Vietnamese locale completeness:** `giaoDien.jpg`, `nav1.jpg`, and `nav2.jpg` prove only the strings visibly present in those photos; they do not prove a complete translation table.

## Numeric-observation policy

P15 introduces no new perspective-derived dimensions, pane percentages, ROI coordinates, color measurements or physical scale. The only fresh numeric source measurements are reproducible directly from the original files: **590×1280 dimensions and SHA-256 identities**. Screen numbers such as `13.5V`, `19.7 m`, `0.0 kn`, or depth-scale labels are recorded only as literal photographed text/state, not as calibrated physical measurements or simulator target values.

## Final source-gap decision

**Verified for bounded comparison:** exact eight source bytes; image dimensions; visible mode identities `LF`, `HF`, `LF/HF`, `BL-LF`, `BL-HF`; major pane/divider relationships; NAV data-vs-sonar topology; main-menu hierarchy; literal labels already captured by P12; physical `MENU/ESC` and other visible face controls as appearance references.

**SOURCE_GAP / HOLD:** capture date as independently sourced 2016 fact; installed firmware; full Vietnamese locale; calibrated active LCD ROI; exact pane dimensions; physical scale; camera/lens calibration; native RGB/font/glyph pixels; exact acoustic/DSP behavior; timing; OEM pixel-perfect equivalence; redistribution rights; hardware/release approval.

This audit supports qualitative photo-grounded review only. It provides no basis to promote P14 software PASS into OEM/hardware/release PASS.
