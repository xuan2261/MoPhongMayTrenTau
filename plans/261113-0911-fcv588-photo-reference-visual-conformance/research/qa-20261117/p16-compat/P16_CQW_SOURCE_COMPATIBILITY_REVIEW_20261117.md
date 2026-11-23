# P16 — CQW source compatibility review

Date: 2026-11-17 (+07)  
Reviewer: worker-20  
Mode: READ-ONLY source/compatibility review; no browser/server/window control  
Canonical root: `C:\Work\MoPhongMayTrenTau`

## Decision

**GO** for the already validated/current Google Chrome environment and the canonical P15 G1/G2 source.

**SOURCE_GAP** for unspecified older offline Chromium/WebView engines that do not support both `container-type: inline-size` and container-query length units such as `cqw`.

**NO_GO is not triggered by current project sources**, because no repository contract found in this review declares Chromium <105, an old WebView, Edge, Helium, or any other non-current browser as a supported deployment target. If such an engine is later made a required target and lacks these CSS features, the present G2 typography rules are **NO_GO for that target until a fallback is added and verified**.

No canonical correction is justified by the current source contract, so this review proposes no edit.

## Canonical identity reviewed

| Source | SHA-256 |
|---|---|
| `web/styles.css` | `ce699bc88586fc0b883ba357661cda4ccb414069127d6ec23aa81a4300d6afeb` |
| `web/index.html` | `6918d1b5e587034c5253977dd42dec87e8e47ae604bd26388b7389846cc74847` |
| `test/fcv588-p15-uniform-lcd-css.test.mjs` | `2a750cb43e2ffd965eb1266046b45aad30da692312db1e172faa0acd73d162b0` |
| `tools/fcv588_chrome_viewport_acceptance.py` | `e4f9fb7c890eb9075829930494ff4c1e98ebbf33fcb5b8b797576dd787abd76e` |
| `p15/p15_css_geometry_regression_gate.py` | `a932c0f13559783a3ae8498244488ce86290333f714f46b6fe99c376b9813926` |
| P15 independent preapply gate | `f1b45077098086d562086dde316e7cf36e38239ceffa6cdc9f3c7388e45ad0db` |
| P15 eight-photo source audit | `2f7f7354506604d7b8798bfb12ac9ae88e28051c0dbb411b9454b2775f983130` |
| P15 final integrity | `a6aa5038292e5d1d3da20170f9bbed1804ee5262e749cb9b4e5cf53207deafed` |
| P15 independent postreceipt | `2ed3ad94a844142bfa401fbdf1a2003597ed01ab0393f5bfb9a9a57297539cfe` |

P15 final integrity already records the same compatibility boundary explicitly: `olderBrowserCqw: NOT_YET_VERIFIED` at `docs/qa/FCV588_P15_LCD_GEOMETRY_20261116/FCV588_P15_LCD_GEOMETRY_FINAL_INTEGRITY_20261116.json:79-87`, and repeats `Old offline Chromium/WebView cqw compatibility NOT_YET_VERIFIED` at lines 115-120.

## Exact CSS/HTML anchors

The P15 G1/G2 source is concentrated in these canonical lines:

- `web/styles.css:103`: `.lcd` keeps `aspect-ratio: 128 / 171` and adds `container-type: inline-size`.
- `web/styles.css:104-107`: the logical canvas is rendered with `width:100%; height:auto` and vertically centered. This G1 uniform mapping does **not** depend on `cqw`.
- `web/styles.css:108`: `.screen-top` uses `font: 700 clamp(9px, 3.33cqw, 15px) Consolas, monospace`.
- `web/styles.css:110-113`: `.demo-indicator` uses the same `3.33cqw` sizing family.
- `web/styles.css:138-141`: depth sizes use `13.7cqw`, `7.58cqw`, `11.45cqw`, and `15.55cqw`.
- `web/styles.css:361-432`: phone reflow; line 430 supplies a later valid `.depth-indicator strong { font-size:25px }` rule for <=700 px viewports.
- `web/styles.css:41-49`: the stylesheet already uses `:has(...)` for focus-mode behavior; this capability predates the P15 cqw delta and is another modern-Chromium dependency in the existing source tree.
- `web/index.html:45-49`: the `.lcd` container directly owns the 480×640 canvas, header, demo marker and depth overlay.

There is **no `@supports` declaration anywhere in canonical `web/styles.css`**.

The current P15 source-shape test at `test/fcv588-p15-uniform-lcd-css.test.mjs:7-17` protects G1 uniform canvas mapping. Lines 18-25 require `container-type:inline-size`, require `cqw` in each G2 header/demo/depth rule, and reject numeric `vw` in those rules. It deliberately does **not** assert an unsupported-browser fallback or a minimum browser version.

## Standards/browser support evidence

The relevant external compatibility evidence is narrow:

