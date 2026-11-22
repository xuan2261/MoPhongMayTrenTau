---
title: "Phase 1: Public Evidence Baseline and Reference Profiles"
status: todo
---

# Phase 1: Public Evidence Baseline and Reference Profiles

## Overview

**Priority P0. Public-research gate, NOT dependent on a physical FCV-588.** Establish source/rights metadata and one no-hardware reference profile so work can continue without classroom photos or Diagnostics. The public profile must not inherit the hardware-specific acceptance/signed tolerances of the older plan.

**Deep Pre-execution Scout Gate (do this first):** Read `README.md`, `docs/decisions/ADR-0001.md`, [public media ledger](../../docs/research/FCV588_PUBLIC_MEDIA_EVIDENCE_2026-10-13.md), [UI reference atlas](../../docs/research/FCV588_PUBLIC_UI_REFERENCE_MATRIX_2026-10-14.md), `docs/research/FCV588_FULL_FUNCTION_INVENTORY_2026-10-13.md`, `docs/research/FCV588_FEATURE_REGISTER_DRAFT.json`, `sources/manuals/{MANIFEST.json,ARCHIVE_COVERAGE.json,README.md}` and `src/core/{session.mjs,scenario.mjs,protocol.mjs}`; verify actual paths and whether sources remain online. Read curated research notes first; if source rights do not permit automated manual extraction, **do not run new PDF processing**. Record deltas in this phase's review notes. Reject phantom firmware or invented timestamps.

**TDD RED bootstrap:** Before running RED, create schema-valid, minimal **JSON placeholders** for new data targets (for example `{"schemaVersion":1,"sources":[]}` or `{"schemaVersion":1,"profiles":[]}`) and a minimal Markdown heading for a new policy document. Create the named test file with valid syntax and a deliberately **failing content assertion**, not an unresolved import, ENOENT, JSON parse error or SyntaxError. If a planned code module does not exist, create a minimal importable stub first. Replace placeholders in GREEN; placeholder creation is setup, NOT proof of implementation.

## Requirements

- [ ] profileClass=PUBLIC_REFERENCE; claimCeiling=PUBLIC_REFERENCE_CONFORMANT; hardwareValidated=false; firmwareInstalled=null. Reference document is OME-23890-E, **not** the installed software revision.
- [ ] Default FCV588_PUBLIC_DEMO_UNKNOWN_FW: instructor applies synthetic Demo On fixture; no physical transducer, serial, actual GPS, NMEA output or radio. Separate generic menu Type=[600W] and manufacturer-listed 525STID-PWD virtual fixtures, not a merged all-features profile. For Type=[600W], ACCU-FISH, RezBoost and Bottom Discrimination are INOPERATIVE even in Demo; distinguish named compatible 600W-rated transducers.
- [ ] Per-source metadata: URL, publisher, evidence grade E0–E4, actual observation status, version/branch, right-to-retain/process/reproduce/redistribute. Rights uncertainty does not authorize copying media; use text notes and original artwork.
- [ ] Preserve 64 operator rows + D15 instructor separately. The public-claim axis never changes the existing hardware-specific operatorFidelityStatus.
- [ ] A source conflict/RIGHTS_HOLD prevents the **affected** feature's reference-conformant claim but does not block unrelated manual-documented lessons.

## Implementation Steps

### Task 1.1 — Public evidence ledger

- **Goal:** every public photo/video/manual candidate has unambiguous source, license and observation grade, without claiming video frames were audited.
- **Target:** `docs/research/FCV588_PUBLIC_MEDIA_EVIDENCE_2026-10-13.md`, create `docs/evidence/fcv588-public-evidence-ledger.json`, create `test/fcv588-public-evidence.test.mjs`.
- **Steps:** (1) Create a syntactically valid ledger placeholder with an empty `sources` array, then RED test demands entries PUB-FCV-001..011 with URL, grade, mediaKind, rightsState and whether a timestamp is actually confirmed; expect a content assertion failure, not missing-file/parse error. (2) Populate JSON solely from allowed verified source metadata. (3) Mark videos TO_REVIEW until manually viewed; never invent time offsets. (4) GREEN test, then REFACTOR/deduplicate source roles without changing claims.
- **Success:** primary FURUNO facts linked, images/videos only referenced, no external media bytes embedded.
- **Verify:** RED `node --test test/fcv588-public-evidence.test.mjs` exits **non-zero** with an assertion describing missing evidence fields, not ENOENT/SyntaxError. GREEN same command exits 0. REFACTOR `npm run check` exits 0 and output contains `fail 0`.

