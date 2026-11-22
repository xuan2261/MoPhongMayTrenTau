# FCV-588 V40 — OEM-sourced MENU/ESC label correction

**Date:** 2026-10-18. **Software integration decision:** scoped GO.
**Phase 6, firmware, media rights, real hardware and release:** HOLD.
Canonical workspace: `C:\Work\MoPhongMayTrenTau`.

## Confirmed outcome

The first control is identified as **MENU/ESC** by FURUNO's FCV-628/588
Operator's Manual, OME-23890-E §1.1. In canonical V39 the drawn
`#key-menu` instead contained `MENU<br><span>ESC</span>`, producing the
visible/accessibility string `MENUESC` without the documented slash.
V40 corrects **only that one original HTML control label** to
`MENU/ESC`. This is a defensible textual/control-name correction,
**not** proof of geometric, glyph, image, LCD or firmware equivalence.

Exactly two canonical paths were integrated:

```text
web/index.html
  old SHA 7ec574436566e10e32064455dc3e8b0e53d1449723d53781d1b6e2f22e97340d
  new SHA cb9b5c40f61c5d1da9fa2e6b96a60f2210556b9e0af211ef33a6b443ef44d5b2

test/fcv588-v40-oem-menu-label.test.mjs
  SHA 05a0f65efc116961f775c95d66e84c08d3f9da0b0bd223baf343358e9f178ec3
```

**36/37 runtime assets did not change; all 23 `src` device/core
modules, `web/styles.css`, LCD data, menu/reducer controls,
event/replay/settings schemas and software profile revision are
unchanged.** No manufacturer artwork or PDF/video bytes were copied
into runtime or this report.

## Evidence chain and failure history

The original V40 test's faulty regular expression tried to find
`id="key-menu"\b`; it exited 1 because that matcher cannot match
the quote boundary. This initial failure was a **test-harness error**,
not a product defect. The original log and separate GPT-6 narrow
checker-repair decision remain in the staged `evidence/` folder.
The corrected test then produced the meaningful product **RED**,
exit 1: actual `MENUESC` versus expected `MENU/ESC`.
After the one-line staged HTML correction, focused Node **2/2 PASS**.

V40 staging manifest:
`staging/fcv588-v40-oem-source-audit/evidence/V40_HTML_LABEL_PATCH_MANIFEST_20261018.json`
SHA-256
`a5d2de2778ec76e49ea955b1fd962aaf35d2ddee40290ba14b68314ded114eef`.

GPT-6 documented a narrow integration **GO before canonical change**:
[V40 source-backed GO](./2026-10-18-v40-gpt6-oem-menu-esc-go.md).
Actual canonical apply receipt:
`docs/qa/FCV588_V40_CANONICAL_APPLY_20261018.json`,
SHA-256
`1cd4fd908d8c2c19d4cd7bca519e964de5f02b104ffa3f992b94ce632081ed9c`.
This is user-authorized GPT-6 **self-review**, not an independent
FURUNO review or independently verified ChatGPT client reasoning mode.

## Executed software QA

| Gate | Verified result | Evidence |
| --- | --- | --- |
| Original staged malformed test | 1 PASS / 1 FAIL (expected checker defect) | `evidence/V40_OEM_MENU_LABEL_RED_20261018.log` |
| Corrected, meaningful V40 staged RED | 1 PASS / 1 FAIL on `MENUESC` | `evidence/V40_OEM_MENU_LABEL_CORRECTED_RED_20261018.log` |
| Staged Node GREEN | **2/2 PASS** | `evidence/V40_OEM_MENU_LABEL_GREEN_20261018.log` |
| Canonical targeted Node, UI/D15 and V40 | **28/28 PASS** | `docs/qa/FCV588_V40_CANONICAL_TARGETED_NODE_20261018.log` |
| Canonical complete Node | **471/471 PASS** | `docs/qa/FCV588_V40_CANONICAL_FULL_NODE_20261018.log` |
| Canonical Python unittest | **13/13 PASS** | `docs/qa/FCV588_V40_CANONICAL_PYTHON_20261018.log` |
| Staged isolated Chrome, six viewport sizes | **84/84 assertions, 210/210 response bodies SHA, 12/12 screenshots SHA** | `evidence/V40_MENU_OEM_CHROME_20261018.json` |
| Canonical isolated Chrome, same six sizes | **84/84 assertions, 210/210 response bodies SHA, 12/12 screenshots SHA** | `evidence/V40_CANONICAL_MENU_OEM_CHROME_20261018.json` |
| Canonical HTTP security negatives | **4/4 denied**, CSP `connect-src 'none'`, `nosniff` | `docs/qa/FCV588_V40_CANONICAL_HTTP_DENIALS_20261018.json` |

