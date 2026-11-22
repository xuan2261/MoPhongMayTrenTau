# P14 — Test oracle audit for profile22 replay/settings compatibility

Date: 2026-11-16  
Reviewer: worker-21  
Scope: read-only inspection of current canonical source/tests plus existing P13 QA records. No source/test/browser/runtime modification was performed.

## Gate objective

P13 proved that the AP-1 Sounder reorder is source-valid and unit-clean, but cannot remain under `F1-public-reference-21`: a historical selection-only replay can retain the same numeric `overlay.itemIndex`, event log and final session hash while changing semantic selection from `sounder.whiteMarker` to `sounder.clutter`.

P14 tests therefore need to prove four separate contracts without weakening any existing one:

1. fresh runtime/settings/replay use a new `F1-public-reference-22` native contract;
2. historical profile21 replay bytes are preserved exactly and never silently interpreted by profile22;
3. settings migration remains explicit and bounded while schema 18/storage key v18 continue if their wire shape is unchanged;
4. D15/course scoring remains deterministic for fresh profile22 sessions and refuses historical profile21 sessions as current-profile evidence.

## Current exact `F1-public-reference-21` assertions

Current source has one authoritative literal:

- `src/devices/fcv588/profile-version.mjs:6` — `FCV588_PUBLIC_PROFILE_REVISION="F1-public-reference-21"`.

Current canonical tests contain **9 exact profile21 assertions/literals that are test expectations**:

| File / line | Current assertion | P14 disposition |
|---|---|---|
| `test/fcv588-p04-bottom-provenance.test.mjs:212` | `FCV588_PUBLIC_PROFILE_REVISION === "F1-public-reference-21"` | Current-profile assertion must become `22`; keep replay equality checks unchanged. |
| `test/fcv588-public-persistence.test.mjs:19` | `adapter.revision === "F1-public-reference-21"` | Must become `22`; schema/key assertions remain independently pinned. |
| `test/fcv588-public-v31-compatibility.test.mjs:18` | `adapter.revision === "F1-public-reference-21"` | Must become `22`; historical profile19 fixture SHA and rejection/migration behavior remain unchanged. |
| `test/fcv588-public-v31-compatibility.test.mjs:30` | encoded settings `profileRevision === "F1-public-reference-21"` | Must become `22`; schema stays 18 if the settings payload schema is unchanged. |
| `test/fcv588-v43-oem-brill-triangle.test.mjs:79` | `adapter.revision === "F1-public-reference-21"` | Must become `22`; add immediate-previous-profile21 replay/settings rejection instead of relying only on old profile20 coverage. |
| `test/fcv588-v44-brill-pad-contract.test.mjs:130` | `FCV588_PUBLIC_PROFILE_REVISION === "F1-public-reference-21"` | Must become `22`; projector/replay purity remains strict. |
| `test/fcv588-v46-colors-oem-firmware-boundary.test.mjs:72` | `FCV588_PUBLIC_PROFILE_REVISION === "F1-public-reference-21"` | Must become `22`; firmware remains `null` and palette stays training-only. |
| `test/fcv588-v47-white-marker-firmware-boundary.test.mjs:92` | `FCV588_PUBLIC_PROFILE_REVISION === "F1-public-reference-21"` | P13-rebased version must become `22`; all firmware-unknown/source-status assertions remain unchanged. |
| `test/fcv588-v49-a11y-boundary.test.mjs:59` | `FCV588_PUBLIC_PROFILE_REVISION === "F1-public-reference-21"` | P13-rebased version must become `22`; exact White Marker cue status remains required. |

Do **not** globally replace every text occurrence of `profile21`. P14 must preserve literal profile21 values in historical fixtures, compatibility tests, legacy adapters/readers, negative cases and migration messages where they identify the old contract.

The P13 stage still has profile21 assertions in the rebased V47/V49 tests because P13 deliberately stopped before a profile revision change. Those test semantics are valid, but their current-profile literal must move to profile22 in the eventual P14 candidate.

## Current settings contract

`src/devices/fcv588/settings.mjs` currently defines:

