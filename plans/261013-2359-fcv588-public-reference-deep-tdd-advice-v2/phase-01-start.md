---
title: "Phase 1: Public Evidence, Rights, Traceability and Reference Profiles"
status: todo
---

# Phase 1: Evidence Baseline, Traceability, Profiles and Rights

## Overview

**P0, no hardware/photo/Diagnostics requirement.** Phase 1 is the fully scouted first stage of --deep. It must reuse the existing source archive, 11-source ledger, 4 passing evidence tests and F0 app instead of creating false green work. See [current scout report](./reports/phase-01-scout.md) in this plan directory. No real ship I/O is authorized in this software.

**Deep Pre-execution Scout Gate (completed for planning; repeat before code execution):** Read README.md, ADR-0001, docs/research/FCV588_PUBLIC_MEDIA_EVIDENCE_2026-10-13.md, FCV588_PUBLIC_UI_REFERENCE_MATRIX_2026-10-14.md, FCV588_FEATURE_REGISTER_DRAFT.json, docs/evidence/fcv588-public-evidence-ledger.json, sources/manuals/MANIFEST.json, src/devices/fcv588/{adapter.mjs,model.mjs}, src/core/{protocol.mjs,session.mjs}, web/index.html and all affected test files. Confirm source/rights/branch deltas before changing any claim. Existing restricted PDF/ZIP bytes are not new AI input unless publisher rights are cleared. A link is not reproduction permission.

**Installed-state facts:** 11 source records and test/fcv588-public-evidence.test.mjs (4 existing green cases) already exist; docs/evidence/fcv588-public-reference-profile.json, docs/evidence/fcv588-public-trace-matrix.json and docs/research/FCV588_PUBLIC_CLAIM_POLICY.md do not exist at scaffold time. Source E1/E3 grade alone mixes official provenance and observation mode; separate them. Existing F0 hardware status remains HOLD. Last overall test run 50 PASS / 1 FAIL, due the brittle plan wording assertion at test/public-reference-plan.test.mjs:95.

## Dependency map

1.0 existing QA baseline -> 1.1 source ledger schema and provenance -> 1.2 complete public trace matrix -> 1.3 Demo/transducer profiles -> 1.4 claims, rights and visible banner. All later phases read these outputs; don't implement 2+ until Phase1 passes.

## File inventory / action / test impact

| Path or component | Action and size | Test impact |
| --- | --- | --- |
| test/public-reference-plan.test.mjs | Modify one brittle wording check within existing 96 LOC | Current suite 1/51 failure; keep semantics |
| docs/evidence/fcv588-public-evidence-ledger.json | Audit/migrate existing ~241 LOC; no reset | Existing 4 evidence tests, authorityTier/evidenceMode, source extensibility |
| test/fcv588-public-evidence.test.mjs | Extend existing 59 LOC | E1 provenance separated from evidenceMode; more than 11 entries allowed |
| docs/evidence/fcv588-public-trace-matrix.json | Create, 64 FCV + D15 separately | New test/fcv588-public-trace.test.mjs |
| docs/evidence/fcv588-public-reference-profile.json | Create, synthetic profile variants only | New test/fcv588-public-profile.test.mjs |
| docs/research/FCV588_PUBLIC_CLAIM_POLICY.md | Create, policy not manufacturer grant | New test/fcv588-public-claims.test.mjs |
| web/index.html | Add training-only exact banner outside the painted hardware | Existing web-layout and new claims tests |

## Tests Before (TDD)

Characterize existing 4 evidence tests first. Create each new JSON destination as schema-valid placeholder (for example schemaVersion:1 and empty profiles/rows array), and each new .mjs module as an importable stub before running a RED assertion. RED PASS means process exits nonzero with **AssertionError identifying intended missing field/behavior**, not ENOENT, bad JSON, failed import or SyntaxError. Never intentionally break an already-correct result to manufacture RED.

## Scenario matrix

| Priority | Scenario | Oracle |
| --- | --- | --- |
| Critical | false firmware/hardware/source grade or copied manufacturer media | Claims fails closed; hardwareValidated=false, firmwareInstalled=null |
| Critical | generic menu Type=[600W]/[1kW] with ACCU-FISH/RezBoost/BDS requested | Each option unavailable; separate named capable fixture |
| High | all A01..D14 plus D15 accounted, no hardware QA promotion | 64 public traces + one instructor row, hardware evidence unchanged |
| High | Demo On, no physical transducer | All controls operative; feature guards remain independent |
| High | live source new revision or rights unclear | Last-checked and SOURCE_GAP/RIGHTS_HOLD, no silent approval |
| Medium | optional archived Guide/spec and future sources | Additional records allowed; existing 11 IDs retained |

