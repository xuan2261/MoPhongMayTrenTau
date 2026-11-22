# P14 — Independent post-source final reevaluation

Date: 2026-11-16  
Reviewer: worker-21  
Scope: READ-ONLY independent reevaluation of the unchanged P14 staging source after the two evidence blockers from the prior worker19 source review were addressed. No source, tests, browser, runtime, canonical files, or servers were modified by this reviewer.

## Final bounded verdict

**UNIT / ACTIVE-PROFILE QA: GO.**  
**BOUNDED PROFILE21 COMPATIBILITY FOR THE TWO FROZEN HEADLESS FIXTURES: GO.**  
**CANONICAL APPLY AGAINST THE USER'S ALL-HISTORICAL REQUIREMENT: NO_GO.**  
**RELEASE: HOLD.**

The two concrete blockers that made worker19's earlier canonical decision NO_GO are now independently verified closed:

1. the P14 served runtime surface has a valid 45-file pre-apply integrity seal and fresh readback is 45/45 exact;
2. corrected Chrome attempt3 is a real green gate: 10/10 checks PASS, 77 real HTTP body SHA matches at each viewport, no page errors, exact AP-1 13-row Sounder menu, legacy profile21 settings bytes retained at boot, all eight OEM reference JPEG routes return 404, and the test-owned server exits cleanly.

However, the staging source itself is unchanged from worker19's review. The remaining transitive profile21 NAV dependency and historical LCD headless boundary therefore remain. They were caveats for a narrowly bounded two-fixture claim, but they are blockers when the required contract is **all historical profile21 behavior/sessions**, not only the two frozen Sounder fixtures.

## Evidence rehashed independently

### Prior independent source review

- `p14-design/P14_FINAL_SOURCE_INDEPENDENT_REVIEW_20261116.md`
- SHA-256 `b016db88165b000866bb0fd000257867187fb68a12e6a327038396827797ad4f`
- Earlier verdict: source stage GO_BOUNDED, canonical apply NO_GO because runtime45 seal and browser GREEN were missing; it also documented the NAV transitive and LCD historical-presentation caveats.

### Runtime45 integrity seal

- `p14/P14_STAGE_RUNTIME45_PREAPPLY_INTEGRITY_20261116.json`
- SHA-256 `1e4a17e23689fa00e68c002c125eb46c066af092b8de4fd666131466ba4f3418`
- receipt declares 45 served runtime files = 39 prior paths plus 6 new compatibility modules;
- fresh reviewer rehash: **45/45 exact** against the receipt;
- changed existing runtime files: 5;
- added runtime files: 6;
- canonical apply in receipt remains `NOT_APPLIED`;
- hardware remains unvalidated, firmware `null`, release approval HOLD.

The six new staged runtime modules rehash to:

- `adapter-profile21.mjs` — `4622388567c833cff06ed12d77a1edd960590f635b05e60dcdb37d0ad497a030`
- `menu-atlas-profile21.mjs` — `992d7a6e1f3a645680ea73f87ce2863a9e9f38eb16428a4581ad5e7e71a58aed`
- `model-profile21.mjs` — `6b9ecd422772ff3b85a048ed8e5e338b4529cefa8860e858a9e141085fc1e907`
- `profile-version-profile21.mjs` — `8134470b379315ebc369a7b5922dacbdfcf47d3472d084832da5fff031e03070`
- `replay-compat.mjs` — `9e9887c9a6b4adad90864f8de82144edaf20146063fc6204dac912120eed11d6`
- `settings-profile21.mjs` — `f82e62b3da3145373903e64a4e0c089d4e29206d1072532254cb7b9e436dd010`

### Browser attempt3

- `p14/P14_STAGE_CHROME_ATTEMPT3_20261116.json`
- SHA-256 `d63d2c81b6ca9472ad6911d6ca0c3842f8e027c21a1e354305dad2f571346498`
- checks: **10/10 PASS**;
- viewport source counts: **77, 77**;
- loaded body rows: **154/154 hash-match**;
- page errors: **0**;
- receipt errors: **0**;
- OEM JPEG denials: **8/8 HTTP 404**;
- isolated server: `serverExited=true`;
- displayed Sounder rows at both viewports are the exact AP-1 order: Pic. Advance, Zoom Mode, Shift, Interference, Color Erase, Clutter, White Line, White Marker, TVG, Smoothing, Bottom Zone, TX Power, TX Rate.

The attempt3 harness exits nonzero only when `RESULT.errors` is nonempty; this receipt has no errors and the supplied run is therefore consistent with RC0. This review did not rerun Chrome.

### Full software QA

