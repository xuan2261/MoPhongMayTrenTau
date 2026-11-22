# FCV-588 fidelity — canonical status and measurable acceptance contract

**Draft for operator agreement; dated 2026-10-13. NOT manufacturer tolerances and NOT an F1 sign-off.**

This file resolves a design risk found during independent plan audit: ambiguous feature-status labels could lead to a falsely completed training product, while subjective “looks right” could pass a wrong screen or knob.

## 1. Single feature status vocabulary

Use exactly these values for features with `scope=FCV_OPERATOR` in the implementation plan and feature register:

| Status | Meaning | Counts for final F1 operator-fidelity release? |
| --- | --- | --- |
| `OPEN` | Missing evidence, implementation, test, or operator decision | **No** |
| `SIMULATED_ONLY` | A synthetic UI/behavior exists, but its actual FCV operator sequence/screen has NOT been verified | **No** |
| `VERIFIED_IMPLEMENTED` | Applicable operator behavior implemented and independently checked against the actual model/firmware/option configuration, test fixtures and approved media rights | **Yes** |
| `NOT_APPLICABLE_WITH_EVIDENCE` | Real target unit does not have the capability; the disabled/unavailable user path was verified, including transducer/software reason | **Yes (as N/A)** |

**Allowed progression:** `OPEN → SIMULATED_ONLY → VERIFIED_IMPLEMENTED`; `OPEN → NOT_APPLICABLE_WITH_EVIDENCE` is allowed with the corresponding hardware proof. A changed firmware, transducer, menu, source revision or failed regression invalidates the old approval and returns to `OPEN`. Directly claiming `VERIFIED_IMPLEMENTED` from an unmeasured F0 placeholder is forbidden.

**Important distinction:** `VERIFIED_IMPLEMENTED` means the **operator interface, sequence and displayed feedback** match the tested equipment. It does **not** mean the synthetic sonar measurement has OEM-calibrated physical accuracy. Such output must remain clearly labeled training data.

### Release roll-up

The research inventory contains **65 rows: 64 `FCV_OPERATOR` behaviors and one `INSTRUCTOR_PLATFORM` function (D15)**. For the 64 FCV rows and every additional applicable firmware-menu row: every supported behavior must be `VERIFIED_IMPLEMENTED`; unsupported options must be `NOT_APPLICABLE_WITH_EVIDENCE`. Zero `OPEN` or `SIMULATED_ONLY` may remain among completed FCV operator workflows. Require signed equipment profile, source/asset rights, test suite, hardware comparison and instructor sign-off.

**D15 is not a physical FURUNO function.** Track it separately using `scope=INSTRUCTOR_PLATFORM` and `platformQaStatus`; it has no FCV `operatorFidelityStatus`. Before releasing the *training application*, D15's lesson/replay/scoring UI requires `platformQaStatus=VERIFIED_IMPLEMENTED` under a teacher/platform QA oracle, **not** a manufacturer hardware screenshot comparison. This preserves full research scope without falsely asserting FURUNO implements instructor functions.

## 2. Proposed measurable tolerances

These are **initial internal engineering thresholds** only. Phase 1 must freeze a versioned, operator-signed `FidelityToleranceProfile` (with rationale and sample evidence) **before Phase 2 can be accepted**. If real hardware measurements make a tolerance unsuitable, change it in a reviewed revision before implementation, never silently to pass a failing test.

