---
title: "Phase 7: Shared World and Future AIS R5/Radar Device Isolation"
status: todo
---

# Phase 7: Shared World and Future AIS R5/Radar Device Isolation

## Overview

**Priority P2, may be developed while F1 test infrastructure is stable; no real AIS UI is authorised until its variant is identified.** Prove a second synthetic instrument subscriber can operate with the same world clock and scenario without changing FCV-588 displays, observations or replay. Preserve modular-monolith architecture B, not a premature distributed ship-bridge simulator.

Current source: `src/core/scenario.mjs`, `src/core/session.mjs`, `src/core/protocol.mjs`, `src/devices/fcv588/adapter.mjs`. Named profiles/register in `docs/evidence/device-register.json`. R5 SUPREME and SOLID manuals are separately archived; real classroom variant still unknown.

## Requirements

- [ ] Typed, versioned WorldState and sensor observations for FCV sonar and one inert test-only sensor/consumer (not a fake R5 face).
- [ ] World clock advances once per scenario tick independent of device power/off, zoom, gain, pause picture advance or second subscriber lifecycle.
- [ ] Distinct per-device state, InputEvent target ID, sequence ordering, profile version and replay metadata for active device set; fail closed on mismatch.
- [ ] Counter-based named PRNG streams make addition/removal of idle or active second subscriber observationally neutral for unchanged FCV configuration.
- [ ] No WebSerial/WebUSB/UDP/real NMEA transmission, external live AIS feed or actual vessel network in training bundle.

## Implementation Steps

1. Pin minimal cross-device contracts `WorldState`, `SensorObservation<kind/version>`, `DeviceAdapter` and per-instance event target. Do not introduce universal menu/state DSL or one generic EchoRadarAIS DTO.
2. **RED:** identical fixture with FCV alone and with idle stub, assert byte-equivalent FCV observations and state hashes at every checkpoint.
3. Add an active but independent test subscriber to consume world tick, simulate missing data and reset without changing FCV.
4. Extend replay envelope to record active profile identities/hashes and event ordering; reject wrong second-device version and cross-instance event delivery.
5. Run contract and browser regression for FCV unchanged after subscriber creation/removal and use off/boot/hold scenarios.
6. Only **after user supplies actual AIS R5 nameplate/firmware** start a separate evidence pack and phased screen-state implementation; similarly MDC-2060 requires controller revision and FAR-2127 requires RCU variant.

## Todo

- [ ] FCV alone vs FCV+stub: all world/sonar/replay hashes unchanged for matching events.
- [ ] Two subscribers consume the same clock once, no shared mutable menu state.
- [ ] Replay rejects unknown devices, events routed to wrong instance or profile mismatch.
- [ ] No real equipment adapter bundled or exposed by browser.
- [ ] New device identity gates explicitly prevent silently choosing R5 SUPREME/SOLID.

## Success Criteria

**PASS:** shared-world isolation proven with tests; no claimed R5 user interface or physics. F1 FCV fidelity can finish independently of this phase's real AIS feature work.

**Risk:** over-generalizing too early; prefer pure small versioned observation ports to unnecessary microservices/3D simulation. Any future live equipment connection requires a new isolated authorization and safety review.