- `FCV_SETTINGS_STORAGE_KEY = "mophongmaytrentau.fcv588.public-reference.settings.v18"`;
- internal `SETTINGS_SCHEMA_VERSION = 18`;
- `encodeFcvSettings()` writes `{schemaVersion:18, profileClass:"PUBLIC_REFERENCE", profileRevision:FCV588_PUBLIC_PROFILE_REVISION, settings}` plus fingerprint;
- ordinary `decodeFcvSettings()` accepts only the **current** profile revision;
- `decodeFcvProfile19Settings()` is an explicit migration decoder bound to exact profile `F1-public-reference-19`;
- the explicit profile19 decoder validates the original fingerprint and the current validated settings domain, and does not migrate replay/editor state/option entitlement.

Current settings tests pin schema/key behavior at:

- `test/fcv588-public-persistence.test.mjs:18,21,33` — schema 18 and key suffix `settings.v18`;
- `test/fcv588-public-v31-compatibility.test.mjs:29,31` — migrated settings re-encode as schema 18 and remain under the v18 key.

The existing profile19 fixtures are already exact byte oracles:

- `test/fixtures/fcv588-v30-profile19-settings.json` SHA-256 `f14235c481a35c5e2af2118729dcfd51c3eb2039bdec739047ba9e5b7e00f111`;
- `test/fixtures/fcv588-v30-profile19-replay.json` SHA-256 `adb919e666598127b2f76e284a0ba4dea4506ae15eac11535574ac562297bf4c`.

Existing tests correctly distinguish settings migration from replay migration:

- profile19 settings may be explicitly decoded and restored through a logged `restore-settings` event;
- the profile19 replay fixture is rejected by the current replay contract;
- migrated `tankenmaru:"On"` is only a committed preference and cannot grant the virtual option;
- restore is allowed only while off/startup;
- recomputing a fingerprint cannot authorize unknown shape, wrong profile, wrong schema, unsupported value or virtual entitlement.

## Current browser persistence path

`web/app.mjs:72-94` currently performs:

```text
decodeFcvSettings(raw) ?? decodeFcvProfile19Settings(raw)
```

and, after a successful legacy import, dispatches a canonical `restore-settings` event. It deliberately does not rewrite legacy stored bytes during startup; only a later committed settings change writes a new current-profile envelope.

For profile22, this behavior should remain conceptually identical, but profile21 becomes the immediate migration source. If schema 18 and the settings domain remain unchanged, there is no source-valid reason to bump the storage schema/key merely because replay/menu semantics changed. The strict P14 expectation should therefore be:

```text
current profile22 decode
  -> explicit profile21 settings migration
  -> explicit profile19 settings migration
  -> otherwise reject/fail closed
```

The migration order matters: ordinary decode remains strict to profile22, and neither legacy decoder may become a replay compatibility mechanism.

## P13 replay facts P14 must convert into permanent tests

P13 independent gate receipt:

- `P13_GATE_REVIEW_20261116.json` SHA-256 `c1a99846aff873ccfa28db81670f5904f966426b957e87e4542cece8fb4ae1d4`.

P13 semantic-drift receipt:

- `P13_PROFILE21_REPLAY_SEMANTIC_DRIFT_20261116.json` SHA-256 `479909adb7475c8d9b02dd195b6abb1943593a78f575c2857b6585a1d4336f8c`.

The exact demonstrated selection-only sequence is:

1. POWER down;
2. POWER up with `durationMs:100`;
3. tick `steps:4`;
4. MENU press;
5. five TrackPad DOWN events.

Under canonical profile21 menu order this ends at numeric `itemIndex:5` = `sounder.whiteMarker`. Under the AP-1 reordered candidate, the same numeric state means `sounder.clutter`.

P13 proves:

- profile revision old/candidate were both `F1-public-reference-21`;
- event count was 9;
- old and candidate final session hash were both `f0-fnv1a32-b7e35e70`;
- selection-only historical replay was accepted under changed code;
- adding ENTER to enter/edit the old selected item caused a later `replay final state hash mismatch / reducer drift` rejection.

This means `finalSessionHash` is useful but insufficient as a semantic menu identity guard.

### Missing artifact that P14 must create before profile22 implementation

There is currently **no frozen serialized profile21 selection-only replay fixture with its own byte SHA-256** in `test/fixtures`. P13 froze the semantic result/session hash and the probe receipt, not the actual replay envelope bytes as a reusable fixture.

P14 should first create, while canonical profile21 is still unchanged, two write-once test fixtures from the exact P13 event sequence:

