# FCV-588 V45 — Public firmware evidence and Windows focus conformance boundary

**Date:** 2026-10-19. **Scope:** FCV-588 offline PUBLIC_REFERENCE classroom simulator, Phase 6 evidence only. Neither the installed firmware on any physical unit nor marine-device hardware equivalence is established.

## Manufacturer sources and firmware version boundary

- Manufacturer support page: https://www.furunousa.com/en/support/FCV588 — links the official FCV-588/628 manuals and the manufacturer's shared software history. The listed product is no longer available through that catalog; this does not identify an installed version.
- Manufacturer software history: https://www.furunousa.com/-/media/sites/furuno/software_library/software/software/fcv588-628_software_history.pdf — **v1.05 initial release**; **v2.01 September 2016** added 8/16-color choices to the Display Colors menu, changed White Marker settings and added an Echo menu under System for research/development use. The PDF is an OEM source **for change history**, not proof a classroom or ship unit runs v2.01.
- Manufacturer operators' manual OME-23890-E: https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf — §1.3 describes the BRILL key and left/right adjustment, the 0→9→8… reflected level cycle and the approx. six-second adjustment window. It does not certify every mixed-control behavior without target-unit measurements.

The simulator's `F1-public-reference-21` revision is a **training replay/settings contract**, not the manufacturer's installed firmware version. Do not equate the two. No official firmware package, manufacturer image, PDF page, font, binary, photo or video frame was copied into the simulator runtime or released.

## Windows QA source and observed facts

The only device input adapter under evaluation is `web/hold-input.mjs`. It listens to POWER/FUNC physical-button `keydown`, `blur`, `pointerdown`, `pointercancel`, `lostpointercapture` and `window.blur` and routes canonical `down`, `up` and `cancel` edges into the offline event log. The existing Node `test/hold-input.test.mjs` covers synthetic EventTarget cases; those unit tests are **not** proof of actual Windows OS focus.

An independent Windows headed-Chrome prerequisite test switched between **two different native foreground HWNDs** (2689876 and 14027334, names V45 Focus Owner A/B). The first Chrome document initially had focus, but after the native foreground HWND switch it still reported `document.hasFocus() === true` and **zero observed `window.blur` callbacks**. Thus genuine OS-window focus-loss cancellation is **NOT_RUN**, not PASS, not a proven product bug. The original user-owned foreground was observed again after test-window cleanup. The original write-once failed receipt and log remain in V45 staging evidence; no synthetic `window.dispatchEvent(new Event('blur'))` was used to substitute a pass.

The independent **Chrome-native input pipeline** test succeeded in four isolated headless Chrome viewport contexts (320×720, 375×812, 1366×768 and 1920×1080): actual keyboard Space + Tab focus shift, native `lostpointercapture` after a real pointerdown and `releasePointerCapture()`, and Chromium CDP `Input.dispatchTouchEvent` with `touchCancel`. Each operation restored the existing Brill preview without unintentionally switching the device off. Trusted DOM event evidence, isolated storage, source-body SHA and replay checked.

This Chrome QA is stronger than simulated DOM event tests, but it is **not** proof of physical input-device behavior, **not** actual Windows `window.blur` during a held key, and isolated 1366×768/1920×1080 Chrome contexts are **not** attached CoS Desktop native resize gates.

## Phase 6 and next gate

At the V45 Windows inspection, Narrator.exe existed but Narrator was not running; NVDA.exe was not found at its common installed path and its process was not running. Spoken screen-reader output has not been captured. No screen reader was activated and no desktop display-settings change was performed.

**OPEN / HOLD:** native CoS Desktop exact 1366×768 and 1920×1080, real OS-window `blur` while holding, Narrator/NVDA actual speech, physical keypad and acoustic behavior, installed FCV-588 firmware identification, authorized OEM original screen geometry/media rights and independent conformance review.

**Phase 6 OPEN, all 65 claims HOLD, checklist 14/50, named tasks 6/22, hardwareValidated=false, releaseApproval=HOLD.**
