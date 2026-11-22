# FCV-588 V43 — Source atlas: BRILL repeated-key cycle and compatibility

**Date:** 2026-10-19. **Scope:** offline PUBLIC_REFERENCE simulator; FURUNO FCV-628/FCV-588 Operator's Manual **OME-23890-E §1.3**, with reference to historical E-manual notes. This is a source-bounded behavioral correction, NOT firmware verification or true sonar/hardware acceptance.

## Manufacturer oracle versus V42

Official manufacturer manual: https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf (§1.3).

The brightness dialog labeled Brill accepts integer levels 0–9. Continued short POWER/BRILL key presses sweep up to the peak 9, reverse to 8 and down to 0, then increase again. First short press while operating opens the Brill adjustment. The public-reference application treats approximately six seconds of inactivity as a UI-clock closure that commits the staged brightness; MENU/ESC or ENTER may commit. Exact physical timing, contact bounce, LED luminance and installed firmware-specific pixel layout are not asserted.

| Aspect | V42 training | V43 training | Status |
| --- | --- | --- | --- |
| Initial brightness | 9 | 9 | Preserved |
| First SHORT POWER/BRILL after boot | Open Brill, preview 9 | Same | Preserved |
| Next SHORT with preview 9 | 9→0 via modulo 10 | **9→8** | OEM discrepancy corrected |
| Subsequent SHORT at peak / lower endpoint | Modulo rollover | 9→8→7…→0→1…→9 | Explicit staged TDD |
| BRILL preview before commit | UI draft separate from brightness | Same | Preserved |
| UI inactivity, ENTER, MENU/ESC | Six-second inactivity/commit | Same | Regression tested |
| Canceled long POWER hold | Returns prior overlay | Same, preserving direction | Regression tested |
| World/sensor/replay envelope format | Independent | Independent | Preserved |
| Profile revision | F1-public-reference-20 | **F1-public-reference-21** | Incompatible historical behavior; fail closed |
| D15 lesson LEARN-07 | Instructed 9→0 | Instructs **9→8** | Teacher text is outside OEM face |
| Rights, actual firmware, OEM pixel fidelity | HOLD / UNKNOWN | HOLD / UNKNOWN | No promotion |

The new transient BRILL overlay stores stepDirection to replay the reflection deterministically. At each endpoint the direction reverses. TrackPad arrows retain their independent clamped step semantics; the combined mixed-input transition sequence and real mechanical key timing are not hardware-certified and remain candidates for later source review.

## Provenance and change boundaries

V42 final receipt SHA-256 fc7b2559cf16eed934a173b246c363ecdc5686f0413be90eae8f61bf99dd57d9 and postreceipt SHA-256 0d659c3dab920d6e8f6964e14522f1d23f0d80dfc4fcc215df6c9ecef70b5adc were verified read-only. The canonical V42 runtime preimage matched 37/37 SHA. Stage exact clone matched 37/37, with only 16 SHA-verified ORIGINAL TRAINING historical screenshots needed by Python fixture tests, no OEM PDF/image/firmware incorporated in runtime.

V43 touched four of 37 runtime source files: src/devices/fcv588/model.mjs, src/devices/fcv588/profile-version.mjs, src/core/lessons.mjs and web/app.mjs. The last change updates only an out-of-LCD teacher migration message from profile20 to profile21, not OEM screen labels. No web/index.html, CSS, display projector, transmitter/sonar/GPS/serial/USB/RF interfaces or event/replay/settings schema changes.

Canonical write-once apply receipt: docs/qa/FCV588_V43_CANONICAL_APPLY_20261019.json, SHA-256 fc57b5563294c68ac3aea835e31fe13231ab825124a45eb193577d4162be3674. Canonical source SHA 37/37 matched after integration.

Stage test harness import error was preserved as NOT a behavior RED. Independent behavior RED originally failed 6/6 after the import was corrected. Full staged Node first failed 2/484 only because two live source/evidence metadata profile labels still said 20; original log preserved; after scoped metadata updates the full suite passed 484/484.

Stage manifest original SHA-256 56a867debdf3196e5d5d1fd7c99753ac7f6a7043142422f0ef339e56cf7e8965 had literal trailing \n causing invalid JSON. It was not overwritten. Replacement valid JSON manifest SHA-256 a3b2ab6420bce6c026025861888f2cebb03ab8435e293f49f385916359906d19 was reread before canonical apply; first failed preflight did not change canonical.

## QA boundaries

Stage and canonical each passed **102/102 Chrome assertions across six isolated viewport contexts** (320×720, 375×812, 768×1024, 1366×768, 1440×900, 1920×1080), **245/245 actually loaded HTTP response-body SHA**, **12/12 PNG SHA** per run, and explicit profile19→profile21 teacher message/byte-isolation checks. Stage and canonical are independent runs; screenshots are not OEM photographs. Two stage BRILL-8 screenshots were visually inspected at desktop and phone width, with current simulated LCD preserved.

Canonical Node targeted 66/66, full 484/484, Python 13/13; localhost HTTP negative routes denied 4/4 (HTTP 404,404,403,405); CSP connect-src 'none' and nosniff present. No external browser requests. Do not infer from assertions an OEM fidelity percentage.

Actual attached CoS Desktop exact viewport resize to 1366×768 and 1920×1080, true Windows focus loss during POWER hold, Narrator/NVDA spoken-output QA, independent human/hardware reviewer and actual installed firmware remain **NOT_RUN / UNKNOWN**. Phase 6 **OPEN**, 65/65 claims **HOLD**, 14/50 checklist checked and 6/22 named tasks accepted unchanged; hardwareValidated=false, releaseApproval=HOLD.

## Next source gate

A V44 candidate is the combined BRILL short-key versus TrackPad direction, overlay reopening after commit, and contrast/luminance source behavior under §1.3, ONLY where a manufacturer oracle or permitted device recording exists. Also prioritize OEM Display/System menu, firmware identity and Phase 6 screen-reader/native Windows evidence. Do not adjust percentages or promote rights/hardware/release.
