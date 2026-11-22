---
title: "Phase 7: Shared World, Replay Isolation and Future Model Readiness"
status: todo
---

# Phase 7: Independent Devices on One Synthetic World

## Overview

**Priority P2, depends on stable FCV public core.** Verify shared world is reusable for future radar/AIS/ECDIS while ensuring independent device reducers/controllers, separate observations and no premature AIS R5 UI. This is an architecture regression phase, NOT permission to implement the unknown SOLID/SUPREME variant or connect vessel protocols.

**Deep Pre-execution Scout Gate:** Re-read src/core/{scenario,session,protocol}.mjs, src/devices/fcv588/adapter.mjs, active public reference profile and replay tests; inspect docs/evidence/device-register.json, sources/manuals/ARCHIVE_COVERAGE.json, ADR-0001 and any saved session fixtures from Phases1-6. Assess event order, namespace boundaries and profile-version compat before modifying core. AIS R5 remains variant HOLD if no authoritative installed model evidence.

## Dependencies / file inventory

One shared WorldState tick -> typed, named observation streams -> per-device pure reducer/probe -> canonical session/replay event log. Future second observer is synthetic inert stub, not a real AIS/transponder device.

| Path or component | Action | Test impact |
| --- | --- | --- |
| src/core/device-runtime.mjs | New minimal multi-device subscription wrapper | test/fcv588-public-multidevice.test.mjs |
| src/core/scenario.mjs, src/core/session.mjs | Minimal typed multi-instance event/wiring revisions if needed | test/core.test.mjs compatibility |
| src/devices/fcv588/adapter.mjs | Keep FCV-specific menu/profile untouched by second device | device/replay tests |
| docs/evidence/device-register.json, ADR-0001 | Document explicit future variant boundary | registry/hardware HOLD tests |
| sources/manuals/ARCHIVE_COVERAGE.json | Read-only status source; no silent edit to downloaded source | research-inventory tests |

## Tests Before / scenario matrix

| Severity | Scenario | Expected |
| --- | --- | --- |
| Critical | FCV only versus FCV + inert second observer | identical FCV raw observation hashes and FCV-substream/event-projection hashes; **full multi-device envelope hash legitimately differs** when the declared active device set differs |
| Critical | Second observer own input/state | no FCV menu, Gain, Range or world mutation |
| High | Replay envelope with incompatible device set/revision | rejects before partial state update |
| High | AIS R5 SUPREME/SOLID identity unknown | no claimed R5 UI, no TX effects; HOLD |
| Medium | Public-to-future-hardware upgrade | distinct signed hardware acceptance, no overwrite of public record |

## Requirements

- [x] One world clock, named deterministic sensor streams and isolated device-specific state are proven by repeatable tests.
- [ ] Replay rejects mismatched active device set/profile/version while preserving previous FCV-only historical fixtures via explicit format migration.
- [ ] AIS R5 SUPREME vs SOLID, FAR-2127 controller, MDC-2060 revision, NS4000 version and J2000 identity remain independent holds until confirmed.

## Implementation Steps

### Task 7.1 — Second-device inert subscriber and replay isolation

- **Goal:** prove FCV observation and event log cannot be perturbed by a future extra device.
- **Target:** create src/core/device-runtime.mjs and test/fcv588-public-multidevice.test.mjs; inspect/update src/core/session.mjs, scenario.mjs minimally.
- **Steps:** (1) Create importable inert module stub and RED tests that reject shared mutable state and cross-profile replay; compare the same FCV input sequence with and without second subscriber using FCV-only observation, FCV event substream and semantic probe, **not** entire multi-device envelope hash. (2) GREEN expose minimal instance IDs and named streams, no generic FCV menu reducer, no AIS NMEA output. Ensure the complete envelope records the new device-set identity and therefore fails closed against an incompatible device set. (3) REFACTOR source version pinning, event ordering and FCV-only replay compatibility, rejecting actual mismatch.
- **Success:** FCV raw samples and semantic probes match exactly across both configurations, and inactive second instance cannot alter FCV sequence.
- **Verify:** RED node --test test/fcv588-public-multidevice.test.mjs exits 1 with named state-isolation assertion (not missing module); GREEN same exits 0; REFACTOR node --test test/core.test.mjs test/device.test.mjs and npm run check exit 0.

### Task 7.2 — Future-variant HOLD and safe hardware-upgrade documentation

- **Goal:** preserve strict model identity until the user chooses the actual AIS R5/radar/ECDIS version.
- **Target:** docs/evidence/device-register.json, docs/decisions/ADR-0001.md, test/fcv588-public-multidevice.test.mjs (extend, preserve 7.1), docs/reports/FCV588_PUBLIC_REFERENCE_ACCEPTANCE.md.
- **Steps:** (1) RED asserts unknown R5 identity cannot instantiate a UI claiming SUPREME or SOLID and cannot provide radio/NMEA transmit controls. (2) GREEN document future explicit profile IDs, data adapters, rights/version gates and separate HARDWARE_MATCHED_FIDELITY comparison path; no actual device UI. (3) REFACTOR check no automatic model substitution for J2000 or NS4000.
- **Success:** future device integration can start from a known ID/version only; old public-reference record stays immutable for historical QA.
- **Verify:** RED node --test test/fcv588-public-multidevice.test.mjs exits 1 with named R5 identity guard assertion; GREEN same exits 0; REFACTOR node --test test/registry.test.mjs test/research-inventory.test.mjs and npm run check exit 0.

## Todo

- [x] FCV raw world/sensor/replay invariant under second inert device.
- [ ] Strict unknown model/firmware variants stay HOLD; explicit upgrade route documented.

**Partial acceptance evidence, 2026-10-15:** the two checked isolation
entries are supported by src/core/device-runtime.mjs's immutable named
training-observer-world-v1 stream, its strictly inert secondary reducer
and the 12 focused negative/positive cases in
test/fcv588-public-multidevice.test.mjs, plus the core/session tests and
current 299/299 integrated Node PASS recorded in
reports/continuation-2026-10-15-v22-receiver-palette-lesson-browser.md.
The secondary observer's inspect event and schema cannot mutate the FCV
raw sensor hashes, gain/range, device event history or canonical WorldState.
The full historical replay migration requirement and all hardware-upgrade/
future-variant approval paths remain unchecked. Phase 7 is still OPEN.

## Success Criteria

Two tasks verified; current FCV simulator runs offline with repeatable replay while a test-only second observer demonstrates extensibility. No AIS R5/SOLID/SUPREME operator UI or real transmitter is claimed to exist.

## Refactor / Tests After

Avoid general-purpose device feature DSL or microservices; preserve adapter-specific controls. Report any replay schema bump as an explicit incompatibility and provide a recorded migration test instead of silently changing F0 lessons.

## Risk assessment

Cross-device mutation, output stream seeding changes and false R5 variant identity are highest risk. Never infer R5 choice from the mere existence of both documentation packages. HARDWARE_MATCHED_FIDELITY stays separate and needs future instrument evidence; a PUBLIC_REFERENCE PASS never upgrades itself.

## Failure Protocol

If any Verify step does not meet its stated pass condition, STOP this phase. Do not improvise a fix, retry blindly, or reason around the failure. Spawn the kongming subagent for next-step counsel and pass:
- the phase and task id,
- what you attempted (the steps you ran),
- the exact command and its full output,
- the pass condition it failed to meet.
Apply kongming's guidance, then re-run the Verify step. If kongming cannot be spawned in this environment, STOP and report the same failure evidence to the user. Never continue by self-reasoning.
