# FCV-588 V37 — CoS Desktop attached-browser manual smoke

**Date:** 2026-10-18. **Status:** scoped manual browser checks PASS;
**Phase 6 Task 6.2 and release gate still OPEN / HOLD**.
Environment: Windows Chrome, the canonical `C:\Work\MoPhongMayTrenTau`
source of V36, and one temporary `npm start` localhost server at
`http://127.0.0.1:4173/`. This is offline training UI, not actual sonar or
ship navigation equipment.

## Attachment and setup provenance

- `browser_tabs(list)` first showed an existing dormant user tab
  `9b6c5c17-11cb-4be1-bac2-126953616052:1626496519`.
  Two explicit attempts to attach it failed before input with
  `BROWSER_CDP_TIMEOUT: Page.enable did not acknowledge`; no input was
  performed there. These are **tooling failures**, not device or product
  assertion failures; the original tab was not closed.
- A new single browser tab was created/attached successfully:
  `9b6c5c17-11cb-4be1-bac2-126953616052:1626496532`,
  initial pageId `2d689fe0-01bb-4b0f-863d-7f9869a754a6`.
  Browser console and network records were cleared/start-recorded
  **after attachment but before reload**. `browser_navigate(reload)`
  accepted; the post-reload snapshot returned `readyState=complete`,
  pageId `e348de4d-36a7-4a8d-8b01-27955af60fa9`.
- Actual measured viewport: **1912×970**; document scrollWidth 1912
  (no document horizontal overflow for this viewport); LCD logical
  Canvas **480×640**. `prefers-reduced-motion` was true.
- Browser network collection since attached reload: **35 HTTP requests**;
  all `GET http://127.0.0.1:4173/...`, status **200**, finished, no external
  origin. There were **0 console errors** on subsequent readback.
  **35 browser requests is not 37 runtime files:** the canonical 37-file
  runtime SHA inventory was independently verified from V36 and is not the
  count of files requested on this page reload. There is no claim that
  Desktop's request list individually body-hashed all 37 files.
- Chrome localStorage already had **five existing application keys** at
  attachment, and they were not cleared or exported. This is *not* a
  fresh-profile test. Do not mistake prior persisted data for a clean baseline.

## Native input observations (not DOM-synthesized clicks)

| Case | Actual observation | Result |
| --- | --- | --- |
| Keyboard Tab | Focus reached `#key-menu` and computed outline was solid | PASS, measured viewport |
| POWER | Actual pointer input to `#key-power` started LCD sonar simulation | PASS |
| MENU / ESC | With focus on MENU, Enter opened Sounder menu and Escape closed it; focus stayed on MENU | PASS |
| D15 readback | Three accessible h4 C11/D09/D14 headings, external to `.device-frame`; LCD contains no teacher source row | PASS, DOM/ARIA only |
| Teacher pause | `#btn-pause` changed to `Tiếp tục thời gian` and paused world tick | PASS |
| Teacher step | Focused `#btn-step`, Enter advanced exactly one world tick (278 to 279) | PASS |
| Replay | Focused `#btn-replay`, Enter showed `REPLAY PASS` with matched event/state, 283 recorded events at the check | PASS |
| Synthetic Own | Focused teacher `#btn-nav-fixture`, Enter enabled the fixture; D14 live-region announced `Nguồn Own giả lập còn hiệu lực` | PASS, synthetic-only |
| Teacher key isolation | While focus remained on Own fixture button, actual `r`, `ArrowDown`, `Escape` produced no new FCV event (284 remained 284) | PASS |
| MODE UI clock | Focused `#mode-knob`, ArrowUp displayed DUAL selection. After approximately seven seconds of wall-clock wait, DUAL committed; paused world tick remained 279 | PASS for simulated UI timer |
| Reset | Actual pointer click on D15 Reset returned LCD to POWER OFF, tick 0000, one reset/restore event, Own fixture OFF and MODE LF; five pre-existing localStorage keys remained | PASS |
| Console/network | 0 console errors; 35 completed localhost HTTP 200 requests observed after reload | PASS for captured session |

The observed actual `1912×970` viewport is **not** the mandatory exact
`1366×768` or `1920×1080` viewport. Previous headless Playwright suites
cover specific Chrome contexts, but cannot replace this separate native
Desktop gate.

## Screenshot provenance

CoS Desktop provided captured screenshot IDs:

- `15f76fcb-6688-4d65-8576-f7e803e50551` — initial test viewport.
- `3056bbb0-da5d-4ed8-9bb1-75d3eba48efa` — teacher controls in view.
- `b02c3ef5-c8bc-4e68-b8c8-9ebda9a479b8` — viewport before reset.

The connector reported an output bitmap 1600×812 at scale
0.8368200836820083, a **scaled screenshot of an actual 1912×970 viewport**.
These are connector screenshot references, **NOT saved/hashed workspace PNGs**.
Do not claim exported screenshots or exact OEM pixel fidelity.

## Mandatory cases still NOT_RUN / HOLD

- Exact **1366×768** and **1920×1080** attached Desktop viewport measurement
  and screenshot; attaching the existing real Chrome instance did not grant
  reliable viewport resizing. Earlier separate headless Chrome receipts do
  not close the live-attach viewport requirement.
- Native long-press cancellation, `pointercancel`, lost pointer capture and
  OS blur during held input in this newly attached run.
- Narrator/NVDA/VoiceOver real speech: no assistive-technology output or human
  speech review was captured. Accessible DOM is not a speech PASS.
- Every one of the 64 operator features and D15, firmware-specific menu
  geometry/timing, permitted OEM media rights, independent reviewer approval
  and lesson-specific release acceptance.

**Conclusion:** a useful current actual Windows Chrome interaction record
exists, but **not Phase 6 completion**. No user browser profile storage was
cleared; no real maritime/receiver interfaces were activated. All 65
source/rights and release claims remain HOLD.