- `test/fixtures/fcv588-p13-profile21-selection-only-replay.json` — 9 events, final selected semantic entry `sounder.whiteMarker`, `itemIndex:5`, session hash `f0-fnv1a32-b7e35e70`;
- `test/fixtures/fcv588-p13-profile21-editing-replay.json` — the same 9 events plus ENTER.

Their **serialized byte SHA-256 values must be computed and hard-pinned in the new tests before any profile22 source change**. Do not invent those hashes from the session hash; they are different contracts. A P14 implementation that generates the fixtures after the profile22 bump would not prove preservation of historical profile21 bytes.

## Proposed strict P14 tests

### P14-1 — Native profile22 contract is explicit

Suggested new file: `test/fcv588-p14-profile22-contract.test.mjs`.

Required assertions:

```js
assert.equal(FCV588_PUBLIC_PROFILE_REVISION,"F1-public-reference-22");
assert.equal(adapter.revision,"F1-public-reference-22");
assert.equal(adapter.profile.revision,"F1-public-reference-22");
```

Create a fresh session and require:

- `session.profileRevision === "F1-public-reference-22"`;
- `createReplayEnvelope(session).profileRevision === "F1-public-reference-22"`;
- fresh profile22 replay returns the exact same `sessionHash`;
- `EVENT_SCHEMA_VERSION` and `REPLAY_ENVELOPE_VERSION` remain unchanged unless their actual serialized schema changes. A profile revision bump alone should not masquerade as a core/envelope schema bump.

Then run the exact P13 9-event selection sequence under profile22 and assert all of these together:

```js
assert.equal(session.deviceState.overlay.itemIndex,5);
assert.equal(getFcvMenuItems("Sounder",session.deviceState)[5].id,"sounder.clutter");
assert.equal(getFcvMenuItems("Sounder",session.deviceState)[7].id,"sounder.whiteMarker");
```

This deliberately proves the AP-1 profile22 native meaning rather than hiding the order change behind ID-based test setup.

Also assert the complete AP-1 ID order, not only the two sampled rows:

```js
[
  "sounder.pictureAdvance","sounder.zoomMode","sounder.shift",
  "sounder.interference","sounder.colorErase","sounder.clutter",
  "sounder.whiteLine","sounder.whiteMarker","sounder.tvg",
  "sounder.smoothing","sounder.bottomZone","sounder.txPower","sounder.txRate"
]
```

### P14-2 — Frozen profile21 selection-only replay is byte-pinned and cannot enter profile22 native replay

Suggested new file: `test/fcv588-p14-profile21-replay-compatibility.test.mjs`.

Read the frozen profile21 selection-only fixture as raw bytes/string and first assert its hard-coded SHA-256. Then assert fixture identity before any replay attempt:

- `profileRevision === "F1-public-reference-21"`;
- event count = 9;
- finalSessionHash = `f0-fnv1a32-b7e35e70`;
- event sequence exactly matches the P13 sequence.

Under the **profile22 native adapter**, `replay(adapter22, scenario, oldEnvelope)` must throw `/profile|contract/i` before returning a state. This is the essential fix for the P13 selection-only hole.

The test must not accept `replay final state hash mismatch` as the primary success condition for this selection-only case. The expected rejection is the version/profile boundary, because selection-only final numeric state can remain hash-identical.

### P14-3 — Supported legacy profile21 replay path preserves old semantic meaning

Backward compatibility must be explicit. The recommended contract is a frozen/versioned profile21 replay path or equivalent legacy adapter/reader whose menu semantics remain profile21.

Against that **legacy profile21 path**, the same byte-pinned selection-only fixture must replay to:

```js
assert.equal(legacySession.profileRevision,"F1-public-reference-21");
assert.equal(legacySession.deviceState.overlay.itemIndex,5);
assert.equal(legacySelected.id,"sounder.whiteMarker");
assert.equal(sessionHash(legacySession),"f0-fnv1a32-b7e35e70");
```

The legacy path must not route through the new AP-1 menu and then translate the result afterward. The selected semantic ID itself must remain White Marker during replay.

If the implementation chooses an explicit compatibility service rather than a frozen adapter, the same observable requirements still apply: byte-pinned old input, profile21 identity, White Marker result, exact final hash, no silent Clutter interpretation.

### P14-4 — Frozen profile21 editing replay is rejected natively and preserved through legacy replay

