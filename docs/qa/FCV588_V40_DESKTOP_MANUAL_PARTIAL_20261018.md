# V40 — native CoS Desktop browser manual provenance (partial)

**Date:** 2026-10-18. **Application:** FURUNO FCV-588 offline
localhost training simulator, independently drawn panel.
**Evidence class:** actual attached Desktop Chrome browser at observed
viewport, not a full Phase 6 release gate.

## Attached-session sequence

1. `browser_tabs(list)` found a user-owned preexisting
   `http://127.0.0.1:4173/` tab ending `:1626496519`.
   It was not touched or closed. A separate new background Chrome
   tab was created, attached and loaded at this URL:
   `9b6c5c17-11cb-4be1-bac2-126953616052:1626496556`,
   initial pageId `244722ec-ee3b-49aa-b18f-c4910927faf7`.
2. Both browser console and network capture were cleared **after
   attachment and before a browser reload**.
3. `browser_navigate(reload)` was accepted and post-reload
   `browser_snapshot` confirmed `readyState=complete`; pageId
   `8de81a27-0878-4ac8-8208-8dc51080bc9b`.
4. An actual `browser_action` Tab key focused `#key-menu`.
   Subsequent read-only `browser_evaluate` confirmed its rendered
   accessible/visible label `MENU/ESC`, computed focus outline
   `solid`, and measured text-range ink fully inside the button.
5. Actual viewport `innerWidth×innerHeight` was **1912×970**,
   document `scrollWidth=1912`, LCD native Canvas **480×640**.
   C11/D09/D14 instructor matrix remained outside the instrument
   `.device-frame`.
6. Browser network readback since attached reload listed exactly
   **35/35 finished HTTP 200** requests, all
   `http://127.0.0.1:4173/...`, with zero dropped entries.
   Console error readback returned **0** entries.
   These are *request metadata*, **not** a Desktop body-SHA
   collection; separate staged and canonical Playwright runners
   checked actual response body SHA.
7. `browser_screenshot` returned reference
   `317458ed-0808-43a2-a672-13dcf5cce941`, bitmap 1600×812
   at scale 0.8368200836820083 of the actual viewport.
   This screenshot was **not exported to a canonical PNG path**,
   and therefore was not given an invented filesystem SHA.
8. The newly created V40 tab was explicitly closed. The
   preexisting user tab was left unchanged. The temporary staging
   server, which served the V40 staged HTML at the time, was
   stopped separately.

## Bounds and pending gates

- **Native Windows Desktop 1366×768 and 1920×1080** remain
  **NOT_RUN/HOLD**: this browser actually measured **1912×970**.
  An earlier session's attempted native resize was blocked
  before execution. V40 did not override browser/window geometry.
  Isolated Playwright viewport checks at the requested sizes
  are a distinct and correctly named evidence class.
- Windows Narrator exists but no real spoken-output review,
  audio or NVDA session was captured. Actual speech stays
  **NOT_RUN**; a live DOM/ARIA label is not real speech verification.
- This read-only/UI-keyboard workflow cannot certify original
  FURUNO bezel pixels, panel fit, screen colors, firmware or
  physical controls.

**Decision:** scoped live browser readback PASS for the explicit
checks above; Phase 6 still **OPEN**, 65 source/rights claims
**HOLD**, `hardwareValidated=false`, `releaseApproval=HOLD`.
