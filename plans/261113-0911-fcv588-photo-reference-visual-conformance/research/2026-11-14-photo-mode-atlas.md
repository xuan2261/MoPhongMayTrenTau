# FCV-588 — Photo-mode atlas v1 (2026-11-14)

**Scope:** 8 photographs supplied as *reference-only*, no copied JPEG/embedded vendor screenshots or simulated OEM output. Confidence is about what can be read qualitatively from these photos—not installed firmware, actual LCD RGB or acoustic fidelity. Every image is 590×1280 pixels **including the case/camera perspective**, not 480×640 framebuffer.

## Original source index (immutable names/SHAs)
| File | SHA-256 | Scenario/interpretation | Photo observations and accepted photo-grade oracle |
|---|---|---|---|
| `giaoDien.jpg` | `E7B78466FA582DC0CC50AEC8E2FC264F8B3EE187D93A53CACE1E88D1E156C99C` | Main operator menu | Vietnamese operator terms visible; categories left, values right, blue title and key hints; sonar/depth visible below modal. **Only observed strings** can be a 2016 locale oracle (remaining names HOLD). |
| `lf.jpg` | `C3EF46A27FC965C95D2DF33981B0C66775B848AE96AA8EFDCAD932B91A50C3EF` | LF 50 kHz | White background, `MAN.R G:10 LF`, photo voltage around 13.6 V, bold large depth near lower-left, depth scale multiple labels (e.g. 5/10/15/20), strong irregular near-surface returns and brown/red bottom. |
| `hf.jpg` | `7F1A69504FD703988750729EE38B4964229480A4C55B20AE0F0BB4815F6EA2A9` | HF 200 kHz | White background, `HF` and photo voltage around 13.7 V; relatively sparse mid-water returns; brown/red bottom; large black depth. This single photo does **not** prove 200 kHz always has less clutter. |
| `dual.jpg` | `4D88FE11CDA8A9107F97E44A392103CC68EB8AB8E685B7B5E7408A556A2BC37B` | DUAL | Two vertical panes, LF left/HF right, separate returned texture and bottom traces, common top status `LF/HF`. Manual §1.4.2 confirms order. |
| `zoom.jpg` | `ECC7AF35E30AAFB8F0E9CFE9F05F94C8D529D6D410A2E523053286149D330B52` | Bottom Lock LF | `BL-LF`, expanded/relative bottom view on left with normal LF sonar on right; each pane has distinct depth presentation. |
| `zoom2.jpg` | `41EAA80B42450B36C3B0F547B9276E26703CE1B74D2F85B1393255FDA42BCD99` | Bottom Lock HF | `BL-HF`, similar left/right split; fish target echoes and bottom traces appear distinct from LF. |
| `nav1.jpg` | `B90DE3AFEB18730E10E4AC897FB20BBDE36155E25CC344ABED259BA1DE0D030E` | NAV1 | Left ≈2/3 data panels with large numerals, right ≈1/3 thin sonar strip; high-priority depth is in **left** data region. |
| `nav2.jpg` | `9F225C6834EFE86C76FD8A86BBFAA8F6D276F1E055A815EFC91087A832397DE6` | NAV2 | Left data boxes + right sonar strip, numeric/stale values field-dependent; **never** create GPS or voltage from an absent receiver. |

## Comparison coordinate discipline

- Logical simulator screen: 480×640 portrait; all 8 images are photographs at 590×1280 and include bezel/keyboard/lighting. Actual frame rectangle/perspective requires a separate repeatable ROI/homography measurement; that has **NOT_YET_VERIFIED** coordinate bounds. Do not convert JPEG pixel offsets into OEM CSS constants before measurement.
- Applicable manual: FURUNO FCV-588, OME-23890-E §§1.4.1–1.4.4, 1.22 and specification. Head/body physical geometry/non-planar controls cannot be fully rectified with one LCD homography.
- Visual acceptance currently uses **relationship/landmark order**: status strip above sonar, numeric depth to left, depth ticks read top-to-bottom, DUAL left LF/right HF, BL zoom left, NAV data left/sonar right. Numeric tolerance and color calibration **UNMEASURED**.
- Drawing must be original Canvas/SVG/CSS art; do not embed JPEG, fonts, manuals, video frames, or proprietary firmware in web/src/distributable.

