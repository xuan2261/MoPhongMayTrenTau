---
title: "Phase 6: Full Fidelity QA, Accessibility and Instructor Sign-Off"
status: todo
---

# Phase 6: Full Fidelity QA, Accessibility and Instructor Sign-Off

## Overview

**Priority P0 for release, depends on Phases 2–5.** Validate the FCV-588 simulator as an educational operator-interface tool on the actual target hardware/firmware and classroom PC displays. This phase owns the release gate; passing unit tests is necessary but never a substitute for operator acceptance.

Quality matrix: `docs/qa/scenario-matrix.md`, 65-item research inventory, [single enum + numeric thresholds](../../docs/research/FCV588_FIDELITY_ACCEPTANCE_PROTOCOL.md), explicit versioned test oracle and manufacturer manual references. Keep all manual screenshots in restricted evidence, not public CI artifacts without permission.

## Requirements

- [ ] Classify **64 `FCV_OPERATOR` rows** and all extra firmware menu entries using exactly `OPEN`, `SIMULATED_ONLY`, `VERIFIED_IMPLEMENTED`, `NOT_APPLICABLE_WITH_EVIDENCE`. Only the latter two meet FCV operator fidelity. Classify **D15 separately** as `INSTRUCTOR_PLATFORM` and verify `platformQaStatus=VERIFIED_IMPLEMENTED` with teacher lesson/replay/scoring tests, not against OEM equipment.
- [ ] 100% relevant visible panel controls, menu entries, display modes, alarms and system workflows have source+hardware acceptance and test evidence.
- [ ] Behavior tests include normal path, invalid order, cancel/Back, hardware-disabled option, missing/stale data, power/reboot, persistence, reset, replay and timed input.
- [ ] Visual comparison at 100/125/150% Windows scaling on actual monitors; no clipped dialogs, missing labels, inaccessible controls or incorrect source version. Apply signed operator tolerances, initially ±2% geometry, ≤3% masked static pixel difference, 100% semantic states, and p95 ≤200 ms ordinary menu response (excluding documented timed transitions).
- [ ] Licensed image/font/artwork inventory complete; restricted manuals inaccessible from localhost server and never included in deliverable ZIP/site.
- [ ] No safety misrepresentation: synthetic data, operator simulator, no OEM certification, no live ship navigation claims.

## Implementation Steps

1. Create checkable coverage report for inventory IDs and reference screens, with evidence IDs, applicable option guard, firmware, test path and operator verdict. Preserve the canonical `OPEN` status and its separate evidence-gap reason rather than claiming a fake pass.
2. **RED:** write failure cases before changes for representative system features (MENU/ESC staged edit, power hold, alarm cause/acknowledge, waypoint restore, transducer-incompatible mode, replay mismatch).
3. Run `npm run check`, targeted Node coverage/type validation, browser functional E2E and three display scales. Collect console/network logs to ensure no external device I/O.
4. Conduct instructor/operator comparison with physical FCV-588: identical initial settings, actual key/knob sequences, observable intermediate screens, timing and terminal state. Record screenshots/videos with allowed rights; the tester applies precisely the Phase 1 `FidelityToleranceProfile` thresholds.
5. Audit legal licensing and distribution targets; verify every released asset origin and source-restriction note.
6. Obtain final sign-off or document specific NO-GO defects and their owners (do not invent owners/dates). Archive QA artifact tied to code/profile/manual SHA and screenshots.

## Todo

- [ ] Zero applicable `OPEN` or `SIMULATED_ONLY` across the 64 FCV operator rows or new firmware nodes, and D15 has `platformQaStatus=VERIFIED_IMPLEMENTED` from teacher-side validation.
- [ ] Replay deterministic under 0,1,many renders, online/offline operation, refresh/reset and profile mismatch.
- [ ] Accessibility keyboard, focus, pointercancel and contrast issues reviewed; physical-like semantics remain usable.
- [ ] Authorized operator signs target configuration and 100% relevant lesson flows.
- [ ] Release bundle contains no restricted manufacturer/manual ZIP/PDF or unauthorised trademark assets.

## Success Criteria

**PASS:** every applicable **FCV operator** row/menu is `VERIFIED_IMPLEMENTED`; non-applicable FCV options are `NOT_APPLICABLE_WITH_EVIDENCE`; zero `OPEN` or `SIMULATED_ONLY` FCV operator rows remain. Separately, D15 teacher functionality is teacher-QA approved (`platformQaStatus=VERIFIED_IMPLEMENTED`). All signed numeric thresholds pass with traceable measurement and independent validation. This means training *operator behavior* fidelity, not OEM-certified sonar sensor accuracy.

**Failure protocol:** one Critical fidelity/missing-rights finding is NO-GO; stop release and fix rather than weaken tests. User approval may be needed for distribution, not for creating missing test or documentation.
