# FCV-588 V45 — Native Windows/Chrome input and screen-reader gate

**Date:** 2026-10-19. **Scope:** a Windows Phase 6 partial result with no product/runtime change; tested the training browser simulator only.

## Windows prerequisite (NO-GO for OS blur)

Original write-once JSON receipt:
`staging/fcv588-v45-os-focus-qa/evidence/V45_NATIVE_FOCUS_PREFLIGHT_20261019.json`.

Actual native Windows HWND A=2689876, HWND B=14027334; distinct HWNDs were witnessed. However the first test-owned Chrome page still reported `document.hasFocus() === true` and `window.blur` count **0**. The real `window.blur` cancellation acceptance gate cannot be promoted. It remains **NOT_RUN**, and the native focus test's exit 2 is a prerequisite observation, **not** a product error.

Both test-owned headed Chrome windows were closed. The pre-existing user-owned foreground HWND 198108 was observed again afterward. No user-owned window was sent input, no OS screen reader was activated and no Windows display settings were changed.

## Chrome-native input QA (independently verified)

New isolated Chrome input test uses:
- Native keyboard Space-down and Tab focus shift from the POWER button, with trusted button blur.
- A genuine pointerdown/capture from Chrome followed by DOM API `releasePointerCapture(1)`, emitting trusted `lostpointercapture`.
- Chrome CDP input pipeline `touchStart` then `touchCancel` (not a synthetic JavaScript PointerEvent).

Tests verify held-key CSS cleanup, Brill preview restoration, no inadvertent power-off, no core input error, stable replay, no unexpected external browser request and actual browser-loaded response-body SHA for each served module/asset.

The first staging browser harness failed because `#event-count` was assumed to count *only two physical edges*. In fact `web/app.mjs` records periodic `ui-tick` events every 250 ms while Brill/power-hold is displayed, so an actual count of +3 is possible without an orphan up edge. The original failed run, exact code and SHA were retained; the V2 runner checks trusted events, observable device state, no blocked input and a lower-bound for canonical events while allowing independent clock ticks. The original V2 HTTP preflight also failed after the owned stage server became unavailable; it was separately recorded as environment STOP, with no browser assertions or receipt. The isolated server was restarted only after port/receipt/SHA checks and under a fresh log name. No application source changed.

The completed source-bound V2 Chrome runs are separate:

| Check | Staging | Canonical |
| --- | --- | --- |
| Viewports | 320×720; 375×812; 1366×768; 1920×1080 | Same four |
| Assertions | 96/96 PASS | 96/96 PASS |
| Actually loaded HTTP body SHA | 140/140 PASS | 140/140 PASS |
| Independently saved PNG | 8/8 SHA | 8/8 SHA |
| Replay | PASS | PASS |
| External source/console errors | None observed | None observed |

The staging and canonical Chrome runs are not merged into a fictional single run. Two staged desktop/phone screenshots were inspected: the Brill preview remained 8, the hardware faceplate was not amended, D15 remained outside the OEM face.

## Phase 6 remaining

Real Narrator/NVDA spoken-output review was **NOT_RUN**; system probes observed no Narrator/NVDA running, and no screen reader was started. Native CoS Desktop attached exact 1366×768/1920×1080 remained **NOT_RUN** despite isolated viewport tests. Installed firmware is UNKNOWN; OEM rights, hardware equivalence and release remain HOLD.

**Phase 6 OPEN, 65/65 claims HOLD, checklist 14/50, named tasks 6/22.**
