# FCV-588 V22 — receiver source safety, LCD contrast and lesson scoring

**Date:** 2026-10-15. **Actual workspace:** C:\Work\MoPhongMayTrenTau.
No Git repository was initialized; existing 127.0.0.1:4173 server PID
36768 was preserved. The only active plan remains
plans/261013-2359-fcv588-public-reference-deep-tdd-advice-v2/plan.md.

**Verdict:** Scoped implementation and Chrome browser testing PASS.
Public-reference OEM conformance, redistribution rights, physical hardware
equivalence, independent lesson approval and product release remain HOLD.

## V22 pinned source identity

| Contract | Actual current identity |
| --- | --- |
| FCV training profile | F1-public-reference-16, NOT an installed firmware version |
| Local settings | schema15, key mophongmaytrentau.fcv588.public-reference.settings.v15 |
| Core/event/replay | f1-core-5 / 5 / 5 |
| Scenario/multi-runtime | scenario7; multi-runtime3, inert observer unchanged |
| Common 32-file web/src runtime SHA-256 | 56cffc8a30c09349b1d7ffa14410b2802d7463133bc0ecd7a3a48df7fc907aec |
| Release | HOLD |

The prior V21 profile15/schema14 and its PASS receipts are historical.
Profile16/settings15 explicitly rejects incompatible old settings and
replay metadata: new source/status, display contrast and lesson semantics
must not silently reinterpret old teaching sessions.

## Behavior delivered by current RED → GREEN TDD

| Feature | Observed RED problem | Implemented and verified GREEN subset |
| --- | --- | --- |
| D14 | Active virtual NAV fixture let a stale/missing Trip source appear SYNTHETIC_OWN; Tankenmaru suppression contradicted Own live statuses | Trip/Speed/Temp availability now requires fresh typed synthetic position. Invalid, stale, missing and suppressed channels explicitly say NO_TRAINING_DATA or INACTIVE_TANKENMARU; NMEA selection remains NO_EXTERNAL_RECEIVER; no port/transmitter |
| B19 | White palette left white-on-white depth/frequency/header ink hard to read | Original LCD theme projects independent ink/pane contrast from displayed background. White/Blue/Black/Mono/Night x 8/16 schemes satisfy at least 4.5:1 checked label contrast in pure tests, and actual Chrome tests White↔Blue CSS and visible screenshots |
| D15 | No lesson assessed receiver-absence by a full faceplate-key sequence | Fifth source-grade §4.9 lesson requires MENU→System→Receiver Status, fresh attempt fingerprint, NO_TRAINING_DATA and transport NONE, rejects wrong fixture and historical work, verifies deterministic replay; no OEM certification |
| Phase2 original geometry | Panel was anchored left in a wide two-column training workbench | Reference-estimate 233:270 illustrated bezel now centered at full size in its column, D15 stays outside. Browser measures geometry at 1366 and 1920; mobile remains explicitly non-OEM training reflow |
| Persistence/replay | Old profile15/schema14 would silently carry new display semantics | Explicit profile16/schema15/key v15; old profile/settings rejected; unchanged shared-world/core schema and inert observer contracts |

Existing power, MODE/RANGE/GAIN/BRILL/VRM, MENU staging/cancel, sonar
LF/HF/DUAL/Zoom, ACCU-FISH/BDS/RezBoost guards, ALARM1–5, waypoint,
Trip/Odometer, Arrival, Demo/Diagnostics and replay were preserved.
Unreviewed OEM numeric ranges, fonts/colors, true sonar and real IO were
not inferred from a synthetic display.

## Verification of the actual integrated source

- Full npm run check: **299 tests, 299 PASS, 0 FAIL, exit 0**.
- Python Chrome source integrity and harness tests: **7/7 PASS**; both
  Chrome Python runners compiled.
- Menu atlas generator --check: PASS, **67 entries** in five main groups.
- Feature status generator --check: PASS, **64 FCV IDs plus D15**.
- Public trace generator --check: PASS, all 65 public claims HOLD.
- Recursive restricted runtime asset policy: **32 source files PASS**,
  no vendor media or symlink admitted to web/src.
- Archive verifier: previously verified **24 PDFs + 2 ZIPs**,
  PASS_AVAILABLE_ASSETS_WITH_GAPS, 197171462 bytes. This is source
  integrity evidence, not license/redistribution permission.
- AgentKit plan validate PASS, parse: 7 phases, 22 Task headings,
  50 checklist entries, **14 checked** following a later gated,
  source-linked partial reconciliation of Phases 2 and 7.

### Real Google Chrome V22 evidence

Chrome drove actual keyboard, pointer, touch, hold/cancel, menus,
persistence/replay, D15 new lesson, white palette and desktop geometry.
Every completed browser-loaded response body was SHA-256 matched against
the preflight runtime tree, not inferred from HEAD requests or a PID.

| Chrome Windows context | Result | Verified HTTP response bodies | Loaded paths | Body aggregate SHA-256 |
| --- | --- | ---: | ---: | --- |
| Desktop 1366x768 | PASS | 60/60 | 30 | 0ab634580cb0e70438b3c4a723de66464b62757837de4219cac1e48ca1b674fc |
| Desktop 1920x1080 | PASS | 60/60 | 30 | 7439463cd047e17f7ea85a2147e38ecb079ff0f676c53d46852c550b2e2432a8 |
| Touch-emulated mobile 360x800 | PASS | 30/30 | 30 | ed981747eadad45ee7f1ea65354425daa718a4f979abd0d9474bee7736d63837 |
| Touch-emulated mobile 390x844 | PASS | 30/30 | 30 | 3b26ec66e9d4f8b62e38dfe7f9eb7feccea6f0faf60473e7a14b8f63e32615bb |