## Requirements

- [x] Existing 11-source ledger is preserved and extensible; each entry has authorityTier, evidenceMode, access, rights, source branch and no false audited-video timestamp.
- [x] Public trace matrix covers 64 operator features plus D15 instructor separately without editing operatorFidelityStatus/targetHardwareEvidenceIds.
- [x] Default FCV588_PUBLIC_DEMO_UNKNOWN_FW profile has Demo On, no attached equipment, unknown firmware, safe virtual Type; alternate generic600/generic1kW/525STID-PWD are separate test fixtures, not simultaneously present.
- [x] New rights policy distinguishes authorized reading/retention/AI processing/reproduction/redistribution; marks unverified processing permission as project safety HOLD, not a verbatim publisher AI ban.
- [x] Student UI visibly states PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY; server cannot expose sources/manuals, transcripts or teacher-only private files.

## Implementation Steps

### Task 1.0 — Repair known plan-text regression without weakening fidelity checks

- **Goal:** restore a trustworthy GREEN baseline before adding new behavior.
- **Target:** test/public-reference-plan.test.mjs, current v1 phase-04-sonar-views-and-advanced-functions.md only if semantic clarity genuinely requires it.
- **Steps:** (1) Characterize known assertion at line 95 with the existing source and note exact mismatch. (2) Replace only the brittle literal phrase expectation with a semantic check that Demo controls remain operative while source-backed advanced-feature guards still apply. (3) Preserve 14 UI areas, existing 6 plan tests and all other checks. (4) Record before/after behavior and rerun full suite.
- **Success:** a false wording-only failure is fixed, not masked, and no runtime/source restriction test is removed.
- **Verify:** RED node --test test/public-reference-plan.test.mjs exits 1 with the known AssertionError on blanket-disable; GREEN same command exits 0 after source-backed correction (6 tests PASS); REFACTOR npm run check exits 0. If actual failure differs, STOP and report.

### Task 1.1 — Source provenance, rights and extensible evidence ledger

- **Goal:** robust versioned source ledger without conflating E1 'primary manual' with a product/support web page or treating old 11 IDs as exhaustive.
- **Target:** docs/evidence/fcv588-public-evidence-ledger.json (sources, authorityTier, evidenceMode, lastCheckedAt, rightsState), test/fcv588-public-evidence.test.mjs.
- **Steps:** (1) Snapshot/characterize 4 existing green tests. (2) RED new assertion that E1 manufacturer pages still specify their authority and observed mode separately and that records can be added beyond the initial 11; no source ID overwritten. (3) GREEN migrate existing 11 records and add documented links to specifications/Operator Guide as subordinate candidates only; keep any guide claim SOURCE_GAP until separately verified. (4) Rights remain independently typed and video verifiedTimestamps empty unless actual frames observed. (5) REFACTOR with archive verifier; do not re-download archives.
- **Success:** each record distinguishes publication authority vs directly observed evidence, rights and revision, and cannot be an unlicensed runtime asset.
- **Verify:** RED node --test test/fcv588-public-evidence.test.mjs exits 1 on named new schema/authority assertion, not missing file; GREEN same exits 0; REFACTOR python tools/verify_reference_manuals.py and npm run check exit 0.

### Task 1.2 — 64+1 public source/claim trace matrix

- **Goal:** one authoritative public trace row per feature ID, independently of existing hardware statuses.
- **Target:** create docs/evidence/fcv588-public-trace-matrix.json and test/fcv588-public-trace.test.mjs; only read docs/research/FCV588_FEATURE_REGISTER_DRAFT.json.
- **Steps:** (1) Create valid JSON placeholder with schemaVersion=1 and rows=[] before loading it. (2) RED named assertion that exactly 64 FCV_OPERATOR IDs and D15 INSTRUCTOR_PLATFORM are present, each with sourceId/manualSection/rightsDecision/sourceStatus/guard/implementationStatus/claimDecision or explicit UNKNOWN; D15 uses platformQaStatus. (3) GREEN populate distinct rows from curated inventory; do not infer approval for a missing manual path, add SOURCE_GAP as needed. (4) REFACTOR reject duplicate IDs, hardware status mutation or accidental v2 firmware assignment.
- **Success:** 65 unique trace rows, all source gaps visible, hardware feature-register untouched.
- **Verify:** RED node --test test/fcv588-public-trace.test.mjs exits 1 with named rows/ID assertion; GREEN same exits 0; REFACTOR node --test test/research-inventory.test.mjs and npm run check exit 0.

