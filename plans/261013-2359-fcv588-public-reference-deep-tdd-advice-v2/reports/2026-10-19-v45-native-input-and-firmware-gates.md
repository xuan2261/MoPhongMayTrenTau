# FCV-588 V45 — Native Chrome input cancellations and firmware/source boundary

**Date:** 2026-10-19. **Scope:** offline PUBLIC_REFERENCE operator-training simulator. This is a **QA/research-only milestone**, not a change to FCV-588 installed firmware or approval of OEM hardware equivalence. User-authorized GPT-6 supervised the scoped GO/NO-GO decisions; this is self-review, not an independent hardware reviewer.

## Objectives and source review

Starting point is canonical V44, with final receipt SHA-256 **bd5e4230d01c90856d8fe9773d46569802bcf0a888901099a583e4155d63a471** and postreceipt SHA-256 **8684a6d9d2821b61d354f51bfcdc3dbccbfffd7434e392d26b0976d75eab028f**. Their bytes matched before V45 and the canonical 37/37 runtime source SHA inventory matched V44. A separate staging directory copied those exact runtime bytes plus 16/16 historical original-training PNG fixtures; no manufacturer PDF/images/software or hardware transport was copied.

Manufacturer references are recorded in [V45 source atlas](../../../docs/research/FCV588_V45_FIRMWARE_NATIVE_FOCUS_SOURCE_ATLAS_20261019.md). The official FURUNO [FCV588/628 Software History](https://www.furunousa.com/-/media/sites/furuno/software_library/software/software/fcv588-628_software_history.pdf) identifies v1.05 as initial and v2.01 (September 2016) as introducing 8/16 color choices in Display plus related White Marker changes and an R&D Echo menu. This is product software history, **not** evidence of firmware installed on a specific FCV-588. The simulator's separate PUBLIC_REFERENCE profile remains F1-public-reference-21, not OEM firmware.

## Windows headful OS-focus prerequisite — NO-GO for genuine OS blur

One bounded test launched two test-owned Chrome windows, observing distinct native HWNDs 2689876 and 14027334. While the OS foreground HWND moved between them, the page originally focused still reported `document.hasFocus() === true` and **no `window.blur` callback**. The OS-window-blur-under-hold gate therefore remains **NOT_RUN**, not PASS. No synthetic `window.blur` was fired as a replacement. Original foreground HWND 198108 returned after test-owned windows closed; no user-owned window received test input. See [V45 partial Windows QA report](../../../docs/qa/FCV588_V45_WINDOWS_FOCUS_GATE_PARTIAL_20261019.md).

Narrator existed but was not running. NVDA was not running or found at the common installation path checked. No screen reader was activated. Actual Narrator/NVDA spoken output and native attached CoS Desktop exact 1366×768/1920×1080 remain NOT_RUN.

## Genuine Chrome input events versus synthetic unit tests

The existing `web/hold-input.mjs` listens for keyboard focus loss, native pointer capture loss and touch cancellation; existing `test/hold-input.test.mjs` covers unit-level synthetic EventTargets. V45 additionally exercises actual Chrome input with Playwright keyboard, pointer capture and CDP touch input rather than constructing synthetic `blur` events.

An initial staging browser runner failed on a strict `#event-count` delta of 2, recording 3. Root cause: V44 app's UI-clock `setInterval` logs `ui-tick` events every 250 ms while an adjustment/hold overlay is open; the D15 counter counts all recorded events, not only physical down/cancel edges. This was a harness-assumption defect, not proof of a broken product. Original failed runner, receipt and log were preserved. GPT-6 approved a distinct V2 runner that retains native trusted-event, state restoration, no product input-error, replay and SHA checks without treating independent UI ticks as extraneous key-ups.

The first V2 invocation then failed **before launching Chrome** due to localhost port 4229 refusing connections: the prior owned QA service session had become unavailable; a direct TCP check confirmed no listener. This failure log is preserved separately. Following receipt/source/port revalidation, a fresh owned server was started, and a new named V2 run completed.

The independent staging and canonical V2 Chrome runs each achieved:

| Verification | Staging | Canonical |
| --- | ---: | ---: |
| Viewports | 320×720, 375×812, 1366×768, 1920×1080 | Same four |
| Trusted native-input assertions | **96/96 PASS** | **96/96 PASS** |
| Actual browser-loaded localhost response-body SHA | **140/140** | **140/140** |
| New PNG screenshots SHA | **8/8** | **8/8** |
| Replay determinism | PASS | PASS |
| Unexpected external sources / browser console errors | None observed | None observed |

The tested inputs were native Space-down and Tab-induced button focus loss, browser pointerdown plus native `releasePointerCapture()` generating trusted `lostpointercapture`, and CDP-delivered `touchCancel`. Every scenario verified that POWER was not left pressed, that the prior Brill draft value was preserved, and that replay succeeded. Two staging desktop/mobile screenshots were visually inspected; these are independently drawn **training UI screenshots, not OEM pixels**.

Canonical localhost HTTP root served HTTP200 with CSP `connect-src 'none'` and `nosniff`; four negative routes were denied **404,404,403,405**. All owned temporary QA server ports 4229/4230 were stopped after Chrome/security checks. No real physical sensor, GPS/NMEA, USB, serial, RF, transducer or vessel system was connected.

## Node/Python regression and change scope

Staging full Node **491/491 PASS** and Python **13/13 PASS**. Canonical independently reran full Node **491/491 PASS** and Python **13/13 PASS**. The accepted V45 scope is **evidence and QA only**: 37/37 runtime sources byte-identical to V44, no profile/event/schema/menu/LCD/CSS/geometry/lesson changes, no commit or release.

Source atlas, Windows QA audit, milestone report, plan/Phase6 metadata and V45 write-once QA/evidence receipts are permitted additions. The staging V2 runner remains in the isolated stage, source-pinned to V44; it is not silently incorporated as a runtime module.

## Remaining gates and proposed V46

**Phase 6 OPEN, 65/65 claims HOLD, checklist 14/50, named tasks 6/22, hardwareValidated=false, releaseApproval=HOLD**, installed firmware UNKNOWN and OEM media rights HOLD. Neither 491 Node tests nor 96 Chrome assertions imply a percent match to physical FCV-588 hardware.

Recommended **V46**: arrange a controlled, permitted Windows accessibility validation environment capable of recording Narrator/NVDA actual spoken output, then independently resolve genuine OS-window blur while holding a key and exact native attached Desktop viewport sizes; or obtain authorized FCV-588 firmware/operation evidence to close source gaps. Until those facilities exist, continue only source-bounded software work and keep unexecuted acceptance gates NOT_RUN.