Use the second exact-hash fixture (P13 sequence plus ENTER).

Profile22 native replay must reject it at `/profile|contract/i`, not rely on the later reducer-drift hash mismatch observed in P13.

The supported profile21 legacy path must still reproduce the old editing semantic identity:

- selected/edit entry ID must be `sounder.whiteMarker`;
- its final session hash must equal the fixture `finalSessionHash`;
- no profile22 AP-1 row meaning may leak into the legacy transaction.

This preserves both P13 findings: selection-only is the silent-hole regression, and editing is a separate historical behavior that should become an early version-bound rejection in the profile22 native path.

### P14-5 — Wrong-revision replay cannot be authorized by a recomputed fingerprint

Start from a valid fresh profile22 envelope. Create a body with `profileRevision:"F1-public-reference-21"`, recompute its normal `contentFingerprint`, and assert profile22 `replay()` still throws `/profile|contract/i`.

Also test the reverse direction on the legacy path if it exists: a profile22 envelope must not replay under profile21 compatibility semantics.

Keep the existing core tests for changed controls/gestures/hold threshold and final reducer drift. The P14 version test supplements them; it does not replace them.

### P14-6 — Profile22 settings keep schema18/v18 while profile identity advances

If no settings field/shape/domain change is introduced, assert all of these together:

```js
const encoded=JSON.parse(encodeFcvSettings(settings));
assert.equal(encoded.schemaVersion,18);
assert.equal(encoded.profileClass,"PUBLIC_REFERENCE");
assert.equal(encoded.profileRevision,"F1-public-reference-22");
assert.match(FCV_SETTINGS_STORAGE_KEY,/settings\.v18$/);
assert.deepEqual(decodeFcvSettings(JSON.stringify(encoded)),settings);
```

This distinguishes a replay semantic revision from a persisted-settings schema revision.

If implementation changes the settings wire shape, then schema/key must be deliberately versioned and the P14 oracle must be revised with a real migration fixture. Do not bump schema/key solely to make profile22 tests pass.

### P14-7 — Explicit profile21 settings migration is added; ordinary decoder remains strict

Before the profile bump, freeze a representative current profile21 settings envelope as exact bytes and pin its SHA-256 in tests. It should include at least:

- a Sounder committed value such as `clutter:"67"`;
- `whiteLine:"On"`;
- NMEA source preferences;
- `tankenmaru:"On"` to exercise entitlement stripping at restore;
- ordinary units/configuration fields.

Recommended API contract: add an explicit `decodeFcvProfile21Settings(input)` analogous to `decodeFcvProfile19Settings`.

Then require:

```js
assert.equal(decodeFcvSettings(profile21Bytes),null);
assert.deepEqual(decodeFcvProfile21Settings(profile21Bytes),expectedCommittedSettings);
const reencoded=JSON.parse(encodeFcvSettings(expectedCommittedSettings));
assert.equal(reencoded.schemaVersion,18);
assert.equal(reencoded.profileRevision,"F1-public-reference-22");
```

Restore the migrated settings only through a logged `restore-settings` event and preserve the existing fail-closed optional hardware rule:

```js
assert.equal(restored.deviceState.settings.tankenmaru,"Off");
assert.equal(restored.deviceState.trainingFixture.tankenmaruOption,false);
```

NMEA source preferences that are already valid settings may remain, exactly as existing profile19 migration tests allow.

### P14-8 — Existing profile19 migration remains byte-exact and independent

Do not rewrite or regenerate the existing profile19 fixtures.

Keep these exact hashes:

- settings `f14235c481a35c5e2af2118729dcfd51c3eb2039bdec739047ba9e5b7e00f111`;
- replay `adb919e666598127b2f76e284a0ba4dea4506ae15eac11535574ac562297bf4c`.

Under profile22:

- ordinary `decodeFcvSettings(profile19Bytes)` remains `null`;
- `decodeFcvProfile19Settings(profile19Bytes)` still returns only validated committed settings;
- re-encoding those settings produces profile22 schema18 bytes;
- the old profile19 replay remains rejected by native profile22 replay;
- no new profile21 decoder may accidentally broaden `decodeFcvProfile19Settings` to accept profile18/profile20/profile21/profile22;
- the existing wrong-shape/profile/schema/digest/unsupported-value/prototype-pollution cases remain strict.

