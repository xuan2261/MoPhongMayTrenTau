# P14 — Profile21 compatibility design audit

Status: **READ-ONLY ARCHITECTURE REVIEW**. Canonical source/browser/runtime were not modified or executed.

## Decision

**Design GO in principle; canonical apply remains BLOCKED until a frozen profile21 replay fixture exists and the compatibility path is implemented and independently verified.**

The smallest safe design is a parallel compatibility island, not same-revision menu dispatch:

1. preserve the current F1-public-reference-21 adapter/model/menu behavior immutably;
2. introduce a distinct F1-public-reference-22 implementation containing the AP-1 Sounder order;
3. route historical replay explicitly by envelope.profileRevision;
4. migrate stored settings explicitly into a new profile22 session, but never migrate/reinterpret replay events.

Do **not** add a profile/menu discriminator to the existing profile21 deviceState: sessionHash() fingerprints the complete deviceState, so that would itself change historical hashes.

## Why profile22 is mandatory

src/core/session.mjs binds replay to profileRevision and to meta.profileHash, where adapterProfileHash() fingerprints adapter id, revision, profile, controls, gestures, and holdThresholdMs. It does **not** fingerprint reducer code or menu order. sessionHash() fingerprints session meta/world/sensor/device state/held controls/events, not the semantic identity of a row behind a numeric overlay.itemIndex.

P13 therefore demonstrated the exact silent-drift case: the same nine profile21 events leave itemIndex === 5 and the same sessionHash f0-fnv1a32-b7e35e70, but canonical profile21 means sounder.whiteMarker while AP-1 same-revision staging means sounder.clutter. A committed edit can be caught later by finalSessionHash; selection-only navigation is not.

Evidence:

- P13 semantic drift receipt SHA-256 479909adb7475c8d9b02dd195b6abb1943593a78f575c2857b6585a1d4336f8c.
- P13 gate review SHA-256 c1a99846aff873ccfa28db81670f5904f966426b957e87e4542cece8fb4ae1d4.
- AP-1 candidate menu SHA-256 e2ba214cf81aa739452dc1ecd0ddfdcc7fad7814478a2d5e27e6925eda945aca.

## Recommended module shape

### 1. Freeze profile21; build profile22 in parallel

Prefer preserving the current profile21 implementation byte-for-byte as the legacy replay owner, then add a parallel profile22 implementation. Avoid first refactoring profile21 into a generic menu-provider factory: that touches the very reducer whose historical output must remain hash-identical.

A practical layout is:

    src/devices/fcv588/
      ... current profile21 modules, frozen for compatibility ...
      profile22/
        profile-version.mjs
        menu-atlas.mjs
        model.mjs
        adapter.mjs
        settings.mjs
      replay-router.mjs

profile22/menu-atlas.mjs uses the P13 AP-1 order and profile22/profile-version.mjs declares exactly F1-public-reference-22. profile22/model.mjs may initially be a controlled copy of the current model with only its profile/menu/settings imports redirected. Duplication is preferable here to a broad reducer refactor because the compatibility objective is exact historical behavior, not code deduplication.

For profile21, preserving only adapter/model/menu filenames is **not enough for a general historical replay guarantee** unless their transitive behavior is frozen too. model.mjs depends on alarms, navigation, settings validation, calibration, units, menu capabilities, and scenario observations; initial state outputs from those modules also participate in the historical hash. Either:

- freeze/pin the complete profile21 transitive behavior surface by SHA, or
- explicitly limit the compatibility claim to frozen replay fixtures covered by regression tests.

The former is safer if “all profile21 replays remain supported” is the intended contract.

### 2. Keep core replay generic and fail-closed

Do not make src/core/session.mjs replay() silently select or migrate profiles. Its current contract is strong: the caller supplies one adapter, and replay rejects revision/meta/scenario mismatch before event dispatch.

Add an FCV-specific resolver instead:

    profile21 envelope -> exact legacy profile21 adapter -> core replay()
    profile22 envelope -> profile22 adapter              -> core replay()
    profile19/unknown   -> reject replay

The router may inspect only the declared profileRevision to choose the candidate adapter; core replay() must still validate the full envelope fingerprint, exact meta/profile hash, scenario, event sequence, and final hash. Never rewrite a profile21 envelope into profile22 or replay its events through profile22.

Profile19 remains the existing policy: settings may have an explicit importer, but archived profile19 replay remains rejected.

### 3. Settings migration is separate from replay compatibility

Current settings are schema 18 and include profileRevision in their fingerprint. The AP-1 change reorders menu rows but does not change setting keys/values, so a schema bump is not required solely for P14.

For profile22:

- encodeFcvSettings() writes profile22.
- ordinary decodeFcvSettings() accepts profile22 only.
- add an explicit decodeFcvProfile21Settings() analogous to the existing profile19 decoder.
- retain the explicit profile19 decoder if direct profile19 -> profile22 committed-setting import remains supported.
- restore imported settings only through the logged restore-settings event on a **new profile22 session**.
- do not rewrite old local-storage bytes merely because startup successfully imported them; rewrite only after a later committed setting change, preserving the current migration discipline.

Keeping mophongmaytrentau.fcv588.public-reference.settings.v18 is acceptable while schema 18 remains unchanged; the profile revision inside the fingerprinted body is the compatibility boundary. If setting shape/allowed values change, that is a separate schema/storage-key migration and should not be conflated with the AP-1 reorder.