### Task 1.2 — Public Demo profile and transducer variant matrix

- **Goal:** one reproducible default training profile and optional alternative synthetic transducer fixtures, with firmware UNKNOWN.
- **Target:** create `docs/evidence/fcv588-public-reference-profile.json` and `test/fcv588-public-profile.test.mjs`; inspect `src/devices/fcv588/adapter.mjs`, `docs/evidence/device-register.json`, Furuno §2.7/2.8 notes.
- **Steps:** (1) Create schema-valid profile placeholder with empty `profiles` array; RED assertions reject missing Demo profile, false firmware/hardware, and **generic Type=[600W] falsely supporting ACCU-FISH, RezBoost or BDS**; test must fail for expected content, not ENOENT/invalid JSON/JS import. (2) Define profile version, manual hash/source ID, default Demo On, no connected hardware; define generic600 and named 525STID-PWD **simulation fixtures** separately with BDS environmental/installation holds. (3) Keep model's old F0 adapter unchanged until Phase2 tests. (4) GREEN, REFACTOR/check.
- **Success:** hardwareValidated=false, firmwareInstalled=null, realSensorOutputs=[], named variants do not combine incompatible guards.
- **Verify:** RED `node --test test/fcv588-public-profile.test.mjs` exits non-zero on meaningful assertion. GREEN targeted test exits 0. REFACTOR `npm run check` exits 0.

### Task 1.3 — Reference-claim and rights gate

- **Goal:** prevent false exact-unit claims and prevent licensed media from entering the student web app.
- **Target:** create `docs/research/FCV588_PUBLIC_CLAIM_POLICY.md`, `test/fcv588-public-claims.test.mjs`; inspect `web/index.html`, `tools/server.mjs`, `sources/manuals/ARCHIVE_COVERAGE.json`.
- **Steps:** (1) Create a minimal policy Markdown heading and any needed importable validator stub first; RED test catches a fixture falsely setting hardwareValidated=true, an unverified video timestamp or copied manufacturer binary under web with a **named assertion**, not syntax/ENOENT/import errors. (2) Implement data-only policy and visible banner: PUBLIC REFERENCE / NOT HARDWARE VALIDATED / TRAINING ONLY. (3) Record source/processing/redistribution rights separately; do not copy photo/PDF/image. (4) GREEN, REFACTOR/check.
- **Success:** no hardware equivalence claim, files in sources/manuals remain inaccessible to server.
- **Verify:** RED `node --test test/fcv588-public-claims.test.mjs` exits non-zero on expected content assertion; GREEN exits 0; `node --test test/server.test.mjs` and `npm run check` exit 0.

## Todo

- [ ] Public evidence ledger exists and distinguishes source descriptions from time-coded, frame-audited video.
- [ ] Demo profile uses synthetic data with no fake firmware/transducer; every alternate variant is explicit.
- [ ] Claim banner/rights policy and restricted-media server guard tested.
- [ ] Source/feature unknowns recorded without blocking unrelated behavior.

## Success Criteria

**PASS for Phase1:** three new targeted test files run green, `npm run check` returns exit 0, and public profiles/evidence are versioned. No classroom photo is required. A rights blocker forbids new processing/copying of that specific source, not use of independently authored notes.

## Failure Protocol

If any Verify step does not meet its stated pass condition, STOP this phase. Do not improvise a fix, retry blindly, or reason around the failure. Spawn the `kongming` subagent for next-step counsel and pass:
- the phase and task id,
- what you attempted (the steps you ran),
- the exact command and its full output,
- the pass condition it failed to meet.
Apply kongming's guidance, then re-run the Verify step. If `kongming` cannot be spawned in this environment, STOP and report the same failure evidence to the user. Never continue by self-reasoning.