### P14-9 — Browser reload migration order is explicit and logged

Update persistence tests to verify the reload path names/uses all intended decoders and still dispatches `restore-settings` rather than mutating state directly.

Strict cases:

1. profile22 stored bytes -> ordinary decode -> restore;
2. frozen profile21 bytes -> ordinary decode rejects -> explicit profile21 decoder succeeds -> restore;
3. profile19 bytes -> current and profile21 decoders reject -> profile19 decoder succeeds -> restore;
4. malformed/foreign bytes -> all decoders reject -> default settings remain;
5. successful legacy import does not rewrite stored bytes during startup; only a later committed settings change writes a profile22 envelope.

Migration status text should state the actual source/target profile. Test behavior/decoder path rather than only matching a message string.

### P14-10 — D15 fresh profile22 sessions remain replay-verifiable

`assessFcvLesson()` internally creates/replays envelopes using the current `FCV588_ADAPTER`, so the profile bump directly affects course integrity even though the Sounder reorder does not alter Data/System lesson row counts.

At minimum rerun and retain strict assertions for:

- LEARN-04 Data Source: exact Data-menu workflow, `tripSource:"NMEA"`, fresh-attempt boundary, cancel remains failure;
- LEARN-05 Receiver Status: exact System-menu workflow, `NO_TRAINING_DATA`, transport `NONE`, navigation fixture contamination remains failure;
- LEARN-06 Key Beep: semantic System `system.keyBeep` position remains 15, cancel/historical/unrelated FUNC hold cases remain failure;
- LEARN-07 BRILL: two short holds + ENTER, brightness 9 -> 8, cancel remains failure.

For each successful fresh profile22 lesson/session, require:

```js
assert.equal(session.profileRevision,"F1-public-reference-22");
assert.equal(result.replayVerified,true);
assert.equal(result.passed,true);
assert.equal(result.hardwareApproved,false);
assert.equal(result.publicReleaseEligible,false);
assert.equal(sessionHash(replay(adapter22,scenario,createReplayEnvelope(session))),sessionHash(session));
```

Existing negative lesson-boundary/source-fixture/action-sequence tests must remain unchanged in strength.

### P14-11 — Historical profile21 course state cannot earn current profile22 credit

Build or freeze a valid completed profile21 lesson session/envelope before the bump (LEARN-04 or LEARN-06 is sufficient because it contains a menu edit). Feed that historical session to current profile22 `assessFcvLesson()`.

Required result:

- `passed === false`;
- `replayVerified === false`;
- reasons include `REPLAY_STATE_MISMATCH` (or a new equally explicit legacy-profile reason if the API is intentionally improved);
- no old completed action sequence earns a new current-profile lesson;
- a separate legacy replay/viewer path must not automatically hand its result to current profile22 scoring as if it were native evidence.

This test prevents backward-compatible replay viewing from becoming backward-compatible course certification by accident.

## Existing tests that should remain strict, not be deleted

P14 should adapt existing profile literals and add compatibility coverage rather than replacing mature tests. In particular retain:

- `test/core.test.mjs` same-revision hold/gesture/control profileHash rejection and reducer final-state drift detection;
- `test/fcv588-public-basic.test.mjs` wrong adapter revision rejection;
- `test/fcv588-v43-oem-brill-triangle.test.mjs` profile boundary behavior, extended to immediate prior profile21;
- `test/fcv588-public-persistence.test.mjs` schema/key/profile/fingerprint/prototype-pollution and logged restore behavior;
- `test/fcv588-public-v31-compatibility.test.mjs` exact profile19 fixture SHA, explicit migration and replay rejection;
- `test/fcv588-v39-cross-session-negative.test.mjs` entitlement stripping and no implicit replay migration;
- the full P13 semantic-ID rebaseline in `fcv588-public-lcd-presentation`, V47 and V49.

## Recommended test/fixture grouping

Keep the compatibility story obvious to reviewers:

```text
test/
  fcv588-p14-profile22-contract.test.mjs
  fcv588-p14-profile21-replay-compatibility.test.mjs
  fcv588-p14-profile21-settings-migration.test.mjs
  fixtures/
    fcv588-p13-profile21-selection-only-replay.json
    fcv588-p13-profile21-editing-replay.json
    fcv588-p13-profile21-settings.json
```

