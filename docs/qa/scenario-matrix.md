# F0/F1 Verification matrix — FCV-588 training interface

All examples are synthetic. They are not approved shipboard use cases. Severity reflects the training system's integrity and future extensibility.

## P0: platform behavioral invariants

| Check | Scenario and expected evidence | Current status |
| --- | --- | --- |
| QA-CORE-01 | Advance simulation 4 seconds with FCV off vs on; world position/tick and sensor echo must remain identical. | Automated |
| QA-CORE-02 | Power press advances boot; release after >3 s turns off, including while sim time is paused (captured browser duration). | Automated; actual firmware/timing HOLD |
| QA-CORE-03 | Gain, Range and MODE changes do not mutate world or raw sensor observation. | Automated |
| QA-CORE-04 | Run -> createReplayEnvelope(meta+events+fingerprint) -> replay; hashes match every prefix and swapped envelope content fails closed. | Automated; drift detection, not authentication |
| QA-CORE-05 | Alter profile revision, seed, replay clock/sequence, PRNG or core header; fail closed without success. | Automated |
| QA-CORE-06 | Reset with held control and consumed ticks clears keys, effects, counters, log and world; equals fresh session. | Automated |
| QA-CORE-07 | Browser redraw frequency (0, 1, many) never changes core state; browser tick cadence pauses may slow time but cannot modify event replay semantics. | Design invariant; browser cadence E2E pending |
| QA-CORE-08 | Named counter-based sonar stream unaffected by separate idle AIS random stream. | Automated fixture; real AIS module not implemented |
| QA-CORE-09 | Duplicated DOWN, UP without DOWN, invalid gestures or oversized wheel detents reject. | Automated |
| QA-SEC-01 | Static HTTP only on loopback; no traversal into docs, transcript or OS files; CSP connect-src none. | Automated + Chrome localhost smoke |

## FCV teaching workflow acceptance matrix

| Operation | Manual | F0 acceptance | F1 remaining gate |
| --- | --- | --- | --- |
| T01 Power | §1.2 p2 | Press and hold via model; boot splash and power transitions work deterministically. | Hardware capture of timing/real boot screen |
| T02 Brill | §1.3 p2 | Brightness dialog adjusts 0..9 and commits. | Full cycling/auto-close and visual comparison |
| T03 Mode | §1.4 pp2–4 | MODE cycles seven names; LF/HF/DUAL display synthetic echoes. | Actual NAV/ZOOM layouts and mode overlay |
| T04 Range | §1.5 p5 | Stage auto/manual and range preset; cancel and ENTER differ. | Bottom Discrimination disabled behavior |
| T05 Gain | §1.6 pp5–6 | Push selects auto/manual; rotate manual gain 0..10. | Auto gain offset, firmware-specific visuals |
| T06 VRM | §1.7 p6 | TrackPad up/down moves marker and readout on sonar; NAV rejects movement. | Verify actual line, step and visibility on hardware |
| T07 Menu | §1.8 p7 | — | Correct 5-menu navigation and cancel/save |
| T08 Shift | §1.9 pp7–8 | — | Shift and Auto Range restriction |
| T09 Pic. Advance | §1.10 p8 | — | Advance presets/freeze with repeatable echo data |
| T10 Interference | §1.11 p9 | — | Interference menu and visible noisy scenario |

For F0, six workflows are only *partially* demonstrated; no row is a full manufacturer's acceptance certification.

## Manual/visual and copyright acceptance

- Verify manufacturer/manual revision is pinned; record actual FCV hardware Firmware Starter/Booter/Main version and transducer options; model equivalence alone does not prove menu identity.
- Use own/licensed front-panel photos. Photograph all labels, bezel/screen ratio, buttons, push/rotate grips; record expected Windows classroom screen size and zoom factor.
- Compare panel at off, startup, LF, HF, DUAL, Range, Gain and Brill; track significant pixel/geometry differences separately from behavioral defects.
- Operator signs off on sequences: pointer, keyboard fallback, rotary movement, short/long key, menu commit/cancel, wrong-order input, power reset, inactivity.
- Keep mark as deferred until Tankenmaru and waypoint configuration known; never silently report success for unsupported controls.

## Red-team scenario examples

| Severity | Case | Required outcome |
| --- | --- | --- |
| Critical | Training app accidentally sends live position or opens serial/radio port | No hardware/network output paths in F0; fail closed |
| Critical | Import replay from other firmware/scenario and grade as correct | Reject incompatible replay/provenance |
| High | Device turned off freezes world for AIS and radar | Central world still advances |
| High | Mouse pressed then focus lost leaves POWER permanently pressed | Cancel edge and release state; repeatability preserved |
| High | F0 placeholder menu displays as if implemented | Obvious unimplemented label, no fake assessment pass |
| High | Third-party screenshot republished without permission | License HOLD; replace with original licensed art |
| Medium | Browser throttles timer in background | Simulation clock still advances only on explicit ticks; lesson controlled pause/resume |
| Medium | Left/right keyboard direction differs from physical TrackPad | Normalize input at adapter and test |

## Quality gates

**F0 conditional GO:** source and test syntax valid; core P0 tests pass; local webpage loads, core buttons can be operated, reset/replay works, security headers and static-root guard checked. No claim of exact physical fidelity.

**F1 high-fidelity NO-GO until:** all ten operator workflows demonstrably pass on an approved target model/firmware, rights cleared for every image/manual asset, visual reference captures available, and operator has approved the sequence and UI alignment.
