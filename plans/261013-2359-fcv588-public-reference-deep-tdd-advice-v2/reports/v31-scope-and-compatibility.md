# V31 scope and compatibility decision — 2026-10-16

This is an integrated continuation of the sole v2 plan, not a replacement plan
or phase/release approval. The latest user explicitly authorizes V30-B/E and
independent evidence-backed P0/P1 control/LCD improvements together.

## Recovered authority

`docs/qa/FCV588_V31_RECOVERY.json` records actual local source and harness
comparison with all five current V30 receipts. All 34 runtime files match
manifest `99097efbccc12d8538a041643f22b22d268dadb3e24d9ec9acbc6f718d4c1117`.
All seven phase files were scanned: 50 checklist entries, 14 checked and 22
named Tasks. Inherited accepted items and historical receipts are retained.
No historical Chrome suite or screenshot review was repeated during recovery.

The V30 missing ledger entry and two relative links received a new,
user-authorized scoped write in this continuation. The original blocked V30
write remains NOT_EXECUTED; it is not retroactively converted into success.

## Compatibility decision before runtime edits

The actual read-only CoS reviewer confirmed the following decision from
`profile-version.mjs`, `settings.mjs`, `session.mjs` and their callers/tests:

* Advance only the FCV training profile from `F1-public-reference-19` to `-20`.
  Canonical transaction and notice changes affect the session fingerprint.
* Preserve core7, event5, replay envelope7, scenario7, multi-runtime4 and all
  sonar/PRNG algorithms. Do not silently reinterpret a profile19 replay with
  profile20. Existing replay contract validation must reject it.
* Preserve settings schema18, the settings.v18 storage key and the exact
  choices/meaning of every committed setting, including White Line Off/On.
* Keep the normal settings decoder strict to the current profile. A separate
  exact-profile19/schema18 migration decoder validates original envelope
  shape, class, revision, fingerprint and all setting keys/values. It returns
  settings only, never editor drafts, input logs or instructor option grants.
  The committed `settings.draft` (ship draft) is a legitimate setting, not a
  menu transaction draft, and must not be discarded.
* Restore legacy settings through the existing logged `restore-settings`
  event. Do not write localStorage during startup: preserve its original bytes
  until an ordinary later committed setting change invokes persistence.
  Retain the existing rule that stored Tankenmaru On is not an option grant.

An actual profile19 replay and encoded settings were captured before edits
under `test/fixtures/fcv588-v30-profile19-*.json`. Their provenance/hashes and
successful legacy replay check are in `FCV588_V31_LEGACY_FIXTURE_CAPTURE.json`.
This is new compatibility-fixture preparation, not a rerun of historical QA.

## Integrated implementation scope

1. V30-B: cancel invalid Tankenmaru transactions on option revoke in System
   and Installation, also while hidden inside POWER-hold.priorOverlay.
   Preserve committed settings except the existing fail-closed Off rule,
   semantic cursor ownership, cancel/ENTER, power, reset, reload and replay.
2. Generalize the same invariant to live capability loss while a Display
   ACCU-FISH/RezBoost/Bottom Disc. editor is open. A disabled semantic entry
   cannot keep/mutate/revive an old hidden draft even when row IDs do not
   change. Preserve compatible unrelated transactions and existing guards.
3. V30-E: profile enable notices say Alarm; threshold notices identify the
   actual selected threshold. No alarm condition or threshold is invented.
4. A04 inactivity contract and compact basic-control LCD feedback: assess
   BRILL adjustment near its existing six-second idle deadline; present
   Range, Gain, BRILL and MODE current/draft values and actual supported
   controls clearly. In particular do not advertise ENTER as a MODE commit
   while the canonical MODE contract is automatic timeout / MENU cancel.
   All geometry/text styling is original training UI, not measured OEM art.

Source basis: inherited curated operator notes (FCV-T02 §1.3 inactivity,
§1.4 MODE, §1.5 RANGE, §1.6 GAIN), existing versioned menu definitions,
Phase3 transactions/guard clauses and user requirements. The current official
FURUNO USA FCV588 product page corroborates conditional Bottom Discrimination
availability (compatible transducer, mount, draft, range, depth and speed),
not a hardware-specific transaction-cancellation sequence. New targeted
searches did not provide additional exact BRILL/GAIN/VRM operator details.
No new restricted PDF processing, OEM media, firmware or language values.

## Test contract and evidence

Expected pre-fix REDs are stale direct/wrapped/capability drafts, wrong Alarm
notice labels, the confirmed inactivity error if source review admits it,
strict profile20 rejection of the original profile19 replay, the not-yet-
implemented explicit legacy migration and missing basic LCD feedback.
Missing files/import/syntax errors are not valid RED. Existing passing
characterizations remain passing; never manufacture historical failures.

Use focused Node tests for canonical state/codec/replay and real Chrome for
native UI, storage reload and selected pixels. Required viewports remain
1366x768, 1920x1080, 360x800 and 390x844. Save each run separately, verify
actual browser response bytes plus runtime/harness pre/post identity, inspect
the current screenshots and rerun affected V29/V30 regressions under V31 names.
No mutation of the user's normal browser profile is required.

## Workflow and acceptance boundary

The installed cook, debugging, test and review workflows are applied through
available Windows tools. The host exposes CoS workers, not the kit's
targetable Kongming agent or native cook dispatcher. Read-only CoS counsel
is recorded as such, never as Kongming or OEM/release approval. The existing
phase Failure Protocol remains authoritative for unexpected failed Verify
checks; no automatic retry or self-approved bypass is authorized.

No checklist promotion is decided by this scope file. Full-task sources,
rights, compatibility and instructor gates are evaluated separately after
the actual implementation evidence. HardwareValidated stays false, installed
firmware unknown, all unmet claims and course/product release HOLD.