The new fixture names should remain profile21 forever; do not rewrite them after profile22 becomes canonical.

## P14 RED expectations before implementation

A useful P14 TDD RED should fail for the intended reasons:

1. current profile constant is still 21 instead of 22;
2. no explicit profile21 settings migration decoder/path exists;
3. no byte-frozen profile21 replay fixture/legacy replay path exists;
4. native profile22 wrong-revision gates do not yet exist because profile22 itself does not exist.

Do not use the current P13 same-revision semantic-drift behavior as a GREEN compatibility result. P13 intentionally proved it is a blocker.

## P14 GREEN acceptance oracle

P14 may claim the replay/settings gate GREEN only when all of the following hold simultaneously:

- profile22 is the sole native/current revision;
- fresh AP-1 profile22 replay is deterministic and hash-equal;
- frozen profile21 selection-only and editing replay fixtures have pinned byte SHA-256 values;
- native profile22 replay rejects both old profile21 fixtures at the profile/contract boundary;
- an explicit supported legacy profile21 replay path preserves old White Marker semantics and old final hash;
- wrong-revision envelopes remain rejected even after recomputing content fingerprints;
- schema18/storage key v18 remain exact if the settings wire schema is unchanged;
- explicit profile21 settings migration re-encodes to profile22 and cannot grant optional hardware;
- exact profile19 fixture hashes and migration/replay separation remain intact;
- fresh profile22 D15/course scoring remains deterministic, source-bounded and release-ineligible;
- historical profile21 course state cannot silently earn current profile22 credit;
- P13 semantic-ID tests stay strict and full Node/Python gates return green after the profile/migration changes.

## Reviewed file hashes

- `src/devices/fcv588/profile-version.mjs` — `8134470b379315ebc369a7b5922dacbdfcf47d3472d084832da5fff031e03070`
- `src/devices/fcv588/settings.mjs` — `2c5597271247c08128c2904a02fcc4cad672be70a4d2017837f76412ecb86aa3`
- `src/core/session.mjs` — `39783a274572af83ee382ad2d0caea94ecd968cf98377c3b9300f179fabdaa44`
- `src/core/lessons.mjs` — `bd7448afdf5e8dfa94c07fad96403abf55549f65f7225f13512af61dba96479f`
- `web/app.mjs` — `272f422019d2d075fe907705973c2d99d8db0f5cd96597011586c15684d265ee`
- `test/fcv588-public-persistence.test.mjs` — `306e5b20d1b788488183ecf8157dbfeebc0111b8aaab78c481eec186cd0d934b`
- `test/fcv588-public-v31-compatibility.test.mjs` — `822c8242eedccc360e4c6eeff868ef6400642fa0cf827d815dc59951e77a03df`
- `test/fcv588-v39-cross-session-negative.test.mjs` — `b7f3c81ab44c8d27e72f5f2ea975f36dbadbc11776a9df2f7acf7aac2369dbcd`
- `test/fcv588-public-course.test.mjs` — `8c69f203d4744ab2ae401c4d70903d737f1544e6f3e24ee25389341da4e5b776`
- `P13_GATE_REVIEW_20261116.json` — `c1a99846aff873ccfa28db81670f5904f966426b957e87e4542cece8fb4ae1d4`
- `P13_PROFILE21_REPLAY_SEMANTIC_DRIFT_20261116.json` — `479909adb7475c8d9b02dd195b6abb1943593a78f575c2857b6585a1d4336f8c`
- `P13_FIXTURE_AND_SOURCE_FREEZE_20261116.json` — `3f3110bc0e4cfa4e55c09cc8beb1d1da0b80f1d3c5ad8af353132edce591d306`

## Bounded conclusion

The correct P14 test strategy is a **profile revision boundary plus explicit legacy compatibility**, not another same-profile menu patch. Profile22 should own AP-1 menu semantics. Profile21 replay bytes must be frozen and either replayed through a versioned legacy path that preserves White Marker semantics or rejected by the native profile22 path; they must never be interpreted directly against the profile22 menu. Settings remain a separate migration problem: keep schema18/v18 if their actual schema is unchanged, add explicit profile21 settings import, preserve the exact profile19 migration fixture contract, and continue routing all accepted settings through logged `restore-settings`. D15/course scoring must remain native-profile evidence and must not convert historical replay compatibility into current-profile credit.
