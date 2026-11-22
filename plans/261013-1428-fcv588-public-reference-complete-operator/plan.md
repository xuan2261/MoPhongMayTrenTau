---
title: "FCV-588 Public-Reference Complete Operator Training"
description: "Build a reference-backed, full-coverage FCV-588 student simulator without needing a physical unit or claiming hardware equivalence."
status: pending
priority: P1
effort: "Re-estimate after public-evidence profile freeze"
tags: [simulation, public-reference, deep, tdd, advice-handover, frontend]
created: 2026-10-13
---

# FCV-588 Public-Reference Complete Operator Training

## Overview

**Replaces the old plan for current execution, without overwriting history:** [prior hardware-target F1 plan](../261013-1319-fcv588-full-fidelity-simulator/plan.md) remains a separate optional future fidelity gate. The user cannot supply classroom-unit photographs/Diagnostics; the new plan MUST NOT depend on them to start, build, test, or publish a clearly labeled public-reference training program.

**Outcome:** an offline Windows simulator with an original proportional 480×640 FCV-588 panel, all publicly documented operator modes/controls/menu flows for explicit synthetic profiles, alarms, NAV, waypoints, Demo and diagnostics; teacher controls separate from physical key panel. Synthetic sensor data is deterministic and cannot operate real equipment.

**Primary reference corpus:** [Public image/video source register](../../docs/research/FCV588_PUBLIC_MEDIA_EVIDENCE_2026-10-13.md), [14-section public UI reference matrix](../../docs/research/FCV588_PUBLIC_UI_REFERENCE_MATRIX_2026-10-14.md), [FURUNO OME23890E manual (manufacturer)](https://www.furunousa.com/-/media/sites/furuno/document_library/documents/manuals/public_manuals/fcv628_fcv588_operators_manual.pdf), [65 research rows / 64 FCV+1 teacher](../../docs/research/FCV588_FULL_FUNCTION_INVENTORY_2026-10-13.md), [F0 model](../../src/devices/fcv588/model.mjs), [F0 audit](../../docs/F0-AUDIT.md), [manual archive manifest](../../sources/manuals/MANIFEST.json). Include the full public manual's Installation Chapter 4 **§4.9 IEC 61162-1 and §4.10 Adjustments after Installation** and Appendix 1 Menu Tree as offline interface/settings references only. Treat installation setup as a separate fixture, not a normal every-boot menu; Tankenmaru On changes NMEA menu/port availability. No hardware/NMEA transmission.

**Public profile:** class PUBLIC_REFERENCE, claim ceiling PUBLIC_REFERENCE_CONFORMANT, hardwareValidated=false, firmwareInstalled=null. The default hardware-free study profile is System→Demo On (not a factory default), with no physical transducer/GPS asserted; **generic menu Type=[600W]/[1kW] excludes ACCU-FISH, RezBoost and Bottom Discrimination**, unlike some individually named compatible 600W-rated transducers. Add synthetic named capable transducer profiles only with source-backed guards and environmental limits. Do not combine mutually exclusive firmware/option paths.

**Non-goals:** claiming exact match to a classroom device, OEM-certified sonar/hydroacoustic physics, tactile feel or unobserved firmware; ROM reverse engineering, NMEA/serial/RF/hardware output, copying protected photos/video/manual art, a generic AIS R5 UI before model identified, building a 3D bridge or multiuser cloud.

**Evidence/claims:** separate public sourceStatus (AUTHORITATIVE/CORROBORATED/CONFLICT_HOLD/RIGHTS_HOLD/SOURCE_GAP), implementationStatus (OPEN/IMPLEMENTED/SIMULATED_APPROXIMATION), courseStatus (NOT_REVIEWED/REFERENCE_REVIEWED). Never promote the existing hardware-only operatorFidelityStatus to VERIFIED_IMPLEMENTED based only on internet evidence. The 64 FCV and D15 teacher rows are never combined into a manufacturer-fidelity roll-up.

**Skill fidelity:** Installed ak-plan v2.2.2 --deep reference drives Phase1 research/scout and per-phase execution scout gates; --tdd drives RED→GREEN→REFACTOR in every phase. The --advice task/handover format and literal Failure Protocol are applied, but **full --advice supervision cannot be claimed** because this runtime has no targetable Kongming agent. Native ak 3.0.0-beta.17 CLI provides scaffold/validate, not workflow flags; independent CoS reviewers do not impersonate Kongming.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Public reference evidence / rights / version guards for every applicable FCV flow | P1 |
| 2 | Correct operator panel, controls, menus, timers and display response by published manual | P1 |
| 3 | Deterministic Demo/sonar, capability-conditioned modes, alarms, NAV, waypoints and diagnostics | P1 |
| 4 | Testable 64 FCV operation rows plus D15 instructor, with separate approval namespaces | P1 |
| 5 | Shared-world/replay compatibility with later AIS R5 and radar devices | P2 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Public evidence, source rights, synthetic reference profiles](./phase-01-start.md) | Pending; NO classroom-hardware blocker |
| 2 | [Physical panel and basic controls](./phase-02-physical-panel-and-basic-controls.md) | Pending phase 1 |
| 3 | [Menu atlas, settings and persistence](./phase-03-menu-atlas-and-persistent-settings.md) | Pending phases 1–2 |
| 4 | [Sonar views and advanced features](./phase-04-sonar-views-and-advanced-functions.md) | Pending phases 2–3 |
| 5 | [Alarms, NAV, waypoints, Demo, Diagnostics](./phase-05-alarms-navigation-and-demo-diagnostics.md) | Pending phases 3–4 |
| 6 | [Reference conformance and classroom QA](./phase-06-reference-conformance-classroom-qa.md) | Pending phases 1–5 |
| 7 | [Shared world and future device isolation](./phase-07-shared-world-and-future-ais.md) | Pending stable FCV core; no real AIS claims |