## Target visual fixtures and current baseline

| Fixture | Desired comparison state | Current baseline (2026-11-14) | Blocker |
|---|---|---|---|
| PHOTO-LF | LF, Manual range20m, Gain 10, palette White, no real receiver | `research/baseline-20261114/*-LF.png` baseline is powered-on LF on current setting, not claimed White-preset | Native source/config preset not yet equal photo |
| PHOTO-HF | HF same test world/clock, White | `*-HF.png` | optical RGB SOURCE_GAP |
| PHOTO-DUAL | LF/HF side-by-side, separate ticks | `*-DUAL.png` | dynamic texture is synthetic |
| PHOTO-BL-LF | zoomMode Bottom Lock LF, left zoom/right normal | Not captured in first browser baseline | NOT_RUN |
| PHOTO-BL-HF | zoomMode Bottom Lock HF, left zoom/right normal | Not captured | NOT_RUN |
| PHOTO-NAV1 | left data≈2/3, right sonar≈1/3, depth left | `*-NAV1.png` | actual data fields depend on selected NAV boxes |
| PHOTO-NAV2 | 2/3 left data and valid/missing fields | `*-NAV2.png` | receiver field-validity SOURCE_GAP |
| PHOTO-MENU | Photo menu 2 columns and footer, language Vietnamese if source-backed | `*-MENU.png` | exact Vietnamese phrase atlas and firmware HOLD |

Baseline Chrome receipt: `research/baseline-20261114/fcv588-current-baseline-20261114T091643+0700-f8711c25.json`. Worker test-owned Chrome 157, 1366×768; 36 loaded JS/CSS/HTML bodies SHA matched, page/console/external errors 0. There were **six** modes/screens, not full 8 photo scene matches. Each screenshot is original simulator output and separately hashed.

## Reference-only source/rights ledger

All 8 JPEG source files: `rightsOwner=UNKNOWN`; `licenseOrGrant=NOT_PROVIDED`; `internalObservation=project_user_supplied_reference`; `derivativesForRedistribution=HOLD`; `distributableRuntimeUse=DENIED_UNTIL_CLEARANCE`; `proprietaryFontFirmwareUse=DENIED`. No copies/crops/warps have been created during this atlas; if lawful ROI measurement is later authorized, it must use a restricted non-served path and preserve source SHA.

## Implementation crosswalk / not yet OEM proof
- P0 photo-header and gain formatting, tiered ticks and NAV left depth are supported by `web/lcd-presentation.mjs`, `web/app.mjs`, `web/styles.css`; implementation staging under `staging/fcv588-photo-visual-20261114`.
- P1 LF/HF morphology in `src/core/scenario.mjs` exists as synthetic frequency-differentiated world; reproduce footer/body texture for educational effect without double-applying the physics or changing event log.
- P1 zoom rendering: current `src/devices/fcv588/echo-projection.mjs` returns Bottom Lock mode but actual physically flat bottom and exact BZ/MZ marks are **NOT_YET_VERIFIED** against photos.
- P1 menu VN: exact phrase alignment is source-specific **HOLD**, despite user-provided photo.
- P2 faceplate: FURUNO whole device 233×270×158mm, effective LCD ≈128×171mm, but head-only and detents unmeasured; no OEM mm/rgb/shape PASS.

**Stop conditions:** missing typed voltage, true NMEA/GNSS, unknown firmware or rights may be noted in D15/outside LCD; no invented data or warnings inside the OEM-looking LCD. Original images must not become image tiles driving the sonar canvas.