Canonical isolated Google Chrome was exercised on **320×720,
375×812, 768×1024, 1366×768, 1440×900 and 1920×1080**.
Across those six viewport contexts it confirmed the document had
no horizontal overflow, the first key's visible/accessibility name
was exactly `MENU/ESC`, text fit without CSS changes,
the LCD remained logical 480×640, instructor text remained off the
instrument face, native Tab/Enter/ESC still opened and dismissed
the operator menu, and replay returned PASS. All actual browser-loaded
HTTP response bodies were SHA-matched against the staged bytes and,
in the canonical run, against the independently reverified canonical
source. The test counted **84 assertions**, not 84 OEM operations.

Two individual V40 canonical PNGs (1366×768 menu open and
375×812 device off) were opened for visual inspection; the remaining
PNGs were checked through SHA, not all claimed to be individually
reviewed. Staging and canonical screenshot sets have their **own
12-image sets**; they are not merged into the immutable V36/V38
historical screenshots.

## Actual Desktop browser and Phase 6 limits

An independently attached CoS Desktop localhost Chrome tab was
observed only at actual **1912×970**, with exact
`MENU/ESC` label/Tab focus, **35/35 local HTTP 200** requests and
zero console errors since an attach-before-reload capture.
Its screenshot is a connector reference, **not** a saved SHA-backed
workspace file. See
[V40 attached-browser evidence](../../docs/qa/FCV588_V40_DESKTOP_MANUAL_PARTIAL_20261018.md).

**This does not complete native Desktop attachment at exact
1366×768/1920×1080**, a real spoken Narrator/NVDA check, OS-window
blur under a held key, or human accessibility review.
The isolated Playwright viewport PASS is a distinct evidence class.

## OEM source and rights

The manufacturer-based, independently written
[V40 operator face atlas](../../docs/research/FCV588_V40_OEM_FRONT_PANEL_SOURCE_ATLAS_20261018.md)
lists all nine controls, known technical specifications, current
unmeasured artwork/physical gaps and per-item state.
It cites the official FURUNO
[FCV-588 product page](https://www.furuno.com/en/products/fishfinder/fcv-588/index.html),
[FCV-628/588 operator manual](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf)
and [Furuno USA Terms](https://www.furunousa.com/en/terms_of_use).
There is no permission to redistribute proprietary images/video
or evidence of a specific installed firmware version.

**No claim was promoted:** Phase 6 OPEN, 65/65 FCV/D15 claims HOLD,
14/50 checklist items and 6/22 named tasks accepted, 
`hardwareValidated=false`, `releaseApproval=HOLD`.
No commit, push, PR, merge, release or deployment was performed.

## Proposed V41

1. **P0 — Real OEM/copyright/firmware evidence**: obtain the version
   of a target FCV-588 unit, an authorized front-panel reference,
   and permission for any exact OEM artwork/frames requested.
   Create side-by-side screenshots at known scale, recording confirmed
   geometry/label/menu-state differences.
2. **P0 — Phase 6 browser/accessibility**: arrange a separate Windows
   environment capable of real Narrator/NVDA speech verification,
   native 1366×768 and 1920×1080 attached-browser capture, and
   genuine OS-window blur during held input.
3. **P1 — Screen/menu source atlas**: prioritize MODE, RANGE, BRILL,
   Sounder/Display/System menus and LCD annotations where primary
   evidence can provide an independent oracle. Only then do focused
   TDD and minimal runtime edits for proven discrepancies.
4. **P1 — Per-claim acceptance review**: close one source/rights/
   firmware-supported claim at a time; do not equate test counts
   or artwork resemblance with marine safety validation.