The web restore path should distinguish source profile explicitly: current22 -> legacy21 -> legacy19 -> reject. Do not label a profile19 import as profile21.

## Required changes in reviewed callers

- web/app.mjs: create live sessions with the profile22 adapter/settings codec. The ordinary replay button remains current-session profile22 replay. Any historical-envelope import must call the FCV replay router, not the live profile22 adapter.
- src/core/lessons.mjs: lessons should use the profile22 adapter for new attempts. A profile21 replay should not silently earn current-profile lesson credit; reject it explicitly or handle it only in a separate historical-review path.
- settings.mjs: profile21 settings decoder must be explicit; replay migration must remain absent.

## Hidden risks

1. **No frozen profile21 replay fixture currently exists.** test/fixtures contains only fcv588-v30-profile19-replay.json and profile19 settings. The P13 selection-only envelope was constructed dynamically from current canonical code and only its resulting hash/semantic drift was recorded. Before changing canonical profile21 code, capture the exact profile21 selection-only envelope bytes and pin its SHA, contentFingerprint, meta.profileHash, finalSessionHash, final sessionHash, and semantic selected ID sounder.whiteMarker. This is the main pre-apply blocker.

2. **Presentation can reintroduce the same bug even after replay is fixed.** web/lcd-presentation.mjs and web/lcd-instructor-meta.mjs import one global menu-atlas.mjs and receive only deviceState. If a correctly replayed profile21 state with itemIndex:5 is rendered through a profile22 projector, it will again display Clutter instead of legacy White Marker. Smallest safe scope: historical profile21 replay is validation/headless only. If old sessions must be visually displayed, projectors must receive a profile/menu provider or use a dedicated profile21 viewer.

3. **Adapter profile object must remain exact.** Because meta.profileHash fingerprints the complete adapter.profile, adding a harmless-looking property to legacy FCV588, changing controls/gestures, or thresholds will invalidate historical envelopes before replay. Add new semantic/menu metadata only to profile22.

4. **Shared reducer dependencies can break “immutable” compatibility.** Freezing only adapter.mjs, model.mjs, and menu-atlas.mjs while later changing shared navigation/alarm/calibration/unit/capability defaults can still change profile21 initial/final state hashes. Pin the transitive set or bound the compatibility claim to frozen fixtures.

5. **Multi-device replay is a separate surface.** src/core/device-runtime.mjs also takes an adapter and checks primaryProfileRevision. If historical profile21 multi-device envelopes are claimed supported, they need the same adapter-resolution policy. Otherwise reject them explicitly; do not silently route them to profile22.

6. **Do not “fix” the old hash by adding semantic IDs to legacy state/events.** That would be a useful profile22 improvement, but it changes profile21 hashes. Profile22 may add stronger semantic binding in a future schema/profile revision; profile21 must remain frozen.

## Minimum acceptance gates before canonical apply

1. A frozen profile21 selection-only envelope replays through the legacy adapter with the **exact original hash** f0-fnv1a32-b7e35e70 and resolves itemIndex:5 as sounder.whiteMarker.
2. That same envelope is rejected by the profile22 adapter **at the profile/meta boundary**, not accepted and reinterpreted and not merely rejected later by final-state drift.
3. A fresh profile22 AP-1 session reports revision F1-public-reference-22, exact 13-row AP-1 order, deterministic replay/hash equality, and index 5 resolves sounder.clutter.
4. Existing archived profile19 replay remains rejected; profile19 settings import remains explicit only.
5. Profile21 settings import into profile22 produces a logged restore-settings event, with no replay/event migration and no hardware/fixture privilege gain.
6. If historical replay is rendered, a dedicated version-aware presentation regression proves profile21 index 5 displays White Marker; otherwise historical replay must remain non-rendering/headless.
7. Full Node/Python/browser/security gates and independent integrity review are rerun after implementation; P13 browser PASS alone does not authorize P14 apply.

## Source hashes audited

- src/core/session.mjs — 39783a274572af83ee382ad2d0caea94ecd968cf98377c3b9300f179fabdaa44
- src/devices/fcv588/model.mjs — 45ed40e44e0af6434ae3f17249d5f9c52081be77bd7302738b7ac39b37a8db11
- src/devices/fcv588/adapter.mjs — 44187439f9365750896f47afae907296098fd6203f54e3ef4dc8bed9ef2b2309
- src/devices/fcv588/menu-atlas.mjs — 992d7a6e1f3a645680ea73f87ce2863a9e9f38eb16428a4581ad5e7e71a58aed
- src/devices/fcv588/settings.mjs — 2c5597271247c08128c2904a02fcc4cad672be70a4d2017837f76412ecb86aa3
- web/app.mjs — 272f422019d2d075fe907705973c2d99d8db0f5cd96597011586c15684d265ee
- src/core/lessons.mjs — bd7448afdf5e8dfa94c07fad96403abf55549f65f7225f13512af61dba96479f
- src/devices/fcv588/profile-version.mjs — 8134470b379315ebc369a7b5922dacbdfcf47d3472d084832da5fff031e03070

**Blocker:** capture and freeze an exact profile21 selection-only replay envelope before any canonical compatibility refactor. Until that fixture and the explicit profile21 adapter route exist, profile22 canonical apply remains **NO_GO**.