Receipts:
- docs/qa/FCV588_CHROME_VIEWPORT_V22_RECEIPT.json
- docs/qa/FCV588_CHROME_MOBILE_V22_RECEIPT.json

Both show preflight SOURCE_TREE_IDENTITY_PASS,
postflight SOURCE_TREE_STABLE_PASS and QA harness PASS_UNCHANGED. Both
matched **32/32 current local public runtime file hashes**, with common
manifest 56cffc8a30c09349b1d7ffa14410b2802d7463133bc0ecd7a3a48df7fc907aec.

Independent local fingerprints of the Python execution tools:
- Desktop runner and mobile-imported verifier:
  aa0534eaf7cdb1cda075b61dd64117fb409f33671ade5212a63a70852ab8f85d.
- Mobile runner:
  4814db2c171a36eeede437b5cae386f191492e5368cbb33e7451dab55fd20e4c.

Each viewport had **0 JavaScript console errors and 0 failed/nonloopback
network requests**. Logical Canvas LCD remains 480x640. Nine fresh
full-page V22 PNGs exist under docs/qa/screenshots, including White-palette
desktop/mobile views. Desktop normal+White and mobile White+Blue captures
were visually inspected; layouts are independently drawn, not OEM pixels.
Phone touch targets remain >=44 CSS px and its rearranged faceplate is
explicitly training-only, not physical FCV-588 geometry.

## Seven phases and 22 Task headings: acceptance truth

| Phase | Named Tasks | Checked | Scope now implemented; remaining acceptance gate |
| --- | ---: | ---: | --- |
| 1 Public evidence/profile/rights | 5 | 10/10 DONE | Frozen public-source baseline. Does not certify physical device |
| 2 Panel/controls | 3 | 2/7 IN PROGRESS | Original bezel/LCD, physical keys/timers and measured Chrome; original artwork and Task 2.1 now have direct RED/GREEN/browser/source evidence. Remaining timer/firmware review and full task acceptance still open |
| 3 Menu/configuration/persistence | 3 | 0/7 OPEN | 67 five-root source-graded menu entries, staging/commit/cancel/reload; full OEM option/firmware oracle and reviewer approval absent |
| 4 Sonar/advanced | 3 | 0/7 OPEN | Synthetic echo modes, 8/16 palette legibility, virtual transducer guards; real acoustic/firmware/colorimetry measurements absent |
| 5 Alarms/NAV/System | 3 | 0/7 OPEN | ALARM1–5, navigation/trip/arrival, D14 source guard, D09 optional virtual read-only; D04 and C11/D09/D14 full semantics still held |
| 6 Conformance/D15 course | 3 | 0/7 OPEN | 299 unit tests, 7 Python, Chrome 4/4, five D15 lessons; 65 per-ID signed source/browser/cancel/replay rights and lesson reviewer acceptance absent |
| 7 Shared world/future devices | 2 | 2/5 IN PROGRESS | One world tick, named immutable inert observer and raw FCV invariance accepted with the 12 targeted multi-device tests. Historical replay migration and future variants' complete admission still open |

**Total 14/50 checkboxes (28%), Phase1 alone DONE (10/10)**.
After inspecting the exact current phase requirement language and
code/test/browser evidence, only four additional individual checkboxes
were accepted: Phase2 independently authored panel artwork and Task2.1,
plus Phase7 named-stream/world isolation and its FCV invariant todo.
Each phase file records the grounded tests and the unaccepted remainder.
The accepted Task-heading accounting is **6/22** (five Phase1 Task
headings and Task2.1 backed by original artwork, RED/GREEN and actual
Chrome); the remaining **16** named Task headings remain unaccepted
despite substantial implementations. No other Task was claimed
fully accepted without all its original gates.
Phase2 and Phase7 are *in progress*, not completed. No phase-level
completion or OEM independent-review approval was manufactured.

Current 65-row reviewed status remains conservative: **60 FCV operator
features and separate instructor D15 as OPERABLE_SYNTHETIC_SUBSET;
C11/D09/D14 as MENU_ONLY_PARTIAL; D04 as NOT_IMPLEMENTED**.
All 65 claim decisions, source rights and product/course release HOLD.
No OEM conformance, installed firmware, transducer identity, physical
NMEA/IEC/RF/UDP/WebSerial/WebUSB access or sonar hardware was claimed.

The already researched FAR-2127, MDC-2060, NS4000 and KODEN J2000
manual/repository comparison is retained in
docs/research/MARITIME_DEVICE_SIMULATOR_LANDSCAPE_2026-10-15.md.
Those variants remain explicit identity/version/rights holds rather than
fabricated additional instrument implementations.

**Admission work still required:** ID-specific source-linked
positive/negative/cancel/replay/browser evidence, independent instructor
review, cleared rights and authorized firmware/hardware measurements.
True 100% machine parity is objectively not proven by software tests:
it requires a legally usable identified FCV-588 firmware/transducer/unit
and physical geometry/color/acoustic/timing evaluation.

No targetable Kongming supervisor and no independent final lesson
approval were available. The ordinary worker audit attempts did not
produce a fresh GO and are not presented as review authorization.
**Release HOLD.**
