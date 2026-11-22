# FCV-588 V44 — BRILL and TrackPad source/behavior boundary

**Date:** 2026-10-19. **Scope:** offline PUBLIC_REFERENCE training simulator only. This document is not a firmware extract, a physical timing measurement or an OEM image reproduction.

## OEM manual oracle versus source gap

Primary manufacturer public reference: [FURUNO FCV-628/FCV-588 Operator's Manual, OME-23890-E, §1.3](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf). A separate older FURUNO OME-23890-B text agrees on the same defined operator controls and brightness sequence.

| Contract | Evidence level | V43 simulator | V44 decision |
| --- | --- | --- | --- |
| First short POWER/BRILL opens adjustment | Manual text §1.3 | Brill preview opens without committing | Verify as-is |
| Repeated short key cycles 0→...→9→8→...→0→1 | Manual text §1.3 | Reflected-cycle preview using transient stepDirection | Preserve and regression test |
| ◄ and ► can adjust display brilliance | **Explicit OEM oracle** §1.3 | Left/right each moves one level, with clamp 0..9 | Verify integrated path and bounds |
| ENTER or MENU/ESC saves and closes | Manual text §1.3 | Both commit preview | Verify after mixed input |
| Approx. six seconds inactivity auto-closes | Manual §1.3; training UI timer is deterministic | UI clock commits after six seconds, restarts on adjustment | Test simulator semantics, not mechanical latency |
| Repeated BRILL direction immediately following TrackPad left/right | **NOT SPECIFIED** in manual text consulted | The transient repeated-key direction currently persists after TrackPad, independent of arrow direction | Test only safe bounds, determinism and committed/draft separation; DO NOT claim OEM direction |
| Up/down arrows while Brill dialog open | **NOT SPECIFIED** in §1.3 | Existing training code adjusts brightness with these arrows | Preserve pending additional OEM/firmware evidence; do not elevate this to an OEM claim |
| Keypad brightness vs display brilliance | Manual note says physical key panel changes automatically | Simulated LCD contrast/luminance, not measured hardware backlight | No new hardware/pixel claim |
| Ambient-temperature effect, installed firmware, panel timing | Manual caution / independent evidence missing | Synthetic offline training | HOLD, no manipulation of hardware/ship |

## V44 bounded implementation decision

**GPT-6 source review: TEST-ONLY GO**, because the cited §1.3 does not settle what happens to the repeated-key sweep direction after an intervening left/right TrackPad adjustment. No behavioral change, profile bump, settings/replay schema edit, front-panel/LCD change, or OEM media incorporation is justified merely by a hypothesis.

Add independent deterministic tests that cover actual key/pad interaction, range bounds, preview/committed separation, six-second UI timer restart and close, power-hold cancellation, replay reproducibility, no synthetic sensor/world mutation, and projector purity. Preserve current profile `F1-public-reference-21`. Add project-native browser QA where useful. Do not promote any source-rights/hardware acceptance.

## Unresolved manufacturer/hardware verification

To establish the mixed-input direction exactly, obtain an authorized FCV-588 unit, record the installed software revision and controlled operator sequence with rights to use that evidence. Keep test outcomes labelled **software-only**, and Phase 6 OPEN, 65/65 claims HOLD, checklist 14/50, named tasks 6/22, hardwareValidated=false and releaseApproval=HOLD.