- Node: `P14_STAGE_FULL_NODE_AFTER_REBASELINE_ATTEMPT1_20261116.txt`
- SHA-256 `2b78c30c88d05af4b3d664b1143e56a01e3579242074621cdc2874d421dcc028`
- result: **571/571 PASS, 0 fail, 0 skipped/todo**.

- Python: `P14_STAGE_PYTHON_ATTEMPT1_20261116.txt`
- SHA-256 `aa4790e0635f65d20cc91faae7e3e73ece76a1d1e89d75470e70b2bb69e576a8`
- result: **13/13 OK**.

## Source unchanged since worker19 review

Fresh runtime45 rehash proves the staged source bytes match the new integrity receipt exactly. The key active/legacy hashes remain the same as worker19 reviewed, including:

- active AP-1 `menu-atlas.mjs` — `e2ba214cf81aa739452dc1ecd0ddfdcc7fad7814478a2d5e27e6925eda945aca`;
- active profile22 `model.mjs` — `fdbf94e57e86928c6a6b68f6d012a37c50a62aac1ad1d4752340a0e28ea250a9`;
- active `profile-version.mjs` — `a8a2650964bd6560c43ec7b3290a298e4a19d78169847e5a41adca7960345056`;
- active `settings.mjs` — `705ed5380dbce9357380d0416edf1e137d896943479eeaf516048b6c7a1f117a`;
- active `web/app.mjs` — `59f2b0bea8e53097ca8302622557b3e5c53c661c7bf95d9ead62e179f2c60bb1`.

The live canonical tree is still the pre-P14 profile21 source at the five changed paths, and none of the six compatibility modules exists canonically. The protected user server is still listening at `127.0.0.1:4173`, PID 1204 (`node`). No canonical apply occurred during this review.

## What is now GO

### Active profile22/AP-1 path

The active source declares `F1-public-reference-22`, binds ordered `menuEntryOrderIds` into the adapter profile hash, and uses the source-valid AP-1 Sounder ordering. A fresh profile22 replay cannot silently inherit the profile21 numeric-row meaning.

### Two frozen historical profile21 cases

The two exact historical fixtures remain pinned:

- selection-only fixture SHA-256 `d795b05494618c2e4482598b1e98a65e63bb9aa67e367bf266782e66d1a803dd`, session hash `f0-fnv1a32-b7e35e70`, historic selected entry `sounder.whiteMarker`;
- editing fixture SHA-256 `07553d5bb42e0830e5938f9b1879fbed74a621634f3c5b194e2ce38ae18412dd`, session hash `f0-fnv1a32-138abeb4`, historic edit target `sounder.whiteMarker`.

`replay-compat.mjs` routes revision 21 to the archived adapter and revision 22 to the active adapter, while generic core replay still checks the exact envelope/meta/profile/scenario/events/final hash. The frozen tests prove these two historical cases preserve their old semantic identity and hash, and active profile22 rejects them at the contract/profile boundary.

### Settings migration

Profile22 current decode, explicit profile21 import, explicit profile19 import, logged `restore-settings`, raw-old-storage retention at startup, and no replay migration remain source-valid and browser-verified. Schema 18 and the v18 storage key remain appropriate because P14 changes semantic menu ordering/profile revision rather than the stored settings shape.

## Remaining blocker 1 — profile21 NAV compatibility is not transitively sealed

`model-profile21.mjs` correctly redirects its own menu/settings/profile imports to profile21 archive modules, but it still imports navigation behavior from shared:

```text
./navigation.mjs
```

and `navigation.mjs` imports:

```text
FCV_NAV_BOX_DEFAULTS, FCV_NAV_BOX_OPTIONS from ./menu-atlas.mjs
```

where `./menu-atlas.mjs` is the **active profile22 atlas**, not `menu-atlas-profile21.mjs`.

Fresh comparison confirms the current active atlas differs from the profile21 atlas only in Sounder ordering; the NAV constants are presently unchanged. Likewise the shared dependencies inspected by worker19 and rechecked here remain byte-identical between canonical and stage, including `navigation.mjs`, `alarms.mjs`, `calibration.mjs`, `units.mjs`, `capabilities.mjs`, `session.mjs`, `protocol.mjs`, and `scenario.mjs`.

Therefore there is **no demonstrated NAV regression in the current P14 bytes**.

But this is not enough for the user's **all-historical** contract. A future active atlas change to NAV defaults/options would change behavior used by archived profile21 replay without changing any profile21 archive module. The P14 compatibility island is therefore not actually closed over the historical reducer's transitive semantic dependencies.

The current P14 tests also contain no frozen historical profile21 NAV replay corpus proving waypoint/NAV-box/Data-source histories across the archived path. Existing NAV tests exercise the active/current code, not a version-frozen profile21 NAV history.

