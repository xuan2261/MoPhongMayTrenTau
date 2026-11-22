# FURUNO FCV-588 — V40 public-reference front-panel source atlas

**Audit:** 2026-10-18. **Decision:** a single OEM-supported *textual
label* defect was verified and corrected in staged software. All exact
bezel coordinates, industrial font, LCD pixels, firmware-specific
menu snapshots, image rights and physical-device validation remain
**HOLD**, not independently measured.

## Art direction / classroom UX brief (existing system preserved)

- Register: **Product**, independently drawn fish-finder training shell.
- Scene: offline classroom on Windows desktop and responsive teaching
  interface; instrument face separate from instructor D15 panels.
- Direction: preserve the existing dark-gray near-square face, a narrow
  right-hand control strip and portrait LCD because OEM-manual control
  order supports these *relationships*, not precise percentages.
- Color/type: **existing** face gray, LCD navy and inherited
  `--panel-font`; no new color, font, imagery or brand assets.
- Signature: precise control names from the operator manual, including
  the single control `MENU/ESC`.
- Dials: visual variance **1/10** (do not redesign), motion **1/10**,
  information density **7/10**.

## Source register — rights separation

| ID | Manufacturer evidence | What it establishes | What it does not |
| --- | --- | --- | --- |
| PUB-FCV-001 | [FURUNO FCV628/FCV588 Operator's Manual (OME-23890-E)](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf), §1.1 | Nine numbered controls and physical labels/actions, including first control **MENU/ESC**, TrackPad (four arrows), independent ENTER, RANGE, MARK, FUNC, GAIN, MODE, BRILL/power | Which firmware version is installed, any bezel dimension/photo pixel target, free right to republish the manual or its diagrams |
| PUB-FCV-002 | [Manufacturer FCV-588 product/specifications](https://www.furuno.com/en/products/fishfinder/fcv-588/index.html) | Model FCV-588, portrait 8.4-inch **480×640** LCD and outside dimensions **233 W × 270 H × 158 D mm**, 50/200 kHz | Bare-head dimensions, LCD RGB and font glyphs, panel-button geometry and calibrated screenshot similarity |
| PUB-FCV-003 | [FURUNO USA FCV588 manufacturer photo gallery](https://www.furunousa.com/en/products/fcv588) | Front and side photographs; right-hand controls, a gray face and illustrated sonar/LCD modes | Permission to embed images/artwork; exact scaled photographic coordinates or real firmware default values |
| PUB-FCV-011 | [FURUNO FCV588/628 Software History](https://www.furunousa.com/-/media/sites/furuno/software_library/software/software/fcv588-628_software_history.pdf) | Historically distinct 1.05 and 2.01 software; feature/menu differences must be revision-scoped | Installed target revision |
| RIGHTS-FCV-USA | [Furuno USA Terms of Use](https://www.furunousa.com/en/terms_of_use) | Site/publisher ownership and reuse restrictions | A public web URL is **not** a runtime reuse license |

The available FURUNO page/manual images were *reviewed as reference
material only*. **No manufacturer's image, PDF, video frame, font or
firmware resource was copied** into the independently authored runtime
or into this atlas.

## Operator physical-controls comparison (manual §1.1)

| Manual | Real control/function reference | V39 operator face before patch | V40 staged observation | Decision |
| --- | --- | --- | --- | --- |
| 1 | `MENU/ESC` opens/back/escapes | `MENU` line-break `ESC`; accessible name flattened to `MENUESC` | One visible/accessible `MENU/ESC` | **Verified mismatch; staging corrected** |
| 2 | Four-arrow TrackPad moves items/settings and VRM | Independent four directional controls around central inert graphic | No change | Names/order supported; tactile/pixel detail **HOLD** |
| 3 | Distinct `ENTER` saves choices | Independent `#key-enter` beneath TrackPad | No change | Text/order supported; key shape **HOLD** |
| 4 | `RANGE` opens range selector | Right-hand key with range dialog | No change | Source-backed label; actual timing/value scale **partial** |
| 5 | `MARK` saves a waypoint, inoperative when Tankenmaru equipped | Distinct MARK; guarded by virtual option and typed Own fixture | No change | Label/source guard model; actual vessel receiver **HOLD** |
| 6 | `FUNC` short programmed feature; long assigns function | Distinct FUNC key and deterministic long press | No change | Label/gesture source-backed; tactile duration **HOLD** |
| 7 | GAIN pushed to open Auto Gain, rotated to change gain | `GAIN`, `PUSH TO AUTO`, interactive rotary | No change | Text/function supported; dial angle/scale **HOLD** |
| 8 | MODE rotary selects LF/HF/Dual/Zoom/NAV mode | Rotary with illustrative detent legends | No change | Functional labels source-backed; exact dial positions/fonts **HOLD** |
| 9 | Power/`BRILL` short opens/adjusts, long off | Blue power button, BRILL text and held-input handler | No change | Control semantics source-backed; OEM physical timing **HOLD** |

**LCD and case:** `#echo-canvas` remains **480×640**; portrait
aspect ratio matches manufacturer specs. Original charcoal housing,
near-square unit and pedestal remain independent approximation.
The software's effective visible LCD, shadow, scroll region, bezel
proportions, echo rendering, font, LCD palette and `[DEMO]`
position have **not** been pixel-calibrated against any specific
installed firmware.

**Menus:** the code has five operation menu categories and
source-graded paths from Appendix 1. This audit did **not**
authenticate actual device LCD photos from each category or
firmware-specific dialog geometry. No menus other than the literal
MENU/ESC operator label were modified.

## V40 test provenance

An initial incorrect test selector produced a 1/2 FAIL but
was shown to be the test's `\b` regex boundary, not the device
markup. The preserved original log and GPT-6 narrowly approved
selector fix precede the source-backed proper RED:
`expected MENU/ESC, actual MENUESC` (1/2 PASS, exit 1).
After staged HTML correction the same test returned **2/2 PASS**.

Isolated Google Chrome 155 on **320×720, 375×812, 768×1024,
1366×768, 1440×900 and 1920×1080** passed **84/84** assertions;
**210/210 actual runtime response bodies SHA** and **12/12 new
staging PNGs** were checked. The visible text range fits inside
the physical button at all six viewports without CSS changes,
and keyboard MENU/ESC entry/escape and deterministic replay still
operate. These are **source-bounded software checks, not nine OEM
hardware acceptance results**.

A separately attached CoS Desktop Chrome tab was reloaded only
after console/network capture began. Its actual viewport was
**1912×970**; the MENU/ESC native accessible name and focus were
observed, with 35/35 localhost requests HTTP 200 and zero console
errors. This is **not** exact 1366×768/1920×1080 *Desktop* resizing
and **not** a Narrator/NVDA spoken-output check.

## Next verified discrepancy candidates / holds

1. **P0 rights/firmware:** obtain the exact target firmware identity
   and authorized front-panel/media reference before trying
   photorealistic bezel or LCD pixel matching. Pixel differences in
   the current original drawing are **observations**, not a numerical
   similarity score without a common geometric source.
2. **P0 Phase 6:** verify native Desktop attached viewport sizes,
   genuine OS-window blur on a held input and spoken Narrator/NVDA
   output in a controlled, nonintrusive Windows environment.
3. **P1 LCD atlas:** collect permissioned or independently documented
   side-by-side states for MENU, MODE, RANGE, BRILL, System and
   Display categories, with firmware and exact operator sequence
   identified. Test each observed difference, not undocumented
   self-generated labels.
4. **P1 per-claim acceptance:** keep all 64 device + D15 claims
   `HOLD` until individual source/rights and deterministic replay
   requirements are met. The Stage label fix does **not** promote
   an entire feature or change the checklist totals.

**Status:** 65/65 public claims HOLD, checklist 14/50,
named tasks 6/22, `hardwareValidated=false`,
`releaseApproval=HOLD`, Phase 6 OPEN.
