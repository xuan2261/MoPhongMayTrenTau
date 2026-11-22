# P14 — Independent final source review

Status: **READ-ONLY SOURCE REVIEW**. No source, tests, browser, runtime, server, or canonical files were modified or executed by this reviewer.

## Verdict

**SOURCE STAGE: GO_BOUNDED. CANONICAL APPLY: NO_GO. RELEASE: HOLD.**

The P14 stage satisfies the narrow compatibility objective that triggered P13: frozen profile21 selection-only and editing replay retain their exact historical hashes/semantic row, while the AP-1 Sounder order runs under a distinct profile22 and rejects cross-profile replay. I found no unexpected weakening of the existing Node assertions.

Canonical apply is still blocked by evidence/containment issues listed below: the profile21 archive is not fully transitively isolated for a blanket “all profile21 replays forever” claim; the served source surface grew from 39 to 45 files without a new final runtime45 integrity seal; and the existing P14 Chrome attempt is a failed receipt, not a browser GO.

## 1. Canonical39 versus P14 stage

P07 canonical runtime manifest remains unchanged: **39/39 canonical hashes match**.

Against those same 39 paths, P14 stage has **34 exact + 5 expected changed**:

- src/devices/fcv588/menu-atlas.mjs
  - canonical 992d7a6e1f3a645680ea73f87ce2863a9e9f38eb16428a4581ad5e7e71a58aed
  - stage e2ba214cf81aa739452dc1ecd0ddfdcc7fad7814478a2d5e27e6925eda945aca
- src/devices/fcv588/model.mjs
  - canonical 45ed40e44e0af6434ae3f17249d5f9c52081be77bd7302738b7ac39b37a8db11
  - stage fdbf94e57e86928c6a6b68f6d012a37c50a62aac1ad1d4752340a0e28ea250a9
- src/devices/fcv588/profile-version.mjs
  - canonical 8134470b379315ebc369a7b5922dacbdfcf47d3472d084832da5fff031e03070
  - stage a8a2650964bd6560c43ec7b3290a298e4a19d78169847e5a41adca7960345056
- src/devices/fcv588/settings.mjs
  - canonical 2c5597271247c08128c2904a02fcc4cad672be70a4d2017837f76412ecb86aa3
  - stage 705ed5380dbce9357380d0416edf1e137d896943479eeaf516048b6c7a1f117a
- web/app.mjs
  - canonical 272f422019d2d075fe907705973c2d99d8db0f5cd96597011586c15684d265ee
  - stage 59f2b0bea8e53097ca8302622557b3e5c53c661c7bf95d9ead62e179f2c60bb1

P14 adds six served .mjs files under src/devices/fcv588, so the served src+web surface is now **45 files rather than 39**:

- adapter-profile21.mjs — 4622388567c833cff06ed12d77a1edd960590f635b05e60dcdb37d0ad497a030
- menu-atlas-profile21.mjs — 992d7a6e1f3a645680ea73f87ce2863a9e9f38eb16428a4581ad5e7e71a58aed
- model-profile21.mjs — 6b9ecd422772ff3b85a048ed8e5e338b4529cefa8860e858a9e141085fc1e907
- profile-version-profile21.mjs — 8134470b379315ebc369a7b5922dacbdfcf47d3472d084832da5fff031e03070
- replay-compat.mjs — 9e9887c9a6b4adad90864f8de82144edaf20146063fc6204dac912120eed11d6
- settings-profile21.mjs — f82e62b3da3145373903e64a4e0c089d4e29206d1072532254cb7b9e436dd010

The recursive served-asset/rights tests are still present and PASS in the supplied 571-test log, so the six new files are covered by the dynamic code/media rights scan. They are **not**, however, represented by the old P07 39-row integrity manifest. A P14 final runtime45 manifest/seal is therefore required before canonical apply.

## 2. Exact frozen profile21 replay hashes

Both staged fixtures rehash exactly to the supplied byte SHAs and are byte-identical to the separately frozen P14 QA copies.

### Selection-only profile21

- file SHA-256: d795b05494618c2e4482598b1e98a65e63bb9aa67e367bf266782e66d1a803dd
- profile revision: F1-public-reference-21
- events: 9
- historical meta.profileHash: f0-fnv1a32-f2d5289b
- historical finalSessionHash: f0-fnv1a32-b7e35e70
- recorded contentFingerprint: f0-fnv1a32-b93e124e
- independently recomputed content fingerprint: f0-fnv1a32-b93e124e
- historical semantic selection asserted by P14: sounder.whiteMarker

### Editing profile21

- file SHA-256: 07553d5bb42e0830e5938f9b1879fbed74a621634f3c5b194e2ce38ae18412dd
- profile revision: F1-public-reference-21
- events: 10
- historical meta.profileHash: f0-fnv1a32-f2d5289b
- historical finalSessionHash: f0-fnv1a32-138abeb4
- recorded contentFingerprint: f0-fnv1a32-336863c3
- independently recomputed content fingerprint: f0-fnv1a32-336863c3
- archived semantic edit target asserted by P14: sounder.whiteMarker