For a bounded claim covering only the two frozen Sounder fixtures this is a caveat. For a claim that **all historical profile21 sessions remain supported**, it is a blocker.

Minimum source-valid closure before all-historical canonical apply:

- make the profile21 reducer's navigation dependency version-bound, for example with an archived `navigation-profile21.mjs` that imports `menu-atlas-profile21.mjs`, or an equivalently immutable provider;
- pin/freeze the remaining transitive semantic dependencies that can affect profile21 hashes, or prove they are deliberately immutable by a versioned dependency boundary;
- add frozen profile21 replay fixtures covering at least NAV1/NAV2 box configuration, synthetic-navigation fixture/waypoint behavior, and one Data/NMEA-source path, with exact old byte SHA and final session hash.

## Remaining blocker 2 — historical LCD presentation is headless only

The replay compatibility path is not wired into the browser/live presentation. `web/app.mjs` does not import `replay-compat.mjs`; historical profile21 replay is a headless compatibility/test capability.

More importantly, `web/lcd-presentation.mjs` imports only the active:

```text
../src/devices/fcv588/menu-atlas.mjs
```

and projector APIs receive device state without a profile/menu discriminator. If a correctly replayed profile21 state with numeric `itemIndex:5` were handed to the active projector, the active AP-1 atlas would label that row as `sounder.clutter`, while the historical profile21 meaning is `sounder.whiteMarker`.

The current absence of a historical UI route prevents the old P13 presentation bug from being exposed in normal operation, but it does **not** satisfy an all-historical requirement that old sessions remain faithfully reviewable/displayable. It only satisfies a narrower requirement: old sessions can be validated headlessly.

Thus:

- **headless historical replay compatibility:** GO for the two frozen fixtures;
- **historical profile21 LCD/presentation fidelity:** NOT_IMPLEMENTED / NOT_VERIFIED;
- **all-historical replay + presentation requirement:** BLOCKED.

Minimum source-valid closure before all-historical canonical apply:

- either make presentation explicitly version-aware and route profile21 states through profile21 menu/projector semantics;
- or formally narrow the product contract to headless historical verification only and explicitly exclude historical visual review. That narrowing would conflict with the all-historical requirement stated for this gate, so it cannot be used to turn the current source into GO here.

## Why the new browser GREEN does not close these blockers

Attempt3 validates the **active profile22 browser path** and startup settings migration. It does not import/replay historical profile21 envelopes in the browser and does not render a historical profile21 state through a version-aware LCD projector. Its 77 loaded source bodies per viewport correctly attest the served source bytes, but source-body integrity is not semantic coverage for historical NAV or historical LCD rendering.

Likewise, Node 571/571 proves the implemented tests pass; it does not prove cases for which no all-historical fixtures/projector route exist.

## Exact gate decision

| Gate | Decision |
|---|---|
| Worker19 blocker A: runtime45 final integrity | **CLOSED / GO** |
| Worker19 blocker B: browser acceptance | **CLOSED / GO** |
| Stage source unchanged after review | **VERIFIED** |
| Node full suite | **GO — 571/571** |
| Python suite | **GO — 13/13** |
| Active profile22 AP-1 browser/runtime | **GO** |
| Profile21 frozen selection fixture | **GO** |
| Profile21 frozen editing fixture | **GO** |
| Explicit profile21/profile19 settings migration | **GO** |
| Current-byte NAV behavior for those frozen Sounder fixtures | **GO / no observed drift** |
| All-historical profile21 transitive replay immutability | **NO_GO / not sealed** |
| Historical profile21 LCD visual fidelity | **NO_GO / headless only** |
| Canonical apply for a narrow two-fixture/headless compatibility claim | **GO_BOUNDED, if that were the accepted scope** |
| Canonical apply for the stated all-historical requirement | **NO_GO** |
| Release | **HOLD** |

## Final recommendation

Do **not** canonical-apply P14 under an all-historical compatibility claim yet. The newly added runtime45 and corrected Chrome evidence remove the prior evidence blockers, but they do not change the source architecture reviewed by worker19. Close the profile21 transitive NAV dependency and provide a version-aware historical presentation path (or change the requirement explicitly). Then rerun the full Node/Python/browser gates and produce a new final integrity/apply seal.

This NO_GO is narrower than worker19's earlier one: the active profile22 implementation, AP-1 ordering, settings migration, runtime45 integrity, browser evidence, and the two frozen profile21 Sounder replay cases are all independently acceptable. The remaining refusal is specifically the gap between that bounded proof and the broader **all-historical** guarantee.