1. Chrome for Developers states that size-based container queries and container-query unit values landed in **Chromium 105**; the same Chrome 105 release also introduced `:has()`.  
   Source: https://developer.chrome.com/blog/cq-polyfill/ and https://developer.chrome.com/blog/new-in-chrome-105
2. MDN CSS error handling states that when a regular property/value declaration is invalid or unrecognized for that property grammar, that declaration is ignored while subsequent valid CSS continues to parse.  
   Source: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Syntax/Error_handling
3. MDN documents that `cqw` is 1% of a query container's width; if the unit is supported but there is no eligible query container, the container-query unit falls back to the corresponding small-viewport unit.  
   Source: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries

Therefore a project browser floor of **Chrome/Chromium 105 or newer** is source-valid for these particular CSS features. This review does **not** infer that every Chromium-derived WebView at an equivalent version is accepted by the project; that still requires an explicit deployment/browser contract and evidence.

## Local browser/OS evidence, read-only

No browser process was launched. File metadata and hashes were read directly.

Host OS:

`Microsoft Windows 10 Pro for Workstations 64-bit, 10.0.18363, build 18363`.

Installed browser binaries:

| Binary | Product/File version | SHA-256 | Project status |
|---|---|---|---|
| `C:\Program Files\Google\Chrome\Application\chrome.exe` | `157.0.8103.79` | `a527591d96df1f30bdabf5599d257b8b80c83d90c405ff997ddbc202ba5e9ada` | canonical project launcher target / current local Chrome |
| `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` | `157.0.4341.60` | `2497874639116d8edc3de34b3fd83f72fa099112a5d2a426e1f08fcf39a99612` | installed, but not the P15 acceptance target |
| `<USER_PROFILE>\AppData\Local\imput\Helium\Application\chrome.exe` | product `157.0.8103.78`; file `0.21.3.1` | `53b0ab0d7ada6806827551562a42983d7ec2895639a7a6f51cb8cda299ac591d` | registered per-user as a chrome.exe app path, but not project acceptance evidence |

The generic project acceptance launcher pins `C:\Program Files\Google\Chrome\Application\chrome.exe` at `tools/fcv588_chrome_viewport_acceptance.py:24-27`, accepts an optional `--chrome` override at lines 990-1003, launches that exact executable at lines 1029-1032, and records `browser.version`.

The P15 geometry harness uses `playwright.chromium.launch(channel='chrome', headless=True)` at `p15_css_geometry_regression_gate.py:26-28`; its computed-style oracle at lines 34-47 proves that the browser used for P15 interpreted the container-based sizing correctly. The historical browser smoke document also describes actual Google Chrome at the Program Files path at `docs/qa/FCV588_PUBLIC_BROWSER_SMOKE.md:318-326`.

However, the custom P15 receipts do **not** seal `browser.version` or the resolved executable path. Thus:

- the successful P15 computed-style behavior proves the exercised browser supported the feature;
- the currently installed Chrome 157 is well above the documented Chromium 105 feature floor;
- the exact historical Chrome version used by the P15 receipt is **not sealed in that receipt**;
- none of this establishes a project-supported minimum browser version.

That last point is a provenance/source gap, not a reason to invalidate the already passing current-browser P15 result.

## Source-valid behavior when container units are unsupported

The unsupported behavior can be derived from the CSS source and CSS error-handling rules without launching an old browser.

### Case A — engine does not recognize `cqw`

`container-type` may also be unrecognized and ignored, but G1 remains intact because `.lcd canvas` uses ordinary `width:100%; height:auto` CSS.

For G2:

- `.screen-top` at line 108 contains `cqw` inside the **`font` shorthand**. If the value is unsupported, the whole `font: ...` declaration is discarded. Position/color/text-shadow remain, but the intended bold Consolas + bounded P15 size is not source-guaranteed; inherited/UA font subproperties take over.
- `.demo-indicator` at lines 110-113 has the same whole-shorthand failure mode.
- `.depth-indicator strong` and the Small/Medium/Large rules at lines 138-141 lose only their invalid `font-size` declarations. `.depth-indicator` still provides `font-family: Consolas, monospace` at line 115.
- on <=700 px viewports, the later valid line-430 `font-size:25px` rule gives the depth value a usable font-size fallback; header/demo still have no explicit old-engine fallback;
- on desktop, no explicit non-cqw depth-size fallback is authored for those P15 rules, so exact fallback size is UA/inheritance-dependent.

This is graceful CSS parsing, but it does **not** preserve the G2 invariant.

### Case B — engine understands `cqw` but no eligible inline-size container exists

Per MDN, the query-container unit uses the corresponding small-viewport unit. In that partial-support situation the G2 rules become viewport-relative again, which defeats the specific P15 invariant that equal-size LCDs at different outer viewport widths should use equal typography.

No such partial-support Chromium target is declared or evidenced by this repository. Chromium 105 shipped the relevant container-query capability and cq units together, so this case is principally a generic portability warning rather than an observed project failure.

### Case C — engine supports `container-type:inline-size` and `cqw`