The freeze generator imports the untouched canonical profile21 adapter/session/menu, refuses generation unless those exact profile/session/envelope hashes and White Marker semantic identity match, and writes with wx. This is materially stronger historical evidence than the earlier dynamic-only P13 probe.

The P14 frozen-fixture tests require exact fixture byte SHA, exact profile revision, exact content fingerprint, exact archived meta.profileHash, exact sessionHash, White Marker semantic identity through the archived menu, profile22 rejection of the profile21 envelope, and exact replay equality through the archived profile21 adapter.

This closes the P13 selection-only silent-reinterpretation gap for these two frozen cases.

## 3. Profile22/AP-1 binding

Active profile-version.mjs declares F1-public-reference-22.

The active model adds ordered FCV_MENU_ENTRIES.map(item => item.id) to the FCV588 profile object as menuEntryOrderIds. Because session.mjs adapterProfileHash() fingerprints the full adapter profile, a future menu-ID reorder under unchanged profile22 now fails the profile/meta replay boundary instead of silently sharing the previous profile hash.

The active Sounder atlas is the source-aligned AP-1 13-row order. The P14 test requires the exact 13 IDs and requires active profile22 and archived profile21 to reject each other’s envelopes at the replay contract/profile boundary.

This is a correct fix for the specific P13 ordering defect without mutating legacy profile21 state or events.

## 4. Profile21 archive and transitive imports

The archive is behavior-preserving for the frozen cases, but it is not literally byte-identical at every top-level archive file:

- menu-atlas-profile21.mjs is byte-identical to canonical profile21 menu.
- profile-version-profile21.mjs is byte-identical to canonical profile21 revision.
- adapter-profile21.mjs differs from canonical adapter only by importing model-profile21.mjs and exporting a distinct symbol name.
- model-profile21.mjs differs from canonical profile21 model only by redirecting menu/settings/profile-version imports to archive files.
- settings-profile21.mjs differs from canonical settings only by redirecting menu/profile-version imports to archive files.

The shared transitive dependencies examined are all byte-identical between canonical and stage:

- src/core/session.mjs
- src/core/protocol.mjs
- src/core/scenario.mjs
- alarms.mjs
- navigation.mjs
- calibration.mjs
- units.mjs
- capabilities.mjs

**Important residual risk:** the archive is not a fully sealed dependency island. model-profile21.mjs imports shared navigation.mjs, and navigation.mjs itself imports FCV_NAV_BOX_DEFAULTS/OPTIONS from the **active** menu-atlas.mjs. AP-1 P14 changes only Sounder ordering, so the NAV constants are unchanged and the frozen selection/editing fixtures remain exact. But a future active-menu change could alter a historical profile21 navigation replay without touching the archive files.

Therefore:

- **GO** for the bounded selection/editing compatibility demonstrated by the frozen fixtures.
- **NO_GO for any blanket claim that all historical profile21 sessions are permanently immutable** until remaining shared semantic dependencies are archived/pinned or a broader historical replay fixture set covers them.

## 5. Replay routing

replay-compat.mjs is appropriately narrow:

- profile21 -> archived profile21 adapter;
- profile22 -> active adapter;
- unknown/profile19 -> reject;
- then generic core replay() still validates envelope schema, content fingerprint, exact profile/meta/scenario, event sequence, and final state hash.

There is no replay rewriting, no profile21 -> profile22 event migration, and no weakening of src/core/session.mjs.

## 6. Settings migration

Settings remain schema 18 and keep the same storage key. That is valid for this phase because P14 changes menu ordering/profile semantics, not setting shape.

The active codec:

- ordinary decoder accepts profile22 only;
- explicit decodeFcvProfile21Settings() accepts profile21 only;
- explicit profile19 importer remains;
- old bytes are validated by their original profile fingerprint;
- imported values are revalidated against current allowed settings.

web/app.mjs restores in the explicit order:

current profile22 -> profile21 -> profile19 -> reject.

Imported settings enter a fresh profile22 session only through logged restore-settings. Startup does not rewrite the original old storage bytes; lastObservedSettings is set to the profile22 encoding so a subsequent non-setting event does not cause an accidental migration write. A later committed setting change may write profile22.

No replay migration or virtual hardware/fixture entitlement is introduced.

Non-blocking cleanup: a few old test/message strings still say “profile21” where the active profile is now 22; the assertions themselves are correct.

## 7. LCD historical-presentation boundary

The existing LCD projectors still import only the active menu atlas and accept deviceState without a profile discriminator. Rendering an archived profile21 state directly through those projectors would therefore still risk relabeling numeric itemIndex under profile22 order.

Current P14 avoids that bug because web/app.mjs does **not** import or expose replay-compat.mjs; historical profile21 replay is currently a headless compatibility/test path, not a live LCD replay viewer.

Verdict:

- current bounded source path: **GO**;
- any future UI/history viewer that renders archived profile21 sessions: **BLOCKED until presentation is version-aware or uses profile21 projectors/menu provider**.

## 8. D15/course boundary

src/core/lessons.mjs is byte-identical to canonical, and test/fcv588-public-course.test.mjs is also byte-identical. The lesson code imports the active adapter, so new scored attempts are profile22.

The P14 Sounder reorder does not change the fixed lesson paths currently used by D15 (Data/System/Range/Mode/BRILL). The supplied 571-test log retains the full D15 course/fail-closed suite, including forged-state, stale-boundary, historical-action, receiver-absence, Key Beep, and BRILL cases.

A profile21 historical session passed to the current assessor cannot replay under the active profile22 adapter and therefore cannot silently receive current-profile course credit. There is not yet a dedicated regression named specifically for “profile21 historical session cannot earn profile22 D15 credit”; adding one would be useful hardening but is not a blocker for present source behavior.

## 9. Source/evidence registration

Stage evidence registration updates are tightly bounded:

- docs/evidence/device-register.json: only FCV profile revision changes 21 -> 22.
- docs/evidence/fcv588-public-implementation-status.json: only profile revision changes 21 -> 22.
- release remains HOLD;
- hardware remains unvalidated;
- firmware remains unknown/null;
- rights clearance remains false;
- trace matrix is otherwise unchanged.

This is correct evidence registration for the semantic profile bump and does not promote any OEM/hardware claim.

The remaining registration/integrity gap is the **runtime file inventory**: P14 adds six browser-served source modules, so final apply evidence must seal the 45-file served/runtime surface rather than merely cite the old 39-file P07 manifest.

## 10. Test strictness / no weakening

All **90 canonical test modules remain present**. Stage adds exactly two P14 test modules:

- fcv588-p14-versioned-menu-replay.test.mjs
- fcv588-p14-frozen-historical-fixtures.test.mjs

No canonical test module is removed.

Nine existing test modules differ:

- six only update the expected active revision from profile21 to profile22; test count and assertion count are unchanged;
- the three source-index rebases are strengthened:
  - LCD presentation: 46 -> 52 assert calls;
  - V47 White Marker: 43 -> 46;
  - V49 a11y/White Marker: 24 -> 26.

Those three changes replace stale numeric Sounder indices with semantic-ID lookup and add selected-ID/status assertions; they do not replace exact checks with truthiness or broad permissive conditions.

The two new P14 modules contribute eight new tests. The supplied full Node log rehashes to:

2b78c30c88d05af4b3d664b1143e56a01e3579242074621cdc2874d421dcc028

and records **571/571 PASS, 0 fail, 0 skipped/todo**. This is consistent with the prior 563-test suite plus eight P14 tests.

The supplied Python log records **13/13 OK**.

## 11. Remaining blockers before canonical apply

### BLOCKER A — no final P14 runtime45 integrity seal

P07 is a valid canonical **preimage** baseline, not a post-P14 manifest. P14 has six new served source modules. Before apply, create a write-once runtime45 manifest/final integrity receipt that pins all 45 served source files and separately records the 39-path preimage comparison.

### BLOCKER B — existing P14 browser attempt is not PASS

P14_STAGE_CHROME_ATTEMPT1_20261116.json SHA-256:

64cf907d817e1d0e3329589376dcc782d977d24b3b6979dd7c79323558807bdd

records four failed checks: AP-1 Sounder order and loaded-body hash gate at both viewports. The receipt also shows no page errors, and the harness itself appears defective for this attempt: it does not complete the normal simulated boot/tick workflow before opening MENU, and it tries to consume response bodies after lifecycle transitions that produce Network.getResponseBody failures.

This is not evidence that the source implementation is wrong, but it is **not browser acceptance evidence**. Do not convert this receipt into PASS. Run a corrected, independently reviewed browser gate later; this review did not run browser.

### HARDENING C — transitive profile21 archive is not fully isolated

Not a blocker for the two frozen P14 historical fixtures, but a blocker for a broad “all profile21 replay is permanently preserved” claim. Archive/pin shared semantic dependencies or add a wider immutable historical replay corpus.

## Final decision

- Profile21 frozen selection replay/hash: **VERIFIED / GO**
- Profile21 frozen editing replay/hash: **VERIFIED / GO**
- Profile22 distinct revision and AP-1 menu: **VERIFIED / GO**
- Cross-profile replay rejection: **VERIFIED by source + existing 571/571 evidence / GO**
- Settings 21/19 -> 22 explicit migration: **GO**
- D15 current-profile course behavior: **GO**
- Existing tests weakened: **NO**
- Historical LCD rendering: **NOT EXPOSED; future UI route BLOCKED until version-aware**
- General all-profile21 transitive immutability: **NOT_YET_VERIFIED**
- Runtime45 final integrity/source freeze: **NOT_YET_PRESENT**
- Browser acceptance: **FAILED EXISTING RECEIPT / NOT_YET_GREEN**
- Canonical apply: **NO_GO**
- Release: **HOLD**