| Domain | Proposed initial gate | Measurement evidence |
| --- | --- | --- |
| **Screen geometry** | Native LCD aspect 480:640; view panel/physical button centers and control bounding boxes deviate no more than **±2% of the measured panel width/height** after camera alignment | Right-cleared orthographic photo + measured reference points, browser bounding boxes at target DPI |
| **Legends and menu text** | **100% exact** applicable labels, ordering, disabled state, active selection, units, and saved/unsaved state against the inspected firmware | Annotated screen/photograph and approved menu atlas |
| **Button/knob input** | **0 lost, duplicated or reversed semantic events in 30 controlled trials per gesture/detent category** (separately test slow/fast, keyboard, pointercancel and focus changes) | Timestamped event log, operator-observed input action, browser capture |
| **POWER long press** | Manufacturer manual says off with hold **longer than 3 s**; test nominal 2.8 s, 3.0 s and 3.2 s, at least 5 repetitions each; behavior matches measured classroom unit. Captured duration error target **≤100 ms** against independent input timing reference | Manual §1.2, recorded UI event trace; make no assumption about precise internal debounce |
| **MODE/BRILL inactivity** | Compare to target unit measured window duration; proposed absolute tolerance **±250 ms** for nominal ~6 s selector/timeout, subject to operator sign-off | Hardware video, frame timestamps, replayable timer tests |
| **Static screenshots** | Operator-facing menus/header/labels must match **100% of expected semantic states**. For pixel difference, proposed **≤3% mismatched pixels** after permitted color/antialias tolerance, registered crop/scale and declared masks; do not use for dynamic echo region | Legally captured reference images, versioned masks, diff protocol |
| **Dynamic echogram** | Match **mode/layout/range/gain/scroll/marker behavior**, not raw OEM echo pixels. All 12 predefined synthetic scenarios replay deterministically; no wrong frequency/zoom/picture advance | Sensor fixture version, semantic probes, visual walkthrough |
| **Keyboard/accessibility** | All reachable controls usable without a pointing device when practical; 0 trapped focus, stuck hold state, hidden labels or console errors in tested Windows viewport/DPI variants | Browser E2E, desktop Chrome keyboard and pointer tests |
| **App responsiveness** | Proposed interactive menu response p95 **≤200 ms** on target classroom Windows PC, excluding documented boot/timeout effects | ≥100 controls, local instrumented DOM event-to-render measurements |
| **Safety/replay** | 100% incompatible profile/scenario/replay inputs rejected; **0** external navigation/RF/USB/NMEA output endpoints; no restricted files served | Node tests, browser network audit and review of static server |

One run of 30 trials is an acceptance sample, not statistical proof of hardware equivalence for all circumstances. “100% semantic state” applies to approved test scenarios, not unlimited real-world input.

## 3. Test case shape for every item

Each test contract must identify:

```json
{
  "requirementId": "A05",
  "profileId": "furuno.fcv588.cv588e",
  "profileRevision": "TO_BE_APPROVED",
  "status": "OPEN",
  "manualSourceId": "FCV588_OME23890E_2025",
  "manualPrintedSection": "1.4",
  "hardwareEvidenceIds": [],
  "optionsGuard": [],
  "initialStateFixture": "TO_BE_DEFINED",
  "inputEvents": [],
  "expectedSemanticStates": [],
  "expectedVisualReference": null,
  "negativeCases": ["cancel", "wrong-order", "power-cycle", "missing-data"],
  "operatorSignOff": null
}
```

No owner or approval date is assigned without evidence. Do not convert this example directly into executable behavior; it is a QA/evidence record only.

## 4. Manual Archive Gate (separate from F1 feature approval)

The archive has its own status space and must not be mixed with the four feature statuses:

| Archive status | Meaning |
| --- | --- |
| `ARCHIVED_VERIFIED` | File bytes obtained legally for restricted internal reference; local signature/page-count/hash valid |
| `RIGHTS_OR_ACCESS_HOLD` | A source exists but authorized PDF acquisition, processing right or access is unverified |
| `IDENTITY_HOLD` | Model/variant identification is insufficient to choose a manual |
| `VERSION_HOLD` | Document or actual classroom firmware/version is not resolved |
| `SOURCE_UNAVAILABLE` | No valid/available source found after documented search; never mark as downloaded |

**Required accounting:** source URL, model and variant, source tier (manufacturer/authorized/mirror), date/time, SHA-256 for acquired bytes, rights-to-retain, rights-to-process-with-AI, rights-to-redistribute, and each unresolved target/version. See [ARCHIVE_COVERAGE.json](../../sources/manuals/ARCHIVE_COVERAGE.json).

**Manual archive cannot yet claim literal completeness:** FCV/FAR/MDC and R5 variants have local reference manuals, historical NS4000 v2 is archived, but NS4000 v3.02.350 full downloadable licensed PDF is not yet verified and KODEN J2000 remains identity-HOLD. These missing sources must stay explicitly visible until supplied and approved; the completion gate means every listed model is **accounted for**, not that inaccessible files were fabricated.