### Task 1.3 — Synthetic Demo and transducer-guard profiles

- **Goal:** reproducible operator-profile selection without fictional installed hardware.
- **Target:** create docs/evidence/fcv588-public-reference-profile.json and test/fcv588-public-profile.test.mjs; inspect src/devices/fcv588/adapter.mjs but do not replace F0 reducer in Phase1.
- **Steps:** (1) Create valid JSON placeholder with schemaVersion=1 and profiles=[]; write RED assertion for default Demo no real sensors/no GPS, firmwareInstalled=null, hardwareValidated=false and absent generic advanced capabilities. (2) GREEN declare separate fixtures FCV588_PUBLIC_DEMO_UNKNOWN_FW, FCV588_PUBLIC_GENERIC600, FCV588_PUBLIC_GENERIC1KW and FCV588_PUBLIC_FEATURE_525STID_PWD (existing research FCV588_PUBLIC_FEATURE_DEMO remains a legacy alias, not a merged profile); the named fixture BDS entitlement is conditional on Auto Range, draft, depth 5-100m, speed <=10kn and compatible aligned installation. (3) Declare manufacturer manual/manifest source ID/hash and installed firmware UNKNOWN. (4) REFACTOR test contradiction cases; Phase2 later bumps adapter revision for behavior drift.
- **Success:** controls available in Demo yet conditional features cannot leak from named fixture to generic types.
- **Verify:** RED node --test test/fcv588-public-profile.test.mjs exits 1 on missing Demo/guard assertion; GREEN same exits 0; REFACTOR node --test test/fcv588-public-evidence.test.mjs and npm run check exit 0.

### Task 1.4 — Claims, original assets and visible student disclaimer

- **Goal:** safe student-facing claims and rights enforcement without copying OEM media.
- **Target:** create docs/research/FCV588_PUBLIC_CLAIM_POLICY.md, test/fcv588-public-claims.test.mjs; modify web/index.html only outside physical panel; inspect tools/server.mjs and .gitignore.
- **Steps:** (1) Create minimal valid policy heading before RED. (2) RED tests for missing exact label PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY, false hardwareValidated=true, unobserved video timestamps, copied manufacturer assets under web/ and private paths being served. (3) GREEN document source/processing/reproduction/redistribution independently and put exact banner on student page without an OEM logo. (4) REFACTOR scan public static surface and run server tests.
- **Success:** no unauthorized manufacturer photo/video/manual included, no hardware equivalence claim and source holding paths remain outside served roots.
- **Verify:** RED node --test test/fcv588-public-claims.test.mjs exits 1 with named banner/claims assertion; GREEN same exits 0; REFACTOR node --test test/server.test.mjs test/web-layout.test.mjs and npm run check exit 0.

## Todo

- [x] Task 1.0 baseline text-only regression documented and GREEN.
- [x] Task 1.1 existing source ledger extended and rigorously graded.
- [x] Task 1.2 public trace created with 64 operator rows + D15 separate.
- [x] Task 1.3 profile and distinct virtual transducer conditions valid.
- [x] Task 1.4 visible banner and source rights guard tested.

## Success Criteria

All five targeted tasks meet Verify, npm run check and archive/register checks pass, and no feature/hardware claim was elevated by source discovery alone. If a license/right or source remains unresolved, the affected claim stays HOLD. No actual student-unit hardware is needed.

## Refactor and Tests After

Limit schema changes to evidence, profile and student disclaimer. Never feed new input through a restricted PDF extraction tool by default. New profile schemas must not be loaded by runtime before reducers/guards are validated in Phase2/3. Recheck the existing feature register with python tools/build_fcv588_feature_register.py --check; PASS confirms 65 IDs but not FCV behavioral fidelity.

## Risk assessment

Risks: source scalar-grade conflation, undocumented firmware selection, rights overstatement, artificial RED, brittle whole-file assertions, and reusing a teacher function as an FCV control. On evidence conflict, quarantine that claim rather than suppress unrelated lesson development. No direct internet connection is a Phase1 hard stop if locally curated sources still support the operation.

## Failure Protocol

If any Verify step does not meet its stated pass condition, STOP this phase. Do not improvise a fix, retry blindly, or reason around the failure. Spawn the kongming subagent for next-step counsel and pass:
- the phase and task id,
- what you attempted (the steps you ran),
- the exact command and its full output,
- the pass condition it failed to meet.
Apply kongming's guidance, then re-run the Verify step. If kongming cannot be spawned in this environment, STOP and report the same failure evidence to the user. Never continue by self-reasoning.