This is the P15 intended path. The existing real-Chrome evidence demonstrates:

- logical canvas remains 480×640;
- equal-size desktop LCD witnesses at different outer viewport widths produce equal header/depth typography within the authored tolerance;
- P15 final canonical geometry/mode/menu evidence passes.

This path is GO.

## Defect vs SOURCE_GAP

### No source-valid canonical defect found

The repository never promises support for an engine lacking cq units. In fact, the P15 final integrity explicitly carries old Chromium/WebView compatibility as `NOT_YET_VERIFIED`. The existing stylesheet also already contains `:has()`, another feature introduced in Chrome 105, so the P15 `cqw` change is not the first source dependency that makes pre-105 Chromium an unproven environment.

The current canonical source is therefore internally consistent with its evidence:

- P15 G1/G2 behavior is verified in actual Chrome;
- unsupported old engines are explicitly outside verified scope;
- hardware/OEM release remains HOLD.

Classification: **GO + SOURCE_GAP**, not a current-source NO_GO.

## Minimum browser evidence required to close the SOURCE_GAP

If the project wants a declared browser floor, the minimum adequate evidence should be:

1. **Declare one exact support floor**, e.g. Google Chrome >=105, or a specific WebView/Chromium product/version; do not use only “modern browser”.
2. **Record the exact executable path, SHA-256 and `browser.version`** in the acceptance receipt.
3. In the browser receipt, assert:
   - `CSS.supports('container-type', 'inline-size') === true`;
   - `CSS.supports('font-size', '1cqw') === true`;
   - computed `container-type` on `#lcd` is `inline-size`.
4. Reuse the current G2 computed-style oracle: at 1366×768 and 1920×1080, when the LCD bounding box is equal within the existing tolerance, header font, depth font and depth glyph width must remain equal within the existing <=0.15 px tolerance.
5. Keep the G1 canvas oracle: rendered canvas aspect must remain approximately 480/640 = 0.75 within the existing <=0.00075 bound.
6. Assert header, demo marker and depth indicator remain inside `#lcd` bounds at the minimum supported browser and the project’s required viewports.

That is enough to prove the declared minimum. Testing only current Chrome 157 cannot establish a minimum of 105; the actual minimum-version binary or an equivalently pinned browser image must be exercised.

## Concrete source-test oracle if old-engine support becomes required

The current Node test is correct for current-browser P15 source shape, but a fallback contract would need one additional source oracle.

Fail before a compatibility correction if any cqw-dependent rule lacks a valid non-cqw declaration in the same cascade path:

- `.screen-top`;
- `.demo-indicator`;
- `.depth-indicator strong`;
- Small/Medium/Large depth variants.

Then require either:

**Pattern 1 — progressive declarations**

```css
.screen-top {
  font: 700 <non-cqw-fallback> Consolas, monospace;
  font: 700 clamp(9px, 3.33cqw, 15px) Consolas, monospace;
}
```

with equivalent fallback-before-enhancement declarations for demo/depth sizes; or:

**Pattern 2 — explicit feature gate**

```css
/* valid non-cqw fallback rules first */
@supports (container-type: inline-size) and (font-size: 1cqw) {
  /* current P15 container/cqw enhancement */
}
```

The browser oracle must then exercise both the declared minimum engine and current Chrome, confirming no clipping and preserving the G1/G2 invariants available to each branch.

No fallback values are prescribed by this review because the project has not declared an old-browser target or its required visual tolerance. Inventing fallback pixel sizes now would create a new design contract without source authority.

## 2016 OEM/reference boundary

The CSS compatibility question is independent of the eight 2016-labelled reference photos.

`P15_EIGHT_OEM_PHOTO_SOURCE_AUDIT_20261116.md:22-27` establishes that `2016` is only a project/folder historical label, EXIF capture date is absent, rights are `REFERENCE_ONLY`, owner/license are unknown, derivative redistribution is HOLD, and the photos are not source-native 480×640 LCD dumps.

Lines 109-115 of that audit keep firmware, calibrated active ROI, physical scale, native RGB/font/glyph pixels, OEM pixel equivalence, rights and hardware/release approval in SOURCE_GAP/HOLD.

Therefore:

- `cqw` compatibility evidence cannot upgrade OEM fidelity;
- a fallback branch must not copy or serve any OEM photo;
- browser support is an internal simulator/deployment compatibility concern only.

## Final status

**GO** — canonical P15 G1/G2 source for the actual modern Google Chrome environment already exercised by project QA.

**SOURCE_GAP** — no declared or tested minimum old Chromium/WebView version; exact P15 historical browser version was not sealed in its custom receipt.

**NO_GO condition, not currently active** — if deployment requires an engine that fails either `container-type:inline-size` or `cqw`, current G2 typography is not source-valid for that target and must gain a tested fallback before that target can be accepted.

**Correction now: NONE.** Adding a fallback without a declared old-browser target would be speculative and is not justified by current project sources.