## Success Criteria

- [ ] For 100% of the 64 FCV entries and additional applicable menu nodes: source ID/grade/section or **actually inspected** video timestamp, rights, variant guard and sourceStatus. Claims with CONFLICT_HOLD/RIGHTS_HOLD/SOURCE_GAP are not called complete.
- [ ] Public Demo profile has firmwareInstalled=null, transducer not claimed attached, no real sensor/GPS; named transducer fixtures guarded individually; hardware-target status remains HOLD.
- [ ] All applicable **source-documented** student actions work including success, Back/ESC, invalid order, power/persistence, missing data/option and replay, with no unmarked placeholders in claimed completed lessons.
- [ ] 480×640 and source-backed control labels/relative positions, accessible input/hold/rotary/TrackPad; original rendering/graphics; no copyrighted raw assets embedded.
- [ ] D15 instructor lesson/replay/scoring has separate platform QA; visible badge "PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY"; no NMEA, serial, USB, RF, live navigation or hidden external network.
- [ ] Existing and new targeted tests GREEN, Node regression GREEN, browser E2E on target Windows displays, source/claim audit and independent red-team report attached.

## Executor invariants and quality gates

Every phase starts with a **deep scout** of current owning source/tests, the rights/evidence delta and variant-specific menu rules. Its tasks contain Goal, exact target paths/symbols, Steps, Success, Verify with mechanical expected output. Follow RED (new assertion failure, **not** ENOENT/syntax error) → GREEN (targeted test exits 0) → REFACTOR (targeted test and `npm run check` exit 0). The immutable F0 historical plan/source is preserved for replay.

This plan is **public-reference conformance**, not real-device validation. The older [real-hardware acceptance protocol](../../docs/research/FCV588_FIDELITY_ACCEPTANCE_PROTOCOL.md) is a separately scoped future upgrade, not a stop sign for this plan. Any unauthorized source processing is RIGHTS_HOLD for its affected claim; rely on allowed pre-existing research or independently written reference notes.

## Advice-style escalation

Each phase literally embeds the Failure Protocol required by ak-plan --advice: on Verify mismatch STOP, capture exact task, command, output, and expected result, seek Kongming if targetable, otherwise report failure to the user/prime. Never silently bypass the test or fabricate an unavailable video timestamp/hardware configuration.

## Implementation handoff

Run `ak plan validate <this-directory> --json` and link/claim audits before any cook. During cook, scout Phase 2+ anew, then use the phase task's RED/GREEN/REFACTOR and failure protocol. User has authorized planning/research, not an OEM-certified or live-vessel deployment.

<!-- slug: fcv588-public-reference-complete-operator -->
